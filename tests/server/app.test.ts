// T39 — createApp + MemoryStore (SPEC F44, SERVER_ARCHITECTURE §2–§4).
// handle() is called directly with an injected MemoryStore, a counter clock
// and a mulberry32-driven id/token source: no sockets, no timers, no DB, no
// wall clock.

import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/index.js';
import { BOT_NAME, createApp, matches, RATE_LIMIT } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import type { Store } from '../../src/server/store.js';
import type { ApiRequest, ApiResponse } from '../../src/server/http.js';
import { MATCH_TTL_MS, RECLAIM_WINDOW_MS } from '../../src/shared/api.js';
import type {
  Companion,
  LeaderboardResponse,
  MatchResponse,
  ReclaimResponse,
  RegisterResponse,
  Snapshot,
  SnapshotResponse,
  Theft,
  TheftsResponse,
} from '../../src/shared/api.js';

/** The counter clock every setup() starts at. */
const T0 = 1_700_000_000_000;

type Call = Partial<ApiRequest> & { method: string; path: string };

function setup(store: Store = new MemoryStore(), seed = 7) {
  const rng = mulberry32(seed);
  const draw = (): string => Math.floor(rng.next() * 0xffffffff).toString(16);
  let ids = 0;
  let clock = T0;
  const app = createApp({
    store,
    now: () => clock,
    randomUUID: () => `u${ids++}-${draw()}`,
    randomBytesHex: (n) => draw().padStart(n * 2, '0'),
    randomSeed: () => Math.floor(rng.next() * 0xffffffff),
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

/** A theft record as /v1/pvp writes it, planted straight into the victim's row. */
const stolen = (id: string, over: Partial<Theft> = {}): Theft => ({
  id,
  companion: comp('c1'),
  transferredId: `s${id.slice(1)}`,
  thiefId: 'thief',
  thiefName: 'thief',
  at: T0,
  reclaimUntil: T0 + RECLAIM_WINDOW_MS,
  ...over,
});

const snap = (
  name: string,
  bestIndex: number,
  rebirths: number,
  companions: Companion[] = [],
  party: string[] = [],
): Snapshot => ({ name, bestIndex, rebirths, companions, party });

async function join(
  call: (req: Call) => Promise<ApiResponse>,
  nickname: string,
  ip = '1.2.3.4',
): Promise<RegisterResponse> {
  const res = await call({ method: 'POST', path: '/v1/players', body: { nickname }, ip });
  expect(res.status).toBe(201);
  return body<RegisterResponse>(res);
}

describe('createApp', () => {
  it('register then upload then leaderboard ranks by bestIndex then rebirths and reports own rank', async () => {
    const { call } = setup();
    const alice = await join(call, 'alice');
    const bob = await join(call, 'bob');
    const carol = await join(call, 'carol');
    expect(alice.token).toMatch(/^[0-9a-f]{32}$/);
    expect(new Set([alice.playerId, bob.playerId, carol.playerId]).size).toBe(3);

    const upload = (auth: string, s: Snapshot): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth, body: s });
    expect(body<SnapshotResponse>(await upload(alice.token, snap('alice', 5, 0))).rank).toBe(1);
    expect(body<SnapshotResponse>(await upload(bob.token, snap('bob', 5, 2))).rank).toBe(1);
    expect(body<SnapshotResponse>(await upload(carol.token, snap('carol', 9, 0))).rank).toBe(1);
    // alice is now last: bob shares her bestIndex but has more rebirths.
    expect(body<SnapshotResponse>(await upload(alice.token, snap('alice', 5, 0))).rank).toBe(3);

    const res = await call({ method: 'GET', path: '/v1/leaderboard', auth: bob.token });
    expect(res.status).toBe(200);
    expect(body<LeaderboardResponse>(res)).toEqual({
      top: [
        { rank: 1, name: 'carol', bestIndex: 9, rebirths: 0 },
        { rank: 2, name: 'bob', bestIndex: 5, rebirths: 2 },
        { rank: 3, name: 'alice', bestIndex: 5, rebirths: 0 },
      ],
      me: { rank: 2, name: 'bob', bestIndex: 5, rebirths: 2 },
    });
  });

  it('upload strips companions listed in stolenIds and returns their ids as removed', async () => {
    const { store, call } = setup();
    const me = await join(call, 'victim');
    const roster = [comp('c1'), comp('c2', { speciesId: 'bat' }), comp('c3')];
    const upload = (): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth: me.token, body: snap('victim', 4, 0, roster) });

    expect(body<SnapshotResponse>(await upload()).removed).toEqual([]);
    await store.setStolenIds(me.playerId, ['c1', 'c3']);

    expect(body<SnapshotResponse>(await upload()).removed).toEqual(['c1', 'c3']);
    expect((await store.getById(me.playerId))?.snapshot?.companions).toEqual([
      comp('c2', { speciesId: 'bat' }),
    ]);
    // Idempotent: a client that has not applied `removed` yet gets it again.
    expect(body<SnapshotResponse>(await upload()).removed).toEqual(['c1', 'c3']);
  });

  it('returns 429 rate_limited on the 61st request within one minute for the same key', async () => {
    const { call, advance } = setup();
    const get = (): Promise<ApiResponse> => call({ method: 'GET', path: '/v1/leaderboard' });
    for (let i = 0; i < RATE_LIMIT; i += 1) {
      expect((await get()).status).toBe(200);
    }
    const limited = await get();
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'rate_limited', retryAfterSec: 60 });

    advance(59_999);
    expect((await get()).status).toBe(429);
    advance(1);
    expect((await get()).status).toBe(200);
  });

  it('counts each caller key separately so one x-forwarded-for ip cannot exhaust another', async () => {
    const { call } = setup();
    const get = (ip: string): Promise<ApiResponse> =>
      call({ method: 'GET', path: '/v1/leaderboard', ip });
    for (let i = 0; i <= RATE_LIMIT; i += 1) {
      await get('9.9.9.9');
    }
    expect((await get('9.9.9.9')).status).toBe(429);
    expect((await get('8.8.8.8')).status).toBe(200);

    // A bearer keys on the token hash, not on the exhausted ip.
    const me = await join(call, 'fresh', '8.8.8.8');
    const res = await call({
      method: 'GET',
      path: '/v1/leaderboard',
      auth: me.token,
      ip: '9.9.9.9',
    });
    expect(res.status).toBe(200);
  });

  it('rejects bad nickname, over-cap companions and out-of-range ints with 400', async () => {
    const { call } = setup();
    for (const nickname of ['', 'has space', 'seventeen-chars17', 42, undefined]) {
      const res = await call({ method: 'POST', path: '/v1/players', body: { nickname } });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'bad_request' });
    }
    const me = await join(call, 'greedy');
    const upload = (raw: unknown): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth: me.token, body: raw });

    const overCap = Array.from({ length: 31 }, (_, i) => comp(`c${i}`));
    expect((await upload(snap('greedy', 1, 0, overCap))).status).toBe(400);
    expect((await upload(snap('greedy', -1, 0))).status).toBe(400);
    expect((await upload(snap('greedy', 2_147_483_648, 0))).status).toBe(400);
    expect((await upload(snap('greedy', 1, 1.5))).status).toBe(400);
    expect((await upload(snap('greedy', 1, 0, [comp('c1', { level: 11 })]))).status).toBe(400);
    expect((await upload(snap('greedy', 1, 0, [comp('c1', { level: 0 })]))).status).toBe(400);
    expect((await upload(snap('greedy', 1, 0, [comp('c1', { speciesId: 'wyrm' })]))).status).toBe(400);
    expect((await upload(snap('greedy', 1, 0, [comp('C-1!')]))).status).toBe(400);
    expect((await upload(snap('greedy', 1, 0, [comp('c1'), comp('c1')]))).status).toBe(400);
    expect((await upload(snap('bad name', 1, 0))).status).toBe(400);
    expect((await upload(null)).status).toBe(400);
    expect((await upload([snap('greedy', 1, 0)])).status).toBe(400);
    // 30 is the cap, not 29 — and the roster survives the round trip.
    const full = Array.from({ length: 30 }, (_, i) => comp(`c${i}`));
    expect((await upload(snap('greedy', 1, 0, full))).status).toBe(200);
  });

  it('drops unknown extra fields instead of rejecting the upload', async () => {
    const { store, call } = setup();
    const me = await join(call, 'futuristic');
    const res = await call({
      method: 'PUT',
      path: '/v1/snapshot',
      auth: me.token,
      body: {
        name: 'futuristic',
        bestIndex: 3,
        rebirths: 0,
        pets: 9,
        companions: [{ ...comp('c1'), glow: true }],
      },
    });
    expect(res.status).toBe(200);
    expect((await store.getById(me.playerId))?.snapshot).toEqual(snap('futuristic', 3, 0, [comp('c1')]));
  });

  it('missing or unknown bearer token yields 401 unauthorized', async () => {
    const { call } = setup();
    const anonymous = await call({ method: 'PUT', path: '/v1/snapshot', body: snap('ghost', 1, 0) });
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toEqual({ error: 'unauthorized' });
    expect(
      (await call({ method: 'PUT', path: '/v1/snapshot', auth: 'deadbeef', body: snap('ghost', 1, 0) }))
        .status,
    ).toBe(401);
    // Present-but-unknown is an error on the leaderboard too; absent is not.
    expect((await call({ method: 'GET', path: '/v1/leaderboard', auth: 'deadbeef' })).status).toBe(401);
    expect((await call({ method: 'GET', path: '/v1/leaderboard' })).status).toBe(200);
  });

  it('leaderboard clamps n to 1..50, shares ranks on ties and returns me null before the first upload', async () => {
    const { call } = setup();
    const first = await join(call, 'p0', '10.0.0.0');
    expect(body<LeaderboardResponse>(await call({ method: 'GET', path: '/v1/leaderboard', auth: first.token })).me)
      .toBeNull();

    for (let i = 0; i < 51; i += 1) {
      const player = i === 0 ? first : await join(call, `p${i}`, `10.0.0.${i}`);
      await call({
        method: 'PUT',
        path: '/v1/snapshot',
        auth: player.token,
        body: snap(`p${i}`, i, 0),
      });
    }
    const at = async (n?: string): Promise<LeaderboardResponse> =>
      body<LeaderboardResponse>(
        await call({ method: 'GET', path: '/v1/leaderboard', query: n === undefined ? {} : { n } }),
      );
    expect((await at('999')).top).toHaveLength(50);
    expect((await at('0')).top).toHaveLength(1);
    expect((await at('-4')).top).toHaveLength(1);
    expect((await at('nope')).top).toHaveLength(10);
    expect((await at()).top).toHaveLength(10);
    expect((await at('3')).top.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect((await at('1')).top[0]).toEqual({ rank: 1, name: 'p50', bestIndex: 50, rebirths: 0 });

    const tied = setup();
    const players = ['ann', 'ben', 'cat'];
    for (const [i, name] of players.entries()) {
      const p = await join(tied.call, name);
      await tied.call({
        method: 'PUT',
        path: '/v1/snapshot',
        auth: p.token,
        body: snap(name, i === 2 ? 1 : 4, 1),
      });
      if (i === 2) {
        const res = await tied.call({ method: 'GET', path: '/v1/leaderboard', auth: p.token });
        expect(body<LeaderboardResponse>(res).me).toEqual({
          rank: 3,
          name: 'cat',
          bestIndex: 1,
          rebirths: 1,
        });
      }
    }
    expect(
      body<LeaderboardResponse>(await tied.call({ method: 'GET', path: '/v1/leaderboard' })).top,
    ).toEqual([
      { rank: 1, name: 'ann', bestIndex: 4, rebirths: 1 },
      { rank: 1, name: 'ben', bestIndex: 4, rebirths: 1 },
      { rank: 3, name: 'cat', bestIndex: 1, rebirths: 1 },
    ]);
  });

  it('unknown routes yield 404 not_found and a throwing store yields 500 internal', async () => {
    const { call } = setup();
    for (const req of [
      { method: 'GET', path: '/v1/nope' },
      { method: 'GET', path: '/' },
      { method: 'POST', path: '/v1/snapshot' },
      { method: 'GET', path: '/v1/players' },
      { method: 'GET', path: '/v1/pvp' }, // POST is a route since T40; GET is not.
    ]) {
      const res = await call(req);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'not_found' });
    }

    const boom = async (): Promise<never> => {
      throw new Error('store is down');
    };
    const broken: Store = {
      createPlayer: boom,
      getByToken: boom,
      getById: boom,
      putSnapshot: boom,
      setStolenIds: boom,
      setLastPvpAt: boom,
      setThefts: boom,
      rank: boom,
      top: boom,
      neighbor: boom,
    };
    const down = setup(broken);
    const res = await down.call({ method: 'POST', path: '/v1/players', body: { nickname: 'nope' } });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal' });
    expect((await down.call({ method: 'GET', path: '/v1/leaderboard' })).status).toBe(500);
  });

  it('pvp match picks the rank neighbour and returns its party with a match id', async () => {
    const { store, call } = setup();
    const me = await join(call, 'seeker');
    const rival = await join(call, 'rival');
    const put = (auth: string, s: Snapshot): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth, body: s });
    const roster = [1, 2, 3, 4, 5, 6].map((n) => comp(`d${n}`, { level: n }));
    await put(me.token, snap('seeker', 5, 0, [comp('c1')]));
    await put(rival.token, snap('rival', 9, 0, roster));

    const ask = (auth?: string): Promise<ApiResponse> =>
      call({ method: 'POST', path: '/v1/pvp/match', ...(auth === undefined ? {} : { auth }) });
    const auto = body<MatchResponse>(await ask(me.token));
    expect(auto.bot).toBe(false);
    expect(auto.matchId).toMatch(/^[0-9a-f]{16}$/);
    expect(auto.expiresAt).toBe(T0 + MATCH_TTL_MS);
    // No stored party → the PARTY_SIZE_MAX strongest by raw power, strongest first.
    expect(auto.opponent).toEqual({
      name: 'rival',
      bestIndex: 9,
      rebirths: 0,
      party: [6, 5, 4, 3, 2].map((n) => comp(`d${n}`, { level: n })),
    });
    expect(matches.get(auto.matchId)).toEqual({
      matchId: auto.matchId,
      playerId: me.playerId,
      opponentId: rival.playerId,
      seed: auto.seed,
      opponentParty: auto.opponent.party,
      createdAt: T0,
    });
    // A preview writes nothing: no cooldown is burned by looking.
    expect((await store.getById(me.playerId))?.lastPvpAt).toBeNull();

    // A stored party beats the automatic pick and keeps its own order.
    await put(rival.token, snap('rival', 9, 0, roster, ['d2', 'd5']));
    const picked = body<MatchResponse>(await ask(me.token));
    expect(picked.opponent.party).toEqual([comp('d2', { level: 2 }), comp('d5', { level: 5 })]);
    expect(picked.matchId).not.toBe(auto.matchId);

    // Alone on the leaderboard: the bot, with no party and no opponent row.
    const lonely = setup(new MemoryStore(), 99);
    const solo = await join(lonely.call, 'solo');
    await lonely.call({ method: 'PUT', path: '/v1/snapshot', auth: solo.token, body: snap('solo', 3, 0) });
    const bot = body<MatchResponse>(
      await lonely.call({ method: 'POST', path: '/v1/pvp/match', auth: solo.token }),
    );
    expect(bot.bot).toBe(true);
    expect(bot.opponent).toEqual({ name: BOT_NAME, bestIndex: 3, rebirths: 0, party: [] });
    expect(matches.get(bot.matchId)?.opponentId).toBeNull();

    // The trust boundary is the same as /v1/pvp's, minus the cooldown.
    expect((await ask()).status).toBe(401);
    const newbie = await join(call, 'newbie');
    const denied = await ask(newbie.token);
    expect(denied.status).toBe(400);
    expect(denied.body).toEqual({ error: 'no_snapshot' });
  });

  it('a match expires after MATCH_TTL_MS', async () => {
    const { call, advance } = setup(new MemoryStore(), 21);
    const me = await join(call, 'patient');
    await call({ method: 'PUT', path: '/v1/snapshot', auth: me.token, body: snap('patient', 2, 0) });
    const ask = async (): Promise<MatchResponse> =>
      body<MatchResponse>(await call({ method: 'POST', path: '/v1/pvp/match', auth: me.token }));

    const first = await ask();
    expect(matches.has(first.matchId)).toBe(true);

    // Exactly at the TTL it is still pending…
    advance(MATCH_TTL_MS);
    const edge = await ask();
    expect(matches.has(first.matchId)).toBe(true);

    // …one millisecond past it, the next call prunes it and nothing else.
    advance(1);
    const last = await ask();
    expect(matches.has(first.matchId)).toBe(false);
    expect(matches.has(edge.matchId)).toBe(true);
    expect(matches.has(last.matchId)).toBe(true);
    expect(last.expiresAt).toBe(first.expiresAt + MATCH_TTL_MS + 1);
  });

  it('upload keeps a valid party and drops party ids missing from the roster', async () => {
    const { store, call } = setup();
    const me = await join(call, 'picky');
    const roster = [comp('c1'), comp('c2'), comp('c3')];
    const put = (over: Record<string, unknown>): Promise<ApiResponse> =>
      call({
        method: 'PUT',
        path: '/v1/snapshot',
        auth: me.token,
        body: { name: 'picky', bestIndex: 4, rebirths: 0, companions: roster, ...over },
      });
    const stored = async (): Promise<string[] | undefined> =>
      (await store.getById(me.playerId))?.snapshot?.party;

    expect((await put({ party: ['c3', 'c1'] })).status).toBe(200);
    expect(await stored()).toEqual(['c3', 'c1']);

    // Unknown ids, duplicates, non-strings and ids failing COMPANION_ID_RE are
    // dropped one by one — a bad party never rejects the upload.
    expect((await put({ party: ['c9', 'c2', 'c2', 7, 'C-1!', 'c1'] })).status).toBe(200);
    expect(await stored()).toEqual(['c2', 'c1']);

    // Over PARTY_SIZE_MAX: the first five survive.
    const six = [...roster, comp('c4'), comp('c5'), comp('c6')];
    expect(
      (await put({ companions: six, party: ['c6', 'c5', 'c4', 'c3', 'c2', 'c1'] })).status,
    ).toBe(200);
    expect(await stored()).toEqual(['c6', 'c5', 'c4', 'c3', 'c2']);

    // A v2 client sends no party at all; a non-array one is ignored the same way.
    expect((await put({})).status).toBe(200);
    expect(await stored()).toEqual([]);
    expect((await put({ party: 'c1' })).status).toBe(200);
    expect(await stored()).toEqual([]);
  });

  it('thefts lists only pending records and prunes expired ones', async () => {
    const { store, call } = setup();
    const me = await join(call, 'victim');
    await store.setThefts(me.playerId, [
      stolen('t1', { reclaimUntil: T0 - 1 }),
      stolen('t2', { reclaimUntil: T0 }),
      stolen('t3'),
    ]);
    const res = await call({ method: 'GET', path: '/v1/thefts', auth: me.token });
    expect(res.status).toBe(200);
    // The deadline itself is still pending; one millisecond past it is not.
    expect(body<TheftsResponse>(res).thefts.map((t) => t.id)).toEqual(['t2', 't3']);
    // Pruned from the row, not just from the answer.
    expect((await store.getById(me.playerId))?.thefts.map((t) => t.id)).toEqual(['t2', 't3']);

    expect((await call({ method: 'GET', path: '/v1/thefts' })).status).toBe(401);
  });

  it('reclaim returns the companion under an r id and removes it from the thief', async () => {
    const { store, call } = setup();
    const victim = await join(call, 'victim');
    const thief = await join(call, 'thief');
    const put = (auth: string, s: Snapshot): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth, body: s });
    const take = (theftId: unknown, auth?: string): Promise<ApiResponse> =>
      call({ method: 'POST', path: '/v1/reclaim', body: { theftId }, ...(auth === undefined ? {} : { auth }) });

    await put(victim.token, snap('victim', 5, 0, [comp('c2')]));
    await put(thief.token, snap('thief', 9, 0, [comp('s7'), comp('d1')], ['s7', 'd1']));
    await store.setThefts(victim.playerId, [stolen('t7', { thiefId: thief.playerId })]);

    const res = await take('t7', victim.token);
    expect(res.status).toBe(200);
    expect(body<ReclaimResponse>(res).companion).toEqual(comp('r7'));
    expect((await store.getById(victim.playerId))?.snapshot?.companions).toEqual([
      comp('c2'),
      comp('r7'),
    ]);
    const robbed = await store.getById(thief.playerId);
    expect(robbed?.snapshot?.companions).toEqual([comp('d1')]);
    expect(robbed?.snapshot?.party).toEqual(['d1']);
    expect(robbed?.stolenIds).toEqual(['s7']);
    expect((await store.getById(victim.playerId))?.thefts).toEqual([]);

    // The record is spent; an unknown or absent id is not mine either.
    expect((await take('t7', victim.token)).status).toBe(404);
    expect((await take(undefined, victim.token)).status).toBe(404);
    expect((await take('t7')).status).toBe(401);

    // A full roster still answers 200 — the client's addCompanion rule drops it.
    const full = Array.from({ length: 30 }, (_, i) => comp(`f${i}`));
    await put(victim.token, snap('victim', 5, 0, full));
    await put(thief.token, snap('thief', 9, 0, [comp('s8')]));
    await store.setThefts(victim.playerId, [stolen('t8', { thiefId: thief.playerId })]);
    const capped = await take('t8', victim.token);
    expect(capped.status).toBe(200);
    expect(body<ReclaimResponse>(capped).companion.id).toBe('r8');
    expect((await store.getById(victim.playerId))?.snapshot?.companions).toEqual(full);
    expect((await store.getById(thief.playerId))?.snapshot?.companions).toEqual([]);
  });

  it('reclaim after the window returns 410 expired and drops the record', async () => {
    const { store, call, advance } = setup();
    const victim = await join(call, 'victim');
    const thief = await join(call, 'thief');
    const put = (auth: string, s: Snapshot): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth, body: s });
    const take = (theftId: string): Promise<ApiResponse> =>
      call({ method: 'POST', path: '/v1/reclaim', auth: victim.token, body: { theftId } });

    await put(victim.token, snap('victim', 5, 0));
    await put(thief.token, snap('thief', 9, 0, [comp('s9'), comp('sa')]));
    await store.setThefts(victim.playerId, [
      stolen('t9', { thiefId: thief.playerId }),
      stolen('ta', { thiefId: thief.playerId }),
    ]);

    // Exactly at reclaimUntil the window is still open.
    advance(RECLAIM_WINDOW_MS);
    expect((await take('t9')).status).toBe(200);

    advance(1);
    const late = await take('ta');
    expect(late.status).toBe(410);
    expect(late.body).toEqual({ error: 'expired' });
    expect((await store.getById(victim.playerId))?.thefts).toEqual([]);
    // Nothing moved: the thief keeps it and gains no stolenIds entry for it.
    const robbed = await store.getById(thief.playerId);
    expect(robbed?.snapshot?.companions).toEqual([comp('sa')]);
    expect(robbed?.stolenIds).toEqual(['s9']);
  });

  it('reclaim when the thief no longer holds the companion returns 409 gone', async () => {
    const { store, call } = setup();
    const victim = await join(call, 'victim');
    const thief = await join(call, 'thief');
    const put = (auth: string, s: Snapshot): Promise<ApiResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth, body: s });
    const take = (theftId: string): Promise<ApiResponse> =>
      call({ method: 'POST', path: '/v1/reclaim', auth: victim.token, body: { theftId } });

    await put(victim.token, snap('victim', 5, 0));
    // The thief consumed s1 long ago; tc's thief row never existed at all.
    await put(thief.token, snap('thief', 9, 0, [comp('d1')]));
    await store.setThefts(victim.playerId, [
      stolen('tb', { transferredId: 's1', thiefId: thief.playerId }),
      stolen('tc', { thiefId: 'nobody' }),
    ]);

    const consumed = await take('tb');
    expect(consumed.status).toBe(409);
    expect(consumed.body).toEqual({ error: 'gone' });
    expect((await store.getById(victim.playerId))?.thefts.map((t) => t.id)).toEqual(['tc']);

    const vanished = await take('tc');
    expect(vanished.status).toBe(409);
    expect((await store.getById(victim.playerId))?.thefts).toEqual([]);
    // Neither dead record hands out a companion.
    expect((await store.getById(victim.playerId))?.snapshot?.companions).toEqual([]);
  });

  it('snapshot upload answers with the pending thefts', async () => {
    const { store, call, advance } = setup();
    const me = await join(call, 'victim');
    const put = (): Promise<SnapshotResponse> =>
      call({ method: 'PUT', path: '/v1/snapshot', auth: me.token, body: snap('victim', 4, 0) }).then(
        (res) => body<SnapshotResponse>(res),
      );
    expect(await put()).toEqual({ rank: 1, removed: [], thefts: [] });

    const soon = stolen('t1', { reclaimUntil: T0 + 10 });
    await store.setThefts(me.playerId, [soon, stolen('t2')]);
    expect((await put()).thefts).toEqual([soon, stolen('t2')]);

    advance(11);
    expect((await put()).thefts).toEqual([stolen('t2')]);
  });
});

describe('MemoryStore', () => {
  it('orders top by score then oldest, ranks ties equally and finds both neighbours', async () => {
    const store = new MemoryStore();
    const players: [string, number, number][] = [
      ['a', 5, 0],
      ['b', 5, 0],
      ['c', 9, 1],
      ['d', 1, 0],
    ];
    for (const [id, bestIndex, rebirths] of players) {
      await store.createPlayer({ id, tokenHash: `h-${id}`, name: id });
      await store.putSnapshot(id, snap(id, bestIndex, rebirths));
    }
    await store.createPlayer({ id: 'e', tokenHash: 'h-e', name: 'e' });

    expect((await store.top(10)).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(await store.rank({ bestIndex: 5, rebirths: 0 })).toBe(2);
    expect(await store.rank({ bestIndex: 9, rebirths: 1 })).toBe(1);
    expect(await store.rank({ bestIndex: 0, rebirths: 0 })).toBe(5);

    // up = smallest strictly greater score; down = largest score ≤ mine, not me.
    expect((await store.neighbor('a', { bestIndex: 5, rebirths: 0 }, 'up'))?.id).toBe('c');
    expect((await store.neighbor('a', { bestIndex: 5, rebirths: 0 }, 'down'))?.id).toBe('b');
    expect((await store.neighbor('c', { bestIndex: 9, rebirths: 1 }, 'up'))).toBeNull();
    // Tie on the smallest greater score (a and b are both 5/0) → latest seq.
    expect((await store.neighbor('d', { bestIndex: 1, rebirths: 0 }, 'up'))?.id).toBe('b');
    expect((await store.neighbor('d', { bestIndex: 1, rebirths: 0 }, 'down'))).toBeNull();

    // A snapshot-less player is invisible, and the token hash never escapes.
    expect(await store.getByToken('h-e')).toEqual({
      id: 'e',
      name: 'e',
      snapshot: null,
      stolenIds: [],
      lastPvpAt: null,
      thefts: [],
    });
    await store.setLastPvpAt('e', 1234);
    expect((await store.getById('e'))?.lastPvpAt).toBe(1234);
    await store.setThefts('e', []);
    expect((await store.getById('e'))?.thefts).toEqual([]);
  });
});
