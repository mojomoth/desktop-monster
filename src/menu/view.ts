// Menu view-model — SPEC F54 (Assumption 29; GAME_DESIGN_V2 §9). Pure data →
// strings/flags: no DOM, no electron, no net. src/menu/index.ts binds these
// rows to the page; every rule here mirrors a precondition of
// core/collection.ts's applyCollection, so a button is only ever offered when
// the action would succeed.

import { COMPANION_MAX_LEVEL, companionPower, format, REBIRTH_MIN_INDEX } from '../core/index.js';
import type { SaveFile } from '../core/index.js';
import type { LeaderboardResult, NetResult, PvpResult } from '../shared/api.js';

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
      ? `Victory over ${opponent.name} — you stole ${companionName(stolen)}!`
      : `Victory over ${opponent.name} — nothing left to steal.`;
  }
  return lost
    ? `Defeat by ${opponent.name} — ${companionName(lost)} was stolen from you.`
    : `Defeat by ${opponent.name} — nothing was lost.`;
}

/**
 * The single `Battle!` button: a fighter is required, and the server's PvP
 * cooldown is waited out client-side.
 *
 * @param cooldownUntil seconds still on that cooldown (0 = ready to battle).
 */
export const battleEnabled = (save: SaveFile, cooldownUntil: number): boolean =>
  save.companions.length > 0 && cooldownUntil <= 0;
