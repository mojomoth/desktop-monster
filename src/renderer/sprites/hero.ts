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
  w: 22,
  h: 20,
  palette: HERO_PALETTE,
  frames: [
    [
      '.......rrr............',
      '......rrrr............',
      '.....eessse...........',
      '....esssssse........w.',
      '...essssssse........w.',
      '...esssssSkke.......w.',
      '..esssssSSskke......w.',
      '..esssssssskke......w.',
      '...eSssssssse.......w.',
      '....eessssee........w.',
      '..eesssssssssee.....w.',
      '.eSssssssssSse......w.',
      '.eSssssssssSseg....gwg',
      '.eSSssssssssSse.....g.',
      '..eSssssssssSe........',
      '...eSSssssSSe.........',
      '...eSSs..sSSe.........',
      '...eSSe..eSSe.........',
      '...eSSe..eSSe.........',
      '..eee......eee........',
    ],
    [
      '......................',
      '.......rrr............',
      '......rrrr............',
      '.....eessse...........',
      '....esssssse........w.',
      '...essssssse........w.',
      '...esssssSkke.......w.',
      '..esssssSSskke......w.',
      '..esssssssskke......w.',
      '...eSssssssse.......w.',
      '....eessssee........w.',
      '..eesssssssssee.....w.',
      '.eSssssssssSse......w.',
      '.eSssssssssSseg....gwg',
      '.eSSssssssssSse.....g.',
      '..eSssssssssSe........',
      '...eSSssssSSe.........',
      '...eSSe..eSSe.........',
      '...eSSe..eSSe.........',
      '..eee......eee........',
    ],
  ],
};

/** Attack: wind-up (sword raised high), slash (thrust right), recover. */
export const heroAttack: Sprite = {
  w: 22,
  h: 20,
  palette: HERO_PALETTE,
  frames: [
    [
      '....................w.',
      '...................ww.',
      '.......rrr.......ww...',
      '......rrrr......ww....',
      '.....eessse....ww.....',
      '....esssssse..ww......',
      '...esssssSkke.g.......',
      '..esssssSSskkeg.......',
      '..esssssssskkeg.......',
      '...eSsssssssegg.......',
      '....eessssee.s........',
      '..eesssssssssee.......',
      '.eSssssssssSse........',
      '.eSSssssssssSse.......',
      '..eSssssssssSe........',
      '...eSSssssSSe.........',
      '...eSSs..sSSe.........',
      '...eSSe..eSSe.........',
      '...eSSe..eSSe.........',
      '..eee......eee........',
    ],
    [
      '......................',
      '........rrr...........',
      '.......rrrr...........',
      '......eessse..........',
      '.....esssssse.........',
      '....esssssSkke........',
      '...esssssSSskke.......',
      '...esssssssskke.......',
      '....eSssssssske.g.....',
      '..eesssssssskkegwwwwww',
      '.eSssssssssSse.g......',
      '.eSSssssssssSse.......',
      '..eSssssssssSe........',
      '...eSSssssSSe.........',
      '..eSSss..ssSSe........',
      '..eSSs....sSSe........',
      '...eSSe..eSSe.........',
      '...eSSe..eSSe.........',
      '..eSSe....eSSe........',
      '.eeee......eeee.......',
    ],
    [
      '.......rrr............',
      '......rrrr............',
      '.....eessse...........',
      '....esssssse..........',
      '...esssssSkke.........',
      '..esssssSSskke........',
      '..esssssssskke........',
      '...eSssssssse.........',
      '....eessssee..........',
      '..eesssssssssee.......',
      '.eSssssssssSse........',
      '.eSSssssssssSseg......',
      '..eSssssssssSegw......',
      '...eSSssssSSe..gw.....',
      '...eSSs..sSSe...ww....',
      '...eSSe..eSSe....ww...',
      '...eSSe..eSSe.....ww..',
      '...eSSe..eSSe......w..',
      '...eSSe..eSSe.........',
      '..eee......eee........',
    ],
  ],
};

/**
 * Slash-arc overlay for the attack's slash frame: a crescent drawn in
 * front of the hero, over the monster's edge.
 */
export const heroSlash: Sprite = {
  w: 8,
  h: 16,
  palette: {
    w: COLORS.white,
    c: COLORS.cyan,
  },
  frames: [
    [
      '..ww....',
      '.wccw...',
      'wcc..w..',
      'wc....w.',
      'c......w',
      'c......w',
      'c......w',
      '.c.....w',
      '.c.....w',
      '..c....w',
      '..c...w.',
      '...c..w.',
      '...c.w..',
      '...cww..',
      '..cww...',
      '..ww....',
    ],
  ],
};

registerSprites({
  'hero.idle': heroIdle,
  'hero.attack': heroAttack,
  'hero.slash': heroSlash,
});
