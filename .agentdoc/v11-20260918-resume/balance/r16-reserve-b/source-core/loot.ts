// Loot tables — SPEC F09 / Assumptions 3, 6, 15.
// Every kill drops coins 1 + floor(index/3); 25% chance of exactly one
// weighted trinket. Randomness comes ONLY from the injected Rng.

import type { Rng } from './rng.js';
import type { ItemDef, ItemDrop } from './types.js';

/** The always-dropped currency item. */
export const COIN_ITEM: ItemDef = { id: 'coin', name: 'Coin', kind: 'coin' };

/** Chance that a kill also drops one trinket (SPEC Assumption 3). */
export const TRINKET_CHANCE = 0.25;

export interface WeightedTrinket {
  readonly item: ItemDef;
  readonly weight: number;
}

/** Weighted trinket table (SPEC F09). Never reorder — weights are frozen. */
export const TRINKET_TABLE: readonly WeightedTrinket[] = [
  { item: { id: 'sword_shard', name: 'Sword Shard', kind: 'trinket' }, weight: 5 },
  { item: { id: 'slime_gel', name: 'Slime Gel', kind: 'trinket' }, weight: 4 },
  { item: { id: 'bone', name: 'Bone', kind: 'trinket' }, weight: 3 },
  { item: { id: 'gem', name: 'Gem', kind: 'trinket' }, weight: 2 },
  { item: { id: 'crown', name: 'Crown', kind: 'trinket' }, weight: 1 },
];

const TOTAL_WEIGHT = TRINKET_TABLE.reduce((sum, t) => sum + t.weight, 0);

/** Coins dropped by the monster at `index`: 1 + floor(index/3), clamped total. */
export function coinsForIndex(index: number): number {
  return 1 + Math.floor(Math.max(0, Math.floor(index)) / 3);
}

function pickWeightedTrinket(rng: Rng): ItemDef {
  let r = rng.next() * TOTAL_WEIGHT;
  for (const entry of TRINKET_TABLE) {
    r -= entry.weight;
    if (r < 0) {
      return entry.item;
    }
  }
  // Unreachable while rng.next() < 1; keeps the function total anyway.
  return COIN_ITEM;
}

/**
 * Roll the drops for killing the monster at 0-based global `monsterIndex`:
 * always exactly one coin drop of amount 1 + floor(index/3) (first element),
 * plus a TRINKET_CHANCE chance of exactly one weighted trinket (amount 1).
 * Consumes 1 rng draw normally, 2 when a trinket drops.
 */
export function rollLoot(rng: Rng, monsterIndex: number): ItemDrop[] {
  const drops: ItemDrop[] = [{ item: COIN_ITEM, amount: coinsForIndex(monsterIndex) }];
  if (rng.next() < TRINKET_CHANCE) {
    drops.push({ item: pickWeightedTrinket(rng), amount: 1 });
  }
  return drops;
}
