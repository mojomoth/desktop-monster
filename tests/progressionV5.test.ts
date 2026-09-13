import { describe, expect, it } from 'vitest';
import { createEngine } from '../src/core/engine.js';
import { DEFAULT_SAVE } from '../src/core/save.js';
import type { GameState } from '../src/core/types.js';
import {
  applyHeroAction, HERO_MAX_REINCARNATIONS, HERO_MIN_LEVEL, HERO_REST_MS, HERO_FORMS, STANDARD_HERO_FORMS,
  heroBuffedPower, heroEffectiveBuff, heroForm, heroReady, heroRequiredLevel, isHeroRoll,
  newHeroProgress, parseHeroProgress, projectHeroRoll, rollHeroChoices,
} from '../src/core/hero.js';
import type { HeroProgress, HeroRoll } from '../src/core/hero.js';
import { applyEconomyAction, LURE_CHARGES, lureCost, trainedHeroPower, trainingCost, TRAINING_MAX_LEVEL } from '../src/core/economy.js';
import type { EconomyAction } from '../src/core/economy.js';
import { discoveryContext, newProgress } from '../src/core/progress.js';
import { RARE_HERO_FORMS } from '../src/core/discovery.js';
import { mulberry32 } from '../src/core/rng.js';

const choices = (): HeroRoll[] => [
  { formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 15 }, { formId: 'h03', buffPercent: 20 },
];
const state = (hero?: HeroProgress): GameState => ({
  ...createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(hero?.reincarnations ?? 0), coins: 1000 }, mulberry32(4)).getState(),
  progress: newProgress(), ...(hero ? { hero } : {}),
});

describe('v0.5 reincarnation requirements and persistent offers', () => {
  it('uses the declared exact sequence and keeps the plateau finite', () => {
    expect(Array.from({ length: 15 }, (_, r) => heroRequiredLevel(r)))
      .toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6].map((step) => HERO_MIN_LEVEL + step));
    expect(heroRequiredLevel(500_000)).toBe(HERO_MIN_LEVEL + 6);
    expect(heroRequiredLevel(Number.NaN)).toBe(HERO_MIN_LEVEL);
    expect(heroRequiredLevel(-10)).toBe(HERO_MIN_LEVEL);
    for (let reincarnations = 0; reincarnations < 30; reincarnations++) {
      const hero = { ...newHeroProgress(), reincarnations };
      expect(heroReady(heroRequiredLevel(reincarnations) - 1, hero)).toBe(false);
      expect(heroReady(heroRequiredLevel(reincarnations), hero)).toBe(true);
      expect(heroReady(100, { ...hero, restRemainingMs: 1 })).toBe(false);
      expect(heroReady(100, { ...hero, deferRemainingMs: 1 })).toBe(false);
    }
  });

  it('honors an existing level12 offer once without discounting new offers or paid rerolls', () => {
    const hero = parseHeroProgress({ ...newHeroProgress(), reincarnations: 10, choices: choices(), offerSerial: 7 })!;
    expect(hero.offerLevel).toBe(12);
    expect(heroReady(12, hero)).toBe(true);
    const before = { ...state(hero), level: 12 };
    expect(applyHeroAction(before, { type: 'heroReroll', offerSerial: 7 }, mulberry32(3))).toHaveProperty('error');
    const accepted = applyHeroAction(before, { type: 'heroChoose', formId: 'h01', offerSerial: 7 }, mulberry32(3));
    expect(accepted).not.toHaveProperty('error');
    if ('error' in accepted) throw new Error(accepted.error);
    expect(accepted.state.hero).toMatchObject({ reincarnations: 11, restRemainingMs: HERO_REST_MS, choices: [] });
    expect(accepted.state.hero!.offerLevel).toBeUndefined();
    expect(heroReady(12, { ...accepted.state.hero!, restRemainingMs: 0 })).toBe(false);
    const staleMarker = { ...newHeroProgress(), reincarnations: 10, offerLevel: 12 };
    expect(heroReady(12, staleMarker)).toBe(false);
  });

  it('stores the new level on opening and rejects same-element or locked rare restored offers', () => {
    const hero = { ...newHeroProgress(), reincarnations: 2 };
    const result = applyHeroAction(state(hero), { type: 'heroOffer' }, mulberry32(12));
    if ('error' in result) throw new Error(result.error);
    expect(result.state.hero?.offerLevel).toBe(HERO_MIN_LEVEL + 1);
    expect(parseHeroProgress(result.state.hero)).toEqual(result.state.hero);
    const duplicateType = { ...hero, choices: [choices()[0]!, { formId: 'h06', buffPercent: 20 }, choices()[1]!] };
    expect(parseHeroProgress(duplicateType)?.choices).toEqual([]);
    const rare = { ...hero, choices: [{ formId: 'h52', buffPercent: 20 }, choices()[1]!, choices()[2]!] };
    expect(parseHeroProgress(rare, discoveryContext(state(hero)))?.choices).toEqual([]);
  });
});

describe('v0.5 repeat mastery and actual candidate previews', () => {
  it('strictly improves a max raw roll and ignores candidate stack payloads', () => {
    const hero: HeroProgress = { ...newHeroProgress(), reincarnations: 4, offerSerial: 9,
      collection: [{ formId: 'h01', buffPercent: 25, stacks: 3 }], choices: choices() };
    hero.choices[0]!.stacks = 999;
    const preview = projectHeroRoll(hero, hero.choices[0]!);
    expect(preview).toEqual({ formId: 'h01', buffPercent: 25, stacks: 4 });
    const result = applyHeroAction(state(hero), { type: 'heroChoose', formId: 'h01', offerSerial: 9 }, mulberry32(3));
    if ('error' in result) throw new Error(result.error);
    expect(result.state.hero?.equipped).toEqual(preview);
    expect(heroEffectiveBuff(preview)).toBeGreaterThan(heroEffectiveBuff(hero.collection[0]!));
    expect(heroBuffedPower(100n, 'fire', preview)).toBe(158n);
    expect(heroBuffedPower(100n, 'water', preview)).toBe(100n);
    expect(hero.collection[0]!.stacks).toBe(3);
    expect(applyHeroAction(result.state, { type: 'heroChoose', formId: 'h01', offerSerial: 9 }, mulberry32(3)))
      .toHaveProperty('error');
  });

  it('improves a nonconsecutive return and does not award mastery for equipping', () => {
    const hero: HeroProgress = { ...newHeroProgress(), reincarnations: 5, offerSerial: 1,
      equipped: { formId: 'h02', buffPercent: 20 }, collection: [
        { formId: 'h01', buffPercent: 10, stacks: 1 }, { formId: 'h02', buffPercent: 20 },
      ], choices: [{ formId: 'h01', buffPercent: 25 }, choices()[1]!, choices()[2]!] };
    const equipped = applyHeroAction(state(hero), { type: 'heroEquip', formId: 'h01' }, mulberry32(3));
    if ('error' in equipped) throw new Error(equipped.error);
    expect(equipped.state.hero?.equipped).toEqual(hero.collection[0]);
    expect(equipped.state.hero?.reincarnations).toBe(5);
    const chosen = applyHeroAction(equipped.state, { type: 'heroChoose', formId: 'h01', offerSerial: 1 }, mulberry32(3));
    if ('error' in chosen) throw new Error(chosen.error);
    expect(chosen.state.hero?.equipped).toEqual({ formId: 'h01', buffPercent: 25, stacks: 2 });
    expect(heroEffectiveBuff({ formId: 'h06', buffPercent: 25, stacks: 2 })).toBe(27);
    expect(heroBuffedPower(100n, 'water', { formId: 'h06', buffPercent: 25, stacks: 2 })).toBe(127n);
  });

  it('keeps raw rolls bounded separately from stacks and prevents maximum-count overflow', () => {
    for (const stacks of [-1, .5, Infinity, NaN, HERO_MAX_REINCARNATIONS + 1, '1']) {
      expect(isHeroRoll({ formId: 'h01', buffPercent: 25, stacks })).toBe(false);
    }
    expect(isHeroRoll({ formId: 'h01', buffPercent: 26, stacks: 1 })).toBe(false);
    expect(isHeroRoll({ formId: 'h00', buffPercent: 0, stacks: 1 })).toBe(false);
    expect(isHeroRoll({ formId: 'h01', buffPercent: 25, stacks: HERO_MAX_REINCARNATIONS })).toBe(true);
    const hero = { ...newHeroProgress(), reincarnations: HERO_MAX_REINCARNATIONS, choices: choices() };
    expect(heroReady(1_000, hero)).toBe(false);
    expect(applyHeroAction(state(hero), { type: 'heroChoose', formId: 'h01', offerSerial: 0 }, mulberry32(3))).toHaveProperty('error');
  });

  it('preserves 70 owned forms and independently repairs malformed mastery', () => {
    const collection = HERO_FORMS.map((f) => ({ formId: f.id, buffPercent: 25, stacks: 2 }));
    const parsed = parseHeroProgress({ ...newHeroProgress(), collection, equipped: collection[69] });
    expect(parsed?.collection).toHaveLength(70);
    expect(parsed?.equipped).toEqual(collection[69]);
    const broken = parseHeroProgress({ ...newHeroProgress(), collection: [{ formId: 'h01', buffPercent: 25, stacks: NaN }] });
    expect(broken?.collection).toEqual([{ formId: 'h01', buffPercent: 25 }]);
  });
});

describe('v0.5 choice identity and secret eligibility', () => {
  it('keeps first-slot progression while owned and lower-rank heroes remain selectable', () => {
    const hero = { ...newHeroProgress(), reincarnations: 4, collection: [{ formId: 'h01', buffPercent: 25 }] };
    const seen = new Set<string>();
    const rng = mulberry32(505);
    for (let sample = 0; sample < 500; sample++) {
      const rolled = rollHeroChoices(hero, rng);
      expect(heroForm(rolled[0]!.formId)?.rank).toBe(5);
      expect(hero.collection.some((r) => r.formId === rolled[0]!.formId)).toBe(false);
      expect(new Set(rolled.map((r) => heroForm(r.formId)!.type)).size).toBe(3);
      for (const r of rolled) seen.add(r.formId);
    }
    expect(seen.has('h01')).toBe(true);
    expect(seen.size).toBe(STANDARD_HERO_FORMS.length);
  });

  it('unlocks the exact h01-repeat rare and keeps art discovery separate from owning it', () => {
    const hero = { ...newHeroProgress(), reincarnations: 2, collection: [{ formId: 'h01', buffPercent: 25, stacks: 1 }] };
    const source = state(hero);
    source.progress!.heroCounts = { h01: 2 };
    const context = discoveryContext(source);
    // Water and wind occupy the first two slots, leaving the rare fire form eligible.
    const draws = [.1, 0, .65, 0, .9, 0];
    let at = 0;
    const rolled = rollHeroChoices(hero, { next: () => draws[at++ % draws.length]! }, context);
    expect(rolled[2]?.formId).toBe('h52');
    expect(at).toBe(6);
    expect(hero.collection.some((r) => r.formId === 'h52')).toBe(false);
    at = 0;
    const discovered = rollHeroChoices(hero, { next: () => draws[at++ % draws.length]! }, { ...context, seenHeroes: ['h52'] });
    expect(heroForm(discovered[2]!.formId)?.rarity).toBe('standard');
    const wrongExactHero = { ...context, heroCounts: { h11: 2 } };
    for (let seed = 1; seed <= 30; seed++) {
      expect(rollHeroChoices(hero, mulberry32(seed), wrongExactHero).some((r) => r.formId === 'h52')).toBe(false);
    }
  });

  it('samples every rare after its requirements without sacrificing three real elements', () => {
    const hero = { ...newHeroProgress(), reincarnations: 10 };
    const progress = newProgress();
    progress.playTimeMs = 3_600_000;
    progress.speciesKills = { dragon: 100, slime: 100, bat: 100, golem: 100, ghost: 100, reefknight: 2 };
    progress.heroCounts = Object.fromEntries(STANDARD_HERO_FORMS.map((f) => [f.id, 2]));
    progress.seenMonsters = Array.from({ length: 60 }, (_, i) => `known-${i}`);
    progress.goldSpent = 1_000;
    progress.pvpWins = 3;
    const context = discoveryContext({ killCount: 30000, hero, progress });
    const seen = new Set<string>();
    const rng = mulberry32(555);
    for (let i = 0; i < 1000; i++) {
      const rolled = rollHeroChoices(hero, rng, context);
      expect(new Set(rolled.map((r) => heroForm(r.formId)!.type)).size).toBe(3);
      expect(heroForm(rolled[0]!.formId)?.rarity).toBe('standard');
      expect(heroForm(rolled[2]!.formId)?.rarity).toBe('rare');
      seen.add(rolled[2]!.formId);
    }
    expect([...seen].sort()).toEqual(RARE_HERO_FORMS.map((f) => f.id).sort());
  });
});

describe('v0.5 predictable gold purchases', () => {
  it('uses exact affordable prices, bounded benefits, and a single transaction revision', () => {
    expect(Array.from({ length: 3 }, (_, n) => trainingCost(n))).toEqual([75, 300, 675]);
    expect(lureCost(0)).toBe(75);
    expect(lureCost(1)).toBe(100);
    expect(lureCost(1_000_000)).toBe(2575);
    expect(trainedHeroPower(100n, 1)).toBe(105n);
    expect(trainedHeroPower(111n, 1)).toBe(116n);
    expect(trainedHeroPower(100n, 10)).toBe(150n);
    const before = { ...state(), killCount: 30 };
    const bought = applyEconomyAction(before, { type: 'shopBuy', item: 'training', shopSerial: 0 });
    if ('error' in bought) throw new Error(bought.error);
    expect(bought.state).toMatchObject({ coins: 925, progress: { trainingLevel: 1, shopSerial: 1, goldSpent: 75 } });
    expect(before.progress?.trainingLevel).toBe(0);
    expect(applyEconomyAction(bought.state, { type: 'shopBuy', item: 'training', shopSerial: 0 })).toHaveProperty('error');
    const lure = applyEconomyAction(bought.state, { type: 'shopBuy', item: 'lure', shopSerial: 1 });
    if ('error' in lure) throw new Error(lure.error);
    expect(lure.state).toMatchObject({ coins: 850, progress: { lureRemaining: LURE_CHARGES, goldSpent: 150, shopSerial: 2 } });
    expect(applyEconomyAction(lure.state, { type: 'shopBuy', item: 'lure', shopSerial: 2 })).toHaveProperty('error');
  });

  it('refuses insufficient gold, malformed/stale input and maxed training without state mutation', () => {
    const poor = { ...state(), coins: 74 };
    const snapshot = structuredClone(poor);
    for (const item of ['training', 'lure'] as const) {
      expect(applyEconomyAction(poor, { type: 'shopBuy', item, shopSerial: 0 })).toHaveProperty('error');
    }
    expect(poor).toEqual(snapshot);
    expect(applyEconomyAction(state(), { type: 'shopBuy', item: 'lure', shopSerial: 0 })).toHaveProperty('error');
    const maxed = state();
    maxed.progress!.trainingLevel = TRAINING_MAX_LEVEL;
    expect(applyEconomyAction(maxed, { type: 'shopBuy', item: 'training', shopSerial: 0 })).toHaveProperty('error');
    for (const action of [
      { type: 'shopBuy', item: 'training', shopSerial: NaN },
      { type: 'shopBuy', item: 'training', shopSerial: -1 },
      { type: 'shopBuy', item: '__proto__', shopSerial: 0 },
    ]) expect(applyEconomyAction(state(), action as EconomyAction)).toHaveProperty('error');
  });
});
