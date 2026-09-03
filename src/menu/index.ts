// Menu DOM binder — SPEC F54/F55/F75 (Assumption 29; GAME_DESIGN_V2 §9,
// GAME_DESIGN_V3 §7). A thin binder over src/menu/view.ts: it owns no game
// state, it renders the save main sends and forwards every button press as a
// CollectionAction.
//
// DOM-free by injection (same policy as renderer/input.ts): mountMenu takes
// the document and the preload bridge as parameters — production passes the
// real globals in the boot at the bottom, tests pass fakes — so it runs under
// vitest's node environment. The menu NEVER imports electron or net; the
// bridge is its only way out.

import {
  autoParty,
  DEFAULT_SAVE,
  parseSave,
  PARTY_SIZE,
  pvpParty,
  SPECIES_IDS,
} from '../core/index.js';
import type { CollectionAction, Companion, SaveFile, SpeciesId } from '../core/index.js';
import { drawSprite, monsterSprites, paletteForTier } from '../renderer/sprites/index.js';
import type { SpriteCanvas } from '../renderer/sprites/index.js';
import type {
  IdentityPayload,
  LeaderboardResult,
  MatchResult,
  NetResult,
  PvpResult,
  ReclaimResult,
  Theft,
  TheftsResult,
} from '../shared/api.js';
import {
  battleEnabled,
  canRebirth,
  consumeTargets,
  fuseCandidates,
  leaderboardRows,
  miniRow,
  opponentRows,
  partyPreview,
  pvpResultText,
  rosterRows,
  theftRows,
  togglePick,
} from './view.js';
import type { MiniRow, RankRow, RosterRow, TheftRow } from './view.js';

/** The element surface this page touches — a real DOM element satisfies it. */
export interface MenuElement {
  className: string;
  textContent: string | null;
  hidden: boolean;
  disabled?: boolean;
  /** The name field's text; absent on everything else. */
  value?: string;
  width?: number;
  height?: number;
  append(...children: unknown[]): void;
  replaceChildren(...children: unknown[]): void;
  addEventListener(type: 'click' | 'change', listener: () => void): void;
  getContext?(id: '2d'): SpriteCanvas | null;
}

/** The document surface this page touches — the real `document` satisfies it. */
export interface MenuDocument {
  createElement(tag: string): MenuElement;
  querySelector(selectors: string): MenuElement | null;
}

/** The slice of window.desmon this page needs (src/renderer/global.d.ts). */
export interface MenuBridge {
  reportMenuReady(): void;
  onStateChanged(cb: (save: unknown) => void): () => void;
  sendAction(a: CollectionAction): Promise<void>;
  getIdentity(): Promise<IdentityPayload>;
  setName(name: string): Promise<IdentityPayload>;
  getLeaderboard(n?: number): Promise<NetResult<LeaderboardResult>>;
  pvpMatch(): Promise<NetResult<MatchResult>>;
  pvp(matchId: string, party: string[]): Promise<NetResult<PvpResult>>;
  thefts(): Promise<NetResult<TheftsResult>>;
  reclaim(theftId: string): Promise<NetResult<ReclaimResult>>;
}

/** Tab ids — each is both the tab button (`#tab-<id>`) and its panel (`#<id>`). */
const PANELS = ['roster', 'ranking', 'battle'] as const;

/** Card art: the 12x10 species idle frame at 2x fills the 24x20 canvas. */
const CARD_SCALE = 2;

/** NICK_RE's ceiling — the name field also carries it as `maxlength`. */
const NAME_MAX = 16;

/** The `#opponent` panel before the first `Find opponent` (F75). */
const NO_OPPONENT = 'No opponent yet';

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
 * Ranking loads on tab open; Battle names the player, finds an opponent
 * (`pvpMatch`), edits the party and fights it (`pvp`), then plays the theft
 * inbox — all of them take the identity's `online` flag as their offline
 * answer, so a server-less build never calls the network. Roster changes the
 * server made (`removed`, the stolen companion, a reclaim) reach the game ONLY
 * from here, as actions.
 */
export function mountMenu(doc: MenuDocument, api: MenuBridge): void {
  const roster = doc.querySelector('#roster');
  const rebirthBtn = doc.querySelector('#rebirth');
  const result = doc.querySelector('#result');
  const ranking = doc.querySelector('#ranking');
  const nameField = doc.querySelector('#name');
  const battleBtn = doc.querySelector('#battle-go');
  const findBtn = doc.querySelector('#find');
  const opponentEl = doc.querySelector('#opponent');
  const partyEl = doc.querySelector('#party');
  const picksEl = doc.querySelector('#picks');
  const autoBtn = doc.querySelector('#auto');
  const savePartyBtn = doc.querySelector('#save-party');
  const previewEl = doc.querySelector('#preview');
  const theftsEl = doc.querySelector('#thefts');
  // The page ships its own markup (static/menu.html); without it there is
  // nothing to bind and nothing to report ready for.
  if (
    !roster ||
    !rebirthBtn ||
    !result ||
    !ranking ||
    !nameField ||
    !battleBtn ||
    !findBtn ||
    !opponentEl ||
    !partyEl ||
    !picksEl ||
    !autoBtn ||
    !savePartyBtn ||
    !previewEl ||
    !theftsEl
  ) {
    return;
  }

  let save: SaveFile = DEFAULT_SAVE;
  let pending: Pending | null = null;
  let rank: NetResult<LeaderboardResult> | null = null;
  /** The previewed opponent — null before `Find opponent`, or once it expired. */
  let match: MatchResult | null = null;
  /** What the `#opponent` panel says while no match is loaded. */
  let opponentNote = NO_OPPONENT;
  /** The ids picked for my party, and the saved party they were synced from. */
  let picked: string[] = [];
  let syncedIds = '';
  let inbox: readonly Theft[] = [];
  /** Seconds left on the PvP cooldown; `ticker` runs while it counts down. */
  let cooldown = 0;
  let ticker: unknown = null;
  // One identity call per page: its `name` fills the field and its `online`
  // decides whether a tab may touch the network at all.
  const identity = api.getIdentity();

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
      if (t.id === 'ranking') openRanking();
      if (t.id === 'battle') loadThefts();
    });
  }

  const span = (className: string, text: string): MenuElement => {
    const e = doc.createElement('span');
    e.className = className;
    e.textContent = text;
    return e;
  };

  const div = (className: string, ...children: MenuElement[]): MenuElement => {
    const e = doc.createElement('div');
    e.className = className;
    e.append(...children);
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

  const speciesCanvas = (row: { speciesId: string; stars: number }): MenuElement => {
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

  /** The companion behind a card — its type badge comes from the live roster. */
  const byId = (id: string): Companion | undefined => save.companions.find((c) => c.id === id);

  /** The saved PvP party (auto until the player saves one of their own). */
  const savedParty = (): Companion[] => pvpParty(save.companions, save.pvpParty);

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

    const buttons = div(
      'row',
      consume,
      fuse,
      button('Reincarnate', pending !== null || !row.maxLevel, () => {
        send({ type: 'reincarnate', id: row.id });
      }),
      button('Sacrifice', pending !== null, () => {
        send({ type: 'sacrifice', id: row.id });
      }),
    );

    const c = byId(row.id);
    const el = doc.createElement('div');
    el.className = 'card';
    el.append(
      speciesCanvas(row),
      span('name', row.name),
      span('stars', row.starText),
      span('power', row.power),
      // v3 (F75): the elemental badge, and the mark of a PvP party member.
      ...(c ? [span(miniRow(c).typeClass, miniRow(c).typeBadge)] : []),
      ...(savedParty().some((m) => m.id === row.id) ? [span('pvp-mark', '★ PvP')] : []),
      buttons,
    );
    return el;
  };

  const rankRow = (r: RankRow): MenuElement => {
    // ponytail: the leaderboard borrows the card's styled columns — `.power`
    // is the right-aligned number, `.stars` the small badge — instead of new CSS.
    return div(
      'row',
      span('rank', r.rank),
      span('name', r.name),
      span('power', r.deepest),
      span('stars', r.rebirths),
    );
  };

  /** A `.card.mini`; `pick` makes it a roster toggle button (F75 §3). */
  const miniCard = (m: MiniRow, pick = false): MenuElement => {
    const el = doc.createElement(pick ? 'button' : 'div');
    el.className = pick && picked.includes(m.id) ? 'card mini pick selected' : pick ? 'card mini pick' : 'card mini';
    el.append(
      speciesCanvas(m),
      span('name', m.name),
      span('stars', m.starText),
      span(m.typeClass, m.typeBadge),
    );
    if (pick) {
      el.addEventListener('click', () => {
        picked = togglePick(picked, m.id);
        render();
      });
    }
    return el;
  };

  /** The `#opponent` panel: the previewed party, the bot line, or the note. */
  const opponentPanel = (): MenuElement[] => {
    if (match === null) return [span('name', opponentNote)];
    if (match.bot) return [span('name', 'Training Dummy (no party)')];
    const { name, bestIndex, rebirths } = match.opponent;
    return [
      span('name', name),
      span('power', `Monster ${String(bestIndex)}`),
      span('stars', `♻×${String(rebirths)}`),
      div('party', ...opponentRows(match).map((m) => miniCard(m))),
    ];
  };

  const theftRow = (t: TheftRow): MenuElement =>
    div(
      'row',
      span('name', t.text),
      button('Reclaim', false, () => {
        reclaim(t.id);
      }),
    );

  const render = (): void => {
    const rows = rosterRows(save);
    roster.replaceChildren(
      ...(rows.length === 0
        ? [span('row', 'No companions yet — beat a boss to capture one.')]
        : rows.map(card)),
    );
    rebirthBtn.disabled = !canRebirth(save);
    ranking.replaceChildren(...(rank === null ? [] : leaderboardRows(rank).map(rankRow)));

    // Battle tab (F75): opponent preview, party editor, live preview, inbox.
    opponentEl.replaceChildren(...opponentPanel());
    partyEl.replaceChildren(
      ...Array.from({ length: PARTY_SIZE }, (_, i) => {
        const c = picked[i] === undefined ? undefined : byId(picked[i]);
        return div('slot', ...(c ? [miniCard(miniRow(c))] : []));
      }),
    );
    picksEl.replaceChildren(...save.companions.map((c) => miniCard(miniRow(c), true)));
    previewEl.textContent = partyPreview(
      picked.flatMap((id) => byId(id) ?? []),
      match?.opponent.party ?? [],
    );
    theftsEl.replaceChildren(...theftRows(inbox, Date.now()).map(theftRow));
    battleBtn.textContent = cooldown > 0 ? `Battle! (${String(cooldown)}s)` : 'Battle!';
    battleBtn.disabled = !battleEnabled({ match, party: picked, cooldownUntil: cooldown });
  };

  /** Fire-and-forget bridge call: a rejected invoke must not break the page. */
  const settle = <T>(p: Promise<T>, use: (value: T) => void): void => {
    void p.then(use, () => undefined);
  };

  /** Run `fn` only when the server is reachable; otherwise answer `offline`. */
  const online = (fn: () => void, offline: () => void): void => {
    settle(identity, (id) => {
      if (id.online) fn();
      else offline();
    });
  };

  /** The server stripped these companions from my roster — tell the game. */
  const forwardRemoved = (removed: string[]): void => {
    if (removed.length > 0) void api.sendAction({ type: 'removeCompanions', ids: removed });
  };

  /** Client countdown from the server's retryAfterSec; 0 re-arms the button. */
  const startCooldown = (sec: number): void => {
    cooldown = Math.max(0, Math.ceil(sec));
    if (cooldown === 0 || ticker !== null) return;
    ticker = setInterval(() => {
      cooldown -= 1;
      if (cooldown <= 0) {
        clearInterval(ticker);
        ticker = null;
      }
      render();
    }, 1000);
  };

  const openRanking = (): void => {
    const show = (r: NetResult<LeaderboardResult>): void => {
      if (r.ok) forwardRemoved(r.value.removed);
      rank = r;
      render();
    };
    online(
      () => {
        settle(api.getLeaderboard(), show);
      },
      () => {
        show({ ok: false, error: 'offline' });
      },
    );
  };

  /** Step 1 of a battle (F75 §1/§2): the server picks the opponent. */
  const find = (): void => {
    const show = (r: NetResult<MatchResult>): void => {
      match = r.ok ? r.value : null;
      if (r.ok) opponentNote = NO_OPPONENT;
      result.textContent = r.ok ? '' : pvpResultText(r);
      render();
    };
    online(
      () => {
        settle(api.pvpMatch(), show);
      },
      () => {
        show({ ok: false, error: 'offline' });
      },
    );
  };

  /**
   * Step 2 (F55/F75 §4): the loaded match plus my picked party. A win only
   * reaches the game from here — `removed` first, then the verdict with the
   * replay the game window plays (F66).
   */
  const pvp = (): void => {
    const loaded = match;
    if (loaded === null) return;
    const show = (r: NetResult<PvpResult>): void => {
      if (r.ok) {
        const { win, stolen, opponent, blows, removed } = r.value;
        forwardRemoved(removed);
        void api.sendAction({
          type: 'pvpResult',
          won: win,
          stolen,
          lostId: null,
          replay: { opponentName: opponent.name, opponentParty: opponent.party, blows },
        });
        // The server consumed the match: the next battle needs a new one.
        match = null;
        loadThefts();
      } else if (r.error === 'cooldown') {
        startCooldown(r.retryAfterSec ?? 0);
      } else if (r.error === 'expired') {
        match = null;
        opponentNote = 'Opponent expired — find again';
      }
      result.textContent = r.ok || r.error !== 'expired' ? pvpResultText(r) : '';
      render();
    };
    online(
      () => {
        settle(api.pvp(loaded.matchId, [...picked]), show);
      },
      () => {
        show({ ok: false, error: 'offline' });
      },
    );
  };

  /** The theft inbox (F75 §5) — refreshed on tab open and after every battle. */
  const loadThefts = (): void => {
    const show = (r: NetResult<TheftsResult>): void => {
      inbox = r.ok ? r.value.thefts : [];
      render();
    };
    online(
      () => {
        settle(api.thefts(), show);
      },
      () => {
        show({ ok: false, error: 'offline' });
      },
    );
  };

  /** Take a stolen companion back: the game gets it as an `addCompanion`. */
  const reclaim = (theftId: string): void => {
    settle(api.reclaim(theftId), (r) => {
      if (r.ok) {
        void api.sendAction({ type: 'addCompanion', companion: r.value.companion });
        loadThefts();
        return;
      }
      // Only a settled window drops the row; a network hiccup keeps it.
      if (r.error === 'expired' || r.error === 'gone') {
        inbox = inbox.filter((t) => t.id !== theftId);
        result.textContent =
          r.error === 'expired' ? 'Too late — the reclaim window closed.' : 'Gone — the thief no longer has it.';
      }
      render();
    });
  };

  rebirthBtn.addEventListener('click', () => {
    if (canRebirth(save)) send({ type: 'rebirth' });
  });

  findBtn.addEventListener('click', find);

  battleBtn.addEventListener('click', () => {
    if (battleEnabled({ match, party: picked, cooldownUntil: cooldown })) pvp();
  });

  autoBtn.addEventListener('click', () => {
    picked = autoParty(save.companions).map((c) => c.id);
    render();
  });

  savePartyBtn.addEventListener('click', () => {
    void api.sendAction({ type: 'setPvpParty', ids: [...picked] });
    render();
  });

  // The field is the only writer of the name; main validates and answers with
  // the identity it kept, so the field always shows what the server will see.
  nameField.addEventListener('change', () => {
    settle(api.setName((nameField.value ?? '').slice(0, NAME_MAX)), (id) => {
      nameField.value = id.name;
    });
  });

  settle(identity, (id) => {
    nameField.value = id.name;
  });

  api.onStateChanged((raw) => {
    // Trust boundary: the payload is whatever main read off disk.
    save = parseSave(raw);
    pending = null;
    // Re-seed the editor only when the SAVED party moved: an autosave must not
    // throw away the picks the player is still editing.
    const ids = savedParty().map((c) => c.id);
    if (ids.join(',') !== syncedIds) {
      syncedIds = ids.join(',');
      picked = ids;
    }
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
// Declared locally too: the DOM and node lib types disagree on the handle.
declare const setInterval: (cb: () => void, ms: number) => unknown;
declare const clearInterval: (handle: unknown) => void;

if (typeof document !== 'undefined') {
  mountMenu(document, window.desmon);
}
