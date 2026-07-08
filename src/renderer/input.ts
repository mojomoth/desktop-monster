// Window-focused fallback input wiring (SPEC F14, renderer half). The pure
// gate logic lives in src/core/input.ts (T09); this module supplies its real
// attach/detach: window keydown/mousedown listeners that feed the same
// engine path as global input, ignoring clicks on the 24-px drag strip.
//
// DOM-free by injection (same policy as game.ts/hud.ts): the event target
// and the preload bridge are parameters — production passes window and
// window.desmon, tests pass fakes — so everything here runs under vitest's
// node environment.

import { createFallbackGate } from '../core/index.js';
import type { InputSource } from '../core/index.js';
import type { InputModePayload } from '../shared/ipc.js';

/** The two window events the fallback path listens for. */
export type FallbackEventName = 'keydown' | 'mousedown';

/** Minimal shape of a delivered event — only the target is inspected. */
export interface FallbackEvent {
  target?: unknown;
}

export type FallbackListener = (event: FallbackEvent) => void;

/** Minimal event-target surface — the real `window` satisfies it. */
export interface FallbackEventTarget {
  addEventListener(type: FallbackEventName, listener: FallbackListener): void;
  removeEventListener(type: FallbackEventName, listener: FallbackListener): void;
}

/** The slice of the preload bridge (window.desmon) this module needs. */
export interface FallbackModeBridge {
  getInputMode(): Promise<InputModePayload>;
  onInputMode(cb: (payload: InputModePayload) => void): () => void;
}

export interface FallbackInputOptions {
  target: FallbackEventTarget;
  bridge: FallbackModeBridge;
  /** Called once per accepted keydown/mousedown with its input source. */
  onAttack: (source: InputSource) => void;
}

export interface FallbackInputHandle {
  /** Whether the window listeners are currently attached. */
  isAttached(): boolean;
  /** Resolves once the initial getInputMode() seed has been applied. */
  ready: Promise<void>;
  /** Unsubscribe from mode events and force-detach the listeners. */
  dispose(): void;
}

/** True when the event originated on (or inside) the 24-px drag strip. */
function isDragStripEvent(event: FallbackEvent): boolean {
  const target = event.target;
  if (typeof target !== 'object' || target === null) {
    return false;
  }
  const el = target as { closest?: (selector: string) => unknown };
  if (typeof el.closest !== 'function') {
    return false;
  }
  const hit = el.closest('.drag-handle');
  return hit !== null && hit !== undefined;
}

/**
 * Wire the fallback gate to a real event target: attach window
 * keydown/mousedown while the input mode is 'fallback', detach the moment
 * 'global' activates (the native hook already sees in-window input — both
 * paths live would double-count every attack). The initial mode is seeded
 * from getInputMode() because mode events fired before the window loaded
 * are lost (see iter-04 notes); a live onInputMode event always outranks a
 * stale seed answer that resolves after it.
 */
export function setupFallbackInput(options: FallbackInputOptions): FallbackInputHandle {
  const { target, bridge, onAttack } = options;

  const onKeydown: FallbackListener = () => {
    onAttack('keyboard');
  };
  const onMousedown: FallbackListener = (event) => {
    if (isDragStripEvent(event)) {
      return; // dragging the window must never attack
    }
    onAttack('mouse');
  };

  const gate = createFallbackGate({
    attach: () => {
      target.addEventListener('keydown', onKeydown);
      target.addEventListener('mousedown', onMousedown);
    },
    detach: () => {
      target.removeEventListener('keydown', onKeydown);
      target.removeEventListener('mousedown', onMousedown);
    },
  });

  let sawLiveEvent = false;
  let disposed = false;

  // Subscribe BEFORE seeding so no transition can slip between the two.
  const unsubscribe = bridge.onInputMode((payload) => {
    if (disposed) {
      return;
    }
    sawLiveEvent = true;
    gate.setMode(payload.mode);
  });

  const ready = bridge
    .getInputMode()
    .then((payload) => {
      if (!disposed && !sawLiveEvent) {
        gate.setMode(payload.mode);
      }
    })
    .catch(() => {
      // A failed invoke leaves the gate detached until a mode event arrives;
      // the render loop must never die over input-mode discovery.
    });

  return {
    isAttached: () => gate.isAttached(),
    ready,
    dispose(): void {
      disposed = true;
      unsubscribe();
      gate.setMode('global'); // force-detach if currently attached
    },
  };
}
