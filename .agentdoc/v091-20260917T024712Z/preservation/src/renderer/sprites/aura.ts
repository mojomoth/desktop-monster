import { COLORS, shiftHue } from './palette.js';
import { drawSprite } from './sprite.js';
import type { Sprite, SpriteCanvas } from './sprite.js';

/** Paint the four hue-cycling fever outlines; the caller draws the real sprite over them. */
export function drawFeverAura(
  ctx: SpriteCanvas,
  sprite: Sprite,
  frame: number,
  x: number,
  y: number,
  scale: number,
  timeMs: number,
): void {
  const tint = shiftHue(COLORS.red, Math.floor(timeMs / 4) % 360);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    drawSprite(ctx, sprite, frame, x + dx, y + dy, { scale, tint });
  }
}
