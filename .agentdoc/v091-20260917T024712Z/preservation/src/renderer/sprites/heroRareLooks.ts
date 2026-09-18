// Twenty rare outfits on the approved 14px skeleton. Each entry authors its
// own connected hat outline and rear equipment; pose-specific grips, eyes
// and grounded soles remain those of the original job animation.
import { HERO_AGILE_LOOKS } from './heroAgileLooks.js';
import { HERO_ARCANE_LOOKS } from './heroArcaneLooks.js';
import { HERO_KNIGHT_LOOKS } from './heroKnightLooks.js';
import { makeHeroLook } from './heroLook.js';
import type { HeroLook } from './heroLook.js';

interface RareOutfit {
  job: number;
  rank: number;
  head: readonly [string, string, string];
  back: readonly string[];
  colors: readonly [string, string, string]; // cloth, accent, steel
}
const outfits: readonly RareOutfit[] = [
  // h51 smith: low square goggles and a long leather tool apron.
  { job: 0, rank: 0, head: ['...eeeeee...', '..ehhhhhte..', '..etttsssse.'], back: ['...ee', '..eac', '..eac', '..eac', '...ec'], colors: ['#633e32', '#ec9838', '#bdada0'] },
  // h52 duelist: offset tied kerchief and a serrated split shoulder.
  { job: 4, rank: 1, head: ['..eee.eeee..', '.eaaehaaae..', '..eahasssse.'], back: ['.ee.', '.eae', '..ec', '.ece', '..ee'], colors: ['#77324c', '#ee6c58', '#bec6d4'] },
  // h53 pilgrim: folded traveller hat, rolled blanket and torch staff.
  { job: 3, rank: 2, head: ['.....eee....', '...eeaaee...', '..ehhhsssse.'], back: ['.eee', 'eaca', 'ecaa', '.eca', '..ec'], colors: ['#855939', '#f1b550', '#bc9771'] },
  // h54 volcano guard: wide-toothed crown with a short stone shoulder.
  { job: 5, rank: 3, head: ['..e.e.e.e...', '..eeeeeee...', '..ethtsssse.'], back: ['..ee', '.ett', '.ete', '..et'], colors: ['#79372b', '#efa444', '#736c81'] },
  // h55 pearl tuner: a ridged shell cap and rounded instrument case.
  { job: 6, rank: 0, head: ['...eee.e....', '..etateee...', '..eataassse.'], back: ['..ee', '.eaa', '.eat', '.eta', '..ee'], colors: ['#487883', '#e3cab9', '#8abfca'] },
  // h56 navigator: a broad folded naval hat and rolled chart.
  { job: 1, rank: 1, head: ['..ee...ee...', '.eaaeeeaae..', '..ehttsssse.'], back: ['..ee', '..ew', '..ew', '..ew', '..ee'], colors: ['#3d526a', '#d6aa73', '#91bfc2'] },
  // h57 archivist: an angular ice cap and a thick bound book.
  { job: 6, rank: 2, head: ['....eeee....', '...etwtee...', '..etwwsssse.'], back: ['.eee', '.ewt', '.ewt', '.ewt', '.eee'], colors: ['#476c8f', '#b2dded', '#849dbd'] },
  // h58 abyss knight: deep diving helmet and a ridged rear tank.
  { job: 8, rank: 3, head: ['...eeeeeee..', '..ettttttte.', '..ettasssse.'], back: ['.eee', '.ett', '.ett', '.ete', '..ee'], colors: ['#273e68', '#60b7c4', '#8797b5'] },
  // h59 courier: forward feather cap and low envelope satchel.
  { job: 1, rank: 0, head: ['......eee...', '...eeeaee...', '..ehhhsssse.'], back: ['...e', '..ec', '.eaa', '.eae', '..ee'], colors: ['#4b745d', '#dfc476', '#92b7a6'] },
  // h60 sharpshooter: raised lightning sight and square ammunition pouch.
  { job: 2, rank: 1, head: ['....ee..ee..', '...ehaeete..', '..ehhtsssse.'], back: ['..ee', '..et', '.eat', '.ete', '..ee'], colors: ['#4b547b', '#e9cf65', '#a3bed0'] },
  // h61 dancer: asymmetric fan comb and a scalloped trailing sleeve.
  { job: 7, rank: 2, head: ['..ee.e......', '..eaaee.....', '..ehhasssse.'], back: ['..ee', '.eac', 'eac.', '.eca', '..ec'], colors: ['#42827c', '#e8ad89', '#b5d9cd'] },
  // h62 sky guard: twin high prongs and the straight edge of a tower shield.
  { job: 8, rank: 3, head: ['..ee....ee..', '..ete..ete..', '..etttsssse.'], back: ['eeee', 'ettc', 'ettc', 'ettc', '.etc', '..ee'], colors: ['#4d6181', '#e9dba3', '#b0ced8'] },
  // h63 apothecary: a leaf cap and three attached glass medicine bottles.
  { job: 3, rank: 0, head: ['...e.ee.....', '..eaaee.....', '..ehacsssse.'], back: ['.eee', '.eat', '.ett', '.eat', '..ee'], colors: ['#4e7044', '#c1bb6a', '#a6b697'] },
  // h64 surveyor: flat miner lamp and an L-shaped measuring rule.
  { job: 2, rank: 1, head: ['...eeee.e...', '..ehhtaee...', '..etttsssse.'], back: ['.eee', '.eaw', '.eaw', '.eaw', '.eaa'], colors: ['#836444', '#efd06b', '#adab90'] },
  // h65 oathkeeper: branching antler crown and a leaf-cut wooden shield.
  { job: 8, rank: 2, head: ['.e..e..e....', '..eeaeee....', '..ehahsssse.'], back: ['.ee.', 'eaca', 'ecaa', '.eca', '..ec'], colors: ['#4d6d50', '#c9a760', '#8ca68b'] },
  // h66 crystal sentinel: faceted high helmet and a broad crystal pauldron.
  { job: 5, rank: 3, head: ['....ee.e....', '...etwtee...', '..etwwtssse.'], back: ['eeee', 'etwt', '.etw', '..et'], colors: ['#58638c', '#dec590', '#a0cbcf'] },
  // h67 detective: level wide brim, narrow crown and short checked cape.
  { job: 4, rank: 0, head: ['....eeeee...', '...ehhhhe...', '.eehhhsssse.'], back: ['..ee', '.eac', '.eca', '..ec', '...e'], colors: ['#4e435e', '#c58f79', '#a49db6'] },
  // h68 raven herald: hooked attached beak cap and jagged feather mantle.
  { job: 9, rank: 1, head: ['...eeeee.e..', '..ehhhaeee..', '..ehhhsssse.'], back: ['.eee', 'eacc', '.eac', '..ec', '.ece'], colors: ['#42374f', '#b38bbf', '#939dbd'] },
  // h69 duel specter: half-mask ridge and a toothed leather shoulder.
  { job: 0, rank: 2, head: ['....ee.ee...', '...ethhee...', '..etthsssse.'], back: ['.e.e', '.ete', '..ea', '.eac', '..ee'], colors: ['#5b3c59', '#d29caf', '#b6adb7'] },
  // h70 star heir: folded star-stitched cap and a crescent-edged mantle.
  { job: 9, rank: 3, head: ['...e...ee...', '..ehaeeae...', '..ehahsssse.'], back: ['.eee', 'eacc', 'eac.', '.eac', '..ec'], colors: ['#3e466b', '#e3c98e', '#a4b4d4'] },
];
const jobs: Readonly<Record<number, readonly HeroLook[]>> = { ...HERO_KNIGHT_LOOKS, ...HERO_AGILE_LOOKS, ...HERO_ARCANE_LOOKS };
export const HERO_RARE_LOOKS: Readonly<Record<string, HeroLook>> = Object.fromEntries(outfits.map((outfit, index) => {
  const base = jobs[outfit.job]![outfit.rank]!;
  const source = [base.idle.frames[0]!, ...base.attack.frames];
  const frames = source.map((frame, pose) => {
    const grid = frame.map(row => [...row]);
    const dx = pose === 1 ? 2 : pose === 2 ? 1 : 0;
    for (let y = 0; y < 3; y++) {
      grid[y] = Array<string>(14).fill('.');
      for (const [x, pixel] of [...outfit.head[y]!.padEnd(14, '.')].entries()) {
        if (x + dx < 14 && pixel !== '.') grid[y]![x + dx] = pixel;
      }
      if (pose === 1) for (let x = 0; x <= y + 1; x++) grid[y]![x] = frame[y]![x]!;
    }
    // Equipment overlays only the back edge; the animated front hand is untouched.
    outfit.back.forEach((row, y) => [...row].forEach((pixel, x) => {
      const px = x + (pose === 1 ? 1 : 0), py = y + 6;
      if (pixel !== '.' && grid[py]![px] !== 's') grid[py]![px] = pixel;
    }));
    return grid.map(row => row.join('')).join('/');
  });
  const { e, s, h, w } = base.idle.palette;
  const [c, a, t] = outfit.colors;
  return [`h${51 + index}`, makeHeroLook({ e: e!, s: s!, h: h!, c, t, a, w: w! }, frames[0]!, frames.slice(1))];
}));
