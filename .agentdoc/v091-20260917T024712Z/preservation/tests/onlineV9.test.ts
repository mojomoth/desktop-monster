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
  await client.upload(defender.token, { name: 'Defender', level: 1, bestIndex: 8, rebirths: 0,
    companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }], party: [] });
  let live = createEngine(parseSave({ version: 3, level: 20, coins: 55, monsterIndex: 20,
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
    const first = coordinator.battleOpponent(s.defender.playerId);
    expect(await coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'busy' });
    const reply = await first; expect(reply.ok).toBe(true);
    if (!reply.ok) throw Error(reply.error);
    expect(reply.value.opponent.playerId).toBe(s.defender.playerId);
    expect(reply.value.stolen).not.toBeNull();
    expect(s.live().toSave().companions.filter(c => c.id === reply.value.stolen?.id)).toHaveLength(1);
    expect(session.pvpHistory()).toEqual({ wins: 1, losses: 0 });
    expect(coordinator.pending).toBe(false);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
    expect(coordinator.recovery.state.lastBattle?.before.companions).toHaveLength(1);
    expect(s.calls.filter(path => path === 'POST /v1/pvp')).toHaveLength(1);
  });
  it('recovers a committed reply after client/server restart without any intervening upload', async () => {
    const s = await setup(); let running = s.start(); s.lostReply();
    expect(await running.coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'network' });
    expect(running.coordinator.pending).toBe(true);
    expect(await running.coordinator.resetOrRestore()).toMatchObject({ ok: false });
    const playerId = running.session.identity().playerId!;
    expect((await s.store.getById(playerId))?.snapshot?.companions).toHaveLength(2);
    const count = s.calls.length; s.restartServer(); running = s.start();
    running.session.identity(); running.session.onSave(s.live().toSave());
    expect(s.calls).toHaveLength(count);
    const recovered = await running.coordinator.battleOpponent(s.defender.playerId);
    expect(recovered.ok).toBe(true);
    expect(s.calls.slice(count)).toEqual(['POST /v1/pvp', 'GET /v1/me']);
    expect(s.live().toSave().companions).toHaveLength(2);
    expect((await s.store.getById(playerId))?.wins).toBe(1);
    expect(running.coordinator.pending).toBe(false);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
  });
  it('rejects stale generation saves after reset and restores local progress with the same identity', async () => {
    const s = await setup(); const { coordinator, session } = s.start();
    await coordinator.opponents(); const identity = session.identity();
    const old = s.live().toSave(), generation = coordinator.generation;
    expect(await coordinator.resetOrRestore()).toEqual({ ok: true });
    expect(s.live().toSave()).toMatchObject({ level: 1, coins: 0, earlyCaptureUsed: 0 });
    expect(coordinator.save(old, generation)).toBe(false);
    const checkpoint = coordinator.recovery.list()[0]!;
    expect(await coordinator.resetOrRestore(checkpoint.id)).toEqual({ ok: true });
    expect(s.live().toSave()).toMatchObject({ level: old.level, coins: 55, companions: old.companions });
    expect(session.identity()).toEqual(identity);
    expect(coordinator.recovery.state.reconcilePending).toBe(true);
    expect((await coordinator.leaderboard(10, 'level')).ok).toBe(true);
    expect(coordinator.recovery.state.reconcilePending).toBe(false);
  });
  it('recovers A before handling a new B click and never returns A as the selected B result', async () => {
    const s = await setup(); const running = s.start();
    const other = await s.client.register('Other'); if (!other.ok) throw Error('fixture register B');
    await s.client.upload(other.value.token, { name: 'Other', level: 1, bestIndex: 8, rebirths: 0,
      companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }], party: [] });
    s.lostReply();
    expect(await running.coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'network' });
    const from = s.calls.length;
    const result = await running.coordinator.battleOpponent(other.value.playerId);
    expect(result).toMatchObject({ ok: false, error: 'cooldown' });
    expect(s.calls.slice(from, from + 2)).toEqual(['POST /v1/pvp', 'GET /v1/me']);
    expect(s.calls.slice(from)).toEqual(['POST /v1/pvp', 'GET /v1/me', 'GET /v1/me',
      'PUT /v1/snapshot', 'POST /v1/pvp/match', 'POST /v1/pvp']);
    expect(running.coordinator.pending).toBe(false);
    expect(running.session.pvpHistory()).toEqual({ wins: 1, losses: 0 });
    expect(running.coordinator.recovery.state.lastBattle?.result.opponent.playerId).toBe(s.defender.playerId);
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
  it('does not resurrect a stolen reward reclaimed while the battle reply was lost', async () => {
    const s = await setup(); let running = s.start(); s.lostReply();
    expect(await running.coordinator.battleOpponent(s.defender.playerId)).toEqual({ ok: false, error: 'network' });
    const thefts = await s.client.thefts(s.defender.token);
    if (!thefts.ok) throw Error('fixture thefts');
    expect(thefts.value.thefts).toHaveLength(1);
    expect((await s.client.reclaim(s.defender.token, thefts.value.thefts[0]!.id)).ok).toBe(true);
    s.restartServer(); running = s.start();
    expect((await running.coordinator.battleOpponent(s.defender.playerId)).ok).toBe(true);
    expect(s.live().toSave().companions).toHaveLength(1);
    expect(running.coordinator.pending).toBe(false);
    expect(JSON.parse(readFileSync(join(s.directory, 'save.json'), 'utf8'))).toEqual(s.live().toSave());
  });
});
