import { describe, expect, it, vi } from 'vitest';
import type { ProgressionParameters } from '../src/core/index.js';
import {
  attackDelayOf,
  BOSS_EVERY,
  displayNameOf,
  isSpeciesId,
  CRIT_CHANCE,
  CRIT_MULT,
  damageForLevel,
  fieldMonsterMaxHp,
  isBoss,
  monsterForIndex,
  monsterMaxHp,
  sizeOf,
  SPECIES_IDS,
  COMMON_SPECIES_IDS,
  SPECIES_SIZE,
  SPECIES_TYPE,
  TYPE_ORDER,
  typeOf,
  xpReward,
  xpToNext,
  PROGRESSION_PARAMETERS,
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

  it('xpToNext has the exact registered first four thresholds', () => {
    const thresholds = new Map([[1.4, [20, 28, 39, 54]], [1.41, [20, 28, 39, 56]], [1.42, [20, 28, 40, 57]], [1.43, [20, 28, 40, 58]]]);
    expect([1, 2, 3, 4].map(xpToNext)).toEqual(thresholds.get(PROGRESSION_PARAMETERS.xpGrowth));
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

describe('exact field HP tail boundaries', () => {
  // Only these mathematical cases inject parameters. Static imports above and
  // progressionV7's registered production binding continue to use the real export.
  const withParameters = async (parameters: Partial<ProgressionParameters>, check: (
    formulas: typeof import('../src/core/formulas.js'),
    monsters: typeof import('../src/core/monsters.js'),
  ) => void): Promise<void> => {
    vi.resetModules();
    vi.doMock('../src/core/progression.js', () => ({
      PROGRESSION_PARAMETERS: Object.freeze({ ...PROGRESSION_PARAMETERS, ...parameters }),
    }));
    try {
      const formulas = await import('../src/core/formulas.js');
      const monsters = await import('../src/core/monsters.js');
      check(formulas, monsters);
    } finally {
      vi.doUnmock('../src/core/progression.js');
      vi.resetModules();
    }
  };

  it.each([
    { tail: 111, after: [692551n, 768732n, 1437848n],
      huge: 6753174891425717229344085250921167153228808179315076059769438017666020469149199171306597237357073003525997698612292007695824614154777448600806786428840894180482276352849158536822512844465010111952782674824298188874661100262561327n },
    { tail: 108, after: [673834n, 727741n, 1154833n],
      huge: 187685248284498804020127441642791612583565023234811981238566225858945680612312505009382833061221029939862430295281769281409477896145546891696468775671882405546167261654422n },
    { tail: 105, after: [655116n, 687872n, 921815n],
      huge: 116861137979251180754812045532041919358100464010780355654571727644550330876342792325099958167053482860985246281n },
  ])('preserves the prefix and rounds tail $tail only once, including index5000', async ({ tail, after, huge }) => {
    await withParameters({ fieldHpNumerator: 115, fieldHpDenominator: 100, fieldHpTailStartIndex: 79,
      fieldHpTailNumerator: tail, fieldHpTailDenominator: 100 }, (formulas, monsters) => {
      const indices = [71, 72, 78, 79, 80, 81, 87, 5000];
      const values = [203960n, 234554n, 542539n, 623920n, ...after, huge];
      indices.forEach((index, i) => {
        const expected = values[i]!;
        expect(formulas.fieldMonsterMaxHp(index), String(index)).toBe(expected);
        expect(monsters.monsterForIndex(index).maxHp, String(index)).toBe(expected * (index % 8 === 7 ? 5n : 1n));
        expect(formulas.monsterMaxHp(index)).toBe(monsterMaxHp(index));
        // Calling the companion curve cannot replace a cached field value.
        expect(formulas.fieldMonsterMaxHp(index)).toBe(expected);
      });
      expect(formulas.monsterMaxHp(5000).toString()).toHaveLength(305);
      expect(formulas.fieldMonsterMaxHp(5000)).toBeGreaterThan(formulas.fieldMonsterMaxHp(4999));
    });
  });

  it('disabled tail preserves the original curve regardless of the unused tail ratio', async () => {
    await withParameters({ fieldHpNumerator: 115, fieldHpDenominator: 100, fieldHpTailStartIndex: null,
      fieldHpTailNumerator: 3, fieldHpTailDenominator: 2 }, (formulas, monsters) => {
      for (const index of [0, 71, 72, 78, 79, 80, 81, 5000]) {
        expect(formulas.fieldMonsterMaxHp(index)).toBe(monsterMaxHp(index));
        expect(monsters.monsterForIndex(index).maxHp).toBe(monsterMaxHp(index) * (index % 8 === 7 ? 5n : 1n));
      }
      expect(formulas.fieldMonsterMaxHp(-3)).toBe(10n);
      expect(formulas.fieldMonsterMaxHp(80.9)).toBe(monsterMaxHp(80));
    });
  });

  it('start0 uses the tail for every exponent while retaining base HP10', async () => {
    await withParameters({ fieldHpNumerator: 5, fieldHpDenominator: 4, fieldHpTailStartIndex: 0,
      fieldHpTailNumerator: 6, fieldHpTailDenominator: 5 }, (formulas) => {
      expect([0, 1, 2, 3, 4, 5].map(formulas.fieldMonsterMaxHp)).toEqual([10n, 12n, 14n, 17n, 20n, 24n]);
      expect(formulas.fieldMonsterMaxHp(5000)).toBe(10n * 6n ** 5000n / 5n ** 5000n);
      expect(formulas.monsterMaxHp(5000)).toBe(monsterMaxHp(5000));
    });
  });

  it('keeps different denominators exact and multiplies bosses after the final floor', async () => {
    await withParameters({ fieldHpNumerator: 5, fieldHpDenominator: 4, fieldHpTailStartIndex: 2,
      fieldHpTailNumerator: 6, fieldHpTailDenominator: 5 }, (formulas, monsters) => {
      expect([0, 1, 2, 3, 4, 7, 8].map(formulas.fieldMonsterMaxHp)).toEqual([10n, 12n, 15n, 18n, 22n, 38n, 46n]);
      // Intermediate prefix floor gives21; applying the boss multiplier before
      // the final floor gives194. Both would change the registered contract.
      expect(formulas.fieldMonsterMaxHp(4)).toBe(22n);
      expect(monsters.monsterForIndex(7).maxHp).toBe(190n);
      expect(formulas.fieldMonsterMaxHp(4.9)).toBe(22n);
      expect(formulas.fieldMonsterMaxHp(-1)).toBe(10n);
    });
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
      expect(m.speciesId).toBe(COMMON_SPECIES_IDS[i % COMMON_SPECIES_IDS.length]);
      expect(m.tier).toBe(Math.floor(i / COMMON_SPECIES_IDS.length));
    }
    expect(monsterForIndex(105).speciesId).toBe('slime');
    expect(monsterForIndex(105).tier).toBe(1);
  });

  it('the common catalog remains 105 species: 21 per element, 35 per hidden size, in round order', () => {
    expect(COMMON_SPECIES_IDS).toHaveLength(105);
    expect(SPECIES_IDS).toHaveLength(135);
    expect(SPECIES_IDS.slice(0, 105)).toEqual(COMMON_SPECIES_IDS);
    expect(new Set(SPECIES_IDS).size).toBe(135);
    expect(new Set(COMMON_SPECIES_IDS).size).toBe(105);
    // Odd => coprime with BOSS_EVERY = 8, so no species is locked out of the boss slot.
    expect(COMMON_SPECIES_IDS.length % 2).toBe(1);

    const perType = new Map<string, number>();
    const perSize = new Map<number, number>();
    COMMON_SPECIES_IDS.forEach((id, i) => {
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
    for (let i = 0; i < BOSS_EVERY * COMMON_SPECIES_IDS.length; i++) {
      if (isBoss(i)) {
        bossSpecies.add(monsterForIndex(i).speciesId);
      }
    }
    expect(bossSpecies.size).toBe(105);
  });

  it('monsterForIndex maxHp always equals the field HP curve', () => {
    for (const i of [0, 1, 4, 5, 9, 10, 20, 37]) {
      expect(monsterForIndex(i).maxHp).toBe(fieldMonsterMaxHp(i) * (isBoss(i) ? 5n : 1n));
    }
  });

  it('every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles', () => {
    expect(BOSS_EVERY).toBe(8);
    for (const i of [7, 15, 23, 31, 39]) {
      expect(isBoss(i)).toBe(true);
      const m = monsterForIndex(i);
      expect(m.boss).toBe(true);
      expect(m.maxHp).toBe(fieldMonsterMaxHp(i) * 5n);
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
      expect(m.maxHp).toBe(fieldMonsterMaxHp(i));
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
      expect(displayNameOf(id), id).toBe(monsterForIndex(0, id).name.replace(/ Lv\.\d+.*$/, ''));
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
