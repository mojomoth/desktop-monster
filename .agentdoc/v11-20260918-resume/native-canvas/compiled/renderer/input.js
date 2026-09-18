"use strict";
// Window-focused fallback input wiring (SPEC F14, renderer half). The pure
// gate logic lives in src/core/input.ts (T09); this module supplies its real
// attach/detach: window keydown/mousedown listeners that feed the same
// engine path as global input, ignoring clicks on the 24-px drag strip.
//
// DOM-free by injection (same policy as game.ts/hud.ts): the event target
// and the preload bridge are parameters — production passes window and
// window.desmon, tests pass fakes — so everything here runs under vitest's
// node environment.
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFallbackInput = setupFallbackInput;
const index_js_1 = require("../core/index.js");
/** True when the event originated on (or inside) the 24-px drag strip. */
function isDragStripEvent(event) {
    const target = event.target;
    if (typeof target !== 'object' || target === null) {
        return false;
    }
    const el = target;
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
function setupFallbackInput(options) {
    const { target, bridge, onAttack } = options;
    const onKeydown = (event) => {
        if (event.repeat)
            return;
        onAttack('keyboard');
    };
    const onMousedown = (event) => {
        if (isDragStripEvent(event)) {
            return; // dragging the window must never attack
        }
        onAttack('mouse');
    };
    const gate = (0, index_js_1.createFallbackGate)({
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
        dispose() {
            disposed = true;
            unsubscribe();
            gate.setMode('global'); // force-detach if currently attached
        },
    };
}
