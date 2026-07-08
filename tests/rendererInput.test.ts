// T14 — window-focused fallback input wiring (SPEC F14, renderer half).
// setupFallbackInput is DOM-free by injection: these tests drive it with a
// fake event target and a fake preload bridge, mirroring how window and
// window.desmon satisfy the same interfaces in production.

import { describe, expect, it } from 'vitest';
import type { InputSource } from '../src/core/index.js';
import { setupFallbackInput } from '../src/renderer/input.js';
import type {
  FallbackEvent,
  FallbackEventName,
  FallbackEventTarget,
  FallbackInputHandle,
  FallbackListener,
  FallbackModeBridge,
} from '../src/renderer/input.js';
import type { InputModePayload } from '../src/shared/ipc.js';

interface FakeTarget {
  target: FallbackEventTarget;
  dispatch(type: FallbackEventName, event?: FallbackEvent): void;
  listenerCount(type: FallbackEventName): number;
}

function makeTarget(): FakeTarget {
  const listeners: Record<FallbackEventName, Set<FallbackListener>> = {
    keydown: new Set(),
    mousedown: new Set(),
  };
  return {
    target: {
      addEventListener(type, listener): void {
        listeners[type].add(listener);
      },
      removeEventListener(type, listener): void {
        listeners[type].delete(listener);
      },
    },
    dispatch(type, event = {}): void {
      for (const listener of [...listeners[type]]) {
        listener(event);
      }
    },
    listenerCount: (type) => listeners[type].size,
  };
}

interface FakeBridge {
  bridge: FallbackModeBridge;
  /** Resolve the pending getInputMode() invoke. */
  resolveSeed(mode: InputModePayload['mode']): void;
  /** Fire a live desmon:input-mode event. */
  emitMode(mode: InputModePayload['mode']): void;
}

function payload(mode: InputModePayload['mode']): InputModePayload {
  return { mode, accessibilityGranted: mode === 'global' };
}

function makeBridge(): FakeBridge {
  const callbacks = new Set<(p: InputModePayload) => void>();
  let resolveSeed!: (p: InputModePayload) => void;
  const seed = new Promise<InputModePayload>((resolve) => {
    resolveSeed = resolve;
  });
  return {
    bridge: {
      getInputMode: () => seed,
      onInputMode(cb): () => void {
        callbacks.add(cb);
        return () => {
          callbacks.delete(cb);
        };
      },
    },
    resolveSeed: (mode) => {
      resolveSeed(payload(mode));
    },
    emitMode: (mode) => {
      for (const cb of [...callbacks]) {
        cb(payload(mode));
      }
    },
  };
}

interface Wired {
  fake: FakeTarget;
  fakeBridge: FakeBridge;
  attacks: InputSource[];
  handle: FallbackInputHandle;
}

function wire(): Wired {
  const fake = makeTarget();
  const fakeBridge = makeBridge();
  const attacks: InputSource[] = [];
  const handle = setupFallbackInput({
    target: fake.target,
    bridge: fakeBridge.bridge,
    onAttack: (source) => {
      attacks.push(source);
    },
  });
  return { fake, fakeBridge, attacks, handle };
}

describe('setupFallbackInput (SPEC F14)', () => {
  it('attaches keydown and mousedown in fallback mode and maps them to input sources', async () => {
    const { fake, fakeBridge, attacks, handle } = wire();
    expect(handle.isAttached()).toBe(false); // detached until the seed answers

    fakeBridge.resolveSeed('fallback');
    await handle.ready;
    expect(handle.isAttached()).toBe(true);
    expect(fake.listenerCount('keydown')).toBe(1);
    expect(fake.listenerCount('mousedown')).toBe(1);

    fake.dispatch('keydown');
    fake.dispatch('mousedown');
    expect(attacks).toEqual(['keyboard', 'mouse']);
  });

  it('stays detached when the seed reports global mode', async () => {
    const { fake, fakeBridge, attacks, handle } = wire();
    fakeBridge.resolveSeed('global');
    await handle.ready;
    expect(handle.isAttached()).toBe(false);
    expect(fake.listenerCount('keydown')).toBe(0);
    expect(fake.listenerCount('mousedown')).toBe(0);
    fake.dispatch('keydown');
    expect(attacks).toEqual([]);
  });

  it('detaches both listeners the moment global mode activates (no double counting)', async () => {
    const { fake, fakeBridge, attacks, handle } = wire();
    fakeBridge.resolveSeed('fallback');
    await handle.ready;
    fake.dispatch('keydown');
    expect(attacks).toHaveLength(1);

    fakeBridge.emitMode('global');
    expect(handle.isAttached()).toBe(false);
    expect(fake.listenerCount('keydown')).toBe(0);
    expect(fake.listenerCount('mousedown')).toBe(0);
    fake.dispatch('keydown');
    fake.dispatch('mousedown');
    expect(attacks).toHaveLength(1); // nothing was double- or extra-counted
  });

  it('re-attaches when the mode falls back again after global', async () => {
    const { fake, fakeBridge, attacks, handle } = wire();
    fakeBridge.resolveSeed('global');
    await handle.ready;
    expect(handle.isAttached()).toBe(false);

    fakeBridge.emitMode('fallback');
    expect(handle.isAttached()).toBe(true);
    fake.dispatch('mousedown');
    expect(attacks).toEqual(['mouse']);
  });

  it('ignores mousedown events originating on the drag strip', async () => {
    const { fake, fakeBridge, attacks, handle } = wire();
    fakeBridge.resolveSeed('fallback');
    await handle.ready;

    const stripTarget = {
      closest: (selector: string) => (selector === '.drag-handle' ? {} : null),
    };
    fake.dispatch('mousedown', { target: stripTarget });
    expect(attacks).toEqual([]);

    const canvasTarget = { closest: () => null };
    fake.dispatch('mousedown', { target: canvasTarget });
    expect(attacks).toEqual(['mouse']);

    // Only mousedown consults the target — keydown always attacks.
    fake.dispatch('keydown', { target: stripTarget });
    expect(attacks).toEqual(['mouse', 'keyboard']);
  });

  it('drops a stale seed answer when a live mode event arrived first', async () => {
    const { fakeBridge, handle } = wire();
    // The grant landed while the invoke was in flight: the live event is
    // newer than the seed's answer and must win.
    fakeBridge.emitMode('global');
    fakeBridge.resolveSeed('fallback');
    await handle.ready;
    expect(handle.isAttached()).toBe(false);
  });

  it('dispose() detaches the listeners and unsubscribes from mode events', async () => {
    const { fake, fakeBridge, handle } = wire();
    fakeBridge.resolveSeed('fallback');
    await handle.ready;
    expect(handle.isAttached()).toBe(true);

    handle.dispose();
    expect(handle.isAttached()).toBe(false);
    expect(fake.listenerCount('keydown')).toBe(0);
    expect(fake.listenerCount('mousedown')).toBe(0);

    fakeBridge.emitMode('fallback'); // unsubscribed — must not re-attach
    expect(handle.isAttached()).toBe(false);
  });
});
