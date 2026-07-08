// SPEC F19 (part 2) — 3x5 pixel font as code: the digits (damage numbers,
// counters) plus every letter needed for "LV" and "LEVEL UP!". All glyphs
// are frames of ONE sprite so the T11 integrity sweep covers each glyph;
// GLYPH_CHARS maps a character to its frame index. Default color is white —
// pass drawText's `color` (drawSprite tint under the hood) to recolor, e.g.
// yellow crits.

import { COLORS } from './palette.js';
import { drawSprite, registerSprites } from './sprite.js';
import type { Sprite, SpriteCanvas } from './sprite.js';

/** Glyph width in game pixels. */
export const FONT_W = 3;
/** Glyph height in game pixels. */
export const FONT_H = 5;
/** Horizontal advance per character (glyph + 1px spacing). */
export const FONT_ADVANCE = FONT_W + 1;

/** Character at index i is drawn with fontSprite frame i. */
export const GLYPH_CHARS = '0123456789LVEUP!';

/** All glyphs of the pixel font, one frame per GLYPH_CHARS character. */
export const fontSprite: Sprite = {
  w: FONT_W,
  h: FONT_H,
  palette: {
    w: COLORS.white,
  },
  frames: [
    // 0
    ['www', 'w.w', 'w.w', 'w.w', 'www'],
    // 1
    ['.w.', 'ww.', '.w.', '.w.', 'www'],
    // 2
    ['www', '..w', 'www', 'w..', 'www'],
    // 3
    ['www', '..w', '.ww', '..w', 'www'],
    // 4
    ['w.w', 'w.w', 'www', '..w', '..w'],
    // 5
    ['www', 'w..', 'www', '..w', 'www'],
    // 6
    ['www', 'w..', 'www', 'w.w', 'www'],
    // 7
    ['www', '..w', '..w', '.w.', '.w.'],
    // 8
    ['www', 'w.w', 'www', 'w.w', 'www'],
    // 9
    ['www', 'w.w', 'www', '..w', 'www'],
    // L
    ['w..', 'w..', 'w..', 'w..', 'www'],
    // V
    ['w.w', 'w.w', 'w.w', 'w.w', '.w.'],
    // E
    ['www', 'w..', 'www', 'w..', 'www'],
    // U
    ['w.w', 'w.w', 'w.w', 'w.w', 'www'],
    // P
    ['www', 'w.w', 'www', 'w..', 'w..'],
    // !
    ['.w.', '.w.', '.w.', '...', '.w.'],
  ],
};

registerSprites({ 'font.glyphs': fontSprite });

/**
 * Frame index of a character's glyph, or -1 if the font has no glyph for it
 * (spaces and anything else unknown). Letters match case-insensitively.
 */
export function glyphIndex(ch: string): number {
  return GLYPH_CHARS.indexOf(ch.toUpperCase());
}

/**
 * Width in game pixels of a string drawn by drawText (no trailing spacing).
 * Unknown characters still occupy a cell, keeping layouts stable.
 */
export function textWidth(text: string): number {
  return text.length === 0 ? 0 : text.length * FONT_ADVANCE - 1;
}

export interface DrawTextOptions {
  /** Draw every glyph pixel in this color instead of the default white. */
  color?: string;
}

/**
 * Draw a string at (x, y) in game pixels, one FONT_ADVANCE cell per
 * character. Characters without a glyph (e.g. spaces) advance the cursor
 * without painting; drawing never throws mid-render-loop.
 */
export function drawText(
  ctx: SpriteCanvas,
  text: string,
  x: number,
  y: number,
  opts?: DrawTextOptions,
): void {
  const tint = opts?.color;
  for (let i = 0; i < text.length; i++) {
    const frame = glyphIndex(text.charAt(i));
    if (frame >= 0) {
      drawSprite(ctx, fontSprite, frame, x + i * FONT_ADVANCE, y, tint === undefined ? undefined : { tint });
    }
  }
}
