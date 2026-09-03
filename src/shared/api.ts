// Wire + IPC-level types shared by the server, main, preload and renderer
// (SPEC F47/F68; SERVER_ARCHITECTURE §2, SERVER_ARCHITECTURE_V3 §2). JSON-safe,
// integers only.
//
// `Companion` is a structural copy of core's (src/core/save.ts) and
// `MonsterType` of core's type union: src/shared must never import src/core,
// and TypeScript's structural typing keeps the pairs interchangeable anyway.

export interface Companion {
  id: string;
  speciesId: string;
  bossIndex: number;
  level: number;
  stars: number;
}
/** Elemental type (GAME_DESIGN_V3 §2) — re-declared, never imported from core. */
export type MonsterType = 'fire' | 'wind' | 'earth' | 'water' | 'dark';
export interface Snapshot {
  name: string;
  bestIndex: number;
  rebirths: number;
  companions: Companion[];
  /** PvP party: ≤ PARTY_SIZE_MAX ids ⊆ `companions`; bad ids are dropped, missing → []. */
  party: string[];
}
export interface LeaderboardRow { rank: number; name: string; bestIndex: number; rebirths: number }

export interface RegisterResponse { playerId: string; token: string }
/** `removed` = companion ids the server stripped (the caller's stolenIds). */
export interface SnapshotResponse { rank: number; removed: string[]; thefts: Theft[] }
export interface LeaderboardResponse { top: LeaderboardRow[]; me: LeaderboardRow | null }
/** v3: the opponent shows its PvP party (≤ PARTY_SIZE_MAX), not its whole roster. */
export interface PvpOpponent { name: string; bestIndex: number; rebirths: number; party: Companion[] }
/** Step 1 of a battle: the preview the player picks a party against. */
export interface MatchResponse {
  matchId: string;
  seed: number;
  bot: boolean;
  opponent: PvpOpponent;
  /** Server clock, ms: `now + MATCH_TTL_MS`. */
  expiresAt: number;
}
/** Step 2: the match id from step 1 plus my party ids (empty → auto). */
export interface PvpRequest { matchId: string; party: string[] }
/** One blow of the replay; `damage` is a decimal string (bigint on the wire). */
export interface WireBlow { side: 'A' | 'D'; actorId: string; targetId: string; damage: string; ko: boolean }
export interface BattleReplay { opponentName: string; opponentParty: Companion[]; blows: WireBlow[] }
export interface PvpResponse {
  bot: boolean;
  seed: number;
  win: boolean;
  opponent: PvpOpponent;
  /** The deterministic replay of the match (empty for a v2-shaped response). */
  blows: WireBlow[];
  /** set when `win` — already re-id'd by the server; add it to the roster as-is. */
  stolen: Companion | null;
  /** ponytail: v3 never sets this (steals are attacker-only) — kept as the v2 shape the menu still renders. */
  lost: Companion | null;
}
/** What PvP took from me, and until when I may take it back. */
export interface Theft {
  id: string;
  /** The companion as it was in MY roster (original id). */
  companion: Companion;
  /** Its id in the thief's roster. */
  transferredId: string;
  thiefId: string;
  thiefName: string;
  at: number;
  reclaimUntil: number;
}
export interface TheftsResponse { thefts: Theft[] }
export interface ReclaimRequest { theftId: string }
/** Re-id'd by the server; add it to the roster as-is. */
export interface ReclaimResponse { companion: Companion }
export interface ApiError { error: string; retryAfterSec?: number }

// IPC-level shapes (main → renderer results; SERVER_ARCHITECTURE §6).
export type NetError =
  | 'offline'
  | 'unauthorized'
  | 'network'
  | 'server'
  | 'cooldown'
  /** 410 — the match or the reclaim window is over. */
  | 'expired'
  /** 409 — the thief no longer holds the companion. */
  | 'gone';
export type NetResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: NetError; status?: number; retryAfterSec?: number };
export interface IdentityPayload { name: string; playerId: string | null; online: boolean }
export type LeaderboardResult = LeaderboardResponse & { removed: string[] };
export type PvpResult = PvpResponse & { removed: string[] };
export type MatchResult = MatchResponse;
export type TheftsResult = TheftsResponse;
export type ReclaimResult = ReclaimResponse;

// Validation constants (server trust boundary + client setName).
export const NICK_RE = /^[A-Za-z0-9_-]{1,16}$/;
/** client ids c1, c2…; server-transferred ids s<seed>, reclaimed ids r<seed>. */
export const COMPANION_ID_RE = /^[a-z0-9]{1,16}$/;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 10;
/** Postgres integer. */
export const INT_MAX = 2_147_483_647;
export const LEADERBOARD_DEFAULT = 10;
export const LEADERBOARD_MAX = 50;
/** Members of a PvP party (mirrors core's PARTY_SIZE). */
export const PARTY_SIZE_MAX = 5;
/** How long a pending match stays playable. */
export const MATCH_TTL_MS = 120_000;
/** 24 h to take a stolen companion back. */
export const RECLAIM_WINDOW_MS = 86_400_000;
/** Thefts kept per victim row. */
export const THEFTS_MAX = 8;
