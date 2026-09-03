// Net client + net session (SPEC F48; SERVER_ARCHITECTURE §6). Electron-free:
// `fetch`, the userData directory and randomUUID are injected, so the whole
// module is testable with a fake fetch and a tmp directory. Nothing here ever
// throws — a sleeping dyno, a dead network or a garbage body must never break
// the game, which never waits on any of this.

import type {
  ApiError,
  Companion,
  IdentityPayload,
  LeaderboardResponse,
  LeaderboardResult,
  MatchResponse,
  MatchResult,
  NetResult,
  PvpRequest,
  PvpResponse,
  PvpResult,
  ReclaimResponse,
  ReclaimResult,
  RegisterResponse,
  Snapshot,
  SnapshotResponse,
  TheftsResponse,
  TheftsResult,
} from '../shared/api.js';
import { isValidName, readIdentity, writeIdentity, type Identity } from './identity.js';

/** Every request is abandoned after this long (Render's free tier cold-starts). */
export const NET_TIMEOUT_MS = 5000;

export interface NetClient {
  register(name: string): Promise<NetResult<RegisterResponse>>;
  upload(token: string, snapshot: Snapshot): Promise<NetResult<SnapshotResponse>>;
  leaderboard(token: string | null, n: number): Promise<NetResult<LeaderboardResponse>>;
  match(token: string): Promise<NetResult<MatchResponse>>;
  pvp(token: string, body: PvpRequest): Promise<NetResult<PvpResponse>>;
  thefts(token: string): Promise<NetResult<TheftsResponse>>;
  reclaim(token: string, theftId: string): Promise<NetResult<ReclaimResponse>>;
}

/** Structural view of the parts of a save the server ranks. SaveFileV2 is assignable. */
export interface SnapshotSource {
  bestIndex: number;
  rebirths: number;
  companions: Companion[];
  /** ponytail: optional because src/server/probe.ts snapshots a party-less player. */
  pvpParty?: string[];
}

export interface NetSession {
  identity(): IdentityPayload;
  setName(name: unknown): IdentityPayload;
  onSave(save: SnapshotSource): void;
  leaderboard(n: number): Promise<NetResult<LeaderboardResult>>;
  match(): Promise<NetResult<MatchResult>>;
  pvp(matchId: string, party: string[]): Promise<NetResult<PvpResult>>;
  thefts(): Promise<NetResult<TheftsResult>>;
  reclaim(theftId: string): Promise<NetResult<ReclaimResult>>;
}

/** The wire snapshot for `save` under `name`. */
export function toSnapshot(name: string, save: SnapshotSource): Snapshot {
  return {
    name,
    bestIndex: save.bestIndex,
    rebirths: save.rebirths,
    companions: save.companions,
    party: save.pvpParty ?? [],
  };
}

/** JSON body of `res`, or undefined when it is missing/unparsable (never throws). */
async function readJson(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * HTTP client for `/v1` (SERVER_ARCHITECTURE §3). `baseUrl === ''` means
 * offline: every method resolves `{ ok: false, error: 'offline' }` and fetch is
 * never called.
 */
export function createNetClient(o: {
  baseUrl: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): NetClient {
  const { baseUrl, fetchFn = fetch, timeoutMs = NET_TIMEOUT_MS } = o;

  async function call<T>(
    method: string,
    path: string,
    token: string | null,
    body?: unknown,
  ): Promise<NetResult<T>> {
    if (baseUrl === '') return { ok: false, error: 'offline' };
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers: token === null
          ? { 'content-type': 'application/json' }
          : { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { ok: false, error: 'network' };
    }
    if (res.status === 401) return { ok: false, error: 'unauthorized' };
    // v3: a dead match / a closed reclaim window, and a companion the thief no
    // longer holds — both are normal outcomes the menu explains, not failures.
    if (res.status === 410) return { ok: false, error: 'expired', status: 410 };
    if (res.status === 409) return { ok: false, error: 'gone', status: 409 };
    const parsed = await readJson(res);
    if (res.ok && parsed !== undefined) return { ok: true, value: parsed as T };
    const error = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as ApiError;
    if (res.status === 429 && error.error === 'cooldown') {
      return { ok: false, error: 'cooldown', retryAfterSec: error.retryAfterSec };
    }
    return { ok: false, error: 'server', status: res.status };
  }

  return {
    register: (name) => call<RegisterResponse>('POST', '/v1/players', null, { nickname: name }),
    upload: (token, snapshot) => call<SnapshotResponse>('PUT', '/v1/snapshot', token, snapshot),
    leaderboard: (token, n) => call<LeaderboardResponse>('GET', `/v1/leaderboard?n=${n}`, token),
    match: (token) => call<MatchResponse>('POST', '/v1/pvp/match', token, {}),
    pvp: (token, body) => call<PvpResponse>('POST', '/v1/pvp', token, body),
    thefts: (token) => call<TheftsResponse>('GET', '/v1/thefts', token),
    reclaim: (token, theftId) => call<ReclaimResponse>('POST', '/v1/reclaim', token, { theftId }),
  };
}

/**
 * Owns identity.json, lazy registration, the dirty roster key, the sync moments
 * and the once-per-session re-register after a 401 (SERVER_ARCHITECTURE §6).
 */
export function createNetSession(deps: {
  client: NetClient;
  userDataDir: string;
  online: boolean;
  randomUUID: () => string;
}): NetSession {
  const { client, userDataDir, online, randomUUID } = deps;
  let identity: Identity = readIdentity(userDataDir, randomUUID);
  /** Last save handed to the session; the source of every upload. */
  let lastSave: SnapshotSource | null = null;
  /** Roster key the server already has; null = nothing uploaded yet. */
  let syncedKey: string | null = null;
  let reRegistered = false;

  /** bestIndex is deliberately absent: kills at the frontier must not spam PUTs. */
  const rosterKey = (save: SnapshotSource): string =>
    JSON.stringify([identity.name, save.rebirths, save.companions, save.pvpParty ?? []]);

  const payload = (): IdentityPayload => ({ name: identity.name, playerId: identity.playerId, online });

  const store = (next: Identity): void => {
    identity = next;
    writeIdentity(userDataDir, next);
  };

  async function ensureRegistered(): Promise<NetResult<string>> {
    if (identity.token !== null) return { ok: true, value: identity.token };
    const res = await client.register(identity.name);
    if (!res.ok) return res;
    store({ ...identity, playerId: res.value.playerId, token: res.value.token });
    return { ok: true, value: res.value.token };
  }

  /** Registers if needed, then runs `send`; a 401 re-registers and retries ONCE per session. */
  async function withToken<T>(send: (token: string) => Promise<NetResult<T>>): Promise<NetResult<T>> {
    const first = await ensureRegistered();
    if (!first.ok) return first;
    const res = await send(first.value);
    if (res.ok || res.error !== 'unauthorized' || reRegistered) return res;
    reRegistered = true;
    store({ ...identity, playerId: null, token: null });
    const second = await ensureRegistered();
    if (!second.ok) return second;
    return send(second.value);
  }

  async function upload(): Promise<NetResult<SnapshotResponse> | null> {
    if (lastSave === null) return null;
    const key = rosterKey(lastSave);
    const snapshot = toSnapshot(identity.name, lastSave);
    const res = await withToken((token) => client.upload(token, snapshot));
    if (res.ok) syncedKey = key;
    return res;
  }

  const uploadIfDirty = async (): Promise<NetResult<SnapshotResponse> | null> =>
    lastSave !== null && rosterKey(lastSave) !== syncedKey ? upload() : null;

  /** Companion ids the server stripped on the pre-flight upload, for the menu to drop. */
  const removedOf = (res: NetResult<SnapshotResponse> | null): string[] =>
    res !== null && res.ok ? res.value.removed : [];

  return {
    identity() {
      void uploadIfDirty();
      return payload();
    },
    setName(name) {
      if (isValidName(name)) store({ ...identity, name });
      return payload();
    },
    onSave(save) {
      lastSave = save;
      void uploadIfDirty();
    },
    async leaderboard(n) {
      const removed = removedOf(await uploadIfDirty());
      const res = await withToken((token) => client.leaderboard(token, n));
      return res.ok ? { ok: true, value: { ...res.value, removed } } : res;
    },
    async match() {
      // Upload first when dirty: the opponent picker must see my current party.
      await uploadIfDirty();
      return withToken((token) => client.match(token));
    },
    async pvp(matchId, party) {
      const removed = removedOf(await upload());
      const res = await withToken((token) => client.pvp(token, { matchId, party }));
      return res.ok ? { ok: true, value: { ...res.value, removed } } : res;
    },
    thefts: () => withToken((token) => client.thefts(token)),
    reclaim: (theftId) => withToken((token) => client.reclaim(token, theftId)),
  };
}
