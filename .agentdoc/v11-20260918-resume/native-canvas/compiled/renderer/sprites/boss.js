"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOSS_HP_BAR_Y = void 0;
exports.drawBoss = drawBoss;
const items_js_1 = require("./items.js");
const palette_js_1 = require("./palette.js");
const sprite_js_1 = require("./sprite.js");
exports.BOSS_HP_BAR_Y = 56;
/** Draw tier-tinted species art as a crowned boss with its feet on groundY. */
function drawBoss(ctx, species, pose, frame, x, groundY, tier, opts) {
    const sprite = species[pose];
    // Uniform pixel scale (2026-09-04): a boss no longer scales up — its native
    // art size carries the species size and the crown + tint mark it a boss.
    const scale = sprite_js_1.UNIT_SCALE;
    const y = groundY - sprite.h * scale;
    (0, sprite_js_1.drawSprite)(ctx, { ...sprite, palette: (0, palette_js_1.paletteForTier)(sprite.palette, tier) }, frame, x, y, {
        scale,
        tint: opts?.tint,
    });
    const crown = items_js_1.itemSprites.crown;
    // The crown is a world sprite too: same uniform scale as the body it sits on.
    (0, sprite_js_1.drawSprite)(ctx, crown, 0, x + Math.floor((sprite.w * scale - crown.w * scale) / 2), y - crown.h * scale, {
        scale,
    });
}
