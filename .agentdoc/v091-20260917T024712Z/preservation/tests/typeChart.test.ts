import { describe, expect, it } from 'vitest';
import {
  beats,
  effectiveness,
  effectivePower,
  SUPER,
  TYPE_ORDER,
  WEAK_DIV,
} from '../src/core/index.js';
import type { Effectiveness, MonsterType } from '../src/core/index.js';

describe('type chart (SPEC F59, GAME_DESIGN_V3 §2)', () => {
  it('every type beats the next two in the cycle and loses to the previous two', () => {
    expect([...TYPE_ORDER]).toEqual(['fire', 'wind', 'earth', 'water', 'dark']);
    TYPE_ORDER.forEach((a, i) => {
      for (let step = 0; step < TYPE_ORDER.length; step++) {
        const d = TYPE_ORDER[(i + step) % TYPE_ORDER.length] as MonsterType;
        // step 1/2 = the two ahead (super); step 3/4 = the two behind (weak).
        expect([a, d, beats(a, d)]).toEqual([a, d, step === 1 || step === 2]);
        expect([a, d, beats(d, a)]).toEqual([a, d, step === 3 || step === 4]);
      }
      expect(beats(a, a)).toBe(false);
      expect(effectiveness(a, a)).toBe('normal');
    });
  });

  it('all 25 chart cells are pinned: 10 super, 10 weak, 5 normal', () => {
    const CHART: Record<MonsterType, Record<MonsterType, Effectiveness>> = {
      fire: { fire: 'normal', wind: 'super', earth: 'super', water: 'weak', dark: 'weak' },
      wind: { fire: 'weak', wind: 'normal', earth: 'super', water: 'super', dark: 'weak' },
      earth: { fire: 'weak', wind: 'weak', earth: 'normal', water: 'super', dark: 'super' },
      water: { fire: 'super', wind: 'weak', earth: 'weak', water: 'normal', dark: 'super' },
      dark: { fire: 'super', wind: 'super', earth: 'weak', water: 'weak', dark: 'normal' },
    };
    const tally: Record<Effectiveness, number> = { super: 0, weak: 0, normal: 0 };
    for (const a of TYPE_ORDER) {
      for (const d of TYPE_ORDER) {
        const e = effectiveness(a, d);
        expect([a, d, e]).toEqual([a, d, CHART[a][d]]);
        tally[e]++;
      }
    }
    expect(tally).toEqual({ super: 10, weak: 10, normal: 5 });
  });

  it('effectiveness is antisymmetric: super one way is always weak the other', () => {
    for (const a of TYPE_ORDER) {
      for (const d of TYPE_ORDER) {
        const back: Effectiveness =
          effectiveness(a, d) === 'super' ? 'weak' : effectiveness(a, d) === 'weak' ? 'super' : 'normal';
        expect([a, d, effectiveness(d, a)]).toEqual([a, d, back]);
      }
    }
  });

  it('effectivePower doubles on super, halves on weak with a floor of 1', () => {
    expect(SUPER).toBe(2n);
    expect(WEAK_DIV).toBe(2n);
    expect(effectivePower(7n, 'fire', 'wind')).toBe(14n); // super
    expect(effectivePower(7n, 'fire', 'fire')).toBe(7n); // normal
    expect(effectivePower(7n, 'fire', 'water')).toBe(3n); // weak, floored division
    expect(effectivePower(2n, 'fire', 'water')).toBe(1n);
    expect(effectivePower(1n, 'fire', 'water')).toBe(1n); // the floor, not 0
    expect(effectivePower(0n, 'fire', 'water')).toBe(1n);
    // Exact for A–Z sized powers (bigint, SPEC F30).
    expect(effectivePower(10n ** 40n, 'dark', 'fire')).toBe(2n * 10n ** 40n);
    expect(effectivePower(10n ** 40n, 'dark', 'water')).toBe(5n * 10n ** 39n);
  });
});
