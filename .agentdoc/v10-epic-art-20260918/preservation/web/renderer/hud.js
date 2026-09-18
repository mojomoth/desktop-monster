// HUD painting (SPEC F21 + T14/T15 presentation): boxed monster HP bar,
// above-hero `LV n` + XP bar, top-right kill/coin counters (with a collection
// pop flash), the pooled floating-damage-number system — numbers rise 8px
// and fade over 600ms; crits draw double-size and yellow (Manual M2) — and
// the flashing "LEVEL UP!" banner (Manual M3).
// DOM-free on purpose — everything draws through SpriteCanvas so the tests
// run under vitest's node environment (same pattern as sprites/sprite.ts).
import { format, ratio, xpToNext } from '../core/index.js';
import { heroReady } from '../core/hero.js';
import { COLORS, drawSprite, drawText, FONT_ADVANCE, FONT_H, FONT_W, fontSprite, glyphIndex, itemSprites, textWidth, TRANSPARENT, } from './sprites/index.js';
/** Gap between HUD chrome and the canvas edges, in game pixels. */
export const HUD_MARGIN = 2;
/** Keep counters below the drag strip, closer to the field. */
export const COUNTER_TOP = 24;
export const COUNTER_SCALE = 1;
export const COUNTER_ROW_GAP = 10;
export const COIN_COUNTER_Y = COUNTER_TOP + COUNTER_ROW_GAP;
/** XP progress bar box size (above the hero, under the LV text). */
export const XP_BAR_W = 40;
export const XP_BAR_H = 4;
/**
 * Boxed meter: 1px steel frame, void interior, proportional fill. A non-zero
 * ratio always shows at least 1px of fill; out-of-range/non-finite ratios
 * are clamped so a bad value can never paint outside the box.
 */
export function drawMeter(ctx, x, y, w, h, ratio, fillColor) {
    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
    const fill = clamped === 0 ? 0 : Math.max(1, Math.round((w - 2) * clamped));
    if (fill > 0) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x + 1, y + 1, fill, h - 2);
    }
}
/** Boxed red HP bar (drawn above the monster). */
export function drawHpBar(ctx, x, y, w, h, hp, maxHp) {
    drawMeter(ctx, x, y, w, h, ratio(hp, maxHp), COLORS.red);
}
/**
 * `LV n` text plus the XP progress bar, floating above the hero's head
 * (Assumption 17): `cx` is the hero's horizontal center, `bottom` sits just
 * above the hero's top row — the bar hugs the head, the label rides above it.
 */
export function drawLevelHud(ctx, state, cx, bottom) {
    const barX = Math.round(cx - XP_BAR_W / 2);
    const barY = bottom - XP_BAR_H;
    drawMeter(ctx, barX, barY, XP_BAR_W, XP_BAR_H, state.xp / xpToNext(state.level), COLORS.cyan);
    const label = `LV ${String(state.level)}`;
    drawOutlinedText(ctx, label, Math.round(cx - textWidth(label) / 2), barY - FONT_H - 2, 1, COLORS.white);
    if (heroReady(state.level, state.hero)) {
        const ready = 'REBIRTH READY';
        drawOutlinedText(ctx, ready, Math.round(cx - textWidth(ready) / 2), barY - 2 * (FONT_H + 2), 1, COLORS.yellow);
    }
}
/** 5×5 skull marker for the kill counter — HUD chrome, drawn directly. */
function drawSkullIcon(ctx, x, y) {
    const rect = (dx, dy, w, h) => {
        ctx.fillRect(x + dx * COUNTER_SCALE, y + dy * COUNTER_SCALE, w * COUNTER_SCALE, h * COUNTER_SCALE);
    };
    ctx.fillStyle = COLORS.void;
    rect(-1, 0, 7, 3);
    rect(0, -1, 5, 6);
    rect(1, 5, 3, 1);
    ctx.fillStyle = COLORS.white;
    rect(0, 0, 5, 3); // cranium
    rect(1, 3, 3, 2); // jaw
    ctx.fillStyle = COLORS.void;
    rect(1, 1, 1, 1); // left eye socket
    rect(3, 1, 1, 1); // right eye socket
    rect(2, 4, 1, 1); // tooth gap
}
/** How long the coin counter stays "popped" after a drop arrives, ms. */
export const COUNTER_POP_MS = 150;
/**
 * Top-right HUD: skull × killCount row, coin × coins row (right-aligned).
 * While `coinPop` is set (a collected drop just arrived, T15) the coin row
 * pops: the count flashes white and the icon lifts one pixel.
 */
export function drawCounters(ctx, state, viewW, coinPop = false) {
    const kills = format(state.killCount);
    const killsX = viewW - HUD_MARGIN - textWidth(kills) * COUNTER_SCALE;
    const coins = format(state.coins);
    const coinsX = viewW - HUD_MARGIN - textWidth(coins) * COUNTER_SCALE;
    drawOutlinedText(ctx, kills, killsX, COUNTER_TOP, COUNTER_SCALE, COLORS.white);
    drawSkullIcon(ctx, killsX - 8, COUNTER_TOP);
    drawOutlinedText(ctx, coins, coinsX, COIN_COUNTER_Y, COUNTER_SCALE, coinPop ? COLORS.white : COLORS.yellow);
    const iconX = coinsX - 9;
    const iconY = COIN_COUNTER_Y - (coinPop ? 1 : 0);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        drawSprite(ctx, itemSprites.coin, 0, iconX + ox, iconY + oy, { scale: COUNTER_SCALE, tint: COLORS.void });
    }
    drawSprite(ctx, itemSprites.coin, 0, iconX, iconY, { scale: COUNTER_SCALE });
}
/** Fixed pool size — key-mashing can never grow an unbounded array. */
export const FLOAT_POOL_SIZE = 16;
/** Lifetime of one floating number, ms. */
export const FLOAT_LIFE_MS = 600;
/** Total rise over the lifetime, game pixels. */
export const FLOAT_RISE_PX = 14;
/** Age fraction past which a float draws in its dim fade color. */
export const FLOAT_FADE_RATIO = 2 / 3;
/** Pixel scale of normal damage numbers (user change 2026-09-06: readable 2x glyphs with a 1-px outline). */
export const FLOAT_SCALE = 2;
/** Pixel scale of crit damage numbers (Manual M2: crits show larger — 3x, yellow, with a '!'). */
export const CRIT_FLOAT_SCALE = 3;
/** Crits rise this much further than normal floats (same lifetime, punchier). */
export const CRIT_RISE_MULT = 1.5;
export function floatColor(effectiveness) {
    return effectiveness === 'super'
        ? COLORS.yellow
        : effectiveness === 'weak'
            ? COLORS.steel
            : COLORS.white;
}
/** Pre-allocate a pool of inactive floating-number slots. */
export function createFloatPool(size = FLOAT_POOL_SIZE) {
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
export function spawnFloat(pool, x, y, text, crit, color, scale) {
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
    slot.ageMs = 0;
}
/** Keep glyphs in x[68,143], leaving room for outline and 1px camera shake. */
export function spawnFieldFloat(pool, y, text, crit, color) {
    const width = textWidth(crit ? `${text}!` : text);
    const scale = Math.max(1, Math.min(crit ? CRIT_FLOAT_SCALE : FLOAT_SCALE, Math.floor(75 / Math.max(1, width))));
    spawnFloat(pool, Math.floor(143 - width * scale / 2), y, text, crit, color, scale);
}
/** Age every active slot; slots past FLOAT_LIFE_MS deactivate. */
export function tickFloats(pool, dtMs) {
    for (const f of pool) {
        if (!f.active) {
            continue;
        }
        f.ageMs += dtMs;
        if (f.ageMs >= FLOAT_LIFE_MS) {
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
        drawText(ctx, text, x, y, { color });
        return;
    }
    for (let i = 0; i < text.length; i++) {
        const rows = fontSprite.frames[glyphIndex(text.charAt(i))];
        if (rows === undefined) {
            continue; // unknown chars still advance a cell — stable layout
        }
        for (let ry = 0; ry < FONT_H; ry++) {
            const row = rows[ry];
            if (row === undefined) {
                continue;
            }
            for (let rx = 0; rx < FONT_W; rx++) {
                const ch = row.charAt(rx);
                if (ch === TRANSPARENT || ch === '') {
                    continue;
                }
                ctx.fillStyle = color;
                ctx.fillRect(x + (i * FONT_ADVANCE + rx) * scale, y + ry * scale, scale, scale);
            }
        }
    }
}
/** A one-pixel outline follows the glyphs while the space around them stays transparent. */
function drawOutlinedText(ctx, text, x, y, scale, color) {
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        drawScaledText(ctx, text, x + ox, y + oy, scale, COLORS.void);
    }
    drawScaledText(ctx, text, x, y, scale, color);
}
/**
 * Draw active floating numbers, risen by age; the last third of the
 * lifetime fades to a dim color. Crits draw double-size and yellow
 * (bottom-anchored so the bigger glyphs grow upward, not into the monster).
 */
export function drawFloats(ctx, pool) {
    for (const f of pool) {
        if (!f.active)
            continue;
        const scale = f.scale ?? (f.crit ? CRIT_FLOAT_SCALE : FLOAT_SCALE);
        const text = f.crit ? `${f.text}!` : f.text;
        const faded = f.ageMs >= FLOAT_LIFE_MS * FLOAT_FADE_RATIO;
        const color = faded
            ? f.crit
                ? COLORS.orange
                : COLORS.steel
            : (f.color ?? (f.crit ? COLORS.yellow : COLORS.white));
        const rise = Math.round(FLOAT_RISE_PX * (f.crit ? CRIT_RISE_MULT : 1) * (f.ageMs / FLOAT_LIFE_MS));
        const x = Math.round(f.x - (textWidth(text) * scale) / 2);
        const y = f.y - rise - (scale - 1) * FONT_H;
        drawOutlinedText(ctx, text, x, y, scale, color);
    }
}
/** Draw the active fever state directly above the hero, with a dark outline. */
export function drawFeverLabel(ctx, cx, heroTop) {
    const scale = 2;
    const x = Math.round(cx - (textWidth(FEVER_TEXT) * scale) / 2);
    const y = heroTop - 26;
    drawOutlinedText(ctx, FEVER_TEXT, x, y, scale, COLORS.yellow);
}
// ---------------------------------------------------------------------------
// "LEVEL UP!" banner (Manual M3): a centered double-size flash triggered by
// the engine's levelUp event. Single timer slot — a second level-up simply
// restarts it (no unbounded state).
// ---------------------------------------------------------------------------
/** Banner text — every glyph exists in font.ts's GLYPH_CHARS. */
export const LEVEL_UP_TEXT = 'LEVEL UP!';
export const FEVER_TEXT = 'FEVER!';
export const VICTORY_TEXT = 'VICTORY!';
export const DEFEAT_TEXT = 'DEFEAT';
/** Banner lifetime, ms. */
export const BANNER_MS = 1200;
/** Banner pixel scale. */
export const BANNER_SCALE = 2;
/** Flash cadence: the banner alternates yellow/white every interval. */
export const BANNER_FLASH_MS = 100;
/** Banner top edge, game pixels (clear of the HUD rows and the monster). */
export const BANNER_Y = 4;
/** Fresh, inactive banner state. */
export function createBanner() {
    return { active: false, ageMs: 0, text: LEVEL_UP_TEXT };
}
/** (Re)start the banner — called on every levelUp event. */
export function showBanner(banner, text = LEVEL_UP_TEXT) {
    banner.active = true;
    banner.ageMs = 0;
    banner.text = text;
}
/** Age the banner; it deactivates after BANNER_MS. */
export function tickBanner(banner, dtMs) {
    if (!banner.active) {
        return;
    }
    banner.ageMs += dtMs;
    if (banner.ageMs >= BANNER_MS) {
        banner.active = false;
    }
}
/** Draw the flashing centered banner while it is active. */
export function drawBanner(ctx, banner, viewW) {
    if (!banner.active) {
        return;
    }
    const flashPhase = Math.floor(banner.ageMs / BANNER_FLASH_MS) % 2;
    const color = flashPhase === 0 ? COLORS.yellow : COLORS.white;
    const x = Math.round((viewW - textWidth(banner.text) * BANNER_SCALE) / 2);
    drawScaledText(ctx, banner.text, x, BANNER_Y, BANNER_SCALE, color);
}
