// The three approved heroes anchor these fifteen sword/hood/armour loadouts.
// New ranks alter actual headgear, shoulder/cape cuts and blade decorations.
import { HERO_JOB_STUDIES } from './heroJobStudies.js';
import { makeHeroLook } from './heroLook.js';
import type { HeroLook } from './heroLook.js';

interface Loadout {
  head: string;
  gear: string;
  weapon: readonly [rest: string, raised: string, strike: string];
  colors: readonly [string, string, string, string, string, string]; // skin, hair, cloth, steel, accent, blade
}

function loadout(base: HeroLook, design: Loadout, iris: 'a' | 'h' | 't'): HeroLook {
  const [s, h, c, t, a, w] = design.colors;
  const head = design.head.split('/');
  const source = [base.idle.frames[0]!, ...base.attack.frames];
  const frames = source.map((frame, pose) => {
    const grid = frame.map(row => [...row]);
    const dx = pose === 1 ? 2 : pose === 2 ? 1 : 0;
    // Rebuild the head at the original eye anchor; keep the raised weapon and
    // forward grip on top of the head layer so neither floats during attacks.
    for (let y = 0; y < 6; y++) {
      grid[y] = Array<string>(14).fill('.');
      for (let x = 0; x < 14; x++) if (head[y]![x] !== '.' && x + dx < 14) grid[y]![x + dx] = head[y]![x]!;
      if (pose === 1) for (let x = 0; x <= y + 1; x++) grid[y]![x] = frame[y]![x]!;
      if (pose === 2 && y === 5) for (let x = 8; x < 14; x++) grid[y]![x] = frame[y]![x]!;
    }
    // A rear shoulder, cloak or shield remains attached to the same torso.
    // Hands are never repainted by the equipment layer.
    design.gear.split('/').forEach((row, y) => [...row].forEach((pixel, x) => {
      const px = x + (pose === 1 ? 1 : 0), py = y + 6;
      if (pixel !== '.' && grid[py]![px] !== 's') grid[py]![px] = pixel;
    }));
    // Replace the held blade, including its empty cut-outs. The recovery
    // keeps the same blade axis while the original hand moves one pixel left.
    const weapon = design.weapon[pose === 3 ? 0 : pose]!.split('/');
    const wx = pose === 1 ? 0 : pose === 2 ? 8 : pose === 3 ? 9 : 10;
    const wy = pose === 1 ? 0 : pose === 2 ? 5 : 7;
    weapon.forEach((row, y) => {
      const pixels = pose === 3 ? (y < 2 ? 'a' : '.') + row : row;
      [...pixels].forEach((pixel, x) => {
        const px = wx + x, py = wy + y;
        // Keep planted boots and the raised blade's shared face boundary.
        if (grid[py]![px] === 's' || (pose === 1 && x > y + 1)
          || (py >= 12 && px <= 11) || (py >= 10 && py <= 11 && px <= 10)) return;
        grid[py]![px] = pixel;
      });
    });
    return grid.map(row => row.join('')).join('/');
  });
  return makeHeroLook({ e: base.idle.palette.e!, s, h, c, t, a, w }, frames[0]!, frames.slice(1), iris);
}

const swords: readonly Loadout[] = [
  { // Tied headband and a pointed steel shoulder.
    head: '....eeeee...../...ehhhhae..../..ehahsssse.../..ehsssisee.../...esssssse.../...eesssee....',
    gear: '..ee/.ete/..te/...e',
    weapon: ['aeee/twwe/.ewe/.ewe/.ewe/..ee/....', 'eee.../ewwe../.ewwe./..ewe./...ewe/..eaaa', '.eeeee/atwwwe/.eeeee'],
    colors: ['#e0b59c', '#4b344f', '#703b51', '#9daac3', '#a6334e', '#d7e9e7'],
  },
  { // White side ponytail, blue high collar and a split coat.
    head: '..ee.eeeee..../.ehhehhhhe..../.ehhchsssse.../..ehsssisee.../..ehssss sse.../...eesssee....'.replaceAll(' ', ''),
    gear: '..ee/.ech/.ect/.ech/.ece/..e.',
    weapon: ['ae.e/awwe/.ewe/.ewe/..we/..ee/....', '.ee.../ewwe../.ewe../..ewe./...eae/..eaaa', '..eeee/ahwwwe/.eeeee'],
    colors: ['#b9cad7', '#e8e7f0', '#334858', '#7babb7', '#235d86', '#ceeef1'],
  },
  { // Silver temple guard over dark hair, short white mantle.
    head: '...eeeeee...../..ehhhhhce..../..ehtcsssse.../..etsssisee.../..ectssssse.../...eesssee....',
    gear: '.eee/echc/etcc/.ect/..et/...e',
    weapon: ['aeee/atwe/..we/.ewe/.ewe/.eee/....', 'ee..../ewe.../.ewe../..ewhe/...ewe/..eaaa', '...eee/atwwwe/.eee..'],
    colors: ['#d9bfc8', '#443950', '#e1dbe0', '#939caf', '#82416e', '#cedfe8'],
  },
  { // Three-point diadem and a ceremonial dark coat with gold shoulders.
    head: '...ee.ee.ee.../..ehhehehhe.../..ehhhsssse.../..ehsssisee.../...esssssse.../...eesssee....',
    gear: '.eee/ehah/ecch/ecct/.ece/..e.',
    weapon: ['aeae/wwae/.ewe/.wae/.ewe/.ewe/.eee', 'e.e.../waw.../.ewe../..ewe./...eae/..eaaa', '.e.eee/awawwe/.eeeee'],
    colors: ['#e5cfb9', '#e2e5ec', '#32374d', '#8295b1', '#aa354f', '#c6e3ee'],
  },
];

const rogues: readonly Loadout[] = [
  { // A low leather cowl with a stitched brow and a cropped cape.
    head: '....eeeee...../...ehhhhhe..../..ehhccsshe.../..ehsssische../..ehsssssshe../...ehsssche...',
    gear: '..ee/.ece/..ec/...e',
    weapon: ['aeee/atwe/.wee/.ee./..../..../....', '....../....../.ee.../..ewe./...eae/..eaaa', '....../ateee./.eeee.'],
    colors: ['#b6b7c5', '#5b356e', '#333647', '#a0acbd', '#c078a8', '#dce6f0'],
  },
  { // Swept pointed hood, scarf pinned across a diagonal harness.
    head: '...eeee......./..ehhhhhee..../..echhcsshe.../..ehsssische../..echssssshe../...ehsssche...',
    gear: '.eee/ehac/.ech/..ec/.ece/..e.',
    weapon: ['aaee/twwe/.wee/..e./..../..../....', '....../.ee.../.ewe../..eae./...eae/..eaaa', '..eee./awtwe./.eee..'],
    colors: ['#aebcca', '#355878', '#293d4c', '#b3bdc8', '#83afc1', '#dbeced'],
  },
  { // Rounded reinforced hood, silver cheek lining and a long split cape.
    head: '....eeeeee..../...etthhte..../..ethhcsshe.../..ehsssische../..etsssssshe../..ehtsssche...',
    gear: '..ee/.etc/ectc/echc/.ece/..e.',
    weapon: ['ae.e/awwe/.awe/..we/..ee/..../....', '....../ee..../.ewe../..awe./...eae/..eaaa', '.e.ee./atatwe/.eee..'],
    colors: ['#c7bac8', '#68384e', '#453347', '#c7b0b4', '#cd7180', '#eadce2'],
  },
  { // Folded assassin hood with two side points and a silver-edged cloak.
    head: '..ee...ee...../..ehhehhhe..../..echhcsshe.../..ehsssische../..ehsssssthe../...ehsssche...',
    gear: '.eee/ethc/echc/etch/ecec/.ee.',
    weapon: ['aeae/atwe/.wee/.ewe/..we/..ee/....', 'ee..../ewe.../.ewe../..eae./...ewe/..eaaa', '...ee./awtwwe/.eeeee'],
    colors: ['#adb8c4', '#493f7c', '#302c49', '#b2c4de', '#b486cd', '#e4e7f2'],
  },
];

const guardians: readonly Loadout[] = [
  { // Bronze ridge, enclosed neck guard, a small heater shield.
    head: '....eeeee...../...etcchte..../..etccccsshe../..etsssiste.../..etssssssce../...etssscee...',
    gear: '..ee/.eha/.eah/.eac/..e.',
    weapon: ['aeee/ahwe/ewwe/ewwe/.ewe/.ewe/.eee', 'eee.../ewwe../ewwe../.ewhe./..ewwe/..eaaa', '.eeeee/ahwwwe/eewwee'],
    colors: ['#bf8b69', '#d6aa63', '#e2ddd0', '#2a435d', '#9c703d', '#bed0dc'],
  },
  { // Plumed helmet within the same height and a broad kite shield.
    head: '.....eee....../...eehccee..../..etccccsshe../..etsssiste.../..etssssssce../..eetssscee...',
    gear: '.eee/echc/ehwh/echc/.ec./..e.',
    weapon: ['aeae/whwe/ewwe/.wwe/.ewe/..ee/....', 'eee.../whwe../ewwe../.ewhe./..ewe./..eaaa', 'eeeeee/whwhwe/.eee.e'],
    colors: ['#d5b2a2', '#aebbd1', '#e4ebee', '#3c537d', '#7f91b4', '#b6d9e3'],
  },
  { // Squared crusader helm and scalloped plate shield.
    head: '...eeeeeee..../..etcchccte.../..etccccsshe../..etsssiste.../..etssssssce../...etssscee...',
    gear: '.eee/ehah/eaha/ehwh/echc/.ee.',
    weapon: ['aaee/hwwe/.wae/.wwe/.ewe/.eee/....', 'ee..../ewwe../.ewe../.ewhe./..ewwe/..eaaa', '.e.eee/ahwhwe/.eewwe'],
    colors: ['#aa795b', '#e5bd6b', '#ebe4d9', '#213952', '#aa7945', '#c1dfe3'],
  },
  { // Crest attached directly to the crown, white-gold tower shield.
    head: '...ee..ee...../..echhehcce.../..etccccsshe../..etsssiste.../..etssssssce../..eetssscee...',
    gear: 'eeee/ehah/echc/ehwh/echc/.ee.',
    weapon: ['aeee/whwe/ewwe/ehwe/.ewe/.ewe/.eee', 'e.e.../whw.../ewwe../.ewhe./..ewwe/..eaaa', 'eeeeee/whwwwe/eeweee'],
    colors: ['#dbac85', '#efd58b', '#ebedf0', '#304a79', '#ad8242', '#b9d7e8'],
  },
];

export const HERO_KNIGHT_LOOKS: Readonly<Record<number, readonly HeroLook[]>> = {
  0: [HERO_JOB_STUDIES[0], ...swords.map(design => loadout(HERO_JOB_STUDIES[0], design, 'a'))],
  4: [HERO_JOB_STUDIES[1], ...rogues.map(design => loadout(HERO_JOB_STUDIES[1], design, 'h'))],
  8: [HERO_JOB_STUDIES[2], ...guardians.map(design => loadout(HERO_JOB_STUDIES[2], design, 't'))],
};
