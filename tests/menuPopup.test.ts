import { describe, expect, it } from 'vitest';
import { mountPopup, progressResetSpec, enhanceSpec } from '../src/menu/popup.js';
import { MenuDoc } from './helpers/menuDom.js';

describe('pixel confirmation popup', () => {
  it('focuses primary, traps both Tab directions, resolves values and restores focus after a queued dialog', async () => {
    const doc = new MenuDoc(), host = doc.createElement('div'), origin = doc.createElement('button'); origin.focus();
    const popup = mountPopup(doc, host);
    const first = popup.open(progressResetSpec('reset'));
    const dialog = host.children[0]!; const buttons = dialog.find('btn');
    expect(dialog.attributes).toMatchObject({ role: 'dialog', 'aria-modal': 'true' });
    expect(popup.isOpen()).toBe(true); expect(doc.activeElement).toBe(buttons[1]);
    expect(dialog.key('Tab')).toBe(true); expect(doc.activeElement).toBe(buttons[0]);
    dialog.key('Tab', true); expect(doc.activeElement).toBe(buttons[1]);
    const second = popup.open(enhanceSpec('공허의 무기', 120, '실패 시 금화가 소모됩니다.'));
    expect(host.children[0]).toBe(dialog);
    buttons[1]!.click(); expect(await first).toBe('confirm');
    const next = host.children[0]!; expect(next).not.toBe(dialog); expect(doc.activeElement).toBe(next.find('btn')[1]);
    expect(next.key('Escape')).toBe(true); expect(await second).toBe('cancel');
    expect(popup.isOpen()).toBe(false); expect(host.children).toEqual([]); expect(doc.activeElement).toBe(origin);
  });
  it('uses cancel events/close without hanging promises and falls back to the last button', async () => {
    const doc = new MenuDoc(), host = doc.createElement('div'), popup = mountPopup(doc, host);
    const first = popup.open({ title: '알림', body: ['한 줄', '두 줄'], buttons: [{ label: '확인', value: 'ok' }] });
    popup.close(); expect(await first).toBe('ok');
    const next = popup.open(progressResetSpec('restore')); let prevented = false;
    host.children[0]!.oncancel?.({ preventDefault: () => { prevented = true; } });
    expect(prevented).toBe(true); expect(await next).toBe('cancel');
    expect(await popup.open({ title: '빈 알림', body: '', buttons: [], cancelValue: 'none' })).toBe('none');
    expect(popup.isOpen()).toBe(false);
  });
  it('dismisses one active spec while preserving the next popup and ignores detached controls', async () => {
    const doc = new MenuDoc(), host = doc.createElement('div'), origin = doc.createElement('button'); origin.focus();
    const popup = mountPopup(doc, host), stale = progressResetSpec('reset');
    const canceled = popup.open(stale), detached = host.children[0]!;
    const next = popup.open(enhanceSpec('장비', 120, '비용이 소모됩니다.'));
    popup.dismiss(stale); expect(await canceled).toBe('cancel');
    const active = host.children[0]!;
    expect(active.find('popup-title')[0]?.textContent).toBe('장비 강화');
    expect(doc.activeElement).toBe(active.find('popup-primary')[0]);
    detached.find('popup-primary')[0]!.click();
    expect(host.children[0]).toBe(active); expect(popup.isOpen()).toBe(true);
    popup.dismiss({ ...stale }); expect(host.children[0]).toBe(active);
    active.find('popup-primary')[0]!.click(); expect(await next).toBe('confirm'); expect(doc.activeElement).toBe(origin);
  });
  it('removes a queued spec without remounting or unfocusing the current dialog and retains later results', async () => {
    const doc = new MenuDoc(), host = doc.createElement('div'), origin = doc.createElement('button'); origin.focus();
    const popup = mountPopup(doc, host), stale = progressResetSpec('reset');
    const first = popup.open(enhanceSpec('장비', 120, '비용이 소모됩니다.'));
    const current = host.children[0]!, focused = doc.activeElement;
    const canceled = popup.open(stale);
    const result = popup.open({ title: '토벌 성공', body: '수령 완료', buttons: [{ label: '확인', value: 'ok', primary: true }] });
    popup.dismiss(stale); expect(await canceled).toBe('cancel');
    expect(host.children[0]).toBe(current); expect(doc.activeElement).toBe(focused);
    current.find('popup-primary')[0]!.click(); expect(await first).toBe('confirm');
    expect(host.children[0]!.find('popup-title')[0]?.textContent).toBe('토벌 성공');
    popup.close(); expect(await result).toBe('ok'); expect(doc.activeElement).toBe(origin);
  });
});
