import { describe, expect, it } from 'vitest';
import {
  createEngine,
  createFever,
  feverActive,
  feverInput,
  FEVER_COOLDOWN_MS,
  FEVER_INPUTS,
  FEVER_MS,
  FEVER_MULT,
  FEVER_WINDOW_MS,
  monsterMaxHp,
} from '../src/core/index.js';
import type { Engine, GameEvent, Rng, SaveFileV1 } from '../src/core/index.js';

/** 0.5 fails both the 0.1 crit roll and the 0.25 trinket roll: fully boring. */
const calmRng = (): Rng => ({ next: () => 0.5 });

const types = (events: GameEvent[]): string[] => events.map((e) => e.type);

/**
 * A level-1 hero in front of monster 60 (43840 hp, not a boss): hundreds of
 * 1–3 damage inputs never kill it, so the tests see fever and nothing else.
 */
function tirelessEngine(): Engine {
  const save: SaveFileV1 = {
    version: 1,
    level: 1,
    xp: 0,
    killCount: 0,
    coins: 0,
    items: {},
    monsterIndex: 60,
    monsterHp: Number(monsterMaxHp(60)),
  };
  return createEngine(save, calmRng());
}

/** Spam `n` inputs at the current clock; returns the last batch of events. */
function spam(engine: Engine, n = FEVER_INPUTS): GameEvent[] {
  let events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    events = engine.attack('keyboard');
  }
  return events;
}

/** The damage of the attack event in a batch. */
function damageOf(events: GameEvent[]): bigint {
  const attack = events.find((e) => e.type === 'attack');
  if (attack?.type !== 'attack') throw new Error('expected an attack event');
  return attack.damage;
}

describe('fever tracker (SPEC F34, GAME_DESIGN_V2 §5)', () => {
  it('20 inputs within 3000ms start fever, 19 do not', () => {
    // 19 inputs 100ms apart: a burst, but one short.
    let fever = createFever();
    for (let i = 0; i < FEVER_INPUTS - 1; i++) {
      const r = feverInput(fever, i * 100);
      expect(r.started).toBe(false);
      fever = r.fever;
    }
    expect(fever.stamps).toHaveLength(FEVER_INPUTS - 1);
    expect(feverActive(fever, 1800)).toBe(false);

    // The 20th, still inside the window, lights it and spends the stamps.
    const lit = feverInput(fever, 1900);
    expect(lit.started).toBe(true);
    expect(lit.fever.stamps).toEqual([]);
    expect(lit.fever.activeUntil).toBe(1900 + FEVER_MS);
    expect(feverActive(lit.fever, 1900)).toBe(true);
    expect(feverActive(lit.fever, 1900 + FEVER_MS)).toBe(false);

    // 20 inputs spread wider than the window never light it, however many
    // come: only the last 20 stamps count and their span stays too long.
    let slow = createFever();
    for (let i = 0; i < FEVER_INPUTS * 2; i++) {
      const r = feverInput(slow, i * (FEVER_WINDOW_MS / 10));
      expect(r.started).toBe(false);
      slow = r.fever;
    }
    expect(slow.stamps).toHaveLength(FEVER_INPUTS);
  });

  it('fever lasts 5000ms, triples damage, then cools down for 10000ms', () => {
    const engine = tirelessEngine();

    // The 20th input lights fever BEFORE its own attack: it already hits x3.
    for (let i = 0; i < FEVER_INPUTS - 1; i++) {
      expect(damageOf(engine.attack('keyboard'))).toBe(1n);
    }
    const twentieth = engine.attack('keyboard');
    expect(types(twentieth)).toEqual(['feverStart', 'attack', 'monsterHit']);
    expect(damageOf(twentieth)).toBe(FEVER_MULT);
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: FEVER_MS });

    // It burns for the whole 5000ms and ends exactly once, on the clock.
    expect(engine.tick(FEVER_MS - 1)).toEqual([]);
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: 1 });
    expect(damageOf(engine.attack('keyboard'))).toBe(FEVER_MULT);
    expect(engine.tick(1)).toEqual([{ type: 'feverEnd' }]);
    expect(engine.tick(1)).toEqual([]);
    expect(engine.getState().fever).toEqual({ active: false, remainingMs: 0 });
    expect(damageOf(engine.attack('keyboard'))).toBe(1n);

    // Inside the cooldown the same burst lights nothing.
    expect(types(spam(engine))).toEqual(['attack', 'monsterHit']);
    expect(engine.getState().fever.active).toBe(false);

    // Past it, fever is available again.
    engine.tick(FEVER_COOLDOWN_MS);
    expect(types(spam(engine))).toEqual(['feverStart', 'attack', 'monsterHit']);
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: FEVER_MS });
  });

  it('fever never persists: toSave has no fever field', () => {
    const engine = tirelessEngine();
    spam(engine);
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: FEVER_MS });

    const save = engine.toSave();
    expect(Object.keys(save)).not.toContain('fever');
    expect(save).not.toHaveProperty('fever');

    // A resumed engine always starts cold, mid-fever save or not.
    const resumed = createEngine(save, calmRng());
    expect(resumed.getState().fever).toEqual({ active: false, remainingMs: 0 });
    expect(damageOf(resumed.attack('keyboard'))).toBe(1n);
  });

  it('engine time advances only through tick', () => {
    const engine = tirelessEngine();
    spam(engine);
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: FEVER_MS });

    // 1000 more inputs are not time: the fever is exactly as young as it was.
    spam(engine, 1000);
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: FEVER_MS });

    // Junk dt is worth 0ms.
    for (const dt of [Number.NaN, Number.POSITIVE_INFINITY, -FEVER_MS, 0]) {
      expect(engine.tick(dt)).toEqual([]);
    }
    expect(engine.getState().fever).toEqual({ active: true, remainingMs: FEVER_MS });

    expect(engine.tick(FEVER_MS)).toEqual([{ type: 'feverEnd' }]);
    expect(engine.getState().fever).toEqual({ active: false, remainingMs: 0 });
  });
});
