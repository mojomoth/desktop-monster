// Wire + IPC-level types shared by the server, main, preload and renderer
// (SPEC F47; SERVER_ARCHITECTURE §2). JSON-safe, integers only.
//
// `Companion` is a structural copy of core's (src/core/save.ts): src/shared
// must never import src/core, and TypeScript's structural typing keeps the two
// interchangeable anyway.

export interface Companion {
  id: string;
  speciesId: string;
  bossIndex: number;
  level: number;
  stars: number;
}
export interface Snapshot {
  name: string;
  bestIndex: number;
  rebirths: number;
  companions: Companion[];
}
export interface LeaderboardRow { rank: number; name: string; bestIndex: number; rebirths: number }

export interface RegisterResponse { playerId: string; token: string }
/** `removed` = companion ids the server stripped (the caller's stolenIds). */
export interface SnapshotResponse { rank: number; removed: string[] }
export interface LeaderboardResponse { top: LeaderboardRow[]; me: LeaderboardRow | null }
export interface PvpOpponent { name: string; bestIndex: number; rebirths: number; companions: Companion[] }
export interface PvpResponse {
  bot: boolean;
  seed: number;
  win: boolean;
  opponent: PvpOpponent;
  /** set when `win` — already re-id'd by the server; add it to the roster as-is. */
  stolen: Companion | null;
  /** set when `!win` — remove by id. */
  lost: Companion | null;
}
export interface ApiError { error: string; retryAfterSec?: number }

// IPC-level shapes (main → renderer results; SERVER_ARCHITECTURE §6).
export type NetError = 'offline' | 'unauthorized' | 'network' | 'server' | 'cooldown';
export type NetResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: NetError; status?: number; retryAfterSec?: number };
export interface IdentityPayload { name: string; playerId: string | null; online: boolean }
export type LeaderboardResult = LeaderboardResponse & { removed: string[] };
export type PvpResult = PvpResponse & { removed: string[] };

// Validation constants (server trust boundary + client setName).
export const NICK_RE = /^[A-Za-z0-9_-]{1,16}$/;
/** client ids c1, c2…; server-transferred ids s<seed>. */
export const COMPANION_ID_RE = /^[a-z0-9]{1,16}$/;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 10;
/** Postgres integer. */
export const INT_MAX = 2_147_483_647;
export const LEADERBOARD_DEFAULT = 10;
export const LEADERBOARD_MAX = 50;
