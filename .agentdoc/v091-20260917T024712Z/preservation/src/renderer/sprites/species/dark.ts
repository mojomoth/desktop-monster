// GENERATED ART — dark-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.

import { COLORS } from '../palette.js';
import type { Sprite } from '../sprite.js';
import type { SpeciesSprites } from '../monsters.js';

// Rictus (dark, size 2, 17x14)
// A left-pointed notched theatre mask shows red-pinned eyeholes and barred
// teeth above a pleated navy ruff, rigid square robe and red lacquer knot at
// its back.
const rictusPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, w: COLORS.white, r: COLORS.red, s: COLORS.slate };
const rictusIdle: Sprite = {
  w: 17,
  h: 14,
  palette: rictusPalette,
  frames: [
    [
      '.....eeeeeee.....',
      '...eewwwwwwwe....',
      '..ewweewweewwe...',
      '.ewwerewrewe.....',
      'ewwwwwwwwwwwwe...',
      'ewewewewewweeeeee',
      '..eeeeeeeeeeerrre',
      '..enenenenenerere',
      '...esnnnnnnnerrre',
      '...esnnnnnnnerrre',
      '...esnnsnnnneeeee',
      '...esnnsnnnne....',
      '...esnnsnnnne....',
      '...eeeeeeeeee....',
    ],
    [
      '.....eeeeeee.....',
      '...eewwwwwwwe....',
      '..ewweewweewwe...',
      '.ewwerewrewe.....',
      'ewwwwwwwwwwwwe...',
      'ewewewewewweeeeee',
      '..eeeeeeeeeeerrre',
      '..enenenenenerere',
      '...esnnnnnnnerrre',
      '...esnnnnnnnerrre',
      '...esnnsnnnneeeee',
      '...esnnnsnnne....',
      '...esnnnsnnne....',
      '...eeeeeeeeee....',
    ],
  ],
};
const rictusHit: Sprite = {
  w: 17,
  h: 14,
  palette: rictusPalette,
  frames: [
    [
      '.................',
      '......eeeeeee....',
      '....eewwwwwwwe...',
      '...ewwewwewwwe...',
      '..ewwweeweewe....',
      '..eweweweweweeeee',
      '....eeeeeeeeerrre',
      '...eneneneneerere',
      '....esnnnnnnerrre',
      '....esnnnnnnerrre',
      '....esnnsnnneeeee',
      '....esnnsnnnne...',
      '....esnnsnnnne...',
      '....eeeeeeeeee...',
    ],
  ],
};

// Hexweaver (dark, size 2, 17x14)
// A low-slung left-facing spider hangs between three high bent legs, with
// separated red eyes, pale fangs and a red hourglass on its rear abdomen.
const hexweaverPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, w: COLORS.white, s: COLORS.slate, r: COLORS.red, g: COLORS.gray };
const hexweaverIdle: Sprite = {
  w: 17,
  h: 14,
  palette: hexweaverPalette,
  frames: [
    [
      '.................',
      '........ee.......',
      '...ee..egeg..ee..',
      '..egeg.egeg.egeg.',
      '..eg.eeg..egegegs',
      '..eg.eeg..egeg.eg',
      '.eg...eeg..eeeeeg',
      '.eg.eeeeeeemrrrme',
      '.egermrmmmemmrmme',
      '.egemmwmwmemmrmme',
      '.eg.eweweeemrrrme',
      'eg...e.eg..emmmeg',
      'eg.....eg...eeeeg',
      'ee.....ee......ee',
    ],
    [
      '.................',
      '........ee.......',
      '...ee..egeg..ee..',
      '..egeg.egeg.egeg.',
      '..eg.eeg..egegegs',
      '..eg.eeg..egeg.eg',
      '.eg...eeg..eeeeeg',
      '.eg.eeeeeeemrrrme',
      '.egermrmmmemmrmme',
      '.egemmwmwmemmrmme',
      '.eg.emwemeemrrrme',
      'eg...ee.e..emmmeg',
      'eg.....eg...eeeeg',
      'ee.....ee......ee',
    ],
  ],
};
const hexweaverHit: Sprite = {
  w: 17,
  h: 14,
  palette: hexweaverPalette,
  frames: [
    [
      '.................',
      '.................',
      '........ee.......',
      '...ees.egeg..ees.',
      '..egegsegegsegegs',
      '..eg.eeg..egegegs',
      '..eg.eegs.eeeeeeg',
      '.eg..eeeeeemrrrme',
      '.eg.eeeeemeemrmme',
      '.eg.emmwmwmemrmme',
      '.eg..eweweemrrrme',
      'eg....e.e..emmmeg',
      'eg.....eg...eeeeg',
      'ee.....ee......ee',
    ],
  ],
};

// Chainwraith (dark, size 2, 17x14)
// A blue-slit iron-helmed spirit reaches left with three talons, its smoke
// stump chained to a steel-banded open coffin with a maroon lining.
const chainwraithPalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, g: COLORS.gray, b: COLORS.blue, w: COLORS.white, m: COLORS.maroon };
const chainwraithIdle: Sprite = {
  w: 17,
  h: 14,
  palette: chainwraithPalette,
  frames: [
    [
      '....eeee.........',
      '...ewssgee.......',
      '..esssssgee......',
      '..ebbsebge.......',
      '..esessegge......',
      '...eeesssssee....',
      'e.eeegsssssssseee',
      'egggggggeeessssse',
      'eeggeeeggeesemmme',
      '.egg..eggeesemmme',
      'eeg...eggeesemmme',
      'e....eeg.eesemmme',
      '.....ee...essssse',
      '..........eeeeee.',
    ],
    [
      '....eeee.........',
      '...ewssgee.......',
      '..esssssgee......',
      '..ebbsebge.......',
      '..esessegge......',
      '...eeesssssee....',
      'e.eeegsssssssseee',
      'egggggggeeessssse',
      'eeggeeeggeesemmme',
      '.eg...eggeesemmme',
      'eeg...eggeesemmme',
      '.....eegg.esemmme',
      '......ee..essssse',
      '..........eeeeee.',
    ],
  ],
};
const chainwraithHit: Sprite = {
  w: 17,
  h: 14,
  palette: chainwraithPalette,
  frames: [
    [
      '.................',
      '.....eeee........',
      '....ewssgee......',
      '...esssssgee.....',
      '...eseeesege.....',
      '....eesssssee....',
      '....eegssssssseee',
      '..eeeggggeessssse',
      '.eeggggggeesemmme',
      '..eg.eeggeesemmme',
      '.ee...eggeesemmme',
      '......eegeesemmme',
      '.......ee.essssse',
      '..........eeeeee.',
    ],
  ],
};

// Gravebloom (dark, size 2, 16x14)
// Four mourning petal-jaws gape left around white seed teeth and a black
// throat above a stout stalk and trailing roots, backed by a forest shell.
const gravebloomPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, f: COLORS.forest, s: COLORS.slate, w: COLORS.white, g: COLORS.green, y: COLORS.yellow };
const gravebloomIdle: Sprite = {
  w: 16,
  h: 14,
  palette: gravebloomPalette,
  frames: [
    [
      '....eee.........',
      '...esmmee.......',
      '..esymmemee.....',
      '.eemmmwemyme....',
      'esmmweewmmmfffe.',
      '.eweeeeewmefffe.',
      '..eeeeeeewefffe.',
      'esmweeeewmefffe.',
      '.esmmwwmmmee....',
      '..eemmmmee......',
      '....eeeege......',
      '.......ege..eee.',
      '.....eeegfeegfe.',
      '...eegfeeeegfeee',
    ],
    [
      '.....ee.........',
      '...eesmme.......',
      '..esymmemee.....',
      '.eemmmwemyme....',
      'esmmweewmmmfffe.',
      '.eweeeeewmefffe.',
      '..eeeeeeewefffe.',
      'esmweeeewmefffe.',
      '.esmmwwmmmee....',
      '...eemmmee......',
      '....eeeege......',
      '.......ege...ee.',
      '.....eeegfeegfe.',
      '...eegfeeeegfeee',
    ],
  ],
};
const gravebloomHit: Sprite = {
  w: 16,
  h: 14,
  palette: gravebloomPalette,
  frames: [
    [
      '................',
      '......eee.......',
      '.....esmmmee....',
      '...eesemmemee...',
      '..esmmmwemmmffe.',
      '...ewweewmefffe.',
      '....eeeeewefffe.',
      '..emmwewmmefffe.',
      '...emmwwmmmee...',
      '....eemmmee.....',
      '......eege......',
      '.......ege..eee.',
      '.....eeegfeegfe.',
      '...eegfeeeegfeee',
    ],
  ],
};

// Cryptshell (dark, size 2, 17x14)
// A stalk-eyed hermit spirit bears a cracked funeral urn with an ajar lid,
// chipped corner and maroon rear band while holding a candle on its raised
// left pincer.
const cryptshellPalette: Record<string, string> = { e: COLORS.void, g: COLORS.gray, s: COLORS.slate, b: COLORS.brown, m: COLORS.maroon, o: COLORS.orange, y: COLORS.yellow };
const cryptshellIdle: Sprite = {
  w: 17,
  h: 14,
  palette: cryptshellPalette,
  frames: [
    [
      '..........eeee...',
      '.y......eegggse..',
      'oyo....egggseee..',
      'ege.....eeeeeee..',
      'ege.....eggggse..',
      'ege....egggggse..',
      'ege.e..eggggsmmme',
      'eg.eeeeeggesmmmme',
      'eggeyeeyegssmmmme',
      '.eseeeeeegssmmmme',
      '..eeseseeeeeee...',
      '...esseesssse....',
      '..eses.ees.esese.',
      '.eee.ee..ee.eee..',
    ],
    [
      '..........eeee...',
      '..y.....eegggse..',
      '.oyo...egggseee..',
      'ege.....eeeeeee..',
      'ege.....eggggse..',
      'ege....egggggse..',
      'ege.e..eggggsmmme',
      'eg.eeeeeggesmmmme',
      'eggeyeeyegssmmmme',
      '.eseeeeeegssmmmme',
      '..eeseseeeeeee...',
      '...esseesssse....',
      '...ese.ees.esese.',
      '.eee.ee..ee.eee..',
    ],
  ],
};
const cryptshellHit: Sprite = {
  w: 17,
  h: 14,
  palette: cryptshellPalette,
  frames: [
    [
      '.................',
      '...........eeee..',
      '...y.....eegggse.',
      '..oyo...egggseee.',
      '..ege....eggggse.',
      '..ege...egggggse.',
      '..egee..eggggsmmm',
      '..eggeeeeggesmmme',
      '.egggeegeegssmmmm',
      '..esegeegegssmmmm',
      '...eeseseeeeeee..',
      '....esseesssse...',
      '...eses.ees.esese',
      '..eee.ee..ee.eee.',
    ],
  ],
};

// Sorrowstilt (dark, size 3, 20x17)
// A left-facing hooded wader with a seven-pixel yellow needle bill, a
// red-ringed white eye, a rectangular shoulder brand and two dragging
// feather blades.
const sorrowstiltPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, n: COLORS.navy, w: COLORS.white, b: COLORS.brown, y: COLORS.yellow, r: COLORS.red };
const sorrowstiltIdle: Sprite = {
  w: 20,
  h: 17,
  palette: sorrowstiltPalette,
  frames: [
    [
      '.........eeee.......',
      '........esssse......',
      '........essssne.....',
      '.eeeeeeeesrrsne.....',
      'eyyyyyyyerwrnne.....',
      '.eeeeeeeesrsnne.....',
      '.........esssnne....',
      '.........esssnnee...',
      '..........esssrrre..',
      '..........esnsrrre..',
      '.........esnnsrrre..',
      '.........esnnsrrre..',
      '.........esnnnnsne..',
      '.........esnneesne..',
      '.........esnne.esne.',
      '.........esnne.esne.',
      '..........ee....ee..',
    ],
    [
      '.........eeee.......',
      '........esssse......',
      '........essssne.....',
      '.eeeeeeeesrrsne.....',
      'eyyyyyyyerwrnne.....',
      '.eeeeeeeesrsnne.....',
      '.........esssnne....',
      '.........esssnnee...',
      '..........esssrrre..',
      '..........esnsrrre..',
      '.........esnnsrrre..',
      '.........esnnsrrre..',
      '.........esnnnnsne..',
      '.........esnneesne..',
      '.........esnne.esne.',
      '........esnne..esne.',
      '.........ee.....ee..',
    ],
  ],
};
const sorrowstiltHit: Sprite = {
  w: 20,
  h: 17,
  palette: sorrowstiltPalette,
  frames: [
    [
      '....................',
      '..........eeee......',
      '.........esssse.....',
      '.........essssne....',
      '..eeeeeeeesrrsne....',
      '.eyyyyyyyerernne....',
      '..eeeeeeeesrsnne....',
      '..........esssnnee..',
      '..........essssrrre.',
      '...........esnsrrre.',
      '..........esnnsrrre.',
      '..........esnnsrrre.',
      '..........esnnnnsne.',
      '..........esnneesne.',
      '..........esnne.esne',
      '..........esnne.esne',
      '...........ee....ee.',
    ],
  ],
};

// Sicklehood (dark, size 3, 20x17)
// A forward-leaning hooded mantis opens a three-notched steel scythe above
// bent hind legs, with yellow compound eyes and a warning chevron on its
// hinged wing case.
const sicklehoodPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, t: COLORS.steel, y: COLORS.yellow, m: COLORS.maroon, w: COLORS.white };
const sicklehoodIdle: Sprite = {
  w: 20,
  h: 17,
  palette: sicklehoodPalette,
  frames: [
    [
      '.....eeeeeee........',
      '....etttssssee......',
      '...etssssssssee.....',
      '...eseyyeyysse......',
      '...eseyyeyysse......',
      '....eseeseeeseee....',
      '.....eeseemssttte...',
      '..eeeeeemmessttse...',
      '.ettteesemessstsyyse',
      'ettteeseemessstssyye',
      'ette.eseemmesstesyye',
      'ettteeee.emessssyyse',
      'ette......emeeeee...',
      '.ette.....em..em....',
      '..eee....em....em...',
      '........em......em..',
      '.......eee......eee.',
    ],
    [
      '.....eeeeeee........',
      '....etttssssee......',
      '...etssssssssee.....',
      '...eseyyeyysse......',
      '...eseyyeyysse......',
      '....eseeseeeseee....',
      '.....eeseemssttte...',
      '..eeeeeemmessttse...',
      '.ettttesemessstsyyse',
      '.etteeseemessstssyye',
      '.etteeseemmesstesyye',
      '.ettteee.emessssyyse',
      '.ette.....emeeeee...',
      '..ette....em..em....',
      '...eee...em....em...',
      '........em......em..',
      '.......eee......eee.',
    ],
  ],
};
const sicklehoodHit: Sprite = {
  w: 20,
  h: 17,
  palette: sicklehoodPalette,
  frames: [
    [
      '....................',
      '.......eeeeeee......',
      '......etttssssee....',
      '.....etsssssssse....',
      '.....eseeeseeese....',
      '......esyeeyssse....',
      '.......eseeeessee...',
      '.......eeemmssttte..',
      '...eeeeeemmessttse..',
      '..etttte.emesstsyye.',
      '..ettee..emessseyye.',
      '..ette...emmessteyye',
      '...ettee..emesssyye.',
      '....eee..eemmeeeee..',
      '........emmee..emme.',
      '.........eme...eme..',
      '........eeee..eeee..',
    ],
  ],
};

// Hollowstag (dark, size 3, 20x17)
// A crouching left-facing skull stag bears four forked antler tips with
// grave tags and a transparent rear-flank hollow enclosed by a thick cyan
// rim.
const hollowstagPalette: Record<string, string> = { e: COLORS.void, w: COLORS.white, g: COLORS.gray, n: COLORS.navy, c: COLORS.cyan, s: COLORS.steel };
const hollowstagIdle: Sprite = {
  w: 20,
  h: 17,
  palette: hollowstagPalette,
  frames: [
    [
      '.ee..ee..ee..ee.....',
      '.we..we..we..we.....',
      '.ewewee..ewewee.....',
      '..ewwe....ewwe......',
      '...wee....wee.......',
      '...wes...swee.......',
      '..eewseeeweeeeeeee..',
      '.ewwwwweennncccccce.',
      'ewweeweeeenncccccce.',
      'ewwceeceweeecc..cce.',
      'ewwwwwwewnnecc..cce.',
      '.eeeeeeewnnecccccce.',
      '......ewweneeccccce.',
      '.......ew.e...ne...e',
      '......ew..e....ne..e',
      '......ew..e....ne.e.',
      '.....eee.ee...eee.ee',
    ],
    [
      '.ee..ee..ee..ee.....',
      '.we..we..we..we.....',
      '.ewewee..ewewee.....',
      '..ewwe....ewwe......',
      '...wee....wee.......',
      '...wes....wee.......',
      '..eewseesweeeeeeee..',
      '.ewwwwweennncccccce.',
      'ewweeweeeenncccccce.',
      'ewwceeceweeecc..cce.',
      'ewwwwwwewnnecc..cce.',
      '.eeeeeeewnnecccccce.',
      '......ewweneeccccce.',
      '.......ew.e...ne...e',
      '......ew..e....ne..e',
      '......ew...e...ne.e.',
      '.....eee.ee...eee.ee',
    ],
  ],
};
const hollowstagHit: Sprite = {
  w: 20,
  h: 17,
  palette: hollowstagPalette,
  frames: [
    [
      '....................',
      '..ee..ee..ee..ee....',
      '..we..we..we..we....',
      '..ewewee..ewewee....',
      '...ewwe....ewwe.....',
      '....wes...swee......',
      '....wes...sweeeeeee.',
      '...eewweeeeennccccee',
      '..ewwwwwweenncccccce',
      '.ewweeweeweeecc..cce',
      '.ewweeweewenecc..cce',
      '..eeeeeeewnnecccccce',
      '.......ewwneecccccce',
      '.......ewe.e..enne.e',
      '......ewwe.e...ennee',
      '......ewe..e...ene.e',
      '.....eeee.ee...eeeee',
    ],
  ],
};

// Voidmaw (dark, size 3, 20x17)
// A left-facing angular shadow hulk braces one fist beside its vertical
// zipper maw while an iron lamp pierces its back, burning a rectangular
// yellow light.
const voidmawPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, w: COLORS.white, b: COLORS.blue, y: COLORS.yellow };
const voidmawIdle: Sprite = {
  w: 20,
  h: 17,
  palette: voidmawPalette,
  frames: [
    [
      '...............eeeee',
      '...............eyyye',
      '...............eyyye',
      '......eee......eyyye',
      '.....eggsee....eyyye',
      '....egsssssee..eeeee',
      '...egssssssse...ege.',
      '..egssssssssseegee..',
      '..esbbeebbsssegsee..',
      '..eeeeesssesesse....',
      '..ewewesssseseese...',
      '..eeweesssssessse...',
      '..ewewessssesessse..',
      '..eeweesssseeessse..',
      '.eewewessssesessse..',
      'eggeeeesssseeessse..',
      'eeeeeeeeeeeeeeeeee..',
    ],
    [
      '...............eeeee',
      '...............eyyye',
      '...............eyyye',
      '......eee......eyyye',
      '.....eggsee....eyyye',
      '....egsssssee..eeeee',
      '...egssssssse...ege.',
      '..egsssssssssegee...',
      '..esbbeebbsssegsee..',
      '..eeeeesssesesse....',
      '..ewewesssseseese...',
      '..eeweesssssessse...',
      '..ewewessssssessse..',
      '..eeweessssesessse..',
      '.eewewessssesessse..',
      'eggeeeesssseeessse..',
      'eeeeeeeeeeeeeeeeee..',
    ],
  ],
};
const voidmawHit: Sprite = {
  w: 20,
  h: 17,
  palette: voidmawPalette,
  frames: [
    [
      '....................',
      '...............eeeee',
      '...............eyyye',
      '...............eyyye',
      '...............eyyye',
      '........eee....eyyye',
      '......eeggsee..eeeee',
      '.....egssssssee.ege.',
      '....egssssssssegsee.',
      '....esebeebessesse..',
      '....eeeeessseseese..',
      '....ewewessssesse...',
      '....eeweesssssese...',
      '....ewewesssessesse.',
      '...eeeweessseesesse.',
      '..eggeeeesssessesse.',
      '..eeeeeeeeeeeeeeeee.',
    ],
  ],
};

// Shroudlamp (dark, size 3, 20x17)
// A left-facing legless mourner under a rigid rectangular lantern collar,
// with three white eyes, a cyan core, torn offset shrouds, maroon ribs and a
// barbed rear tendril.
const shroudlampPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, m: COLORS.maroon, t: COLORS.steel, g: COLORS.gray, c: COLORS.cyan, w: COLORS.white };
const shroudlampIdle: Sprite = {
  w: 20,
  h: 17,
  palette: shroudlampPalette,
  frames: [
    [
      '..eeeeeeeeeee.......',
      '..ettttttttse.......',
      '..eteeccceese.......',
      '..eteeccceese.......',
      '..eteeccceese.......',
      '..eeeeeeeeeeeee.....',
      '.egwggwggwgssse.....',
      '.eggggggssetsseeme..',
      '.eggssemmemesseeme..',
      '.eggsseemmmesseeme..',
      '.eggssemmemesseeme..',
      '.eggsseemmmeeeeeme..',
      '.eggssee.ee....es...',
      '.eeggee........es.ee',
      '...eee.........essee',
      '....................',
      '....................',
    ],
    [
      '....................',
      '..eeeeeeeeeee.......',
      '..ettttttttse.......',
      '..eteeccceese.......',
      '..eteeccceese.......',
      '..eteeccceese.......',
      '..eeeeeeeeeeeee.....',
      '.egwggwggwgssseeme..',
      '.eggggggssetsseeme..',
      '.eggsseemmmesseeme..',
      '.eggssemmemesseeme..',
      '.eggsseemmmeeeeeme..',
      '.eggssee.ee....es...',
      '.eeggee........es.ee',
      '...eee.........essee',
      '....................',
      '....................',
    ],
  ],
};
const shroudlampHit: Sprite = {
  w: 20,
  h: 17,
  palette: shroudlampPalette,
  frames: [
    [
      '....................',
      '....eeeeeeeeeee.....',
      '....ettttttttse.....',
      '....eteeccceese.....',
      '....eteeccceese.....',
      '....eteeccceese.....',
      '....eeeeeeeeeeeee...',
      '...egeggeggegssseee.',
      '...eggwggwggwseemse.',
      '...eggssssemmemsmse.',
      '...eggssseemmmesmse.',
      '...eggsssemmemesmse.',
      '...eggsseeeme.eeese.',
      '...eeggee.ee.....ese',
      '.....eee........esee',
      '....................',
      '....................',
    ],
  ],
};

// Gallowplate (dark, size 3, 20x17)
// A downturned empty helm leads a leaning steel tower, with a loose
// shoulder, cocked gauntlet, slashed back surcoat and pooled cloak.
const gallowplatePalette: Record<string, string> = { e: COLORS.void, s: COLORS.steel, g: COLORS.gray, r: COLORS.red, m: COLORS.maroon, d: COLORS.slate, w: COLORS.white };
const gallowplateIdle: Sprite = {
  w: 20,
  h: 17,
  palette: gallowplatePalette,
  frames: [
    [
      '.....eeeee..........',
      '....ewsssee.........',
      '...ewssssge.........',
      '..errrrssge.........',
      '...eegggge..........',
      '......eee...........',
      '.....ewssseee...eee.',
      '....ewsssgggme.ewsge',
      '....esdssgggmmeesgge',
      '.....esdsgggrrremeee',
      '....eesdsgggrrreme..',
      '...ewgesdgggrrreme..',
      '...esgeedgggrrreme..',
      '....eeegggdemmmme...',
      '.....edgdggdemme....',
      '...eedggddmmmmmmee..',
      '..eeeeeeeeeeeeeeee..',
    ],
    [
      '.....eeeee..........',
      '....ewsssee.........',
      '...ewssssge.........',
      '..errrrssge.........',
      '...eegggge..........',
      '......eee...........',
      '.....ewssseee.......',
      '....ewsssgggme..eee.',
      '....esdssgggmmeewsge',
      '.....esdsgggrrresgge',
      '.....esdsgggrrremeee',
      '....eesdggggrrreme..',
      '...ewgeedgggrrreme..',
      '...esgegggdemmmme...',
      '....eedgdggdemme....',
      '...eedggddmmmmmmee..',
      '..eeeeeeeeeeeeeeee..',
    ],
  ],
};
const gallowplateHit: Sprite = {
  w: 20,
  h: 17,
  palette: gallowplatePalette,
  frames: [
    [
      '....................',
      '....................',
      '.......eeeee........',
      '......ewsssgee......',
      '.....essssssge......',
      '....eerrrssgge......',
      '......eegggge.......',
      '........eee.........',
      '.......ewssseee..eee',
      '......ewssgggmmeesge',
      '......esdsgggrrregge',
      '.....eesdggggrrremee',
      '....ewgesdgggrrreme.',
      '....esgeedgggrrreme.',
      '.....eeedggdemmmme..',
      '....eedgddmmmmmmmee.',
      '...eeeeeeeeeeeeeeeee',
    ],
  ],
};

// Mournbell (dark, size 3, 19x17)
// A left-swinging cracked iron bell has a hollow crown handle, dull yellow
// eyes, three rim teeth and a lolling clapper over two clawed feet.
const mournbellPalette: Record<string, string> = { e: COLORS.void, b: COLORS.brown, g: COLORS.gray, y: COLORS.yellow, s: COLORS.slate, w: COLORS.white };
const mournbellIdle: Sprite = {
  w: 19,
  h: 17,
  palette: mournbellPalette,
  frames: [
    [
      '........eeee.......',
      '.......eg..ge......',
      '.......eg..ge......',
      '......eeggggee.....',
      '.....egwgggggse....',
      '....egggggggssse...',
      '...egyeeggyggssee..',
      '..egeyeygyeygsyee..',
      '..egeeyeggygssyyye.',
      '..eggegggggsssyyye.',
      '.eggegsssssssseyee.',
      '.egessseeeeeesse...',
      'esseeeewwewwewwee..',
      '.eeeeeebbbeeeeeee..',
      '...essebbbeeesse...',
      '...egge..eeeegse...',
      '..ewewe....ewewe...',
    ],
    [
      '........eeee.......',
      '.......eg..ge......',
      '.......eg..ge......',
      '......eeggggee.....',
      '.....egwgggggse....',
      '....egggggggssse...',
      '...egyeeggyggssee..',
      '..egeyeygyeygsyee..',
      '..egeeyeggygssyyye.',
      '..eggegggggsssyyye.',
      '.eggegsssssssseyee.',
      '.egessseeeeeesse...',
      'esseeeewwewwewwee..',
      '.eeeeeeeebbbeeeee..',
      '...esseeebbbesse...',
      '...egge..eeeegse...',
      '..ewewe....ewewe...',
    ],
  ],
};
const mournbellHit: Sprite = {
  w: 19,
  h: 17,
  palette: mournbellPalette,
  frames: [
    [
      '...................',
      '.........eeee......',
      '........eg..ge.....',
      '........eg..ge.....',
      '.......eeggggee....',
      '......egwgggggse...',
      '.....egggggggssse..',
      '....egeeegggegssee.',
      '...egeyyeggyesyee..',
      '...egeegggeeessyyye',
      '...eggegggggsssyyye',
      '..eggegsssssssseyee',
      '.esseeeewwewwewwee.',
      '..eeeeeeebbbeeeeee.',
      '....esseebbbesse...',
      '....egge..eeeegse..',
      '...ewewe....ewewe..',
    ],
  ],
};

// Hooklure (dark, size 1, 15x11)
// A left-leaning airborne eel dangles a cyan lure before its glass eye, with
// a low dorsal fin and a solid rectangular maroon fan tail.
const hooklurePalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, m: COLORS.maroon, c: COLORS.cyan, w: COLORS.white };
const hooklureIdle: Sprite = {
  w: 15,
  h: 11,
  palette: hooklurePalette,
  frames: [
    [
      '..eeee.........',
      '..e..e.ee.eeeee',
      '.ee..eess.emmme',
      'ecceewwsssemmme',
      'ecceeewssssmmme',
      '.ee.essssssmmme',
      '....eeeemsseeee',
      '....esmmmme....',
      '.....eeeee.....',
      '...............',
      '...............',
    ],
    [
      '..eeee.........',
      '..e..e.ee.eeeee',
      '..e..eess.emmme',
      '.ee.ewwsssemmme',
      'ecceeewssssmmme',
      'ecceessssssmmme',
      '.ee.eeeemsseeee',
      '....esmmmme....',
      '.....eeeee.....',
      '...............',
      '...............',
    ],
  ],
};
const hooklureHit: Sprite = {
  w: 15,
  h: 11,
  palette: hooklurePalette,
  frames: [
    [
      '...............',
      '...............',
      '....eeee.......',
      '....e..eeeeeeee',
      '...ee..esssmmme',
      '..ecceeesssmmme',
      '..ecceesseemmme',
      '...ee.esmmmmmme',
      '.......eeeeeeee',
      '...............',
      '...............',
    ],
  ],
};

// Quietus (dark, size 1, 13x11)
// A flightless left-facing moth perches on two tiny legs beneath a tall
// folded slate wing bearing a white-ringed eyespot, with cyan eyes in its
// fuzzy brown head.
const quietusPalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, t: COLORS.steel, c: COLORS.cyan, b: COLORS.brown, w: COLORS.white };
const quietusIdle: Sprite = {
  w: 13,
  h: 11,
  palette: quietusPalette,
  frames: [
    [
      '.......ee....',
      '......ete....',
      '......etse...',
      '.ee.ee.etse..',
      '..ebeebetssse',
      '.ebcbcetwwwwe',
      '.ebbbbbswtewe',
      '..ebbetsweewe',
      '...eeesswwwwe',
      '....e.eeeeeee',
      '....e....e...',
    ],
    [
      '.......ee....',
      '......ete....',
      '......etse...',
      '..ee..eetse..',
      '..bbeebetssse',
      '.ebcbcetwwwwe',
      '.ebbbbbswtewe',
      '..ebbtssweewe',
      '...eeesswwwwe',
      '....e.eeeeeee',
      '....e....e...',
    ],
  ],
};
const quietusHit: Sprite = {
  w: 13,
  h: 11,
  palette: quietusPalette,
  frames: [
    [
      '.............',
      '........ee...',
      '.......ete...',
      '.......etse..',
      '...ee.eeetse.',
      '...ebeetwwwwe',
      '...ebeeswtewe',
      '...ebbtsweewe',
      '....eesswwwwe',
      '.....eeeeeeee',
      '.....e....e..',
    ],
  ],
};

// Unblink (dark, size 1, 15x11)
// A left-looking eye hangs in a thick stitched maroon eyelid hoop, cinched
// into a rear knot beneath a heavy lid.
const unblinkPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, w: COLORS.white, n: COLORS.navy, g: COLORS.gray };
const unblinkIdle: Sprite = {
  w: 15,
  h: 11,
  palette: unblinkPalette,
  frames: [
    [
      '........ee.....',
      '....eeeeme.....',
      '..eeeeemgmeeee.',
      '.eeeewwwwmmmmme',
      'emmwemwwwmmmmme',
      'emmwemwwnmmmgme',
      '.emmwwwnmmemmme',
      '.emmmgmmmeeee..',
      '..eeeeeeee.....',
      '...............',
      '...............',
    ],
    [
      '...............',
      '........ee.....',
      '....eeeeme.....',
      '..eeeeemgmeeee.',
      '.eeeewwwwmmmmme',
      'emmwemwwwmmmmme',
      'emmwemwwnmmmgme',
      '.emmwwwnmmemmme',
      '.emmmgmmmeeee..',
      '..eeeeeeee.....',
      '...............',
    ],
  ],
};
const unblinkHit: Sprite = {
  w: 15,
  h: 11,
  palette: unblinkPalette,
  frames: [
    [
      '...............',
      '.........ee....',
      '......eeeme....',
      '....eemmmmme...',
      '...eeeeemmeeee.',
      '..emmeeewmmmmme',
      '..emmmmnnmmemme',
      '...emmmmmmemmme',
      '....eeeeeeeeee.',
      '...............',
      '...............',
    ],
  ],
};

// Glasshade (dark, size 1, 15x11)
// A left-tilted chipped black mirror walks on two square feet, its orange
// slit eyes and cracked mouth opposite a trapped fire reflection in the rear
// bevel.
const glasshadePalette: Record<string, string> = { e: COLORS.void, s: COLORS.slate, g: COLORS.gray, w: COLORS.white, o: COLORS.orange };
const glasshadeIdle: Sprite = {
  w: 15,
  h: 11,
  palette: glasshadePalette,
  frames: [
    [
      '..eeee.........',
      '..egsee........',
      '.egwwsee.......',
      '.egsssseeeeee..',
      'esoesoesegsose.',
      '.egssseesgoose.',
      '..eseesesgoooe.',
      '...eesesegoooe.',
      '....eeeeeeeee..',
      '.....ee...ee...',
      '.....ee...ee...',
    ],
    [
      '.eeee..........',
      '.egsee.........',
      '.egwwsee.......',
      '.egsssseeeeee..',
      'esoesoesegsose.',
      '.egssseesgoose.',
      '..eseesesgoooe.',
      '...eesesegoooe.',
      '....eeeeeeeee..',
      '.....ee...ee...',
      '.....ee...ee...',
    ],
  ],
};
const glasshadeHit: Sprite = {
  w: 15,
  h: 11,
  palette: glasshadePalette,
  frames: [
    [
      '...............',
      '.....eeee......',
      '....egwwee.....',
      '...egsssseeeee.',
      '..egoosoosgsose',
      '...egessssgsooe',
      '....eesessgoooe',
      '.....eesesgoooe',
      '.....eeeeeeeee.',
      '......ee...ee..',
      '......ee...ee..',
    ],
  ],
};

// Inknuckle (dark, size 1, 15x11)
// A torn slab of living ink walks on four blunt fingers beneath a split-nib
// thumb face and a wax-sealed raised wrist.
const inknucklePalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, s: COLORS.slate, w: COLORS.white, g: COLORS.gray };
const inknuckleIdle: Sprite = {
  w: 15,
  h: 11,
  palette: inknucklePalette,
  frames: [
    [
      '...............',
      '..e.e..........',
      '.eseese....eeee',
      'eeswswe...gmmme',
      '.eessssee.gmmme',
      '.eessssseegmmme',
      'eessssssssgmmme',
      '.essgssssssgeee',
      'esgessgessgese.',
      'esseesseesse...',
      'ee.ee.ee.ee....',
    ],
    [
      '...............',
      '...e.e.........',
      '..eseese...eeee',
      '.eeswswe..gmmme',
      '..eesssse.gmmme',
      '.eessssseegmmme',
      'eessssssssgmmme',
      '.essgssssssgeee',
      'esgessgessgese.',
      'esseesseesse...',
      'ee.ee.ee.ee....',
    ],
  ],
};
const inknuckleHit: Sprite = {
  w: 15,
  h: 11,
  palette: inknucklePalette,
  frames: [
    [
      '...............',
      '...............',
      '............eee',
      '.....eee..gmmme',
      '....esese.gmmme',
      '...eeseseegmmme',
      '..eesssssegmmme',
      '..essgsssssggee',
      '.essessgessgese',
      '.esseesseesse..',
      '.ee.ee.ee.ee...',
    ],
  ],
};

// Veilcap (dark, size 1, 15x11)
// A left-facing mushroom wears a scalloped grey dome with a maroon spiral at
// the back above a slit-eyed shadow face, narrow stalk and two planted feet.
const veilcapPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, s: COLORS.slate, w: COLORS.white, g: COLORS.gray };
const veilcapIdle: Sprite = {
  w: 15,
  h: 11,
  palette: veilcapPalette,
  frames: [
    [
      '....eeeeee.....',
      '..eewwggggmee..',
      '.ewwwgggggmmme.',
      'ewwgggggggssme.',
      'egggggggggmsme.',
      'eggeggeggemmme.',
      '..wweewweee....',
      '..eeeeeeee.....',
      '....esse.......',
      '...egesege.....',
      '...eee.eee.....',
    ],
    [
      '...............',
      '..eeeeeeegmee..',
      '.ewwwgggggmmme.',
      'ewwgggggggssme.',
      'egggggggggmsme.',
      'eggeggeggemmme.',
      '..wweewweee....',
      '..eeeeeeee.....',
      '....esse.......',
      '...egesege.....',
      '...eee.eee.....',
    ],
  ],
};
const veilcapHit: Sprite = {
  w: 15,
  h: 11,
  palette: veilcapPalette,
  frames: [
    [
      '...............',
      '......eeeeee...',
      '....eewwgggmee.',
      '...ewwwgggmmme.',
      '..ewwgggggssme.',
      '.eggggggggmsme.',
      '.eggeggeggemmme',
      '....eweewe.....',
      '.....esse......',
      '....egesege....',
      '....eee.eee....',
    ],
  ],
};

// Waxwick (dark, size 1, 15x11)
// A left-facing melted wax votive with sunken eyes, sealed mouth, sagging
// drip arms and a small orange flame on its rear crown wick.
const waxwickPalette: Record<string, string> = { e: COLORS.void, m: COLORS.maroon, s: COLORS.skin, o: COLORS.orange, w: COLORS.white, g: COLORS.gray };
const waxwickIdle: Sprite = {
  w: 15,
  h: 11,
  palette: waxwickPalette,
  frames: [
    [
      '..........eoe..',
      '.........eooe..',
      '.........eoooe.',
      '....eeeee.eoe..',
      '...ewwsse.e....',
      '..ewssssssee...',
      '..esesesssge...',
      '..esseesssgge..',
      '.eswsssgsgsmge.',
      '..esssgeggsme..',
      '...eeeeeeeee...',
    ],
    [
      '..........eoe..',
      '..........eooe.',
      '.........eoooe.',
      '....eeeee.eoe..',
      '...ewwsse.e....',
      '..ewssssssee...',
      '..esesesssge...',
      '..esseesssgge..',
      '..eswssgsgsmge.',
      '..essssgegsme..',
      '...eeeeeeeee...',
    ],
  ],
};
const waxwickHit: Sprite = {
  w: 15,
  h: 11,
  palette: waxwickPalette,
  frames: [
    [
      '...............',
      '............e..',
      '...........eoe.',
      '..........eooe.',
      '......eeeeeoe..',
      '.....ewwsssee..',
      '....ewssssssee.',
      '....eseessegge.',
      '...eswseessgmge',
      '....esssgsgsme.',
      '.....eeeeeeeee.',
    ],
  ],
};

// Nightlynx (dark, size 2, 17x14)
// A low leftward-prowling lynx has tufted ears, a slit gold eye, stretched
// forelegs, a raised shoulder blade, a hooked tail and two angular gold
// haunch chevrons.
const nightlynxPalette: Record<string, string> = { e: COLORS.void, n: COLORS.navy, s: COLORS.slate, t: COLORS.steel, y: COLORS.yellow, w: COLORS.white };
const nightlynxIdle: Sprite = {
  w: 17,
  h: 14,
  palette: nightlynxPalette,
  frames: [
    [
      '.................',
      '.................',
      '..............eee',
      '.............esne',
      '..e..e.......enee',
      '..ee.ee.......ene',
      '..esense.ee...ene',
      '.eesssseeesseeene',
      '.esynnnnnyynyynne',
      '.ennnnnnnnyynyyne',
      '..eennnnnnyynyyne',
      '...ennnnnyynyynne',
      '..enneeeeenn.eene',
      'eeenne...enneeeee',
    ],
    [
      '.................',
      '.................',
      '.............eee.',
      '.............esne',
      '..e..e.......enee',
      '..ee.ee.......ene',
      '..esensesee...ene',
      '.eesssseeesseeene',
      '.esynnnnnyynyynne',
      '.ennnnnnnnyynyyne',
      '..eennnnnnyynyyne',
      '...ennnnnyynyynne',
      '..enneeeeenn.eene',
      'eeenne...enneeeee',
    ],
  ],
};
const nightlynxHit: Sprite = {
  w: 17,
  h: 14,
  palette: nightlynxPalette,
  frames: [
    [
      '.................',
      '.................',
      '.................',
      '..............eee',
      '.............esne',
      '...e..e......enee',
      '...ee.ee......ene',
      '...esense.....ene',
      '..eesssseesseeene',
      '..esennnnnyynyyne',
      '..ennnnnnnnyynyye',
      '...eennnnnnyynyye',
      '...enneeynyynyyne',
      '.eeenneeeenneeee.',
    ],
  ],
};

/** The 20 generated dark-type species, keyed by species id. */
export const darkSprites = {
  rictus: { idle: rictusIdle, hit: rictusHit },
  hexweaver: { idle: hexweaverIdle, hit: hexweaverHit },
  chainwraith: { idle: chainwraithIdle, hit: chainwraithHit },
  gravebloom: { idle: gravebloomIdle, hit: gravebloomHit },
  cryptshell: { idle: cryptshellIdle, hit: cryptshellHit },
  sorrowstilt: { idle: sorrowstiltIdle, hit: sorrowstiltHit },
  sicklehood: { idle: sicklehoodIdle, hit: sicklehoodHit },
  hollowstag: { idle: hollowstagIdle, hit: hollowstagHit },
  voidmaw: { idle: voidmawIdle, hit: voidmawHit },
  shroudlamp: { idle: shroudlampIdle, hit: shroudlampHit },
  gallowplate: { idle: gallowplateIdle, hit: gallowplateHit },
  mournbell: { idle: mournbellIdle, hit: mournbellHit },
  hooklure: { idle: hooklureIdle, hit: hooklureHit },
  quietus: { idle: quietusIdle, hit: quietusHit },
  unblink: { idle: unblinkIdle, hit: unblinkHit },
  glasshade: { idle: glasshadeIdle, hit: glasshadeHit },
  inknuckle: { idle: inknuckleIdle, hit: inknuckleHit },
  veilcap: { idle: veilcapIdle, hit: veilcapHit },
  waxwick: { idle: waxwickIdle, hit: waxwickHit },
  nightlynx: { idle: nightlynxIdle, hit: nightlynxHit },
} satisfies Record<string, SpeciesSprites>;
