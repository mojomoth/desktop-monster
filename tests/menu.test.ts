// T48 — Collection & Battle menu page (SPEC F54; GAME_DESIGN_V2 §9).
// view.ts is pure data, index.ts is DOM-free by injection: these tests drive
// mountMenu with a recording fake document and a fake preload bridge, exactly
// as the real `document` and `window.desmon` drive it in the menu window.

import { describe, expect, it } from 'vitest';
import { DEFAULT_SAVE, parseSave } from '../src/core/index.js';
import type { CollectionAction, SaveFile } from '../src/core/index.js';
import { monsterSprites, paletteForTier } from '../src/renderer/sprites/index.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';
import { mountMenu } from '../src/menu/index.js';
import type { MenuBridge, MenuDocument, MenuElement } from '../src/menu/index.js';
import { canRebirth, consumeTargets, fuseCandidates, rosterRows } from '../src/menu/view.js';

/** Recording stand-in for a DOM element; a real element satisfies the same shape. */
class FakeEl {
  className = '';
  textContent: string | null = null;
  hidden = false;
  disabled = false;
  width = 0;
  height = 0;
  children: FakeEl[] = [];
  /** Every color drawSprite painted into this canvas. */
  readonly fills: string[] = [];
  private readonly listeners: Array<() => void> = [];

  constructor(readonly tag: string) {}

  append(...children: unknown[]): void {
    for (const child of children) {
      this.children.push(child as FakeEl);
    }
  }

  replaceChildren(...children: unknown[]): void {
    this.children = children.map((child) => child as FakeEl);
  }

  addEventListener(_type: 'click', listener: () => void): void {
    this.listeners.push(listener);
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

interface FakeBridge {
  bridge: MenuBridge;
  actions: CollectionAction[];
  readyCount(): number;
  /** Deliver one desmon:state-changed payload. */
  emit(save: unknown): void;
}

function makeBridge(): FakeBridge {
  const actions: CollectionAction[] = [];
  let ready = 0;
  let listener: ((save: unknown) => void) | null = null;
  return {
    actions,
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
    },
  };
}

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
function mounted(save: SaveFile = saveWith(COMPANIONS)): { doc: FakeDoc; fake: FakeBridge } {
  const doc = new FakeDoc();
  const fake = makeBridge();
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
    const canvases = doc.created.filter((el) => el.tag === 'canvas');
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
