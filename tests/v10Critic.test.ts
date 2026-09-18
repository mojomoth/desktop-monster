// Independent adversarial acceptance checks, authored by /root/harness_critic.
import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CATALOG, acquireEquipment, affordableEquipmentCost, autoEquipEquipment,
  canEquip, confirmHeroChange, createEquipmentBatch, enhancementCost,
  enhancementSuccess, equipmentItems, formatEquipmentCost, heroChangeWarning,
  loadoutAttack, newEquipment, randomBelow,
} from '../src/core/equipment.js';
import type { EquipmentItem, EquipmentLoadout } from '../src/core/equipment.js';
import { mulberry32 } from '../src/core/rng.js';

const item = (id: number, templateId = 'a-ring-critical-common-1', enhancement = '0'): EquipmentItem =>
  ({ id: `e${id}`, templateId, enhancement, roll: 100, seed: id, attempts: '0' });
const ids = (items: EquipmentItem[]): string[] => items.map(i => i.id).sort();
const subsets = <T>(values: T[], size: number): T[][] => {
  if (size === 0) return [[]];
  return values.flatMap((value, index) => subsets(values.slice(index + 1), size - 1).map(rest => [value, ...rest]));
};

describe('independent v0.10 product invariants', () => {
  it('contains every required family/rarity/level weapon and physical-copy accessory choice', () => {
    expect(new Set(EQUIPMENT_CATALOG.map(def => def.id)).size).toBe(224);
    expect(EQUIPMENT_CATALOG.filter(def => def.kind === 'weapon')).toHaveLength(128);
    expect(EQUIPMENT_CATALOG.filter(def => def.kind === 'accessory')).toHaveLength(96);
    for (const def of EQUIPMENT_CATALOG) {
      expect(canEquip(item(1, def.id), 'h00', def.requiredLevel)).toBe(true);
      if (def.requiredLevel > 1) expect(canEquip(item(1, def.id), 'h00', def.requiredLevel - 1)).toBe(false);
    }
    const state = newEquipment();
    const copies = [1, 2, 3, 4, 5].map(id => item(id));
    autoEquipEquipment(state, 'h00', 1, createEquipmentBatch(), copies);
    expect(state.loadout.accessories).toHaveLength(4);
    expect(new Set(state.loadout.accessories.map(copy => copy.templateId)).size).toBe(1);
    expect(ids(equipmentItems(state))).toEqual(ids(copies));
  });

  it('matches exhaustive displayed-attack search and maximizes retained equipment on integer ties', () => {
    const rng = mulberry32(100031);
    for (let scenario = 0; scenario < 36; scenario++) {
      const weapons = [1, 2, 3].map((id, i) => item(id, `w-sword-common-${i + 1}`, String(Math.floor(rng.next() * 7))));
      const accessories = [4, 5, 6, 7, 8, 9].map((id, i) => item(id, `a-ring-critical-common-${i % 4 + 1}`, String(Math.floor(rng.next() * 7))));
      const state = newEquipment();
      state.loadout = { weapon: weapons[0]!, accessories: accessories.slice(0, 3) };
      state.bag = [...weapons.slice(1), ...accessories.slice(3)];
      const oldIds = new Set([weapons[0]!.id, ...accessories.slice(0, 3).map(a => a.id)]);
      const base = BigInt([1, 2, 9, 74, 1234567, 999999999999999999n][scenario % 6]!);
      const candidates: EquipmentLoadout[] = [null, ...weapons].flatMap(weapon =>
        [0, 1, 2, 3, 4].flatMap(size => subsets(accessories, size).map(selected => ({ weapon, accessories: selected }))));
      const score = (loadout: EquipmentLoadout): [bigint, number, number] => {
        const all = [...(loadout.weapon ? [loadout.weapon] : []), ...loadout.accessories];
        return [loadoutAttack(base, loadout), all.filter(a => oldIds.has(a.id)).length, all.length];
      };
      const better = (a: [bigint, number, number], b: [bigint, number, number]): boolean =>
        a[0] > b[0] || a[0] === b[0] && (a[1] > b[1] || a[1] === b[1] && a[2] > b[2]);
      const expected = candidates.map(score).reduce((best, candidate) => better(candidate, best) ? candidate : best);
      autoEquipEquipment(state, 'h00', 30, createEquipmentBatch(), [], false, base);
      expect(score(state.loadout), `scenario ${scenario}`).toEqual(expected);
      expect(ids(equipmentItems(state))).toEqual(ids([...weapons, ...accessories]));
    }
  });

  it('preserves A/B until overflow, keeps C/D together, and replaces them only in the next overflow batch', () => {
    const state = newEquipment();
    state.capacity = 1;
    // Gun is incompatible with h01; all arrivals must use physical storage.
    const gun = (id: number): EquipmentItem => item(id, 'w-gun-common-1');
    state.bag = [gun(1)]; state.temporary = [gun(2), gun(3)];
    const batch = createEquipmentBatch();
    acquireEquipment(state, gun(4), 'h01', 1, batch);
    acquireEquipment(state, gun(5), 'h01', 1, batch);
    expect(ids(state.temporary)).toEqual(['e4', 'e5']);
    // A useful weapon immediately equips and does not replace this batch.
    acquireEquipment(state, item(6, 'w-sword-common-1'), 'h01', 1, createEquipmentBatch());
    expect(ids(state.temporary)).toEqual(['e4', 'e5']);
    acquireEquipment(state, gun(7), 'h01', 1, createEquipmentBatch());
    expect(ids(state.temporary)).toEqual(['e7']);
  });

  it('rejects stale/duplicate hero confirmation without mutating owned equipment', () => {
    const state = newEquipment();
    state.temporary = [item(1), item(2)];
    const stale = heroChangeWarning(state, 'h02', 7);
    state.temporaryRevision++;
    const snapshot = structuredClone(state);
    expect(confirmHeroChange(state, stale, createEquipmentBatch())).toBe(false);
    expect(state).toEqual(snapshot);
    const batch = createEquipmentBatch();
    const current = heroChangeWarning(state, 'h02', 7);
    expect(confirmHeroChange(state, current, batch)).toBe(true);
    const after = structuredClone(state);
    expect(confirmHeroChange(state, current, batch)).toBe(false);
    expect(state).toEqual(after);
    expect(confirmHeroChange(state, current, createEquipmentBatch())).toBe(false);
    expect(state).toEqual(after);
  });

  it('keeps every post-safe success chance positive and strictly decreasing beyond Number precision', () => {
    for (let target = 1n; target <= 5n; target++) {
      const chance = enhancementSuccess(target);
      expect(chance.numerator).toBe(chance.denominator);
    }
    for (const target of [6n, 7n, 100n, 100000000000000000000000000000000000n]) {
      const a = enhancementSuccess(target), b = enhancementSuccess(target + 1n);
      expect(a.numerator).toBeGreaterThan(0n);
      expect(a.numerator).toBeLessThan(a.denominator);
      expect(a.numerator * b.denominator).toBeGreaterThan(b.numerator * a.denominator);
    }
  });

  it('quotes unbounded exponential costs without allocating their unaffordable integer and charges exact boundaries', () => {
    for (const stage of ['0', '5', '99']) {
      const cost = enhancementCost(item(1, 'w-sword-common-1', stage));
      const exact = cost.base * 2n ** BigInt(stage);
      expect(affordableEquipmentCost(cost, exact - 1n)).toBeNull();
      expect(affordableEquipmentCost(cost, exact)).toBe(exact);
      expect(affordableEquipmentCost({ ...cost, doublings: cost.doublings + 1n }, exact * 2n)).toBe(exact * 2n);
    }
    const huge = enhancementCost(item(1, 'w-sword-common-1', '1000000000'));
    expect(affordableEquipmentCost(huge, 10n ** 500n)).toBeNull();
    expect(formatEquipmentCost(huge)).toBe(`${huge.base} × 2^1000000000`);
  });

  it('rejects out-of-range random words instead of biasing arbitrary rational denominators', () => {
    const words = [7, 6, 5, 4];
    let calls = 0;
    expect(randomBelow(5n, { next: () => words[calls++]! / 4294967296 })).toBe(4n);
    expect(calls).toBe(4);
    const bigWords = [1, 1, 1, 0];
    calls = 0;
    expect(randomBelow(4294967297n, { next: () => bigWords[calls++]! / 4294967296 })).toBe(4294967296n);
    expect(calls).toBe(4);
    expect(randomBelow(1n, { next: () => { throw new Error('No entropy required'); } })).toBe(0n);
  });
});
