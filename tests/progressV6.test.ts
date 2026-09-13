import { describe, expect, it } from 'vitest';
import { acquiredDiscoveries, applyCollection, conditionStatus, createEngine, DEFAULT_SAVE, discoveryContext, FIELD_PHASE_MS,
  heroRequiredLevel, isDiscoveryAction, migrateProgress, mulberry32, newHeroProgress, newProgress, parseProgress, parseSave,
  rareMonster, serializeSave } from '../src/core/index.js';
import type { CollectionAction, Progress, SaveFile } from '../src/core/index.js';

const legacyHero = () => ({ ...newHeroProgress(), reincarnations: 8,
  collection: [{ formId: 'h01', buffPercent: 25 }], equipped: { formId: 'h01', buffPercent: 25 },
  choices: [{ formId: 'h11', buffPercent: 10 }, { formId: 'h12', buffPercent: 12 }, { formId: 'h13', buffPercent: 14 }] });
const legacySave = (): SaveFile => ({ ...DEFAULT_SAVE, level: 12, killCount: 400, coins: 1234, souls: 9,
  monsterSpeciesId: 'slime', hero: legacyHero(),
  companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 7, stars: 0, level: 1 }] });
const unseen = (progress: Progress) => ({
  heroes: acquiredDiscoveries({ killCount: 0, progress }).heroes.filter((id) => !progress.codex!.acknowledgedHeroes.includes(id)),
  monsters: acquiredDiscoveries({ killCount: 0, progress }).monsters.filter((id) => !progress.codex!.acknowledgedMonsters.includes(id)),
});

describe('v0.6 discovery acknowledgements and a persistent optional goal', () => {
  it('baselines only proven pre-v0.5 acquisitions, keeping current monster and old offers as seen history', () => {
    const saved = legacySave();
    const engine = createEngine(parseSave(serializeSave(saved)), mulberry32(4));
    const progress = engine.getState().progress!;
    expect(unseen(progress)).toEqual({ heroes: [], monsters: [] });
    expect(progress.codex).toEqual({ acknowledgedHeroes: ['h01'], acknowledgedMonsters: [], goal: null });
    expect(progress.seenHeroes).toEqual(['h01', 'h11', 'h12', 'h13']);
    expect(progress.seenMonsters).toEqual(['dragon', 'slime']);
    expect(engine.toSave()).toMatchObject({ level: saved.level, killCount: saved.killCount,
      coins: saved.coins, souls: saved.souls, companions: saved.companions, hero: { collection: saved.hero!.collection } });
  });

  it('baselines existing v0.5 acquisitions once, retaining later unread kills on restart', () => {
    const progress = newProgress();
    delete progress.codex;
    progress.seenHeroes = ['h51']; progress.seenMonsters = ['bat'];
    progress.heroCounts.h51 = 1; progress.speciesKills.bat = 1;
    progress.pvpWins = 3; progress.pvpLosses = 2;
    expect(parseProgress(progress)!.codex).toBeUndefined();
    const engine = createEngine(parseSave({ ...legacySave(), progress }), mulberry32(4));
    expect(unseen(engine.getState().progress!)).toEqual({ heroes: [], monsters: [] });
    const saved = engine.toSave();
    saved.progress!.seenMonsters.push('ghost');
    saved.progress!.speciesKills.ghost = 1;
    const resumed = createEngine(parseSave(serializeSave(saved)), mulberry32(5));
    expect(unseen(resumed.getState().progress!)).toEqual({ heroes: [], monsters: ['ghost'] });
    expect(resumed.getState().progress).toMatchObject({ pvpWins: 3, pvpLosses: 2 });
  });

  it('keeps first spawn hidden, then leaves its first actual kill unread through opening and reloading', () => {
    const engine = createEngine(null, mulberry32(4));
    const first = engine.getState().monster.speciesId;
    expect(unseen(engine.getState().progress!)).toEqual({ heroes: [], monsters: [] });
    for (let i = 0; i < 100 && engine.getState().killCount === 0; i++) engine.attack('keyboard');
    expect(engine.getState().progress!.speciesKills[first]).toBe(1);
    const shown = migrateProgress(engine.toSave());
    expect(unseen(shown)).toEqual({ heroes: [], monsters: [first] });
    expect(unseen(createEngine(parseSave(serializeSave(engine.toSave())), mulberry32(9)).getState().progress!))
      .toEqual({ heroes: [], monsters: [first] });
  });

  it('acknowledges only the displayed snapshot, so concurrent discoveries and future valid IDs remain unread', () => {
    const progress = { ...newProgress(), seenHeroes: ['h01'], seenMonsters: ['slime'], heroCounts: { h01: 1 }, speciesKills: { slime: 1 } };
    const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(0), monsterSpeciesId: 'slime', progress }, mulberry32(8));
    const displayed: CollectionAction = { type: 'acknowledgeDiscoveries', heroes: ['h01'], monsters: ['slime'] };
    engine.apply({ type: 'heroOffer' });
    const newHeroes = engine.getState().progress!.seenHeroes.filter((id) => id !== 'h01');
    expect(newHeroes.length).toBeGreaterThan(0);
    expect(unseen(engine.getState().progress!).heroes).toEqual(['h01']);
    const offered = engine.getState().hero!;
    engine.apply({ type: 'heroChoose', formId: newHeroes[0]!, offerSerial: offered.offerSerial });
    engine.apply(displayed);
    engine.apply(displayed);
    engine.apply({ type: 'acknowledgeDiscoveries', heroes: ['h70'], monsters: ['starvoid'] });
    expect(unseen(engine.getState().progress!)).toEqual({ heroes: [newHeroes[0]], monsters: [] });
    expect(engine.getState().progress!.codex).toEqual({ acknowledgedHeroes: ['h01'], acknowledgedMonsters: ['slime'], goal: null });
    const saved = engine.toSave();
    saved.progress!.seenHeroes.push('h70'); saved.progress!.seenMonsters.push('starvoid');
    saved.progress!.heroCounts.h70 = 1; saved.progress!.speciesKills.starvoid = 1;
    const resumed = createEngine(parseSave(serializeSave(saved)), mulberry32(8));
    expect(unseen(resumed.getState().progress!).heroes).toContain('h70');
    expect(unseen(resumed.getState().progress!).monsters).toEqual(['starvoid']);
  });

  it.each([
    { type: 'acknowledgeDiscoveries', heroes: 'h01', monsters: [] },
    { type: 'acknowledgeDiscoveries', heroes: ['slime'], monsters: [] },
    { type: 'acknowledgeDiscoveries', heroes: [], monsters: ['h01'] },
    { type: 'acknowledgeDiscoveries', heroes: [], monsters: [null] },
    { type: 'setDiscoveryGoal', goal: { kind: 'hero', id: 'slime' } },
    { type: 'setDiscoveryGoal', goal: { kind: 'monster', id: 'h01' } },
    { type: 'setDiscoveryGoal', goal: { kind: 'item', id: 'coin' } },
    { type: 'setDiscoveryGoal' },
  ])('rejects malformed action without state changes: %j', (action) => {
    const engine = createEngine(null, mulberry32(3));
    const before = engine.toSave();
    expect(isDiscoveryAction(action)).toBe(false);
    expect(applyCollection(engine.getState(), action as CollectionAction)).toHaveProperty('error');
    engine.apply(action as CollectionAction);
    expect(engine.toSave()).toEqual(before);
  });

  it('normalizes hostile save acknowledgements to acquisitions and drops invalid goals independently', () => {
    const progress = parseProgress({ ...newProgress(), seenHeroes: ['h01'], seenMonsters: ['slime'], heroCounts: { h01: 1 }, speciesKills: { slime: 1 }, codex: {
      acknowledgedHeroes: ['h01', 'h01', 'h70', 'slime', 1],
      acknowledgedMonsters: ['slime', 'slime', 'starvoid', '__proto__'], goal: { kind: 'hero', id: 'slime' },
    } })!;
    expect(migrateProgress({ ...legacySave(), progress }).codex)
      .toEqual({ acknowledgedHeroes: ['h01'], acknowledgedMonsters: ['slime'], goal: null });
    for (const codex of [null, [], 2, { acknowledgedHeroes: 'h01', acknowledgedMonsters: {}, goal: [] }]) {
      expect(parseSave({ ...legacySave(), progress: { ...newProgress(), codex } }).progress!.codex)
        .toEqual({ acknowledgedHeroes: [], acknowledgedMonsters: [], goal: null });
    }
    expect(parseSave({ ...legacySave(), progress }).coins).toBe(1234);
  });

  it('keeps a free selected goal through phase changes, discovery, acknowledgement, reincarnation and restart', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(0), killCount: 30, coins: 45,
      monsterSpeciesId: 'slime', progress: newProgress() }, mulberry32(10));
    const goal = { kind: 'monster' as const, id: 'dawnfinch' };
    engine.apply({ type: 'setDiscoveryGoal', goal });
    const phaseRequirement = rareMonster(goal.id)!.requirements[0]!;
    expect(conditionStatus(phaseRequirement, discoveryContext(engine.getState())).met).toBe(true);
    engine.tick(FIELD_PHASE_MS);
    expect(conditionStatus(phaseRequirement, discoveryContext(engine.getState())).met).toBe(false);
    expect(engine.getState().progress!.codex!.goal).toEqual(goal);
    expect(engine.getState().coins).toBe(45);
    const saved = engine.toSave(); saved.progress!.seenMonsters.push(goal.id); saved.progress!.speciesKills[goal.id] = 1;
    const resumed = createEngine(parseSave(serializeSave(saved)), mulberry32(11));
    resumed.apply({ type: 'acknowledgeDiscoveries', heroes: [], monsters: [goal.id] });
    resumed.apply({ type: 'heroOffer' });
    const offered = resumed.getState().hero!;
    resumed.apply({ type: 'heroChoose', formId: offered.choices[0]!.formId, offerSerial: offered.offerSerial });
    expect(resumed.getState().hero!.reincarnations).toBe(1);
    expect(resumed.getState().progress!.codex!.goal).toEqual(goal);
    const restarted = createEngine(parseSave(serializeSave(resumed.toSave())), mulberry32(12));
    expect(restarted.getState().progress!.codex).toEqual(resumed.getState().progress!.codex);
    restarted.apply({ type: 'setDiscoveryGoal', goal: { kind: 'hero', id: 'h70' } });
    expect(restarted.getState().progress!.codex!.goal).toEqual({ kind: 'hero', id: 'h70' });
    restarted.apply({ type: 'setDiscoveryGoal', goal: null });
    expect(restarted.getState().progress!.codex!.goal).toBeNull();
  });

  it('deep-copies goal and acknowledgement arrays across actions, snapshots and saves', () => {
    const progress = newProgress();
    progress.speciesKills.slime = 1;
    const engine = createEngine({ ...DEFAULT_SAVE, monsterSpeciesId: 'slime', progress }, mulberry32(2));
    const goal = { kind: 'hero' as const, id: 'h70' };
    engine.apply({ type: 'setDiscoveryGoal', goal });
    engine.apply({ type: 'acknowledgeDiscoveries', heroes: [], monsters: ['slime'] });
    const before = engine.toSave();
    goal.id = 'h01';
    for (const p of [progress, engine.getState().progress!, engine.toSave().progress!]) {
      p.codex!.acknowledgedHeroes.push('h01');
      p.codex!.acknowledgedMonsters.push('ghost');
      if (p.codex!.goal) p.codex!.goal!.id = 'h01';
    }
    expect(engine.toSave()).toEqual(before);
  });
});
