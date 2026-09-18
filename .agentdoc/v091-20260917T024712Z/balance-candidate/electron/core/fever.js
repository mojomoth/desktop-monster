"use strict";
// Fever mode — SPEC F34 (Assumptions 25/39; GAME_DESIGN_V2 §5). Pure and
// immutable: every function reads the caller's `nowMs` (the engine clock) and
// returns a fresh Fever, so nothing here observes wall-clock time.
Object.defineProperty(exports, "__esModule", { value: true });
exports.feverActive = exports.createFever = exports.FEVER_MULT = exports.FEVER_COOLDOWN_MS = exports.FEVER_MS = exports.FEVER_WINDOW_MS = exports.FEVER_INPUTS = void 0;
exports.feverInput = feverInput;
exports.feverTick = feverTick;
/** Inputs needed inside FEVER_WINDOW_MS to light fever. */
exports.FEVER_INPUTS = 20;
/** How close together those inputs must be. */
exports.FEVER_WINDOW_MS = 3000;
/** How long fever burns once lit. */
exports.FEVER_MS = 5000;
/** Dead time after a fever, before the next one can be lit. */
exports.FEVER_COOLDOWN_MS = 10000;
/** Damage multiplier while fever burns. */
exports.FEVER_MULT = 3n;
/** Cold tracker: no stamps, no fever, no cooldown. */
const createFever = () => ({ stamps: [], activeUntil: 0, cooldownUntil: 0 });
exports.createFever = createFever;
/** Is fever burning at `nowMs`? */
const feverActive = (f, nowMs) => nowMs < f.activeUntil;
exports.feverActive = feverActive;
/**
 * Record one input. Fever starts on the FEVER_INPUTS-th stamp inside the
 * window, when nothing is burning and the cooldown has passed; the stamps are
 * cleared on start so the burst is spent.
 */
function feverInput(f, nowMs) {
    const stamps = [...f.stamps, nowMs].slice(-exports.FEVER_INPUTS);
    const started = stamps.length === exports.FEVER_INPUTS &&
        nowMs - (stamps[0] ?? nowMs) <= exports.FEVER_WINDOW_MS &&
        !(0, exports.feverActive)(f, nowMs) &&
        nowMs >= f.cooldownUntil;
    return started
        ? { fever: { stamps: [], activeUntil: nowMs + exports.FEVER_MS, cooldownUntil: 0 }, started }
        : { fever: { ...f, stamps }, started };
}
/**
 * Advance the tracker to `nowMs`. A burning fever that reached its end is put
 * out exactly once and opens the cooldown.
 */
function feverTick(f, nowMs) {
    if (f.activeUntil === 0 || nowMs < f.activeUntil)
        return { fever: f, ended: false };
    return {
        fever: { ...f, activeUntil: 0, cooldownUntil: nowMs + exports.FEVER_COOLDOWN_MS },
        ended: true,
    };
}
