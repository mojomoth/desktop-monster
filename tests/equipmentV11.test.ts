import { describe, expect, it } from 'vitest';
import { createEngine } from '../src/core/engine.js';
import { DEFAULT_SAVE, parseSave, serializeSave } from '../src/core/save.js';
import { newHeroProgress } from '../src/core/hero.js';
import { xpToNext } from '../src/core/formulas.js';
import { acquireEquipment, applyEquipmentAction, equipmentItems, isEquipmentAction, newEquipment } from '../src/core/equipment.js';
import type { EquipmentItem } from '../src/core/equipment.js';

const item = (id: number, templateId = 'w-sword-common-1', enhancement = '0'): EquipmentItem =>
  ({ id: `e${id}`, templateId, enhancement, roll: 100, seed: id, attempts: '0' });
function fixture() {
  const equipment = newEquipment();
  equipment.loadout.weapon = item(1, 'w-sword-rare-4');
  equipment.bag = [item(2), item(3, 'w-sword-epic-4')];
  equipment.temporary = [item(4, 'w-sword-common-2')];
  equipment.capacity = 2; equipment.nextId = 20;
  return createEngine({ ...DEFAULT_SAVE, level: 20, coins: '1000000', equipment });
}
const equip = (engine: ReturnType<typeof createEngine>, itemId: string, replaceId?: string) =>
  engine.apply({ type: 'equipmentEquip', itemId, ...(replaceId ? { replaceId } : {}), revision: engine.getState().equipment!.revision });

describe('v0.11 manual equipment and event-local automatic upgrades', () => {
  it('swaps a weaker chosen weapon into a full bag and preserves it across restart, ticks, training and unrelated money changes', () => {
    const engine = fixture();
    equip(engine, 'e2');
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e2');
    expect(engine.getState().equipment!.bag.map(entry => entry.id)).toEqual(['e1', 'e3']);
    const saved = engine.toSave(), resumed = createEngine(parseSave(serializeSave(saved)));
    expect(resumed.toSave()).toEqual(saved);
    resumed.tick(1000);
    resumed.apply({ type: 'shopBuy', item: 'training', shopSerial: resumed.getState().progress!.shopSerial });
    resumed.apply({ type: 'equipmentExpand', revision: resumed.getState().equipment!.revision });
    resumed.apply({ type: 'equipmentSell', itemId: 'e3', revision: resumed.getState().equipment!.revision });
    expect(resumed.getState().equipment!.loadout.weapon?.id).toBe('e2');
  });

  it('swaps temporary storage in place without losing any physical item or touching bag capacity', () => {
    const engine = fixture(), before = engine.getState().equipment!;
    equip(engine, 'e4');
    const after = engine.getState().equipment!;
    expect(after.temporary.map(entry => entry.id)).toEqual(['e1']);
    expect(after.bag).toEqual(before.bag);
    expect(after.temporaryRevision).toBe(before.temporaryRevision + 1);
    expect(equipmentItems(after).map(entry => entry.id).sort()).toEqual(equipmentItems(before).map(entry => entry.id).sort());
  });

  it('requires the chosen equipped UID when four accessories are occupied and preserves the selected position on restart', () => {
    const equipment = newEquipment();
    equipment.loadout.accessories = [1, 2, 3, 4].map(id => item(id, 'a-ring-critical-rare-4'));
    equipment.bag = [item(5, 'a-ring-critical-common-1')]; equipment.nextId = 6;
    const engine = createEngine({ ...DEFAULT_SAVE, level: 20, equipment });
    const before = engine.toSave();
    expect(equip(engine, 'e5')).toEqual([]);
    expect(engine.lastActionError()).toBe('Choose the equipped item to replace');
    expect(equip(engine, 'e5', 'e99')).toEqual([]);
    expect(engine.toSave()).toEqual(before);
    equip(engine, 'e5', 'e2');
    expect(engine.lastActionError()).toBeNull();
    expect(engine.getState().equipment!.loadout.accessories.map(entry => entry.id)).toEqual(['e1', 'e5', 'e3', 'e4']);
    expect(engine.getState().equipment!.bag.map(entry => entry.id)).toEqual(['e2']);
    expect(createEngine(parseSave(serializeSave(engine.toSave()))).toSave()).toEqual(engine.toSave());
  });

  it('appends accessories into a vacancy and rejects wrong jobs, unmet levels, unowned IDs and stale revisions atomically', () => {
    const equipment = newEquipment();
    equipment.bag = [item(1, 'a-ring-critical-common-1'), item(2, 'w-gun-common-1'), item(3, 'w-sword-common-4')];
    equipment.nextId = 4;
    const hero = newHeroProgress(); hero.collection = [{ formId: 'h01', buffPercent: 10 }]; hero.equipped = hero.collection[0]!;
    const engine = createEngine({ ...DEFAULT_SAVE, level: 1, hero, equipment });
    // Move the automatically filled accessory back for the empty-slot action case.
    const state = engine.getState(), eq = state.equipment!;
    eq.bag.push(eq.loadout.accessories.pop()!);
    const result = applyEquipmentAction(state, { type: 'equipmentEquip', itemId: 'e1', revision: eq.revision });
    expect('state' in result && result.state.equipment!.loadout.accessories[0]!.id).toBe('e1');
    const before = engine.toSave();
    for (const id of ['e2', 'e3', 'e99']) expect(equip(engine, id)).toEqual([]);
    expect(engine.apply({ type: 'equipmentEquip', itemId: 'e2', revision: -1 })).toEqual([]);
    expect(engine.toSave()).toEqual(before);
    expect(isEquipmentAction({ type: 'equipmentEquip', itemId: 'e2', replaceId: 2, revision: 0 })).toBe(false);
  });

  it('considers only the acquired item and retains the chosen weapon on raw integer attack ties', () => {
    const engine = fixture(); equip(engine, 'e2');
    const eq = engine.getState().equipment!;
    acquireEquipment(eq, item(5, 'w-sword-common-2'), 'h00', 20, undefined, 1000n);
    expect(eq.loadout.weapon?.id).toBe('e5');
    expect(eq.bag.some(entry => entry.id === 'e3')).toBe(true);
    acquireEquipment(eq, item(6, 'w-sword-common-2'), 'h00', 20, undefined, 1000n);
    expect(eq.loadout.weapon?.id).toBe('e5');
    const rounded = newEquipment(); rounded.loadout.weapon = item(1);
    acquireEquipment(rounded, item(2, 'w-sword-common-2'), 'h00', 5, undefined, 1n);
    expect(rounded.loadout.weapon?.id).toBe('e1');
  });

  it('upgrades only the enhanced item, and fills a sold equipped vacancy without replacing other chosen slots', () => {
    const engine = fixture(); equip(engine, 'e2');
    const before = engine.getState().equipment!;
    engine.apply({ type: 'equipmentEnhance', itemId: 'e4', revision: before.revision });
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e4');
    engine.apply({ type: 'equipmentSell', itemId: 'e4', revision: engine.getState().equipment!.revision });
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e3');
  });

  it('only reconsiders newly eligible equipment on level-up', () => {
    const equipment = newEquipment();
    equipment.loadout.weapon = item(1); equipment.bag = [item(2, 'w-sword-epic-1'), item(3, 'w-sword-common-2')]; equipment.nextId = 4;
    const engine = createEngine({ ...DEFAULT_SAVE, level: 4, xp: xpToNext(4) - 1, monsterHp: '1', equipment }, { next: () => .99 });
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e1');
    engine.attack('keyboard');
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e3');
  });

  it('keeps manually selected compatible slots when changing between sword-compatible heroes', () => {
    const engine = fixture(), save = engine.toSave();
    save.equipment!.temporary = [];
    const hero = newHeroProgress();
    hero.collection = [{ formId: 'h01', buffPercent: 10 }, { formId: 'h06', buffPercent: 10 }];
    hero.equipped = hero.collection[0]!; save.hero = hero;
    const changing = createEngine(save);
    equip(changing, 'e2');
    changing.apply({ type: 'heroEquip', formId: 'h06' });
    expect(changing.lastActionError()).toBeNull();
    expect(changing.getState().equipment!.loadout.weapon?.id).toBe('e2');
    expect(changing.getState().equipment!.bag.some(entry => entry.id === 'e3')).toBe(true);
  });
});
