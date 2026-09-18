import { monsterSprites } from './monsters.js';
import { paletteForTier } from './palette.js';
import { drawSprite, UNIT_SCALE } from './sprite.js';
/** Draw a star-tinted companion facing the monster from its active slot. */
export function drawCompanion(ctx, speciesId, frame, k, stars, groundY) {
    const idle = monsterSprites[speciesId].idle;
    // ponytail: the v2 column layout, kept only for this legacy single-slot draw.
    const slot = { x: 2, y: groundY - 10 - 14 * k };
    drawSprite(ctx, { ...idle, palette: paletteForTier(idle.palette, stars) }, frame, slot.x, slot.y, {
        flipX: true,
        scale: UNIT_SCALE,
    });
}
