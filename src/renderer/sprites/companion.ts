import { monsterSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

/** ponytail: compatibility shim removed by the field task T65. */
export function companionSlot(k: number, groundY: number): { x: number; y: number } {
  return { x: 2, y: groundY - 10 - 14 * k };
}

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
  const slot = companionSlot(k, groundY);
  drawSprite(ctx, { ...idle, palette: paletteForTier(idle.palette, stars) }, frame, slot.x, slot.y, {
    flipX: true,
  });
}
