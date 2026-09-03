import { describe, expect, it } from 'vitest';
import {
  createEngine,
  CRIT_MULT,
  damageForLevel,
  monsterMaxHp,
  mulberry32,
  parseSave,
  serializeSave,
  xpReward,
  xpToNext,
} from '../src/core/index.js';
import type { GameEvent, Rng, SaveFileV1 } from '../src/core/index.js';

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
      const attack = engine.attack('keyboard')[0];
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
});
