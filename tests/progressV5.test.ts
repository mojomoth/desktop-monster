import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, discoveryContext, heroRequiredLevel, migrateProgress, mulberry32,
  newHeroProgress, newProgress, parseProgress, parseSave, RARE_MONSTERS, serializeSave } from '../src/core/index.js';
import type { SaveFile } from '../src/core/save.js';

const highRoll = { next: (): number => 1 - Number.EPSILON };
const rareIds = new Set<string>(RARE_MONSTERS.map((entry) => entry.id));
const kill = (engine: ReturnType<typeof createEngine>): void => {
  const before = engine.getState().killCount;
  for (let i = 0; i < 1000 && engine.getState().killCount === before; i++) engine.attack('keyboard');
  expect(engine.getState().killCount).toBe(before + 1);
};

describe('v0.5 lifetime progress and migration', () => {
  it('migrates only known discoveries and minimum hero history, preserving old totals and assets', () => {
    const hero = { ...newHeroProgress(), reincarnations: 8, collection: [{ formId: 'h01', buffPercent: 25 }],
      equipped: { formId: 'h01', buffPercent: 25 },
      choices: [{ formId: 'h11', buffPercent: 10 }, { formId: 'h12', buffPercent: 12 }, { formId: 'h13', buffPercent: 14 }] };
    const save: SaveFile = { ...DEFAULT_SAVE, level: 12, killCount: 400, coins: 1234, souls: 9,
      monsterSpeciesId: 'slime', hero, companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 7, stars: 0, level: 1 }] };
    const engine = createEngine(save, mulberry32(4));
    const progress = engine.getState().progress!;
    expect(engine.toSave()).toMatchObject({ level: 12, killCount: 400, coins: 1234, souls: 9, companions: save.companions });
    expect(progress).toMatchObject({ legacyHistory: true, playTimeMs: 0, speciesKills: {},
      heroCounts: { h01: 1 }, reincarnationHistory: [] });
    expect(new Set(progress.seenMonsters)).toEqual(new Set(['slime', 'dragon']));
    expect(new Set(progress.seenHeroes)).toEqual(new Set(['h01', 'h11', 'h12', 'h13']));
    engine.apply({ type: 'heroChoose', formId: 'h11', offerSerial: 0 });
    expect(engine.getState().hero?.reincarnations).toBe(9);
    expect(engine.getState().progress!.reincarnationHistory[0]).toMatchObject({ number: 9, formId: 'h11', level: 12 });
  });

  it('tracks only injected active time, preserving fractional ticks and ignoring invalid time', () => {
    const engine = createEngine(null, mulberry32(4));
    for (const dt of [NaN, Infinity, -100, 0]) engine.tick(dt);
    expect(engine.getState().progress!.playTimeMs).toBe(0);
    engine.tick(16.625);
    engine.tick(1000);
    const saved = parseSave(serializeSave(engine.toSave()));
    expect(saved.progress!.playTimeMs).toBe(1016.625);
    const resumed = createEngine(saved, mulberry32(9));
    expect(resumed.toSave()).toEqual(saved);
    resumed.tick(100);
    expect(resumed.getState().progress!.playTimeMs).toBe(1116.625);
  });

  it('counts actual species kills from both hero and companion damage paths', () => {
    const hero = createEngine({ ...DEFAULT_SAVE, killCount: 99, monsterSpeciesId: 'dragon', monsterHp: '1' }, mulberry32(1));
    hero.attack('keyboard');
    expect(hero.getState().killCount).toBe(100);
    expect(hero.getState().progress!.speciesKills).toEqual({ dragon: 1 });
    const party = createEngine({ ...DEFAULT_SAVE, monsterSpeciesId: 'slime', monsterHp: '1',
      companions: [{ id: 'c1', speciesId: 'bat', bossIndex: 7, level: 1, stars: 0 }] }, mulberry32(2));
    expect(party.tick(1000).some((event) => event.type === 'monsterKilled')).toBe(true);
    expect(party.getState().progress!.speciesKills).toEqual({ slime: 1 });
    expect(discoveryContext(hero.getState()).elementKills.fire).toBe(1);
  });

  it('keeps discovery after deferral, and equipment changes never write a reincarnation', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(0) }, mulberry32(505));
    engine.apply({ type: 'heroOffer' });
    const offered = engine.toSave();
    expect(offered.progress!.seenHeroes).toEqual(offered.hero!.choices.map((choice) => choice.formId));
    engine.apply({ type: 'heroDefer', offerSerial: offered.hero!.offerSerial });
    expect(engine.getState().progress!.seenHeroes).toEqual(offered.progress!.seenHeroes);
    expect(engine.getState().progress!.reincarnationHistory).toEqual([]);
    engine.apply({ type: 'heroEquip', formId: offered.hero!.choices[0]!.formId });
    expect(engine.getState().hero!.equipped.formId).toBe('h00');
    expect(engine.getState().progress!.heroCounts).toEqual({});
  });

  it('retains lifetime hero counts beyond the most recent 100 chronological records', () => {
    let save: SaveFile = { ...DEFAULT_SAVE };
    for (let i = 0; i < 105; i++) {
      const hero = save.hero ?? newHeroProgress();
      save = { ...save, level: heroRequiredLevel(i), hero: { ...hero, reincarnations: i, restRemainingMs: 0,
        offerSerial: i + 1, offerLevel: heroRequiredLevel(i), choices: [
          { formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 11 }, { formId: 'h03', buffPercent: 12 },
        ] } };
      const engine = createEngine(save, mulberry32(i + 1));
      engine.apply({ type: 'heroChoose', formId: 'h01', offerSerial: i + 1 });
      save = parseSave(serializeSave(engine.toSave()));
    }
    expect(save.progress!.heroCounts.h01).toBe(105);
    expect(save.hero!.equipped.stacks).toBe(104);
    expect(save.progress!.reincarnationHistory).toHaveLength(100);
    expect(save.progress!.reincarnationHistory[0]!.number).toBe(6);
    expect(save.progress!.reincarnationHistory.at(-1)!.number).toBe(105);
    expect(discoveryContext(save).heroFamilyHistory[0]).toBe(105);
  });

  it('deep-copies all new maps, discoveries and timeline records at engine boundaries', () => {
    const progress = newProgress();
    progress.speciesKills.slime = 4;
    progress.heroCounts.h01 = 2;
    progress.reincarnationHistory = [{ number: 1, formId: 'h01', level: 12, playTimeMs: 10, buffPercent: 25, stacks: 0 }];
    const engine = createEngine({ ...DEFAULT_SAVE, progress }, mulberry32(3));
    const before = engine.toSave();
    for (const p of [progress, engine.getState().progress!, engine.toSave().progress!]) {
      p.speciesKills.slime = 999;
      p.heroCounts.h01 = 999;
      p.seenMonsters.push('dragon');
      p.reincarnationHistory[0]!.level = 999;
    }
    expect(engine.toSave()).toEqual(before);
  });

  it('bounds hostile progress independently without poisoning legacy fields or prototypes', () => {
    const progress = parseProgress({ playTimeMs: Infinity, trainingLevel: 99, lureRemaining: 99,
      rareMisses: 99, pvpWins: -1, goldSpent: 1.5,
      speciesKills: JSON.parse('{"__proto__":42,"slime":3,"dragon":-1,"bat":1.5,"madeup":8}'),
      seenMonsters: ['slime', 'slime', '__proto__', 5], seenHeroes: ['h00', 'h01', 'h01', 'h70', 'h71'],
      heroCounts: { h01: 2, h71: 1 }, reincarnationHistory: [{ number: 2, formId: 'h01', buffPercent: 999 }] })!;
    expect(progress).toMatchObject({ playTimeMs: 0, trainingLevel: 10, lureRemaining: 20, rareMisses: 11,
      pvpWins: 0, goldSpent: 0, speciesKills: { slime: 3 }, seenMonsters: ['slime'],
      seenHeroes: ['h01', 'h70'], heroCounts: { h01: 2 }, reincarnationHistory: [] });
    expect(Object.getPrototypeOf(progress.speciesKills)).toBe(Object.prototype);
    expect(parseSave({ ...DEFAULT_SAVE, coins: 777, progress }).coins).toBe(777);
    expect(migrateProgress({ ...DEFAULT_SAVE }).legacyHistory).toBe(false);
  });

  it('accepts only main-synchronized PvP totals, never presentation replays', () => {
    const engine = createEngine(null, mulberry32(1));
    engine.apply({ type: 'pvpResult', won: true, stolen: null, lostId: null });
    expect(engine.getState().progress!.pvpWins).toBe(0);
    engine.apply({ type: 'syncPvpProgress', wins: 3, losses: 2 });
    engine.apply({ type: 'syncPvpProgress', wins: 3, losses: 2 });
    expect(engine.getState().progress).toMatchObject({ pvpWins: 3, pvpLosses: 2 });
    engine.apply({ type: 'syncPvpProgress', wins: Infinity, losses: -1 });
    expect(engine.getState().progress).toMatchObject({ pvpWins: 3, pvpLosses: 2 });
  });
});

describe('v0.5 conditional spawning in the real engine', () => {
  it('guarantees the 12th eligible spawn, resetting misses and preserving the boss cadence', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: 100, killCount: 30, progress: newProgress() }, highRoll);
    for (let i = 1; i <= 12; i++) {
      kill(engine);
      const state = engine.getState();
      expect(rareIds.has(state.monster.speciesId)).toBe(i === 12);
      expect(state.progress!.rareMisses).toBe(i === 12 ? 0 : i);
      expect(state.monster.boss).toBe(state.monster.index % 8 === 7);
    }
    expect(engine.getState().progress!.seenMonsters).toContain('dawnfinch');
  });

  it('consumes exactly 20 eligible lure charges and leaves them intact with no eligible rare', () => {
    const dormant = createEngine({ ...DEFAULT_SAVE, level: 100, progress: { ...newProgress(), lureRemaining: 20 } }, highRoll);
    kill(dormant);
    expect(dormant.getState().progress).toMatchObject({ lureRemaining: 20, rareMisses: 0 });
    const hunting = createEngine({ ...DEFAULT_SAVE, level: 100, killCount: 30,
      progress: { ...newProgress(), lureRemaining: 20 } }, highRoll);
    for (let i = 1; i <= 21; i++) {
      kill(hunting);
      expect(hunting.getState().progress!.lureRemaining).toBe(Math.max(0, 20 - i));
    }
  });

  it('uses the paid probability only while charges remain, without bypassing requirements', () => {
    const spawnWith = (killCount: number, lureRemaining: number) => {
      let draws = 0;
      const engine = createEngine({ ...DEFAULT_SAVE, killCount, monsterHp: '1', progress: { ...newProgress(), lureRemaining } },
        { next: () => ++draws === 3 ? 0.2 : 0.5 });
      engine.attack('keyboard');
      return engine.getState();
    };
    expect(rareIds.has(spawnWith(30, 0).monster.speciesId)).toBe(false);
    expect(rareIds.has(spawnWith(30, 20).monster.speciesId)).toBe(true);
    expect(rareIds.has(spawnWith(0, 20).monster.speciesId)).toBe(false);
  });

  it('keeps a spawned rare visible through phase change and reload, without rerolling it', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, killCount: 30, monsterHp: '1',
      progress: { ...newProgress(), rareMisses: 11 } }, highRoll);
    engine.attack('keyboard');
    const rare = engine.getState().monster;
    expect(rare.speciesId).toBe('dawnfinch');
    engine.tick(300_000);
    expect(engine.getState().monster).toEqual(rare);
    const saved = parseSave(serializeSave(engine.toSave()));
    const resumed = createEngine(saved, { next: () => { throw new Error('Restoring a monster must not roll RNG'); } });
    expect(resumed.getState().monster).toEqual(rare);
    expect(resumed.getState().progress!.seenMonsters).toContain(rare.speciesId);
  });
});
