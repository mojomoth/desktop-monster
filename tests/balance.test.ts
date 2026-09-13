// Current-engine accounting/policy regression, with exploration seeds only.
// Historical v0.6 pacing source is archived in contracts/candidate-04. V07-05's
// registered measure AC separately enforces the official 100-seed/12-hour targets.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, HERO_FORMS, HERO_REST_MS, heroReady, heroRequiredLevel, heroRerollCost,
  mulberry32, newHeroProgress, newProgress, RARE_MONSTERS, heroAttackPower, trainedHeroPower,
  trainingCost, lureCost, LURE_CHARGES, ROSTER_CAP, RELEASES_PER_SOUL } from '../src/core/index.js';

import type { GameEvent } from '../src/core/types.js';

type Profile = 'active' | 'idle' | 'intermittent';
type Policy = 'free' | 'training' | 'lure' | 'reroll';
interface Sample { income: number; heroDps: number; companionDps: number; heroDamagePercent: number; level: number; monsterHp: string; heroHit: string; policy: Policy; spent: number; training: number; rareSeen: number; minutes: number; profile: Profile; seed: number; kills: number; firstOfferSec: number | null;
  reincarnations: number; collected: number; uniqueChosen: number; coins: number; companions: number; longestKillGapSec: number;
  /** v0.4 expedition payoff: full-roster releases, and how many were the first card unseen. */
  released: number; souls: number; unseenFirstCards: number; offers: number }

function simulate(profile: Profile, seed: number, policy: Policy = 'free'): Sample[] {
  const engine = createEngine(null, mulberry32(seed));
  const result: Sample[] = [];
  let firstOfferSec: number | null = null;
  let lastKill = 0;
  let longestKillGapSec = 0;
  let released = 0;
  let unseenFirstCards = 0;
  let offers = 0;
  let income = 0;
  let heroDamage = 0n;
  let companionDamage = 0n;
  const measure = (events: GameEvent[]): void => {
    for (const event of events) {
      if (event.type === 'attack') heroDamage += event.damage;
      if (event.type === 'companionAttack') companionDamage += event.damage;
      if (event.type === 'itemDropped') income += event.drops.reduce((n, d) => n + (d.item.kind === 'coin' ? d.amount : 0), 0);
    }
  };
  for (let sec = 1; sec <= 1800; sec++) {
    // All profiles get a two-minute onboarding. Idle then stops input;
    // intermittent works 15 seconds per minute; active inputs twice a second.
    const inputs = sec <= 120 || profile === 'active' || (profile === 'intermittent' && sec % 60 < 15) ? 2 : 0;
    let killed = false;
    for (let i = 0; i < inputs; i++) {
      const hit = engine.attack('keyboard');
      measure(hit);
      killed = hit.some((e) => e.type === 'monsterKilled') || killed;
      released += hit.filter((e) => e.type === 'companionReleased').length;
    }
    // Do not short-circuit engine steps when an earlier input killed.
    const events = engine.tick(1000);
    measure(events);
    killed = events.some((e) => e.type === 'monsterKilled') || killed;
    released += events.filter((e) => e.type === 'companionReleased').length;
    if (killed) {
      longestKillGapSec = Math.max(longestKillGapSec, sec - lastKill);
      lastKill = sec;
    }
    const state = engine.getState();
    if (heroReady(state.level, state.hero)) {
      firstOfferSec ??= sec;
      engine.apply({ type: 'heroOffer' });
      let hero = engine.getState().hero!;
      if (policy === 'reroll') {
        engine.apply({ type: 'heroReroll', offerSerial: hero.offerSerial });
        hero = engine.getState().hero!;
      }
      // The unit policy chooses the first card; it is not the canonical
      // 100ms evaluation used for candidate adoption or release acceptance.
      offers++;
      if (!hero.collection.some((r) => r.formId === hero.choices[0]!.formId)) unseenFirstCards++;
      engine.apply({ type: 'heroChoose', formId: hero.choices[0]!.formId, offerSerial: hero.offerSerial });
    }
    if (policy === 'training' || policy === 'lure') {
      engine.apply({ type: 'shopBuy', item: policy, shopSerial: state.progress?.shopSerial ?? 0 });
    }
    if ([300, 900, 1800].includes(sec)) {
      const current = engine.getState();
      result.push({ income, heroDps: Number(heroDamage) / sec, companionDps: Number(companionDamage) / sec,
        heroDamagePercent: Number(heroDamage) / Number(heroDamage + companionDamage) * 100,
        level: current.level, monsterHp: String(current.monster.maxHp),
        heroHit: String(trainedHeroPower(heroAttackPower(current.level, current.souls, current.hero?.reincarnations ?? 0), current.progress?.trainingLevel ?? 0)), policy, spent: current.progress?.goldSpent ?? 0, training: current.progress?.trainingLevel ?? 0,
        rareSeen: RARE_MONSTERS.filter((m) => current.progress?.seenMonsters.includes(m.id)).length, minutes: sec / 60, profile, seed, kills: current.killCount,
        firstOfferSec, reincarnations: current.hero?.reincarnations ?? 0,
        collected: current.hero?.collection.length ?? 0, coins: current.coins,
        uniqueChosen: Object.keys(current.progress?.heroCounts ?? {}).length,
        companions: current.companions.length,
        longestKillGapSec: Math.max(longestKillGapSec, sec - lastKill),
        released, souls: current.souls, unseenFirstCards, offers });
    }
  }
  return result;
}

describe('v0.7 deterministic accounting and gold policy regression', () => {
  it('checks 20 exploration seeds across active, warm-idle and intermittent play at 5/15/30 minutes', async () => {
    const samples: Sample[] = [];
    for (const profile of ['active', 'idle', 'intermittent'] as const) {
      for (let seed = 10001; seed <= 10020; seed++) {
        samples.push(...simulate(profile, seed));
        // Let Vitest deliver worker RPC updates during this CPU-heavy batch;
        // gameplay time remains exclusively the injected 1000 ms engine tick.
        if (seed % 5 === 0) {
          if (process.env.DESMON_BALANCE_REPORT) process.stdout.write(`${profile}: ${seed - 10000}/20 exploration seeds\n`);
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      }
    }
    for (const policy of ['training', 'lure', 'reroll'] as const) {
      for (let seed = 10001; seed <= 10020; seed++) {
        samples.push(...simulate('active', seed, policy));
        if (seed % 5 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
      }
      if (process.env.DESMON_BALANCE_REPORT) process.stdout.write(`${policy}: 20/20 exploration seeds\n`);
    }
    const quantiles = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return { p10: sorted[Math.floor((sorted.length - 1) * .1)] ?? null, p50: sorted[Math.floor((sorted.length - 1) * .5)] ?? null, p90: sorted[Math.floor((sorted.length - 1) * .9)] ?? null };
    };
    const scenarios = (['free', 'training', 'lure', 'reroll'] as const).flatMap((policy) =>
      (policy === 'free' ? ['active', 'idle', 'intermittent'] : ['active']).flatMap((profile) => [5, 15, 30].map((minutes) => {
      const rows = samples.filter((s) => s.policy === policy && s.profile === profile && s.minutes === minutes);
      return { policy, profile, minutes, samples: rows.length,
        spent: quantiles(rows.map((r) => r.spent)), training: quantiles(rows.map((r) => r.training)),
        rareSeen: quantiles(rows.map((r) => r.rareSeen)),
        income: quantiles(rows.map((r) => r.income)), heroDps: quantiles(rows.map((r) => r.heroDps)),
        companionDps: quantiles(rows.map((r) => r.companionDps)), heroDamagePercent: quantiles(rows.map((r) => r.heroDamagePercent)),
        firstOfferReached: rows.filter((r) => r.firstOfferSec !== null).length,
        firstOfferSecAmongReached: quantiles(rows.flatMap((r) => r.firstOfferSec === null ? [] : [r.firstOfferSec])),
        kills: quantiles(rows.map((r) => r.kills)), reincarnations: quantiles(rows.map((r) => r.reincarnations)),
        collected: quantiles(rows.map((r) => r.collected)), coins: quantiles(rows.map((r) => r.coins)),
        longestKillGapSec: quantiles(rows.map((r) => r.longestKillGapSec)),
        released: quantiles(rows.map((r) => r.released)), souls: quantiles(rows.map((r) => r.souls)),
        unseenFirstCardRatio: rows.some(r => r.offers > 0)
          ? rows.reduce((sum, r) => sum + r.unseenFirstCards, 0) / rows.reduce((sum, r) => sum + r.offers, 0) : null,
        fullRosters: rows.filter((r) => r.companions === 30).length };
    })));
    const report = { version: '0.7.0', kind: 'unit-accounting-not-pacing-acceptance', seeds: '10001..10020',
      inputModel: '2 inputs/s; 120s onboarding, then idle=0/s; intermittent=15s/min; free=first offer; training/lure=buy whenever eligible and affordable; reroll=once per offer then first; no companion management',
      damageModel: 'Cumulative emitted attack damage (includes overkill), divided by active engine seconds; not effective removed HP. Current level/HP/base trained hit saved per sample.',
      scenarios, rawSamples: samples };
    if (process.env.DESMON_BALANCE_REPORT) writeFileSync(process.env.DESMON_BALANCE_REPORT, JSON.stringify(report, null, 2) + '\n');
    expect(samples).toHaveLength(360);
    expect(new Set(samples.map(sample => sample.seed))).toEqual(new Set(Array.from({ length: 20 }, (_, i) => 10001 + i)));
    expect(samples.every((s) => s.income - s.spent === s.coins)).toBe(true);
    expect(samples.every((s) => s.coins >= 0 && s.collected <= HERO_FORMS.length && s.companions <= ROSTER_CAP)).toBe(true);
    expect(samples.every((s) => s.collected === s.uniqueChosen && s.collected <= s.reincarnations)).toBe(true);
    expect(samples.every((s) => [s.heroDps, s.companionDps, s.heroDamagePercent].every(Number.isFinite))).toBe(true);
    for (const profile of ['active', 'idle', 'intermittent']) {
      const early = scenarios.find((s) => s.policy === 'free' && s.profile === profile && s.minutes === 5)!;
      const late = scenarios.find((s) => s.policy === 'free' && s.profile === profile && s.minutes === 30)!;
      expect(early.kills.p50).not.toBeNull();
      expect(late.kills.p50).toBeGreaterThan(early.kills.p50!);
    }
    // Release payout, first-card growth and paid effects below are triggered
    // explicitly; they cannot pass vacuously while first reincarnation is pending.
    // Numeric pacing is the official measure AC: accepted p50 45–60min,
    // 90/100 within90min, final h70 eligibility p50 8–12h on the adopted build.
    const latePolicies = scenarios.filter((s) => s.profile === 'active' && s.minutes === 30);
    expect(latePolicies.find((s) => s.policy === 'free')!.spent.p90).toBe(0);
  }, 120_000);

  it('keeps release rewards, unseen first cards, repeat mastery and paid effects observable under the v7 cadence', () => {
    const companions = Array.from({ length: ROSTER_CAP }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 0, level: 1, stars: 0 }));
    const full = createEngine({ ...DEFAULT_SAVE, companions, nextCompanionId: ROSTER_CAP + 1,
      monsterIndex: 31, monsterHp: '1', releasedCount: RELEASES_PER_SOUL - 1 }, { next: () => 0 });
    const events = full.attack('keyboard');
    expect(events.filter(event => event.type === 'companionReleased')).toEqual([
      expect.objectContaining({ souls: 1, strongerThanWeakest: true, bossIndex: 31 }),
    ]);
    expect(events.some(event => event.type === 'bossCaptured')).toBe(false);
    expect(full.toSave()).toMatchObject({ companions, releasedCount: RELEASES_PER_SOUL, souls: 1, nextCompanionId: ROSTER_CAP + 1 });

    for (let seed = 10001; seed <= 10020; seed++) {
      const owned = HERO_FORMS.filter(form => form.rarity === 'standard' && form.id !== 'h01')
        .map(form => ({ formId: form.id, buffPercent: 10 }));
      const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(49), coins: 10000,
        hero: { ...newHeroProgress(), reincarnations: 49, collection: owned } }, mulberry32(seed));
      engine.apply({ type: 'heroOffer' });
      const offer = engine.getState().hero!;
      expect(offer.choices[0]!.formId).toBe('h01');
      engine.apply({ type: 'heroChoose', formId: 'h01', offerSerial: offer.offerSerial });
      expect(engine.toSave()).toMatchObject({ level: 1, xp: 0, coins: 10000,
        hero: { reincarnations: 50, restRemainingMs: HERO_REST_MS, equipped: { formId: 'h01' } } });
      expect(engine.getState().hero!.collection).toHaveLength(50);
      const save = engine.toSave();
      const repeat = createEngine({ ...save, level: heroRequiredLevel(50), hero: { ...save.hero!, restRemainingMs: 0,
        choices: [{ formId: 'h01', buffPercent: 25 }, { formId: 'h02', buffPercent: 11 }, { formId: 'h03', buffPercent: 12 }],
        offerLevel: heroRequiredLevel(50), offerSerial: 101 } }, mulberry32(seed));
      repeat.apply({ type: 'heroChoose', formId: 'h01', offerSerial: 101 });
      expect(repeat.getState().hero!.collection).toHaveLength(50);
      expect(repeat.getState().hero!.equipped).toEqual({ formId: 'h01', buffPercent: 25, stacks: 1 });

      for (const policy of ['training', 'lure', 'reroll'] as const) {
        const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(0), coins: 10000, killCount: 30,
          progress: newProgress() }, mulberry32(seed));
        let cost: number;
        if (policy === 'reroll') {
          engine.apply({ type: 'heroOffer' });
          const serial = engine.getState().hero!.offerSerial;
          cost = heroRerollCost(0);
          engine.apply({ type: 'heroReroll', offerSerial: serial });
          expect(engine.getState().hero!.offerSerial).toBe(serial + 1);
          const after = engine.toSave();
          engine.apply({ type: 'heroReroll', offerSerial: serial });
          expect(engine.toSave()).toEqual(after);
        } else {
          cost = policy === 'training' ? trainingCost(0) : lureCost(0);
          engine.apply({ type: 'shopBuy', item: policy, shopSerial: 0 });
          expect(engine.getState().progress).toMatchObject(policy === 'training' ? { trainingLevel: 1 } : { lureRemaining: LURE_CHARGES });
          const after = engine.toSave();
          engine.apply({ type: 'shopBuy', item: policy, shopSerial: 0 });
          expect(engine.toSave()).toEqual(after);
          if (policy === 'training') expect(trainedHeroPower(100n, engine.getState().progress!.trainingLevel)).toBe(105n);
          else {
            const observed = createEngine({ ...engine.toSave(), monsterHp: '1' }, scriptedCaptureFreeSpawn);
            observed.attack('keyboard');
            expect(observed.getState().monster.speciesId).toBe('dawnfinch');
            const free = createEngine({ ...engine.toSave(), monsterHp: '1', progress: { ...engine.toSave().progress!, lureRemaining: 0 } }, scriptedCaptureFreeSpawn);
            free.attack('keyboard');
            expect(RARE_MONSTERS.some(monster => monster.id === free.getState().monster.speciesId)).toBe(false);
          }
        }
        expect(engine.getState().coins).toBe(10000 - cost);
        expect(engine.getState().progress!.goldSpent).toBe(cost);
      }
    }
  });
});

// No crit; a rare-spawn roll between the free and paid probabilities.
const scriptedCaptureFreeSpawn = { next: () => 0.2 };


it('distinguishes a new pure-idle stall from a returning save with naturally captured companions', () => {
  const pureIdle = createEngine(null, mulberry32(10001));
  pureIdle.tick(1_800_000);
  expect(pureIdle.toSave().killCount).toBe(0);
  expect(pureIdle.toSave().progress?.playTimeMs).toBe(1_800_000);
  const onboarding = createEngine(null, mulberry32(10001));
  for (let sec = 0; sec < 120; sec++) {
    onboarding.attack('keyboard'); onboarding.attack('keyboard'); onboarding.tick(1000);
  }
  const source = onboarding.toSave();
  expect(source.companions.length).toBeGreaterThan(0);
  const returning = createEngine(source, mulberry32(10002));
  returning.tick(300_000);
  expect(returning.toSave().killCount).toBeGreaterThan(source.killCount);
  expect(returning.toSave().progress?.playTimeMs).toBe(420_000);
});
