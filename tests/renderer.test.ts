// T13 — renderer boot: scene/HUD painting (SPEC F21) + boot/smoke source
// contracts (SPEC F18). game.ts and hud.ts are deliberately DOM-free
// (SpriteCanvas), so their behavior runs under node with a recording canvas.
// src/renderer/index.ts and the main-process smoke path value-import
// DOM/electron (unloadable under vitest — see tests/window.test.ts), so those
// are source-contract pins; their runtime is covered by `npm run smoke`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  activeCompanions,
  createEngine,
  FEVER_INPUTS,
  format,
  HERO_ATTACK_MS,
  MONSTER_DYING_MS,
  MONSTER_HIT_MS,
  MONSTER_SPAWNING_MS,
  effectiveness,
  monsterForIndex,
  monsterMaxHp,
  mulberry32,
  partyOrder,
  sizeOf,
  typeOf,
  xpToNext,
} from '../src/core/index.js';
import { DEFAULT_SAVE } from '../src/core/index.js';
import type {
  BattleReplay,
  Companion,
  GameEvent,
  GameState,
  SaveFileV1,
  SaveFileV2,
  WireBlow,
} from '../src/core/index.js';
import { COMPANION_ATTACK_MS } from '../src/core/engine.js';
import {
  ATTACK_FRAME_MS,
  BLOW_FLOAT_LIFT,
  BLOW_MS_MAX,
  BLOW_MS_MIN,
  blowMs,
  createGame,
  createSaveScheduler,
  FEVER_SPARKLE_MS,
  GROUND_Y,
  HERO_X,
  HERO_Y,
  HP_BAR,
  IDLE_FRAME_MS,
  MONSTER_X,
  OPPONENT_NAME_Y,
  OPPONENT_ORIGIN_X,
  REPLAY_MS,
  SAVE_DEBOUNCE_MS,
  SPRITE_SCALE,
  TYPE_BADGE_GAP,
  VIEW_H,
  VIEW_W,
} from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import {
  BANNER_FLASH_MS,
  BANNER_MS,
  BANNER_SCALE,
  BANNER_Y,
  createBanner,
  createFloatPool,
  CRIT_FLOAT_SCALE,
  DEFEAT_TEXT,
  FEVER_TEXT,
  VICTORY_TEXT,
  drawBanner,
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  drawMeter,
  FLOAT_FADE_RATIO,
  FLOAT_LIFE_MS,
  FLOAT_POOL_SIZE,
  floatColor,
  LEVEL_UP_TEXT,
  showBanner,
  spawnFloat,
  tickBanner,
  tickFloats,
} from '../src/renderer/hud.js';
import {
  createParticlePool,
  DROP_ARC_MS,
  DROP_FLY_MS,
  drawParticles,
  SCATTER_LIFE_MS,
  SPARKLE_COUNT,
  spawnSpriteScatter,
} from '../src/renderer/anim.js';
import { EFFECTS, hitColorOf } from '../src/renderer/effects.js';
import {
  BOSS_HP_BAR_Y,
  COLORS,
  drawFeverAura,
  drawParty,
  drawSprite,
  drawText,
  drawTypeBadge,
  heroAttack,
  heroIdle,
  heroSlash,
  itemSprites,
  monsterSprites,
  paletteForTier,
  partySlots,
  shiftHue,
  textWidth,
  TYPE_COLORS,
} from '../src/renderer/sprites/index.js';
import type { Sprite } from '../src/renderer/sprites/index.js';
import type { SpeciesId } from '../src/core/index.js';

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

interface RectCall {
  x: number;
  y: number;
  w: number;
  h: number;
  fillStyle: string;
}

interface ClearCall {
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeCtx(): { ctx: GameCanvas; calls: RectCall[]; clears: ClearCall[] } {
  const calls: RectCall[] = [];
  const clears: ClearCall[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      calls.push({ x, y, w, h, fillStyle: String(ctx.fillStyle) });
    },
    clearRect(x: number, y: number, w: number, h: number): void {
      clears.push({ x, y, w, h });
    },
  };
  return { ctx, calls, clears };
}

// A real fresh engine state, so later GameState fields never break fixtures.
function stateFixture(overrides: Partial<GameState> = {}): GameState {
  return { ...createEngine(null, mulberry32(1)).getState(), ...overrides };
}

const rectKey = (c: RectCall): string =>
  `${String(c.x)},${String(c.y)},${String(c.w)},${String(c.h)},${c.fillStyle}`;

const v2: SaveFileV2 = {
  version: 2,
  level: 1,
  xp: 0,
  killCount: 0,
  coins: 0,
  items: {},
  monsterIndex: 0,
  monsterHp: String(monsterMaxHp(0)),
  companions: [],
  nextCompanionId: 1,
  souls: 0,
  rebirths: 0,
  bestIndex: 0,
};

// Every captured boss comes from index 7 — power 1 unless it is starred.
const companion = (id: string, speciesId: SpeciesId, stars = 0): Companion => ({
  id,
  speciesId,
  bossIndex: 7,
  level: 1,
  stars,
});

/** The pixels drawBanner paints for `text` at age 0 — its signature. */
const bannerKeys = (text: string): string[] => {
  const banner = createBanner();
  showBanner(banner, text);
  const { ctx, calls } = makeCtx();
  drawBanner(ctx, banner, VIEW_W);
  return calls.map(rectKey);
};

describe('drawMeter / drawHpBar (boxed bars)', () => {
  it('paints a steel frame with a void interior', () => {
    const { ctx, calls } = makeCtx();
    drawMeter(ctx, 10, 20, 30, 5, 0.5, COLORS.red);
    expect(calls[0]).toEqual({ x: 10, y: 20, w: 30, h: 5, fillStyle: COLORS.steel });
    expect(calls[1]).toEqual({ x: 11, y: 21, w: 28, h: 3, fillStyle: COLORS.void });
  });

  it('fills proportionally inside the box', () => {
    const { ctx, calls } = makeCtx();
    drawMeter(ctx, 10, 20, 30, 5, 0.5, COLORS.red);
    const fill = calls.filter((c) => c.fillStyle === COLORS.red);
    expect(fill).toEqual([{ x: 11, y: 21, w: 14, h: 3, fillStyle: COLORS.red }]);
  });

  it('paints no fill at ratio 0 and a full interior at ratio 1', () => {
    const empty = makeCtx();
    drawMeter(empty.ctx, 0, 0, 30, 5, 0, COLORS.red);
    expect(empty.calls.filter((c) => c.fillStyle === COLORS.red)).toEqual([]);

    const full = makeCtx();
    drawMeter(full.ctx, 0, 0, 30, 5, 1, COLORS.red);
    expect(full.calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(28);
  });

  it('clamps out-of-range and non-finite ratios into the box', () => {
    const over = makeCtx();
    drawMeter(over.ctx, 0, 0, 30, 5, 2.5, COLORS.red);
    expect(over.calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(28);

    const nan = makeCtx();
    drawMeter(nan.ctx, 0, 0, 30, 5, Number.NaN, COLORS.red);
    expect(nan.calls.filter((c) => c.fillStyle === COLORS.red)).toEqual([]);
  });

  it('keeps at least 1px of fill while hp is nonzero', () => {
    const { ctx, calls } = makeCtx();
    drawHpBar(ctx, 0, 0, 34, 5, 1n, 1000n);
    expect(calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(1);
  });

  it('drawHpBar fills red in proportion to hp/maxHp', () => {
    const { ctx, calls } = makeCtx();
    drawHpBar(ctx, 0, 0, 34, 5, 5n, 10n);
    expect(calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(16);
  });

  it('drawHpBar takes bigint hp and maxHp', () => {
    // SPEC F30: HP is unbounded, so the bar fills through core's exact
    // bigint ratio() — no Number() narrowing on the way in.
    const { ctx, calls } = makeCtx();
    const huge = monsterMaxHp(400); // ~10^26, far past Number.MAX_SAFE_INTEGER
    drawHpBar(ctx, 0, 0, 34, 5, huge / 4n, huge);
    expect(calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(8);
  });
});

describe('drawLevelHud (LV + XP bar above the hero, Assumption 17)', () => {
  // Anchor used by game.ts: hero center x, one pixel above the hero's head.
  const CX = HERO_X + Math.floor((14 * SPRITE_SCALE) / 2);
  const BOTTOM = HERO_Y - 2;

  it('hugs the anchor: the XP bar box ends at `bottom`, centered on `cx`', () => {
    const { ctx, calls } = makeCtx();
    drawLevelHud(ctx, stateFixture(), CX, BOTTOM);
    // First rect is the steel frame of the 40×4 meter.
    expect(calls[0]).toEqual({
      x: CX - 20,
      y: BOTTOM - 4,
      w: 40,
      h: 4,
      fillStyle: COLORS.steel,
    });
  });

  it('paints the LV label centered above the bar (never overlapping the hero)', () => {
    const { ctx, calls } = makeCtx();
    drawLevelHud(ctx, stateFixture(), CX, BOTTOM);
    const text = calls.filter((c) => c.fillStyle === COLORS.white && c.w === 1 && c.h === 1);
    expect(text.length).toBeGreaterThan(0);
    for (const c of text) {
      expect(c.y).toBeLessThan(BOTTOM - 4); // above the bar box
      expect(c.y).toBeLessThan(HERO_Y); // and therefore above the hero
      expect(Math.abs(c.x - CX)).toBeLessThanOrEqual(12); // roughly centered
    }
  });

  it('fills the XP bar in proportion to xp/xpToNext(level)', () => {
    const { ctx, calls } = makeCtx();
    const state = stateFixture({ level: 3, xp: 10 });
    drawLevelHud(ctx, state, CX, BOTTOM);
    const fill = calls.filter((c) => c.fillStyle === COLORS.cyan);
    expect(fill).toHaveLength(1);
    expect(fill[0]?.w).toBe(Math.max(1, Math.round(38 * (10 / xpToNext(3)))));
  });
});

describe('drawCounters (top-right kills + coins)', () => {
  it('right-aligns both rows inside the view', () => {
    const { ctx, calls } = makeCtx();
    drawCounters(ctx, stateFixture({ killCount: 128, coins: 9999 }), VIEW_W);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.x + c.w).toBeLessThanOrEqual(VIEW_W - 1);
      expect(c.x).toBeGreaterThan(VIEW_W / 2);
    }
  });

  it('draws the coin count in yellow next to the coin icon', () => {
    const { ctx, calls } = makeCtx();
    drawCounters(ctx, stateFixture({ coins: 7 }), VIEW_W);
    expect(calls.some((c) => c.fillStyle === COLORS.yellow)).toBe(true);
  });

  it('pops the coin row on collection: the count flashes white (T15)', () => {
    // The coin-count glyphs live at y >= 9 (second HUD row); the only white
    // pixels up there appear while the pop flash is on.
    const countFlash = (calls: RectCall[]): RectCall[] =>
      calls.filter((c) => c.w === 1 && c.h === 1 && c.y >= 9 && c.fillStyle === COLORS.white);

    const normal = makeCtx();
    drawCounters(normal.ctx, stateFixture({ coins: 7 }), VIEW_W);
    expect(countFlash(normal.calls)).toEqual([]);

    const popped = makeCtx();
    drawCounters(popped.ctx, stateFixture({ coins: 7 }), VIEW_W, true);
    expect(countFlash(popped.calls).length).toBeGreaterThan(0);
  });
});

describe('LEVEL UP! banner (T15)', () => {
  it('draws nothing until shown and nothing after it expires', () => {
    const banner = createBanner();
    const before = makeCtx();
    drawBanner(before.ctx, banner, VIEW_W);
    expect(before.calls).toEqual([]);

    showBanner(banner);
    tickBanner(banner, BANNER_MS);
    expect(banner.active).toBe(false);
    const after = makeCtx();
    drawBanner(after.ctx, banner, VIEW_W);
    expect(after.calls).toEqual([]);
  });

  it('draws a centered double-size banner that flashes yellow/white', () => {
    const banner = createBanner();
    showBanner(banner);

    const fresh = makeCtx();
    drawBanner(fresh.ctx, banner, VIEW_W);
    expect(fresh.calls.length).toBeGreaterThan(0);
    for (const c of fresh.calls) {
      expect(c.w).toBe(BANNER_SCALE);
      expect(c.h).toBe(BANNER_SCALE);
      expect(c.y).toBeGreaterThanOrEqual(BANNER_Y);
      expect(c.y).toBeLessThan(BANNER_Y + 5 * BANNER_SCALE);
      expect(c.fillStyle).toBe(COLORS.yellow);
    }
    // Horizontally centered: the text block sits well inside both edges.
    const xs = fresh.calls.map((c) => c.x);
    expect(Math.min(...xs)).toBeGreaterThan(30);
    expect(Math.max(...xs)).toBeLessThan(VIEW_W - 30);

    tickBanner(banner, BANNER_FLASH_MS); // next flash phase
    const flashed = makeCtx();
    drawBanner(flashed.ctx, banner, VIEW_W);
    expect(flashed.calls.length).toBeGreaterThan(0);
    expect(flashed.calls.every((c) => c.fillStyle === COLORS.white)).toBe(true);
  });

  it('banner text is configurable: FEVER! and LEVEL UP! both render', () => {
    const banner = createBanner();
    showBanner(banner, FEVER_TEXT);
    const fever = makeCtx();
    drawBanner(fever.ctx, banner, VIEW_W);

    showBanner(banner);
    const levelUp = makeCtx();
    drawBanner(levelUp.ctx, banner, VIEW_W);

    expect(fever.calls.length).toBeGreaterThan(0);
    expect(levelUp.calls.length).toBeGreaterThan(0);
    expect(fever.calls).not.toEqual(levelUp.calls);
    expect(banner.text).toBe(LEVEL_UP_TEXT);
  });
});

describe('floating damage numbers (fixed pool)', () => {
  it('floatColor maps super to yellow, weak to steel and normal to white', () => {
    expect(floatColor('super')).toBe(COLORS.yellow);
    expect(floatColor('weak')).toBe(COLORS.steel);
    expect(floatColor('normal')).toBe(COLORS.white);
  });

  it('pre-allocates an inactive pool of the fixed size', () => {
    const pool = createFloatPool();
    expect(pool).toHaveLength(FLOAT_POOL_SIZE);
    expect(pool.every((f) => !f.active)).toBe(true);
  });

  it('never grows under key-mash: overflow recycles the oldest slot', () => {
    const pool = createFloatPool();
    for (let i = 0; i < FLOAT_POOL_SIZE + 5; i++) {
      spawnFloat(pool, 100, 60, String(i), false);
      tickFloats(pool, 1); // age existing floats so "oldest" is well-defined
    }
    expect(pool).toHaveLength(FLOAT_POOL_SIZE);
    expect(pool.filter((f) => f.active)).toHaveLength(FLOAT_POOL_SIZE);
    // The newest spawn survived; the oldest were recycled.
    expect(pool.some((f) => f.text === String(FLOAT_POOL_SIZE + 4))).toBe(true);
    expect(pool.some((f) => f.text === '0')).toBe(false);
  });

  it('expires a float after its lifetime', () => {
    const pool = createFloatPool();
    spawnFloat(pool, 100, 60, '5', false);
    tickFloats(pool, FLOAT_LIFE_MS - 1);
    expect(pool[0]?.active).toBe(true);
    tickFloats(pool, 1);
    expect(pool[0]?.active).toBe(false);
  });

  it('rises as it ages and draws crits in yellow', () => {
    const pool = createFloatPool();
    spawnFloat(pool, 100, 60, '9', true);

    const fresh = makeCtx();
    drawFloats(fresh.ctx, pool);
    tickFloats(pool, FLOAT_LIFE_MS / 2);
    const aged = makeCtx();
    drawFloats(aged.ctx, pool);

    const freshTop = Math.min(...fresh.calls.map((c) => c.y));
    const agedTop = Math.min(...aged.calls.map((c) => c.y));
    expect(agedTop).toBeLessThan(freshTop);
    expect(fresh.calls.every((c) => c.fillStyle === COLORS.yellow)).toBe(true);
  });

  it('fades to a dim color in the last third of its life', () => {
    const pool = createFloatPool();
    spawnFloat(pool, 100, 60, '3', false);
    tickFloats(pool, FLOAT_LIFE_MS * FLOAT_FADE_RATIO - 100);
    const fresh = makeCtx();
    drawFloats(fresh.ctx, pool);
    expect(fresh.calls.length).toBeGreaterThan(0);
    expect(fresh.calls.every((c) => c.fillStyle === COLORS.white)).toBe(true);

    tickFloats(pool, 100); // now exactly at the fade boundary
    const faded = makeCtx();
    drawFloats(faded.ctx, pool);
    expect(faded.calls.length).toBeGreaterThan(0);
    expect(faded.calls.every((c) => c.fillStyle === COLORS.steel)).toBe(true);
  });

  it('draws crit numbers double-size and normal numbers single-size', () => {
    const critPool = createFloatPool();
    spawnFloat(critPool, 100, 60, '9', true);
    const crit = makeCtx();
    drawFloats(crit.ctx, critPool);
    expect(crit.calls.length).toBeGreaterThan(0);
    expect(
      crit.calls.every((c) => c.w === CRIT_FLOAT_SCALE && c.h === CRIT_FLOAT_SCALE),
    ).toBe(true);

    const normalPool = createFloatPool();
    spawnFloat(normalPool, 100, 60, '9', false);
    const normal = makeCtx();
    drawFloats(normal.ctx, normalPool);
    expect(normal.calls.length).toBeGreaterThan(0);
    expect(normal.calls.every((c) => c.w === 1 && c.h === 1)).toBe(true);
  });
});

describe('createGame (scene orchestration)', () => {
  it('draws the full scene: clear, field strip, hero left, monster right, HUD', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    const { ctx, calls, clears } = makeCtx();
    game.draw(ctx);

    expect(clears).toEqual([{ x: 0, y: 0, w: VIEW_W, h: VIEW_H }]);
    // Field strip spans the full width at the ground line.
    expect(calls.some((c) => c.y === GROUND_Y && c.w === VIEW_W)).toBe(true);
    // Hero pixels (2×2 rects, Assumption 17) within the scaled art box.
    expect(
      calls.some(
        (c) =>
          c.w === SPRITE_SCALE &&
          c.x >= HERO_X &&
          c.x < HERO_X + heroIdle.w * SPRITE_SCALE &&
          c.y < GROUND_Y,
      ),
    ).toBe(true);
    // Monster pixels within the scaled monster art box on the right.
    expect(
      calls.some(
        (c) =>
          c.w === SPRITE_SCALE &&
          c.x >= MONSTER_X &&
          c.x < MONSTER_X + 12 * SPRITE_SCALE &&
          c.y < GROUND_Y,
      ),
    ).toBe(true);
    // Boxed HP bar frame above the monster.
    expect(
      calls.some((c) => c.y === HP_BAR.y && c.w === HP_BAR.w && c.fillStyle === COLORS.steel),
    ).toBe(true);
    // Everything stays inside the canvas.
    for (const c of calls) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.w).toBeLessThanOrEqual(VIEW_W);
      expect(c.y + c.h).toBeLessThanOrEqual(VIEW_H);
    }
  });

  it('attack() steps the engine and spawns a floating damage number', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    const before = makeCtx();
    game.draw(before.ctx);

    const hpBefore = game.getState().monsterHp;
    const events = game.attack('keyboard');
    expect(events[0]?.type).toBe('attack');
    expect(game.getState().monsterHp).toBeLessThan(hpBefore);

    const after = makeCtx();
    game.draw(after.ctx);
    // The damage number paints between the HP bar and the counters — a
    // region that held no pixels before the attack.
    const floatRegion = (calls: RectCall[]): RectCall[] =>
      calls.filter((c) => c.y >= 40 && c.y < HP_BAR.y && c.x >= 100);
    expect(floatRegion(before.calls)).toEqual([]);
    expect(floatRegion(after.calls).length).toBeGreaterThan(0);
  });

  it('update() advances the idle bob to the second frame after IDLE_FRAME_MS', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    const frame0 = makeCtx();
    game.draw(frame0.ctx);
    game.update(IDLE_FRAME_MS);
    const frame1 = makeCtx();
    game.draw(frame1.ctx);
    expect(frame1.calls).not.toEqual(frame0.calls);
  });

  it('update() treats non-finite and negative dt as 0', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    const before = makeCtx();
    game.draw(before.ctx);
    game.update(Number.NaN);
    game.update(-500);
    const after = makeCtx();
    game.draw(after.ctx);
    expect(after.calls).toEqual(before.calls);
  });

  it('tints the monster per tier at draw time (tier 1 uses shifted colors)', () => {
    // Monster index 5 is the 2nd slime (tier 1) — hue-shifted palette.
    const tier1 = createGame(
      createEngine(
        { version: 1, level: 1, xp: 0, killCount: 5, coins: 0, items: {}, monsterIndex: 5, monsterHp: 20 },
        mulberry32(1),
      ),
    );
    const tier0 = createGame(createEngine(null, mulberry32(1)));

    const a = makeCtx();
    tier0.draw(a.ctx);
    const b = makeCtx();
    tier1.draw(b.ctx);

    const monsterColors = (calls: RectCall[]): Set<string> =>
      new Set(
        calls
          .filter(
            (c) =>
              c.w === SPRITE_SCALE &&
              c.x >= MONSTER_X &&
              c.x < MONSTER_X + 12 * SPRITE_SCALE &&
              c.y < GROUND_Y,
          )
          .map((c) => c.fillStyle),
      );
    expect(monsterColors(b.calls)).not.toEqual(monsterColors(a.calls));
  });
});

describe('combat presentation (core FSMs, T14)', () => {
  const heroPixels = (calls: RectCall[]): string[] =>
    calls
      .filter(
        (c) =>
          c.w === SPRITE_SCALE &&
          c.x >= HERO_X &&
          c.x < HERO_X + 14 * SPRITE_SCALE &&
          c.y >= GROUND_Y - 12 * SPRITE_SCALE &&
          c.y < GROUND_Y,
      )
      .map((c) => `${String(c.x)},${String(c.y)},${c.fillStyle}`);

  const monsterPixels = (calls: RectCall[]): RectCall[] =>
    calls.filter(
      (c) =>
        c.w === SPRITE_SCALE &&
        c.x >= MONSTER_X &&
        c.x < MONSTER_X + 12 * SPRITE_SCALE &&
        c.y >= GROUND_Y - 12 * SPRITE_SCALE &&
        c.y < GROUND_Y,
    );

  it('attack() restarts the 180ms hero attack animation on every input', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    expect(game.getHeroAnim().state).toBe('idle');

    game.attack('keyboard');
    expect(game.getHeroAnim()).toEqual({ state: 'attack', t: 0 });

    game.update(HERO_ATTACK_MS / 2);
    expect(game.getHeroAnim()).toEqual({ state: 'attack', t: HERO_ATTACK_MS / 2 });

    game.attack('mouse'); // spam mid-attack restarts the animation
    expect(game.getHeroAnim()).toEqual({ state: 'attack', t: 0 });

    game.update(HERO_ATTACK_MS);
    expect(game.getHeroAnim().state).toBe('idle');
  });

  it('draws the attack pose instead of the idle bob while attacking', () => {
    const idle = createGame(createEngine(null, mulberry32(42)));
    const attacking = createGame(createEngine(null, mulberry32(42)));
    attacking.attack('keyboard');

    const a = makeCtx();
    idle.draw(a.ctx);
    const b = makeCtx();
    attacking.draw(b.ctx);
    expect(heroPixels(b.calls)).not.toEqual(heroPixels(a.calls));
  });

  it('shows the slash arc overlay only during the attack frame after wind-up', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    game.attack('keyboard');

    // The overlay paints in front of the blade — at 1x units the slash effect
    // particles share its box, so the art itself is the reference (F64).
    const arc = makeCtx();
    drawSprite(arc.ctx, heroSlash, 0, HERO_X + heroAttack.w * SPRITE_SCALE, HERO_Y + 2, {
      scale: SPRITE_SCALE,
    });
    expect(arc.calls.length).toBeGreaterThan(0);
    const showsArc = (calls: RectCall[]): boolean => {
      const painted = new Set(calls.map(rectKey));
      return arc.calls.every((c) => painted.has(rectKey(c)));
    };

    const windUp = makeCtx();
    game.draw(windUp.ctx); // t=0: wind-up frame, no slash yet
    expect(showsArc(windUp.calls)).toBe(false);

    game.update(ATTACK_FRAME_MS); // t=60: the slash frame
    const slash = makeCtx();
    game.draw(slash.ctx);
    expect(showsArc(slash.calls)).toBe(true);
  });

  it('flashes the monster white for the hit duration, then returns to color', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    game.attack('keyboard'); // slime at 10 hp — never a killing first blow
    expect(game.getMonsterAnim()).toEqual({ state: 'hit', t: 0 });

    const flash = makeCtx();
    game.draw(flash.ctx);
    // The hit-effect burst shares the box at 1x units, so the flash is pinned
    // against the tinted hit pose itself (F64).
    const scale = sizeOf(game.getState().monster.speciesId);
    const hitPose = monsterSprites.slime.hit;
    const ref = makeCtx();
    drawSprite(ref.ctx, hitPose, 0, MONSTER_X, GROUND_Y - hitPose.h * scale, {
      tint: COLORS.white,
      scale,
    });
    expect(ref.calls.length).toBeGreaterThan(0);
    expect(ref.calls.every((c) => c.fillStyle === COLORS.white)).toBe(true);
    const flashed = new Set(flash.calls.map(rectKey));
    expect(ref.calls.every((c) => flashed.has(rectKey(c)))).toBe(true);

    game.update(MONSTER_HIT_MS);
    expect(game.getMonsterAnim().state).toBe('idle');
    const after = makeCtx();
    game.draw(after.ctx);
    expect(monsterPixels(after.calls).some((c) => c.fillStyle !== COLORS.white)).toBe(true);
  });

  it('a killing blow plays the 500ms dying scatter, then spawns the next monster', () => {
    const save: SaveFileV1 = {
      version: 1,
      level: 1,
      xp: 0,
      killCount: 0,
      coins: 0,
      items: {},
      monsterIndex: 0,
      monsterHp: 1,
    };
    const game = createGame(createEngine(save, mulberry32(7)));
    const events = game.attack('keyboard');
    expect(events.some((e) => e.type === 'monsterKilled')).toBe(true);
    expect(game.getMonsterAnim()).toEqual({ state: 'dying', t: 0 });

    game.update(MONSTER_DYING_MS);
    expect(game.getMonsterAnim()).toEqual({ state: 'spawning', t: 0 });

    game.update(MONSTER_SPAWNING_MS);
    expect(game.getMonsterAnim().state).toBe('idle');
  });
});

describe('kill/loot/spawn/level-up presentation (T15)', () => {
  const killSave: SaveFileV1 = {
    version: 1,
    level: 1,
    xp: 0,
    killCount: 0,
    coins: 0,
    items: {},
    monsterIndex: 0,
    monsterHp: 1,
  };

  // Scaled art pixels inside the monster box, excluding item-drop colors (the
  // coin launches from the monster and is yellow/orange — never in slime art).
  // The killing blow's hit burst sits on the monster's centre cell, which at
  // 1x units is the same size as an art pixel (F64) — skip that one cell.
  const CENTRE = { x: MONSTER_X + 12 / 2, y: GROUND_Y - 10 / 2 };
  const monsterBox = (calls: RectCall[]): string[] =>
    calls
      .filter(
        (c) =>
          c.w === SPRITE_SCALE &&
          c.x >= MONSTER_X &&
          c.x < MONSTER_X + 12 * SPRITE_SCALE &&
          c.y >= GROUND_Y - 12 * SPRITE_SCALE &&
          c.y < GROUND_Y &&
          !(c.x === CENTRE.x && c.y === CENTRE.y) &&
          c.fillStyle !== COLORS.yellow &&
          c.fillStyle !== COLORS.orange,
      )
      .map((c) => `${String(c.x)},${String(c.y)},${c.fillStyle}`);

  it('the dying monster scatters into its own pixels, which then move', () => {
    // Reference: the same monster drawn alive (idle frame 0, untinted tier 0).
    const alive = createGame(createEngine(killSave, mulberry32(7)));
    const aliveDraw = makeCtx();
    alive.draw(aliveDraw.ctx);
    const spritePixels = new Set(monsterBox(aliveDraw.calls));
    expect(spritePixels.size).toBeGreaterThan(0);

    const game = createGame(createEngine(killSave, mulberry32(7)));
    game.attack('keyboard');
    expect(game.getMonsterAnim().state).toBe('dying');

    // At the moment of death the scatter IS the sprite: same pixels/colors.
    const at0 = makeCtx();
    game.draw(at0.ctx);
    expect(new Set(monsterBox(at0.calls))).toEqual(spritePixels);
    // The HP bar hides while the scatter plays.
    expect(
      at0.calls.some((c) => c.y === HP_BAR.y && c.w === HP_BAR.w && c.fillStyle === COLORS.steel),
    ).toBe(false);

    // Under gravity the pixels leave their sprite positions.
    game.update(200);
    const at200 = makeCtx();
    game.draw(at200.ctx);
    expect(new Set(monsterBox(at200.calls))).not.toEqual(spritePixels);

    // Once dying ends the HP bar pops back with the next monster.
    game.update(MONSTER_DYING_MS - 200);
    const spawn = makeCtx();
    game.draw(spawn.ctx);
    expect(
      spawn.calls.some((c) => c.y === HP_BAR.y && c.w === HP_BAR.w && c.fillStyle === COLORS.steel),
    ).toBe(true);
  });

  it('the item drop arcs through the gap, then flies off to the coin counter', () => {
    const game = createGame(createEngine(killSave, mulberry32(7)));
    const events = game.attack('keyboard');
    expect(events.some((e) => e.type === 'itemDropped')).toBe(true);

    // Coin pixels (orange core) in the gap between hero and monster, near
    // the ground — a region nothing else paints in orange 1px cells.
    const corridor = (calls: RectCall[]): RectCall[] =>
      calls.filter(
        (c) =>
          c.w === 1 &&
          c.fillStyle === COLORS.orange &&
          c.x >= 90 &&
          c.x < MONSTER_X &&
          c.y >= 70,
      );

    game.update(DROP_ARC_MS / 2); // mid-arc
    const mid = makeCtx();
    game.draw(mid.ctx);
    expect(corridor(mid.calls).length).toBeGreaterThan(0);

    game.update(DROP_ARC_MS / 2 + DROP_FLY_MS); // full flight elapsed
    const done = makeCtx();
    game.draw(done.ctx);
    expect(corridor(done.calls)).toEqual([]);
    // Arrival pops the counter: the coin count flashes white this frame.
    expect(
      done.calls.some(
        (c) => c.w === 1 && c.y >= 9 && c.y < 14 && c.x > 130 && c.fillStyle === COLORS.white,
      ),
    ).toBe(true);
  });

  it('the next monster pops in bottom-up during spawning', () => {
    const game = createGame(createEngine(killSave, mulberry32(7)));
    game.attack('keyboard');
    game.update(MONSTER_DYING_MS);
    expect(game.getMonsterAnim()).toEqual({ state: 'spawning', t: 0 });

    // Restrict to the monster's own scaled height band so a still-fading
    // damage float above the box can never pollute the top-row measurement.
    const popInPixels = (calls: RectCall[]): RectCall[] =>
      calls.filter(
        (c) =>
          c.w === SPRITE_SCALE &&
          c.x >= MONSTER_X &&
          c.x < MONSTER_X + 12 * SPRITE_SCALE &&
          c.y >= GROUND_Y - 10 * SPRITE_SCALE &&
          c.y < GROUND_Y,
      );

    game.update(90); // early spawn: only the bottom rows are revealed
    const early = makeCtx();
    game.draw(early.ctx);
    const earlyPixels = popInPixels(early.calls);
    expect(earlyPixels.length).toBeGreaterThan(0);
    const earlyTop = Math.min(...earlyPixels.map((c) => c.y));

    game.update(60); // later: the reveal has grown upward
    const later = makeCtx();
    game.draw(later.ctx);
    const laterPixels = popInPixels(later.calls);
    const laterTop = Math.min(...laterPixels.map((c) => c.y));
    expect(laterTop).toBeLessThan(earlyTop);
  });

  it('a level-up shows the flashing banner and hero sparkles', () => {
    const save: SaveFileV1 = { ...killSave, xp: 19 }; // +5 xp on kill → level 2
    const game = createGame(createEngine(save, mulberry32(7)));
    const events = game.attack('keyboard');
    expect(events.some((e) => e.type === 'levelUp')).toBe(true);

    const bannerPixels = (calls: RectCall[]): RectCall[] =>
      calls.filter(
        (c) =>
          c.w === BANNER_SCALE &&
          c.h === BANNER_SCALE &&
          c.y >= BANNER_Y &&
          c.y < BANNER_Y + 5 * BANNER_SCALE,
      );

    const during = makeCtx();
    game.draw(during.ctx);
    expect(bannerPixels(during.calls).length).toBeGreaterThan(0);

    // The sparkle ring bursts from the hero's center (all 12 start there).
    const heroCenter = during.calls.filter(
      (c) =>
        c.w === 1 &&
        c.x === HERO_X + Math.floor((heroIdle.w * SPRITE_SCALE) / 2) &&
        c.y === HERO_Y + 4 * SPRITE_SCALE,
    );
    expect(heroCenter.length).toBeGreaterThanOrEqual(SPARKLE_COUNT);

    game.update(BANNER_MS); // banner lifetime over
    const after = makeCtx();
    game.draw(after.ctx);
    expect(bannerPixels(after.calls)).toEqual([]);
  });
});

describe('engine tick, bosses, companions and fever (T37, SPEC F36)', () => {
  const keys = (calls: RectCall[]): string[] => calls.map(rectKey).sort();

  /** Centre of the boss at `index`: 12x10 art at its species size plus one. */
  const bossCentre = (index: number): { x: number; y: number } => {
    const scale = sizeOf(monsterForIndex(index).speciesId) + 1;
    return { x: MONSTER_X + (12 * scale) / 2, y: GROUND_Y - (10 * scale) / 2 };
  };

  it('update() ticks the engine and returns companion events to the save scheduler', () => {
    const game = createGame(
      createEngine({ ...v2, monsterHp: '1', companions: [companion('c1', 'slime')] }, mulberry32(3)),
    );
    expect(game.update(COMPANION_ATTACK_MS - 1)).toEqual([]); // below one volley
    const events = game.update(1);
    expect(events.filter((e) => e.type === 'companionAttack')).toHaveLength(1);
    expect(events.some((e) => e.type === 'monsterKilled')).toBe(true);

    // The volley reaches the save scheduler exactly like an attack batch does.
    let saved = 0;
    const scheduler = createSaveScheduler({
      save: () => {
        saved += 1;
      },
      setTimer: () => 0,
      clearTimer: () => undefined,
    });
    scheduler.onEvents(events);
    expect(saved).toBe(1);
    // ...and a companion kill runs the same presentation as a hero kill.
    expect(game.getMonsterAnim().state).toBe('dying');
  });

  it('damage floats use the letter-suffix format', () => {
    // Level 5000 deals 5000 damage a hit: the float reads '5.00A', not '5000'.
    const game = createGame(createEngine({ ...v2, level: 5000 }, mulberry32(42)));
    const hit = game.attack('keyboard')[0];
    if (hit?.type !== 'attack') {
      throw new Error('expected an attack event');
    }
    expect(format(hit.damage)).not.toBe(String(hit.damage));

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const floatRegion = (cs: RectCall[]): RectCall[] =>
      cs.filter((c) => c.y >= 40 && c.y < HP_BAR.y && c.x >= 100);
    const rendered = (text: string): string[] => {
      const pool = createFloatPool();
      spawnFloat(pool, MONSTER_X + (12 * SPRITE_SCALE) / 2, HP_BAR.y - 6, text, hit.crit);
      const ref = makeCtx();
      drawFloats(ref.ctx, pool);
      return keys(ref.calls);
    };
    expect(keys(floatRegion(calls))).toEqual(rendered(format(hit.damage)));
    expect(keys(floatRegion(calls))).not.toEqual(rendered(String(hit.damage)));
  });

  it('a monster hit spawns the species hit effect', () => {
    // Monster 3 is a golem: at draw scale 3 its art cells are 3x3, so only the
    // 1x1 burst particles can land on the centre cell (F64).
    const game = createGame(
      createEngine(
        { ...v2, monsterIndex: 3, monsterHp: String(monsterMaxHp(3)), bestIndex: 3 },
        mulberry32(42),
      ),
    );
    const scale = sizeOf(game.getState().monster.speciesId);
    expect(scale).toBe(3);
    const preset = EFFECTS.hit.golem;
    // The burst starts on the monster's centre, so every particle sits there.
    const burst = (cs: RectCall[]): RectCall[] =>
      cs.filter(
        (c) =>
          c.w === preset.size &&
          c.x === MONSTER_X + (12 * scale) / 2 &&
          c.y === GROUND_Y - (10 * scale) / 2 &&
          (c.fillStyle === preset.colors[0] || c.fillStyle === preset.colors[1]),
      );

    const before = makeCtx();
    game.draw(before.ctx);
    expect(burst(before.calls)).toEqual([]);

    game.attack('keyboard');
    const after = makeCtx();
    game.draw(after.ctx);
    expect(burst(after.calls)).toHaveLength(preset.count);
  });

  it('a boss draws at species size plus one with a crown and its hp bar raised', () => {
    // Monster index 7 is the first boss (5x hp). No floatRegion here: the
    // boss's own top rows fall inside it.
    const game = createGame(
      createEngine(
        { ...v2, monsterIndex: 7, monsterHp: String(monsterMaxHp(7) * 5n), bestIndex: 7 },
        mulberry32(5),
      ),
    );
    expect(game.getState().monster.boss).toBe(true);

    const { ctx, calls } = makeCtx();
    game.draw(ctx);

    // Reference built from primitives: tier-tinted species art at its hidden
    // size plus one, with its feet on the ground and crown above the head.
    const speciesId = game.getState().monster.speciesId as SpeciesId;
    const idle = monsterSprites[speciesId].idle;
    const scale = sizeOf(speciesId) + 1;
    const top = GROUND_Y - idle.h * scale;
    const crown = itemSprites.crown;
    const crownX = MONSTER_X + Math.floor((idle.w * scale - crown.w) / 2);
    const ref = makeCtx();
    drawSprite(
      ref.ctx,
      { ...idle, palette: paletteForTier(idle.palette, game.getState().monster.tier) },
      0,
      MONSTER_X,
      top,
      { scale },
    );
    drawSprite(ref.ctx, crown, 0, crownX, top - crown.h);

    // The boss band starts at the crown and ends at the ground; the raised hp
    // bar and its type badge sit above it on the taller v3 field.
    const bossBand = (cs: RectCall[]): RectCall[] =>
      cs.filter(
        (c) =>
          c.x >= MONSTER_X &&
          c.y >= top - crown.h &&
          c.y < GROUND_Y &&
          ((c.w === scale && c.h === scale) || (c.w === 1 && c.h === 1)),
      );
    expect(ref.calls.length).toBeGreaterThan(0);
    expect(keys(bossBand(calls))).toEqual(keys(ref.calls));
    expect(bossBand(calls).some((c) => c.w === scale)).toBe(true);
    // Nothing paints at the species' ordinary size: the boss really is bigger.
    expect(bossBand(calls).filter((c) => c.w === sizeOf(speciesId))).toEqual([]);

    // The hp bar is raised out of the taller sprite's way.
    const barFrame = (y: number): boolean =>
      calls.some((c) => c.y === y && c.w === HP_BAR.w && c.fillStyle === COLORS.steel);
    expect(barFrame(BOSS_HP_BAR_Y)).toBe(true);
    expect(barFrame(HP_BAR.y)).toBe(false);
  });

  it('a boss spawn fires the shockwave effect', () => {
    // Killing monster 6 spawns the boss at index 7.
    const game = createGame(
      createEngine({ ...v2, monsterIndex: 6, monsterHp: '1', bestIndex: 6 }, mulberry32(5)),
    );
    const spawned = game.attack('keyboard').find((e) => e.type === 'monsterSpawned');
    if (spawned?.type !== 'monsterSpawned') {
      throw new Error('expected a monsterSpawned event');
    }
    expect(spawned.monster.boss).toBe(true);

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const preset = EFFECTS.bossShockwave;
    // The ring starts on the boss's centre; the dead monster's scatter is 2x
    // and only ever lands on even rows, so it cannot pollute this.
    const centre = bossCentre(7);
    const ring = calls.filter(
      (c) => c.w === preset.size && c.x === centre.x && c.y === centre.y,
    );
    expect(ring).toHaveLength(preset.count);
    expect(new Set(ring.map((c) => c.fillStyle))).toEqual(new Set(preset.colors));
  });

  it('active companions draw as an overlapping party group left of the hero, flipped to face right, star-tinted', () => {
    const roster = [
      companion('c1', 'ghost', 2),
      companion('c2', 'golem', 1),
      companion('c3', 'dragon'),
    ];
    const game = createGame(
      createEngine({ ...v2, companions: roster, nextCompanionId: 4 }, mulberry32(5)),
    );
    const state = game.getState();
    const party = partyOrder(activeCompanions(state.companions, state.monster.type));
    const slots = partySlots(party, GROUND_Y);
    // Back to front: bigger species stand behind, higher up and further left.
    expect(slots.map((s) => s.scale)).toEqual(party.map((c) => sizeOf(c.speciesId)));
    expect(slots.map((s) => s.scale)).toEqual([...slots.map((s) => s.scale)].sort((a, b) => b - a));
    expect(slots.map((s) => s.x)).toEqual([...slots.map((s) => s.x)].sort((a, b) => a - b));
    expect(slots.map((s) => s.y)).toEqual([...slots.map((s) => s.y)].sort((a, b) => a - b));

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = calls.map(rectKey).join('|');

    // The whole group paints in one contiguous back-to-front run.
    const group = makeCtx();
    drawParty(group.ctx, party, 0, GROUND_Y);
    expect(group.calls.length).toBeGreaterThan(0);
    expect(painted).toContain(group.calls.map(rectKey).join('|'));

    for (let r = 0; r < party.length; r++) {
      const member = party[r];
      const slot = slots[r];
      if (member === undefined || slot === undefined) {
        throw new Error('missing party member');
      }
      const idle = monsterSprites[member.speciesId as SpeciesId].idle;
      const top = slot.y - idle.h * slot.scale;
      // Facing right really is a mirror, and the stars really do tint.
      const plain = makeCtx();
      drawSprite(plain.ctx, idle, 0, slot.x, top, { scale: slot.scale });
      expect(painted).not.toContain(plain.calls.map(rectKey).join('|'));
      if (member.stars > 0) {
        const untinted = makeCtx();
        drawSprite(untinted.ctx, idle, 0, slot.x, top, { flipX: true, scale: slot.scale });
        expect(painted).not.toContain(untinted.calls.map(rectKey).join('|'));
      }
      // The group stands left of the hero, feet on (or just above) the ground.
      expect(slot.x).toBeLessThan(HERO_X);
      expect(slot.y).toBeLessThanOrEqual(GROUND_Y);
    }
  });

  it('a companion volley spawns one projectile per companion toward the monster', () => {
    const roster = [companion('c1', 'ghost'), companion('c2', 'dragon')];
    const game = createGame(
      createEngine({ ...v2, companions: roster, nextCompanionId: 3 }, mulberry32(5)),
    );
    const events = game.update(COMPANION_ATTACK_MS);
    expect(events.filter((e) => e.type === 'companionAttack')).toHaveLength(2);
    expect(events.some((e) => e.type === 'monsterKilled')).toBe(false);

    const preset = EFFECTS.companionProjectile;
    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const state = game.getState();
    const party = partyOrder(activeCompanions(state.companions, state.monster.type));
    const centres = partySlots(party, GROUND_Y).map((slot) => ({
      x: slot.x + (12 * slot.scale) / 2,
      y: slot.y - (10 * slot.scale) / 2,
    }));
    for (let r = 0; r < party.length; r++) {
      const c = party[r];
      const centre = centres[r];
      if (c === undefined || centre === undefined) {
        throw new Error('missing party member');
      }
      // One shot per companion, from its slot centre, in its own hit colour.
      expect(
        calls.filter(
          (shot) =>
            shot.w === preset.size &&
            shot.x === centre.x &&
            shot.y === centre.y &&
            shot.fillStyle === EFFECTS.hit[c.speciesId as SpeciesId].colors[0],
        ),
      ).toHaveLength(1);
    }

    // 100 ms later the shots have travelled right, toward the monster.
    game.update(100);
    const later = makeCtx();
    game.draw(later.ctx);
    const back = centres[0];
    if (back === undefined) {
      throw new Error('empty party');
    }
    const flown = later.calls.filter(
      (r) => r.w === preset.size && r.y === back.y && r.x === back.x + preset.speed / 10,
    );
    expect(flown).toHaveLength(1);
    expect(back.x + preset.speed / 10).toBeLessThan(MONSTER_X);
  });

  it('a capture shows the sparkle effect and the new companion appears', () => {
    // Index 15 is a slime boss (its hit art shares no colour with the
    // sparkle); seed 2 makes the capture roll succeed.
    const game = createGame(
      createEngine({ ...v2, monsterIndex: 15, monsterHp: '1', bestIndex: 15 }, mulberry32(2)),
    );
    expect(game.attack('keyboard').some((e) => e.type === 'bossCaptured')).toBe(true);
    expect(game.getState().companions).toHaveLength(1);

    const preset = EFFECTS.captureSparkle;
    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const sparkles = (x: number, y: number): RectCall[] =>
      calls.filter(
        (c) =>
          c.w === preset.size &&
          c.x === x &&
          c.y === y &&
          (c.fillStyle === preset.colors[0] || c.fillStyle === preset.colors[1]),
      );
    const state = game.getState();
    const party = partyOrder(activeCompanions(state.companions, state.monster.type));
    expect(party.map((c) => c.id)).toEqual(['c1']);
    const slot = partySlots(party, GROUND_Y)[0];
    if (slot === undefined) {
      throw new Error('the captured boss is not in the party');
    }
    const centre = { x: slot.x + (12 * slot.scale) / 2, y: slot.y - (10 * slot.scale) / 2 };
    const boss = bossCentre(15);
    expect(sparkles(boss.x, boss.y)).toHaveLength(preset.count);
    expect(sparkles(centre.x, centre.y)).toHaveLength(preset.count);

    // Once the sparkles burn out the captured boss stands in the party.
    game.update(MONSTER_DYING_MS + MONSTER_SPAWNING_MS);
    const after = makeCtx();
    game.draw(after.ctx);
    const top = slot.y - 10 * slot.scale;
    expect(
      after.calls.some(
        (c) =>
          c.w === slot.scale &&
          c.x >= slot.x &&
          c.x < slot.x + 12 * slot.scale &&
          c.y >= top &&
          c.y < slot.y,
      ),
    ).toBe(true);
  });

  it('the field monster shows a type badge at the left end of its hp bar', () => {
    const game = createGame(createEngine(v2, mulberry32(42)));
    const monster = game.getState().monster;
    expect(monster.type).toBe(typeOf(monster.speciesId));

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = new Set(calls.map(rectKey));

    const barX = Math.round(
      MONSTER_X + (12 * sizeOf(monster.speciesId)) / 2 - HP_BAR.w / 2,
    );
    const badge = makeCtx();
    drawTypeBadge(badge.ctx, monster.type, barX - TYPE_BADGE_GAP, HP_BAR.y);
    expect(badge.calls[0]).toEqual({
      x: barX - TYPE_BADGE_GAP,
      y: HP_BAR.y,
      w: 5,
      h: 5,
      fillStyle: TYPE_COLORS[monster.type],
    });
    expect(badge.calls.every((c) => painted.has(rectKey(c)))).toBe(true);

    // It really reads the monster's type: another type paints another badge.
    const other = makeCtx();
    drawTypeBadge(other.ctx, monster.type === 'fire' ? 'earth' : 'fire', barX - TYPE_BADGE_GAP, HP_BAR.y);
    expect(other.calls.every((c) => painted.has(rectKey(c)))).toBe(false);

    // No badge over the scatter — it goes with the bar.
    game.attack('keyboard');
    game.update(1);
    expect(game.getMonsterAnim().state).toBe('hit');
    const dead = createGame(
      createEngine({ ...v2, monsterHp: '1' }, mulberry32(7)),
    );
    dead.attack('keyboard');
    const dying = makeCtx();
    dead.draw(dying.ctx);
    expect(dying.calls.some((c) => c.w === 5 && c.h === 5 && c.y === HP_BAR.y)).toBe(false);
  });

  it('a normal monster draws at its species size', () => {
    // Monster 0 is a slime (size 1) and monster 3 a golem (size 3): the same
    // 12x10 art, two different draw scales, both with their feet on the ground.
    expect(sizeOf(monsterForIndex(0).speciesId)).toBe(1);
    expect(sizeOf(monsterForIndex(3).speciesId)).toBe(3);

    for (const index of [0, 3]) {
      const def = monsterForIndex(index);
      expect(def.boss).toBe(false);
      const game = createGame(
        createEngine(
          {
            ...v2,
            monsterIndex: index,
            monsterHp: String(monsterMaxHp(index)),
            bestIndex: index,
          },
          mulberry32(1),
        ),
      );
      const { ctx, calls } = makeCtx();
      game.draw(ctx);

      const scale = sizeOf(def.speciesId);
      const idle = monsterSprites[def.speciesId as SpeciesId].idle;
      const ref = makeCtx();
      drawSprite(
        ref.ctx,
        { ...idle, palette: paletteForTier(idle.palette, def.tier) },
        0,
        MONSTER_X,
        GROUND_Y - idle.h * scale,
        { scale },
      );
      expect(ref.calls.length).toBeGreaterThan(0);
      expect(ref.calls.every((c) => c.w === scale && c.h === scale)).toBe(true);
      const painted = new Set(calls.map(rectKey));
      expect(ref.calls.every((c) => painted.has(rectKey(c)))).toBe(true);
      // …and it fits the field.
      expect(MONSTER_X + idle.w * scale).toBeLessThanOrEqual(VIEW_W);
    }
  });

  it('the field party is re-read from state every frame so a new monster changes it', () => {
    // Six equally powerful companions: which five fight depends purely on the
    // type match-up, so the monster the kill spawns re-picks the group.
    const roster = [
      companion('c1', 'slime'),
      companion('c2', 'bat'),
      companion('c3', 'ghost'),
      companion('c4', 'golem'),
      companion('c5', 'dragon'),
      companion('c6', 'bat'),
    ];
    const game = createGame(
      createEngine(
        { ...v2, monsterHp: '1', companions: roster, nextCompanionId: 7 },
        mulberry32(7),
      ),
    );
    const partyFor = (state: GameState): Companion[] =>
      partyOrder(activeCompanions(state.companions, state.monster.type));
    const before = partyFor(game.getState());

    expect(game.attack('keyboard').some((e) => e.type === 'monsterKilled')).toBe(true);
    const elapsed = MONSTER_DYING_MS + MONSTER_SPAWNING_MS;
    game.update(elapsed);
    const state = game.getState();
    expect(state.monster.type).not.toBe('water'); // monster 0 was the water slime
    const after = partyFor(state);
    expect(after.map((c) => c.id)).not.toEqual(before.map((c) => c.id));

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = calls.map(rectKey).join('|');
    const frame = Math.floor(elapsed / IDLE_FRAME_MS) % 2;

    const now = makeCtx();
    drawParty(now.ctx, after, frame, GROUND_Y);
    expect(now.calls.length).toBeGreaterThan(0);
    expect(painted).toContain(now.calls.map(rectKey).join('|'));

    // The party the PREVIOUS monster picked is gone — nothing was cached.
    const stale = makeCtx();
    drawParty(stale.ctx, before, frame, GROUND_Y);
    expect(painted).not.toContain(stale.calls.map(rectKey).join('|'));
  });

  it('companion floats are coloured by effectiveness', () => {
    // The field monster is a slime (water): earth beats it, dark loses to it.
    for (const [speciesId, expected] of [
      ['golem', 'super'],
      ['ghost', 'weak'],
      ['slime', 'normal'],
    ] as const) {
      const game = createGame(
        createEngine(
          {
            ...v2,
            monsterIndex: 20,
            monsterHp: String(monsterMaxHp(20)),
            bestIndex: 20,
            companions: [companion('c1', speciesId)],
            nextCompanionId: 2,
          },
          mulberry32(3),
        ),
      );
      const monster = game.getState().monster;
      expect(monster.boss).toBe(false);
      expect(effectiveness(typeOf(speciesId), monster.type)).toBe(expected);

      const volley = game.update(COMPANION_ATTACK_MS).find((e) => e.type === 'companionAttack');
      if (volley?.type !== 'companionAttack') {
        throw new Error('expected a companion volley');
      }
      expect(volley.effectiveness).toBe(expected);

      const { ctx, calls } = makeCtx();
      game.draw(ctx);

      const pool = createFloatPool();
      spawnFloat(
        pool,
        MONSTER_X + (12 * sizeOf(monster.speciesId)) / 2,
        HP_BAR.y - 6,
        format(volley.damage),
        false,
        floatColor(expected),
      );
      const ref = makeCtx();
      drawFloats(ref.ctx, pool);
      expect(ref.calls.length).toBeGreaterThan(0);
      expect(ref.calls.every((c) => c.fillStyle === floatColor(expected))).toBe(true);
      const painted = new Set(calls.map(rectKey));
      expect(ref.calls.every((c) => painted.has(rectKey(c)))).toBe(true);
    }
    // The three verdicts really are three different colours.
    expect(new Set((['super', 'weak', 'normal'] as const).map(floatColor)).size).toBe(3);
  });

  it('fever draws a hue-cycling aura behind the hero and a FEVER banner', () => {
    // Monster 100 has millions of HP — 20 inputs light fever without a kill.
    const game = createGame(
      createEngine(
        {
          ...v2,
          monsterIndex: 100,
          monsterHp: String(monsterMaxHp(100)),
          bestIndex: 100,
        },
        mulberry32(5),
      ),
    );
    let events: GameEvent[] = [];
    for (let i = 0; i < FEVER_INPUTS; i++) {
      events = game.attack('keyboard');
    }
    expect(events.some((e) => e.type === 'feverStart')).toBe(true);
    expect(events.some((e) => e.type === 'monsterKilled')).toBe(false);
    expect(game.getState().fever.active).toBe(true);

    const lit = makeCtx();
    game.draw(lit.ctx);
    // The aura is the hero sprite offset 1px in one hue-shifted red, painted
    // UNDER the hero — at 1x units its own draw calls are the reference (F64).
    const auraRef = (sprite: Sprite, frame: number, timeMs: number): RectCall[] => {
      const ref = makeCtx();
      drawFeverAura(ref.ctx, sprite, frame, HERO_X, HERO_Y, SPRITE_SCALE, timeMs);
      return ref.calls;
    };
    // 20 inputs with no tick: the hero is still on attack frame 0 at t=0.
    const litAura = auraRef(heroAttack, 0, 0);
    expect(litAura.length).toBeGreaterThan(0);
    expect(new Set(litAura.map((c) => c.fillStyle))).toEqual(new Set([shiftHue(COLORS.red, 0)]));
    const litPainted = new Set(lit.calls.map(rectKey));
    expect(litAura.every((c) => litPainted.has(rectKey(c)))).toBe(true);

    // FEVER!, not LEVEL UP!, flashes above the scene.
    const bannerBox = (cs: RectCall[]): RectCall[] =>
      cs.filter(
        (c) =>
          c.w === BANNER_SCALE &&
          c.h === BANNER_SCALE &&
          c.y >= BANNER_Y &&
          c.y < BANNER_Y + 5 * BANNER_SCALE,
      );
    const banner = createBanner();
    showBanner(banner, FEVER_TEXT);
    const feverRef = makeCtx();
    drawBanner(feverRef.ctx, banner, VIEW_W);
    showBanner(banner, LEVEL_UP_TEXT);
    const levelRef = makeCtx();
    drawBanner(levelRef.ctx, banner, VIEW_W);
    expect(keys(bannerBox(lit.calls))).toEqual(keys(feverRef.calls));
    expect(keys(bannerBox(lit.calls))).not.toEqual(keys(levelRef.calls));

    // The aura cycles hue with time and sheds sparkles every 100 ms.
    game.update(4 * FEVER_SPARKLE_MS);
    const later = makeCtx();
    game.draw(later.ctx);
    expect(game.getHeroAnim().state).toBe('idle'); // the attack ran out
    const laterAura = auraRef(heroIdle, 0, 4 * FEVER_SPARKLE_MS);
    const laterPainted = new Set(later.calls.map(rectKey));
    expect(laterAura.every((c) => laterPainted.has(rectKey(c)))).toBe(true);
    expect(laterAura[0]?.fillStyle).not.toBe(litAura[0]?.fillStyle);
    // The burst starts on the hero's centre cell, which the aura and the hero
    // art also paint at 1x units — so count only what they do NOT paint.
    const atCentre = (cs: RectCall[]): RectCall[] =>
      cs.filter(
        (c) =>
          c.w === EFFECTS.feverAura.size &&
          c.x === HERO_X + (heroIdle.w * SPRITE_SCALE) / 2 &&
          c.y === HERO_Y + (heroIdle.h * SPRITE_SCALE) / 2,
      );
    const heroOnly = makeCtx();
    drawFeverAura(heroOnly.ctx, heroIdle, 0, HERO_X, HERO_Y, SPRITE_SCALE, 4 * FEVER_SPARKLE_MS);
    drawSprite(heroOnly.ctx, heroIdle, 0, HERO_X, HERO_Y, { scale: SPRITE_SCALE });
    expect(atCentre(later.calls).length - atCentre(heroOnly.calls).length).toBe(
      EFFECTS.feverAura.count,
    );
  });
});

describe('collection actions in the game window (T47, SPEC F53)', () => {
  it('apply() forwards collection actions to the engine and reports its events', () => {
    const game = createGame(
      createEngine(
        {
          ...v2,
          companions: [companion('c1', 'slime'), companion('c2', 'bat')],
          nextCompanionId: 3,
        },
        mulberry32(3),
      ),
    );
    // The engine rejects an impossible action: no events, nothing changed.
    expect(game.apply({ type: 'reincarnate', id: 'c1' })).toEqual([]);
    expect(game.getState().companions).toHaveLength(2);

    // A legal one lands on the wrapped engine…
    expect(game.apply({ type: 'sacrifice', id: 'c2' })).toEqual([]);
    expect(game.getState().companions.map((c) => c.id)).toEqual(['c1']);
    expect(game.getState().souls).toBe(1);

    // …and whatever events it produces come back for the save scheduler.
    expect(
      game.apply({
        type: 'pvpResult',
        won: true,
        stolen: companion('theirs', 'ghost'),
        lostId: null,
      }),
    ).toEqual([
      { type: 'pvpResolved', won: true, stolen: companion('c3', 'ghost'), lostId: null },
    ]);
  });

  it('apply(removeCompanions) never touches in-flight presentation', () => {
    const game = createGame(
      createEngine(
        {
          ...v2,
          xp: 19, // +5 xp on the kill → level 2, so a banner is up too
          monsterHp: '1',
          companions: [companion('c1', 'slime')],
          nextCompanionId: 2,
        },
        mulberry32(7),
      ),
    );
    game.attack('keyboard'); // kill: scatter + drop + float + banner in flight
    game.update(40);
    const before = makeCtx();
    game.draw(before.ctx);

    expect(game.apply({ type: 'removeCompanions', ids: ['c1'] })).toEqual([]);
    expect(game.getState().companions).toEqual([]);

    const after = makeCtx();
    game.draw(after.ctx);
    // The party group is the ONLY thing that changed — every float,
    // particle, drop and banner pixel keeps painting exactly where it was.
    const slot = partySlots([companion('c1', 'slime')], GROUND_Y)[0];
    if (slot === undefined) {
      throw new Error('missing party slot');
    }
    const offParty = (c: RectCall): boolean =>
      !(
        c.x >= slot.x &&
        c.x < slot.x + 12 * slot.scale &&
        c.y >= slot.y - 10 * slot.scale &&
        c.y < slot.y
      );
    expect(after.calls.filter(offParty)).toEqual(before.calls.filter(offParty));
    expect(after.calls.length).toBeLessThan(before.calls.length);
    expect(game.getMonsterAnim().state).toBe('dying');
  });

  it('a won pvp shows the VICTORY banner and pops the stolen companion in', () => {
    const game = createGame(createEngine({ ...v2, nextCompanionId: 4 }, mulberry32(5)));
    expect(
      game.apply({
        type: 'pvpResult',
        won: true,
        stolen: companion('theirs', 'slime'),
        lostId: null,
      }),
    ).toHaveLength(1);
    expect(game.getState().companions.map((c) => c.id)).toEqual(['c4']);

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = new Set(calls.map(rectKey));
    expect(bannerKeys(VICTORY_TEXT).every((k) => painted.has(k))).toBe(true);
    expect(bannerKeys(DEFEAT_TEXT).every((k) => painted.has(k))).toBe(false);

    // …and the prize pops in: a capture sparkle at its party slot.
    const state = game.getState();
    const party = partyOrder(activeCompanions(state.companions, state.monster.type));
    const slot = partySlots(party, GROUND_Y)[0];
    if (slot === undefined) {
      throw new Error('the prize is not in the party');
    }
    const preset = EFFECTS.captureSparkle;
    expect(
      calls.filter(
        (c) =>
          c.w === preset.size &&
          c.x === slot.x + (12 * slot.scale) / 2 &&
          c.y === slot.y - (10 * slot.scale) / 2 &&
          (c.fillStyle === preset.colors[0] || c.fillStyle === preset.colors[1]),
      ),
    ).toHaveLength(preset.count);
  });

  it('a lost pvp shows the DEFEAT banner and scatters the lost companion', () => {
    const game = createGame(
      createEngine(
        { ...v2, companions: [companion('c1', 'golem')], nextCompanionId: 2 },
        mulberry32(6),
      ),
    );
    expect(
      game.apply({ type: 'pvpResult', won: false, stolen: null, lostId: 'c1' }),
    ).toHaveLength(1);
    expect(game.getState().companions).toEqual([]);

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = new Set(calls.map(rectKey));
    expect(bannerKeys(DEFEAT_TEXT).every((k) => painted.has(k))).toBe(true);
    expect(bannerKeys(VICTORY_TEXT).every((k) => painted.has(k))).toBe(false);

    // Its species idle art is now a pixel scatter at the party slot it held
    // (spawnSpriteScatter draws no RNG, so the reference matches exactly).
    const slot = partySlots([companion('c1', 'golem')], GROUND_Y)[0];
    if (slot === undefined) {
      throw new Error('missing party slot');
    }
    const reference = createParticlePool();
    spawnSpriteScatter(
      reference,
      monsterSprites.golem.idle,
      0,
      slot.x,
      slot.y - 10 * slot.scale,
      slot.scale,
    );
    const ref = makeCtx();
    drawParticles(ref.ctx, reference);
    expect(ref.calls.length).toBeGreaterThan(0);
    expect(ref.calls.every((c) => painted.has(rectKey(c)))).toBe(true);
  });

  it('a rebirth flushes presentation and restarts at monster 0', () => {
    const game = createGame(
      createEngine(
        { ...v2, monsterIndex: 40, monsterHp: String(monsterMaxHp(40)), bestIndex: 40 },
        mulberry32(9),
      ),
    );
    game.attack('keyboard'); // damage float + slash particles in flight
    game.update(30);

    expect(game.apply({ type: 'rebirth' })).toEqual([{ type: 'rebirth', souls: 5 }]);
    expect(game.getState().monster.index).toBe(0);
    expect(game.getState().rebirths).toBe(1);
    // Monster 0 rises out of the ground, exactly like a kill-born spawn.
    expect(game.getMonsterAnim().state).toBe('spawning');
    expect(game.getHeroAnim().state).toBe('idle');

    // Once the pop-in ends nothing of the old run is left: the scene is
    // pixel-identical to a brand-new game's at the same age.
    game.update(MONSTER_SPAWNING_MS);
    const fresh = createGame(createEngine(null, mulberry32(1)));
    fresh.update(MONSTER_SPAWNING_MS);
    const a = makeCtx();
    fresh.draw(a.ctx);
    const b = makeCtx();
    game.draw(b.ctx);
    expect(b.calls).toEqual(a.calls);
  });
});

describe('createSaveScheduler (T16 save policy)', () => {
  const attackOnly: GameEvent[] = [
    { type: 'attack', damage: 1n, crit: false, source: 'keyboard' },
    { type: 'monsterHit', hpAfter: 9n, maxHp: 10n },
  ];
  const killEvents: GameEvent[] = [
    ...attackOnly,
    { type: 'monsterKilled', monster: monsterForIndex(0), xpGained: 5 },
    { type: 'itemDropped', drops: [] },
    { type: 'monsterSpawned', monster: monsterForIndex(1) },
  ];
  const levelUpEvents: GameEvent[] = [...killEvents, { type: 'levelUp', newLevel: 2 }];

  interface FakeTimer {
    cb: () => void;
    ms: number;
    cleared: boolean;
  }

  function harness(): {
    scheduler: ReturnType<typeof createSaveScheduler>;
    timers: FakeTimer[];
    saveCount: () => number;
  } {
    let saves = 0;
    const timers: FakeTimer[] = [];
    const scheduler = createSaveScheduler({
      save: () => {
        saves += 1;
      },
      setTimer: (cb, ms) => {
        const timer: FakeTimer = { cb, ms, cleared: false };
        timers.push(timer);
        return timer;
      },
      clearTimer: (handle) => {
        (handle as FakeTimer).cleared = true;
      },
    });
    return { scheduler, timers, saveCount: () => saves };
  }

  it('saves immediately on a kill and on a level-up', () => {
    const { scheduler, timers, saveCount } = harness();
    scheduler.onEvents(killEvents);
    expect(saveCount()).toBe(1);
    scheduler.onEvents(levelUpEvents);
    expect(saveCount()).toBe(2);
    expect(timers).toEqual([]); // immediate — never through the debounce
  });

  it('debounces a damage-only attack by 500ms', () => {
    const { scheduler, timers, saveCount } = harness();
    scheduler.onEvents(attackOnly);
    expect(saveCount()).toBe(0);
    expect(timers).toHaveLength(1);
    expect(timers[0]?.ms).toBe(SAVE_DEBOUNCE_MS);
    timers[0]?.cb();
    expect(saveCount()).toBe(1);
  });

  it('coalesces key-mash damage into one trailing save', () => {
    const { scheduler, timers, saveCount } = harness();
    scheduler.onEvents(attackOnly);
    scheduler.onEvents(attackOnly);
    scheduler.onEvents(attackOnly);
    expect(timers).toHaveLength(3);
    expect(timers[0]?.cleared).toBe(true);
    expect(timers[1]?.cleared).toBe(true);
    expect(timers[2]?.cleared).toBe(false);
    timers[2]?.cb();
    expect(saveCount()).toBe(1);
  });

  it('a kill cancels the pending damage debounce (no double save)', () => {
    const { scheduler, timers, saveCount } = harness();
    scheduler.onEvents(attackOnly);
    scheduler.onEvents(killEvents);
    expect(saveCount()).toBe(1);
    expect(timers[0]?.cleared).toBe(true);
  });

  it('flush() saves immediately and cancels any pending debounce', () => {
    const { scheduler, timers, saveCount } = harness();
    scheduler.onEvents(attackOnly);
    scheduler.flush();
    expect(saveCount()).toBe(1);
    expect(timers[0]?.cleared).toBe(true);
    scheduler.flush(); // blur always flushes, pending or not
    expect(saveCount()).toBe(2);
  });

  it('an empty event batch neither saves nor schedules', () => {
    const { scheduler, timers, saveCount } = harness();
    scheduler.onEvents([]);
    expect(saveCount()).toBe(0);
    expect(timers).toEqual([]);
  });
});

describe('game toSave/reset (T16 persistence wiring)', () => {
  const killSave: SaveFileV1 = {
    version: 1,
    level: 1,
    xp: 19, // +5 xp on the kill → level 2 (banner + sparkles in flight)
    killCount: 0,
    coins: 0,
    items: {},
    monsterIndex: 0,
    monsterHp: 1,
  };

  it('toSave() mirrors the wrapped engine snapshot', () => {
    const engine = createEngine(null, mulberry32(42));
    const game = createGame(engine);
    game.attack('keyboard');
    expect(game.toSave()).toEqual(engine.toSave());
  });

  it('reset() returns progress to the defaults with idle animations', () => {
    const game = createGame(createEngine(killSave, mulberry32(7)));
    game.attack('keyboard'); // killing blow: progress + presentation in flight
    expect(game.toSave().killCount).toBe(1);
    expect(game.getMonsterAnim().state).toBe('dying');

    game.reset();
    expect(game.toSave()).toEqual(DEFAULT_SAVE);
    expect(game.getState().level).toBe(1);
    expect(game.getHeroAnim().state).toBe('idle');
    expect(game.getMonsterAnim().state).toBe('idle');
  });

  it('reset() clears every in-flight presentation system', () => {
    const game = createGame(createEngine(killSave, mulberry32(7)));
    game.attack('keyboard'); // scatter + drops + float + banner all active
    game.update(100); // and mid-flight
    game.reset();

    // A reset game paints the exact same scene as a brand-new game: no
    // leftover floats, particles, drops, banner, pop flash or bob offset.
    const fresh = createGame(createEngine(null, mulberry32(1)));
    const a = makeCtx();
    fresh.draw(a.ctx);
    const b = makeCtx();
    game.draw(b.ctx);
    expect(b.calls).toEqual(a.calls);
    expect(b.clears).toEqual(a.clears);
  });
});

describe('renderer boot source contract (src/renderer/index.ts)', () => {
  const rendererIndex = read('src/renderer/index.ts');

  it.each([
    'reportFirstFrame',
    'parseSave',
    'createEngine',
    'createGame',
    'onInput',
    'requestAnimationFrame',
    'setupFallbackInput',
    'setupWindowDrag',
    'moveWindowBy',
    'createSaveScheduler',
    'saveState',
    'onReset',
  ])('wires %s', (literal) => {
    expect(rendererIndex).toContain(literal);
  });

  it('persists via the scheduler on both input paths and on blur (T16)', () => {
    // Every engine step routes its events into the save policy…
    expect(rendererIndex).toContain('saves.onEvents(game.attack(event.source))');
    expect(rendererIndex).toContain('saves.onEvents(game.attack(source))');
    // …the save itself ships the engine snapshot over the bridge…
    expect(rendererIndex).toContain('window.desmon.saveState(game.toSave())');
    // …and losing focus flushes unconditionally.
    expect(rendererIndex).toContain("addEventListener('blur'");
    expect(rendererIndex).toContain('saves.flush()');
  });

  it('onReset swaps in a fresh engine, then saves immediately (T16)', () => {
    const reset = rendererIndex.indexOf('game.reset()');
    expect(reset).toBeGreaterThan(rendererIndex.indexOf('onReset'));
    expect(reset).toBeGreaterThan(-1);
    const flushAfterReset = rendererIndex.indexOf('saves.flush()', reset);
    expect(flushAfterReset).toBeGreaterThan(reset);
  });

  it('applies menu actions through the engine and flushes the save (F53)', () => {
    const action = rendererIndex.indexOf('window.desmon.onAction(');
    expect(action).toBeGreaterThan(-1);
    expect(rendererIndex).toContain('saves.onEvents(game.apply(a))');
    expect(rendererIndex.indexOf('saves.flush()', action)).toBeGreaterThan(action);
  });

  it('disables image smoothing and clamps dt to 100ms', () => {
    expect(rendererIndex).toContain('imageSmoothingEnabled = false');
    expect(rendererIndex).toContain('Math.min(now - last, 100)');
  });

  it('reports the first frame exactly once, after drawing', () => {
    expect(rendererIndex).toContain('reportedFirstFrame = true');
    const draw = rendererIndex.indexOf('game.draw(ctx)');
    const report = rendererIndex.indexOf('window.desmon.reportFirstFrame()');
    expect(draw).toBeGreaterThan(-1);
    expect(report).toBeGreaterThan(draw);
  });
});

describe('smoke sequence source contract (src/main/index.ts, SPEC F18)', () => {
  const mainIndex = read('src/main/index.ts');

  it('drives a core SimulatedInputDriver over the real input channel', () => {
    expect(mainIndex).toContain('new SimulatedInputDriver()');
    expect(mainIndex).toContain('driver.start()');
    expect(mainIndex).toContain('driver.emit(');
    expect(mainIndex).toContain('win.webContents.send(IPC.INPUT, event)');
    expect(mainIndex).toMatch(/SMOKE_ATTACK_COUNT = 3/);
  });

  it('prints SMOKE_OK and exits 0 only from the first-frame path', () => {
    expect(mainIndex).toContain('onFirstFrame:');
    const firstFrame = mainIndex.indexOf('runSmokeSequence');
    expect(firstFrame).toBeGreaterThan(-1);
    expect(mainIndex).toContain("process.stdout.write('SMOKE_OK\\n')");
    expect(mainIndex).toContain('app.exit(0)');
  });

  it('keeps the 20s watchdog failure exit', () => {
    expect(mainIndex).toContain('app.exit(1)');
    expect(mainIndex).toContain('20_000');
  });
});

describe('window.desmon declaration stays in sync with the preload bridge', () => {
  it('declares every method the preload exposes', () => {
    const globalDts = read('src/renderer/global.d.ts');
    const preload = read('src/preload/index.ts');
    const methods = [...preload.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
    expect(methods.length).toBeGreaterThanOrEqual(8);
    for (const method of methods) {
      expect(globalDts).toContain(`${method ?? ''}(`);
    }
  });
});

describe('battle scene replay (T66, SPEC F66)', () => {
  const blow = (
    side: 'A' | 'D',
    actorId: string,
    targetId: string,
    damage: string,
    ko = false,
  ): WireBlow => ({ side, actorId, targetId, damage, ko });

  /** Art box of every species sprite (12x10 cells, scaled by size). */
  const ART_W = 12;
  const ART_H = 10;

  /** Where the mirrored opponent group's member `r` is drawn (drawParty's rule). */
  const theirSlot = (party: readonly Companion[], r: number): { x: number; y: number; scale: number } => {
    const slot = partySlots(party, GROUND_Y)[r];
    const member = party[r];
    if (slot === undefined || member === undefined) {
      throw new Error('missing opponent slot');
    }
    return { ...slot, x: OPPONENT_ORIGIN_X - (slot.x - 8) - ART_W * slot.scale };
  };

  const centreOf = (slot: { x: number; y: number; scale: number }): { x: number; y: number } => ({
    x: slot.x + (ART_W * slot.scale) / 2,
    y: slot.y - (ART_H * slot.scale) / 2,
  });

  /** The steel frame of the field monster's HP bar — the field's signature. */
  const hpFrameKey = (): string =>
    rectKey({
      x: Math.round(MONSTER_X + (ART_W * sizeOf('slime')) / 2 - HP_BAR.w / 2),
      y: HP_BAR.y,
      w: HP_BAR.w,
      h: HP_BAR.h,
      fillStyle: COLORS.steel,
    });

  const drawn = (game: ReturnType<typeof createGame>): Set<string> => {
    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    return new Set(calls.map(rectKey));
  };

  it('playReplay draws the opponent party mirrored on the right with its name', () => {
    const game = createGame(createEngine({ ...v2 }, mulberry32(11)));
    const replay: BattleReplay = {
      opponentName: 'RIVAL',
      opponentParty: [companion('o1', 'golem'), companion('o2', 'bat')],
      blows: [],
    };
    game.playReplay(replay);

    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = new Set(calls.map(rectKey));

    // Exactly what drawParty paints for the mirrored group, plus the name in
    // the 3x5 font hanging off the same right edge.
    const ref = makeCtx();
    const theirs = partyOrder(replay.opponentParty);
    drawParty(ref.ctx, theirs, 0, GROUND_Y, { flipX: false, originX: OPPONENT_ORIGIN_X });
    drawText(ref.ctx, 'RIVAL', OPPONENT_ORIGIN_X - textWidth('RIVAL'), OPPONENT_NAME_Y);
    expect(ref.calls.length).toBeGreaterThan(0);
    expect(ref.calls.every((c) => painted.has(rectKey(c)))).toBe(true);
    // They stand on the right half — mirrored, not where my own party stands.
    expect(theirSlot(theirs, 0).x).toBeGreaterThan(VIEW_W / 2);
    // …and the VS banner opened the scene.
    expect(bannerKeys('VS RIVAL').every((k) => painted.has(k))).toBe(true);
  });

  it('each blow spawns a projectile then a float at the target', () => {
    const game = createGame(
      createEngine(
        { ...v2, companions: [companion('c1', 'dragon')], nextCompanionId: 2 },
        mulberry32(12),
      ),
    );
    const theirs = [companion('o1', 'bat')];
    game.playReplay({ opponentName: 'FOE', opponentParty: theirs, blows: [blow('A', 'c1', 'o1', '1234')] });

    // Nothing has fired yet — the scene runs off the presentation clock.
    expect(drawn(game).size).toBeGreaterThan(0);
    game.update(16);
    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    const painted = new Set(calls.map(rectKey));

    // One shot from my member's slot centre, in the dragon's hit colour.
    const from = centreOf(partySlots([companion('c1', 'dragon')], GROUND_Y)[0] ?? { x: 0, y: 0, scale: 1 });
    expect(
      calls.filter(
        (c) =>
          c.w === EFFECTS.companionProjectile.size &&
          c.x === from.x &&
          c.y === from.y &&
          c.fillStyle === hitColorOf('dragon'),
      ),
    ).toHaveLength(1);

    // …and the damage float at the target, coloured by the match-up: a fire
    // dragon is super effective against a wind bat.
    const at = centreOf(theirSlot(partyOrder(theirs), 0));
    expect(floatColor(effectiveness(typeOf('dragon'), typeOf('bat')))).toBe(COLORS.yellow);
    const pool = createFloatPool();
    spawnFloat(pool, at.x, at.y - BLOW_FLOAT_LIFT, format(1234n), false, COLORS.yellow);
    const ref = makeCtx();
    drawFloats(ref.ctx, pool);
    expect(ref.calls.length).toBeGreaterThan(0);
    expect(ref.calls.every((c) => painted.has(rectKey(c)))).toBe(true);
  });

  it('a ko scatters the target and removes it from the opponent group', () => {
    const game = createGame(
      createEngine(
        { ...v2, companions: [companion('c1', 'dragon')], nextCompanionId: 2 },
        mulberry32(13),
      ),
    );
    const back = companion('o1', 'golem');
    const front = companion('o2', 'bat');
    game.playReplay({
      opponentName: 'FOE',
      opponentParty: [back, front],
      blows: [
        blow('A', 'c1', 'o2', '9', true),
        blow('D', 'o1', 'c1', '9'),
        blow('A', 'c1', 'o1', '9'),
      ],
    });
    game.update(16);

    // The bat's art is now a pixel scatter at the slot it stood in.
    const both = partyOrder([back, front]);
    const koSlot = theirSlot(both, both.indexOf(front));
    const reference = createParticlePool();
    spawnSpriteScatter(
      reference,
      monsterSprites.bat.idle,
      0,
      koSlot.x,
      koSlot.y - ART_H * koSlot.scale,
      koSlot.scale,
    );
    const scatter = makeCtx();
    drawParticles(scatter.ctx, reference);
    expect(scatter.calls.length).toBeGreaterThan(0);
    const during = drawn(game);
    expect(scatter.calls.every((c) => during.has(rectKey(c)))).toBe(true);

    // Once the scatter is gone (and before the next blow is due) the group is
    // re-laid-out around the survivor alone.
    game.update(SCATTER_LIFE_MS + 20);
    const painted = drawn(game);
    const frame = Math.floor((16 + SCATTER_LIFE_MS + 20) / IDLE_FRAME_MS) % 2;
    const survivor = makeCtx();
    drawParty(survivor.ctx, [back], frame, GROUND_Y, { flipX: false, originX: OPPONENT_ORIGIN_X });
    expect(survivor.calls.every((c) => painted.has(rectKey(c)))).toBe(true);
    const pair = makeCtx();
    drawParty(pair.ctx, both, frame, GROUND_Y, { flipX: false, originX: OPPONENT_ORIGIN_X });
    expect(pair.calls.every((c) => painted.has(rectKey(c)))).toBe(false);
  });

  it('the field monster is hidden while a replay plays and returns afterwards', () => {
    const game = createGame(createEngine({ ...v2, nextCompanionId: 4 }, mulberry32(14)));
    const field = drawn(game);
    expect(field.has(hpFrameKey())).toBe(true);

    // The action carries the replay: the scene runs first, the verdict waits.
    expect(
      game.apply({
        type: 'pvpResult',
        won: true,
        stolen: companion('theirs', 'slime'),
        lostId: null,
        replay: {
          opponentName: 'RIVAL',
          opponentParty: [companion('o1', 'ghost')],
          blows: [blow('D', 'o1', 'c1', '5')],
        },
      }),
    ).toHaveLength(1);
    // The roster change itself lands immediately (the engine never waits).
    expect(game.getState().companions.map((c) => c.id)).toEqual(['c4']);

    game.update(16);
    const during = drawn(game);
    const base = monsterSprites.slime.idle;
    const monsterRef = makeCtx();
    drawSprite(monsterRef.ctx, base, 0, MONSTER_X, GROUND_Y - base.h, { scale: sizeOf('slime') });
    expect(monsterRef.calls.every((c) => during.has(rectKey(c)))).toBe(false);
    expect(during.has(hpFrameKey())).toBe(false);
    expect(bannerKeys('VS RIVAL').every((k) => during.has(k))).toBe(true);
    expect(bannerKeys(VICTORY_TEXT).every((k) => during.has(k))).toBe(false);

    // 600 ms after the last blow the field is back — and only then does the
    // verdict play: VICTORY! plus the prize popping in at its party slot.
    game.update(600);
    const after = drawn(game);
    expect(after.has(hpFrameKey())).toBe(true);
    expect(bannerKeys(VICTORY_TEXT).every((k) => after.has(k))).toBe(true);
    const state = game.getState();
    const slot = partySlots(
      partyOrder(activeCompanions(state.companions, state.monster.type)),
      GROUND_Y,
    )[0];
    if (slot === undefined) {
      throw new Error('the prize is not in the party');
    }
    const sparkle = EFFECTS.captureSparkle;
    const { ctx, calls } = makeCtx();
    game.draw(ctx);
    expect(
      calls.filter(
        (c) =>
          c.w === sparkle.size &&
          c.x === slot.x + (ART_W * slot.scale) / 2 &&
          c.y === slot.y - (ART_H * slot.scale) / 2 &&
          (c.fillStyle === sparkle.colors[0] || c.fillStyle === sparkle.colors[1]),
      ),
    ).toHaveLength(sparkle.count);
  });

  it('replay pacing clamps to 12 s', () => {
    expect(blowMs(1)).toBe(BLOW_MS_MAX);
    expect(blowMs(REPLAY_MS / BLOW_MS_MAX)).toBe(BLOW_MS_MAX);
    expect(blowMs(24)).toBe(500);
    expect(blowMs(100)).toBe(BLOW_MS_MIN);

    // 20 blows at 600 ms each: the scene owns the field for exactly 12 s.
    const game = createGame(
      createEngine(
        { ...v2, companions: [companion('c1', 'slime')], nextCompanionId: 2 },
        mulberry32(15),
      ),
    );
    const blows = Array.from({ length: 20 }, (_, i) =>
      blow(i % 2 === 0 ? 'A' : 'D', i % 2 === 0 ? 'c1' : 'o1', i % 2 === 0 ? 'o1' : 'c1', '7'),
    );
    game.playReplay({ opponentName: 'RIVAL', opponentParty: [companion('o1', 'ghost')], blows });
    game.update(REPLAY_MS - 1);
    expect(drawn(game).has(hpFrameKey())).toBe(false);
    game.update(1);
    expect(drawn(game).has(hpFrameKey())).toBe(true);
  });

  it('field presentation is suppressed while a replay plays', () => {
    const game = createGame(createEngine({ ...v2 }, mulberry32(17)));
    game.playReplay({ opponentName: 'FOE', opponentParty: [companion('o1', 'ghost')], blows: [] });

    const before = game.getState().monsterHp;
    const events = game.attack('keyboard');
    const hit = events[0];
    if (hit?.type !== 'attack') {
      throw new Error('expected an attack event');
    }
    // The input still reached the engine…
    expect(game.getState().monsterHp).toBeLessThan(before);
    expect(events.some((e) => e.type === 'monsterKilled')).toBe(false);

    // …but nothing of the field's presentation painted: no damage float.
    const floatRef = (damage: bigint, crit: boolean): RectCall[] => {
      const pool = createFloatPool();
      spawnFloat(pool, MONSTER_X + (ART_W * sizeOf('slime')) / 2, HP_BAR.y - 6, format(damage), crit);
      const ref = makeCtx();
      drawFloats(ref.ctx, pool);
      return ref.calls;
    };
    const during = drawn(game);
    expect(floatRef(hit.damage, hit.crit).some((c) => during.has(rectKey(c)))).toBe(false);

    // Once the field is back the very same attack paints again.
    game.update(600);
    const back = game.attack('keyboard')[0];
    if (back?.type !== 'attack') {
      throw new Error('expected an attack event');
    }
    const painted = drawn(game);
    expect(floatRef(back.damage, back.crit).every((c) => painted.has(rectKey(c)))).toBe(true);
  });
});
