// Raid rules are shared by the authoritative server and the local reward reducer.
import type { RaidBoss, RaidReward } from '../shared/api.js';
import type { EquipmentTemplate } from './equipment.js';
import { acquireEquipment, copyEquipment, createEquipmentBatch, createEquipmentItem, autoEquipEquipment } from './equipment.js';
import { xpToNext } from './formulas.js';
import { coinsForIndex } from './loot.js';
import { creditGold } from './gold.js';
import { heroAttackPower } from './hero.js';
import { trainedHeroPower } from './economy.js';
import type { GameEvent, GameState } from './types.js';

export const RAID_PARAMETERS = Object.freeze({
  periodMs: 259200000, gatherMs: 86400000, countdownMs: 86400000, priorityMs: 21600000,
  capacity: 20, conditionNeed: 3, conditionLevelMin: 30, conditionLevelStep: 10,
  conditionBestIndexMin: 60, conditionBestIndexStep: 20, confirmGraceMs: 90000,
  battleMs: 120000, minConfirmed: 2, cadencePerSec: 2, clearRatioBps: 6500,
  maxClicksPerSec: 8, batchCapSec: 3, damageSlackBps: 12500, xpLevels: 3, goldKills: 500,
  failRewardBps: 1500, contributionFloorBps: 200,
  itemOddsTopBps: 8000, itemOddsDecayBps: 7000, itemOddsFloorBps: 500, claimWindowMs: 604800000,
});
export type RaidParameters = { [K in keyof typeof RAID_PARAMETERS]: number };
export const RAID_BOSSES: readonly RaidBoss[] = [
  { id: 'raid-water', name: '심해의 군주 틸라칸', element: 'water' },
  { id: 'raid-wind', name: '폭풍 익룡 스카이렌', element: 'wind' },
  { id: 'raid-dark', name: '공허의 눈 노크튀르', element: 'dark' },
  { id: 'raid-earth', name: '이끼 거인 테르모스', element: 'earth' },
  { id: 'raid-fire', name: '용광로 용 이그니스', element: 'fire' },
];
/** Separate provenance catalog: the ordinary 224-item catalog stays unchanged. */
export const RAID_CATALOG: readonly EquipmentTemplate[] = Object.freeze(RAID_BOSSES.flatMap((boss, i) =>
  (['weapon', 'accessory'] as const).map(kind => ({
    id: `${boss.id}-${kind}`, name: `${boss.name.split(' ').at(-1)}의 ${kind === 'weapon' ? '무기' : '인장'}`,
    kind, rarity: 'epic' as const, tier: 3, requiredLevel: 1,
    ...(kind === 'weapon' ? { weaponType: (['spear', 'dagger', 'staff', 'hammer', 'sword'] as const)[i]! }
      : { accessoryType: 'charm' as const }),
    attack: kind === 'weapon' ? 800 : 3200, allowedJobs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    bonus: kind === 'weapon' ? 'critical' as const : 'party' as const, bonusBps: kind === 'weapon' ? 100 : 1600,
    price: '2304000', enhanceBase: '51200', raidBossId: boss.id,
  }))));
export const raidLootForBoss = (id: string): readonly EquipmentTemplate[] => RAID_CATALOG.filter(item => item.raidBossId === id);

/** Main-only reward. Receipt and value are saved together by the coordinator. */
export function raidReward(state: Readonly<GameState>, reward: RaidReward): { state: GameState; events: GameEvent[] } | { error: string } {
  if (!/^r\d{1,16}$/.test(reward.raidId) || ![reward.xpLevels, reward.goldKills, reward.rewardBps, reward.level, reward.bestIndex]
    .every(n => Number.isSafeInteger(n) && n >= 0) || reward.level < 1 || reward.rewardBps > 10000 ||
    reward.xpLevels > 10 || reward.goldKills > 5000 || reward.itemTemplateId !== undefined && !RAID_CATALOG.some(t => t.id === reward.itemTemplateId)) {
    return { error: 'Invalid raid reward' };
  }
  if (state.appliedRaidIds?.includes(reward.raidId)) return { state: state as GameState, events: [] };
  if (!state.equipment) return { error: 'Equipment unavailable' };
  const xp = Math.floor(xpToNext(reward.level) * reward.xpLevels * reward.rewardBps / 10000);
  const goldUnit = coinsForIndex(reward.bestIndex);
  if (!Number.isSafeInteger(xp) || !Number.isSafeInteger(state.xp + xp) || !Number.isSafeInteger(goldUnit)) return { error: 'Raid reward overflow' };
  const result = { ...state, equipment: copyEquipment(state.equipment), appliedRaidIds: [...(state.appliedRaidIds ?? []), reward.raidId] };
  const events: GameEvent[] = [], batch = createEquipmentBatch();
  if (reward.itemTemplateId && (!Number.isSafeInteger(result.equipment.nextId) || result.equipment.nextId >= Number.MAX_SAFE_INTEGER)) {
    return { error: 'Equipment allocator exhausted' };
  }
  creditGold(result, BigInt(goldUnit) * BigInt(reward.goldKills) * BigInt(reward.rewardBps) / 10000n);
  result.xp += xp;
  while (result.xp >= xpToNext(result.level)) {
    result.xp -= xpToNext(result.level); result.level++;
    events.push({ type: 'levelUp', newLevel: result.level });
  }
  const base = trainedHeroPower(heroAttackPower(result.level, result.souls, result.hero?.reincarnations), result.progress?.trainingLevel);
  if (reward.itemTemplateId) {
    const item = createEquipmentItem(result.equipment, reward.itemTemplateId);
    acquireEquipment(result.equipment, item, result.hero?.equipped.formId ?? 'h00', result.level, batch, base);
    events.push({ type: 'equipmentDropped', item: { ...item } });
  }
  autoEquipEquipment(result.equipment, result.hero?.equipped.formId ?? 'h00', result.level, batch, [], true, base);
  result.equipment.revision++;
  events.push({ type: 'equipmentChanged', revision: result.equipment.revision });
  return { state: result, events };
}
