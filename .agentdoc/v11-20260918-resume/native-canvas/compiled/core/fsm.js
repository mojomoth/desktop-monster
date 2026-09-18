"use strict";
// Animation state machines (SPEC F20, Assumption 9; GAME_ARCHITECTURE
// "Animation state machines").
//
// Pure TypeScript — zero imports of electron/DOM/node. Each machine is a
// plain `{ state, t }` snapshot advanced by an injected dt in milliseconds:
// no Date.now, no timers, no DOM. Every function returns a fresh object and
// never mutates its input. These machines are PRESENTATION-ONLY — damage is
// applied at input time by the engine (Assumption 8); nothing here gates
// game logic. The renderer consumes them in T14/T15.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONSTER_DYING_MS = exports.MONSTER_HIT_MS = exports.MONSTER_SPAWNING_MS = exports.HERO_ATTACK_MS = void 0;
exports.createHeroAnim = createHeroAnim;
exports.heroInput = heroInput;
exports.tickHero = tickHero;
exports.createMonsterAnim = createMonsterAnim;
exports.monsterHit = monsterHit;
exports.monsterKilled = monsterKilled;
exports.tickMonster = tickMonster;
/** Hero attack animation length (wind-up / slash / recover). */
exports.HERO_ATTACK_MS = 180;
/** Monster pop-in length. */
exports.MONSTER_SPAWNING_MS = 300;
/** Monster white-flash length after a hit. */
exports.MONSTER_HIT_MS = 120;
/** Monster death (pixel-scatter) length before the next spawn. */
exports.MONSTER_DYING_MS = 500;
/** Treat non-finite or negative dt as no time passing (total function). */
function normalizeDt(dt) {
    return Number.isFinite(dt) && dt > 0 ? dt : 0;
}
/** Fresh hero machine: idle (2-frame bob; frame choice is the renderer's). */
function createHeroAnim() {
    return { state: 'idle', t: 0 };
}
/**
 * No argument starts a fresh swing (also used for historical replay beats).
 * Passing the current animation coalesces rapid live inputs into one pending
 * swing, letting wind-up, strike and recovery all become visible.
 */
function heroInput(current) {
    if (current?.state === 'attack')
        return { ...current, pending: true };
    return { state: 'attack', t: 0 };
}
/**
 * Advance the hero machine by dt ms. ATTACK completes at exactly
 * HERO_ATTACK_MS (boundary inclusive) and returns to IDLE; excess dt carries
 * into the new state's t so chained timing stays accurate under the
 * renderer's clamped-dt loop.
 */
function tickHero(anim, dt) {
    const t = anim.t + normalizeDt(dt);
    if (anim.state === 'attack' && t >= exports.HERO_ATTACK_MS) {
        if (anim.pending)
            return t < exports.HERO_ATTACK_MS * 2
                ? { state: 'attack', t: t - exports.HERO_ATTACK_MS }
                : { state: 'idle', t: t - exports.HERO_ATTACK_MS * 2 };
        return { state: 'idle', t: t - exports.HERO_ATTACK_MS };
    }
    return { state: anim.state, t, ...(anim.pending ? { pending: true } : {}) };
}
/** Fresh monster machine: starts with the SPAWNING pop-in. */
function createMonsterAnim() {
    return { state: 'spawning', t: 0 };
}
/**
 * Apply a (non-killing) hit: white-flash HIT at t = 0. A second hit during
 * the flash restarts it. Ignored while DYING — the death scatter is never
 * interrupted (the engine has already moved on; presentation finishes).
 */
function monsterHit(anim) {
    if (anim.state === 'dying') {
        return anim;
    }
    return { state: 'hit', t: 0 };
}
/**
 * Apply the killing blow: DYING at t = 0 from any live state. A no-op while
 * already DYING so duplicate kill notifications never stretch the death.
 */
function monsterKilled(anim) {
    if (anim.state === 'dying') {
        return anim;
    }
    return { state: 'dying', t: 0 };
}
/** Timed monster states: ms until the transition fires (boundary inclusive). */
const MONSTER_DURATION = {
    spawning: exports.MONSTER_SPAWNING_MS,
    hit: exports.MONSTER_HIT_MS,
    dying: exports.MONSTER_DYING_MS,
};
/** Where each timed monster state goes when its duration elapses. */
const MONSTER_NEXT = {
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
function tickMonster(anim, dt) {
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
