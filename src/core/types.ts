// Core domain types — pure TypeScript, zero imports of electron/DOM/node.
// Shapes follow GAME_ARCHITECTURE §2 exactly.

export type InputSource = 'keyboard' | 'mouse';

export interface MonsterDef {
  /** 0-based global monster number (drives scaling). */
  index: number;
  /** 'slime' | 'bat' | 'ghost' | 'golem' | 'dragon' */
  speciesId: string;
  /** "Slime Lv.3" style display name. */
  name: string;
  maxHp: number;
  /** Math.floor(index / species count) → renderer tint. */
  tier: number;
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
  monsterHp: number;
}

export type GameEvent =
  | { type: 'attack'; damage: number; crit: boolean; source: InputSource }
  | { type: 'monsterHit'; hpAfter: number; maxHp: number }
  | { type: 'monsterKilled'; monster: MonsterDef; xpGained: number }
  | { type: 'itemDropped'; drops: ItemDrop[] }
  | { type: 'levelUp'; newLevel: number }
  | { type: 'monsterSpawned'; monster: MonsterDef };
