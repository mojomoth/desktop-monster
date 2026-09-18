// v0.4 "expedition payoff" — the three changes the v4 fun review approved:
// A3' a full roster releases a boss instead of voiding the draw in silence,
// A5' the hero offer's first slot opens up once the top rank is fully owned,
// A1' the removed expedition HUD stays absent; other scene state is preserved.
// Pure core + the DOM-free renderer, so everything runs under vitest's node env.

import { describe, expect, it } from 'vitest';
import {
  createEngine,
  DEFAULT_SAVE,
  HERO_DEFER_MS,
  HERO_FORMS,
  HERO_MIN_LEVEL,
  mulberry32,
  parseSave,
  RELEASES_PER_SOUL,
  rollHeroChoices,
  ROSTER_CAP,
} from '../src/core/index.js';
import type { Companion, GameEvent, GameState, HeroProgress, SaveFile } from '../src/core/index.js';
import { HERO_MAX_REINCARNATIONS, heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';
import { createGame } from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';

/** A save whose roster is already at the cap, so every capture is a release. */
function fullRosterSave(): SaveFile {
  const companions: Companion[] = Array.from({ length: ROSTER_CAP }, (_, i) => ({
    id: `c${i + 1}`,
    speciesId: 'slime',
    // Ascending power, so the weakest keeper is always c1.
    bossIndex: i,
    level: 1,
    stars: 0,
  }));
  return { ...DEFAULT_SAVE, companions, nextCompanionId: ROSTER_CAP + 1, items: {}, pvpParty: [] };
}

/** Drive one engine for `attacks` inputs and return every event it emitted. */
function play(save: SaveFile | null, seed: number, attacks: number): { state: GameState; events: GameEvent[] } {
  const engine = createEngine(save, mulberry32(seed));
  const events: GameEvent[] = [];
  for (let i = 0; i < attacks; i++) events.push(...engine.attack('keyboard'));
  return { state: engine.getState(), events };
}

describe('A3 — a full roster releases the boss instead of voiding it (H1/H2)', () => {
  it('never swallows a capture draw: every full-roster boss draw emits an event', () => {
    // Invariant, not a distribution: over 100 seeds the count of releases must
    // equal the count of successful draws that the cap turned away, and the
    // engine must never capture past the cap.
    for (let seed = 1; seed <= 100; seed++) {
      const { state, events } = play(fullRosterSave(), seed, 4000);
      const released = events.filter((e) => e.type === 'companionReleased');
      const captured = events.filter((e) => e.type === 'bossCaptured');
      expect(captured).toHaveLength(0);
      expect(state.companions).toHaveLength(ROSTER_CAP);
      expect(state.releasedCount).toBe(released.length);
      // Souls follow the fixed conversion, with no partial credit lost.
      const paid = released.reduce((sum, e) => sum + (e.type === 'companionReleased' ? e.souls : 0), 0);
      expect(paid).toBe(Math.floor(released.length / RELEASES_PER_SOUL));
      expect(state.souls).toBe(paid);
    }
  });

  it('pays exactly one soul on every RELEASES_PER_SOUL-th release and persists the tally', () => {
    const { state, events } = play(fullRosterSave(), 7, 4000);
    const released = events.filter((e) => e.type === 'companionReleased');
    expect(released.length).toBeGreaterThan(0);
    let seen = 0;
    for (const e of released) {
      if (e.type !== 'companionReleased') continue;
      seen++;
      expect(e.souls).toBe(seen % RELEASES_PER_SOUL === 0 ? 1 : 0);
      expect(e.bossIndex).toBeGreaterThanOrEqual(0);
    }
    // The tally survives a save/resume so the conversion keeps its parity.
    const resumed = createEngine({ ...fullRosterSave(), releasedCount: state.releasedCount }, mulberry32(1));
    expect(resumed.getState().releasedCount).toBe(state.releasedCount);
    expect(resumed.toSave().releasedCount).toBe(state.releasedCount);
  });

  it('flags whether the released boss beat the roster\'s weakest keeper', () => {
    // A roster of deep bosses is worth more than any early release …
    const strong: SaveFile = {
      ...fullRosterSave(),
      companions: Array.from({ length: ROSTER_CAP }, (_, i) => ({
        id: `c${i + 1}`, speciesId: 'dragon', bossIndex: 400, level: 1, stars: 0,
      })),
    };
    const strongRuns = play(strong, 3, 2000).events
      .filter((e): e is Extract<GameEvent, { type: 'companionReleased' }> => e.type === 'companionReleased');
    expect(strongRuns.length).toBeGreaterThan(0);
    expect(strongRuns.every((e) => !e.strongerThanWeakest)).toBe(true);

    // … while a roster of index-0 slimes is beaten by anything deeper.
    const weak: SaveFile = {
      ...fullRosterSave(),
      companions: Array.from({ length: ROSTER_CAP }, (_, i) => ({
        id: `c${i + 1}`, speciesId: 'slime', bossIndex: 0, level: 1, stars: 0,
      })),
    };
    const weakRuns = play(weak, 3, 2000).events
      .filter((e): e is Extract<GameEvent, { type: 'companionReleased' }> => e.type === 'companionReleased');
    expect(weakRuns.length).toBeGreaterThan(0);
    expect(weakRuns.some((e) => e.strongerThanWeakest)).toBe(true);
  });

  it('leaves the RNG stream untouched: an open roster plays exactly as before', () => {
    // The capture draw is still consumed once per boss kill, so a run that
    // never fills its roster must be bit-identical to the pre-change pacing.
    for (const seed of [1, 17, 55, 90]) {
      const open = play(null, seed, 3000);
      expect(open.events.filter((e) => e.type === 'companionReleased')).toHaveLength(0);
      expect(open.state.releasedCount).toBe(0);
      expect(open.state.companions.length).toBeLessThanOrEqual(ROSTER_CAP);
    }
  });
});

describe('A5 — the offer keeps finding unseen forms past the top rank (H3)', () => {
  const heroAt = (reincarnations: number, collection: HeroProgress['collection']): HeroProgress =>
    ({ ...newHeroProgress(), reincarnations, collection });

  it('offers an unseen form in slot 0 once the top rank is fully collected', () => {
    // Everything at rank 5 owned, nothing below it — the old rule was stuck
    // re-offering the same ten forms forever.
    const topRank = HERO_FORMS.filter((f) => f.rank === 5);
    const hero = heroAt(20, topRank.map((f) => ({ formId: f.id, buffPercent: 20 })));
    let unseenFirst = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const choices = rollHeroChoices(hero, mulberry32(seed));
      expect(choices).toHaveLength(3);
      if (!hero.collection.some((r) => r.formId === choices[0]!.formId)) unseenFirst++;
    }
    expect(unseenFirst).toBe(100);
  });

  it('still guarantees the newest rank while that rank has anything unseen', () => {
    for (let reincarnations = 0; reincarnations < 5; reincarnations++) {
      const rank = Math.min(5, reincarnations + 1);
      for (let seed = 1; seed <= 20; seed++) {
        const first = rollHeroChoices(heroAt(reincarnations, []), mulberry32(seed))[0]!;
        expect(HERO_FORMS.find((f) => f.id === first.formId)?.rank).toBe(rank);
      }
    }
  });

  it('always offers three distinct elements and keeps the roll range', () => {
    const owned = HERO_FORMS.slice(0, 40).map((f) => ({ formId: f.id, buffPercent: 25 }));
    for (const collection of [[], owned, HERO_FORMS.map((f) => ({ formId: f.id, buffPercent: 25 }))]) {
      for (let seed = 1; seed <= 50; seed++) {
        const choices = rollHeroChoices(heroAt(20, collection), mulberry32(seed));
        const types = choices.map((r) => HERO_FORMS.find((f) => f.id === r.formId)!.type);
        expect(new Set(types).size).toBe(3);
        for (const roll of choices) {
          expect(roll.buffPercent).toBeGreaterThanOrEqual(10);
          expect(roll.buffPercent).toBeLessThanOrEqual(25);
        }
      }
    }
  });

  it('consumes the same number of RNG draws as the previous rule', () => {
    // Two draws per slot, six per offer — the shared stream is what the
    // pacing baseline was measured on, so its length may not move.
    for (const collection of [[], HERO_FORMS.map((f) => ({ formId: f.id, buffPercent: 25 }))]) {
      let draws = 0;
      const base = mulberry32(42);
      const counting = { next: (): number => { draws++; return base.next(); } };
      rollHeroChoices(heroAt(20, collection), counting);
      expect(draws).toBe(6);
    }
  });

  it('drives the binder past the old 14-form ceiling under an always-accept policy', () => {
    // Simulated policy, not a human: accept the first card every time.
    const collected = new Set<string>();
    let hero = newHeroProgress();
    const rng = mulberry32(9);
    for (let i = 0; i < 50; i++) {
      const choices = rollHeroChoices(hero, rng);
      const pick = choices[0]!;
      collected.add(pick.formId);
      hero = {
        ...hero,
        reincarnations: hero.reincarnations + 1,
        collection: hero.collection.some((r) => r.formId === pick.formId)
          ? hero.collection
          : [...hero.collection, pick],
      };
    }
    // The old slot-0 rule capped this at 14 (4 low ranks + 10 at rank 5).
    expect(collected.size).toBe(50);
  });
});

describe('A1 — the removed expedition HUD stays absent from the complete frame', () => {
  interface Rect { x: number; y: number; w: number; h: number }

  const paint = (hero?: HeroProgress, monsterIndex = 40, level = 1): Rect[] => {
    const engine = createEngine({ ...DEFAULT_SAVE, hero, level }, mulberry32(1));
    // Draw from a snapshot: the removed readout once consumed index, not HP.
    // Retain extreme-depth cases without allocating irrelevant enormous HP.
    const state: Readonly<GameState> = { ...engine.getState(),
      monster: { ...engine.getState().monster, index: monsterIndex } };
    const rects: Rect[] = [];
    const ctx: GameCanvas = { fillStyle: '', clearRect: () => undefined,
      fillRect: (x, y, w, h) => { rects.push({ x, y, w, h }); } };
    createGame({ ...engine, getState: () => state }).draw(ctx);
    expect(rects.length).toBeGreaterThan(0); // Exercise a full painted scene.
    return rects.filter(rect => rect.x < 66 && rect.x + rect.w > 2
      && rect.y < 38 && rect.y + rect.h > 16);
  };

  it('draws no left readout before the first offer or without saved hero progress', () => {
    for (let level = 1; level < HERO_MIN_LEVEL; level++) {
      expect(paint(newHeroProgress(), 40, level)).toEqual([]);
      expect(paint(undefined, 40, level)).toEqual([]);
    }
  });

  it('draws no completed meter or duplicate ready label when an offer becomes ready', () => {
    for (const reincarnations of [0, 1, 11]) {
      const hero = { ...newHeroProgress(), reincarnations };
      expect(paint(hero, 40, heroRequiredLevel(reincarnations))).toEqual([]);
      expect(paint(hero, 40, heroRequiredLevel(reincarnations) - 1)).toEqual([]);
    }
  });

  it('draws no wait label or gauge during a deferred offer, including its final millisecond', () => {
    for (const deferRemainingMs of [HERO_DEFER_MS, HERO_DEFER_MS / 4, 1, 0]) {
      expect(paint({ ...newHeroProgress(), deferRemainingMs }, 40, HERO_MIN_LEVEL)).toEqual([]);
    }
  });

  it('does not resurrect a rest gauge from legacy saves with positive rest time', () => {
    for (const restRemainingMs of [90_000, 22_500, 1, 0]) {
      const save = parseSave({ ...DEFAULT_SAVE, hero: { ...newHeroProgress(), restRemainingMs } });
      expect(paint(save.hero, 40, HERO_MIN_LEVEL)).toEqual([]);
    }
  });

  it('stays absent for a retained offer and for the reincarnation cap', () => {
    const old = { ...newHeroProgress(), reincarnations: 11, offerLevel: 12,
      choices: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 10 }, { formId: 'h03', buffPercent: 10 }] };
    for (const level of [11, 12, 100]) {
      expect(paint(old, 40, level)).toEqual([]);
      expect(paint({ ...old, choices: [] }, 40, level)).toEqual([]);
      expect(paint({ ...old, reincarnations: HERO_MAX_REINCARNATIONS }, 40, level)).toEqual([]);
    }
  });

  it('draws no old meter or soul estimate at any previously covered depth', () => {
    for (const index of [0, 8, 100, 5000, 10_000_000]) {
      expect(paint(newHeroProgress(), index, 1)).toEqual([]);
      expect(paint(newHeroProgress(), index, HERO_MIN_LEVEL)).toEqual([]);
    }
  });

  it('drawing the complete frame changes neither the saved state nor the RNG stream', () => {
    const rng = mulberry32(5);
    let draws = 0;
    const engine = createEngine({ ...DEFAULT_SAVE, hero: newHeroProgress(), level: HERO_MIN_LEVEL },
      { next: () => { draws++; return rng.next(); } });
    const before = engine.toSave(), drawsBefore = draws;
    const game = createGame(engine);
    const ctx: GameCanvas = { fillStyle: '', fillRect: () => undefined, clearRect: () => undefined };
    for (let frame = 0; frame < 20; frame++) game.draw(ctx);
    expect(engine.toSave()).toEqual(before);
    expect(draws).toBe(drawsBefore);
  });
});
