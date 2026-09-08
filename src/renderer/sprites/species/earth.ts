// GENERATED ART — earth-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.

import { COLORS } from '../palette.js';
import type { Sprite } from '../sprite.js';
import type { SpeciesSprites } from '../monsters.js';

// Lichenwing (earth, size 2, 17x14)
// A fat left-facing moth holds two tall lichen wings upright, each with a
// black-ringed square white eyespot and stepped outer notch, above its
// compound eye and forward plumed antennae.
const lichenwingPalette: Record<string, string> = { e: COLORS.void, g: COLORS.green, G: COLORS.forest, w: COLORS.white, f: COLORS.gray, b: COLORS.brown, y: COLORS.yellow };
const lichenwingIdle: Sprite = {
  w: 17,
  h: 14,
  palette: lichenwingPalette,
  frames: [
    [
      '......eee...eee..',
      '.....eggGe.eggGe.',
      '....eeeeGeeeeeeGe',
      '....ewweGeGewweGe',
      '.eyyewweGeGewweGe',
      '.eyyeeeeGeGeeeee.',
      '...eeeegGe.egGGe.',
      'eyye.eegGe.egGe..',
      'eyyeefeeGe.eGee..',
      '...eyyefeeeeffe..',
      '..efeeefffffffGe.',
      '.efeeeefyfffffGGe',
      '..effffefffffGGe.',
      '...eeeeeeeeeeee..',
    ],
    [
      '......eee...eee..',
      '.....eggGe.eggGe.',
      '....eeeeGeeeeeeGe',
      '....ewweGeGewweGe',
      '.eyyewweGeGewweGe',
      '.eyyeeeeGeGeeeee.',
      '...eeeegGe.egGGe.',
      '.eyye.egGe.egGe..',
      '.eyyefeeGe.eGee..',
      '...eyyefeeeeffe..',
      '..efeeefffffffGe.',
      '.efeeeefyfffffGGe',
      '..effffefffffGGe.',
      '...eeeeeeeeeeee..',
    ],
  ],
};
const lichenwingHit: Sprite = {
  w: 17,
  h: 14,
  palette: lichenwingPalette,
  frames: [
    [
      '.................',
      '.......eee...eee.',
      '......eggGe.eggGe',
      '.....eeeeGeeeeeee',
      '..eyyewweGeGewwee',
      '..eyyewweGeGewwee',
      '....eeeeeGeGeeeee',
      '.....eeegGe.egGe.',
      '..eyye.egGe.egGe.',
      '..eyyeeefeeeeffe.',
      '....efeeefffffGGe',
      '...efeefffyfffGGe',
      '....effffffffGGe.',
      '....eeeeeeeeeeee.',
    ],
  ],
};

// Sumpfang (earth, size 2, 17x14)
// A blunt mud-eel rears left in a tall S above its hollow tail ring, with a
// single forked bone spade under its flat mouth.
const sumpfangPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, G: COLORS.forest, g: COLORS.gray, w: COLORS.white };
const sumpfangIdle: Sprite = {
  w: 17,
  h: 14,
  palette: sumpfangPalette,
  frames: [
    [
      '...eeeeee........',
      '.eegggbbbge......',
      'egwgbwbbbGe......',
      'egebbebbbGGe.....',
      'eeeeeeeebbGGe....',
      '.ewwe...ebGGGe...',
      '.ewewe...ebGGe...',
      '.e.e.e..ebGGe....',
      '.......ebGGe.....',
      '......ebGGe......',
      '....eeebGGeeee...',
      '..eeggbbGGbbbgee.',
      '.egbGe......eGbGe',
      '..eeeeeeeeeeeee..',
    ],
    [
      '.................',
      '...eeeeee........',
      '.eegwgbwge.......',
      'egbebbeebGe......',
      'egbbbbbbGGGe.....',
      '.eeeeeeebGGGe....',
      '..ewwe..ebGGe....',
      '..ewewe.ebGGe....',
      '..e.e.eebGGe.....',
      '......ebGGe......',
      '....eeebGGeeee...',
      '..eeggbbGGbbbgee.',
      '.egbGe......eGbGe',
      '..eeeeeeeeeeeee..',
    ],
  ],
};
const sumpfangHit: Sprite = {
  w: 17,
  h: 14,
  palette: sumpfangPalette,
  frames: [
    [
      '.................',
      '.................',
      '.....eeeeee......',
      '...eegggbbbgee...',
      '..eggegbegbbbGe..',
      '..egbbeebebbbGGe.',
      '..eeeeeeeebbGGe..',
      '...ewwe..ebGGe...',
      '...eweweebGGe....',
      '...e.e.ebGGe.....',
      '.....eebGGeeee...',
      '...eegbbGGbbbgee.',
      '..egGe......eGbGe',
      '...eeeeeeeeeeee..',
    ],
  ],
};

// Bramblebear (earth, size 3, 20x17)
// A low-snouted bark bear plants thorn-hook paws beneath a moss cape, four
// separated back thorns and one outlined red shoulder berry.
const bramblebearPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, G: COLORS.forest, g: COLORS.green, r: COLORS.red };
const bramblebearIdle: Sprite = {
  w: 20,
  h: 17,
  palette: bramblebearPalette,
  frames: [
    [
      '......e...e.........',
      '.....eb..eb...e.....',
      '.....eeeeeee.eb...e.',
      '....eggggggGeeee.eb.',
      '...eggggggGGGGGeeee.',
      '...eggGGggGGGbbbbbbe',
      '..eeGGGGGeebbmbbbbbe',
      '.ebbeGGGerrebmbbbbbe',
      '.ebbbeeGerrebbbbbme.',
      'ebrebbeGGeebbbbbbme.',
      'ebbbbbeGGGbbmbbbbme.',
      'ebbbbeebbbmbbmbbbme.',
      '.eeeeebbbmmeebbmmme.',
      '...ebbbmemme.ebbmme.',
      '..ebbbbeeme..ebbme..',
      '.egegege.ee.egegbme.',
      'eeeeeeee.ee.eeeeeee.',
    ],
    [
      '......e...e.........',
      '.....eb..eb...e.....',
      '.....eeeeeee.eb...e.',
      '....eggggggGeeee.eb.',
      '...eggggggGGGGGeeee.',
      '...egggGggGGGbbbbbbe',
      '..eeGGGGGeebbmbbbbbe',
      '.ebbeGGGerrebmbbbbbe',
      '.ebbbeeGerrebbbbbme.',
      'ebrebbeGGeebbbbbbme.',
      'ebbbbbeGGGbbbmbbbme.',
      '.ebbbeebbbmbbmbbbme.',
      '.eeeeebbbmmeebbmmme.',
      '...ebbbmemme.ebbmme.',
      '..ebbbbeeme..ebbme..',
      '.egegege.ee.egegbme.',
      'eeeeeeee.ee.eeeeeee.',
    ],
  ],
};
const bramblebearHit: Sprite = {
  w: 20,
  h: 17,
  palette: bramblebearPalette,
  frames: [
    [
      '....................',
      '.......e...e........',
      '......eb..eb...e....',
      '......eeeeeee.eb...e',
      '.....eggggggGeeee.eb',
      '....eggggggGGGGGeeee',
      '....eggGGggGGbbbbbbe',
      '...eeGGGGGeebmbbbbbe',
      '..ebbeGGGerrebmbbbme',
      '..ebbbeGGerrebbbbmme',
      '.ebeeebeGGeebbbbbmme',
      '.ebbbbbeGGbmbbbbmme.',
      '..eeeeebbbmmeebbmmme',
      '....ebbbmemme.ebbmme',
      '...ebbbbeeme..ebbme.',
      '..egegege.ee.egegbme',
      '.eeeeeeee.ee.eeeeeee',
    ],
  ],
};

// Fellstump (earth, size 3, 20x17)
// An armless walking stump shoves its flat ringed cut top left, with a huge
// pale spiral eye and a buried broken axe bleeding orange rust.
const fellstumpPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, g: COLORS.gray, s: COLORS.steel, o: COLORS.orange, w: COLORS.white };
const fellstumpIdle: Sprite = {
  w: 20,
  h: 17,
  palette: fellstumpPalette,
  frames: [
    [
      '.eeeeeeeeeeeeeee....',
      '.ewwwwwwwwwwwgge....',
      '.ewbbbbbbbbbbgge....',
      '.ewbwwwwwwwbggge....',
      '.egggggggggggbbe....',
      '.egsssssbbgbbbbe....',
      '.eswwwwwsbgbbbbe....',
      '.eswbbbwsggbbbbee...',
      '.eswbebwsgbbbegsse..',
      '.eswbeewsgbboegssse.',
      '.eswwwwssgbbooegge..',
      '..essssgbgbbooebe...',
      '.eeebbbgbgbboobbe...',
      '...ebbbgbeebbbbbe...',
      '..eebbbbe..ebbbbe...',
      '.ebbebbe...ebebbbe..',
      'eee.eeee..eee.eeeee.',
    ],
    [
      '.eeeeeeeeeeeeeee....',
      '.ewwwwwwwwwwwgge....',
      '.ewbbbbbbbbbbgge....',
      '.ewbwwwwwwwbggge....',
      '.egggggggggggbbe....',
      '.egsssssbggbbbbe....',
      '.eswwwwwsbgbbbbe....',
      '.eswbbbwsggbbbbee...',
      '.eswbebwsgbbbegsse..',
      '.eswbeewsgbboegssse.',
      '.eswwwwssgbbooegge..',
      '..essssgbgbbooebe...',
      '..eebbbgbgbboobbe...',
      '...ebbbgbeebbbbbe...',
      '...ebbbbe..ebbbbe...',
      '..bbebbe...ebebbbe..',
      'eee.eeee..eee.eeeee.',
    ],
  ],
};
const fellstumpHit: Sprite = {
  w: 20,
  h: 17,
  palette: fellstumpPalette,
  frames: [
    [
      '....................',
      '...eeeeeeeeeeeeeee..',
      '...ewwwwwwwwwwwgge..',
      '...ewbbbbbbbbbbgge..',
      '...ewbwwwwwwwbggge..',
      '...egggggggggggbbe..',
      '...egsssssbbgbbbbe..',
      '...eswwwssbbgbbbee..',
      '...esweeebgbbbegsse.',
      '...eswwwssgbboegssse',
      '...essssgbgbbooegge.',
      '....eebbgbgbbooebe..',
      '...eeebbgbgbboobbe..',
      '.....ebbgeebbbbbe...',
      '....ebbbe..ebbbbe...',
      '...ebbbe....ebbbee..',
      '..eeeeee....eeeeeee.',
    ],
  ],
};

// Quarryback (earth, size 3, 20x17)
// An ancient low-headed tortoise carries three quarry strata stepping down
// to its tail, a vertical cut and dark bore-hole, all supported by four
// column legs.
const quarrybackPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, t: COLORS.steel, b: COLORS.brown, w: COLORS.white };
const quarrybackIdle: Sprite = {
  w: 20,
  h: 17,
  palette: quarrybackPalette,
  frames: [
    [
      '......eeeeeee.......',
      '......ettttse.......',
      '......egeetse.......',
      '......egeetse.......',
      '......egggtse.......',
      '......eeeeeseeee....',
      '......egggtsttse....',
      '......eggstsgsse....',
      '......eeeeeseeseeee.',
      '......egggtsggsggse.',
      '.eeeeeeggstsggsgsse.',
      'eesssseeeeeseeessse.',
      'ewwgggggggggggssssee',
      'eegggggssssssssssse.',
      'eeeeeege.ese.ege.ese',
      '.....ege.ese.ege.ese',
      '.....eee.eee.eee.eee',
    ],
    [
      '......eeeeeee.......',
      '......ettttse.......',
      '......egeetse.......',
      '......egeetse.......',
      '......egggtse.......',
      '......eeeeeseeee....',
      '......egggtsttse....',
      '......eggstsgsse....',
      '......eeeeeseeseeee.',
      '.eeeeeegggtsggsggse.',
      'eessseeggstsggsgsse.',
      'ewwgggeeeeeseeessse.',
      'eegggggggggggggsssee',
      'eeeeegggsssssssssee.',
      'eeeeeege.ese.ege.ese',
      '.....ege.ese.ege.ese',
      '.....eee.eee.eee.eee',
    ],
  ],
};
const quarrybackHit: Sprite = {
  w: 20,
  h: 17,
  palette: quarrybackPalette,
  frames: [
    [
      '....................',
      '.......eeeeeee......',
      '.......ettttse......',
      '.......egeetse......',
      '.......egggtse......',
      '.......eeeeeseeee...',
      '.......egggtsttse...',
      '.......eggstsgsse...',
      '.......eeeeeseeseee.',
      '.......egggtsggsgse.',
      '.......eggstsggssse.',
      '...eeeeeeeeeseeessse',
      '..essssgggggggssssee',
      '.eesegggssssssssssse',
      '..eeeeege.ese.ege.se',
      '......ege.ese.ege.se',
      '......eee.eee.eee.ee',
    ],
  ],
};

// Kabulk (earth, size 3, 20x15)
// A low six-clawed navy beetle sights left along one level milky quartz brow
// lance, its cracked root below paired orange eyes and a steel-lit shoulder
// ridge.
const kabulkPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, s: COLORS.slate, t: COLORS.steel, o: COLORS.orange, w: COLORS.white };
const kabulkIdle: Sprite = {
  w: 20,
  h: 15,
  palette: kabulkPalette,
  frames: [
    [
      '....................',
      '.........eeeeee.....',
      '.......eetttnnnee...',
      '......etttnnnnnnne..',
      '.....ettnnnnnnnnnne.',
      '.....ennnnnnnnnnnne.',
      '.eeeeenooneoonnnnne.',
      'ewwwwsennnnnnnnnnne.',
      '.eewtteeeeeetnnnnne.',
      '.....etttttteennnne.',
      '....eennnnnnsseeee..',
      '...eseesneesneesnee.',
      '.eseeseeseeseeseese.',
      'eseeseeseeseeseese..',
      'ee.ee.ee.ee.ee.ee...',
    ],
    [
      '....................',
      '....................',
      '.........eeeeee.....',
      '.......eetttnnnee...',
      '......etttnnnnnnne..',
      '.....ettnnnnnnnnnne.',
      '.eeeeenooneoonnnnne.',
      'ewwwwsennnnnnnnnnne.',
      '.eewtteeeeeetnnnnne.',
      '.....etttttteennnne.',
      '....eennnnnnsseeee..',
      '...eseesneesneesnee.',
      '.eseeseeseeseeseese.',
      'eseeseeseeseeseese..',
      'ee.ee.ee.ee.ee.ee...',
    ],
  ],
};
const kabulkHit: Sprite = {
  w: 20,
  h: 15,
  palette: kabulkPalette,
  frames: [
    [
      '....................',
      '....................',
      '....................',
      '..........eeeeee....',
      '........eettnnnnee..',
      '.......ettnnnnnnnne.',
      '......ennnnnnnnnnnne',
      '..eeeeeneenennnnnnne',
      '.ewwwwsenonnonnnnnne',
      '..eewtteeeeeetnnnnne',
      '......etttttteeeeeee',
      '.....eennnnnnsseeee.',
      '..eseeseeseeseeseese',
      '..eseeseeseeseeseese',
      '..ee.ee.ee.ee.ee.eee',
    ],
  ],
};

// Quagmaw (earth, size 3, 20x17)
// A layered peat slab rides on two buried log struts, with a peeled root
// lip, three broken-branch teeth, widely separated yellow eyes, and one log
// breaking through its top.
const quagmawPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, f: COLORS.forest, g: COLORS.gray, y: COLORS.yellow };
const quagmawIdle: Sprite = {
  w: 20,
  h: 17,
  palette: quagmawPalette,
  frames: [
    [
      '...........eeeeee...',
      '...........egbbbe...',
      '...........ebbbbe...',
      '...eeeeeeeeeeebeee..',
      '..eyyyebbbeyyyebbbbe',
      '..eyeyebbbeyeyeebbbe',
      '.eeyyyegbbeyyyeegbbe',
      'eggggggeebbeeeggbbbe',
      'eeeggmeeegegggbbbmme',
      '.eeggmegggemmmmmmmme',
      '.eemmmegggemmbbbbmme',
      '.eeggmmeemeggbbbbmge',
      '.eeggmmeeeegggmmmge.',
      '.eebbbbbbbbbbbbmmee.',
      '...eeeeeeeeeeeeeee..',
      '.....ebbe.....ebbe..',
      '....eeeee....eeeee..',
    ],
    [
      '...........eeeeee...',
      '...........egbbbe...',
      '...........ebbbbe...',
      '...eeeeeeeeeeebeee..',
      '..eyyyebbbeyyyebbbbe',
      '..eyeyebbbeyeyeebbbe',
      '.eeyyyebbbeyyyeegbbe',
      'eggggggeebbeeeggbbbe',
      'eeeggmeeegegggbbbmme',
      '.eeggmegggemmmmmmmme',
      '.eemmmegggemmbbbbmme',
      '.eeggmmeemeggbbbbmge',
      '.eeggmmeeeegggmmmge.',
      '.eebbbbbbbbbbbbmmee.',
      '...eeeeeemeeeeeeee..',
      '.....egbe.....egbe..',
      '....eeeee....eeeee..',
    ],
  ],
};
const quagmawHit: Sprite = {
  w: 20,
  h: 17,
  palette: quagmawPalette,
  frames: [
    [
      '....................',
      '....................',
      '.............eeee...',
      '.............egbe...',
      '.......eeeeeeebbeee.',
      '....eeeebbbbbbebbbbe',
      '...egyeebbbbgyyebbbe',
      '..eeeeygbbbeeeegbbbe',
      '.eggggggeebbbggggbbe',
      '.eeeggggmeegggbbbmme',
      '....gggmgggemmmmmme.',
      '...emmmmgggemmbbbmme',
      '..emgggmemmeggbbbge.',
      '..eeggbbbbbbbbbmmee.',
      '....eeeeeeeeeeeeeee.',
      '......ebbe.....ebbe.',
      '.....eeeee....eeeee.',
    ],
  ],
};

// Wickerhusk (earth, size 3, 18x17)
// A stooped branch-and-rope figure has a green-eyed woven knot for a head,
// dangling narrow arms, and paired ribs around a dark chest holding twelve
// pale stones.
const wickerhuskPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, s: COLORS.skin, y: COLORS.yellow, g: COLORS.green, a: COLORS.gray };
const wickerhuskIdle: Sprite = {
  w: 18,
  h: 17,
  palette: wickerhuskPalette,
  frames: [
    [
      '......eeee........',
      '....eeybbbe.......',
      '....ebgbgbe.......',
      '.....ebbbbe.......',
      '.....eebbeee......',
      '...eeebeeeebee....',
      '...ebebeeeebebe...',
      '...ebebysssbebe...',
      '...ebebsassbebe...',
      '...ebebssasbebe...',
      '...ebebeeeebebe...',
      '...eb..ebybe.be...',
      '...ee..ebbe..ee...',
      '......eb..be......',
      '......eb..be......',
      '......eb..be......',
      '.....eee..eee.....',
    ],
    [
      '......eeee........',
      '....eeybbbe.......',
      '....ebgbgbe.......',
      '.....ebbbbe.......',
      '.....eebbeee......',
      '...eeebeeeebee....',
      '...ebebeeeebebe...',
      '...ebebysssbebe...',
      '...ebebsassbebe...',
      '...ebebssasbebe...',
      '...ebebeeeebebe...',
      '...eb..ebybe..be..',
      '...ee..ebbe...ee..',
      '......eb..be......',
      '......eb..be......',
      '......eb..be......',
      '.....eee..eee.....',
    ],
  ],
};
const wickerhuskHit: Sprite = {
  w: 18,
  h: 17,
  palette: wickerhuskPalette,
  frames: [
    [
      '..................',
      '.......eeee.......',
      '.....eeybbbe......',
      '.....ebeeebe......',
      '......ebbbbe......',
      '......eebbeee.....',
      '....eeebeeeebee...',
      '....ebebeeeebebe..',
      '....ebebysssbebe..',
      '....ebebsassbebe..',
      '....ebebssasbebe..',
      '....ebebeeeebebe..',
      '....eb..ebybe.be..',
      '....ee..ebbe..ee..',
      '.......eb..be.....',
      '.......eb..be.....',
      '......eee..eee....',
    ],
  ],
};

// Grumblode (earth, size 1, 15x11)
// A squat left-leaning river boulder has a deep chipped crown notch, low
// round eyes, a cracked mouth and two blunt near-side knuckle stones beneath
// a dirt-flat belly.
const grumblodePalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, b: COLORS.brown, w: COLORS.white };
const grumblodeIdle: Sprite = {
  w: 15,
  h: 11,
  palette: grumblodePalette,
  frames: [
    [
      '...eee....ee...',
      '..ewgge..egge..',
      '.ewggge.egggge.',
      '.egggggeeggggse',
      'ewwgwwgggggggse',
      'eewgewgggggggse',
      'eggggggggggssse',
      '.eeeegegsssssse',
      'eeggebbeeggbbe.',
      'ewggsebewggsbe.',
      'eeeeee.eeeeeee.',
    ],
    [
      '...eee....ee...',
      '..ewgge..egge..',
      '.ewggge.egggge.',
      '.egggggeeggggse',
      'ewwgwwgggggggse',
      'eewgewgggggggse',
      'egggggggggggsse',
      '.eeegeegsssssse',
      'eeggebbeeggbbe.',
      'ewggsebewggsbe.',
      'eeeeee.eeeeeee.',
    ],
  ],
};
const grumblodeHit: Sprite = {
  w: 15,
  h: 11,
  palette: grumblodePalette,
  frames: [
    [
      '...............',
      '.....eee....ee.',
      '....ewgge..egge',
      '...ewggge.eggse',
      '...egggggeeggse',
      '..eggeggeggggse',
      '..egeggeggggsse',
      '..egggggeesssse',
      '..eeegebbeggbbe',
      '.ewggsebewggsbe',
      '.eeeeee.eeeeeee',
    ],
  ],
};

// Chirrgrit (earth, size 1, 15x11)
// A low left-facing burrow cricket rasps two strapped stone plates above a
// massive Z-folded jumping leg, scattering brown dust.
const chirrgritPalette: Record<string, string> = { e: COLORS.void, f: COLORS.forest, s: COLORS.slate, g: COLORS.gray, b: COLORS.brown, w: COLORS.white };
const chirrgritIdle: Sprite = {
  w: 15,
  h: 11,
  palette: chirrgritPalette,
  frames: [
    [
      '...............',
      '......eeee.eee.',
      '.....eggggeggge',
      '..eeeeggeeggee.',
      '.essssfeeffssse',
      'eswwssffessgsse',
      'esewssffeessse.',
      'essssffeeessebb',
      '.eeeeeee.sssebb',
      '..e..e..esssse.',
      '.ee..ee.eeeeee.',
    ],
    [
      '...............',
      '.......eee.....',
      '.....eegggeeee.',
      '..eeeeggeeggge.',
      '.essssfeeffssee',
      'eswwssffessgsse',
      'esewssffeessse.',
      'essssffeeessee.',
      '.eeeeeee.sssebb',
      '..e..e..esssebb',
      '.ee..ee.eeeeee.',
    ],
  ],
};
const chirrgritHit: Sprite = {
  w: 15,
  h: 11,
  palette: chirrgritPalette,
  frames: [
    [
      '...............',
      '...............',
      '.......eeeeeee.',
      '......eggegggge',
      '....eeeeeeggee.',
      '...essssfeessse',
      '..eseessffessse',
      '..esseffffeesse',
      '...eeeeeeeessse',
      '....e..e.essebb',
      '...ee..eeeeeebb',
    ],
  ],
};

// Gillstub (earth, size 1, 15x11)
// A flat gray fungus cap shows dark grinning gills above a tall pale
// left-facing stalk and root feet, venting a detached white spore square.
const gillstubPalette: Record<string, string> = { e: COLORS.void, g: COLORS.gray, s: COLORS.slate, p: COLORS.skin, b: COLORS.brown, w: COLORS.white };
const gillstubIdle: Sprite = {
  w: 15,
  h: 11,
  palette: gillstubPalette,
  frames: [
    [
      '...eeeeeeeeeee.',
      'ww.ewwgggggggse',
      'ww.eggggggsssse',
      '...eseseesessee',
      '....epppppeeee.',
      '....epepepe....',
      '....ewppppe....',
      '....eeppppe....',
      '....eppppbe....',
      '...epppepbbbe..',
      '...eeeee.eeee..',
    ],
    [
      'ww.eeeeeeeeeee.',
      'ww.ewwgggggggse',
      '...eggggggsssse',
      '...eseseesessee',
      '....epppppeeee.',
      '....epepepe....',
      '....ewppppe....',
      '....eeppppe....',
      '....eppppbe....',
      '...epppepbbbe..',
      '...eeeee.eeee..',
    ],
  ],
};
const gillstubHit: Sprite = {
  w: 15,
  h: 11,
  palette: gillstubPalette,
  frames: [
    [
      '...............',
      '.ww..eeeeeeeeee',
      '.ww.ewwggggggse',
      '....egggggsssse',
      '....eseseesesee',
      '......eppppeee.',
      '......eeepee...',
      '......ewpppe...',
      '.....eepppbe...',
      '....epppepbbe..',
      '....eeeee.eeee.',
    ],
  ],
};

// Cobbleroll (earth, size 1, 15x11)
// A low left-facing pillbug carries three orange-edged overlapping steel
// armour bands above a blunt head and exactly three pin legs.
const cobblerollPalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, b: COLORS.brown, o: COLORS.orange, w: COLORS.white, g: COLORS.slate };
const cobblerollIdle: Sprite = {
  w: 15,
  h: 11,
  palette: cobblerollPalette,
  frames: [
    [
      '.........eeeee.',
      '......eeeeoooe.',
      '....eeeooessse.',
      '...eeooesessse.',
      '..eowsessessse.',
      '.eesssessesssbe',
      'eoeeoeessesssbe',
      'ebbeessesesse..',
      'ebbesssssebbe..',
      '.eeeeeeeeeee...',
      '..eb..eb..eb...',
    ],
    [
      '.........eeeee.',
      '......eeeeoooe.',
      '....eeeooessse.',
      '...eeooesessse.',
      '..eowsessessse.',
      '.eesssessesssbe',
      'eoeeoeessesssbe',
      'ebbeessesesse..',
      'ebbesssssebbe..',
      '.eeeeeeeeeee...',
      '..eb..eb...eb..',
    ],
  ],
};
const cobblerollHit: Sprite = {
  w: 15,
  h: 11,
  palette: cobblerollPalette,
  frames: [
    [
      '...............',
      '..........eeeee',
      '.......eeeeoooe',
      '.....eeeooessse',
      '....eeooesessse',
      '...eossesesesbe',
      '..eeeesesesssbe',
      '.eoeeessesesse.',
      '.ebbeesssssebe.',
      '..eeeeeeeeeee..',
      '...eb..eb..eb..',
    ],
  ],
};

// Flintwren (earth, size 1, 15x11)
// A stout left-facing stone bird folds its wings vertically, braces on its
// long tail, and sparks from three swept-back flint crest chips.
const flintwrenPalette: Record<string, string> = { e: COLORS.void, g: COLORS.gray, s: COLORS.steel, w: COLORS.white, y: COLORS.yellow, b: COLORS.brown };
const flintwrenIdle: Sprite = {
  w: 15,
  h: 11,
  palette: flintwrenPalette,
  frames: [
    [
      '.......eee.....',
      '.....eewge.ee..',
      '....ewggeeewge.',
      '...eewggeewggee',
      '..ewewggggeewge',
      'eeywwwggesgbeee',
      '.eeegggesggbbe.',
      '....eggessgebbe',
      '....ebgeeeeebbe',
      '.....b...b...be',
      '....ebe.ebe..ee',
    ],
    [
      '..y....eee.....',
      '...y.eewge.ee..',
      '..y.ewggeeewge.',
      '...eewggeewggee',
      '..ewewggggeewge',
      'eeywwwggesgbeee',
      '.eeegggesggbbe.',
      '....eggesggebbe',
      '....ebgeeeeebbe',
      '.....b...b...be',
      '....ebe.ebe..ee',
    ],
  ],
};
const flintwrenHit: Sprite = {
  w: 15,
  h: 11,
  palette: flintwrenPalette,
  frames: [
    [
      '...............',
      '.........eee...',
      '.......eewgeee.',
      '......ewggeewge',
      '.....eewggeewge',
      '....egeegggeeee',
      '..eeyggggesgbe.',
      '...eeegggesgbbe',
      '.....ebgeeeeebe',
      '......b...b..be',
      '.....ebe.ebe.ee',
    ],
  ],
};

// Moldwarp (earth, size 1, 15x11)
// A blind earth-furred burrower faces left over whiskers and crossed broad
// steel shovel-claws, with a low barrel back and wedge tail.
const moldwarpPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, m: COLORS.maroon, p: COLORS.skin, s: COLORS.steel, w: COLORS.white };
const moldwarpIdle: Sprite = {
  w: 15,
  h: 11,
  palette: moldwarpPalette,
  frames: [
    [
      '...............',
      '......eeeee....',
      '....eebbbbbee..',
      '...epbbbbbbbbe.',
      '..epeebeebbmme.',
      '.eepppbbbbbmmme',
      '..ewpwpwbbmmeme',
      'eesse.eesebmmme',
      'eswsesswsemmme.',
      '.esssesssemme..',
      'essse.essseeee.',
    ],
    [
      '...............',
      '.......eee.....',
      '....eeebbbeee..',
      '...epbbbbbbbbe.',
      '..epeebeebbmme.',
      '.eepppbbbbbmmme',
      '..ewpwpwbbmmeme',
      'eesse.eesebmmme',
      'eswsesswsemmme.',
      '.esssesssemme..',
      'essse.essseeee.',
    ],
  ],
};
const moldwarpHit: Sprite = {
  w: 15,
  h: 11,
  palette: moldwarpPalette,
  frames: [
    [
      '...............',
      '...............',
      '.......eeeeee..',
      '.....eepbbbbbe.',
      '....epbbbbbmmme',
      '...eepebeebmmme',
      '....ewpwpwbmmme',
      '..eesse.eesemme',
      '..eswsesswsemme',
      '...esssesssemme',
      '..essse.essseee',
    ],
  ],
};

// Spadeling (earth, size 1, 15x11)
// A tilted steel trowel peers left through cyan rust holes, its down-left
// blade point balanced on twitching root fingers.
const spadelingPalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, g: COLORS.gray, b: COLORS.brown, o: COLORS.orange, c: COLORS.cyan, m: COLORS.slate };
const spadelingIdle: Sprite = {
  w: 15,
  h: 11,
  palette: spadelingPalette,
  frames: [
    [
      '.........eee...',
      '........ebbe...',
      '.....eeeobe....',
      '....esssee.....',
      '...esocosge....',
      '..esscesggge...',
      '..esseeeggme...',
      '.esssggmme.....',
      '..eeeeebee.....',
      '.....ebebbe....',
      '....ee.e.ee....',
    ],
    [
      '........eee....',
      '........ebbe...',
      '.....eeeobe....',
      '....esssee.....',
      '...esocosge....',
      '..esscesggge...',
      '..esseeeggme...',
      '.esssggmme.....',
      '..eeeeebee.....',
      '.....ebbebe....',
      '....ee..eee....',
    ],
  ],
};
const spadelingHit: Sprite = {
  w: 15,
  h: 11,
  palette: spadelingPalette,
  frames: [
    [
      '...............',
      '..........eee..',
      '.........ebbe..',
      '......eeeobe...',
      '.....essssee...',
      '....esoeosgge..',
      '...esseeeegme..',
      '..essssggmme...',
      '...eeeeebee....',
      '......ebbbee...',
      '.....ee.e.ee...',
    ],
  ],
};

// Helmdelver (earth, size 2, 17x14)
// A low brown burrower peers left below a dented steel helmet shield, its
// burning rim lamp casting a yellow wedge over paired flat digging claws.
const helmdelverPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, b: COLORS.brown, s: COLORS.steel, g: COLORS.gray, y: COLORS.yellow, w: COLORS.white };
const helmdelverIdle: Sprite = {
  w: 17,
  h: 14,
  palette: helmdelverPalette,
  frames: [
    [
      '......eee.eee....',
      '.....eswseesge...',
      '....eswsssssgge..',
      '...eesssssssggge.',
      '.yyeywsssssgggge.',
      'yy.eeyeeeeeeeeee.',
      '.....eebbbbmmme..',
      '..eeeebbbbbmmmme.',
      '.ebwbwbbbbbmmmme.',
      'ebbbbbbbbbmmmmme.',
      '.eeemmbbbbmmmme..',
      '..ebbbe..ebbbe...',
      '.ebssbbeebssbbe..',
      '.eeeeee..eeeeee..',
    ],
    [
      '.................',
      '......eee.eee....',
      '.....eswseesge...',
      '....eswsssssgge..',
      '...eesssssssggge.',
      '.yyeywsssssgggge.',
      'yy.eeyeeeeeeeeee.',
      '..eeeebbbbbmmmme.',
      '.ebwbwbbbbbmmmme.',
      'ebbbbbbbbbmmmmme.',
      '.eeemmbbbbmmmme..',
      '..ebbbe..ebbbe...',
      '.ebssbbeebssbbe..',
      '.eeeeee..eeeeee..',
    ],
  ],
};
const helmdelverHit: Sprite = {
  w: 17,
  h: 14,
  palette: helmdelverPalette,
  frames: [
    [
      '.................',
      '.................',
      '........eee.eee..',
      '.......eswseesge.',
      '......eswssssgge.',
      '.....eywssssgggge',
      '...yyeeyeeeeeeeee',
      '..yy...eebbbmmme.',
      '....eeeebbbbmmmme',
      '...ebebebbbbmmmme',
      '..ebbbbbbbbmmmme.',
      '...eeebbbeebbbe..',
      '...ebssbbeebssbbe',
      '...eeeeee..eeeeee',
    ],
  ],
};

// Thornhare (earth, size 2, 17x14)
// A lean left-facing hare of bare dead cane coils inside leafless bramble
// beneath two forked ears tipped with white thorns.
const thornharePalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, g: COLORS.gray, s: COLORS.slate, m: COLORS.maroon, w: COLORS.white };
const thornhareIdle: Sprite = {
  w: 17,
  h: 14,
  palette: thornharePalette,
  frames: [
    [
      '...w...ww...w....',
      '...eg.eseg.ge....',
      '....ege..ege.....',
      '.....ge...ge.....',
      '.....eg..ege.....',
      '...eeeg.ege......',
      '..egwwwgge.eeee..',
      '.egbwewgeeggbggew',
      'emgggbbeegbeegbe.',
      '.eeeegbgbebgbgbe.',
      '.....ebeegebgbge.',
      '....egbe.ebebgbe.',
      '...egbe...egbgee.',
      '..eeee....eeeeee.',
    ],
    [
      '...w...ww...w....',
      '...eg.eseg.ge....',
      '....ege..ege.....',
      '.....ge...ge.....',
      '.....eg..ege.....',
      '...eeeg.ege......',
      '..egwwwgge.eeee..',
      '.egbwewgeegggbgew',
      'emgggbbeegbeegbe.',
      '.eeeegbgbeebgbge.',
      '.....ebeegbgbgge.',
      '....egbe.ebebgbe.',
      '...egbe...egbgee.',
      '..eeee....eeeeee.',
    ],
  ],
};
const thornhareHit: Sprite = {
  w: 17,
  h: 14,
  palette: thornharePalette,
  frames: [
    [
      '.................',
      '....w...ww....w..',
      '....eg.eseg..ge..',
      '.....ege..gege...',
      '......ge...ge....',
      '......eg..ege....',
      '.....eeg.ege.....',
      '....egwgge.eeee..',
      '..emgbebgeeggbgew',
      '...eeegbgegbeegbe',
      '......ebgbebgbgbe',
      '.....egbeegbgbge.',
      '....egbe..egbgee.',
      '...eeee....eeeeee',
    ],
  ],
};

// Cairnlith (earth, size 2, 17x14)
// Three left-leaning slate slabs bear twin cyan vein eyes, a chiselled
// mouth, and a green lichen strip above a broad grounded base.
const cairnlithPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, t: COLORS.steel, l: COLORS.green, c: COLORS.cyan };
const cairnlithIdle: Sprite = {
  w: 17,
  h: 14,
  palette: cairnlithPalette,
  frames: [
    [
      '..eeeeeeeeee.....',
      '.ettttggggsse....',
      'eccssccssssse....',
      'eeseeeesssse.....',
      '.eeeeeeeeee......',
      '.................',
      '...eeeeeeeeeeee..',
      '..etttlllggsssse.',
      '...eeeeeeeeeeee..',
      '.................',
      '....eeeeeeeeeee..',
      '...ettttgggsssse.',
      '..egggggsssssssse',
      '..eeeeeeeeeeeeeee',
    ],
    [
      '...eeeeeeeeee....',
      '..ettttggggsse...',
      '.eccssccssssse...',
      '.eeseeeesssse....',
      '..eeeeeeeeee.....',
      '.................',
      '...eeeeeeeeeeee..',
      '..etttlllggsssse.',
      '...eeeeeeeeeeee..',
      '.................',
      '....eeeeeeeeeee..',
      '...ettttgggsssse.',
      '..egggggsssssssse',
      '..eeeeeeeeeeeeeee',
    ],
  ],
};
const cairnlithHit: Sprite = {
  w: 17,
  h: 14,
  palette: cairnlithPalette,
  frames: [
    [
      '.................',
      '...eeeeeeeeeee...',
      '..etesetesgssse..',
      '..esceescessse...',
      '...eeeeeeeeee....',
      '.................',
      '....eeeeeeeeeeee.',
      '...etttlllggssse.',
      '....eeeeeeeeeeee.',
      '.................',
      '....eeeeeeeeeee..',
      '...ettttgggsssse.',
      '..egggggsssssssse',
      '..eeeeeeeeeeeeeee',
    ],
  ],
};

// Drusehog (earth, size 2, 17x14)
// A low left-snouted stone hedgehog on four short paws, carrying five
// upright citrine needles with two clear pixels between their yellow-lit
// shafts.
const drusehogPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, o: COLORS.orange, y: COLORS.yellow, w: COLORS.white, n: COLORS.skin };
const drusehogIdle: Sprite = {
  w: 17,
  h: 14,
  palette: drusehogPalette,
  frames: [
    [
      '.................',
      '...e..e..e..e..e.',
      '...y..y..y..y..y.',
      '...y..y..y..y..y.',
      '...o..o..o..o..o.',
      '..eyoeyoeyoeyoeye',
      '..eeooeooeooeooee',
      '.ewwwessggggggsse',
      '.eweewssgggssssse',
      'enneeessssssssse.',
      'eennssssssssssse.',
      '.essssessesssse..',
      '..ese.ese.ese.ese',
      '..eee.eee.eee.eee',
    ],
    [
      '.................',
      '...e..e..e..e..e.',
      '...y..y..y..y..y.',
      '...y..y..y..y..y.',
      '...o..o..o..o..o.',
      '..eyoeyoeyoeyoeye',
      '..eeooeooeooeooee',
      '.ewwwesgggggsssse',
      '.eweewssgggssssse',
      'enneeessssssssse.',
      'eennssssggssssse.',
      '.essssessesssse..',
      '..ese.ese.ese.ese',
      '..eee.eee.eee.eee',
    ],
  ],
};
const drusehogHit: Sprite = {
  w: 17,
  h: 14,
  palette: drusehogPalette,
  frames: [
    [
      '.................',
      '.................',
      '....e..e..e..e..e',
      '....y..y..y..y..y',
      '....y..y..y..y..y',
      '....o..o..o..o..o',
      '....eyoeyoeyoeyoe',
      '...eeooeooeooeooe',
      '..essessgggggssse',
      '..eseesssssssssse',
      '.enneesssssssssse',
      '.eennssessessssse',
      '...ese.ese.eseese',
      '...eee.eee.eeeeee',
    ],
  ],
};

// Terrakin (earth, size 2, 17x14)
// A thin hollow clay sentry faces left in a rigid marching stance, with a
// cylindrical slit helmet, a broken shoulder notch, a diagonal crack and a
// long steel-tipped spear.
const terrakinPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, o: COLORS.orange, k: COLORS.skin, s: COLORS.steel, w: COLORS.white, m: COLORS.maroon };
const terrakinIdle: Sprite = {
  w: 17,
  h: 14,
  palette: terrakinPalette,
  frames: [
    [
      '......eeeee......',
      '.....ekooobe.....',
      '.....eweeeebe....',
      '.....eoooobe.....',
      '......ebbbe......',
      '.ee...eekeee.....',
      'esse..ekooee.....',
      'essboooekmobe....',
      '.ee...eekomobe...',
      '.......eobbme....',
      '........ebbe.....',
      '.......eobeobe...',
      '.......ebe.ebe...',
      '......ebbe.ebbbe.',
    ],
    [
      '......eeeee......',
      '.....ekooobe.....',
      '.....eweeeebe....',
      '.....eoooobe.....',
      '......ebbbe......',
      '.ee...eeoeee.....',
      'esse..ekkoee.....',
      'essboooekmobe....',
      '.ee...eeokmobe...',
      '.......eobbme....',
      '........ebbe.....',
      '.......eobeobe...',
      '.......ebe.ebe...',
      '......ebbe.ebbbe.',
    ],
  ],
};
const terrakinHit: Sprite = {
  w: 17,
  h: 14,
  palette: terrakinPalette,
  frames: [
    [
      '.................',
      '.......eeeee.....',
      '......ekooobe....',
      '......eeeweebe...',
      '......eoooobe....',
      '.......ebbbe.....',
      '..ee...eekeee....',
      '.esse..ekooee....',
      '.essboooekmobe...',
      '..ee...ekomobe...',
      '........ebbme....',
      '........eobeobe..',
      '........ebe.ebe..',
      '.......ebbe.ebbbe',
    ],
  ],
};

/** The 20 generated earth-type species, keyed by species id. */
export const earthSprites = {
  lichenwing: { idle: lichenwingIdle, hit: lichenwingHit },
  sumpfang: { idle: sumpfangIdle, hit: sumpfangHit },
  bramblebear: { idle: bramblebearIdle, hit: bramblebearHit },
  fellstump: { idle: fellstumpIdle, hit: fellstumpHit },
  quarryback: { idle: quarrybackIdle, hit: quarrybackHit },
  kabulk: { idle: kabulkIdle, hit: kabulkHit },
  quagmaw: { idle: quagmawIdle, hit: quagmawHit },
  wickerhusk: { idle: wickerhuskIdle, hit: wickerhuskHit },
  grumblode: { idle: grumblodeIdle, hit: grumblodeHit },
  chirrgrit: { idle: chirrgritIdle, hit: chirrgritHit },
  gillstub: { idle: gillstubIdle, hit: gillstubHit },
  cobbleroll: { idle: cobblerollIdle, hit: cobblerollHit },
  flintwren: { idle: flintwrenIdle, hit: flintwrenHit },
  moldwarp: { idle: moldwarpIdle, hit: moldwarpHit },
  spadeling: { idle: spadelingIdle, hit: spadelingHit },
  helmdelver: { idle: helmdelverIdle, hit: helmdelverHit },
  thornhare: { idle: thornhareIdle, hit: thornhareHit },
  cairnlith: { idle: cairnlithIdle, hit: cairnlithHit },
  drusehog: { idle: drusehogIdle, hit: drusehogHit },
  terrakin: { idle: terrakinIdle, hit: terrakinHit },
} satisfies Record<string, SpeciesSprites>;
