import { monsterSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

/** Draw a star-tinted companion facing the monster from its active slot. */
export function drawCompanion(
  ctx: SpriteCanvas,
  speciesId: keyof typeof monsterSprites,
  frame: number,
  k: number,
  stars: number,
  groundY: number,
): void {
  const idle = monsterSprites[speciesId].idle;
  // ponytail: the v2 column layout, kept only for this legacy single-slot draw.
  const slot = { x: 2, y: groundY - 10 - 14 * k };
  drawSprite(ctx, { ...idle, palette: paletteForTier(idle.palette, stars) }, frame, slot.x, slot.y, {
    flipX: true,
  });
}
