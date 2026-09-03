import { describe, expect, it } from 'vitest';
import {
  activeCompanions,
  applyCollection,
  autoParty,
  COMPANION_MAX_LEVEL,
  companionPower,
  createEngine,
  DEFAULT_SAVE,
  monsterForIndex,
  monsterMaxHp,
  mulberry32,
  PARTY_SIZE,
  partyOrder,
  pvpParty,
  REBIRTH_MIN_INDEX,
  resolvePvp,
  ROSTER_CAP,
  simulateBattle,
  STEAL_CHANCE,
  TYPE_ORDER,
} from '../src/core/index.js';
import type {
  CollectionAction,
  Companion,
  GameState,
  Rng,
  SaveFileV2,
} from '../src/core/index.js';

/** A companion with the fields the test cares about; the rest are defaults. */
const comp = (id: string, patch: Partial<Companion> = {}): Companion => ({
  id,
  speciesId: 'slime',
  bossIndex: 7,
  level: 1,
  stars: 0,
  ...patch,
});

/** Build state through the engine so new GameState fields need no edit here. */
function stateWith(save: Partial<SaveFileV2>): GameState {
  return { ...createEngine({ ...DEFAULT_SAVE, ...save }).getState() };
}

const ids = (cs: readonly Companion[]): string[] => cs.map((c) => c.id);

/**
 * Seven companions of five types at bossIndex 7 (base power 1), so
 * companionPower is just the level: 6/4/4/5/10/1/3.
 * slime=water, bat=wind, ghost=dark, golem=earth, dragon=fire.
 */
const TYPED_ROSTER: readonly Companion[] = [
  comp('c1', { speciesId: 'dragon', level: 6 }),
  comp('c2', { speciesId: 'bat', level: 4 }),
  comp('c3', { speciesId: 'golem', level: 4 }),
  comp('c4', { speciesId: 'slime', level: 5 }),
  comp('c5', { speciesId: 'ghost', level: 10 }),
  comp('c6', { speciesId: 'golem', level: 1 }),
  comp('c7', { speciesId: 'slime', level: 3 }),
];

/** Unwrap a success; fails loudly when the action returned { error }. */
function ok(result: ReturnType<typeof applyCollection>) {
  if ('error' in result) throw new Error(`unexpected error: ${result.error}`);
  return result;
}

describe('companion power and party selection (SPEC F32/F61, Assumptions 24/44)', () => {
  it('companionPower is floor(monsterMaxHp(bossIndex)/20), at least 1, times level times 2^stars', () => {
    expect(companionPower(comp('c1', { bossIndex: 0 }))).toBe(1n);
    expect(companionPower(comp('c1', { bossIndex: 20 }))).toBe(8n);
    expect(companionPower(comp('c1', { bossIndex: 40 }))).toBe(133n);
    expect(companionPower(comp('c1', { bossIndex: 40, level: 3, stars: 2 }))).toBe(133n * 3n * 4n);

    for (const bossIndex of [0, 1, 7, 15, 40, 60]) {
      for (const level of [1, 10]) {
        for (const stars of [0, 3]) {
          const base = monsterMaxHp(bossIndex) / 20n;
          expect(companionPower(comp('c1', { bossIndex, level, stars }))).toBe(
            (base < 1n ? 1n : base) * BigInt(level) * 2n ** BigInt(stars),
          );
        }
      }
    }
  });

  it('activeCompanions picks the 5 highest effective powers against the enemy type', () => {
    // vs water: c2/c3 double to 8, c4 stays 5, c5 halves to 5, c1 halves to 3.
    expect(ids(activeCompanions(TYPED_ROSTER, 'water'))).toEqual(['c2', 'c3', 'c5', 'c4', 'c1']);
    expect(activeCompanions(TYPED_ROSTER, 'water')).toHaveLength(PARTY_SIZE);
    // Ties walk down the ladder: c2 before c3 on the id, c5 before c4 on raw power.
    expect(ids(activeCompanions(TYPED_ROSTER))).toEqual(['c5', 'c1', 'c4', 'c2', 'c3']);
    // Input order untouched; a short roster returns everything it has.
    expect(ids(TYPED_ROSTER)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
    expect(activeCompanions([]).length).toBe(0);
    expect(ids(activeCompanions(TYPED_ROSTER.slice(0, 2), 'water'))).toEqual(['c2', 'c1']);
  });

  it('the party changes when the enemy type changes', () => {
    expect(ids(activeCompanions(TYPED_ROSTER, 'fire'))).toEqual(['c5', 'c4', 'c1', 'c7', 'c2']);
    expect(ids(activeCompanions(TYPED_ROSTER, 'wind'))).toEqual(['c5', 'c1', 'c2', 'c4', 'c3']);
    expect(ids(activeCompanions(TYPED_ROSTER, 'earth'))).toEqual(['c1', 'c2', 'c5', 'c3', 'c4']);
    expect(ids(activeCompanions(TYPED_ROSTER, 'dark'))).toEqual(['c5', 'c4', 'c3', 'c7', 'c1']);
    // All five enemy types field a different line-up out of the same roster.
    const lineups = TYPE_ORDER.map((t) => ids(activeCompanions(TYPED_ROSTER, t)).join());
    expect(new Set(lineups).size).toBe(TYPE_ORDER.length);
  });

  it('pvpParty resolves ids in order and falls back to autoParty when empty', () => {
    expect(ids(autoParty(TYPED_ROSTER))).toEqual(['c5', 'c1', 'c4', 'c2', 'c3']);
    // The given order wins; unknown and duplicate ids are dropped.
    expect(ids(pvpParty(TYPED_ROSTER, ['c6', 'zz', 'c1', 'c6']))).toEqual(['c6', 'c1']);
    expect(ids(pvpParty(TYPED_ROSTER, ids(TYPED_ROSTER)))).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    // Nothing usable → the auto party; an empty roster stays empty.
    expect(ids(pvpParty(TYPED_ROSTER, []))).toEqual(ids(autoParty(TYPED_ROSTER)));
    expect(ids(pvpParty(TYPED_ROSTER, ['nope']))).toEqual(ids(autoParty(TYPED_ROSTER)));
    expect(pvpParty([], ['c1'])).toEqual([]);
    expect(ids(TYPED_ROSTER)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
  });

  it('partyOrder sorts by size descending keeping party order on ties', () => {
    // sizes: dragon/golem 3, ghost 2, slime/bat 1 — biggest stands at the back.
    const party = pvpParty(TYPED_ROSTER, ['c2', 'c1', 'c5', 'c4', 'c3']);
    expect(ids(partyOrder(party))).toEqual(['c1', 'c3', 'c5', 'c2', 'c4']);
    expect(ids(party)).toEqual(['c2', 'c1', 'c5', 'c4', 'c3']);
    expect(partyOrder([])).toEqual([]);
  });
});

describe('applyCollection lifecycle (SPEC F32, Assumption 26)', () => {
  it('consume adds 1 plus food stars levels, caps at 10 and removes the food', () => {
    const base = stateWith({
      companions: [comp('c1', { level: 3 }), comp('c2', { stars: 2 })],
      nextCompanionId: 3,
    });
    const { state, events } = ok(applyCollection(base, { type: 'consume', targetId: 'c1', foodId: 'c2' }));
    expect(state.companions.map((c) => c.id)).toEqual(['c1']);
    expect(state.companions[0]?.level).toBe(6);
    expect(events).toEqual([]);
    expect(base.companions.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(base.companions[0]?.level).toBe(3);

    const capped = stateWith({
      companions: [comp('c1', { level: 9 }), comp('c2', { stars: 4 })],
      nextCompanionId: 3,
    });
    expect(
      ok(applyCollection(capped, { type: 'consume', targetId: 'c1', foodId: 'c2' })).state.companions[0]?.level,
    ).toBe(COMPANION_MAX_LEVEL);

    expect(applyCollection(base, { type: 'consume', targetId: 'c1', foodId: 'c1' })).toHaveProperty('error');
    expect(applyCollection(base, { type: 'consume', targetId: 'c1', foodId: 'c9' })).toHaveProperty('error');
  });

  it('fuse needs same species and stars and yields stars+1 at level 1', () => {
    const base = stateWith({
      companions: [
        comp('c1', { speciesId: 'bat', bossIndex: 15, level: 5, stars: 1 }),
        comp('c2', { speciesId: 'bat', bossIndex: 23, level: 2, stars: 1 }),
        comp('c3', { speciesId: 'ghost', stars: 1 }),
        comp('c4', { speciesId: 'bat', stars: 0 }),
      ],
      nextCompanionId: 5,
    });
    const { state, events } = ok(applyCollection(base, { type: 'fuse', aId: 'c1', bId: 'c2' }));
    expect(state.companions.map((c) => c.id)).toEqual(['c1', 'c3', 'c4']);
    expect(state.companions[0]).toEqual({
      id: 'c1',
      speciesId: 'bat',
      bossIndex: 23,
      level: 1,
      stars: 2,
    });
    expect(events).toEqual([]);
    expect(base.companions).toHaveLength(4);

    expect(applyCollection(base, { type: 'fuse', aId: 'c1', bId: 'c3' })).toHaveProperty('error');
    expect(applyCollection(base, { type: 'fuse', aId: 'c1', bId: 'c4' })).toHaveProperty('error');
    expect(applyCollection(base, { type: 'fuse', aId: 'c1', bId: 'c1' })).toHaveProperty('error');
    expect(applyCollection(base, { type: 'fuse', aId: 'c1', bId: 'c9' })).toHaveProperty('error');
  });

  it('reincarnate needs max level and resets to level 1 with stars+1', () => {
    const base = stateWith({
      companions: [comp('c1', { level: COMPANION_MAX_LEVEL, stars: 2 }), comp('c2', { level: 9 })],
      nextCompanionId: 3,
    });
    const { state, events } = ok(applyCollection(base, { type: 'reincarnate', id: 'c1' }));
    expect(state.companions.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(state.companions[0]?.level).toBe(1);
    expect(state.companions[0]?.stars).toBe(3);
    expect(events).toEqual([]);
    expect(base.companions[0]?.level).toBe(COMPANION_MAX_LEVEL);

    expect(applyCollection(base, { type: 'reincarnate', id: 'c2' })).toHaveProperty('error');
    expect(applyCollection(base, { type: 'reincarnate', id: 'c9' })).toHaveProperty('error');
  });

  it('sacrifice removes the companion and adds 1 plus stars souls', () => {
    const base = stateWith({
      companions: [comp('c1', { stars: 3 }), comp('c2')],
      nextCompanionId: 3,
      souls: 4,
    });
    const { state, events } = ok(applyCollection(base, { type: 'sacrifice', id: 'c1' }));
    expect(state.companions.map((c) => c.id)).toEqual(['c2']);
    expect(state.souls).toBe(8);
    expect(state.nextCompanionId).toBe(3);
    expect(events).toEqual([]);
    expect(base.souls).toBe(4);

    expect(applyCollection(base, { type: 'sacrifice', id: 'c9' })).toHaveProperty('error');
  });

  it('rebirth needs monsterIndex 40 or more, adds floor(index/8) souls and resets the run', () => {
    const shallow = stateWith({ monsterIndex: REBIRTH_MIN_INDEX - 1 });
    expect(applyCollection(shallow, { type: 'rebirth' })).toHaveProperty('error');

    const base = stateWith({
      monsterIndex: 41,
      monsterHp: '2000',
      level: 7,
      xp: 33,
      killCount: 120,
      coins: 88,
      items: { gem: 2 },
      companions: [comp('c1'), comp('c2')],
      nextCompanionId: 3,
      souls: 1,
      rebirths: 2,
      bestIndex: 41,
    });
    const { state, events } = ok(applyCollection(base, { type: 'rebirth' }));
    expect(state.souls).toBe(1 + 5);
    expect(state.rebirths).toBe(3);
    expect(state.level).toBe(1);
    expect(state.xp).toBe(0);
    expect(state.monster).toEqual(monsterForIndex(0));
    expect(state.monsterHp).toBe(monsterForIndex(0).maxHp);
    // Kept across the prestige (Assumption 5).
    expect(state.companions.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(state.items).toEqual({ gem: 2 });
    expect(state.coins).toBe(88);
    expect(state.killCount).toBe(120);
    expect(state.bestIndex).toBe(41);
    expect(state.nextCompanionId).toBe(3);
    expect(events).toEqual([{ type: 'rebirth', souls: 6 }]);
    expect(base.level).toBe(7);
    expect(base.monster.index).toBe(41);
  });

  it('setPvpParty drops unknown ids and caps at 5', () => {
    const base = stateWith({ companions: TYPED_ROSTER.map((c) => ({ ...c })), nextCompanionId: 8 });
    const picked: CollectionAction = {
      type: 'setPvpParty',
      ids: ['c3', 'zz', 'c1', 'c3', 'c2', 'c4', 'c5', 'c6'],
    };
    const { state, events } = ok(applyCollection(base, picked));
    expect(state.pvpParty).toEqual(['c3', 'c1', 'c2', 'c4', 'c5']);
    expect(events).toEqual([]);
    expect(base.pvpParty).toEqual([]);
    expect(ids(state.companions)).toEqual(ids(base.companions));
    // An unknown-only or empty list clears the party — never an error.
    expect(ok(applyCollection(state, { type: 'setPvpParty', ids: ['nope'] })).state.pvpParty).toEqual([]);
    expect(ok(applyCollection(state, { type: 'setPvpParty', ids: [] })).state.pvpParty).toEqual([]);
  });

  it('addCompanion refuses a full roster of 30 and removeCompanions ignores unknown ids', () => {
    const base = stateWith({ companions: [comp('c1'), comp('c2')], nextCompanionId: 3 });
    const newcomer = comp('whatever', { speciesId: 'dragon', bossIndex: 23, level: 4, stars: 1 });
    const { state, events } = ok(applyCollection(base, { type: 'addCompanion', companion: newcomer }));
    expect(state.companions.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(state.companions[2]).toEqual({ ...newcomer, id: 'c3' });
    expect(state.nextCompanionId).toBe(4);
    expect(events).toEqual([]);

    const full = stateWith({
      companions: Array.from({ length: ROSTER_CAP }, (_, i) => comp(`c${i + 1}`)),
      nextCompanionId: ROSTER_CAP + 1,
    });
    expect(full.companions).toHaveLength(30);
    expect(applyCollection(full, { type: 'addCompanion', companion: newcomer })).toHaveProperty('error');

    const removed = ok(applyCollection(base, { type: 'removeCompanions', ids: ['c2', 'nope'] }));
    expect(removed.state.companions.map((c) => c.id)).toEqual(['c1']);
    expect(removed.events).toEqual([]);
    expect(ok(applyCollection(base, { type: 'removeCompanions', ids: [] })).state.companions).toHaveLength(2);
    expect(base.companions).toHaveLength(2);
  });

  it('pvpResult adds the stolen companion with a re-minted id and removes the lost one', () => {
    const base = stateWith({ companions: [comp('c1'), comp('c2')], nextCompanionId: 3 });
    const stolen = comp('s12345', { speciesId: 'golem', bossIndex: 31, level: 6, stars: 2 });
    const { state, events } = ok(
      applyCollection(base, { type: 'pvpResult', won: true, stolen, lostId: 'c1' }),
    );
    expect(state.companions.map((c) => c.id)).toEqual(['c2', 'c3']);
    expect(state.companions[1]).toEqual({ ...stolen, id: 'c3' });
    expect(state.nextCompanionId).toBe(4);
    expect(events).toEqual([
      { type: 'pvpResolved', won: true, stolen: { ...stolen, id: 'c3' }, lostId: 'c1' },
    ]);

    // A loss: nothing gained, the lost one goes; unknown lostId is ignored.
    const lost = ok(applyCollection(base, { type: 'pvpResult', won: false, stolen: null, lostId: 'c9' }));
    expect(lost.state.companions.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(lost.state.nextCompanionId).toBe(3);
    expect(lost.events).toEqual([
      { type: 'pvpResolved', won: false, stolen: null, lostId: 'c9' },
    ]);

    // A steal into a full roster is dropped silently, never an error.
    const full = stateWith({
      companions: Array.from({ length: ROSTER_CAP }, (_, i) => comp(`c${i + 1}`)),
      nextCompanionId: ROSTER_CAP + 1,
    });
    const overflow = ok(applyCollection(full, { type: 'pvpResult', won: true, stolen, lostId: null }));
    expect(overflow.state.companions).toHaveLength(ROSTER_CAP);
    expect(overflow.state.nextCompanionId).toBe(ROSTER_CAP + 1);
    expect(overflow.events).toEqual([
      { type: 'pvpResolved', won: true, stolen: null, lostId: null },
    ]);
    expect(base.companions).toHaveLength(2);
  });

  it('rejects an unknown action type and hands back fresh objects every time', () => {
    const base = stateWith({ companions: [comp('c1')], nextCompanionId: 2, items: { gem: 1 } });
    expect(applyCollection(base, { type: 'nope' } as unknown as CollectionAction)).toEqual({
      error: 'unknown action',
    });

    const { state } = ok(applyCollection(base, { type: 'removeCompanions', ids: [] }));
    expect(state).not.toBe(base);
    expect(state.items).not.toBe(base.items);
    expect(state.monster).not.toBe(base.monster);
    expect(state.companions).not.toBe(base.companions);
    expect(state.companions[0]).not.toBe(base.companions[0]);
    expect(state.companions[0]).toEqual(base.companions[0]);
  });
});

/** An Rng that hands out fixed values (then 0) — one draw per value. */
const seq = (...values: number[]): Rng => {
  let i = 0;
  return { next: () => values[i++] ?? 0 };
};

/** Wraps an Rng and counts how many values the code under test pulled. */
const counting = (inner: Rng): Rng & { draws: number } => ({
  draws: 0,
  next(): number {
    this.draws += 1;
    return inner.next();
  },
});

/** `n` level-1 companions of bossIndex 7 → power 1 each. */
const roster = (n: number, prefix = 'a'): Companion[] =>
  Array.from({ length: n }, (_, i) => comp(`${prefix}${i + 1}`));

describe('resolvePvp (SPEC F37/F62, Assumption 34)', () => {
  /** The blow list resolvePvp must hand back untouched. */
  const replay = (a: readonly Companion[], d: readonly Companion[]): unknown =>
    simulateBattle(a, d).blows;

  it('resolvePvp wins by the deterministic battle and moves one random defender to the attacker on the steal roll', () => {
    const attacker = roster(3, 'a');
    const defender = roster(3, 'd');

    // Evenly matched, but the attacker swings first — so it always wins.
    const stolen = resolvePvp(attacker, defender, seq(0.1499, 0.5));
    expect(stolen.attackerWon).toBe(true);
    expect(stolen.moved).toBe(defender[1]); // floor(0.5 * 3)
    expect(stolen.blows).toEqual(replay(attacker, defender));

    // Same battle, same victim draw: only the steal roll changed the loot.
    const empty = resolvePvp(attacker, defender, seq(0.15, 0.5));
    expect(empty.attackerWon).toBe(true);
    expect(empty.moved).toBeNull();
    expect(empty.blows).toEqual(stolen.blows);
  });

  it('resolvePvp steals only on a win with the 15 percent roll and draws exactly 2 rng values', () => {
    expect(STEAL_CHANCE).toBe(0.15);
    const attacker = roster(1, 'a');
    const outcome = (
      a: readonly Companion[],
      d: readonly Companion[],
      roll: number,
    ): { moved: Companion | null; won: boolean; draws: number } => {
      const rng = counting(seq(roll, 0.99));
      const r = resolvePvp(a, d, rng);
      return { moved: r.moved, won: r.attackerWon, draws: rng.draws };
    };

    // A win: the roll alone decides, and 0.15 itself is outside the window.
    expect(outcome(attacker, roster(1, 'd'), 0.1499)).toEqual({
      won: true,
      moved: roster(1, 'd')[0],
      draws: 2,
    });
    expect(outcome(attacker, roster(1, 'd'), 0.15)).toEqual({ won: true, moved: null, draws: 2 });
    // A loss: the luckiest roll in the world still steals nothing.
    expect(outcome(attacker, roster(3, 'd'), 0)).toEqual({ won: false, moved: null, draws: 2 });
  });

  it('a losing attacker never loses a companion', () => {
    const attacker = roster(1, 'a');
    const defender = roster(3, 'd');
    const lost = resolvePvp(attacker, defender, seq(0, 0));

    expect(lost.attackerWon).toBe(false);
    expect(lost.moved).toBeNull();
    // The defender is passive: nothing of the attacker's is even considered.
    expect(ids(attacker)).toEqual(['a1']);
    expect(lost.blows.some((b) => b.side === 'D' && b.ko)).toBe(true);
  });

  it('resolvePvp with an empty loser roster steals nothing', () => {
    // An empty defender is an instant win — with nobody left to take.
    const won = resolvePvp(roster(1, 'a'), [], seq(0.01, 0.99));
    expect(won).toEqual({ attackerWon: true, moved: null, blows: [] });

    // An empty attacker cannot swing, so it loses and keeps nothing.
    const lost = resolvePvp([], roster(1, 'd'), seq(0.01, 0.99));
    expect(lost).toEqual({ attackerWon: false, moved: null, blows: [] });

    expect(resolvePvp([], [], seq(0.01, 0.99)).moved).toBeNull();
  });

  it('resolvePvp never moves into a full roster of 30', () => {
    const full = roster(ROSTER_CAP, 'a');
    const defender = roster(1, 'd');
    expect(resolvePvp(full, defender, seq(0.01, 0))).toEqual({
      attackerWon: true,
      moved: null,
      blows: simulateBattle(full, defender).blows,
    });

    // One slot free → the same draws steal the defender's companion.
    expect(resolvePvp(full.slice(1), defender, seq(0.01, 0)).moved).toBe(defender[0]);

    // The server passes the real roster size, which the party does not know.
    const party = roster(1, 'a');
    expect(resolvePvp(party, defender, seq(0.01, 0), ROSTER_CAP).moved).toBeNull();
    expect(resolvePvp(party, defender, seq(0.01, 0), ROSTER_CAP - 1).moved).toBe(defender[0]);
  });

  it('resolvePvp is reproducible from its seed and draws exactly 2 rng values', () => {
    const attacker = roster(2, 'a');
    const defender = roster(4, 'd');
    const run = (): { attackerWon: boolean; moved: Companion | null; draws: number } => {
      const rng = counting(mulberry32(7));
      const { attackerWon, moved } = resolvePvp(attacker, defender, rng);
      return { attackerWon, moved, draws: rng.draws };
    };

    expect(run()).toEqual(run());
    expect(run().draws).toBe(2);

    // The victim draw is consumed even when there is nobody to steal.
    const empty = counting(mulberry32(7));
    resolvePvp(attacker, [], empty);
    expect(empty.draws).toBe(2);
  });

  it('resolvePvp steal rate over 10000 seeded wins is within 13 to 17 percent', () => {
    const attacker = roster(3, 'a');
    const defender = roster(1, 'd');
    const rng = mulberry32(1234);
    let steals = 0;

    for (let i = 0; i < 10000; i += 1) {
      const r = resolvePvp(attacker, defender, rng);
      expect(r.attackerWon).toBe(true);
      if (r.moved) steals += 1;
    }

    // p = STEAL_CHANCE = 0.15; 10000 trials stay well inside +/- 2 points.
    expect(steals / 10000).toBeGreaterThan(0.13);
    expect(steals / 10000).toBeLessThan(0.17);
  });
});
