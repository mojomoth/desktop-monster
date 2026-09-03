// Core barrel — pure TypeScript, zero imports of electron/DOM/node.

export const CORE_VERSION = '0.1.0';

export { bigField, format, ratio, suffix } from './bignum.js';

export type {
  GameEvent,
  GameState,
  InputSource,
  ItemDef,
  ItemDrop,
  MonsterDef,
} from './types.js';

export {
  CRIT_CHANCE,
  CRIT_MULT,
  damageForLevel,
  monsterMaxHp,
  xpReward,
  xpToNext,
} from './formulas.js';

export * from './collection.js';

export * from './fever.js';

export { createEngine } from './engine.js';
export type { Engine } from './engine.js';

export {
  createHeroAnim,
  createMonsterAnim,
  HERO_ATTACK_MS,
  heroInput,
  MONSTER_DYING_MS,
  MONSTER_HIT_MS,
  MONSTER_SPAWNING_MS,
  monsterHit,
  monsterKilled,
  tickHero,
  tickMonster,
} from './fsm.js';
export type {
  HeroAnim,
  HeroAnimState,
  MonsterAnim,
  MonsterAnimState,
} from './fsm.js';

export { createFallbackGate, SimulatedInputDriver } from './input.js';
export type {
  FallbackGate,
  FallbackGateDeps,
  InputDriver,
  InputEvent,
  InputListener,
  InputMode,
} from './input.js';

export { DEFAULT_SAVE, parseSave, serializeSave, upgradeSave } from './save.js';
export type { Companion, SaveFile, SaveFileV1, SaveFileV2 } from './save.js';

export { BOSS_EVERY, isBoss, monsterForIndex, SPECIES_IDS } from './monsters.js';
export type { SpeciesId } from './monsters.js';

export { mulberry32 } from './rng.js';
export type { Rng } from './rng.js';

export {
  COIN_ITEM,
  coinsForIndex,
  rollLoot,
  TRINKET_CHANCE,
  TRINKET_TABLE,
} from './loot.js';
export type { WeightedTrinket } from './loot.js';
