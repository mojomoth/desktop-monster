import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SAVE } from '../src/core/save.js';
import { mountMenu } from '../src/menu/index.js';
import type { MenuBridge, MenuDocument, MenuElement } from '../src/menu/index.js';
import type { LeaderboardMetric, OpponentSummary, PvpResult } from '../src/shared/api.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

/** Same injected element contract as the v7 directory tests, without importing their test suite. */
class Element implements MenuElement {
  className = ''; textContent: string | null = null; hidden = false; disabled = false; value = '';
  width = 0; height = 0; children: Element[] = [];
  readonly attributes: Record<string, string> = {};
  private readonly listeners = new Map<string, (() => void)[]>();
  constructor(readonly doc: Document, readonly tag: string) {}
  append(...children: unknown[]): void { this.children.push(...children as Element[]); }
  replaceChildren(...children: unknown[]): void { this.children = children as Element[]; }
  addEventListener(type: 'click' | 'change', callback: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
  }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  focus(): void { if (!this.disabled) this.doc.activeElement = this; }
  emit(type: 'click' | 'change'): void { for (const callback of this.listeners.get(type) ?? []) callback(); }
  click(): void { if (!this.disabled) this.emit('click'); }
  getContext(): SpriteCanvas { return { fillStyle: '', fillRect() {} }; }
  all(): Element[] { return [this, ...this.children.flatMap(child => child.all())]; }
  find(className: string): Element[] { return this.all().filter(node => node.className.split(' ').includes(className)); }
}
class Document implements MenuDocument {
  activeElement: Element | null = null;
  private readonly ids = new Map<string, Element>();
  constructor() {
    for (const id of ['tab-roster', 'tab-ranking', 'tab-battle', 'roster', 'ranking', 'battle', 'rebirth', 'result',
      'name', 'battle-go', 'find', 'opponent', 'opponents', 'party', 'picks', 'auto', 'save-party', 'preview', 'thefts']) {
      this.ids.set(id, new Element(this, id.startsWith('tab-') || ['rebirth', 'battle-go', 'find', 'auto', 'save-party'].includes(id)
        ? 'button' : id === 'name' ? 'input' : 'div'));
    }
  }
  createElement(tag: string): Element { return new Element(this, tag); }
  querySelector(selector: string): Element | null { return this.ids.get(selector.slice(1)) ?? null; }
  el(id: string): Element { const element = this.ids.get(id); if (!element) throw Error(id); return element; }
}

const companions = [
  { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 10, stars: 1 },
  { id: 'c2', speciesId: 'dragon', bossIndex: 15, level: 20, stars: 2 },
];
const save = { ...DEFAULT_SAVE, companions, pvpParty: ['c1'] };
const opponents: OpponentSummary[] = [1, 2].map(index => ({
  playerId: `player-${index}`, name: `Knight${index}`, rank: index, bestIndex: index * 8,
  rebirths: index, wins: index + 2, losses: index,
  hero: { formId: 'h00', buffPercent: 0 }, party: [{ ...companions[0]!, id: `d${index}` }],
}));
const verdict = (opponent: OpponentSummary): PvpResult => ({
  bot: false, seed: 7, win: true, opponent, blows: [], lost: null,
  stolen: { ...companions[1]!, id: 's7' }, removed: ['c2'], record: { wins: 1, losses: 0 },
});
async function flush(): Promise<void> { for (let i = 0; i < 10; i++) await Promise.resolve(); }
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  return { promise: new Promise<T>(done => { resolve = done; }), resolve: value => resolve(value) };
}
function fixture() {
  const doc = new Document();
  let emit: (value: unknown) => void = () => {};
  const sendAction = vi.fn<MenuBridge['sendAction']>().mockResolvedValue(undefined);
  const direct = vi.fn<NonNullable<MenuBridge['battleOpponent']>>().mockImplementation(async id => ({
    ok: true, value: verdict(opponents.find(opponent => opponent.playerId === id)!),
  }));
  const match = vi.fn<MenuBridge['pvpMatch']>().mockResolvedValue({ ok: false, error: 'sync-required' });
  const legacyBattle = vi.fn<MenuBridge['pvp']>().mockResolvedValue({ ok: false, error: 'sync-required' });
  const directory = vi.fn<NonNullable<MenuBridge['pvpOpponents']>>().mockResolvedValue({ ok: true, value: { opponents } });
  const ranking = vi.fn<MenuBridge['getLeaderboard']>().mockImplementation(async (_n, metric = 'level') => ({
    ok: true, value: { metric, removed: ['c2'], me: null,
      top: [{ rank: 1, name: `Top-${metric}`, level: 20, wins: 7, losses: 2, bestIndex: 88, rebirths: 3 }] },
  }));
  const thefts = vi.fn<MenuBridge['thefts']>().mockResolvedValue({ ok: true, value: { thefts: [] } });
  const reclaim = vi.fn<MenuBridge['reclaim']>().mockResolvedValue({ ok: true, value: { companion: { ...companions[0]!, id: 'r7' } } });
  const api: MenuBridge = {
    reportMenuReady() {}, onStateChanged(callback) { emit = callback; return () => {}; }, sendAction,
    async getIdentity() { return { name: 'Player', playerId: 'me', online: true }; },
    async setName(name) { return { name, playerId: 'me', online: true }; },
    battleOpponent: direct, pvpOpponents: directory, pvpMatch: match, pvp: legacyBattle,
    getLeaderboard: ranking, thefts, reclaim,
  };
  mountMenu(doc, api); emit(save);
  const fight = (id: string): Element => {
    const row = doc.el('opponents').find('opponent-card').find(node => node.attributes['data-player-id'] === id);
    if (!row) throw Error(`Missing opponent ${id}`);
    return row.find('btn')[0]!;
  };
  const rankButton = (label: string): Element => {
    const button = doc.el('ranking').find('rank-tools')[0]?.children.find(node => node.textContent === label);
    if (!button) throw Error(`Missing ranking control ${label}`);
    return button;
  };
  return { doc, direct, match, legacyBattle, directory, ranking, sendAction, thefts, reclaim, fight, rankButton,
    emit: (value: unknown) => emit(value) };
}

describe('v0.9 direct opponent battle menu', () => {
  it('starts the clicked directory opponent immediately without requesting a preview or forwarding rewards', async () => {
    const f = fixture(); f.doc.el('tab-battle').click(); await flush();
    expect(f.doc.el('opponents').find('opponent-card')).toHaveLength(2);
    expect(f.direct).not.toHaveBeenCalled();
    const button = f.fight('player-2');
    expect(button.textContent).toBe('전투');
    expect(button.attributes['aria-label']).toContain('Knight2');
    button.click(); await flush();
    expect(f.direct).toHaveBeenCalledExactlyOnceWith('player-2');
    expect(f.match).not.toHaveBeenCalled();
    expect(f.legacyBattle).not.toHaveBeenCalled();
    expect(f.doc.el('opponent').find('mini')).toEqual([]);
    expect(f.doc.el('result').textContent).toContain('Knight2에게 승리');
    // The response contains both a stolen companion and removed IDs. Only main applies them.
    expect(f.sendAction).not.toHaveBeenCalled();
    expect(f.fight('player-2').attributes['aria-disabled']).toBe('true');
    f.fight('player-1').click();
    expect(f.direct).toHaveBeenCalledTimes(1);
  });

  it('locks repeat battle clicks and party controls through pending live-save rerenders, then unlocks on failure', async () => {
    const f = fixture(); const pending = deferred<Awaited<ReturnType<NonNullable<MenuBridge['battleOpponent']>>>>();
    f.direct.mockReturnValueOnce(pending.promise);
    f.doc.el('tab-battle').click(); await flush();
    const stalePick = f.doc.el('picks').find('pick')[1]!;
    const button = f.fight('player-1'); button.focus(); button.click(); button.click();
    f.fight('player-2').click();
    expect(f.direct).toHaveBeenCalledExactlyOnceWith('player-1');
    expect(f.fight('player-1')).toBe(button);
    expect(f.doc.activeElement).toBe(button);
    expect(button.textContent).toBe('전투 중…');
    for (const id of ['auto', 'save-party', 'find']) expect(f.doc.el(id).disabled).toBe(true);
    expect(f.doc.el('picks').find('pick').every(node => node.disabled)).toBe(true);
    // Also exercise handlers held before the rerender, not just native disabled behavior.
    stalePick.emit('click'); f.doc.el('auto').emit('click'); f.doc.el('save-party').emit('click');
    f.emit({ ...save, coins: 999 }); button.click();
    expect(f.direct).toHaveBeenCalledTimes(1);
    expect(f.sendAction).not.toHaveBeenCalled();
    pending.resolve({ ok: false, error: 'network' }); await flush();
    expect(button.attributes['aria-disabled']).toBe('false');
    expect(f.doc.el('auto').disabled).toBe(false);
    expect(f.doc.el('save-party').disabled).toBe(false);
    f.doc.el('save-party').click();
    expect(f.sendAction).toHaveBeenCalledExactlyOnceWith({ type: 'setPvpParty', ids: ['c1'] });
    expect(f.match).not.toHaveBeenCalled(); expect(f.legacyBattle).not.toHaveBeenCalled();
  });

  it('leaves successful reclaim application to main', async () => {
    const f = fixture();
    f.thefts.mockResolvedValueOnce({ ok: true, value: { thefts: [{
      id: 't7', companion: companions[0]!, transferredId: 's7', thiefId: 'player-1', thiefName: 'Knight1', at: 0, reclaimUntil: 86400000,
    }] } });
    f.doc.el('tab-battle').click(); await flush();
    const takeBack = f.doc.el('thefts').find('btn')[0]!;
    expect(takeBack.textContent).toBe('되찾기'); takeBack.click(); await flush();
    expect(f.reclaim).toHaveBeenCalledExactlyOnceWith('t7');
    expect(f.sendAction).not.toHaveBeenCalled();
  });
});

describe('v0.9 metric ranking controls', () => {
  it('defaults to level and sends independent refresh requests for all four metrics', async () => {
    const f = fixture(); f.doc.el('tab-ranking').click(); await flush();
    expect(f.ranking).toHaveBeenCalledExactlyOnceWith(undefined, 'level');
    const metrics: readonly [LeaderboardMetric, string][] = [
      ['level', '레벨'], ['pvpWins', 'PvP 승수'], ['bestIndex', '최고 단계'], ['rebirths', '환생'],
    ];
    for (const [metric, label] of metrics) {
      f.rankButton(label).click(); await flush();
      expect(f.ranking).toHaveBeenLastCalledWith(undefined, metric);
      expect(f.rankButton(label).attributes['aria-pressed']).toBe('true');
      expect(f.doc.el('ranking').find('name').map(node => node.textContent)).toEqual([`Top-${metric}`]);
      const before = f.ranking.mock.calls.length;
      f.rankButton('새로고침').click(); await flush();
      expect(f.ranking).toHaveBeenCalledTimes(before + 1);
      expect(f.ranking).toHaveBeenLastCalledWith(undefined, metric);
    }
    // Main already applied the removed IDs from every ranking response.
    expect(f.sendAction).not.toHaveBeenCalled();
  });

  it('ignores an older metric response after a newer tab request completes', async () => {
    const f = fixture(); const old = deferred<Awaited<ReturnType<MenuBridge['getLeaderboard']>>>();
    f.ranking.mockReturnValueOnce(old.promise);
    f.doc.el('tab-ranking').click(); await flush();
    f.rankButton('PvP 승수').click(); await flush();
    expect(f.doc.el('ranking').find('name').map(node => node.textContent)).toEqual(['Top-pvpWins']);
    old.resolve({ ok: true, value: { metric: 'level', removed: ['c1'], me: null,
      top: [{ rank: 1, name: 'StaleLevel', level: 999, bestIndex: 8, rebirths: 0 }] } });
    await flush();
    expect(f.doc.el('ranking').find('name').map(node => node.textContent)).toEqual(['Top-pvpWins']);
    expect(f.rankButton('PvP 승수').attributes['aria-pressed']).toBe('true');
    expect(f.sendAction).not.toHaveBeenCalled();
  });
});
