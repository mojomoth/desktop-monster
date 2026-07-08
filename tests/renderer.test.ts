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
  createEngine,
  HERO_ATTACK_MS,
  MONSTER_HIT_MS,
  MONSTER_SPAWNING_MS,
  monsterForIndex,
  mulberry32,
  xpToNext,
} from '../src/core/index.js';
import type { GameState, SaveFileV1 } from '../src/core/index.js';
import {
  ATTACK_FRAME_MS,
  createGame,
  GROUND_Y,
  HERO_X,
  HP_BAR,
  IDLE_FRAME_MS,
  MONSTER_X,
  VIEW_H,
  VIEW_W,
} from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import {
  createFloatPool,
  CRIT_FLOAT_SCALE,
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  drawMeter,
  FLOAT_FADE_RATIO,
  FLOAT_LIFE_MS,
  FLOAT_POOL_SIZE,
  spawnFloat,
  tickFloats,
} from '../src/renderer/hud.js';
import { COLORS, heroIdle } from '../src/renderer/sprites/index.js';

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

function stateFixture(overrides: Partial<GameState> = {}): GameState {
  const monster = monsterForIndex(4);
  return {
    level: 3,
    xp: 10,
    killCount: 12,
    coins: 34,
    items: {},
    monster,
    monsterHp: monster.maxHp,
    ...overrides,
  };
}

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
    drawHpBar(ctx, 0, 0, 34, 5, 1, 1000);
    expect(calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(1);
  });

  it('drawHpBar fills red in proportion to hp/maxHp', () => {
    const { ctx, calls } = makeCtx();
    drawHpBar(ctx, 0, 0, 34, 5, 5, 10);
    expect(calls.filter((c) => c.fillStyle === COLORS.red)[0]?.w).toBe(16);
  });
});

describe('drawLevelHud (top-left LV + XP bar)', () => {
  it('paints LV text pixels in the top-left corner', () => {
    const { ctx, calls } = makeCtx();
    drawLevelHud(ctx, stateFixture());
    const text = calls.filter((c) => c.fillStyle === COLORS.white && c.w === 1 && c.h === 1);
    expect(text.length).toBeGreaterThan(0);
    for (const c of text) {
      expect(c.x).toBeLessThan(40);
      expect(c.y).toBeLessThan(8);
    }
  });

  it('fills the XP bar in proportion to xp/xpToNext(level)', () => {
    const { ctx, calls } = makeCtx();
    const state = stateFixture({ level: 3, xp: 10 });
    drawLevelHud(ctx, state);
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
});

describe('floating damage numbers (fixed pool)', () => {
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
    // Hero pixels within the hero art box, feet on the ground.
    expect(
      calls.some(
        (c) => c.w === 1 && c.x >= HERO_X && c.x < HERO_X + heroIdle.w && c.y < GROUND_Y,
      ),
    ).toBe(true);
    // Monster pixels within the monster art box on the right.
    expect(
      calls.some((c) => c.w === 1 && c.x >= MONSTER_X && c.x < MONSTER_X + 12 && c.y < GROUND_Y),
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
          .filter((c) => c.w === 1 && c.x >= MONSTER_X && c.x < MONSTER_X + 12 && c.y < GROUND_Y)
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
          c.w === 1 &&
          c.x >= HERO_X &&
          c.x < HERO_X + 14 &&
          c.y >= GROUND_Y - 12 &&
          c.y < GROUND_Y,
      )
      .map((c) => `${String(c.x)},${String(c.y)},${c.fillStyle}`);

  const monsterPixels = (calls: RectCall[]): RectCall[] =>
    calls.filter(
      (c) =>
        c.w === 1 &&
        c.x >= MONSTER_X &&
        c.x < MONSTER_X + 12 &&
        c.y >= GROUND_Y - 12 &&
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

    // The overlay paints in the gap between hero and monster; nothing else
    // draws 1px cells at ground height in that x-range.
    const slashPixels = (calls: RectCall[]): RectCall[] =>
      calls.filter(
        (c) => c.w === 1 && c.x >= HERO_X + 14 && c.x < HERO_X + 19 && c.y >= GROUND_Y - 12,
      );

    const windUp = makeCtx();
    game.draw(windUp.ctx); // t=0: wind-up frame, no slash yet
    expect(slashPixels(windUp.calls)).toEqual([]);

    game.update(ATTACK_FRAME_MS); // t=60: the slash frame
    const slash = makeCtx();
    game.draw(slash.ctx);
    expect(slashPixels(slash.calls).length).toBeGreaterThan(0);
  });

  it('flashes the monster white for the hit duration, then returns to color', () => {
    const game = createGame(createEngine(null, mulberry32(42)));
    game.attack('keyboard'); // slime at 10 hp — never a killing first blow
    expect(game.getMonsterAnim()).toEqual({ state: 'hit', t: 0 });

    const flash = makeCtx();
    game.draw(flash.ctx);
    const flashPixels = monsterPixels(flash.calls);
    expect(flashPixels.length).toBeGreaterThan(0);
    expect(flashPixels.every((c) => c.fillStyle === COLORS.white)).toBe(true);

    game.update(MONSTER_HIT_MS);
    expect(game.getMonsterAnim().state).toBe('idle');
    const after = makeCtx();
    game.draw(after.ctx);
    expect(monsterPixels(after.calls).some((c) => c.fillStyle !== COLORS.white)).toBe(true);
  });

  it('a killing blow leaves the next monster spawning', () => {
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
    expect(game.getMonsterAnim()).toEqual({ state: 'spawning', t: 0 });

    game.update(MONSTER_SPAWNING_MS);
    expect(game.getMonsterAnim().state).toBe('idle');
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
  ])('wires %s', (literal) => {
    expect(rendererIndex).toContain(literal);
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
