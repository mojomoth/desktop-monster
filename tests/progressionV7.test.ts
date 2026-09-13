import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import {
  COMMON_SPECIES_IDS, companionPower, createEngine, DEFAULT_SAVE, discoveryContext,
  eligibleHeroIds, eligibleMonsterIds, eligibleRareMonsters, fieldMonsterMaxHp,
  HERO_DEFER_MS, HERO_MIN_LEVEL, HERO_REST_MS, heroForm, heroReadiness, heroRequiredLevel,
  monsterForIndex, monsterMaxHp, mulberry32, newHeroProgress, newProgress, parseHeroProgress,
  parseSave, PROGRESSION_CONTENT_RULES, PROGRESSION_PARAMETERS, rareHero, rareMonster,
  rollHeroChoices, serializeSave, STANDARD_HERO_FORMS, xpReward, xpToNext,
} from '../src/core/index.js';
import type { GameState, HeroProgress, HeroRoll, ProgressionParameters, Requirement, SaveFile } from '../src/core/index.js';

const protocol = JSON.parse(readFileSync('docs/v0.7/EVALUATION_PROTOCOL.json', 'utf8')) as {
  controls: { id: string; parameters: ProgressionParameters }[];
  candidates: { id: string; parameters: ProgressionParameters }[];
  milestones: { id: string; kind: 'hero' | 'monster'; requirements: Requirement[] }[];
};
const collection = (): HeroRoll[] => STANDARD_HERO_FORMS.slice(0, 10).map(({ id }) => ({ formId: id, buffPercent: 10 }));
const pendingChoices = (id = 'h01'): HeroRoll[] => {
  const others = STANDARD_HERO_FORMS.filter((form) => form.type !== heroForm(id)!.type)
    .filter((form, index, all) => all.findIndex((other) => other.type === form.type) === index).slice(0, 2);
  return [{ formId: id, buffPercent: 20 }, ...others.map(({ id }) => ({ formId: id, buffPercent: 10 }))];
};
const progressedSave = (): SaveFile => {
  const progress = newProgress();
  progress.speciesKills = { dragon: 3, slime: 100, reefknight: 2 };
  progress.seenMonsters = [...COMMON_SPECIES_IDS.slice(0, 60)];
  progress.heroCounts = Object.fromEntries(collection().map(({ formId }) => [formId, 1]));
  return { ...DEFAULT_SAVE, level: HERO_MIN_LEVEL, killCount: 30_000, progress,
    hero: { ...newHeroProgress(), collection: collection(), reincarnations: 10 } };
};

describe('v0.7 registered production progression', () => {
  it('binds every production parameter and named content rule to one exact registered experiment', () => {
    expect(Object.keys(PROGRESSION_PARAMETERS)).toHaveLength(21);
    expect(Object.isFrozen(PROGRESSION_PARAMETERS)).toBe(true);
    expect([...protocol.controls, ...protocol.candidates]
      .filter(({ parameters }) => isDeepStrictEqual(parameters, PROGRESSION_PARAMETERS))).toHaveLength(1);
    for (const milestone of protocol.milestones) {
      const definition = milestone.kind === 'hero' ? rareHero(milestone.id) : rareMonster(milestone.id);
      expect(definition, milestone.id).toBeDefined();
      expect(PROGRESSION_CONTENT_RULES[milestone.id]).toBe(definition!.requirements);
      expect(definition!.requirements, milestone.id).toEqual(milestone.requirements);
    }
    expect(HERO_MIN_LEVEL).toBe(PROGRESSION_PARAMETERS.heroMinLevel);
    expect(HERO_REST_MS).toBe(120_000);
    expect(HERO_DEFER_MS).toBe(30_000);
  });

  it('uses exact field/companion curves independently, keeping existing companion and PvP power', () => {
    const parameters = PROGRESSION_PARAMETERS;
    for (const index of [0, 7, 23, 71, 72, 78, 79, 80, 81, 87, 100, 5000]) {
      const i = BigInt(index);
      const original = 10n * 115n ** i / 100n ** i;
      const prefix = parameters.fieldHpTailStartIndex === null ? i : BigInt(Math.min(index, parameters.fieldHpTailStartIndex));
      const tail = i - prefix;
      const field = 10n * BigInt(parameters.fieldHpNumerator) ** prefix * BigInt(parameters.fieldHpTailNumerator) ** tail /
        (BigInt(parameters.fieldHpDenominator) ** prefix * BigInt(parameters.fieldHpTailDenominator) ** tail);
      expect(fieldMonsterMaxHp(index)).toBe(field);
      expect(monsterMaxHp(index)).toBe(original);
      expect(fieldMonsterMaxHp(index)).toBe(field); // distinct caches must not reuse the other curve
      expect(monsterForIndex(index).maxHp).toBe(field * (index % 8 === 7 ? 5n : 1n));
      const base = original / 20n;
      expect(companionPower({ id: 'c1', speciesId: 'slime', bossIndex: index, level: 250, stars: 2 }))
        .toBe((base < 1n ? 1n : base) * 1000n);
    }
    for (const level of [1, 4, 18, 26, 100]) {
      expect(xpToNext(level)).toBe(Math.floor(parameters.xpBase * parameters.xpGrowth ** (level - 1)));
    }
    expect([0, 7, 23].map(xpReward)).toEqual([5, 26, 74]);
  });

  it.each([0, 1, 2, 3, 10, 11, 12])('opens new offers at the registered level for reincarnation %s and preserves them after restart', (reincarnations) => {
    const level = heroRequiredLevel(reincarnations);
    const hero = { ...newHeroProgress(), reincarnations };
    const locked = createEngine({ ...DEFAULT_SAVE, level: level - 1, hero }, mulberry32(10001));
    const before = locked.toSave();
    locked.apply({ type: 'heroOffer' });
    expect(locked.toSave()).toEqual(before);
    const ready = createEngine({ ...DEFAULT_SAVE, level, hero }, mulberry32(10001));
    ready.apply({ type: 'heroOffer' });
    expect(ready.toSave().hero?.choices).toHaveLength(3);
    expect(ready.toSave().hero?.offerLevel).toBe(level);
    const resumed = createEngine(parseSave(serializeSave(ready.toSave())), mulberry32(10002));
    expect(resumed.toSave()).toEqual(ready.toSave());
    expect(heroReadiness(level, resumed.getState().hero).status).toBe('ready');
    expect(level).toBeLessThanOrEqual(HERO_MIN_LEVEL + 6);
  });

  it.each([12, 18, 26, Number.MAX_SAFE_INTEGER])('preserves the exact existing offer level %s without a new upper clamp', (offerLevel) => {
    const raw = { ...DEFAULT_SAVE, level: offerLevel, hero: { ...newHeroProgress(), reincarnations: 11,
      offerSerial: 7, offerLevel, choices: pendingChoices() } };
    const loaded = parseSave(JSON.stringify(raw));
    const restored = createEngine(parseSave(serializeSave(loaded)), mulberry32(10001));
    expect(restored.toSave().hero?.offerLevel).toBe(offerLevel);
    expect(restored.toSave().hero?.choices).toEqual(raw.hero.choices);
    expect(heroReadiness(offerLevel - 1, restored.getState().hero)).toMatchObject({ status: 'level', requiredLevel: offerLevel });
    expect(heroReadiness(offerLevel, restored.getState().hero).status).toBe('ready');
    expect(heroReadiness(offerLevel, { ...restored.getState().hero!, choices: [] }).requiredLevel).toBe(HERO_MIN_LEVEL + 6);
  });

  it.each([undefined, null, -1, 11, 12.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '26'])('uses legacy level12 for an absent or invalid offer marker %s', (offerLevel) => {
    expect(parseHeroProgress({ ...newHeroProgress(), choices: pendingChoices(), offerLevel })?.offerLevel).toBe(12);
  });
});

describe('v0.7 actual content eligibility and old open offers', () => {
  it.each([
    { id: 'crownwyrm', kind: 'monster', threshold: 3, set: (state: GameState, n: number) => { state.progress!.speciesKills.dragon = n; } },
    { id: 'rootcolossus', kind: 'monster', threshold: 3, set: (state: GameState, n: number) => { state.hero!.reincarnations = n; } },
    { id: 'h58', kind: 'hero', threshold: 1500, set: (state: GameState, n: number) => { state.killCount = n; } },
    { id: 'h62', kind: 'hero', threshold: 6000, set: (state: GameState, n: number) => { state.killCount = n; } },
    { id: 'starvoid', kind: 'monster', threshold: 16000, set: (state: GameState, n: number) => { state.killCount = n; } },
    { id: 'h70', kind: 'hero', threshold: 30000, set: (state: GameState, n: number) => { state.killCount = n; } },
  ])('opens $id at its exact registered performance threshold, independent of action readiness', ({ id, kind, threshold, set }) => {
    const state = { ...createEngine(progressedSave(), mulberry32(10001)).getState() };
    state.level = 1;
    state.hero!.restRemainingMs = HERO_REST_MS;
    const eligible = () => kind === 'hero' ? eligibleHeroIds(state) : eligibleMonsterIds(state);
    set(state, threshold - 1);
    expect(eligible()).not.toContain(id);
    set(state, threshold);
    expect(eligible()).toContain(id);
  });

  it('shares selectors with real offer rolls and preserves the six-draw contract', () => {
    const state = createEngine(progressedSave(), mulberry32(10001)).getState();
    const eligible = eligibleHeroIds(state);
    for (let seed = 10001; seed <= 10020; seed++) {
      const rng = mulberry32(seed);
      let draws = 0;
      const choices = rollHeroChoices(state.hero!, { next: () => { draws++; return rng.next(); } }, discoveryContext(state));
      expect(draws).toBe(6);
      expect(choices).toHaveLength(3);
      expect(new Set(choices.map(({ formId }) => heroForm(formId)!.type)).size).toBe(3);
      for (const choice of choices) expect(eligible).toContain(choice.formId);
    }
    expect(eligibleMonsterIds(state)).toEqual([
      ...COMMON_SPECIES_IDS, ...eligibleRareMonsters(discoveryContext(state)).map(({ id }) => id),
    ]);
  });

  it.each(['h58', 'h62', 'h70'])('keeps a valid old %s offer once, while excluding it from new rolls until the new requirement is met', (id) => {
    for (const marker of [undefined, 12, 18]) {
      const save = progressedSave();
      save.killCount = 200;
      save.level = marker ?? 12;
      save.hero = { ...save.hero!, choices: pendingChoices(id), offerSerial: 7,
        ...(marker === undefined ? {} : { offerLevel: marker }) };
      const loaded = parseSave(JSON.stringify(save));
      const engine = createEngine(parseSave(serializeSave(loaded)), mulberry32(10001));
      const state = engine.getState();
      expect(state.hero?.choices).toEqual(save.hero.choices);
      expect(state.hero?.offerLevel).toBe(marker ?? 12);
      expect(eligibleHeroIds(state)).not.toContain(id);
      for (let seed = 10001; seed <= 10020; seed++) {
        expect(rollHeroChoices(state.hero!, mulberry32(seed), discoveryContext(state)).map(({ formId }) => formId)).not.toContain(id);
      }
      engine.apply({ type: 'heroChoose', formId: id, offerSerial: 7 });
      expect(engine.getState().hero?.equipped.formId).toBe(id);
      expect(engine.getState().hero?.reincarnations).toBe(11);
      expect(engine.getState().hero?.choices).toEqual([]);
    }
  });

  it('does not extend the old recipe exemption to new markers, unmet original rules, or unchanged content', () => {
    const state = { ...createEngine(progressedSave(), mulberry32(10001)).getState() };
    state.killCount = 200;
    for (const id of ['h58', 'h62', 'h70']) {
      const choices = pendingChoices(id);
      expect(parseHeroProgress({ ...state.hero, choices, offerLevel: 19 }, discoveryContext(state))?.choices).toEqual([]);
      const absent = newProgress();
      expect(parseHeroProgress({ ...state.hero, choices, offerLevel: 12 },
        discoveryContext({ killCount: 0, hero: newHeroProgress(), progress: absent }))?.choices).toEqual([]);
    }
    for (const id of ['h52', 'h53']) {
      const hero: HeroProgress = { ...newHeroProgress(), choices: pendingChoices(id), offerLevel: 12 };
      expect(parseHeroProgress(hero, discoveryContext({ killCount: 0, progress: newProgress(), hero }))?.choices).toEqual([]);
    }
    const before = newProgress(); before.playTimeMs = 300_000;
    const context = discoveryContext({ killCount: 30, progress: before });
    expect(eligibleRareMonsters(context).map(({ id }) => id)).not.toContain('dawnfinch');
    expect(eligibleRareMonsters({ ...context, playTimeMs: 0 }).map(({ id }) => id)).toContain('dawnfinch');
  });
});


describe('v0.7 early-capture permanent allocation interval', () => {
  type Core = typeof import('../src/core/index.js');
  type CaptureParameters = Pick<ProgressionParameters, 'firstCaptureBossIndex' | 'earlyCaptureCount'>;
  // Unit fixtures only: preserve every frozen production parameter except the
  // two capture fields, and import the actual engine/save/collection/hero graph.
  const withCaptureParameters = async (parameters: CaptureParameters, check: (core: Core) => void): Promise<void> => {
    vi.resetModules();
    vi.doMock('../src/core/progression.js', () => ({
      PROGRESSION_PARAMETERS: Object.freeze({ ...PROGRESSION_PARAMETERS, ...parameters }),
    }));
    try {
      const core = await import('../src/core/index.js');
      expect(core.PROGRESSION_PARAMETERS).toEqual({ ...PROGRESSION_PARAMETERS, ...parameters });
      expect(Object.isFrozen(core.PROGRESSION_PARAMETERS)).toBe(true);
      check(core);
    } finally {
      vi.doUnmock('../src/core/progression.js');
      vi.resetModules();
    }
  };
  const companion = (id: string, level = 1) => ({ id, speciesId: 'bat', bossIndex: 7, level, stars: 0 });
  const roster = () => Array.from({ length: 5 }, (_, index) => companion(`c${index + 1}`));
  const attempt = (core: Pick<Core, 'createEngine' | 'DEFAULT_SAVE'>, index: number, nextCompanionId: number,
    patch: Partial<SaveFile> = {}, captureDraw = 0.5) => {
    let draws = 0;
    const values = [0.5, 0.5, captureDraw, 0.5];
    const engine = core.createEngine({ ...core.DEFAULT_SAVE, ...patch, monsterIndex: index,
      monsterSpeciesId: 'bat', monsterHp: '1', nextCompanionId }, {
      next: () => { const value = values[draws] ?? 0.5; draws++; return value; },
    });
    expect(draws).toBe(0); // Restoring an explicit species never consumes a spawn draw.
    const events = engine.attack('keyboard');
    expect(events.filter(event => event.type === 'monsterKilled')).toHaveLength(1);
    return { engine, events, draws };
  };
  const captured = (events: ReturnType<ReturnType<Core['createEngine']>['attack']>) =>
    events.filter(event => event.type === 'bossCaptured');

  it('executes the actual registered production guarantee in addition to the unchanged21-key binding', () => {
    const table = new Map<string, readonly number[]>([
      ['null/1', [0, 0]], ['63/1', [1, 0]], ['63/5', [1, 1]],
    ]);
    const expected = table.get(`${PROGRESSION_PARAMETERS.firstCaptureBossIndex}/${PROGRESSION_PARAMETERS.earlyCaptureCount}`);
    expect(expected).toBeDefined();
    for (const [position, counter] of [1, 2].entries()) {
      const result = attempt({ createEngine, DEFAULT_SAVE }, 63, counter);
      expect(captured(result.events)).toHaveLength(expected![position]!);
      expect(result.engine.getState().nextCompanionId).toBe(counter + expected![position]!);
      expect(result.draws).toBe(4);
    }
  });

  it.each([1, 5])('uses permanent counter boundaries with count%s, independent of empty roster length', async earlyCaptureCount => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount }, core => {
      const expected = earlyCaptureCount === 1 ? [1, 0, 0, 0] : [1, 1, 1, 0];
      for (const [position, counter] of [1, 4, 5, 6].entries()) {
        const { engine, events, draws } = attempt(core, 63, counter);
        const count = expected[position]!;
        expect(captured(events)).toHaveLength(count);
        expect(engine.getState().nextCompanionId).toBe(counter + count);
        expect(engine.getState().companions).toEqual(count ? [{
          id: `c${counter}`, speciesId: 'bat', bossIndex: 63, level: 1, stars: 0,
        }] : []);
        expect(draws).toBe(4);
      }
    });
  });

  it('limits guarantees to eligible bosses at63 or deeper and keeps null disabled', async () => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount: 5 }, core => {
      for (const [index, count, drawCount] of [[55, 0, 4], [62, 0, 3], [63, 1, 4], [64, 0, 3], [71, 1, 4]]) {
        const result = attempt(core, index!, 1);
        expect(captured(result.events)).toHaveLength(count!);
        expect(result.engine.getState().nextCompanionId).toBe(1 + count!);
        expect(result.draws).toBe(drawCount!);
      }
    });
    await withCaptureParameters({ firstCaptureBossIndex: null, earlyCaptureCount: 5 }, core => {
      const result = attempt(core, 63, 1);
      expect(captured(result.events)).toHaveLength(0);
      expect(result.engine.getState().nextCompanionId).toBe(1);
      expect(result.draws).toBe(4);
    });
  });

  it('preserves strict35-percent normal draws and one capture when both branches succeed', async () => {
    for (const firstCaptureBossIndex of [null, 63]) {
      await withCaptureParameters({ firstCaptureBossIndex, earlyCaptureCount: 5 }, core => {
        for (const [draw, expected] of [[0.349999, 1], [0.35, 0]]) {
          const result = attempt(core, 63, 6, {}, draw!);
          expect(captured(result.events)).toHaveLength(expected!);
          expect(result.engine.getState().nextCompanionId).toBe(6 + expected!);
          expect(result.draws).toBe(4);
        }
      });
    }
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount: 5 }, core => {
      for (const draw of [0, 0.5]) {
        const result = attempt(core, 63, 5, {}, draw);
        expect(captured(result.events)).toHaveLength(1);
        expect(result.engine.getState().companions).toEqual([
          { id: 'c5', speciesId: 'bat', bossIndex: 63, level: 1, stars: 0 },
        ]);
        expect(result.engine.getState().nextCompanionId).toBe(6);
        expect(result.draws).toBe(4);
      }
    });
  });

  it.each([1, 5])('never guarantees a release or soul with full30 and a low counter under count%s', async earlyCaptureCount => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount }, core => {
      const companions = Array.from({ length: 30 }, (_, index) => companion(`c${index + 1}`));
      for (const [draw, releases] of [[0.5, 0], [0, 1]]) {
        // Deliberately do not parse this boundary fixture: parse would raise counter to31.
        const { engine, events, draws } = attempt(core, 63, 1,
          { companions, releasedCount: 1, souls: 7 }, draw!);
        expect(captured(events)).toHaveLength(0);
        expect(events.filter(event => event.type === 'companionReleased')).toHaveLength(releases!);
        expect(engine.getState()).toMatchObject({ companions, nextCompanionId: 1,
          releasedCount: 1 + releases!, souls: 7 + releases! });
        expect(draws).toBe(4);
      }
    });
  });

  it('keeps exhausted quota through real consume and sacrifice actions, then save and restart', async () => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount: 5 }, core => {
      const engine = core.createEngine({ ...core.DEFAULT_SAVE, companions: roster(), nextCompanionId: 6 }, core.mulberry32(10001));
      engine.apply({ type: 'consume', targetId: 'c1', foodId: 'c2' });
      expect(engine.getState().companions).toEqual([companion('c1', 2), companion('c3'), companion('c4'), companion('c5')]);
      expect(engine.getState().nextCompanionId).toBe(6);
      engine.apply({ type: 'sacrifice', id: 'c3' });
      expect(engine.getState().companions).toEqual([companion('c1', 2), companion('c4'), companion('c5')]);
      expect(engine.getState().souls).toBe(1);
      expect(engine.getState().nextCompanionId).toBe(6);
      const saved = core.parseSave(core.serializeSave(engine.toSave()));
      expect(saved.nextCompanionId).toBe(6);
      const resumed = attempt(core, 71, saved.nextCompanionId, saved);
      expect(captured(resumed.events)).toHaveLength(0);
      expect(resumed.engine.getState().companions).toEqual(saved.companions);
      expect(resumed.engine.getState().nextCompanionId).toBe(6);
      expect(resumed.draws).toBe(4);
    });
  });

  it('keeps exhausted quota through real companion and hero reincarnations', async () => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount: 5 }, core => {
      const companions = [companion('c1', 10), ...roster().slice(1)];
      const engine = core.createEngine({ ...core.DEFAULT_SAVE, level: core.HERO_MIN_LEVEL,
        hero: core.newHeroProgress(), companions, nextCompanionId: 6 }, core.mulberry32(10001));
      engine.apply({ type: 'reincarnate', id: 'c1', expected: companions[0]! });
      expect(engine.getState().companions[0]).toEqual({ ...companion('c1'), stars: 1 });
      expect(engine.getState().nextCompanionId).toBe(6);
      engine.apply({ type: 'heroOffer' });
      const offered = engine.getState().hero!;
      expect(offered.choices).toHaveLength(3);
      engine.apply({ type: 'heroChoose', formId: offered.choices[0]!.formId, offerSerial: offered.offerSerial });
      expect(engine.getState()).toMatchObject({ level: 1, nextCompanionId: 6,
        hero: { reincarnations: 1, choices: [] } });
      expect(engine.getState().companions.map(c => c.id)).toEqual(companions.map(c => c.id));
      const saved = core.parseSave(core.serializeSave(engine.toSave()));
      expect(saved.nextCompanionId).toBe(6);
      // Returning to a deep1HP boss is a unit fixture, not natural progression evidence.
      const resumed = attempt(core, 71, saved.nextCompanionId, saved);
      expect(captured(resumed.events)).toHaveLength(0);
      expect(resumed.engine.getState().companions).toEqual(saved.companions);
      expect(resumed.engine.getState().nextCompanionId).toBe(6);
      expect(resumed.draws).toBe(4);
    });
  });

  it.each(['addCompanion', 'pvpResult'] as const)('lets actual external %s allocations consume quota without reminting IDs', async type => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount: 5 }, core => {
      const engine = core.createEngine(core.DEFAULT_SAVE, core.mulberry32(10001));
      // Digit-free server IDs isolate external allocation from parseSave's ID repair.
      const ids = ['a', 'b', 'c', 'd', 'e'].map(suffix => `${type === 'addCompanion' ? 'r' : 's'}${suffix}`);
      for (const [index, id] of ids.entries()) {
        const incoming = companion(id);
        engine.apply(type === 'addCompanion' ? { type, companion: incoming }
          : { type, won: true, stolen: incoming, lostId: null });
        expect(engine.getState().companions.map(c => c.id)).toEqual(ids.slice(0, index + 1));
        expect(engine.getState().nextCompanionId).toBe(index + 2);
      }
      engine.apply({ type: 'removeCompanions', ids });
      expect(engine.getState().companions).toEqual([]);
      expect(engine.getState().nextCompanionId).toBe(6);
      const saved = core.parseSave(core.serializeSave(engine.toSave()));
      expect(saved.nextCompanionId).toBe(6);
      const resumed = attempt(core, 63, saved.nextCompanionId, saved);
      expect(captured(resumed.events)).toHaveLength(0);
      expect(resumed.engine.getState().nextCompanionId).toBe(6);
      expect(resumed.draws).toBe(4);
    });
  });

  it('does not reconstruct natural capture history after legacy ID repair or allocator exhaustion', async () => {
    await withCaptureParameters({ firstCaptureBossIndex: 63, earlyCaptureCount: 5 }, core => {
      for (const [id, counter] of [['c5', 6], ['r9007199254740992', Number.MAX_SAFE_INTEGER]] as const) {
        const saved = core.parseSave({ ...core.DEFAULT_SAVE, companions: [companion(id)], nextCompanionId: 1 });
        expect(saved.nextCompanionId).toBe(counter);
        expect(saved.companions[0]!.id).toBe(id);
        const engine = core.createEngine(saved, core.mulberry32(10001));
        engine.apply({ type: 'removeCompanions', ids: [id] });
        expect(engine.getState().companions).toEqual([]);
        const restored = core.parseSave(core.serializeSave(engine.toSave()));
        expect(restored.nextCompanionId).toBe(counter);
        const resumed = attempt(core, 63, restored.nextCompanionId, restored);
        expect(captured(resumed.events)).toHaveLength(0);
        expect(resumed.engine.getState().nextCompanionId).toBe(counter);
        expect(resumed.draws).toBe(4);
      }
    });
  });
});
