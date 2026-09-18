"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_BADGE_DY = exports.TYPE_COLORS = exports.PARTY_STEP_Y = exports.PARTY_STEP_X = exports.PARTY_X = void 0;
exports.partySlots = partySlots;
exports.drawParty = drawParty;
exports.drawTypeBadge = drawTypeBadge;
exports.drawFootBadge = drawFootBadge;
exports.drawPartyBadges = drawPartyBadges;
const index_js_1 = require("../../core/index.js");
const font_js_1 = require("./font.js");
const monsters_js_1 = require("./monsters.js");
const palette_js_1 = require("./palette.js");
const sprite_js_1 = require("./sprite.js");
exports.PARTY_X = 8;
exports.PARTY_STEP_X = 11;
/** 0 since 2026-09-05 (user change): every member's feet sit on the ground line — the 3-px depth lift read as floating at 2×. */
exports.PARTY_STEP_Y = 0;
/**
 * Idle art of a runtime species id; anything unknown falls back to the slime.
 * isSpeciesId, not `?? monsterSprites.slime`: monsterSprites is an object
 * literal, so ids like 'toString' would resolve to an inherited property.
 */
function idleArtOf(speciesId) {
    return monsters_js_1.monsterSprites[(0, index_js_1.isSpeciesId)(speciesId) ? speciesId : 'slime'].idle;
}
exports.TYPE_COLORS = {
    fire: palette_js_1.COLORS.red,
    wind: palette_js_1.COLORS.cyan,
    earth: palette_js_1.COLORS.brown,
    water: palette_js_1.COLORS.blue,
    dark: palette_js_1.COLORS.maroon,
};
const TYPE_INITIALS = {
    fire: 'F',
    wind: 'W',
    earth: 'E',
    water: 'A',
    dark: 'D',
};
/** Lay out a back-to-front party; y is each member's feet position. */
function partySlots(party, groundY) {
    // Uniform pixel scale (2026-09-04): size variety is in the native art, so
    // every member draws at UNIT_SCALE like the hero and the field monster.
    const slots = [];
    for (let r = 0; r < party.length; r++) {
        slots.push({
            x: exports.PARTY_X + r * exports.PARTY_STEP_X,
            y: groundY - (party.length - 1 - r) * exports.PARTY_STEP_Y,
            scale: sprite_js_1.UNIT_SCALE,
        });
    }
    return slots;
}
/** Paint a back-to-front party, mirrored around originX for an opponent group. */
function drawParty(ctx, party, frame, groundY, opts) {
    const slots = partySlots(party, groundY);
    for (let r = 0; r < party.length; r++) {
        const member = party[r];
        const slot = slots[r];
        if (member === undefined || slot === undefined)
            continue;
        const idle = idleArtOf(member.speciesId);
        const x = opts?.originX === undefined
            ? slot.x
            : opts.originX - (slot.x - exports.PARTY_X) - idle.w * slot.scale;
        (0, sprite_js_1.drawSprite)(ctx, { ...idle, palette: (0, palette_js_1.paletteForTier)(idle.palette, member.stars) }, frame, x, slot.y - idle.h * slot.scale, { flipX: opts?.flipX ?? true, scale: slot.scale });
    }
}
/**
 * Paint the elemental marker: a colored 5x5 badge and initial. `outline` adds
 * a 1-px void frame (7x7 footprint) so the badge reads on the ground strip.
 */
function drawTypeBadge(ctx, type, x, y, opts) {
    if (opts?.outline === true) {
        ctx.fillStyle = palette_js_1.COLORS.void;
        ctx.fillRect(x - 1, y - 1, 7, 7);
    }
    ctx.fillStyle = exports.TYPE_COLORS[type];
    ctx.fillRect(x, y, 5, 5);
    (0, font_js_1.drawText)(ctx, TYPE_INITIALS[type], x + 1, y);
}
/** Rows below the ground line where a monster's type badge sits (user change 2026-09-06). */
exports.TYPE_BADGE_DY = 3;
/** An outlined type badge centred under a monster whose box starts at `x` (width `w` canvas px). */
function drawFootBadge(ctx, type, x, w, groundY) {
    drawTypeBadge(ctx, type, Math.round(x + w / 2) - 2, groundY + exports.TYPE_BADGE_DY, { outline: true });
}
/** One outlined type badge under each party member's feet — same slots and mirroring as drawParty. */
function drawPartyBadges(ctx, party, groundY, opts) {
    const slots = partySlots(party, groundY);
    for (let r = 0; r < party.length; r++) {
        const member = party[r];
        const slot = slots[r];
        if (member === undefined || slot === undefined)
            continue;
        const idle = idleArtOf(member.speciesId);
        const w = idle.w * slot.scale;
        const x = opts?.originX === undefined ? slot.x : opts.originX - (slot.x - exports.PARTY_X) - w;
        drawFootBadge(ctx, (0, index_js_1.typeOf)(member.speciesId), x, w, slot.y);
    }
}
