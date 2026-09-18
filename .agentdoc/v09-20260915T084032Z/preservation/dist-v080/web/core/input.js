// InputDriver abstraction + window-focused fallback gate (SPEC F12 + the pure
// half of F14; GAME_ARCHITECTURE "Input Abstraction").
//
// Pure TypeScript — zero imports of electron/DOM/node. The native global hook
// lives in src/main/globalInput.ts and is never referenced from here; ALL
// tests and `npm run smoke` drive input through SimulatedInputDriver instead.
/**
 * Deterministic InputDriver for tests and SMOKE mode: events are produced
 * programmatically via emit(source). Events emitted while the driver is not
 * started are dropped — callers must start() first (T13's smoke path included).
 */
export class SimulatedInputDriver {
    listeners = new Set();
    running = false;
    start() {
        this.running = true;
    }
    stop() {
        this.running = false;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /** Deliver one event to every current subscriber (dropped while stopped). */
    emit(source) {
        if (!this.running) {
            return;
        }
        for (const listener of [...this.listeners]) {
            listener({ source });
        }
    }
}
/**
 * Pure gate deciding WHEN the renderer's fallback listeners are attached
 * (SPEC F14): attach while mode is 'fallback', detach the moment 'global'
 * activates — the global hook already sees in-window keys/clicks, so leaving
 * both paths live would double-count every attack. Starts detached; repeated
 * notifications of the same mode are idempotent (never re-attach/re-detach).
 */
export function createFallbackGate(deps) {
    let attached = false;
    return {
        setMode(mode) {
            if (mode === 'fallback' && !attached) {
                attached = true;
                deps.attach();
            }
            else if (mode === 'global' && attached) {
                attached = false;
                deps.detach();
            }
        },
        isAttached: () => attached,
    };
}
