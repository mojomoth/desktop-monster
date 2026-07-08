// SPEC F19 — sprites-as-code integrity sweep + draw/palette behavior.
// The integrity tests iterate the exported registry of ALL sprites, so any
// art module added later (monsters, items, font) is auto-covered once it is
// side-effect imported here.

import { describe, expect, it } from 'vitest';
import {
  allSprites,
  drawSprite,
  registerSprites,
  TRANSPARENT,
} from '../src/renderer/sprites/sprite.js';
import type { Sprite, SpriteCanvas } from '../src/renderer/sprites/sprite.js';
import {
  COLORS,
  hexToHsl,
  hslToHex,
  paletteForTier,
  shiftHue,
  TIER_HUE_STEP,
  tintPalette,
} from '../src/renderer/sprites/palette.js';
import { heroAttack, heroIdle, heroSlash } from '../src/renderer/sprites/hero.js';

const HEX_COLOR = /^#[0-9a-f]{6}$/;

interface RectCall {
  x: number;
  y: number;
  w: number;
  h: number;
  fillStyle: string;
}

function makeCtx(): { ctx: SpriteCanvas; calls: RectCall[] } {
  const calls: RectCall[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      calls.push({ x, y, w, h, fillStyle: String(ctx.fillStyle) });
    },
  };
  return { ctx, calls };
}

describe('sprite registry integrity (SPEC F19)', () => {
  it('registry is non-empty and includes the hero art with the mandated frame counts', () => {
    const sprites = allSprites();
    expect(sprites.size).toBeGreaterThanOrEqual(3);
    expect(sprites.get('hero.idle')).toBe(heroIdle);
    expect(sprites.get('hero.attack')).toBe(heroAttack);
    expect(sprites.get('hero.slash')).toBe(heroSlash);
    // F19: knight idle x2, attack x3, slash-arc overlay.
    expect(heroIdle.frames).toHaveLength(2);
    expect(heroAttack.frames).toHaveLength(3);
    expect(heroSlash.frames).toHaveLength(1);
  });

  it('every frame is rectangular with the declared width and height', () => {
    const violations: string[] = [];
    for (const [name, sprite] of allSprites()) {
      if (sprite.frames.length === 0) {
        violations.push(`${name}: has no frames`);
      }
      sprite.frames.forEach((rows, f) => {
        if (rows.length !== sprite.h) {
          violations.push(`${name} frame ${f}: ${rows.length} rows, declared h=${sprite.h}`);
        }
        rows.forEach((row, y) => {
          if (row.length !== sprite.w) {
            violations.push(`${name} frame ${f} row ${y}: length ${row.length}, declared w=${sprite.w}`);
          }
        });
      });
    }
    expect(violations).toEqual([]);
  });

  it('every non-transparent char exists in the palette', () => {
    const violations: string[] = [];
    for (const [name, sprite] of allSprites()) {
      sprite.frames.forEach((rows, f) => {
        rows.forEach((row, y) => {
          for (const ch of row) {
            if (ch !== TRANSPARENT && sprite.palette[ch] === undefined) {
              violations.push(`${name} frame ${f} row ${y}: char '${ch}' not in palette`);
            }
          }
        });
      });
    }
    expect(violations).toEqual([]);
  });

  it('every palette entry of every sprite is a #rrggbb hex color', () => {
    for (const [, sprite] of allSprites()) {
      for (const color of Object.values(sprite.palette)) {
        expect(color).toMatch(HEX_COLOR);
      }
    }
  });

  it('registering a duplicate sprite name throws', () => {
    const dup: Sprite = { w: 1, h: 1, palette: { x: '#ffffff' }, frames: [['x']] };
    expect(() => registerSprites({ 'hero.idle': dup })).toThrow(/hero\.idle/);
  });
});

describe('drawSprite', () => {
  const tiny: Sprite = {
    w: 2,
    h: 2,
    palette: { a: '#ff0000', b: '#00ff00' },
    frames: [['ab', '.a']],
  };

  it('paints exactly the non-transparent pixels with their palette colors at the offset', () => {
    const { ctx, calls } = makeCtx();
    drawSprite(ctx, tiny, 0, 10, 20);
    expect(calls).toEqual([
      { x: 10, y: 20, w: 1, h: 1, fillStyle: '#ff0000' },
      { x: 11, y: 20, w: 1, h: 1, fillStyle: '#00ff00' },
      { x: 11, y: 21, w: 1, h: 1, fillStyle: '#ff0000' },
    ]);
  });

  it('flipX mirrors the frame horizontally', () => {
    const { ctx, calls } = makeCtx();
    drawSprite(ctx, tiny, 0, 0, 0, { flipX: true });
    expect(calls).toEqual([
      { x: 0, y: 0, w: 1, h: 1, fillStyle: '#00ff00' },
      { x: 1, y: 0, w: 1, h: 1, fillStyle: '#ff0000' },
      { x: 0, y: 1, w: 1, h: 1, fillStyle: '#ff0000' },
    ]);
  });

  it('tint overrides every opaque pixel color but never paints transparent pixels', () => {
    const { ctx, calls } = makeCtx();
    drawSprite(ctx, tiny, 0, 0, 0, { tint: '#deeed6' });
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(call.fillStyle).toBe('#deeed6');
    }
  });

  it('an unknown frame index draws nothing and never throws', () => {
    const { ctx, calls } = makeCtx();
    expect(() => drawSprite(ctx, tiny, 99, 0, 0)).not.toThrow();
    expect(() => drawSprite(ctx, tiny, -1, 0, 0)).not.toThrow();
    expect(calls).toEqual([]);
  });
});

describe('palette helpers', () => {
  it('COLORS is a DB16-style set of #rrggbb hex colors', () => {
    const values = Object.values(COLORS);
    expect(values).toHaveLength(16);
    for (const color of values) {
      expect(color).toMatch(HEX_COLOR);
    }
    expect(new Set(values).size).toBe(16);
  });

  it('shiftHue rotates hue exactly (red 120deg -> green, 240deg -> blue, 360deg -> red)', () => {
    expect(shiftHue('#ff0000', 120)).toBe('#00ff00');
    expect(shiftHue('#ff0000', 240)).toBe('#0000ff');
    expect(shiftHue('#ff0000', 360)).toBe('#ff0000');
    expect(shiftHue('#ff0000', -120)).toBe('#0000ff');
  });

  it('shiftHue leaves grayscale untouched and hex<->hsl round-trips every DB16 color', () => {
    expect(shiftHue('#808080', 90)).toBe('#808080');
    for (const color of Object.values(COLORS)) {
      const { h, s, l } = hexToHsl(color);
      expect(hslToHex(h, s, l)).toBe(color);
    }
  });

  it('tier 0 palette is an untinted copy and later tiers shift hue per TIER_HUE_STEP', () => {
    const base = { g: '#00ff00', k: '#808080' };
    const tier0 = paletteForTier(base, 0);
    expect(tier0).toEqual(base);
    expect(tier0).not.toBe(base); // defensive copy — callers may mutate

    const tier1 = paletteForTier(base, 1);
    expect(tier1.g).toBe(shiftHue('#00ff00', TIER_HUE_STEP));
    expect(tier1.g).not.toBe(base.g);
    expect(tier1.k).toBe('#808080'); // grayscale never shifts

    // A full 360-degree cycle lands back on the base palette.
    expect(paletteForTier(base, 360 / TIER_HUE_STEP)).toEqual(base);
  });

  it('tintPalette keeps keys and emits valid hex for every tier used by the game', () => {
    for (let tier = 0; tier < 8; tier++) {
      const tinted = paletteForTier(COLORS, tier);
      expect(Object.keys(tinted).sort()).toEqual(Object.keys(COLORS).sort());
      for (const color of Object.values(tinted)) {
        expect(color).toMatch(HEX_COLOR);
      }
    }
    const rotated = tintPalette({ r: '#d04648' }, 180);
    expect(rotated.r).toBe(shiftHue('#d04648', 180));
  });

  it('hexToHsl rejects malformed colors', () => {
    expect(() => hexToHsl('red')).toThrow(/rrggbb/);
    expect(() => hexToHsl('#fff')).toThrow(/rrggbb/);
  });
});
