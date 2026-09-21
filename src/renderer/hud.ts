// HUD painting (SPEC F21 + T14/T15 presentation): boxed monster HP bar,
// above-hero labels and XP bar, top-left kill/coin counters (with a collection
// pop flash), pooled floating damage and PvP result banners.
// DOM-free on purpose — everything draws through SpriteCanvas so the tests
// run under vitest's node environment (same pattern as sprites/sprite.ts).

import { format, ratio, xpToNext } from '../core/index.js';
import type { Effectiveness, GameState } from '../core/index.js';
import { heroReady } from '../core/hero.js';
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
/** Keep counters below the drag strip, closer to the field. */
export const COUNTER_TOP = 32;
export const COUNTER_SCALE = 1;
export const COUNTER_ROW_GAP = 10;
export const COIN_COUNTER_Y = COUNTER_TOP + COUNTER_ROW_GAP;
export const COIN_COUNTER_X = HUD_MARGIN;
export const COUNTER_TEXT_X = HUD_MARGIN + 9;
export const BAG_FULL_Y = COIN_COUNTER_Y + 12;
/** Slow ready-label pulse; keep the outline and occupied space in both phases. */
export const REBIRTH_READY_FLASH_MS = 800;
/** XP progress bar box size (above the hero, under the LV text). */
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
  hp: bigint,
  maxHp: bigint,
): void {
  drawMeter(ctx, x, y, w, h, ratio(hp, maxHp), COLORS.red);
}

/**
 * `LV n` text plus the XP progress bar, floating above the hero's head
 * (Assumption 17): `cx` is the hero's horizontal center, `bottom` sits just
 * above the hero's top row — the bar hugs the head, the label rides above it.
 */
export function drawLevelHud(
  ctx: SpriteCanvas,
  state: Readonly<GameState>,
  cx: number,
  bottom: number,
  effects: { levelUp?: Banner; feverAgeMs?: number; timeMs?: number } = {},
): void {
  const barX = Math.round(cx - XP_BAR_W / 2);
  const barY = bottom - XP_BAR_H;
  drawMeter(ctx, barX, barY, XP_BAR_W, XP_BAR_H, state.xp / xpToNext(state.level), COLORS.cyan);
  const label = `LV ${String(state.level)}`;
  let labelY = barY - FONT_H - 2;
  drawOutlinedText(ctx, label, Math.round(cx - textWidth(label) / 2), labelY, 1, COLORS.white);
  if (heroReady(state.level, state.hero)) {
    const ready = 'REBIRTH READY';
    labelY -= FONT_H + 2;
    const color = Math.floor((effects.timeMs ?? 0) / REBIRTH_READY_FLASH_MS) % 2 === 0 ? COLORS.yellow : COLORS.steel;
    drawOutlinedText(ctx, ready, Math.round(cx - textWidth(ready) / 2), labelY, 1, color);
  }
  if (effects.levelUp?.active && effects.levelUp.text === LEVEL_UP_TEXT) {
    labelY -= FONT_H + 2;
    const color = Math.floor(effects.levelUp.ageMs / LEVEL_UP_FLASH_MS) % 2 === 0 ? COLORS.yellow : COLORS.white;
    drawOutlinedText(ctx, LEVEL_UP_TEXT, Math.round(cx - textWidth(LEVEL_UP_TEXT) / 2), labelY, 1, color);
  }
  if (effects.feverAgeMs !== undefined) {
    drawFeverLabel(ctx, cx, labelY - FONT_H * 2 - 3, effects.feverAgeMs);
  }
}

/** 5×5 skull marker for the kill counter — HUD chrome, drawn directly. */
function drawSkullIcon(ctx: SpriteCanvas, x: number, y: number): void {
  const rect = (dx: number, dy: number, w: number, h: number): void => {
    ctx.fillRect(x + dx * COUNTER_SCALE, y + dy * COUNTER_SCALE, w * COUNTER_SCALE, h * COUNTER_SCALE);
  };
  ctx.fillStyle = COLORS.void;
  rect(-1, 0, 7, 3);
  rect(0, -1, 5, 6);
  rect(1, 5, 3, 1);
  ctx.fillStyle = COLORS.white;
  rect(0, 0, 5, 3); // cranium
  rect(1, 3, 3, 2); // jaw
  ctx.fillStyle = COLORS.void;
  rect(1, 1, 1, 1); // left eye socket
  rect(3, 1, 1, 1); // right eye socket
  rect(2, 4, 1, 1); // tooth gap
}

/** How long the coin counter stays "popped" after a drop arrives, ms. */
export const COUNTER_POP_MS = 150;

/**
 * Top-left HUD: fixed skull/coin icons and left-aligned counts.
 * While `coinPop` is set (a collected drop just arrived, T15) the coin row
 * pops: the count flashes white and the icon lifts one pixel.
 */
export function drawCounters(
  ctx: SpriteCanvas,
  state: Readonly<GameState>,
  viewW: number,
  coinPop = false,
): void {
  const kills = format(state.killCount);
  const killsX = Math.min(COUNTER_TEXT_X, viewW - HUD_MARGIN - textWidth(kills) * COUNTER_SCALE);
  const coins = format(state.coins);
  const coinsX = Math.min(COUNTER_TEXT_X, viewW - HUD_MARGIN - textWidth(coins) * COUNTER_SCALE);
  drawOutlinedText(ctx, kills, killsX, COUNTER_TOP, COUNTER_SCALE, COLORS.white);
  drawSkullIcon(ctx, HUD_MARGIN + 1, COUNTER_TOP);

  drawOutlinedText(ctx, coins, coinsX, COIN_COUNTER_Y, COUNTER_SCALE, coinPop ? COLORS.white : COLORS.yellow);
  const iconX = COIN_COUNTER_X;
  const iconY = COIN_COUNTER_Y - (coinPop ? 1 : 0);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    drawSprite(ctx, itemSprites.coin, 0, iconX + ox, iconY + oy, { scale: COUNTER_SCALE, tint: COLORS.void });
  }
  drawSprite(ctx, itemSprites.coin, 0, iconX, iconY, { scale: COUNTER_SCALE });
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
  /** Fresh-phase colour override (companion floats, F64); crit rules if unset. */
  color?: string;
  /** Field-only fit for long suffixes; target-position PvP keeps its default. */
  scale?: number;
  /** Field labels fit above the monster; replay labels keep their original rise. */
  field?: boolean;
}

/** Fixed pool size — key-mashing can never grow an unbounded array. */
export const FLOAT_POOL_SIZE = 16;
/** Lifetime of one floating number, ms. */
export const FLOAT_LIFE_MS = 600;
/** Total rise over the lifetime, game pixels. */
export const FLOAT_RISE_PX = 14;
export const FIELD_FLOAT_RISE_PX = 28;
/** Ink bounds reserve one pixel each for outline and camera shake. */
export const FIELD_FLOAT_LEFT = 122;
export const FIELD_FLOAT_RIGHT = 197;
/** Age fraction past which a float draws in its dim fade color. */
export const FLOAT_FADE_RATIO = 2 / 3;
/** Pixel scale of normal damage numbers (user change 2026-09-06: readable 2x glyphs with a 1-px outline). */
export const FLOAT_SCALE = 2;
/** Pixel scale of crit damage numbers (Manual M2: crits show larger — 3x, yellow, with a '!'). */
export const CRIT_FLOAT_SCALE = 3;
/** Crits rise this much further than normal floats (same lifetime, punchier). */
export const CRIT_RISE_MULT = 1.5;

export function floatColor(effectiveness: Effectiveness): string {
  return effectiveness === 'super'
    ? COLORS.yellow
    : effectiveness === 'weak'
      ? COLORS.steel
      : COLORS.white;
}

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
  color?: string,
  scale?: number,
  field = false,
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
  slot.color = color;
  slot.scale = scale;
  slot.field = field;
  slot.ageMs = 0;
}

/** Center on the monster, fitting long labels into its side of the field. */
export function spawnFieldFloat(pool: FloatingNumber[], cx: number, y: number, text: string, crit: boolean, color?: string): void {
  const width = textWidth(crit ? `${text}!` : text);
  const scale = Math.max(1, Math.min(crit ? CRIT_FLOAT_SCALE : FLOAT_SCALE,
    Math.floor((FIELD_FLOAT_RIGHT - FIELD_FLOAT_LEFT) / Math.max(1, width))));
  const x = Math.max(FIELD_FLOAT_LEFT, Math.min(FIELD_FLOAT_RIGHT - width * scale, Math.round(cx - width * scale / 2)));
  spawnFloat(pool, x + width * scale / 2, y, text, crit, color, scale, true);
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

/** A one-pixel outline follows the glyphs while the space around them stays transparent. */
function drawOutlinedText(ctx: SpriteCanvas, text: string, x: number, y: number, scale: number, color: string): void {
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    drawScaledText(ctx, text, x + ox, y + oy, scale, COLORS.void);
  }
  drawScaledText(ctx, text, x, y, scale, color);
}

/**
 * Draw active floating numbers, risen by age; the last third of the
 * lifetime fades to a dim color. Crits draw double-size and yellow
 * (bottom-anchored so the bigger glyphs grow upward, not into the monster).
 */
export function drawFloats(ctx: SpriteCanvas, pool: FloatingNumber[]): void {
  for (const f of pool) {
    if (!f.active) continue;
    const scale = f.scale ?? (f.crit ? CRIT_FLOAT_SCALE : FLOAT_SCALE);
    const text = f.crit ? `${f.text}!` : f.text;
    const faded = f.ageMs >= FLOAT_LIFE_MS * FLOAT_FADE_RATIO;
    const color = faded
      ? f.crit
        ? COLORS.orange
        : COLORS.steel
      : (f.color ?? (f.crit ? COLORS.yellow : COLORS.white));
    const rise = Math.round((f.field ? FIELD_FLOAT_RISE_PX : FLOAT_RISE_PX) * (f.crit ? CRIT_RISE_MULT : 1) * (f.ageMs / FLOAT_LIFE_MS));
    const x = Math.round(f.x - (textWidth(text) * scale) / 2);
    const top = f.y - rise - (scale - 1) * FONT_H;
    const y = f.field ? Math.max(2, top) : top;
    drawOutlinedText(ctx, text, x, y, scale, color);
  }
}

/** Draw the active fever state directly above the hero, with a dark outline. */
export function drawFeverLabel(ctx: SpriteCanvas, cx: number, top: number, ageMs = 0): void {
  const scale = 2;
  const x = Math.round(cx - (textWidth(FEVER_TEXT) * scale) / 2);
  const color = Math.floor(ageMs / FEVER_FLASH_MS) % 2 === 0 ? COLORS.yellow : COLORS.white;
  drawOutlinedText(ctx, FEVER_TEXT, x, top, scale, color);
}

// ---------------------------------------------------------------------------
// "LEVEL UP!" banner (Manual M3): a centered double-size flash triggered by
// the engine's levelUp event. Single timer slot — a second level-up simply
// restarts it (no unbounded state).
// ---------------------------------------------------------------------------

/** Banner text — every glyph exists in font.ts's GLYPH_CHARS. */
export const LEVEL_UP_TEXT = 'LEVEL UP!';
export const FEVER_TEXT = 'FEVER!';
export const VICTORY_TEXT = 'VICTORY!';
export const DEFEAT_TEXT = 'DEFEAT';
/** Banner lifetime, ms. */
export const BANNER_MS = 1200;
export const LEVEL_UP_MS = 2400;
export const LEVEL_UP_FLASH_MS = 600;
export const FEVER_FLASH_MS = 200;
/** Banner pixel scale. */
export const BANNER_SCALE = 2;
/** Flash cadence: the banner alternates yellow/white every interval. */
export const BANNER_FLASH_MS = 100;
/** Banner top edge, game pixels (clear of the HUD rows and the monster). */
export const BANNER_Y = 4;

/** The banner's single timer slot. */
export interface Banner {
  active: boolean;
  ageMs: number;
  text: string;
}

/** Fresh, inactive banner state. */
export function createBanner(): Banner {
  return { active: false, ageMs: 0, text: LEVEL_UP_TEXT };
}

/** (Re)start the banner — called on every levelUp event. */
export function showBanner(banner: Banner, text = LEVEL_UP_TEXT): void {
  banner.active = true;
  banner.ageMs = 0;
  banner.text = text;
}

/** Level-up lingers above the hero; PvP banners retain their short duration. */
export function tickBanner(banner: Banner, dtMs: number): void {
  if (!banner.active) {
    return;
  }
  banner.ageMs += dtMs;
  if (banner.ageMs >= (banner.text === LEVEL_UP_TEXT ? LEVEL_UP_MS : BANNER_MS)) {
    banner.active = false;
  }
}

/** Draw the flashing centered banner while it is active. */
export function drawBanner(ctx: SpriteCanvas, banner: Banner, viewW: number): void {
  if (!banner.active) {
    return;
  }
  const flashPhase = Math.floor(banner.ageMs / BANNER_FLASH_MS) % 2;
  const color = flashPhase === 0 ? COLORS.yellow : COLORS.white;
  const x = Math.round((viewW - textWidth(banner.text) * BANNER_SCALE) / 2);
  drawScaledText(ctx, banner.text, x, BANNER_Y, BANNER_SCALE, color);
}
