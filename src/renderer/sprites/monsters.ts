// SPEC F19 (part 2) / Assumption 4 — monster art as code. This module holds
// the five ORIGINAL species (slime, bat, ghost, golem, dragon) and merges in
// the 100 added on 2026-09-08 from ./species/<element>.ts (F81, drawn by the
// Codex CLI on `gpt-6-astra`); every species is idle x2 (bob/breathe) + hit x1
// (recoil pose). 2026-09-04 full redesign: drawn by Codex CLI from a Pokémon /
// Digimon-style brief (original creatures), judged and refined with rendered
// previews. String-row matrices only; '.' is transparent. Monsters face LEFT
// (toward the hero on the left side of the scene — Assumption 1), so the
// renderer draws them unflipped on the right and mirrored in the party.
// Native sizes carry the hidden species size (13x10 slime … 20x17 dragon);
// every sprite draws at the uniform UNIT_SCALE.
//
// Tier tinting is NOT baked in here: the renderer calls
// paletteForTier(sprite.palette, tier) per GAME_ARCHITECTURE §4. The white
// hit-flash is drawSprite's `tint` option; the `hit` sprite is only the pose.

import { SPECIES_IDS } from '../../core/index.js';
import type { SpeciesId } from '../../core/index.js';
import { COLORS } from './palette.js';
import { registerSprites } from './sprite.js';
import type { Sprite } from './sprite.js';
import { darkSprites } from './species/dark.js';
import { earthSprites } from './species/earth.js';
import { fireSprites } from './species/fire.js';
import { waterSprites } from './species/water.js';
import { windSprites } from './species/wind.js';

/** The art set every species provides. */
export interface SpeciesSprites {
  /** 2-frame idle wobble. */
  idle: Sprite;
  /** 1-frame hit recoil pose (white flash comes from drawSprite's tint). */
  hit: Sprite;
}

// ---- slime (SLIME_PALETTE, slimeIdle x2, slimeHit x1) ----

/*
 * Concept: a cool, angular water-gel cat with twin ear-nubs, large slanted
 * jewel eyes, a wide toothy grin, and a dark core suspended in its right
 * flank. It faces left in a confident crouch; idle breathes by settling the
 * same drawing one row into a wider foot, while hit squashes and recoils to
 * the right with wide flinching eyes and tucked-in features. Idle rows 0-2:
 * ear-nubs and glossy dome; 3-5: eyes and core top; 6-7: grin, core, and
 * lower lip; 8-9: forest-shadowed belly/foot and grounded outline. Hit rows
 * 2-5: right-leaning ears and dome; 6-8: eyes, grin, and lowered core;
 * row 9: grounded outline. Palette roles: e = void outer/feature outline,
 * pupils, and mouth; g = green gel base; G = forest gel shadow and belly;
 * w = white gloss, eye glints, and teeth; n = navy inner core; b = cyan wet
 * glint at the core's top-left.
 */

const SLIME_PALETTE: Record<string, string> = {
  e: COLORS.void,
  g: COLORS.green,
  G: COLORS.forest,
  w: COLORS.white,
  n: COLORS.navy,
  b: COLORS.cyan,
};

const slimeIdle: Sprite = {
  w: 13,
  h: 10,
  palette: SLIME_PALETTE,
  frames: [
    [
      '..ee....ee...',
      '.ewgeeeegGe..',
      'ewggggggggGe.',
      'egggwegweggGe',
      'egggeegeebnGe',
      'eggggggggnnGe',
      'egewwewegnnGe',
      'eggeeeegGGGGe',
      '.eGGGGGGGGGe.',
      '..eeeeeeeee..',
    ],
    [
      '.............',
      '..ee....ee...',
      '.ewgeeeegGe..',
      'ewggggggggGe.',
      'egggwegweggGe',
      'egggeegeebnGe',
      'eggggggggnnGe',
      'egewwewegnnGe',
      'eggeeeegGGGGe',
      '.eeeeeeeeeee.',
    ],
  ],
};

const slimeHit: Sprite = {
  w: 13,
  h: 10,
  palette: SLIME_PALETTE,
  frames: [
    [
      '.............',
      '.............',
      '.....ee...ee.',
      '...eewgeeegGe',
      '..eggggggggGe',
      '.egggggggggGe',
      '.egwegwegbnGe',
      '.egeegeegnnGe',
      '.egewwewegnGe',
      '..eeeeeeeeeee',
    ],
  ],
};

// ---- bat (BAT_PALETTE, batIdle x2, batHit x1) ----

/*
 * Design plan — A round, curious wind-bat faces left in a wide hover: swept
 * wing blades are the memorable silhouette, with tall pink-lined ears, huge
 * glossy eyes, two tiny fangs, and pointed little claws. The idle pose hovers
 * wide; the hit pose squashes right with swept ears, tucked wing, and squints.
 * Rows 0–2 hold the ears/crown and wing tips, rows 3–6 hold wings plus face,
 * rows 7–8 taper through body/legs, and row 9 anchors the claws. Light comes
 * from top-left.
 * Palette roles: e void outer/feature line; n navy body base; b blue body
 * highlight; s slate body shadow and wing bones; m maroon wing membrane;
 * k skin inner ear; r red eye; w white eye glint and fangs.
 */

const BAT_PALETTE: Record<string, string> = {
  e: COLORS.void,
  n: COLORS.navy,
  b: COLORS.blue,
  s: COLORS.slate,
  m: COLORS.maroon,
  k: COLORS.skin,
  r: COLORS.red,
  w: COLORS.white,
};

const batIdle: Sprite = {
  w: 15,
  h: 10,
  palette: BAT_PALETTE,
  frames: [
    [
      '.....e....e....',
      'ee..eke..eke.ee',
      'eseeeneeeeneese',
      'emsmebbbnnnesme',
      'emmsewrnwrsemme',
      'emmmerenresemme',
      '.emmenwewnseme.',
      '..ee.ennnse.e..',
      '.....eneese....',
      '.....ee..ee....',
    ],
    [
      'ee...e....e..ee',
      'ese.eke..ekeese',
      'emseeneeeenesme',
      'emmsebbbnnnemme',
      'emmmewrnwrsemme',
      '.emmerenreseme.',
      '..eeenwewnsee..',
      '.....ennnse....',
      '.....eneese....',
      '.....ee..ee....',
    ],
  ],
};

const batHit: Sprite = {
  w: 15,
  h: 10,
  palette: BAT_PALETTE,
  frames: [
    [
      '......ee..ee...',
      '.....eke.ekeeee',
      '.....eneeenesme',
      '.....ebbnnnesme',
      '.....ennnnsemme',
      '.....ewrnwremme',
      '.....enwewsemme',
      '......ennse.ee.',
      '......enese....',
      '......ee.ee....',
    ],
  ],
};

// ---- ghost (GHOST_PALETTE, ghostIdle x2, ghostHit x1) ----

/**
 * Design plan — a cool, mischievous hood-wisp facing left: a hooked pointed
 * hood fills rows 1–4, paired glowing eyes fill rows 5–6, and a blue-tongued
 * smirk fills rows 8–9 above three long wisps on rows 10–12. The hit pose
 * squashes and jolts the hood and face right while the side flame lags behind.
 * That detached will-o'-wisp acts as its left hand, so there are no tiny arms.
 * Palette roles: e = void outline, pupils, and mouth; w = white lit body;
 * s = steel lower-right shadow; c = cyan eye glints and flame; b = blue
 * tongue and flame core. Lighting falls from the top-left.
 */
const GHOST_PALETTE: Record<string, string> = {
  e: COLORS.void,
  w: COLORS.white,
  s: COLORS.steel,
  c: COLORS.cyan,
  b: COLORS.blue,
};

const ghostIdle: Sprite = {
  w: 14,
  h: 13,
  palette: GHOST_PALETTE,
  frames: [
    [
      '..............',
      '.e......e.....',
      'ece...eewe....',
      'ebe..ewwwwe...',
      '.e..ewwwwwse..',
      '...ewcewcewse.',
      '..ewweeweewsse',
      '.ewwwwwwwwwsse',
      '.ewwweeeewwsse',
      '..ewbbwwwwwsse',
      '..ewwwewwwesse',
      '...ewe.ewe.ese',
      '....e...e...e.',
    ],
    [
      '.e......e.....',
      'ebe...eewe....',
      'ece..ewwwwe...',
      '.e..ewwwwwse..',
      '...ewcewcewse.',
      '..ewweeweewsse',
      '.ewwwwwwwwwsse',
      '.ewwweeeewwsse',
      '..ewbbwwwwwsse',
      '..ewwwewwwesse',
      '...ewe.ewe.ese',
      '..ewe.ewe.ese.',
      '...e...e...e..',
    ],
  ],
};

const ghostHit: Sprite = {
  w: 14,
  h: 13,
  palette: GHOST_PALETTE,
  frames: [
    [
      '..............',
      '.e............',
      'ece.......e...',
      'ebe.....eewe..',
      '.e.....ewwwwe.',
      '......eccwccse',
      '....eewcewcese',
      '...ewwwwwwwwse',
      '..ewwweeeeewse',
      '..ewwwwbbbwwse',
      '..ewwwewwwesse',
      '...ewe.ewe.ese',
      '....e...e...e.',
    ],
  ],
};

// ---- golem (GOLEM_PALETTE, golemIdle x2, golemHit x1) ----

/*
 * Ancient guardian golem: a low, left-facing chisel-brow head sits between
 * cliff-like shoulders; rounded fists brace on the ground around a forked
 * glowing chest rune. Rest uses rows 1–8 for crown/head/shoulders, 9–11 for
 * the rune torso, and 12–15 for fists/short legs. Idle 1 raises only the far
 * shoulder one pixel; hit leans right behind a near-fist cheek guard while
 * both feet remain planted. Palette roles: e void outline/socket/pupil,
 * g gray stone base, s slate underside shadow, h steel top-left highlight,
 * b brown earth-filled cracks, m maroon deep cracks/mouth, y yellow eyes/rune,
 * and w white eye glints.
 */

const GOLEM_PALETTE: Record<string, string> = {
  e: COLORS.void,
  g: COLORS.gray,
  s: COLORS.slate,
  h: COLORS.steel,
  b: COLORS.brown,
  m: COLORS.maroon,
  y: COLORS.yellow,
  w: COLORS.white,
};

const golemIdle: Sprite = {
  w: 19,
  h: 16,
  palette: GOLEM_PALETTE,
  frames: [
    [
      '...................',
      '.....eeeee...eeeee.',
      '..eeeehhgge..ehhgge',
      '.ehheeeeeee..ehgbse',
      'ehgewyewyeseeggbgse',
      'eggeyyeyyeseggbggse',
      'egggggggggsegggggse',
      '.eggemmmegseggggse.',
      '.esssessssseggggse.',
      '.ehbsegygygeggbgse.',
      '.egbsegyyygegggbse.',
      '.eggbeggyggegggbse.',
      'ehggssegyggeshggsse',
      'egggse.eggse.egggse',
      'egssse.egsse.egssse',
      'eeeeee.eeeee.eeeeee',
    ],
    [
      '.............eeeee.',
      '.....eeeee...ehhgge',
      '..eeeehhgge..ehgbse',
      '.ehheeeeeee.eggbgse',
      'ehgewyewyeseggbggse',
      'eggeyyeyyesegggggse',
      'egggggggggseggggse.',
      '.eggemmmegseggggse.',
      '.esssessssseggbgse.',
      '.ehbsegygygegggbse.',
      '.egbsegyyygegggbse.',
      '.eggbeggyggeshggsse',
      'ehggssegyggesgggsse',
      'egggse.eggse.egggse',
      'egssse.egsse.egssse',
      'eeeeee.eeeee.eeeeee',
    ],
  ],
};

const golemHit: Sprite = {
  w: 19,
  h: 16,
  palette: GOLEM_PALETTE,
  frames: [
    [
      '........eeeeee.....',
      '......eehggggeeeeee',
      '.eeeeehgggggggehhge',
      'ehhgehggggggggeggge',
      'egggehgeeeeeeesgbge',
      'egggeggewyewyesbgge',
      'egssegggemmmeggbgge',
      '.eeeeeesssssegggge.',
      '......egygyeggggge.',
      '......egyyyeggggge.',
      '......eggygeggbgge.',
      '......eggggeegbbgge',
      '......eggsse.egssge',
      '.......eggge.ehggge',
      '.......egsse.egssse',
      '.......eeeee.eeeeee',
    ],
  ],
};

// ---- dragon (DRAGON_PALETTE, dragonIdle x2, dragonHit x1) ----

/*
 * Design plan — Embermaw: a chunky, cute-fierce hatchling dragon in a braced
 * left-facing stance. Rows 0–4 hold the swept horn and two-finger raised wings;
 * rows 3–11 form the oversized head, bright eye, open jaw, and fang; rows 6–14
 * carry the round plated chest and thick tail rising to a flame; rows 14–16 are
 * two planted, clawed feet. Light falls from the top-left.
 * Palette roles: e = void outline, pupil, and mouth; r = red scale base;
 * m = maroon scale shadow and mouth interior; o = orange belly plates, wing
 * membrane, and flame shadow; y = yellow horn, iris, claws, wing rim, and flame
 * core; w = white eye glint and fang.
 */

const DRAGON_PALETTE: Record<string, string> = {
  e: COLORS.void,
  r: COLORS.red,
  m: COLORS.maroon,
  o: COLORS.orange,
  y: COLORS.yellow,
  w: COLORS.white,
};

const dragonIdle: Sprite = {
  w: 20,
  h: 17,
  palette: DRAGON_PALETTE,
  frames: [
    [
      '....ee..............',
      '...eyoe.......e.....',
      '..eyyoe......eye.e..',
      '.errrree....eyooeye.',
      'erreerrree.eeyoooooe',
      'erryweyrrreoooeoooe.',
      'erryeeyrrrerrreooe..',
      'errrrrrrrerrrrmreee.',
      '.eewmmmmerrrrmmreeye',
      '.emmmmmmerrrrmmeeyye',
      '.errrrmerrooorreroye',
      '..eeeeerrooomrrrrrme',
      '.....errroooomrrrrme',
      '.....errroooomrrrrme',
      '.....errmooommreeee.',
      '....errmeeeeerrme...',
      '....eyyye....eyyye..',
    ],
    [
      '....ee........e.....',
      '...eyoe......eye.e..',
      '..eyyoe.....eyooeye.',
      '.errrree....eyoooooe',
      'erreerrree.eooeoooe.',
      'erryweyrrreorreooe..',
      'erryeeyrrrerrrmre.e.',
      'errrrrrrrerrrrmree..',
      '.eewmmmmerrrrmmreye.',
      '.emmmmmmerrrrmmeeyye',
      '.errrrmerrrrrmmeroye',
      '..eeeeerrrroomrrrrme',
      '.....errrrooomrrrrme',
      '.....errroooomrrrrme',
      '.....errmoooomreeee.',
      '....errmeeeeerrme...',
      '....eyyye....eyyye..',
    ],
  ],
};

const dragonHit: Sprite = {
  w: 20,
  h: 17,
  palette: DRAGON_PALETTE,
  frames: [
    [
      '..........e.....e...',
      '.........eye...eye..',
      '.....ee.eyyoeeeooe..',
      '....eyoeooooeooooe..',
      '...eyyoeerrreoomee..',
      '..errrrreeerreeere..',
      '..errrrrrerooomrree.',
      '..erryeeyerooomrreye',
      '..errrrrreroommreyye',
      '...eewmmmermmrreeoye',
      '...errrmmerrrrrerrme',
      '....eeeerrroomrerrme',
      '.......erroooomrrrme',
      '.......errooomrrrrme',
      '.......ermoommreeee.',
      '.....eermeeermme....',
      '.....eyyye.eyyye....',
    ],
  ],
};

/**
 * The full species → art map, keyed by core's SpeciesId so a new species (or
 * a typo) fails to compile. Renderer lookup: monsterSprites[def.speciesId].
 */
export const monsterSprites: Record<SpeciesId, SpeciesSprites> = {
  // Round 0 — the five species DesMon shipped with, drawn above.
  slime: { idle: slimeIdle, hit: slimeHit },
  bat: { idle: batIdle, hit: batHit },
  ghost: { idle: ghostIdle, hit: ghostHit },
  golem: { idle: golemIdle, hit: golemHit },
  dragon: { idle: dragonIdle, hit: dragonHit },
  // Rounds 1–20 — the 100 species added on 2026-09-08 (F81). TypeScript
  // checks the spread against Record<SpeciesId, …>, so a species in the
  // catalog with no art fails to compile.
  ...waterSprites,
  ...windSprites,
  ...darkSprites,
  ...earthSprites,
  ...fireSprites,
};

// Self-register every pose of every species so the integrity sweep in
// tests/sprites.test.ts covers all monster art. Keyed off core's
// SPECIES_IDS — never a re-declared list (T05 decision).
const registryEntries: Record<string, Sprite> = {};
for (const id of SPECIES_IDS) {
  registryEntries[`monster.${id}.idle`] = monsterSprites[id].idle;
  registryEntries[`monster.${id}.hit`] = monsterSprites[id].hit;
}
registerSprites(registryEntries);
