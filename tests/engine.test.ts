import { describe, expect, it } from 'vitest';
import {
  COIN_ITEM,
  coinsForIndex,
  activeCompanions,
  attackDelayOf,
  SPECIES_IDS,
  typeOf,
  companionPower,
  createEngine,
  CRIT_MULT,
  damageForLevel,
  FEVER_INPUTS,
  FEVER_MS,
  monsterForIndex,
  monsterMaxHp,
  mulberry32,
  parseSave,
  serializeSave,
  upgradeSave,
  xpReward,
  xpToNext,
} from '../src/core/index.js';
import type {
  BattleReplay,
  Companion,
  GameEvent,
  Rng,
  SaveFileV1,
  SaveFileV2,
  SaveFileV3,
} from '../src/core/index.js';
import { CAPTURE_CHANCE, COMPANION_ATTACK_MS, PARTY_STAGGER_MS } from '../src/core/engine.js';

/** Rng stub returning a scripted sequence (repeats its last value). */
function scriptedRng(values: number[]): Rng {
  let i = 0;
  return {
    next: () => values[Math.min(i++, values.length - 1)] ?? 0,
  };
}

/** 0.5 fails both the 0.1 crit roll and the 0.25 trinket roll: fully boring. */
const calmRng = (): Rng => scriptedRng([0.5]);

function makeSave(overrides: Partial<SaveFileV1> = {}): SaveFileV1 {
  const monsterIndex = overrides.monsterIndex ?? 0;
  return {
    version: 1,
    level: 1,
    xp: 0,
    killCount: 0,
    coins: 0,
    items: {},
    monsterIndex,
    monsterHp: Number(monsterMaxHp(monsterIndex)),
    ...overrides,
  };
}

function makeSaveV2(overrides: Partial<SaveFileV2> = {}): SaveFileV2 {
  const monsterIndex = overrides.monsterIndex ?? 0;
  return {
    version: 2,
    level: 1,
    xp: 0,
    killCount: 0,
    coins: 0,
    items: {},
    monsterIndex,
    monsterHp: String(monsterForIndex(monsterIndex).maxHp),
    companions: [],
    nextCompanionId: 1,
    souls: 0,
    rebirths: 0,
    bestIndex: monsterIndex,
    ...overrides,
  };
}

/** Scripted Rng that also reports how many draws it handed out. */
function countingRng(values: number[]): { rng: Rng; draws: () => number } {
  let n = 0;
  return {
    rng: { next: () => values[Math.min(n++, values.length - 1)] ?? 0 },
    draws: () => n,
  };
}

const types = (events: GameEvent[]): string[] => events.map((e) => e.type);

describe('attack engine (SPEC F06/F07/F08, Assumption 8)', () => {
  it('starts fresh at level 1 with monster 0 at full hp', () => {
    const s = createEngine(null, calmRng()).getState();
    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
    expect(s.killCount).toBe(0);
    expect(s.coins).toBe(0);
    expect(s.items).toEqual({});
    expect(s.monster.index).toBe(0);
    expect(s.monster.speciesId).toBe('shroudlamp'); // the 0.5 species draw
    expect(s.monsterHp).toBe(10n);
  });

  it('non-killing attack emits attack then monsterHit', () => {
    const engine = createEngine(null, calmRng());
    const events = engine.attack('keyboard');
    expect(types(events)).toEqual(['attack', 'monsterHit']);
    expect(events[0]).toEqual({ type: 'attack', damage: 1n, crit: false, source: 'keyboard' });
    expect(events[1]).toEqual({ type: 'monsterHit', hpAfter: 9n, maxHp: 10n });
    expect(engine.getState().monsterHp).toBe(9n);
  });

  it('every species can spawn at the same normal or boss index with equal RNG intervals', () => {
    for (const index of [1, 7, 105]) {
      SPECIES_IDS.forEach((species, slot) => {
        // Draw just inside each edge; exact fractions can round into the previous interval.
        for (const offset of [0.000001, 0.999999]) {
          const engine = createEngine(
            makeSave({ monsterIndex: index - 1, monsterHp: 1 }),
            scriptedRng([0.5, 0.5, (slot + offset) / SPECIES_IDS.length]),
          );
          const events = engine.attack('keyboard');
          const monster = engine.getState().monster;
          expect(monster).toEqual(monsterForIndex(index, species));
          expect(monster.type).toBe(typeOf(species));
          expect(monster.boss).toBe(index === 7);
          expect(engine.getState().monsterHp).toBe(monster.maxHp);
          expect(events.at(-1)).toEqual({ type: 'monsterSpawned', monster });
        }
      });
    }
  });

  it('fresh games draw a species once and allow consecutive repeats', () => {
    for (const value of [0, 1 - Number.EPSILON]) {
      const counted = countingRng([value]);
      const engine = createEngine(null, counted.rng);
      expect(counted.draws()).toBe(1);
      const species = value === 0 ? 'slime' : 'cindercoil';
      expect(engine.getState().monster.speciesId).toBe(species);
      while (engine.getState().monster.index === 0) engine.attack('keyboard');
      expect(engine.getState().monster.speciesId).toBe(species);
    }
  });

  it('persists a random boss and captures its actual species after restoring', () => {
    const engine = createEngine(
      makeSave({ monsterIndex: 6, monsterHp: 1 }),
      scriptedRng([0.5, 0.5, 1 - Number.EPSILON]),
    );
    engine.attack('keyboard');
    const save = parseSave(serializeSave(engine.toSave()));
    expect(save.monsterSpeciesId).toBe('cindercoil');
    const counted = countingRng([0.5, 0.5, 0, 0.5]);
    const restored = createEngine(save, counted.rng);
    expect(counted.draws()).toBe(0); // loading must never reroll
    expect(restored.getState()).toEqual(engine.getState());
    const wounded = createEngine({ ...save, monsterHp: '1' }, counted.rng);
    expect(wounded.attack('keyboard')).toContainEqual({
      type: 'bossCaptured',
      companion: { id: 'c1', speciesId: 'cindercoil', bossIndex: 7, level: 1, stars: 0 },
    });
  });

  it('rebirth draws a new first species and saves it', () => {
    const counted = countingRng([1 - Number.EPSILON]);
    const engine = createEngine(makeSaveV2({ monsterIndex: 40 }), counted.rng);
    engine.apply({ type: 'rebirth' });
    expect(counted.draws()).toBe(1);
    expect(engine.getState().monster).toEqual(monsterForIndex(0, 'cindercoil'));
    expect(engine.toSave().monsterSpeciesId).toBe('cindercoil');
  });

  it('killing blow emits attack, monsterHit, monsterKilled, itemDropped, monsterSpawned in order', () => {
    const engine = createEngine(null, calmRng());
    for (let i = 0; i < 9; i++) {
      expect(types(engine.attack('keyboard'))).toEqual(['attack', 'monsterHit']);
    }
    const events = engine.attack('mouse');
    expect(types(events)).toEqual([
      'attack',
      'monsterHit',
      'monsterKilled',
      'itemDropped',
      'monsterSpawned',
    ]);
    const killed = events[2];
    if (killed?.type !== 'monsterKilled') throw new Error('expected monsterKilled');
    expect(killed.monster.index).toBe(0);
    expect(killed.xpGained).toBe(xpReward(0));
    expect(engine.getState().killCount).toBe(1);
    expect(engine.getState().xp).toBe(5);
  });

  it('next monster spawns with index+1 and higher maxHp', () => {
    const engine = createEngine(makeSave({ monsterHp: 1 }), calmRng());
    const events = engine.attack('keyboard');
    const spawned = events[events.length - 1];
    if (spawned?.type !== 'monsterSpawned') throw new Error('expected monsterSpawned');
    expect(spawned.monster.index).toBe(1);
    expect(spawned.monster.maxHp).toBe(monsterMaxHp(1));
    expect(spawned.monster.maxHp).toBeGreaterThan(monsterMaxHp(0));
    const s = engine.getState();
    expect(s.monster.index).toBe(1);
    expect(s.monsterHp).toBe(s.monster.maxHp);
  });

  it('hero reaches level 2 at exactly 20 cumulative xp and damage becomes 2', () => {
    // xpReward(5) === 20 === xpToNext(1): one kill lands exactly on the bar.
    const engine = createEngine(makeSave({ monsterIndex: 5, monsterHp: 1 }), calmRng());
    const events = engine.attack('keyboard');
    expect(types(events)).toEqual([
      'attack',
      'monsterHit',
      'monsterKilled',
      'itemDropped',
      'levelUp',
      'monsterSpawned',
    ]);
    expect(events[4]).toEqual({ type: 'levelUp', newLevel: 2 });
    const s = engine.getState();
    expect(s.level).toBe(2);
    expect(s.xp).toBe(0); // carry-over: 20 - xpToNext(1) === 0
    const next = engine.attack('keyboard');
    expect(next[0]).toEqual({ type: 'attack', damage: 2n, crit: false, source: 'keyboard' });
    expect(damageForLevel(2)).toBe(2);
  });

  it('xp past the threshold carries over (threshold subtracted, not reset)', () => {
    const engine = createEngine(makeSave({ xp: 19, monsterHp: 1 }), calmRng());
    engine.attack('keyboard'); // +xpReward(0)=5 → 24 ≥ 20
    const s = engine.getState();
    expect(s.level).toBe(2);
    expect(s.xp).toBe(19 + xpReward(0) - xpToNext(1)); // 4
  });

  it('one huge kill can grant several levels, one levelUp event per level', () => {
    // xpReward(20)=65: 65-20=45 → L2, 45-28=17 → L3, 17 < 39 stays.
    const engine = createEngine(makeSave({ monsterIndex: 20, monsterHp: 1 }), calmRng());
    const events = engine.attack('mouse');
    expect(types(events)).toEqual([
      'attack',
      'monsterHit',
      'monsterKilled',
      'itemDropped',
      'levelUp',
      'levelUp',
      'monsterSpawned',
    ]);
    expect(events[4]).toEqual({ type: 'levelUp', newLevel: 2 });
    expect(events[5]).toEqual({ type: 'levelUp', newLevel: 3 });
    const s = engine.getState();
    expect(s.level).toBe(3);
    expect(s.xp).toBe(xpReward(20) - xpToNext(1) - xpToNext(2)); // 17
  });

  it('a crit multiplies damage by CRIT_MULT and each attack rolls its own draw', () => {
    const engine = createEngine(null, scriptedRng([0.5, 0.05, 0.95])); // spawn, then crits
    expect(engine.attack('mouse')[0]).toEqual({
      type: 'attack',
      damage: 1n * BigInt(CRIT_MULT),
      crit: true,
      source: 'mouse',
    });
    expect(engine.attack('mouse')[0]).toEqual({
      type: 'attack',
      damage: 1n,
      crit: false,
      source: 'mouse',
    });
  });

  it('overkill damage clamps hpAfter to 0, never negative', () => {
    const engine = createEngine(makeSave({ level: 5, monsterHp: 3 }), calmRng());
    const events = engine.attack('keyboard');
    expect(events[1]).toEqual({ type: 'monsterHit', hpAfter: 0n, maxHp: 10n });
    expect(types(events)).toContain('monsterKilled');
  });

  it('kill drops are applied to state: coins first, trinkets counted by id', () => {
    // Draw order on the kill: crit 0.5 (no), trinket 0.0 (yes), pick 0.0 → sword_shard.
    const engine = createEngine(makeSave({ monsterHp: 1 }), scriptedRng([0.5, 0.0, 0.0]));
    const events = engine.attack('keyboard');
    const dropped = events[3];
    if (dropped?.type !== 'itemDropped') throw new Error('expected itemDropped');
    expect(dropped.drops[0]?.item.kind).toBe('coin');
    expect(dropped.drops[1]?.item.id).toBe('sword_shard');
    const s = engine.getState();
    expect(s.coins).toBe(1); // coinsForIndex(0)
    expect(s.items).toEqual({ sword_shard: 1 });
  });

  it('killing a boss grants 5x xp and 5x coins', () => {
    // Index 7 is the first boss (BOSS_EVERY = 8); index 6 is its plain neighbour.
    const bossKill = createEngine(makeSave({ monsterIndex: 7, monsterHp: 1 }), calmRng());
    const events = bossKill.attack('keyboard');
    const killed = events[2];
    if (killed?.type !== 'monsterKilled') throw new Error('expected monsterKilled');
    expect(killed.monster.boss).toBe(true);
    expect(killed.monster.maxHp).toBe(monsterMaxHp(7) * 5n);
    expect(killed.xpGained).toBe(xpReward(7) * 5);
    const dropped = events[3];
    if (dropped?.type !== 'itemDropped') throw new Error('expected itemDropped');
    expect(dropped.drops[0]).toEqual({ item: COIN_ITEM, amount: coinsForIndex(7) * 5 });
    expect(bossKill.getState().coins).toBe(coinsForIndex(7) * 5);

    const plainKill = createEngine(makeSave({ monsterIndex: 6, monsterHp: 1 }), calmRng());
    const plain = plainKill.attack('keyboard');
    const plainKilled = plain[2];
    if (plainKilled?.type !== 'monsterKilled') throw new Error('expected monsterKilled');
    expect(plainKilled.monster.boss).toBe(false);
    expect(plainKilled.xpGained).toBe(xpReward(6));
    expect(plainKill.getState().coins).toBe(coinsForIndex(6));
  });

  it('same seed yields an identical event log', () => {
    const play = (seed: number): GameEvent[] => {
      const engine = createEngine(null, mulberry32(seed));
      const log: GameEvent[] = [];
      for (let i = 0; i < 500; i++) {
        log.push(...engine.attack(i % 2 === 0 ? 'keyboard' : 'mouse'));
      }
      return log;
    };
    expect(play(2026)).toEqual(play(2026));
    expect(play(2026)).not.toEqual(play(999));
  });

  it('crit rate over 10000 seeded attacks is within 8 to 12 percent', () => {
    const engine = createEngine(null, mulberry32(20260708));
    let crits = 0;
    for (let i = 0; i < 10000; i++) {
      // 20 rapid inputs light fever (F34), which prepends its own event —
      // the crit flag still rides on this input's attack event.
      const attack = engine.attack('keyboard').find((e) => e.type === 'attack');
      if (attack?.type !== 'attack') throw new Error('expected attack');
      if (attack.crit) crits++;
    }
    const rate = crits / 10000;
    expect(rate).toBeGreaterThanOrEqual(0.08);
    expect(rate).toBeLessThanOrEqual(0.12);
  });

  it('toSave() round-trips into an engine with the identical state', () => {
    const a = createEngine(null, mulberry32(9));
    for (let i = 0; i < 137; i++) {
      a.attack(i % 3 === 0 ? 'mouse' : 'keyboard');
    }
    // Spamming lit fever (F34); it burns out on the engine clock and is never
    // part of the save, so the resumed engine still matches exactly.
    a.tick(FEVER_MS);
    const save = a.toSave();
    expect(save.version).toBe(3);
    expect(save.monsterIndex).toBe(a.getState().monster.index);
    expect(save.monsterHp).toBe(String(a.getState().monsterHp));
    const b = createEngine(save, mulberry32(1));
    expect(b.getState()).toEqual(a.getState());
    expect(b.toSave()).toEqual(save);
  });

  it('createEngine(save) resumes monsterIndex and monsterHp exactly', () => {
    const save = makeSave({
      level: 4,
      xp: 11,
      killCount: 12,
      coins: 30,
      items: { bone: 2, crown: 1 },
      monsterIndex: 12,
      monsterHp: 5,
    });
    const s = createEngine(save, calmRng()).getState();
    expect(s.monster.index).toBe(12);
    expect(s.monster.speciesId).toBe('hexweaver'); // catalog slot 12: round 2, dark
    expect(s.monsterHp).toBe(5n);
    expect(s.level).toBe(4);
    expect(s.xp).toBe(11);
    expect(s.killCount).toBe(12);
    expect(s.coins).toBe(30);
    expect(s.items).toEqual({ bone: 2, crown: 1 });
    // The full persistence path (F10 → F11): serialize → parse → resume.
    const reparsed = createEngine(parseSave(serializeSave(save)), calmRng()).getState();
    expect(reparsed).toEqual(s);
  });

  it('createEngine(save) resumes exactly and clamps monsterHp into [1, maxHp]', () => {
    const exact = createEngine(makeSave({ monsterIndex: 3, monsterHp: 7 }), calmRng()).getState();
    expect(exact.monster.index).toBe(3);
    expect(exact.monsterHp).toBe(7n);
    const over = createEngine(makeSave({ monsterHp: 9999 }), calmRng()).getState();
    expect(over.monsterHp).toBe(monsterMaxHp(0));
    const dead = createEngine(makeSave({ monsterHp: 0 }), calmRng()).getState();
    expect(dead.monsterHp).toBe(1n);
  });

  it('getState() returns a defensive copy', () => {
    const engine = createEngine(null, calmRng());
    const s = engine.getState() as { monsterHp: bigint; items: Record<string, number> };
    s.monsterHp = -42n;
    s.items['crown'] = 99;
    expect(engine.getState().monsterHp).toBe(10n);
    expect(engine.getState().items).toEqual({});
  });

  it('a boss kill rolls capture after loot and emits bossCaptured with a c-prefixed id at 35 percent', () => {
    // Index 7 is the first boss. Draws: crit 0.5 (no), loot 0.5 (no trinket),
    // capture 0.0 < CAPTURE_CHANCE (yes), then the next species draw.
    const bossSave = makeSave({ monsterIndex: 7, monsterHp: 1 });
    const engine = createEngine(bossSave, scriptedRng([0.5, 0.5, 0.0]));
    const events = engine.attack('keyboard');
    expect(types(events)).toEqual([
      'attack',
      'monsterHit',
      'monsterKilled',
      'itemDropped',
      'bossCaptured',
      'levelUp',
      'levelUp',
      'levelUp',
      'monsterSpawned',
    ]);
    const captured = events[4];
    if (captured?.type !== 'bossCaptured') throw new Error('expected bossCaptured');
    expect(captured.companion).toEqual({
      id: 'c1',
      speciesId: 'rictus', // catalog slot 7: round 1, dark
      bossIndex: 7,
      level: 1,
      stars: 0,
    });
    const s = engine.getState();
    expect(s.companions).toEqual([captured.companion]);
    expect(s.nextCompanionId).toBe(2);

    // 10000 seeded boss kills (fresh engine, one shared rng): 32-38 %.
    expect(CAPTURE_CHANCE).toBe(0.35);
    const rng = mulberry32(20260903);
    let captures = 0;
    for (let i = 0; i < 10000; i++) {
      for (const e of createEngine(bossSave, rng).attack('keyboard')) {
        if (e.type === 'bossCaptured') captures++;
      }
    }
    const rate = captures / 10000;
    expect(rate).toBeGreaterThanOrEqual(0.32);
    expect(rate).toBeLessThanOrEqual(0.38);
  });

  it('kills draw crit, loot, optional capture, then exactly one next species', () => {
    // Crit, loot (1 draw; 2 when a trinket drops), then species. No capture draw.
    const boring = countingRng([0.5]);
    createEngine(makeSave({ monsterHp: 1 }), boring.rng).attack('keyboard');
    expect(boring.draws()).toBe(3);

    const lucky = countingRng([0.0]); // crit, trinket, weighted pick
    createEngine(makeSave({ monsterHp: 1 }), lucky.rng).attack('keyboard');
    expect(lucky.draws()).toBe(4);

    // A boss kill spends exactly one more draw than the same non-boss kill.
    const boss = countingRng([0.5]);
    const events = createEngine(makeSave({ monsterIndex: 7, monsterHp: 1 }), boss.rng).attack(
      'keyboard',
    );
    expect(boss.draws()).toBe(4);
    expect(types(events)).not.toContain('bossCaptured'); // 0.5 >= CAPTURE_CHANCE
  });

  it('a capture into a full roster of 30 is skipped but still spends the draw', () => {
    const companions: Companion[] = Array.from({ length: 30 }, (_, i) => ({
      id: `c${i + 1}`,
      speciesId: 'slime',
      bossIndex: 7,
      level: 1,
      stars: 0,
    }));
    const full = makeSaveV2({
      monsterIndex: 7,
      monsterHp: '1',
      companions,
      nextCompanionId: 31,
    });
    const counted = countingRng([0.5, 0.5, 0.0]); // the capture roll would succeed
    const engine = createEngine(full, counted.rng);
    const events = engine.attack('keyboard');
    expect(types(events)).not.toContain('bossCaptured');
    expect(counted.draws()).toBe(4); // crit, loot, capture, next species
    const s = engine.getState();
    expect(s.companions).toHaveLength(30);
    expect(s.nextCompanionId).toBe(31);
  });

  it('bestIndex tracks the deepest monster index ever spawned', () => {
    const engine = createEngine(makeSave({ level: 100, monsterHp: 1 }), calmRng());
    expect(engine.getState().bestIndex).toBe(0);
    for (let i = 0; i < 5; i++) {
      engine.attack('keyboard');
    }
    expect(engine.getState().monster.index).toBe(5);
    expect(engine.getState().bestIndex).toBe(5);
    expect(engine.toSave().bestIndex).toBe(5);
    // Resume never forgets: at least the resumed index, never lowered.
    const behind = createEngine(makeSaveV2({ monsterIndex: 12, bestIndex: 3 }), calmRng());
    expect(behind.getState().bestIndex).toBe(12);
    const ahead = createEngine(makeSaveV2({ monsterIndex: 12, bestIndex: 99 }), calmRng());
    expect(ahead.getState().bestIndex).toBe(99);
  });

  it('apply(rebirth) emits rebirth and multiplies hero damage by 1 plus souls', () => {
    const engine = createEngine(makeSaveV2({ monsterIndex: 40, level: 7, xp: 3 }), calmRng());
    expect(engine.apply({ type: 'rebirth' })).toEqual([{ type: 'rebirth', souls: 5 }]); // 40/8
    const s = engine.getState();
    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
    expect(s.souls).toBe(5);
    expect(s.rebirths).toBe(1);
    expect(s.monster.index).toBe(0);
    expect(s.monsterHp).toBe(monsterMaxHp(0));
    expect(s.bestIndex).toBe(40); // rebirth keeps the record
    // damage = level 1 x (1 + 5 souls)
    expect(engine.attack('keyboard')[0]).toEqual({
      type: 'attack',
      damage: 6n,
      crit: false,
      source: 'keyboard',
    });
    expect(engine.toSave().souls).toBe(5);
  });

  it('apply with an invalid action emits nothing and leaves state untouched', () => {
    const engine = createEngine(makeSaveV2({ monsterIndex: 10 }), calmRng());
    const before = engine.getState();
    expect(engine.apply({ type: 'sacrifice', id: 'nope' })).toEqual([]);
    expect(engine.apply({ type: 'fuse', aId: 'c1', bId: 'c2' })).toEqual([]);
    expect(engine.apply({ type: 'rebirth' })).toEqual([]); // index 10 is below 40
    expect(engine.getState()).toEqual(before);
    expect(engine.toSave()).toEqual({
      ...upgradeSave(makeSaveV2({ monsterIndex: 10 })),
      monsterSpeciesId: 'sopwit',
    });
  });

  it('toSave writes version 3 and the pvpParty', () => {
    const pet: Companion = { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 };
    const save: SaveFileV3 = {
      ...makeSaveV2({ companions: [pet], nextCompanionId: 2 }),
      version: 3,
      pvpParty: ['c1'],
    };
    const engine = createEngine(save, calmRng());
    expect(engine.getState().pvpParty).toEqual(['c1']);
    expect(engine.toSave().version).toBe(3);
    expect(engine.toSave().pvpParty).toEqual(['c1']);
    // A v2 save resumes with no party and still writes v3.
    expect(createEngine(makeSaveV2(), calmRng()).toSave().pvpParty).toEqual([]);
  });
  it('tick fires one volley per 1000ms from the 5 best-matched companions and kills chain into the next monster', () => {
    // Powers 4/3/2/1 (bossIndex 7 → base 1); the whole roster fits in a party
    // of 5, so the enemy type only decides the ORDER they swing in.
    const roster: Companion[] = [
      { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 4, stars: 0 },
      { id: 'c2', speciesId: 'bat', bossIndex: 7, level: 3, stars: 0 },
      { id: 'c3', speciesId: 'ghost', bossIndex: 7, level: 2, stars: 0 },
      { id: 'c4', speciesId: 'golem', bossIndex: 7, level: 1, stars: 0 },
    ];
    expect(roster.map(companionPower)).toEqual([4n, 3n, 2n, 1n]);
    const engine = createEngine(
      makeSaveV2({ monsterHp: '1', companions: roster, nextCompanionId: 5 }),
      // Script the enemy types so the swing-timing assertions stay independent of randomness.
      scriptedRng([0.5, 1.5 / SPECIES_IDS.length, 0.5, 2.5 / SPECIES_IDS.length,
        0.5, 3.5 / SPECIES_IDS.length, 0.5, 4.5 / SPECIES_IDS.length, 0.5]),
    );

    // Sub-volley time only accumulates.
    expect(engine.tick(COMPANION_ATTACK_MS - 1)).toEqual([]);
    // Window 1000 books ONE swing per member, staggered by species attack delay
    // + PARTY_STAGGER_MS × rank (2026-09-06). Monster 0 is a water slime: wind
    // c2 (6) ranks first and, as a bat (delay 0), lands right at 1000 and kills it.
    const swingers = (events: GameEvent[]): string[] =>
      events.flatMap((e) => (e.type === 'companionAttack' ? [e.companionId] : []));
    const events = engine.tick(1);
    expect(types(events)).toEqual([
      'companionAttack',
      'monsterHit',
      'monsterKilled',
      'itemDropped',
      'monsterSpawned',
    ]);
    expect(events[0]).toEqual({
      type: 'companionAttack',
      companionId: 'c2',
      speciesId: 'bat',
      damage: 6n, // wind 3 x2 into water
      effectiveness: 'super',
    });
    expect(engine.getState().monster.index).toBe(1);

    // The rest of that window lands over the next second — slime @1270, ghost
    // @1610, golem @1940 — each re-typed against the wind bat standing there
    // now (F63); window 2000's own swings start after their delays.
    const rest = engine.tick(COMPANION_ATTACK_MS);
    expect(swingers(rest)).toEqual(['c1', 'c3', 'c4']);
    expect(rest[0]).toEqual({
      type: 'companionAttack',
      companionId: 'c1',
      speciesId: 'slime',
      damage: 2n, // water 4 /2 into wind
      effectiveness: 'weak',
    });
    expect(rest[1]).toEqual({ type: 'monsterHit', hpAfter: 9n, maxHp: monsterMaxHp(1) });
    expect(rest[5]).toEqual({ type: 'monsterHit', hpAfter: 4n, maxHp: monsterMaxHp(1) });
    const s = engine.getState();
    expect(s.monster.index).toBe(1);
    expect(s.monsterHp).toBe(4n);
    expect(s.killCount).toBe(1);

    // Still exactly one swing per member per window: the windows opened by
    // t = 4500 (2000, 3000, 4000) plus window 5000's first swing account for
    // 3 × 4 = 12 swings by t = 5000 — 10 land by 4500, the carried 2 by 5000.
    const two = engine.tick(2 * COMPANION_ATTACK_MS + 500);
    expect(two.filter((e) => e.type === 'companionAttack')).toHaveLength(10);
    const carried = engine.tick(500);
    expect(carried.filter((e) => e.type === 'companionAttack')).toHaveLength(2);
    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      expect([...swingers(two), ...swingers(carried)].filter((x) => x === id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('attack timing is a hidden species attribute: bats strike first, golems last, all inside one window', () => {
    // SPEC F35 (2026-09-06): one swing per member per 1000-ms window, landing at
    // the species delay + PARTY_STAGGER_MS × rank — never as one block.
    expect(attackDelayOf('bat')).toBe(0);
    expect(attackDelayOf('golem')).toBe(800);
    expect(attackDelayOf('unknown-species')).toBe(0);
    const delays = SPECIES_IDS.map((id) => attackDelayOf(id));
    // Every delay sits on the 50-ms grid inside the window (F81).
    for (const d of delays) {
      expect(d % 50, String(d)).toBe(0);
      expect(d, String(d)).toBeGreaterThanOrEqual(0);
      expect(d, String(d)).toBeLessThanOrEqual(900);
    }
    // 105 species cannot all have a DISTINCT delay on that grid — and they do
    // not need one. Two party members swing together only if their delays
    // differ by exactly PARTY_STAGGER_MS × (rank gap), and 70 × 1..4 is never a
    // multiple of 50, so no pair of species can ever collide at any rank.
    const collides = delays.some((a) =>
      delays.some((b) => [1, 2, 3, 4].some((gap) => a - b === gap * PARTY_STAGGER_MS)),
    );
    expect(collides).toBe(false);
    // The catalog still spreads across the grid rather than clumping.
    expect(new Set(delays).size).toBeGreaterThanOrEqual(15);
    expect(Math.max(...delays) + 4 * PARTY_STAGGER_MS).toBeLessThan(2 * COMPANION_ATTACK_MS);
    // Three bats never swing together: ranks spread them PARTY_STAGGER_MS apart.
    const bats: Companion[] = [1, 2, 3].map((n) => ({ id: `b${String(n)}`, speciesId: 'bat', bossIndex: 7, level: n, stars: 0 }));
    const engine = createEngine(
      makeSaveV2({ monsterIndex: 60, companions: bats, nextCompanionId: 4 }),
      calmRng(),
    );
    const at = (dt: number): string[] =>
      engine.tick(dt).flatMap((e) => (e.type === 'companionAttack' ? [e.companionId] : []));
    expect(at(COMPANION_ATTACK_MS)).toEqual(['b3']); // strongest bat, rank 0, t = 1000
    expect(at(PARTY_STAGGER_MS - 1)).toEqual([]);
    expect(at(1)).toEqual(['b2']); // t = 1070
    expect(at(PARTY_STAGGER_MS)).toEqual(['b1']); // t = 1140
  });

  it('volley damage is type-adjusted and companionAttack carries effectiveness', () => {
    // Monster 60 is a water slime with ~43k hp: nothing dies, so every swing
    // is measured against the same defender.
    const roster: Companion[] = [
      { id: 'c1', speciesId: 'bat', bossIndex: 7, level: 3, stars: 0 }, // wind: super
      { id: 'c2', speciesId: 'slime', bossIndex: 7, level: 5, stars: 0 }, // water: normal
      { id: 'c3', speciesId: 'ghost', bossIndex: 7, level: 8, stars: 0 }, // dark: weak
    ];
    const engine = createEngine(
      makeSaveV2({ monsterIndex: 60, companions: roster, nextCompanionId: 4 }),
      calmRng(),
    );
    // One window: the bat (rank 0, delay 0) lands at 1000, the slime (rank 1)
    // at 1270 and the ghost (rank 2) at 1540 — all inside t < 2000.
    const volley = engine.tick(2 * COMPANION_ATTACK_MS - 1).filter((e) => e.type === 'companionAttack');
    // Effective power decides the rank (3x2=6 > 5 > 8/2=4) and here the landing order too.
    expect(volley).toEqual([
      { type: 'companionAttack', companionId: 'c1', speciesId: 'bat', damage: 6n, effectiveness: 'super' },
      { type: 'companionAttack', companionId: 'c2', speciesId: 'slime', damage: 5n, effectiveness: 'normal' },
      { type: 'companionAttack', companionId: 'c3', speciesId: 'ghost', damage: 4n, effectiveness: 'weak' },
    ]);
    expect(engine.getState().monsterHp).toBe(monsterMaxHp(60) - 15n);
  });

  it('the field party changes when a monster of another type spawns', () => {
    // Six companions, five slots: the two the type chart drops differ per enemy.
    const roster: Companion[] = [
      { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 10, stars: 0 }, // water
      { id: 'c2', speciesId: 'bat', bossIndex: 7, level: 6, stars: 0 }, // wind
      { id: 'c3', speciesId: 'golem', bossIndex: 7, level: 6, stars: 0 }, // earth
      { id: 'c4', speciesId: 'ghost', bossIndex: 7, level: 8, stars: 0 }, // dark
      { id: 'c5', speciesId: 'dragon', bossIndex: 7, level: 7, stars: 0 }, // fire
      { id: 'c6', speciesId: 'slime', bossIndex: 7, level: 9, stars: 0 }, // water
    ];
    // Legacy monster 60 is water on its last hit point; draw a wind bat next.
    const engine = createEngine(
      makeSaveV2({ monsterIndex: 60, monsterHp: '1', companions: roster, nextCompanionId: 7 }),
      scriptedRng([0.5, 1.5 / SPECIES_IDS.length, 0.5]), // loot, wind bat, later rolls
    );
    const attackers = (events: GameEvent[]): string[] =>
      events.flatMap((e) => (e.type === 'companionAttack' ? [e.companionId] : []));

    // Landing order of one window's swings for a party picked against `type`:
    // species attack delay + PARTY_STAGGER_MS × rank (2026-09-06).
    const landingOrder = (type: 'water' | 'wind'): string[] =>
      activeCompanions(roster, type)
        .map((c, rank) => ({ id: c.id, at: attackDelayOf(c.speciesId) + rank * PARTY_STAGGER_MS }))
        .sort((a, b) => a.at - b.at)
        .map((x) => x.id);
    // Window 1000 vs water: 12, 12, 10, 9, 4 — the fire dragon (3) is benched;
    // every swing lands before t = 2000.
    const first = engine.tick(2 * COMPANION_ATTACK_MS - 1);
    expect([...attackers(first)].sort()).toEqual(['c1', 'c2', 'c3', 'c4', 'c6']);
    expect(attackers(first)).toEqual(landingOrder('water'));
    expect(types(first)).toContain('monsterSpawned');
    expect(engine.getState().monster.type).toBe('wind');

    // Same roster, next window, new enemy type: the party is re-picked —
    // vs wind: 16, 14, 6, 5, 4 — now the earth golem (3) sits out.
    const second = engine.tick(COMPANION_ATTACK_MS);
    expect([...attackers(second)].sort()).toEqual(['c1', 'c2', 'c4', 'c5', 'c6']);
    expect(attackers(second)).toEqual(landingOrder('wind'));
  });

  it('pvpResult with a replay is applied exactly like one without', () => {
    const pet: Companion = { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 };
    const stolen: Companion = { id: 'x9', speciesId: 'dragon', bossIndex: 15, level: 2, stars: 1 };
    const replay: BattleReplay = {
      opponentName: 'Bo',
      opponentParty: [stolen],
      blows: [{ side: 'A', actorId: 'c1', targetId: 'x9', damage: '12', ko: true }],
    };
    const save = makeSaveV2({ companions: [pet], nextCompanionId: 2 });
    const plain = createEngine(save, calmRng());
    const withReplay = createEngine(save, calmRng());

    const events = plain.apply({ type: 'pvpResult', won: true, stolen, lostId: null });
    expect(events).toEqual(
      withReplay.apply({ type: 'pvpResult', won: true, stolen, lostId: null, replay }),
    );
    // The engine never forwards or stores it — same roster, same save.
    expect(events).toEqual([
      { type: 'pvpResolved', won: true, stolen: { ...stolen, id: 'c2' }, lostId: null },
    ]);
    expect(withReplay.getState()).toEqual(plain.getState());
    expect(withReplay.toSave()).toEqual(plain.toSave());
  });

  it('tick with no companions emits nothing and never spends rng draws', () => {
    const counted = countingRng([0.0]); // would crit and drop a trinket if drawn
    const engine = createEngine(makeSaveV2({ monsterHp: '1' }), counted.rng);
    expect(engine.tick(10 * COMPANION_ATTACK_MS)).toEqual([]);
    expect(counted.draws()).toBe(0);
    expect(engine.getState().monsterHp).toBe(1n);
    expect(engine.getState().killCount).toBe(0);
  });

  it('companion damage is tripled during fever and never crits', () => {
    const pet: Companion = { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 5, stars: 0 };
    // Monster 60 has ~43k hp: 20 hero inputs can never kill it, so no kill
    // chain hides a stray draw.
    const counted = countingRng([0.0]); // every hero attack crits — one draw each
    const engine = createEngine(
      makeSaveV2({ monsterIndex: 60, companions: [pet], nextCompanionId: 2 }),
      counted.rng,
    );
    for (let i = 0; i < FEVER_INPUTS; i++) {
      engine.attack('keyboard');
    }
    expect(engine.getState().fever.active).toBe(true);
    const heroDraws = counted.draws();

    // The slime's swing lands attackDelayOf('slime') ms into the first window.
    const hot = engine.tick(COMPANION_ATTACK_MS + attackDelayOf('slime'));
    expect(hot[0]).toEqual({
      type: 'companionAttack',
      companionId: 'c1',
      speciesId: 'slime',
      // Monster 60 is a water slime too: normal, so only fever scales it.
      damage: companionPower(pet) * 3n,
      effectiveness: 'normal',
    });
    expect(counted.draws()).toBe(heroDraws); // companions never roll a crit

    // Fever ends at t = 5000 inside this tick (feverEnd comes first); the swings
    // landing at 2200, 3200 and 4200 still read it as burning, the one at 5200
    // is plain — the multiplier follows the LANDING time, not the tick's end.
    const cooled = engine.tick(4 * COMPANION_ATTACK_MS);
    expect(cooled[0]).toEqual({ type: 'feverEnd' });
    const swings = cooled.filter((e) => e.type === 'companionAttack');
    expect(swings).toHaveLength(4);
    expect(swings.slice(0, 3).map((e) => (e.type === 'companionAttack' ? e.damage : 0n))).toEqual([
      companionPower(pet) * 3n,
      companionPower(pet) * 3n,
      companionPower(pet) * 3n,
    ]);
    const plain = swings.slice(3);
    expect(plain[0]).toEqual({
      type: 'companionAttack',
      companionId: 'c1',
      speciesId: 'slime',
      damage: companionPower(pet),
      effectiveness: 'normal',
    });
    expect(counted.draws()).toBe(heroDraws);
  });
});
