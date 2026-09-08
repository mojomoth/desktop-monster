import { describe, expect, it } from 'vitest';
import {
  attackDelayOf,
  BOSS_EVERY,
  displayNameOf,
  isSpeciesId,
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
  /** Round 0 of the catalog — the five species DesMon shipped with. */
  const EXPECTED_ORDER = ['slime', 'bat', 'ghost', 'golem', 'dragon'];
  /** The element of catalog position i % 5, for all 21 rounds. */
  const ROUND_TYPES = ['water', 'wind', 'dark', 'earth', 'fire'];

  it('monsterForIndex cycles the 105-species catalog in round order and tier increments every 105 monsters', () => {
    // Round 0 is still the original five, in their original order (Assumption 4).
    expect(SPECIES_IDS.slice(0, 5)).toEqual(EXPECTED_ORDER);
    for (let i = 0; i < 23; i++) {
      const m = monsterForIndex(i);
      expect(m.index).toBe(i);
      expect(m.speciesId).toBe(SPECIES_IDS[i]);
      expect(m.tier).toBe(0);
    }
    // One full lap later the catalog repeats one tier up.
    for (const i of [0, 4, 5, 104, 105, 109, 209, 210]) {
      const m = monsterForIndex(i);
      expect(m.index).toBe(i);
      expect(m.speciesId).toBe(SPECIES_IDS[i % SPECIES_IDS.length]);
      expect(m.tier).toBe(Math.floor(i / SPECIES_IDS.length));
    }
    expect(monsterForIndex(105).speciesId).toBe('slime');
    expect(monsterForIndex(105).tier).toBe(1);
  });

  it('the catalog is 105 species: 21 per element, 35 per hidden size, in round order', () => {
    expect(SPECIES_IDS).toHaveLength(105);
    expect(new Set(SPECIES_IDS).size).toBe(105);
    // Odd => coprime with BOSS_EVERY = 8, so no species is locked out of the boss slot.
    expect(SPECIES_IDS.length % 2).toBe(1);

    const perType = new Map<string, number>();
    const perSize = new Map<number, number>();
    SPECIES_IDS.forEach((id, i) => {
      // The element cycles water, wind, dark, earth, fire once per round of five.
      expect(typeOf(id), id).toBe(ROUND_TYPES[i % 5]);
      perType.set(typeOf(id), (perType.get(typeOf(id)) ?? 0) + 1);
      perSize.set(sizeOf(id), (perSize.get(sizeOf(id)) ?? 0) + 1);
      expect([1, 2, 3], id).toContain(sizeOf(id));
      expect(attackDelayOf(id), id).toBeGreaterThanOrEqual(0);
      expect(attackDelayOf(id), id).toBeLessThanOrEqual(900);
      expect(attackDelayOf(id) % 50, id).toBe(0);
    });
    for (const t of TYPE_ORDER) {
      expect(perType.get(t), t).toBe(21);
    }
    for (const size of [1, 2, 3]) {
      expect(perSize.get(size), String(size)).toBe(35);
    }

    // Every species really does get its turn as a boss within 8 x 105 monsters.
    const bossSpecies = new Set<string>();
    for (let i = 0; i < BOSS_EVERY * SPECIES_IDS.length; i++) {
      if (isBoss(i)) {
        bossSpecies.add(monsterForIndex(i).speciesId);
      }
    }
    expect(bossSpecies.size).toBe(105);
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
    expect(monsterForIndex(7).name).toBe('Rictus Lv.1 BOSS');
    expect(monsterForIndex(15).name).toBe('Snipclaw Lv.1 BOSS');
    expect(monsterForIndex(23).name).toBe('Fellstump Lv.1 BOSS');
    // 8 is coprime with the 105-species catalog, so every species gets its turn.
    expect([7, 15, 23, 31, 39].map((i) => monsterForIndex(i).speciesId)).toEqual([
      'rictus',
      'snipclaw',
      'fellstump',
      'sporeplume',
      'wickmoth',
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
    expect(monsterForIndex(5).name).toBe('Lumibel Lv.1');
    expect(monsterForIndex(104).name).toBe('Cindercoil Lv.1');
    // The Lv number is the n-th lap of the whole 105-species catalog.
    expect(monsterForIndex(105).name).toBe('Slime Lv.2');
    expect(monsterForIndex(110).name).toBe('Lumibel Lv.2');
    expect(monsterForIndex(210).name).toBe('Slime Lv.3');
  });

  it('each species has a fixed type and a hidden size', () => {
    // The five original species keep their exact type and hidden size.
    expect(SPECIES_TYPE).toMatchObject({
      slime: 'water',
      bat: 'wind',
      ghost: 'dark',
      golem: 'earth',
      dragon: 'fire',
    });
    expect(SPECIES_SIZE).toMatchObject({ slime: 1, bat: 1, ghost: 2, golem: 3, dragon: 3 });
    // Every species covered by both tables, all five types used, size within 1..3.
    expect(Object.keys(SPECIES_TYPE)).toEqual([...SPECIES_IDS]);
    expect(Object.keys(SPECIES_SIZE)).toEqual([...SPECIES_IDS]);
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

  it('isSpeciesId and displayNameOf never throw on a runtime species id', () => {
    for (const id of SPECIES_IDS) {
      expect(isSpeciesId(id), id).toBe(true);
      expect(displayNameOf(id), id).toBe(monsterForIndex(SPECIES_IDS.indexOf(id)).name.replace(/ Lv\.\d+.*$/, ''));
    }
    // A save or a server roster may carry anything; nothing below may throw.
    for (const junk of ['wyrm', '', 'Slime', 'slime ', '__proto__', 'toString']) {
      expect(isSpeciesId(junk), junk).toBe(false);
      expect(displayNameOf(junk), junk).toBe(junk);
      expect(typeOf(junk), junk).toBe('water');
      expect(sizeOf(junk), junk).toBe(1);
      expect(attackDelayOf(junk), junk).toBe(0);
    }
  });

  it('non-integer or negative indices are clamped to a valid catalog entry', () => {
    expect(monsterForIndex(3.9)).toEqual(monsterForIndex(3));
    expect(monsterForIndex(-2)).toEqual(monsterForIndex(0));
  });
});
