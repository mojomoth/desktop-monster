// T42 — net client + net session (SPEC F48, SERVER_ARCHITECTURE §6). The
// client is driven with a fake fetch that records url/method/headers/body and
// answers with real Response objects; the session runs against a recording
// fake NetClient and a per-test temp userData directory. No socket is ever
// opened: the offline test asserts the fake fetch has ZERO calls.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Companion,
  LeaderboardResponse,
  NetResult,
  PvpResponse,
  RegisterResponse,
  Snapshot,
  SnapshotResponse,
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
  /** Every call in order: 'register:<name>' | 'upload' | 'leaderboard:<n>' | 'pvp'. */
  calls: string[];
  uploads: Snapshot[];
  /** Bearer token passed to each bearer call, in order. */
  tokens: (string | null)[];
}

function fakeClient(
  opts: {
    register?: () => NetResult<RegisterResponse>;
    upload?: (n: number) => NetResult<SnapshotResponse>;
    leaderboard?: (n: number) => NetResult<LeaderboardResponse>;
    pvp?: () => NetResult<PvpResponse>;
  } = {},
): FakeClient {
  const calls: string[] = [];
  const uploads: Snapshot[] = [];
  const tokens: (string | null)[] = [];
  let registers = 0;
  let uploaded = 0;
  let listed = 0;
  return {
    calls,
    uploads,
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
    pvp(token) {
      calls.push('pvp');
      tokens.push(token);
      return Promise.resolve(opts.pvp?.() ?? ok(PVP));
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
      client.pvp('tok'),
    ]);

    for (const result of results) expect(result).toEqual({ ok: false, error: 'offline' });
    expect(calls).toHaveLength(0);
    expect(NET_TIMEOUT_MS).toBe(5000);
  });

  it('sends Authorization Bearer and a JSON body', async () => {
    const { calls, fetchFn } = fakeFetch(
      json({ playerId: 'p1', token: 't1' }, 201),
      json({ rank: 3, removed: ['c9'] }),
      json({ top: [], me: null }),
    );
    const client = createNetClient({ baseUrl: BASE, fetchFn });
    const snapshot = toSnapshot('Hero_1', save({ companions: [companion('c1')] }));

    expect(await client.register('Hero_1')).toEqual({ ok: true, value: { playerId: 'p1', token: 't1' } });
    expect(await client.upload('t1', snapshot)).toEqual({ ok: true, value: { rank: 3, removed: ['c9'] } });
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

    expect(await client.pvp('t1')).toEqual({ ok: false, error: 'unauthorized' });
    expect(await client.pvp('t1')).toEqual({ ok: false, error: 'cooldown', retryAfterSec: 42 });
    expect(await client.pvp('t1')).toEqual({ ok: false, error: 'network' });
    expect(await client.pvp('t1')).toEqual({ ok: false, error: 'network' });
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
    expect(readIdentity(dir, uuid)).toEqual({ name: NAME, playerId: 'p1', token: 't1' });
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
    writeIdentity(dir, { name: 'Hero_1', playerId: 'old', token: 't0' });
    // Every leaderboard call is rejected except the second one (the retry).
    const client = fakeClient({
      leaderboard: (n) => (n === 1 ? ok({ top: [], me: null }) : { ok: false, error: 'unauthorized' }),
    });
    const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: uuid });

    expect(await session.leaderboard(10)).toEqual({ ok: true, value: { top: [], me: null, removed: [] } });
    expect(client.calls).toEqual(['leaderboard:10', 'register:Hero_1', 'leaderboard:10']);
    expect(client.tokens).toEqual(['t0', 't1']);
    // Credentials were cleared and re-written; the nickname survives.
    expect(readIdentity(dir, uuid)).toEqual({ name: 'Hero_1', playerId: 'p1', token: 't1' });

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
    const result = await session.pvp();
    expect(client.calls).toEqual([`register:${NAME}`, 'upload', 'upload', 'pvp']);
    expect(client.uploads[1]).toEqual(toSnapshot(NAME, save({ companions: [companion('c1')] })));
    expect(result).toEqual({ ok: true, value: { ...PVP, removed: ['c1'] } });
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
    expect(await session.pvp()).toEqual({ ok: false, error: 'offline' });
    expect(calls).toHaveLength(0);
    expect(readIdentity(dir, uuid).token).toBeNull();
  });
});
