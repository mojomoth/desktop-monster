import { modernSnapshot } from './v10-fixture.js';
import { legacyTheft } from './legacy.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, matches, PVP_COOLDOWN_MS } from '../../src/server/app.js';
import type { ApiRequest } from '../../src/server/http.js';
import { MemoryStore } from '../../src/server/store.js';
import type { LeaderboardResponse, MatchResponse, MeResponse, PvpResponse, RegisterResponse, Snapshot } from '../../src/shared/api.js';

beforeEach(() => matches.clear());

function setup() {
  const store = new MemoryStore();
  let serial = 0, clock = 1000;
  const deps = { store, now: () => clock, randomUUID: () => `user-${++serial}`,
    randomBytesHex: (bytes: number) => (++serial).toString(16).padStart(bytes * 2, '0'), randomSeed: () => 7 };
  let app = createApp(deps);
  const call = (method: string, path: string, auth: string | null = null, body: unknown = null, query = {}) =>
    app.handle({ method, path, auth, body: path.startsWith('/v1/pvp') && method === 'POST' ? { mode: 'equipment-gold-v2', ...body as object } : path === '/v1/snapshot' && body && typeof body === 'object' ? modernSnapshot(body) : body, query, ip: 'isolated' } satisfies ApiRequest);
  const join = async (nickname: string, snapshot: Partial<Snapshot> = {}) => {
    const response = await call('POST', '/v1/players', null, { nickname });
    const player = response.body as RegisterResponse;
    const value: Snapshot = { name: nickname, bestIndex: 8, rebirths: 0, companions: [], party: [], ...snapshot };
    expect((await call('PUT', '/v1/snapshot', player.token, { ...value, gold: { revision: 0, coins: 1000 } })).status).toBe(200);
    return player;
  };
  return { store, call, join, advance: (ms = PVP_COOLDOWN_MS) => { clock += ms; },
    restart: () => { matches.clear(); app = createApp(deps); } };
}

describe('v0.9 ranking and authenticated recovery state', () => {
  it('orders each metric independently, shares ties and returns own absolute rank outside top', async () => {
    const s = setup();
    const a = await s.join('a', { level: Number.MAX_SAFE_INTEGER, bestIndex: 5, rebirths: 1 });
    const b = await s.join('b', { level: Number.MAX_SAFE_INTEGER, bestIndex: 9, rebirths: 2 });
    const c = await s.join('c', { level: 10, bestIndex: 1, rebirths: 3 });
    await s.store.recordBattle(c.playerId, a.playerId);
    for (const [metric, first, mine] of [['level', 'a', 3], ['pvpWins', 'c', 1], ['bestIndex', 'b', 3], ['rebirths', 'c', 1]] as const) {
      const response = await s.call('GET', '/v1/leaderboard', c.token, null, { metric, n: '1' });
      expect(response.status).toBe(200);
      const board = response.body as LeaderboardResponse;
      expect(board.metric).toBe(metric);
      expect(board.top).toHaveLength(1);
      expect(board.top[0]?.name).toBe(first);
      expect(board.me?.rank).toBe(mine);
      expect(board.me).toMatchObject({ wins: 1, losses: 0, level: 10 });
    }
    const tied = (await s.call('GET', '/v1/leaderboard', b.token, null, { metric: 'level' })).body as LeaderboardResponse;
    expect(tied.top.map(row => row.rank)).toEqual([1, 1, 3]);
    expect(tied.me?.rank).toBe(1);
  });

  it('does not invent levels for legacy uploads, accept PvP totals, or interpolate metric inputs', async () => {
    const s = setup();
    const old = await s.join('old');
    const response = await s.call('GET', '/v1/leaderboard', old.token, null, { metric: 'level' });
    expect(response.body).toEqual({ metric: 'level', top: [], me: null });
    expect((await s.call('GET', '/v1/leaderboard', old.token, null, { metric: 'wins; DROP TABLE players' })).status).toBe(400);
    const snapshot = { name: 'old', bestIndex: 4, rebirths: 1, companions: [], party: [], wins: 999, losses: 999 };
    for (const level of [0, -1, 1.5, '5', null, Number.MAX_SAFE_INTEGER + 1]) {
      expect((await s.call('PUT', '/v1/snapshot', old.token, { ...snapshot, level })).status).toBe(400);
    }
    expect((await s.call('PUT', '/v1/snapshot', old.token, { ...snapshot, level: Number.MAX_SAFE_INTEGER })).status).toBe(200);
    expect((await s.call('GET', '/v1/me', old.token)).body).toEqual({ version: 9, wins: 0, losses: 0, revokedIds: [], lastMatch: null, lastReclaim: null, pvpMode: 'equipment-gold-v2', gold: { revision: 1, net: '0', balance: '1000' } });
    expect((await s.call('GET', '/v1/me')).status).toBe(401);
    expect((await s.call('GET', '/v1/me', 'wrong')).status).toBe(401);
  });

  it('retains more than 32 revoked IDs across legacy truncation, writes and application restarts', async () => {
    const s = setup();
    const owner = await s.join('owner');
    const ids = Array.from({ length: 45 }, (_, i) => `c${i + 1}`);
    for (let i = 1; i <= ids.length; i++) await s.store.setStolenIds(owner.playerId, ids.slice(Math.max(0, i - 32), i));
    await s.store.setStolenIds(owner.playerId, []); // old clients cannot clear the permanent ledger
    s.restart();
    const profile = (await s.call('GET', '/v1/me', owner.token)).body as MeResponse;
    expect(profile.revokedIds).toEqual(ids);
    const snapshot: Snapshot = { name: 'owner', bestIndex: 2, rebirths: 0,
      companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }], party: ['c1'] };
    // Direct legacy store writes are filtered, even without the new HTTP handler.
    await s.store.putSnapshot(owner.playerId, snapshot);
    expect((await s.store.getById(owner.playerId))?.snapshot).toEqual({ ...snapshot, companions: [], party: [] });
    const response = await s.call('PUT', '/v1/snapshot', owner.token, snapshot);
    expect(response.body).toMatchObject({ removed: ['c1'] });
  });

  it('rolls back permanent revocations and cached results along with a failed transaction', async () => {
    const s = setup();
    const owner = await s.join('owner');
    await expect(s.store.transaction(async tx => {
      await tx.setStolenIds(owner.playerId, ['c1']);
      throw new Error('disk transaction');
    })).rejects.toThrow('disk transaction');
    expect((await s.call('GET', '/v1/me', owner.token)).body).toMatchObject({ revokedIds: [], lastMatch: null, lastReclaim: null });
  });
});

describe('v0.9 committed PvP retry', () => {
  it('returns an already committed companion receipt without requiring new gold enrollment or rerunning its transfer', async () => {
    const s = setup();
    const owner = await s.join('old');
    const stolen = { id: 's7', speciesId: 'slime', level: 1, stars: 0, bossIndex: 7 };
    const result: PvpResponse = { matchId: 'old-match', bot: false, seed: 7, win: true,
      opponent: { playerId: 'legacy-opponent', name: 'legacy', bestIndex: 7, rebirths: 0, party: [] },
      blows: [], stolen, lost: null };
    await s.store.setLastMatch(owner.playerId, { matchId: 'old-match', result });
    s.restart();
    const before = structuredClone(await s.store.getById(owner.playerId));
    for (let i = 0; i < 2; i++) {
      expect(await s.call('POST', '/v1/pvp', owner.token, { matchId: 'old-match', party: [], mode: undefined }))
        .toEqual({ status: 200, body: result });
    }
    expect(await s.store.getById(owner.playerId)).toEqual(before);
  });
  it('never aliases a consumed transfer with a later same-seed gain when an old checkpoint is restored', async () => {
    const s = setup();
    const c = (id: string, level: number, speciesId = 'slime') => ({ id, level, speciesId, bossIndex: 7, stars: 0 });
    const attacker = await s.join('attacker', { companions: [c('c1', 100)] });
    const first = await s.join('first', { companions: [c('c2', 1)] });
    const second = await s.join('second', { companions: [c('c3', 1, 'bat')] });
    const win = async (opponentId: string) => ({ stolen: (await legacyTheft(s.store, attacker.playerId, opponentId,
      opponentId === first.playerId ? 'c2' : 'c3')).transferred });
    const old = await win(first.playerId);
    const checkpoint = (await s.store.getById(attacker.playerId))!.snapshot!;
    await s.store.putSnapshot(attacker.playerId, { ...checkpoint, companions: [c('c1', 100)] }); // consumed
    s.advance(); s.restart();
    const later = await win(second.playerId);
    expect([old.stolen?.id, later.stolen?.id]).toEqual(['s7', 's8']);
    await s.store.putSnapshot(attacker.playerId, checkpoint); // actual older snapshot restore
    expect((await s.call('POST', '/v1/reclaim', second.token, { theftId: 't7' })).status).toBe(409);
    expect((await s.store.getById(attacker.playerId))?.snapshot?.companions).toEqual(checkpoint.companions);
    const reclaimed = await s.call('POST', '/v1/reclaim', first.token, { theftId: 't7' });
    expect(reclaimed).toMatchObject({ status: 200, body: { companion: { id: 'r8', speciesId: 'slime' } } });
    expect((await s.store.getById(attacker.playerId))?.snapshot?.companions.map(c => c.id)).toEqual(['c1']);
  });

  it('keeps allocation high-water after legacy roster/inbox truncation and rolls failed allocations back', async () => {
    const s = setup(), player = await s.join('owner');
    const id = player.playerId;
    await s.store.setStolenIds(id, ['s999']);
    await s.store.setStolenIds(id, []);
    expect(await s.store.allocateTransferId(id, 's', 7)).toBe('s1000');
    await expect(s.store.transaction(async tx => { await tx.allocateTransferId(id, 'r'); throw Error('rollback'); })).rejects.toThrow('rollback');
    s.restart(); expect(await s.store.allocateTransferId(id, 'r')).toBe('r1001');
    await s.store.setThefts(id, [{ id:'t2000',companion:{id:'c2',speciesId:'slime',bossIndex:7,level:1,stars:0},
      transferredId:'s7',thiefId:'other',thiefName:'other',at:0,reclaimUntil:1 }]);
    await s.store.setThefts(id, []);
    expect(await s.store.allocateTransferId(id, 't')).toBe('t2001');
    for (const invalid of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER]) await expect(s.store.allocateTransferId(id, 's', invalid)).rejects.toThrow();
  });
  it('returns the original selected-opponent result after restart without a second transfer or record update', async () => {
    const s = setup();
    const companion = (id: string, level: number) => ({ id, level, speciesId: 'slime', bossIndex: 7, stars: 0 });
    const attacker = await s.join('attacker', { companions: [companion('c1', 100)] });
    const defender = await s.join('defender', { companions: [companion('c2', 1)] });
    const preview = (await s.call('POST', '/v1/pvp/match', attacker.token, { opponentId: defender.playerId })).body as MatchResponse;
    const response = await s.call('POST', '/v1/pvp', attacker.token, { matchId: preview.matchId, party: [] });
    expect(response.status).toBe(200);
    const result = response.body as PvpResponse;
    expect(result).toMatchObject({ matchId: preview.matchId, win: true, record: { wins: 1, losses: 0 }, stolen: null, gold: { amount: '50', delta: '50' } });
    const committed = await s.store.getById(attacker.playerId);
    s.restart();
    for (let i = 0; i < 3; i++) {
      const retried = await s.call('POST', '/v1/pvp', attacker.token, { matchId: preview.matchId, party: [] });
      expect(retried).toEqual(response);
      expect(await s.store.getById(attacker.playerId)).toEqual(committed);
    }
    expect((await s.call('GET', '/v1/me', attacker.token)).body).toEqual({ version: 9, wins: 1, losses: 0,
      revokedIds: [], lastReclaim: null, lastMatch: { matchId: preview.matchId, result },
      pvpMode: 'equipment-gold-v2', gold: { revision: 2, net: '50', balance: '1050' } });
    expect((await s.call('POST', '/v1/pvp', defender.token, { matchId: preview.matchId, party: [] })).status).toBe(410);
    const next = (await s.call('POST', '/v1/pvp/match', attacker.token, { opponentId: defender.playerId })).body as MatchResponse;
    expect((await s.call('POST', '/v1/pvp', attacker.token, { matchId: next.matchId, party: [] })).status).toBe(429);
    s.advance();
    expect((await s.call('POST', '/v1/pvp', attacker.token, { matchId: preview.matchId, party: [] })).body).toEqual(result);
  });

  it('retries a committed reclaim after restart and expiry without moving the companion twice', async () => {
    const s = setup();
    const companion = (id: string, level: number) => ({ id, level, speciesId: 'slime', bossIndex: 7, stars: 0 });
    const attacker = await s.join('thief', { companions: [companion('c1', 100)] });
    const victim = await s.join('victim', { companions: [companion('c2', 1)] });
    await legacyTheft(s.store, attacker.playerId, victim.playerId, 'c2');
    const response = await s.call('POST', '/v1/reclaim', victim.token, { theftId: 't7' });
    expect(response).toEqual({ status: 200, body: { companion: companion('r8', 1) } });
    const before = await s.store.getById(victim.playerId);
    s.restart();
    s.advance(86_400_001);
    expect(await s.call('POST', '/v1/reclaim', victim.token, { theftId: 't7' })).toEqual(response);
    expect(await s.store.getById(victim.playerId)).toEqual(before);
    expect((await s.call('GET', '/v1/me', victim.token)).body).toMatchObject({ lastReclaim: { theftId: 't7', companion: companion('r8', 1) } });
    expect((await s.call('GET', '/v1/me', attacker.token)).body).toMatchObject({ revokedIds: ['s7'] });
  });
});
