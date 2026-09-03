// Menu view-model — SPEC F54 (Assumption 29; GAME_DESIGN_V2 §9). Pure data →
// strings/flags: no DOM, no electron, no net. src/menu/index.ts binds these
// rows to the page; every rule here mirrors a precondition of
// core/collection.ts's applyCollection, so a button is only ever offered when
// the action would succeed.

import {
  COMPANION_MAX_LEVEL,
  companionPower,
  effectivePower,
  format,
  PARTY_SIZE,
  partyOrder,
  REBIRTH_MIN_INDEX,
  typeOf,
} from '../core/index.js';
import type { Companion, MonsterType, SaveFile } from '../core/index.js';
import type { LeaderboardResult, MatchResult, NetResult, PvpResult, Theft } from '../shared/api.js';

/** One roster card, ready to paint. */
export interface RosterRow {
  id: string;
  /** Art key for the card's canvas (unknown ids fall back in index.ts). */
  speciesId: string;
  /** Star count — also the palette tier of the card art. */
  stars: number;
  /** '.name' text: 'Dragon Lv 7'. */
  name: string;
  /** '.stars' text: '★×2'. */
  starText: string;
  /** '.power' text: companionPower in letter-suffix form. */
  power: string;
  /** Reincarnate needs max level (COMPANION_MAX_LEVEL). */
  maxLevel: boolean;
}

/** 'dragon' → 'Dragon'. The species display names in core are private. */
const displayName = (speciesId: string): string =>
  speciesId.charAt(0).toUpperCase() + speciesId.slice(1);

/** 'Dragon Lv 7' — a card title, and the way pvpResultText names a companion. */
const companionName = (c: { speciesId: string; level: number }): string =>
  `${displayName(c.speciesId)} Lv ${String(c.level)}`;

/** Numeric part of a 'cN' id — the tie-breaker (same rule as activeCompanions). */
const idNum = (id: string): number => Number(id.replace(/\D/g, '') || 0);

/** Every companion as a card, strongest first, ties → lower id. */
export function rosterRows(save: SaveFile): RosterRow[] {
  return [...save.companions]
    .sort((a, b) => {
      const pa = companionPower(a);
      const pb = companionPower(b);
      if (pa === pb) return idNum(a.id) - idNum(b.id);
      return pb > pa ? 1 : -1;
    })
    .map((c) => ({
      id: c.id,
      speciesId: c.speciesId,
      stars: c.stars,
      name: companionName(c),
      starText: `★×${String(c.stars)}`,
      power: format(companionPower(c)),
      maxLevel: c.level >= COMPANION_MAX_LEVEL,
    }));
}

/** Every unordered pair that may fuse: same species AND same stars. */
export function fuseCandidates(save: SaveFile): [string, string][] {
  const cs = save.companions;
  const pairs: [string, string][] = [];
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i];
      const b = cs[j];
      if (a && b && a.speciesId === b.speciesId && a.stars === b.stars) {
        pairs.push([a.id, b.id]);
      }
    }
  }
  return pairs;
}

/** Rebirth unlocks at REBIRTH_MIN_INDEX (40) — the footer button's flag. */
export const canRebirth = (save: SaveFile): boolean => save.monsterIndex >= REBIRTH_MIN_INDEX;

/** Ids that may eat `foodId` — core's rule: any other companion on the roster. */
export function consumeTargets(save: SaveFile, foodId: string): string[] {
  const cs = save.companions;
  if (!cs.some((c) => c.id === foodId)) return [];
  return cs.filter((c) => c.id !== foodId).map((c) => c.id);
}

// ---------------------------------------------------------------- SPEC F55
// Ranking + Battle. Both take a NetResult straight from the bridge: the page
// never inspects `ok` itself, so every failure — including the offline
// identity, which never touches the network — reads the same.

/** One leaderboard line, ready to paint. */
export interface RankRow {
  /** '.rank' text: '#1' (empty on a failure row). */
  rank: string;
  /** '.name' text: the player's nickname, or 'Offline' / 'Cooldown'. */
  name: string;
  /** '.power' text: 'Monster 79' — the deepest monster reached. */
  deepest: string;
  /** '.stars' text: '♻×2'. */
  rebirths: string;
}

/** The server's top, plus my own line when the top does not already hold it. */
export function leaderboardRows(result: NetResult<LeaderboardResult>): RankRow[] {
  if (!result.ok) {
    const name = result.error === 'cooldown' ? 'Cooldown' : 'Offline';
    return [{ rank: '', name, deepest: '', rebirths: '' }];
  }
  const { top, me } = result.value;
  const rows = me && !top.some((r) => r.rank === me.rank) ? [...top, me] : top;
  return rows.map((r) => ({
    rank: `#${String(r.rank)}`,
    name: r.name,
    deepest: `Monster ${String(r.bestIndex)}`,
    rebirths: `♻×${String(r.rebirths)}`,
  }));
}

/** The Battle tab's verdict line: who was stolen or lost, or how long to wait. */
export function pvpResultText(result: NetResult<PvpResult>): string {
  if (!result.ok) {
    return result.error === 'cooldown'
      ? `Cooldown — next battle in ${String(result.retryAfterSec ?? 0)}s.`
      : 'Offline — no battle right now.';
  }
  const { win, opponent, stolen, lost } = result.value;
  if (win) {
    return stolen
      ? `Victory over ${opponent.name} — stole ${companionName(stolen)}!`
      : `Victory over ${opponent.name}.`;
  }
  // v3 steals are attacker-only, so `lost` is always null — the named leg is
  // still here for the v2-shaped response the server may answer with.
  return lost
    ? `Defeat by ${opponent.name} — ${companionName(lost)} was stolen from you.`
    : `Defeat by ${opponent.name}.`;
}

// ---------------------------------------------------------------- SPEC F75
// Battle tab v3: opponent preview, manual party editor, theft inbox. Still
// pure — the binder (index.ts) only paints what these return.

/** A `.card.mini` — the opponent's party, my party slots and the pick buttons. */
export interface MiniRow {
  id: string;
  /** Art key for the card's canvas. */
  speciesId: string;
  /** Star count — also the palette tier of the card art. */
  stars: number;
  /** '.name' text: 'Dragon Lv 7'. */
  name: string;
  /** '.stars' text: '★×2'. */
  starText: string;
  /** The type badge's class: 'type type-fire'. */
  typeClass: string;
  /** The type badge's letter. */
  typeBadge: string;
}

/**
 * Badge letters. ponytail: mirrors the private TYPE_INITIALS of
 * renderer/sprites/party.ts (view.ts imports nothing but core) — wind and
 * water share an initial, so water takes 'A' for aqua.
 */
const TYPE_BADGE: Record<MonsterType, string> = {
  fire: 'F',
  wind: 'W',
  earth: 'E',
  water: 'A',
  dark: 'D',
};

/** Any companion — mine or an opponent's — as a compact card. */
export function miniRow(c: Companion): MiniRow {
  const type = typeOf(c.speciesId);
  return {
    id: c.id,
    speciesId: c.speciesId,
    stars: c.stars,
    name: companionName(c),
    starText: `★×${String(c.stars)}`,
    typeClass: `type type-${type}`,
    typeBadge: TYPE_BADGE[type],
  };
}

/** The previewed opponent's party in `partyOrder`; no match or a bot → none. */
export function opponentRows(match: MatchResult | null): MiniRow[] {
  return match === null ? [] : partyOrder(match.opponent.party).map(miniRow);
}

/** Who strikes first: `partyOrder` is biggest (back) first, so front is last. */
const frontOf = (party: readonly Companion[]): Companion | undefined => {
  const ordered = partyOrder(party);
  return ordered[ordered.length - 1];
};

/** The live `#preview` line: my party's power against the opponent's front. */
export function partyPreview(
  myParty: readonly Companion[],
  opponentParty: readonly Companion[],
): string {
  const front = frontOf(opponentParty);
  const total = myParty.reduce((sum, c) => {
    const power = companionPower(c);
    return (
      sum +
      (front === undefined ? power : effectivePower(power, typeOf(c.speciesId), typeOf(front.speciesId)))
    );
  }, 0n);
  return `Σ vs opponent: ${format(total)}`;
}

/** Add or drop `id` from the picked party; a full party refuses new picks. */
export function togglePick(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= PARTY_SIZE ? [...ids] : [...ids, id];
}

/** One `#thefts` row; `id` is what the `Reclaim` button sends back. */
export interface TheftRow {
  id: string;
  text: string;
}

const HOUR_MS = 3_600_000;

/** The theft inbox — `now` is injected so the rows stay deterministic. */
export function theftRows(thefts: readonly Theft[], now: number): TheftRow[] {
  return thefts.map((t) => {
    const left = Math.max(0, t.reclaimUntil - now);
    const hours = Math.floor(left / HOUR_MS);
    const minutes = Math.floor((left % HOUR_MS) / 60_000);
    return {
      id: t.id,
      text: `${t.thiefName} stole ${companionName(t.companion)} · ${String(hours)}h ${String(minutes)}m left`,
    };
  });
}

/** What the `Battle!` button needs to know (F75). */
export interface BattleState {
  /** The previewed match — null before `Find opponent`, or once it expired. */
  match: MatchResult | null;
  /** The ids currently picked for my party. */
  party: readonly string[];
  /** Seconds still on the PvP cooldown (0 = ready to battle). */
  cooldownUntil: number;
}

/**
 * `Battle!` is offered only with a live match, a party and no cooldown.
 *
 * ponytail: the v2 call form `(save, cooldownUntil)` is still accepted while
 * src/menu/index.ts is the one-button v2 binder — T71 rewrites it and this leg
 * goes with it.
 */
export function battleEnabled(state: BattleState | SaveFile, cooldownUntil = 0): boolean {
  return 'companions' in state
    ? state.companions.length > 0 && cooldownUntil <= 0
    : state.match !== null && state.party.length > 0 && state.cooldownUntil <= 0;
}
