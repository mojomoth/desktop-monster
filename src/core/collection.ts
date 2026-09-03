// Companion collection — SPEC F32 (Assumptions 5/23/24/26; GAME_DESIGN_V2
// §4/§6). Pure TypeScript, zero imports of electron/DOM/node. Every export is
// total and never mutates its input: applyCollection returns fresh objects or
// an { error }, so the caller can apply it straight onto live engine state.

import { ratio } from './bignum.js';
import { monsterForIndex } from './monsters.js';
import { monsterMaxHp } from './formulas.js';
import type { Companion } from './save.js';
import type { Rng } from './rng.js';
import type { GameState } from './types.js';

/** A companion never levels past this (consume/reincarnate both cap here). */
export const COMPANION_MAX_LEVEL = 10;

/** How many companions fight alongside the hero. */
export const ACTIVE_SLOTS = 3;

/** Roster cap (save.ts keeps its own copy for parsing). */
export const ROSTER_CAP = 30;

/** Rebirth unlocks at this monster index (Assumption 5). */
export const REBIRTH_MIN_INDEX = 40;

/** Companion attack power (Assumption 24) — bigint, unbounded. */
export const companionPower = (c: Companion): bigint => {
  const base = monsterMaxHp(c.bossIndex) / 20n;
  return (base < 1n ? 1n : base) * BigInt(c.level) * 2n ** BigInt(c.stars);
};

/** Numeric part of a 'cN' id — the tie-breaker (same rule as parseSave). */
const idNum = (id: string): number => Number(id.replace(/\D/g, '') || 0);

/** The ACTIVE_SLOTS strongest companions, power desc, ties → lower id. */
export function activeCompanions(cs: readonly Companion[]): Companion[] {
  return [...cs]
    .sort((a, b) => {
      const pa = companionPower(a);
      const pb = companionPower(b);
      if (pa === pb) return idNum(a.id) - idNum(b.id);
      return pb > pa ? 1 : -1;
    })
    .slice(0, ACTIVE_SLOTS);
}

/**
 * Events produced here (GAME_DESIGN_V2 §6). T28 folds both variants into the
 * `GameEvent` union in types.ts; every other action returns no events.
 * ponytail: declared locally until then — types.ts is owned by T26/T28/T29.
 */
export type CollectionEvent =
  | { type: 'rebirth'; souls: number }
  | { type: 'pvpResolved'; won: boolean; stolen: Companion | null; lostId: string | null };

/** Every roster/prestige operation the menu and the net layer can request. */
export type CollectionAction =
  | { type: 'consume'; targetId: string; foodId: string }
  | { type: 'fuse'; aId: string; bId: string }
  | { type: 'reincarnate'; id: string }
  | { type: 'sacrifice'; id: string }
  | { type: 'rebirth' }
  | { type: 'addCompanion'; companion: Companion }
  | { type: 'removeCompanions'; ids: string[] }
  | { type: 'pvpResult'; won: boolean; stolen: Companion | null; lostId: string | null };

export type CollectionResult =
  | { state: GameState; events: CollectionEvent[] }
  | { error: string };

/** Fresh roster: `dropIds` removed, `editId` replaced by `edit(c)`, rest copied. */
function reroster(
  cs: readonly Companion[],
  dropIds: readonly string[],
  editId?: string,
  edit?: (c: Companion) => Companion,
): Companion[] {
  return cs
    .filter((c) => !dropIds.includes(c.id))
    .map((c) => (edit && c.id === editId ? edit(c) : { ...c }));
}

/** Fresh state: nothing of `state` is shared with the result. */
function next(
  state: Readonly<GameState>,
  companions: Companion[],
  patch: Partial<GameState> = {},
  events: CollectionEvent[] = [],
): CollectionResult {
  return {
    state: {
      ...state,
      items: { ...state.items },
      monster: { ...state.monster },
      companions,
      ...patch,
    },
    events,
  };
}

/** Push `c` re-minted as `c${nextCompanionId}`; null when the roster is full. */
function minted(
  companions: Companion[],
  nextCompanionId: number,
  c: Companion,
): Companion | null {
  if (companions.length >= ROSTER_CAP) return null;
  const fresh: Companion = { ...c, id: `c${nextCompanionId}` };
  companions.push(fresh);
  return fresh;
}

/**
 * Apply one lifecycle action (Assumption 26). Total: an unknown action type,
 * an unknown/duplicate companion id or an unmet precondition yields
 * `{ error }` and the caller keeps its state; success yields a brand-new
 * state plus the events of GAME_DESIGN_V2 §6.
 */
export function applyCollection(
  state: Readonly<GameState>,
  action: CollectionAction,
): CollectionResult {
  const cs = state.companions;
  const find = (id: string): Companion | undefined => cs.find((c) => c.id === id);

  switch (action.type) {
    case 'consume': {
      const target = find(action.targetId);
      const food = find(action.foodId);
      if (!target || !food || target.id === food.id) return { error: 'consume: bad ids' };
      return next(
        state,
        reroster(cs, [food.id], target.id, (c) => ({
          ...c,
          level: Math.min(COMPANION_MAX_LEVEL, c.level + 1 + food.stars),
        })),
      );
    }
    case 'fuse': {
      const a = find(action.aId);
      const b = find(action.bId);
      if (!a || !b || a.id === b.id) return { error: 'fuse: bad ids' };
      if (a.speciesId !== b.speciesId || a.stars !== b.stars) {
        return { error: 'fuse: needs the same species and stars' };
      }
      return next(
        state,
        reroster(cs, [b.id], a.id, (c) => ({
          ...c,
          bossIndex: Math.max(a.bossIndex, b.bossIndex),
          level: 1,
          stars: c.stars + 1,
        })),
      );
    }
    case 'reincarnate': {
      const c = find(action.id);
      if (!c) return { error: 'reincarnate: unknown id' };
      if (c.level !== COMPANION_MAX_LEVEL) return { error: 'reincarnate: needs max level' };
      return next(
        state,
        reroster(cs, [], c.id, (x) => ({ ...x, level: 1, stars: x.stars + 1 })),
      );
    }
    case 'sacrifice': {
      const c = find(action.id);
      if (!c) return { error: 'sacrifice: unknown id' };
      return next(state, reroster(cs, [c.id]), { souls: state.souls + 1 + c.stars });
    }
    case 'rebirth': {
      if (state.monster.index < REBIRTH_MIN_INDEX) {
        return { error: `rebirth: needs monster index ${REBIRTH_MIN_INDEX}` };
      }
      const souls = state.souls + Math.floor(state.monster.index / 8);
      const first = monsterForIndex(0);
      return next(
        state,
        reroster(cs, []),
        {
          level: 1,
          xp: 0,
          monster: first,
          monsterHp: first.maxHp,
          souls,
          rebirths: state.rebirths + 1,
        },
        [{ type: 'rebirth', souls }],
      );
    }
    case 'addCompanion': {
      const companions = reroster(cs, []);
      if (!minted(companions, state.nextCompanionId, action.companion)) {
        return { error: 'addCompanion: roster is full' };
      }
      return next(state, companions, { nextCompanionId: state.nextCompanionId + 1 });
    }
    case 'removeCompanions':
      return next(state, reroster(cs, action.ids));
    case 'pvpResult': {
      const companions = reroster(cs, action.lostId === null ? [] : [action.lostId]);
      // A steal into a full roster is void, never an error (Assumption 23).
      const stolen = action.stolen && minted(companions, state.nextCompanionId, action.stolen);
      return next(
        state,
        companions,
        { nextCompanionId: state.nextCompanionId + (stolen ? 1 : 0) },
        [
          {
            type: 'pvpResolved',
            won: action.won,
            stolen: stolen ?? null,
            lostId: action.lostId,
          },
        ],
      );
    }
    default:
      return { error: 'unknown action' };
  }
}

/**
 * Resolve one asynchronous PvP exchange (Assumption 34; GAME_DESIGN_V2 §6).
 * Shared byte-for-byte with the server, which calls it with `mulberry32(seed)`
 * and moves `moved` between the stored rosters — so exactly 2 draws happen per
 * call and the victim draw is consumed even when nobody can be stolen.
 * ponytail: no bot or cooldown rules here, those are the server's.
 */
export function resolvePvp(
  attacker: readonly Companion[],
  defender: readonly Companion[],
  rng: Rng,
): { attackerWon: boolean; moved: Companion | null; attackerPower: bigint; defenderPower: bigint } {
  const sum = (cs: readonly Companion[]): bigint =>
    cs.reduce((total, c) => total + companionPower(c), 0n);
  const attackerPower = sum(attacker);
  const defenderPower = sum(defender);
  const total = attackerPower + defenderPower;
  const attackerWon = rng.next() < (total === 0n ? 0.5 : ratio(attackerPower, total));
  const loser = attackerWon ? defender : attacker;
  const victim = loser[Math.floor(rng.next() * loser.length)] ?? null;
  const winner = attackerWon ? attacker : defender;
  return {
    attackerWon,
    moved: winner.length >= ROSTER_CAP ? null : victim,
    attackerPower,
    defenderPower,
  };
}
