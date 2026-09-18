"use strict";
// Wire + IPC-level types shared by the server, main, preload and renderer
// (SPEC F47/F68; SERVER_ARCHITECTURE §2, SERVER_ARCHITECTURE_V3 §2). JSON-safe,
// integers only.
//
// `Companion` is a structural copy of core's (src/core/save.ts) and
// `MonsterType` of core's type union: src/shared must never import src/core,
// and TypeScript's structural typing keeps the pairs interchangeable anyway.
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEFTS_MAX = exports.RECLAIM_WINDOW_MS = exports.MATCH_TTL_MS = exports.PARTY_SIZE_MAX = exports.LEADERBOARD_MAX = exports.LEADERBOARD_DEFAULT = exports.INT_MAX = exports.LEVEL_MAX = exports.LEVEL_MIN = exports.COMPANION_ID_RE = exports.NICK_RE = exports.LEADERBOARD_METRICS = exports.EQUIPMENT_PROTOCOL = void 0;
exports.EQUIPMENT_PROTOCOL = 'equipment-gold-v2';
exports.LEADERBOARD_METRICS = ['level', 'pvpWins', 'bestIndex', 'rebirths'];
// Validation constants (server trust boundary + client setName).
exports.NICK_RE = /^[A-Za-z0-9_-]{1,16}$/;
/** client ids c1, c2…; server-transferred ids s<seed>, reclaimed ids r<seed>. */
exports.COMPANION_ID_RE = /^[a-z0-9]{1,16}$/;
exports.LEVEL_MIN = 1;
/** Representation limit only: companion progression has no gameplay level cap. */
exports.LEVEL_MAX = Number.MAX_SAFE_INTEGER;
/** Postgres integer. */
exports.INT_MAX = 2_147_483_647;
exports.LEADERBOARD_DEFAULT = 10;
exports.LEADERBOARD_MAX = 50;
/** Members of a PvP party (mirrors core's PARTY_SIZE). */
exports.PARTY_SIZE_MAX = 5;
/** How long a pending match stays playable. */
exports.MATCH_TTL_MS = 120_000;
/** 24 h to take a stolen companion back. */
exports.RECLAIM_WINDOW_MS = 86_400_000;
/** Thefts kept per victim row. */
exports.THEFTS_MAX = 8;
