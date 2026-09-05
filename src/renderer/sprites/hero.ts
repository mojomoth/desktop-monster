// SPEC F19 — hero art as code (2026-09-04 full redesign, simplified and shrunk to
// 80 % on 2026-09-05 at the user's request; drawn by Codex CLI from a Dungeon &
// Fighter-style brief, judged with rendered previews): 16x16 idle x2 (breathing
// bob), attack x3 (wind-up / slash / recover) and the 4x8 slash-arc overlay.
// String-row matrices only; '.' is transparent. The hero faces RIGHT (the
// monster stands on the right side of the scene) and draws at the uniform
// UNIT_SCALE (every art pixel is a 2x2 canvas block).

import { COLORS } from './palette.js';
import { registerSprites } from './sprite.js';
import type { Sprite } from './sprite.js';

/*
 * Design plan — "Cinder Squire": an iconic right-facing chibi swordsman with
 * two broad flame-hair spikes, one red headband stripe, a single dark eye,
 * a blocky short coat, and wide planted boots. Idle rows 0–6 are head/hair,
 * 7–11 torso/arms, and 12–15 split legs/boots; attack frames preserve those
 * masses while the greatsword moves from raised-left to horizontal-right to
 * lowered-right. Palette roles: e = void outer and feature outline; o = flat
 * orange hair; r = red headband accent; s = skin; m = maroon jacket; b = brown
 * trousers, boots, and grip; w = white blade; y = yellow crossguard.
 */

const HERO_PALETTE: Record<string, string> = {
  e: COLORS.void,
  o: COLORS.orange,
  r: COLORS.red,
  s: COLORS.skin,
  m: COLORS.maroon,
  b: COLORS.brown,
  w: COLORS.white,
  y: COLORS.yellow,
};

export const heroIdle: Sprite = {
  w: 16,
  h: 16,
  palette: HERO_PALETTE,
  frames: [
    [
      '...ee.eee.......',
      '..eooeoooe......',
      '.eoooooooe......',
      '.errrrroooe.....',
      '..eooosssse.....',
      '...eosssese.....',
      '....eessse......',
      '...eemmmsee.....',
      '..emmmmmmsse....',
      '..emmmmmsyyye...',
      '.emmmmmme.ewwe..',
      '.emmmeemme.ewwe.',
      'embbbe.ebbe.ewwe',
      'ebbbbe.ebbbe.ewe',
      'ebbbbe.ebbbbe.ee',
      'eeeeee.eeeeee...',
    ],
    [
      '................',
      '...ee.eee.......',
      '..eooeoooe......',
      '.eoooooooe......',
      '.errrrroooe.....',
      '..eooosssse.....',
      '...eosssese.....',
      '....eessse......',
      '...eemmmsee.....',
      '..emmmmmmsse....',
      '..emmmmmsyyye...',
      '.emmmmmme.ewwe..',
      '.emmmeemme.ewwe.',
      'embbbe.ebbe.ewwe',
      'ebbbbe.ebbbbe.ee',
      'eeeeee.eeeeee...',
    ],
  ],
};

export const heroAttack: Sprite = {
  w: 16,
  h: 16,
  palette: HERO_PALETTE,
  frames: [
    [
      'eeee...ee.eee...',
      'ewwe..eooeoooe..',
      'ewwe.eoooooooe..',
      '.ewweerrrrroooe.',
      '.ewwe.eooosssse.',
      '..ewweosssese...',
      '...eyyyeessse...',
      '....eemmmsse....',
      '...emmmmmse.....',
      '..emmmmmme......',
      '..emmmmmme......',
      '.emmmeemme......',
      'embbbe.ebbe.....',
      'ebbbbe.ebbbe....',
      'ebbbbe.ebbbbe...',
      'eeeeee.eeeeee...',
    ],
    [
      '....ee.eee......',
      '...eooeoooe.....',
      '..eoooooooe.....',
      '..errrrroooe....',
      '...eooosssse....',
      '....eosssese....',
      '.....eessseeeeee',
      '....eemmsyywwwwe',
      '...emmmmseeeeeee',
      '..emmmmmmmse....',
      '.emmmmmmmme.....',
      '.emmmeeemme.....',
      '.ebbbe..ebbe....',
      '.ebbbbe..ebbbe..',
      '.ebbbbe..ebbbbe.',
      '.eeeeee..eeeeee.',
    ],
    [
      '..ee.eee........',
      '.eooeoooe.......',
      'eoooooooe.......',
      'errrrroooe......',
      '.eooosssse......',
      '..eosssese......',
      '...eessse.......',
      '..eemmmsee......',
      '.emmmmmmsse.....',
      '.emmmmmsyyye....',
      'emmmmmme.ewwe...',
      'emmmeemme.ewwe..',
      'ebbbe.ebbe.ewwe.',
      'ebbbe.ebbbe.ewwe',
      'ebbbe.ebbbbe.ee.',
      'eeeee.eeeeee....',
    ],
  ],
};

export const heroSlash: Sprite = {
  w: 4,
  h: 8,
  palette: {
    c: COLORS.cyan,
    w: COLORS.white,
  },
  frames: [
    [
      'wc..',
      '.wc.',
      '.wwc',
      '..wc',
      '..wc',
      '.wwc',
      '.wc.',
      'wc..',
    ],
  ],
};

registerSprites({
  'hero.idle': heroIdle,
  'hero.attack': heroAttack,
  'hero.slash': heroSlash,
});
