// Synthetic raid views for the preview gate and native scenarios. Plain data, no network, no clock.
export const NOW = 1_790_000_000_000; // fixed "server now"
const H = 3_600_000, MIN = 60_000;
const boss = (id, name, element) => ({ id, name, element });
export const BOSSES = [boss('raid-water', '심해의 군주 틸라칸', 'water'), boss('raid-wind', '폭풍 익룡 스카이렌', 'wind'),
  boss('raid-dark', '공허의 눈 노크튀르', 'dark'), boss('raid-earth', '이끼 거인 테르모스', 'earth'), boss('raid-fire', '용광로 용 이그니스', 'fire')];
const conditions = (have = [1, 0], mine = [false, false], qualified = [true, false]) => [
  { id: 'level', kind: 'level', min: 30, need: 3, have: have[0], mine: mine[0], qualified: qualified[0] },
  { id: 'bestIndex', kind: 'bestIndex', min: 60, need: 3, have: have[1], mine: mine[1], qualified: qualified[1] }];
const me = (over = {}) => ({ playerId: 'p3', unlocker: false, joined: false, confirmed: false, damage: '0', seq: 0, claimed: false, ...over });
const base = (phase, over = {}) => ({ raidId: 'r7', cycle: 7, boss: BOSSES[2], phase, gatherDeadline: NOW + 20 * H,
  conditions: conditions(), capacity: 20, joined: 0, openToAll: false, confirmed: 0,
  participants: Array.from({ length: over.confirmed ?? 0 }, (_, i) => ({ playerId: `p${i}`, name: `player${i}`,
    formId: `h${String(i).padStart(2, '0')}`, level: 30 + i, damage: i === 3 ? over.me?.damage ?? '0' : '0' })),
  me: me(), ...over });
export const VIEWS = {
  gathering: { now: NOW, raid: base('gathering') },
  gatheringQualified: { now: NOW, raid: base('gathering', { conditions: conditions([2, 1], [false, false], [true, true]) }) },
  countdown: { now: NOW, raid: base('countdown', { conditions: conditions([3, 3], [true, false], [true, true]), unlockedAt: NOW - 2 * H,
    battleAt: NOW + 22 * H + 34 * MIN + 56_000, priorityUntil: NOW + 4 * H, joined: 7, confirmed: 0, me: me({ unlocker: true }) }) },
  countdownJoined: { now: NOW, raid: base('countdown', { conditions: conditions([3, 3], [true, false], [true, true]), unlockedAt: NOW - 2 * H,
    battleAt: NOW + 22 * H + 34 * MIN + 56_000, priorityUntil: NOW + 4 * H, joined: 8, confirmed: 0, me: me({ unlocker: true, joined: true }) }) },
  full: { now: NOW, raid: base('countdown', { conditions: conditions([3, 3]), unlockedAt: NOW - 20 * H, battleAt: NOW + 4 * H, priorityUntil: NOW - 14 * H,
    joined: 20, openToAll: true }) },
  confirming: { now: NOW, raid: base('confirming', { conditions: conditions([3, 3], [true, false]), unlockedAt: NOW - 24 * H, battleAt: NOW - 10_000,
    confirmUntil: NOW + 80_000, joined: 12, confirmed: 3, me: me({ unlocker: true, joined: true }) }) },
  battle: { now: NOW, raid: base('battle', { conditions: conditions([3, 3], [true, false]), unlockedAt: NOW - 24 * H, battleAt: NOW - 100_000,
    confirmUntil: NOW - 10_000, battleEnd: NOW + 55_000, joined: 12, confirmed: 8,
    battle: { bossHp: '1840000', hpLeft: '1140800', elapsedMs: 65_000, killed: false,
      top: [{ name: 'Bongo_Knight', damage: '210400' }, { name: 'mojo', damage: '164000' }, { name: 'kim_dev', damage: '120000' }] },
    me: me({ unlocker: true, joined: true, confirmed: true, damage: '120000', seq: 65 }) }) },
  settled: { now: NOW, raid: base('settled', { conditions: conditions([3, 3], [true, false]), unlockedAt: NOW - 24 * H, battleAt: NOW - 200_000,
    confirmUntil: NOW - 110_000, battleEnd: NOW - 30_000, claimUntil: NOW + 7 * 24 * H, joined: 12, confirmed: 8,
    battle: { bossHp: '1840000', hpLeft: '0', elapsedMs: 98_000, killed: true, top: [{ name: 'Bongo_Knight', damage: '610400' }, { name: 'mojo', damage: '404000' }] },
    me: me({ unlocker: true, joined: true, confirmed: true, damage: '404000', seq: 98, rank: 2, claimed: true,
      reward: { raidId: 'r7', rank: 2, of: 8, xpLevels: 3, goldKills: 500, level: 33, bestIndex: 60, rewardBps: 10000, itemTemplateId: 'raid-dark-weapon' } }) }) },
};
/** RaidStateView for the in-game scene (plan §4.1). */
export const SCENE = {
  battle: { raidId: 'r7', bossId: 'raid-dark', phase: 'battle', bossHpRatio: 0.62, remainingMs: 55_000, timeoutMs: 120_000, me: 'p3',
    participants: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map((playerId, i) => ({ playerId, name: ['Bongo_Knight', 'mojo', 'kim_dev', 'me', 'lee', 'park', 'choi', 'jung'][i],
      formId: 'h0' + i, level: [41, 38, 35, 33, 30, 29, 27, 25][i], damageDelta: i === 1 ? '4200' : '0' })) },
  victory: { raidId: 'r7', bossId: 'raid-dark', phase: 'settled', bossHpRatio: 0, remainingMs: 22_000, timeoutMs: 120_000, me: 'p3', result: { victory: true, rank: 2 },
    participants: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map((playerId, i) => ({ playerId, name: 'p' + i, formId: 'h0' + i, level: 30 + i, damageDelta: '0' })) },
};
export const REWARD = VIEWS.settled.raid.me.reward;
