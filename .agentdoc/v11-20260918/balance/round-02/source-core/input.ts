// InputDriver abstraction + window-focused fallback gate (SPEC F12 + the pure
// half of F14; GAME_ARCHITECTURE "Input Abstraction").
//
// Pure TypeScript — zero imports of electron/DOM/node. The native global hook
// lives in src/main/globalInput.ts and is never referenced from here; ALL
// tests and `npm run smoke` drive input through SimulatedInputDriver instead.

import type { InputSource } from './types.js';

/** One input event as delivered to driver subscribers. */
export interface InputEvent {
  source: InputSource;
}

export type InputListener = (event: InputEvent) => void;

/**
 * Uniform source of attack-triggering input events (SPEC F12): start(),
 * stop(), subscribe(cb) → unsubscribe. Production input reaches the renderer
 * through the same shape; tests and smoke use SimulatedInputDriver.
 */
export interface InputDriver {
  /** Begin delivering events to subscribers. */
  start(): void;
  /** Stop delivering events. Subscriptions are kept; start() resumes them. */
  stop(): void;
  /** Register a listener; returns its unsubscribe function. */
  subscribe(listener: InputListener): () => void;
}

/**
 * Deterministic InputDriver for tests and SMOKE mode: events are produced
 * programmatically via emit(source). Events emitted while the driver is not
 * started are dropped — callers must start() first (T13's smoke path included).
 */
export class SimulatedInputDriver implements InputDriver {
  private readonly listeners = new Set<InputListener>();
  private running = false;

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  subscribe(listener: InputListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Deliver one event to every current subscriber (dropped while stopped). */
  emit(source: InputSource): void {
    if (!this.running) {
      return;
    }
    for (const listener of [...this.listeners]) {
      listener({ source });
    }
  }
}

/**
 * How input is currently captured. Mirrors shared/ipc.ts's InputMode —
 * duplicated on purpose: core and shared stay import-free of each other
 * (same policy as InputSource, see iter-05 notes).
 */
export type InputMode = 'global' | 'fallback';

export interface FallbackGateDeps {
  /** Attach the window-focused listeners (renderer keydown/mousedown, T14). */
  attach: () => void;
  /** Detach them again. */
  detach: () => void;
}

export interface FallbackGate {
  /** Feed a mode transition (initial getInputMode + every onInputMode event). */
  setMode(mode: InputMode): void;
  /** Whether the fallback listeners are currently attached. */
  isAttached(): boolean;
}

/**
 * Pure gate deciding WHEN the renderer's fallback listeners are attached
 * (SPEC F14): attach while mode is 'fallback', detach the moment 'global'
 * activates — the global hook already sees in-window keys/clicks, so leaving
 * both paths live would double-count every attack. Starts detached; repeated
 * notifications of the same mode are idempotent (never re-attach/re-detach).
 */
export function createFallbackGate(deps: FallbackGateDeps): FallbackGate {
  let attached = false;
  return {
    setMode(mode: InputMode): void {
      if (mode === 'fallback' && !attached) {
        attached = true;
        deps.attach();
      } else if (mode === 'global' && attached) {
        attached = false;
        deps.detach();
      }
    },
    isAttached: (): boolean => attached,
  };
}
