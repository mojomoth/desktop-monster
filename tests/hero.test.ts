import { describe, expect, it } from 'vitest';
import {
  createEngine, DEFAULT_SAVE, HERO_FORMS, HERO_DEFER_MS, HERO_MIN_LEVEL,
  heroAttackPower, heroBuffedPower, heroDamageForLevel, heroForm,
  heroRerollCost, mulberry32, newHeroProgress, parseSave, serializeSave, rollHeroChoices,
  STANDARD_HERO_FORMS, heroReadiness, heroReady, heroRequiredLevel, HERO_MAX_REINCARNATIONS,
} from '../src/core/index.js';
import type { SaveFile } from '../src/core/index.js';

const readySave = (): SaveFile => ({ ...DEFAULT_SAVE, level: HERO_MIN_LEVEL, coins: 1000, monsterIndex: 39, monsterHp: '1',
  companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 31, level: 3, stars: 1 }], pvpParty: ['c1'], nextCompanionId: 2 });
const readyEngine = () => createEngine(readySave(), mulberry32(4));

describe('v0.4 hero growth, collection and persistent choices', () => {
  it('shares actual offer, level, wait and maximum gates with its display status', () => {
    for (const reincarnations of [0, 1, 11]) {
      const hero = { ...newHeroProgress(), reincarnations };
      const requiredLevel = heroRequiredLevel(reincarnations);
      expect(heroReadiness(requiredLevel - 1, hero)).toEqual({ status: 'level', requiredLevel, remainingMs: 0 });
      expect(heroReady(requiredLevel - 1, hero)).toBe(false);
      expect(heroReadiness(requiredLevel, hero).status).toBe('ready');
      expect(heroReady(requiredLevel, hero)).toBe(true);
      for (const wait of ['restRemainingMs', 'deferRemainingMs'] as const) {
        expect(heroReadiness(requiredLevel, { ...hero, [wait]: 1 }))
          .toMatchObject({ status: wait === 'restRemainingMs' ? 'rest' : 'defer', remainingMs: 1 });
        expect(heroReady(requiredLevel, { ...hero, [wait]: 1 })).toBe(false);
        expect(heroReady(requiredLevel, { ...hero, [wait]: 0 })).toBe(true);
      }
    }
    const old = { ...newHeroProgress(), reincarnations: 11, offerLevel: 12,
      choices: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 10 }, { formId: 'h03', buffPercent: 10 }] };
    expect(heroReadiness(12, old)).toEqual({ status: 'ready', requiredLevel: 12, remainingMs: 0 });
    expect(heroReadiness(12, { ...old, choices: [] })).toEqual({ status: 'level', requiredLevel: heroRequiredLevel(11), remainingMs: 0 });
    expect(heroReadiness(100, { ...old, reincarnations: HERO_MAX_REINCARNATIONS, restRemainingMs: 1 }).status).toBe('capped');
    expect(heroReady(100, { ...old, reincarnations: HERO_MAX_REINCARNATIONS })).toBe(false);
    expect(heroReadiness(18, { ...old, restRemainingMs: 1, deferRemainingMs: 2 }))
      .toMatchObject({ status: 'rest', remainingMs: 1 });
  });
  it('gives every level a strictly larger hit and accelerates beyond the old linear curve', () => {
    expect(heroDamageForLevel(1)).toBe(1n);
    expect(heroDamageForLevel(2)).toBe(2n);
    expect(heroDamageForLevel(10)).toBe(74n);
    for (let level = 2; level <= 100; level++) expect(heroDamageForLevel(level)).toBeGreaterThan(heroDamageForLevel(level - 1));
    expect(heroAttackPower(10, 2, 4)).toBe(444n);
    const engine = createEngine({ ...DEFAULT_SAVE, level: 10 }, { next: () => .99 });
    expect(engine.attack('keyboard')[0]).toMatchObject({ type: 'attack', damage: 74n });
  });
  it('preserves the 50 standard identities across five visual ranks and adds 20 rare identities', () => {
    expect(STANDARD_HERO_FORMS).toHaveLength(50);
    expect(HERO_FORMS).toHaveLength(70);
    expect(new Set(HERO_FORMS.map((f) => f.id)).size).toBe(70);
    expect(HERO_FORMS.filter((f) => f.rarity === 'rare')).toHaveLength(20);
    for (let rank = 1; rank <= 5; rank++) {
      const forms = STANDARD_HERO_FORMS.filter((f) => f.rank === rank);
      expect(forms).toHaveLength(10);
      expect(new Set(forms.map((f) => f.type)).size).toBe(5);
      expect(forms.filter((f) => f.buff === 'element')).toHaveLength(5);
    }
  });
  it('samples bounded random rolls, all 50 forms and three real elemental alternatives', () => {
    const rng = mulberry32(404);
    const hero = { ...newHeroProgress(), reincarnations: 4 };
    const seen = new Set<string>();
    const values: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const choices = rollHeroChoices(hero, rng);
      expect(new Set(choices.map((r) => heroForm(r.formId)!.type)).size).toBe(3);
      expect(heroForm(choices[0]!.formId)!.rank).toBe(5);
      for (const roll of choices) { seen.add(roll.formId); values.push(roll.buffPercent); }
    }
    expect(seen.size).toBe(50);
    expect(Math.min(...values)).toBe(10);
    expect(Math.max(...values)).toBe(25);
    const mean = values.reduce((sum, x) => sum + x, 0) / values.length;
    expect(mean).toBeGreaterThan(17.2);
    expect(mean).toBeLessThan(17.8);
  });
  it('bounds mature one-shot parties to one successful reincarnation per two minutes', () => {
    const companions = ['slime', 'bat', 'ghost', 'golem', 'dragon'].map((speciesId, i) => ({ id: `c${i + 1}`, speciesId,
      bossIndex: 80, level: 10, stars: 3 }));
    const engine = createEngine({ ...DEFAULT_SAVE, level: HERO_MIN_LEVEL, companions, nextCompanionId: 6 }, mulberry32(12345));
    const times: number[] = [];
    for (let sec = 0; sec <= 360; sec++) {
      if (sec > 0) engine.tick(1000);
      engine.apply({ type: 'heroOffer' });
      const hero = engine.getState().hero;
      if (hero?.choices.length) {
        engine.apply({ type: 'heroChoose', formId: hero.choices[0]!.formId, offerSerial: hero.offerSerial });
        times.push(sec);
      }
    }
    expect(times).toEqual([0, 120, 240, 360]);
  });
  it('requires the unlock, rolls 3 different elements and persists the exact offer on reload', () => {
    const locked = createEngine({ ...DEFAULT_SAVE, level: HERO_MIN_LEVEL - 1 }, mulberry32(4));
    locked.apply({ type: 'heroOffer' });
    expect(locked.getState().hero).toBeUndefined();
    const engine = readyEngine();
    engine.apply({ type: 'heroOffer' });
    const offered = engine.toSave();
    expect(offered.hero?.choices).toHaveLength(3);
    expect(new Set(offered.hero?.choices.map((c) => heroForm(c.formId)?.type)).size).toBe(3);
    const resumed = createEngine(parseSave(serializeSave(offered)), mulberry32(987));
    resumed.apply({ type: 'heroOffer' });
    expect(resumed.toSave()).toEqual(offered);
    for (const c of offered.hero!.choices) expect(c.buffPercent).toBeGreaterThanOrEqual(10);
  });
  it('spends exactly once on a current offer, refuses insufficient gold and stale double clicks', () => {
    const engine = readyEngine();
    engine.apply({ type: 'heroOffer' });
    const offered = engine.toSave().hero!;
    engine.apply({ type: 'heroReroll', offerSerial: offered.offerSerial });
    expect(engine.getState().coins).toBe(1000 - heroRerollCost(0));
    const rerolled = engine.toSave();
    engine.apply({ type: 'heroReroll', offerSerial: offered.offerSerial });
    engine.apply({ type: 'heroChoose', formId: offered.choices[0]!.formId, offerSerial: offered.offerSerial });
    expect(engine.toSave()).toEqual(rerolled);
    const poor = createEngine({ ...rerolled, coins: 49 }, mulberry32(7));
    const before = poor.toSave();
    poor.apply({ type: 'heroReroll', offerSerial: rerolled.hero!.offerSerial });
    expect(poor.toSave()).toEqual(before);
  });
  it('deferring preserves progress and enables a free new opportunity after 30 injected seconds, including reload', () => {
    const engine = createEngine({ ...readySave(), companions: [], pvpParty: [] }, mulberry32(4));
    engine.apply({ type: 'heroOffer' });
    engine.apply({ type: 'heroDefer', offerSerial: engine.getState().hero!.offerSerial });
    expect(engine.getState()).toMatchObject({ level: HERO_MIN_LEVEL, coins: 1000, hero: { choices: [], deferRemainingMs: HERO_DEFER_MS } });
    engine.tick(17.5);
    const resumed = createEngine(parseSave(serializeSave(engine.toSave())), mulberry32(9));
    resumed.apply({ type: 'heroOffer' });
    expect(resumed.getState().hero!.choices).toHaveLength(0);
    resumed.tick(29_982);
    expect(resumed.getState().hero!.choices).toHaveLength(0);
    expect(resumed.tick(1)).toContainEqual({ type: 'heroReady' });
    resumed.apply({ type: 'heroOffer' });
    expect(resumed.getState().hero!.choices).toHaveLength(3);
    expect(resumed.getState().coins).toBe(1000);
  });
  it('only acceptance resets the run, retains possessions, equips and raises the next visual rank', () => {
    const engine = readyEngine();
    engine.apply({ type: 'heroOffer' });
    const before = engine.toSave();
    const choice = before.hero!.choices[0]!;
    engine.apply({ type: 'heroChoose', formId: 'h50', offerSerial: before.hero!.offerSerial });
    expect(engine.toSave()).toEqual(before);
    expect(engine.apply({ type: 'heroChoose', formId: choice.formId, offerSerial: before.hero!.offerSerial })).toContainEqual({ type: 'rebirth', souls: 4 });
    const accepted = engine.toSave();
    expect(accepted).toMatchObject({ level: 1, xp: 0, monsterIndex: 0, coins: before.coins, companions: before.companions,
      pvpParty: before.pvpParty, hero: { equipped: choice, collection: [choice], reincarnations: 1, choices: [] } });
    const next = createEngine({ ...accepted, level: heroRequiredLevel(1), companions: [], pvpParty: [] }, mulberry32(3));
    next.apply({ type: 'heroOffer' });
    expect(next.getState().hero!.choices).toHaveLength(0);
    next.tick(120_000);
    next.apply({ type: 'heroOffer' });
    expect(heroForm(next.getState().hero!.choices[0]!.formId)?.rank).toBe(2);
    const saved = next.toSave();
    saved.hero!.collection[0]!.buffPercent = 999;
    expect(next.getState().hero!.collection[0]!.buffPercent).toBe(choice.buffPercent);
  });
  it('equips only collected skins and keeps their fixed roll without resetting the run', () => {
    const hero = { ...newHeroProgress(), equipped: { formId: 'h01', buffPercent: 10 },
      collection: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h09', buffPercent: 25 }] };
    const engine = createEngine({ ...readySave(), hero }, mulberry32(2));
    engine.apply({ type: 'heroEquip', formId: 'h50' });
    expect(engine.getState().hero!.equipped.formId).toBe('h01');
    engine.apply({ type: 'heroEquip', formId: 'h09' });
    expect(engine.getState()).toMatchObject({ level: HERO_MIN_LEVEL, coins: 1000, hero: { equipped: { formId: 'h09', buffPercent: 25 } } });
  });
  it('retains the best raw roll and adds mastery even when the repeated offer rolls lower', () => {
    const hero = { ...newHeroProgress(), collection: [{ formId: 'h01', buffPercent: 25 }],
      choices: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 15 }, { formId: 'h03', buffPercent: 20 }], offerSerial: 1 };
    const engine = createEngine({ ...readySave(), hero }, mulberry32(2));
    engine.apply({ type: 'heroChoose', formId: 'h01', offerSerial: 1 });
    expect(engine.getState().hero!.equipped).toEqual({ formId: 'h01', buffPercent: 25, stacks: 1 });
    expect(engine.getState().hero!.collection).toHaveLength(1);
  });
  it('specialists and generalists produce different useful parties, without a rarity multiplier', () => {
    expect(heroBuffedPower(100n, 'fire', { formId: 'h01', buffPercent: 25 })).toBe(150n);
    expect(heroBuffedPower(100n, 'water', { formId: 'h01', buffPercent: 25 })).toBe(100n);
    expect(heroBuffedPower(100n, 'water', { formId: 'h06', buffPercent: 25 })).toBe(125n);
    expect(heroBuffedPower(100n, 'fire', { formId: 'h41', buffPercent: 25 })).toBe(150n);
    expect(heroBuffedPower(100n, 'fire', { formId: 'h01', buffPercent: 99 })).toBe(100n);
  });
  it('validates malformed hero fields independently and never changes legacy progress', () => {
    const legacy = readySave();
    expect(parseSave(serializeSave(legacy))).toEqual(legacy);
    const parsed = parseSave({ ...legacy, hero: { equipped: { formId: 'h50', buffPercent: 100 },
      collection: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h01', buffPercent: 25 }, { formId: '__proto__', buffPercent: 10 }],
      choices: [{ formId: 'h50', buffPercent: 20 }], deferRemainingMs: Infinity, reincarnations: -1 } });
    expect(parsed.hero).toMatchObject({ equipped: { formId: 'h00', buffPercent: 0 }, collection: [{ formId: 'h01', buffPercent: 25 }], choices: [], reincarnations: 0, deferRemainingMs: 0 });
    expect(parsed.coins).toBe(legacy.coins);
    expect(parsed.companions).toEqual(legacy.companions);
  });
});
