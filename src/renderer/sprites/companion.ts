import { monsterSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite } from './sprite.js';
import type { SpriteCanvas } from './sprite.js';

export const COMPANION_X = 2;
export const COMPANION_SLOT_GAP = 14;

/** Companion slots rise from groundY, with room for each 10px-tall species. */
export function companionSlot(k: number, groundY: number): { x: number; y: number } {
  return { x: COMPANION_X, y: groundY - 10 - COMPANION_SLOT_GAP * k };
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
