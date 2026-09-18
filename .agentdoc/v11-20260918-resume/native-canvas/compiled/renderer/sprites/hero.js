"use strict";
// SPEC F19 — hero art as code: a simple, universal little RPG hero (2026-09-06
// user change, drawn from a blank grid by Codex CLI; earlier 2026-09-04/05
// redesigns were a 20x20 then 16x16 DNF-style swordsman). 14x14 idle x2
// (breathing bob), attack x3 (wind-up / slash / recover) and the 4x7 slash-arc
// overlay. String-row matrices only; '.' is transparent. The hero faces RIGHT
// (the monster stands on the right side of the scene) and draws at the uniform
// UNIT_SCALE (every art pixel is a 2x2 canvas block).
Object.defineProperty(exports, "__esModule", { value: true });
exports.heroSlash = exports.heroAttack = exports.heroIdle = exports.HERO_RIVAL_PALETTE = void 0;
const palette_js_1 = require("./palette.js");
const sprite_js_1 = require("./sprite.js");
/*
 * Design plan — U2 "Storybook Adventurer": a friendly, right-facing hero
 * built from three plain masses: short hair and face on rows 0–5, green
 * tunic and sword hand on rows 6–9, and split trouser legs / broad boots on
 * rows 10–13. The idle stance is upright with the sword resting down-right;
 * attack moves that same silhouette through a raised wind-up, a long forward
 * slash, and a grounded recovery. Palette roles: e = void outer line and eye;
 * b = brown hair and boots; s = skin; g = green tunic; t = slate trousers;
 * w = white blade; y = yellow hilt, crossguard, and one hair highlight.
 */
const HERO_PALETTE = {
    e: palette_js_1.COLORS.void,
    b: palette_js_1.COLORS.brown,
    s: palette_js_1.COLORS.skin,
    g: palette_js_1.COLORS.green,
    t: palette_js_1.COLORS.slate,
    w: palette_js_1.COLORS.white,
    y: palette_js_1.COLORS.yellow,
};
/**
 * The rival's colours for the PvP battle scene (SPEC F66): the same art with a
 * red tunic and dark hair/boots, so the opponent's hero reads as "them" at a
 * glance. Same keys as HERO_PALETTE — every frame char stays covered.
 */
exports.HERO_RIVAL_PALETTE = {
    ...HERO_PALETTE,
    g: palette_js_1.COLORS.red,
    b: palette_js_1.COLORS.maroon,
};
exports.heroIdle = {
    w: 14,
    h: 14,
    palette: HERO_PALETTE,
    frames: [
        [
            '....eeeeee....',
            '...eybbbbbe...',
            '..ebbbsssse...',
            '..ebsssesee...',
            '...esssssse...',
            '...eesssee....',
            '...eggggge....',
            '..eggggggsyeee',
            '..egggggseyyye',
            '...egggge.ewe.',
            '..ette.ette...',
            '..ette.etteewe',
            '.ebbbe.ebbbewe',
            '.eeeee.eeeeeee',
        ],
        [
            '..............',
            '....eeeeee....',
            '...eybbbbbe...',
            '..ebbbsssse...',
            '..ebsssesee...',
            '...esssssse...',
            '...eesssee....',
            '...eggggge....',
            '..eggggggsyeee',
            '..egggggseyyye',
            '...egggge.ewe.',
            '..ette.etteewe',
            '.ebbbe.ebbbewe',
            '.eeeee.eeeeeee',
        ],
    ],
};
exports.heroAttack = {
    w: 14,
    h: 14,
    palette: HERO_PALETTE,
    frames: [
        [
            'ee...eeeeee...',
            'ewe.eybbbbbe..',
            '.ewebbbsssse..',
            '..ewebsssesee.',
            '...ewesssssse.',
            '..eyyyeesssee.',
            '...eysggggge..',
            '....esggggge..',
            '....egggggge..',
            '...egggggge...',
            '...ette.ette..',
            '..ette..ette..',
            '.ebbbe..ebbbe.',
            '.eeeee..eeeee.',
        ],
        [
            '....eeeeee....',
            '...eybbbbbe...',
            '...ebbbsssse..',
            '...ebsssesee..',
            '....esssssse..',
            '....eessyeeeee',
            '.egggggsywwwwe',
            '.egggggsyeeeee',
            '..egggggge....',
            '...egggge.....',
            '...ette.ette..',
            '..ett..ette...',
            '.ebbbe..ebbbe.',
            '.eeeee..eeeee.',
        ],
        [
            '....eeeeee....',
            '...eybbbbbe...',
            '..ebbbsssse...',
            '..ebsssesee...',
            '...esssssse...',
            '...eesssee....',
            '..egggggge....',
            '.eggggggsyeeee',
            '.egggggseyyyee',
            '..eggggge.ewe.',
            '..ette.etteewe',
            '.ette..etteewe',
            'ebbbe..ebbbeee',
            'eeeee..eeeee..',
        ],
    ],
};
exports.heroSlash = {
    w: 4,
    h: 7,
    palette: {
        c: palette_js_1.COLORS.cyan,
        w: palette_js_1.COLORS.white,
    },
    frames: [
        [
            'wc..',
            '.wc.',
            '..wc',
            '..wc',
            '..wc',
            '.wc.',
            'wc..',
        ],
    ],
};
(0, sprite_js_1.registerSprites)({
    'hero.idle': exports.heroIdle,
    'hero.attack': exports.heroAttack,
    'hero.slash': exports.heroSlash,
});
