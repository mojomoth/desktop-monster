// SPEC F12 (InputDriver abstraction) + the pure half of F14 (fallback gate).
// Everything here is pure core — no DOM, no electron, no native hook module.

import { describe, expect, it } from 'vitest';
import { createFallbackGate, SimulatedInputDriver } from '../src/core/index.js';
import type { InputDriver, InputEvent, InputMode } from '../src/core/index.js';

function startedDriver(): SimulatedInputDriver {
  const driver = new SimulatedInputDriver();
  driver.start();
  return driver;
}

describe('SimulatedInputDriver (SPEC F12)', () => {
  it('SimulatedInputDriver delivers keyboard and mouse events to subscribers', () => {
    const driver = startedDriver();
    const seenA: InputEvent[] = [];
    const seenB: InputEvent[] = [];
    driver.subscribe((e) => seenA.push(e));
    driver.subscribe((e) => seenB.push(e));

    driver.emit('keyboard');
    driver.emit('mouse');
    driver.emit('keyboard');

    const expected: InputEvent[] = [
      { source: 'keyboard' },
      { source: 'mouse' },
      { source: 'keyboard' },
    ];
    expect(seenA).toEqual(expected);
    expect(seenB).toEqual(expected);
  });

  it('satisfies the InputDriver interface shape', () => {
    // Compile-time: assignment fails typecheck if the class drifts from F12.
    const driver: InputDriver = new SimulatedInputDriver();
    expect(typeof driver.start).toBe('function');
    expect(typeof driver.stop).toBe('function');
    const unsubscribe = driver.subscribe(() => undefined);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('unsubscribe stops delivery for that listener only and is idempotent', () => {
    const driver = startedDriver();
    const seenA: InputEvent[] = [];
    const seenB: InputEvent[] = [];
    const unsubscribeA = driver.subscribe((e) => seenA.push(e));
    driver.subscribe((e) => seenB.push(e));

    driver.emit('keyboard');
    unsubscribeA();
    unsubscribeA(); // second call is a no-op, never throws
    driver.emit('mouse');

    expect(seenA).toEqual([{ source: 'keyboard' }]);
    expect(seenB).toEqual([{ source: 'keyboard' }, { source: 'mouse' }]);
  });

  it('drops events emitted before start or after stop, and start resumes delivery', () => {
    const driver = new SimulatedInputDriver();
    const seen: InputEvent[] = [];
    driver.subscribe((e) => seen.push(e));

    driver.emit('keyboard'); // not started yet → dropped
    expect(seen).toEqual([]);

    driver.start();
    driver.emit('mouse');
    expect(seen).toEqual([{ source: 'mouse' }]);

    driver.stop();
    driver.emit('keyboard'); // stopped → dropped, subscription kept
    expect(seen).toEqual([{ source: 'mouse' }]);

    driver.start();
    driver.emit('keyboard');
    expect(seen).toEqual([{ source: 'mouse' }, { source: 'keyboard' }]);
  });

  it('a listener unsubscribing during delivery does not skip other listeners', () => {
    const driver = startedDriver();
    const seen: string[] = [];
    const unsubscribeA = driver.subscribe(() => {
      seen.push('a');
      unsubscribeA();
    });
    driver.subscribe((e) => seen.push(`b:${e.source}`));

    driver.emit('keyboard');
    driver.emit('mouse');

    expect(seen).toEqual(['a', 'b:keyboard', 'b:mouse']);
  });
});

describe('fallback gate (SPEC F14, pure half)', () => {
  /** Gate wired to counting attach/detach spies. */
  function makeGate(): {
    gate: ReturnType<typeof createFallbackGate>;
    calls: () => { attach: number; detach: number };
  } {
    let attach = 0;
    let detach = 0;
    const gate = createFallbackGate({
      attach: () => {
        attach += 1;
      },
      detach: () => {
        detach += 1;
      },
    });
    return { gate, calls: () => ({ attach, detach }) };
  }

  it('fallback gate attaches listeners in fallback mode and detaches them when global mode activates', () => {
    const { gate, calls } = makeGate();
    expect(gate.isAttached()).toBe(false);
    expect(calls()).toEqual({ attach: 0, detach: 0 });

    gate.setMode('fallback');
    expect(gate.isAttached()).toBe(true);
    expect(calls()).toEqual({ attach: 1, detach: 0 });

    gate.setMode('global'); // accessibility granted → no double counting
    expect(gate.isAttached()).toBe(false);
    expect(calls()).toEqual({ attach: 1, detach: 1 });
  });

  it('repeated notifications of the same mode are idempotent', () => {
    const { gate, calls } = makeGate();

    gate.setMode('fallback');
    gate.setMode('fallback');
    gate.setMode('fallback');
    expect(calls()).toEqual({ attach: 1, detach: 0 });

    gate.setMode('global');
    gate.setMode('global');
    expect(calls()).toEqual({ attach: 1, detach: 1 });
  });

  it('starts detached and an initial global mode never calls detach', () => {
    const { gate, calls } = makeGate();

    gate.setMode('global');
    expect(gate.isAttached()).toBe(false);
    expect(calls()).toEqual({ attach: 0, detach: 0 });
  });

  it('re-attaches when the mode falls back again after global', () => {
    const { gate, calls } = makeGate();
    const transitions: InputMode[] = ['fallback', 'global', 'fallback'];
    for (const mode of transitions) {
      gate.setMode(mode);
    }
    expect(gate.isAttached()).toBe(true);
    expect(calls()).toEqual({ attach: 2, detach: 1 });
  });
});
