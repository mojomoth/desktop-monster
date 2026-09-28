import { mountRaid } from '../../../src/menu/raid.js';
import { mountPopup, raidConfirmSpec, raidResultSpec } from '../../../src/menu/popup.js';
import type { MenuDocument, MenuElement } from '../../../src/menu/index.js';
import type { RaidAction, RaidLiveResponse } from '../../../src/shared/api.js';
import { VIEWS } from '../../../.harness/v12/fixtures/raid.mjs';

/** Synthetic data adapter only. Cards, boss pixels, buttons and popups are production modules. */
export function mountRaidPreview(root: HTMLElement, mode: string): void {
  const doc = root.ownerDocument;
  root.replaceChildren(); root.className = 'raid-preview-menu';
  const tabs = doc.createElement('div'); tabs.className = 'tabs'; tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '게임 메뉴');
  let raidTab: HTMLButtonElement | undefined;
  for (const name of ['영웅', '도감', '동료', '장비', '상점', '대전', '레이드', '순위', '내 기록']) {
    const tab = doc.createElement('button'); tab.type = 'button'; tab.textContent = name; tab.setAttribute('role', 'tab');
    tab.className = `tab${name === '레이드' ? ' active' : ''}`;
    tab.setAttribute('aria-selected', String(name === '레이드'));
    if (name === '레이드') { tab.id = 'tab-raid'; raidTab = tab; tab.setAttribute('aria-controls', 'raid'); }
    else { tab.tabIndex = -1; tab.setAttribute('aria-disabled', 'true'); }
    tabs.append(tab);
  }
  const panel = doc.createElement('section'); panel.id = 'raid'; panel.className = 'panel';
  panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'tab-raid');
  const host = doc.createElement('div'); host.id = 'popup-host';
  root.append(tabs, panel, host);
  const raw = structuredClone(VIEWS[mode === 'result' || mode === 'failure' ? 'settled' : mode === 'gathering' ? 'gatheringQualified' : mode] ?? VIEWS.countdown);
  const view: RaidLiveResponse = { ...raw, raid: { ...raw.raid, capacity: 50, joined: mode === 'full' ? 50 : raw.raid.joined ? 32 : 0,
    participants: [], me: { ...raw.raid.me, playerId: 'p3',
      ...(raw.raid.me.reward ? { reward: { ...raw.raid.me.reward, of: 32, level: 33, bestIndex: 60, rewardBps: mode === 'failure' ? 1500 : 10000 } } : {}) } } };
  if (mode === 'failure' && view.raid.battle) view.raid.battle.killed = false;
  if (mode === 'failure' && view.raid.me.reward) delete view.raid.me.reward.itemTemplateId;
  const popup = mountPopup(doc as unknown as MenuDocument, host as unknown as MenuElement);
  const appliedRaidIds = view.raid.me.claimed ? [view.raid.raidId] : [];
  const commit = (action: RaidAction): void => {
    if (action.type === 'participate') {
      const row = view.raid.conditions.find(condition => condition.id === action.conditionId);
      if (row && !row.mine) { row.mine = true; row.have++; view.raid.me.unlocker = true; }
    } else if (action.type === 'join') { view.raid.me.joined = true; view.raid.joined++; }
    else view.raid.me.confirmed = true;
    update(view, view.now, { connected: true, appliedRaidIds });
  };
  const confirm = (): void => { void popup.open(raidConfirmSpec(view)).then(value => { if (value === 'confirm') commit({ type: 'confirm' }); }); };
  const update = mountRaid(doc as unknown as MenuDocument, panel as unknown as MenuElement, action => {
    if (action.type === 'confirm') confirm(); else commit(action);
  });
  update(view, view.now, { connected: true, appliedRaidIds });
  raidTab?.focus();
  if (mode === 'confirming') confirm();
  if ((mode === 'result' || mode === 'failure') && view.raid.me.reward) {
    const spec = raidResultSpec(view.raid.me.reward, true, mode !== 'failure'); spec.boss = view.raid.boss;
    void popup.open(spec);
  }
}
