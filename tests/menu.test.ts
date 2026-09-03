// T48/T49 — Collection & Battle menu page (SPEC F54/F55; GAME_DESIGN_V2 §9).
// view.ts is pure data, index.ts is DOM-free by injection: these tests drive
// mountMenu with a recording fake document and a fake preload bridge, exactly
// as the real `document` and `window.desmon` drive it in the menu window.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SAVE, parseSave } from '../src/core/index.js';
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
  children: FakeEl[] = [];
  /** Every color drawSprite painted into this canvas. */
  readonly fills: string[] = [];
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

  getContext(): SpriteCanvas {
    const ctx: SpriteCanvas = {
      fillStyle: '',
      fillRect: (): void => {
        this.fills.push(String(ctx.fillStyle));
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

  constructor() {
    for (const id of ['tab-roster', 'tab-ranking', 'tab-battle'].concat([
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
      expect([canvas.width, canvas.height]).toEqual([24, 20]);
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
    // Reincarnate needs max level: only the level-10 dragon offers it.
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
    button(doc, 2, 3).click();
    expect(fake.actions.slice(1)).toEqual([
      { type: 'fuse', aId: 'c1', bId: 'c3' },
      { type: 'reincarnate', id: 'c2' },
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
    vi.useFakeTimers();
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
    vi.useFakeTimers();
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
