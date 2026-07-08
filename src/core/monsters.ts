// Monster catalog — SPEC F05 / Assumption 4: exactly 5 species cycling
// forever in fixed order, tier = Math.floor(index / 5) for renderer tint.

import { monsterMaxHp } from './formulas.js';
import type { MonsterDef } from './types.js';

/** Fixed species cycle order (SPEC Assumption 4). Never reorder. */
export const SPECIES_IDS = ['slime', 'bat', 'ghost', 'golem', 'dragon'] as const;

export type SpeciesId = (typeof SPECIES_IDS)[number];

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
 * tier + 1 (the n-th visit of that species).
 */
export function monsterForIndex(index: number): MonsterDef {
  const i = Math.max(0, Math.floor(index));
  const speciesId = SPECIES_IDS[i % SPECIES_IDS.length] ?? SPECIES_IDS[0];
  const tier = Math.floor(i / SPECIES_IDS.length);
  return {
    index: i,
    speciesId,
    name: `${SPECIES_DISPLAY_NAMES[speciesId]} Lv.${tier + 1}`,
    maxHp: monsterMaxHp(i),
    tier,
  };
}
