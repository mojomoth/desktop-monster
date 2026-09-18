"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawFeverAura = drawFeverAura;
const palette_js_1 = require("./palette.js");
const sprite_js_1 = require("./sprite.js");
/** Paint the four hue-cycling fever outlines; the caller draws the real sprite over them. */
function drawFeverAura(ctx, sprite, frame, x, y, scale, timeMs) {
    const tint = (0, palette_js_1.shiftHue)(palette_js_1.COLORS.red, Math.floor(timeMs / 4) % 360);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        (0, sprite_js_1.drawSprite)(ctx, sprite, frame, x + dx, y + dy, { scale, tint });
    }
}
