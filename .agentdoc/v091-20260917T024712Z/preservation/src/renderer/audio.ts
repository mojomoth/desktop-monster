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

/** Structural subset of the WebAudio AudioParam scheduling surface. */
export interface AudioParamLike {
  setValueAtTime(value: number, startTime: number): unknown;
  exponentialRampToValueAtTime(value: number, endTime: number): unknown;
}

/** Structural subset of OscillatorNode (method syntax keeps DOM assignable). */
export interface OscillatorNodeLike {
  type: string;
  frequency: AudioParamLike;
  connect(destination: unknown): unknown;
  start(when: number): void;
  stop(when: number): void;
}

/** Structural subset of GainNode. */
export interface GainNodeLike {
  gain: AudioParamLike;
  connect(destination: unknown): unknown;
}

/** Structural subset of AudioContext — everything the three blips need. */
export interface AudioContextLike {
  readonly currentTime: number;
  readonly destination: unknown;
  readonly state?: string;
  resume?(): Promise<void>;
  createOscillator(): OscillatorNodeLike;
  createGain(): GainNodeLike;
}

/** One scheduled square-wave note of a blip. */
export interface BlipNote {
  /** Oscillator frequency, Hz. */
  freq: number;
  /** Start offset from "now", seconds. */
  at: number;
  /** Note length, seconds (gain decays to the floor across it). */
  duration: number;
  /** Peak gain at note start (kept low — these are background ticks). */
  peak: number;
}

/** Attack tick: one short high blip per input (Manual M7). */
export const ATTACK_TICK_NOTES: readonly BlipNote[] = [
  { freq: 880, at: 0, duration: 0.05, peak: 0.06 },
];

/** Kill arpeggio: C5→E5→G5, quick ascending triad. */
export const KILL_ARPEGGIO_NOTES: readonly BlipNote[] = [
  { freq: 523.25, at: 0, duration: 0.09, peak: 0.09 },
  { freq: 659.25, at: 0.07, duration: 0.09, peak: 0.09 },
  { freq: 783.99, at: 0.14, duration: 0.14, peak: 0.09 },
];

/** Level-up fanfare: C5→E5→G5→C6 with a held top note. */
export const LEVEL_UP_FANFARE_NOTES: readonly BlipNote[] = [
  { freq: 523.25, at: 0, duration: 0.1, peak: 0.11 },
  { freq: 659.25, at: 0.09, duration: 0.1, peak: 0.11 },
  { freq: 783.99, at: 0.18, duration: 0.1, peak: 0.11 },
  { freq: 1046.5, at: 0.27, duration: 0.28, peak: 0.11 },
];

/** Fever start (SPEC F36): a fast ascending 4-note square sweep. */
export const FEVER_NOTES: readonly BlipNote[] = [
  { freq: 392, at: 0, duration: 0.07, peak: 0.1 },
  { freq: 587.33, at: 0.05, duration: 0.07, peak: 0.1 },
  { freq: 783.99, at: 0.1, duration: 0.07, peak: 0.1 },
  { freq: 1174.66, at: 0.15, duration: 0.2, peak: 0.1 },
];

/** Exponential ramps cannot reach 0 — this is "silent" for our peaks. */
export const GAIN_FLOOR = 0.001;

/** The four blips game.ts triggers off engine events. */
export interface GameAudio {
  /** Square tick on every input (`attack` event). */
  attackTick(): void;
  /** Ascending triad on `monsterKilled`. */
  killArpeggio(): void;
  /** Four-note fanfare on `levelUp`. */
  levelUpFanfare(): void;
  /** Ascending sweep on `feverStart`. */
  feverStart(): void;
}

export interface GameAudioOptions {
  /**
   * AudioContext factory, called lazily on the first blip. Return undefined
   * (or throw) to signal "no audio here" — the blips become no-ops. Tests
   * inject a recording fake; production uses the real AudioContext.
   */
  createContext?(): AudioContextLike | undefined;
}

/** Default factory: the real AudioContext, or undefined where it is absent. */
function defaultCreateContext(): AudioContextLike | undefined {
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
export function createGameAudio(options: GameAudioOptions = {}): GameAudio {
  const createContext = options.createContext ?? defaultCreateContext;
  let context: AudioContextLike | undefined;
  let unavailable = false;

  const ensureContext = (): AudioContextLike | undefined => {
    if (unavailable) {
      return undefined;
    }
    if (context === undefined) {
      try {
        context = createContext();
      } catch {
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
    } catch {
      // A failed resume only means silence for this blip — never a crash.
    }
    return context;
  };

  const play = (notes: readonly BlipNote[]): void => {
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
        gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, t0 + note.duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(t0);
        oscillator.stop(t0 + note.duration);
      }
    } catch {
      // Guard (SPEC F24): a WebAudio failure must never break the game loop.
    }
  };

  return {
    attackTick: (): void => {
      play(ATTACK_TICK_NOTES);
    },
    killArpeggio: (): void => {
      play(KILL_ARPEGGIO_NOTES);
    },
    levelUpFanfare: (): void => {
      play(LEVEL_UP_FANFARE_NOTES);
    },
    feverStart: (): void => {
      play(FEVER_NOTES);
    },
  };
}
