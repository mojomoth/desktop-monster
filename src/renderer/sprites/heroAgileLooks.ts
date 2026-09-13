// Small, right-facing equipment studies: tied hair and polearms, brimmed hats
// and pistols, headbands and knuckles. Every look keeps the starter's hand and
// foot anchors; costume panels and held props follow its three attack poses.
import { makeHeroLook, type HeroLook } from './heroLook.js';
import { COLORS } from './palette.js';

const heads = {
  spear: [
    '...ee.eeee/..ehhehhhhe/..ehhhsssse/..ehsssisee/.eheessssse/..ehesssee',
    '..ee.eeeee/.ehhehhhhhe/..ehhhsssse/..ehsssisee/..ehsssssse/..ehesssee',
    '....eeee/...ehahhe/..ehhhssshe/..ehsssishhe/...essssshe/...eesshee',
    '..eee.eeee/.ehahhhhhhe/.ehehhsssse/.ehehssisee/.eheessssse/.eheesssee',
    '...eeeeee/..ewhahahwe/.ehcthssshe/..etsssishe/..etsssssse/...etsshee',
  ],
  gun: [
    '....eeeeee/...ehhhhhae/..eehhhhheee/..ehsssisee/...esssssse/...eesssee',
    '...ee...ee/..ehheeehhe/.eehhahaheee/..ehsssisee/..ehsssssse/...ehsshee',
    '.....ee/...eehhee/.eehhahaheee/..ehsssisee/...esssssse/..eehsshee',
    '...eeeeeeee/..ehhhahhhhe/...ettttteee/..ehsssisee/..ehsssssse/...ehsshee',
    '..eee.eeee/.ehthehhhhe/..ehttaaahee/..ehsssiste/..ehssssste/..ehesshhee',
  ],
  fist: [
    '....ee.eee/...ehhehhe/..ehhhsssse/..easssisee/...esssssse/...eesssee',
    '...eee.eee/..ehhaehhe/..eahhsssse/.eaasssisee/..eaessssse/...eesssee',
    '....eeeee/...eahhhae/..eathsssae/..etsssiste/..etsssssse/...eesssee',
    '...eeeeeee/..ehahhhhe/.ehhhtsssse/..easssisee/.eaaessssse/..eaesssee',
    '..ee..eee/.ehaeehahhe/..ehahssshe/..ehsssishhe/..ehsssssse/...ehsshee',
  ],
} as const;

type Family = keyof typeof heads;
type Patch = readonly [x: number, y: number, rows: string];

// The eight lower rows for idle, wind-up, hit and recovery, before equipment.
const bodies = [
  '...eccccce/..eccccccs/..ecccccs/...ecccce/..ette.ette/..ette.ette/.ehhhe.ehhhe/.eeeee.eeeee',
  '...easccccce/....esccccce/....ecccccce/...ecccccce/...ette.ette/..ette..ette/.ehhhe..ehhhe/.eeeee..eeeee',
  '.ecccccs/.ecccccs/..ecccccce/...ecccce/...ette.ette/..ett..ette/.ehhhe..ehhhe/.eeeee..eeeee',
  '..ecccccce/.eccccccs/.ecccccs/..eccccce/..ette.ette/.ette..ette/ehhhe..ehhhe/eeeee..eeeee',
] as const;

// Four-pixel chest panels: wrap seam, frog closures, lamellar plates, tabard,
// sash and buckles stay legible at the actual 56 px display size.
const panels: Record<Family, readonly string[]> = {
  spear: ['hacc/ctac', 'wtcc/caac', 'wacc/ctac', 'tawc/ctac', 'wawc/cata'],
  gun: ['hctc/ctac', 'whtc/cahc', 'watc/ctac', 'wacc/ctac', 'wahc/catc'],
  fist: ['cawc/caac', 'wacc/ctac', 'wawc/caac', 'awtc/ctac', 'wawc/ctac'],
};

// Each loadout has an independently drawn tip, barrel or knuckle face.
const poleTips = ['.e./ewe/ewe/eae', '.ee/eww/etw/.ae', 'e.e/waw/ete/.ae', 'ee./wwe/twe/.ae', 'eee/waw/eww/.ae'];
const gunBarrels = ['etwe/atae/.ee.', 'ewte/atwe/.ee.', 'ewee/atte/.ee.', 'etwe/awwe/.ee.', 'ewwe/atte/.ee.'];
const knuckles = ['.ee/eaw/ete', '.ee/ewa/ete', 'eee/waw/ete', 'eee/awa/ete', 'eee/wtw/eae'];

function paint(frame: string[][], [x, y, rows]: Patch): void {
  for (const [dy, row] of rows.split('/').entries()) {
    for (const [dx, char] of [...row].entries()) {
      // A dot is transparent; the original skin pixels are the hand anchors.
      if (char !== '.' && frame[y + dy]?.[x + dx] !== 's') frame[y + dy]![x + dx] = char;
    }
  }
}

function equipment(family: Family, rank: number, pose: number): Patch[] {
  if (family === 'spear') {
    if (pose === 0 || pose === 3) return [
      [11, 3, poleTips[rank]!], [11, 7, 'eae/eae/eae/eae/eae/eae/eee'],
      [pose === 0 ? 10 : 9, 7, pose === 0 ? 'aae' : 'aaae'],
    ];
    if (pose === 1) return [
      [0, 0, rank < 2 ? 'ee/ewe/.ewe/..ewe/...eae/..eaaae' : 'eee/eww/.ewe/..ewe/...eae/..eaaae'],
    ];
    return [[8, 5, rank % 2 === 0 ? '.eeee./attwwe/.eeee.' : '..eee./atawwe/.eeeee']];
  }
  if (family === 'gun') {
    if (pose === 0 || pose === 3) return [[pose === 0 ? 10 : 9, 7, gunBarrels[rank]!]];
    if (pose === 1) return [[2, 3, rank < 2 ? '.ee/ewe/.ete/..aa' : 'eee/eww/.ete/..aa']];
    return [[8, 5, rank < 2 ? '.eeee/attwe/eaee.' : 'eeeee/awtwe/eaae.']];
  }
  if (pose === 0 || pose === 3) return [[pose === 0 ? 10 : 9, 6, knuckles[rank]!]];
  if (pose === 1) return [[2, 4, rank < 2 ? '.ee/eaw/.aa' : 'eee/waw/.aa']];
  return [[8, 5, rank < 2 ? '.eee/eawt/eaae' : 'eeee/wawt/eaae']];
}

function look(family: Family, rank: number, colors: readonly string[], iris: 'a' | 'h' | 't' = 'a'): HeroLook {
  const [s, h, c, t, a, w] = colors;
  const frames = bodies.map((body, pose) => {
    const frame = [...Array.from({ length: 6 }, () => '.'.repeat(14)), ...body.split('/')]
      .map(row => [...row.padEnd(14, '.')]);
    paint(frame, [[4, 7, 3, 3][pose]!, 6, panels[family][rank]!]);
    // Later coats gain an outlined rear hem; fighters keep their short gi.
    if (family !== 'fist' && rank >= 2) {
      paint(frame, [pose === 1 ? 3 : pose === 3 ? 1 : 2, 8, 'ec/ec/ee']);
    }
    // A brass knee plate or wrapped greave is a material detail, not scaling.
    paint(frame, [pose === 1 || pose === 2 ? 4 : 3, 11, rank >= 3 ? 'aw' : 'tc']);
    paint(frame, [pose === 3 ? 1 : 2, 12, rank >= 3 ? 'wt' : 'ht']);
    for (const patch of equipment(family, rank, pose)) paint(frame, patch);
    for (const [y, row] of heads[family][rank]!.split('/').entries()) {
      // Original head trajectory: wind-up +1 top/+2 face, hit +1 face.
      const shift = pose === 1 ? (y < 2 ? 1 : 2) : pose === 2 && y >= 2 ? 1 : 0;
      paint(frame, [shift, y, row]);
    }
    return frame.map(row => row.join('')).join('/');
  });
  return makeHeroLook({ e: COLORS.void, s: s!, h: h!, c: c!, t: t!, a: a!, w: w! }, frames[0]!, frames.slice(1), iris);
}

export const HERO_AGILE_LOOKS: Readonly<Record<number, readonly HeroLook[]>> = {
  1: [
    look('spear', 0, ['#dfb18d', '#513845', '#416b8c', '#334453', '#b69a5c', '#d6e6e5'], 'h'),
    look('spear', 1, ['#bc826d', '#ddd6c5', '#326c83', '#394650', '#b95553', '#b7dadb'], 't'),
    look('spear', 2, ['#ead4d0', '#353d59', '#718aae', '#444765', '#8974b2', '#d9e5ef'], 'h'),
    look('spear', 3, ['#aa7764', '#cadce2', '#336764', '#27343f', '#dfb065', '#e7e6cc'], 't'),
    look('spear', 4, ['#cfafbc', '#d9d4ee', '#5f729b', '#323e5c', '#b1588e', '#e9e3ca'], 't'),
  ],
  2: [
    look('gun', 0, ['#d9a17d', '#78534d', '#456876', '#33434e', '#cba367', '#dedbcc'], 't'),
    look('gun', 1, ['#ab7660', '#b4a393', '#623e4f', '#2b3448', '#8db5be', '#e3d9c6'], 't'),
    look('gun', 2, ['#e0c6b7', '#354a6a', '#5c638a', '#343349', '#b782a9', '#d5dce4'], 'h'),
    look('gun', 3, ['#bb8e75', '#d8d4c6', '#355e68', '#313e58', '#c99b51', '#b9d0d9'], 't'),
    look('gun', 4, ['#d1b6bf', '#543b63', '#6f809a', '#353c57', '#cea466', '#e4dfe8'], 'h'),
  ],
  7: [
    look('fist', 0, ['#dca27d', '#503b37', '#dde0cf', '#466477', '#c14c52', '#e9cd9c'], 'h'),
    look('fist', 1, ['#ac735b', '#352f4a', '#7293a0', '#34445a', '#d69b58', '#e0d9c1'], 'h'),
    look('fist', 2, ['#e1c2b6', '#d5dedf', '#654b70', '#38384f', '#95a5bd', '#d6c28e'], 't'),
    look('fist', 3, ['#bd8b69', '#44394f', '#375d65', '#333c50', '#c78567', '#e9d8ac'], 'h'),
    look('fist', 4, ['#cfb7b1', '#d6d6bd', '#73768d', '#3d374c', '#b76789', '#ecd7a0'], 't'),
  ],
};
