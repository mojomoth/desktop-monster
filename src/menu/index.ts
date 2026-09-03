// Menu DOM binder — SPEC F54 (Assumption 29; GAME_DESIGN_V2 §9). A thin
// binder over src/menu/view.ts: it owns no game state, it renders the save
// main sends and forwards every button press as a CollectionAction.
//
// DOM-free by injection (same policy as renderer/input.ts): mountMenu takes
// the document and the preload bridge as parameters — production passes the
// real globals in the boot at the bottom, tests pass fakes — so it runs under
// vitest's node environment. The menu NEVER imports electron or net; the
// bridge is its only way out.

import { DEFAULT_SAVE, parseSave, SPECIES_IDS } from '../core/index.js';
import type { CollectionAction, SaveFile, SpeciesId } from '../core/index.js';
import { drawSprite, monsterSprites, paletteForTier } from '../renderer/sprites/index.js';
import type { SpriteCanvas } from '../renderer/sprites/index.js';
import { canRebirth, consumeTargets, fuseCandidates, rosterRows } from './view.js';
import type { RosterRow } from './view.js';

/** The element surface this page touches — a real DOM element satisfies it. */
export interface MenuElement {
  className: string;
  textContent: string | null;
  hidden: boolean;
  disabled?: boolean;
  width?: number;
  height?: number;
  append(...children: unknown[]): void;
  replaceChildren(...children: unknown[]): void;
  addEventListener(type: 'click', listener: () => void): void;
  getContext?(id: '2d'): SpriteCanvas | null;
}

/** The document surface this page touches — the real `document` satisfies it. */
export interface MenuDocument {
  createElement(tag: string): MenuElement;
  querySelector(selectors: string): MenuElement | null;
}

/** The slice of window.desmon the roster needs (T49 adds the net methods). */
export interface MenuBridge {
  reportMenuReady(): void;
  onStateChanged(cb: (save: unknown) => void): () => void;
  sendAction(a: CollectionAction): Promise<void>;
}

/** Tab ids — each is both the tab button (`#tab-<id>`) and its panel (`#<id>`). */
const PANELS = ['roster', 'ranking', 'battle'] as const;

/** Card art: the 12x10 species idle frame at 2x fills the 24x20 canvas. */
const CARD_SCALE = 2;

/** A half-finished two-companion action, waiting for its partner card. */
interface Pending {
  kind: 'consume' | 'fuse';
  id: string;
}

/** Species art key for a runtime species id (unknown ids fall back to slime). */
function speciesKey(speciesId: string): SpeciesId {
  const ids: readonly string[] = SPECIES_IDS;
  return ids.includes(speciesId) ? (speciesId as SpeciesId) : SPECIES_IDS[0];
}

/**
 * Bind the Collection & Battle page: boot reports the menu ready, every
 * `desmon:state-changed` re-renders the roster, and the card buttons send
 * consume/fuse/reincarnate/sacrifice/rebirth back through the bridge.
 * Ranking and Battle stay the placeholders of static/menu.html until T49.
 */
export function mountMenu(doc: MenuDocument, api: MenuBridge): void {
  const roster = doc.querySelector('#roster');
  const rebirthBtn = doc.querySelector('#rebirth');
  const result = doc.querySelector('#result');
  // The page ships its own markup (static/menu.html); without it there is
  // nothing to bind and nothing to report ready for.
  if (!roster || !rebirthBtn || !result) return;

  let save: SaveFile = DEFAULT_SAVE;
  let pending: Pending | null = null;

  const tabs = PANELS.map((id) => ({
    id,
    tab: doc.querySelector(`#tab-${id}`),
    panel: doc.querySelector(`#${id}`),
  }));
  for (const t of tabs) {
    t.tab?.addEventListener('click', () => {
      for (const other of tabs) {
        if (other.tab) other.tab.className = other.id === t.id ? 'tab active' : 'tab';
        if (other.panel) other.panel.hidden = other.id !== t.id;
      }
    });
  }

  const span = (className: string, text: string): MenuElement => {
    const e = doc.createElement('span');
    e.className = className;
    e.textContent = text;
    return e;
  };

  // A disabled button carries no listener: the page re-renders after every
  // action, so a stale handler can never fire.
  const button = (label: string, disabled: boolean, onClick: () => void): MenuElement => {
    const b = doc.createElement('button');
    b.className = 'btn';
    b.textContent = label;
    b.disabled = disabled;
    if (!disabled) b.addEventListener('click', onClick);
    return b;
  };

  const send = (a: CollectionAction): void => {
    pending = null;
    result.textContent = '';
    void api.sendAction(a);
    render();
  };

  const select = (kind: Pending['kind'], row: RosterRow, hint: string): void => {
    pending = { kind, id: row.id };
    result.textContent = `${hint} ${row.name}.`;
    render();
  };

  const cancel = (): void => {
    pending = null;
    result.textContent = '';
    render();
  };

  const speciesCanvas = (row: RosterRow): MenuElement => {
    const canvas = doc.createElement('canvas');
    canvas.className = 'species';
    canvas.width = monsterSprites[speciesKey(row.speciesId)].idle.w * CARD_SCALE;
    canvas.height = monsterSprites[speciesKey(row.speciesId)].idle.h * CARD_SCALE;
    const ctx = canvas.getContext?.('2d');
    if (ctx) {
      const idle = monsterSprites[speciesKey(row.speciesId)].idle;
      // Stars are the card's palette tier, the way monster tiers tint the
      // overlay art (GAME_ARCHITECTURE §4); DrawSpriteOptions has no palette.
      const tinted = { ...idle, palette: paletteForTier(idle.palette, row.stars) };
      drawSprite(ctx, tinted, 0, 0, 0, { scale: CARD_SCALE });
    }
    return canvas;
  };

  const card = (row: RosterRow): MenuElement => {
    const isPending = pending?.id === row.id;
    const fusable = fuseCandidates(save).some(([a, b]) =>
      pending === null ? a === row.id || b === row.id : isPair(pending.id, row.id, a, b),
    );

    const consume =
      pending?.kind === 'consume'
        ? isPending
          ? button('Cancel', false, cancel)
          : button('Feed', !consumeTargets(save, row.id).includes(pending.id), () => {
              if (pending) send({ type: 'consume', targetId: pending.id, foodId: row.id });
            })
        : button('Consume', pending !== null || consumeTargets(save, row.id).length === 0, () => {
            select('consume', row, 'Pick a companion to feed to');
          });

    const fuse =
      pending?.kind === 'fuse'
        ? isPending
          ? button('Cancel', false, cancel)
          : button('Fuse!', !fusable, () => {
              if (pending) send({ type: 'fuse', aId: pending.id, bId: row.id });
            })
        : button('Fuse', pending !== null || !fusable, () => {
            select('fuse', row, 'Pick the twin of');
          });

    const buttons = doc.createElement('div');
    buttons.className = 'row';
    buttons.append(
      consume,
      fuse,
      button('Reincarnate', pending !== null || !row.maxLevel, () => {
        send({ type: 'reincarnate', id: row.id });
      }),
      button('Sacrifice', pending !== null, () => {
        send({ type: 'sacrifice', id: row.id });
      }),
    );

    const el = doc.createElement('div');
    el.className = 'card';
    el.append(
      speciesCanvas(row),
      span('name', row.name),
      span('stars', row.starText),
      span('power', row.power),
      buttons,
    );
    return el;
  };

  const render = (): void => {
    const rows = rosterRows(save);
    roster.replaceChildren(
      ...(rows.length === 0
        ? [span('row', 'No companions yet — beat a boss to capture one.')]
        : rows.map(card)),
    );
    rebirthBtn.disabled = !canRebirth(save);
  };

  rebirthBtn.addEventListener('click', () => {
    if (canRebirth(save)) send({ type: 'rebirth' });
  });

  api.onStateChanged((raw) => {
    // Trust boundary: the payload is whatever main read off disk.
    save = parseSave(raw);
    pending = null;
    render();
  });

  render();
  api.reportMenuReady();
}

/** True when the unordered pair {x, y} is the unordered pair {a, b}. */
function isPair(x: string, y: string, a: string, b: string): boolean {
  return (a === x && b === y) || (a === y && b === x);
}

// Boot. `document`/`window` are declared locally (module scope) so this file
// also compiles in the DOM-free test project, and the typeof guard keeps it
// importable from vitest's node environment.
declare const document: MenuDocument;
declare const window: { desmon: MenuBridge };

if (typeof document !== 'undefined') {
  mountMenu(document, window.desmon);
}
