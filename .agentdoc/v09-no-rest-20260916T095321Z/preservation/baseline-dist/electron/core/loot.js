"use strict";
// Loot tables — SPEC F09 / Assumptions 3, 6, 15.
// Every kill drops coins 1 + floor(index/3); 25% chance of exactly one
// weighted trinket. Randomness comes ONLY from the injected Rng.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRINKET_TABLE = exports.TRINKET_CHANCE = exports.COIN_ITEM = void 0;
exports.coinsForIndex = coinsForIndex;
exports.rollLoot = rollLoot;
/** The always-dropped currency item. */
exports.COIN_ITEM = { id: 'coin', name: 'Coin', kind: 'coin' };
/** Chance that a kill also drops one trinket (SPEC Assumption 3). */
exports.TRINKET_CHANCE = 0.25;
/** Weighted trinket table (SPEC F09). Never reorder — weights are frozen. */
exports.TRINKET_TABLE = [
    { item: { id: 'sword_shard', name: 'Sword Shard', kind: 'trinket' }, weight: 5 },
    { item: { id: 'slime_gel', name: 'Slime Gel', kind: 'trinket' }, weight: 4 },
    { item: { id: 'bone', name: 'Bone', kind: 'trinket' }, weight: 3 },
    { item: { id: 'gem', name: 'Gem', kind: 'trinket' }, weight: 2 },
    { item: { id: 'crown', name: 'Crown', kind: 'trinket' }, weight: 1 },
];
const TOTAL_WEIGHT = exports.TRINKET_TABLE.reduce((sum, t) => sum + t.weight, 0);
/** Coins dropped by the monster at `index`: 1 + floor(index/3), clamped total. */
function coinsForIndex(index) {
    return 1 + Math.floor(Math.max(0, Math.floor(index)) / 3);
}
function pickWeightedTrinket(rng) {
    let r = rng.next() * TOTAL_WEIGHT;
    for (const entry of exports.TRINKET_TABLE) {
        r -= entry.weight;
        if (r < 0) {
            return entry.item;
        }
    }
    // Unreachable while rng.next() < 1; keeps the function total anyway.
    return exports.COIN_ITEM;
}
/**
 * Roll the drops for killing the monster at 0-based global `monsterIndex`:
 * always exactly one coin drop of amount 1 + floor(index/3) (first element),
 * plus a TRINKET_CHANCE chance of exactly one weighted trinket (amount 1).
 * Consumes 1 rng draw normally, 2 when a trinket drops.
 */
function rollLoot(rng, monsterIndex) {
    const drops = [{ item: exports.COIN_ITEM, amount: coinsForIndex(monsterIndex) }];
    if (rng.next() < exports.TRINKET_CHANCE) {
        drops.push({ item: pickWeightedTrinket(rng), amount: 1 });
    }
    return drops;
}
