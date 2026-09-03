import { describe, expect, it } from 'vitest';
import {
  BOSS_EVERY,
  CRIT_CHANCE,
  CRIT_MULT,
  damageForLevel,
  isBoss,
  monsterForIndex,
  monsterMaxHp,
  sizeOf,
  SPECIES_IDS,
  SPECIES_SIZE,
  SPECIES_TYPE,
  TYPE_ORDER,
  typeOf,
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
      expect(monsterForIndex(i).maxHp).toBe(monsterMaxHp(i) * (isBoss(i) ? 5n : 1n));
    }
  });

  it('every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles', () => {
    expect(BOSS_EVERY).toBe(8);
    for (const i of [7, 15, 23, 31, 39]) {
      expect(isBoss(i)).toBe(true);
      const m = monsterForIndex(i);
      expect(m.boss).toBe(true);
      expect(m.maxHp).toBe(monsterMaxHp(i) * 5n);
    }
    expect(monsterForIndex(7).name).toBe('Ghost Lv.2 BOSS');
    expect(monsterForIndex(15).name).toBe('Slime Lv.4 BOSS');
    expect(monsterForIndex(23).name).toBe('Golem Lv.5 BOSS');
    // 8 is not a multiple of 5, so every species gets its turn as a boss.
    expect([7, 15, 23, 31, 39].map((i) => monsterForIndex(i).speciesId)).toEqual([
      'ghost',
      'slime',
      'golem',
      'bat',
      'dragon',
    ]);
    for (const i of [0, 6, 8, 14, 16]) {
      expect(isBoss(i)).toBe(false);
      const m = monsterForIndex(i);
      expect(m.boss).toBe(false);
      expect(m.maxHp).toBe(monsterMaxHp(i));
      expect(m.name).not.toContain('BOSS');
    }
    expect(isBoss(-1)).toBe(false);
  });

  it('display name is "Slime Lv.3" style, with the Lv number = tier + 1', () => {
    expect(monsterForIndex(0).name).toBe('Slime Lv.1');
    expect(monsterForIndex(1).name).toBe('Bat Lv.1');
    expect(monsterForIndex(4).name).toBe('Dragon Lv.1');
    expect(monsterForIndex(5).name).toBe('Slime Lv.2');
    expect(monsterForIndex(10).name).toBe('Slime Lv.3');
    expect(monsterForIndex(14).name).toBe('Dragon Lv.3');
  });

  it('each species has a fixed type and a hidden size', () => {
    expect(SPECIES_TYPE).toEqual({
      slime: 'water',
      bat: 'wind',
      ghost: 'dark',
      golem: 'earth',
      dragon: 'fire',
    });
    expect(SPECIES_SIZE).toEqual({ slime: 1, bat: 1, ghost: 2, golem: 3, dragon: 3 });
    // Every species covered, one distinct type each, size within 1..3.
    expect(new Set(SPECIES_IDS.map(typeOf)).size).toBe(5);
    for (const id of SPECIES_IDS) {
      expect(TYPE_ORDER).toContain(typeOf(id));
      expect([1, 2, 3]).toContain(sizeOf(id));
    }
    // The catalog carries the species type; bosses keep it.
    expect(monsterForIndex(0).type).toBe('water');
    expect(monsterForIndex(4).type).toBe('fire');
    expect(monsterForIndex(7).type).toBe(typeOf('ghost'));
    expect(monsterForIndex(15).type).toBe('water');
    // Unknown species never throw — slime's defaults.
    expect(typeOf('wyrm')).toBe('water');
    expect(sizeOf('wyrm')).toBe(1);
  });

  it('non-integer or negative indices are clamped to a valid catalog entry', () => {
    expect(monsterForIndex(3.9)).toEqual(monsterForIndex(3));
    expect(monsterForIndex(-2)).toEqual(monsterForIndex(0));
  });
});
