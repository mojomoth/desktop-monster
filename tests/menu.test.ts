// T48/T49 — Collection & Battle menu page (SPEC F54/F55; GAME_DESIGN_V2 §9).
// view.ts is pure data, index.ts is DOM-free by injection: these tests drive
// mountMenu with a recording fake document and a fake preload bridge, exactly
// as the real `document` and `window.desmon` drive it in the menu window.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterEach(() => { vi.restoreAllMocks(); });
import { DEFAULT_SAVE, parseSave, createEngine, mulberry32, HERO_MIN_LEVEL } from '../src/core/index.js';
import type { CollectionAction, SaveFile } from '../src/core/index.js';
import type {
  Companion,
  IdentityPayload,
  LeaderboardResult,
  MatchResult,
  NetResult,
  PvpResult,
  ReclaimResult,
  Theft,
  TheftsResult,
  WireBlow,
} from '../src/shared/api.js';
import { monsterSprites, paletteForTier } from '../src/renderer/sprites/index.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';
import { mountMenu } from '../src/menu/index.js';
import { heroBuffText, heroCanvas, SILHOUETTE_COLOR } from '../src/menu/hero.js';
import { newProgress } from '../src/core/progress.js';
import { HERO_FORMS, heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';
import type { MenuBridge, MenuDocument, MenuElement } from '../src/menu/index.js';
import {
  battleEnabled,
  canRebirth,
  consumeTargets,
  fuseCandidates,
  leaderboardRows,
  opponentRows,
  partyPreview,
  pvpResultText,
  rosterRows,
  theftRows,
  togglePick,
} from '../src/menu/view.js';

/** Recording stand-in for a DOM element; a real element satisfies the same shape. */
class FakeEl {
  className = '';
  textContent: string | null = null;
  hidden = false;
  disabled = false;
  value = '';
  width = 0;
  height = 0;
  open = false;
  children: FakeEl[] = [];
  /** Every color drawSprite painted into this canvas. */
  readonly fills: string[] = [];
  readonly pixels: Array<{ x: number; y: number; w: number; h: number }> = [];
  readonly attributes: Record<string, string> = {};
  private readonly listeners: Array<() => void> = [];
  private readonly changed: Array<() => void> = [];

  constructor(readonly tag: string) {}

  append(...children: unknown[]): void {
    for (const child of children) {
      this.children.push(child as FakeEl);
    }
  }

  replaceChildren(...children: unknown[]): void {
    this.children = children.map((child) => child as FakeEl);
  }

  addEventListener(type: 'click' | 'change', listener: () => void): void {
    (type === 'change' ? this.changed : this.listeners).push(listener);
  }

  setAttribute(name: string, value: string): void { this.attributes[name] = value; }

  getContext(): SpriteCanvas {
    const ctx: SpriteCanvas = {
      fillStyle: '',
      fillRect: (x, y, w, h): void => {
        this.fills.push(String(ctx.fillStyle));
        this.pixels.push({ x, y, w, h });
      },
    };
    return ctx;
  }

  /** Fire the click listeners — a disabled button never has any. */
  click(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  /** Type `text` into the field and fire its change listeners. */
  type(text: string): void {
    this.value = text;
    for (const listener of [...this.changed]) {
      listener();
    }
  }

  /** This element and every descendant carrying `className`, in tree order. */
  find(className: string): FakeEl[] {
    const self = this.className.split(' ').includes(className) ? [this] : [];
    return this.children.reduce<FakeEl[]>((all, child) => all.concat(child.find(className)), self);
  }
}

/** The markup of static/menu.html, reduced to the ids mountMenu looks up. */
class FakeDoc implements MenuDocument {
  readonly created: FakeEl[] = [];
  private readonly byId = new Map<string, FakeEl>();

  constructor(v4 = false) {
    for (const id of ['tab-roster', 'tab-ranking', 'tab-battle'].concat(v4 ? ['tab-hero', 'hero', 'opponents',
      'save-status', 'tab-shop', 'shop', 'tab-codex', 'codex', 'tab-profile', 'profile', 'profile-stats', 'name-status', 'save-name'] : []).concat([
      'roster',
      'ranking',
      'battle',
      'rebirth',
      'result',
      'name',
      'battle-go',
      'find',
      'opponent',
      'party',
      'picks',
      'auto',
      'save-party',
      'preview',
      'thefts',
    ])) {
      this.byId.set(`#${id}`, new FakeEl('div'));
    }
  }

  createElement(tag: string): MenuElement {
    const el = new FakeEl(tag);
    this.created.push(el);
    return el;
  }

  querySelector(selectors: string): MenuElement | null {
    return this.byId.get(selectors) ?? null;
  }

  el(id: string): FakeEl {
    const el = this.byId.get(`#${id}`);
    if (!el) throw new Error(`no #${id} in the fake document`);
    return el;
  }
}

/** What main would answer; every test may override one leg of it. */
interface NetState {
  identity: IdentityPayload;
  leaderboard: NetResult<LeaderboardResult>;
  match: NetResult<MatchResult>;
  pvp: NetResult<PvpResult>;
  thefts: NetResult<TheftsResult>;
  reclaim: NetResult<ReclaimResult>;
}

interface FakeBridge {
  bridge: MenuBridge;
  actions: CollectionAction[];
  /** Every bridge call that would have reached main, in order. */
  calls: string[];
  readyCount(): number;
  /** Deliver one desmon:state-changed payload. */
  emit(save: unknown): void;
}

const ONLINE: IdentityPayload = { name: 'Knight-ab12', playerId: 'p1', online: true };
const OFFLINE: IdentityPayload = { name: 'Knight-ab12', playerId: null, online: false };

const TOP = [
  { rank: 1, name: 'Ada', bestIndex: 79, rebirths: 2 },
  { rank: 2, name: 'Bo', bestIndex: 40, rebirths: 0 },
];
const ME = { rank: 12, name: 'Knight-ab12', bestIndex: 7, rebirths: 0 };
const OPPONENT = { name: 'Bo', bestIndex: 40, rebirths: 0, party: [] };
const STOLEN = { id: 's7', speciesId: 'dragon', bossIndex: 79, level: 10, stars: 1 };
const LOST_ONE = { id: 'c1', speciesId: 'slime', bossIndex: 15, level: 4, stars: 1 };
const WON: PvpResult = {
  bot: false,
  seed: 7,
  win: true,
  opponent: OPPONENT,
  blows: [],
  stolen: STOLEN,
  lost: null,
  removed: [],
};
const LOST: PvpResult = { ...WON, seed: 8, win: false, stolen: null, lost: LOST_ONE };

// Opponent party: golem is size 3 (back), slime size 1 (front) — so the FRONT
// member's type is water, whatever order the server sent the party in.
const OPP_GOLEM = { id: 'o2', speciesId: 'golem', bossIndex: 55, level: 2, stars: 1 };
const OPP_PARTY = [
  { id: 'o1', speciesId: 'slime', bossIndex: 15, level: 4, stars: 1 },
  OPP_GOLEM,
];
const MATCH: MatchResult = {
  matchId: 'm1',
  seed: 3,
  bot: false,
  opponent: { name: 'Bo', bestIndex: 40, rebirths: 0, party: OPP_PARTY },
  expiresAt: 120_000,
};
// The deterministic replay the server hands back with a v3 verdict (F66).
const BLOWS: WireBlow[] = [
  { side: 'A', actorId: 'c2', targetId: 'o1', damage: '623920', ko: true },
  { side: 'D', actorId: 'o2', targetId: 'c2', damage: '12', ko: false },
];
/** A win against the previewed MATCH opponent, with its replay and a steal. */
const REPLAY_WON: PvpResult = {
  ...WON,
  opponent: MATCH.opponent,
  blows: BLOWS,
  removed: ['c3'],
};
/** What `reclaim` hands back — the server already re-id'd it. */
const RECLAIMED: Companion = { id: 'r5', speciesId: 'slime', bossIndex: 15, level: 4, stars: 1 };
const NOW = 1_000_000;
const THEFT: Theft = {
  id: 't1',
  companion: LOST_ONE,
  transferredId: 's9',
  thiefId: 'p2',
  thiefName: 'Ada',
  at: NOW - 3_600_000,
  reclaimUntil: NOW + 2 * 3_600_000 + 30 * 60_000,
};

function makeBridge(net: Partial<NetState> = {}): FakeBridge {
  const actions: CollectionAction[] = [];
  const calls: string[] = [];
  let ready = 0;
  let listener: ((save: unknown) => void) | null = null;
  let identity = net.identity ?? ONLINE;
  return {
    actions,
    calls,
    readyCount: () => ready,
    emit(save): void {
      listener?.(save);
    },
    bridge: {
      reportMenuReady(): void {
        ready += 1;
      },
      onStateChanged(cb): () => void {
        listener = cb;
        return (): void => {
          listener = null;
        };
      },
      sendAction(a): Promise<void> {
        actions.push(a);
        return Promise.resolve();
      },
      getIdentity(): Promise<IdentityPayload> {
        calls.push('getIdentity');
        return Promise.resolve(identity);
      },
      setName(name): Promise<IdentityPayload> {
        // Main validates and answers with the identity it kept; the fake
        // simply echoes, so the field shows what the page actually sent.
        calls.push(`setName:${name}`);
        identity = { ...identity, name };
        return Promise.resolve(identity);
      },
      getLeaderboard(): Promise<NetResult<LeaderboardResult>> {
        calls.push('getLeaderboard');
        return Promise.resolve(
          net.leaderboard ?? { ok: true, value: { top: TOP, me: ME, removed: [] } },
        );
      },
      pvpMatch(): Promise<NetResult<MatchResult>> {
        calls.push('pvpMatch');
        return Promise.resolve(net.match ?? { ok: true, value: MATCH });
      },
      pvp(matchId, party): Promise<NetResult<PvpResult>> {
        // The match id and the picked party are what step 2 must carry.
        calls.push(`pvp:${matchId}:${party.join(',')}`);
        return Promise.resolve(net.pvp ?? { ok: true, value: WON });
      },
      thefts(): Promise<NetResult<TheftsResult>> {
        calls.push('thefts');
        return Promise.resolve(net.thefts ?? { ok: true, value: { thefts: [] } });
      },
      reclaim(theftId): Promise<NetResult<ReclaimResult>> {
        calls.push(`reclaim:${theftId}`);
        return Promise.resolve(net.reclaim ?? { ok: true, value: { companion: RECLAIMED } });
      },
    },
  };
}

/** Let the page's promise chains (identity → network → render) settle. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
};

/** The text of every `.className` element inside the panel, in tree order. */
const texts = (el: FakeEl, className: string): (string | null)[] =>
  el.find(className).map((child) => child.textContent);

// Powers: c2 = 623920, c3 = 4356, c1 = 32 (companionPower, exact bigint).
// c1 and c3 are the only same-species + same-stars pair.
const COMPANIONS = [
  { id: 'c1', speciesId: 'slime', bossIndex: 15, level: 4, stars: 1 },
  { id: 'c2', speciesId: 'dragon', bossIndex: 79, level: 10, stars: 1 },
  { id: 'c3', speciesId: 'slime', bossIndex: 55, level: 2, stars: 1 },
];

const saveWith = (companions: unknown, monsterIndex = 0): SaveFile =>
  parseSave({ ...DEFAULT_SAVE, companions, monsterIndex });

/** Mount a fresh page already showing `save`. */
function mounted(
  save: SaveFile = saveWith(COMPANIONS),
  net: Partial<NetState> = {},
): { doc: FakeDoc; fake: FakeBridge } {
  const doc = new FakeDoc();
  const fake = makeBridge(net);
  mountMenu(doc, fake.bridge);
  fake.emit(save);
  return { doc, fake };
}

/** The `n`-th button of the `card`-th roster card (re-queried after each render). */
function button(doc: FakeDoc, card: number, n: number): FakeEl {
  const el = doc.el('roster').find('card')[card]?.find('btn')[n];
  if (!el) throw new Error(`no button ${String(n)} on card ${String(card)}`);
  return el;
}

/** The `n`-th `.btn` (or `.pick`) inside a panel, re-queried after a render. */
function child(el: FakeEl, className: string, n: number): FakeEl {
  const found = el.find(className)[n];
  if (!found) throw new Error(`no .${className} ${String(n)}`);
  return found;
}

describe('menu view-model', () => {
  it('rosterRows lists companions with power in letter-suffix format sorted by power', () => {
    const rows = rosterRows(saveWith(COMPANIONS));
    expect(rows.map((r) => r.id)).toEqual(['c2', 'c3', 'c1']);
    expect(rows.map((r) => r.power)).toEqual(['623A', '4.35A', '32']);
    expect(rows[0]).toMatchObject({ name: 'Dragon Lv 10', starText: '★×1', maxLevel: true });
    expect(rows[2]).toMatchObject({ name: 'Slime Lv 4', maxLevel: false });
  });

  it('fuse candidates are pairs of the same species and stars', () => {
    expect(fuseCandidates(saveWith(COMPANIONS))).toEqual([['c1', 'c3']]);
    const restarred = COMPANIONS.map((c) => (c.id === 'c3' ? { ...c, stars: 2 } : c));
    expect(fuseCandidates(saveWith(restarred))).toEqual([]);
    expect(consumeTargets(saveWith(COMPANIONS), 'c1')).toEqual(['c2', 'c3']);
    expect(consumeTargets(saveWith(COMPANIONS), 'nobody')).toEqual([]);
  });

  it('excludes companion growth that would overflow without hiding safe boundary growth', () => {
    const food = { ...COMPANIONS[0]!, stars: 0 };
    const target = { ...COMPANIONS[1]!, level: Number.MAX_SAFE_INTEGER };
    expect(consumeTargets(saveWith([food, target]), food.id)).toEqual([]);
    expect(consumeTargets(saveWith([food, { ...target, level: Number.MAX_SAFE_INTEGER - 1 }]), food.id)).toEqual([target.id]);
    const twins = COMPANIONS.filter(c => c.speciesId === 'slime').map(c => ({ ...c, stars: Number.MAX_SAFE_INTEGER }));
    expect(fuseCandidates({ ...DEFAULT_SAVE, companions: twins })).toEqual([]);
  });
});

describe('menu page', () => {
  it('rebirth button is enabled only from monster index 40', () => {
    const { doc, fake } = mounted(saveWith(COMPANIONS, 39));
    expect(canRebirth(saveWith(COMPANIONS, 39))).toBe(false);
    expect(doc.el('rebirth').disabled).toBe(true);
    doc.el('rebirth').click();
    expect(fake.actions).toEqual([]);

    fake.emit(saveWith(COMPANIONS, 40));
    expect(doc.el('rebirth').disabled).toBe(false);
    doc.el('rebirth').click();
    expect(fake.actions).toEqual([{ type: 'rebirth' }]);
  });

  it('menu page paints each companion card with the species sprite', () => {
    const { doc } = mounted();
    // Roster cards only — the Battle tab paints the same art in its minis.
    const canvases = doc.el('roster').find('species');
    expect(canvases).toHaveLength(3);
    for (const canvas of canvases) {
      expect(canvas.className).toBe('species');
      expect([canvas.width, canvas.height]).toEqual([20, 17]);
      expect(canvas.fills.length).toBeGreaterThan(0);
    }
    // The strongest card is the dragon, painted with its 1-star tier palette.
    const idle = monsterSprites.dragon.idle;
    const tinted = new Set(Object.values(paletteForTier(idle.palette, 1)));
    const plain = new Set(Object.values(idle.palette));
    const dragon = canvases[0]?.fills ?? [];
    expect(dragon.every((color) => tinted.has(color))).toBe(true);
    expect(dragon.some((color) => !plain.has(color))).toBe(true);
  });

  it('menu page reports ready and renders every state-changed save', () => {
    const doc = new FakeDoc();
    const fake = makeBridge();
    mountMenu(doc, fake.bridge);
    expect(fake.readyCount()).toBe(1);
    expect(doc.el('roster').find('card')).toHaveLength(0);

    fake.emit(saveWith(COMPANIONS));
    expect(doc.el('roster').find('name').map((el) => el.textContent)).toEqual([
      'Dragon Lv 10',
      'Slime Lv 2',
      'Slime Lv 4',
    ]);
    expect(doc.el('roster').find('power').map((el) => el.textContent)).toEqual([
      '623A',
      '4.35A',
      '32',
    ]);
    expect(doc.el('roster').find('stars').map((el) => el.textContent)).toEqual([
      '★×1',
      '★×1',
      '★×1',
    ]);

    fake.emit(saveWith([COMPANIONS[1]]));
    expect(doc.el('roster').find('card')).toHaveLength(1);
  });

  it('card buttons send consume, fuse, reincarnate and sacrifice actions', () => {
    const { doc, fake } = mounted();
    // Reincarnate needs Lv10 or higher: only this dragon is eligible.
    expect(button(doc, 0, 2).disabled).toBe(false);
    expect(button(doc, 1, 2).disabled).toBe(true);

    button(doc, 0, 0).click(); // Consume on the dragon: pick it as the target
    expect(doc.el('result').textContent).toBe('Pick a companion to feed to Dragon Lv 10.');
    expect(button(doc, 0, 0).textContent).toBe('Cancel');
    button(doc, 1, 0).click(); // feed it the 2-star slime
    expect(fake.actions).toEqual([{ type: 'consume', targetId: 'c2', foodId: 'c3' }]);

    button(doc, 2, 1).click(); // Fuse on c1: only its slime twin may answer
    expect(button(doc, 0, 1).disabled).toBe(true);
    expect(button(doc, 1, 1).disabled).toBe(false);
    button(doc, 1, 1).click();
    button(doc, 0, 2).click();
    expect(fake.actions).toHaveLength(2);
    child(child(doc.el('roster'), 'reincarnation-confirmation', 0), 'btn', 0).click();
    button(doc, 2, 3).click();
    expect(fake.actions.slice(1)).toEqual([
      { type: 'fuse', aId: 'c1', bId: 'c3' },
      { type: 'reincarnate', id: 'c2', expected: { speciesId: 'dragon', bossIndex: 79, level: 10, stars: 1 } },
      { type: 'sacrifice', id: 'c1' },
    ]);
  });

  it('tabs show one panel at a time', () => {
    const { doc } = mounted();
    doc.el('tab-battle').click();
    expect(doc.el('battle').hidden).toBe(false);
    expect(doc.el('roster').hidden).toBe(true);
    expect(doc.el('tab-battle').className).toBe('tab active');
    expect(doc.el('tab-roster').className).toBe('tab');
  });
});

describe('v0.7 companion reincarnation confirmation', () => {
  const companion = { id: 'c1', speciesId: 'dragon', bossIndex: 7, level: 10, stars: 2 };
  const confirmation = (doc: FakeDoc): FakeEl => child(doc.el('roster'), 'reincarnation-confirmation', 0);

  it.each([10, 11, 250, Number.MAX_SAFE_INTEGER])('previews Lv%s and sends its exact snapshot only after confirmation', (level) => {
    const { doc, fake } = mounted(saveWith([{ ...companion, level }]));
    expect(button(doc, 0, 2).disabled).toBe(false);
    button(doc, 0, 2).click();
    expect(fake.actions).toEqual([]);
    const panel = confirmation(doc);
    expect(texts(panel, 'reincarnation-result')).toEqual([`Dragon Lv ${level} · Lv.${level} → Lv.1 · ★2 → ★3`]);
    const power = child(panel, 'reincarnation-power', 0);
    expect(power.attributes['title']).toBe(`${4n * BigInt(level)} → 8`);
    expect(power.attributes['aria-label']).toBe(`기본 힘 ${4n * BigInt(level)}에서 8로 변경`);
    expect(texts(panel, 'muted')).toEqual(['환생하면 레벨이 초기화되어 기본 힘이 감소합니다.']);
    const confirm = child(panel, 'btn', 0);
    confirm.click();
    confirm.click();
    expect(fake.actions).toEqual([{ type: 'reincarnate', id: companion.id,
      expected: { speciesId: 'dragon', bossIndex: 7, level, stars: 2 } }]);
    expect(doc.el('roster').find('reincarnation-confirmation')).toEqual([]);
  });

  it('preserves the mounted confirmation during unrelated save changes', () => {
    const save = saveWith([companion]);
    const { doc, fake } = mounted(save);
    button(doc, 0, 2).click();
    const panel = confirmation(doc);
    const confirm = child(panel, 'btn', 0);
    fake.emit({ ...save, coins: 123, killCount: 5, xp: 1 });
    expect(confirmation(doc)).toBe(panel);
    expect(child(confirmation(doc), 'btn', 0)).toBe(confirm);
    expect(fake.actions).toEqual([]);
    confirm.click();
    expect(fake.actions).toHaveLength(1);
  });

  it('cancels without sending and rejects an old confirmation after reopening', () => {
    const { doc, fake } = mounted(saveWith([companion]));
    button(doc, 0, 2).click();
    const panel = confirmation(doc);
    const oldConfirm = child(panel, 'btn', 0);
    child(panel, 'btn', 1).click();
    expect(fake.actions).toEqual([]);
    expect(doc.el('roster').find('reincarnation-confirmation')).toEqual([]);
    button(doc, 0, 2).click();
    oldConfirm.click();
    expect(fake.actions).toEqual([]);
    child(confirmation(doc), 'btn', 0).click();
    expect(fake.actions).toHaveLength(1);
  });

  it.each([
    ['id', { id: 'c2' }],
    ['level', { level: 11 }],
    ['stars', { stars: 3 }],
    ['species', { speciesId: 'ghost' }],
    ['boss depth', { bossIndex: 15 }],
    ['deletion', null],
  ] as const)('invalidates confirmation after a target %s change, even if the old values return', (_name, patch) => {
    const save = saveWith([companion]);
    const { doc, fake } = mounted(save);
    button(doc, 0, 2).click();
    const oldConfirm = child(confirmation(doc), 'btn', 0);
    fake.emit(saveWith(patch ? [{ ...companion, ...patch }] : []));
    expect(doc.el('roster').find('reincarnation-confirmation')).toEqual([]);
    expect(doc.el('result').textContent).toContain('동료가 변경되어 환생 확인을 취소했습니다');
    oldConfirm.click();
    fake.emit(save);
    oldConfirm.click();
    expect(fake.actions).toEqual([]);
  });

  it('disables an overflowing consume target while allowing it to feed another companion', () => {
    const high = { ...companion, level: Number.MAX_SAFE_INTEGER, stars: 0 };
    const low = { ...companion, id: 'c2', level: 1, stars: 0 };
    const { doc, fake } = mounted(saveWith([high, low]));
    expect(button(doc, 0, 0).disabled).toBe(true);
    expect(button(doc, 1, 0).disabled).toBe(false);
    button(doc, 1, 0).click();
    expect(button(doc, 0, 0).disabled).toBe(false);
    button(doc, 0, 0).click();
    expect(fake.actions).toEqual([{ type: 'consume', targetId: 'c2', foodId: 'c1' }]);
  });
});

describe('menu ranking and battle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaderboard rows render rank, name, deepest monster and rebirths', async () => {
    expect(leaderboardRows({ ok: true, value: { top: TOP, me: ME, removed: [] } })).toEqual([
      { rank: '#1', name: 'Ada', deepest: 'Monster 79', rebirths: '♻×2' },
      { rank: '#2', name: 'Bo', deepest: 'Monster 40', rebirths: '♻×0' },
      { rank: '#12', name: 'Knight-ab12', deepest: 'Monster 7', rebirths: '♻×0' },
    ]);
    // My own line is not repeated when the top already carries it.
    expect(
      leaderboardRows({ ok: true, value: { top: TOP, me: TOP[0] ?? null, removed: [] } }),
    ).toHaveLength(2);

    // Opening the tab loads them, and forwards what the server took first.
    const { doc, fake } = mounted(saveWith(COMPANIONS), {
      leaderboard: { ok: true, value: { top: TOP, me: ME, removed: ['c1'] } },
    });
    doc.el('tab-ranking').click();
    await flush();
    expect(fake.calls).toEqual(['getIdentity', 'getLeaderboard']);
    expect(texts(doc.el('ranking'), 'rank')).toEqual(['#1', '#2', '#12']);
    expect(texts(doc.el('ranking'), 'name')).toEqual(['Ada', 'Bo', 'Knight-ab12']);
    expect(texts(doc.el('ranking'), 'power')).toEqual(['Monster 79', 'Monster 40', 'Monster 7']);
    expect(texts(doc.el('ranking'), 'stars')).toEqual(['♻×2', '♻×0', '♻×0']);
    expect(fake.actions).toEqual([{ type: 'removeCompanions', ids: ['c1'] }]);
  });

  it('offline or failed results render an Offline row', async () => {
    expect(leaderboardRows({ ok: false, error: 'offline' })[0]?.name).toBe('Offline');
    expect(leaderboardRows({ ok: false, error: 'server', status: 500 })[0]?.name).toBe('Offline');
    expect(leaderboardRows({ ok: false, error: 'cooldown', retryAfterSec: 30 })[0]?.name).toBe(
      'Cooldown',
    );

    // An offline identity answers both tabs without touching the network —
    // Battle answers on `Find opponent`, the step that would call the server.
    const { doc, fake } = mounted(saveWith(COMPANIONS), { identity: OFFLINE });
    doc.el('tab-ranking').click();
    doc.el('find').click();
    await flush();
    expect(fake.calls).toEqual(['getIdentity']);
    expect(texts(doc.el('ranking'), 'name')).toEqual(['Offline']);
    expect(doc.el('result').textContent).toBe('Offline — no battle right now.');
  });

  it('pvp result text names the stolen or lost companion and the cooldown', () => {
    expect(pvpResultText({ ok: true, value: WON })).toBe(
      'Victory over Bo — stole Dragon Lv 10!',
    );
    expect(pvpResultText({ ok: true, value: { ...WON, stolen: null } })).toBe('Victory over Bo.');
    expect(pvpResultText({ ok: true, value: { ...LOST, lost: null } })).toBe('Defeat by Bo.');
    expect(pvpResultText({ ok: true, value: LOST })).toBe(
      'Defeat by Bo — Slime Lv 4 was stolen from you.',
    );
    expect(pvpResultText({ ok: false, error: 'cooldown', retryAfterSec: 42 })).toBe(
      'Cooldown — next battle in 42s.',
    );
    expect(pvpResultText({ ok: false, error: 'network' })).toBe('Offline — no battle right now.');
  });

  it('battle button is disabled with no companions or during cooldown', async () => {
    vi.useFakeTimers({ now: 0 });
    expect(battleEnabled(saveWith([]), 0)).toBe(false);
    expect(battleEnabled(saveWith(COMPANIONS), 2)).toBe(false);
    expect(battleEnabled(saveWith(COMPANIONS), 0)).toBe(true);

    const { doc, fake } = mounted(saveWith([]), {
      pvp: { ok: false, error: 'cooldown', retryAfterSec: 2 },
    });
    const go = doc.el('battle-go');
    expect(go.disabled).toBe(true);
    go.click();
    await flush();
    expect(fake.calls).toEqual(['getIdentity']);

    // With companions but no match found yet the button is still dead (F75).
    fake.emit(saveWith(COMPANIONS));
    expect(go.disabled).toBe(true);
    doc.el('find').click();
    await flush();
    expect(go.disabled).toBe(false);
    go.click();
    await flush();
    expect(doc.el('result').textContent).toBe('Cooldown — next battle in 2s.');
    expect([go.textContent, go.disabled]).toEqual(['Battle! (2s)', true]);

    vi.advanceTimersByTime(1000);
    expect([go.textContent, go.disabled]).toEqual(['Battle! (1s)', true]);
    vi.advanceTimersByTime(1000);
    expect([go.textContent, go.disabled]).toEqual(['Battle!', false]);
    expect(fake.calls).toEqual(['getIdentity', 'pvpMatch', 'pvp:m1:c2,c3,c1']);
  });

  it('a successful pvp is forwarded to the game as a pvpResult action', async () => {
    const win = mounted(saveWith(COMPANIONS), {
      pvp: { ok: true, value: { ...WON, removed: ['c3'] } },
    });
    win.doc.el('find').click();
    await flush();
    win.doc.el('battle-go').click();
    await flush();
    // removeCompanions goes FIRST — the server already took c3 away.
    expect(win.fake.actions).toEqual([
      { type: 'removeCompanions', ids: ['c3'] },
      {
        type: 'pvpResult',
        won: true,
        stolen: STOLEN,
        lostId: null,
        replay: { opponentName: 'Bo', opponentParty: [], blows: [] },
      },
    ]);
    expect(win.doc.el('result').textContent).toBe('Victory over Bo — stole Dragon Lv 10!');

    const loss = mounted(saveWith(COMPANIONS), { pvp: { ok: true, value: LOST } });
    loss.doc.el('find').click();
    await flush();
    loss.doc.el('battle-go').click();
    await flush();
    // v3 steals are attacker-only: a defeat never reports a lost companion.
    expect(loss.fake.actions).toEqual([
      {
        type: 'pvpResult',
        won: false,
        stolen: null,
        lostId: null,
        replay: { opponentName: 'Bo', opponentParty: [], blows: [] },
      },
    ]);
  });

  it('a successful battle forwards removeCompanions then pvpResult with the replay to the game', async () => {
    const { doc, fake } = mounted(saveWith(COMPANIONS), {
      pvp: { ok: true, value: REPLAY_WON },
      thefts: { ok: true, value: { thefts: [] } },
    });
    doc.el('find').click();
    await flush();
    // Step 1 previews the opponent and its party, biggest member first.
    expect(texts(doc.el('opponent'), 'name')).toEqual(['Bo', 'Golem Lv 2', 'Slime Lv 4']);
    // …and the preview line re-reads against that opponent's front member.
    expect(doc.el('preview').textContent).toBe('Σ vs opponent: 316A');

    doc.el('battle-go').click();
    await flush();
    // Step 2 carries the match id and the picked party…
    expect(fake.calls).toEqual(['getIdentity', 'pvpMatch', 'pvp:m1:c2,c3,c1', 'thefts']);
    // …and the game hears the roster loss BEFORE the verdict it animates.
    expect(fake.actions).toEqual([
      { type: 'removeCompanions', ids: ['c3'] },
      {
        type: 'pvpResult',
        won: true,
        stolen: STOLEN,
        lostId: null,
        replay: { opponentName: 'Bo', opponentParty: OPP_PARTY, blows: BLOWS },
      },
    ]);
    expect(doc.el('result').textContent).toBe('Victory over Bo — stole Dragon Lv 10!');
    // The match is spent: the panel asks for a new opponent.
    expect(texts(doc.el('opponent'), 'name')).toEqual(['No opponent yet']);
    expect(doc.el('battle-go').disabled).toBe(true);
  });

  it('an expired match clears the opponent panel', async () => {
    const { doc, fake } = mounted(saveWith(COMPANIONS), { pvp: { ok: false, error: 'expired' } });
    doc.el('find').click();
    await flush();
    expect(texts(doc.el('opponent'), 'name')).toEqual(['Bo', 'Golem Lv 2', 'Slime Lv 4']);

    doc.el('battle-go').click();
    await flush();
    expect(texts(doc.el('opponent'), 'name')).toEqual(['Opponent expired — find again']);
    expect(doc.el('battle-go').disabled).toBe(true);
    // Nothing happened to the roster, so the game hears nothing.
    expect(fake.actions).toEqual([]);
  });

  it('a successful reclaim forwards addCompanion to the game and refreshes the inbox', async () => {
    vi.useFakeTimers({ now: 0 });
    vi.setSystemTime(NOW);
    const { doc, fake } = mounted(saveWith(COMPANIONS), {
      thefts: { ok: true, value: { thefts: [THEFT] } },
    });
    // The inbox loads when the Battle tab opens.
    doc.el('tab-battle').click();
    await flush();
    expect(texts(doc.el('thefts'), 'name')).toEqual(['Ada stole Slime Lv 4 · 2h 30m left']);

    child(doc.el('thefts'), 'btn', 0).click();
    await flush();
    expect(fake.actions).toEqual([{ type: 'addCompanion', companion: RECLAIMED }]);
    expect(fake.calls).toEqual(['getIdentity', 'thefts', 'reclaim:t1', 'thefts']);

    // A window that closed drops the row and says why; nothing is forwarded.
    const late = mounted(saveWith(COMPANIONS), {
      thefts: { ok: true, value: { thefts: [THEFT] } },
      reclaim: { ok: false, error: 'expired' },
    });
    late.doc.el('tab-battle').click();
    await flush();
    child(late.doc.el('thefts'), 'btn', 0).click();
    await flush();
    expect(late.doc.el('thefts').find('row')).toHaveLength(0);
    expect(late.doc.el('result').textContent).toBe('Too late — the reclaim window closed.');
    expect(late.fake.actions).toEqual([]);
  });

  it('roster cards show a type badge and a PvP mark for party members', () => {
    const save = parseSave({ ...DEFAULT_SAVE, companions: COMPANIONS, pvpParty: ['c1'] });
    const { doc } = mounted(save);
    const cards = doc.el('roster').find('card');
    // Cards are power-sorted: dragon (fire), slime, slime (both water).
    expect(cards.map((c) => c.find('type')[0]?.className)).toEqual([
      'type type-fire',
      'type type-water',
      'type type-water',
    ]);
    expect(cards.map((c) => c.find('type')[0]?.textContent)).toEqual(['F', 'A', 'A']);
    // Only the saved party member is marked, and c1 is the last card.
    expect(cards.map((c) => c.find('pvp-mark').length)).toEqual([0, 0, 1]);
    expect(doc.el('roster').find('pvp-mark')[0]?.textContent).toBe('★ PvP');
  });

  it('the party editor picks, auto-fills and saves the pvp party', () => {
    const { doc, fake } = mounted();
    // No saved party yet, so the five slots start on the auto party.
    expect(doc.el('party').find('slot')).toHaveLength(5);
    expect(texts(doc.el('party'), 'name')).toEqual(['Dragon Lv 10', 'Slime Lv 2', 'Slime Lv 4']);
    // No opponent loaded yet, so the preview is the raw sum of the picks.
    expect(doc.el('preview').textContent).toBe('Σ vs opponent: 628A');
    expect(doc.el('picks').find('pick').map((p) => p.className)).toEqual([
      'card mini pick selected',
      'card mini pick selected',
      'card mini pick selected',
    ]);

    // Un-picking a card drops it from the slots and from what Save sends.
    child(doc.el('picks'), 'pick', 0).click();
    expect(texts(doc.el('party'), 'name')).toEqual(['Dragon Lv 10', 'Slime Lv 2']);
    expect(child(doc.el('picks'), 'pick', 0).className).toBe('card mini pick');
    doc.el('save-party').click();
    expect(fake.actions).toEqual([{ type: 'setPvpParty', ids: ['c2', 'c3'] }]);

    doc.el('auto').click();
    expect(texts(doc.el('party'), 'name')).toEqual(['Dragon Lv 10', 'Slime Lv 2', 'Slime Lv 4']);
  });

  it('the name field shows the identity and setName caps it at 16 characters', async () => {
    const { doc, fake } = mounted();
    await flush();
    expect(doc.el('name').value).toBe('Knight-ab12');

    doc.el('name').type('abcdefghijklmnopqrstuvwxyz');
    await flush();
    expect(fake.calls).toEqual(['getIdentity', 'setName:abcdefghijklmnop']);
    expect(doc.el('name').value).toBe('abcdefghijklmnop');
  });
});

describe('battle tab view (v3, F75)', () => {
  it('opponent rows render the previewed party in party order with type badges', () => {
    expect(opponentRows(null)).toEqual([]);

    const rows = opponentRows(MATCH);
    // partyOrder is size desc: the golem stands at the back, the slime in front.
    expect(rows.map((r) => r.id)).toEqual(['o2', 'o1']);
    expect(rows.map((r) => r.name)).toEqual(['Golem Lv 2', 'Slime Lv 4']);
    expect(rows.map((r) => r.typeClass)).toEqual(['type type-earth', 'type type-water']);
    expect(rows.map((r) => r.typeBadge)).toEqual(['E', 'A']);
    expect(rows[1]).toMatchObject({ speciesId: 'slime', stars: 1, starText: '★×1' });

    // A bot opponent has no party at all.
    const bot = { ...MATCH, bot: true, opponent: { ...MATCH.opponent, party: [] } };
    expect(opponentRows(bot)).toEqual([]);
  });

  it('party preview sums effective power against the opponent front member type', () => {
    const mine = [COMPANIONS[0], COMPANIONS[1]].map((c) => c!);
    // slime 32 (water vs water = normal) + dragon 623920 (fire vs water = halved).
    expect(partyPreview(mine, OPP_PARTY)).toBe('Σ vs opponent: 311A');
    // The front member is picked by size, not by the order the party arrived in.
    expect(partyPreview(mine, [...OPP_PARTY].reverse())).toBe('Σ vs opponent: 311A');
    // Against the earth golem alone the dragon is super effective instead.
    expect(partyPreview(mine, [OPP_GOLEM])).toBe('Σ vs opponent: 1.24B');
    // No opponent yet → the raw sum, 32 + 623920.
    expect(partyPreview(mine, [])).toBe('Σ vs opponent: 623A');
    expect(partyPreview([], OPP_PARTY)).toBe('Σ vs opponent: 0');
  });

  it('togglePick adds and removes ids and never exceeds 5', () => {
    expect(togglePick([], 'c1')).toEqual(['c1']);
    expect(togglePick(['c1', 'c2'], 'c3')).toEqual(['c1', 'c2', 'c3']);
    expect(togglePick(['c1', 'c2'], 'c1')).toEqual(['c2']);

    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(togglePick(full, 'f')).toEqual(full);
    // A full party still gives a slot back when a member is un-picked.
    expect(togglePick(togglePick(full, 'c'), 'f')).toEqual(['a', 'b', 'd', 'e', 'f']);
  });

  it('theft rows render the thief, the companion and the time left from the injected now', () => {
    expect(theftRows([THEFT], NOW)).toEqual([
      { id: 't1', text: 'Ada stole Slime Lv 4 · 2h 30m left' },
    ]);
    expect(theftRows([THEFT], NOW + 2 * 3_600_000)[0]?.text).toBe(
      'Ada stole Slime Lv 4 · 0h 30m left',
    );
    // Past the window the row reads zero rather than going negative.
    expect(theftRows([THEFT], THEFT.reclaimUntil + 60_000)[0]?.text).toBe(
      'Ada stole Slime Lv 4 · 0h 0m left',
    );
    expect(theftRows([], NOW)).toEqual([]);
  });

  it('battle button is enabled only with a live match, a non-empty party and no cooldown', () => {
    expect(battleEnabled({ match: MATCH, party: ['c1'], cooldownUntil: 0 })).toBe(true);
    expect(battleEnabled({ match: null, party: ['c1'], cooldownUntil: 0 })).toBe(false);
    expect(battleEnabled({ match: MATCH, party: [], cooldownUntil: 0 })).toBe(false);
    expect(battleEnabled({ match: MATCH, party: ['c1'], cooldownUntil: 3 })).toBe(false);
  });
});

describe('v0.4 hero choices and opponent directory binding', () => {
  it('centers the novice and unknown fallback on the same preview floor as evolved forms', () => {
    const doc = new FakeDoc(true);
    const novice = heroCanvas(doc, 'h00') as FakeEl;
    const fallback = heroCanvas(doc, 'missing-form') as FakeEl;
    const evolved = heroCanvas(doc, 'h41') as FakeEl;
    expect([novice.width, novice.height]).toEqual([96, 96]);
    // Native 14×14 is centered in 96px at the same 4px art scale as the field.
    expect(novice.pixels[0]).toEqual({ x: 36, y: 20, w: 4, h: 4 });
    expect(novice.pixels).toContainEqual({ x: 24, y: 72, w: 4, h: 4 });
    expect(fallback.pixels).toEqual(novice.pixels);
    expect(fallback.fills).toEqual(novice.fills);
    const opponent = heroCanvas(doc, 'h00', 64) as FakeEl;
    expect([opponent.width, opponent.height]).toEqual([64, 64]);
    expect(opponent.pixels).toEqual(novice.pixels.map(pixel => ({ ...pixel, x: pixel.x - 16, y: pixel.y - 16 })));
    for (const canvas of [novice, fallback, evolved]) {
      expect(Math.max(...canvas.pixels.map((pixel) => pixel.y + pixel.h))).toBe(76);
      expect(canvas.pixels.every((pixel) => pixel.x >= 20 && pixel.x + pixel.w <= 76 && pixel.y >= 20 && pixel.w === 4 && pixel.h === 4)).toBe(true);
    }
  });

  it('shows actual art and rolled buffs for three choices and sends a serial-bound selection', () => {
    const doc = new FakeDoc(true);
    const api = makeBridge();
    mountMenu(doc, api.bridge);
    const engine = createEngine({ ...DEFAULT_SAVE, level: HERO_MIN_LEVEL, coins: 100 }, mulberry32(17));
    engine.apply({ type: 'heroOffer' });
    api.emit(engine.toSave());
    const choices = doc.el('hero').find('hero-choices')[0]!;
    expect(choices.children).toHaveLength(3);
    expect(choices.find('hero-art').every((canvas) => canvas.fills.length > 0)).toBe(true);
    expect(choices.find('hero-art').every((canvas) => canvas.width === 96 && canvas.height === 96)).toBe(true);
    expect(choices.find('hero-buff').every((el) => el.textContent?.includes('%'))).toBe(true);
    const gallery = doc.el('codex').find('hero-gallery')[0]!;
    const entry = gallery.find('codex-card')[0]!;
    entry.open = true;
    api.emit({ ...engine.toSave(), coins: 101 });
    expect(doc.el('codex').find('hero-gallery')[0]).toBe(gallery);
    expect(gallery.find('codex-card')[0]).toBe(entry);
    expect(entry.open).toBe(true);
    expect(doc.el('hero').find('hero-gallery')).toHaveLength(0);
    expect(doc.el('hero').find('hero-choices')[0]).toBe(choices);
    choices.find('btn')[0]!.click();
    expect(api.actions).toContainEqual({ type: 'heroChoose', formId: engine.getState().hero!.choices[0]!.formId,
      offerSerial: engine.getState().hero!.offerSerial });
    doc.el('hero').find('btn').find((b) => b.textContent?.startsWith('보류'))!.click();
    expect(api.actions.at(-1)?.type).toBe('heroDefer');
  });

  it('opens a list with hero, party and win/loss record, then previews the selected player', async () => {
    const doc = new FakeDoc(true);
    const api = makeBridge();
    const directory = vi.fn(async () => ({ ok: true as const, value: { opponents: [{
      ...MATCH.opponent, playerId: 'chosen-player', rank: 3, wins: 8, losses: 2,
      hero: { formId: 'h41', buffPercent: 20 },
    }] } }));
    const match = vi.fn(async () => ({ ok: true as const, value: { ...MATCH, opponent: { ...MATCH.opponent, playerId: 'chosen-player' } } }));
    api.bridge.pvpOpponents = directory;
    api.bridge.pvpMatch = match;
    mountMenu(doc, api.bridge);
    doc.el('tab-battle').click();
    await flush();
    expect(directory).toHaveBeenCalledTimes(1);
    expect(match).not.toHaveBeenCalled();
    const rows = doc.el('opponents').find('opponent-card');
    expect(rows).toHaveLength(1);
    expect(texts(rows[0]!, 'record')).toEqual(['8승 2패']);
    const portrait = rows[0]!.find('hero-art')[0]!;
    expect(portrait.fills.length).toBeGreaterThan(0);
    expect([portrait.width, portrait.height]).toEqual([64, 64]);
    expect(portrait.pixels.every(pixel => pixel.w === 4 && pixel.h === 4 && pixel.x >= 4 && pixel.x + pixel.w <= 60 && pixel.y >= 4 && pixel.y + pixel.h <= 60)).toBe(true);
    expect(rows[0]!.find('mini')).toHaveLength(MATCH.opponent.party.length);
    rows[0]!.find('btn')[0]!.click();
    await flush();
    expect(match).toHaveBeenCalledWith('chosen-player');
    expect(texts(doc.el('opponent'), 'name')).toContain(MATCH.opponent.name);
  });

  it('keeps an empty or failed directory actionable and never silently starts a random match', async () => {
    const doc = new FakeDoc(true);
    const api = makeBridge();
    const directory = vi.fn<NonNullable<MenuBridge['pvpOpponents']>>()
      .mockResolvedValueOnce({ ok: true, value: { opponents: [] } })
      .mockRejectedValueOnce(new Error('offline'));
    const match = vi.fn(api.bridge.pvpMatch);
    api.bridge.pvpOpponents = directory;
    api.bridge.pvpMatch = match;
    mountMenu(doc, api.bridge);
    doc.el('find').click();
    await flush();
    expect(texts(doc.el('opponents'), 'muted')[0]).toContain('아직 대전 상대가 없습니다');
    doc.el('find').click();
    await flush();
    expect(texts(doc.el('opponents'), 'muted')[0]).toContain('연결할 수 없습니다');
    expect(doc.el('find').disabled).toBe(false);
    expect(match).not.toHaveBeenCalled();
  });
});

describe('v0.5 shop, codices and player history', () => {
  function v5(save: Partial<SaveFile> = {}): { doc: FakeDoc; api: FakeBridge } {
    const doc = new FakeDoc(true);
    const api = makeBridge();
    mountMenu(doc, api.bridge);
    api.emit({ ...DEFAULT_SAVE, progress: newProgress(), ...save });
    return { doc, api };
  }

  it('keeps all 70 heroes in one codex and masks undiscovered art even after requirements are met', () => {
    const progress = { ...newProgress(), speciesKills: { dragon: 3 } };
    const { doc, api } = v5({ progress });
    const cards = doc.el('codex').find('hero-gallery')[0]!.find('codex-card');
    expect(cards).toHaveLength(70);
    expect(doc.el('hero').find('hero-gallery')).toHaveLength(0);
    const locked = cards[50]!;
    expect(texts(locked, 'name')).toEqual(['미발견']);
    expect(new Set(locked.find('hero-art')[0]!.fills)).toEqual(new Set([SILHOUETTE_COLOR]));
    expect(locked.find('hero-art')[0]!.attributes['aria-label']).toBe('미발견 영웅 실루엣');
    expect(texts(locked, 'condition')[0]).toContain('3/3');
    expect(texts(locked, 'codex-eligibility')[0]).toContain('조건 달성');
    expect(locked.find('codex-equip')[0]!.disabled).toBe(true);
    locked.find('codex-equip')[0]!.click();
    expect(api.actions).toEqual([]);

    locked.open = true;
    api.emit({ ...DEFAULT_SAVE, progress: { ...progress, seenHeroes: ['h51'] } });
    expect(texts(locked, 'name')).toEqual(['미발견']);
    expect(new Set(locked.find('hero-art')[0]!.fills)).toEqual(new Set([SILHOUETTE_COLOR]));
    api.emit({ ...DEFAULT_SAVE, progress: { ...progress, seenHeroes: ['h51'], heroCounts: { h51: 1 } } });
    expect(doc.el('codex').find('codex-card')[50]).toBe(locked);
    expect(locked.open).toBe(true);
    expect(texts(locked, 'name')).toEqual([HERO_FORMS[50]!.name]);
    expect(new Set(locked.find('hero-art')[0]!.fills).size).toBeGreaterThan(1);
    expect(texts(locked, 'codex-description')[0]).toBe(HERO_FORMS[50]!.description);
    expect(locked.find('codex-equip')[0]!.disabled).toBe(true);
  });

  it('keeps art, open cards and an edited name through five-second updates and codex switches', () => {
    const { doc, api } = v5();
    const hero = doc.el('codex').find('codex-card')[0]!;
    const portrait = hero.find('hero-art')[0]!;
    hero.open = true;
    doc.el('name').value = 'EditingName';
    api.emit({ ...DEFAULT_SAVE, progress: { ...newProgress(), playTimeMs: 5000 } });
    expect(doc.el('codex').find('codex-card')[0]).toBe(hero);
    expect(hero.find('hero-art')[0]).toBe(portrait);
    expect(hero.open).toBe(true);
    expect(doc.el('name').value).toBe('EditingName');
    doc.el('codex').find('codex-monsters')[0]!.click();
    expect(doc.el('codex').find('monster-gallery')[0]!.find('codex-card')).toHaveLength(135);
    doc.el('codex').find('codex-heroes')[0]!.click();
    expect(hero.open).toBe(true);
    expect(hero.find('hero-art')[0]).toBe(portrait);
  });

  it('shows time AND progress conditions and reveals monsters only after a kill', () => {
    const progress = { ...newProgress(), killCount: 30, playTimeMs: 300_000 };
    const { doc, api } = v5({ killCount: 30, progress });
    doc.el('codex').find('codex-monsters')[0]!.click();
    const cards = doc.el('codex').find('monster-gallery')[0]!.find('codex-card');
    const dawn = cards[105]!;
    const mist = cards[111]!;
    expect(texts(dawn, 'name')).toEqual(['미발견']);
    expect(new Set(dawn.find('monster-art')[0]!.fills)).toEqual(new Set([SILHOUETTE_COLOR]));
    expect(texts(mist, 'condition')).toEqual(expect.arrayContaining([
      expect.stringContaining('현재 낮'), expect.stringContaining('5/5분'),
    ]));
    expect(texts(mist, 'codex-eligibility')[0]).toContain('조건을 달성하면');
    expect(texts(doc.el('codex'), 'field-phase')[0]).toContain('낮');
    api.emit({ ...DEFAULT_SAVE, killCount: 30, progress: { ...progress, seenMonsters: ['dawnfinch'] } });
    expect(texts(dawn, 'name')).toEqual(['미발견']);
    expect(new Set(dawn.find('monster-art')[0]!.fills)).toEqual(new Set([SILHOUETTE_COLOR]));
    api.emit({ ...DEFAULT_SAVE, killCount: 31, progress: { ...progress, seenMonsters: ['dawnfinch'], speciesKills: { dawnfinch: 1 } } });
    expect(texts(dawn, 'name')).toEqual(['새벽불새']);
    expect(new Set(dawn.find('monster-art')[0]!.fills).size).toBeGreaterThan(1);
    expect(texts(dawn, 'codex-eligibility')[0]).toContain('발견 완료');
    expect(texts(dawn, 'codex-stats')[0]).toContain('HP');
  });

  it('offers free equipment only for owned heroes and uses the collected stacked buff', () => {
    const owned = { formId: 'h06', buffPercent: 25, stacks: 3 };
    const hero = { ...newHeroProgress(), collection: [owned] };
    const { doc, api } = v5({ hero });
    const card = doc.el('codex').find('codex-card')[5]!;
    expect(texts(card, 'codex-stats')[0]).toContain('+28%');
    card.find('codex-equip')[0]!.click();
    expect(api.actions).toEqual([{ type: 'heroEquip', formId: 'h06' }]);
    expect(heroBuffText(owned)).toBe('모든 동료 공격력 +28%');
  });

  it('previews repeat rewards and changing level thresholds including an old pending offer', () => {
    const hero = { ...newHeroProgress(), reincarnations: 3, offerSerial: 7, offerLevel: 12,
      collection: [{ formId: 'h01', buffPercent: 25, stacks: 2 }],
      choices: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 15 }, { formId: 'h03', buffPercent: 20 }] };
    const { doc, api } = v5({ hero, level: 12, coins: 1000 });
    expect(texts(doc.el('hero'), 'next-level')[0]).toContain('다음 환생 Lv.12');
    expect(texts(doc.el('hero'), 'next-level')[0]).toContain(`새 후보·재굴림 Lv.${heroRequiredLevel(3)}`);
    const choices = doc.el('hero').find('hero-choices')[0]!;
    expect(texts(choices, 'stack-change')[0]).toBe('중첩 2 → 3');
    expect(texts(choices, 'hero-buff')[0]).toContain('+56%');
    const reroll = doc.el('hero').find('btn').find((b) => b.textContent?.includes('다시 뽑기'))!;
    expect(reroll.disabled).toBe(true);
    expect(reroll.textContent).toContain(`Lv.${heroRequiredLevel(3)} 필요`);
    api.emit({ ...DEFAULT_SAVE, hero, level: heroRequiredLevel(3), coins: 1000 });
    expect(doc.el('hero').find('btn').find((b) => b.textContent?.includes('다시 뽑기'))!.disabled).toBe(false);
    choices.find('btn')[0]!.click();
    expect(api.actions).toContainEqual({ type: 'heroChoose', formId: 'h01', offerSerial: 7 });
  });

  it('shows exact shop effects and shortfalls, keeps buttons mounted and sends serial-bound purchases', () => {
    const { doc, api } = v5({ coins: 74 });
    const cards = doc.el('shop').find('shop-card');
    const training = cards[0]!.find('btn')[0]!;
    expect(training.disabled).toBe(true);
    expect(training.textContent).toContain('75 골드');
    expect(training.textContent).toContain('1 부족');
    expect(texts(cards[0]!, 'shop-effect')[0]).toContain('+0% → +5%');
    training.click();
    expect(api.actions).toEqual([]);
    api.emit({ ...DEFAULT_SAVE, coins: 500, progress: { ...newProgress(), shopSerial: 8 } });
    expect(cards[0]!.find('btn')[0]).toBe(training);
    training.click();
    expect(api.actions).toEqual([{ type: 'shopBuy', item: 'training', shopSerial: 8 }]);
    expect(cards[1]!.find('btn')[0]!.textContent).toContain('출현 조건');
    api.emit({ ...DEFAULT_SAVE, coins: 500, progress: { ...newProgress(), trainingLevel: 10, lureRemaining: 20, shopSerial: 9 } });
    expect(training.disabled).toBe(true);
    expect(training.textContent).toBe('최대 훈련 완료');
    expect(cards[1]!.find('btn')[0]!.disabled).toBe(true);
    expect(cards[1]!.find('btn')[0]!.textContent).toContain('20회 남음');
  });

  it('prices eligible lure purchases using reincarnations and shows exact remaining charges', () => {
    const hero = { ...newHeroProgress(), reincarnations: 2 };
    const progress = { ...newProgress(), shopSerial: 2, speciesKills: { dragon: 3 } };
    const { doc, api } = v5({ hero, progress, coins: 125 });
    const button = doc.el('shop').find('shop-card')[1]!.find('btn')[0]!;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('125 골드로 구입');
    button.click();
    expect(api.actions).toEqual([{ type: 'shopBuy', item: 'lure', shopSerial: 2 }]);
  });

  it('shows persisted time, lifetime totals and reverse chronological hero history without replacing open details', () => {
    const progress = { ...newProgress(), playTimeMs: 3_723_000, pvpWins: 3, pvpLosses: 1, goldSpent: 1000,
      legacyHistory: true, heroCounts: { h06: 2 }, reincarnationHistory: [
        { number: 100, formId: 'h06', level: 18, playTimeMs: 3600_000, buffPercent: 25, stacks: 0 },
        { number: 101, formId: 'h06', level: 18, playTimeMs: 3720_000, buffPercent: 25, stacks: 1 },
      ] };
    const { doc, api } = v5({ hero: { ...newHeroProgress(), reincarnations: 101 }, progress, killCount: 8888, rebirths: 105 });
    const profile = doc.el('profile-stats');
    expect(texts(profile, 'play-time')).toEqual(['플레이 시간 · 1시간 2분 3초']);
    expect(texts(profile, 'kill-count')[0]).toContain('8,888');
    expect(texts(profile, 'hero-count')[0]).toContain('101회');
    expect(texts(profile, 'pvp-count')[0]).toContain('3승 1패');
    expect(texts(profile, 'name')[0]).toContain('총 101회 · 최근 2개');
    expect(texts(profile, 'history-detail')[0]).toContain('+26%');
    expect(texts(profile, 'hero-total')).toEqual(['새벽 광전사 · 2회']);
    expect(texts(profile, 'muted').some((line) => line?.includes('v0.5부터'))).toBe(true);
    const history = profile.find('profile-history')[0]!;
    const entry = profile.find('history-entry')[0]!;
    history.open = true;
    api.emit({ ...DEFAULT_SAVE, hero: { ...newHeroProgress(), reincarnations: 101 }, progress: { ...progress, playTimeMs: 3_728_000 } });
    expect(profile.find('profile-history')[0]).toBe(history);
    expect(profile.find('history-entry')[0]).toBe(entry);
    expect(history.open).toBe(true);
  });

  it('saves names offline, explains rejected characters and preserves typing against delayed identity', async () => {
    const doc = new FakeDoc(true);
    const api = makeBridge({ identity: OFFLINE });
    let resolveIdentity: (value: IdentityPayload) => void = () => undefined;
    api.bridge.getIdentity = () => new Promise((resolve) => { resolveIdentity = resolve; });
    mountMenu(doc, api.bridge);
    doc.el('name').value = 'Typing';
    resolveIdentity(OFFLINE);
    await flush();
    expect(doc.el('name').value).toBe('Typing');
    doc.el('name').type('bad name');
    expect(doc.el('name-status').textContent).toContain('1–16자');
    expect(api.calls.some((call) => call.startsWith('setName:'))).toBe(false);
    doc.el('name').type('Sir_Bongo');
    await flush();
    expect(api.calls).toContain('setName:Sir_Bongo');
    expect(doc.el('name-status').textContent).toBe('이름을 저장했습니다.');
    expect(doc.el('save-name').disabled).toBe(false);
  });

  it('keeps the battle verdict and warns only when official history could not be persisted', () => {
    expect(pvpResultText({ ok: true, value: { ...WON, historySaved: false } }))
      .toContain('전적 저장을 완료하지 못했습니다');
    expect(pvpResultText({ ok: true, value: WON })).not.toContain('전적 저장');
  });
});

describe('v0.6 explicit discovery acknowledgement and optional goal', () => {
  function setup() {
    const doc = new FakeDoc(true); const api = makeBridge();
    mountMenu(doc, api.bridge);return {doc,api};
  }
  it('acknowledges only previewed IDs, never on open or before persisted state arrives', () => {
    const {doc,api}=setup();
    const progress={...newProgress(),seenHeroes:['h01','h02','h03','h04'],seenMonsters:['slime','dragon'],
      heroCounts:{h01:1,h02:1,h03:1,h04:1},speciesKills:{slime:1,dragon:1}};
    api.emit({...DEFAULT_SAVE,progress});doc.el('tab-codex').click();
    expect(api.actions).toEqual([]);
    const ack=doc.el('codex').find('discovery-ack')[0]!;ack.click();
    expect(api.actions.at(-1)).toEqual({type:'acknowledgeDiscoveries',heroes:['h01','h02','h03'],monsters:['slime','dragon']});
    expect(texts(doc.el('codex'),'discovery-count')[0]).toContain('영웅 4');
    const engine=createEngine({...DEFAULT_SAVE,progress},mulberry32(1));
    engine.apply(api.actions.at(-1)!);api.emit(engine.toSave());
    expect(doc.el('codex').find('discovery-ack')[0]).toBe(ack);
    expect(texts(doc.el('codex'),'discovery-count')[0]).toContain('영웅 1');
    ack.click();expect(api.actions.at(-1)).toEqual({type:'acknowledgeDiscoveries',heroes:['h04'],monsters:[]});
  });
  it('keeps a selected undiscovered goal through eligibility changes and discovery until explicit clear', () => {
    const {doc,api}=setup();const progress={...newProgress(),speciesKills:{dragon:3}};
    api.emit({...DEFAULT_SAVE,progress});
    const card=doc.el('codex').find('hero-gallery')[0]!.find('codex-card')[50]!;
    const button=card.find('codex-goal')[0]!;card.open=true;button.click();
    expect(api.actions.at(-1)).toEqual({type:'setDiscoveryGoal',goal:{kind:'hero',id:'h51'}});
    const goal={kind:'hero' as const,id:'h51'};
    const selected={...progress,codex:{acknowledgedHeroes:[],acknowledgedMonsters:[],goal}};
    api.emit({...DEFAULT_SAVE,progress:selected});
    expect(texts(doc.el('codex'),'goal-name')[0]).toContain('미발견');
    expect(texts(doc.el('codex'),'goal-status')[0]).toContain('조건 충족 · 아직 미발견');
    expect(new Set(card.find('hero-art')[0]!.fills)).toEqual(new Set([SILHOUETTE_COLOR]));
    api.emit({...DEFAULT_SAVE,progress:{...selected,speciesKills:{},playTimeMs:5000}});
    expect(texts(doc.el('codex'),'goal-status')[0]).toContain('현재 조건 미충족');
    expect(card.open).toBe(true);expect(card.find('codex-goal')[0]).toBe(button);
    api.emit({...DEFAULT_SAVE,progress:{...selected,seenHeroes:['h51']}});
    expect(texts(doc.el('codex'),'goal-status')[0]).toContain('조건 충족 · 아직 미발견');
    api.emit({...DEFAULT_SAVE,progress:{...selected,seenHeroes:['h51'],heroCounts:{h51:1}}});
    expect(texts(doc.el('codex'),'goal-status')[0]).toContain('발견 완료 · 미보유');
    doc.el('codex').find('goal-clear')[0]!.click();
    expect(api.actions.at(-1)).toEqual({type:'setDiscoveryGoal',goal:null});
  });
  it('shows disk failure and only clears it on a successful saved update', () => {
    const doc=new FakeDoc(true);const api=makeBridge();let failed=()=>{};
    api.bridge.onSaveFailed=cb=>{failed=cb;return ()=>{};};mountMenu(doc,api.bridge);
    api.emit({...DEFAULT_SAVE,progress:{...newProgress(),seenHeroes:['h01']}});
    failed();expect(doc.el('save-status').textContent).toContain('저장하지 못했습니다');
    doc.el('tab-codex').click();expect(doc.el('save-status').textContent).toContain('저장하지 못했습니다');
    api.emit({...DEFAULT_SAVE,progress:newProgress()});expect(doc.el('save-status').hidden).toBe(true);
  });
});

describe('v0.6 capped hero discovery guidance', () => {
  it('keeps a chosen goal but does not promise another offer at the reincarnation cap', () => {
    const doc=new FakeDoc(true);const api=makeBridge();mountMenu(doc,api.bridge);
    api.emit({...DEFAULT_SAVE,level:99,hero:{...newHeroProgress(),reincarnations:1_000_000},
      progress:{...newProgress(),codex:{acknowledgedHeroes:[],acknowledgedMonsters:[],goal:{kind:'hero',id:'h01'}}}});
    const card=doc.el('codex').find('hero-gallery')[0]!.find('codex-card')[0]!;
    expect(texts(card,'codex-eligibility')[0]).toContain('새 후보를 열 수 없습니다');
    expect(texts(doc.el('codex'),'goal-status')[0]).toContain('환생 상한 도달');
    expect(card.find('codex-goal')[0]!.textContent).toContain('선택한 목표');
    expect(api.actions).toEqual([]);
  });
});
