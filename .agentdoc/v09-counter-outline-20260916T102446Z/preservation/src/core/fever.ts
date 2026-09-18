// Fever mode — SPEC F34 (Assumptions 25/39; GAME_DESIGN_V2 §5). Pure and
// immutable: every function reads the caller's `nowMs` (the engine clock) and
// returns a fresh Fever, so nothing here observes wall-clock time.

/** Inputs needed inside FEVER_WINDOW_MS to light fever. */
export const FEVER_INPUTS = 20;

/** How close together those inputs must be. */
export const FEVER_WINDOW_MS = 3000;

/** How long fever burns once lit. */
export const FEVER_MS = 5000;

/** Dead time after a fever, before the next one can be lit. */
export const FEVER_COOLDOWN_MS = 10000;

/** Damage multiplier while fever burns. */
export const FEVER_MULT = 3n;

export interface Fever {
  /** The last FEVER_INPUTS input timestamps, oldest first. */
  readonly stamps: readonly number[];
  /** Clock value at which the current fever stops (0 = not burning). */
  readonly activeUntil: number;
  /** Clock value before which no new fever can be lit. */
  readonly cooldownUntil: number;
}

/** Cold tracker: no stamps, no fever, no cooldown. */
export const createFever = (): Fever => ({ stamps: [], activeUntil: 0, cooldownUntil: 0 });

/** Is fever burning at `nowMs`? */
export const feverActive = (f: Fever, nowMs: number): boolean => nowMs < f.activeUntil;

/**
 * Record one input. Fever starts on the FEVER_INPUTS-th stamp inside the
 * window, when nothing is burning and the cooldown has passed; the stamps are
 * cleared on start so the burst is spent.
 */
export function feverInput(f: Fever, nowMs: number): { fever: Fever; started: boolean } {
  const stamps = [...f.stamps, nowMs].slice(-FEVER_INPUTS);
  const started =
    stamps.length === FEVER_INPUTS &&
    nowMs - (stamps[0] ?? nowMs) <= FEVER_WINDOW_MS &&
    !feverActive(f, nowMs) &&
    nowMs >= f.cooldownUntil;
  return started
    ? { fever: { stamps: [], activeUntil: nowMs + FEVER_MS, cooldownUntil: 0 }, started }
    : { fever: { ...f, stamps }, started };
}

/**
 * Advance the tracker to `nowMs`. A burning fever that reached its end is put
 * out exactly once and opens the cooldown.
 */
export function feverTick(f: Fever, nowMs: number): { fever: Fever; ended: boolean } {
  if (f.activeUntil === 0 || nowMs < f.activeUntil) return { fever: f, ended: false };
  return {
    fever: { ...f, activeUntil: 0, cooldownUntil: nowMs + FEVER_COOLDOWN_MS },
    ended: true,
  };
}
