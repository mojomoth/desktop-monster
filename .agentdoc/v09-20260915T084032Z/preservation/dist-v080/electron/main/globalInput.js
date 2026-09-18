"use strict";
// Guarded global input hook (SPEC F13; GAME_ARCHITECTURE §3.6).
//
// Electron-free by design (same pattern as persistence.ts): every effectful
// dependency — systemPreferences.isTrustedAccessibilityClient, the native
// uiohook-napi module, interval timers — is injected, so the accessibility
// state machine has real behavioral tests under vitest. src/main/index.ts
// wires the live dependencies (and skips this module entirely under SMOKE=1).
//
// macOS rules this module encodes:
// - isTrustedAccessibilityClient(true) is called once when connection starts.
//   NEVER call with prompt=false first — Electron issue #28395: a prior
//   false call suppresses the native permission dialog.
// - uiohook-napi is require()d lazily and ONLY once trusted: starting the
//   hook without the Accessibility grant crashes the process (uiohook-napi
//   issue #24), and a missing/broken native module must never crash startup.
// - While untrusted, poll with prompt=false every 5s; on grant, start the
//   hook (works without a relaunch in most cases).
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentInputMode = getCurrentInputMode;
exports.startGlobalInput = startGlobalInput;
exports.onceGlobalInput = onceGlobalInput;
const FALLBACK = { mode: 'fallback', accessibilityGranted: false };
const DEFAULT_POLL_INTERVAL_MS = 5000;
/**
 * Mode of the most recently started controller. Before/without
 * startGlobalInput (e.g. SMOKE=1) this stays the fallback default, which is
 * exactly what `desmon:get-input-mode` must report in that case.
 */
let currentMode = FALLBACK;
function getCurrentInputMode() {
    return currentMode;
}
function loadNativeHook() {
    // Lazy require so a missing/broken native module surfaces as a caught
    // error in tryStartHook, never as a startup crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { uIOhook } = require('uiohook-napi');
    return uIOhook;
}
function startGlobalInput(deps) {
    const { isTrustedAccessibilityClient, onInput, onModeChange, loadHook = loadNativeHook, platform = process.platform, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, setIntervalFn = setInterval, clearIntervalFn = (handle) => {
        clearInterval(handle);
    }, } = deps;
    let hook = null;
    let poll = null;
    const setMode = (mode) => {
        currentMode = mode;
        onModeChange(mode);
    };
    const forward = (source) => () => {
        onInput({ source });
    };
    const tryStartHook = () => {
        try {
            const candidate = loadHook();
            const heldKeys = new Set();
            candidate.on('keydown', ({ keycode }) => {
                if (heldKeys.has(keycode))
                    return;
                heldKeys.add(keycode);
                onInput({ source: 'keyboard' });
            });
            candidate.on('keyup', ({ keycode }) => heldKeys.delete(keycode));
            candidate.on('mousedown', forward('mouse'));
            candidate.start();
            hook = candidate;
            setMode({ mode: 'global', accessibilityGranted: true });
        }
        catch {
            setMode({ mode: 'fallback', accessibilityGranted: false });
        }
    };
    const stopPolling = () => {
        if (poll !== null) {
            clearIntervalFn(poll);
            poll = null;
        }
    };
    if (platform !== 'darwin') {
        tryStartHook(); // win/linux: no accessibility gate — just start
    }
    else if (isTrustedAccessibilityClient(true)) {
        // The single prompt=true call: returns the status AND shows the native
        // dialog once if the user has never been asked.
        tryStartHook();
    }
    else {
        setMode({ mode: 'fallback', accessibilityGranted: false });
        poll = setIntervalFn(() => {
            if (isTrustedAccessibilityClient(false)) {
                stopPolling();
                tryStartHook();
            }
        }, pollIntervalMs);
    }
    return {
        getMode: () => currentMode,
        stop: () => {
            stopPolling();
            hook?.stop();
            hook = null;
        },
    };
}
/** One owner and one start attempt, including repeated clicks while permission is pending. */
function onceGlobalInput(start) {
    let controller;
    return {
        start: () => controller ??= start(),
        stop: () => controller?.stop(),
    };
}
