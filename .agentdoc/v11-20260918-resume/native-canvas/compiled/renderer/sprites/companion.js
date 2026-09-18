"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawCompanion = drawCompanion;
const monsters_js_1 = require("./monsters.js");
const palette_js_1 = require("./palette.js");
const sprite_js_1 = require("./sprite.js");
/** Draw a star-tinted companion facing the monster from its active slot. */
function drawCompanion(ctx, speciesId, frame, k, stars, groundY) {
    const idle = monsters_js_1.monsterSprites[speciesId].idle;
    // ponytail: the v2 column layout, kept only for this legacy single-slot draw.
    const slot = { x: 2, y: groundY - 10 - 14 * k };
    (0, sprite_js_1.drawSprite)(ctx, { ...idle, palette: (0, palette_js_1.paletteForTier)(idle.palette, stars) }, frame, slot.x, slot.y, {
        flipX: true,
        scale: sprite_js_1.UNIT_SCALE,
    });
}
