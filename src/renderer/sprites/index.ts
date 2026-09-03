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

export { BOSS_HP_BAR_Y, BOSS_SCALE, drawBoss } from './boss.js';

export { companionSlot, drawCompanion } from './companion.js';

export {
  drawParty,
  drawTypeBadge,
  PARTY_STEP_X,
  PARTY_STEP_Y,
  PARTY_X,
  partySlots,
  TYPE_COLORS,
} from './party.js';

export { drawFeverAura } from './aura.js';

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
