// HUD painting (SPEC F21 + T14 combat presentation): boxed monster HP bar,
// top-left `LV n` + XP bar, top-right kill/coin counters, and the pooled
// floating-damage-number system — numbers rise 8px and fade over 600ms;
// crits draw double-size and yellow (Manual M2).
// DOM-free on purpose — everything draws through SpriteCanvas so the tests
// run under vitest's node environment (same pattern as sprites/sprite.ts).

import { xpToNext } from '../core/index.js';
import type { GameState } from '../core/index.js';
import {
  COLORS,
  drawSprite,
  drawText,
  FONT_ADVANCE,
  FONT_H,
  FONT_W,
  fontSprite,
  glyphIndex,
  itemSprites,
  textWidth,
  TRANSPARENT,
} from './sprites/index.js';
import type { SpriteCanvas } from './sprites/index.js';

/** Gap between HUD chrome and the canvas edges, in game pixels. */
export const HUD_MARGIN = 2;
/** XP progress bar box size (top-left, under the LV text). */
export const XP_BAR_W = 40;
export const XP_BAR_H = 4;

/**
 * Boxed meter: 1px steel frame, void interior, proportional fill. A non-zero
 * ratio always shows at least 1px of fill; out-of-range/non-finite ratios
 * are clamped so a bad value can never paint outside the box.
 */
export function drawMeter(
  ctx: SpriteCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  fillColor: string,
): void {
  ctx.fillStyle = COLORS.steel;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const fill = clamped === 0 ? 0 : Math.max(1, Math.round((w - 2) * clamped));
  if (fill > 0) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x + 1, y + 1, fill, h - 2);
  }
}

/** Boxed red HP bar (drawn above the monster). */
export function drawHpBar(
  ctx: SpriteCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  maxHp: number,
): void {
  drawMeter(ctx, x, y, w, h, maxHp > 0 ? hp / maxHp : 0, COLORS.red);
}

/** Top-left HUD: `LV n` text plus the XP progress bar toward the next level. */
export function drawLevelHud(ctx: SpriteCanvas, state: Readonly<GameState>): void {
  drawText(ctx, `LV ${String(state.level)}`, HUD_MARGIN, HUD_MARGIN);
  drawMeter(
    ctx,
    HUD_MARGIN,
    HUD_MARGIN + FONT_H + 2,
    XP_BAR_W,
    XP_BAR_H,
    state.xp / xpToNext(state.level),
    COLORS.cyan,
  );
}

/** 5×5 skull marker for the kill counter — HUD chrome, drawn directly. */
function drawSkullIcon(ctx: SpriteCanvas, x: number, y: number): void {
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(x, y, 5, 3); // cranium
  ctx.fillRect(x + 1, y + 3, 3, 2); // jaw
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(x + 1, y + 1, 1, 1); // left eye socket
  ctx.fillRect(x + 3, y + 1, 1, 1); // right eye socket
  ctx.fillRect(x + 2, y + 4, 1, 1); // tooth gap
}

/** Top-right HUD: skull × killCount row, coin × coins row (right-aligned). */
export function drawCounters(
  ctx: SpriteCanvas,
  state: Readonly<GameState>,
  viewW: number,
): void {
  const kills = String(state.killCount);
  const killsX = viewW - HUD_MARGIN - textWidth(kills);
  drawText(ctx, kills, killsX, HUD_MARGIN);
  drawSkullIcon(ctx, killsX - 7, HUD_MARGIN);

  const coins = String(state.coins);
  const coinsX = viewW - HUD_MARGIN - textWidth(coins);
  drawText(ctx, coins, coinsX, HUD_MARGIN + FONT_H + 2, { color: COLORS.yellow });
  drawSprite(ctx, itemSprites.coin, 0, coinsX - 8, HUD_MARGIN + FONT_H + 1);
}

/** One pooled floating damage number. Slots are reused, never reallocated. */
export interface FloatingNumber {
  active: boolean;
  /** Horizontal center of the text, in game pixels. */
  x: number;
  /** Spawn baseline; the number rises FLOAT_RISE_PX over its lifetime. */
  y: number;
  text: string;
  crit: boolean;
  ageMs: number;
}

/** Fixed pool size — key-mashing can never grow an unbounded array. */
export const FLOAT_POOL_SIZE = 16;
/** Lifetime of one floating number, ms. */
export const FLOAT_LIFE_MS = 600;
/** Total rise over the lifetime, game pixels. */
export const FLOAT_RISE_PX = 8;
/** Age fraction past which a float draws in its dim fade color. */
export const FLOAT_FADE_RATIO = 2 / 3;
/** Pixel scale of crit damage numbers (Manual M2: crits show larger). */
export const CRIT_FLOAT_SCALE = 2;

/** Pre-allocate a pool of inactive floating-number slots. */
export function createFloatPool(size: number = FLOAT_POOL_SIZE): FloatingNumber[] {
  return Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    text: '',
    crit: false,
    ageMs: 0,
  }));
}

/** Activate a slot: the first inactive one, else recycle the oldest active. */
export function spawnFloat(
  pool: FloatingNumber[],
  x: number,
  y: number,
  text: string,
  crit: boolean,
): void {
  let slot = pool.find((f) => !f.active);
  if (slot === undefined) {
    for (const f of pool) {
      if (slot === undefined || f.ageMs > slot.ageMs) {
        slot = f;
      }
    }
  }
  if (slot === undefined) {
    return; // zero-size pool
  }
  slot.active = true;
  slot.x = x;
  slot.y = y;
  slot.text = text;
  slot.crit = crit;
  slot.ageMs = 0;
}

/** Age every active slot; slots past FLOAT_LIFE_MS deactivate. */
export function tickFloats(pool: FloatingNumber[], dtMs: number): void {
  for (const f of pool) {
    if (!f.active) {
      continue;
    }
    f.ageMs += dtMs;
    if (f.ageMs >= FLOAT_LIFE_MS) {
      f.active = false;
    }
  }
}

/**
 * drawText at an integer pixel scale: every glyph pixel becomes a
 * scale×scale rect. Local to the HUD — the sprite/font modules stay
 * 1px-based (their data is covered by the T11 integrity sweep).
 */
function drawScaledText(
  ctx: SpriteCanvas,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
): void {
  if (scale === 1) {
    drawText(ctx, text, x, y, { color });
    return;
  }
  for (let i = 0; i < text.length; i++) {
    const rows = fontSprite.frames[glyphIndex(text.charAt(i))];
    if (rows === undefined) {
      continue; // unknown chars still advance a cell — stable layout
    }
    for (let ry = 0; ry < FONT_H; ry++) {
      const row = rows[ry];
      if (row === undefined) {
        continue;
      }
      for (let rx = 0; rx < FONT_W; rx++) {
        const ch = row.charAt(rx);
        if (ch === TRANSPARENT || ch === '') {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(x + (i * FONT_ADVANCE + rx) * scale, y + ry * scale, scale, scale);
      }
    }
  }
}

/**
 * Draw active floating numbers, risen by age; the last third of the
 * lifetime fades to a dim color. Crits draw double-size and yellow
 * (bottom-anchored so the bigger glyphs grow upward, not into the monster).
 */
export function drawFloats(ctx: SpriteCanvas, pool: FloatingNumber[]): void {
  for (const f of pool) {
    if (!f.active) {
      continue;
    }
    const scale = f.crit ? CRIT_FLOAT_SCALE : 1;
    const faded = f.ageMs >= FLOAT_LIFE_MS * FLOAT_FADE_RATIO;
    const color = f.crit
      ? faded
        ? COLORS.orange
        : COLORS.yellow
      : faded
        ? COLORS.steel
        : COLORS.white;
    const rise = Math.round(FLOAT_RISE_PX * (f.ageMs / FLOAT_LIFE_MS));
    const x = Math.round(f.x - (textWidth(f.text) * scale) / 2);
    drawScaledText(ctx, f.text, x, f.y - rise - (scale - 1) * FONT_H, scale, color);
  }
}
