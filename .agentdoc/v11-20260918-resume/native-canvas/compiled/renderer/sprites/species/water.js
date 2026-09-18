"use strict";
// GENERATED ART — water-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.
Object.defineProperty(exports, "__esModule", { value: true });
exports.waterSprites = void 0;
const palette_js_1 = require("../palette.js");
// Lumibel (water, size 1, 15x11)
// A left-looking bell jellyfish has a straight flared lampshade, twin cyan
// eyes, a yellow brim and four long ribbon tentacles resting on the ground.
const lumibelPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, b: palette_js_1.COLORS.blue, c: palette_js_1.COLORS.cyan, y: palette_js_1.COLORS.yellow };
const lumibelIdle = {
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
const lumibelHit = {
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
const sopwitPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, b: palette_js_1.COLORS.blue, p: palette_js_1.COLORS.skin, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const sopwitIdle = {
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
const sopwitHit = {
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
const snipclawPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, r: palette_js_1.COLORS.red, o: palette_js_1.COLORS.orange, b: palette_js_1.COLORS.blue, w: palette_js_1.COLORS.white };
const snipclawIdle = {
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
const snipclawHit = {
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
const vesprilPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, t: palette_js_1.COLORS.steel, b: palette_js_1.COLORS.blue, c: palette_js_1.COLORS.cyan, p: palette_js_1.COLORS.skin, w: palette_js_1.COLORS.white };
const vesprilIdle = {
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
const vesprilHit = {
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
const murkinPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, g: palette_js_1.COLORS.gray, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon };
const murkinIdle = {
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
const murkinHit = {
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
const foamcapPalette = { e: palette_js_1.COLORS.void, f: palette_js_1.COLORS.forest, g: palette_js_1.COLORS.green, s: palette_js_1.COLORS.gray, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const foamcapIdle = {
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
const foamcapHit = {
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
const gulpwickPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, b: palette_js_1.COLORS.blue, s: palette_js_1.COLORS.steel, m: palette_js_1.COLORS.maroon, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white };
const gulpwickIdle = {
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
const gulpwickHit = {
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
const brammelPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, s: palette_js_1.COLORS.skin, o: palette_js_1.COLORS.orange, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const brammelIdle = {
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
const brammelHit = {
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
const conchguardPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, o: palette_js_1.COLORS.orange, p: palette_js_1.COLORS.skin, u: palette_js_1.COLORS.blue, w: palette_js_1.COLORS.white };
const conchguardIdle = {
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
const conchguardHit = {
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
const bellbuoyPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, r: palette_js_1.COLORS.red, g: palette_js_1.COLORS.gray, s: palette_js_1.COLORS.steel, w: palette_js_1.COLORS.white };
const bellbuoyIdle = {
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
const bellbuoyHit = {
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
const quintelPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, o: palette_js_1.COLORS.orange, y: palette_js_1.COLORS.yellow, s: palette_js_1.COLORS.skin, w: palette_js_1.COLORS.white };
const quintelIdle = {
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
const quintelHit = {
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
const pondstriderPalette = { e: palette_js_1.COLORS.void, f: palette_js_1.COLORS.forest, g: palette_js_1.COLORS.green, b: palette_js_1.COLORS.brown, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const pondstriderIdle = {
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
const pondstriderHit = {
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
const slushmawPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, g: palette_js_1.COLORS.gray, b: palette_js_1.COLORS.blue, r: palette_js_1.COLORS.brown, w: palette_js_1.COLORS.white };
const slushmawIdle = {
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
const slushmawHit = {
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
const kraulkPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, n: palette_js_1.COLORS.navy, s: palette_js_1.COLORS.skin, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray };
const kraulkIdle = {
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
const kraulkHit = {
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
const reefknightPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.steel, d: palette_js_1.COLORS.slate, o: palette_js_1.COLORS.orange, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const reefknightIdle = {
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
const reefknightHit = {
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
const grumbolPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon, s: palette_js_1.COLORS.skin, g: palette_js_1.COLORS.gray, w: palette_js_1.COLORS.white };
const grumbolIdle = {
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
const grumbolHit = {
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
const vorrowPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, b: palette_js_1.COLORS.blue, g: palette_js_1.COLORS.gray, w: palette_js_1.COLORS.white };
const vorrowIdle = {
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
const vorrowHit = {
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
const rainheronPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, t: palette_js_1.COLORS.steel, b: palette_js_1.COLORS.blue, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white };
const rainheronIdle = {
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
const rainheronHit = {
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
const clubprawnPalette = { e: palette_js_1.COLORS.void, f: palette_js_1.COLORS.forest, g: palette_js_1.COLORS.green, c: palette_js_1.COLORS.cyan, o: palette_js_1.COLORS.orange, w: palette_js_1.COLORS.white };
const clubprawnIdle = {
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
const clubprawnHit = {
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
const kelpwardenPalette = { e: palette_js_1.COLORS.void, f: palette_js_1.COLORS.forest, g: palette_js_1.COLORS.green, b: palette_js_1.COLORS.brown, y: palette_js_1.COLORS.yellow, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const kelpwardenIdle = {
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
const kelpwardenHit = {
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
exports.waterSprites = {
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
};
