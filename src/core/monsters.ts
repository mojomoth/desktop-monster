// Monster catalog — SPEC F05 / Assumption 4: exactly 5 species cycling
// forever in fixed order, tier = Math.floor(index / 5) for renderer tint.

import { monsterMaxHp } from './formulas.js';
import type { MonsterType } from './types-chart.js';
import type { MonsterDef } from './types.js';

/** Fixed species cycle order (SPEC Assumption 4). Never reorder. */
export const SPECIES_IDS = ['slime', 'bat', 'ghost', 'golem', 'dragon'] as const;

export type SpeciesId = (typeof SPECIES_IDS)[number];

/** Boss cadence (SPEC F31): every 8th monster — index 7, 15, 23 … */
export const BOSS_EVERY = 8;

/** True for the boss slots. 8 is not a multiple of 5, so bosses cycle species. */
export const isBoss = (index: number): boolean =>
  index >= 0 && index % BOSS_EVERY === BOSS_EVERY - 1;

/** Boss rewards: 5x hp (bigint, F30), 5x xp and 5x coins (applied by the engine). */
export const BOSS_HP_MULT = 5n;
export const BOSS_XP_MULT = 5;
export const BOSS_COIN_MULT = 5;

/** Elemental type per species (GAME_DESIGN_V3 §1) — visible in HUD/menu badges. */
export const SPECIES_TYPE: Record<SpeciesId, MonsterType> = {
  slime: 'water',
  bat: 'wind',
  ghost: 'dark',
  golem: 'earth',
  dragon: 'fire',
};

/** Draw size per species — hidden: it only drives sprite scale and z-order. */
export const SPECIES_SIZE: Record<SpeciesId, 1 | 2 | 3> = {
  slime: 1,
  bat: 1,
  ghost: 2,
  golem: 3,
  dragon: 3,
};

/** Type of any runtime species id; unknown → slime's 'water'. Never throws. */
export function typeOf(speciesId: string): MonsterType {
  return SPECIES_TYPE[speciesId as SpeciesId] ?? 'water';
}

/** Size of any runtime species id; unknown → 1. Never throws. */
export function sizeOf(speciesId: string): 1 | 2 | 3 {
  return SPECIES_SIZE[speciesId as SpeciesId] ?? 1;
}

const SPECIES_DISPLAY_NAMES: Record<SpeciesId, string> = {
  slime: 'Slime',
  bat: 'Bat',
  ghost: 'Ghost',
  golem: 'Golem',
  dragon: 'Dragon',
};

/**
 * The monster at 0-based global index `i`: species cycles in SPECIES_IDS
 * order, tier increments every SPECIES_IDS.length monsters, maxHp comes from
 * monsterMaxHp(i). Display name is "Slime Lv.3" style, where the Lv number is
 * tier + 1 (the n-th visit of that species). Every 8th monster is a boss:
 * 5x maxHp and a " BOSS" name suffix.
 */
export function monsterForIndex(index: number): MonsterDef {
  const i = Math.max(0, Math.floor(index));
  const speciesId = SPECIES_IDS[i % SPECIES_IDS.length] ?? SPECIES_IDS[0];
  const tier = Math.floor(i / SPECIES_IDS.length);
  const boss = isBoss(i);
  return {
    index: i,
    speciesId,
    name: `${SPECIES_DISPLAY_NAMES[speciesId]} Lv.${tier + 1}${boss ? ' BOSS' : ''}`,
    maxHp: monsterMaxHp(i) * (boss ? BOSS_HP_MULT : 1n),
    tier,
    boss,
    type: SPECIES_TYPE[speciesId],
  };
}
