// Core domain types — pure TypeScript, zero imports of electron/DOM/node.
// Shapes follow GAME_ARCHITECTURE §2 exactly.

import type { Companion } from './save.js';
import type { Effectiveness, MonsterType } from './types-chart.js';

export type InputSource = 'keyboard' | 'mouse';

export interface MonsterDef {
  /** 0-based global monster number (drives scaling). */
  index: number;
  /** 'slime' | 'bat' | 'ghost' | 'golem' | 'dragon' */
  speciesId: string;
  /** "Slime Lv.3" style display name. */
  name: string;
  maxHp: bigint;
  /** Math.floor(index / species count) → renderer tint. */
  tier: number;
  /** Every 8th monster (index 7, 15, 23 …) — 5x hp/xp/coins. */
  boss: boolean;
  /** Elemental type of the species (bosses keep it) — SPECIES_TYPE. */
  type: MonsterType;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: 'coin' | 'trinket';
}

export interface ItemDrop {
  item: ItemDef;
  amount: number;
}

export interface GameState {
  /** Hero level, starts 1. */
  level: number;
  /** XP into the current level. */
  xp: number;
  killCount: number;
  coins: number;
  /** Trinket id → count. */
  items: Record<string, number>;
  monster: MonsterDef;
  monsterHp: bigint;
  /** Captured bosses (SaveFileV2). */
  companions: Companion[];
  /** Manually picked PvP-only party: companion ids (GAME_DESIGN_V3 §3). */
  pvpParty: string[];
  nextCompanionId: number;
  souls: number;
  rebirths: number;
  /** Deepest monsterIndex ever reached. */
  bestIndex: number;
  /** Fever view (SPEC F34) — derived from the engine clock, never persisted. */
  fever: { active: boolean; remainingMs: number };
}

export type GameEvent =
  | { type: 'attack'; damage: bigint; crit: boolean; source: InputSource }
  | {
      type: 'companionAttack';
      companionId: string;
      speciesId: string;
      damage: bigint;
      effectiveness: Effectiveness;
    }
  | { type: 'monsterHit'; hpAfter: bigint; maxHp: bigint }
  | { type: 'monsterKilled'; monster: MonsterDef; xpGained: number }
  | { type: 'itemDropped'; drops: ItemDrop[] }
  | { type: 'bossCaptured'; companion: Companion }
  | { type: 'levelUp'; newLevel: number }
  | { type: 'feverStart' }
  | { type: 'feverEnd' }
  | { type: 'monsterSpawned'; monster: MonsterDef }
  | { type: 'rebirth'; souls: number }
  | { type: 'pvpResolved'; won: boolean; stolen: Companion | null; lostId: string | null };

/**
 * One blow of a PvP replay; `damage` is a decimal string (bigint on the wire).
 * ponytail: a structural copy of src/shared/api.ts — core imports nothing but
 * core, and the two shapes are checked against each other by the server tests.
 */
export interface WireBlow {
  side: 'A' | 'D';
  actorId: string;
  targetId: string;
  damage: string;
  ko: boolean;
}

export interface BattleReplay {
  opponentName: string;
  opponentParty: Companion[];
  blows: WireBlow[];
}

/**
 * The PvP verdict handed to `applyCollection` (CollectionAction member). Lives
 * here so `replay` can name BattleReplay: the engine IGNORES it — it only
 * rides along to the renderer, which plays it (F63/F66).
 */
export interface PvpResultAction {
  type: 'pvpResult';
  won: boolean;
  stolen: Companion | null;
  lostId: string | null;
  replay?: BattleReplay;
}
