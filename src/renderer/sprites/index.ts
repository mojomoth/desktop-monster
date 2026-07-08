// Sprites barrel — one import surface for the renderer (T13+). Importing it
// side-effect-registers ALL art modules into the sprite registry.

export {
  allSprites,
  drawSprite,
  registerSprites,
  TRANSPARENT,
} from './sprite.js';
export type { DrawSpriteOptions, Sprite, SpriteCanvas } from './sprite.js';

export {
  COLORS,
  hexToHsl,
  hslToHex,
  paletteForTier,
  shiftHue,
  TIER_HUE_STEP,
  tintPalette,
} from './palette.js';

export { heroAttack, heroIdle, heroSlash } from './hero.js';

export { monsterSprites } from './monsters.js';
export type { SpeciesSprites } from './monsters.js';

export { ITEM_SPRITE_IDS, itemSprites } from './items.js';
export type { ItemSpriteId } from './items.js';

export {
  drawText,
  FONT_ADVANCE,
  FONT_H,
  FONT_W,
  fontSprite,
  GLYPH_CHARS,
  glyphIndex,
  textWidth,
} from './font.js';
export type { DrawTextOptions } from './font.js';
