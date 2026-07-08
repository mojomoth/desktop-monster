// SPEC F19 — hero knight art as code: idle x2 (bob), attack x3
// (wind-up / slash / recover) and the slash-arc overlay. String-row
// matrices only; '.' is transparent. Knight faces right (the monster
// stands on the right side of the scene).

import { COLORS } from './palette.js';
import { registerSprites } from './sprite.js';
import type { Sprite } from './sprite.js';

const HERO_PALETTE: Record<string, string> = {
  e: COLORS.void, // outline
  s: COLORS.steel, // armor
  S: COLORS.slate, // armor shadow
  k: COLORS.skin, // face
  r: COLORS.red, // helmet plume
  g: COLORS.yellow, // sword hilt / crossguard
  w: COLORS.white, // sword blade
};

/** Knight at rest: 2-frame idle bob (sword held upright at the side). */
export const heroIdle: Sprite = {
  w: 14,
  h: 12,
  palette: HERO_PALETTE,
  frames: [
    [
      '....rr........',
      '...esse.......',
      '..esssse...w..',
      '..esskke...w..',
      '..esssse...w..',
      '...esse....w..',
      '.esssssse.gwg.',
      '.eSssssSessg..',
      '..eSsssSe.....',
      '...eSSSe......',
      '...eS.Se......',
      '...ee..ee.....',
    ],
    [
      '..............',
      '....rr........',
      '...esse.......',
      '..esssse...w..',
      '..esskke...w..',
      '..esssse...w..',
      '...esse....w..',
      '.esssssse.gwg.',
      '.eSssssSessg..',
      '..eSsssSe.....',
      '...eSSSe......',
      '...ee..ee.....',
    ],
  ],
};

/** Attack: wind-up (sword raised high), slash (thrust right), recover. */
export const heroAttack: Sprite = {
  w: 14,
  h: 12,
  palette: HERO_PALETTE,
  frames: [
    [
      '....rr.....w..',
      '...esse....w..',
      '..esssse...w..',
      '..esskke...w..',
      '..esssse..gwg.',
      '...esse....g..',
      '.esssssse.s...',
      '.eSssssSes....',
      '..eSsssSe.....',
      '...eSSSe......',
      '...eS.Se......',
      '...ee..ee.....',
    ],
    [
      '.....rr.......',
      '....esse......',
      '...esssse.....',
      '...esskke.....',
      '...esssse.....',
      '....esse......',
      '..essssssegwww',
      '.eSssssSess...',
      '..eSsssSe.....',
      '....eSSSe.....',
      '....eS.Se.....',
      '....ee..ee....',
    ],
    [
      '....rr........',
      '...esse.......',
      '..esssse......',
      '..esskke......',
      '..esssse......',
      '...esse.......',
      '.esssssse.....',
      '.eSssssSes....',
      '..eSsssSe.g...',
      '...eSSSe...w..',
      '...eS.Se....w.',
      '...ee..ee.....',
    ],
  ],
};

/**
 * Slash-arc overlay for the attack's slash frame: a crescent drawn in
 * front of the hero, over the monster's edge.
 */
export const heroSlash: Sprite = {
  w: 5,
  h: 10,
  palette: {
    w: COLORS.white,
    c: COLORS.cyan,
  },
  frames: [
    [
      '..ww.',
      '..cww',
      '...cw',
      '...cw',
      '...cw',
      '...cw',
      '...cw',
      '...cw',
      '..cww',
      '..ww.',
    ],
  ],
};

registerSprites({
  'hero.idle': heroIdle,
  'hero.attack': heroAttack,
  'hero.slash': heroSlash,
});
