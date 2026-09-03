// T39 — the application handler (SPEC F44, SERVER_ARCHITECTURE §2–§4).
// A trust boundary: every request is rate limited, authenticated and shape-
// validated before it reaches the store, and handle() never throws — a store
// failure becomes 500 `internal`. The clock, the ids and the randomness are
// injected (deps), so tests are deterministic and this file has no wall clock.

import { createHash } from 'node:crypto';
import { companionPower, mulberry32, resolvePvp, ROSTER_CAP, SPECIES_IDS } from '../core/index.js';
import {
  COMPANION_ID_RE,
  INT_MAX,
  LEADERBOARD_DEFAULT,
  LEADERBOARD_MAX,
  LEVEL_MAX,
  LEVEL_MIN,
  MATCH_TTL_MS,
  NICK_RE,
  PARTY_SIZE_MAX,
} from '../shared/api.js';
import type { Companion, LeaderboardRow, PvpOpponent, Snapshot } from '../shared/api.js';
import type { ApiHandler, ApiRequest, ApiResponse } from './http.js';
import { compareScore } from './store.js';
import type { PlayerRow, Store } from './store.js';

export interface AppDeps {
  store: Store;
  /** Milliseconds since the epoch. Injected — tests use a counter. */
  now: () => number;
  randomUUID: () => string;
  randomBytesHex: (bytes: number) => string;
  /** uint32, seeds a PvP match (T40). */
  randomSeed: () => number;
}

/** Requests per key per window (SERVER_ARCHITECTURE §3). */
export const RATE_LIMIT = 60;
export const RATE_WINDOW_MS = 60_000;
/** Shortest gap between two matches of the same caller (SERVER_ARCHITECTURE §3). */
export const PVP_COOLDOWN_MS = 60_000;
/** How many stolen companion ids a player carries until the next upload. */
export const STOLEN_IDS_MAX = 32;
/** The opponent everyone gets while they are alone on the leaderboard. */
export const BOT_NAME = 'Training Dummy';

/** A match the player has previewed but not yet fought (SERVER_ARCHITECTURE_V3 §3). */
export interface PendingMatch {
  matchId: string;
  playerId: string;
  /** null = the bot. */
  opponentId: string | null;
  seed: number;
  /** Exactly the party the player was shown — the battle is fought against it. */
  opponentParty: Companion[];
  createdAt: number;
}

/**
 * Pending matches, keyed by match id (exported so the tests can watch the TTL).
 * ponytail: module memory, because one free instance is the whole deployment —
 * a restart or a second instance loses them and the client just asks again. A
 * `matches` table is the multi-instance upgrade.
 */
export const matches = new Map<string, PendingMatch>();

/** Above this the fixed-window map is swept of expired keys. */
const RATE_KEYS_MAX = 10_000;

const record = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const error = (status: number, code: string, retryAfterSec?: number): ApiResponse => ({
  status,
  body: retryAfterSec === undefined ? { error: code } : { error: code, retryAfterSec },
});

/**
 * Validates a self-reported snapshot against the caps of SERVER_ARCHITECTURE
 * §2. Never throws; null on any violation. Unknown extra fields are dropped
 * (forward compatibility), so the returned object is a fresh, minimal copy.
 */
export function parseSnapshot(raw: unknown): Snapshot | null {
  const s = record(raw);
  if (!s) {
    return null;
  }
  const { name, bestIndex, rebirths, companions } = s;
  if (typeof name !== 'string' || !NICK_RE.test(name)) {
    return null;
  }
  if (!isInt(bestIndex, 0, INT_MAX) || !isInt(rebirths, 0, INT_MAX)) {
    return null;
  }
  if (!Array.isArray(companions) || companions.length > ROSTER_CAP) {
    return null;
  }
  const roster: Companion[] = [];
  const ids = new Set<string>();
  for (const entry of companions) {
    const c = record(entry);
    if (!c) {
      return null;
    }
    const { id, speciesId, bossIndex, level, stars } = c;
    if (typeof id !== 'string' || !COMPANION_ID_RE.test(id) || ids.has(id)) {
      return null;
    }
    if (typeof speciesId !== 'string' || !(SPECIES_IDS as readonly string[]).includes(speciesId)) {
      return null;
    }
    if (
      !isInt(bossIndex, 0, INT_MAX) ||
      !isInt(level, LEVEL_MIN, LEVEL_MAX) ||
      !isInt(stars, 0, INT_MAX)
    ) {
      return null;
    }
    ids.add(id);
    roster.push({ id, speciesId, bossIndex, level, stars });
  }
  // The party is advisory presentation state: bad ids are DROPPED (a v2 client
  // sends none at all), never a reason to reject the whole upload.
  const party = (Array.isArray(s['party']) ? (s['party'] as unknown[]) : [])
    .filter((id): id is string => typeof id === 'string' && COMPANION_ID_RE.test(id) && ids.has(id))
    .filter((id, i, all) => all.indexOf(id) === i)
    .slice(0, PARTY_SIZE_MAX);
  return { name, bestIndex, rebirths, companions: roster, party };
}

/** Numeric part of a companion id — the power tie-breaker (as in core). */
const idNum = (id: string): number => Number(id.replace(/\D/g, '') || 0);

/**
 * The PvP party a snapshot fights with: its stored ids resolved in order, else
 * the PARTY_SIZE_MAX strongest by raw power (ties → lower id).
 * ponytail: a local stand-in for core's `pvpParty`/`autoParty`, which T57 adds;
 * T60 deletes this helper and calls those.
 */
function partyOf(s: Snapshot): Companion[] {
  const picked = s.party
    .map((id) => s.companions.find((c) => c.id === id))
    .filter((c): c is Companion => c !== undefined);
  if (picked.length > 0) {
    return picked;
  }
  return [...s.companions]
    .sort((a, b) => {
      const pa = companionPower(a);
      const pb = companionPower(b);
      return pa === pb ? idNum(a.id) - idNum(b.id) : pb > pa ? 1 : -1;
    })
    .slice(0, PARTY_SIZE_MAX);
}

export function createApp(deps: AppDeps): { handle: ApiHandler } {
  const { store } = deps;
  const windows = new Map<string, { start: number; count: number }>();

  /** Fixed window per token hash (else per ip). Returns retryAfterSec when over. */
  const overLimit = (req: ApiRequest): number | null => {
    const at = deps.now();
    if (windows.size > RATE_KEYS_MAX) {
      for (const [key, w] of windows) {
        if (at - w.start >= RATE_WINDOW_MS) {
          windows.delete(key);
        }
      }
    }
    const key = req.auth === null ? `ip:${req.ip}` : sha256(req.auth);
    const window = windows.get(key);
    if (!window || at - window.start >= RATE_WINDOW_MS) {
      windows.set(key, { start: at, count: 1 });
      return null;
    }
    window.count += 1;
    return window.count > RATE_LIMIT
      ? Math.ceil((RATE_WINDOW_MS - (at - window.start)) / 1000)
      : null;
  };

  const caller = async (req: ApiRequest): Promise<PlayerRow | null> =>
    req.auth === null ? null : store.getByToken(sha256(req.auth));

  const register = async (req: ApiRequest): Promise<ApiResponse> => {
    const nickname = record(req.body)?.nickname;
    if (typeof nickname !== 'string' || !NICK_RE.test(nickname)) {
      return error(400, 'bad_request');
    }
    const token = deps.randomBytesHex(16);
    const playerId = deps.randomUUID();
    await store.createPlayer({ id: playerId, tokenHash: sha256(token), name: nickname });
    return { status: 201, body: { playerId, token } };
  };

  const upload = async (req: ApiRequest): Promise<ApiResponse> => {
    const me = await caller(req);
    if (!me) {
      return error(401, 'unauthorized');
    }
    const snapshot = parseSnapshot(req.body);
    if (!snapshot) {
      return error(400, 'bad_request');
    }
    // The defender learns what PvP took from it here, on whichever upload
    // comes first; stripping stays idempotent because stolenIds is kept.
    const removed = snapshot.companions
      .filter((c) => me.stolenIds.includes(c.id))
      .map((c) => c.id);
    const kept: Snapshot = {
      ...snapshot,
      companions: snapshot.companions.filter((c) => !removed.includes(c.id)),
    };
    await store.putSnapshot(me.id, kept);
    return { status: 200, body: { rank: await store.rank(kept), removed } };
  };

  const row = (s: Snapshot, rank: number): LeaderboardRow => ({
    rank,
    name: s.name,
    bestIndex: s.bestIndex,
    rebirths: s.rebirths,
  });

  const leaderboard = async (req: ApiRequest): Promise<ApiResponse> => {
    let me: LeaderboardRow | null = null;
    if (req.auth !== null) {
      const mine = await caller(req);
      if (!mine) {
        return error(401, 'unauthorized');
      }
      if (mine.snapshot) {
        me = row(mine.snapshot, await store.rank(mine.snapshot));
      }
    }
    const asked = Number.parseInt(req.query.n ?? '', 10);
    const n = Number.isNaN(asked)
      ? LEADERBOARD_DEFAULT
      : Math.min(Math.max(asked, 1), LEADERBOARD_MAX);
    const scores = (await store.top(n))
      .map((r) => r.snapshot)
      .filter((s): s is Snapshot => s !== null);
    // The list is a prefix of the global order, so the first equal score in it
    // is the shared rank of the tie group (n ≤ 50 — the scan is free).
    const top = scores.map((s) => row(s, scores.findIndex((o) => compareScore(o, s) === 0) + 1));
    return { status: 200, body: { top, me } };
  };

  /**
   * T40 — a match against the rank neighbour above or below (SPEC F45,
   * SERVER_ARCHITECTURE §5). The verdict is core's `resolvePvp` seeded with the
   * seed we put on the wire, so the client can replay it; the server only owns
   * the roster bookkeeping. The request body is ignored.
   */
  const pvp = async (req: ApiRequest): Promise<ApiResponse> => {
    const me = await caller(req);
    if (!me) {
      return error(401, 'unauthorized');
    }
    const at = deps.now();
    const elapsed = me.lastPvpAt === null ? PVP_COOLDOWN_MS : at - me.lastPvpAt;
    if (elapsed < PVP_COOLDOWN_MS) {
      return error(429, 'cooldown', Math.ceil((PVP_COOLDOWN_MS - elapsed) / 1000));
    }
    const mine = me.snapshot;
    if (!mine) {
      return error(400, 'no_snapshot');
    }
    // Bot matches burn the cooldown too — it is what bounds the whole endpoint.
    await store.setLastPvpAt(me.id, at);

    const seed = deps.randomSeed() >>> 0;
    const up = await store.neighbor(me.id, mine, 'up');
    const down = await store.neighbor(me.id, mine, 'down');
    const foe = up && down ? (seed & 1 ? down : up) : (up ?? down);
    const theirs = foe?.snapshot ?? null;
    // ponytail: still the v2 wire shape (full roster, no replay) — T60 swaps
    // this endpoint over to the match flow and the PvpOpponent party shape.
    const opponent = {
      name: theirs?.name ?? BOT_NAME,
      bestIndex: theirs?.bestIndex ?? mine.bestIndex,
      rebirths: theirs?.rebirths ?? mine.rebirths,
      companions: theirs?.companions ?? [],
    };
    const verdict = resolvePvp(mine.companions, opponent.companions, mulberry32(seed));
    const win = verdict.attackerWon;
    // The bot never steals and is never stolen from; powers stay off the wire.
    const moved = foe && theirs ? verdict.moved : null;

    let stolen: Companion | null = null;
    if (foe && theirs && moved) {
      const transferred = { ...moved, id: `s${seed}` };
      const winner = win ? { row: me, snap: mine } : { row: foe, snap: theirs };
      const loser = win ? { row: foe, snap: theirs } : { row: me, snap: mine };
      // ponytail: three writes, no transaction — a concurrent match against the
      // same loser could double-steal. BEGIN/COMMIT in PgStore is the upgrade;
      // one free instance plus the per-player cooldown makes it unreachable.
      await store.setStolenIds(
        loser.row.id,
        [...loser.row.stolenIds, moved.id].slice(-STOLEN_IDS_MAX),
      );
      await store.putSnapshot(loser.row.id, {
        ...loser.snap,
        companions: loser.snap.companions.filter((c) => c.id !== moved.id),
      });
      await store.putSnapshot(winner.row.id, {
        ...winner.snap,
        companions: [...winner.snap.companions, transferred],
      });
      stolen = transferred;
    }
    return {
      status: 200,
      body: {
        bot: theirs === null,
        seed,
        win,
        opponent,
        stolen: win ? stolen : null,
        lost: win ? null : moved,
      },
    };
  };

  /**
   * T54 — step 1 of a battle (SPEC F68, SERVER_ARCHITECTURE_V3 §3): the same
   * neighbour pick as `/v1/pvp`, but it only shows the opponent's party and
   * parks the seed under a match id. No cooldown, no store writes.
   */
  const match = async (req: ApiRequest): Promise<ApiResponse> => {
    const me = await caller(req);
    if (!me) {
      return error(401, 'unauthorized');
    }
    const mine = me.snapshot;
    if (!mine) {
      return error(400, 'no_snapshot');
    }
    const at = deps.now();
    for (const [id, pending] of matches) {
      if (at - pending.createdAt > MATCH_TTL_MS) {
        matches.delete(id);
      }
    }
    const seed = deps.randomSeed() >>> 0;
    const up = await store.neighbor(me.id, mine, 'up');
    const down = await store.neighbor(me.id, mine, 'down');
    const foe = up && down ? (seed & 1 ? down : up) : (up ?? down);
    const theirs = foe?.snapshot ?? null;
    const opponent: PvpOpponent = theirs
      ? {
          name: theirs.name,
          bestIndex: theirs.bestIndex,
          rebirths: theirs.rebirths,
          party: partyOf(theirs),
        }
      : { name: BOT_NAME, bestIndex: mine.bestIndex, rebirths: mine.rebirths, party: [] };
    const matchId = deps.randomBytesHex(8);
    matches.set(matchId, {
      matchId,
      playerId: me.id,
      opponentId: foe?.id ?? null,
      seed,
      opponentParty: opponent.party,
      createdAt: at,
    });
    return {
      status: 200,
      body: { matchId, seed, bot: theirs === null, opponent, expiresAt: at + MATCH_TTL_MS },
    };
  };

  const route = async (req: ApiRequest): Promise<ApiResponse> => {
    if (req.method === 'POST' && req.path === '/v1/players') {
      return register(req);
    }
    if (req.method === 'PUT' && req.path === '/v1/snapshot') {
      return upload(req);
    }
    if (req.method === 'GET' && req.path === '/v1/leaderboard') {
      return leaderboard(req);
    }
    if (req.method === 'POST' && req.path === '/v1/pvp/match') {
      return match(req);
    }
    if (req.method === 'POST' && req.path === '/v1/pvp') {
      return pvp(req);
    }
    return error(404, 'not_found');
  };

  return {
    handle: async (req) => {
      try {
        const retryAfterSec = overLimit(req);
        return retryAfterSec === null
          ? await route(req)
          : error(429, 'rate_limited', retryAfterSec);
      } catch {
        return error(500, 'internal');
      }
    },
  };
}
