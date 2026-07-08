// Progression formulas — FROZEN per SPEC Assumption 3 / GAME_ARCHITECTURE §2.
// Exact, integer, unit-tested. Do not tweak the curves.

/** +1 damage per hero level (visible stat). */
export const damageForLevel = (level: number): number => level;

/** Crit chance (rng-injected at the engine layer). */
export const CRIT_CHANCE = 0.1;

/** Crit damage multiplier. */
export const CRIT_MULT = 2;

/** Monster max HP by 0-based global index: 10, 11, 13 … 40 @10 … 163 @20. */
export const monsterMaxHp = (index: number): number =>
  Math.floor(10 * Math.pow(1.15, index));

/** XP granted for killing the monster at `index`. */
export const xpReward = (index: number): number => 5 + 3 * index;

/** XP needed to advance FROM `level` to the next: 20, 28, 39, 54 … */
export const xpToNext = (level: number): number =>
  Math.floor(20 * Math.pow(1.4, level - 1));
