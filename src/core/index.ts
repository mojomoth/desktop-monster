// Core barrel — pure TypeScript, zero imports of electron/DOM/node.

export const CORE_VERSION = '0.1.0';

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

export { monsterForIndex, SPECIES_IDS } from './monsters.js';
export type { SpeciesId } from './monsters.js';
