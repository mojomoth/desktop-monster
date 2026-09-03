// T40 — POST /v1/pvp (SPEC F45, SERVER_ARCHITECTURE §3 rules + §5 steps).
// handle() is called directly with a MemoryStore, a counter clock and a queue
// of seeds: no sockets, no timers, no DB, no wall clock. The maths itself is
// core's `resolvePvp` — pinned here against the shared implementation, never
// re-derived.

import { describe, expect, it } from 'vitest';
import { mulberry32, resolvePvp, ROSTER_CAP } from '../../src/core/index.js';
import { BOT_NAME, createApp, PVP_COOLDOWN_MS } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import type { ApiRequest, ApiResponse } from '../../src/server/http.js';
import type {
  ApiError,
  Companion,
  PvpResponse,
  RegisterResponse,
  SnapshotResponse,
} from '../../src/shared/api.js';

type Call = Partial<ApiRequest> & { method: string; path: string };

/** `seeds` is consumed one per match; the last one repeats. */
function setup(seeds: number[] = [0]) {
  const store = new MemoryStore();
  let ids = 0;
  let clock = 1_700_000_000_000;
  let drawn = 0;
  const app = createApp({
    store,
    now: () => clock,
    randomUUID: () => `u${ids++}`,
    randomBytesHex: (n) => `${ids++}`.padStart(n * 2, '0'),
    randomSeed: () => seeds[Math.min(drawn++, seeds.length - 1)] ?? 0,
  });
  const call = (req: Call): Promise<ApiResponse> =>
    app.handle({ query: {}, auth: null, body: null, ip: '1.2.3.4', ...req });
  return { store, call, advance: (ms: number) => (clock += ms) };
}

const body = <T>(res: ApiResponse): T => res.body as T;

const comp = (id: string, over: Partial<Companion> = {}): Companion => ({
  id,
  speciesId: 'slime',
  bossIndex: 8,
  level: 1,
  stars: 0,
  ...over,
});

/** A roster whose power dwarfs any single level-1 companion. */
const titan = (id: string): Companion => comp(id, { bossIndex: 400, level: 10, stars: 20 });

async function player(
  call: (req: Call) => Promise<ApiResponse>,
  name: string,
  bestIndex: number,
  companions: Companion[] = [],
): Promise<RegisterResponse> {
  const res = await call({ method: 'POST', path: '/v1/players', body: { nickname: name } });
  expect(res.status).toBe(201);
  const me = body<RegisterResponse>(res);
  const put = await call({
    method: 'PUT',
    path: '/v1/snapshot',
    auth: me.token,
    body: { name, bestIndex, rebirths: 0, companions },
  });
  expect(put.status).toBe(200);
  return me;
}

const fight = (call: (req: Call) => Promise<ApiResponse>, auth: string): Promise<ApiResponse> =>
  call({ method: 'POST', path: '/v1/pvp', auth, body: { ignored: true } });

describe('POST /v1/pvp', () => {
  it('picks the rank neighbour above or below by seed parity', async () => {
    const { call, advance } = setup([2, 3]);
    await player(call, 'low', 1);
    const mid = await player(call, 'mid', 5);
    await player(call, 'high', 9);

    const even = body<PvpResponse>(await fight(call, mid.token));
    expect(even.seed).toBe(2);
    expect(even.bot).toBe(false);
    expect(even.opponent).toEqual({ name: 'high', bestIndex: 9, rebirths: 0, companions: [] });

    advance(PVP_COOLDOWN_MS);
    const odd = body<PvpResponse>(await fight(call, mid.token));
    expect(odd.seed).toBe(3);
    expect(odd.opponent.name).toBe('low');
  });

  it('falls back to the only neighbour that exists whatever the seed parity says', async () => {
    const { call } = setup([2]);
    await player(call, 'low', 1);
    // The top player has no 'up' neighbour, so the even seed cannot have it.
    const high = await player(call, 'high', 9);
    const res = body<PvpResponse>(await fight(call, high.token));
    expect(res.bot).toBe(false);
    expect(res.opponent.name).toBe('low');
  });

  it('alone on the server yields the Training Dummy bot and no steal', async () => {
    const { store, call } = setup([11]);
    const me = await player(call, 'lonely', 7, [comp('c1')]);

    const res = await fight(call, me.token);
    expect(res.status).toBe(200);
    expect(body<PvpResponse>(res)).toEqual({
      bot: true,
      seed: 11,
      win: true,
      opponent: { name: BOT_NAME, bestIndex: 7, rebirths: 0, companions: [] },
      stolen: null,
      lost: null,
    });
    // A bot match writes nothing but the cooldown stamp.
    const row = await store.getById(me.playerId);
    expect(row?.snapshot?.companions).toEqual([comp('c1')]);
    expect(row?.stolenIds).toEqual([]);
    expect(row?.lastPvpAt).toBe(1_700_000_000_000);
    expect(BOT_NAME).toBe('Training Dummy');
  });

  it('winner gains the stolen companion under a fresh id and the loser stolenIds grows', async () => {
    const { store, call } = setup([4]);
    const me = await player(call, 'raider', 1, [titan('c1')]);
    const foe = await player(call, 'victim', 9, [comp('d1', { speciesId: 'bat' })]);

    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.win).toBe(true);
    expect(res.opponent.name).toBe('victim');
    expect(res.stolen).toEqual({ ...comp('d1', { speciesId: 'bat' }), id: 's4' });
    expect(res.lost).toBeNull();

    expect((await store.getById(me.playerId))?.snapshot?.companions).toEqual([
      titan('c1'),
      { ...comp('d1', { speciesId: 'bat' }), id: 's4' },
    ]);
    const loser = await store.getById(foe.playerId);
    expect(loser?.snapshot?.companions).toEqual([]);
    // The ORIGINAL id is remembered, so the defender learns on its next upload.
    expect(loser?.stolenIds).toEqual(['d1']);
    const reupload = await call({
      method: 'PUT',
      path: '/v1/snapshot',
      auth: foe.token,
      body: { name: 'victim', bestIndex: 9, rebirths: 0, companions: [comp('d1', { speciesId: 'bat' })] },
    });
    expect(body<SnapshotResponse>(reupload).removed).toEqual(['d1']);
  });

  it('losing the match moves one of my companions to the opponent and reports it as lost', async () => {
    const { store, call } = setup([6]);
    const me = await player(call, 'minnow', 1, [comp('c1')]);
    const foe = await player(call, 'shark', 9, [titan('d1')]);

    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.win).toBe(false);
    expect(res.stolen).toBeNull();
    expect(res.lost).toEqual(comp('c1'));

    const mine = await store.getById(me.playerId);
    expect(mine?.snapshot?.companions).toEqual([]);
    expect(mine?.stolenIds).toEqual(['c1']);
    expect((await store.getById(foe.playerId))?.snapshot?.companions).toEqual([
      titan('d1'),
      { ...comp('c1'), id: 's6' },
    ]);
  });

  it('winner with a full roster steals nothing', async () => {
    const { store, call } = setup([8]);
    const full = Array.from({ length: ROSTER_CAP }, (_, i) => titan(`c${i}`));
    const me = await player(call, 'hoarder', 1, full);
    const foe = await player(call, 'victim', 9, [comp('d1')]);

    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.win).toBe(true);
    expect(res.stolen).toBeNull();
    expect(res.lost).toBeNull();
    expect((await store.getById(me.playerId))?.snapshot?.companions).toHaveLength(ROSTER_CAP);
    const loser = await store.getById(foe.playerId);
    expect(loser?.snapshot?.companions).toEqual([comp('d1')]);
    expect(loser?.stolenIds).toEqual([]);
  });

  it('second pvp inside PVP_COOLDOWN_MS returns 429 cooldown with retryAfterSec', async () => {
    const { call, advance } = setup([1]);
    const me = await player(call, 'eager', 3);
    expect((await fight(call, me.token)).status).toBe(200);

    const blocked = await fight(call, me.token);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'cooldown', retryAfterSec: 60 });

    advance(30_000);
    expect(body<ApiError>(await fight(call, me.token)).retryAfterSec).toBe(30);
    advance(29_999);
    expect(body<ApiError>(await fight(call, me.token)).retryAfterSec).toBe(1);
    // elapsed === PVP_COOLDOWN_MS is out of the window, not in it.
    advance(1);
    expect((await fight(call, me.token)).status).toBe(200);
  });

  it('verdict equals core resolvePvp with mulberry32(seed)', async () => {
    const seed = 123_456_789;
    const { call } = setup([seed]);
    const roster = [comp('c1', { level: 4 }), comp('c2', { bossIndex: 24, stars: 1 })];
    const theirs = [comp('d1', { level: 3 }), comp('d2', { bossIndex: 16 })];
    const me = await player(call, 'me', 1, roster);
    await player(call, 'them', 9, theirs);

    const expected = resolvePvp(roster, theirs, mulberry32(seed));
    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.seed).toBe(seed);
    expect(res.win).toBe(expected.attackerWon);
    const moved = expected.moved;
    expect(moved).not.toBeNull();
    expect(expected.attackerWon ? res.stolen : res.lost).toEqual(
      expected.attackerWon ? { ...moved, id: `s${seed}` } : moved,
    );
    // The powers are presentation-only and never go on the wire.
    expect(Object.keys(res).sort()).toEqual(['bot', 'lost', 'opponent', 'seed', 'stolen', 'win']);
  });

  it('pvp without an uploaded snapshot returns 400 no_snapshot', async () => {
    const { store, call } = setup();
    const res = await call({ method: 'POST', path: '/v1/players', body: { nickname: 'newbie' } });
    const me = body<RegisterResponse>(res);

    const denied = await fight(call, me.token);
    expect(denied.status).toBe(400);
    expect(denied.body).toEqual({ error: 'no_snapshot' });
    // The cooldown stamp is set only after the snapshot check passes.
    expect((await store.getById(me.playerId))?.lastPvpAt).toBeNull();

    const anonymous = await call({ method: 'POST', path: '/v1/pvp' });
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toEqual({ error: 'unauthorized' });
  });
});
