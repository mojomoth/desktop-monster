// SPEC F19 (part 2) / Assumption 4 — monster art as code for the 5 species
// (slime, bat, ghost, golem, dragon): idle x2 (wobble) + hit x1 (recoil pose)
// each. String-row matrices only; '.' is transparent. Monsters face LEFT
// (toward the hero on the left side of the scene — Assumption 1), so the
// renderer draws them unflipped on the right.
//
// Tier tinting is NOT baked in here: the renderer calls
// paletteForTier(sprite.palette, tier) per GAME_ARCHITECTURE §4. The white
// hit-flash is drawSprite's `tint` option; the `hit` sprite is only the pose.

import { SPECIES_IDS } from '../../core/index.js';
import type { SpeciesId } from '../../core/index.js';
import { COLORS } from './palette.js';
import { registerSprites } from './sprite.js';
import type { Sprite } from './sprite.js';

/** The art set every species provides. */
export interface SpeciesSprites {
  /** 2-frame idle wobble. */
  idle: Sprite;
  /** 1-frame hit recoil pose (white flash comes from drawSprite's tint). */
  hit: Sprite;
}

const SLIME_PALETTE: Record<string, string> = {
  e: COLORS.void, // eyes / outline accents
  g: COLORS.green, // body
  G: COLORS.forest, // belly shadow
};

const slimeIdle: Sprite = {
  w: 16,
  h: 14,
  palette: SLIME_PALETTE,
  frames: [
    [
      '................',
      '......gggg......',
      '....gggggggg....',
      '...gggggggggg...',
      '..gggggggggggg..',
      '.gggggggggggggg.',
      'gggggeggggeggggg',
      'gggggggggggggggg',
      'ggggggeeeegggggg',
      'gGGGggggggggGGGg',
      'gGGGGggggggGGGGg',
      '.GGGGGGGGGGGGGG.',
      '..GGGGGGGGGGGG..',
      '..GGGG....GGGG..',
    ],
    [
      '................',
      '................',
      '......gggg......',
      '....gggggggg....',
      '...gggggggggg...',
      '..gggggggggggg..',
      '.gggggggggggggg.',
      'gggggeggggeggggg',
      'gggggggggggggggg',
      'ggggggeeeegggggg',
      'gGGGggggggggGGGg',
      'gGGGGggggggGGGGg',
      '.GGGGGGGGGGGGGG.',
      '..GGGG....GGGG..',
    ],
  ],
};

const slimeHit: Sprite = {
  w: 16,
  h: 14,
  palette: SLIME_PALETTE,
  frames: [
    [
      '................',
      '................',
      '........gggg....',
      '......gggggggg..',
      '.....gggggggggg.',
      '....gggggggggggg',
      '...ggggggggggggg',
      '..ggggggegggeggg',
      '..gggggggggggggg',
      '..gggggggeeegggg',
      '.gGGGGggggggGGG.',
      '.GGGGGGGGGGGGGG.',
      '..GGGGGGGGGGGG..',
      '...GGGG...GGGG..',
    ],
  ],
};

const BAT_PALETTE: Record<string, string> = {
  e: COLORS.void, // outline
  p: COLORS.navy, // body
  m: COLORS.maroon, // wing membrane
  r: COLORS.red, // eyes
  w: COLORS.white, // fangs / stunned eyes
};

const batIdle: Sprite = {
  w: 16,
  h: 14,
  palette: BAT_PALETTE,
  frames: [
    [
      'mm............mm',
      'mmm..........mmm',
      'mmme........emmm',
      'mmmmmeeeeeemmmmm',
      '.mmmmeppppemmmm.',
      '..mmmerppremmm..',
      '...mmeppppemm...',
      '....epwppwpe....',
      '....eppppppe....',
      '.....eppppe.....',
      '......eppe......',
      '......e..e......',
      '......e..e......',
      '.....ee..ee.....',
    ],
    [
      '................',
      'mm............mm',
      'mmm..........mmm',
      'mmme........emmm',
      'mmmmmeeeeeemmmmm',
      '.mmmmeppppemmmm.',
      '..mmmerppremmm..',
      '...mmeppppemm...',
      '....epwppwpe....',
      '....eppppppe....',
      '.....eppppe.....',
      '......eppe......',
      '......e..e......',
      '.....ee..ee.....',
    ],
  ],
};

const batHit: Sprite = {
  w: 16,
  h: 14,
  palette: BAT_PALETTE,
  frames: [
    [
      '................',
      '................',
      '....mm........mm',
      '...mmmm.....mmmm',
      '....mmmeeeeeemm.',
      '.....mmeppppem..',
      '......epwppwpe..',
      '......eppppppe..',
      '.......eppppe...',
      '........eppe....',
      '........e..e....',
      '........e..e....',
      '........e..e....',
      '.......ee..ee...',
    ],
  ],
};

const GHOST_PALETTE: Record<string, string> = {
  e: COLORS.void, // eyes
  w: COLORS.white, // body
  s: COLORS.steel, // hem shading
  b: COLORS.blue, // mouth
};

const ghostIdle: Sprite = {
  w: 22,
  h: 18,
  palette: GHOST_PALETTE,
  frames: [
    [
      '......................',
      '........wwwwww........',
      '......wwwwwwwwww......',
      '.....wwwwwwwwwwww.....',
      '....wwwwwwwwwwwwww....',
      '...wwwwwwwwwwwwwwww...',
      '..wwwwwwwwwwwwwwwwww..',
      '..wwwwwewwwwwwewwwww..',
      '.wwwwwwwwwwwwwwwwwwww.',
      '.wwwwwwwwbbbbwwwwwwww.',
      '.wwwwwwwwwwwwwwwwwwww.',
      '.wwwswwwwswwwwswwwsww.',
      '.wwwwwwwwwwwwwwwwwwww.',
      '.wwsswwwwwwwwwwwwssww.',
      '..wwwswwwwswwwwswwww..',
      '..wwwwwwwwwwwwwwwwww..',
      '...wwwwwwwwwwwwwwww...',
      '...wws.wws.wws.wwsw...',
    ],
    [
      '......................',
      '......................',
      '........wwwwww........',
      '......wwwwwwwwww......',
      '.....wwwwwwwwwwww.....',
      '....wwwwwwwwwwwwww....',
      '...wwwwwwwwwwwwwwww...',
      '..wwwwwwwwwwwwwwwwww..',
      '..wwwwwewwwwwwewwwww..',
      '.wwwwwwwwwwwwwwwwwwww.',
      '.wwwwwwwwbbbbwwwwwwww.',
      '.wwwwwwwwwwwwwwwwwwww.',
      '.wwwswwwwswwwwswwwsww.',
      '.wwwwwwwwwwwwwwwwwwww.',
      '.wwsswwwwwwwwwwwwssww.',
      '..wwwswwwwswwwwswwww..',
      '..wwwwwwwwwwwwwwwwww..',
      '...wws.wws.wws.wwsw...',
    ],
  ],
};

const ghostHit: Sprite = {
  w: 22,
  h: 18,
  palette: GHOST_PALETTE,
  frames: [
    [
      '......................',
      '......................',
      '...........wwwwww.....',
      '.........wwwwwwwwww...',
      '........wwwwwwwwwwww..',
      '.......wwwwwwwwwwwwww.',
      '......wwwwwwwwwwwwwwww',
      '.....wwwwwwewwwwwewwww',
      '....wwwwwwwwwwwwwwwwww',
      '....wwwwwwwwwbbbbwwwww',
      '....wwwwwwwwwwwwwwwwww',
      '....wwwwswwwwswwwwswww',
      '....wwwwwwwwwwwwwwwwww',
      '....wwsswwwwwwwwwwssww',
      '.....wwwwswwwwswwwsww.',
      '.....wwwwwwwwwwwwwwww.',
      '......wwwwwwwwwwwwww..',
      '......wws.wws.wws.ww..',
    ],
  ],
};

const GOLEM_PALETTE: Record<string, string> = {
  e: COLORS.void, // outline
  g: COLORS.gray, // rock body
  s: COLORS.slate, // rock shadow
  y: COLORS.yellow, // glowing eyes
  w: COLORS.white, // stunned eyes (hit pose)
};

const golemIdle: Sprite = {
  w: 28,
  h: 24,
  palette: GOLEM_PALETTE,
  frames: [
    [
      '............................',
      '..........eeeeeeee..........',
      '........eeggggggggee........',
      '.......egggggggggggge.......',
      '......eggssggggggssgge......',
      '......eggyggggggggygge......',
      '......egggggssssggggge......',
      '.......egssggggggssge.......',
      '........eeggggggggee........',
      '....eeggggggssssggggggee....',
      '..egggggeggggggggggeggggge..',
      '.eggssggeggggggggggeggssgge.',
      '.eggggggegggssssgggegggggge.',
      'eegsssggeggggggggggeggsssgee',
      'esssssseggggggggggggesssssse',
      '.egggggeeggggggggggeeeeeeee.',
      '.....eeggggssggggssggee.....',
      '.......eggggssssgggge.......',
      '.......egssggggggssge.......',
      '......eeggggeeeeggggee......',
      '......eggggge..eggggge......',
      '.....eeggggge..egggggee.....',
      '....eesssssee..eesssssee....',
      '...eessssssse..esssssssee...',
    ],
    [
      '............................',
      '............................',
      '..........eeeeeeee..........',
      '........eeggggggggee........',
      '.......egggggggggggge.......',
      '......eggssggggggssgge......',
      '......eggyggggggggygge......',
      '......egggggssssggggge......',
      '.......egssggggggssge.......',
      '....eeggggggssssggggggee....',
      '..egssggeggggggggggeggssge..',
      '.eggggggeggggggggggegggggge.',
      '.egsssggegggssssgggeggsssge.',
      'eeggggggeggggggggggeggggggee',
      'esssssseggggggggggggesssssse',
      '.egggggeeggggggggggeeeeeeee.',
      '.....eeggggssggggssggee.....',
      '.......eggggssssgggge.......',
      '.......egssggggggssge.......',
      '......eeggggeeeeggggee......',
      '......eggggge..eggggge......',
      '.....eeggggge..egggggee.....',
      '....eesssssee..eesssssee....',
      '...eessssssse..esssssssee...',
    ],
  ],
};

const golemHit: Sprite = {
  w: 28,
  h: 24,
  palette: GOLEM_PALETTE,
  frames: [
    [
      '............................',
      '.............eeeeeeee.......',
      '...........eeggggggggee.....',
      '..........egggggggggggge....',
      '.........eggssggggggssgge...',
      '.........eggwggggggggwgge...',
      '..eeeeee..egggggssssgggge...',
      '.egggggge..eggggggggggge....',
      'eessssssee..eegggggggee.....',
      '.eeggggggeeeggggggggggggee..',
      '...eegggggeeggggsssggggggee.',
      '.......eeggggggggggggsssgee.',
      '........eegggsssgggeggggggee',
      '........eeggggggggggggssssee',
      '.........eegggssssgggggggee.',
      '..........eeggggggggggggee..',
      '..........eegggggssggggee...',
      '.........eegggggggggggee....',
      '........eegggssssggggee.....',
      '.......eeggggeeeggggee......',
      '......eggggge.egggggge......',
      '.....eeggggge.eggggggee.....',
      '....eesssssee.eessssssee....',
      '...eessssssse.essssssssee...',
    ],
  ],
};

const DRAGON_PALETTE: Record<string, string> = {
  e: COLORS.void, // outline
  d: COLORS.forest, // scales
  D: COLORS.green, // belly highlight
  r: COLORS.red, // wing / crest
  o: COLORS.orange, // belly / wing membrane
  y: COLORS.yellow, // eye
  w: COLORS.white, // teeth / stunned eye
};

const dragonIdle: Sprite = {
  w: 30,
  h: 24,
  palette: DRAGON_PALETTE,
  frames: [
    [
      '......................eee.....',
      '....................eerrree...',
      '...eeee...........eerrooorree.',
      '..eedddee.......eerrroooorrree',
      '...eerrrrree..eerrroooooorrree',
      '..eerdrrrdrreeerrroooooorrree.',
      '..erryrrrrrrrrreeoooooorrree..',
      '.errrrrrrroooooorrreeorrree...',
      'errreeeerrrooooooorrrreeee....',
      'eerwwwrrrrrrooooooorrrrree....',
      '.eerrwwwrrrroooooooorrrrree...',
      '...eerrrrrrrooooooooorrrree...',
      '......eerrroooooooooorrrrree..',
      '.......eerrroooooooooorrrrrree',
      '........eerrroooooooooorrrrrre',
      '.........eerrrooooooooorrrrrde',
      '.........eerrroooooooorrrrde..',
      '..........eerrooooooorrree....',
      '..........eerrrooooorrree.....',
      '.........errrree...errree.....',
      '.........eoooee....eoooee.....',
      '........eerrree...eerrree.....',
      '.......eeooooee..eeooooee.....',
      '......eweeweeweeeweeweewee....',
    ],
    [
      '..............................',
      '......................eee.....',
      '....................eerrree...',
      '...eeee...........eerrooorree.',
      '..eedddee.......eerrroooorrree',
      '...eerrrrree..eerrroooooorrree',
      '..eerdrrrdrreeerrroooooorrree.',
      '..erryrrrrrrrrreeoooooorrree..',
      '.errrrrrrroooooorrreeorrree...',
      'errreeeerrrooooooorrrreeee....',
      'eerwwwrrrrrrooooooorrrrree....',
      '.eerrwwwrrrroooooooorrrrree...',
      '...eereerrroooooooooorrrrree..',
      '.......eerrroooooooooorrrrrree',
      '........eerrroooooooooorrrrrre',
      '.........eerrrooooooooorrrrrde',
      '.........eerrroooooooorrrrde..',
      '..........eerrooooooorrree....',
      '..........eerrrooooorrree.....',
      '.........errrree...errree.....',
      '.........eoooee....eoooee.....',
      '........eerrree...eerrree.....',
      '.......eeooooee..eeooooee.....',
      '......eweeweeweeeweeweewee....',
    ],
  ],
};

const dragonHit: Sprite = {
  w: 30,
  h: 24,
  palette: DRAGON_PALETTE,
  frames: [
    [
      '..............................',
      '..............................',
      '..............................',
      '......eeee............eeeee...',
      '.....eedddee.......eeerrrreee.',
      '......eerrrrree..eeerroooorree',
      '.....eerrrrrrrreeerrooooorree.',
      '.....errwrrrrrrrrreeoooorree..',
      '....errreeerrooooorrreerree...',
      '...eerwwwrrrrrooooorrrreee....',
      '....eerrwwwrrroooooorrrrree...',
      '......eerrrrrrooooooorrrrree..',
      '........eerrrroooooooorrrrree.',
      '.........eerrrroooooooorrrrree',
      '..........eerrrroooooooorrrrre',
      '...........eerrroooooooorrrrde',
      '...........eerrrooooooorrree..',
      '...........eerrroooooorree....',
      '..........eerrroooooorree.....',
      '.........errrree...errree.....',
      '.........eoooee....eoooee.....',
      '........eerrree...eerrree.....',
      '.......eeooooee..eeooooee.....',
      '......eweeweeweeeweeweewee....',
    ],
  ],
};

/**
 * The full species → art map, keyed by core's SpeciesId so a new species (or
 * a typo) fails to compile. Renderer lookup: monsterSprites[def.speciesId].
 */
export const monsterSprites: Record<SpeciesId, SpeciesSprites> = {
  slime: { idle: slimeIdle, hit: slimeHit },
  bat: { idle: batIdle, hit: batHit },
  ghost: { idle: ghostIdle, hit: ghostHit },
  golem: { idle: golemIdle, hit: golemHit },
  dragon: { idle: dragonIdle, hit: dragonHit },
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
