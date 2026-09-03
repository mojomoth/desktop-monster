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
import { monsterSprites } from '../src/renderer/sprites/monsters.js';
import { ITEM_SPRITE_IDS, itemSprites } from '../src/renderer/sprites/items.js';
import { BOSS_HP_BAR_Y, drawBoss } from '../src/renderer/sprites/boss.js';
import { drawCompanion } from '../src/renderer/sprites/companion.js';
import {
  drawParty,
  drawTypeBadge,
  PARTY_STEP_X,
  PARTY_STEP_Y,
  PARTY_X,
  partySlots,
  TYPE_COLORS,
} from '../src/renderer/sprites/party.js';
import {
  drawText,
  FONT_ADVANCE,
  FONT_H,
  FONT_W,
  fontSprite,
  GLYPH_CHARS,
  glyphIndex,
  textWidth,
} from '../src/renderer/sprites/font.js';
import { COIN_ITEM, sizeOf, SPECIES_IDS, TRINKET_TABLE } from '../src/core/index.js';
import type { Companion } from '../src/core/index.js';
import { drawFeverAura } from '../src/renderer/sprites/index.js';

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

describe('fever aura', () => {
  it('drawFeverAura paints four hue-shifted copies under the sprite and cycles with time', () => {
    const sprite: Sprite = { w: 1, h: 1, palette: { r: COLORS.red }, frames: [['r']] };
    const first = makeCtx();
    drawFeverAura(first.ctx, sprite, 0, 10, 20, 2, 0);
    expect(first.calls).toEqual([
      { x: 9, y: 20, w: 2, h: 2, fillStyle: COLORS.red },
      { x: 11, y: 20, w: 2, h: 2, fillStyle: COLORS.red },
      { x: 10, y: 19, w: 2, h: 2, fillStyle: COLORS.red },
      { x: 10, y: 21, w: 2, h: 2, fillStyle: COLORS.red },
    ]);

    const cycled = makeCtx();
    drawFeverAura(cycled.ctx, sprite, 0, 10, 20, 2, 480);
    expect(cycled.calls).toHaveLength(4);
    expect(cycled.calls.every((call) => call.fillStyle === shiftHue(COLORS.red, 120))).toBe(true);
    expect(cycled.calls[0]?.fillStyle).not.toBe(first.calls[0]?.fillStyle);
  });
});

describe('monster art (SPEC F19 part 2, Assumption 4)', () => {
  it('every core species has idle x2 and hit x1 sprites registered under monster.<id>.<pose>', () => {
    const registered = allSprites();
    expect(SPECIES_IDS).toHaveLength(5);
    for (const id of SPECIES_IDS) {
      const art = monsterSprites[id];
      expect(art.idle.frames, `${id} idle`).toHaveLength(2);
      expect(art.hit.frames, `${id} hit`).toHaveLength(1);
      expect(registered.get(`monster.${id}.idle`), `monster.${id}.idle`).toBe(art.idle);
      expect(registered.get(`monster.${id}.hit`), `monster.${id}.hit`).toBe(art.hit);
    }
  });

  it('monster sprites stay small (about 12x10) and fit the 160x110 scene', () => {
    for (const id of SPECIES_IDS) {
      for (const sprite of [monsterSprites[id].idle, monsterSprites[id].hit]) {
        expect(sprite.w, `${id} width`).toBeLessThanOrEqual(14);
        expect(sprite.h, `${id} height`).toBeLessThanOrEqual(12);
        expect(sprite.w, `${id} width`).toBeGreaterThanOrEqual(6);
        expect(sprite.h, `${id} height`).toBeGreaterThanOrEqual(6);
      }
    }
  });
});

describe('item art (SPEC F19 part 2)', () => {
  it('there is an item sprite for the coin and for every trinket in the loot table', () => {
    const byId: Partial<Record<string, Sprite>> = itemSprites;
    expect(byId[COIN_ITEM.id], COIN_ITEM.id).toBeDefined();
    for (const { item } of TRINKET_TABLE) {
      expect(byId[item.id], item.id).toBeDefined();
    }
    // 1 coin + 5 trinkets, nothing else.
    expect(ITEM_SPRITE_IDS).toHaveLength(1 + TRINKET_TABLE.length);
  });

  it('every item sprite has exactly one frame and is registered under item.<id>', () => {
    const registered = allSprites();
    for (const id of ITEM_SPRITE_IDS) {
      expect(itemSprites[id].frames, id).toHaveLength(1);
      expect(registered.get(`item.${id}`), `item.${id}`).toBe(itemSprites[id]);
    }
  });
});

describe('boss and companion art helpers (SPEC F40)', () => {
  it('drawBoss scales by species size plus one', () => {
    const { ctx, calls } = makeCtx();
    const species = monsterSprites.slime;
    drawBoss(ctx, species, 'idle', 0, 118, 92, 1);

    const scale = sizeOf('slime') + 1;
    expect(BOSS_HP_BAR_Y).toBe(78);
    const body = calls.filter((call) => call.w === scale && call.h === scale);
    expect(body).toHaveLength(species.idle.frames[0]?.join('').replaceAll('.', '').length ?? 0);
    expect(body[0]).toEqual({
      x: 126,
      y: 76,
      w: scale,
      h: scale,
      fillStyle: paletteForTier(species.idle.palette, 1).g,
    });
    expect(calls.find((call) => call.y === 66)).toEqual({
      x: 126,
      y: 66,
      w: 1,
      h: 1,
      fillStyle: COLORS.yellow,
    });
  });

  it('drawCompanion paints the species idle frame flipped and tinted by stars at its slot', () => {
    const { ctx, calls } = makeCtx();
    drawCompanion(ctx, 'dragon', 0, 1, 1, 92);

    expect(calls[0]).toEqual({
      x: 6,
      y: 68,
      w: 1,
      h: 1,
      fillStyle: paletteForTier(monsterSprites.dragon.idle.palette, 1).r,
    });
  });

  it('partySlots stacks back members higher and left of front members with scale by size', () => {
    expect(PARTY_X).toBe(8);
    expect(PARTY_STEP_X).toBe(14);
    expect(PARTY_STEP_Y).toBe(3);
    expect(partySlots([{ speciesId: 'dragon' }, { speciesId: 'ghost' }, { speciesId: 'bat' }], 92)).toEqual([
      { x: 8, y: 86, scale: 3 },
      { x: 22, y: 89, scale: 2 },
      { x: 36, y: 92, scale: 1 },
    ]);
  });

  it('drawParty paints back members first so front members overlap them', () => {
    const party: readonly Companion[] = [
      { id: 'c1', speciesId: 'dragon', bossIndex: 4, level: 1, stars: 1 },
      { id: 'c2', speciesId: 'slime', bossIndex: 0, level: 1, stars: 0 },
    ];
    const { ctx, calls } = makeCtx();
    drawParty(ctx, party, 0, 92);

    const back = makeCtx();
    const dragon = monsterSprites.dragon.idle;
    drawSprite(
      back.ctx,
      { ...dragon, palette: paletteForTier(dragon.palette, 1) },
      0,
      8,
      59,
      { flipX: true, scale: 3 },
    );
    const front = makeCtx();
    const slime = monsterSprites.slime.idle;
    drawSprite(front.ctx, slime, 0, 22, 82, { flipX: true, scale: 1 });
    expect(calls).toEqual([...back.calls, ...front.calls]);
  });

  it('drawTypeBadge paints a coloured square with the type initial', () => {
    const expectedColors = {
      fire: COLORS.red,
      wind: COLORS.cyan,
      earth: COLORS.brown,
      water: COLORS.blue,
      dark: COLORS.maroon,
    } as const;
    expect(TYPE_COLORS).toEqual(expectedColors);

    for (const [type, initial] of [
      ['fire', 'F'],
      ['wind', 'W'],
      ['earth', 'E'],
      ['water', 'A'],
      ['dark', 'D'],
    ] as const) {
      const { ctx, calls } = makeCtx();
      drawTypeBadge(ctx, type, 10, 20);
      expect(calls[0]).toEqual({ x: 10, y: 20, w: 5, h: 5, fillStyle: expectedColors[type] });
      const glyph = makeCtx();
      drawText(glyph.ctx, initial, 11, 20);
      expect(calls.slice(1)).toEqual(glyph.calls);
    }
  });
});

describe('pixel font (SPEC F19 part 2)', () => {
  it('the 3x5 font covers all digits and every character of "LV" and "LEVEL UP!"', () => {
    expect(FONT_W).toBe(3);
    expect(FONT_H).toBe(5);
    expect(fontSprite.w).toBe(FONT_W);
    expect(fontSprite.h).toBe(FONT_H);
    expect(fontSprite.frames).toHaveLength(GLYPH_CHARS.length);
    expect(allSprites().get('font.glyphs')).toBe(fontSprite);

    const needed = new Set([...'0123456789', ...'LV', ...'LEVELUP!']);
    for (const ch of needed) {
      const frame = glyphIndex(ch);
      expect(frame, `glyph '${ch}'`).toBeGreaterThanOrEqual(0);
      expect(fontSprite.frames[frame], `glyph '${ch}' frame`).toBeDefined();
    }
  });

  it('the 3x5 font covers digits, every letter A to Z and the characters . : - + %', () => {
    for (const ch of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:-+%') {
      expect(glyphIndex(ch), `glyph '${ch}'`).toBeGreaterThanOrEqual(0);
    }
    expect(fontSprite.frames[glyphIndex('.')]).toEqual(['...', '...', '...', '...', '.w.']);
    expect(fontSprite.frames[glyphIndex('%')]).toEqual(['w.w', '..w', '.w.', 'w..', 'w.w']);
  });

  it('glyphIndex matches letters case-insensitively and is -1 for spaces and unknown chars', () => {
    expect(glyphIndex('l')).toBe(glyphIndex('L'));
    expect(glyphIndex('L')).toBeGreaterThanOrEqual(0);
    expect(glyphIndex(' ')).toBe(-1);
    expect(glyphIndex('?')).toBe(-1);
  });

  it('drawText advances one cell per character, skipping spaces without painting them', () => {
    const { ctx, calls } = makeCtx();
    drawText(ctx, 'L 1', 5, 7);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.y).toBeGreaterThanOrEqual(7);
      expect(call.y).toBeLessThan(7 + FONT_H);
      const inL = call.x >= 5 && call.x < 5 + FONT_W;
      const inOne = call.x >= 5 + 2 * FONT_ADVANCE && call.x < 5 + 2 * FONT_ADVANCE + FONT_W;
      expect(inL || inOne, `x=${call.x} must fall in the L or 1 cell, never the space`).toBe(true);
    }
    expect(calls.some((c) => c.x >= 5 + 2 * FONT_ADVANCE)).toBe(true);
  });

  it('drawText paints white by default and the color option tints every pixel', () => {
    const white = makeCtx();
    drawText(white.ctx, '8', 0, 0);
    expect(white.calls.length).toBeGreaterThan(0);
    for (const call of white.calls) {
      expect(call.fillStyle).toBe(COLORS.white);
    }

    const tinted = makeCtx();
    drawText(tinted.ctx, '8', 0, 0, { color: COLORS.yellow });
    expect(tinted.calls.length).toBe(white.calls.length);
    for (const call of tinted.calls) {
      expect(call.fillStyle).toBe(COLORS.yellow);
    }
  });

  it('textWidth counts cells minus the trailing spacing', () => {
    expect(textWidth('')).toBe(0);
    expect(textWidth('7')).toBe(FONT_W);
    expect(textWidth('LV')).toBe(2 * FONT_ADVANCE - 1);
    expect(textWidth('LEVEL UP!')).toBe(9 * FONT_ADVANCE - 1);
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
