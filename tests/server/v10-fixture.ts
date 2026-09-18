import { EQUIPMENT_PROTOCOL, type HeroCombatSnapshot, type Snapshot } from '../../src/shared/api.js';

/** Upgrade historical scenario inputs to the current wire contract, preserving malformed values for boundary tests. */
export function modernSnapshot<T extends object>(snapshot: T): T & Pick<Snapshot, 'protocol' | 'combat'> {
  const value = snapshot as Partial<Snapshot>;
  const combat: HeroCombatSnapshot = { hero: value.hero ?? { formId: 'h00', buffPercent: 0 },
    level: value.level ?? 1, souls: 0, reincarnations: 0, trainingLevel: 0, loadout: { weapon: null, accessories: [] } };
  return { ...snapshot, protocol: EQUIPMENT_PROTOCOL, combat,
    ...(value.gold ? { gold: { ...value.gold, coins: typeof value.gold.coins === 'number' ? String(value.gold.coins) : value.gold.coins } } : {}) };
}
