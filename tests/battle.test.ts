// T58 — simulateBattle (SPEC F62, GAME_DESIGN_V3 §5). No rng anywhere: every
// expectation below is an exact blow-by-blow count, not a distribution.

import { describe, expect, it } from 'vitest';
import { BATTLE_HP_MULT, BATTLE_MAX_BLOWS, simulateBattle } from '../src/core/index.js';
import type { Companion } from '../src/core/index.js';

/** bossIndex 7 → base power 1, so companionPower is just the level. */
const comp = (id: string, patch: Partial<Companion> = {}): Companion => ({
  id,
  speciesId: 'slime',
  bossIndex: 7,
  level: 1,
  stars: 0,
  ...patch,
});

const sides = (blows: readonly { side: string }[]): string => blows.map((b) => b.side).join('');

describe('simulateBattle (SPEC F62)', () => {
  it('blows alternate from the front members and ko advances to the next', () => {
    // Same species, same power: 1 damage a blow against hp 1 * BATTLE_HP_MULT.
    // Equal sizes keep party order, so the front member is the last listed.
    const { attackerWon, blows } = simulateBattle([comp('a1')], [comp('d2'), comp('d1')]);

    expect(BATTLE_HP_MULT).toBe(5n);
    expect(sides(blows)).toBe('ADADADADAD');
    expect(blows[0]).toEqual({
      side: 'A',
      actorId: 'a1',
      targetId: 'd1',
      damage: 1n,
      ko: false,
    });
    // The attacker's 5th blow drops the defender's front member…
    expect(blows[8]).toEqual({ side: 'A', actorId: 'a1', targetId: 'd1', damage: 1n, ko: true });
    // …and d2 steps up to finish the lone attacker off with its 5th hit.
    expect(blows[9]).toEqual({ side: 'D', actorId: 'd2', targetId: 'a1', damage: 1n, ko: true });
    expect(attackerWon).toBe(false);
  });

  it('type advantage decides an otherwise equal battle', () => {
    // dragon = fire, golem = earth: fire is super effective against earth, so
    // the dragon hits for 2 and takes 1 back — same power, opposite verdicts.
    const dragon = comp('a1', { speciesId: 'dragon' });
    const golem = comp('d1', { speciesId: 'golem' });

    const won = simulateBattle([dragon], [golem]);
    expect(won.attackerWon).toBe(true);
    expect(won.blows.map((b) => b.damage)).toEqual([2n, 1n, 2n, 1n, 2n]);
    expect(won.blows[4]?.ko).toBe(true);

    const lost = simulateBattle([golem], [dragon]);
    expect(lost.attackerWon).toBe(false);
    expect(lost.blows).toHaveLength(6);
    expect(lost.blows[5]).toEqual({
      side: 'D',
      actorId: 'a1',
      targetId: 'd1',
      damage: 2n,
      ko: true,
    });
  });

  it('an empty defender party is an instant win with no blows', () => {
    expect(simulateBattle([comp('a1')], [])).toEqual({ attackerWon: true, blows: [] });
    // The mirror image: nobody to swing means the attacker cannot win.
    expect(simulateBattle([], [comp('d1')])).toEqual({ attackerWon: false, blows: [] });
    expect(simulateBattle([], [])).toEqual({ attackerWon: false, blows: [] });
  });

  it('the battle stops at BATTLE_MAX_BLOWS with a defender win', () => {
    // 30 evenly matched pairs need ~10 blows each to trade a knockout.
    const wall = (prefix: string): Companion[] =>
      Array.from({ length: 30 }, (_, i) => comp(`${prefix}${i + 1}`));
    const { attackerWon, blows } = simulateBattle(wall('a'), wall('d'));
    const kos = (side: string): number => blows.filter((b) => b.ko && b.side === side).length;

    expect(BATTLE_MAX_BLOWS).toBe(200);
    expect(blows).toHaveLength(BATTLE_MAX_BLOWS);
    // Nobody was wiped out — the cap alone hands the win to the defender.
    expect([kos('A'), kos('D')]).toEqual([20, 20]);
    expect(attackerWon).toBe(false);
  });
});
