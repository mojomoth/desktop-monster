// SPEC F19 — hero art as code (2026-09-04 full redesign, drawn by Codex CLI from
// a Dungeon & Fighter-style brief; judged and refined with rendered previews):
// idle x2 (breathing bob), attack x3 (wind-up / slash / recover) and the
// slash-arc overlay. String-row matrices only; '.' is transparent. The hero
// faces RIGHT (the monster stands on the right side of the scene) and draws at
// the uniform UNIT_SCALE (every art pixel is a 2x2 canvas block).

import { COLORS } from './palette.js';
import { registerSprites } from './sprite.js';
import type { Sprite } from './sprite.js';

/*
 * Design plan — "Cinder Vanguard": a confident, right-facing chibi fighter
 * with a three-point swept flame mane, red headband, open long coat, planted
 * boots, and a single vertical eye glint. Rows 0–7 hold the oversized head and
 * hair; 8–14 the shirt, jacket, belt, glove, and hilt; 15–19 the coat tails,
 * trousers, and grounded boots. The greatsword dominates the action silhouette.
 * Palette roles: e near-black outer/separation outline; r hair shadow/headband;
 * o hair base; y hair highlight and crossguard; m jacket base/shadow; b leather
 * highlight, grip, and boots; s face/hands; w eye glint, shirt, and blade core;
 * c blade shadow; t trousers and boot shadow.
 */

const HERO_PALETTE: Record<string, string> = {
  e: COLORS.void,
  r: COLORS.red,
  o: COLORS.orange,
  y: COLORS.yellow,
  m: COLORS.maroon,
  b: COLORS.brown,
  s: COLORS.skin,
  w: COLORS.white,
  c: COLORS.steel,
  t: COLORS.slate,
};

export const heroIdle: Sprite = {
  w: 20,
  h: 20,
  palette: HERO_PALETTE,
  frames: [
    [
      '.eyeeyoe............',
      '.eooyoooee..........',
      'eyoooooooe..........',
      '.errrrrrrreee.......',
      '..eoooooswese.......',
      '...eoorsssese.......',
      '...eorrsssse........',
      '....eerssee.........',
      '.....eemme..........',
      '....eembmwsbe.......',
      '...eembmwwmssee.....',
      '..embmmwwmmseyye....',
      '..ebmmmmyyme.ewce...',
      '.ebmmmmmmme..ewce...',
      'ebmmmmmmmme...ewce..',
      'ebmmmmeemme...ewce..',
      'emette..ette...ewce.',
      'eebbte..ebbte..ewce.',
      '.ebbte..ebbte...ewce',
      'eeeeee..eeeeee...ee.',
    ],
    [
      '....................',
      '.eyeeyoe............',
      '.eooyoooee..........',
      'eyoooooooe..........',
      '.errrrrrrreee.......',
      '..eoooooswese.......',
      '...eoorsssese.......',
      '...eorrsssse........',
      '....eerssee.........',
      '.....eemme..........',
      '....eembmwsbe.......',
      '...eembmwwmssee.....',
      '..embmmwwmmseyye....',
      '..ebmmmmyyme.ewce...',
      '.ebmmmmmmme..ewce...',
      'ebmmmmeemme...ewce..',
      'emette..ette..ewce..',
      'embbte..ebbte..ewce.',
      'eebbte..ebbte..ewce.',
      'eeeeee..eeeeee..ee..',
    ],
  ],
};

export const heroAttack: Sprite = {
  w: 20,
  h: 20,
  palette: HERO_PALETTE,
  frames: [
    [
      '.ee.eyeeyoe.........',
      '.ewceooyoooee.......',
      '.eweyoooooooe.......',
      '..ewerrrrrrrreee....',
      '..ewceoooooswese....',
      '...ewceoorsssese....',
      '...ewceorrsssse.....',
      '...eyyyeerssee......',
      '....eeebseeemmee....',
      '.......eembmmse.....',
      '......eembmwwmse....',
      '.....embmmwwmse.....',
      '.....ebmmmmyye......',
      '....ebmmmmmme.......',
      '...ebmmmmmmmme......',
      '...ebmmmmeemme......',
      '..emette...ette.....',
      '..eebbte....ebte....',
      '..ebbbte.....ebte...',
      '.eeeeeee......eeeee.',
    ],
    [
      '...eyeeyoe..........',
      '...eooyoooee........',
      '..eyoooooooe........',
      '...errrrrrrreee.....',
      '....eoooooswese.....',
      '.....eoorsssese.....',
      '.....eorrsssse......',
      '......eerssee.......',
      '......eemmeeyeeeeee.',
      '.....eembmbsywwwwwwe',
      '....eembmwwbsycccce.',
      '...embmmwwmbsyeeee..',
      '..ebmmmmyyme........',
      '.ebmmmmmmme.........',
      'ebmmmmmmmme.........',
      'ebmmmmeemme.........',
      'emette..ette........',
      'eebbte...ebbte......',
      '.ebbte...ebbte......',
      'eeeeee...eeeeee.....',
    ],
    [
      '..eyeeyoe...........',
      '..eooyoooee.........',
      '.eyoooooooe.........',
      '..errrrrrrreee......',
      '...eoooooswese......',
      '....eoorsssese......',
      '....eorrsssse.......',
      '.....eerssee........',
      '......eemme.........',
      '....eembmwsbe.......',
      '...eembmwwmssee.....',
      '..embmmwwmmseyye....',
      '..ebmmmmyyme.ewce...',
      '.ebmmmmmmme..ewce...',
      'ebmmmmmmmme...ewce..',
      'ebmmmmeemme...ewce..',
      'emette..ette...ewce.',
      'eebbte...ebbte.ewce.',
      '.ebbte...ebbte..ewce',
      'eeeeee...eeeeee..ee.',
    ],
  ],
};

export const heroSlash: Sprite = {
  w: 5,
  h: 10,
  palette: {
    c: COLORS.cyan,
    w: COLORS.white,
  },
  frames: [
    [
      'wc...',
      '.wwc.',
      '..wwc',
      '..wwc',
      '..wwc',
      '..wwc',
      '..wwc',
      '..wwc',
      '.wwc.',
      'wc...',
    ],
  ],
};

registerSprites({
  'hero.idle': heroIdle,
  'hero.attack': heroAttack,
  'hero.slash': heroSlash,
});
