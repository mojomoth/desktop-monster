// HUD painting (SPEC F21 + T14/T15 presentation): boxed monster HP bar,
// top-left `LV n` + XP bar, top-right kill/coin counters (with a collection
// pop flash), the pooled floating-damage-number system — numbers rise 8px
// and fade over 600ms; crits draw double-size and yellow (Manual M2) — and
// the flashing "LEVEL UP!" banner (Manual M3).
// DOM-free on purpose — everything draws through SpriteCanvas so the tests
// run under vitest's node environment (same pattern as sprites/sprite.ts).

import { ratio, xpToNext } from '../core/index.js';
import type { Effectiveness, GameState } from '../core/index.js';
import { heroReadiness, heroReady, HERO_DEFER_MS, HERO_REST_MS } from '../core/hero.js';
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
export const COUNTER_TOP = 16;
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
): void {
  const barX = Math.round(cx - XP_BAR_W / 2);
  const barY = bottom - XP_BAR_H;
  drawMeter(ctx, barX, barY, XP_BAR_W, XP_BAR_H, state.xp / xpToNext(state.level), COLORS.cyan);
  const label = `LV ${String(state.level)}`;
  drawText(ctx, label, Math.round(cx - textWidth(label) / 2), barY - FONT_H - 2);
  if (heroReady(state.level, state.hero)) {
    const ready = 'REBIRTH READY';
    drawText(ctx, ready, Math.round(cx - textWidth(ready) / 2), barY - 2 * (FONT_H + 2), { color: COLORS.yellow });
  }
}

/** Expedition gauge box: meter width, and where the soul count starts. */
export const EXPEDITION_W = 40;
export const EXPEDITION_H = 3;
export const EXPEDITION_SOULS_X = HUD_MARGIN + EXPEDITION_W + 2;

/**
 * Top-left expedition readout: how far the next reincarnation offer is, plus
 * the souls the current depth already guarantees. While the post-accept rest
 * runs the meter drains; once it is over the same meter fills with progress
 * toward the level that unlocks the offer, so the long quiet stretch that
 * used to show nothing still says what it is waiting for. Display only — it
 * grants nothing and never moves, so the whole thing stays inside
 * x[2,60) y[16,21), clear of the hero, the monster, the party, the counters
 * and the banner. It hides once the offer is ready or no further offer exists.
 */
export function drawExpedition(ctx: SpriteCanvas, state: Readonly<GameState>): void {
  const readiness = heroReadiness(state.level, state.hero);
  if (readiness.status === 'ready' || readiness.status === 'capped') return;
  // Both waits drain; only the climb to the unlock level fills. Green keeps
  // the climb apart from the cyan XP bar riding above the hero's head.
  const [ratio, color] = readiness.status === 'rest'
    ? [readiness.remainingMs / HERO_REST_MS, COLORS.blue]
    : readiness.status === 'defer'
      ? [readiness.remainingMs / HERO_DEFER_MS, COLORS.blue]
      : [state.level / readiness.requiredLevel, COLORS.green];
  drawMeter(ctx, HUD_MARGIN, COUNTER_TOP, EXPEDITION_W, EXPEDITION_H, ratio, color);
  const souls = String(Math.max(1, Math.floor(state.monster.index / 8)));
  drawText(ctx, souls.length > 4 ? '9999' : souls, EXPEDITION_SOULS_X, COUNTER_TOP, { color: COLORS.orange });
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

/** How long the coin counter stays "popped" after a drop arrives, ms. */
export const COUNTER_POP_MS = 150;

/**
 * Top-right HUD: skull × killCount row, coin × coins row (right-aligned).
 * While `coinPop` is set (a collected drop just arrived, T15) the coin row
 * pops: the count flashes white and the icon lifts one pixel.
 */
export function drawCounters(
  ctx: SpriteCanvas,
  state: Readonly<GameState>,
  viewW: number,
  coinPop = false,
): void {
  const kills = String(state.killCount);
  const killsX = viewW - HUD_MARGIN - textWidth(kills);
  drawText(ctx, kills, killsX, COUNTER_TOP);
  drawSkullIcon(ctx, killsX - 7, COUNTER_TOP);

  const coins = String(state.coins);
  const coinsX = viewW - HUD_MARGIN - textWidth(coins);
  drawText(ctx, coins, coinsX, COUNTER_TOP + FONT_H + 2, {
    color: coinPop ? COLORS.white : COLORS.yellow,
  });
  const iconY = COUNTER_TOP + FONT_H + (coinPop ? 0 : 1);
  drawSprite(ctx, itemSprites.coin, 0, coinsX - 8, iconY);
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
}

/** Fixed pool size — key-mashing can never grow an unbounded array. */
export const FLOAT_POOL_SIZE = 16;
/** Lifetime of one floating number, ms. */
export const FLOAT_LIFE_MS = 600;
/** Total rise over the lifetime, game pixels. */
export const FLOAT_RISE_PX = 14;
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
    if (!f.active) continue;
    const scale = f.crit ? CRIT_FLOAT_SCALE : FLOAT_SCALE;
    const text = f.crit ? `${f.text}!` : f.text;
    const faded = f.ageMs >= FLOAT_LIFE_MS * FLOAT_FADE_RATIO;
    const color = faded
      ? f.crit
        ? COLORS.orange
        : COLORS.steel
      : (f.color ?? (f.crit ? COLORS.yellow : COLORS.white));
    const rise = Math.round(FLOAT_RISE_PX * (f.crit ? CRIT_RISE_MULT : 1) * (f.ageMs / FLOAT_LIFE_MS));
    const x = Math.round(f.x - (textWidth(text) * scale) / 2);
    const y = f.y - rise - (scale - 1) * FONT_H;
    // 1-px void outline (4 offsets) under the glyphs: numbers stay readable over any art.
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      drawScaledText(ctx, text, x + ox, y + oy, scale, COLORS.void);
    }
    drawScaledText(ctx, text, x, y, scale, color);
  }
}

/** Draw the active fever state directly above the hero, with a dark outline. */
export function drawFeverLabel(ctx: SpriteCanvas, cx: number, heroTop: number): void {
  const scale = 2;
  const x = Math.round(cx - (textWidth(FEVER_TEXT) * scale) / 2);
  const y = heroTop - 26;
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    drawScaledText(ctx, FEVER_TEXT, x + ox, y + oy, scale, COLORS.void);
  }
  drawScaledText(ctx, FEVER_TEXT, x, y, scale, COLORS.yellow);
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
/** Banner pixel scale. */
export const BANNER_SCALE = 2;
/** Flash cadence: the banner alternates yellow/white every interval. */
export const BANNER_FLASH_MS = 100;
/** Banner top edge, game pixels (clear of the HUD rows and the monster). */
export const BANNER_Y = 20;

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

/** Age the banner; it deactivates after BANNER_MS. */
export function tickBanner(banner: Banner, dtMs: number): void {
  if (!banner.active) {
    return;
  }
  banner.ageMs += dtMs;
  if (banner.ageMs >= BANNER_MS) {
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
