import { describe, expect, it } from 'vitest';
import {
  COIN_ITEM,
  coinsForIndex,
  mulberry32,
  rollLoot,
  TRINKET_CHANCE,
  TRINKET_TABLE,
} from '../src/core/index.js';
import type { ItemDrop, Rng } from '../src/core/index.js';

/** Rng stub returning a scripted sequence (repeats its last value). */
function scriptedRng(values: number[]): Rng {
  let i = 0;
  return {
    next: () => values[Math.min(i++, values.length - 1)] ?? 0,
  };
}

describe('mulberry32 deterministic RNG (SPEC F06, Assumption 15)', () => {
  it('same seed yields the identical sequence, different seeds diverge', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);

    const c = mulberry32(4321);
    const seqC = Array.from({ length: 100 }, () => c.next());
    expect(seqC).not.toEqual(seqA);
  });

  it('outputs stay in [0, 1) and are roughly uniform over 10000 draws', () => {
    const rng = mulberry32(42);
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    const mean = sum / 10000;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });
});

describe('loot tables (SPEC F09, Assumptions 3/6/15)', () => {
  it('every kill drops exactly 1 + floor(index/3) coins', () => {
    const rng = mulberry32(7);
    for (let index = 0; index < 30; index++) {
      const drops = rollLoot(rng, index);
      const coinDrops = drops.filter((d) => d.item.kind === 'coin');
      expect(coinDrops).toHaveLength(1);
      expect(coinDrops[0]?.item).toEqual(COIN_ITEM);
      expect(coinDrops[0]?.amount).toBe(1 + Math.floor(index / 3));
    }
    expect(coinsForIndex(0)).toBe(1);
    expect(coinsForIndex(2)).toBe(1);
    expect(coinsForIndex(3)).toBe(2);
    expect(coinsForIndex(11)).toBe(4);
  });

  it('trinket drop rate over 10000 seeded kills is within 23 to 27 percent', () => {
    const rng = mulberry32(20260708);
    let trinketKills = 0;
    for (let i = 0; i < 10000; i++) {
      const drops = rollLoot(rng, i % 25);
      const trinkets = drops.filter((d) => d.item.kind === 'trinket');
      expect(trinkets.length).toBeLessThanOrEqual(1);
      if (trinkets.length === 1) {
        trinketKills++;
      }
    }
    const rate = trinketKills / 10000;
    expect(rate).toBeGreaterThanOrEqual(0.23);
    expect(rate).toBeLessThanOrEqual(0.27);
  });

  it('a kill drops at most one trinket, always with amount 1 and a table id', () => {
    const validIds = new Set(TRINKET_TABLE.map((t) => t.item.id));
    const rng = mulberry32(99);
    const seenIds = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const trinkets = rollLoot(rng, i).filter((d) => d.item.kind === 'trinket');
      expect(trinkets.length).toBeLessThanOrEqual(1);
      for (const t of trinkets) {
        expect(t.amount).toBe(1);
        expect(validIds.has(t.item.id)).toBe(true);
        seenIds.add(t.item.id);
      }
    }
    // With 2000 seeded kills every one of the 5 trinkets shows up.
    expect(seenIds.size).toBe(validIds.size);
  });

  it('trinket weights are frozen at sword_shard:5, slime_gel:4, bone:3, gem:2, crown:1', () => {
    expect(TRINKET_TABLE.map((t) => [t.item.id, t.weight])).toEqual([
      ['sword_shard', 5],
      ['slime_gel', 4],
      ['bone', 3],
      ['gem', 2],
      ['crown', 1],
    ]);
    expect(TRINKET_CHANCE).toBe(0.25);
    expect(TRINKET_TABLE.every((t) => t.item.kind === 'trinket')).toBe(true);
  });

  it('weighted pick maps the second rng draw onto cumulative weight bands', () => {
    // Bands over total weight 15: shard [0,5), gel [5,9), bone [9,12),
    // gem [12,14), crown [14,15). First draw 0 forces a trinket drop.
    const pickAt = (fraction: number): ItemDrop[] => rollLoot(scriptedRng([0, fraction]), 0);
    expect(pickAt(0)[1]?.item.id).toBe('sword_shard');
    expect(pickAt(4.9 / 15)[1]?.item.id).toBe('sword_shard');
    expect(pickAt(5 / 15)[1]?.item.id).toBe('slime_gel');
    expect(pickAt(9 / 15)[1]?.item.id).toBe('bone');
    expect(pickAt(12 / 15)[1]?.item.id).toBe('gem');
    expect(pickAt(14 / 15)[1]?.item.id).toBe('crown');
    expect(pickAt(0.999999)[1]?.item.id).toBe('crown');
  });

  it('the trinket chance boundary is exclusive at 0.25', () => {
    expect(rollLoot(scriptedRng([0.2499999, 0]), 0)).toHaveLength(2);
    expect(rollLoot(scriptedRng([0.25]), 0)).toHaveLength(1);
  });

  it('empirical trinket mix over 10000 seeded kills follows the 5/4/3/2/1 ordering', () => {
    const rng = mulberry32(777);
    const counts = new Map<string, number>();
    for (let i = 0; i < 10000; i++) {
      for (const d of rollLoot(rng, i)) {
        if (d.item.kind === 'trinket') {
          counts.set(d.item.id, (counts.get(d.item.id) ?? 0) + 1);
        }
      }
    }
    const ordered = TRINKET_TABLE.map((t) => counts.get(t.item.id) ?? 0);
    for (let k = 1; k < ordered.length; k++) {
      expect(ordered[k - 1] ?? 0).toBeGreaterThan(ordered[k] ?? 0);
    }
  });

  it('negative and fractional monster indices are clamped like the catalog', () => {
    const drops = rollLoot(mulberry32(1), -5);
    expect(drops[0]?.amount).toBe(1);
    expect(coinsForIndex(-3)).toBe(1);
    expect(coinsForIndex(3.9)).toBe(2);
  });

  it('rollLoot with a real seed is reproducible end to end', () => {
    const roll = (): ItemDrop[][] => {
      const rng = mulberry32(31337);
      return Array.from({ length: 50 }, (_, i) => rollLoot(rng, i));
    };
    expect(roll()).toEqual(roll());
  });
});
