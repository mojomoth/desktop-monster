// T18 — WebAudio blips (SPEC F24, Assumption 13). audio.ts is DOM-free by
// injection: the AudioContext factory is a parameter, so a recording fake
// pins the synthesis (square waves, gain envelopes, note schedules), the
// lazy-creation contract, and the never-throw guards — all under node.
// The game.ts wiring (which engine event fires which blip) is covered with
// a counting GameAudio fake against seeded engines.

import { describe, expect, it } from 'vitest';
import { createEngine, mulberry32 } from '../src/core/index.js';
import type { SaveFileV1 } from '../src/core/index.js';
import {
  ATTACK_TICK_NOTES,
  createGameAudio,
  GAIN_FLOOR,
  KILL_ARPEGGIO_NOTES,
  LEVEL_UP_FANFARE_NOTES,
} from '../src/renderer/audio.js';
import type {
  AudioContextLike,
  AudioParamLike,
  BlipNote,
  GainNodeLike,
  GameAudio,
  OscillatorNodeLike,
} from '../src/renderer/audio.js';
import { createGame } from '../src/renderer/game.js';

// --- recording WebAudio fake ------------------------------------------------

interface ParamEvent {
  method: 'set' | 'ramp';
  value: number;
  time: number;
}

class FakeParam implements AudioParamLike {
  events: ParamEvent[] = [];

  setValueAtTime(value: number, startTime: number): unknown {
    this.events.push({ method: 'set', value, time: startTime });
    return this;
  }

  exponentialRampToValueAtTime(value: number, endTime: number): unknown {
    this.events.push({ method: 'ramp', value, time: endTime });
    return this;
  }
}

class FakeOscillator implements OscillatorNodeLike {
  type = 'sine';
  frequency = new FakeParam();
  connectedTo: unknown = undefined;
  startedAt: number | undefined = undefined;
  stoppedAt: number | undefined = undefined;

  connect(destination: unknown): unknown {
    this.connectedTo = destination;
    return destination;
  }

  start(when: number): void {
    this.startedAt = when;
  }

  stop(when: number): void {
    this.stoppedAt = when;
  }
}

class FakeGain implements GainNodeLike {
  gain = new FakeParam();
  connectedTo: unknown = undefined;

  connect(destination: unknown): unknown {
    this.connectedTo = destination;
    return destination;
  }
}

class FakeContext implements AudioContextLike {
  currentTime = 0;
  destination: unknown = { the: 'speakers' };
  state = 'running';
  resumeCalls = 0;
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }

  createOscillator(): OscillatorNodeLike {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain(): GainNodeLike {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

const makeAudio = (): { audio: GameAudio; ctx: FakeContext; factoryCalls: () => number } => {
  const ctx = new FakeContext();
  let calls = 0;
  const audio = createGameAudio({
    createContext: () => {
      calls += 1;
      return ctx;
    },
  });
  return { audio, ctx, factoryCalls: () => calls };
};

// --- synthesis --------------------------------------------------------------

describe('createGameAudio (SPEC F24)', () => {
  it('creates the AudioContext lazily on the first blip and reuses it after', () => {
    const { audio, factoryCalls } = makeAudio();
    expect(factoryCalls()).toBe(0); // nothing at construction time
    audio.attackTick();
    expect(factoryCalls()).toBe(1);
    audio.killArpeggio();
    audio.levelUpFanfare();
    expect(factoryCalls()).toBe(1); // one context for the app's lifetime
  });

  it('attackTick plays one short square-wave note with a decay envelope', () => {
    const { audio, ctx } = makeAudio();
    ctx.currentTime = 2.5; // nonzero: schedules must be relative to "now"
    audio.attackTick();

    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.gains).toHaveLength(1);
    const osc = ctx.oscillators[0];
    const gain = ctx.gains[0];
    const note = ATTACK_TICK_NOTES[0];
    if (osc === undefined || gain === undefined || note === undefined) {
      throw new Error('missing fake nodes');
    }

    expect(osc.type).toBe('square');
    expect(osc.frequency.events).toEqual([{ method: 'set', value: note.freq, time: 2.5 }]);
    // Percussive envelope: peak at start, exponential decay to the floor.
    expect(gain.gain.events).toEqual([
      { method: 'set', value: note.peak, time: 2.5 },
      { method: 'ramp', value: GAIN_FLOOR, time: 2.5 + note.duration },
    ]);
    // Chain: oscillator → gain → destination; start/stop bracket the note.
    expect(osc.connectedTo).toBe(gain);
    expect(gain.connectedTo).toBe(ctx.destination);
    expect(osc.startedAt).toBe(2.5);
    expect(osc.stoppedAt).toBe(2.5 + note.duration);
  });

  const scheduledNotes = (ctx: FakeContext): { freq: number; at: number }[] =>
    ctx.oscillators.map((osc) => ({
      freq: osc.frequency.events[0]?.value ?? Number.NaN,
      at: osc.startedAt ?? Number.NaN,
    }));

  const expectAscendingSquares = (ctx: FakeContext, notes: readonly BlipNote[]): void => {
    expect(ctx.oscillators).toHaveLength(notes.length);
    const played = scheduledNotes(ctx);
    expect(played).toEqual(notes.map((n) => ({ freq: n.freq, at: n.at })));
    for (const osc of ctx.oscillators) {
      expect(osc.type).toBe('square');
    }
    for (let i = 1; i < played.length; i++) {
      const prev = played[i - 1];
      const cur = played[i];
      if (prev === undefined || cur === undefined) {
        throw new Error('missing note');
      }
      expect(cur.freq).toBeGreaterThan(prev.freq); // ascending melody
      expect(cur.at).toBeGreaterThan(prev.at); // staggered, not a chord
    }
  };

  it('killArpeggio schedules 3 ascending staggered square notes', () => {
    const { audio, ctx } = makeAudio();
    audio.killArpeggio();
    expectAscendingSquares(ctx, KILL_ARPEGGIO_NOTES);
  });

  it('levelUpFanfare schedules 4 ascending staggered square notes', () => {
    const { audio, ctx } = makeAudio();
    audio.levelUpFanfare();
    expectAscendingSquares(ctx, LEVEL_UP_FANFARE_NOTES);
  });

  it('resumes a suspended context on input (autoplay policy)', () => {
    const { audio, ctx } = makeAudio();
    ctx.state = 'suspended';
    audio.attackTick();
    expect(ctx.resumeCalls).toBe(1);
    audio.attackTick();
    expect(ctx.resumeCalls).toBe(1); // running again — no further resumes
  });

  it('a factory returning undefined makes every blip a silent no-op, latched', () => {
    let calls = 0;
    const audio = createGameAudio({
      createContext: () => {
        calls += 1;
        return undefined;
      },
    });
    expect(() => {
      audio.attackTick();
      audio.killArpeggio();
      audio.levelUpFanfare();
    }).not.toThrow();
    expect(calls).toBe(1); // latched off — not retried per keypress
  });

  it('a throwing factory is swallowed and latched', () => {
    let calls = 0;
    const audio = createGameAudio({
      createContext: () => {
        calls += 1;
        throw new Error('no audio hardware');
      },
    });
    expect(() => {
      audio.attackTick();
    }).not.toThrow();
    expect(() => {
      audio.attackTick();
    }).not.toThrow();
    expect(calls).toBe(1);
  });

  it('scheduling failures never propagate into the game loop', () => {
    const broken: AudioContextLike = {
      currentTime: 0,
      destination: {},
      state: 'suspended',
      resume: () => {
        throw new Error('resume denied');
      },
      createOscillator: () => {
        throw new Error('oscillator exploded');
      },
      createGain: () => {
        throw new Error('gain exploded');
      },
    };
    const audio = createGameAudio({ createContext: () => broken });
    expect(() => {
      audio.attackTick();
      audio.killArpeggio();
      audio.levelUpFanfare();
    }).not.toThrow();
  });

  it('the default context factory is a safe no-op under node', () => {
    // vitest runs in node: no AudioContext global exists here, which is the
    // exact environment every existing createGame(engine) test relies on.
    const audio = createGameAudio();
    expect(() => {
      audio.attackTick();
      audio.killArpeggio();
      audio.levelUpFanfare();
    }).not.toThrow();
  });
});

// --- game.ts wiring ---------------------------------------------------------

describe('game audio triggers (game.ts, SPEC F24)', () => {
  const killSave: SaveFileV1 = {
    version: 1,
    level: 1,
    xp: 0,
    killCount: 0,
    coins: 0,
    items: {},
    monsterIndex: 0,
    monsterHp: 1,
  };

  const makeSpy = (): { audio: GameAudio; counts: Record<'tick' | 'arpeggio' | 'fanfare', number> } => {
    const counts = { tick: 0, arpeggio: 0, fanfare: 0 };
    return {
      audio: {
        attackTick: () => {
          counts.tick += 1;
        },
        killArpeggio: () => {
          counts.arpeggio += 1;
        },
        levelUpFanfare: () => {
          counts.fanfare += 1;
        },
      },
      counts,
    };
  };

  it('a non-killing attack plays only the attack tick', () => {
    const { audio, counts } = makeSpy();
    // Monster 0 has 10 HP; level-1 damage is 1 (2 on crit) — never a kill.
    const game = createGame(createEngine(null, mulberry32(42)), audio);
    game.attack('keyboard');
    expect(counts).toEqual({ tick: 1, arpeggio: 0, fanfare: 0 });
  });

  it('a killing blow plays the tick and the kill arpeggio', () => {
    const { audio, counts } = makeSpy();
    const game = createGame(createEngine(killSave, mulberry32(7)), audio);
    const events = game.attack('keyboard');
    expect(events.some((e) => e.type === 'monsterKilled')).toBe(true);
    expect(counts).toEqual({ tick: 1, arpeggio: 1, fanfare: 0 });
  });

  it('a level-up kill also plays the fanfare', () => {
    const { audio, counts } = makeSpy();
    // xp 15 + xpReward(0) = 20 = xpToNext(1) → the kill levels the hero up.
    const game = createGame(createEngine({ ...killSave, xp: 15 }, mulberry32(7)), audio);
    const events = game.attack('keyboard');
    expect(events.some((e) => e.type === 'levelUp')).toBe(true);
    expect(counts).toEqual({ tick: 1, arpeggio: 1, fanfare: 1 });
  });

  it('every input ticks: spamming N attacks plays N ticks', () => {
    const { audio, counts } = makeSpy();
    const game = createGame(createEngine(null, mulberry32(42)), audio);
    for (let i = 0; i < 5; i++) {
      game.attack(i % 2 === 0 ? 'keyboard' : 'mouse');
    }
    expect(counts.tick).toBe(5);
  });
});
