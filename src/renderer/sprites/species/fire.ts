// GENERATED ART — fire-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.

import { COLORS } from '../palette.js';
import type { Sprite } from '../sprite.js';
import type { SpeciesSprites } from '../monsters.js';

// Brimhide (fire, size 3, 20x17)
// A left-slouching furnace bear with three jagged shoulder stones, blunt
// claws, and a slag wedge holding its glowing jaw open.
const brimhidePalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, b: COLORS.brown, r: COLORS.red, o: COLORS.orange, y: COLORS.yellow };
const brimhideIdle: Sprite = {
  w: 20,
  h: 17,
  palette: brimhidePalette,
  frames: [
    [
      '...........e........',
      '...eee....ebe..e....',
      '..eobbe...ebeeebe.e.',
      '..eobbeeeebbbebbeebe',
      '.eoorrrrreebbbbbebbe',
      'erryeeeryrrebbbbrme.',
      'erooobbbrrrreerrrmme',
      'eeeoyybberrrrorrmmme',
      '.eoyybeerrrrooorrmme',
      '..ebbberrreroorrmmme',
      '...eeerrrreorroormme',
      '....erorreroormmrmme',
      '...eroooreermmmrrmme',
      '...erooorme.mmerrrme',
      '...errrmmme..errmme.',
      '..ebbbrbmme..ebbrrme',
      '..eeeeeeee...eeeeee.',
    ],
    [
      '...........e........',
      '...eee....ebe..e....',
      '..eobbe...ebeeebe.e.',
      '..eobbeeeebbbebbeebe',
      '.eoorrrrreebbbbbebbe',
      'erryeeeryrrebbbbrme.',
      'erooobbbrrrreerrrmme',
      'eeeoyybberrrrorrmmme',
      '.eoyybeerrrrooorrrme',
      '..ebbberrrerooorrmme',
      '...eeerrrreorroormme',
      '....erorreroormmrmme',
      '..eoroooreermmmrrmme',
      '..eoroorrme.mmerrrme',
      '...errrmmme..errmme.',
      '..ebbbrbmme..ebbrrme',
      '..eeeeeeee...eeeeee.',
    ],
  ],
};
const brimhideHit: Sprite = {
  w: 20,
  h: 17,
  palette: brimhidePalette,
  frames: [
    [
      '....................',
      '....................',
      '............e.......',
      '.....eee...ebe..e...',
      '....eobbe..ebeeebe.e',
      '...eobbeeeebbbebbeee',
      '..errreerrreebbbbbbe',
      '.erooeerrrrrreerrmme',
      '.eeeoyybberrrrorrmme',
      '..eoyybeerrrrooormme',
      '...ebbberrrerooormme',
      '....eeerrrreorrormme',
      '.....eroorreermmrmme',
      '....eroorrme.merrmme',
      '....errrmmme..errme.',
      '...ebbbrbmme.ebbrrme',
      '...eeeeeeeee.eeeeee.',
    ],
  ],
};

// Anvilclaw (fire, size 3, 20x16)
// A low maroon crab leans its stalk eyes left over a chomping mouth and a
// massive anvil claw with a three-pixel white-hot tip fading through orange.
const anvilclawPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, r: COLORS.red, w: COLORS.white, o: COLORS.orange, s: COLORS.steel };
const anvilclawIdle: Sprite = {
  w: 20,
  h: 16,
  palette: anvilclawPalette,
  frames: [
    [
      '....................',
      '....................',
      '.........ee..ee.....',
      '........ewweewwe....',
      '........eeemeeem....',
      '.........eme.eme....',
      '.eeeeeeeeemeemmeee..',
      '.ewwwoorrmeessrrrmme',
      '.eeemmmeeeerremmmrme',
      '...emme..ewemmmmmmme',
      '.eerrmme.eeemmmmmeee',
      '.emmmmmeeemmmemmeere',
      '..eeeee.erremeeme.ee',
      '........eme.eme.eme.',
      '.......ere..eme..eme',
      '......eee...eee..eee',
    ],
    [
      '....................',
      '....................',
      '....................',
      '.........ee..ee.....',
      '........ewweewwe....',
      '........eeemeeem....',
      '.eeeeeeeeemeemmeee..',
      '.ewwwoorrmeessrrrmme',
      '.eeemmmeeeerremmmrme',
      '...emme..ewemmmmmmme',
      '.eerrmme.eeemmmmmeee',
      '.emmmmmeeemmmemmeere',
      '..eeeee.erremeeme.ee',
      '........eme.eme.eme.',
      '.......ere..eme..eme',
      '......eee...eee..eee',
    ],
  ],
};
const anvilclawHit: Sprite = {
  w: 20,
  h: 16,
  palette: anvilclawPalette,
  frames: [
    [
      '....................',
      '....................',
      '....................',
      '....................',
      '...........ee..ee...',
      '..........eemeeme...',
      '..........emeeme....',
      '...eeeeeeeemeemmeee.',
      '..ewwwoorrmerrssrmme',
      '...eeemmmeeeremmmrme',
      '.....emme..eemmmmmee',
      '...eerrmmeeeemmmmmee',
      '...emmmmmeeemememe.e',
      '....eeeee.emeeme.eme',
      '.........eme.eme.eme',
      '........eee..eee.eee',
    ],
  ],
};

// Ashtusk (fire, size 3, 20x17)
// A low-headed volcanic tusker carries a tall ash-grey rump on pillar legs,
// with a curled trunk and two immense forward-hooking white glass tusks.
const ashtuskPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, m: COLORS.maroon, o: COLORS.orange, w: COLORS.white };
const ashtuskIdle: Sprite = {
  w: 20,
  h: 17,
  palette: ashtuskPalette,
  frames: [
    [
      '.............eeee...',
      '...........eegggge..',
      '.........eeggggggge.',
      '........eggggggggsse',
      '.......eggggggggssse',
      '...ee.eegggggggsssse',
      'e..eweggggggggssssse',
      'eweewesggggggssssse.',
      'eweseweggggssmssmsse',
      'ewesgoewwwessmommsse',
      '.ewessseeeesssmssse.',
      '..ewwessssewessssse.',
      '...eewwwwwweesessse.',
      '...eseeeeeessesssse.',
      '..esse.ge.ese.esgse.',
      '..eeee.ogeese.esgse.',
      '.......eeeeee.eeeee.',
    ],
    [
      '.............eeee...',
      '...........eegggge..',
      '.........eeggggggge.',
      '........egggggggggse',
      '.......egggggggggsse',
      '...ee.eegggggggsssse',
      'e..eweggggggggssssse',
      'eweewesggggggssssse.',
      'eweseweggggssmssmsse',
      'ewesgoewwwessmommsse',
      '.ewessseeeesssmssse.',
      '..ewwessssewessssse.',
      '...eewwwwwweesessse.',
      '...eseeeeeessesssse.',
      '...ese.ge.ese.esgse.',
      '...eee.ogeese.esgse.',
      '.......eeeeee.eeeee.',
    ],
  ],
};
const ashtuskHit: Sprite = {
  w: 20,
  h: 17,
  palette: ashtuskPalette,
  frames: [
    [
      '....................',
      '..............eeee..',
      '............eegggge.',
      '..........eeggggggge',
      '.........eggggggggse',
      '........eggggggggsse',
      '....ee.eeggggggsssse',
      '.e..ewegggggggsssse.',
      '.eweewesgggggssmmsse',
      '.ewesewegggsssmomse.',
      '.ewesgeewwwesssmse..',
      '..ewessseeeesssssse.',
      '...ewwesssewessssse.',
      '....eewwwwweesessse.',
      '....eseeeeese.esgse.',
      '...esseogeese.esgse.',
      '...eeeeeeeeee.eeeee.',
    ],
  ],
};

// Forgehulk (fire, size 3, 20x17)
// A headless iron furnace leans left on pillar feet, with slit eyes in its
// squat hood, a tall front chimney and a chest door swung wide left.
const forgehulkPalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, g: COLORS.gray, l: COLORS.slate, r: COLORS.red, o: COLORS.orange, y: COLORS.yellow };
const forgehulkIdle: Sprite = {
  w: 20,
  h: 17,
  palette: forgehulkPalette,
  frames: [
    [
      '...eeeee............',
      '...eslse............',
      '...eglge............',
      '...eglge............',
      '..eeslgeeeeeeee.....',
      '.essssssssggglle....',
      '.egyyegyyeglllle....',
      '..eeeeeeeeeeeeee....',
      '.eeeegeyyyyorgele...',
      'esgggeeyyyorllle....',
      'esllgeeyyoorelle....',
      'egllgeeyoorrelle....',
      '.eglgeerroreegle....',
      '..eggeeeeeelllle....',
      '...eeeeeeeeeeeee....',
      '.....egge..egle.....',
      '.....eeee..eeee.....',
    ],
    [
      '...eeeee............',
      '...eslse............',
      '...eglge............',
      '...eglge............',
      '..eeslgeeeeeeee.....',
      '.esssssssgggglle....',
      '.egyyegyyeglllle....',
      '..eeeeeeeeeeeeee....',
      '.eeeegeyyyorgele....',
      'esgggeeyyyyrllle....',
      'esllgeeyooorelle....',
      'egllgeeyyoorelle....',
      '.eglgeerooreegle....',
      '..eggeeeeeelllle....',
      '...eeeeeeeeeeeee....',
      '.....egge..egle.....',
      '.....eeee..eeee.....',
    ],
  ],
};
const forgehulkHit: Sprite = {
  w: 20,
  h: 17,
  palette: forgehulkPalette,
  frames: [
    [
      '....................',
      '.....eeeee..........',
      '.....eslse..........',
      '.....eglge..........',
      '....eeslgeeeeeeee...',
      '...essssssssggglle..',
      '...egeeegeeeglllle..',
      '....eeeeeeeeeeeeee..',
      '...eeeegeyyorgele...',
      '..esgggeeyyorllle...',
      '..esllgeeyoorelle...',
      '..egllgeeoorrelle...',
      '...eglgeerroregle...',
      '....eggeeeellllle...',
      '.....eeeeeeeeeeee...',
      '......egge..egle....',
      '......eeee..eeee....',
    ],
  ],
};

// Bristlehog (fire, size 1, 15x11)
// A low left-facing ash-boar with four braced hooves, three broad bristles
// and a coal-lit iron snout.
const bristlehogPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, b: COLORS.brown, s: COLORS.slate, o: COLORS.orange, y: COLORS.yellow, w: COLORS.white };
const bristlehogIdle: Sprite = {
  w: 15,
  h: 11,
  palette: bristlehogPalette,
  frames: [
    [
      '......ee.ee.ee.',
      '......eoeeoeeoe',
      '....eessssssse.',
      '...ebbbssssssse',
      '..ebwessssssmse',
      '.ebbeesssssmme.',
      'eeeobbbsssssme.',
      'eyeyeobbbssmme.',
      'eeeeeommmeemmee',
      '...eseese.esee.',
      '...ee.ee..ee.ee',
    ],
    [
      '......ee.ee.ee.',
      '......eseeseese',
      '....eessssssse.',
      '...ebbbssssssse',
      '..ebwessssssmse',
      '.ebbeesssssmmee',
      'eeeobbbsssssmse',
      'eyeyeobbbssmme.',
      'eeeeeommmeemmee',
      '...eseese.esee.',
      '...ee.ee..ee.ee',
    ],
  ],
};
const bristlehogHit: Sprite = {
  w: 15,
  h: 11,
  palette: bristlehogPalette,
  frames: [
    [
      '...............',
      '.......ee.ee.ee',
      '.......eseeseee',
      '.....eesssssse.',
      '....ebbssssssse',
      '...ebebsssssmse',
      '..ebbeessssmmme',
      '.eeeobbbsssssme',
      '.eoeyeobbbssmme',
      '.eeeeemmeeemmee',
      '....ee.ee.ee.ee',
    ],
  ],
};

// Matchling (fire, size 1, 15x11)
// A left-leaning match with a six-wide red head and one teardrop flame
// carries its tiny scorched face on a brown shaft, with uneven arm nubs and
// splayed feet.
const matchlingPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, s: COLORS.skin, r: COLORS.red, y: COLORS.yellow, w: COLORS.white };
const matchlingIdle: Sprite = {
  w: 15,
  h: 11,
  palette: matchlingPalette,
  frames: [
    [
      '.....e.........',
      '....eye........',
      '...eywye.......',
      '...errrre......',
      '...errrre......',
      '....essbe......',
      '..eeeesee......',
      '....eseseee....',
      '.....essbe.....',
      '.....ebbbe.....',
      '...eeee.eeee...',
    ],
    [
      '....e..........',
      '...eye.........',
      '...eywye.......',
      '...errrre......',
      '...errrre......',
      '....essbe......',
      '..eeeesee......',
      '....eseseee....',
      '.....essbe.....',
      '.....ebbbe.....',
      '...eeee.eeee...',
    ],
  ],
};
const matchlingHit: Sprite = {
  w: 15,
  h: 11,
  palette: matchlingPalette,
  frames: [
    [
      '...............',
      '........e......',
      '.......eye.....',
      '......eywye....',
      '.....errrre....',
      '.....errrre....',
      '......essbe....',
      '....eeeeseee...',
      '......eseseee..',
      '......ebbbe....',
      '....eeee.eeee..',
    ],
  ],
};

// Wickmoth (fire, size 1, 15x11)
// A grounded ash moth has a glossy left-facing eye, fuzzy thorax, a narrow
// upright folded wing, and two long candle-wick antennae with yellow bead
// tips.
const wickmothPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, g: COLORS.gray, o: COLORS.orange, y: COLORS.yellow, w: COLORS.white };
const wickmothIdle: Sprite = {
  w: 15,
  h: 11,
  palette: wickmothPalette,
  frames: [
    [
      '..yy...yy......',
      '...b....b..ee..',
      '...b....b.eoge.',
      '...b....beowge.',
      '..eeeee..eogbe.',
      '.ewyee.egeogbe.',
      '.eeyeebggeogbe.',
      '..ebbbggbeogbe.',
      '...eegbbeogbbe.',
      '.....ebeeeeee..',
      '....eee..eee...',
    ],
    [
      '.yy...yy.......',
      '..b....b...ee..',
      '..b....b..eoge.',
      '...b....beowge.',
      '..eeeee..eogbe.',
      '.ewyee.egeogbe.',
      '.eeyeebggeogbe.',
      '..ebbbggbeogbe.',
      '...eegbgbogbbe.',
      '.....ebeeeeee..',
      '....eee..eee...',
    ],
  ],
};
const wickmothHit: Sprite = {
  w: 15,
  h: 11,
  palette: wickmothPalette,
  frames: [
    [
      '...............',
      '....yy...yy....',
      '.....b....b.ee.',
      '.....b....beoge',
      '.....b....eowge',
      '....eeeee.eogbe',
      '...eeeeebgeogbe',
      '...eeyebbgeogbe',
      '....ebggbeogbe.',
      '.....ebbeeeeee.',
      '.....eee..eee..',
    ],
  ],
};

// Emberwren (fire, size 1, 15x11)
// A tiny left-pointing fire wren balances its bright eye and needle beak
// with two swept flame crests and a short fan of ember tail feathers.
const emberwrenPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, r: COLORS.red, o: COLORS.orange, w: COLORS.white };
const emberwrenIdle: Sprite = {
  w: 15,
  h: 11,
  palette: emberwrenPalette,
  frames: [
    [
      '.......ee......',
      '......eoe.ee...',
      '.....eoreeroe..',
      '...eeorroree...',
      '..eweorrrre....',
      'eeoeeorrmrree.e',
      '.eeorrrmmrreore',
      '..errrmmmeorore',
      '...emmmmmeeee..',
      '....e..e.......',
      '...ee..ee......',
    ],
    [
      '.......ee......',
      '......eoe..ee..',
      '.....eoreeore..',
      '...eeorrroee...',
      '..eweorrrre....',
      'eeoeeorrmrree.e',
      '.eeorrrmmrreore',
      '..errrmmmeorore',
      '...emmmmmeeee..',
      '....e..e.......',
      '...ee..ee......',
    ],
  ],
};
const emberwrenHit: Sprite = {
  w: 15,
  h: 11,
  palette: emberwrenPalette,
  frames: [
    [
      '...............',
      '........ee.....',
      '.......eoe.ee..',
      '......eoreeroe.',
      '....eeorroree..',
      '...eeeorrrree..',
      '.eeoeeorrmrreee',
      '..eeorrrmmrrore',
      '....emmmmmeeee.',
      '.....e..e......',
      '....ee..ee.....',
    ],
  ],
};

// Sootcap (fire, size 1, 15x11)
// A left-tilted ember-speckled charcoal toadstool with two chipped cap
// notches, glowing gills and a bright little stem face.
const sootcapPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, m: COLORS.maroon, o: COLORS.orange, k: COLORS.skin, y: COLORS.yellow };
const sootcapIdle: Sprite = {
  w: 15,
  h: 11,
  palette: sootcapPalette,
  frames: [
    [
      '..eee.ee.eee...',
      '.esssesseosse..',
      'essossssmesoe..',
      'essssmssmmmmme.',
      'eyyyyyoooomme..',
      '.eeeekkoeeee...',
      '....ekkome.....',
      '..ekekkekme....',
      '..ekkeekkme....',
      '....ekkkme.....',
      '...eekeekee....',
    ],
    [
      '..eee.ee.eee...',
      '.esssesseosse..',
      'esyossssmeooe..',
      'essssmssmmmmme.',
      'eyyyyyyooomme..',
      '.eeeekkoeeee...',
      '....ekkome.....',
      '..ekekkekme....',
      '..ekkeekkme....',
      '....ekkkmme....',
      '...eekeeekee...',
    ],
  ],
};
const sootcapHit: Sprite = {
  w: 15,
  h: 11,
  palette: sootcapPalette,
  frames: [
    [
      '...............',
      '.....eee..ee...',
      '...eessoeeosee.',
      '..essossssmesoe',
      '..essssmssmmmme',
      '..eyyyyyoooomme',
      '...eeekkoeeeee.',
      '.....ekkkkme...',
      '....ekeekeekme.',
      '....ekkkeekkme.',
      '....eekeeekee..',
    ],
  ],
};

// Steamfin (fire, size 1, 15x11)
// An upright red spring fish balances on its splayed tail, pouting left as
// two back vents burn with attached white-hot jets.
const steamfinPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, r: COLORS.red, o: COLORS.orange, y: COLORS.yellow, w: COLORS.white };
const steamfinIdle: Sprite = {
  w: 15,
  h: 11,
  palette: steamfinPalette,
  frames: [
    [
      '....eeeee...ee.',
      '...eooorre.eyye',
      '..eoyyorrreowwe',
      '.eoywwyrrmeowwe',
      '.eoyeeyrreeeee.',
      'eeoooyorrmeoyye',
      'eoeoooorrmeowwe',
      '.eeooorrmmeowwe',
      '...eerrmee.eee.',
      '....eome.......',
      '..eeooomee.....',
    ],
    [
      '....eeeee..eee.',
      '...eooorre.eyye',
      '..eoyyorrreowwe',
      '.eoywwyrrmeowwe',
      '.eoyeeyrreeeee.',
      'eeoooyorrmeoyye',
      'eoeoooorrmeowwe',
      '.eeooorrmmeowwe',
      '...eermee..eee.',
      '....eore.......',
      '..eeooomee.....',
    ],
  ],
};
const steamfinHit: Sprite = {
  w: 15,
  h: 11,
  palette: steamfinPalette,
  frames: [
    [
      '...............',
      '......eeeee.ee.',
      '.....eoorreoyye',
      '....eoyyrrmowwe',
      '...eoyeeyrmowwe',
      '...eoooyrrmeee.',
      '..eeoooorrmoyye',
      '..eoeoorrmmowwe',
      '...eeeorrmeowwe',
      '.....eome..eee.',
      '...eeooomee....',
    ],
  ],
};

// Kindletoad (fire, size 1, 15x11)
// A left-facing ember toad croaks through a wide slit above a hanging
// yellow-hot throat sac, with blunt brow horns and four braced feet.
const kindletoadPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, b: COLORS.brown, o: COLORS.orange, y: COLORS.yellow, w: COLORS.white };
const kindletoadIdle: Sprite = {
  w: 15,
  h: 11,
  palette: kindletoadPalette,
  frames: [
    [
      '....ee...ee....',
      '...eooe.eooe...',
      '..eywyoeywyoee.',
      '..eeyyoeeyyobbe',
      '.eoooyoooooobbe',
      'eeeeeeeooobbbbe',
      'ewyyyyeoeeebbe.',
      'eyyyyyeee.eebbe',
      '.eyyyoee...ebee',
      '.eoooee....ee.e',
      'eee..ee...ee.ee',
    ],
    [
      '....ee...ee....',
      '...eooe.eooe...',
      '..eywyoeywyoee.',
      '..eeyyoeeyyobbe',
      '.eoooyoooooobbe',
      'eeeeeeeooobbbbe',
      'ewyyyyeoeeebbe.',
      'eyyyyyeee.eebbe',
      'eyyyyoee...ebee',
      '.eoooee....ee.e',
      'eee..ee...ee.ee',
    ],
  ],
};
const kindletoadHit: Sprite = {
  w: 15,
  h: 11,
  palette: kindletoadPalette,
  frames: [
    [
      '...............',
      '.....ee...ee...',
      '....eooe.eooe..',
      '...eyyyoeyyyoee',
      '...eeeooeeoobbe',
      '..eooooyoooobbe',
      '.eeeeeeeoobbbbe',
      '.ewyyyyeeeeebbe',
      '..eyyyoee..ebee',
      '..eoooeee..ee.e',
      '.eee..ee..ee.ee',
    ],
  ],
};

// Flarecrow (fire, size 2, 17x14)
// A sagging left-facing sack scarecrow thrusts one straw arm forward while
// fire eats only its dropped right arm and the right crossbeam above a
// single wooden stake.
const flarecrowPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, y: COLORS.yellow, o: COLORS.orange, r: COLORS.red, s: COLORS.slate };
const flarecrowIdle: Sprite = {
  w: 17,
  h: 14,
  palette: flarecrowPalette,
  frames: [
    [
      '....eeeee........',
      '...ebbbbbe.......',
      '..ebbbeobbe......',
      '..eoebbebbe......',
      '..ebbbbbbe.......',
      '...eebbee.....e..',
      'eeeeesseeeee.eoe.',
      'eyybebbbbbbeyoyoe',
      'eyeeeessseeerrore',
      '.e...esssebeeroe.',
      '.....esse.beeoe..',
      '......ebbe..ee...',
      '......ebbe.......',
      '......ebbe.......',
    ],
    [
      '....eeeee........',
      '...ebbbbbe.......',
      '..ebbbeobbe......',
      '..eoebbebbe......',
      '..ebbbbbbe.......',
      '...eebbee......e.',
      'eeeeesseeeee.eoe.',
      'eyybebbbbbbeyoyoe',
      'eyeeeessseeerrore',
      '.e...esssebeeore.',
      '.....esse.beeoe..',
      '......ebbe..ee...',
      '......ebbe.......',
      '......ebbe.......',
    ],
  ],
};
const flarecrowHit: Sprite = {
  w: 17,
  h: 14,
  palette: flarecrowPalette,
  frames: [
    [
      '.................',
      '......eeeee......',
      '.....ebbbbbe.....',
      '....ebeeebbe.....',
      '....eoebebbe.....',
      '....ebbbbbbe.....',
      '.eeeeeebbee...e..',
      'eeyybebbbbbeyoyoe',
      '.eyeeessseeerrore',
      '..e..esssebeeore.',
      '.....esse.beeoe..',
      '......ebbe..ee...',
      '......ebbe.......',
      '......ebbe.......',
    ],
  ],
};

// Hearthmole (fire, size 2, 17x14)
// A left-facing forge mole braces beneath scorched back plates, its glowing
// blunt snout and chisel teeth above twin three-tined white-hot shovel
// claws.
const hearthmolePalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, g: COLORS.gray, s: COLORS.steel, o: COLORS.orange, w: COLORS.white };
const hearthmoleIdle: Sprite = {
  w: 17,
  h: 14,
  palette: hearthmolePalette,
  frames: [
    [
      '..........ee.....',
      '.......eeessee...',
      '...eeeebbgessge..',
      '..egbbbbeegbbgee.',
      '.eoobbeebbeeggge.',
      '.eooobbbbbegbbge.',
      '..ewwewweeesgggge',
      'wwesssewwessgge..',
      '.eesssseesssbge..',
      'wwesssewwessbbe..',
      '.eesssseesssbbge.',
      'wwesse.wwessbge..',
      '..eee...ebbgeebbe',
      '........eeee.eeee',
    ],
    [
      '.................',
      '.........eessee..',
      '...eeeebbbessge..',
      '..egbbbbeegbbgee.',
      '.eoobbeebbeeggge.',
      '.eooobbbbbegbbge.',
      '..ewwewweeesgggge',
      'wwesssewwessgge..',
      '.eesssseesssbge..',
      'wwesssewwessbbe..',
      '.eesssseessssbgge',
      'wwesse.wwessbge..',
      '..eee...ebbgeebbe',
      '........eeee.eeee',
    ],
  ],
};
const hearthmoleHit: Sprite = {
  w: 17,
  h: 14,
  palette: hearthmolePalette,
  frames: [
    [
      '.................',
      '.................',
      '..........eeee...',
      '.......eeesggee..',
      '.....eeebbgegbge.',
      '...eoobebebbeggge',
      '...eooebebbbebgge',
      '....ewwewweessgge',
      '..wwessewwesssbge',
      '...eessseesssbbge',
      '..wwessewwesssbge',
      '...eessseesssbbge',
      '..wwessewwesebbge',
      '....eeee..eeeeeee',
    ],
  ],
};

// Scorchbriar (fire, size 2, 17x14)
// A hunched knot of charred bramble on three root-legs has a left-facing
// ember hollow and four thick backward-raking thorns.
const scorchbriarPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, b: COLORS.brown, r: COLORS.red, o: COLORS.orange, y: COLORS.yellow };
const scorchbriarIdle: Sprite = {
  w: 17,
  h: 14,
  palette: scorchbriarPalette,
  frames: [
    [
      '.........e.......',
      '.......eese.e....',
      '.....eesse.ese...',
      '...eebssbeebse.e.',
      '..eyyoebssbsseese',
      '.eyyyyorebssbbse.',
      '.eyeyeorebsseese.',
      '.eyyyyorebssseese',
      '.eoeeoeebsbbssee.',
      '..erorerbsbsse...',
      '...eebsebbsbe....',
      '...ebe..ese.ebe..',
      '..ebe...ese..ebe.',
      '..eee...eee..eee.',
    ],
    [
      '.........e.......',
      '.......eese.e....',
      '.....eesse.ese...',
      '...eebssbeebse.e.',
      '..eyyoebssbsseese',
      '.eyyyyorebssbbse.',
      '.eyeyeorebsseese.',
      '.eyyyyorebssseese',
      '.eoeeoeebsbbssee.',
      '..erorerbsbsse...',
      '...eebsebbsbe....',
      '...ebe..ese.ebe..',
      '.ebbe...ese..ebe.',
      '.eeee...eee..eee.',
    ],
  ],
};
const scorchbriarHit: Sprite = {
  w: 17,
  h: 14,
  palette: scorchbriarPalette,
  frames: [
    [
      '.................',
      '.................',
      '...........e.....',
      '.........eese.e..',
      '.......eesse.ese.',
      '.....eebssbeebsee',
      '....eyyorebssbsee',
      '...eyeyorebsbsese',
      '...eyeyoebsbbssee',
      '...eeoeerbsbssse.',
      '.....eebssbsbe...',
      '....ebe.ese.ebe..',
      '...ebe..ese..ebe.',
      '...eee..eee..eee.',
    ],
  ],
};

// Kilnshell (fire, size 2, 17x14)
// A low-snouted pangolin walks on four stubby feet beneath raised kiln-brick
// scales with glowing seams and a dragging blunt tail.
const kilnshellPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, g: COLORS.gray, o: COLORS.orange, y: COLORS.yellow };
const kilnshellIdle: Sprite = {
  w: 17,
  h: 14,
  palette: kilnshellPalette,
  frames: [
    [
      '.................',
      '........ee.......',
      '.......egbe.ee...',
      '.....eegbbeegbe..',
      '....egbbeoybbbbe.',
      '....eommmeommmme.',
      '...eegbbbegbbbbe.',
      '..egbeommmeommme.',
      '.egyeeebbbebbbme.',
      '.egbbbeemmmebbme.',
      'egbbbembbbmmmbbee',
      '.eeeeemmmmbbbmmbe',
      '...ebbeebeebbeebe',
      '...eee.ee.eee.ee.',
    ],
    [
      '.................',
      '.................',
      '........ee..ee...',
      '.....eeegbeegbe..',
      '....egbbeoybbbbe.',
      '....eommmeommmme.',
      '...eegbbbegbbbbe.',
      '..egbeommmeommme.',
      '.egyeeebbbebbbme.',
      '.egbbbeemmmbbbme.',
      'egbbbembbbmmmbbee',
      '.eeeeemmmmbbbmmbe',
      '...ebbeebeebbeebe',
      '...eee.ee.eee.ee.',
    ],
  ],
};
const kilnshellHit: Sprite = {
  w: 17,
  h: 14,
  palette: kilnshellPalette,
  frames: [
    [
      '.................',
      '.................',
      '.........ee......',
      '........egbe.ee..',
      '......eegbbeegbe.',
      '.....egbbeoybbbbe',
      '.....eommmeommme.',
      '....eegbbbegbbbbe',
      '...egbeommmeommme',
      '..egeeebbbebbbme.',
      '.egbbbembbbmmmbee',
      '..eeeemmmmbbbmmbe',
      '....ebbeebebbeebe',
      '....eee.ee.eee.ee',
    ],
  ],
};

// Charspine (fire, size 2, 17x14)
// A coal centipede raises its red-eyed mandible head three rows above a low
// three-segment body, molten joints glowing above exactly three square
// planted legs.
const charspinePalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, m: COLORS.maroon, r: COLORS.red, o: COLORS.orange };
const charspineIdle: Sprite = {
  w: 17,
  h: 14,
  palette: charspinePalette,
  frames: [
    [
      '.................',
      '.................',
      '.................',
      '.eeee............',
      '.egggse..........',
      'esrsrse..........',
      'esgssse.eeee.eeee',
      'eeesseegsssegssse',
      '.emesroosssroosse',
      '.e.esrrosssrrosse',
      '...eesseeesseeese',
      '..emmee.emme.emme',
      '...ee....ee....ee',
      '...ee....ee....ee',
    ],
    [
      '.................',
      '.................',
      '.................',
      '.eeee............',
      '.egggse..........',
      'esrsrse..........',
      'esgssse.eeee.eeee',
      '.eesseegsssegssse',
      '.eessroosssroosse',
      '.e.esrrosssrrosse',
      '...eesseeesseeese',
      '..emmee.emme.emme',
      '...ee....ee....ee',
      '...ee....ee....ee',
    ],
  ],
};
const charspineHit: Sprite = {
  w: 17,
  h: 14,
  palette: charspinePalette,
  frames: [
    [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '...eeee..........',
      '..eggse.eeee.eeee',
      '..eseseegsssegsss',
      '.eessroosssroosse',
      '..eesrrosssrrosse',
      '...eesseeesseeese',
      '..emmee.emme.emme',
      '....ee....ee...ee',
      '....ee....ee...ee',
    ],
  ],
};

// Pyrecairn (fire, size 2, 17x14)
// A broad ash mound on flat stubby feet thrusts its caked arms left beneath
// a stepped cinder ridge and notched, cracked ember-mouth mask.
const pyrecairnPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, w: COLORS.white, o: COLORS.orange, m: COLORS.maroon };
const pyrecairnIdle: Sprite = {
  w: 17,
  h: 14,
  palette: pyrecairnPalette,
  frames: [
    [
      '.......ee........',
      '.....eeggee......',
      '...eegggessee....',
      '..egwgggssmse....',
      '.ewwwwwggsssee...',
      'ewwewewgssmse....',
      '.ewwewwgssssee...',
      'ewwoeowegssssse..',
      'egeeeeesegssmse..',
      'egggssseggesssse.',
      'eessssseessssmse.',
      '.egggssssssssmse.',
      '.eggggeeeegssmse.',
      '.eeeeee..eeeeeee.',
    ],
    [
      '.................',
      '.....eeeeee......',
      '...eegggessee....',
      '..egwgggssmse....',
      '.ewwwwwggsssee...',
      'ewwewewgssmse....',
      '.ewwewwgssssee...',
      'ewwoeowegssssse..',
      '.geeeeesegssmse..',
      'egggsssesgesssse.',
      'eesssssggssssmse.',
      '.egggssssssssmse.',
      '.eggggeeeegssmse.',
      '.eeeeee..eeeeeee.',
    ],
  ],
};
const pyrecairnHit: Sprite = {
  w: 17,
  h: 14,
  palette: pyrecairnPalette,
  frames: [
    [
      '.................',
      '.................',
      '.........ee......',
      '......eeggese....',
      '....eeggggsssee..',
      '...ewwewwggsmse..',
      '..ewweeewwgssse..',
      '...ewewwewgssmse.',
      '..ewwooeeegsssse.',
      '.egeeeeeegggssse.',
      '.egggsssegesssse.',
      '..essssseesssmse.',
      '..eggggeeeegssse.',
      '..eeeeee..eeeeeee',
    ],
  ],
};

// Slagram (fire, size 2, 17x14)
// A low-browed brown ram braces left on wide hooves beneath one C-curled
// slag horn with a dark two-pixel core and an orange fracture.
const slagramPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, s: COLORS.gray, t: COLORS.steel, o: COLORS.orange, y: COLORS.yellow };
const slagramIdle: Sprite = {
  w: 17,
  h: 14,
  palette: slagramPalette,
  frames: [
    [
      '.....eeee........',
      '....ettsse.......',
      '....esee.........',
      '....essose.......',
      '.....eeee........',
      '...eeebbeeeeeee..',
      '..ebbbbebbbbbbbe.',
      '.eeebbmbbbbbbmmme',
      'ebyebbmmbbbbmmmme',
      'ebbbbmmmbmmmmmme.',
      '.eemmmmmeeemmme..',
      '..eeeeee..ebme...',
      '...ebme...ebme...',
      '..eeee....eeee...',
    ],
    [
      '.....eeee........',
      '....ettsse.......',
      '....esee.........',
      '....essose.......',
      '.....eeee........',
      '...eeebbeeeeeeee.',
      '..ebbbbebbbbbbbme',
      '.eeebbmbbbbbbmmme',
      'ebyebbmmbbbbmmmme',
      'ebbbbmmmbmmmmmme.',
      '.eemmmmmeeemmme..',
      '..eeeeee..ebme...',
      '...ebme...ebme...',
      '..eeee....eeee...',
    ],
  ],
};
const slagramHit: Sprite = {
  w: 17,
  h: 14,
  palette: slagramPalette,
  frames: [
    [
      '.................',
      '......eeee.......',
      '.....ettsse......',
      '.....esee........',
      '.....essose......',
      '......eeee.......',
      '....eeebbeeeeeee.',
      '...ebbbbebbbbbbbe',
      '..eeebbmbbbbbmmme',
      '.ebeebbmmbbbbmmme',
      '.ebeemmmmmmmmmme.',
      '..eeeeeee..ebme..',
      '....ebme...ebme..',
      '...eeee....eeee..',
    ],
  ],
};

// Coalscythe (fire, size 3, 20x17)
// A left-cocked triangular coal mantis with twin yellow eyes, folded
// charcoal wing cases, four stilt legs and angular white-hot inner scythes.
const coalscythePalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, r: COLORS.red, o: COLORS.orange, y: COLORS.yellow, w: COLORS.white };
const coalscytheIdle: Sprite = {
  w: 20,
  h: 17,
  palette: coalscythePalette,
  frames: [
    [
      '.......e....e.......',
      '......ese..ese......',
      '...eeeeeseese.......',
      '..eyyeyyessse.......',
      '.eyeyeyeesssse......',
      '..eyyeyessggsse.....',
      '...eeeessgeggse.....',
      '....ee.eseeggsse....',
      '..eeyeeeseergsse....',
      '.ewyoe.eseyegsse....',
      '..ewyoeewyeegsse....',
      '...ewyeoyeergse.....',
      '....eeeeseessee.....',
      '......ese.eseese....',
      '.....ese.e.e.ese....',
      '....ese.e..e..ese...',
      '...eee.ee..ee..eee..',
    ],
    [
      '.......e....e.......',
      '......ese..ese......',
      '...eeeeeseese.......',
      '..eyyeyyessse.......',
      '.eyeyeyeesssse......',
      '..eyyeyessggsse.....',
      '...eeeessgeggse.....',
      '....ee.eseeggsse....',
      '...eyeeeseergsse....',
      '..ewye.eseyegsse....',
      '...ewyeewyeegsse....',
      '....eweooyergse.....',
      '....eeeeseessee.....',
      '......ese.eseese....',
      '.....ese.e.e.ese....',
      '....ese.e..e..ese...',
      '...eee.ee..ee..eee..',
    ],
  ],
};
const coalscytheHit: Sprite = {
  w: 20,
  h: 17,
  palette: coalscythePalette,
  frames: [
    [
      '....................',
      '.........e....e.....',
      '........ese..ese....',
      '.....eeeeeseese.....',
      '....essessessse.....',
      '...eseeseessssse....',
      '....eyyeyessggse....',
      '.....eeeessgegsse...',
      '......ee.eseegsse...',
      '....eeyeeeseegsse...',
      '...ewyoe.eseygsse...',
      '....ewyoeewyegsse...',
      '.....ewyeoyeegse....',
      '......eeeeseessee...',
      '.......ese.eseese...',
      '......ese.e.e.ese...',
      '.....eee.ee.ee.eee..',
    ],
  ],
};

// Cindercoil (fire, size 3, 20x17)
// A blind magma worm rears left around a hooked rasping maw, its five-pixel
// crust curled into a tall C with white-hot double bands and a raised rear
// tail separated by open air.
const cindercoilPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, s: COLORS.slate, r: COLORS.red, o: COLORS.orange, w: COLORS.white };
const cindercoilIdle: Sprite = {
  w: 20,
  h: 17,
  palette: cindercoilPalette,
  frames: [
    [
      '..eeeee.............',
      '.eoorree............',
      'eewweorree..........',
      'eweeerrrme..........',
      'eeeeewwrrme.........',
      'ewweewwrrme.........',
      '.eeeeorrrme.........',
      '....eorrme..........',
      '...eowwrme.....ee...',
      '...eowwrme....erre..',
      '..eorrmme.....ewwe..',
      '..eorrme......ewwe..',
      '..eorrme.....eorre..',
      '...eorreee..eeorre..',
      '...eorrwwrreeorrme..',
      '....errwwrrrrrmme...',
      '.....eeeeeeeeeee....',
    ],
    [
      '..eeeee.............',
      '.eoorree............',
      'eewweorree..........',
      'eweeerrrme..........',
      'eeeeewwrrme.........',
      'ewweewwrrme.........',
      '.eeeeorrrme.........',
      '....eorrme..........',
      '...eowwrme.....e....',
      '...eowwrme....erree.',
      '..eorrmme.....ewwme.',
      '..eorrme......ewwme.',
      '..eorrme.....eorme..',
      '...eorreee..eeorre..',
      '...eorrwwrreeorrme..',
      '....errwwrrrrrmme...',
      '.....eeeeeeeeeee....',
    ],
  ],
};
const cindercoilHit: Sprite = {
  w: 20,
  h: 17,
  palette: cindercoilPalette,
  frames: [
    [
      '....................',
      '....eeeee...........',
      '...eoorree..........',
      '..eewweorree........',
      '..eweeerrrmme.......',
      '..ewweewwrrme.......',
      '...eeeewwrrme.......',
      '.....eorrrme........',
      '....eorrmme.....ee..',
      '....eowwrme....erre.',
      '...eowwrme.....ewwe.',
      '...eorrme......ewwe.',
      '...eorrme.....eorre.',
      '....eorreee..eeorre.',
      '....errwwrreeorrme..',
      '.....erwwrrrrrmme...',
      '......eeeeeeeeee....',
    ],
  ],
};

/** The 20 generated fire-type species, keyed by species id. */
export const fireSprites = {
  brimhide: { idle: brimhideIdle, hit: brimhideHit },
  anvilclaw: { idle: anvilclawIdle, hit: anvilclawHit },
  ashtusk: { idle: ashtuskIdle, hit: ashtuskHit },
  forgehulk: { idle: forgehulkIdle, hit: forgehulkHit },
  bristlehog: { idle: bristlehogIdle, hit: bristlehogHit },
  matchling: { idle: matchlingIdle, hit: matchlingHit },
  wickmoth: { idle: wickmothIdle, hit: wickmothHit },
  emberwren: { idle: emberwrenIdle, hit: emberwrenHit },
  sootcap: { idle: sootcapIdle, hit: sootcapHit },
  steamfin: { idle: steamfinIdle, hit: steamfinHit },
  kindletoad: { idle: kindletoadIdle, hit: kindletoadHit },
  flarecrow: { idle: flarecrowIdle, hit: flarecrowHit },
  hearthmole: { idle: hearthmoleIdle, hit: hearthmoleHit },
  scorchbriar: { idle: scorchbriarIdle, hit: scorchbriarHit },
  kilnshell: { idle: kilnshellIdle, hit: kilnshellHit },
  charspine: { idle: charspineIdle, hit: charspineHit },
  pyrecairn: { idle: pyrecairnIdle, hit: pyrecairnHit },
  slagram: { idle: slagramIdle, hit: slagramHit },
  coalscythe: { idle: coalscytheIdle, hit: coalscytheHit },
  cindercoil: { idle: cindercoilIdle, hit: cindercoilHit },
} satisfies Record<string, SpeciesSprites>;
