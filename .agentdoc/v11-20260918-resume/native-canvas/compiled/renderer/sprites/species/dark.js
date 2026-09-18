"use strict";
// GENERATED ART — dark-type species (SPEC F19, Assumption 4).
// Drawn by the Codex CLI (`gpt-6-astra`) from the roster briefs and
// mechanically validated (rectangular w×h frames, palette membership,
// DB16 colours, size band per hidden species size). Monsters face LEFT.
// Regenerate rather than hand-edit: see .agentdoc/roster/README.md.
Object.defineProperty(exports, "__esModule", { value: true });
exports.darkSprites = void 0;
const palette_js_1 = require("../palette.js");
// Rictus (dark, size 2, 17x14)
// A left-pointed notched theatre mask shows red-pinned eyeholes and barred
// teeth above a pleated navy ruff, rigid square robe and red lacquer knot at
// its back.
const rictusPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, w: palette_js_1.COLORS.white, r: palette_js_1.COLORS.red, s: palette_js_1.COLORS.slate };
const rictusIdle = {
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
const rictusHit = {
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
const hexweaverPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, w: palette_js_1.COLORS.white, s: palette_js_1.COLORS.slate, r: palette_js_1.COLORS.red, g: palette_js_1.COLORS.gray };
const hexweaverIdle = {
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
const hexweaverHit = {
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
const chainwraithPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.steel, g: palette_js_1.COLORS.gray, b: palette_js_1.COLORS.blue, w: palette_js_1.COLORS.white, m: palette_js_1.COLORS.maroon };
const chainwraithIdle = {
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
const chainwraithHit = {
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
const gravebloomPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, f: palette_js_1.COLORS.forest, s: palette_js_1.COLORS.slate, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.green, y: palette_js_1.COLORS.yellow };
const gravebloomIdle = {
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
const gravebloomHit = {
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
const cryptshellPalette = { e: palette_js_1.COLORS.void, g: palette_js_1.COLORS.gray, s: palette_js_1.COLORS.slate, b: palette_js_1.COLORS.brown, m: palette_js_1.COLORS.maroon, o: palette_js_1.COLORS.orange, y: palette_js_1.COLORS.yellow };
const cryptshellIdle = {
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
const cryptshellHit = {
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
const sorrowstiltPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, n: palette_js_1.COLORS.navy, w: palette_js_1.COLORS.white, b: palette_js_1.COLORS.brown, y: palette_js_1.COLORS.yellow, r: palette_js_1.COLORS.red };
const sorrowstiltIdle = {
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
const sorrowstiltHit = {
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
const sicklehoodPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, t: palette_js_1.COLORS.steel, y: palette_js_1.COLORS.yellow, m: palette_js_1.COLORS.maroon, w: palette_js_1.COLORS.white };
const sicklehoodIdle = {
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
const sicklehoodHit = {
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
const hollowstagPalette = { e: palette_js_1.COLORS.void, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray, n: palette_js_1.COLORS.navy, c: palette_js_1.COLORS.cyan, s: palette_js_1.COLORS.steel };
const hollowstagIdle = {
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
const hollowstagHit = {
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
const voidmawPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, g: palette_js_1.COLORS.gray, w: palette_js_1.COLORS.white, b: palette_js_1.COLORS.blue, y: palette_js_1.COLORS.yellow };
const voidmawIdle = {
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
const voidmawHit = {
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
const shroudlampPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, m: palette_js_1.COLORS.maroon, t: palette_js_1.COLORS.steel, g: palette_js_1.COLORS.gray, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const shroudlampIdle = {
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
const shroudlampHit = {
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
const gallowplatePalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.steel, g: palette_js_1.COLORS.gray, r: palette_js_1.COLORS.red, m: palette_js_1.COLORS.maroon, d: palette_js_1.COLORS.slate, w: palette_js_1.COLORS.white };
const gallowplateIdle = {
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
const gallowplateHit = {
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
const mournbellPalette = { e: palette_js_1.COLORS.void, b: palette_js_1.COLORS.brown, g: palette_js_1.COLORS.gray, y: palette_js_1.COLORS.yellow, s: palette_js_1.COLORS.slate, w: palette_js_1.COLORS.white };
const mournbellIdle = {
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
const mournbellHit = {
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
const hooklurePalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, m: palette_js_1.COLORS.maroon, c: palette_js_1.COLORS.cyan, w: palette_js_1.COLORS.white };
const hooklureIdle = {
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
const hooklureHit = {
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
const quietusPalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, t: palette_js_1.COLORS.steel, c: palette_js_1.COLORS.cyan, b: palette_js_1.COLORS.brown, w: palette_js_1.COLORS.white };
const quietusIdle = {
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
const quietusHit = {
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
const unblinkPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, w: palette_js_1.COLORS.white, n: palette_js_1.COLORS.navy, g: palette_js_1.COLORS.gray };
const unblinkIdle = {
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
const unblinkHit = {
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
const glasshadePalette = { e: palette_js_1.COLORS.void, s: palette_js_1.COLORS.slate, g: palette_js_1.COLORS.gray, w: palette_js_1.COLORS.white, o: palette_js_1.COLORS.orange };
const glasshadeIdle = {
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
const glasshadeHit = {
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
const inknucklePalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, s: palette_js_1.COLORS.slate, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray };
const inknuckleIdle = {
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
const inknuckleHit = {
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
const veilcapPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, s: palette_js_1.COLORS.slate, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray };
const veilcapIdle = {
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
const veilcapHit = {
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
const waxwickPalette = { e: palette_js_1.COLORS.void, m: palette_js_1.COLORS.maroon, s: palette_js_1.COLORS.skin, o: palette_js_1.COLORS.orange, w: palette_js_1.COLORS.white, g: palette_js_1.COLORS.gray };
const waxwickIdle = {
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
const waxwickHit = {
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
const nightlynxPalette = { e: palette_js_1.COLORS.void, n: palette_js_1.COLORS.navy, s: palette_js_1.COLORS.slate, t: palette_js_1.COLORS.steel, y: palette_js_1.COLORS.yellow, w: palette_js_1.COLORS.white };
const nightlynxIdle = {
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
const nightlynxHit = {
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
exports.darkSprites = {
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
};
