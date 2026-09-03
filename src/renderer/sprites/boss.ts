import { itemSprites } from './items.js';
import type { SpeciesSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

export const BOSS_SCALE = 3;
export const BOSS_HP_BAR_Y = 54;

/** Draw tier-tinted species art as a crowned boss with its feet on groundY. */
export function drawBoss(
  ctx: SpriteCanvas,
  species: SpeciesSprites,
  pose: 'idle' | 'hit',
  frame: number,
  x: number,
  groundY: number,
  tier: number,
  opts?: { tint?: string },
): void {
  const sprite = species[pose];
  const y = groundY - sprite.h * BOSS_SCALE;
  drawSprite(ctx, { ...sprite, palette: paletteForTier(sprite.palette, tier) }, frame, x, y, {
    scale: BOSS_SCALE,
    tint: opts?.tint,
  });
  const crown = itemSprites.crown;
  drawSprite(ctx, crown, 0, x + Math.floor((sprite.w * BOSS_SCALE - crown.w) / 2), y - crown.h);
}
