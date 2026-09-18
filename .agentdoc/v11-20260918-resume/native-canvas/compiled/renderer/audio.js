"use strict";
// SPEC F24 (Assumption 13, T18) + F36: the game's ENTIRE soundscape — four
// square-wave blips synthesized with WebAudio OscillatorNode + gain envelope:
// attack tick, kill arpeggio, level-up fanfare, fever start. No audio files, no
// mute/volume UI (Non-Goal).
//
// The AudioContext is created LAZILY on the first blip — game.ts only calls
// these from attack(), i.e. on user input, which is exactly what the browser
// autoplay policy wants. Every WebAudio touch point is guarded: a missing or
// failed AudioContext means silence, never a broken game loop or smoke run.
//
// DOM-free by injection (the persistence.ts pattern): the context factory is
// a parameter typed against minimal structural interfaces, so tests run under
// vitest's node environment with a recording fake. The default factory
// resolves the real AudioContext and returns undefined where it does not
// exist (node), so `createGameAudio()` with no options is safe everywhere.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAIN_FLOOR = exports.FEVER_NOTES = exports.LEVEL_UP_FANFARE_NOTES = exports.KILL_ARPEGGIO_NOTES = exports.ATTACK_TICK_NOTES = void 0;
exports.createGameAudio = createGameAudio;
/** Attack tick: one short high blip per input (Manual M7). */
exports.ATTACK_TICK_NOTES = [
    { freq: 880, at: 0, duration: 0.05, peak: 0.06 },
];
/** Kill arpeggio: C5→E5→G5, quick ascending triad. */
exports.KILL_ARPEGGIO_NOTES = [
    { freq: 523.25, at: 0, duration: 0.09, peak: 0.09 },
    { freq: 659.25, at: 0.07, duration: 0.09, peak: 0.09 },
    { freq: 783.99, at: 0.14, duration: 0.14, peak: 0.09 },
];
/** Level-up fanfare: C5→E5→G5→C6 with a held top note. */
exports.LEVEL_UP_FANFARE_NOTES = [
    { freq: 523.25, at: 0, duration: 0.1, peak: 0.11 },
    { freq: 659.25, at: 0.09, duration: 0.1, peak: 0.11 },
    { freq: 783.99, at: 0.18, duration: 0.1, peak: 0.11 },
    { freq: 1046.5, at: 0.27, duration: 0.28, peak: 0.11 },
];
/** Fever start (SPEC F36): a fast ascending 4-note square sweep. */
exports.FEVER_NOTES = [
    { freq: 392, at: 0, duration: 0.07, peak: 0.1 },
    { freq: 587.33, at: 0.05, duration: 0.07, peak: 0.1 },
    { freq: 783.99, at: 0.1, duration: 0.07, peak: 0.1 },
    { freq: 1174.66, at: 0.15, duration: 0.2, peak: 0.1 },
];
/** Exponential ramps cannot reach 0 — this is "silent" for our peaks. */
exports.GAIN_FLOOR = 0.001;
/** Default factory: the real AudioContext, or undefined where it is absent. */
function defaultCreateContext() {
    // vitest runs game.ts under node, where AudioContext does not exist — the
    // typeof guard (not a try/catch) keeps that path an intentional no-op.
    if (typeof AudioContext === 'undefined') {
        return undefined;
    }
    return new AudioContext();
}
/**
 * Create the game's audio triggers. The context is NOT created here — only
 * the first blip call touches the factory (autoplay policy: audio unlocks on
 * user input). A factory that fails once is latched off and never retried;
 * scheduling failures are swallowed per-blip. Nothing in here can throw into
 * the caller.
 */
function createGameAudio(options = {}) {
    const createContext = options.createContext ?? defaultCreateContext;
    let context;
    let unavailable = false;
    const ensureContext = () => {
        if (unavailable) {
            return undefined;
        }
        if (context === undefined) {
            try {
                context = createContext();
            }
            catch {
                context = undefined;
            }
            if (context === undefined) {
                // Latch: a factory that failed once is not retried on every keypress.
                unavailable = true;
                return undefined;
            }
        }
        try {
            // Autoplay policy: contexts may start suspended until a user gesture —
            // and every blip IS a user gesture, so resume opportunistically.
            if (context.state === 'suspended') {
                void context.resume?.();
            }
        }
        catch {
            // A failed resume only means silence for this blip — never a crash.
        }
        return context;
    };
    const play = (notes) => {
        if (options.isMuted?.())
            return;
        const ctx = ensureContext();
        if (ctx === undefined) {
            return;
        }
        try {
            const now = ctx.currentTime;
            for (const note of notes) {
                const t0 = now + note.at;
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(note.freq, t0);
                // Percussive envelope: full peak at note start, exponential decay to
                // the floor by note end (square waves click without one).
                gain.gain.setValueAtTime(note.peak, t0);
                gain.gain.exponentialRampToValueAtTime(exports.GAIN_FLOOR, t0 + note.duration);
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.start(t0);
                oscillator.stop(t0 + note.duration);
            }
        }
        catch {
            // Guard (SPEC F24): a WebAudio failure must never break the game loop.
        }
    };
    return {
        attackTick: () => {
            play(exports.ATTACK_TICK_NOTES);
        },
        killArpeggio: () => {
            play(exports.KILL_ARPEGGIO_NOTES);
        },
        levelUpFanfare: () => {
            play(exports.LEVEL_UP_FANFARE_NOTES);
        },
        feverStart: () => {
            play(exports.FEVER_NOTES);
        },
    };
}
