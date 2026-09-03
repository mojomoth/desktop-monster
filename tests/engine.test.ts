import { describe, expect, it } from 'vitest';
import {
  COIN_ITEM,
  coinsForIndex,
  createEngine,
  CRIT_MULT,
  damageForLevel,
  FEVER_MS,
  monsterForIndex,
  monsterMaxHp,
  mulberry32,
  parseSave,
  serializeSave,
  xpReward,
  xpToNext,
} from '../src/core/index.js';
import type { Companion, GameEvent, Rng, SaveFileV1, SaveFileV2 } from '../src/core/index.js';
import { CAPTURE_CHANCE } from '../src/core/engine.js';

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
    expect(s.monster.speciesId).toBe('slime');
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
    const engine = createEngine(null, scriptedRng([0.05, 0.95]));
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
    expect(save.version).toBe(2);
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
    expect(s.monster.speciesId).toBe('ghost'); // 12 % 5 = 2
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
    // capture 0.0 < CAPTURE_CHANCE (yes) — the capture draw comes last.
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
      speciesId: 'ghost', // 7 % 5 = 2
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

  it('non-boss kills consume exactly the v1 rng draws', () => {
    // v1 sequence: crit, loot (1 draw; 2 when a trinket drops). No capture draw.
    const boring = countingRng([0.5]);
    createEngine(makeSave({ monsterHp: 1 }), boring.rng).attack('keyboard');
    expect(boring.draws()).toBe(2);

    const lucky = countingRng([0.0]); // crit, trinket, weighted pick
    createEngine(makeSave({ monsterHp: 1 }), lucky.rng).attack('keyboard');
    expect(lucky.draws()).toBe(3);

    // A boss kill spends exactly one more draw than the same non-boss kill.
    const boss = countingRng([0.5]);
    const events = createEngine(makeSave({ monsterIndex: 7, monsterHp: 1 }), boss.rng).attack(
      'keyboard',
    );
    expect(boss.draws()).toBe(3);
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
    expect(counted.draws()).toBe(3); // crit, loot, capture — the draw is spent
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
    expect(engine.toSave()).toEqual(makeSaveV2({ monsterIndex: 10 }));
  });
});
