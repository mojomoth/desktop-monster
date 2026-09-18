import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, format, HERO_DEFER_MS, mulberry32, xpToNext } from '../src/core/index.js';
import { heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';
import {
  BANNER_Y, COIN_COUNTER_Y, COUNTER_SCALE, COUNTER_TOP, drawCounters,
  createFloatPool, drawFloats, spawnFieldFloat, tickFloats,
  COUNTER_TEXT_X, XP_BAR_H, XP_BAR_W,
} from '../src/renderer/hud.js';
import { createGame, VIEW_W, VIEW_H } from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import { COLORS, drawText, textWidth } from '../src/renderer/sprites/index.js';

function canvas() {
  const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
  const clears: { x: number; y: number; w: number; h: number }[] = [];
  const ctx: GameCanvas = { fillStyle: '',
    fillRect: (x, y, w, h) => { rects.push({ x, y, w, h, color: String(ctx.fillStyle) }); },
    clearRect: (x, y, w, h) => { clears.push({ x, y, w, h }); } };
  return { ctx, rects, clears };
}

describe('v0.9 HUD readability', () => {
  it('places counters top-left while preserving the head labels and XP in the full frame', () => {
    const cases = [
      { hero: newHeroProgress(), level: 1, ready: false },
      { hero: { ...newHeroProgress(), deferRemainingMs: HERO_DEFER_MS }, level: heroRequiredLevel(0), ready: false },
      { hero: newHeroProgress(), level: heroRequiredLevel(0), ready: true },
    ];
    for (const item of cases) {
      const engine = createEngine({ ...DEFAULT_SAVE, hero: item.hero, level: item.level, xp: 3, coins: '1234567', killCount: 98 }, mulberry32(1));
      const before = engine.toSave();
      const out = canvas();
      createGame(engine).draw(out.ctx);
      expect(out.clears).toEqual([{ x: 0, y: 0, w: VIEW_W, h: VIEW_H }]);
      expect(out.rects.filter(rect => rect.x > 146 && rect.y < 38 && rect.y + rect.h > 16)).toEqual([]);
      const label = canvas();
      const levelText = `LV ${item.level}`;
      drawText(label.ctx, levelText, Math.round(80 - textWidth(levelText) / 2), 79);
      if (item.ready) drawText(label.ctx, 'REBIRTH READY', 55, 72, { color: COLORS.yellow });
      const headText = out.rects.filter(rect => rect.x >= 54 && rect.x < 107 && rect.y >= 71 && rect.y < 85);
      expect(headText.filter(rect => rect.color !== COLORS.void)).toEqual(label.rects);
      expect(headText.some(rect => rect.color === COLORS.void)).toBe(true);
      expect(headText.every(rect => rect.w === 1 && rect.h === 1)).toBe(true); // outlined glyphs, no background panel
      expect(out.rects.some(rect => rect.x >= 54 && rect.x < 107 && rect.y <= 85 && rect.y + rect.h > 85)).toBe(false);
      expect(out.rects).toContainEqual({ x: 60, y: 86, w: XP_BAR_W, h: XP_BAR_H, color: COLORS.steel });
      expect(out.rects).toContainEqual({ x: 61, y: 87, w: Math.max(1, Math.round((XP_BAR_W - 2) * 3 / xpToNext(item.level))), h: XP_BAR_H - 2, color: COLORS.cyan });
      const counters = canvas(); drawCounters(counters.ctx, engine.getState(), VIEW_W);
      expect(out.rects.filter(rect => rect.x < 66 && rect.y >= 23 && rect.y < 41)).toEqual(counters.rects);
      expect(engine.toSave()).toEqual(before);
    }
  });

  it('fits compact outlined counters below the drag strip with transparent space between rows', () => {
    expect(COUNTER_SCALE).toBe(1);
    expect(COUNTER_TOP).toBe(24);
    expect(COIN_COUNTER_Y).toBe(34);
    for (const value of [0, 7, 999, 1000, Number.MAX_SAFE_INTEGER]) {
      const state = { ...createEngine(null, mulberry32(1)).getState(), coins: BigInt(value), killCount: value };
      for (const pop of [false, true]) {
        const right = canvas();
        drawCounters(right.ctx, state, VIEW_W, pop);
        for (const rect of right.rects) {
          expect(rect.x).toBeGreaterThanOrEqual(1);
          expect(rect.x + rect.w).toBeLessThan(66);
          expect(rect.y).toBeGreaterThanOrEqual(23);
          expect(rect.y + rect.h).toBeLessThanOrEqual(41);
          expect(rect.y <= 31 && rect.y + rect.h > 31).toBe(false); // no opaque panel joining the rows
        }
        const textX = COUNTER_TEXT_X;
        const text = right.rects.filter(rect => rect.x >= textX - 1 && rect.y >= COIN_COUNTER_Y - 1);
        const color = pop ? COLORS.white : COLORS.yellow;
        const reference = canvas(); drawText(reference.ctx, format(value), textX, COIN_COUNTER_Y, { color });
        expect(text.filter(rect => rect.color === color)).toEqual(reference.rects);
        expect(text.some(rect => rect.color === COLORS.void)).toBe(true);
        // Only glyph pixels and their outline are painted; empty surrounding space stays clear.
        expect(text.every(rect => rect.w === 1 && rect.h === 1)).toBe(true);
      }
    }
    expect(BANNER_Y).toBe(4);
  });

  it('keeps monster-centered normal/critical damage clear of counters throughout its rise', () => {
    for (const text of ['1.00A', '1.00AA', '1.00AAA']) {
      for (const crit of [false, true]) {
        for (const age of [0, 300, 599]) {
          const pool = createFloatPool();
          spawnFieldFloat(pool, 168, 58, text, crit);
          tickFloats(pool, age);
          const out = canvas(); drawFloats(out.ctx, pool);
          expect(out.rects.length).toBeGreaterThan(0);
          for (const shake of [-1, 0, 1]) {
            for (const rect of out.rects) {
              const x = rect.x + shake;
              expect(x).toBeGreaterThanOrEqual(120);
              expect(x + rect.w).toBeLessThanOrEqual(VIEW_W);
            }
          }
        }
      }
    }
  });
});
