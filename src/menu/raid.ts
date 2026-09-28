import type { RaidAction, RaidBoss, RaidLiveResponse, RaidReward, RaidView } from '../shared/api.js';
import { RAID_BOSSES, RAID_CATALOG } from '../core/raid.js';
import { xpToNext } from '../core/formulas.js';
import { coinsForIndex } from '../core/loot.js';
import { format } from '../core/bignum.js';
import { drawSprite } from '../renderer/sprites/sprite.js';
import { raidBoss, RAID_BOSS_SCALE } from '../renderer/sprites/raidBosses.js';
import { ELEMENT_NAMES, SILHOUETTE_COLOR } from './hero.js';
import type { MenuDocument, MenuElement } from './index.js';

export function raidBossCanvas(doc: MenuDocument, boss: RaidBoss, silhouette: boolean): MenuElement {
  const canvas = doc.createElement('canvas');
  canvas.className = 'raid-art'; canvas.width = raidBoss.w * RAID_BOSS_SCALE; canvas.height = raidBoss.h * RAID_BOSS_SCALE;
  const placeholder = silhouette || boss.element !== 'dark';
  canvas.setAttribute?.('role', 'img');
  canvas.setAttribute?.('aria-label', silhouette ? '미발견 레이드 보스 실루엣' : placeholder ? `${boss.name} · 임시 실루엣` : boss.name);
  const context = canvas.getContext?.('2d');
  if (context) drawSprite(context, raidBoss, 0, 0, 0, { scale: RAID_BOSS_SCALE, ...(placeholder ? { tint: SILHOUETTE_COLOR } : {}) });
  return canvas;
}

export function raidRewardText(reward: RaidReward): string {
  const xpAmount = Math.floor(xpToNext(reward.level) * reward.xpLevels * reward.rewardBps / 10_000);
  const xp = Number.isSafeInteger(xpAmount) && xpAmount >= 0 ? format(BigInt(xpAmount)) : '확인 중';
  const gold = BigInt(coinsForIndex(reward.bestIndex)) * BigInt(reward.goldKills) * BigInt(reward.rewardBps) / 10_000n;
  const item = RAID_CATALOG.find(template => template.id === reward.itemTemplateId);
  return `XP +${xp} · G +${format(gold)}${item ? ` · ${item.name}` : ''}`;
}

export function raidTime(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}
export interface RaidMenuState {
  connected?: boolean;
  pending?: boolean;
  error?: string;
  /** Local durable application, distinct from server-side claim reservation. */
  appliedRaidIds?: readonly string[];
}

function raidButton(raid: RaidView): { label: string; action?: RaidAction } {
  if (raid.phase === 'gathering') {
    const condition = raid.conditions.find(row => row.qualified && !row.mine && row.have < row.need);
    return condition ? { label: '참여', action: { type: 'participate', conditionId: condition.id } }
      : { label: raid.conditions.some(row => row.mine) ? '참여 완료' : '참여 조건 미충족' };
  }
  if (raid.phase === 'countdown') {
    if (raid.me.joined) return { label: '참여 완료' };
    if (raid.joined >= raid.capacity) return { label: '정원 마감' };
    return raid.openToAll || raid.me.unlocker ? { label: '레이드 참여', action: { type: 'join' } } : { label: '우선 참여 대기' };
  }
  if (raid.phase === 'confirming') return raid.me.confirmed ? { label: '참전 확정' }
    : raid.me.joined ? { label: '참전 확인', action: { type: 'confirm' } } : { label: '이번 전투 미참여' };
  if (raid.phase === 'battle') return { label: raid.me.confirmed ? '전투 중' : '이번 전투 미참여' };
  return { label: raid.phase === 'skipped' ? '모집 종료' : '전투 종료' };
}

/** Stable cards and buttons: polling updates text without remounting focused controls. */
export function mountRaid(doc: MenuDocument, root: MenuElement, send: (action: RaidAction) => void):
  (view: RaidLiveResponse | null, now: number, state?: RaidMenuState) => void {
  const el = (tag: string, className: string, value = ''): MenuElement => {
    const node = doc.createElement(tag); node.className = className; node.textContent = value; return node;
  };
  const heading = el('div', 'raid-heading'); heading.append(el('h2', '', '보스 레이드'), el('span', 'muted', '함께 조건을 채우고, 함께 도전하세요'));
  const connection = el('p', 'raid-connection muted'); connection.setAttribute?.('role', 'status');
  const list = el('div', 'raid-list');
  root.replaceChildren(heading, connection, list);
  let action: RaidAction | undefined;
  const cards = RAID_BOSSES.map(boss => {
    const card = el('article', 'card raid-card locked');
    const art = el('div', 'raid-art-host'); const content = el('div', 'raid-card-content');
    const title = el('div', 'raid-title');
    const name = el('h3', 'name', '???'); const phase = el('span', 'raid-phase');
    title.append(el('span', `type type-${boss.element}`, ELEMENT_NAMES[boss.element]), name, phase);
    const conditions = el('div', 'raid-conditions'); const status = el('div', 'raid-status-line');
    const timer = el('strong', 'raid-countdown'); const capacity = el('span', 'raid-capacity'); status.append(timer, capacity);
    const note = el('p', 'raid-note muted'); const feedback = el('span', 'raid-inline-feedback');
    feedback.setAttribute?.('role', 'status');
    const button = el('button', 'btn raid-action'); button.setAttribute?.('type', 'button');
    button.addEventListener('click', () => { if (!button.disabled && action) send(action); });
    const actions = el('div', 'raid-actions'); actions.append(button, feedback);
    content.append(title, conditions, status, note, actions); card.append(art, content);
    return { boss, card, art, name, phase, conditions, status, timer, capacity, note, actions, button, feedback, revealed: undefined as boolean | undefined, conditionKey: '' };
  });
  let orderKey = '';
  return (view, now, state = {}) => {
    const raid = view?.raid;
    connection.textContent = !view ? '레이드 정보를 불러오지 못했습니다. 연결되면 자동으로 다시 시도합니다.'
      : state.connected === false ? '연결이 끊겼습니다. 마지막 상태를 표시하며 자동으로 다시 연결합니다.' : '';
    connection.hidden = !connection.textContent;
    const start = Math.max(0, cards.findIndex(card => card.boss.id === raid?.boss.id));
    const ordered = [...cards.slice(start), ...cards.slice(0, start)];
    const key = ordered.map(card => card.boss.id).join(',');
    if (key !== orderKey) { list.replaceChildren(...ordered.map(card => card.card)); orderKey = key; }
    for (const [index, card] of ordered.entries()) {
      const current = index === 0 && raid !== undefined;
      const revealed = current && raid.phase !== 'gathering' && raid.phase !== 'skipped';
      if (card.revealed !== revealed) { card.revealed = revealed; card.art.replaceChildren(raidBossCanvas(doc, card.boss, !revealed)); }
      card.name.textContent = revealed ? card.boss.name : '???';
      card.card.className = `card raid-card ${current ? `raid-current ${raid.phase}` : 'raid-next locked'}`;
      card.status.hidden = card.actions.hidden = card.conditions.hidden = !current;
      if (!current) {
        card.phase.textContent = `등장 순서 ${index + (raid ? 0 : 1)}`;
        card.note.textContent = '레이드가 열리면 참여 조건을 확인할 수 있습니다.';
        continue;
      }
      card.phase.textContent = { gathering: '조건 모집', countdown: '참여 대기', confirming: '참전 확인', battle: '전투 중', settled: '전투 종료', skipped: '모집 종료' }[raid.phase];
      const conditionKey = JSON.stringify(raid.conditions);
      if (card.conditionKey !== conditionKey) {
        card.conditionKey = conditionKey;
        card.conditions.replaceChildren(...raid.conditions.map(row => el('p', 'condition', `${row.have >= row.need ? '✓' : '○'} ${row.kind === 'level' ? '레벨' : '최고 단계'} ${row.min} 이상 · ${row.have}/${row.need}${row.mine ? ' · 참여함' : ''}`)));
      }
      card.capacity.textContent = `정원 ${raid.joined} / ${raid.capacity}`;
      card.timer.textContent = raid.phase === 'gathering' ? `모집 마감까지 ${raidTime(raid.gatherDeadline - now)}`
        : raid.phase === 'countdown' ? `레이드 시작까지 ${raidTime((raid.battleAt ?? now) - now)}`
          : raid.phase === 'confirming' ? `참전 확인까지 ${raidTime((raid.confirmUntil ?? now) - now)}`
            : raid.phase === 'battle' ? `남은 전투 시간 ${raidTime((raid.battleEnd ?? now) - now)}`
              : raid.phase === 'skipped' ? '모집 조건을 채우지 못했습니다.' : raid.battle?.killed ? '레이드 토벌 성공!' : '제한시간 종료';
      const applied = state.appliedRaidIds?.includes(raid.raidId) === true;
      card.note.textContent = raid.phase === 'gathering' ? '조건을 충족한 영웅이 참여하면 집계됩니다.'
        : raid.phase === 'countdown' ? (raid.priorityUntil ?? 0) > now
          ? `조건 기여자 우선 참여 · ${raidTime(raid.priorityUntil! - now)} 후 모두에게 공개` : '시작할 때 참전 확인을 눌러 주세요.'
          : raid.phase === 'confirming' ? '확인 버튼을 눌러야 전투에 참가합니다.'
            : raid.phase === 'battle' ? raid.me.confirmed ? '게임 창에서 키보드와 마우스로 공격하세요.' : '참전 확인을 마친 영웅만 전투에 참가합니다.'
              : raid.me.reward ? `순위 ${raid.me.reward.rank}/${raid.me.reward.of} · ${raidRewardText(raid.me.reward)} · ${applied ? '수령 완료' : '자동 지급 대기'}`
                : raid.me.confirmed ? '결과와 보상을 확인하고 있습니다.' : '이번 레이드 참여 기록이 없습니다.';
      const next = raidButton(raid); action = next.action;
      card.button.textContent = state.pending ? '요청 중…' : next.label;
      card.button.disabled = !next.action || state.connected === false || state.pending === true;
      card.button.setAttribute?.('aria-disabled', String(card.button.disabled));
      // Results have no claim control. The coordinator retries automatic grants.
      card.button.hidden = raid.phase === 'settled' || raid.phase === 'skipped';
      card.feedback.textContent = state.error ?? '';
    }
  };
}
