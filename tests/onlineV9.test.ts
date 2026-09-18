import { modernSnapshot } from './server/v10-fixture.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, matches } from '../src/server/app.js';
import { MemoryStore } from '../src/server/store.js';
import { createEngine, parseSave } from '../src/core/index.js';
import { createNetClient, createNetSession } from '../src/main/net.js';
import { ProgressCoordinator } from '../src/main/coordinator.js';
import type { RegisterResponse } from '../src/shared/api.js';
import { writeSaveFile } from '../src/main/persistence.js';

const directories: string[] = [];
beforeEach(() => matches.clear());
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });
async function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'desmon-v9-online-')); directories.push(directory);
  const store = new MemoryStore(); let serial = 0; let clock = 1000;
  const deps = { store, now: () => clock, randomUUID: () => `user-${++serial}`,
    randomBytesHex: (n: number) => (++serial).toString(16).padStart(n * 2, '0'), randomSeed: () => 7 };
  let app = createApp(deps); let dropReply = false; let beforeUpload: (() => Promise<void>) | undefined;
  let beforeBattle: (() => Promise<void>) | undefined;
  const calls: string[] = [];
  const fetchFn: typeof fetch = async (url, init = {}) => {
    const parsed = new URL(String(url));
    const method = init.method ?? 'GET'; calls.push(`${method} ${parsed.pathname}`);
    if (method === 'PUT' && beforeUpload) { const work = beforeUpload; beforeUpload = undefined; await work(); }
    if (parsed.pathname === '/v1/pvp' && beforeBattle) { const work = beforeBattle; beforeBattle = undefined; await work(); }
    const auth = (init.headers as Record<string, string> | undefined)?.authorization?.replace('Bearer ', '') ?? null;
    const reply = await app.handle({ method, path: parsed.pathname, auth, body: init.body ? JSON.parse(String(init.body)) as unknown : null,
      query: Object.fromEntries(parsed.searchParams), ip: 'fixture' });
    if (dropReply && parsed.pathname === '/v1/pvp' && reply.status === 200) { dropReply = false; throw Error('Reply lost after server commit'); }
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  };
  const client = createNetClient({ baseUrl: 'https://injected.invalid', fetchFn });
  const registered = await client.register('Defender'); if (!registered.ok) throw Error('fixture registration');
  const defender: RegisterResponse = registered.value;
  expect((await client.upload(defender.token, modernSnapshot({ name: 'Defender', level: 1, bestIndex: 8, rebirths: 0,
    companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }], party: [],
    gold: { revision: 0, coins: '1000' } }))).ok).toBe(true);
  let live = createEngine(parseSave({ version: 4, level: 20, coins: '1000', monsterIndex: 20,
    nextCompanionId: 2, companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 87, level: 200, stars: 2 }] }));
  writeSaveFile(directory, live.toSave());
  const start = () => {
    const session = createNetSession({ client, userDataDir: directory, online: true, randomUUID: () => 'abcd-1', managed: true });
    const coordinator = new ProgressCoordinator({ directory, initial: live.toSave(), session,
      capture: async () => live.toSave(), status: () => undefined, now: () => clock,
      release: state => { if (state.replace) live = createEngine(state.save); else for (const a of state.actions) live.apply(a); } });
    return { session, coordinator };
  };
  return { directory, store, client, defender, calls, start, live: () => live,
    lostReply: () => { dropReply = true; }, advance: () => { clock += 60000; },
    restartServer: () => { matches.clear(); app = createApp(deps); },
    beforeUpload: (work: () => Promise<void>) => { beforeUpload = work; },
    beforeBattle: (work: () => Promise<void>) => { beforeBattle = work; } };
}

describe('v0.9 main-owned operations against the injected real HTTP handler', () => {
  it('uses the clicked opponent and applies one durable result despite duplicate clicks', async () => {
    const s = await setup(); const { coordinator, session } = s.start();
    const roster = s.live().toSave().companions;
    const defenderRoster = (await s.store.getById(s.defender.playerId))!.snapshot!.companions;
    const first = coordinator.battleOpponent(s.defender.playerId);
    expect(await coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'busy' });
    const reply = await first; expect(reply.ok).toBe(true);
    if (!reply.ok) throw Error(reply.error);
    expect(reply.value.opponent.playerId).toBe(s.defender.playerId);
    expect(reply.value).toMatchObject({ stolen: null, lost: null, gold: { amount: '50', delta: '50', reason: 'transfer' } });
    expect(s.live().toSave()).toMatchObject({ coins: '1050', pvpGoldNet: '50', companions: roster });
    expect((await s.store.getById(s.defender.playerId))!.snapshot!.companions).toEqual(defenderRoster);
    expect((await s.store.getById(s.defender.playerId))!.goldAccount).toMatchObject({ balance: '950', net: '-50' });
    expect(session.pvpHistory()).toEqual({ wins: 1, losses: 0 });
    expect(coordinator.pending).toBe(false);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
    expect(coordinator.recovery.state.lastBattle?.before.companions).toHaveLength(1);
    expect(s.calls.filter(path => path === 'POST /v1/pvp')).toHaveLength(1);
    const replays = coordinator.pendingReplays();
    expect(replays).toHaveLength(1);
    expect(replays[0]).toMatchObject({ role: 'attack', goldDelta: '50', ownParty: roster });
    expect(await coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'busy' });
    expect(coordinator.completeReplay(replays[0]!.battleId)).toBe(true);
    expect(coordinator.replaying).toBe(false);
    expect(s.live().toSave().coins).toBe('1050');
  });
  it('recovers a committed reply after client/server restart without any intervening upload', async () => {
    const s = await setup(); let running = s.start(); s.lostReply();
    expect(await running.coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'network' });
    expect(running.coordinator.pending).toBe(true);
    expect(await running.coordinator.resetOrRestore()).toMatchObject({ ok: false });
    const playerId = running.session.identity().playerId!;
    const roster = s.live().toSave().companions;
    expect((await s.store.getById(playerId))?.snapshot?.companions).toEqual(roster);
    expect((await s.store.getById(playerId))?.goldAccount).toMatchObject({ balance: '1050', net: '50' });
    expect(s.live().toSave().coins).toBe('1000');
    const count = s.calls.length; s.restartServer(); running = s.start();
    running.session.identity(); running.session.onSave(s.live().toSave());
    expect(s.calls).toHaveLength(count);
    const recovered = await running.coordinator.battleOpponent(s.defender.playerId);
    expect(recovered.ok).toBe(true);
    expect(s.calls.slice(count)).toEqual(['POST /v1/pvp', 'GET /v1/me']);
    expect(s.live().toSave()).toMatchObject({ companions: roster, coins: '1050', pvpGoldNet: '50' });
    expect((await s.store.getById(playerId))?.wins).toBe(1);
    expect(running.coordinator.pending).toBe(false);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
    const replay = running.coordinator.pendingReplays()[0]!;
    expect(running.coordinator.pendingReplays()).toHaveLength(1);
    expect(running.coordinator.completeReplay(replay.battleId)).toBe(true);
    expect(running.coordinator.completeReplay(replay.battleId)).toBe(true);
    expect(s.live().toSave().coins).toBe('1050');
  });
  it('rejects stale generation saves after reset and restores local progress with the same identity', async () => {
    const s = await setup(); const { coordinator, session } = s.start();
    await coordinator.opponents(); const identity = session.identity();
    const old = s.live().toSave(), generation = coordinator.generation;
    expect(await coordinator.resetOrRestore()).toEqual({ ok: true });
    expect(s.live().toSave()).toMatchObject({ level: 1, coins: '0', earlyCaptureUsed: 0 });
    expect(coordinator.save(old, generation)).toBe(false);
    const checkpoint = coordinator.recovery.list()[0]!;
    expect(await coordinator.resetOrRestore(checkpoint.id)).toEqual({ ok: true });
    expect(s.live().toSave()).toMatchObject({ level: old.level, coins: '1000', companions: old.companions });
    expect(session.identity()).toEqual(identity);
    expect(coordinator.recovery.state.reconcilePending).toBe(true);
    expect((await coordinator.leaderboard(10, 'level')).ok).toBe(true);
    expect(coordinator.recovery.state.reconcilePending).toBe(false);
  });
  it('recovers A before handling a new B click and never returns A as the selected B result', async () => {
    const s = await setup(); const running = s.start();
    const other = await s.client.register('Other'); if (!other.ok) throw Error('fixture register B');
    expect((await s.client.upload(other.value.token, modernSnapshot({ name: 'Other', level: 1, bestIndex: 8, rebirths: 0,
      companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }], party: [],
      gold: { revision: 0, coins: '1000' } }))).ok).toBe(true);
    s.lostReply();
    expect(await running.coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'network' });
    const from = s.calls.length;
    const result = await running.coordinator.battleOpponent(other.value.playerId);
    expect(result).toEqual({ ok: false, error: 'busy' }); // A's recovered replay must finish before B can begin.
    expect(s.calls.slice(from, from + 2)).toEqual(['POST /v1/pvp', 'GET /v1/me']);
    expect(s.calls.slice(from)).toEqual(['POST /v1/pvp', 'GET /v1/me', 'GET /v1/me', 'PUT /v1/snapshot']);
    expect(running.coordinator.pending).toBe(false);
    expect(running.session.pvpHistory()).toEqual({ wins: 1, losses: 0 });
    expect(running.coordinator.recovery.state.lastBattle?.result.opponent.playerId).toBe(s.defender.playerId);
    expect(running.coordinator.pendingReplays()).toHaveLength(1);
    expect(running.coordinator.completeReplay(running.coordinator.pendingReplays()[0]!.battleId)).toBe(true);
    expect(await running.coordinator.battleOpponent(other.value.playerId)).toMatchObject({ ok: false, error: 'cooldown' });
    s.advance();
    const next = await running.coordinator.battleOpponent(other.value.playerId);
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.value.opponent.playerId).toBe(other.value.playerId);
  });
  it('applies revocation occurring between /me and PUT before returning the ranking', async () => {
    const s = await setup(); const { coordinator, session } = s.start();
    s.live().apply({ type: 'setPvpParty', ids: ['c1'] });
    await coordinator.opponents(); const playerId = session.identity().playerId!;
    s.beforeUpload(async () => {
      const current = await s.store.getById(playerId);
      await s.store.setStolenIds(playerId, [...current!.stolenIds, 'c1']);
    });
    expect((await coordinator.leaderboard(10, 'level')).ok).toBe(true);
    expect(s.live().toSave().companions).toHaveLength(0);
    expect((await s.store.getById(playerId))?.snapshot?.companions).toHaveLength(0);
    expect(s.live().toSave().pvpParty).toEqual([]);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
  });
  it('clears an authenticated missing theft without leaving a permanent reset lock', async () => {
    const s = await setup(); const { coordinator } = s.start();
    expect(await coordinator.reclaim('t999')).toEqual({ ok: false, error: 'gone' });
    expect(coordinator.pending).toBe(false);
    expect(await coordinator.resetOrRestore()).toEqual({ ok: true });
  });
  it('releases a stale manual party when its member moves between match and battle', async () => {
    const s = await setup(); const { coordinator, session } = s.start();
    s.live().apply({ type: 'setPvpParty', ids: ['c1'] });
    await coordinator.opponents(); const playerId = session.identity().playerId!;
    s.beforeBattle(async () => { await s.store.setStolenIds(playerId, ['c1']); });
    expect(await coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'stale-party', status: 400 });
    expect(coordinator.pending).toBe(false);
    expect(s.live().toSave().pvpParty).toEqual([]);
    expect(s.live().toSave().companions).toEqual([]);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
    expect(await coordinator.resetOrRestore()).toEqual({ ok: true });
  });
  it('does not reapply an old gold reward after a newer server loss while the battle reply was lost', async () => {
    const s = await setup(); let running = s.start(); s.lostReply();
    const roster = s.live().toSave().companions;
    expect(await running.coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'network' });
    const playerId = running.session.identity().playerId!;
    expect((await s.store.getById(playerId))?.goldAccount).toMatchObject({ balance: '1050', net: '50' });
    const thefts = await s.client.thefts(s.defender.token);
    if (!thefts.ok) throw Error('fixture thefts');
    expect(thefts.value.thefts).toEqual([]);
    const raider = await s.client.register('Raider'); if (!raider.ok) throw Error('fixture raider');
    expect((await s.client.upload(raider.value.token, modernSnapshot({ name: 'Raider', level: 100, bestIndex: 100, rebirths: 0,
      companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 87, level: 2000, stars: 2 }], party: [],
      gold: { revision: 0, coins: '1000' } }))).ok).toBe(true);
    const raid = await s.client.match(raider.value.token, playerId); if (!raid.ok) throw Error('fixture raid match');
    const loss = await s.client.pvp(raider.value.token, { matchId: raid.value.matchId, party: [] });
    expect(loss).toMatchObject({ ok: true, value: { win: true, stolen: null, lost: null,
      gold: { amount: '50', delta: '50', reason: 'transfer' } } });
    expect((await s.store.getById(playerId))?.goldAccount).toMatchObject({ balance: '1000', net: '0' });
    s.restartServer(); running = s.start();
    const from = s.calls.length;
    const recovered = await running.coordinator.battleOpponent(s.defender.playerId);
    expect(recovered).toMatchObject({ ok: true, value: { opponent: { playerId: s.defender.playerId }, gold: { delta: '50' } } });
    expect(s.calls.slice(from)).toEqual(['POST /v1/pvp', 'GET /v1/me']);
    expect(s.live().toSave()).toMatchObject({ companions: roster, coins: '1000', pvpGoldNet: '0' });
    expect(running.session.pvpHistory()).toEqual({ wins: 1, losses: 1 });
    expect(running.coordinator.pending).toBe(false);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
    expect(running.coordinator.completeReplay(running.coordinator.pendingReplays()[0]!.battleId)).toBe(true);
    expect(s.live().toSave().coins).toBe('1000');
  });
});
