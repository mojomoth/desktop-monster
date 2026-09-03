// Core domain types — pure TypeScript, zero imports of electron/DOM/node.
// Shapes follow GAME_ARCHITECTURE §2 exactly.

import type { Companion } from './save.js';

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
