import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RAID_BOSSES } from '../src/core/raid.js';
import type { RaidAction, RaidLiveResponse, RaidReward } from '../src/shared/api.js';
import { mountRaid, raidBossCanvas, raidTime, raidRewardText } from '../src/menu/raid.js';
import { raidResultSpec } from '../src/menu/popup.js';
import { SILHOUETTE_COLOR } from '../src/menu/hero.js';
import { MenuDoc } from './helpers/menuDom.js';

const sample = (): RaidLiveResponse => ({ now: 1000, raid: { raidId: 'r7', cycle: 7, boss: RAID_BOSSES[2]!, phase: 'gathering',
  gatherDeadline: 3_661_000, capacity: 50, joined: 0, confirmed: 0, openToAll: false, participants: [],
  conditions: [{ id: 'level', kind: 'level', min: 30, need: 3, have: 2, qualified: true, mine: false }],
  me: { playerId: 'p1', unlocker: false, joined: false, confirmed: false, damage: '0', seq: 0, claimed: false } } });
const reward: RaidReward = { raidId: 'r7', rank: 2, of: 32, level: 33, bestIndex: 60, xpLevels: 3, goldKills: 500, rewardBps: 10000, itemTemplateId: 'raid-dark-weapon' };

describe('live raid menu cards', () => {
  it('has nine production tabs and one popup host', () => {
    const html = readFileSync('static/menu.html', 'utf8');
    expect(html.match(/id="tab-/g)).toHaveLength(9);
    expect(html).toContain('id="tab-raid"'); expect(html).toContain('id="popup-host"');
  });
  it('draws the shared giant as integer pixels and keeps future art visibly placeholder-only', () => {
    const doc = new MenuDoc();
    const locked = raidBossCanvas(doc, RAID_BOSSES[2]!, true);
    const revealed = raidBossCanvas(doc, RAID_BOSSES[2]!, false);
    expect([locked.width, locked.height]).toEqual([128, 88]);
    expect(new Set((locked as ReturnType<MenuDoc['createElement']>).fills)).toEqual(new Set([SILHOUETTE_COLOR]));
    expect(new Set((revealed as ReturnType<MenuDoc['createElement']>).fills).size).toBeGreaterThan(1);
    expect(raidBossCanvas(doc, RAID_BOSSES[0]!, false).getAttribute?.('aria-label')).toContain('임시 실루엣');
  });
  it('shows all five cards in rotation order with current Korean copy and preserves focused action nodes', () => {
    const doc = new MenuDoc(), root = doc.createElement('div'), actions: RaidAction[] = [];
    const update = mountRaid(doc, root, action => actions.push(action)), view = sample();
    update(view, view.now, { connected: true });
    const cards = root.find('raid-card'), button = root.find('raid-action')[0]!;
    expect(cards).toHaveLength(5); expect(root.text()).toContain('등장 순서 1');
    expect(root.text()).toContain('레이드가 열리면 참여 조건을 확인할 수 있습니다.');
    expect(root.text()).toContain('모집 마감까지 01:01:00');
    expect(root.text()).not.toContain('다음 순환');
    button.focus(); update(structuredClone(view), view.now + 1000, { connected: true });
    expect(root.find('raid-card')[0]).toBe(cards[0]); expect(root.find('raid-action')[0]).toBe(button); expect(doc.activeElement).toBe(button);
    button.click(); expect(actions).toEqual([{ type: 'participate', conditionId: 'level' }]);
    update(view, view.now, { connected: false }); button.click(); expect(actions).toHaveLength(1);
    expect(root.text()).toContain('마지막 상태');
  });
  it('requires explicit join and confirmation; full, nonparticipant, offline and pending buttons cannot dispatch', () => {
    const doc = new MenuDoc(), root = doc.createElement('div'), actions: RaidAction[] = [], view = sample();
    const update = mountRaid(doc, root, action => actions.push(action));
    view.raid.phase = 'countdown'; view.raid.battleAt = view.now + 60_000;
    update(view, view.now, { connected: true }); const button = root.find('raid-action')[0]!;
    expect(button.textContent).toBe('우선 참여 대기'); button.click(); expect(actions).toHaveLength(0);
    view.raid.openToAll = true; update(view, view.now); button.click(); expect(actions.at(-1)).toEqual({ type: 'join' });
    view.raid.joined = 50; update(view, view.now); expect(button.textContent).toBe('정원 마감'); button.click(); expect(actions).toHaveLength(1);
    view.raid.me.joined = true; view.raid.phase = 'confirming'; update(view, view.now); expect(button.textContent).toBe('참전 확인');
    update(view, view.now, { pending: true }); button.click(); expect(actions).toHaveLength(1);
    update(view, view.now); button.click(); expect(actions.at(-1)).toEqual({ type: 'confirm' });
    view.raid.me.confirmed = true; update(view, view.now); expect(button.textContent).toBe('참전 확정'); button.click(); expect(actions).toHaveLength(2);
  });
  it('does not equate server claim reservation with durable local application and provides no claim button', () => {
    const doc = new MenuDoc(), root = doc.createElement('div'), view = sample();
    view.raid.phase = 'settled'; view.raid.me = { ...view.raid.me, confirmed: true, claimed: true, reward };
    const update = mountRaid(doc, root, () => undefined); update(view, view.now);
    expect(root.text()).toContain('자동 지급 대기'); expect(root.text()).not.toContain('수령 완료');
    expect(root.find('raid-action')[0]?.hidden).toBe(true);
    update(view, view.now, { appliedRaidIds: ['r7'] }); expect(root.text()).toContain('수령 완료');
    expect(raidResultSpec(reward).body).toContain('보상을 자동으로 저장하고 있습니다. 연결이 복구되면 다시 시도합니다.');
    expect(raidResultSpec(reward, true).buttons).toEqual([{ label: '확인', value: 'ok', primary: true }]);
    expect(raidTime(-10)).toBe('00:00:00');
    expect(raidRewardText({ ...reward, level: 10000 })).toContain('XP +확인 중');
  });
});
