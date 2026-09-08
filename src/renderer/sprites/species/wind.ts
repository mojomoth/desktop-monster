// GENERATED ART — wind-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.

import { COLORS } from '../palette.js';
import type { Sprite } from '../sprite.js';
import type { SpeciesSprites } from '../monsters.js';

// Kitekin (wind, size 1, 13x11)
// A left-dipping white paper rhombus wears torn eyeholes and a crooked
// mouth, with one lower brown spar and a knotted steel tail bearing two red
// bows.
const kitekinPalette: Record<string, string> = { e: COLORS.void, w: COLORS.white, r: COLORS.red, b: COLORS.brown, s: COLORS.steel };
const kitekinIdle: Sprite = {
  w: 13,
  h: 11,
  palette: kitekinPalette,
  frames: [
    [
      '.......e.....',
      '.....eewwe...',
      '...ewewwewwe.',
      '..ewweewwewwe',
      '.ewweweewwe..',
      'eewwbwwwwe...',
      '..ewwbbwe....',
      '....ewwees...',
      '.....ee.ersre',
      '.........ese.',
      '..........rsr',
    ],
    [
      '.......e.....',
      '.....eewwe...',
      '...ewewwewwe.',
      '..ewweewwewwe',
      '.ewweweewwe..',
      'eewwbwwwwe...',
      '..ewwbbwe....',
      '....ewwees...',
      '.....ee.rsr..',
      '.........ese.',
      '..........rsr',
    ],
  ],
};
const kitekinHit: Sprite = {
  w: 13,
  h: 11,
  palette: kitekinPalette,
  frames: [
    [
      '.............',
      '........e....',
      '......eewwe..',
      '....ewwewewe.',
      '...ewwewewwwe',
      '..ewwweeewwe.',
      '..eewwbwwwe..',
      '....ewwbwe...',
      '......eeeersr',
      '..........ese',
      '..........rsr',
    ],
  ],
};

// Nimbling (wind, size 1, 13x10)
// A left-facing three-lobed cloud bellows with glinting eyes, blue belly and
// side pleats breathes up, then flattens to fire its attached cyan gust.
const nimblingPalette: Record<string, string> = { e: COLORS.void, w: COLORS.white, b: COLORS.blue, s: COLORS.steel, c: COLORS.cyan };
const nimblingIdle: Sprite = {
  w: 13,
  h: 10,
  palette: nimblingPalette,
  frames: [
    [
      '.............',
      '.....ee.ee...',
      '...eewwewwee.',
      '..ewwewwewwwe',
      '..eweeweeewse',
      '.ceewwwwwwsse',
      'cccebbbbbbsbe',
      '.ceebbeebbee.',
      '.............',
      '.............',
    ],
    [
      '....ee.ee....',
      '..eewwewwee..',
      '.ewwwwwwwwwee',
      '.ewwwewwewwwe',
      '.ewweeweewsse',
      '.ceewwwwwwsse',
      'cccebbbbbbsbe',
      '.ceebbeebbee.',
      '.............',
      '.............',
    ],
  ],
};
const nimblingHit: Sprite = {
  w: 13,
  h: 10,
  palette: nimblingPalette,
  frames: [
    [
      '.............',
      '.............',
      '.............',
      '.......ee....',
      '....eeewwee..',
      '...eweewewwwe',
      '.ccewwwwwssse',
      'cccebbbbbbbbe',
      '.cceeeeeeeee.',
      '.............',
    ],
  ],
};

// Panewhirr (wind, size 2, 17x12)
// A left-facing wedge-headed skimmer with twin yellow visor slits, a steel
// brow, a straight segmented green abdomen and four narrow cyan glass wings.
const panewhirrPalette: Record<string, string> = { e: COLORS.void, g: COLORS.green, G: COLORS.forest, c: COLORS.cyan, s: COLORS.steel, y: COLORS.yellow };
const panewhirrIdle: Sprite = {
  w: 17,
  h: 12,
  palette: panewhirrPalette,
  frames: [
    [
      '...ece........ece',
      '....ece......ece.',
      '.....ece....ece..',
      '......ece..ece...',
      '..eeee.eceece....',
      '.esssseeggeegeege',
      'eyeyeegggGggGggGe',
      '.eeee...ececeeee.',
      '.......ece.ece...',
      '......ece...ece..',
      '.................',
      '.................',
    ],
    [
      '.................',
      '....ece.......ece',
      '.....ece.....ece.',
      '......ece...ece..',
      '..eeee.ece.ece...',
      '.esssseeggeegeege',
      'eyeyeegggGggGggGe',
      '.eeee...eceeceee.',
      '.......ece..ece..',
      '......ece....ece.',
      '.................',
      '.................',
    ],
  ],
};
const panewhirrHit: Sprite = {
  w: 17,
  h: 12,
  palette: panewhirrPalette,
  frames: [
    [
      '.................',
      '.................',
      '......ece.....ece',
      '.......ece...ece.',
      '........ece.ece..',
      '....eeee.ecece...',
      '...esssseeggeegee',
      '..eyeeeegGggGggGe',
      '...eeee...ececeee',
      '.........ece.ece.',
      '.................',
      '.................',
    ],
  ],
};

// Fanjack (wind, size 2, 16x13)
// A crouching left-facing hare with swept rudder ears, a single long spring
// foot and one rigid cyan-ribbed folding fan tail.
const fanjackPalette: Record<string, string> = { e: COLORS.void, s: COLORS.skin, b: COLORS.brown, m: COLORS.maroon, w: COLORS.white, c: COLORS.cyan };
const fanjackIdle: Sprite = {
  w: 16,
  h: 13,
  palette: fanjackPalette,
  frames: [
    [
      '.......eeeeee...',
      '....eeesssbbe...',
      '...essbeeeeeeee.',
      '..essbeessssbbee',
      '.eseeessbee.ecce',
      '.esewessee.eccce',
      'esseeesssbecmcce',
      '.esssbeesseccmce',
      '..eeeseesbecmce.',
      '....eeesbbecce..',
      '.....esbbbeee...',
      '..eeesbemmbe....',
      '.essssseeeee....',
    ],
    [
      '.......eeeeee...',
      '.....eesssbbe...',
      '...essbeeeeeeee.',
      '..essbeessssbbee',
      '.eseeessbee.ecce',
      '.esewessee.eccce',
      'esseeesssbecmcce',
      '.esssbeesseccmce',
      '..eeeseesbecmce.',
      '.....eesbbecce..',
      '.....esbbbeee...',
      '..eeesbemmbe....',
      '.essssseeeee....',
    ],
  ],
};
const fanjackHit: Sprite = {
  w: 16,
  h: 13,
  palette: fanjackPalette,
  frames: [
    [
      '................',
      '.........eeee...',
      '......eeessse...',
      '....eessbeeeee..',
      '...essbeessbe.ee',
      '..esssesseeeecce',
      '..eseeessseeccce',
      '.essssesbbecmcce',
      '..eessbesbeccmce',
      '....eeeessecce..',
      '......esbbeee...',
      '...eeesemmbe....',
      '..esssseeeee....',
    ],
  ],
};

// Skitterel (wind, size 2, 17x13)
// A forward-leaning brown runner bird carries a level dagger bill, pale
// cheek and red wattle above long striding legs and a stiff tail with three
// white bars.
const skitterelPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, s: COLORS.skin, r: COLORS.red, w: COLORS.white, g: COLORS.gray };
const skitterelIdle: Sprite = {
  w: 17,
  h: 13,
  palette: skitterelPalette,
  frames: [
    [
      '....eeee.........',
      '...esssbe........',
      '...eswwese.......',
      '.eeesweebe.......',
      'essbswgesbbe.....',
      '.eeessbbbbeeeeeee',
      '...erebbbbewbwbwe',
      '....eebbbbeeeeeee',
      '.....ebbbege.....',
      '.....eseee.ge....',
      '....ese.....ge...',
      '...ese......ge...',
      '..eeee......eee..',
    ],
    [
      '....eeee.........',
      '...esssbe........',
      '...eswwese.......',
      '.eeesweebe.......',
      'essbswgesbbe.....',
      '.eeessbbbbbeeeeee',
      '...erebbbbewbwbwe',
      '....eebbbbbeeeeee',
      '.....ebbbege.....',
      '.....eseee..ge...',
      '....ese....ge....',
      '...ese.....ge....',
      '..eeee.....eee...',
    ],
  ],
};
const skitterelHit: Sprite = {
  w: 17,
  h: 13,
  palette: skitterelPalette,
  frames: [
    [
      '.................',
      '.....eeee........',
      '....esssbe.......',
      '....eseesse......',
      '..eeeeseebbe.....',
      '.eessbsssbbbeeeee',
      '..eeeeebbbewbwbwe',
      '......ebbbbbeeeee',
      '......ebbbge.....',
      '......esee.ge....',
      '......ese...ge...',
      '.....ese.....ge..',
      '....eeee.....eee.',
    ],
  ],
};

// Sporeplume (wind, size 2, 15x12)
// A left-looking yellow eye peers from a torn green puffball shell with
// hanging root arms, two planted roots and exactly three gray spores
// drifting up-right.
const sporeplumePalette: Record<string, string> = { e: COLORS.void, f: COLORS.forest, w: COLORS.white, b: COLORS.brown, s: COLORS.gray, y: COLORS.yellow };
const sporeplumeIdle: Sprite = {
  w: 15,
  h: 12,
  palette: sporeplumePalette,
  frames: [
    [
      '........s...s..',
      '....s..sss.sss.',
      '...sss..s...s..',
      '....s..........',
      '...............',
      '.ee.wyyeee.ee..',
      '.ewweyywwwefe..',
      'eefwyyywefffe..',
      'ebeffwfffffebe.',
      '.befffffffeeb..',
      '..eeebeeeebe...',
      '...eee...eee...',
    ],
    [
      '.........s...s.',
      '.....s..sss.sss',
      '....sss..s...s.',
      '.....s.........',
      '...............',
      '.ee.wyyeee.ee..',
      '.ewweyywwwefe..',
      'eefwyyywefffe..',
      'ebeffwfffffebe.',
      '.befffffffeeb..',
      '..eeebeeeebe...',
      '...eee...eee...',
    ],
  ],
};
const sporeplumeHit: Sprite = {
  w: 15,
  h: 12,
  palette: sporeplumePalette,
  frames: [
    [
      '.........s...s.',
      '.....s..sss.sss',
      '....sss..s...s.',
      '.....s.........',
      '...............',
      '...............',
      '...ee.weee.ee..',
      '..ewweeywwwefe.',
      '.eefwyeewffffee',
      '..beffffffffebe',
      '...eeebeeeebee.',
      '....eee...eee..',
    ],
  ],
};

// Chimbrel (wind, size 2, 16x14)
// A wooden chime cap looks left with glinting eyes and a whistle mouth over
// three hollow stepped steel tubes, while a maroon cord swings a flat
// clapper out left.
const chimbrelPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, s: COLORS.steel, c: COLORS.cyan, w: COLORS.white, m: COLORS.maroon };
const chimbrelIdle: Sprite = {
  w: 16,
  h: 14,
  palette: chimbrelPalette,
  frames: [
    [
      '................',
      '....eeeeeeee....',
      '..eessbbbbbbeee.',
      '.ebbwebwebbbbbbe',
      '.ebbeebeebbbbbbe',
      '..ebbbebbbbbeee.',
      '..emeeee.eee.eee',
      '..emeese.ese.ese',
      '.eme.ese.ese.ese',
      '.eme.ece.ese.ese',
      'eeemeeee.ese.ese',
      'ebmbbe...ece.ese',
      '.eeee....eee.ece',
      '.............eee',
    ],
    [
      '................',
      '....eeeeeeee....',
      '..eessbbbbbbeee.',
      '.ebbwebwebbbbbbe',
      '.ebbeebeebbbbbbe',
      '..ebbbebbbbbeee.',
      '..emeeee.eee.eee',
      '..emeese.ese.ese',
      '..emeese.ese.ese',
      '..emeece.ese.ese',
      'eeeemeee.ese.ese',
      'ebmbbe...ece.ese',
      '.eeee....eee.ece',
      '.............eee',
    ],
  ],
};
const chimbrelHit: Sprite = {
  w: 16,
  h: 14,
  palette: chimbrelPalette,
  frames: [
    [
      '................',
      '................',
      '......eeeeeeee..',
      '....eessbbbbbeee',
      '...ebbeebebbbbbe',
      '...ebebebebbbbbe',
      '....ebebbbbbbeee',
      '....emee.eee.eee',
      '...emees.ese.ese',
      '...emece.ese.ese',
      '..eeemee.ese.ese',
      '..ebmbbe.ece.ese',
      '...eeee..eee.ece',
      '.............eee',
    ],
  ],
};

// Lantessa (wind, size 2, 14x14)
// A smooth paper lantern leans left, its painted face above a candle-filled
// golden dome, woven rim, and four curling red streamers.
const lantessaPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, w: COLORS.white, r: COLORS.red, o: COLORS.orange, y: COLORS.yellow, s: COLORS.skin };
const lantessaIdle: Sprite = {
  w: 14,
  h: 14,
  palette: lantessaPalette,
  frames: [
    [
      '...eeeeee.....',
      '..ewwwswwe....',
      '.ewwswwswwe...',
      'ewswsswsswse..',
      'ewewwewwswse..',
      'eeeweewwswse..',
      'ewwewwwwswse..',
      'ewyyyyyyoooe..',
      '.eyyyyyooooe..',
      '.ebybybobybe..',
      '.ereereereere.',
      '..er..er.er.re',
      '...re..r..erre',
      '..........ere.',
    ],
    [
      '...eeeeee.....',
      '..ewwwswwe....',
      '.ewwswwswwe...',
      'ewswsswsswse..',
      'ewewwewwswse..',
      'eeeweewwswse..',
      'ewwewwwwswse..',
      'ewyyyyyyoooe..',
      '.eyyyyyooooe..',
      '.ebybybobybe..',
      '.ereereereere.',
      '.er..er..er.re',
      '..ere.er..erre',
      '..........ere.',
    ],
  ],
};
const lantessaHit: Sprite = {
  w: 14,
  h: 14,
  palette: lantessaPalette,
  frames: [
    [
      '..............',
      '.....eeeeee...',
      '...eewwwswwe..',
      '..ewwswwswwee.',
      '..ewwewwwswwe.',
      '..eeweewwswse.',
      '..ewwewwwwswe.',
      '..eyyyyyyoooe.',
      '..eyyyyyooooe.',
      '..ebybybobybe.',
      '..ereereereere',
      '...er..er.erre',
      '....re..r..ere',
      '............re',
    ],
  ],
};

// Vaneknight (wind, size 2, 15x14)
// A left-facing stubby iron knight has squared plates, a red weather-vane
// fan, twin yellow visor lights and a low broad yellow arrow held in its
// front hand.
const vaneknightPalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, d: COLORS.slate, r: COLORS.red, y: COLORS.yellow, w: COLORS.white };
const vaneknightIdle: Sprite = {
  w: 15,
  h: 14,
  palette: vaneknightPalette,
  frames: [
    [
      '..........ee..e',
      '........erreere',
      '...eeeeeeerrrre',
      '..ewsssdeerrrre',
      '..eseyeyeedrrre',
      '..essssdeerrre.',
      '...eeeeeeeee...',
      '..ewsssessssde.',
      '..esssdesddde..',
      '..eesdessddese.',
      '.eyeeeeeeddedse',
      'eyyyyyysesddee.',
      '.eyeeeeddedde..',
      '..e..essedesde.',
    ],
    [
      '.........ee...e',
      '.......errerere',
      '...eeeeeeerrrre',
      '..ewsssdeerrrre',
      '..eseyeyeedrrre',
      '..essssdeerrre.',
      '...eeeeeeeee...',
      '..essssessssde.',
      '..eswsdesddde..',
      '..eesdessddese.',
      '.eyeeeeeeddedse',
      'eyyyyyysesddee.',
      '.eyeeeeddedde..',
      '..e..essedesde.',
    ],
  ],
};
const vaneknightHit: Sprite = {
  w: 15,
  h: 14,
  palette: vaneknightPalette,
  frames: [
    [
      '...............',
      '..........ee..e',
      '........erreere',
      '....eeeeeeerrre',
      '...ewsssdeerrre',
      '...eseyeederrre',
      '...esseyeeeee..',
      '....eeeeesssde.',
      '...ewsssesddde.',
      '...essddesddese',
      '..eyeeeeeddedse',
      '.eyyyyyysesddee',
      '..eyeeeeddedde.',
      '...e..essedesde',
    ],
  ],
};

// Skreave (wind, size 3, 20x16)
// A lowered left-facing storm raptor with a hooked beak, a bright masked
// yellow eye, jagged crest, split feather tips and ground-gripping talons.
const skreavePalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, b: COLORS.blue, s: COLORS.steel, w: COLORS.white, y: COLORS.yellow };
const skreaveIdle: Sprite = {
  w: 20,
  h: 16,
  palette: skreavePalette,
  frames: [
    [
      '..............ee..ee',
      '.....ee......esneese',
      '....esne.ee.esnensne',
      '...esbneesne.esbbnne',
      '...ennnnebnneesbbnee',
      '..esyywnnnnnesbbnne.',
      '.esweysnnnnebbbnne..',
      'eyyseesnnnbbbnnee...',
      '.eyeeesbbbbbnee..ee.',
      '..eeswwsbbnnesseesne',
      'eessbbswsbnnebbnnne.',
      'esbbneswsbnneesbnee.',
      'esne.eswsnnee..enee.',
      'ee.esneennne....ee..',
      '...eeee.eenee.......',
      '....eyyeeyyye.......',
    ],
    [
      '.............ee...ee',
      '.....ee.....esneeese',
      '....esne.ee.esnensne',
      '...esbneesne.esbbnne',
      '...ennnnebnneesbbnee',
      '..esyywnnnnnesbbnne.',
      '.esweysnnnnebbbnne..',
      'eyyseesnnnbbbnnee...',
      '.eyeeesbbbbbnee..ee.',
      '..eeswwsbbnnesseesne',
      '.eessbswsbnnebbnnne.',
      'esbbneswsbnneesbnee.',
      'esne.eswsnnee..enee.',
      'ee.esneennne....ee..',
      '...eeee.eenee.......',
      '....eyyeeyyye.......',
    ],
  ],
};
const skreaveHit: Sprite = {
  w: 20,
  h: 16,
  palette: skreavePalette,
  frames: [
    [
      '....................',
      '...............ee.ee',
      '........ee....esnese',
      '......esne.ee.esbnne',
      '.....esbneesneesbnne',
      '.....ennnnebnnesbnee',
      '....esweennnnesbbnne',
      '...eewyeennnebbbnne.',
      '..eyyseesnnnbbbnnee.',
      '...eyeeesbbbbbnee.ee',
      '....eeeswwsbbnnesene',
      '...ee.eswsbbbnnebnne',
      '..esneeswsbbnnnesbne',
      '..esbeeswsnnne.enee.',
      '...ee..eeeenee..ee..',
      '.......eyyeeyyye....',
    ],
  ],
};

// Curlhart (wind, size 3, 19x17)
// A broad stag braces left beneath two hollow forward-curling vane horns,
// with a level dark muzzle and a white cloud ruff behind its calm eye.
const curlhartPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, w: COLORS.white, g: COLORS.gray, s: COLORS.steel };
const curlhartIdle: Sprite = {
  w: 19,
  h: 17,
  palette: curlhartPalette,
  frames: [
    [
      '...eeeee...eeeee...',
      '..ewssgse.esssgse..',
      '.ewssggseesssggse..',
      '.esg..gseesg..gse..',
      '.esg..gseesg..gse..',
      '..esggse..esggse...',
      '...eeee....eeee....',
      '..ebbbbeewweeeee...',
      'eeebwebewwwwbbbbbe.',
      'embbbbbeewsbbbbbme.',
      'eeeeebbeewwsbbbbme.',
      '.....eewwwsbbbbmme.',
      '......ewwseebmmee..',
      '......ebme.ebme....',
      '.....ebe.e..eme....',
      '.....ebe.e..eme....',
      '....eee.ee..eeee...',
    ],
    [
      '...eeeee...eeeee...',
      '..ewssgse.esssgse..',
      '.ewssggseesssggse..',
      '.esg..gseesg..gse..',
      '.esg..gseesg..gse..',
      '..esggse..esggse...',
      '...eeee....eeee....',
      '..ebbbbeewweeeee...',
      'eeebwebewwwwbbbbbe.',
      'embbbbbeewwsbbbbme.',
      'eeeeebbeewsbbbbbme.',
      '.....eewwwsbbbbmme.',
      '......ewwseebmmee..',
      '......ebme.ebme....',
      '.....ebe.e..eme....',
      '.....ebe.e..eme....',
      '....eee.ee..eeee...',
    ],
  ],
};
const curlhartHit: Sprite = {
  w: 19,
  h: 17,
  palette: curlhartPalette,
  frames: [
    [
      '...................',
      '....eeeee...eeeee..',
      '...ewssgse.esssgse.',
      '..ewssggseesssggse.',
      '..esg..gseesg..gse.',
      '..esg..gseesg..gse.',
      '...esggse..esggse..',
      '....eeee....eeee...',
      '...ebbbbeewweeeee..',
      '.eeebbeebwwwwbbbme.',
      '.embbbbbeewsbbbbme.',
      '.eeeeebbewwsbbbmme.',
      '......ewwwsebmmee..',
      '.......ebme.ebme...',
      '......ebe.e..eme...',
      '......ebe.e..eme...',
      '.....eee.ee..eeee..',
    ],
  ],
};

// Gyrodillo (wind, size 3, 20x15)
// A left-leaning armoured roller braces four claws beneath three open steel
// turbine vanes venting cyan air beside its tightly curled tail.
const gyrodilloPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, s: COLORS.steel, c: COLORS.cyan, w: COLORS.white, y: COLORS.yellow };
const gyrodilloIdle: Sprite = {
  w: 20,
  h: 15,
  palette: gyrodilloPalette,
  frames: [
    [
      '....................',
      '..........eeee......',
      '....eeee..ewse......',
      '....ewse..esse..eeee',
      '....esseccessee.ewse',
      '...eesseccessee.esse',
      '..esseeebbeesseeesse',
      '.eesssbbbbbbessseese',
      '.esyyebbbbbbbesssecc',
      'essyeebbbmmbbbeseecc',
      'esseeebmmmmmmbbee.ee',
      '.eebbbmmmmmmmbbeeese',
      '..eebmmmmmmmmeeeese.',
      '..esseeeseeeseeese..',
      '..ewe.ewe.ewe.ewe...',
    ],
    [
      '....................',
      '..........eeee......',
      '....eeee..ewse......',
      '....ewse..esse..eeee',
      '....esse..essee.ewse',
      '...eesseccessee.esse',
      '..esseeebbeesseeesse',
      '.eesssbbbbbbessseese',
      '.esyyebbbbbbbessse.c',
      'essyeebbbmmbbbesee.c',
      'esseeebmmmmmmbbeeeee',
      '.eebbbmmmmmmmbbeesee',
      '..eebmmmmmmmmeeeeee.',
      '..esseeeseeeseeese..',
      '..ewe.ewe.ewe.ewe...',
    ],
  ],
};
const gyrodilloHit: Sprite = {
  w: 20,
  h: 15,
  palette: gyrodilloPalette,
  frames: [
    [
      '....................',
      '....................',
      '...........eeee.....',
      '.....eeee..esse.....',
      '.....esse..esse.eeee',
      '.....esseccesseeesse',
      '....eesseccesseeesse',
      '...esseeebbeesseeese',
      '..eesssbbbbbbesssecc',
      '..eeesebbmmbbbeseecc',
      '.esseeebmmmmmbbee.ee',
      '..eebbbmmmmmmbeeeese',
      '...eebmmmmmmmeeeese.',
      '...esseeeseeeseeese.',
      '...ewe.ewe.ewe.ewe..',
    ],
  ],
};

// Cyclonarch (wind, size 3, 18x17)
// A crowned stone mask grimaces above a flat-shouldered tornado with two
// left-reaching rubble arms and three winding waist bands.
const cyclonarchPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, t: COLORS.steel, b: COLORS.brown, y: COLORS.yellow, w: COLORS.white };
const cyclonarchIdle: Sprite = {
  w: 18,
  h: 17,
  palette: cyclonarchPalette,
  frames: [
    [
      '........eeeeeee...',
      '.......eyyyyybbe..',
      '......eyeeeyeebe..',
      '......eyyyyybbbe..',
      '.......eyeeeybbe..',
      '.eeeeeeeyeyyebbeee',
      '.esbbbtttssbbbssse',
      '.esbbbsssssbbbssse',
      '.esbbbseessbbbssse',
      '..eeeeewtttssssse.',
      'eeeeeeeessstttse..',
      'esbbbssesssstsse..',
      'esbbbsswtttsse....',
      'esbbbseesstttse...',
      '.eeeeee.eswsse....',
      '.........este.....',
      '..........eee.....',
    ],
    [
      '........eeeeeee...',
      '.......eyyyyybbe..',
      '......eyeeeyeebe..',
      '......eyyyyybbbe..',
      '.......eyeeeybbe..',
      '.eeeeeeeyeyyebbeee',
      '.esbbbtttssbbbssse',
      '.esbbbsssssbbbssse',
      '.esbbbseessbbbssse',
      '..eeeeesswtttssse.',
      'eeeeeeeesssssttse.',
      'esbbbssessttssse..',
      'esbbbsssswtttse...',
      'esbbbseetttssse...',
      '.eeeeee.esswse....',
      '.........etse.....',
      '..........eee.....',
    ],
  ],
};
const cyclonarchHit: Sprite = {
  w: 18,
  h: 17,
  palette: cyclonarchPalette,
  frames: [
    [
      '..................',
      '.........eeeeeee..',
      '........eyyyyybbe.',
      '........eyeeeyebe.',
      '.......eyyeeyybbe.',
      '........eyeeeebbe.',
      '...eeeeeeeeeeeeeee',
      '...esbbbtttbbbssse',
      '...esbbbsssbbbssse',
      '...esbbbwttbbbssse',
      '..eeeeeesssssttse.',
      '..esbbbsessttsse..',
      '..esbbbswtttsse...',
      '..esbbbesstttse...',
      '...eeeeeeeswse....',
      '..........ete.....',
      '..........eee.....',
    ],
  ],
};

// Vellisk (wind, size 3, 18x16)
// A left-facing festival serpent wears orange-and-white banner bands along a
// grounded S coil, with paper whiskers, a red neck bow and a forked ribbon
// tail.
const velliskPalette: Record<string, string> = { e: COLORS.void, o: COLORS.orange, w: COLORS.white, r: COLORS.red };
const velliskIdle: Sprite = {
  w: 18,
  h: 16,
  palette: velliskPalette,
  frames: [
    [
      '..eeee.......e..e.',
      '.ewwwwee...eoe.eoe',
      'ewwwwwwewwweeoeoe.',
      'ewwewweweooe.eowe.',
      'eweeweewewwe..ewe.',
      'ewwwwwoerreoe.eoe.',
      '.eeeeeerrrerreeoe.',
      '......eore.erreowe',
      '.....ewwe..errewwe',
      '...ewwe.......ewwe',
      '..eooe........eooe',
      '.eooe.........eooe',
      '.ewweeeeeeeeeewwwe',
      '..ewwoowwoowwowwwe',
      '....eoowwoowwoowwe',
      '.....eeeeeeeeeeee.',
    ],
    [
      '................e.',
      '..eeeeee....ee.ee.',
      'ewwwwwwowwweeoeoe.',
      'ewwewweweooe.eowe.',
      'eweeweewewwe..ewe.',
      'ewwwwwoerreoe.eoe.',
      '.eeeeeerrrerreeoe.',
      '......eoreerreowee',
      '.....ewwe..errewwe',
      '...ewwe.......ewwe',
      '..eooe........eooe',
      '.eooe.........eooe',
      '.ewweeeeeeeeeewwwe',
      '..ewwoowwoowwowwwe',
      '....eoowwoowwoowwe',
      '.....eeeeeeeeeeee.',
    ],
  ],
};
const velliskHit: Sprite = {
  w: 18,
  h: 16,
  palette: velliskPalette,
  frames: [
    [
      '..................',
      '..................',
      '....eeee.....e..e.',
      '...ewwwwwee.eoeoe.',
      '..ewwwwwwoee.eowe.',
      '..ewweewweooe.ewe.',
      '..ewwwweeworre.eoe',
      '...eeeeerrrrereowe',
      '.......eore.erwwe.',
      '......ewwe.errewwe',
      '.....ewwe.....eooe',
      '....eooe......eooe',
      '....ewwe......ewwe',
      '....ewwweeeeeewwwe',
      '.....eoowwoowwoowe',
      '......eeeeeeeeeee.',
    ],
  ],
};

// Millox (wind, size 3, 17x16)
// A four-legged timber mill-beast with a low left-facing two-eyed head
// carries full white-and-brown X sails across its narrow arched rotor
// housing and a steel axle.
const milloxPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, w: COLORS.white, c: COLORS.cyan, s: COLORS.steel };
const milloxIdle: Sprite = {
  w: 17,
  h: 16,
  palette: milloxPalette,
  frames: [
    [
      '....eee......eee.',
      '...ebwbe....ebwbe',
      '...ebwwbee.ebwwbe',
      '....ebwwbbebwwbe.',
      '.....ebwwbbwwbe..',
      '....ebmbwwwbbmme.',
      '....ebmmbwwbmmme.',
      '....ebmmbssbmmme.',
      '..eeeeembssbmmme.',
      '.ebbbbbebwwbmmme.',
      'eccbcmebwwwbbmme.',
      'ebbbmmebwwbbwwbe.',
      '.eeeeebwwbmbwwbe.',
      '.ebmebwweemebwwbe',
      '.ebmeebme.ebmebme',
      '.eee.eee..eee.eee',
    ],
    [
      '....eee......eee.',
      '...ebwbe....ebwbe',
      '...ebwwbee.ebwwbe',
      '....ebwwbbebwwbe.',
      '.....ebwwbbwwbe..',
      '....ebmbwwwbbmme.',
      '....ebmmbwwbmmme.',
      '....ebmmbssbmmme.',
      '.....embbssbmmme.',
      '..eeeeebbwwbmmme.',
      '.ebbbbbbwwwbbmme.',
      'eccbcmebwwbbwwbe.',
      'ebbbmmebwbmbwwbe.',
      '.eeeebwweemebwwbe',
      '.ebmeebme.ebmebme',
      '.eee.eee..eee.eee',
    ],
  ],
};
const milloxHit: Sprite = {
  w: 17,
  h: 16,
  palette: milloxPalette,
  frames: [
    [
      '.................',
      '.....eee.....eee.',
      '....ebwbe...ebwbe',
      '....ebwwbeeebwwbe',
      '.....ebwwbbwwbe..',
      '....ebebwwwbbmme.',
      '....ebembwwbmmme.',
      '....ebembssbmmme.',
      '......embssbmmme.',
      '....eeeebwwbmmme.',
      '...ebbbbwwwbbmme.',
      '..eeceebwwbbwwbe.',
      '..ebmmebwbmbwwbe.',
      '..eeeebweemebwwbe',
      '..ebmebme.ebmebme',
      '..eee.eee.eee.eee',
    ],
  ],
};

// Nubilan (wind, size 3, 20x15)
// A gentle left-facing sky whale trails a white blowhole cloud above its
// grinning cyan cheek, with sweeping fin-wings and lifted tail flukes.
const nubilanPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, b: COLORS.blue, c: COLORS.cyan, s: COLORS.steel, w: COLORS.white };
const nubilanIdle: Sprite = {
  w: 20,
  h: 15,
  palette: nubilanPalette,
  frames: [
    [
      '.......ee.ee........',
      '......ewwewwe.......',
      '.......ewwwe......ee',
      '........ewe...ee.ece',
      '........ewe...ebeece',
      '..eeeeeeeeeeee.ece..',
      '.ecwecnbbbbbbbeenne.',
      '.eceecnnnbbbbbbnne..',
      'encccnnnnnnnnnnne...',
      'eneeeeeeeeeennne....',
      '.eenncncncnnnee.....',
      '..eebceennbbbcce....',
      '.ebbcce..enbbbbce...',
      '..eeee....ennbce....',
      '............eee.....',
    ],
    [
      '........ee.ee.......',
      '.......ewwewwe......',
      '........ewwwe.....ee',
      '........ewe...ee.ece',
      '........ewe...ebeece',
      '..eeeeeeeeeeee.ece..',
      '.ecwecnbbbbbbbeenne.',
      '.eceecnnnbbbbbbnne..',
      'encccnnnnnnnnnnne...',
      'eneeeeeeeeeennne....',
      '.eenncncncnnnee.....',
      '...eebceenbbbcce....',
      '..ebbcce.enbbbbce...',
      '...eeee...ennbce....',
      '............eee.....',
    ],
  ],
};
const nubilanHit: Sprite = {
  w: 20,
  h: 15,
  palette: nubilanPalette,
  frames: [
    [
      '....................',
      '.........ee.ee......',
      '........ewwewwe.....',
      '.........ewwwe....ee',
      '..........ewe.ee.ece',
      '..........ewe.ebeece',
      '....eeeeeeeeeeeeebce',
      '...ecccnnbbbbbbbnne.',
      '..encencnnnbbbbbnne.',
      '..encccnnnnnnnnnne..',
      '..eneeeeeeennnnne...',
      '...eenncncncnnnee...',
      '....eebceenbbbcce...',
      '...ebbce..enbbce....',
      '....eee....eeee.....',
    ],
  ],
};

// Dartfinch (wind, size 1, 14x11)
// A needle-billed orange finch dives left like a dart with tucked wings, an
// oversized glinting eye, and a split steel fletch tail.
const dartfinchPalette: Record<string, string> = { e: COLORS.void, o: COLORS.orange, m: COLORS.maroon, y: COLORS.yellow, w: COLORS.white, s: COLORS.steel };
const dartfinchIdle: Sprite = {
  w: 14,
  h: 11,
  palette: dartfinchPalette,
  frames: [
    [
      '..........ee.e',
      '.........esees',
      '........eossse',
      '......eeooese.',
      '....eeooommee.',
      '...eowoooomme.',
      '...eyeeoomme..',
      '.eyyyeeoomme..',
      'eyyyyeeeeee...',
      '..............',
      '..............',
    ],
    [
      '...........e.e',
      '.........eeses',
      '........eossse',
      '......eeooees.',
      '....eeooommee.',
      '...eowoooomme.',
      '...eyeeoomme..',
      '.eyyyeeoomme..',
      'eyyyyeeeeee...',
      '..............',
      '..............',
    ],
  ],
};
const dartfinchHit: Sprite = {
  w: 14,
  h: 11,
  palette: dartfinchPalette,
  frames: [
    [
      '..............',
      '...........e.e',
      '..........eses',
      '........eeosse',
      '.......eoooee.',
      '.....eeoommme.',
      '....eowowomme.',
      '..eeyoeoomme..',
      '.eyyyyeeeme...',
      '..............',
      '..............',
    ],
  ],
};

// Glidefin (wind, size 1, 13x11)
// A blunt orange-nosed sailfish faces left with a bright large eye and round
// mouth, dry orange-rayed cyan sails rising and falling around a short skin
// spindle.
const glidefinPalette: Record<string, string> = { e: COLORS.void, w: COLORS.white, s: COLORS.steel, p: COLORS.skin, o: COLORS.orange, c: COLORS.cyan };
const glidefinIdle: Sprite = {
  w: 13,
  h: 11,
  palette: glidefinPalette,
  frames: [
    [
      '.....eeee....',
      '....eoccoe...',
      '...eeococse..',
      '..ewwwocoe.ee',
      'eeowewpppese.',
      'eoeeeppppsee.',
      '.eeoepppe.ese',
      '..eeeoocoeeee',
      '....eococce..',
      '....eocoee...',
      '.....eee.....',
    ],
    [
      '......eee....',
      '.....eocoe...',
      '...eeooccse..',
      '..ewwwocoe.e.',
      'eeowewpppesee',
      'eoeeeppppsee.',
      '.eeoepppe.see',
      '..eeeoocoeee.',
      '....eococce..',
      '....eocoee...',
      '.....eee.....',
    ],
  ],
};
const glidefinHit: Sprite = {
  w: 13,
  h: 11,
  palette: glidefinPalette,
  frames: [
    [
      '.............',
      '......eeee...',
      '.....eoccoe..',
      '....ewwoocse.',
      '...eeeeppoe.e',
      '.eeopepppesee',
      '.eoeeppppsee.',
      '..eeeoocoeeee',
      '.....eococce.',
      '.....eocoee..',
      '......eee....',
    ],
  ],
};

// Whirlseed (wind, size 1, 14x11)
// A left-tilted brown teardrop seed blows through pursed lips on two root
// legs while one tall green samara blade leans to the right.
const whirlseedPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, d: COLORS.maroon, g: COLORS.green, f: COLORS.forest, y: COLORS.yellow, w: COLORS.white };
const whirlseedIdle: Sprite = {
  w: 14,
  h: 11,
  palette: whirlseedPalette,
  frames: [
    [
      '...........eee',
      '..........eyfe',
      '.........egffe',
      '...eee..egffe.',
      '.eebbbe.egfe..',
      'ewebweebege...',
      'eeebeeeeee....',
      'eebbbde.......',
      '.ebbde........',
      '..eeee........',
      '..e..e........',
    ],
    [
      '..........eee.',
      '.........eyfe.',
      '........egffe.',
      '...eee.egffe..',
      '.eebbbeegfe...',
      'ewebwebege....',
      'eeebeeeee.....',
      'eebbbde.......',
      '.ebbde........',
      '..eeee........',
      '..e..e........',
    ],
  ],
};
const whirlseedHit: Sprite = {
  w: 14,
  h: 11,
  palette: whirlseedPalette,
  frames: [
    [
      '..............',
      '...........eee',
      '..........eyfe',
      '.........egffe',
      '....eee.egffe.',
      '..eebbbegffe..',
      '.eebeeebefe...',
      '.ebebedde.....',
      '..ebbbde......',
      '...eeee.......',
      '...e..e.......',
    ],
  ],
};

// Velmoth (wind, size 1, 15x11)
// A plush moth hovers toward the left with feathered yellow combs, paired
// black eyes, a fuzzy collar and maroon-traced triangular wings.
const velmothPalette: Record<string, string> = { e: COLORS.void, k: COLORS.skin, m: COLORS.maroon, g: COLORS.gray, w: COLORS.white, y: COLORS.yellow };
const velmothIdle: Sprite = {
  w: 15,
  h: 11,
  palette: velmothPalette,
  frames: [
    [
      'eyeye..........',
      'eyyyyeee.....ee',
      '..eeyekkkeeekke',
      'eyeyeekmekekmke',
      'eyyyekkmkkkmeke',
      '.eeekgkkkmmkge.',
      '.ekeeweekkmge..',
      '.ekeekeekgge...',
      '..ekkkkggee....',
      '...eeeeee......',
      '...............',
    ],
    [
      '..eyeye........',
      '.eyyyyee.....ee',
      '..eeyekkkeeekke',
      'eyeyeekmekekmke',
      'eyyyekkmkkkmeke',
      '.eeekgkkkmmkge.',
      '.ekeeweekkmge..',
      '.ekeekeekgge...',
      '..ekkkkkgee....',
      '...eeeeee......',
      '...............',
    ],
  ],
};
const velmothHit: Sprite = {
  w: 15,
  h: 11,
  palette: velmothPalette,
  frames: [
    [
      '...............',
      '..eyeye........',
      '..eyyyyee....ee',
      '...eeyekkeeekke',
      '.eyeyeekmkkemke',
      '.eyyyekkmkmkeke',
      '..eeekgkkmmkge.',
      '...ekekeekmge..',
      '...ekkeeegge...',
      '....eeeeeee....',
      '...............',
    ],
  ],
};

/** The 20 generated wind-type species, keyed by species id. */
export const windSprites = {
  kitekin: { idle: kitekinIdle, hit: kitekinHit },
  nimbling: { idle: nimblingIdle, hit: nimblingHit },
  panewhirr: { idle: panewhirrIdle, hit: panewhirrHit },
  fanjack: { idle: fanjackIdle, hit: fanjackHit },
  skitterel: { idle: skitterelIdle, hit: skitterelHit },
  sporeplume: { idle: sporeplumeIdle, hit: sporeplumeHit },
  chimbrel: { idle: chimbrelIdle, hit: chimbrelHit },
  lantessa: { idle: lantessaIdle, hit: lantessaHit },
  vaneknight: { idle: vaneknightIdle, hit: vaneknightHit },
  skreave: { idle: skreaveIdle, hit: skreaveHit },
  curlhart: { idle: curlhartIdle, hit: curlhartHit },
  gyrodillo: { idle: gyrodilloIdle, hit: gyrodilloHit },
  cyclonarch: { idle: cyclonarchIdle, hit: cyclonarchHit },
  vellisk: { idle: velliskIdle, hit: velliskHit },
  millox: { idle: milloxIdle, hit: milloxHit },
  nubilan: { idle: nubilanIdle, hit: nubilanHit },
  dartfinch: { idle: dartfinchIdle, hit: dartfinchHit },
  glidefin: { idle: glidefinIdle, hit: glidefinHit },
  whirlseed: { idle: whirlseedIdle, hit: whirlseedHit },
  velmoth: { idle: velmothIdle, hit: velmothHit },
} satisfies Record<string, SpeciesSprites>;
