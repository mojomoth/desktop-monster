import { describe, expect, it } from 'vitest';
import {
  CRIT_CHANCE,
  CRIT_MULT,
  damageForLevel,
  monsterForIndex,
  monsterMaxHp,
  SPECIES_IDS,
  xpReward,
  xpToNext,
} from '../src/core/index.js';

describe('progression formulas (SPEC F04, Assumption 3 — frozen)', () => {
  it('monsterMaxHp is exactly 10/20/40/163 at index 0/5/10/20', () => {
    expect(monsterMaxHp(0)).toBe(10n);
    expect(monsterMaxHp(5)).toBe(20n);
    expect(monsterMaxHp(10)).toBe(40n);
    expect(monsterMaxHp(20)).toBe(163n);
  });

  it('monsterMaxHp is exact for huge indices: index 5000 has 305 digits', () => {
    // The exact rational 10*(115/100)^i keeps growing where the v1 double
    // saturated at Infinity (SPEC F30) — and stays byte-for-byte exact.
    expect(monsterMaxHp(5000).toString()).toHaveLength(305);
    expect(monsterMaxHp(5000)).toBe((10n * 115n ** 5000n) / 100n ** 5000n);
    expect(monsterMaxHp(5000)).toBeGreaterThan(monsterMaxHp(4999));
  });

  it('xpToNext is exactly 20/28/39/54 at level 1/2/3/4', () => {
    expect(xpToNext(1)).toBe(20);
    expect(xpToNext(2)).toBe(28);
    expect(xpToNext(3)).toBe(39);
    expect(xpToNext(4)).toBe(54);
  });

  it('formula outputs are positive integers and strictly increasing', () => {
    const assertPositiveIntsStrictlyIncreasing = (values: number[]): void => {
      let prev = 0; // all curves start above 0, so this floor is safe
      for (const v of values) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeGreaterThan(prev);
        prev = v;
      }
    };

    const levels = Array.from({ length: 50 }, (_, k) => k + 1); // 1..50
    const indices = Array.from({ length: 50 }, (_, k) => k); // 0..49

    assertPositiveIntsStrictlyIncreasing(levels.map(damageForLevel));
    assertPositiveIntsStrictlyIncreasing(indices.map((i) => Number(monsterMaxHp(i))));
    assertPositiveIntsStrictlyIncreasing(indices.map(xpReward));
    assertPositiveIntsStrictlyIncreasing(levels.slice(0, 30).map(xpToNext));
  });

  it('damageForLevel is the identity curve (+1 damage per level)', () => {
    expect(damageForLevel(1)).toBe(1);
    expect(damageForLevel(7)).toBe(7);
    expect(damageForLevel(42)).toBe(42);
  });

  it('xpReward is exactly 5 + 3*index', () => {
    expect(xpReward(0)).toBe(5);
    expect(xpReward(1)).toBe(8);
    expect(xpReward(10)).toBe(35);
  });

  it('crit constants are frozen at 10% chance and 2x multiplier', () => {
    expect(CRIT_CHANCE).toBe(0.1);
    expect(CRIT_MULT).toBe(2);
  });
});

describe('monster catalog (SPEC F05, Assumption 4)', () => {
  const EXPECTED_ORDER = ['slime', 'bat', 'ghost', 'golem', 'dragon'];

  it('monsterForIndex cycles 5 species in order and tier increments every 5 monsters', () => {
    expect([...SPECIES_IDS]).toEqual(EXPECTED_ORDER);
    for (let i = 0; i < 23; i++) {
      const m = monsterForIndex(i);
      expect(m.index).toBe(i);
      expect(m.speciesId).toBe(EXPECTED_ORDER[i % 5]);
      expect(m.tier).toBe(Math.floor(i / 5));
    }
  });

  it('monsterForIndex maxHp always equals monsterMaxHp(index)', () => {
    for (const i of [0, 1, 4, 5, 9, 10, 20, 37]) {
      expect(monsterForIndex(i).maxHp).toBe(monsterMaxHp(i));
    }
  });

  it('display name is "Slime Lv.3" style, with the Lv number = tier + 1', () => {
    expect(monsterForIndex(0).name).toBe('Slime Lv.1');
    expect(monsterForIndex(1).name).toBe('Bat Lv.1');
    expect(monsterForIndex(4).name).toBe('Dragon Lv.1');
    expect(monsterForIndex(5).name).toBe('Slime Lv.2');
    expect(monsterForIndex(10).name).toBe('Slime Lv.3');
    expect(monsterForIndex(14).name).toBe('Dragon Lv.3');
  });

  it('non-integer or negative indices are clamped to a valid catalog entry', () => {
    expect(monsterForIndex(3.9)).toEqual(monsterForIndex(3));
    expect(monsterForIndex(-2)).toEqual(monsterForIndex(0));
  });
});
