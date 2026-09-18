import { itemSprites } from './items.js';
import type { SpeciesSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite, UNIT_SCALE } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

export const BOSS_HP_BAR_Y = 56;

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
  // Uniform pixel scale (2026-09-04): a boss no longer scales up — its native
  // art size carries the species size and the crown + tint mark it a boss.
  const scale = UNIT_SCALE;
  const y = groundY - sprite.h * scale;
  drawSprite(ctx, { ...sprite, palette: paletteForTier(sprite.palette, tier) }, frame, x, y, {
    scale,
    tint: opts?.tint,
  });
  const crown = itemSprites.crown;
  // The crown is a world sprite too: same uniform scale as the body it sits on.
  drawSprite(ctx, crown, 0, x + Math.floor((sprite.w * scale - crown.w * scale) / 2), y - crown.h * scale, {
    scale,
  });
}
