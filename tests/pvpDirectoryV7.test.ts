import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SAVE } from '../src/core/save.js';
import { heroForm } from '../src/core/hero.js';
import type { CollectionAction } from '../src/core/collection.js';
import { mountMenu } from '../src/menu/index.js';
import type { MenuBridge, MenuDocument, MenuElement } from '../src/menu/index.js';
import type { MatchResult, OpponentSummary, PvpResult } from '../src/shared/api.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';

beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterEach(() => { vi.restoreAllMocks(); });

/** Records DOM identity and detachment. Native Electron separately proves browser key handling. */
class Element implements MenuElement {
  className = '';
  textContent: string | null = null;
  hidden = false;
  disabled = false;
  value = '';
  width = 0;
  height = 0;
  children: Element[] = [];
  readonly attributes: Record<string, string> = {};
  readonly fills: string[] = [];
  private readonly clicks: Array<() => void> = [];
  constructor(readonly document: Document, readonly tag: string) {}
  append(...children: unknown[]): void { this.children.push(...children as Element[]); }
  contains(node: Element | null): boolean { return this === node || this.children.some(child => child.contains(node)); }
  replaceChildren(...children: unknown[]): void {
    if (this.children.some(child => child.contains(this.document.activeElement))) this.document.activeElement = null;
    this.children = children as Element[];
  }
  addEventListener(type: 'click' | 'change', listener: () => void): void { if (type === 'click') this.clicks.push(listener); }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  focus(): void { if (!this.disabled) this.document.activeElement = this; }
  click(): void { if (!this.disabled) this.clicks.forEach(listener => listener()); }
  getContext(): SpriteCanvas {
    const context: SpriteCanvas = { fillStyle: '', fillRect: () => { this.fills.push(String(context.fillStyle)); } };
    return context;
  }
  all(): Element[] { return [this, ...this.children.flatMap(child => child.all())]; }
  find(className: string): Element[] { return this.all().filter(node => node.className.split(' ').includes(className)); }
}
class Document implements MenuDocument {
  activeElement: Element | null = null;
  readonly body = new Element(this, 'body');
  private readonly ids = new Map<string, Element>();
  constructor() {
    for (const id of ['tab-roster', 'tab-ranking', 'tab-battle', 'roster', 'ranking', 'battle', 'rebirth', 'result',
      'name', 'battle-go', 'find', 'opponent', 'opponents', 'party', 'picks', 'auto', 'save-party', 'preview', 'thefts']) {
      const tag = id.startsWith('tab-') || ['rebirth', 'battle-go', 'find', 'auto', 'save-party'].includes(id) ? 'button' : id === 'name' ? 'input' : 'div';
      const element = new Element(this, tag);
      this.ids.set(id, element);
      this.body.append(element);
    }
  }
  createElement(tag: string): Element { return new Element(this, tag); }
  querySelector(selector: string): Element | null { return this.ids.get(selector.slice(1)) ?? null; }
  el(id: string): Element { const element = this.ids.get(id); if (!element) throw new Error(id); return element; }
  /** Browser-default behavior model: buttons participate in tab order and activate on Enter/Space. */
  key(key: 'Tab' | 'Enter' | ' ', shift = false): void {
    if (key !== 'Tab') { if (this.activeElement?.tag === 'button') this.activeElement.click(); return; }
    const buttons = this.body.all().filter(node => node.tag === 'button' && !node.hidden && !node.disabled);
    const index = buttons.indexOf(this.activeElement!);
    buttons[(index + (shift ? -1 : 1) + buttons.length) % buttons.length]?.focus();
  }
}

const mine = { id: 'mine', speciesId: 'dragon', bossIndex: 7, level: 10, stars: 1 };
const save = { ...DEFAULT_SAVE, companions: [mine], pvpParty: ['mine'] };
const directoryRows = (count: number): OpponentSummary[] => Array.from({ length: count }, (_, index) => ({
  playerId: `player-${index + 1}`, rank: index + 1, name: `Knight${index + 1}`, bestIndex: 8 * index,
  rebirths: index, wins: index + 2, losses: index,
  hero: { formId: index === 0 ? 'h00' : 'h41', buffPercent: 20 },
  party: ['slime', 'bat', 'ghost', 'golem', 'dragon'].map((speciesId, slot) => ({
    id: `p${index + 1}-c${slot}`, speciesId, bossIndex: 7 + 8 * slot, level: index + 11, stars: slot,
  })),
}));
const preview = (opponent: OpponentSummary): MatchResult => ({ matchId: `match-${opponent.playerId}`, seed: 1,
  bot: false, opponent, expiresAt: 120_000 });
const verdict = (opponent: OpponentSummary): PvpResult => ({ bot: false, seed: 1, win: true,
  opponent, blows: [], stolen: null, lost: null, removed: [] });
async function flush(): Promise<void> { for (let i = 0; i < 10; i++) await Promise.resolve(); }
function setup(opponents = directoryRows(2), online = true, rejectIdentity = false) {
  const doc = new Document();
  const actions: CollectionAction[] = [];
  let emit: (value: unknown) => void = () => undefined;
  let selected = opponents[0]!;
  const directory = vi.fn<NonNullable<MenuBridge['pvpOpponents']>>().mockResolvedValue({ ok: true, value: { opponents } });
  const match = vi.fn<MenuBridge['pvpMatch']>().mockImplementation(async id => {
    selected = opponents.find(opponent => opponent.playerId === id)!;
    return { ok: true, value: preview(selected) };
  });
  const battle = vi.fn<MenuBridge['pvp']>().mockImplementation(async () => ({ ok: true, value: verdict(selected) }));
  const bridge: MenuBridge = {
    reportMenuReady() {}, onStateChanged(listener) { emit = listener; return () => undefined; },
    async sendAction(action) { actions.push(action); },
    async getIdentity() {
      if (rejectIdentity) throw new Error('Identity IPC unavailable');
      return { name: 'Player', playerId: online ? 'me' : null, online };
    },
    async setName(name) { return { name, playerId: 'me', online }; },
    async getLeaderboard() { return { ok: true, value: { top: [], me: null, removed: [] } }; },
    pvpOpponents: directory, pvpMatch: match, pvp: battle,
    async thefts() { return { ok: true, value: { thefts: [] } }; },
    async reclaim() { return { ok: false, error: 'gone' }; },
  };
  mountMenu(doc, bridge);
  emit(save);
  doc.el('tab-battle').click();
  return { doc, actions, directory, match, battle, emit: (value: unknown) => emit(value) };
}
function row(doc: Document, id: string): Element {
  const element = doc.el('opponents').find('opponent-card').find(element => element.attributes['data-player-id'] === id);
  if (!element) throw new Error(`missing row ${id}`);
  return element;
}
const select = (doc: Document, id: string): Element => row(doc, id).find('btn')[0]!;
const texts = (element: Element, className: string): string[] => element.find(className).map(node => node.textContent ?? '');

describe('V07-04 opponent directory selection and focus', () => {
  it('renders all 50 ranked hero/party rows and preserves their buttons, art and keyboard focus across saves', async () => {
    const opponents = directoryRows(50);
    const { doc, emit, match } = setup(opponents);
    await flush();
    const rows = doc.el('opponents').find('opponent-card');
    expect(rows).toHaveLength(50);
    const buttons = rows.map(element => element.find('btn')[0]!);
    const portraits = rows.map(element => element.find('hero-art')[0]!);
    rows.forEach((element, index) => {
      expect(texts(element, 'name')[0]).toBe(`#${index + 1} Knight${index + 1}`);
      expect(texts(element, 'record')).toEqual([`${index + 2}승 ${index}패`]);
      expect(texts(element, 'opponent-hero-name')).toEqual([index === 0 ? '수습 영웅' : heroForm('h41')!.name]);
      expect(element.find('mini')).toHaveLength(5);
      expect(element.find('species')).toHaveLength(5);
      expect(new Set(portraits[index]!.fills).size).toBeGreaterThan(1);
      expect(buttons[index]!.tag).toBe('button');
      expect(buttons[index]!.attributes['aria-label']).toContain(`Knight${index + 1}`);
      expect(buttons[index]!.attributes['aria-pressed']).toBe('false');
    });
    buttons[16]!.focus();
    doc.key('Tab');
    expect(doc.activeElement).toBe(buttons[17]);
    doc.key('Tab', true);
    expect(doc.activeElement).toBe(buttons[16]);
    emit({ ...save, coins: 500, xp: 1 });
    expect(doc.el('opponents').find('opponent-card')).toEqual(rows);
    rows.forEach((element, index) => {
      expect(element.find('btn')[0]).toBe(buttons[index]);
      expect(element.find('hero-art')[0]).toBe(portraits[index]);
    });
    expect(doc.activeElement).toBe(buttons[16]);
    expect(match).not.toHaveBeenCalled();
  });

  it('reuses rows and restores the focused player after server order and record changes', async () => {
    const opponents = directoryRows(3);
    const { doc, directory } = setup(opponents);
    await flush();
    const selectedRow = row(doc, 'player-2');
    const button = select(doc, 'player-2');
    button.focus();
    directory.mockResolvedValueOnce({ ok: true, value: { opponents: [...opponents].reverse().map(opponent =>
      opponent.playerId === 'player-2' ? { ...opponent, wins: 99, rank: 1 } : opponent) } });
    doc.el('find').click();
    await flush();
    expect(doc.el('opponents').find('opponent-card').map(element => element.attributes['data-player-id']))
      .toEqual(['player-3', 'player-2', 'player-1']);
    expect(row(doc, 'player-2')).toBe(selectedRow);
    expect(select(doc, 'player-2')).toBe(button);
    expect(texts(selectedRow, 'record')).toEqual(['99승 1패']);
    expect(doc.activeElement).toBe(button);
  });

  it('binds native button activation to the exact ID, keeps focus while pending and battles the returned match', async () => {
    const opponents = directoryRows(2);
    const { doc, match, battle, actions, emit } = setup(opponents);
    await flush();
    let resolve: (result: Awaited<ReturnType<MenuBridge['pvpMatch']>>) => void = () => undefined;
    match.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const button = select(doc, 'player-2');
    button.focus();
    doc.key('Enter');
    await flush();
    expect(match).toHaveBeenCalledExactlyOnceWith('player-2');
    expect(row(doc, 'player-2').className).toContain('selected');
    expect(button.attributes['aria-pressed']).toBe('true');
    expect(button.attributes['aria-disabled']).toBe('true');
    expect(button.disabled).toBe(false);
    select(doc, 'player-1').click();
    doc.key(' ');
    emit({ ...save, killCount: 2 });
    expect(match).toHaveBeenCalledTimes(1);
    expect(doc.activeElement).toBe(button);
    resolve({ ok: true, value: preview(opponents[1]!) });
    await flush();
    expect(button.attributes['aria-disabled']).toBe('false');
    expect(doc.activeElement).toBe(button);
    expect(texts(doc.el('opponent'), 'name')[0]).toBe('Knight2');
    expect(doc.el('battle-go').disabled).toBe(false);
    battle.mockResolvedValueOnce({ ok: true, value: verdict(opponents[1]!) });
    doc.el('battle-go').click();
    await flush();
    expect(battle).toHaveBeenCalledExactlyOnceWith('match-player-2', ['mine']);
    expect(actions).toContainEqual(expect.objectContaining({ type: 'pvpResult', won: true }));
    expect(button.attributes['aria-pressed']).toBe('false');
  });

  it.each(['wrong-id', 'missing-id', 'bot'] as const)('rejects a %s specified preview even when the opponent name matches', async fault => {
    const opponents = directoryRows(2);
    const { doc, match, actions, battle } = setup(opponents);
    await flush();
    const response = preview(opponents[0]!);
    response.opponent = { ...response.opponent };
    if (fault === 'wrong-id') response.opponent.playerId = 'player-2';
    if (fault === 'missing-id') delete response.opponent.playerId;
    if (fault === 'bot') response.bot = true;
    match.mockResolvedValueOnce({ ok: true, value: response });
    select(doc, 'player-1').focus();
    doc.key(' ');
    await flush();
    expect(match).toHaveBeenCalledExactlyOnceWith('player-1');
    expect(texts(doc.el('opponent'), 'name')[0]).toContain('일치하지 않습니다');
    expect(doc.el('opponent').find('mini')).toHaveLength(0);
    expect(select(doc, 'player-1').attributes['aria-pressed']).toBe('false');
    expect(doc.el('battle-go').disabled).toBe(true);
    expect(doc.activeElement).toBe(doc.el('find'));
    doc.el('battle-go').click();
    expect(battle).not.toHaveBeenCalled();
    expect(actions).toEqual([]);
  });

  it.each(['removed', 'empty', 'error'] as const)('clears the selected preview and restores refresh focus after a directory %s response', async outcome => {
    const opponents = directoryRows(2);
    const { doc, match, directory } = setup(opponents);
    await flush();
    const stale = select(doc, 'player-1');
    stale.focus(); stale.click();
    await flush();
    expect(doc.el('battle-go').disabled).toBe(false);
    if (outcome === 'error') directory.mockRejectedValueOnce(new Error('network'));
    else directory.mockResolvedValueOnce({ ok: true, value: { opponents: outcome === 'empty' ? [] : [opponents[1]!] } });
    doc.el('find').click();
    await flush();
    expect(doc.el('battle-go').disabled).toBe(true);
    expect(doc.el('opponent').find('mini')).toHaveLength(0);
    expect(doc.activeElement).toBe(doc.el('find'));
    expect(doc.el('find').disabled).toBe(false);
    stale.click();
    expect(match).toHaveBeenCalledTimes(1);
    doc.el('find').click();
    await flush();
    expect(doc.el('opponents').find('opponent-card')).toHaveLength(2);
    stale.click();
    expect(match).toHaveBeenCalledTimes(1);
    expect(select(doc, 'player-1').attributes['aria-pressed']).toBe('false');
  });

  it('clears a previous preview on a rejected selection without falling back to a random match', async () => {
    const { doc, match } = setup();
    await flush();
    select(doc, 'player-1').click();
    await flush();
    match.mockRejectedValueOnce(new Error('offline'));
    select(doc, 'player-2').focus();
    doc.key('Enter');
    await flush();
    expect(match.mock.calls).toEqual([['player-1'], ['player-2']]);
    expect(doc.el('opponent').find('mini')).toHaveLength(0);
    expect(doc.el('battle-go').disabled).toBe(true);
    expect(doc.el('opponents').find('opponent-card').every(element => !element.className.includes('selected'))).toBe(true);
    expect(doc.activeElement).toBe(doc.el('find'));
  });

  it.each(['expired', 'network', 'wrong-result'] as const)('clears selection for %s battle failure and never forwards a mismatched result', async fault => {
    const opponents = directoryRows(2);
    const { doc, battle, actions } = setup(opponents);
    await flush();
    select(doc, 'player-1').click();
    await flush();
    if (fault === 'wrong-result') battle.mockResolvedValueOnce({ ok: true, value: { ...verdict(opponents[1]!), removed: ['mine'], stolen: mine } });
    else battle.mockResolvedValueOnce({ ok: false, error: fault });
    doc.el('battle-go').focus(); doc.el('battle-go').click();
    await flush();
    expect(actions).toEqual([]);
    expect(doc.el('opponent').find('mini')).toHaveLength(0);
    expect(doc.el('battle-go').disabled).toBe(true);
    expect(select(doc, 'player-1').attributes['aria-pressed']).toBe('false');
    expect(doc.activeElement).toBe(doc.el('find'));
  });

  it.each(['response', 'click', 'render', 'identity-promise'] as const)('rejects a locally expired preview at the %s boundary before sending any battle', async boundary => {
    const { doc, match, battle, actions, emit } = setup();
    await flush();
    if (boundary === 'response') vi.mocked(Date.now).mockReturnValue(120001);
    select(doc, 'player-1').click();
    await flush();
    expect(match).toHaveBeenCalledExactlyOnceWith('player-1');
    if (boundary !== 'response') {
      expect(doc.el('battle-go').disabled).toBe(false);
      if (boundary === 'identity-promise') {
        doc.el('battle-go').click();
        vi.mocked(Date.now).mockReturnValue(120001);
      } else {
        vi.mocked(Date.now).mockReturnValue(120001);
        if (boundary === 'render') emit(save);
        else doc.el('battle-go').click();
      }
      await flush();
    }
    expect(battle).not.toHaveBeenCalled();
    expect(actions).toEqual([]);
    expect(doc.el('opponent').find('mini')).toHaveLength(0);
    expect(doc.el('battle-go').disabled).toBe(true);
    expect(select(doc, 'player-1').attributes['aria-pressed']).toBe('false');
    expect(texts(doc.el('opponent'), 'name')).toContain('Opponent expired — find again');
  });

  it('accepts the server expiry boundary itself and expires only after it', async () => {
    const { doc, battle } = setup();
    await flush();
    select(doc, 'player-1').click();
    await flush();
    vi.mocked(Date.now).mockReturnValue(120000);
    doc.el('battle-go').click();
    await flush();
    expect(battle).toHaveBeenCalledExactlyOnceWith('match-player-1', ['mine']);
  });

  it('keeps offline and empty lists actionable without requesting a match', async () => {
    const offline = setup(directoryRows(1), false);
    await flush();
    expect(offline.directory).not.toHaveBeenCalled();
    expect(offline.match).not.toHaveBeenCalled();
    expect(texts(offline.doc.el('opponents'), 'muted')[0]).toContain('연결할 수 없습니다');
    expect(offline.doc.el('find').disabled).toBe(false);
    const empty = setup([]);
    await flush();
    expect(texts(empty.doc.el('opponents'), 'muted')[0]).toContain('아직 대전 상대가 없습니다');
    empty.doc.el('find').focus(); empty.doc.key('Enter');
    await flush();
    expect(empty.directory).toHaveBeenCalledTimes(2);
    expect(empty.match).not.toHaveBeenCalled();
    expect(empty.doc.activeElement).toBe(empty.doc.el('find'));
  });

  it('clears loading after identity IPC rejection and leaves refresh actionable', async () => {
    const { doc, directory, match, battle, actions } = setup(directoryRows(1), true, true);
    await flush();
    expect(texts(doc.el('opponents'), 'muted')[0]).toContain('연결할 수 없습니다');
    expect(doc.el('find').attributes['aria-disabled']).toBe('false');
    doc.el('find').click();
    await flush();
    expect(doc.el('find').attributes['aria-disabled']).toBe('false');
    expect(directory).not.toHaveBeenCalled();
    expect(match).not.toHaveBeenCalled();
    expect(battle).not.toHaveBeenCalled();
    expect(actions).toEqual([]);
  });
});
