"use strict";
// GENERATED ART — wind-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.
Object.defineProperty(exports, "__esModule", { value: true });
exports.windSprites = void 0;
const palette_js_1 = require("../palette.js");
// Kitekin (wind, size 1, 13x11)
// A left-dipping white paper rhombus wears torn eyeholes and a crooked
// mouth, with one lower brown spar and a knotted steel tail bearing two red
// bows.
const kitekinPalette = { e: palette_js_1.COLORS.void, w: palette_js_1.COLORS.white, r: palette_js_1.COLORS.red, b: palette_js_1.COLORS.brown, s: palette_js_1.COLORS.steel };
const kitekinIdle = {
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
const kitekinHit = {
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
const nimblingPalette = { e: palette_js_1.COLORS.void, w: palette_js_1.COLORS.white, b: palette_js_1.COLORS.blue, s: palette_js_1.COLORS.steel, c: palette_js_1.COLORS.cyan };
const nimblingIdle = {
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
const nimblingHit = {
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
const panewhirrPalette = { e: palette_js_1.COLORS.void, g: palette_js_1.COLORS.green, G: palette_js_1.COLORS.forest, c: palette_js_1.COLORS.cyan, s: palette_js_1.COLORS.steel, y: palette_js_1.COLORS.yellow };
const panewhirrIdle = {
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
const panewhirrHit = {
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
const fanjackPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.skin, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon, w: palette_js_1.COLORS.white, c: palette_js_1.COLORS.cyan };
const fanjackIdle = {
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
const fanjackHit = {
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
const skitterelPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, s: palette_js_1.COLORS.skin, r: palette_js_1.COLORS.red, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray };
const skitterelIdle = {
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
const skitterelHit = {
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
const sporeplumePalette = { e: palette_js_1.COLORS.void, f: palette_js_1.COLORS.forest, w: palette_js_1.COLORS.white, b: palette_js_1.COLORS.brown, s: palette_js_1.COLORS.gray, y: palette_js_1.COLORS.yellow };
const sporeplumeIdle = {
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
const sporeplumeHit = {
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
const chimbrelPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, s: palette_js_1.COLORS.steel, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white, m: palette_js_1.COLORS.maroon };
const chimbrelIdle = {
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
const chimbrelHit = {
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
const lantessaPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, w: palette_js_1.COLORS.white, r: palette_js_1.COLORS.red, o: palette_js_1.COLORS.orange, y: palette_js_1.COLORS.yellow, s: palette_js_1.COLORS.skin };
const lantessaIdle = {
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
const lantessaHit = {
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
const vaneknightPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.steel, d: palette_js_1.COLORS.slate, r: palette_js_1.COLORS.red, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white };
const vaneknightIdle = {
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
const vaneknightHit = {
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
const skreavePalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, b: palette_js_1.COLORS.blue, s: palette_js_1.COLORS.steel, w: palette_js_1.COLORS.white, y: palette_js_1.COLORS.yellow };
const skreaveIdle = {
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
const skreaveHit = {
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
const curlhartPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray, s: palette_js_1.COLORS.steel };
const curlhartIdle = {
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
const curlhartHit = {
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
const gyrodilloPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon, s: palette_js_1.COLORS.steel, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white, y: palette_js_1.COLORS.yellow };
const gyrodilloIdle = {
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
const gyrodilloHit = {
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
const cyclonarchPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, t: palette_js_1.COLORS.steel, b: palette_js_1.COLORS.brown, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white };
const cyclonarchIdle = {
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
const cyclonarchHit = {
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
const velliskPalette = { e: palette_js_1.COLORS.void, o: palette_js_1.COLORS.orange, w: palette_js_1.COLORS.white, r: palette_js_1.COLORS.red };
const velliskIdle = {
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
const velliskHit = {
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
const milloxPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon, w: palette_js_1.COLORS.white, c: palette_js_1.COLORS.cyan, s: palette_js_1.COLORS.steel };
const milloxIdle = {
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
const milloxHit = {
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
const nubilanPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, b: palette_js_1.COLORS.blue, c: palette_js_1.COLORS.cyan, s: palette_js_1.COLORS.steel, w: palette_js_1.COLORS.white };
const nubilanIdle = {
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
const nubilanHit = {
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
const dartfinchPalette = { e: palette_js_1.COLORS.void, o: palette_js_1.COLORS.orange, m: palette_js_1.COLORS.maroon, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white, s: palette_js_1.COLORS.steel };
const dartfinchIdle = {
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
const dartfinchHit = {
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
const glidefinPalette = { e: palette_js_1.COLORS.void, w: palette_js_1.COLORS.white, s: palette_js_1.COLORS.steel, p: palette_js_1.COLORS.skin, o: palette_js_1.COLORS.orange, c: palette_js_1.COLORS.cyan };
const glidefinIdle = {
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
const glidefinHit = {
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
const whirlseedPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, d: palette_js_1.COLORS.maroon, g: palette_js_1.COLORS.green, f: palette_js_1.COLORS.forest, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white };
const whirlseedIdle = {
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
const whirlseedHit = {
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
const velmothPalette = { e: palette_js_1.COLORS.void, k: palette_js_1.COLORS.skin, m: palette_js_1.COLORS.maroon, g: palette_js_1.COLORS.gray, w: palette_js_1.COLORS.white, y: palette_js_1.COLORS.yellow };
const velmothIdle = {
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
const velmothHit = {
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
exports.windSprites = {
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
};
