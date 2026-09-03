// Menu view-model — SPEC F54 (Assumption 29; GAME_DESIGN_V2 §9). Pure data →
// strings/flags: no DOM, no electron, no net. src/menu/index.ts binds these
// rows to the page; every rule here mirrors a precondition of
// core/collection.ts's applyCollection, so a button is only ever offered when
// the action would succeed.

import { COMPANION_MAX_LEVEL, companionPower, format, REBIRTH_MIN_INDEX } from '../core/index.js';
import type { SaveFile } from '../core/index.js';

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
      name: `${displayName(c.speciesId)} Lv ${String(c.level)}`,
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
