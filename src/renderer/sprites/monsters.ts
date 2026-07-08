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
  w: 12,
  h: 10,
  palette: SLIME_PALETTE,
  frames: [
    [
      '............',
      '............',
      '....gggg....',
      '..gggggggg..',
      '.gggeggeggg.',
      '.gggggggggg.',
      'gggggggggggg',
      'gGGggggggGGg',
      '.GGGGGGGGGG.',
      '............',
    ],
    [
      '............',
      '............',
      '............',
      '...gggggg...',
      '.gggeggeggg.',
      'gggggggggggg',
      'gggggggggggg',
      'gGGggggggGGg',
      'GGGGGGGGGGGG',
      '............',
    ],
  ],
};

const slimeHit: Sprite = {
  w: 12,
  h: 10,
  palette: SLIME_PALETTE,
  frames: [
    [
      '............',
      '............',
      '.....gggg...',
      '...gggggggg.',
      '..gggeggegg.',
      '..ggggggggg.',
      '.gggggggggg.',
      '.gGGggggGGg.',
      '..GGGGGGGG..',
      '............',
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
  w: 12,
  h: 10,
  palette: BAT_PALETTE,
  frames: [
    [
      '.m........m.',
      '.mm......mm.',
      '.mmm....mmm.',
      '.meppppppem.',
      '..eprpprpe..',
      '..epwppwpe..',
      '...eppppe...',
      '....e..e....',
      '............',
      '............',
    ],
    [
      '............',
      '............',
      '..eppppppe..',
      '..eprpprpe..',
      'mmepwppwpemm',
      '.mmeppppemm.',
      '..m.eppe.m..',
      '....e..e....',
      '............',
      '............',
    ],
  ],
};

const batHit: Sprite = {
  w: 12,
  h: 10,
  palette: BAT_PALETTE,
  frames: [
    [
      '............',
      '.m........m.',
      '.mm......mm.',
      '.meppppppem.',
      '..epwppwpe..',
      '..eppppppe..',
      '...eppppe...',
      '...e....e...',
      '............',
      '............',
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
  w: 12,
  h: 10,
  palette: GHOST_PALETTE,
  frames: [
    [
      '....wwww....',
      '..wwwwwwww..',
      '.wwwwwwwwww.',
      '.wwewwwewww.',
      '.wwwwwwwwww.',
      '.wwwbbwwwww.',
      '.wwwwwwwwww.',
      '.wswwswwsww.',
      '.w.ww.ww.ww.',
      '............',
    ],
    [
      '............',
      '....wwww....',
      '..wwwwwwww..',
      '.wwwwwwwwww.',
      '.wwewwwewww.',
      '.wwwwwwwwww.',
      '.wwwbbwwwww.',
      '.wwwwwwwwww.',
      '.ww.ww.ww.w.',
      '............',
    ],
  ],
};

const ghostHit: Sprite = {
  w: 12,
  h: 10,
  palette: GHOST_PALETTE,
  frames: [
    [
      '.....wwww...',
      '...wwwwwwww.',
      '..wwwwwwwww.',
      '..wewwwewww.',
      '..wwwwwwwww.',
      '..wwbbwwwww.',
      '..wwwwwwwww.',
      '..wswwswwsw.',
      '..w.ww.ww.w.',
      '............',
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
  w: 12,
  h: 10,
  palette: GOLEM_PALETTE,
  frames: [
    [
      '...eggge....',
      '..egygyge...',
      '...eggge....',
      '.eggggggge..',
      'eggeggggegge',
      'eggegssgegge',
      'esseggggesse',
      '..eggsggge..',
      '..eggeegge..',
      '..ess..sse..',
    ],
    [
      '...eggge....',
      '..egygyge...',
      '...eggge....',
      '.eggggggge..',
      'esseggggesse',
      'eggegssgegge',
      'eggeggggegge',
      '..eggsggge..',
      '..eggeegge..',
      '..ess..sse..',
    ],
  ],
};

const golemHit: Sprite = {
  w: 12,
  h: 10,
  palette: GOLEM_PALETTE,
  frames: [
    [
      '....eggge...',
      '...egwgwge..',
      '....eggge...',
      '..eggggggge.',
      '.eggegggge..',
      '.eggegssge..',
      '.esseggggse.',
      '...eggsgge..',
      '...eggegge..',
      '...ess.sse..',
    ],
  ],
};

const DRAGON_PALETTE: Record<string, string> = {
  e: COLORS.void, // outline
  d: COLORS.forest, // scales
  D: COLORS.green, // belly highlight
  r: COLORS.red, // wing / crest
  y: COLORS.yellow, // eye
  w: COLORS.white, // teeth / stunned eye
};

const dragonIdle: Sprite = {
  w: 12,
  h: 10,
  palette: DRAGON_PALETTE,
  frames: [
    [
      '.ee...rr....',
      '.edde.rrr...',
      'eddyde.rrr..',
      'edddddeddde.',
      'ewwdddddddde',
      '.eedDDDDDdde',
      '..edDDDDDde.',
      '..eddddddde.',
      '..ede..ede..',
      '..ee...ee...',
    ],
    [
      '.ee.........',
      '.edde.......',
      'eddyde.rr...',
      'eddddderrre.',
      'ewwdddddddde',
      '.eedDDDDDdde',
      '..edDDDDDde.',
      '..eddddddde.',
      '..ede..ede..',
      '..ee...ee...',
    ],
  ],
};

const dragonHit: Sprite = {
  w: 12,
  h: 10,
  palette: DRAGON_PALETTE,
  frames: [
    [
      '..ee...rr...',
      '..edde.rrr..',
      '.eddwde.rrr.',
      '.edddddeddde',
      '.ewwddddddde',
      '..eedDDDDdde',
      '...edDDDDde.',
      '...edddddde.',
      '...ede.ede..',
      '...ee..ee...',
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
