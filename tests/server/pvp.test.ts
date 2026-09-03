// T40/T60 — POST /v1/pvp (SPEC F45/F69, SERVER_ARCHITECTURE_V3 §3). handle()
// is called directly with a MemoryStore, a counter clock and a queue of seeds:
// no sockets, no timers, no DB, no wall clock. Every fight is the two-step v3
// flow (`/v1/pvp/match` first), and the maths itself is core's `resolvePvp` —
// pinned here against the shared implementation, never re-derived.

import { describe, expect, it } from 'vitest';
import { mulberry32, pvpParty, resolvePvp, ROSTER_CAP, simulateBattle } from '../../src/core/index.js';
import { BOT_NAME, createApp, matches, PVP_COOLDOWN_MS } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import type { ApiRequest, ApiResponse } from '../../src/server/http.js';
import { MATCH_TTL_MS, RECLAIM_WINDOW_MS } from '../../src/shared/api.js';
import type {
  ApiError,
  Companion,
  MatchResponse,
  PvpResponse,
  RegisterResponse,
  SnapshotResponse,
} from '../../src/shared/api.js';

type Call = Partial<ApiRequest> & { method: string; path: string };

/** The clock every fixture starts on. */
const T0 = 1_700_000_000_000;

/** `seeds` is consumed one per match preview; the last one repeats. */
function setup(seeds: number[] = [0]) {
  const store = new MemoryStore();
  let ids = 0;
  let clock = T0;
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
  party: string[] = [],
): Promise<RegisterResponse> {
  const res = await call({ method: 'POST', path: '/v1/players', body: { nickname: name } });
  expect(res.status).toBe(201);
  const me = body<RegisterResponse>(res);
  const put = await call({
    method: 'PUT',
    path: '/v1/snapshot',
    auth: me.token,
    body: { name, bestIndex, rebirths: 0, companions, party },
  });
  expect(put.status).toBe(200);
  return me;
}

const preview = async (
  call: (req: Call) => Promise<ApiResponse>,
  auth: string,
): Promise<MatchResponse> =>
  body<MatchResponse>(await call({ method: 'POST', path: '/v1/pvp/match', auth }));

/** The whole v3 flow: preview an opponent, then fight it with `party`. */
async function fight(
  call: (req: Call) => Promise<ApiResponse>,
  auth: string,
  party: string[] = [],
): Promise<ApiResponse> {
  const match = await preview(call, auth);
  return call({ method: 'POST', path: '/v1/pvp', auth, body: { matchId: match.matchId, party } });
}

describe('POST /v1/pvp', () => {
  it('picks the rank neighbour above or below by seed parity', async () => {
    const { call, advance } = setup([2, 3]);
    await player(call, 'low', 1);
    const mid = await player(call, 'mid', 5);
    await player(call, 'high', 9);

    const even = body<PvpResponse>(await fight(call, mid.token));
    expect(even.seed).toBe(2);
    expect(even.bot).toBe(false);
    expect(even.opponent).toEqual({ name: 'high', bestIndex: 9, rebirths: 0, party: [] });

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
      opponent: { name: BOT_NAME, bestIndex: 7, rebirths: 0, party: [] },
      blows: [],
      stolen: null,
      lost: null,
    });
    // A bot match writes nothing but the cooldown stamp.
    const row = await store.getById(me.playerId);
    expect(row?.snapshot?.companions).toEqual([comp('c1')]);
    expect(row?.stolenIds).toEqual([]);
    expect(row?.lastPvpAt).toBe(T0);
    expect(BOT_NAME).toBe('Training Dummy');
  });

  it('winner gains the stolen companion under a fresh id and the loser stolenIds grows', async () => {
    // Seed 7 passes the 15% steal roll (mulberry32(7) → 0.0117).
    const { store, call } = setup([7]);
    const me = await player(call, 'raider', 1, [titan('c1')]);
    const foe = await player(call, 'victim', 9, [comp('d1', { speciesId: 'bat' })]);

    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.win).toBe(true);
    expect(res.opponent.name).toBe('victim');
    expect(res.stolen).toEqual({ ...comp('d1', { speciesId: 'bat' }), id: 's7' });
    expect(res.lost).toBeNull();

    expect((await store.getById(me.playerId))?.snapshot?.companions).toEqual([
      titan('c1'),
      { ...comp('d1', { speciesId: 'bat' }), id: 's7' },
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

  it('a steal writes a theft record with a 24 hour reclaim window on the loser', async () => {
    // Seed 7 steals, and its second draw picks member 0 of the defender party.
    const { store, call } = setup([7]);
    const me = await player(call, 'raider', 1, [titan('c1')]);
    const foe = await player(call, 'victim', 9, [comp('d1'), comp('d2')], ['d1', 'd2']);

    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.stolen).toEqual({ ...comp('d1'), id: 's7' });

    const loser = await store.getById(foe.playerId);
    expect(loser?.thefts).toEqual([
      {
        id: 't7',
        companion: comp('d1'),
        transferredId: 's7',
        thiefId: me.playerId,
        thiefName: 'raider',
        at: T0,
        reclaimUntil: T0 + RECLAIM_WINDOW_MS,
      },
    ]);
    expect(RECLAIM_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
    // The victim loses it from the roster AND from its stored party.
    expect(loser?.snapshot?.companions).toEqual([comp('d2')]);
    expect(loser?.snapshot?.party).toEqual(['d2']);
    // The thief keeps no theft record of its own.
    expect((await store.getById(me.playerId))?.thefts).toEqual([]);
  });

  it('losing the match moves nothing: the attacker never loses a companion and lost is null', async () => {
    // The titan one-shots the minnow, so the battle is a loss by construction.
    const { store, call } = setup([6]);
    const me = await player(call, 'minnow', 1, [comp('c1')]);
    const foe = await player(call, 'shark', 9, [titan('d1')]);

    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.win).toBe(false);
    expect(res.stolen).toBeNull();
    expect(res.lost).toBeNull();

    // Only the attacker can steal (F37): a loss writes nothing but the cooldown.
    const mine = await store.getById(me.playerId);
    expect(mine?.snapshot?.companions).toEqual([comp('c1')]);
    expect(mine?.stolenIds).toEqual([]);
    const loser = await store.getById(foe.playerId);
    expect(loser?.snapshot?.companions).toEqual([titan('d1')]);
    expect(loser?.thefts).toEqual([]);
  });

  it('winner with a full roster steals nothing', async () => {
    // Seed 35 passes the steal roll — the roster cap is what stops the theft.
    const { store, call } = setup([35]);
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

  it('pvp fights the stored opponent party and returns the blow list with decimal damage', async () => {
    const { call } = setup([9]);
    const roster = [1, 2, 3, 4, 5, 6].map((n) => comp(`d${n}`, { level: n }));
    const mine = [comp('c1', { level: 5 })];
    const me = await player(call, 'brawler', 1, mine);
    const foe = await player(call, 'wall', 9, roster, ['d1', 'd2']);

    const match = await preview(call, me.token);
    expect(match.opponent.party).toEqual([comp('d1', { level: 1 }), comp('d2', { level: 2 })]);
    // The preview is binding: a stronger roster uploaded after it cannot help.
    await call({
      method: 'PUT',
      path: '/v1/snapshot',
      auth: foe.token,
      body: { name: 'wall', bestIndex: 9, rebirths: 0, companions: [titan('d9')] },
    });

    const res = body<PvpResponse>(
      await call({
        method: 'POST',
        path: '/v1/pvp',
        auth: me.token,
        body: { matchId: match.matchId, party: ['c1'] },
      }),
    );
    expect(res.opponent.party).toEqual(match.opponent.party);
    const expected = simulateBattle(mine, match.opponent.party);
    expect(res.win).toBe(expected.attackerWon);
    expect(res.blows.length).toBeGreaterThan(0);
    expect(res.blows).toEqual(expected.blows.map((b) => ({ ...b, damage: String(b.damage) })));
    expect(res.blows.every((b) => /^\d+$/.test(b.damage))).toBe(true);
    // The match is spent: the same id cannot be fought twice.
    expect(matches.has(match.matchId)).toBe(false);
  });

  it('pvp with an unknown or expired matchId returns 410 match_expired', async () => {
    const { call, advance } = setup([5]);
    const me = await player(call, 'me', 5, [comp('c1')]);
    const other = await player(call, 'other', 9, [comp('d1')]);
    const send = (auth: string, matchId: string): Promise<ApiResponse> =>
      call({ method: 'POST', path: '/v1/pvp', auth, body: { matchId, party: [] } });

    const unknown = await send(me.token, 'deadbeef');
    expect(unknown.status).toBe(410);
    expect(unknown.body).toEqual({ error: 'match_expired' });

    // A match belongs to whoever asked for it; a foreign caller kills it.
    const mine = await preview(call, me.token);
    expect((await send(other.token, mine.matchId)).status).toBe(410);
    expect(matches.has(mine.matchId)).toBe(false);

    // …and it dies of old age one millisecond past MATCH_TTL_MS.
    const fresh = await preview(call, me.token);
    advance(MATCH_TTL_MS + 1);
    expect((await send(me.token, fresh.matchId)).status).toBe(410);
    expect(matches.has(fresh.matchId)).toBe(false);
  });

  it('pvp with a party id outside my roster returns 400 bad_party', async () => {
    const { store, call } = setup([13]);
    const me = await player(call, 'picky', 5, [comp('c1'), comp('c2')]);
    await player(call, 'rival', 9, [comp('d1')]);
    const match = await preview(call, me.token);
    const send = (party: string[]): Promise<ApiResponse> =>
      call({
        method: 'POST',
        path: '/v1/pvp',
        auth: me.token,
        body: { matchId: match.matchId, party },
      });

    const alien = await send(['c1', 'zz']);
    expect(alien.status).toBe(400);
    expect(alien.body).toEqual({ error: 'bad_party' });
    expect((await send(['c1', 'c1', 'c2', 'c2', 'c1', 'c2'])).body).toEqual({ error: 'bad_party' });

    // A bad party spends nothing: no cooldown stamp, and the match still lives.
    expect((await store.getById(me.playerId))?.lastPvpAt).toBeNull();
    expect(matches.has(match.matchId)).toBe(true);
    expect((await send(['c2'])).status).toBe(200);
  });

  it('a v2 body without matchId returns 400 bad_request', async () => {
    const { store, call } = setup([4]);
    const me = await player(call, 'legacy', 5, [comp('c1')]);
    await player(call, 'rival', 9, [comp('d1')]);
    const post = (payload: unknown): Promise<ApiResponse> =>
      call({ method: 'POST', path: '/v1/pvp', auth: me.token, body: payload });

    const stale = await post({ ignored: true });
    expect(stale.status).toBe(400);
    expect(stale.body).toEqual({ error: 'bad_request' });
    // A party that is not a list of ids is just as malformed.
    expect((await post({ matchId: 'x', party: [1] })).body).toEqual({ error: 'bad_request' });
    expect((await post(null)).body).toEqual({ error: 'bad_request' });
    expect((await store.getById(me.playerId))?.lastPvpAt).toBeNull();
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
    const seed = 123_456_801;
    const { call } = setup([seed]);
    const roster = [comp('c1', { level: 4 }), comp('c2', { bossIndex: 24, stars: 1 })];
    const theirs = [comp('d1', { level: 3 }), comp('d2', { bossIndex: 16 })];
    const me = await player(call, 'me', 1, roster);
    await player(call, 'them', 9, theirs);

    // The parties are core's too: the automatic pick on both sides.
    const expected = resolvePvp(
      pvpParty(roster, []),
      pvpParty(theirs, []),
      mulberry32(seed),
      roster.length,
    );
    const res = body<PvpResponse>(await fight(call, me.token));
    expect(res.seed).toBe(seed);
    expect(res.win).toBe(expected.attackerWon);
    expect(res.blows).toEqual(expected.blows.map((b) => ({ ...b, damage: String(b.damage) })));
    expect(expected.moved).not.toBeNull();
    expect(res.stolen).toEqual({ ...expected.moved, id: `s${seed}` });
    expect(res.lost).toBeNull();
    // The powers are presentation-only and never go on the wire.
    expect(Object.keys(res).sort()).toEqual([
      'blows',
      'bot',
      'lost',
      'opponent',
      'seed',
      'stolen',
      'win',
    ]);
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
