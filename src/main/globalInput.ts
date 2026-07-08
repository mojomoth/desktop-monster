// Guarded global input hook (SPEC F13; GAME_ARCHITECTURE §3.6).
//
// Electron-free by design (same pattern as persistence.ts): every effectful
// dependency — systemPreferences.isTrustedAccessibilityClient, the native
// uiohook-napi module, interval timers — is injected, so the accessibility
// state machine has real behavioral tests under vitest. src/main/index.ts
// wires the live dependencies (and skips this module entirely under SMOKE=1).
//
// macOS rules this module encodes:
// - isTrustedAccessibilityClient(true) is called exactly ONCE, at startup.
//   NEVER call with prompt=false first — Electron issue #28395: a prior
//   false call suppresses the native permission dialog.
// - uiohook-napi is require()d lazily and ONLY once trusted: starting the
//   hook without the Accessibility grant crashes the process (uiohook-napi
//   issue #24), and a missing/broken native module must never crash startup.
// - While untrusted, poll with prompt=false every 5s; on grant, start the
//   hook (works without a relaunch in most cases).

import type { InputModePayload, InputPayload, InputSource } from '../shared/ipc.js';

/** The subset of the native global hook this module drives. */
export interface NativeHook {
  on(event: 'keydown' | 'mousedown', listener: () => void): unknown;
  start(): void;
  stop(): void;
}

export interface GlobalInputDeps {
  /** `systemPreferences.isTrustedAccessibilityClient` (injected). */
  isTrustedAccessibilityClient: (prompt: boolean) => boolean;
  /** One global input event arrived — forward over `desmon:input`. */
  onInput: (payload: InputPayload) => void;
  /** Mode transition — forward over `desmon:input-mode`. */
  onModeChange: (payload: InputModePayload) => void;
  /** Loads the native hook; defaults to a lazy require of uiohook-napi. */
  loadHook?: () => NativeHook;
  /** Defaults to `process.platform`; only darwin has the permission gate. */
  platform?: NodeJS.Platform;
  /** Grant-poll cadence while untrusted; defaults to 5000 ms. */
  pollIntervalMs?: number;
  /** Timer injection for deterministic tests; default global setInterval. */
  setIntervalFn?: (fn: () => void, ms: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
}

export interface GlobalInputController {
  /** Current mode — what `desmon:get-input-mode` reports. */
  getMode(): InputModePayload;
  /** Stops the hook (if running) and cancels the grant poll. Wire to will-quit. */
  stop(): void;
}

const FALLBACK: InputModePayload = { mode: 'fallback', accessibilityGranted: false };
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Mode of the most recently started controller. Before/without
 * startGlobalInput (e.g. SMOKE=1) this stays the fallback default, which is
 * exactly what `desmon:get-input-mode` must report in that case.
 */
let currentMode: InputModePayload = FALLBACK;

export function getCurrentInputMode(): InputModePayload {
  return currentMode;
}

function loadNativeHook(): NativeHook {
  // Lazy require so a missing/broken native module surfaces as a caught
  // error in tryStartHook, never as a startup crash.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { uIOhook } = require('uiohook-napi') as typeof import('uiohook-napi');
  return uIOhook;
}

export function startGlobalInput(deps: GlobalInputDeps): GlobalInputController {
  const {
    isTrustedAccessibilityClient,
    onInput,
    onModeChange,
    loadHook = loadNativeHook,
    platform = process.platform,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    setIntervalFn = setInterval,
    clearIntervalFn = (handle): void => {
      clearInterval(handle as ReturnType<typeof setInterval>);
    },
  } = deps;

  let hook: NativeHook | null = null;
  let poll: unknown = null;

  const setMode = (mode: InputModePayload): void => {
    currentMode = mode;
    onModeChange(mode);
  };

  const forward = (source: InputSource) => (): void => {
    onInput({ source });
  };

  const tryStartHook = (): void => {
    try {
      const candidate = loadHook();
      candidate.on('keydown', forward('keyboard'));
      candidate.on('mousedown', forward('mouse'));
      candidate.start();
      hook = candidate;
      setMode({ mode: 'global', accessibilityGranted: true });
    } catch {
      setMode({ mode: 'fallback', accessibilityGranted: false });
    }
  };

  const stopPolling = (): void => {
    if (poll !== null) {
      clearIntervalFn(poll);
      poll = null;
    }
  };

  if (platform !== 'darwin') {
    tryStartHook(); // win/linux: no accessibility gate — just start
  } else if (isTrustedAccessibilityClient(true)) {
    // The single prompt=true call: returns the status AND shows the native
    // dialog once if the user has never been asked.
    tryStartHook();
  } else {
    setMode({ mode: 'fallback', accessibilityGranted: false });
    poll = setIntervalFn(() => {
      if (isTrustedAccessibilityClient(false)) {
        stopPolling();
        tryStartHook();
      }
    }, pollIntervalMs);
  }

  return {
    getMode: (): InputModePayload => currentMode,
    stop: (): void => {
      stopPolling();
      hook?.stop();
      hook = null;
    },
  };
}
