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
/** Fixed catalog appearance + rolled buff magnitude; catalog owns type/effect. */
export interface HeroAppearance { formId: string; buffPercent: number; stacks?: number }
/** v0.10 battle inputs; these are immutable in a committed replay. */
export interface WireEquipmentItem {
  id: string; templateId: string; enhancement: string; roll: number; seed: number; attempts: string;
}
export interface WireLoadout { weapon: WireEquipmentItem | null; accessories: WireEquipmentItem[] }
export interface HeroCombatSnapshot {
  hero: HeroAppearance; level: number; souls: number; reincarnations: number; trainingLevel: number; loadout: WireLoadout;
}
export interface WireFighter {
  id: string; kind: 'hero' | 'companion'; formId?: string; speciesId?: string;
  hp: string; attack: string; type?: MonsterType;
}
export const EQUIPMENT_PROTOCOL = 'equipment-gold-v2' as const;
export type PvpMode = 'gold-v1' | typeof EQUIPMENT_PROTOCOL;
export interface Snapshot {
  name: string;
  combat?: HeroCombatSnapshot;
  protocol?: typeof EQUIPMENT_PROTOCOL;
  /** v0.9 current hero level; absent on older clients. */
  level?: number;
  bestIndex: number;
  rebirths: number;
  companions: Companion[];
  /** PvP party: ≤ PARTY_SIZE_MAX ids ⊆ `companions`; bad ids are dropped, missing → []. */
  party: string[];
  /** Absent on legacy uploads; displayed as the novice. */
  hero?: HeroAppearance;
  /** v0.9.1 wallet update; successful uploads consume this CAS revision. */
  gold?: { revision: number; coins: string | number };
}
export interface PvpGoldState { revision: number; net: string; balance: string | number }
export type GoldProtection = 'transfer' | 'protected' | 'daily-limit' | 'pair-protection' | 'capacity' | 'bot';
export interface PvpGoldTransfer { amount: string | number; delta: string | number; reason: GoldProtection }
export const LEADERBOARD_METRICS = ['level', 'pvpWins', 'bestIndex', 'rebirths'] as const;
export type LeaderboardMetric = typeof LEADERBOARD_METRICS[number];
export interface LeaderboardRow {
  rank: number; name: string; bestIndex: number; rebirths: number;
  /** Additive metric response fields; legacy requests retain their old shape. */
  level?: number | null; wins?: number; losses?: number;
}
export interface OfficialPvpRecord { wins: number; losses: number }
export interface LastMatch { matchId: string; result: PvpResponse }
export interface LastReclaim { theftId: string; companion: Companion }
export interface MeResponse extends OfficialPvpRecord {
  version: 9;
  /** Permanent revoked ownership IDs, including records older than the theft inbox. */
  revokedIds: string[];
  lastMatch: LastMatch | null;
  lastReclaim: LastReclaim | null;
  pvpMode?: PvpMode;
  gold?: PvpGoldState;
}

export interface RegisterResponse { playerId: string; token: string }
/** `removed` = companion ids the server stripped (the caller's stolenIds). */
export interface SnapshotResponse { rank: number; removed: string[]; thefts: Theft[]; gold?: PvpGoldState }
export interface LeaderboardResponse { top: LeaderboardRow[]; me: LeaderboardRow | null; metric?: LeaderboardMetric }
/** v3: the opponent shows its PvP party (≤ PARTY_SIZE_MAX), not its whole roster. */
export interface PvpOpponent {
  /** Real player identity; absent on legacy responses and bots. */
  playerId?: string;
  name: string; bestIndex: number; rebirths: number; party: Companion[]; hero?: HeroAppearance; combat?: HeroCombatSnapshot;
}
export interface OpponentSummary extends PvpOpponent {
  playerId: string;
  rank: number;
  hero: HeroAppearance;
  wins: number;
  losses: number;
}
export interface OpponentListResult { opponents: OpponentSummary[] }
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
export interface PvpRequest { matchId: string; party: string[]; mode?: PvpMode }
/** One blow of the replay; `damage` is a decimal string (bigint on the wire). */
export interface WireBlow { side: 'A' | 'D'; actorId: string; targetId: string; damage: string; ko: boolean; crit?: boolean; actorKind?: 'hero' | 'companion'; targetKind?: 'hero' | 'companion' }
export interface BattleReplay { opponentName: string; opponentParty: Companion[]; opponentHero?: HeroAppearance; opponentCombat?: HeroCombatSnapshot; ownFighters?: WireFighter[]; opponentFighters?: WireFighter[]; blows: WireBlow[] }
/** Viewer-normalized A=own party. Financial settlement is independent of playback. */
export interface PvpPresentation {
  battleId: string;
  role: 'attack' | 'defense';
  ownParty: Companion[];
  ownHero?: HeroAppearance;
  ownCombat?: HeroCombatSnapshot;
  replay: BattleReplay;
  won: boolean;
  goldDelta: string | number;
}
export interface DefenseEvent { seq: number; at: number; presentation: PvpPresentation }
export interface DefenseEventsResponse { events: DefenseEvent[]; latestSeq: number }
export interface PvpResponse {
  matchId?: string;
  /** Absolute server record; bot bouts do not change it. */
  record?: OfficialPvpRecord;
  bot: boolean;
  seed: number;
  win: boolean;
  opponent: PvpOpponent;
  /** The deterministic replay of the match (empty for a v2-shaped response). */
  blows: WireBlow[];
  ownFighters?: WireFighter[];
  opponentFighters?: WireFighter[];
  /** set when `win` — already re-id'd by the server; add it to the roster as-is. */
  stolen: Companion | null;
  /** ponytail: v3 never sets this (steals are attacker-only) — kept as the v2 shape the menu still renders. */
  lost: Companion | null;
  gold?: PvpGoldTransfer;
  ownParty?: Companion[];
  ownHero?: HeroAppearance;
  ownCombat?: HeroCombatSnapshot;
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
  | 'busy'
  | 'storage'
  | 'sync-required'
  | 'stale-party'
  | 'offline'
  | 'unauthorized'
  | 'network'
  | 'server'
  | 'cooldown'
  | 'gold-conflict'
  | 'opponent-busy'
  /** 410 — the match or the reclaim window is over. */
  | 'expired'
  /** 409 — the thief no longer holds the companion. */
  | 'gone';
export type NetResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: NetError; status?: number; retryAfterSec?: number };
export interface IdentityPayload { name: string; playerId: string | null; online: boolean }
export type LeaderboardResult = LeaderboardResponse & { removed: string[] };
export type PvpResult = PvpResponse & { removed: string[]; historySaved?: false };
export type MatchResult = MatchResponse;
export type TheftsResult = TheftsResponse;
export type ReclaimResult = ReclaimResponse;

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
