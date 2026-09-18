// T42 — net client + net session (SPEC F48, SERVER_ARCHITECTURE §6). The
// client is driven with a fake fetch that records url/method/headers/body and
// answers with real Response objects; the session runs against a recording
// fake NetClient and a per-test temp userData directory. No socket is ever
// opened: the offline test asserts the fake fetch has ZERO calls.

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Companion,
  LeaderboardResponse,
  MatchResponse,
  NetResult,
  PvpRequest,
  PvpResponse,
  ReclaimResponse,
  RegisterResponse,
  Snapshot,
  SnapshotResponse,
  Theft,
  TheftsResponse,
} from '../src/shared/api.js';
import { readIdentity, writeIdentity } from '../src/main/identity.js';
import {
  NET_TIMEOUT_MS,
  createNetClient,
  createNetSession,
  toSnapshot,
  type NetClient,
  type SnapshotSource,
} from '../src/main/net.js';

const BASE = 'https://desmon.example';

interface Recorded {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  aborts: boolean;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

/** Fake fetch answering `results` in order (an Error is thrown from fetch itself). */
function fakeFetch(...results: (Response | Error)[]): { calls: Recorded[]; fetchFn: typeof fetch } {
  const calls: Recorded[] = [];
  let i = 0;
  const fetchFn = ((input: unknown, init: RequestInit = {}): Promise<Response> => {
    calls.push({
      url: String(input),
      method: init.method ?? 'GET',
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? init.body : undefined,
      aborts: init.signal instanceof AbortSignal,
    });
    const next = results[i++] ?? json({});
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const ok = <T>(value: T): NetResult<T> => ({ ok: true, value });

const companion = (id: string): Companion => ({ id, speciesId: 'slime', bossIndex: 8, level: 1, stars: 1 });

const save = (over: Partial<SnapshotSource> = {}): SnapshotSource => ({
  bestIndex: 12,
  rebirths: 0,
  companions: [],
  ...over,
});

const MATCH: MatchResponse = {
  matchId: 'm1',
  seed: 7,
  bot: false,
  opponent: { name: 'Rival', bestIndex: 20, rebirths: 1, party: [companion('o1')] },
  expiresAt: 120_000,
};

const THEFT: Theft = {
  id: 'th1',
  companion: companion('c1'),
  transferredId: 's1',
  thiefId: 'p9',
  thiefName: 'Rival',
  at: 1000,
  reclaimUntil: 87_400,
};

const PVP: PvpResponse = {
  bot: true,
  seed: 7,
  win: true,
  opponent: { name: 'Training Dummy', bestIndex: 12, rebirths: 0, party: [] },
  blows: [],
  stolen: null,
  lost: null,
};

interface FakeClient extends NetClient {
  /** Every call in order: 'register:<name>' | 'upload' | 'leaderboard:<n>' | 'match' | 'pvp' | 'thefts' | 'reclaim:<id>'. */
  calls: string[];
  uploads: Snapshot[];
  pvps: PvpRequest[];
  /** Bearer token passed to each bearer call, in order. */
  tokens: (string | null)[];
}

function fakeClient(
  opts: {
    register?: () => NetResult<RegisterResponse>;
    upload?: (n: number) => NetResult<SnapshotResponse>;
    leaderboard?: (n: number) => NetResult<LeaderboardResponse>;
    match?: () => NetResult<MatchResponse>;
    pvp?: () => NetResult<PvpResponse>;
  } = {},
): FakeClient {
  const calls: string[] = [];
  const uploads: Snapshot[] = [];
  const pvps: PvpRequest[] = [];
  const tokens: (string | null)[] = [];
  let registers = 0;
  let uploaded = 0;
  let listed = 0;
  return {
    calls,
    uploads,
    pvps,
    tokens,
    register(name) {
      calls.push(`register:${name}`);
      registers += 1;
      return Promise.resolve(opts.register?.() ?? ok({ playerId: `p${registers}`, token: `t${registers}` }));
    },
    upload(token, snapshot) {
      calls.push('upload');
      tokens.push(token);
      uploads.push(snapshot);
      return Promise.resolve(opts.upload?.(uploaded++) ?? ok({ rank: 1, removed: [], thefts: [] }));
    },
    leaderboard(token, n) {
      calls.push(`leaderboard:${n}`);
      tokens.push(token);
      return Promise.resolve(opts.leaderboard?.(listed++) ?? ok({ top: [], me: null }));
    },
    opponents(token) {
      calls.push('opponents');
      tokens.push(token);
      return Promise.resolve(ok({ opponents: [] }));
    },
    match(token, opponentId) {
      calls.push(opponentId === undefined ? 'match' : `match:${opponentId}`);
      tokens.push(token);
      return Promise.resolve(opts.match?.() ?? ok(MATCH));
    },
    pvp(token, body) {
      calls.push('pvp');
      tokens.push(token);
      pvps.push(body);
      return Promise.resolve(opts.pvp?.() ?? ok(PVP));
    },
    thefts(token) {
      calls.push('thefts');
      tokens.push(token);
      return Promise.resolve(ok({ thefts: [THEFT] }));
    },
    reclaim(token, theftId) {
      calls.push(`reclaim:${theftId}`);
      tokens.push(token);
      return Promise.resolve(ok({ companion: companion('r1') }));
    },
  };
}

/** Lets every already-resolved fire-and-forget upload chain run to completion. */
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

let dir: string;
const uuid = (): string => 'abcd1234-0000-4000-8000-000000000000';
const NAME = 'Knight-abcd';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'desmon-net-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('createNetClient', () => {
  it('returns ok:false offline and never calls fetch when baseUrl is empty', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = createNetClient({ baseUrl: '', fetchFn });

    const results = await Promise.all([
      client.register('Knight-0000'),
      client.upload('tok', toSnapshot('Knight-0000', save())),
      client.leaderboard(null, 10),
      client.match('tok'),
      client.pvp('tok', { matchId: 'm1', party: [] }),
      client.thefts('tok'),
      client.reclaim('tok', 'th1'),
    ]);

    for (const result of results) expect(result).toEqual({ ok: false, error: 'offline' });
    expect(calls).toHaveLength(0);
    expect(NET_TIMEOUT_MS).toBe(5000);
  });

  it('sends Authorization Bearer and a JSON body', async () => {
    const { calls, fetchFn } = fakeFetch(
      json({ playerId: 'p1', token: 't1' }, 201),
      json({ rank: 3, removed: ['c9'], thefts: [] }),
      json({ top: [], me: null }),
    );
    const client = createNetClient({ baseUrl: BASE, fetchFn });
    const snapshot = toSnapshot('Hero_1', save({ companions: [companion('c1')] }));

    expect(await client.register('Hero_1')).toEqual({ ok: true, value: { playerId: 'p1', token: 't1' } });
    expect(await client.upload('t1', snapshot)).toEqual({ ok: true, value: { rank: 3, removed: ['c9'], thefts: [] } });
    expect(await client.leaderboard(null, 5)).toEqual({ ok: true, value: { top: [], me: null } });

    expect(calls[0]).toEqual({
      url: `${BASE}/v1/players`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'Hero_1' }),
      aborts: true,
    });
    expect(calls[1]).toEqual({
      url: `${BASE}/v1/snapshot`,
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t1' },
      body: JSON.stringify(snapshot),
      aborts: true,
    });
    // No bearer given → no Authorization header at all.
    expect(calls[2]).toEqual({
      url: `${BASE}/v1/leaderboard?n=5`,
      method: 'GET',
      headers: { 'content-type': 'application/json' },
      body: undefined,
      aborts: true,
    });
  });

  it('maps HTTP 401 to unauthorized, 429 cooldown to cooldown and a thrown fetch to network', async () => {
    const { fetchFn } = fakeFetch(
      json({ error: 'unauthorized' }, 401),
      json({ error: 'cooldown', retryAfterSec: 42 }, 429),
      new Error('ECONNRESET'),
      Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }),
    );
    const client = createNetClient({ baseUrl: BASE, fetchFn, timeoutMs: 10 });

    const body: PvpRequest = { matchId: 'm1', party: [] };
    expect(await client.pvp('t1', body)).toEqual({ ok: false, error: 'unauthorized' });
    expect(await client.pvp('t1', body)).toEqual({ ok: false, error: 'cooldown', retryAfterSec: 42 });
    expect(await client.pvp('t1', body)).toEqual({ ok: false, error: 'network' });
    expect(await client.pvp('t1', body)).toEqual({ ok: false, error: 'network' });
  });

  it('maps any other non-2xx and an unparsable body to server with the status', async () => {
    const { fetchFn } = fakeFetch(
      json({ error: 'bad_request' }, 400),
      json({ error: 'rate_limited', retryAfterSec: 9 }, 429),
      new Response('<html>gateway</html>', { status: 502 }),
      new Response('not json at all', { status: 200 }),
    );
    const client = createNetClient({ baseUrl: BASE, fetchFn });

    expect(await client.upload('t1', toSnapshot(NAME, save()))).toEqual({ ok: false, error: 'server', status: 400 });
    // 429 without the cooldown code is a plain rate limit, not a PvP cooldown.
    expect(await client.upload('t1', toSnapshot(NAME, save()))).toEqual({ ok: false, error: 'server', status: 429 });
    expect(await client.upload('t1', toSnapshot(NAME, save()))).toEqual({ ok: false, error: 'server', status: 502 });
    expect(await client.upload('t1', toSnapshot(NAME, save()))).toEqual({ ok: false, error: 'server', status: 200 });
  });

  it('match calls POST pvp match with the bearer and maps the response', async () => {
    const { calls, fetchFn } = fakeFetch(json(MATCH), json({ thefts: [THEFT] } satisfies TheftsResponse));
    const client = createNetClient({ baseUrl: BASE, fetchFn });

    expect(await client.match('t1')).toEqual({ ok: true, value: MATCH });
    expect(await client.thefts('t1')).toEqual({ ok: true, value: { thefts: [THEFT] } });

    expect(calls[0]).toEqual({
      url: `${BASE}/v1/pvp/match`,
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t1' },
      body: '{}',
      aborts: true,
    });
    expect(calls[1]).toEqual({
      url: `${BASE}/v1/thefts`,
      method: 'GET',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t1' },
      body: undefined,
      aborts: true,
    });
  });

  it('pvp sends matchId and party and maps 410 to expired', async () => {
    const { calls, fetchFn } = fakeFetch(json(PVP), json({ error: 'expired' }, 410));
    const client = createNetClient({ baseUrl: BASE, fetchFn });

    expect(await client.pvp('t1', { matchId: 'm1', party: ['c1', 'c2'] })).toEqual({ ok: true, value: PVP });
    // The match died of its 120 s TTL between the preview and the Battle! click.
    expect(await client.pvp('t1', { matchId: 'm1', party: [] })).toEqual({
      ok: false,
      error: 'expired',
      status: 410,
    });

    expect(calls[0]).toEqual({
      url: `${BASE}/v1/pvp`,
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t1' },
      body: JSON.stringify({ matchId: 'm1', party: ['c1', 'c2'] }),
      aborts: true,
    });
  });

  it('reclaim maps 409 to gone and 410 to expired', async () => {
    const { calls, fetchFn } = fakeFetch(
      json({ companion: companion('r1') } satisfies ReclaimResponse),
      json({ error: 'gone' }, 409),
      json({ error: 'expired' }, 410),
    );
    const client = createNetClient({ baseUrl: BASE, fetchFn });

    expect(await client.reclaim('t1', 'th1')).toEqual({ ok: true, value: { companion: companion('r1') } });
    // The thief already consumed it; the 24 h window on the other one is over.
    expect(await client.reclaim('t1', 'th1')).toEqual({ ok: false, error: 'gone', status: 409 });
    expect(await client.reclaim('t1', 'th2')).toEqual({ ok: false, error: 'expired', status: 410 });

    expect(calls[0]).toEqual({
      url: `${BASE}/v1/reclaim`,
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t1' },
      body: JSON.stringify({ theftId: 'th1' }),
      aborts: true,
    });
  });
});

describe('v0.7 companion reply validation', () => {
  const replies = (c: unknown): {
    name: string;
    response: unknown;
    call: (client: NetClient) => Promise<NetResult<unknown>>;
  }[] => [
    {
      name: 'directory party',
      response: { opponents: [{ ...MATCH.opponent, playerId: 'p9', rank: 1, hero: { formId: 'h00', buffPercent: 0 }, wins: 0, losses: 0, party: [c] }] },
      call: (client) => client.opponents('token'),
    },
    { name: 'match party', response: { ...MATCH, opponent: { ...MATCH.opponent, party: [c] } }, call: (client) => client.match('token') },
    { name: 'PvP party', response: { ...PVP, opponent: { ...MATCH.opponent, party: [c] } }, call: (client) => client.pvp('token', { matchId: 'm1', party: [] }) },
    { name: 'PvP stolen', response: { ...PVP, stolen: c }, call: (client) => client.pvp('token', { matchId: 'm1', party: [] }) },
    { name: 'PvP lost', response: { ...PVP, lost: c }, call: (client) => client.pvp('token', { matchId: 'm1', party: [] }) },
    { name: 'thefts', response: { thefts: [{ ...THEFT, companion: c }] }, call: (client) => client.thefts('token') },
    { name: 'upload thefts', response: { rank: 1, removed: [], thefts: [{ ...THEFT, companion: c }] }, call: (client) => client.upload('token', toSnapshot(NAME, save())) },
    { name: 'reclaim', response: { companion: c }, call: (client) => client.reclaim('token', 'th1') },
  ];

  it.each([11, 250, Number.MAX_SAFE_INTEGER])('preserves exact level %s in every nested companion response', async (level) => {
    for (const row of replies({ ...companion('c1'), level })) {
      const { fetchFn } = fakeFetch(json(row.response));
      expect(await row.call(createNetClient({ baseUrl: BASE, fetchFn })), row.name).toEqual(ok(row.response));
    }
  });

  it.each(replies(companion('c1')).map(({ name }) => name))('rejects unsafe/malformed companions in %s', async (name) => {
    const malformed = [
      ...[0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '250', undefined].map((level) => ({ ...companion('c1'), level })),
      null, [], {}, { ...companion('c1'), id: 'invalid/id' },
      { ...companion('c1'), speciesId: 'unknown' }, { ...companion('c1'), bossIndex: -1 },
      { ...companion('c1'), stars: 0.5 },
    ];
    for (const c of malformed) {
      const row = replies(c).find((entry) => entry.name === name)!;
      const { fetchFn } = fakeFetch(json(row.response));
      // Null means no transfer in PvP; a present companion must always validate.
      const expected = c === null && (name === 'PvP stolen' || name === 'PvP lost')
        ? ok(row.response) : { ok: false, error: 'server' };
      expect(await row.call(createNetClient({ baseUrl: BASE, fetchFn }))).toEqual(expected);
    }
  });

  it('rejects missing or malformed response containers without throwing', async () => {
    for (const row of replies(companion('c1'))) {
      for (const response of [null, [], {}, { opponent: null, stolen: null, lost: null, thefts: null, companion: null }]) {
        const { fetchFn } = fakeFetch(json(response));
        expect(await row.call(createNetClient({ baseUrl: BASE, fetchFn })), row.name).toEqual({ ok: false, error: 'server' });
      }
    }
  });

  it('requires the real requested player ID while preserving legacy random and bot previews', async () => {
    const exact = { ...MATCH, opponent: { ...MATCH.opponent, playerId: 'selected-9' } };
    const wrong = { ...exact, opponent: { ...exact.opponent, playerId: 'other-9' } };
    const invalid = { ...exact, opponent: { ...exact.opponent, playerId: 'invalid/id' } };
    const bot = { ...MATCH, bot: true, opponent: PVP.opponent };
    const { fetchFn } = fakeFetch(json(MATCH), json(wrong), json(invalid), json(bot), json({ ...exact, bot: true }), json(exact), json(MATCH), json(bot));
    const client = createNetClient({ baseUrl: BASE, fetchFn });
    for (let i = 0; i < 5; i += 1) expect(await client.match('token', 'selected-9')).toEqual({ ok: false, error: 'server' });
    expect(await client.match('token', 'selected-9')).toEqual(ok(exact));
    expect(await client.match('token')).toEqual(ok(MATCH));
    expect(await client.match('token')).toEqual(ok(bot));
  });
});

describe('toSnapshot', () => {
  it('carries name, bestIndex, rebirths and the roster', () => {
    const source = save({ rebirths: 2, companions: [companion('c1'), companion('c2')] });
    expect(toSnapshot('Hero_1', source)).toEqual({
      name: 'Hero_1',
      bestIndex: 12,
      rebirths: 2,
      companions: [companion('c1'), companion('c2')],
      party: [],
    });
  });

  it('toSnapshot copies pvpParty into party', () => {
    expect(toSnapshot('Hero_1', save({ pvpParty: ['c2', 'c1'] })).party).toEqual(['c2', 'c1']);
    // A party-less source (src/server/probe.ts) still yields an empty party.
    expect(toSnapshot('Hero_1', { bestIndex: 0, rebirths: 0, companions: [] }).party).toEqual([]);
  });
});

describe('createNetSession', () => {
  it('session registers once then uploads only when the roster key changes', async () => {
    const client = fakeClient();
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });

    expect(session.identity()).toEqual({ name: NAME, playerId: null, online: true });

    session.onSave(save());
    await flush();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload']);
    expect(client.uploads[0]).toEqual(toSnapshot(NAME, save()));
    expect(readIdentity(dir, uuid)).toEqual({ name: NAME, playerId: 'p1', token: 't1', notifiedTheftIds: [] });
    expect(session.identity()).toEqual({ name: NAME, playerId: 'p1', online: true });

    // bestIndex alone never triggers an upload.
    session.onSave(save({ bestIndex: 30 }));
    session.onSave(save({ bestIndex: 31 }));
    await flush();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload']);

    // A roster change does — with the newest bestIndex riding along, and no re-register.
    session.onSave(save({ bestIndex: 31, companions: [companion('c1')] }));
    await flush();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload', 'upload']);
    expect(client.uploads[1]).toEqual(toSnapshot(NAME, save({ bestIndex: 31, companions: [companion('c1')] })));
    expect(client.tokens).toEqual(['t1', 't1']);
  });

  it('session drops credentials and re-registers once on unauthorized', async () => {
    writeIdentity(dir, { name: 'Hero_1', playerId: 'old', token: 't0', notifiedTheftIds: ['th1'] });
    // Every leaderboard call is rejected except the second one (the retry).
    const client = fakeClient({
      leaderboard: (n) => (n === 1 ? ok({ top: [], me: null }) : { ok: false, error: 'unauthorized' }),
    });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });

    expect(await session.leaderboard(10)).toEqual({ ok: true, value: { top: [], me: null, removed: [] } });
    expect(client.calls).toEqual(['leaderboard:10', 'register:Hero_1', 'leaderboard:10']);
    expect(client.tokens).toEqual(['t0', 't1']);
    // Credentials were cleared and re-written; the nickname survives.
    // The notification log survives the credential reset.
    expect(readIdentity(dir, uuid)).toEqual({
      name: 'Hero_1',
      playerId: 'p1',
      token: 't1',
      notifiedTheftIds: ['th1'],
    });

    // A second 401 in the same session is returned as-is — no second re-register.
    expect(await session.leaderboard(10)).toEqual({ ok: false, error: 'unauthorized' });
    expect(client.calls).toEqual(['leaderboard:10', 'register:Hero_1', 'leaderboard:10', 'leaderboard:10']);
  });

  it('pvp uploads the latest snapshot before posting', async () => {
    const client = fakeClient({ upload: (n) => ok({ rank: 4, removed: n === 0 ? [] : ['c1'], thefts: [] }) });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });

    session.onSave(save({ companions: [companion('c1')] }));
    await flush();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload']);

    // Nothing changed since that upload, yet pvp always re-uploads first.
    const result = await session.pvp('m1', ['c1']);
    expect(client.calls).toEqual([`register:${NAME}`, 'upload', 'upload', 'pvp']);
    expect(client.uploads[1]).toEqual(toSnapshot(NAME, save({ companions: [companion('c1')] })));
    expect(result).toEqual({ ok: true, value: { ...PVP, removed: ['c1'] } });
  });

  it.each([
    { name: 'malformed upload theft', response: () => json({ rank: 1, removed: [], thefts: [{ ...THEFT, companion: { ...companion('c1'), level: Number.MAX_SAFE_INTEGER + 1 } }] }), error: { ok: false, error: 'server' } },
    { name: 'legacy server rejecting a high level', response: () => json({ error: 'bad_request' }, 400), error: { ok: false, error: 'server', status: 400 } },
    { name: 'failed transport', response: () => new Error('ECONNRESET'), error: { ok: false, error: 'network' } },
  ])('aborts PvP and preserves roster/history after $name', async ({ response, error }) => {
    const prior = { name: NAME, playerId: 'p1', token: 't1', notifiedTheftIds: [], pvpHistory: { wins: 3, losses: 2, matchIds: ['prior'] } };
    writeIdentity(dir, prior);
    const { calls, fetchFn } = fakeFetch(json({ rank: 1, removed: [], thefts: [] }), response(), json(PVP));
    const session = createNetSession({ client: createNetClient({ baseUrl: BASE, fetchFn }), userDataDir: dir, online: true, randomUUID: uuid });
    const source = save({ companions: [{ ...companion('c1'), level: 250 }] });
    const original = structuredClone(source);
    session.onSave(source);
    await flush();
    expect(await session.pvp('m1', ['c1'])).toEqual(error);
    expect(calls.map(({ url }) => url)).toEqual([`${BASE}/v1/snapshot`, `${BASE}/v1/snapshot`]);
    expect(source).toEqual(original);
    expect(session.pvpHistory()).toEqual({ wins: 3, losses: 2 });
    expect(readIdentity(dir, uuid)).toEqual(prior);
  });

  it.each(['missing', 'mismatch', 'bot'])('rejects a specified opponent %s result before history or stolen roster relay, including retries', async (kind) => {
    const selected = { ...MATCH, opponent: { ...MATCH.opponent, playerId: 'selected-9' } };
    const accepted = { ...PVP, bot: false, opponent: selected.opponent, stolen: { ...companion('s7'), level: 250 } };
    const rejected = kind === 'bot' ? { ...accepted, bot: true } : {
      ...accepted, opponent: kind === 'missing' ? MATCH.opponent : { ...MATCH.opponent, playerId: 'wrong-9' },
    };
    const responses = [rejected, rejected, accepted];
    const client = fakeClient({ match: () => ok(selected), pvp: () => ok(responses.shift()!) });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    expect(await session.match('selected-9')).toEqual(ok(selected));
    const prior = readIdentity(dir, uuid);
    for (let i = 0; i < 2; i += 1) {
      expect(await session.pvp(selected.matchId, [])).toEqual({ ok: false, error: 'server' });
      expect(session.pvpHistory()).toEqual({ wins: 0, losses: 0 });
      expect(readIdentity(dir, uuid)).toEqual(prior);
    }
    expect(await session.pvp(selected.matchId, [])).toEqual(ok({ ...accepted, removed: [] }));
    expect(session.pvpHistory()).toEqual({ wins: 1, losses: 0 });
  });

  it('binds each specified match separately and preserves legacy random matches', async () => {
    const first = { ...MATCH, matchId: 'first', opponent: { ...MATCH.opponent, playerId: 'first-9' } };
    const second = { ...MATCH, matchId: 'second', opponent: { ...MATCH.opponent, playerId: 'second-9' } };
    const previews = [first, second, MATCH];
    const results = [
      { ...PVP, bot: false, opponent: second.opponent },
      { ...PVP, bot: false, opponent: first.opponent },
      { ...PVP, bot: false, opponent: MATCH.opponent },
    ];
    const client = fakeClient({ match: () => ok(previews.shift()!), pvp: () => ok(results.shift()!) });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    expect(await session.match('first-9')).toEqual(ok(first));
    expect(await session.match('second-9')).toEqual(ok(second));
    expect(await session.match()).toEqual(ok(MATCH));
    for (const preview of [second, first, MATCH]) {
      expect(await session.pvp(preview.matchId, [])).toEqual(ok({ ...PVP, bot: false, opponent: preview.opponent, removed: [] }));
    }
    expect(session.pvpHistory()).toEqual({ wins: 3, losses: 0 });
  });

  it('setName ignores an invalid nickname and makes the roster key dirty', async () => {
    const client = fakeClient();
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });

    session.onSave(save());
    await flush();
    for (const bad of [42, '', 'has space', null]) {
      expect(session.setName(bad)).toEqual({ name: NAME, playerId: 'p1', online: true });
    }
    expect(session.setName('Hero_1')).toEqual({ name: 'Hero_1', playerId: 'p1', online: true });
    expect(readIdentity(dir, uuid).name).toBe('Hero_1');

    // identity() (menu open) re-uploads the last save under the new name.
    session.identity();
    await flush();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload', 'upload']);
    expect(client.uploads[1]).toEqual(toSnapshot('Hero_1', save()));

    // Still clean afterwards: a second menu open uploads nothing.
    session.identity();
    await flush();
    expect(client.calls).toHaveLength(3);
  });

  it('stays offline end to end without ever calling fetch', async () => {
    const { calls, fetchFn } = fakeFetch();
    const session = createNetSession({
      client: createNetClient({ baseUrl: '', fetchFn }),
      userDataDir: dir,
      online: false,
      randomUUID: uuid,
    });

    expect(session.identity()).toEqual({ name: NAME, playerId: null, online: false });
    session.onSave(save({ companions: [companion('c1')] }));
    await flush();
    expect(await session.leaderboard(10)).toEqual({ ok: false, error: 'offline' });
    expect(await session.match()).toEqual({ ok: false, error: 'offline' });
    expect(await session.pvp('m1', [])).toEqual({ ok: false, error: 'offline' });
    expect(await session.thefts()).toEqual({ ok: false, error: 'offline' });
    expect(await session.reclaim('th1')).toEqual({ ok: false, error: 'offline' });
    expect(calls).toHaveLength(0);
    expect(readIdentity(dir, uuid).token).toBeNull();
  });

  it('session pvp uploads the snapshot before battling and session match uploads only when dirty', async () => {
    // The background upload of the party edit fails, so the roster key stays dirty.
    const client = fakeClient({
      upload: (n) => (n === 0 ? { ok: false, error: 'network' } : ok({ rank: 1, removed: [], thefts: [] })),
    });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    const edited = save({ companions: [companion('c1')], pvpParty: ['c1'] });

    session.onSave(edited);
    await flush();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload']);

    // Still dirty → match uploads first: the opponent must see my current party.
    expect(await session.match()).toEqual(ok(MATCH));
    expect(client.calls).toEqual([`register:${NAME}`, 'upload', 'upload', 'match']);
    expect(client.uploads.map((u) => u.party)).toEqual([['c1'], ['c1']]);

    // Clean now → a second match uploads nothing.
    expect(await session.match()).toEqual(ok(MATCH));
    expect(client.calls).toEqual([`register:${NAME}`, 'upload', 'upload', 'match', 'match']);

    // pvp ALWAYS re-uploads first, clean or not, and forwards matchId + party.
    expect(await session.pvp('m1', ['c1'])).toEqual(ok({ ...PVP, removed: [] }));
    expect(client.calls).toEqual([
      `register:${NAME}`,
      'upload',
      'upload',
      'match',
      'match',
      'upload',
      'pvp',
    ]);
    expect(client.pvps).toEqual([{ matchId: 'm1', party: ['c1'] }]);
  });

  it('session thefts and reclaim register once and carry the bearer', async () => {
    const client = fakeClient();
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });

    expect(await session.thefts()).toEqual(ok({ thefts: [THEFT] }));
    expect(await session.reclaim('th1')).toEqual(ok({ companion: companion('r1') }));
    // Neither call changes my roster on the way out, so neither uploads.
    expect(client.calls).toEqual([`register:${NAME}`, 'thefts', 'reclaim:th1']);
    expect(client.tokens).toEqual(['t1', 't1']);
  });
});

describe('v0.4 directory session', () => {
  it('rejects malformed server rows before sprites and selected ids reach the renderer', async () => {
    const row = { playerId: 'player-1', name: 'Rival', rank: 1, bestIndex: 5, rebirths: 0, hero: { formId: 'h06', buffPercent: 25 }, party: [companion('d1')], wins: 2, losses: 1 };
    const malformed = [
      {}, { opponents: null }, { opponents: [{ ...row, hero: { formId: 'evil', buffPercent: 20 } }] },
      { opponents: [{ ...row, wins: -1 }] }, { opponents: [{ ...row, party: [{ ...companion('d1'), speciesId: 'evil' }] }] },
      { opponents: Array.from({ length: 51 }, () => row) },
    ];
    const { fetchFn } = fakeFetch(...malformed.map((r) => json(r)), json({ opponents: [row] }));
    const client = createNetClient({ baseUrl: BASE, fetchFn });
    for (let i = 0; i < malformed.length; i += 1) expect(await client.opponents('token')).toEqual({ ok: false, error: 'server' });
    expect(await client.opponents('token')).toEqual(ok({ opponents: [row] }));
  });

  it('lists opponents and selects their id over the authenticated bridge', async () => {
    const selected = { ...MATCH, opponent: { ...MATCH.opponent, playerId: 'player-123' } };
    const { calls, fetchFn } = fakeFetch(json({ opponents: [] }), json(selected));
    const client = createNetClient({ baseUrl: BASE, fetchFn });
    expect(await client.opponents('token')).toEqual(ok({ opponents: [] }));
    expect(await client.match('token', 'player-123')).toEqual(ok(selected));
    expect(calls[0]).toMatchObject({ url: `${BASE}/v1/pvp/opponents`, method: 'GET', headers: { authorization: 'Bearer token' } });
    expect(calls[1]?.body).toBe(JSON.stringify({ opponentId: 'player-123' }));
    const offline = createNetClient({ baseUrl: '', fetchFn });
    expect(await offline.opponents('token')).toEqual({ ok: false, error: 'offline' });
    expect(calls).toHaveLength(2);
  });

  it('uploads equipped hero changes, lists opponents and forwards a selected id', async () => {
    const selected = { ...MATCH, opponent: { ...MATCH.opponent, playerId: 'opponent-9' } };
    const client = fakeClient({ match: () => ok(selected) });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    session.onSave(save({ hero: { equipped: { formId: 'h06', buffPercent: 25 } } }));
    await flush();
    expect(client.uploads.at(-1)?.hero).toEqual({ formId: 'h06', buffPercent: 25 });
    session.onSave(save({ hero: { equipped: { formId: 'h07', buffPercent: 10 } } }));
    await flush();
    expect(client.uploads).toHaveLength(2);
    expect(client.uploads.at(-1)?.hero).toEqual({ formId: 'h07', buffPercent: 10 });
    expect(await session.opponents()).toEqual(ok({ opponents: [] }));
    expect(await session.match('opponent-9')).toEqual(ok(selected));
    expect(client.calls.slice(-2)).toEqual(['opponents', 'match:opponent-9']);
  });
});


describe('v0.5 official PvP history', () => {
  it('counts concurrent successes once and restores absolute totals after restart and rename', async () => {
    const client = fakeClient({ pvp: () => ok({ ...PVP, bot: false }) });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    await Promise.all([session.pvp('same', []), session.pvp('same', [])]);
    expect(session.pvpHistory()).toEqual({ wins: PVP.win ? 1 : 0, losses: PVP.win ? 0 : 1 });
    session.setName('History_Hero');
    const restarted = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    expect(restarted.pvpHistory()).toEqual(session.pvpHistory());
    await restarted.pvp('same', []);
    expect(restarted.pvpHistory()).toEqual(session.pvpHistory());
    expect(readIdentity(dir, uuid).name).toBe('History_Hero');
  });

  it('excludes bot, failed and malformed verdicts and records both human wins and losses', async () => {
    const responses: NetResult<PvpResponse>[] = [ok({ ...PVP, bot: true }), { ok: false, error: 'network' },
      ok({ ...PVP, bot: false, win: true }), ok({ ...PVP, bot: false, win: false }),
      ok({ ...PVP, bot: undefined } as unknown as PvpResponse)];
    const client = fakeClient({ pvp: () => responses.shift()! });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });
    for (let i = 0; i < 5; i++) await session.pvp(`m${i}`, []);
    expect(session.pvpHistory()).toEqual({ wins: 1, losses: 1 });
    expect(readIdentity(dir, uuid).pvpHistory?.matchIds).toEqual(['m2', 'm3']);
  });

  it('retains totals after the 100-match dedup window is trimmed', async () => {
    const session = createNetSession({ client: fakeClient({ pvp: () => ok({ ...PVP, bot: false }) }), userDataDir: dir, online: true, randomUUID: uuid });
    for (let i = 0; i < 105; i++) await session.pvp(`m${i}`, []);
    const history = readIdentity(dir, uuid).pvpHistory!;
    expect(history.wins + history.losses).toBe(105);
    expect(history.matchIds).toHaveLength(100);
    expect(history.matchIds[0]).toBe('m5');
    await session.pvp('m104', []);
    expect(readIdentity(dir, uuid).pvpHistory).toEqual(history);
  });

  it('returns the verdict with a persistence warning, retries disk storage on save and never recounts it', async () => {
    const session = createNetSession({ client: fakeClient({ pvp: () => ok({ ...PVP, bot: false }) }), userDataDir: dir, online: true, randomUUID: uuid });
    await session.leaderboard(1); // Register before deliberately obstructing only the atomic temp file.
    const obstacle = join(dir, 'identity.json.tmp');
    mkdirSync(obstacle);
    const result = await session.pvp('disk-failure', []);
    expect(result).toEqual({ ok: true, value: { ...PVP, bot: false, removed: [], historySaved: false } });
    expect(session.pvpHistory().wins + session.pvpHistory().losses).toBe(1);
    expect(readIdentity(dir, uuid).pvpHistory).toBeUndefined();
    rmSync(obstacle, { recursive: true });
    session.onSave(save());
    await flush();
    expect(readIdentity(dir, uuid).pvpHistory?.matchIds).toEqual(['disk-failure']);
    await session.pvp('disk-failure', []);
    expect(session.pvpHistory().wins + session.pvpHistory().losses).toBe(1);
  });
});


it('keeps the persisted name and credentials when a valid rename cannot be stored', () => {
  writeIdentity(dir, { name: 'Previous', playerId: 'p1', token: 't1', notifiedTheftIds: [] });
  const session = createNetSession({ client: fakeClient(), userDataDir: dir, online: false, randomUUID: uuid });
  mkdirSync(join(dir, 'identity.json.tmp'));
  expect(session.setName('Proposed').name).toBe('Previous');
  expect(readIdentity(dir, uuid)).toMatchObject({ name: 'Previous', playerId: 'p1', token: 't1' });
});
