// Net client + net session (SPEC F48; SERVER_ARCHITECTURE §6). Electron-free:
// `fetch`, the userData directory and randomUUID are injected, so the whole
// module is testable with a fake fetch and a tmp directory. Nothing here ever
// throws — a sleeping dyno, a dead network or a garbage body must never break
// the game, which never waits on any of this.

import type {
  ApiError,
  Companion,
  HeroAppearance,
  IdentityPayload,
  LeaderboardResponse,
  LeaderboardResult,
  MatchResponse,
  MatchResult,
  NetResult,
  OpponentListResult,
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
  LeaderboardMetric,
  MeResponse,
} from '../shared/api.js';
import { isValidName, parsePvpHistory, readIdentity, recordPvpHistory, writeIdentity, type Identity } from './identity.js';
import { isHeroRoll } from '../core/hero.js';
import { SPECIES_IDS } from '../core/monsters.js';
import { COMPANION_ID_RE, INT_MAX, LEADERBOARD_MAX, LEVEL_MAX, NICK_RE, PARTY_SIZE_MAX, THEFTS_MAX } from '../shared/api.js';

/** Every request is abandoned after this long (Render's free tier cold-starts). */
export const NET_TIMEOUT_MS = 5000;

export interface NetClient {
  register(name: string): Promise<NetResult<RegisterResponse>>;
  upload(token: string, snapshot: Snapshot): Promise<NetResult<SnapshotResponse>>;
  leaderboard(token: string | null, n: number, metric?: LeaderboardMetric): Promise<NetResult<LeaderboardResponse>>;
  me?(token: string): Promise<NetResult<MeResponse>>;
  opponents(token: string): Promise<NetResult<OpponentListResult>>;
  match(token: string, opponentId?: string): Promise<NetResult<MatchResponse>>;
  pvp(token: string, body: PvpRequest): Promise<NetResult<PvpResponse>>;
  thefts(token: string): Promise<NetResult<TheftsResponse>>;
  reclaim(token: string, theftId: string): Promise<NetResult<ReclaimResponse>>;
}

/** Structural view of the parts of a save the server ranks. SaveFileV2 is assignable. */
export interface SnapshotSource {
  level?: number;
  bestIndex: number;
  rebirths: number;
  companions: Companion[];
  /** ponytail: optional because src/server/probe.ts snapshots a party-less player. */
  pvpParty?: string[];
  hero?: { equipped: HeroAppearance };
}

export interface NetSession {
  identity(): IdentityPayload;
  pvpHistory(): { wins: number; losses: number };
  setName(name: unknown): IdentityPayload;
  onSave(save: SnapshotSource): void;
  leaderboard(n: number, metric?: LeaderboardMetric): Promise<NetResult<LeaderboardResult>>;
  me(): Promise<NetResult<MeResponse>>;
  sync(): Promise<NetResult<SnapshotResponse>>;
  opponents(): Promise<NetResult<OpponentListResult>>;
  match(opponentId?: string): Promise<NetResult<MatchResult>>;
  pvp(matchId: string, party: string[], skipUpload?: boolean): Promise<NetResult<PvpResult>>;
  thefts(): Promise<NetResult<TheftsResult>>;
  reclaim(theftId: string): Promise<NetResult<ReclaimResult>>;
}

/** The wire snapshot for `save` under `name`. */
export function toSnapshot(name: string, save: SnapshotSource): Snapshot {
  return {
    name,
    ...(save.level === undefined ? {} : { level: save.level }),
    bestIndex: save.bestIndex,
    rebirths: save.rebirths,
    companions: save.companions,
    party: save.pvpParty ?? [],
    ...(save.hero ? { hero: save.hero.equipped } : {}),
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

const object = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : null;
const integer = (v: unknown, min = 0, max = INT_MAX): boolean =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const playerId = (v: unknown): boolean => typeof v === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(v);
const companionId = (v: unknown): boolean => typeof v === 'string' && COMPANION_ID_RE.test(v);

/** All companion-bearing replies cross this boundary before reaching saves or sprites. */
function isCompanion(value: unknown): boolean {
  const c = object(value);
  return !!c && companionId(c['id']) &&
    typeof c['speciesId'] === 'string' && (SPECIES_IDS as readonly string[]).includes(c['speciesId']) &&
    integer(c['bossIndex']) && integer(c['level'], 1, LEVEL_MAX) && integer(c['stars']);
}

function isOpponent(value: unknown): boolean {
  const row = object(value);
  if (!row || (row['playerId'] !== undefined && !playerId(row['playerId'])) ||
    typeof row['name'] !== 'string' || !(NICK_RE.test(row['name']) || row['name'] === 'Training Dummy') ||
    !integer(row['bestIndex']) || !integer(row['rebirths']) ||
    (row['hero'] !== undefined && !isHeroRoll(row['hero']))) return false;
  const party = row['party'];
  return Array.isArray(party) && party.length <= PARTY_SIZE_MAX && party.every(isCompanion) &&
    new Set(party.map((c: Companion) => c.id)).size === party.length;
}

function isOpponentList(value: unknown): boolean {
  const rows = object(value)?.['opponents'];
  return Array.isArray(rows) && rows.length <= LEADERBOARD_MAX && rows.every((entry) => {
    const row = object(entry);
    return !!row && isOpponent(row) && playerId(row['playerId']) &&
      typeof row['name'] === 'string' && NICK_RE.test(row['name']) && isHeroRoll(row['hero']) &&
      integer(row['rank'], 1) && integer(row['wins']) && integer(row['losses']);
  });
}

function isThefts(value: unknown): boolean {
  return Array.isArray(value) && value.length <= THEFTS_MAX && value.every((entry) => {
    const theft = object(entry);
    return !!theft && companionId(theft['id']) && isCompanion(theft['companion']) &&
      companionId(theft['transferredId']) && playerId(theft['thiefId']) &&
      typeof theft['thiefName'] === 'string' && NICK_RE.test(theft['thiefName']) &&
      integer(theft['at'], 0, Number.MAX_SAFE_INTEGER) && integer(theft['reclaimUntil'], 0, Number.MAX_SAFE_INTEGER);
  });
}

function isSnapshotResponse(value: unknown): boolean {
  const row = object(value);
  return !!row && integer(row['rank'], 1) && Array.isArray(row['removed']) &&
    row['removed'].every(companionId) && isThefts(row['thefts']);
}

function isMatchResponse(value: unknown): boolean {
  const row = object(value);
  return !!row && playerId(row['matchId']) && integer(row['seed'], 0, 0xffffffff) &&
    typeof row['bot'] === 'boolean' && isOpponent(row['opponent']) &&
    integer(row['expiresAt'], 0, Number.MAX_SAFE_INTEGER);
}

export function isPvpResponse(value: unknown): boolean {
  const row = object(value);
  return !!row && typeof row['bot'] === 'boolean' && typeof row['win'] === 'boolean' &&
    integer(row['seed'], 0, 0xffffffff) && isOpponent(row['opponent']) &&
    (row['stolen'] === null || isCompanion(row['stolen'])) &&
    (row['lost'] === null || isCompanion(row['lost'])) &&
    (row['record'] === undefined || (object(row['record']) !== null && integer(object(row['record'])?.['wins']) && integer(object(row['record'])?.['losses']))) &&
    Array.isArray(row['blows']) && row['blows'].length <= 1000 && row['blows'].every((entry) => {
      const blow = object(entry);
      return !!blow && (blow['side'] === 'A' || blow['side'] === 'D') &&
        companionId(blow['actorId']) && companionId(blow['targetId']) &&
        typeof blow['damage'] === 'string' && /^\d+$/.test(blow['damage']) && typeof blow['ko'] === 'boolean';
    });
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
    validate?: (value: unknown) => boolean,
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
    if (res.ok && parsed !== undefined) {
      return !validate || validate(parsed) ? { ok: true, value: parsed as T } : { ok: false, error: 'server' };
    }
    const error = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as ApiError;
    if (res.status === 400 && error.error === 'bad_party') return { ok: false, error: 'stale-party', status: 400 };
    if (res.status === 429 && error.error === 'cooldown') {
      return { ok: false, error: 'cooldown', retryAfterSec: error.retryAfterSec };
    }
    return { ok: false, error: 'server', status: res.status };
  }

  return {
    register: (name) => call<RegisterResponse>('POST', '/v1/players', null, { nickname: name }),
    upload: (token, snapshot) => call<SnapshotResponse>('PUT', '/v1/snapshot', token, snapshot, isSnapshotResponse),
    leaderboard: (token, n, metric) => call<LeaderboardResponse>('GET', `/v1/leaderboard?n=${n}${metric ? `&metric=${metric}` : ''}`, token),
    me: (token) => call<MeResponse>('GET', '/v1/me', token, undefined, (value) => {
      const row = object(value);
      const match = object(row?.['lastMatch']);
      const reclaim = object(row?.['lastReclaim']);
      return !!row && row['version'] === 9 && integer(row['wins']) && integer(row['losses']) &&
        Array.isArray(row['revokedIds']) && row['revokedIds'].every(companionId) &&
        (row['lastMatch'] === null || (!!match && playerId(match['matchId']) && isPvpResponse(match['result']))) &&
        (row['lastReclaim'] === null || (!!reclaim && typeof reclaim['theftId'] === 'string' &&
          /^t[\da-f]+$/.test(reclaim['theftId']) && isCompanion(reclaim['companion'])));
    }),
    opponents: (token) => call<OpponentListResult>('GET', '/v1/pvp/opponents', token, undefined, isOpponentList),
    match: async (token, opponentId) => {
      const result = await call<MatchResponse>('POST', '/v1/pvp/match', token, { opponentId }, isMatchResponse);
      if (result.ok && opponentId !== undefined && (result.value.bot || result.value.opponent.playerId !== opponentId)) {
        return { ok: false, error: 'server' };
      }
      return result;
    },
    pvp: (token, body) => call<PvpResponse>('POST', '/v1/pvp', token, body, isPvpResponse),
    thefts: (token) => call<TheftsResponse>('GET', '/v1/thefts', token, undefined, (value) => isThefts(object(value)?.['thefts'])),
    reclaim: (token, theftId) => call<ReclaimResponse>('POST', '/v1/reclaim', token, { theftId }, (value) => isCompanion(object(value)?.['companion'])),
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
  /** Main's coordinator owns all uploads and applies removals before release. */
  managed?: boolean;
}): NetSession {
  const { client, userDataDir, online, randomUUID } = deps;
  let identity: Identity = readIdentity(userDataDir, randomUUID);
  let historyDirty = false;
  /** Last save handed to the session; the source of every upload. */
  let lastSave: SnapshotSource | null = null;
  /** Roster key the server already has; null = nothing uploaded yet. */
  let syncedKey: string | null = null;
  let reRegistered = false;
  let registration: Promise<NetResult<string>> | null = null;
  /** Keep bindings for retries and concurrent callbacks throughout this session. */
  const selectedOpponents = new Map<string, string>();

  /** bestIndex is deliberately absent: kills at the frontier must not spam PUTs. */
  const rosterKey = (save: SnapshotSource): string =>
    JSON.stringify([identity.name, save.rebirths, save.companions, save.pvpParty ?? [], save.hero?.equipped]);

  const payload = (): IdentityPayload => ({ name: identity.name, playerId: identity.playerId, online });

  const store = (next: Identity): void => {
    identity = next;
    writeIdentity(userDataDir, next);
  };

  async function ensureRegistered(): Promise<NetResult<string>> {
    if (identity.token !== null) return { ok: true, value: identity.token };
    registration ??= (async () => {
      const res = await client.register(identity.name);
      if (!res.ok) return res;
      const next = { ...identity, playerId: res.value.playerId, token: res.value.token };
      if (!writeIdentity(userDataDir, next)) return { ok: false as const, error: 'server' as const };
      identity = next;
      return { ok: true as const, value: res.value.token };
    })();
    try { return await registration; } finally { registration = null; }
  }

  /** Registers if needed, then runs `send`; a 401 re-registers and retries ONCE per session. */
  async function withToken<T>(send: (token: string) => Promise<NetResult<T>>): Promise<NetResult<T>> {
    const first = await ensureRegistered();
    if (!first.ok) return first;
    const res = await send(first.value);
    if (res.ok || res.error !== 'unauthorized' || reRegistered || deps.managed) return res;
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
    async me() {
      if (!client.me) return { ok: false, error: 'server' };
      const result = await withToken(token => client.me!(token));
      if (result.ok) {
        identity = { ...identity, pvpHistory: { ...parsePvpHistory(identity.pvpHistory), wins: result.value.wins, losses: result.value.losses } };
        historyDirty = !writeIdentity(userDataDir, identity);
      }
      return result;
    },
    async sync() { return await upload() ?? { ok: false, error: 'offline' }; },
    pvpHistory() {
      const history = parsePvpHistory(identity.pvpHistory);
      return { wins: history.wins, losses: history.losses };
    },
    identity() {
      if (!deps.managed) void uploadIfDirty();
      return payload();
    },
    setName(name) {
      if (isValidName(name)) {
        const next = { ...identity, name };
        if (writeIdentity(userDataDir, next)) identity = next;
      }
      return payload();
    },
    onSave(save) {
      if (historyDirty) historyDirty = !writeIdentity(userDataDir, identity);
      lastSave = save;
      if (!deps.managed) void uploadIfDirty();
    },
    async leaderboard(n, metric) {
      const removed = removedOf(deps.managed ? null : await upload());
      const res = await withToken((token) => client.leaderboard(token, n, metric));
      return res.ok ? { ok: true, value: { ...res.value, removed } } : res;
    },
    async opponents() {
      const uploaded = deps.managed ? null : await uploadIfDirty();
      if (uploaded && !uploaded.ok) return uploaded;
      return withToken((token) => client.opponents(token));
    },
    async match(opponentId) {
      // Upload first when dirty: the opponent picker must see my current party.
      const uploaded = deps.managed ? null : await uploadIfDirty();
      if (uploaded && !uploaded.ok) return uploaded;
      const res = await withToken((token) => client.match(token, opponentId));
      if (res.ok && opponentId !== undefined) {
        if (res.value.bot !== false || res.value.opponent?.playerId !== opponentId) return { ok: false, error: 'server' };
        selectedOpponents.set(res.value.matchId, opponentId);
      }
      return res;
    },
    async pvp(matchId, party, skipUpload = false) {
      const expectedOpponent = selectedOpponents.get(matchId);
      const uploaded = skipUpload ? null : await upload();
      if (uploaded && !uploaded.ok) return uploaded;
      const removed = removedOf(uploaded);
      const res = await withToken((token) => client.pvp(token, { matchId, party }));
      if (res.ok && expectedOpponent !== undefined &&
        (res.value.bot !== false || res.value.opponent?.playerId !== expectedOpponent)) return { ok: false, error: 'server' };
      if (res.ok && res.value?.bot === false && typeof res.value.win === 'boolean') {
        const previous = identity.pvpHistory ?? parsePvpHistory(undefined);
        const next = res.value.record
          ? { ...recordPvpHistory(previous, matchId, res.value.win), ...res.value.record }
          : recordPvpHistory(previous, matchId, res.value.win);
        if (next !== previous) {
          // Synchronous replacement before returning also serializes concurrent
          // callbacks for one match. A failed disk write is reported and retried.
          identity = { ...identity, pvpHistory: next };
          historyDirty = !writeIdentity(userDataDir, identity);
        }
      }
      return res.ok ? { ok: true, value: { ...res.value, removed, ...(historyDirty ? { historySaved: false as const } : {}) } } : res;
    },
    thefts: () => withToken((token) => client.thefts(token)),
    reclaim: (theftId) => withToken((token) => client.reclaim(token, theftId)),
  };
}
