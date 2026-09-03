import { sizeOf } from '../../core/index.js';
import { itemSprites } from './items.js';
import { monsterSprites } from './monsters.js';
import type { SpeciesSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

export const BOSS_SCALE = 3; // ponytail: compatibility shim removed by the field task T65.
export const BOSS_HP_BAR_Y = 78;

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
  const speciesId = Object.entries(monsterSprites).find(([, art]) => art === species)?.[0] ?? '';
  const scale = sizeOf(speciesId) + 1;
  const y = groundY - sprite.h * scale;
  drawSprite(ctx, { ...sprite, palette: paletteForTier(sprite.palette, tier) }, frame, x, y, {
    scale,
    tint: opts?.tint,
  });
  const crown = itemSprites.crown;
  drawSprite(ctx, crown, 0, x + Math.floor((sprite.w * scale - crown.w) / 2), y - crown.h);
}
