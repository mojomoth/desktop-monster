// Wire + IPC-level types shared by the server, main, preload and renderer
// (SPEC F47/F68; SERVER_ARCHITECTURE §2, SERVER_ARCHITECTURE_V3 §2). JSON-safe,
// integers only.
//
// `Companion` is a structural copy of core's (src/core/save.ts) and
// `MonsterType` of core's type union: src/shared must never import src/core,
// and TypeScript's structural typing keeps the pairs interchangeable anyway.
// Validation constants (server trust boundary + client setName).
export const NICK_RE = /^[A-Za-z0-9_-]{1,16}$/;
/** client ids c1, c2…; server-transferred ids s<seed>, reclaimed ids r<seed>. */
export const COMPANION_ID_RE = /^[a-z0-9]{1,16}$/;
export const LEVEL_MIN = 1;
/** Representation limit only: companion progression has no gameplay level cap. */
export const LEVEL_MAX = Number.MAX_SAFE_INTEGER;
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
