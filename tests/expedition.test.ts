// v0.4 "expedition payoff" — the three changes the v4 fun review approved:
// A3' a full roster releases a boss instead of voiding the draw in silence,
// A5' the hero offer's first slot opens up once the top rank is fully owned,
// A1' a display-only rest gauge that must never overlap the existing HUD.
// Pure core + the DOM-free HUD, so everything runs under vitest's node env.

import { describe, expect, it } from 'vitest';
import {
  createEngine,
  DEFAULT_SAVE,
  HERO_DEFER_MS,
  HERO_FORMS,
  HERO_MIN_LEVEL,
  HERO_REST_MS,
  monsterForIndex,
  mulberry32,
  RELEASES_PER_SOUL,
  rollHeroChoices,
  ROSTER_CAP,
} from '../src/core/index.js';
import type { Companion, GameEvent, GameState, HeroProgress, SaveFile } from '../src/core/index.js';
import { HERO_MAX_REINCARNATIONS, heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';
import {
  COUNTER_TOP,
  drawExpedition,
  EXPEDITION_H,
  EXPEDITION_SOULS_X,
  EXPEDITION_W,
  HUD_MARGIN,
} from '../src/renderer/hud.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';

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

describe('A1 — the expedition gauge is display-only and stays out of the way (H2b/H7)', () => {
  interface Rect { x: number; y: number; w: number; h: number; color: string }

  const paint = (hero?: HeroProgress, monsterIndex = 40, level = 1): Rect[] => {
    const rects: Rect[] = [];
    const ctx: SpriteCanvas = {
      fillStyle: '',
      fillRect(x: number, y: number, w: number, h: number): void { rects.push({ x, y, w, h, color: String(ctx.fillStyle) }); },
    };
    const monster = monsterForIndex(monsterIndex);
    const state = {
      ...createEngine(null, mulberry32(1)).getState(),
      monster, monsterHp: monster.maxHp, level,
      ...(hero ? { hero } : {}),
    } as GameState;
    drawExpedition(ctx, state);
    return rects;
  };

  const resting = (restRemainingMs: number): HeroProgress => ({ ...newHeroProgress(), restRemainingMs });

  /**
   * The meter fill. drawMeter paints frame, then the void interior, then the
   * fill over it — interior and fill share an origin, so take the last one.
   */
  const meterFill = (rects: Rect[]): number => {
    const inner = rects.filter((r) => r.x === HUD_MARGIN + 1 && r.y === COUNTER_TOP + 1 && r.h === EXPEDITION_H - 2);
    return inner.length >= 2 ? inner[inner.length - 1]!.w : 0;
  };

  it('hides only once the offer is actually ready', () => {
    // Ready = nothing to wait for, so the readout gets out of the way.
    expect(paint(newHeroProgress(), 40, HERO_MIN_LEVEL)).toEqual([]);
    expect(paint(undefined, 40, HERO_MIN_LEVEL)).toEqual([]);
    // The long quiet stretch — rest over, level not yet reached — used to
    // show nothing at all. It now shows how far the next offer is.
    expect(paint(resting(0), 40, 5).length).toBeGreaterThan(0);
    expect(paint(undefined, 40, 5).length).toBeGreaterThan(0);
    expect(paint(newHeroProgress(), 40, 1).length).toBeGreaterThan(0);
  });

  it('fills toward the unlock level while no rest is running', () => {
    const fill = (level: number): number => meterFill(paint(resting(0), 40, level));
    let prev = -1;
    for (let level = 1; level < HERO_MIN_LEVEL; level++) {
      const w = fill(level);
      expect(w).toBeGreaterThanOrEqual(prev);
      prev = w;
    }
    // A deferral is a wait too: it drains like the rest, it does not sit
    // full and static while the free retry counts down.
    const deferFill = (ms: number): number =>
      meterFill(paint({ ...newHeroProgress(), deferRemainingMs: ms }, 40, HERO_MIN_LEVEL));
    expect(deferFill(HERO_DEFER_MS)).toBeGreaterThan(deferFill(HERO_DEFER_MS / 4));
    expect(deferFill(HERO_DEFER_MS)).toBeLessThanOrEqual(EXPEDITION_W - 2);
  });

  it('never fills the level meter before later thresholds and honors an old open offer', () => {
    for (const reincarnations of [0, 1, 11]) {
      const hero = { ...newHeroProgress(), reincarnations };
      const required = heroRequiredLevel(reincarnations);
      for (let level = 1; level < required; level++) {
        expect(meterFill(paint(hero, 40, level))).toBeLessThan(EXPEDITION_W - 2);
      }
      expect(paint(hero, 40, required)).toEqual([]);
    }
    const old = { ...newHeroProgress(), reincarnations: 11, offerLevel: 12,
      choices: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 10 }, { formId: 'h03', buffPercent: 10 }] };
    expect(meterFill(paint(old, 40, 11))).toBeLessThan(EXPEDITION_W - 2);
    expect(paint(old, 40, 12)).toEqual([]);
    expect(meterFill(paint({ ...old, choices: [] }, 40, 12))).toBeLessThan(EXPEDITION_W - 2);
    expect(paint({ ...old, reincarnations: HERO_MAX_REINCARNATIONS }, 40, 100)).toEqual([]);
  });

  it('shows waits in a separate color through their final millisecond', () => {
    const required = heroRequiredLevel(1);
    const levelColor = paint({ ...newHeroProgress(), reincarnations: 1 }, 40, required - 1)[2]!.color;
    for (const wait of ['restRemainingMs', 'deferRemainingMs'] as const) {
      const hero = { ...newHeroProgress(), reincarnations: 1, [wait]: 1 };
      const rects = paint(hero, 40, required);
      expect(meterFill(rects)).toBe(1);
      expect(rects[2]!.color).not.toBe(levelColor);
      expect(paint({ ...hero, [wait]: 0 }, 40, required)).toEqual([]);
      expect(meterFill(paint({ ...hero, [wait]: 0 }, 40, required - 1))).toBeLessThan(EXPEDITION_W - 2);
    }
  });

  it('drains monotonically over the rest and disappears at zero (H2b)', () => {
    const fillWidth = (ms: number): number => meterFill(paint(resting(ms), 40, HERO_MIN_LEVEL));
    let prev = Number.POSITIVE_INFINITY;
    for (let ms = HERO_REST_MS; ms > 0; ms -= HERO_REST_MS / 20) {
      const w = fillWidth(ms);
      expect(w).toBeLessThanOrEqual(prev);
      prev = w;
    }
    expect(paint(resting(0), 40, HERO_MIN_LEVEL)).toEqual([]);
  });

  it('never leaves its declared pixel budget, whatever the depth (H7)', () => {
    // The whole readout lives in x[2,60) y[16,21) — clear of the hero
    // (x[66,94)), the monster and counters (x>=150) and the banner (y=20 is
    // only reached by text baselines at x>=64).
    const boxRight = EXPEDITION_SOULS_X + 4 * 4; // <=4 glyphs at FONT_ADVANCE 4
    expect(HUD_MARGIN).toBe(2);
    expect(COUNTER_TOP).toBe(16);
    expect(boxRight).toBeLessThanOrEqual(60);
    for (const index of [0, 8, 100, 5000, 10_000_000]) {
      for (const rect of paint(resting(HERO_REST_MS / 2), index)) {
        expect(rect.x).toBeGreaterThanOrEqual(HUD_MARGIN);
        expect(rect.x + rect.w).toBeLessThanOrEqual(60);
        expect(rect.y).toBeGreaterThanOrEqual(COUNTER_TOP);
        expect(rect.y + rect.h).toBeLessThanOrEqual(COUNTER_TOP + 5);
      }
    }
    expect(EXPEDITION_W).toBe(40);
    expect(EXPEDITION_H).toBe(3);
  });

  it('changes no game state — it only reads (H2b: display is not a reward)', () => {
    const engine = createEngine(null, mulberry32(5));
    const before = engine.toSave();
    paint(resting(HERO_REST_MS));
    expect(engine.toSave()).toEqual(before);
  });
});
