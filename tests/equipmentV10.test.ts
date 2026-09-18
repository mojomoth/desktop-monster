import { describe, expect, it } from 'vitest';
import {
  acquireEquipment, affordableEquipmentCost, canEquip, copyEquipment, createEquipmentItem,
  displayedHeroAttack, enhancementCost, equipmentItems, equipmentTemplate, heroChangeWarning,
  heroCombatSnapshot, isHeroCombatSnapshot, newEquipment, parseEquipment, refreshEquipmentShop,
  rollBossEquipment, EQUIPMENT_BALANCE,
} from '../src/core/equipment.js';
import type { EquipmentItem } from '../src/core/equipment.js';
import { createEngine } from '../src/core/engine.js';
import { DEFAULT_SAVE, parseSave, serializeSave } from '../src/core/save.js';
import { newHeroProgress } from '../src/core/hero.js';
import { simulateHeroicBattle } from '../src/core/battle.js';
import { mulberry32 } from '../src/core/rng.js';

const item = (id: number, templateId = 'w-gun-common-1', patch: Partial<EquipmentItem> = {}): EquipmentItem =>
  ({ id: `e${id}`, templateId, enhancement: '0', roll: 100, seed: id, attempts: '0', ...patch });
const equippedFixture = () => {
  const equipment = newEquipment();
  equipment.capacity = 1;
  equipment.bag = [item(1, 'w-staff-common-4')];
  equipment.loadout.weapon = item(2, 'w-gun-common-2');
  equipment.temporary = [item(3)];
  equipment.nextId = 20;
  equipment.shop = { serial: 1, nextRefreshAt: 3600000, lastObservedAt: 0, stock: [item(10)], boughtIds: [] };
  const hero = newHeroProgress();
  hero.collection.push({ formId: 'h01', buffPercent: 10 });
  return { ...DEFAULT_SAVE, level: 5, monsterIndex: 7, monsterHp: '1', hero, equipment, coins: '1000000' };
};

describe('v0.10 engine transactions and exact money', () => {
  it('keeps hero-change overflow and the immediate boss drop in one frame, rejects a second change', () => {
    const save = equippedFixture();
    for (let seed = 1; seed < 1000; seed++) {
      const probe = newEquipment(0, seed), drop = rollBossEquipment(probe, 5);
      if (drop && !canEquip(drop, 'h01', 5)) { save.equipment.rngState = seed; break; }
    }
    const engine = createEngine(save, { next: () => .99 });
    const confirmation = heroChangeWarning(engine.getState().equipment, 'h01');
    engine.beginEquipmentBatch();
    engine.apply({ type: 'heroEquip', formId: 'h01', equipmentConfirmation: confirmation });
    expect(engine.getState().equipment!.temporary.map(i => i.id)).toEqual(['e2']);
    const afterChange = engine.toSave();
    expect(engine.apply({ type: 'heroEquip', formId: 'h00' })).toEqual([]);
    expect(engine.toSave()).toEqual(afterChange);
    const events = engine.attack('keyboard');
    const drop = events.find(event => event.type === 'equipmentDropped');
    expect(drop?.type).toBe('equipmentDropped');
    const temporary = engine.getState().equipment!.temporary;
    expect(temporary.map(i => i.id)).toEqual(['e2', drop?.type === 'equipmentDropped' ? drop.item.id : 'missing']);
    engine.endEquipmentBatch();
    const snapshot = engine.toSave();
    expect(createEngine(parseSave(serializeSave(snapshot))).toSave()).toEqual(snapshot);
  });

  it('binds loss confirmation to target, hero revision and temporary revision without changing rejected state', () => {
    const engine = createEngine(equippedFixture());
    const before = engine.toSave();
    expect(engine.apply({ type: 'heroEquip', formId: 'h01' })).toEqual([]);
    expect(engine.apply({ type: 'heroEquip', formId: 'h01', equipmentConfirmation: heroChangeWarning(before.equipment, 'h02') })).toEqual([]);
    expect(engine.apply({ type: 'heroEquip', formId: 'h01', equipmentConfirmation: { ...heroChangeWarning(before.equipment, 'h01'), temporaryRevision: 9 } })).toEqual([]);
    expect(engine.toSave()).toEqual(before);
    engine.apply({ type: 'heroEquip', formId: 'h01', equipmentConfirmation: heroChangeWarning(before.equipment, 'h01') });
    const after = engine.toSave();
    expect(equipmentItems(after.equipment!).some(i => i.id === 'e3')).toBe(false);
    expect(engine.apply({ type: 'heroEquip', formId: 'h01' })).toEqual([]);
    expect(engine.toSave()).toEqual(after);
  });

  it('rejects purchases that destroy old temporary gear and stale duplicate purchases without charging', () => {
    const save = equippedFixture();
    save.hero.equipped = { formId: 'h01', buffPercent: 10 };
    save.equipment.loadout.weapon = null;
    const engine = createEngine(save);
    const before = engine.toSave(), eq = before.equipment!;
    engine.apply({ type: 'equipmentBuy', itemId: 'e10', shopSerial: 1, revision: eq.revision });
    expect(engine.toSave()).toEqual(before);
    engine.apply({ type: 'equipmentSell', itemId: 'e1', revision: eq.revision });
    const open = engine.getState().equipment!;
    const action = { type: 'equipmentBuy' as const, itemId: 'e10', shopSerial: 1, revision: open.revision };
    engine.apply(action);
    const purchased = engine.toSave();
    expect(equipmentItems(purchased.equipment!).filter(i => i.id === 'e10')).toHaveLength(1);
    engine.apply(action);
    expect(engine.toSave()).toEqual(purchased);
  });

  it('persists real hourly stock, advances after offline time and resists clock rollback', () => {
    const eq = newEquipment(1234567, 42);
    expect(refreshEquipmentShop(eq, 1234567, 1)).toBe(true);
    const stock = copyEquipment(eq);
    expect(eq.shop.nextRefreshAt).toBe(3600000);
    expect(refreshEquipmentShop(eq, 1, 1)).toBe(false);
    expect(eq).toEqual(stock);
    const restored = parseEquipment(eq);
    expect(refreshEquipmentShop(restored, 3599999, 1)).toBe(false);
    expect(restored.shop.stock).toEqual(eq.shop.stock);
    expect(refreshEquipmentShop(restored, 7200000, 1)).toBe(true);
    expect(restored.shop.nextRefreshAt).toBe(10800000);
    expect(restored.shop.stock.every(i => equipmentTemplate(i.templateId)!.rarity !== 'epic')).toBe(true);
    expect(restored.nextId).toBeGreaterThan(Math.max(...restored.shop.stock.map(i => Number(i.id.slice(1)))));
  });

  it('guarantees five upgrades and atomically debits/deletes a failed risky item across restart', () => {
    const eq = newEquipment(); eq.loadout.weapon = item(1, 'w-sword-common-1'); eq.nextId = 2;
    const engine = createEngine({ ...DEFAULT_SAVE, coins: '100000000000000000000000', equipment: eq });
    let spent = 0n;
    for (let stage = 1; stage <= 5; stage++) {
      const before = engine.getState();
      spent += affordableEquipmentCost(enhancementCost(before.equipment!.loadout.weapon!), before.coins)!;
      engine.apply({ type: 'equipmentEnhance', itemId: 'e1', revision: before.equipment!.revision });
      expect(engine.getState().equipment!.loadout.weapon!.enhancement).toBe(String(stage));
      expect(engine.getState().progress!.goldSpent).toBe(spent);
    }
    let failed = false;
    for (let seed = 1; seed < 1000 && !failed; seed++) {
      const saved = engine.toSave(); saved.equipment!.loadout.weapon!.seed = seed;
      const trial = createEngine(saved);
      const before = trial.getState(), price = affordableEquipmentCost(enhancementCost(before.equipment!.loadout.weapon!), before.coins)!;
      const events = trial.apply({ type: 'equipmentEnhance', itemId: 'e1', revision: before.equipment!.revision });
      if (!events.some(e => e.type === 'equipmentDestroyed')) continue;
      failed = true;
      expect(trial.getState().coins).toBe(before.coins - price);
      expect(equipmentItems(trial.getState().equipment!).some(i => i.id === 'e1')).toBe(false);
      const loaded = createEngine(parseSave(serializeSave(trial.toSave())));
      expect(loaded.toSave()).toEqual(trial.toSave());
      expect(loaded.getState().progress!.goldSpent).toBe(spent + price);
    }
    expect(failed).toBe(true);
  });

  it('rejects unsafe legacy monetary fields instead of rounding or deleting economic history', () => {
    for (const coins of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null, '01', '1e20']) {
      expect(() => parseSave({ ...DEFAULT_SAVE, coins })).toThrow();
    }
    for (const goldSpent of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => parseSave({ ...DEFAULT_SAVE, progress: { goldSpent } })).toThrow();
    }
    const exact = '9'.repeat(200);
    const engine = createEngine(parseSave({ ...DEFAULT_SAVE, coins: exact, progress: { goldSpent: exact } }));
    expect(engine.getState().coins).toBe(BigInt(exact));
    expect(engine.toSave().progress!.goldSpent).toBe(exact);
  });

  it('only bosses generate gear, and snapshots cannot mutate item rolls or wallet state', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: 100 }, mulberry32(18));
    for (let step = 0; step < 100; step++) {
      const boss = engine.getState().monster.boss;
      const events = engine.attack('keyboard');
      if (!boss) expect(events.some(e => e.type === 'equipmentDropped')).toBe(false);
    }
    const before = engine.toSave(), view = engine.getState();
    view.equipment!.shop.stock[0]!.roll = 999;
    view.equipment!.bag.push(item(999));
    expect(engine.toSave()).toEqual(before);
    expect(EQUIPMENT_BALANCE.shopRefreshMs).toBe(3600000);
  });
});

describe('v0.10 heroic battles', () => {
  it('uses identical integer rounding for equipped companion damage in field and PvP', () => {
    const equipment = newEquipment();
    equipment.loadout.accessories = [1, 2, 3, 4].map(id => item(id, 'a-ring-party-epic-4'));
    const companion = { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 };
    const enemy = { ...companion, speciesId: 'dragon', level: 1000 };
    const engine = createEngine({ ...DEFAULT_SAVE, monsterSpeciesId: 'dragon', companions: [companion], equipment });
    const hero = heroCombatSnapshot(engine.getState());
    const fight = simulateHeroicBattle([companion], [enemy], { attacker: hero, defender: hero }, 42);
    const battleHit = fight.blows.find(blow => blow.side === 'A' && blow.actorKind === 'companion');
    const fieldHit = engine.tick(2000).find(event => event.type === 'companionAttack');
    expect(fieldHit?.type === 'companionAttack' ? fieldHit.damage : null).toBe(2n);
    expect(battleHit?.damage).toBe(2n);
  });

  it('replays six rotating actors against companion shields deterministically and freezes inputs', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: 10 });
    const eq = newEquipment(); acquireEquipment(eq, createEquipmentItem(eq, 'w-sword-common-3'), 'h00', 10);
    const armed = createEngine({ ...engine.toSave(), equipment: eq });
    const heroes = { attacker: heroCombatSnapshot(armed.getState()), defender: heroCombatSnapshot(armed.getState()) };
    const party = Array.from({ length: 5 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1000, stars: 0 }));
    const before = JSON.stringify(heroes);
    const fight = simulateHeroicBattle(party, party, heroes, 72);
    expect(fight).toEqual(simulateHeroicBattle(party, party, heroes, 72));
    expect(fight.attackerFighters).toHaveLength(6);
    expect(fight.blows[0]).toMatchObject({ actorId: '@hero', actorKind: 'hero', targetKind: 'companion' });
    expect(new Set(fight.blows.filter(b => b.side === 'A').slice(0, 6).map(b => b.actorId)).size).toBe(6);
    expect(fight.attackerFighters[0]!.attack).toBe(String(displayedHeroAttack(armed.getState())));
    expect(fight.attackerFighters[0]!.hp).toBe(simulateHeroicBattle([], [], { attacker: heroCombatSnapshot(engine.getState()), defender: heroes.defender }, 1).attackerFighters[0]!.hp);
    expect(JSON.stringify(heroes)).toBe(before);
    expect(fight.blows.length).toBeLessThanOrEqual(200);
  });

  it('supports hero-only combat and rejects malformed, incompatible, over-level or duplicated gear snapshots', () => {
    const snapshot = heroCombatSnapshot(createEngine().getState());
    expect(simulateHeroicBattle([], [], { attacker: snapshot, defender: snapshot }, 1).blows.length).toBeGreaterThan(0);
    expect(isHeroCombatSnapshot({ ...snapshot, hero: { ...snapshot.hero, buffPercent: NaN } })).toBe(false);
    expect(isHeroCombatSnapshot({ ...snapshot, loadout: { weapon: item(1, 'w-sword-common-4'), accessories: [] } })).toBe(false);
    const copy = item(2, 'a-ring-critical-common-1');
    expect(isHeroCombatSnapshot({ ...snapshot, loadout: { weapon: null, accessories: [copy, copy] } })).toBe(false);
  });
});
