// T13 — renderer boot: scene/HUD painting (SPEC F21) + boot/smoke source
// contracts (SPEC F18). game.ts and hud.ts are deliberately DOM-free
// (SpriteCanvas), so their behavior runs under node with a recording canvas.
// src/renderer/index.ts and the main-process smoke path value-import
// DOM/electron (unloadable under vitest — see tests/window.test.ts), so those
// are source-contract pins; their runtime is covered by `npm run smoke`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEngine, monsterForIndex, mulberry32, xpToNext } from '../src/core/index.js';
import type { GameState } from '../src/core/index.js';
import {
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
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  drawMeter,
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
    // Same presentation time — the only extra pixels are the damage number.
    expect(after.calls.length).toBeGreaterThan(before.calls.length);
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

describe('renderer boot source contract (src/renderer/index.ts)', () => {
  const rendererIndex = read('src/renderer/index.ts');

  it.each([
    'reportFirstFrame',
    'parseSave',
    'createEngine',
    'createGame',
    'onInput',
    'requestAnimationFrame',
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
