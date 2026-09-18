import { describe, expect, it } from 'vitest';
import * as core from '../../../src/core/index.js';
import { distribution, simulate, summarize } from './measure.mjs';

describe('real-engine pacing measurement', () => {
  it('reproduces identical seeds, conserves gold and distinguishes a fresh idle stall', () => {
    const active = simulate(core, 'active', 7, 'free', [1, 3]);
    expect(simulate(core, 'active', 7, 'free', [1, 3])).toEqual(active);
    expect(active[1].kills).toBeGreaterThan(active[0].kills);
    expect(active[1].firstCaptureSec).toBeGreaterThan(0);
    expect(active[1].firstOfferSec).toBeLessThanOrEqual(180);
    for (const row of active) expect(row.income - row.spent).toBe(row.coins);
    const paid = simulate(core, 'active', 7, 'training', [3])[0];
    expect(paid.spent).toBeGreaterThan(0);
    expect(paid.income - paid.spent).toBe(paid.coins);
    expect(paid.minimumBalance).toBe(0);
    expect(paid.unaffordableSeconds).toBeGreaterThan(0);
    expect(paid.unaffordableSeconds).toBeLessThanOrEqual(180);
    expect(summarize([paid])[0].metrics.unaffordableSeconds.p50).toBe(paid.unaffordableSeconds);
    const idle = simulate(core, 'pure-idle', 7, 'free', [1, 3]);
    expect(idle[1]).toMatchObject({ kills: 0, firstRewardSec: null, firstLevelSec: null, firstCaptureSec: null,
      firstOfferSec: null, longestKillGapSec: 180, longestMeaningfulGapSec: 180, heroDamagePercent: null });
    expect(summarize(idle)[1].metrics.firstCaptureSec).toMatchObject({ reached: 0, unreached: 1, p90: null });
  });

  it('keeps unreached samples explicit and reports the long tail instead of coercing it to zero', () => {
    expect(distribution([null, 50, 10, 20, 30, 40, 1000])).toEqual({ reached: 6, unreached: 1,
      p10: 10, p50: 30, p90: 50, min: 10, max: 1000 });
    expect(() => distribution([Number.NaN])).toThrow('Non-finite');
    expect(() => simulate(core, 'invalid', 1)).toThrow('Unknown profile');
    expect(() => simulate(core, 'active', -1)).toThrow('uint32');
    expect(() => simulate(core, 'active', 1, 'free', [3, 1])).toThrow('Checkpoints');
  });
});
