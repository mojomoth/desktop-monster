import type { MenuDocument, MenuElement } from './index.js';
import type { RaidLiveResponse, RaidReward, RaidBoss } from '../shared/api.js';
import { raidBossCanvas, raidRewardText, raidTime } from './raid.js';

export interface PopupSpec {
  title: string;
  body: string | string[];
  buttons: { label: string; value: string; primary?: boolean }[];
  cancelValue?: string;
  boss?: RaidBoss;
}
export interface PopupKeyEvent { key: string; shiftKey?: boolean; preventDefault(): void }

/** One native HTML dialog at a time, rendered with the game's pixel CSS. */
export function mountPopup(doc: MenuDocument, host: MenuElement): {
  open(spec: PopupSpec): Promise<string>; dismiss(spec: PopupSpec): void; close(): void; isOpen(): boolean;
} {
  type Entry = { spec: PopupSpec; resolve(value: string): void };
  const queue: Entry[] = [];
  let current: Entry | undefined;
  let dialog: MenuElement | undefined;
  let restore: MenuElement | null | undefined;
  const el = (tag: string, className: string, text = ''): MenuElement => {
    const node = doc.createElement(tag); node.className = className; node.textContent = text; return node;
  };
  const cancel = (spec: PopupSpec): string => spec.cancelValue ?? spec.buttons.at(-1)?.value ?? '';
  const finish = (value: string): void => {
    if (!current) return;
    const completed = current;
    current = undefined;
    dialog?.close?.();
    dialog = undefined;
    host.replaceChildren();
    completed.resolve(value);
    if (queue.length) show();
    else {
      (restore && !restore.disabled && restore.isConnected !== false ? restore : doc.querySelector('.tab.active'))?.focus?.();
      restore = undefined;
    }
  };
  const show = (): void => {
    current = queue.shift();
    if (!current) return;
    const entry = current;
    const { spec } = entry;
    const resolve = (value: string): void => { if (current === entry) finish(value); };
    dialog = el('dialog', 'popup');
    dialog.setAttribute?.('role', 'dialog');
    dialog.setAttribute?.('aria-modal', 'true');
    dialog.setAttribute?.('aria-label', spec.title);
    const content = el('div', 'popup-copy');
    for (const line of typeof spec.body === 'string' ? [spec.body] : spec.body) content.append(el('p', '', line));
    const controls = el('div', 'popup-actions');
    const buttons = spec.buttons.map((entry) => {
      const button = el('button', `btn${entry.primary ? ' popup-primary' : ''}`, entry.label);
      button.setAttribute?.('type', 'button');
      button.addEventListener('click', () => resolve(entry.value));
      controls.append(button); return button;
    });
    dialog.append(el('h2', 'popup-title', spec.title));
    if (spec.boss) {
      const art = el('div', 'popup-art'); art.append(raidBossCanvas(doc, spec.boss, false));
      dialog.append(el('p', 'popup-boss', spec.boss.name), art);
    }
    dialog.append(content, controls);
    dialog.oncancel = (event) => { event.preventDefault(); resolve(cancel(spec)); };
    dialog.onkeydown = (event) => {
      if (current !== entry) return;
      if (event.key === 'Escape') { event.preventDefault(); resolve(cancel(spec)); return; }
      if (event.key !== 'Tab' || !buttons.length) return;
      const index = buttons.indexOf(doc.activeElement ?? buttons[0]!);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus?.();
    };
    host.replaceChildren(dialog);
    dialog.showModal?.();
    (buttons[spec.buttons.findIndex(button => button.primary)] ?? buttons[0])?.focus?.();
  };
  return {
    open(spec) {
      if (!spec.buttons.length) return Promise.resolve(cancel(spec));
      if (!current) restore = doc.activeElement;
      return new Promise<string>((resolve) => { queue.push({ spec, resolve }); if (!current) show(); });
    },
    dismiss(spec) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i]?.spec === spec) queue.splice(i, 1)[0]!.resolve(cancel(spec));
      }
      if (current?.spec === spec) finish(cancel(spec));
    },
    close() { if (current) finish(cancel(current.spec)); },
    isOpen: () => current !== undefined,
  };
}

export function raidConfirmSpec(view: RaidLiveResponse): PopupSpec {
  return { title: '레이드 보스 출현', boss: view.raid.boss,
    body: [`참전 확인까지 ${raidTime((view.raid.confirmUntil ?? view.now) - view.now)}`, '참전 확인을 눌러야 이번 전투에 참가합니다.', '시간 안에 참여를 누르지 않으면 이번 전투에 참가하지 않습니다.'],
    buttons: [{ label: '나중에', value: 'cancel' }, { label: '참여', value: 'confirm', primary: true }], cancelValue: 'cancel' };
}
export function raidResultSpec(reward: RaidReward, applied = false, victory = true): PopupSpec {
  return { title: victory ? '레이드 토벌 성공!' : '레이드 도전 종료',
    body: [`기여도 순위 ${reward.rank} / ${reward.of}`, raidRewardText(reward),
      applied ? '보상이 자동으로 지급되었습니다.' : '보상을 자동으로 저장하고 있습니다. 연결이 복구되면 다시 시도합니다.'],
    buttons: [{ label: '확인', value: 'ok', primary: true }] };
}
export function progressResetSpec(kind: 'reset' | 'restore'): PopupSpec {
  return { title: kind === 'reset' ? '진행 초기화' : '진행 복원',
    body: kind === 'reset' ? '현재 진행을 백업하고 처음부터 시작합니다. 계정과 설정은 유지됩니다.' : '현재 진행을 백업한 뒤 선택한 시점으로 복원합니다.',
    buttons: [{ label: '취소', value: 'cancel' }, { label: kind === 'reset' ? '초기화' : '복원', value: 'confirm', primary: true }], cancelValue: 'cancel' };
}
export function enhanceSpec(item: string, cost: string | number, risk: string): PopupSpec {
  return { title: '장비 강화', body: [item, `비용 ${cost} G`, risk],
    buttons: [{ label: '취소', value: 'cancel' }, { label: '강화', value: 'confirm', primary: true }], cancelValue: 'cancel' };
}
