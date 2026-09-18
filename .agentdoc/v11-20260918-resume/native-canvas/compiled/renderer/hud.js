"use strict";
// HUD painting (SPEC F21 + T14/T15 presentation): boxed monster HP bar,
// above-hero labels and XP bar, top-left kill/coin counters (with a collection
// pop flash), pooled floating damage and PvP result banners.
// DOM-free on purpose — everything draws through SpriteCanvas so the tests
// run under vitest's node environment (same pattern as sprites/sprite.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.BANNER_Y = exports.BANNER_FLASH_MS = exports.BANNER_SCALE = exports.FEVER_FLASH_MS = exports.LEVEL_UP_FLASH_MS = exports.LEVEL_UP_MS = exports.BANNER_MS = exports.DEFEAT_TEXT = exports.VICTORY_TEXT = exports.FEVER_TEXT = exports.LEVEL_UP_TEXT = exports.CRIT_RISE_MULT = exports.CRIT_FLOAT_SCALE = exports.FLOAT_SCALE = exports.FLOAT_FADE_RATIO = exports.FIELD_FLOAT_RIGHT = exports.FIELD_FLOAT_LEFT = exports.FIELD_FLOAT_RISE_PX = exports.FLOAT_RISE_PX = exports.FLOAT_LIFE_MS = exports.FLOAT_POOL_SIZE = exports.COUNTER_POP_MS = exports.XP_BAR_H = exports.XP_BAR_W = exports.BAG_FULL_Y = exports.COUNTER_TEXT_X = exports.COIN_COUNTER_X = exports.COIN_COUNTER_Y = exports.COUNTER_ROW_GAP = exports.COUNTER_SCALE = exports.COUNTER_TOP = exports.HUD_MARGIN = void 0;
exports.drawMeter = drawMeter;
exports.drawHpBar = drawHpBar;
exports.drawLevelHud = drawLevelHud;
exports.drawCounters = drawCounters;
exports.floatColor = floatColor;
exports.createFloatPool = createFloatPool;
exports.spawnFloat = spawnFloat;
exports.spawnFieldFloat = spawnFieldFloat;
exports.tickFloats = tickFloats;
exports.drawFloats = drawFloats;
exports.drawFeverLabel = drawFeverLabel;
exports.createBanner = createBanner;
exports.showBanner = showBanner;
exports.tickBanner = tickBanner;
exports.drawBanner = drawBanner;
const index_js_1 = require("../core/index.js");
const hero_js_1 = require("../core/hero.js");
const index_js_2 = require("./sprites/index.js");
/** Gap between HUD chrome and the canvas edges, in game pixels. */
exports.HUD_MARGIN = 2;
/** Keep counters below the drag strip, closer to the field. */
exports.COUNTER_TOP = 24;
exports.COUNTER_SCALE = 1;
exports.COUNTER_ROW_GAP = 10;
exports.COIN_COUNTER_Y = exports.COUNTER_TOP + exports.COUNTER_ROW_GAP;
exports.COIN_COUNTER_X = exports.HUD_MARGIN;
exports.COUNTER_TEXT_X = exports.HUD_MARGIN + 9;
exports.BAG_FULL_Y = exports.COIN_COUNTER_Y + 12;
/** XP progress bar box size (above the hero, under the LV text). */
exports.XP_BAR_W = 40;
exports.XP_BAR_H = 4;
/**
 * Boxed meter: 1px steel frame, void interior, proportional fill. A non-zero
 * ratio always shows at least 1px of fill; out-of-range/non-finite ratios
 * are clamped so a bad value can never paint outside the box.
 */
function drawMeter(ctx, x, y, w, h, ratio, fillColor) {
    ctx.fillStyle = index_js_2.COLORS.steel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = index_js_2.COLORS.void;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
    const fill = clamped === 0 ? 0 : Math.max(1, Math.round((w - 2) * clamped));
    if (fill > 0) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x + 1, y + 1, fill, h - 2);
    }
}
/** Boxed red HP bar (drawn above the monster). */
function drawHpBar(ctx, x, y, w, h, hp, maxHp) {
    drawMeter(ctx, x, y, w, h, (0, index_js_1.ratio)(hp, maxHp), index_js_2.COLORS.red);
}
/**
 * `LV n` text plus the XP progress bar, floating above the hero's head
 * (Assumption 17): `cx` is the hero's horizontal center, `bottom` sits just
 * above the hero's top row — the bar hugs the head, the label rides above it.
 */
function drawLevelHud(ctx, state, cx, bottom, effects = {}) {
    const barX = Math.round(cx - exports.XP_BAR_W / 2);
    const barY = bottom - exports.XP_BAR_H;
    drawMeter(ctx, barX, barY, exports.XP_BAR_W, exports.XP_BAR_H, state.xp / (0, index_js_1.xpToNext)(state.level), index_js_2.COLORS.cyan);
    const label = `LV ${String(state.level)}`;
    let labelY = barY - index_js_2.FONT_H - 2;
    drawOutlinedText(ctx, label, Math.round(cx - (0, index_js_2.textWidth)(label) / 2), labelY, 1, index_js_2.COLORS.white);
    if ((0, hero_js_1.heroReady)(state.level, state.hero)) {
        const ready = 'REBIRTH READY';
        labelY -= index_js_2.FONT_H + 2;
        drawOutlinedText(ctx, ready, Math.round(cx - (0, index_js_2.textWidth)(ready) / 2), labelY, 1, index_js_2.COLORS.yellow);
    }
    if (effects.levelUp?.active && effects.levelUp.text === exports.LEVEL_UP_TEXT) {
        labelY -= index_js_2.FONT_H + 2;
        const color = Math.floor(effects.levelUp.ageMs / exports.LEVEL_UP_FLASH_MS) % 2 === 0 ? index_js_2.COLORS.yellow : index_js_2.COLORS.white;
        drawOutlinedText(ctx, exports.LEVEL_UP_TEXT, Math.round(cx - (0, index_js_2.textWidth)(exports.LEVEL_UP_TEXT) / 2), labelY, 1, color);
    }
    if (effects.feverAgeMs !== undefined) {
        drawFeverLabel(ctx, cx, labelY - index_js_2.FONT_H * 2 - 3, effects.feverAgeMs);
    }
}
/** 5×5 skull marker for the kill counter — HUD chrome, drawn directly. */
function drawSkullIcon(ctx, x, y) {
    const rect = (dx, dy, w, h) => {
        ctx.fillRect(x + dx * exports.COUNTER_SCALE, y + dy * exports.COUNTER_SCALE, w * exports.COUNTER_SCALE, h * exports.COUNTER_SCALE);
    };
    ctx.fillStyle = index_js_2.COLORS.void;
    rect(-1, 0, 7, 3);
    rect(0, -1, 5, 6);
    rect(1, 5, 3, 1);
    ctx.fillStyle = index_js_2.COLORS.white;
    rect(0, 0, 5, 3); // cranium
    rect(1, 3, 3, 2); // jaw
    ctx.fillStyle = index_js_2.COLORS.void;
    rect(1, 1, 1, 1); // left eye socket
    rect(3, 1, 1, 1); // right eye socket
    rect(2, 4, 1, 1); // tooth gap
}
/** How long the coin counter stays "popped" after a drop arrives, ms. */
exports.COUNTER_POP_MS = 150;
/**
 * Top-left HUD: fixed skull/coin icons and left-aligned counts.
 * While `coinPop` is set (a collected drop just arrived, T15) the coin row
 * pops: the count flashes white and the icon lifts one pixel.
 */
function drawCounters(ctx, state, viewW, coinPop = false) {
    const kills = (0, index_js_1.format)(state.killCount);
    const killsX = Math.min(exports.COUNTER_TEXT_X, viewW - exports.HUD_MARGIN - (0, index_js_2.textWidth)(kills) * exports.COUNTER_SCALE);
    const coins = (0, index_js_1.format)(state.coins);
    const coinsX = Math.min(exports.COUNTER_TEXT_X, viewW - exports.HUD_MARGIN - (0, index_js_2.textWidth)(coins) * exports.COUNTER_SCALE);
    drawOutlinedText(ctx, kills, killsX, exports.COUNTER_TOP, exports.COUNTER_SCALE, index_js_2.COLORS.white);
    drawSkullIcon(ctx, exports.HUD_MARGIN + 1, exports.COUNTER_TOP);
    drawOutlinedText(ctx, coins, coinsX, exports.COIN_COUNTER_Y, exports.COUNTER_SCALE, coinPop ? index_js_2.COLORS.white : index_js_2.COLORS.yellow);
    const iconX = exports.COIN_COUNTER_X;
    const iconY = exports.COIN_COUNTER_Y - (coinPop ? 1 : 0);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        (0, index_js_2.drawSprite)(ctx, index_js_2.itemSprites.coin, 0, iconX + ox, iconY + oy, { scale: exports.COUNTER_SCALE, tint: index_js_2.COLORS.void });
    }
    (0, index_js_2.drawSprite)(ctx, index_js_2.itemSprites.coin, 0, iconX, iconY, { scale: exports.COUNTER_SCALE });
}
/** Fixed pool size — key-mashing can never grow an unbounded array. */
exports.FLOAT_POOL_SIZE = 16;
/** Lifetime of one floating number, ms. */
exports.FLOAT_LIFE_MS = 600;
/** Total rise over the lifetime, game pixels. */
exports.FLOAT_RISE_PX = 14;
exports.FIELD_FLOAT_RISE_PX = 28;
/** Ink bounds reserve one pixel each for outline and camera shake. */
exports.FIELD_FLOAT_LEFT = 122;
exports.FIELD_FLOAT_RIGHT = 197;
/** Age fraction past which a float draws in its dim fade color. */
exports.FLOAT_FADE_RATIO = 2 / 3;
/** Pixel scale of normal damage numbers (user change 2026-09-06: readable 2x glyphs with a 1-px outline). */
exports.FLOAT_SCALE = 2;
/** Pixel scale of crit damage numbers (Manual M2: crits show larger — 3x, yellow, with a '!'). */
exports.CRIT_FLOAT_SCALE = 3;
/** Crits rise this much further than normal floats (same lifetime, punchier). */
exports.CRIT_RISE_MULT = 1.5;
function floatColor(effectiveness) {
    return effectiveness === 'super'
        ? index_js_2.COLORS.yellow
        : effectiveness === 'weak'
            ? index_js_2.COLORS.steel
            : index_js_2.COLORS.white;
}
/** Pre-allocate a pool of inactive floating-number slots. */
function createFloatPool(size = exports.FLOAT_POOL_SIZE) {
    return Array.from({ length: size }, () => ({
        active: false,
        x: 0,
        y: 0,
        text: '',
        crit: false,
        ageMs: 0,
    }));
}
/** Activate a slot: the first inactive one, else recycle the oldest active. */
function spawnFloat(pool, x, y, text, crit, color, scale, field = false) {
    let slot = pool.find((f) => !f.active);
    if (slot === undefined) {
        for (const f of pool) {
            if (slot === undefined || f.ageMs > slot.ageMs) {
                slot = f;
            }
        }
    }
    if (slot === undefined) {
        return; // zero-size pool
    }
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.text = text;
    slot.crit = crit;
    slot.color = color;
    slot.scale = scale;
    slot.field = field;
    slot.ageMs = 0;
}
/** Center on the monster, fitting long labels into its side of the field. */
function spawnFieldFloat(pool, cx, y, text, crit, color) {
    const width = (0, index_js_2.textWidth)(crit ? `${text}!` : text);
    const scale = Math.max(1, Math.min(crit ? exports.CRIT_FLOAT_SCALE : exports.FLOAT_SCALE, Math.floor((exports.FIELD_FLOAT_RIGHT - exports.FIELD_FLOAT_LEFT) / Math.max(1, width))));
    const x = Math.max(exports.FIELD_FLOAT_LEFT, Math.min(exports.FIELD_FLOAT_RIGHT - width * scale, Math.round(cx - width * scale / 2)));
    spawnFloat(pool, x + width * scale / 2, y, text, crit, color, scale, true);
}
/** Age every active slot; slots past FLOAT_LIFE_MS deactivate. */
function tickFloats(pool, dtMs) {
    for (const f of pool) {
        if (!f.active) {
            continue;
        }
        f.ageMs += dtMs;
        if (f.ageMs >= exports.FLOAT_LIFE_MS) {
            f.active = false;
        }
    }
}
/**
 * drawText at an integer pixel scale: every glyph pixel becomes a
 * scale×scale rect. Local to the HUD — the sprite/font modules stay
 * 1px-based (their data is covered by the T11 integrity sweep).
 */
function drawScaledText(ctx, text, x, y, scale, color) {
    if (scale === 1) {
        (0, index_js_2.drawText)(ctx, text, x, y, { color });
        return;
    }
    for (let i = 0; i < text.length; i++) {
        const rows = index_js_2.fontSprite.frames[(0, index_js_2.glyphIndex)(text.charAt(i))];
        if (rows === undefined) {
            continue; // unknown chars still advance a cell — stable layout
        }
        for (let ry = 0; ry < index_js_2.FONT_H; ry++) {
            const row = rows[ry];
            if (row === undefined) {
                continue;
            }
            for (let rx = 0; rx < index_js_2.FONT_W; rx++) {
                const ch = row.charAt(rx);
                if (ch === index_js_2.TRANSPARENT || ch === '') {
                    continue;
                }
                ctx.fillStyle = color;
                ctx.fillRect(x + (i * index_js_2.FONT_ADVANCE + rx) * scale, y + ry * scale, scale, scale);
            }
        }
    }
}
/** A one-pixel outline follows the glyphs while the space around them stays transparent. */
function drawOutlinedText(ctx, text, x, y, scale, color) {
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        drawScaledText(ctx, text, x + ox, y + oy, scale, index_js_2.COLORS.void);
    }
    drawScaledText(ctx, text, x, y, scale, color);
}
/**
 * Draw active floating numbers, risen by age; the last third of the
 * lifetime fades to a dim color. Crits draw double-size and yellow
 * (bottom-anchored so the bigger glyphs grow upward, not into the monster).
 */
function drawFloats(ctx, pool) {
    for (const f of pool) {
        if (!f.active)
            continue;
        const scale = f.scale ?? (f.crit ? exports.CRIT_FLOAT_SCALE : exports.FLOAT_SCALE);
        const text = f.crit ? `${f.text}!` : f.text;
        const faded = f.ageMs >= exports.FLOAT_LIFE_MS * exports.FLOAT_FADE_RATIO;
        const color = faded
            ? f.crit
                ? index_js_2.COLORS.orange
                : index_js_2.COLORS.steel
            : (f.color ?? (f.crit ? index_js_2.COLORS.yellow : index_js_2.COLORS.white));
        const rise = Math.round((f.field ? exports.FIELD_FLOAT_RISE_PX : exports.FLOAT_RISE_PX) * (f.crit ? exports.CRIT_RISE_MULT : 1) * (f.ageMs / exports.FLOAT_LIFE_MS));
        const x = Math.round(f.x - ((0, index_js_2.textWidth)(text) * scale) / 2);
        const top = f.y - rise - (scale - 1) * index_js_2.FONT_H;
        const y = f.field ? Math.max(2, top) : top;
        drawOutlinedText(ctx, text, x, y, scale, color);
    }
}
/** Draw the active fever state directly above the hero, with a dark outline. */
function drawFeverLabel(ctx, cx, top, ageMs = 0) {
    const scale = 2;
    const x = Math.round(cx - ((0, index_js_2.textWidth)(exports.FEVER_TEXT) * scale) / 2);
    const color = Math.floor(ageMs / exports.FEVER_FLASH_MS) % 2 === 0 ? index_js_2.COLORS.yellow : index_js_2.COLORS.white;
    drawOutlinedText(ctx, exports.FEVER_TEXT, x, top, scale, color);
}
// ---------------------------------------------------------------------------
// "LEVEL UP!" banner (Manual M3): a centered double-size flash triggered by
// the engine's levelUp event. Single timer slot — a second level-up simply
// restarts it (no unbounded state).
// ---------------------------------------------------------------------------
/** Banner text — every glyph exists in font.ts's GLYPH_CHARS. */
exports.LEVEL_UP_TEXT = 'LEVEL UP!';
exports.FEVER_TEXT = 'FEVER!';
exports.VICTORY_TEXT = 'VICTORY!';
exports.DEFEAT_TEXT = 'DEFEAT';
/** Banner lifetime, ms. */
exports.BANNER_MS = 1200;
exports.LEVEL_UP_MS = 2400;
exports.LEVEL_UP_FLASH_MS = 600;
exports.FEVER_FLASH_MS = 200;
/** Banner pixel scale. */
exports.BANNER_SCALE = 2;
/** Flash cadence: the banner alternates yellow/white every interval. */
exports.BANNER_FLASH_MS = 100;
/** Banner top edge, game pixels (clear of the HUD rows and the monster). */
exports.BANNER_Y = 4;
/** Fresh, inactive banner state. */
function createBanner() {
    return { active: false, ageMs: 0, text: exports.LEVEL_UP_TEXT };
}
/** (Re)start the banner — called on every levelUp event. */
function showBanner(banner, text = exports.LEVEL_UP_TEXT) {
    banner.active = true;
    banner.ageMs = 0;
    banner.text = text;
}
/** Level-up lingers above the hero; PvP banners retain their short duration. */
function tickBanner(banner, dtMs) {
    if (!banner.active) {
        return;
    }
    banner.ageMs += dtMs;
    if (banner.ageMs >= (banner.text === exports.LEVEL_UP_TEXT ? exports.LEVEL_UP_MS : exports.BANNER_MS)) {
        banner.active = false;
    }
}
/** Draw the flashing centered banner while it is active. */
function drawBanner(ctx, banner, viewW) {
    if (!banner.active) {
        return;
    }
    const flashPhase = Math.floor(banner.ageMs / exports.BANNER_FLASH_MS) % 2;
    const color = flashPhase === 0 ? index_js_2.COLORS.yellow : index_js_2.COLORS.white;
    const x = Math.round((viewW - (0, index_js_2.textWidth)(banner.text) * exports.BANNER_SCALE) / 2);
    drawScaledText(ctx, banner.text, x, exports.BANNER_Y, exports.BANNER_SCALE, color);
}
