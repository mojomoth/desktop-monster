import { describe, expect, it, vi } from 'vitest';
import { createEngine, DEFAULT_SAVE, HERO_FORMS, mulberry32 } from '../src/core/index.js';
import { newHeroProgress } from '../src/core/hero.js';
import type { LastBattleInfo } from '../src/shared/ipc.js';
import { mountShareUi } from '../src/menu/shareUi.js';
import type { ShareBridge } from '../src/menu/shareUi.js';

class Node {
  id = ''; textContent = ''; value = ''; hidden = false; disabled = false; type = '';
  width = 0; height = 0; open = false; removed = false;
  children: Node[] = [];
  words: string[] = [];
  events = new Map<string, ((event: { preventDefault(): void }) => void)[]>();
  constructor(readonly doc: FakeDocument, readonly tag: string) { doc.nodes.push(this); }
  append(...nodes: Node[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: Node[]) { this.children = nodes; }
  setAttribute() {}
  remove() { this.removed = true; }
  focus() { this.doc.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  addEventListener(type: string, callback: (event: { preventDefault(): void }) => void) { this.events.set(type, [...(this.events.get(type) ?? []), callback]); }
  removeEventListener(type: string, callback: (event: { preventDefault(): void }) => void) { this.events.set(type, (this.events.get(type) ?? []).filter(fn => fn !== callback)); }
  emit(type: string) { for (const fn of this.events.get(type) ?? []) fn({ preventDefault() {} }); }
  click() { if (!this.disabled) this.emit('click'); }
  getContext() {
    return { fillStyle: '', font: '', textAlign: '', textBaseline: '', imageSmoothingEnabled: true,
      fillRect: (x: number, y: number, w: number) => { if (x === 0 && y === 0 && w === 1200) this.words.length = 0; },
      fillText: (word: string) => { this.words.push(word); }, measureText: (word: string) => ({ width: word.length * 18 }), drawImage() {} };
  }
  toDataURL(type: string) { return `data:${type};base64,UE5H`; }
}
class FakeDocument {
  nodes: Node[] = []; activeElement: Node | null = null;
  head = new Node(this, 'head'); body = new Node(this, 'body');
  createElement(tag: string) { return new Node(this, tag); }
  getElementById(id: string) { return this.nodes.find(node => node.id === id && !node.removed) ?? null; }
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
const save = () => createEngine(DEFAULT_SAVE, mulberry32(1)).toSave();
function fixture() {
  const doc = new FakeDocument();
  const opener = doc.createElement('button'); opener.id = 'share-open'; doc.body.append(opener);
  let listener: (save: unknown) => void = () => {};
  const unsubscribe = vi.fn();
  const api: ShareBridge = {
    onStateChanged: vi.fn(cb => { listener = cb; return unsubscribe; }),
    reportMenuReady: vi.fn(), getFieldImage: vi.fn(async () => null), getLastBattle: vi.fn(async () => null),
    exportPng: vi.fn(async () => ({ ok: true })),
  };
  const dispose = mountShareUi(doc as unknown as Document, api, { loadImage: async () => ({} as CanvasImageSource) });
  const node = (id: string): Node => { const found = doc.getElementById(id); if (!found) throw new Error(id); return found; };
  return { doc, opener, api, dispose, unsubscribe, node, emit: (state: unknown) => listener(state) };
}

describe('v0.9 share dialog', () => {
  it('freezes each opening while live saves update and reuses one subscription', async () => {
    const f = fixture();
    expect(f.opener.disabled).toBe(true);
    f.emit({ ...save(), level: 12 }); f.opener.click(); await flush();
    expect(f.node('share-dialog').open).toBe(true);
    expect(f.node('share-preview').words).toContain('Lv.12 · 환생 0회');
    f.emit({ ...save(), level: 99 });
    expect(f.node('share-preview').words).toContain('Lv.12 · 환생 0회');
    f.node('share-dialog').emit('cancel');
    expect(f.node('share-dialog').open).toBe(false);
    expect(f.doc.activeElement).toBe(f.opener);
    f.opener.click(); await flush();
    expect(f.node('share-preview').words).toContain('Lv.99 · 환생 0회');
    expect(f.api.onStateChanged).toHaveBeenCalledTimes(1);
    f.dispose();
    expect(f.unsubscribe).toHaveBeenCalledTimes(1);
    expect(f.doc.getElementById('share-dialog')).toBeNull();
    expect(f.doc.getElementById('share-style')).toBeNull();
  });

  it('displays empty and failed media states and exports only a valid preview', async () => {
    const f = fixture(); f.emit(save()); f.opener.click(); await flush();
    const kind = f.node('share-kind');
    for (const [value, message] of [['companion', '아직 함께하는 동료가 없습니다.'], ['field', '현재 전투 장면이 없습니다.'], ['pvp', '아직 저장된 대전이 없습니다.']]) {
      kind.value = value!; kind.emit('change');
      expect(f.node('share-status').textContent).toBe(message);
      expect(f.node('share-save').disabled).toBe(true);
    }
    f.node('share-close').click();
    vi.mocked(f.api.getFieldImage).mockRejectedValueOnce(new Error('capture'));
    f.opener.click(); await flush(); kind.value = 'field'; kind.emit('change');
    expect(f.node('share-status').textContent).toContain('가져오지 못했습니다');
    expect(f.api.exportPng).not.toHaveBeenCalled();
    f.dispose();
  });

  it('pages acquired codex entries and uses the selected companion', async () => {
    const f = fixture();
    const state = { ...save(), hero: { ...newHeroProgress(), collection: HERO_FORMS.slice(0, 13).map(form => ({ formId: form.id, buffPercent: 10 })) },
      companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }, { id: 'c2', speciesId: 'dragon', bossIndex: 15, level: 3, stars: 1 }] };
    f.emit(state); f.opener.click(); await flush();
    const kind = f.node('share-kind'); kind.value = 'codex'; kind.emit('change');
    expect(f.node('share-page').textContent).toBe('1 / 2');
    f.node('share-next').click(); expect(f.node('share-page').textContent).toBe('2 / 2');
    expect(f.node('share-preview').words).toContain(HERO_FORMS[12]!.name);
    f.node('share-previous').click(); expect(f.node('share-page').textContent).toBe('1 / 2');
    kind.value = 'companion'; kind.emit('change');
    const select = f.node('share-companion'); select.value = 'c2'; select.emit('change');
    expect(f.node('share-preview').words).toContain('Dragon');
    expect(f.node('share-preview').words).not.toContain('c2');
    f.dispose();
  });

  it('serializes export clicks and reports file cancellation, failure and clipboard success', async () => {
    const f = fixture(); f.emit(save()); f.opener.click(); await flush();
    let finish!: (result: { ok: boolean; canceled: boolean }) => void;
    vi.mocked(f.api.exportPng).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    f.node('share-save').click(); f.node('share-save').click();
    expect(f.api.exportPng).toHaveBeenCalledTimes(1);
    expect(f.node('share-kind').disabled).toBe(true);
    finish({ ok: false, canceled: true }); await flush();
    expect(f.node('share-status').textContent).toBe('저장을 취소했습니다.');
    vi.mocked(f.api.exportPng).mockResolvedValueOnce({ ok: false, error: 'disk' });
    f.node('share-save').click(); await flush(); expect(f.node('share-status').textContent).toContain('파일을 저장하지 못했습니다');
    f.node('share-copy').click(); await flush();
    expect(f.api.exportPng).toHaveBeenLastCalledWith({ dataUrl: 'data:image/png;base64,UE5H', destination: 'clipboard', name: 'DesMon-hero' });
    expect(f.node('share-status').textContent).toContain('이미지를 복사했습니다');
    f.dispose();
  });

  it('uses the persisted prebattle roster and verdict rather than current progress', async () => {
    const f = fixture();
    const before = { ...save(), level: 12, companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 7, level: 2, stars: 0 }] };
    const last: LastBattleInfo = { at: 1, before, result: { bot: false, seed: 1, win: true, stolen: null, lost: null, removed: [],
      opponent: { playerId: 'never-share-this', name: 'PrivateRival', bestIndex: 7, rebirths: 0, party: [{ id: 'r1', speciesId: 'bat', bossIndex: 7, level: 1, stars: 0 }] },
      blows: [{ side: 'A', actorId: 'c1', targetId: 'r1', damage: '1', ko: true }] } };
    vi.mocked(f.api.getLastBattle).mockResolvedValueOnce(last);
    f.emit({ ...save(), level: 99 }); f.opener.click(); await flush();
    const kind = f.node('share-kind'); kind.value = 'pvp'; kind.emit('change');
    const words = f.node('share-preview').words.join(' ');
    expect(words).toContain('Lv.12'); expect(words).toContain('VICTORY');
    expect(words).not.toContain('Lv.99'); expect(words).not.toContain('PrivateRival'); expect(words).not.toContain('never-share-this');
    expect(f.node('share-save').disabled).toBe(false);
    f.dispose();
  });

  it('ignores a pending media response after close instead of replacing the next snapshot', async () => {
    const f = fixture();
    let finish!: (data: string | null) => void;
    vi.mocked(f.api.getFieldImage).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    f.emit({ ...save(), level: 12 }); f.opener.click(); f.node('share-close').click();
    f.emit({ ...save(), level: 99 }); f.opener.click(); await flush();
    finish('data:image/png;base64,UE5H'); await flush();
    expect(f.node('share-preview').words).toContain('Lv.99 · 환생 0회');
    const kind = f.node('share-kind'); kind.value = 'field'; kind.emit('change');
    expect(f.node('share-save').disabled).toBe(true);
    f.dispose();
  });
});
