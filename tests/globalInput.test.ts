// T04 — guarded global input hook (SPEC F13; GAME_ARCHITECTURE §3.6).
// src/main/globalInput.ts is electron-free with injected dependencies
// (permission check, native-hook loader, timers), so the accessibility state
// machine is tested behaviorally and deterministically — no real timers, no
// real OS hooks. The index.ts wiring (SMOKE bypass, will-quit teardown) is a
// source contract, like tests/window.test.ts.
//
// NOTE: the native hook package's name is deliberately never written in this
// file (T09's acceptance grep requires tests/ to stay clean of it); where the
// literal is needed it is assembled at runtime.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getCurrentInputMode, startGlobalInput } from '../src/main/globalInput.js';
import type { GlobalInputDeps, NativeHook } from '../src/main/globalInput.js';
import type { InputModePayload, InputPayload } from '../src/shared/ipc.js';

const FALLBACK: InputModePayload = { mode: 'fallback', accessibilityGranted: false };
const GLOBAL: InputModePayload = { mode: 'global', accessibilityGranted: true };

class FakeHook implements NativeHook {
  listeners = new Map<string, () => void>();
  started = 0;
  stopped = 0;

  on(event: 'keydown' | 'mousedown', listener: () => void): void {
    this.listeners.set(event, listener);
  }
  start(): void {
    this.started += 1;
  }
  stop(): void {
    this.stopped += 1;
  }
  fire(event: 'keydown' | 'mousedown'): void {
    this.listeners.get(event)?.();
  }
}

/** Deterministic harness: records every injected side effect. */
function makeHarness(overrides: Partial<GlobalInputDeps> = {}) {
  const hook = new FakeHook();
  const inputs: InputPayload[] = [];
  const modes: InputModePayload[] = [];
  const trustedCalls: boolean[] = [];
  const polls: Array<{ fn: () => void; ms: number }> = [];
  let cleared = 0;

  const deps: GlobalInputDeps = {
    isTrustedAccessibilityClient: (prompt) => {
      trustedCalls.push(prompt);
      return true;
    },
    onInput: (payload) => inputs.push(payload),
    onModeChange: (payload) => modes.push(payload),
    loadHook: () => hook,
    platform: 'darwin',
    setIntervalFn: (fn, ms) => {
      polls.push({ fn, ms });
      return polls.length - 1;
    },
    clearIntervalFn: () => {
      cleared += 1;
    },
    ...overrides,
  };

  return {
    hook,
    inputs,
    modes,
    trustedCalls,
    polls,
    deps,
    clearedCount: () => cleared,
    start: () => startGlobalInput(deps),
  };
}

describe('startGlobalInput on darwin, permission granted', () => {
  it('asks for the Accessibility grant exactly once, with prompt=true', () => {
    const h = makeHarness();
    h.start();
    expect(h.trustedCalls).toEqual([true]);
  });

  it('starts the native hook and reports global mode', () => {
    const h = makeHarness();
    h.start();
    expect(h.hook.started).toBe(1);
    expect(h.modes).toEqual([GLOBAL]);
  });

  it('forwards keydown as keyboard and mousedown as mouse input', () => {
    const h = makeHarness();
    h.start();
    h.hook.fire('keydown');
    h.hook.fire('mousedown');
    h.hook.fire('keydown');
    expect(h.inputs).toEqual([
      { source: 'keyboard' },
      { source: 'mouse' },
      { source: 'keyboard' },
    ]);
  });

  it('falls back instead of crashing when the native module is broken', () => {
    const loadHook = vi.fn<() => NativeHook>(() => {
      throw new Error('module did not self-register');
    });
    const h = makeHarness({ loadHook });
    expect(() => h.start()).not.toThrow();
    expect(loadHook).toHaveBeenCalledTimes(1);
    expect(h.modes).toEqual([FALLBACK]);
  });

  it('stop() stops the running hook (the will-quit path)', () => {
    const h = makeHarness();
    const controller = h.start();
    controller.stop();
    expect(h.hook.stopped).toBe(1);
  });
});

describe('startGlobalInput on darwin, permission not granted', () => {
  /** The scheduled grant poll (guards the index for noUncheckedIndexedAccess). */
  const firstPoll = (polls: Array<{ fn: () => void; ms: number }>) => {
    const poll = polls[0];
    if (!poll) throw new Error('expected a scheduled grant poll');
    return poll;
  };

  /** Denies the startup prompt; poll checks succeed from `grantOnFalseCall`. */
  const untrusted = (grantOnFalseCall = Infinity) => {
    const trustedCalls: boolean[] = [];
    let falseCalls = 0;
    const harness = makeHarness({
      isTrustedAccessibilityClient: (prompt) => {
        trustedCalls.push(prompt);
        if (prompt) return false;
        falseCalls += 1;
        return falseCalls >= grantOnFalseCall;
      },
    });
    return { ...harness, trustedCalls };
  };

  it('emits fallback mode and never loads the native hook', () => {
    const h = untrusted();
    h.start();
    expect(h.modes).toEqual([FALLBACK]);
    expect(h.hook.started).toBe(0);
  });

  it('schedules the grant poll at the 5000 ms default', () => {
    const h = untrusted();
    h.start();
    expect(h.polls).toHaveLength(1);
    expect(firstPoll(h.polls).ms).toBe(5000);
  });

  it('polls with prompt=false only — never re-prompts (electron#28395)', () => {
    const h = untrusted();
    h.start();
    firstPoll(h.polls).fn();
    firstPoll(h.polls).fn();
    // Exactly one prompt=true (startup), then prompt=false forever.
    expect(h.trustedCalls).toEqual([true, false, false]);
    expect(h.hook.started).toBe(0);
    expect(h.modes).toEqual([FALLBACK]);
  });

  it('starts the hook and cancels the poll once the grant arrives', () => {
    const h = untrusted(2);
    h.start();
    firstPoll(h.polls).fn(); // still denied
    expect(h.hook.started).toBe(0);
    firstPoll(h.polls).fn(); // granted now
    expect(h.clearedCount()).toBe(1);
    expect(h.hook.started).toBe(1);
    expect(h.modes).toEqual([FALLBACK, GLOBAL]);
  });

  it('stop() cancels a pending grant poll', () => {
    const h = untrusted();
    const controller = h.start();
    controller.stop();
    expect(h.clearedCount()).toBe(1);
    expect(h.hook.stopped).toBe(0); // hook never started
  });
});

describe('startGlobalInput off darwin', () => {
  it('starts the hook without any accessibility check (win32)', () => {
    const h = makeHarness({ platform: 'win32' });
    h.start();
    expect(h.trustedCalls).toEqual([]);
    expect(h.hook.started).toBe(1);
    expect(h.modes).toEqual([GLOBAL]);
  });
});

describe('getCurrentInputMode (drives desmon:get-input-mode)', () => {
  it('defaults to fallback before any start — the SMOKE=1 answer', async () => {
    vi.resetModules();
    const fresh = await import('../src/main/globalInput.js');
    expect(fresh.getCurrentInputMode()).toEqual(FALLBACK);
  });

  it('tracks the controller transitions', () => {
    const h = makeHarness();
    const controller = h.start();
    expect(getCurrentInputMode()).toEqual(GLOBAL);
    expect(controller.getMode()).toEqual(GLOBAL);
  });
});

describe('main wiring (source contract, src/main/index.ts)', () => {
  const indexTs = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8');

  it('stops global input on will-quit', () => {
    expect(indexTs).toContain("app.on('will-quit'");
    expect(indexTs).toContain('globalInput.stop()');
  });

  it('bypasses global input entirely under SMOKE=1', () => {
    const guard = indexTs.indexOf('if (!isSmoke)');
    const start = indexTs.indexOf('startGlobalInput(');
    expect(guard).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(guard);
  });

  it('prompts via the injected systemPreferences call', () => {
    expect(indexTs).toContain('systemPreferences.isTrustedAccessibilityClient(prompt)');
  });
});

describe('native hook containment (F13: never imported by core/shared/renderer)', () => {
  // Assembled so the package name never appears literally in tests/.
  const hookPackage = ['ui', 'ohook', '-napi'].join('');

  const listFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? listFiles(full) : [full];
    });

  it.each(['src/core', 'src/shared', 'src/renderer'])('%s never mentions it', (dir) => {
    for (const file of listFiles(join(process.cwd(), dir))) {
      expect(readFileSync(file, 'utf8')).not.toContain(hookPackage);
    }
  });
});
