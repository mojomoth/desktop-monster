// SPEC F20 / Assumption 9 — pure animation state machines advanced by
// injected dt. Presentation-only: no Date.now, no timers, no DOM.

import { describe, expect, it } from 'vitest';
import {
  createHeroAnim,
  createMonsterAnim,
  HERO_ATTACK_MS,
  heroInput,
  MONSTER_DYING_MS,
  MONSTER_HIT_MS,
  MONSTER_SPAWNING_MS,
  monsterHit,
  monsterKilled,
  tickHero,
  tickMonster,
} from '../src/core/index.js';
import type { HeroAnim, MonsterAnim } from '../src/core/index.js';

describe('hero animation FSM (SPEC F20)', () => {
  it('starts idle with t 0 and idle time accumulates across ticks', () => {
    let anim = createHeroAnim();
    expect(anim).toEqual({ state: 'idle', t: 0 });

    anim = tickHero(anim, 400);
    anim = tickHero(anim, 350);
    // Idle is untimed — it never transitions, t just accumulates (the
    // renderer derives the 2-frame bob from t; frame choice is not core's).
    expect(anim).toEqual({ state: 'idle', t: 750 });
  });

  it('hero attack lasts 180ms then returns to idle', () => {
    expect(HERO_ATTACK_MS).toBe(180);
    let anim: HeroAnim = heroInput();
    expect(anim).toEqual({ state: 'attack', t: 0 });

    anim = tickHero(anim, 179);
    expect(anim).toEqual({ state: 'attack', t: 179 });

    // Boundary inclusive: the attack completes at exactly 180ms.
    anim = tickHero(anim, 1);
    expect(anim).toEqual({ state: 'idle', t: 0 });
  });

  it('excess attack dt carries over into idle time', () => {
    const anim = tickHero(heroInput(), HERO_ATTACK_MS + 70);
    expect(anim).toEqual({ state: 'idle', t: 70 });
  });

  it('input during attack restarts the attack', () => {
    let anim = tickHero(heroInput(), 100);
    expect(anim).toEqual({ state: 'attack', t: 100 });

    // Key-mash mid-attack → fresh attack at t 0 (BongoCat spam feel)...
    anim = heroInput();
    expect(anim).toEqual({ state: 'attack', t: 0 });

    // ...and the FULL 180ms runs again from the restart.
    anim = tickHero(anim, 179);
    expect(anim.state).toBe('attack');
    anim = tickHero(anim, 1);
    expect(anim.state).toBe('idle');
  });
});

describe('monster animation FSM (SPEC F20)', () => {
  it('starts spawning and settles to idle after 300ms', () => {
    expect(MONSTER_SPAWNING_MS).toBe(300);
    let anim = createMonsterAnim();
    expect(anim).toEqual({ state: 'spawning', t: 0 });

    anim = tickMonster(anim, 299);
    expect(anim).toEqual({ state: 'spawning', t: 299 });

    anim = tickMonster(anim, 1);
    expect(anim).toEqual({ state: 'idle', t: 0 });
  });

  it('hit flash lasts 120ms then returns to idle', () => {
    expect(MONSTER_HIT_MS).toBe(120);
    let anim = monsterHit({ state: 'idle', t: 700 });
    expect(anim).toEqual({ state: 'hit', t: 0 });

    anim = tickMonster(anim, 119);
    expect(anim).toEqual({ state: 'hit', t: 119 });

    anim = tickMonster(anim, 1);
    expect(anim).toEqual({ state: 'idle', t: 0 });
  });

  it('a second hit during the flash restarts it', () => {
    let anim = tickMonster(monsterHit({ state: 'idle', t: 0 }), 100);
    expect(anim).toEqual({ state: 'hit', t: 100 });

    anim = monsterHit(anim);
    expect(anim).toEqual({ state: 'hit', t: 0 });
  });

  it('monster dying lasts 500ms then transitions to spawning', () => {
    expect(MONSTER_DYING_MS).toBe(500);
    let anim = monsterKilled({ state: 'hit', t: 40 });
    expect(anim).toEqual({ state: 'dying', t: 0 });

    anim = tickMonster(anim, 499);
    expect(anim).toEqual({ state: 'dying', t: 499 });

    anim = tickMonster(anim, 1);
    expect(anim).toEqual({ state: 'spawning', t: 0 });
  });

  it('hits and kills are ignored while dying', () => {
    const dying: MonsterAnim = { state: 'dying', t: 250 };
    // The death scatter is never interrupted or stretched — duplicate
    // notifications while dying are no-ops returning the snapshot unchanged.
    expect(monsterHit(dying)).toBe(dying);
    expect(monsterKilled(dying)).toBe(dying);
  });

  it('excess dt carries over across chained transitions', () => {
    // dying(500) with a 600ms tick → 100ms already spent spawning.
    expect(tickMonster({ state: 'dying', t: 0 }, 600)).toEqual({
      state: 'spawning',
      t: 100,
    });
    // One oversized tick rides dying(500) → spawning(300) → idle.
    expect(tickMonster({ state: 'dying', t: 0 }, 900)).toEqual({
      state: 'idle',
      t: 100,
    });
    // Exact double boundary lands on idle at t 0.
    expect(
      tickMonster({ state: 'dying', t: 0 }, MONSTER_DYING_MS + MONSTER_SPAWNING_MS),
    ).toEqual({ state: 'idle', t: 0 });
  });
});

describe('FSM totality and purity', () => {
  it('non-finite or negative dt is treated as zero time passing', () => {
    const hero: HeroAnim = { state: 'attack', t: 90 };
    for (const dt of [-50, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(tickHero(hero, dt)).toEqual({ state: 'attack', t: 90 });
      expect(tickMonster({ state: 'hit', t: 60 }, dt)).toEqual({ state: 'hit', t: 60 });
    }
  });

  it('ticks and transitions never mutate their input snapshots', () => {
    const hero: HeroAnim = { state: 'attack', t: 179 };
    const heroAfter = tickHero(hero, 50);
    expect(hero).toEqual({ state: 'attack', t: 179 });
    expect(heroAfter).not.toBe(hero);

    const monster: MonsterAnim = { state: 'idle', t: 42 };
    const hitAfter = monsterHit(monster);
    const killAfter = monsterKilled(monster);
    const tickAfter = tickMonster(monster, 10);
    expect(monster).toEqual({ state: 'idle', t: 42 });
    expect(hitAfter).not.toBe(monster);
    expect(killAfter).not.toBe(monster);
    expect(tickAfter).not.toBe(monster);
  });
});
