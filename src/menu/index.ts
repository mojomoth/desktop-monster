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
  companionPower,
  companionReincarnationPreview,
  DEFAULT_SAVE,
  format,
  heroForm,
  heroReady,
  heroRerollCost,
  heroRequiredLevel,
  isSpeciesId,
  parseSave,
  PARTY_SIZE,
  pvpParty,
  RELEASES_PER_SOUL,
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
  OpponentListResult,
  OpponentSummary,
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
import { heroPanel, heroCanvas } from './hero.js';
import { mountCodex } from './codex.js';
import { mountShop } from './economy.js';
import { mountProfile } from './profile.js';
import { NICK_RE } from '../shared/api.js';

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
  /** Native details disclosure state, preserved across live save updates. */
  open?: boolean;
  append(...children: unknown[]): void;
  replaceChildren(...children: unknown[]): void;
  addEventListener(type: 'click' | 'change', listener: () => void): void;
  getContext?(id: '2d'): SpriteCanvas | null;
  setAttribute?(name: string, value: string): void;
  focus?(): void;
}

/** The document surface this page touches — the real `document` satisfies it. */
export interface MenuDocument {
  readonly activeElement?: MenuElement | null;
  createElement(tag: string): MenuElement;
  querySelector(selectors: string): MenuElement | null;
}

/** The slice of window.desmon this page needs (src/renderer/global.d.ts). */
export interface MenuBridge {
  reportMenuReady(): void;
  onSaveFailed?(cb: () => void): () => void;
  onStateChanged(cb: (save: unknown) => void): () => void;
  sendAction(a: CollectionAction): Promise<void>;
  getIdentity(): Promise<IdentityPayload>;
  setName(name: string): Promise<IdentityPayload>;
  getLeaderboard(n?: number): Promise<NetResult<LeaderboardResult>>;
  pvpOpponents?(): Promise<NetResult<OpponentListResult>>;
  pvpMatch(opponentId?: string): Promise<NetResult<MatchResult>>;
  pvp(matchId: string, party: string[]): Promise<NetResult<PvpResult>>;
  thefts(): Promise<NetResult<TheftsResult>>;
  reclaim(theftId: string): Promise<NetResult<ReclaimResult>>;
}

/** Tab ids — each is both the tab button (`#tab-<id>`) and its panel (`#<id>`). */
const PANELS = ['hero', 'shop', 'codex', 'profile', 'roster', 'ranking', 'battle'] as const;

/**
 * Card art: species idle frame at the uniform 1x scale (2026-09-04) on a fixed
 * buffer sized to the LARGEST species, each smaller species centred + bottom-
 * aligned. CSS (`canvas.species`) scales the buffer to the on-screen card, so
 * bigger species read bigger in the menu too.
 */
const CARD_SCALE = 1;
const CARD_W = Math.max(...SPECIES_IDS.map((id) => monsterSprites[id].idle.w));
const CARD_H = Math.max(...SPECIES_IDS.map((id) => monsterSprites[id].idle.h));

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
  return isSpeciesId(speciesId) ? speciesId : SPECIES_IDS[0];
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
  const heroEl = doc.querySelector('#hero');
  const shopEl = doc.querySelector('#shop');
  const codexEl = doc.querySelector('#codex');
  const profileStatsEl = doc.querySelector('#profile-stats');
  const nameStatus = doc.querySelector('#name-status');
  const nameSaveBtn = doc.querySelector('#save-name');
  const rebirthBtn = doc.querySelector('#rebirth');
  const result = doc.querySelector('#result');
  const saveStatus = doc.querySelector('#save-status');
  const ranking = doc.querySelector('#ranking');
  const nameField = doc.querySelector('#name');
  const battleBtn = doc.querySelector('#battle-go');
  const findBtn = doc.querySelector('#find');
  const opponentEl = doc.querySelector('#opponent');
  const opponentsEl = doc.querySelector('#opponents');
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
  let reincarnation: Companion | null = null;
  let rank: NetResult<LeaderboardResult> | null = null;
  /** The previewed opponent — null before `Find opponent`, or once it expired. */
  let match: MatchResult | null = null;
  let opponents: OpponentSummary[] = [];
  let selectedOpponentId: string | null = null;
  let directoryNote = '상대 목록을 불러오세요.';
  let directoryLoading = false;
  let matchLoading = false;
  let battleLoading = false;
  /** What the `#opponent` panel says while no match is loaded. */
  let opponentNote = NO_OPPONENT;
  /** Use the server's existing expiry boundary; never send a stale preview. */
  const expireMatch = (): boolean => {
    if (match === null || Date.now() <= match.expiresAt) return false;
    match = null;
    selectedOpponentId = null;
    opponentNote = 'Opponent expired — find again';
    return true;
  };
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
        other.tab?.setAttribute?.('aria-selected', String(other.id === t.id));
        if (other.panel) other.panel.hidden = other.id !== t.id;
      }
      if (t.id === 'ranking') openRanking();
      if (t.id === 'battle') {
        loadThefts();
        if (api.pvpOpponents) loadOpponents();
      }
      render();
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

  // Autosaves update numbers frequently. Keep the gallery and actionable
  // choices mounted so scrolling, keyboard focus and an open details survive.
  const heroSections = heroEl ? [div('hero-heading'), div('hero-controls')] : [];
  heroEl?.replaceChildren(...heroSections);
  let heroControlsKey = '';
  let rosterKey = '';

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
    reincarnation = null;
    result.textContent = '';
    void api.sendAction(a).catch(() => { result.textContent = '요청을 보내지 못했습니다. 다시 시도해 주세요.'; });
    render();
  };
  const updateCodex = codexEl ? mountCodex(doc, codexEl, send) : undefined;
  const updateShop = shopEl ? mountShop(doc, shopEl, send) : undefined;
  const updateProfile = profileStatsEl ? mountProfile(doc, profileStatsEl) : undefined;

  const select = (kind: Pending['kind'], row: RosterRow, hint: string): void => {
    pending = { kind, id: row.id };
    result.textContent = `${hint} ${row.name}.`;
    render();
  };

  const cancel = (): void => {
    pending = null;
    reincarnation = null;
    result.textContent = '';
    render();
  };

  const speciesCanvas = (row: { speciesId: string; stars: number }): MenuElement => {
    const canvas = doc.createElement('canvas');
    canvas.className = 'species';
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext?.('2d');
    if (ctx) {
      const idle = monsterSprites[speciesKey(row.speciesId)].idle;
      // Stars are the card's palette tier, the way monster tiers tint the
      // overlay art (GAME_ARCHITECTURE §4); DrawSpriteOptions has no palette.
      const tinted = { ...idle, palette: paletteForTier(idle.palette, row.stars) };
      const dx = Math.floor((CARD_W - idle.w) / 2);
      drawSprite(ctx, tinted, 0, dx, CARD_H - idle.h, { scale: CARD_SCALE });
    }
    return canvas;
  };

  /** The companion behind a card — its type badge comes from the live roster. */
  const byId = (id: string): Companion | undefined => save.companions.find((c) => c.id === id);
  const matchesConfirmation = (expected: Companion): boolean => {
    const current = byId(expected.id);
    return current !== undefined && current.speciesId === expected.speciesId && current.bossIndex === expected.bossIndex &&
      current.level === expected.level && current.stars === expected.stars;
  };

  /** The saved PvP party (auto until the player saves one of their own). */
  const savedParty = (): Companion[] => pvpParty(save.companions, save.pvpParty, save.hero?.equipped);

  const card = (row: RosterRow): MenuElement => {
    const c = byId(row.id);
    const isPending = pending?.id === row.id;
    const busy = pending !== null || reincarnation !== null;
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
        : button('Consume', busy || !save.companions.some((food) => consumeTargets(save, food.id).includes(row.id)), () => {
            select('consume', row, 'Pick a companion to feed to');
          });

    const fuse =
      pending?.kind === 'fuse'
        ? isPending
          ? button('Cancel', false, cancel)
          : button('Fuse!', !fusable, () => {
              if (pending) send({ type: 'fuse', aId: pending.id, bId: row.id });
            })
        : button('Fuse', busy || !fusable, () => {
            select('fuse', row, 'Pick the twin of');
          });

    const buttons = div(
      'row',
      consume,
      fuse,
      button('Reincarnate', busy || !row.maxLevel, () => {
        const current = byId(row.id);
        if (pending || reincarnation || !current || !companionReincarnationPreview(current)) return;
        reincarnation = { ...current };
        result.textContent = '';
        render();
      }),
      button('Sacrifice', busy, () => {
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
      // v3 (F75): the elemental badge, and the mark of a PvP party member.
      ...(c ? [span(miniRow(c).typeClass, miniRow(c).typeBadge)] : []),
      ...(savedParty().some((m) => m.id === row.id) ? [span('pvp-mark', '★ PvP')] : []),
      buttons,
    );
    const expected = reincarnation;
    const preview = expected?.id === row.id && c ? companionReincarnationPreview(c) : null;
    if (expected && preview) {
      const power = span('reincarnation-power', `기본 힘 ${format(preview.beforePower)} → ${format(preview.afterPower)}`);
      power.setAttribute?.('title', `${preview.beforePower} → ${preview.afterPower}`);
      power.setAttribute?.('aria-label', `기본 힘 ${preview.beforePower}에서 ${preview.afterPower}로 변경`);
      el.append(div('row reincarnation-confirmation',
        span('reincarnation-result', `${row.name} · Lv.${expected.level} → Lv.${preview.level} · ★${expected.stars} → ★${preview.stars}`),
        power,
        span('muted', '환생하면 레벨이 초기화되어 기본 힘이 감소합니다.'),
        button('환생 확인', false, () => {
          if (reincarnation !== expected) return;
          if (!matchesConfirmation(expected)) {
            reincarnation = null;
            result.textContent = '동료가 변경되어 환생 확인을 취소했습니다. 다시 확인해 주세요.';
            render();
            return;
          }
          const { speciesId, bossIndex, level, stars } = expected;
          send({ type: 'reincarnate', id: expected.id, expected: { speciesId, bossIndex, level, stars } });
        }),
        button('취소', false, () => { if (reincarnation === expected) cancel(); }),
      ));
    }
    return el;
  };

  /**
   * A full roster used to swallow captures in silence. Say what the releases
   * already paid, and put the single obvious trade — the weakest keeper —
   * one click away, without choosing it for the player.
   */
  const rosterFullNotice = (rows: readonly RosterRow[]): MenuElement[] => {
    const released = save.releasedCount ?? 0;
    const weakest = rows.reduce((min: RosterRow | undefined, row) => {
      const c = byId(row.id);
      const m = min ? byId(min.id) : undefined;
      return c && (!m || companionPower(c) < companionPower(m)) ? row : min;
    }, undefined);
    return [
      span('muted', `동료 30/30 · 보관함이 가득 찼습니다. 가득 찬 뒤 놓아준 보스 ${released}마리가 영혼 ${Math.floor(released / RELEASES_PER_SOUL)}을 남겼습니다. Consume / Fuse / Sacrifice로 자리를 만들면 새 보스 동료를 포획할 수 있습니다.`),
      ...(weakest
        ? [div('row', button(`가장 약한 ${weakest.name} 방출`, pending !== null || reincarnation !== null, () => {
            send({ type: 'sacrifice', id: weakest.id });
          }))]
        : []),
    ];
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

  // Native buttons retain Tab/Shift+Tab and Enter/Space behavior. Keep them mounted
  // and use aria-disabled during requests so the focused selection is not detached.
  const directoryRows = new Map<string, { row: MenuElement; select: MenuElement; update: (opponent: OpponentSummary) => void }>();
  const directoryStatus = span('muted', directoryNote);
  let directoryIds = '';
  const renderDirectory = (): void => {
    if (!opponentsEl) return;
    const focusedId = [...directoryRows].find(([, nodes]) => nodes.select === doc.activeElement)?.[0];
    for (const id of directoryRows.keys()) {
      if (!opponents.some(opponent => opponent.playerId === id)) directoryRows.delete(id);
    }
    for (const opponent of opponents) {
      const id = opponent.playerId;
      if (!directoryRows.has(id)) {
        const art = span('opponent-hero', '');
        const name = span('name', '');
        const heroName = span('opponent-hero-name', '');
        const record = span('record', '');
        const depth = span('muted', '');
        const party = div('party');
        const select = button('상대 선택 · 파티 미리보기', false, () => {
          if (directoryRows.get(id)?.select === select && !directoryLoading && !matchLoading && !battleLoading) find(id);
        });
        const row = div('opponent-card', art, name, heroName, record, depth, party, select);
        row.setAttribute?.('data-player-id', id);
        let contentKey = '';
        directoryRows.set(id, { row, select, update(next) {
          const key = JSON.stringify(next);
          if (contentKey !== key) {
            contentKey = key;
            art.replaceChildren(heroCanvas(doc, next.hero.formId, 64));
            name.textContent = `#${next.rank} ${next.name}`;
            heroName.textContent = heroForm(next.hero.formId)?.name ?? '수습 영웅';
            record.textContent = `${next.wins}승 ${next.losses}패`;
            depth.textContent = `최고 몬스터 ${next.bestIndex}`;
            party.replaceChildren(...(next.party.length ? next.party.map(c => miniCard(miniRow(c))) : [span('muted', '동료 파티 없음')]));
            select.setAttribute?.('aria-label', `#${next.rank} ${next.name} · 상대 선택 · 파티 미리보기`);
          }
          const selected = selectedOpponentId === id;
          row.className = `opponent-card${selected ? ' selected' : ''}`;
          select.textContent = selected ? matchLoading ? '선택한 상대 · 불러오는 중…' : '선택한 상대 · 파티 미리보기' : '상대 선택 · 파티 미리보기';
          select.setAttribute?.('aria-pressed', String(selected));
          select.setAttribute?.('aria-disabled', String(directoryLoading || matchLoading || battleLoading));
        } });
      }
      directoryRows.get(id)!.update(opponent);
    }
    directoryStatus.textContent = directoryNote;
    const ids = JSON.stringify(opponents.map(opponent => opponent.playerId));
    if (directoryIds !== ids) {
      directoryIds = ids;
      opponentsEl.replaceChildren(...(opponents.length ? opponents.map(opponent => directoryRows.get(opponent.playerId)!.row) : [directoryStatus]));
      if (focusedId) (directoryRows.get(focusedId)?.select ?? findBtn).focus?.();
    }
  };

  /** The `#opponent` panel: the previewed party, the bot line, or the note. */
  const opponentPanel = (): MenuElement[] => {
    if (match === null) return [span('name', opponentNote)];
    if (match.bot) return [span('name', 'Training Dummy (no party)')];
    const { name, bestIndex, rebirths } = match.opponent;
    return [
      ...(match.opponent.hero ? [heroCanvas(doc, match.opponent.hero.formId)] : []),
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
    expireMatch();
    if (heroEl) {
      const parts = heroPanel(doc, save, send);
      heroSections[0]?.replaceChildren(parts[0]);
      const controlsKey = JSON.stringify([save.hero?.choices, save.hero?.collection, save.hero?.offerSerial,
        save.hero?.reincarnations, save.hero?.deferRemainingMs, save.hero?.restRemainingMs,
        heroReady(save.level, save.hero), save.level >= heroRequiredLevel(save.hero?.reincarnations ?? 0), Math.min(save.coins, heroRerollCost(save.hero?.reincarnations ?? 0))]);
      if (controlsKey !== heroControlsKey) {
        heroControlsKey = controlsKey;
        heroSections[1]?.replaceChildren(parts[1]);
      }
    }
    updateShop?.(save);
    updateCodex?.(save);
    updateProfile?.(save);
    // Keep an unchanged confirmation mounted during frequent save updates.
    const nextRosterKey = JSON.stringify([save.companions, save.pvpParty, save.hero?.equipped,
      save.releasedCount, pending, reincarnation]);
    if (rosterKey !== nextRosterKey) {
      rosterKey = nextRosterKey;
      const rows = rosterRows(save);
      roster.replaceChildren(
        ...(rows.length >= 30 ? rosterFullNotice(rows) : []),
        ...(rows.length === 0
          ? [span('row', 'No companions yet — beat a boss to capture one.')]
          : rows.map(card)),
      );
    }
    rebirthBtn.disabled = !canRebirth(save);
    ranking.replaceChildren(...(rank === null ? [] : leaderboardRows(rank).map(rankRow)));

    // Battle tab (F75): opponent preview, party editor, live preview, inbox.
    opponentEl.replaceChildren(...opponentPanel());
    findBtn.disabled = matchLoading || battleLoading;
    findBtn.setAttribute?.('aria-disabled', String(directoryLoading || matchLoading || battleLoading));
    renderDirectory();
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
      save.hero?.equipped,
    );
    theftsEl.replaceChildren(...theftRows(inbox, Date.now()).map(theftRow));
    battleBtn.textContent = cooldown > 0 ? `Battle! (${String(cooldown)}s)` : 'Battle!';
    battleBtn.disabled = directoryLoading || battleLoading || matchLoading || !battleEnabled({ match, party: picked, cooldownUntil: cooldown });
  };

  /** Fire-and-forget bridge call: a rejected invoke must not break the page. */
  const settle = <T>(p: Promise<T>, use: (value: T) => void): void => {
    void p.then(use, () => undefined);
  };

  /** Run `fn` only when the server is reachable; otherwise answer `offline`. */
  const online = (fn: () => void, offline: () => void): void => {
    void identity.then(id => { if (id.online) fn(); else offline(); }, offline);
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

  /** Refresh the directory without leaving a match for a removed opponent armed. */
  const loadOpponents = (): void => {
    if (!api.pvpOpponents || directoryLoading || matchLoading || battleLoading) return;
    directoryLoading = true;
    directoryNote = '상대 목록을 불러오는 중…';
    render();
    const show = (r: NetResult<OpponentListResult>): void => {
      directoryLoading = false;
      opponents = r.ok ? r.value.opponents : [];
      directoryNote = r.ok ? '아직 대전 상대가 없습니다. 나중에 목록을 새로고침하세요.' : '서버에 연결할 수 없습니다. 목록 새로고침으로 다시 시도하세요.';
      if (!r.ok || (selectedOpponentId !== null && !opponents.some(opponent => opponent.playerId === selectedOpponentId))) {
        match = null;
        selectedOpponentId = null;
        opponentNote = r.ok ? '선택한 상대가 목록에 없습니다. 목록을 새로고침하고 다시 선택하세요.' : directoryNote;
      }
      render();
    };
    online(() => { void api.pvpOpponents!().then(show, () => show({ ok: false, error: 'network' })); },
      () => show({ ok: false, error: 'offline' }));
  };

  const find = (opponentId?: string): void => {
    if (directoryLoading || matchLoading || battleLoading || (opponentId !== undefined && !opponents.some(opponent => opponent.playerId === opponentId))) return;
    matchLoading = true;
    match = null;
    selectedOpponentId = opponentId ?? null;
    opponentNote = '상대 미리보기를 불러오는 중…';
    const show = (r: NetResult<MatchResult>): void => {
      matchLoading = false;
      const mismatch = r.ok && opponentId !== undefined && (r.value.bot || r.value.opponent.playerId !== opponentId);
      match = r.ok && !mismatch ? r.value : null;
      if (match) { opponentNote = NO_OPPONENT; result.textContent = ''; }
      else {
        selectedOpponentId = null;
        opponentNote = mismatch ? '선택한 상대와 응답이 일치하지 않습니다. 목록을 새로고침하세요.' : '상대를 불러오지 못했습니다. 목록을 새로고침하고 다시 선택하세요.';
        result.textContent = r.ok ? opponentNote : pvpResultText(r);
      }
      render();
      if (!match && opponentId !== undefined && doc.activeElement === directoryRows.get(opponentId)?.select) findBtn.focus?.();
    };
    online(
      () => {
        void api.pvpMatch(opponentId).then(show, () => show({ ok: false, error: 'network' }));
      },
      () => {
        show({ ok: false, error: 'offline' });
      },
    );
    render();
  };

  /**
   * Step 2 (F55/F75 §4): the loaded match plus my picked party. A win only
   * reaches the game from here — `removed` first, then the verdict with the
   * replay the game window plays (F66).
   */
  const pvp = (): void => {
    if (expireMatch()) { render(); findBtn.focus?.(); return; }
    const loaded = match;
    if (loaded === null || directoryLoading || matchLoading || battleLoading) return;
    const selectedId = selectedOpponentId;
    battleLoading = true;
    const show = (r: NetResult<PvpResult>): void => {
      battleLoading = false;
      if (r.ok && selectedId !== null && (r.value.bot || r.value.opponent.playerId !== selectedId)) {
        match = null;
        selectedOpponentId = null;
        opponentNote = '선택한 상대와 전투 결과가 일치하지 않습니다. 목록을 새로고침하세요.';
        result.textContent = opponentNote;
        render();
        findBtn.focus?.();
        return;
      }
      if (r.ok) {
        const { win, stolen, opponent, blows, removed } = r.value;
        forwardRemoved(removed);
        void api.sendAction({
          type: 'pvpResult',
          won: win,
          stolen,
          lostId: null,
          replay: { opponentName: opponent.name, opponentParty: opponent.party, blows,
            ...(opponent.hero ? { opponentHero: opponent.hero } : {}) },
        });
        // The server consumed the match: the next battle needs a new one.
        match = null;
        selectedOpponentId = null;
        opponentNote = NO_OPPONENT;
        loadThefts();
        if (api.pvpOpponents) loadOpponents();
      } else if (r.error === 'cooldown') {
        startCooldown(r.retryAfterSec ?? 0);
      } else {
        match = null;
        selectedOpponentId = null;
        opponentNote = r.error === 'expired' ? 'Opponent expired — find again' : '전투를 완료하지 못했습니다. 상대를 다시 선택하세요.';
      }
      result.textContent = r.ok || r.error !== 'expired' ? pvpResultText(r) : '';
      render();
      if (!r.ok && r.error !== 'cooldown') findBtn.focus?.();
    };
    online(
      () => {
        // The identity promise may settle after the existing match expires.
        if (expireMatch() || match !== loaded) {
          battleLoading = false;
          render();
          findBtn.focus?.();
          return;
        }
        void api.pvp(loaded.matchId, [...picked]).then(show, () => show({ ok: false, error: 'network' }));
      },
      () => {
        show({ ok: false, error: 'offline' });
      },
    );
    render();
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

  findBtn.addEventListener('click', () => { if (api.pvpOpponents) loadOpponents(); else find(); });

  battleBtn.addEventListener('click', () => {
    if (battleEnabled({ match, party: picked, cooldownUntil: cooldown })) pvp();
  });

  autoBtn.addEventListener('click', () => {
    picked = autoParty(save.companions, save.hero?.equipped).map((c) => c.id);
    render();
  });

  savePartyBtn.addEventListener('click', () => {
    void api.sendAction({ type: 'setPvpParty', ids: [...picked] });
    render();
  });

  // The field is the only writer of the name; main validates and answers with
  // the identity it kept, so the field always shows what the server will see.
  let namePending = false;
  let editedName = false;
  const saveName = (): void => {
    editedName = true;
    const proposed = (nameField.value ?? '').slice(0, NAME_MAX);
    if (namePending) return;
    if (!NICK_RE.test(proposed)) {
      if (nameStatus) nameStatus.textContent = '영문·숫자·_·-를 사용해 1–16자로 입력하세요.';
      return;
    }
    namePending = true;
    if (nameSaveBtn) nameSaveBtn.disabled = true;
    if (nameStatus) nameStatus.textContent = '이름 저장 중…';
    void api.setName(proposed).then((id) => {
      // A reply for an older edit must not overwrite what the player is typing now.
      if ((nameField.value ?? '').slice(0, NAME_MAX) === proposed) nameField.value = id.name;
      if (nameStatus) nameStatus.textContent = id.name === proposed ? '이름을 저장했습니다.' : '이름을 저장하지 못했습니다. 다시 시도하세요.';
    }, () => {
      if (nameStatus) nameStatus.textContent = '이름을 저장하지 못했습니다. 다시 시도하세요.';
    }).finally(() => {
      namePending = false;
      if (nameSaveBtn) nameSaveBtn.disabled = false;
    });
  };
  nameField.addEventListener('change', saveName);
  nameSaveBtn?.addEventListener('click', saveName);

  settle(identity, (id) => {
    if (!editedName && !nameField.value) nameField.value = id.name;
  });

  let saveFailed = false;
  api.onSaveFailed?.(() => {
    saveFailed = true;
    const status = saveStatus ?? result;
    status.hidden = false;
    status.textContent = '저장하지 못했습니다. 앱을 닫지 말고 다시 시도해 주세요.';
  });
  api.onStateChanged((raw) => {
    if (saveFailed) {
      if (saveStatus) { saveStatus.hidden = true; saveStatus.textContent = ''; }
      else result.textContent = '';
      saveFailed = false;
    }
    // Trust boundary: the payload is whatever main read off disk.
    save = parseSave(raw);
    pending = null;
    if (reincarnation && !matchesConfirmation(reincarnation)) {
      reincarnation = null;
      result.textContent = '동료가 변경되어 환생 확인을 취소했습니다. 다시 확인해 주세요.';
    }
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
