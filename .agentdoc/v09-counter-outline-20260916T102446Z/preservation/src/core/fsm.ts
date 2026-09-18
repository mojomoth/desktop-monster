// Animation state machines (SPEC F20, Assumption 9; GAME_ARCHITECTURE
// "Animation state machines").
//
// Pure TypeScript — zero imports of electron/DOM/node. Each machine is a
// plain `{ state, t }` snapshot advanced by an injected dt in milliseconds:
// no Date.now, no timers, no DOM. Every function returns a fresh object and
// never mutates its input. These machines are PRESENTATION-ONLY — damage is
// applied at input time by the engine (Assumption 8); nothing here gates
// game logic. The renderer consumes them in T14/T15.

/** Hero attack animation length (wind-up / slash / recover). */
export const HERO_ATTACK_MS = 180;
/** Monster pop-in length. */
export const MONSTER_SPAWNING_MS = 300;
/** Monster white-flash length after a hit. */
export const MONSTER_HIT_MS = 120;
/** Monster death (pixel-scatter) length before the next spawn. */
export const MONSTER_DYING_MS = 500;

export type HeroAnimState = 'idle' | 'attack';

/** Hero animation snapshot: current state + ms spent in it. */
export interface HeroAnim {
  readonly state: HeroAnimState;
  readonly t: number;
}

export type MonsterAnimState = 'spawning' | 'idle' | 'hit' | 'dying';

/** Monster animation snapshot: current state + ms spent in it. */
export interface MonsterAnim {
  readonly state: MonsterAnimState;
  readonly t: number;
}

/** Treat non-finite or negative dt as no time passing (total function). */
function normalizeDt(dt: number): number {
  return Number.isFinite(dt) && dt > 0 ? dt : 0;
}

/** Fresh hero machine: idle (2-frame bob; frame choice is the renderer's). */
export function createHeroAnim(): HeroAnim {
  return { state: 'idle', t: 0 };
}

/**
 * The hero anim state entered on ANY input, from idle or mid-attack alike:
 * a fresh ATTACK at t = 0 — re-input during ATTACK restarts it
 * (BongoCat-style spam feel, SPEC F20).
 */
export function heroInput(): HeroAnim {
  return { state: 'attack', t: 0 };
}

/**
 * Advance the hero machine by dt ms. ATTACK completes at exactly
 * HERO_ATTACK_MS (boundary inclusive) and returns to IDLE; excess dt carries
 * into the new state's t so chained timing stays accurate under the
 * renderer's clamped-dt loop.
 */
export function tickHero(anim: HeroAnim, dt: number): HeroAnim {
  const t = anim.t + normalizeDt(dt);
  if (anim.state === 'attack' && t >= HERO_ATTACK_MS) {
    return { state: 'idle', t: t - HERO_ATTACK_MS };
  }
  return { state: anim.state, t };
}

/** Fresh monster machine: starts with the SPAWNING pop-in. */
export function createMonsterAnim(): MonsterAnim {
  return { state: 'spawning', t: 0 };
}

/**
 * Apply a (non-killing) hit: white-flash HIT at t = 0. A second hit during
 * the flash restarts it. Ignored while DYING — the death scatter is never
 * interrupted (the engine has already moved on; presentation finishes).
 */
export function monsterHit(anim: MonsterAnim): MonsterAnim {
  if (anim.state === 'dying') {
    return anim;
  }
  return { state: 'hit', t: 0 };
}

/**
 * Apply the killing blow: DYING at t = 0 from any live state. A no-op while
 * already DYING so duplicate kill notifications never stretch the death.
 */
export function monsterKilled(anim: MonsterAnim): MonsterAnim {
  if (anim.state === 'dying') {
    return anim;
  }
  return { state: 'dying', t: 0 };
}

/** Timed monster states: ms until the transition fires (boundary inclusive). */
const MONSTER_DURATION: Readonly<Partial<Record<MonsterAnimState, number>>> = {
  spawning: MONSTER_SPAWNING_MS,
  hit: MONSTER_HIT_MS,
  dying: MONSTER_DYING_MS,
};

/** Where each timed monster state goes when its duration elapses. */
const MONSTER_NEXT: Readonly<Partial<Record<MonsterAnimState, MonsterAnimState>>> = {
  spawning: 'idle',
  hit: 'idle',
  dying: 'spawning',
};

/**
 * Advance the monster machine by dt ms: SPAWNING(300) → IDLE, HIT(120) →
 * IDLE, DYING(500) → SPAWNING. Excess dt carries across chained transitions
 * (e.g. one oversized tick can ride DYING → SPAWNING → IDLE), so no
 * transition ever stalls; IDLE is untimed and simply accumulates t.
 */
export function tickMonster(anim: MonsterAnim, dt: number): MonsterAnim {
  let state = anim.state;
  let t = anim.t + normalizeDt(dt);
  for (;;) {
    const duration = MONSTER_DURATION[state];
    const next = MONSTER_NEXT[state];
    if (duration === undefined || next === undefined || t < duration) {
      return { state, t };
    }
    t -= duration;
    state = next;
  }
}
