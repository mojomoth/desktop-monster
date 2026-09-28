import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, mulberry32, parseSave, serializeSave } from '../src/core/index.js';
import { RAID_BOSSES, RAID_CATALOG, RAID_PARAMETERS } from '../src/core/raid.js';
import { displayedHeroAttack, EQUIPMENT_CATALOG, equipmentItems, heroCombatSnapshot } from '../src/core/equipment.js';
import { heroicAttack } from '../src/core/battle.js';
import { xpToNext } from '../src/core/formulas.js';
import { coinsForIndex } from '../src/core/loot.js';
import type { RaidReward } from '../src/shared/api.js';

const reward: RaidReward = { raidId: 'r1', rank: 1, of: 3, xpLevels: 3, goldKills: 500,
  level: 30, bestIndex: 60, rewardBps: 10000, itemTemplateId: 'raid-dark-weapon' };

describe('raid core', () => {
  it('keeps ordinary catalog fixed and all five bosses have two persistent epic items', () => {
    expect(EQUIPMENT_CATALOG).toHaveLength(224); expect(RAID_BOSSES).toHaveLength(5); expect(RAID_CATALOG).toHaveLength(10);
    expect(new Set(RAID_CATALOG.map(item => item.id)).size).toBe(10);
    expect(RAID_PARAMETERS.conditionNeed * 2).toBeLessThanOrEqual(RAID_PARAMETERS.capacity);
    expect(RAID_PARAMETERS.countdownMs).toBeGreaterThanOrEqual(12 * 3600000);
    expect(RAID_PARAMETERS.countdownMs).toBeLessThanOrEqual(48 * 3600000);
    for (const boss of RAID_BOSSES) expect(RAID_CATALOG.filter(item => item.raidBossId === boss.id)).toHaveLength(2);
  });
  it('raid attacks and ticks never advance field, companions, XP or wallet, including fever', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: 30, companions: [{ id: 'c1', speciesId: 'dragon', level: 100, bossIndex: 100, stars: 5 }] }, mulberry32(3));
    const before = engine.toSave();
    for (let i = 0; i < 40; i++) {
      const events = engine.raidAttack('keyboard');
      expect(events.some(e => e.type === 'attack')).toBe(true);
      expect(events.every(e => e.type === 'attack' || e.type === 'feverStart')).toBe(true);
      engine.raidTick(100);
    }
    expect(engine.getState().fever.active).toBe(true);
    expect(engine.toSave()).toEqual(before);
    engine.raidTick(100000); expect(engine.getState().fever.active).toBe(false);
    expect(engine.tick(1).some(event => event.type === 'companionAttack')).toBe(false);
    expect(heroicAttack(heroCombatSnapshot(engine.getState()))).toBe(displayedHeroAttack(engine.getState()));
  });
  it('auto-applies frozen rewards once across serialization, including item IDs and PvP debt', () => {
    let engine = createEngine({ ...DEFAULT_SAVE, level: 30, pvpGoldDebt: '100', bestIndex: 100 }, mulberry32(3));
    engine.apply({ type: 'raidReward', ...reward });
    expect(engine.lastActionError()).toBeNull();
    expect(engine.getState().coins).toBe(BigInt(coinsForIndex(60) * 500 - 100));
    const state = engine.toSave();
    expect(equipmentItems(engine.getState().equipment!).filter(i => i.templateId === reward.itemTemplateId)).toHaveLength(1);
    engine = createEngine(parseSave(serializeSave(state)), mulberry32(3));
    const before = engine.toSave();
    expect(engine.apply({ type: 'raidReward', ...reward })).toEqual([]); expect(engine.toSave()).toEqual(before);
    expect(engine.toSave().appliedRaidIds).toEqual(['r1']);
  });
  it('pays exact fail fraction without an item and rejects malformed rewards before mutation', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: 30 }, mulberry32(3));
    engine.apply({ type: 'raidReward', ...reward, itemTemplateId: undefined, rewardBps: 1500 });
    expect(engine.getState().coins).toBe(BigInt(coinsForIndex(60) * 75));
    expect(engine.getState().xp).toBe(Math.floor(xpToNext(30) * 3 * .15));
    const before = engine.toSave();
    engine.apply({ type: 'raidReward', ...reward, raidId: 'r2', rewardBps: 10001 });
    expect(engine.lastActionError()).not.toBeNull(); expect(engine.toSave()).toEqual(before);
  });
});
