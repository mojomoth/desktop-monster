// SPEC F19 (part 2) — item art as code: the coin plus the 5 collection
// trinkets of the loot table (core/loot.ts). One frame each; ids match
// ItemDef.id exactly so the renderer can look art up straight from an
// itemDropped event: itemSprites[drop.item.id].

import { COLORS } from './palette.js';
import { registerSprites } from './sprite.js';
import type { Sprite } from './sprite.js';

/** Every item id that has art — the coin plus core's TRINKET_TABLE ids. */
export const ITEM_SPRITE_IDS = [
  'coin',
  'sword_shard',
  'slime_gel',
  'bone',
  'gem',
  'crown',
] as const;

export type ItemSpriteId = (typeof ITEM_SPRITE_IDS)[number];

const coin: Sprite = {
  w: 6,
  h: 6,
  palette: {
    y: COLORS.yellow,
    o: COLORS.orange,
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

const swordShard: Sprite = {
  w: 6,
  h: 8,
  palette: {
    w: COLORS.white,
    s: COLORS.steel,
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

const slimeGel: Sprite = {
  w: 6,
  h: 5,
  palette: {
    g: COLORS.green,
    G: COLORS.forest,
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

const bone: Sprite = {
  w: 7,
  h: 5,
  palette: {
    w: COLORS.white,
    s: COLORS.steel,
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

const gem: Sprite = {
  w: 7,
  h: 6,
  palette: {
    c: COLORS.cyan,
    b: COLORS.blue,
    w: COLORS.white,
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

const crown: Sprite = {
  w: 7,
  h: 6,
  palette: {
    y: COLORS.yellow,
    o: COLORS.orange,
    r: COLORS.red,
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
export const itemSprites: Record<ItemSpriteId, Sprite> = {
  coin,
  sword_shard: swordShard,
  slime_gel: slimeGel,
  bone,
  gem,
  crown,
};

// Self-register for the integrity sweep in tests/sprites.test.ts.
const registryEntries: Record<string, Sprite> = {};
for (const id of ITEM_SPRITE_IDS) {
  registryEntries[`item.${id}`] = itemSprites[id];
}
registerSprites(registryEntries);
