import { describe, expect, it, vi } from 'vitest';
import { createApp, PVP_COOLDOWN_MS } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import { simulateBattle } from '../../src/core/battle.js';
import type { ApiRequest, ApiResponse } from '../../src/server/http.js';
import type { Companion, MatchResponse, OpponentListResult, PvpResponse, RegisterResponse } from '../../src/shared/api.js';

const companion = (id: string, bossIndex = 8): Companion => ({ id, speciesId: 'slime', bossIndex, level: 1, stars: 0 });
function setup() {
  const store = new MemoryStore();
  let ids = 0;
  let now = 1_700_000_000_000;
  const { handle } = createApp({ store, now: () => now, randomUUID: () => `u${ids++}`, randomBytesHex: (n) => (ids++).toString(16).padStart(n * 2, '0'), randomSeed: () => 7 });
  const call = (method: string, path: string, auth: string | null = null, body: unknown = null): Promise<ApiResponse> => handle({ method, path, auth, body, query: {}, ip: 'test' } as ApiRequest);
  const player = async (name: string, bestIndex: number, companions: Companion[] = []) => {
    const { playerId, token } = (await call('POST', '/v1/players', null, { nickname: name })).body as RegisterResponse;
    const snapshot = { name, bestIndex, rebirths: 0, companions, party: companions.map((c) => c.id) };
    expect((await call('PUT', '/v1/snapshot', token, snapshot)).status).toBe(200);
    return { playerId, token, snapshot };
  };
  const list = async (token: string) => (await call('GET', '/v1/pvp/opponents', token)).body as OpponentListResult;
  const preview = async (token: string, opponentId?: string) => (await call('POST', '/v1/pvp/match', token, { opponentId })).body as MatchResponse;
  const fight = async (token: string, matchId: string) => call('POST', '/v1/pvp', token, { matchId, party: [] });
  return { store, call, player, list, preview, fight, advance: () => { now += PVP_COOLDOWN_MS; } };
}

describe('v0.4 opponent directory and official records', () => {
  it('lists, previews and steals from a legacy persisted snapshot without a party field', async () => {
    const s = setup();
    const me = await s.player('me', 1, [companion('a1', 400)]);
    const foe = await s.player('old', 2, [companion('d1')]);
    const legacy = (await s.store.getById(foe.playerId))?.snapshot;
    if (!legacy) throw new Error('fixture missing');
    Reflect.deleteProperty(legacy, 'party');
    expect((await s.list(me.token)).opponents[0]?.party).toEqual([companion('d1')]);
    const match = await s.preview(me.token, foe.playerId);
    expect(match.opponent.party).toEqual([companion('d1')]);
    const result = await s.fight(me.token, match.matchId);
    expect(result.status).toBe(200);
    expect((result.body as PvpResponse).stolen?.id).toBe('s7');
    expect((await s.store.getById(foe.playerId))?.snapshot?.party).toEqual([]);
  });

  it('caps the directory at 50 opponents without spending a slot on the caller', async () => {
    const s = setup();
    const me = await s.player('me', 999);
    for (let i = 0; i < 52; i += 1) await s.player(`rival${i}`, i);
    const { opponents } = await s.list(me.token);
    expect(opponents).toHaveLength(50);
    expect(opponents.some((row) => row.playerId === me.playerId)).toBe(false);
    expect(opponents[0]).toMatchObject({ name: 'rival51', rank: 2 });
    expect(opponents.at(-1)).toMatchObject({ name: 'rival2', rank: 51 });
  });

  it('lists other players with actual party, hero and tie-aware rank; legacy hero defaults to novice', async () => {
    const s = setup();
    const me = await s.player('me', 4);
    const foe = await s.player('foe', 9, [companion('c1'), companion('c2')]);
    const tied = await s.player('tied', 9);
    await s.call('PUT', '/v1/snapshot', foe.token, { ...foe.snapshot, party: ['c2'], hero: { formId: 'h06', buffPercent: 25 }, wins: 999 });
    const result = await s.list(me.token);
    expect(result.opponents).toEqual([
      { playerId: foe.playerId, rank: 1, name: 'foe', bestIndex: 9, rebirths: 0, party: [companion('c2')], hero: { formId: 'h06', buffPercent: 25 }, wins: 0, losses: 0 },
      { playerId: tied.playerId, rank: 1, name: 'tied', bestIndex: 9, rebirths: 0, party: [], hero: { formId: 'h00', buffPercent: 0 }, wins: 0, losses: 0 },
    ]);
    expect((await s.call('GET', '/v1/pvp/opponents')).status).toBe(401);
  });

  it('validates catalog hero rolls and selected ids at the request boundary', async () => {
    const s = setup();
    const me = await s.player('me', 1);
    for (const hero of [null, { formId: 'evil', buffPercent: 10 }, { formId: 'h01', buffPercent: 100 }, { formId: 'h01', buffPercent: 10.5 }, { formId: 'h00', buffPercent: 10 }]) {
      expect((await s.call('PUT', '/v1/snapshot', me.token, { ...me.snapshot, hero })).status).toBe(400);
    }
    for (const opponentId of [me.playerId, 1, {}, 'bad/path']) expect((await s.call('POST', '/v1/pvp/match', me.token, { opponentId })).status).toBe(400);
    expect((await s.call('POST', '/v1/pvp/match', me.token, { opponentId: 'missing' })).status).toBe(404);
    expect((await s.list(me.token)).opponents).toEqual([]);
  });

  it('selects a distant player and binds its hero/party to the preview even after upload', async () => {
    const s = setup();
    const me = await s.player('me', 1, [companion('a1')]);
    await s.player('near', 2);
    const foe = await s.player('distant', 90, [companion('d1')]);
    const hero = { formId: 'h06', buffPercent: 25 };
    await s.call('PUT', '/v1/snapshot', foe.token, { ...foe.snapshot, hero });
    const match = await s.preview(me.token, foe.playerId);
    expect(match.opponent.name).toBe('distant');
    expect(match.opponent.playerId).toBe(foe.playerId);
    expect(match.opponent.hero).toEqual(hero);
    await s.call('PUT', '/v1/snapshot', foe.token, { ...foe.snapshot, companions: [], party: [], hero: { formId: 'h00', buffPercent: 0 } });
    const result = (await s.fight(me.token, match.matchId)).body as PvpResponse;
    expect(result.opponent.playerId).toBe(foe.playerId);
    expect(result.opponent.hero).toEqual(hero);
    expect(result.opponent.party).toEqual(match.opponent.party);
    const expected = simulateBattle(me.snapshot.companions, match.opponent.party, { defender: hero });
    expect(result.blows).toEqual(expected.blows.map((blow) => ({ ...blow, damage: String(blow.damage) })));
    expect(result.stolen).toBeNull();
  });

  it('counts actual wins and losses once, including defending wins, while training and previews count zero', async () => {
    const s = setup();
    const me = await s.player('me', 1, [companion('a1')]);
    const training = await s.preview(me.token);
    await s.fight(me.token, training.matchId);
    expect(await s.store.getById(me.playerId)).toMatchObject({ wins: 0, losses: 0 });
    s.advance();
    const foe = await s.player('foe', 20, [companion('d1', 400)]);
    const match = await s.preview(me.token, foe.playerId);
    expect((await s.list(me.token)).opponents[0]).toMatchObject({ wins: 0, losses: 0 });
    const results = await Promise.all([s.fight(me.token, match.matchId), s.fight(me.token, match.matchId)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 429]);
    expect(await s.store.getById(me.playerId)).toMatchObject({ wins: 0, losses: 1 });
    expect((await s.list(me.token)).opponents[0]).toMatchObject({ wins: 1, losses: 0 });
    // Self-reported stats cannot erase or inflate an official result.
    await s.call('PUT', '/v1/snapshot', foe.token, { ...foe.snapshot, wins: 1000, losses: 500 });
    expect((await s.list(me.token)).opponents[0]).toMatchObject({ wins: 1, losses: 0 });
  });

  it('serializes two attackers so a previewed companion can only be stolen once', async () => {
    const s = setup();
    const a = await s.player('a', 1, [companion('a1', 400)]);
    const b = await s.player('b', 2, [companion('b1', 400)]);
    const foe = await s.player('foe', 3, [companion('d1')]);
    const ma = await s.preview(a.token, foe.playerId);
    const mb = await s.preview(b.token, foe.playerId);
    const results = await Promise.all([s.fight(a.token, ma.matchId), s.fight(b.token, mb.matchId)]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.map((r) => (r.body as PvpResponse).stolen).filter(Boolean)).toHaveLength(1);
    expect(await s.store.getById(foe.playerId)).toMatchObject({ losses: 2, stolenIds: ['d1'] });
  });

  it('keeps transferred ids unique when independent battles repeat the same seed', async () => {
    const s = setup();
    const me = await s.player('me', 1, [companion('a1', 400)]);
    const first = await s.player('first', 2, [companion('d1')]);
    const second = await s.player('second', 3, [companion('d2')]);
    const m1 = await s.preview(me.token, first.playerId);
    const r1 = (await s.fight(me.token, m1.matchId)).body as PvpResponse;
    s.advance();
    const m2 = await s.preview(me.token, second.playerId);
    const r2 = (await s.fight(me.token, m2.matchId)).body as PvpResponse;
    expect(r1.stolen?.id).toBe('s7');
    expect(r2.stolen?.id).toMatch(/^s[0-9a-f]{14}$/);
    expect(r2.stolen?.id).not.toBe(r1.stolen?.id);
    const ids = (await s.store.getById(me.playerId))?.snapshot?.companions.map((c) => c.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('rolls back cooldown, records and every roster write when a store write fails', async () => {
    const s = setup();
    const me = await s.player('me', 1, [companion('a1', 400)]);
    const foe = await s.player('foe', 2, [companion('d1')]);
    const beforeMe = structuredClone(await s.store.getById(me.playerId));
    const beforeFoe = structuredClone(await s.store.getById(foe.playerId));
    const match = await s.preview(me.token, foe.playerId);
    vi.spyOn(s.store, 'setThefts').mockRejectedValueOnce(new Error('disk failed'));
    expect((await s.fight(me.token, match.matchId)).status).toBe(500);
    expect(await s.store.getById(me.playerId)).toEqual(beforeMe);
    expect(await s.store.getById(foe.playerId)).toEqual(beforeFoe);
    // The queue is released after a failed transaction; a fresh match works.
    const fresh = await s.preview(me.token, foe.playerId);
    expect((await s.fight(me.token, fresh.matchId)).status).toBe(200);
  });
});


describe('v0.5 rare hero and companion wire compatibility', () => {
  it('retains rare IDs and stacked buffs through upload, directory, preview and deterministic battle', async () => {
    const s = setup();
    const me = await s.player('me', 1, [companion('a1', 48)]);
    const rareCompanion = { ...companion('d1', 48), speciesId: 'crownwyrm' as const };
    const foe = await s.player('rare', 2, [rareCompanion]);
    const hero = { formId: 'h51', buffPercent: 25, stacks: 7 };
    expect((await s.call('PUT', '/v1/snapshot', foe.token, { ...foe.snapshot, hero })).status).toBe(200);
    expect((await s.list(me.token)).opponents[0]?.hero).toEqual(hero);
    const match = await s.preview(me.token, foe.playerId);
    expect(match.opponent.hero).toEqual(hero);
    expect(match.opponent.party).toEqual([rareCompanion]);
    const result = (await s.fight(me.token, match.matchId)).body as PvpResponse;
    const expected = simulateBattle(me.snapshot.companions, match.opponent.party, { defender: hero });
    expect(result.blows).toEqual(expected.blows.map((blow) => ({ ...blow, damage: String(blow.damage) })));
    expect(result.win).toBe(expected.attackerWon);
    for (const stacks of [-1, .5, 1_000_001, '7']) {
      expect((await s.call('PUT', '/v1/snapshot', foe.token, { ...foe.snapshot, hero: { ...hero, stacks } })).status).toBe(400);
    }
  });
});
