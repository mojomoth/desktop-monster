// GENERATED ART — water-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.

import { COLORS } from '../palette.js';
import type { Sprite } from '../sprite.js';
import type { SpeciesSprites } from '../monsters.js';

// Lumibel (water, size 1, 15x11)
// A left-looking bell jellyfish has a straight flared lampshade, twin cyan
// eyes, a yellow brim and four long ribbon tentacles resting on the ground.
const lumibelPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, b: COLORS.blue, c: COLORS.cyan, y: COLORS.yellow };
const lumibelIdle: Sprite = {
  w: 15,
  h: 11,
  palette: lumibelPalette,
  frames: [
    [
      '.....eeeee.....',
      '....ebbbnne....',
      '...ebccnccne...',
      '..ebnccnccnne..',
      '.ebneennnnnnne.',
      'eyyyyyyyyyyyyye',
      'ece.ebe.ene.ene',
      'ece.ebe.ene.ene',
      'ebe.ene.ene.ene',
      'ene.ene.ene.ene',
      'eee.eee.eee.eee',
    ],
    [
      '...............',
      '.....eeeee.....',
      '....ebbbnne....',
      '...ebccnccne...',
      '..ebnccnccnne..',
      '.ebneennnnnnne.',
      'eyyyyyyyyyyyyye',
      'ece.ebe.ene.ene',
      'ece.ebe.ene.ene',
      'ebe.ene.ene.ene',
      'eee.eee.eee.eee',
    ],
  ],
};
const lumibelHit: Sprite = {
  w: 15,
  h: 11,
  palette: lumibelPalette,
  frames: [
    [
      '...............',
      '......eeeee....',
      '.....ebbbnne...',
      '....ebeenennne.',
      '...ebneeennnnne',
      '..eyyyyyyyyyyye',
      '.ece.ebe.ene.en',
      '.ece.ebe.ene.en',
      '.ebe.ene.ene.en',
      '.ene.ene.ene.en',
      '.eee.eee.eee.ee',
    ],
  ],
};

// Sopwit (water, size 1, 15x11)
// An upright drenched shrew with a pink nose and tucked pink paws sits
// beneath an oversized trembling water bead and two rim droplets.
const sopwitPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, b: COLORS.blue, p: COLORS.skin, c: COLORS.cyan, w: COLORS.white };
const sopwitIdle: Sprite = {
  w: 15,
  h: 11,
  palette: sopwitPalette,
  frames: [
    [
      '.........eee...',
      '.....ee.ecwce..',
      '....ecnecwbe.cc',
      '..eeeebewccbe..',
      'eewwewwenccbe.c',
      'peweewenbccbe.c',
      'ecccbbbeebne...',
      '..enppnbpene...',
      '..enbbnbbnbe...',
      '..enbbnnnbne...',
      '..epppeepppe...',
    ],
    [
      '..........ee...',
      '.....ee.eecwce.',
      '....ecnecwbe.cc',
      '..eeeebewccbe..',
      'eewwewwenccbe.c',
      'peweewenbccbe.c',
      'ecccbbbeebne...',
      '..enbpnbppne...',
      '..enbbnbbnbe...',
      '..enbbnnnbne...',
      '..epppeepppe...',
    ],
  ],
};
const sopwitHit: Sprite = {
  w: 15,
  h: 11,
  palette: sopwitPalette,
  frames: [
    [
      '...............',
      '..........eee..',
      '......ee.ecwce.',
      '.....ecnewccbe.',
      '....eeeebcccbec',
      '...eeeeeenccbec',
      '..pebbbbnbccbe.',
      '...ecnbpebbne..',
      '...enppnbbnbe..',
      '...enbbnnnbne..',
      '...epppeepppe..',
    ],
  ],
};

// Snipclaw (water, size 1, 15x11)
// A tiny blue-faced crab hoists a broad red shield claw over its left side,
// balancing a nub claw and three widely spaced legs.
const snipclawPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, r: COLORS.red, o: COLORS.orange, b: COLORS.blue, w: COLORS.white };
const snipclawIdle: Sprite = {
  w: 15,
  h: 11,
  palette: snipclawPalette,
  frames: [
    [
      '.eeeeee........',
      'errrrrme.......',
      'eroormme.......',
      'ermmmmee.......',
      '.eeeeme........',
      '.....eme.eee...',
      '.....emerbbme..',
      '....erbwbrwwmee',
      '...ermbeebeemre',
      '....emmmmmmee..',
      '....e..e..e....',
    ],
    [
      '..eeeeee.......',
      '.errrrrme......',
      '.eroormme......',
      '.ermmmmee......',
      '..eeeme........',
      '.....eme.eee...',
      '.....emerbbme..',
      '....erbwbrwwmee',
      '...ermbeebeemre',
      '....emmmmmmee..',
      '....e..e..e....',
    ],
  ],
};
const snipclawHit: Sprite = {
  w: 15,
  h: 11,
  palette: snipclawPalette,
  frames: [
    [
      '...............',
      '...eeeeee......',
      '..errrrrme.....',
      '..eroormme.....',
      '..ermmmmee.....',
      '...eeeeme......',
      '.......emeeee..',
      '......errbbbmee',
      '.....erbeebeeme',
      '.....emmmmmmmre',
      '.....e..e..e...',
    ],
  ],
};

// Vespril (water, size 1, 15x11)
// A left-looking moth nestles into a warm fur collar beneath two raised
// notched ice shards, its fuzzy abdomen resting on tucked feet.
const vesprilPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, t: COLORS.steel, b: COLORS.blue, c: COLORS.cyan, p: COLORS.skin, w: COLORS.white };
const vesprilIdle: Sprite = {
  w: 15,
  h: 11,
  palette: vesprilPalette,
  frames: [
    [
      '.eeeee...eeeee.',
      '.ewwce...ecwwe.',
      '..ewcce.ecwce..',
      '..e.eccece.e...',
      '....eeebcbe....',
      '...ettettbe....',
      '..eteettbte....',
      '...epppppppe...',
      '....eppbtpe....',
      '.....etbsbe....',
      '.....ee.ee.....',
    ],
    [
      '.eeeee...eeeee.',
      '.ewwce...ecwwe.',
      '..ewcce.ecwce..',
      '..e.ecbece.e...',
      '....eeebcbe....',
      '...ettettbe....',
      '..eteettbte....',
      '...epppppppe...',
      '...epppbtpe....',
      '.....etbbse....',
      '.....ee.ee.....',
    ],
  ],
};
const vesprilHit: Sprite = {
  w: 15,
  h: 11,
  palette: vesprilPalette,
  frames: [
    [
      '...............',
      '..eeeee..eeeee.',
      '..ewwce..ecwwe.',
      '...ewcce.ecwce.',
      '...e.eccece.e..',
      '......ebcbe....',
      '.....ettete....',
      '....eteeetbe...',
      '....eppppppppe.',
      '.....etpbbtpe..',
      '......ee.ee....',
    ],
  ],
};

// Murkin (water, size 1, 14x10)
// A ground-hugging grey fog loaf looks left over its half-swallowed cracked
// brown jug, with paired dark eyes and a flat slot mouth.
const murkinPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, b: COLORS.brown, m: COLORS.maroon };
const murkinIdle: Sprite = {
  w: 14,
  h: 10,
  palette: murkinPalette,
  frames: [
    [
      '..............',
      '...eeeeeee....',
      '.eegggggggee..',
      'eggggggggggse.',
      'eggeegeeggsse.',
      'eebegggggssse.',
      'ebbmeeegsssse.',
      'ebemegsssssse.',
      'eebmessssssse.',
      'eeeeeeeeeeeee.',
    ],
    [
      '..............',
      '....eeeee.....',
      '..eegggggee...',
      '.egggggggggse.',
      'eggeegeeggsse.',
      'eebegggggssse.',
      'ebbmeeegsssse.',
      'ebemegsssssse.',
      'eebmessssssse.',
      'eeeeeeeeeeeee.',
    ],
  ],
};
const murkinHit: Sprite = {
  w: 14,
  h: 10,
  palette: murkinPalette,
  frames: [
    [
      '..............',
      '..............',
      '....eeeeeee...',
      '..eegggggggee.',
      '.eggeggegggsse',
      '.eebegggggssse',
      '.ebbmeeegsssse',
      '.ebemegsssssse',
      '.eebmessssssse',
      '.eeeeeeeeeeeee',
    ],
  ],
};

// Foamcap (water, size 1, 15x11)
// A left-looking sea-foam mushroom with two bubbles seated on a lifted
// shallow brim and thick spreading root-feet.
const foamcapPalette: Record<string, string> = { e: COLORS.void, f: COLORS.forest, g: COLORS.green, s: COLORS.gray, c: COLORS.cyan, w: COLORS.white };
const foamcapIdle: Sprite = {
  w: 15,
  h: 11,
  palette: foamcapPalette,
  frames: [
    [
      '...ee....ee....',
      '..ewwe..ewce...',
      '...eeeeeeee....',
      '..ewwwccccge...',
      '..eeeeeeeeee...',
      '...ecwwcwwge...',
      '..ewcewcewge...',
      '..ecwcgcggfe...',
      '..ewccegggfe...',
      '.ewccgeeggggfe.',
      'eeeeeee.eeeeeee',
    ],
    [
      '...ee....ee....',
      '..ewce..ewwe...',
      '...eeeeeeee....',
      '..ewwwccccge...',
      '..eeeeeeeeee...',
      '...ecwwcwwge...',
      '..ewcewcewge...',
      '..ecwcgcggfe...',
      '.ewccceggggfe..',
      'ewcccgeegggggfe',
      'eeeeeee.eeeeeee',
    ],
  ],
};
const foamcapHit: Sprite = {
  w: 15,
  h: 11,
  palette: foamcapPalette,
  frames: [
    [
      '...............',
      '....ee....ee...',
      '...ewce..ecce..',
      '....eeeeeeee...',
      '...ewwccccgge..',
      '...eeeeeeeeee..',
      '....ecgecgege..',
      '...ecceccegfe..',
      '...ewccggggfe..',
      '..ewccgeeggggfe',
      '.eeeeeee.eeeeee',
    ],
  ],
};

// Gulpwick (water, size 2, 17x14)
// A left-facing abyssal fish stands on two fin stumps, its recessed eye
// above needle jaws biting a barnacled yellow ship lamp that projects beyond
// its chin.
const gulpwickPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, b: COLORS.blue, s: COLORS.steel, m: COLORS.maroon, y: COLORS.yellow, w: COLORS.white };
const gulpwickIdle: Sprite = {
  w: 17,
  h: 14,
  palette: gulpwickPalette,
  frames: [
    [
      '.......eeeee.....',
      '.....eessbbbee...',
      '....esbbbbbbnne..',
      '...esbbbbbbnnnne.',
      '..ebwebbbbbnnnne.',
      '..ebeeebbbnnnnne.',
      '..ebbbbbbbnnnne.e',
      '..eweweeemnnnnebe',
      'essssewemnnnnbbe.',
      'eyyeyemnnnnnnbee.',
      'esyeyewemnnnne.e.',
      'esssseeebnnnee...',
      '.....eeebneebne..',
      '.....eseeeeseee..',
    ],
    [
      '.................',
      '.......eeeee.....',
      '.....eessbbbee...',
      '....esbbbbbbnne..',
      '...esbbbbbbnnnne.',
      '..ebwebbbbbnnnne.',
      '..ebeeebbbnnnne.e',
      '..eweweeemnnnnebe',
      'essssewemnnnnbbe.',
      'eyyeyemnnnnnnbee.',
      'esyeyewemnnnne.e.',
      'esssseeebnnnee...',
      '.....eeebneebne..',
      '.....eseeeeseee..',
    ],
  ],
};
const gulpwickHit: Sprite = {
  w: 17,
  h: 14,
  palette: gulpwickPalette,
  frames: [
    [
      '.................',
      '.................',
      '........eeeee....',
      '......eessbbbee..',
      '.....esbbbbbbnne.',
      '....esbbbbbbnnnne',
      '...ebeeebbbnnnnne',
      '...ebeebbbbnnnnee',
      '...eweweeemnnnnbe',
      '.essssewemnnnnbbe',
      '.eyyeyemnnnnnnbee',
      '.esyeyewemnnnnee.',
      '.esssseeebneebne.',
      '......eseeeeseee.',
    ],
  ],
};

// Brammel (water, size 2, 16x13)
// A long low earless river otter carries a blunt pale muzzle, two glinting
// eyes and whisker dashes, four short legs, and a straight three-pixel-thick
// plated paddle tail.
const brammelPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, s: COLORS.skin, o: COLORS.orange, c: COLORS.cyan, w: COLORS.white };
const brammelIdle: Sprite = {
  w: 16,
  h: 13,
  palette: brammelPalette,
  frames: [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...eeeee........',
      '..ebbbbbe..eeeee',
      'ssewewebbb.eoebe',
      '.ebssssbbbbeeeee',
      'sseesssbbee.....',
      '...ebeebeebe....',
      '...ee.ee.e.ee...',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...eeeeeee......',
      '..ebobbbbb.eeeee',
      'ssewewebbb.eoebe',
      '.ebssssbbbbeeeee',
      'sseesssbbee.....',
      '...ebeebeebe....',
      '...ee.ee.e.ee...',
    ],
  ],
};
const brammelHit: Sprite = {
  w: 16,
  h: 13,
  palette: brammelPalette,
  frames: [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....eeeee.eeeee',
      '....ebbbbbeeoebe',
      '..sseeeebbbeeeee',
      '...ebsssbbbe....',
      '..ssebeebeebe...',
      '....ee.ee.e.ee..',
    ],
  ],
};

// Conchguard (water, size 2, 17x14)
// A left-facing snail soldier carries three stepped orange shell whorls and
// a strapped round ivory door above a blunt bright-eyed head and broad pale
// foot.
const conchguardPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, o: COLORS.orange, p: COLORS.skin, u: COLORS.blue, w: COLORS.white };
const conchguardIdle: Sprite = {
  w: 17,
  h: 14,
  palette: conchguardPalette,
  frames: [
    [
      '..........eeeee..',
      '.........epooobe.',
      '.........eooeobe.',
      '.........eooobbe.',
      '.......eeeeeeeee.',
      '......epoooooobbe',
      '......eoooeeoobbe',
      '..eeeeeeoooobbbbe',
      '.epwwpwwpeeeeeeee',
      'eppewpewpebwweobe',
      'epppppppewbwwweoe',
      'epppeeepewbbwwebe',
      'eppppppppewwweppe',
      '.eeeeeeeeeeeeeee.',
    ],
    [
      '..........eeeee..',
      '.........epooobe.',
      '.........eooeobe.',
      '.........eooobbe.',
      '.......eeeeeeeee.',
      '......epoooooobbe',
      '......eoooeeoobbe',
      '..eeeeeeoooobbbbe',
      '.epwwpwwpeeeeeeee',
      'eppewpewpebwweobe',
      'epppppppewbwwweoe',
      'eppppeepewbbwwebe',
      'eppppppppewwweppe',
      'eeeeeeeeeeeeeeeee',
    ],
  ],
};
const conchguardHit: Sprite = {
  w: 17,
  h: 14,
  palette: conchguardPalette,
  frames: [
    [
      '.................',
      '...........eeeee.',
      '..........epooobe',
      '..........eooeobe',
      '..........eooobbe',
      '........eeeeeeeee',
      '.......epooooobbe',
      '.......eoooeeobbe',
      '....eeeeoooobbbbe',
      '...eppppeeeeeeeee',
      '..epuepueewbweobe',
      '.eppppppewwbwwebe',
      '.epppeeepewbweppe',
      '..eeeeeeeeeeeeeee',
    ],
  ],
};

// Bellbuoy (water, size 2, 17x14)
// A left-tipping riveted red harbour float with one thick arched handle, a
// square hanging bell, and a tongue clapper above a flat rocking base.
const bellbuoyPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, r: COLORS.red, g: COLORS.gray, s: COLORS.steel, w: COLORS.white };
const bellbuoyIdle: Sprite = {
  w: 17,
  h: 14,
  palette: bellbuoyPalette,
  frames: [
    [
      '......eeeee......',
      '.....essssee.....',
      '....es.ggg.se....',
      '....es.sgg.se....',
      '....es.ggg.se....',
      '...eeeseeeese....',
      '..esrrrrrrrmme...',
      '.esrrrrrrrrrmme..',
      'errerrerrrrrmmme.',
      'errrrrrrrrrrmme..',
      '.erreeerrrgmmme..',
      '.ermmgmrrrmmmme..',
      '..emmggmmmmmme...',
      '..eeeeeeeeeeee...',
    ],
    [
      '.......eeeee.....',
      '......essssee....',
      '.....es.ggg.se...',
      '.....es.sgg.se...',
      '.....es.ggg.se...',
      '....eeseeeese....',
      '...esrrrrrrmme...',
      '..esrrrrrrrrmme..',
      '.errerrerrrrmmme.',
      '.errrrrrrrrrmme..',
      '.erreeerrrgmmme..',
      '.ermmgmrrrmmmme..',
      '..emmggmmmmmme...',
      '..eeeeeeeeeeee...',
    ],
  ],
};
const bellbuoyHit: Sprite = {
  w: 17,
  h: 14,
  palette: bellbuoyPalette,
  frames: [
    [
      '.................',
      '........eeeee....',
      '.......essssee...',
      '......es.ggg.se..',
      '......es.sgg.se..',
      '......es.ggg.se..',
      '.....eeseeeese...',
      '....esrrrrrrmme..',
      '...esrrrrrrrrmme.',
      '..ereereerrrrmmme',
      '..erreeerrrrmmmme',
      '..ermmggrrremmme.',
      '...emmmggmmmmme..',
      '...eeeeeeeeeeee..',
    ],
  ],
};

// Quintel (water, size 2, 17x14)
// A five-point sea star steps left on two lower arms, with yellow tube feet
// along its ridges and a short regrowing upper-right arm.
const quintelPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, o: COLORS.orange, y: COLORS.yellow, s: COLORS.skin, w: COLORS.white };
const quintelIdle: Sprite = {
  w: 17,
  h: 14,
  palette: quintelPalette,
  frames: [
    [
      '.......e.........',
      '......ese........',
      '......eyoe.......',
      '.ee...esoe.......',
      '.esoe.esyoe......',
      '..eyoeesooe..ee..',
      '..esyoosssseeyse.',
      '...eswwswwsyoome.',
      '...esewsewsomme..',
      '...eosseeosme....',
      '...eyosssyoome...',
      '..esoeemmeoyoe...',
      '..eyoee..eosye...',
      '.eeee.....eeee...',
    ],
    [
      '.......e.........',
      '......ese........',
      '......eyoe.......',
      '..ee..esoe.......',
      '..esoeesyoe......',
      '..eyooesooe..ee..',
      '..esyoosssseeyse.',
      '...eswwswwsyoome.',
      '...esewsewsomme..',
      '...eosseeosme....',
      '...eyosssyoome...',
      '..esoeemmeoyoe...',
      '..eyoee..eosye...',
      '.eeee.....eeee...',
    ],
  ],
};
const quintelHit: Sprite = {
  w: 17,
  h: 14,
  palette: quintelPalette,
  frames: [
    [
      '.................',
      '........e........',
      '.......ese.......',
      '.......eyoe......',
      '...ee..esoe......',
      '...esoeesyoe.....',
      '...eyooesooe.ee..',
      '....esyssssseyse.',
      '.....seeeseeoomme',
      '....eosseeosmme..',
      '....eyosssyoome..',
      '...esoeemmeoyoe..',
      '...eyoee..eosye..',
      '..eeee.....eeee..',
    ],
  ],
};

// Pondstrider (water, size 2, 17x14)
// A ten-by-five segmented green dart with twin left-looking dome eyes stands
// on two thick bent front legs and two slender rear struts.
const pondstriderPalette: Record<string, string> = { e: COLORS.void, f: COLORS.forest, g: COLORS.green, b: COLORS.brown, c: COLORS.cyan, w: COLORS.white };
const pondstriderIdle: Sprite = {
  w: 17,
  h: 14,
  palette: pondstriderPalette,
  frames: [
    [
      '..eee.eee........',
      '.ewggewgge.......',
      '..eeggeegeee.....',
      '..ecggegggfe.....',
      '..eggeggffge.....',
      '..egggefgfee.....',
      '...eeeeeeeee.....',
      '....ge.ge.e.e....',
      '..ge..ge...e.e...',
      '.ge...ge....e.e..',
      '..ge...ge....e.e.',
      '...ge...ge...e..e',
      '...ge....ge..e..e',
      '..ee.....ee.ee.ee',
    ],
    [
      '.................',
      '..eee.eee........',
      '.ewggewgge.......',
      '..eeggeegeee.....',
      '..ecggegggfe.....',
      '..eggeggffge.....',
      '..egggefgfee.....',
      '...eeeeeeeeee....',
      '..ge..ge...e.e...',
      '.ge...ge......e.e',
      '..ge...ge.....e.e',
      '...ge...ge...e..e',
      '...ge....ge..e..e',
      '..ee.....ee.ee.ee',
    ],
  ],
};
const pondstriderHit: Sprite = {
  w: 17,
  h: 14,
  palette: pondstriderPalette,
  frames: [
    [
      '.................',
      '.................',
      '.....eee.eee.....',
      '....egggegge.....',
      '....eeeeeeee.....',
      '....ecggegggfe...',
      '....eggeggfege...',
      '....egggefgfee...',
      '.....eeeeeeeee...',
      '...ge...ge...ee..',
      '..ge....ge....ee.',
      '...ge....ge..e.e.',
      '....ge....ge.e..e',
      '...ee.....eeee.ee',
    ],
  ],
};

// Slushmaw (water, size 2, 16x13)
// A left-jutting blue ice jaw supports gritty gray slush that rises in broad
// steps to a tall rear shoulder.
const slushmawPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, b: COLORS.blue, r: COLORS.brown, w: COLORS.white };
const slushmawIdle: Sprite = {
  w: 16,
  h: 13,
  palette: slushmawPalette,
  frames: [
    [
      '..........eeee..',
      '..........ewge..',
      '........eewgggee',
      '........ewggggse',
      '......eewggrggse',
      '......ewgggggsse',
      '....eewggggggsse',
      '..ewewggegrggsse',
      '..egwwggsggggsse',
      'eeeeeessssssssse',
      'ewwbbbbbbbbbbbse',
      'ebbbbbbbbbbbbsse',
      'eeeeeeeeeeeeeeee',
    ],
    [
      '................',
      '..........eeee..',
      '..........ewge..',
      '........eewgggee',
      '........ewggggse',
      '......eewggrggse',
      '......ewgggggsse',
      '....eewggggggsse',
      '..ewewggegrggsse',
      '..egwwggsggggsse',
      'eeeeeessssssssse',
      'ewwbbbbbbbbbbbse',
      'eeeeeeeeeeeeeeee',
    ],
  ],
};
const slushmawHit: Sprite = {
  w: 16,
  h: 13,
  palette: slushmawPalette,
  frames: [
    [
      '................',
      '................',
      '............eeee',
      '..........eewgge',
      '..........ewggse',
      '........eewrggse',
      '........ewgggsse',
      '......eewggggsse',
      '....eeggeegrgsse',
      '..eeggegeggsssse',
      '..ewwbbbbbbbbbse',
      '..ebbbbbbbbbbsse',
      '..eeeeeeeeeeeeee',
    ],
  ],
};

// Kraulk (water, size 3, 20x17)
// A maroon reef octopus peers left beneath a heavy double brow, gripping a
// stone in one curled arm while its other arm anchors its cyan-spotted dome.
const kraulkPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, n: COLORS.navy, s: COLORS.skin, c: COLORS.cyan, w: COLORS.white, g: COLORS.gray };
const kraulkIdle: Sprite = {
  w: 20,
  h: 17,
  palette: kraulkPalette,
  frames: [
    [
      '............eeee....',
      '..........eessmmee..',
      '.........esssmmmmme.',
      '........esssmmmmmmme',
      '...eee..esmccmmmmme.',
      '..egwge.esmmmmmmnme.',
      '..eggee.emmmmccmnme.',
      '.eessee.eeeeeeemnme.',
      '.esmmseeeeeeeeemnne.',
      '.esmee.ewwwsssemmnne',
      '.esmme.eseeeesemnnne',
      '..esmmmeeessssenmnne',
      '...esmmmmssmmmmnnne.',
      '.....essmmmmmnnnne..',
      '...eessmmmmnnnee....',
      '.eessssmmnnee.......',
      'eeeeeeeeee..........',
    ],
    [
      '....................',
      '............eeee....',
      '.........eessmmmmme.',
      '........esssmmmmmmme',
      '...eee..esmmccmmmme.',
      '..egwge.esmmmmmmnme.',
      '..eggee.emmmmccmnme.',
      '.eessee.eeeeeeemnme.',
      '.esmmseeeeeeeeemnne.',
      '.esmee.ewwwsssemmnne',
      '.esmme.eseeeesemnnne',
      '..esmsmeeessssenmnne',
      '...esmmmmssmmmmnnne.',
      '.....essmmmmmnnnne..',
      '...eessmmmmnnnee....',
      '.eessssmmnnee.......',
      'eeeeeeeeee..........',
    ],
  ],
};
const kraulkHit: Sprite = {
  w: 20,
  h: 17,
  palette: kraulkPalette,
  frames: [
    [
      '....................',
      '....................',
      '............eeee....',
      '..........eessmmmee.',
      '.........essmmmmmmme',
      '....eee..esmmccmmmme',
      '...egwge.esmmmmmmnme',
      '...eggee.eeeeeeemnme',
      '..eesmseeeeeeeeemnne',
      '..esmmseeeseessemnne',
      '..esme..esseeesemnne',
      '...esmmeeesssemnnne.',
      '....esmmmmssmmmmnnne',
      '......essmmmmmnnnne.',
      '....eessmmmmnnnee...',
      '..eessssmmnnee......',
      '.eeeeeeeeee.........',
    ],
  ],
};

// Reefknight (water, size 3, 20x17)
// A left-facing ram-helmed brawler carries an immense right coral pauldron
// with one orange 3-by-3 cluster, a thin cocked fist, and a cyan visor.
const reefknightPalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, d: COLORS.slate, o: COLORS.orange, c: COLORS.cyan, w: COLORS.white };
const reefknightIdle: Sprite = {
  w: 20,
  h: 17,
  palette: reefknightPalette,
  frames: [
    [
      '....................',
      '.....eeee...........',
      '...eewssse....eee...',
      '..ewssssde..eewseee.',
      '.ewwwsssdeeewsooodse',
      '.ecccessdeewwsooodse',
      '..eddddeeewsssooodde',
      '...eeedsewssssssddde',
      '.ee..esdewssdwssddde',
      'ewse.esddewsessdddde',
      'esdeeesssdeedddddee.',
      '.eesdesssdseeeeeee..',
      '...eeesssdde........',
      '.....esdeesde.......',
      '....esde..esde......',
      '...ewssde.essdde....',
      '...eeeeee.eeeeee....',
    ],
    [
      '....................',
      '.....eeee...........',
      '...eewssse....eee...',
      '..ewssssde..eewseee.',
      '.ewwwsssdeeewsooodse',
      '.ecccessdeewwsooodse',
      '..eddddeeewsssooodde',
      '...eeedsewssssssddde',
      '.....esdewssdwssddde',
      '.ee..esddewsessdddde',
      'ewseeesssdeedddddee.',
      'esdesesssdseeeeeee..',
      '.ee.eesssdde........',
      '.....esdeesde.......',
      '....esde..esde......',
      '...ewssde.essdde....',
      '...eeeeee.eeeeee....',
    ],
  ],
};
const reefknightHit: Sprite = {
  w: 20,
  h: 17,
  palette: reefknightPalette,
  frames: [
    [
      '....................',
      '....................',
      '.......eeee.........',
      '.....eewssse....eee.',
      '....ewssssdeeewssse.',
      '...ewwwsssdewsooodse',
      '...eeceessdewsooodde',
      '....eddddeewssooodde',
      '.....eeedewsssssddde',
      '...ee.esdewssdwsddde',
      '..ewseessdewsessddde',
      '..esdesssddeeddddee.',
      '...eeeesssdeeeeee...',
      '......esddeesde.....',
      '.....esdde..esde....',
      '....essdde..essdde..',
      '....eeeeee..eeeeee..',
    ],
  ],
};

// Grumbol (water, size 3, 20x17)
// A scarred bull sea-elephant rises on thick front flippers, a huge drooping
// snout beside its pale throat and a low fluked tail.
const grumbolPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, s: COLORS.skin, g: COLORS.gray, w: COLORS.white };
const grumbolIdle: Sprite = {
  w: 20,
  h: 17,
  palette: grumbolPalette,
  frames: [
    [
      '.....eeeee..........',
      '...eeggbbbe.........',
      '..eeeeebbbbe........',
      '..eeeeebbbbe........',
      '.eegweebbbmme.......',
      'ebbbbgebbbmme.......',
      'ebsbbebssbbmme......',
      'ebbbbebsssbgme......',
      'ebbbmebsssbgbme.....',
      '.emmmebbssbbbmme....',
      '..eeebbbssbbbmme....',
      '....ebbbssbbbbbme...',
      '...egbebbmbbbbbmme..',
      '...ebbebbmebbbbmmme.',
      '...ebbebbmmebmmmmeee',
      '...ebbembbmeemmmbbee',
      '...eeeeeeee.eeeee.ee',
    ],
    [
      '.....eeeee..........',
      '...eeggbbbe.........',
      '..eeeeebbbbe........',
      '..eeeeebbbbe........',
      '.eegweebbbmme.......',
      'ebbbbgebbbmme.......',
      'ebsbbebssbbmme......',
      'ebbbbebsssbgme......',
      'ebbbmebsssbgmbme....',
      '.emmmebbsssbbbmme...',
      '..eeebbbsssbbmme....',
      '....ebbbssbbbbbme...',
      '...egbebbmbbbbbmme..',
      '...ebbebbmebbbbmmme.',
      '...ebbebbmmebmmmmeee',
      '...ebbembbmeemmmbbee',
      '...eeeeeeee.eeeee.ee',
    ],
  ],
};
const grumbolHit: Sprite = {
  w: 20,
  h: 17,
  palette: grumbolPalette,
  frames: [
    [
      '....................',
      '......eeeee.........',
      '....eeggbbbe........',
      '...eeeeebbbbe.......',
      '...eeeeebbbbe.......',
      '...eeeeeebbmme......',
      '..ebbeeebbmmme......',
      '.ebsbbebssbbmme.....',
      '.ebbbbebsssbgme.....',
      '.ebbbmebsssbmbme....',
      '..emmmebbssbbmme....',
      '...eeebbssbbbbbme...',
      '....egbembbbbbbme...',
      '....ebbembebbbbmmme.',
      '....ebbebmmebmmmmeee',
      '....ebbebbmeemmmebbe',
      '....eeeeeee.eeeee.ee',
    ],
  ],
};

// Vorrow (water, size 3, 20x17)
// A left-hooking living wave grips a splintered plank between foam claws,
// glaring above a six-pixel foam foot.
const vorrowPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, b: COLORS.blue, g: COLORS.gray, w: COLORS.white };
const vorrowIdle: Sprite = {
  w: 20,
  h: 17,
  palette: vorrowPalette,
  frames: [
    [
      '.e.e................',
      'eggee.eeeeeeee......',
      '.eggeewwwwwwbbe.....',
      '..eggwwbbbbbbnne....',
      '...eggeeeebbbbnne...',
      '...eggewwbbbbbnne...',
      '....eggwwbbbbbnne...',
      '.....eeeeewwbwwbnne.',
      '.........eeebeebnne.',
      '.........ewbbbbbnne.',
      '.........ebeeebbnne.',
      '.........ebbbbbnne..',
      '.........ewbbbbnne..',
      '.........ewbbbnnne..',
      '........eewwbbbnnee.',
      '.........ewwwwwwe...',
      '..........wwwwww....',
    ],
    [
      '.e.e................',
      'eggee.eeeeeeee......',
      '.eggeewwwwwbbbe.....',
      '..eggwwwbbbbbnne....',
      '...eggeeeebbbbnne...',
      '...eggewwbbbbbnne...',
      '....eggwwbbbbbnne...',
      '.....eeeeewwbwwbnne.',
      '.........eeebeebnne.',
      '.........ewbbbbbnne.',
      '.........ebeeebbnne.',
      '.........ebbbbbbnne.',
      '.........ewbbbbbnne.',
      '.........ewbbbnnne..',
      '........eewwbbbnee..',
      '.........ewwwwwwe...',
      '..........wwwwww....',
    ],
  ],
};
const vorrowHit: Sprite = {
  w: 20,
  h: 17,
  palette: vorrowPalette,
  frames: [
    [
      '....................',
      '....................',
      '..e.e...............',
      '.eggee.eeeeeeee.....',
      '..eggeewwwwwwbbe....',
      '...eggwwbbbbbbnne...',
      '....eggeeeebbbbnne..',
      '....eggewwbbbbbnne..',
      '.....eggwwbbbbbnne..',
      '......eeeeewwbwwbnne',
      '..........eebbbebnne',
      '..........ebebebbnne',
      '..........ebbeebbnne',
      '..........ewbbbnnne.',
      '.........eewwbbbnnee',
      '..........ewwwwwwe..',
      '...........wwwwww...',
    ],
  ],
};

// Rainheron (water, size 3, 20x17)
// A left-pointing storm heron wears a broad drooping feather cloak beneath
// its cocked S-neck, ring eye and hooked plume, balancing on one leg beside
// a tucked knee.
const rainheronPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, t: COLORS.steel, b: COLORS.blue, y: COLORS.yellow, w: COLORS.white };
const rainheronIdle: Sprite = {
  w: 20,
  h: 17,
  palette: rainheronPalette,
  frames: [
    [
      '............ee......',
      '.......eeeee.se.....',
      '......ewwwwsee......',
      '.....ewyyywsse......',
      'eeeeeeeyeysse.......',
      '.esssssyyysse.......',
      '..eeeeeeewsse.......',
      '........ewsseeee....',
      '.......ewssewtsse...',
      '.....eeewsewsttbse..',
      '....ewttsewsttbssse.',
      '....ettsewsttbsssse.',
      '....etsesstsbssesse.',
      '.....eeesseesseee...',
      '.........esse.esye..',
      '..........ee........',
      '.........eee........',
    ],
    [
      '....................',
      '.......eeeee.ee.....',
      '......ewwwwseee.....',
      '.....ewyyywsse......',
      'eeeeeeeyeysse.......',
      '.esssssyyysse.......',
      '..eeeeeeewsse.......',
      '........ewsseeee....',
      '.......ewssewtsse...',
      '.....eeewsewsttbse..',
      '....ewttsswsttbssse.',
      '....ettswwsttbsssse.',
      '....etsesstsbssesse.',
      '.....eeesseesseee...',
      '.........esse.e..e..',
      '..........ee........',
      '.........eee........',
    ],
  ],
};
const rainheronHit: Sprite = {
  w: 20,
  h: 17,
  palette: rainheronPalette,
  frames: [
    [
      '....................',
      '.............ee.....',
      '.........eeeeese....',
      '........ewwwwse.....',
      '......eewyeeese.....',
      '.eeeeeesyeyyse......',
      '..esssssyyysse......',
      '...eeeeeeewsseee....',
      '.........ewsestse...',
      '.......eeewswsttse..',
      '.....eettsswsttssse.',
      '.....ettsewsttsssse.',
      '.....etsesstsbssese.',
      '......eeesseesseee..',
      '..........esseeyye..',
      '...........ee.......',
      '..........eee.......',
    ],
  ],
};

// Clubprawn (water, size 3, 20x17)
// Three broad green carapace bands ride on three paired leg plates, with
// inset forward eyes, an orange face plate, and a low cyan-highlighted club
// projecting left.
const clubprawnPalette: Record<string, string> = { e: COLORS.void, f: COLORS.forest, g: COLORS.green, c: COLORS.cyan, o: COLORS.orange, w: COLORS.white };
const clubprawnIdle: Sprite = {
  w: 20,
  h: 17,
  palette: clubprawnPalette,
  frames: [
    [
      '....................',
      '....................',
      '....................',
      '.......eeeeeeeeeee..',
      '.....eegcccggggfffe.',
      '....egggggggfffffffe',
      '...eeeeeeeeeeeeeeee.',
      '...ewewegggggggfffe.',
      '...eoooegcccgggffffe',
      '...eeoegggggfffffffe',
      '.eee.eeeeeeeeeeeeee.',
      'eccge.eggggggggfffe.',
      'egggeffffegggffffffe',
      '.eeeeeeeeeeeeeeeeee.',
      '......gf...gf...gf..',
      '......fe...fe...fe..',
      '......ee...ee...ee..',
    ],
    [
      '....................',
      '....................',
      '....................',
      '........eeeeeeeeee..',
      '.....eeggcccgggfffe.',
      '....eggggggggffffffe',
      '...eeeeeeeeeeeeeeee.',
      '...ewewegggggggfffe.',
      '...eoooegcccgggffffe',
      '...eeoegggggfffffffe',
      '.eee.eeeeeeeeeeeeee.',
      'eccge.eggggggggfffe.',
      'egggeffffegggffffffe',
      '.eeeeeeeeeeeeeeeeee.',
      '......gf...gf...gf..',
      '......fe...fe...fe..',
      '......ee...ee...ee..',
    ],
  ],
};
const clubprawnHit: Sprite = {
  w: 20,
  h: 17,
  palette: clubprawnPalette,
  frames: [
    [
      '....................',
      '....................',
      '....................',
      '....................',
      '........eeeeeeeeeee.',
      '......eegcccgggffffe',
      '.....eeeeeeeeeeeeee.',
      '....eweggggggggfffe.',
      '....eeoegcccgggffffe',
      '....eoegggggfffffffe',
      '...eee.eeeeeeeeeeee.',
      '..eccge.eggggggfffe.',
      '..egggefffegggfffffe',
      '...eeeeeeeeeeeeeeee.',
      '.......gf...gf...gf.',
      '.......fe...fe...fe.',
      '.......ee...ee...ee.',
    ],
  ],
};

// Kelpwarden (water, size 3, 20x17)
// A left-facing domed kelp sentry with a pale face plate, yellow slit eyes
// and dark slot mouth, four broad cut fronds, and two freely hanging hooked
// arms.
const kelpwardenPalette: Record<string, string> = { e: COLORS.void, f: COLORS.forest, g: COLORS.green, b: COLORS.brown, y: COLORS.yellow, c: COLORS.cyan, w: COLORS.white };
const kelpwardenIdle: Sprite = {
  w: 20,
  h: 17,
  palette: kelpwardenPalette,
  frames: [
    [
      '......eeeeeeee......',
      '....eegggggggfee....',
      '...egccggggggfffe...',
      '..egccgggggggffffe..',
      '..egwywywegggfffe...',
      '..egwywywegggfffe...',
      '..egweeewggggfffe...',
      '.egeeggggggfffeege..',
      'egge.egggggfffe.ege.',
      'egfe.egggggfffe.ege.',
      'egfe.egggggfffe.ege.',
      'egggeegggggfffeggge.',
      '.eee.egggggfffeeee..',
      '..egggegggegggeggge.',
      '..eggeeggeeffeeffee.',
      '..eggeeffeeffeeffee.',
      '..eeee.eee.eee.eee..',
    ],
    [
      '......eeeeeeee......',
      '....eegggggggfee....',
      '...egccggggggfffe...',
      '..egccgggggggffffe..',
      '..egwywywegggfffe...',
      '..egwywywegggfffe...',
      '..egweeewggggfffe...',
      '.egeeggggggfffeege..',
      'egge.egggggfffe.ege.',
      'egfe.egggggfffe.ege.',
      'egge.egggggfffe.egfe',
      '.eggeegggggfffegegge',
      '..eeeegggggfffeeee..',
      '..egggegggegggeggge.',
      '..eggeeggeeffeeffee.',
      '..eggeeffeeffeeffee.',
      '..eeee.eee.eee.eee..',
    ],
  ],
};
const kelpwardenHit: Sprite = {
  w: 20,
  h: 17,
  palette: kelpwardenPalette,
  frames: [
    [
      '....................',
      '........eeeeeeee....',
      '......eeggggggffee..',
      '.....egccgggggffffe.',
      '....egccggggggfffe..',
      '....egweweweggfffe..',
      '....egweweweggfffe..',
      '....egweeewgggfffe..',
      '...egeegggggfffeee..',
      '..egge.eggggfffe.ege',
      '..egfe.eggggfffe.ege',
      '..egggeeggggfffeggge',
      '...eeeegggggfffeeee.',
      '...egggegggegggeggge',
      '...eggeeggeeffeeffee',
      '...eggeeffeeffeeffee',
      '...eeee.eee.eee.eee.',
    ],
  ],
};

/** The 20 generated water-type species, keyed by species id. */
export const waterSprites = {
  lumibel: { idle: lumibelIdle, hit: lumibelHit },
  sopwit: { idle: sopwitIdle, hit: sopwitHit },
  snipclaw: { idle: snipclawIdle, hit: snipclawHit },
  vespril: { idle: vesprilIdle, hit: vesprilHit },
  murkin: { idle: murkinIdle, hit: murkinHit },
  foamcap: { idle: foamcapIdle, hit: foamcapHit },
  gulpwick: { idle: gulpwickIdle, hit: gulpwickHit },
  brammel: { idle: brammelIdle, hit: brammelHit },
  conchguard: { idle: conchguardIdle, hit: conchguardHit },
  bellbuoy: { idle: bellbuoyIdle, hit: bellbuoyHit },
  quintel: { idle: quintelIdle, hit: quintelHit },
  pondstrider: { idle: pondstriderIdle, hit: pondstriderHit },
  slushmaw: { idle: slushmawIdle, hit: slushmawHit },
  kraulk: { idle: kraulkIdle, hit: kraulkHit },
  reefknight: { idle: reefknightIdle, hit: reefknightHit },
  grumbol: { idle: grumbolIdle, hit: grumbolHit },
  vorrow: { idle: vorrowIdle, hit: vorrowHit },
  rainheron: { idle: rainheronIdle, hit: rainheronHit },
  clubprawn: { idle: clubprawnIdle, hit: clubprawnHit },
  kelpwarden: { idle: kelpwardenIdle, hit: kelpwardenHit },
} satisfies Record<string, SpeciesSprites>;
