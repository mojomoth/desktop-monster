// Elemental type chart — pure, dependency-free (SPEC F59, GAME_DESIGN_V3 §2).
// Rock-paper-scissors-lizard-Spock over one 5-cycle: a type beats the next two
// entries of TYPE_ORDER and loses to the previous two, so the whole 5x5 chart
// is derived from the cycle — no lookup table.

export type MonsterType = 'fire' | 'wind' | 'earth' | 'water' | 'dark';

/** The chart cycle. Never reorder — every relation below is derived from it. */
export const TYPE_ORDER: readonly MonsterType[] = ['fire', 'wind', 'earth', 'water', 'dark'];

export type Effectiveness = 'super' | 'weak' | 'normal';

/** Super-effective multiplier. */
export const SUPER = 2n;

/** Not-very-effective divisor (floored, never below 1). */
export const WEAK_DIV = 2n;

const idx = (t: MonsterType): number => TYPE_ORDER.indexOf(t);

/** True when `a` is super effective against `d` (d is 1 or 2 steps ahead). */
export function beats(a: MonsterType, d: MonsterType): boolean {
  const step = (idx(d) - idx(a) + 5) % 5;
  return step === 1 || step === 2;
}

/** Same type → normal; otherwise exactly one direction of the pair is super. */
export function effectiveness(a: MonsterType, d: MonsterType): Effectiveness {
  if (beats(a, d)) return 'super';
  if (beats(d, a)) return 'weak';
  return 'normal';
}

/** Type-adjusted power: doubled on super, halved on weak with a floor of 1. */
export function effectivePower(power: bigint, a: MonsterType, d: MonsterType): bigint {
  switch (effectiveness(a, d)) {
    case 'super':
      return power * SUPER;
    case 'weak': {
      const halved = power / WEAK_DIV;
      return halved > 1n ? halved : 1n;
    }
    default:
      return power;
  }
}
