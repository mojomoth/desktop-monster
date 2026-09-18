// Serializes user-visible online mutations with the one live engine. The
// overlay pauses only at an explicit operation boundary; ordinary play stays local.
import { createEngine, parseSave } from '../core/index.js';
import type { SaveFile } from '../core/save.js';
import type { CollectionAction } from '../core/collection.js';
import type { LeaderboardMetric, LeaderboardResult, NetResult, OpponentListResult, PvpResult, ReclaimResult, TheftsResult } from '../shared/api.js';
import type { NetSession } from './net.js';
import { RecoveryStore } from './recovery.js';
import { readSaveFileResult, writeSaveFile } from './persistence.js';

export interface StateRelease { generation: number; save: SaveFile; replace: boolean; actions: CollectionAction[]; blocked: boolean }
export interface OperationReply { ok: boolean; error?: string }
const failure = <T>(error: 'busy' | 'storage' | 'sync-required'): NetResult<T> => ({ ok: false, error });

export class ProgressCoordinator {
  readonly recovery: RecoveryStore;
  generation = 0;
  busy = false;
  faulted = false;
  latest: SaveFile;
  private actions: CollectionAction[] = [];
  private replaced = false;
  private readonly reclaimRequest: NetSession['reclaim'];
  constructor(private readonly o: {
    directory: string; initial: SaveFile; session: NetSession;
    capture: (generation: number) => Promise<SaveFile>;
    release: (state: StateRelease) => void;
    status: (error: boolean) => void;
    now?: () => number;
  }) {
    this.recovery = new RecoveryStore(o.directory, o.initial);
    const disk = readSaveFileResult(o.directory);
    this.latest = this.recovery.allocationSafe(parseSave(disk.kind === 'loaded' ? disk.value : o.initial));
    this.reclaimRequest = o.session.reclaim.bind(o.session);
  }
  get pending(): boolean { return !!this.recovery.state.pendingBattle || !!this.recovery.state.pendingReclaim; }
  save(value: unknown, generation: number): boolean {
    if (this.busy || this.faulted || generation !== this.generation) return false;
    try { this.persist(parseSave(value)); return true; }
    catch { this.o.status(true); return false; }
  }
  private persist(save: SaveFile): void {
    this.recovery.observe(save);
    if (!writeSaveFile(this.o.directory, save)) throw Error('Could not save progress');
    this.latest = save; this.o.session.onSave(save); this.o.status(false);
  }
  private apply(actions: CollectionAction[], patch: Parameters<RecoveryStore['commit']>[1] = {}): void {
    const engine = createEngine(this.latest);
    for (const action of actions) engine.apply(action);
    this.latest = this.recovery.commit(engine.toSave(), patch);
    this.actions.push(...actions);
    this.o.session.onSave(this.latest);
    this.o.status(false);
  }
  private async boundary<T>(work: () => Promise<NetResult<T>>): Promise<NetResult<T>> {
    if (this.busy || this.faulted) return failure('busy');
    this.busy = true; this.actions = []; this.replaced = false;
    try {
      this.persist(await this.o.capture(this.generation));
      return await work();
    } catch {
      try { this.faulted = this.recovery.unfinished; } catch { this.faulted = true; }
      this.o.status(true);
      return failure('storage');
    } finally {
      this.busy = false;
      this.generation++;
      this.actions.push({ type: 'syncAllocation', nextCompanionId: this.latest.nextCompanionId },
        { type: 'setPvpParty', ids: this.latest.pvpParty });
      this.o.release({ generation: this.generation, save: this.latest, replace: this.replaced,
        actions: this.actions, blocked: this.faulted });
    }
  }
  private async finishBattle(): Promise<NetResult<PvpResult>> {
    const pending = this.recovery.state.pendingBattle;
    if (!pending) return failure('busy');
    // Absolutely no PUT before a lost-result retry: the server may already
    // hold the newly stolen companion while the local snapshot is older.
    const reply = await this.o.session.pvp(pending.matchId, pending.party, true);
    if (!reply.ok) {
      if (reply.error === 'expired' || reply.error === 'cooldown') this.recovery.update({ pendingBattle: undefined });
      if (reply.error === 'stale-party') {
        const me = await this.o.session.me(); if (!me.ok) return me;
        this.apply([{ type: 'removeCompanions', ids: me.value.revokedIds },
          { type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses }], { pendingBattle: undefined });
      }
      return reply;
    }
    const r = reply.value;
    if (r.bot || r.opponent.playerId !== pending.opponentId) return failure('sync-required');
    const me = await this.o.session.me();
    if (!me.ok) return me;
    const actions: CollectionAction[] = [{ type: 'removeCompanions', ids: r.removed }];
    actions.push({ type: 'pvpResult', won: r.win, stolen: r.stolen, lostId: null,
      replay: { opponentName: r.opponent.name, opponentParty: r.opponent.party, blows: r.blows,
        ...(r.opponent.hero ? { opponentHero: r.opponent.hero } : {}) } });
    actions.push({ type: 'removeCompanions', ids: me.value.revokedIds });
    actions.push({ type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses });
    this.apply(actions, { pendingBattle: undefined, lastBattle: { at: (this.o.now ?? Date.now)(), before: pending.before, result: r } });
    return reply;
  }
  private async finishReclaim(): Promise<NetResult<ReclaimResult>> {
    const id = this.recovery.state.pendingReclaim;
    if (!id) return failure('busy');
    let reply = await this.reclaimRequest(id);
    // A pruned theft is terminal only after the authenticated state confirms
    // there is no committed receipt to recover.
    if (!reply.ok && reply.status === 404) {
      const state = await this.o.session.me(); if (!state.ok) return state;
      if (state.value.lastReclaim?.theftId === id) reply = { ok: true, value: { companion: state.value.lastReclaim.companion } };
      else { this.recovery.update({ pendingReclaim: undefined }); return { ok: false, error: 'gone' }; }
    }
    if (reply.ok) {
      const me = await this.o.session.me(); if (!me.ok) return me;
      this.apply([{ type: 'addCompanion', companion: reply.value.companion },
        { type: 'removeCompanions', ids: me.value.revokedIds },
        { type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses }], { pendingReclaim: undefined });
    }
    else if (reply.error === 'expired' || reply.error === 'gone') this.recovery.update({ pendingReclaim: undefined });
    return reply;
  }
  private async synchronize(): Promise<NetResult<null>> {
    if (this.recovery.state.pendingBattle) {
      const recovered = await this.finishBattle(); if (!recovered.ok && recovered.error !== 'expired') return recovered;
    }
    if (this.recovery.state.pendingReclaim) {
      const recovered = await this.finishReclaim(); if (!recovered.ok && recovered.error !== 'expired' && recovered.error !== 'gone') return recovered;
    }
    const me = await this.o.session.me();
    if (!me.ok) return me.status === 404 ? failure('sync-required') : me;
    const removed = new Set(me.value.revokedIds);
    const actions: CollectionAction[] = [{ type: 'removeCompanions', ids: this.latest.companions.filter(c => removed.has(c.id)).map(c => c.id) }];
    actions.push({ type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses });
    this.apply(actions);
    const uploaded = await this.o.session.sync();
    if (!uploaded.ok) return uploaded;
    this.apply([{ type: 'removeCompanions', ids: uploaded.value.removed }], { reconcilePending: false });
    return { ok: true, value: null };
  }
  async battleOpponent(opponentId: string): Promise<NetResult<PvpResult>> {
    return this.boundary(async () => {
      if (this.recovery.state.pendingBattle?.opponentId === opponentId) return this.finishBattle();
      const synced = await this.synchronize(); if (!synced.ok) return synced;
      const match = await this.o.session.match(opponentId); if (!match.ok) return match;
      if (match.value.bot || match.value.opponent.playerId !== opponentId) return failure('sync-required');
      const before = structuredClone(this.latest);
      const party = before.pvpParty.filter(id => before.companions.some(c => c.id === id));
      this.recovery.update({ pendingBattle: { opponentId, matchId: match.value.matchId, party, before } });
      return this.finishBattle();
    });
  }
  async leaderboard(n: number, metric?: LeaderboardMetric): Promise<NetResult<LeaderboardResult>> {
    return this.boundary(async () => { const synced = await this.synchronize(); return synced.ok ? this.o.session.leaderboard(n, metric) : synced; });
  }
  async opponents(): Promise<NetResult<OpponentListResult>> {
    return this.boundary(async () => { const synced = await this.synchronize(); return synced.ok ? this.o.session.opponents() : synced; });
  }
  async reclaim(id: string): Promise<NetResult<ReclaimResult>> {
    return this.boundary(async () => {
      if (this.recovery.state.pendingReclaim) return this.finishReclaim();
      const synced = await this.synchronize(); if (!synced.ok) return synced;
      this.recovery.update({ pendingReclaim: id }); return this.finishReclaim();
    });
  }
  async thefts(): Promise<NetResult<TheftsResult>> {
    if (this.busy || this.pending || this.recovery.state.reconcilePending) return failure('busy');
    return this.o.session.thefts();
  }
  async resetOrRestore(id?: string): Promise<OperationReply> {
    if (this.pending) return { ok: false, error: '먼저 미완료 전투·회수를 다시 시도하세요.' };
    const reply = await this.boundary(async () => {
      const candidate = id ? this.recovery.restoreCandidate(id) : parseSave(null);
      this.recovery.backup(this.latest, id ? 'restore' : 'reset');
      const engine = createEngine(candidate);
      engine.apply({ type: 'syncPvpProgress', ...this.o.session.pvpHistory() });
      this.latest = this.recovery.commit(engine.toSave(), { reconcilePending: true });
      this.replaced = true; this.recovery.prune(); this.o.session.onSave(this.latest);
      return { ok: true, value: null };
    });
    return reply.ok ? { ok: true } : { ok: false, error: reply.error === 'busy' ? '다른 작업이 진행 중입니다.' : '저장하지 못했습니다. 진행과 백업을 보존했습니다.' };
  }
}
