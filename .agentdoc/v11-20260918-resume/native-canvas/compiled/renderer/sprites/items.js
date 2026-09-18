"use strict";
// SPEC F19 (part 2) — item art as code: the coin plus the 5 collection
// trinkets of the loot table (core/loot.ts). One frame each; ids match
// ItemDef.id exactly so the renderer can look art up straight from an
// itemDropped event: itemSprites[drop.item.id].
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemSprites = exports.ITEM_SPRITE_IDS = void 0;
const palette_js_1 = require("./palette.js");
const sprite_js_1 = require("./sprite.js");
/** Every item id that has art — the coin plus core's TRINKET_TABLE ids. */
exports.ITEM_SPRITE_IDS = [
    'coin',
    'sword_shard',
    'slime_gel',
    'bone',
    'gem',
    'crown',
];
const coin = {
    w: 6,
    h: 6,
    palette: {
        y: palette_js_1.COLORS.yellow,
        o: palette_js_1.COLORS.orange,
    },
    frames: [
        [
            '.yyyy.', //
            'yyyyyy',
            'yyooyy',
            'yyooyy',
            'yyyyyy',
            '.oooo.',
        ],
    ],
};
const swordShard = {
    w: 6,
    h: 8,
    palette: {
        w: palette_js_1.COLORS.white,
        s: palette_js_1.COLORS.steel,
    },
    frames: [
        [
            '....ww', //
            '...wws',
            '..wws.',
            '..ws..',
            '.wws..',
            '.ws...',
            'ws....',
            's.....',
        ],
    ],
};
const slimeGel = {
    w: 6,
    h: 5,
    palette: {
        g: palette_js_1.COLORS.green,
        G: palette_js_1.COLORS.forest,
    },
    frames: [
        [
            '.gggg.', //
            'gggggg',
            'gGggGg',
            'gggggg',
            '.GGGG.',
        ],
    ],
};
const bone = {
    w: 7,
    h: 5,
    palette: {
        w: palette_js_1.COLORS.white,
        s: palette_js_1.COLORS.steel,
    },
    frames: [
        [
            'ww...ww', //
            'wwwwwww',
            '.wwsww.',
            'wwwwwww',
            'ww...ww',
        ],
    ],
};
const gem = {
    w: 7,
    h: 6,
    palette: {
        c: palette_js_1.COLORS.cyan,
        b: palette_js_1.COLORS.blue,
        w: palette_js_1.COLORS.white,
    },
    frames: [
        [
            '..www..', //
            '.wcccb.',
            'wcccccb',
            '.ccccb.',
            '..ccb..',
            '...c...',
        ],
    ],
};
const crown = {
    w: 7,
    h: 6,
    palette: {
        y: palette_js_1.COLORS.yellow,
        o: palette_js_1.COLORS.orange,
        r: palette_js_1.COLORS.red,
    },
    frames: [
        [
            'y..y..y', //
            'yy.y.yy',
            'yyyyyyy',
            'yyyryyy',
            'yyyyyyy',
            'ooooooo',
        ],
    ],
};
/** Item art keyed by ItemDef.id (coin + the 5 trinkets). */
exports.itemSprites = {
    coin,
    sword_shard: swordShard,
    slime_gel: slimeGel,
    bone,
    gem,
    crown,
};
// Self-register for the integrity sweep in tests/sprites.test.ts.
const registryEntries = {};
for (const id of exports.ITEM_SPRITE_IDS) {
    registryEntries[`item.${id}`] = exports.itemSprites[id];
}
(0, sprite_js_1.registerSprites)(registryEntries);
