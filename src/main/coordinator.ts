import { EQUIPMENT_PROTOCOL } from '../shared/api.js';
// Serializes user-visible online mutations with the one live engine. The
// overlay pauses only at an explicit operation boundary; ordinary play stays local.
import { createEngine, parseSave, settlePvpGold } from '../core/index.js';
import type { SaveFile } from '../core/save.js';
import type { CollectionAction } from '../core/collection.js';
import type { LeaderboardMetric, LeaderboardResult, NetResult, OpponentListResult, PvpResult, ReclaimResult, TheftsResult, PvpGoldState, PvpPresentation } from '../shared/api.js';
import type { NetSession } from './net.js';
import { RecoveryStore } from './recovery.js';
import { readSaveFileResult, writeSaveFile } from './persistence.js';

export interface StateRelease { generation: number; save: SaveFile; replace: boolean; actions: CollectionAction[]; blocked: boolean; replays?: PvpPresentation[] }
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
  private lastWalletSync = 0;
  private polling = false;
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
  get replaying(): boolean { return this.pendingReplays().length > 0; }
  pendingReplays(): PvpPresentation[] { return this.recovery.state.replays ?? []; }
  completeReplay(id: string): boolean {
    const queue = this.pendingReplays();
    if (!queue.some(p => p.battleId === id)) return true;
    if (queue[0]?.battleId !== id || this.busy) return false;
    try { this.recovery.update({ replays: queue.slice(1) }); return true; }
    catch { this.o.status(true); return false; }
  }
  save(value: unknown, generation: number): boolean {
    if (this.busy || this.faulted || generation !== this.generation) return false;
    try { this.persist(parseSave(value)); return true; }
    catch { this.o.status(true); return false; }
  }
  /** Flush pending input and its complete equipment batch before normal quit. */
  async flushForQuit(): Promise<boolean> {
    if (this.busy || this.faulted) return false;
    this.busy = true;
    try { this.persist(await this.o.capture(this.generation)); return true; }
    catch { this.o.status(true); return false; }
    finally {
      this.busy = false; this.generation++;
      this.o.release({ generation: this.generation, save: this.latest, replace: false, actions: [], blocked: this.faulted });
    }
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
    if (this.busy || this.faulted || this.replaying) return failure('busy');
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
        actions: this.actions, blocked: this.faulted, replays: this.pendingReplays() });
    }
  }
  private async finishBattle(received?: NetResult<PvpResult>): Promise<NetResult<PvpResult>> {
    const pending = this.recovery.state.pendingBattle;
    if (!pending) return failure('busy');
    // Absolutely no PUT before a lost-result retry: the server may already
    // hold the newly stolen companion while the local snapshot is older.
    const reply = received ?? await this.o.session.pvp(pending.matchId, pending.party, true);
    if (!reply.ok) {
      if (reply.error === 'expired' || reply.error === 'cooldown' || reply.error === 'opponent-busy' ||
        (reply.error === 'sync-required' && reply.status === 426)) this.recovery.update({ pendingBattle: undefined });
      if (reply.error === 'stale-party') {
        const me = await this.o.session.me(); if (!me.ok) return me;
        this.apply([{ type: 'removeCompanions', ids: me.value.revokedIds },
          { type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses }], { pendingBattle: undefined });
      }
      return reply;
    }
    const r = reply.value;
    if (r.bot || r.opponent.playerId !== pending.opponentId) return failure('sync-required');
    if ((pending.mode === 'gold-v1' || pending.mode === EQUIPMENT_PROTOCOL) && (!r.gold || !r.ownParty)) return failure('sync-required');
    const me = await this.o.session.me();
    if (!me.ok) return me;
    const actions: CollectionAction[] = [{ type: 'removeCompanions', ids: r.removed }];
    const replays = this.pendingReplays();
    if (r.gold) {
      if (me.value.pvpMode !== EQUIPMENT_PROTOCOL || !me.value.gold) return failure('sync-required');
      actions.push(...this.goldActions(me.value.gold));
      replays.push({ battleId: pending.matchId + '-A', role: 'attack', ownParty: r.ownParty ?? [], ownHero: r.ownHero, ownCombat: r.ownCombat,
        won: r.win, goldDelta: r.gold.delta,
        replay: { opponentName: r.opponent.name, opponentParty: r.opponent.party, opponentHero: r.opponent.hero, opponentCombat: r.opponent.combat,
          ownFighters: r.ownFighters, opponentFighters: r.opponentFighters, blows: r.blows } });
    } else {
      // Only an already committed pre-upgrade receipt can still contain a companion transfer.
      actions.push({ type: 'pvpResult', won: r.win, stolen: r.stolen, lostId: null,
        replay: { opponentName: r.opponent.name, opponentParty: r.opponent.party, blows: r.blows,
          ...(r.opponent.hero ? { opponentHero: r.opponent.hero } : {}) } });
    }
    actions.push({ type: 'removeCompanions', ids: me.value.revokedIds });
    actions.push({ type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses });
    this.apply(actions, { pendingBattle: undefined, replays, ...(me.value.gold ? { gold: me.value.gold } : {}),
      lastBattle: { at: (this.o.now ?? Date.now)(), before: pending.before, result: r } });
    return reply;
  }
  private async finishReclaim(received?: NetResult<ReclaimResult>): Promise<NetResult<ReclaimResult>> {
    const id = this.recovery.state.pendingReclaim;
    if (!id) return failure('busy');
    let reply = received ?? await this.reclaimRequest(id);
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
    for (let attempt = 0; attempt < 3; attempt++) {
      const me = await this.o.session.me();
      if (!me.ok) return me.status === 404 ? failure('sync-required') : me;
      if (me.value.pvpMode !== EQUIPMENT_PROTOCOL || !me.value.gold) return failure('sync-required');
      const removed = new Set(me.value.revokedIds);
      const actions: CollectionAction[] = [{ type: 'removeCompanions', ids: this.latest.companions.filter(c => removed.has(c.id)).map(c => c.id) },
        { type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses }, ...this.goldActions(me.value.gold)];
      this.apply(actions, { gold: me.value.gold });
      const uploaded = await this.o.session.sync();
      if (!uploaded.ok) { if (uploaded.error === 'gold-conflict') continue; return uploaded; }
      if (!uploaded.value.gold) return failure('sync-required');
      this.apply([{ type: 'removeCompanions', ids: uploaded.value.removed }, ...this.goldActions(uploaded.value.gold)],
        { reconcilePending: false, gold: uploaded.value.gold });
      this.lastWalletSync = (this.o.now ?? Date.now)();
      return { ok: true, value: null };
    }
    return { ok: false, error: 'gold-conflict' };
  }
  private goldActions(gold: PvpGoldState): CollectionAction[] {
    if ('error' in settlePvpGold(this.latest, gold.net)) throw Error('Gold settlement exceeds supported balance');
    this.o.session.setGoldRevision?.(gold.revision);
    return [{ type: 'syncPvpGold', net: gold.net }];
  }
  /** Receipt ACK follows durable local delivery; animation completion is independent. */
  async pollIncoming(): Promise<NetResult<null>> {
    if (this.polling || this.busy || this.faulted || this.replaying) return failure('busy');
    if (!this.o.session.events || !this.o.session.ackEvents || !this.o.session.identity().online) return failure('sync-required');
    this.polling = true;
    try {
      const pending = this.recovery.state;
      if (pending.pendingBattle || pending.pendingReclaim) {
        // Fetch first: an offline retry must not pause the hunting engine while it times out.
        if (pending.pendingBattle) {
          const battle = pending.pendingBattle;
          const reply = await this.o.session.pvp(battle.matchId, battle.party, true);
          if (!reply.ok && (reply.error === 'network' || reply.error === 'server')) return reply;
          return this.boundary<null>(async () => {
            if (this.recovery.state.pendingBattle?.matchId !== battle.matchId) return failure('busy');
            const done = await this.finishBattle(reply);
            return done.ok ? { ok: true, value: null } : done;
          });
        }
        const id = pending.pendingReclaim!;
        const reply = await this.reclaimRequest(id);
        if (!reply.ok && (reply.error === 'network' || reply.error === 'server')) return reply;
        return this.boundary<null>(async () => {
          if (this.recovery.state.pendingReclaim !== id) return failure('busy');
          const done = await this.finishReclaim(reply);
          return done.ok ? { ok: true, value: null } : done;
        });
      }
      const cursor = this.recovery.state.defenseCursor ?? 0;
      // Retry an ACK lost after the local journal committed, even when no new events arrive.
      if (cursor > 0) await this.o.session.ackEvents(cursor);
      const inbox = await this.o.session.events(cursor); if (!inbox.ok) return inbox;
      const events = inbox.value.events.filter(e => e.seq > cursor);
      if (events.length && events[0]!.seq !== cursor + 1) return failure('sync-required');
      if (events.length === 0 && this.lastWalletSync > 0 && (this.o.now ?? Date.now)() - this.lastWalletSync < 60_000) return { ok: true, value: null };
      const result = await this.boundary<null>(async () => {
        const synced = await this.synchronize(); if (!synced.ok) return synced;
        if (events.length) {
          const replays = [...this.pendingReplays(), ...events.map(e => e.presentation)];
          if (replays.length > 6) return failure('busy');
          this.apply([], { defenseCursor: events.at(-1)!.seq, replays });
        }
        return { ok: true as const, value: null };
      });
      if (result.ok && events.length) await this.o.session.ackEvents(events.at(-1)!.seq);
      return result;
    } finally { this.polling = false; }
  }
  async battleOpponent(opponentId: string): Promise<NetResult<PvpResult>> {
    return this.boundary(async () => {
      if (this.recovery.state.pendingBattle?.opponentId === opponentId) return this.finishBattle();
      const synced = await this.synchronize(); if (!synced.ok) return synced;
      if (this.replaying) return failure('busy');
      const match = await this.o.session.match(opponentId); if (!match.ok) return match;
      if (match.value.bot || match.value.opponent.playerId !== opponentId) return failure('sync-required');
      const before = structuredClone(this.latest);
      const party = before.pvpParty.filter(id => before.companions.some(c => c.id === id));
      this.recovery.update({ pendingBattle: { opponentId, matchId: match.value.matchId, party, before, mode: EQUIPMENT_PROTOCOL } });
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
      // Restores retain their historical net; reset discards cash but never unpaid settlement.
      if (!id) {
        candidate.pvpGoldNet = this.latest.pvpGoldNet ?? '0';
        candidate.pvpGoldDebt = this.latest.pvpGoldDebt ?? '0';
      }
      const gold = this.recovery.state.gold;
      const settled = gold ? settlePvpGold(candidate, gold.net) : candidate;
      if ('error' in settled) throw Error('Restored gold exceeds supported balance');
      this.recovery.backup(this.latest, id ? 'restore' : 'reset');
      const engine = createEngine({ ...candidate, ...settled, coins: String(settled.coins) });
      engine.apply({ type: 'syncPvpProgress', ...this.o.session.pvpHistory() });
      this.latest = this.recovery.commit(engine.toSave(), { reconcilePending: true });
      this.replaced = true; this.recovery.prune(); this.o.session.onSave(this.latest);
      return { ok: true, value: null };
    });
    return reply.ok ? { ok: true } : { ok: false, error: reply.error === 'busy' ? '다른 작업이 진행 중입니다.' : '저장하지 못했습니다. 진행과 백업을 보존했습니다.' };
  }
}
