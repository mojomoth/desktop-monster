import { describe, expect, it } from 'vitest';
import { acquiredDiscoveries, createEngine, DEFAULT_SAVE, heroRequiredLevel, migrateProgress, mulberry32,
  newHeroProgress, newProgress, parseSave, serializeSave } from '../src/core/index.js';
import type { SaveFile } from '../src/core/index.js';

const record = { number: 1, formId: 'h02', level: 18, playTimeMs: 10, buffPercent: 10, stacks: 0 };
const restart = (save: SaveFile) => createEngine(parseSave(serializeSave(save)), mulberry32(7));
const unread = (save: SaveFile) => {
  const progress = migrateProgress(save);
  const acquired = acquiredDiscoveries({ ...save, progress });
  return { heroes: acquired.heroes.filter((id) => !progress.codex!.acknowledgedHeroes.includes(id)),
    monsters: acquired.monsters.filter((id) => !progress.codex!.acknowledgedMonsters.includes(id)) };
};

describe('v0.7 acquisition and legacy codex boundary', () => {
  it('discloses only positive hero choice counts, actual history or permanent collection, and actual species kills', () => {
    const progress = { ...newProgress(), heroCounts: { h01: 1, h04: 0, h05: -1, h06: .5, h07: Infinity },
      speciesKills: { slime: 1, bat: 0, ghost: -1, dragon: .5 }, reincarnationHistory: [record],
      seenHeroes: ['h11'], seenMonsters: ['dragon'] };
    const hero = { ...newHeroProgress(), equipped: { formId: 'h12', buffPercent: 10 },
      choices: [{ formId: 'h11', buffPercent: 10 }], collection: [{ formId: 'h03', buffPercent: 10 }] };
    expect(acquiredDiscoveries({ ...DEFAULT_SAVE, killCount: 9999, hero, progress,
      monsterSpeciesId: 'dragon', companions: [{ speciesId: 'dragon' }] }))
      .toEqual({ heroes: ['h01', 'h02', 'h03'], monsters: ['slime'] });
  });

  it('preserves collection-only hero ACK through serialization and repeated engine boots without inferring monster kills', () => {
    let save: SaveFile = { ...DEFAULT_SAVE, killCount: 400, monsterSpeciesId: 'slime',
      hero: { ...newHeroProgress(), collection: [{ formId: 'h01', buffPercent: 10 }] },
      companions: [{ id: 's7', speciesId: 'dragon', bossIndex: 7, level: 250, stars: 0 }],
      progress: { ...newProgress(), codex: { acknowledgedHeroes: ['h01', 'h11'],
        acknowledgedMonsters: ['slime', 'dragon'], goal: { kind: 'monster', id: 'dragon' } } } };
    for (let i = 0; i < 3; i++) {
      save = restart(save).toSave();
      expect(acquiredDiscoveries(save)).toEqual({ heroes: ['h01'], monsters: [] });
      expect(save.progress!.codex).toEqual({ acknowledgedHeroes: ['h01'], acknowledgedMonsters: [],
        goal: { kind: 'monster', id: 'dragon' } });
      expect(save.progress!.speciesKills).toEqual({});
      expect(save.killCount).toBe(400);
      expect(save.companions).toHaveLength(1);
      expect(unread(save)).toEqual({ heroes: [], monsters: [] });
    }
  });

  it('removes legacy seen-only ACK and makes later actual hero choice and monster kill unread', () => {
    const save: SaveFile = { ...DEFAULT_SAVE, level: heroRequiredLevel(0), monsterSpeciesId: 'slime', monsterHp: '1',
      hero: { ...newHeroProgress(), choices: [
        { formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 11 }, { formId: 'h03', buffPercent: 12 }],
      offerSerial: 4, offerLevel: heroRequiredLevel(0) }, progress: { ...newProgress(),
        seenHeroes: ['h01', 'h02', 'h03'], seenMonsters: ['slime'],
        codex: { acknowledgedHeroes: ['h01', 'h02', 'h03'], acknowledgedMonsters: ['slime'], goal: null } } };
    const engine = restart(save);
    expect(acquiredDiscoveries(engine.toSave())).toEqual({ heroes: [], monsters: [] });
    expect(engine.getState().progress!.codex).toEqual({ acknowledgedHeroes: [], acknowledgedMonsters: [], goal: null });
    engine.apply({ type: 'acknowledgeDiscoveries', heroes: ['h01', 'h02'], monsters: ['slime'] });
    engine.attack('keyboard');
    engine.apply({ type: 'heroChoose', formId: 'h01', offerSerial: 4 });
    expect(unread(engine.toSave())).toEqual({ heroes: ['h01'], monsters: ['slime'] });
    expect(unread(restart(engine.toSave()).toSave())).toEqual({ heroes: ['h01'], monsters: ['slime'] });
    engine.apply({ type: 'acknowledgeDiscoveries', heroes: ['h01'], monsters: ['slime'] });
    expect(unread(restart(engine.toSave()).toSave())).toEqual({ heroes: [], monsters: [] });
  });

  it('baselines a save without codex using proven acquisitions while retaining offer/spawn history', () => {
    const progress = { ...newProgress(), heroCounts: { h01: 1 }, speciesKills: { slime: 2 },
      reincarnationHistory: [record], seenHeroes: ['h11'], seenMonsters: ['dragon'] };
    delete progress.codex;
    const save: SaveFile = { ...DEFAULT_SAVE, progress, monsterSpeciesId: 'dragon',
      hero: { ...newHeroProgress(), collection: [{ formId: 'h03', buffPercent: 10 }] } };
    const migrated = restart(save).toSave();
    expect(migrated.progress!.codex).toEqual({ acknowledgedHeroes: ['h01', 'h02', 'h03'],
      acknowledgedMonsters: ['slime'], goal: null });
    expect(migrated.progress!.seenHeroes).toContain('h11');
    expect(migrated.progress!.seenMonsters).toContain('dragon');
    expect(restart(migrated).toSave()).toEqual(migrated);
  });

  it('acknowledges a displayed acquisition snapshot without hiding later or unacquired entries', () => {
    const save: SaveFile = { ...DEFAULT_SAVE, progress: { ...newProgress(),
      heroCounts: { h01: 1, h02: 1 }, speciesKills: { slime: 1, ghost: 1 } } };
    const engine = restart(save);
    engine.apply({ type: 'acknowledgeDiscoveries', heroes: ['h01', 'h70'], monsters: ['slime', 'starvoid'] });
    expect(unread(engine.toSave())).toEqual({ heroes: ['h02'], monsters: ['ghost'] });
    expect(engine.getState().progress!.codex).toEqual({ acknowledgedHeroes: ['h01'], acknowledgedMonsters: ['slime'], goal: null });
    expect(save.progress!.codex!.acknowledgedHeroes).toEqual([]);
  });
});
