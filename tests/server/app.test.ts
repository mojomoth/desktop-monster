// T39 — createApp + MemoryStore (SPEC F44, SERVER_ARCHITECTURE §2–§4).
// handle() is called directly with an injected MemoryStore, a counter clock
// and a mulberry32-driven id/token source: no sockets, no timers, no DB, no
// wall clock.

import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/index.js';
import { createApp, RATE_LIMIT } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import type { Store } from '../../src/server/store.js';
import type { ApiRequest, ApiResponse } from '../../src/server/http.js';
import type {
  Companion,
  LeaderboardResponse,
  RegisterResponse,
  Snapshot,
  SnapshotResponse,
} from '../../src/shared/api.js';

type Call = Partial<ApiRequest> & { method: string; path: string };

function setup(store: Store = new MemoryStore(), seed = 7) {
  const rng = mulberry32(seed);
  const draw = (): string => Math.floor(rng.next() * 0xffffffff).toString(16);
  let ids = 0;
  let clock = 1_700_000_000_000;
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

const snap = (
  name: string,
  bestIndex: number,
  rebirths: number,
  companions: Companion[] = [],
): Snapshot => ({ name, bestIndex, rebirths, companions });

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
      { method: 'POST', path: '/v1/pvp' }, // T40 adds it; until then it is unknown.
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
    });
    await store.setLastPvpAt('e', 1234);
    expect((await store.getById('e'))?.lastPvpAt).toBe(1234);
  });
});
