import { COLORS, shiftHue } from './palette.js';
import { drawSprite } from './sprite.js';
/** Paint the four hue-cycling fever outlines; the caller draws the real sprite over them. */
export function drawFeverAura(ctx, sprite, frame, x, y, scale, timeMs) {
    const tint = shiftHue(COLORS.red, Math.floor(timeMs / 4) % 360);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        drawSprite(ctx, sprite, frame, x + dx, y + dy, { scale, tint });
    }
}
