// Legendary relics have their own authored silhouettes, not a larger rarity
// guard on an ordinary item. All weapons retain the shared x7, y9..13 grip.
import type { EquipmentTemplate, WeaponType } from '../../core/equipment.js';
import type { Sprite } from './sprite.js';

type Point = readonly [number, number];
type Grid = string[][];
function brush() {
  const cells: Grid = Array.from({ length: 16 }, () => Array<string>(16).fill('.'));
  const p = (x: number, y: number, key = 'm'): void => { if (cells[y]?.[x] !== undefined) cells[y]![x] = key; };
  const b = (x: number, y: number, w: number, h: number, key = 'm'): void => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) p(x + dx, y + dy, key);
  };
  const l = (x: number, y: number, ex: number, ey: number, key = 'm'): void => {
    const n = Math.max(Math.abs(ex - x), Math.abs(ey - y));
    for (let i = 0; i <= n; i++) p(Math.round(x + (ex - x) * i / Math.max(1, n)), Math.round(y + (ey - y) * i / Math.max(1, n)), key);
  };
  const path = (points: readonly Point[], key = 'm'): void => {
    for (let i = 1; i < points.length; i++) l(...points[i - 1]!, ...points[i]!, key);
  };
  const poly = (points: readonly Point[], key = 'm'): void => {
    // Tiny integer canvas: fill polygon interiors, then their complete edges.
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i]!, [bx, by] = points[j]!;
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) p(x, y, key);
    }
    path([...points, points[0]!], key);
  };
  const gem = (x: number, y: number, r = 2): void => {
    poly([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], 'j'); p(x - 1, y, 'w');
  };
  const ring = (x: number, y: number, rx: number, ry: number, key = 'g'): void => {
    path([[x - rx + 1, y - ry], [x + rx - 1, y - ry], [x + rx, y - ry + 1], [x + rx, y + ry - 1],
      [x + rx - 1, y + ry], [x - rx + 1, y + ry], [x - rx, y + ry - 1], [x - rx, y - ry + 1], [x - rx + 1, y - ry]], key);
  };
  return { cells, p, b, l, path, poly, gem, ring };
}

const WEAPON_COLORS: Record<WeaponType, readonly string[]> = {
  sword: ['#ff7850', '#91dcff', '#69f3d0', '#ff95bb'],
  greatsword: ['#ffab65', '#da90ee', '#79dbe6', '#d9fa81'],
  spear: ['#9acaff', '#5de3cb', '#f8b8ee', '#ffdb75'],
  gun: ['#ff855d', '#99e7ed', '#dbb3ff', '#91eead'],
  dagger: ['#b9aaff', '#80f0ce', '#ffb268', '#f889a9'],
  staff: ['#ffcf77', '#9cf099', '#a7c4ff', '#fb9fd7'],
  hammer: ['#99e7d3', '#ffb578', '#90cfff', '#e8a0ff'],
  gauntlet: ['#f7ab76', '#a9e78a', '#ffdf77', '#8eddff'],
};

function epicWeapon(type: WeaponType, tier: number): Grid {
  const { cells, p, b, l, path, poly, gem, ring } = brush();
  b(7, 9, 1, 5, 'a'); p(7, 13, 'g');
  if (type === 'sword') {
    if (tier === 0) { // Forked flame: open tongues, swept shoulders.
      poly([[7, 9], [4, 6], [5, 2], [7, 5], [9, 1], [10, 5], [9, 8]]);
      path([[5, 3], [6, 6], [7, 8], [9, 4]], 'j');
      path([[3, 9], [5, 10], [9, 10], [11, 8]], 'g');
    } else if (tier === 1) { // Crescent blade with a deep bite out of its right edge.
      poly([[9, 1], [5, 2], [3, 5], [4, 8], [7, 10], [10, 8], [7, 7], [6, 5], [7, 3]]);
      path([[8, 2], [5, 4], [5, 7]], 'w'); gem(5, 8, 1);
      path([[5, 11], [7, 10], [10, 11]], 'g');
    } else if (tier === 2) { // Lightning cleaver: stepped, asymmetric blade.
      poly([[9, 1], [4, 5], [7, 5], [4, 9], [8, 8], [11, 4], [8, 4]]);
      path([[8, 3], [6, 5], [8, 6], [6, 8]], 'j');
      path([[3, 10], [5, 9], [9, 11], [11, 10]], 'g');
    } else { // Barbed wing sword: a split crown over a continuous central blade.
      poly([[7, 1], [5, 4], [5, 8], [7, 10], [9, 8], [9, 4]]);
      poly([[5, 5], [2, 3], [3, 7], [5, 8]], 'g');
      poly([[9, 5], [12, 2], [11, 7], [9, 8]], 'g');
      b(7, 3, 1, 6, 'j'); path([[4, 11], [7, 10], [10, 11]], 'g');
    }
  } else if (type === 'greatsword') {
    if (tier === 0) { // Dragon fang: broad hooked crown, three inward teeth.
      poly([[10, 1], [5, 2], [3, 5], [4, 8], [7, 10], [10, 8], [8, 7], [11, 5], [8, 5]]);
      path([[8, 2], [5, 4], [5, 7], [7, 9]], 'w'); b(8, 3, 2, 2, 'j');
      path([[3, 10], [5, 11], [9, 11], [11, 9]], 'g');
    } else if (tier === 1) { // Coffin executioner: squared shoulders and a hollow sigil.
      poly([[5, 1], [10, 1], [12, 4], [10, 8], [7, 10], [3, 7], [3, 4]]);
      b(6, 3, 3, 4, 'k'); b(7, 3, 1, 4, 'j'); b(5, 5, 5, 1, 'j');
      b(3, 10, 9, 1, 'g'); p(3, 9, 'g'); p(11, 11, 'g');
    } else if (tier === 2) { // Obsidian sail: angled spine with a descending saw edge.
      poly([[5, 1], [10, 3], [12, 5], [9, 5], [11, 7], [8, 7], [9, 9], [6, 10], [3, 7]]);
      path([[5, 2], [5, 6], [7, 9]], 'j'); path([[2, 9], [5, 11], [9, 11]], 'g');
    } else { // Twin spires share a wide lower blade; the central notch is open.
      poly([[3, 1], [6, 4], [6, 7], [8, 7], [8, 3], [11, 1], [12, 7], [9, 10], [5, 10], [2, 7]]);
      l(4, 3, 4, 7, 'j'); l(10, 3, 10, 7, 'j'); gem(7, 9, 1);
      path([[3, 11], [5, 10], [9, 10], [12, 11]], 'g');
    }
  } else if (type === 'spear') {
    b(7, 4, 1, 8, 'g');
    if (tier === 0) { // Constellation lance: a star connected to two satellite tips.
      poly([[7, 1], [8, 3], [10, 4], [8, 5], [7, 8], [6, 5], [4, 4], [6, 3]]);
      path([[2, 3], [3, 6], [7, 7], [11, 6], [11, 2]], 'g'); gem(7, 4, 1); p(2, 2, 'j'); p(11, 1, 'j');
    } else if (tier === 1) { // Deep-sea trident, one tall centre prong.
      poly([[7, 1], [5, 4], [7, 6], [9, 4]]);
      path([[3, 2], [2, 5], [4, 7], [10, 7], [12, 5], [11, 2]], 'm');
      b(6, 6, 3, 2, 'j'); p(3, 3, 'w'); p(11, 3, 'w');
    } else if (tier === 2) { // Crescent halberd: broad lunar axe and a separate point.
      poly([[7, 1], [6, 4], [8, 4]]);
      poly([[5, 2], [2, 4], [2, 7], [5, 9], [5, 7], [7, 6], [5, 5]]);
      path([[7, 5], [11, 3], [10, 7], [7, 8]], 'g'); b(6, 5, 2, 3, 'j');
    } else { // Sun wheel and pointed crown.
      ring(7, 5, 4, 3); poly([[7, 1], [5, 4], [9, 4]]); gem(7, 5, 2);
      l(1, 5, 4, 5, 'm'); l(10, 5, 13, 5, 'm'); path([[4, 8], [7, 10], [10, 8]], 'g');
    }
  } else if (type === 'gun') {
    b(6, 8, 3, 4, 'a'); p(8, 12, 'g');
    if (tier === 0) { // Dragon muzzle: horns, brow and a toothed lower jaw.
      poly([[5, 2], [8, 2], [11, 4], [11, 7], [8, 10], [4, 8], [3, 5]]);
      path([[4, 4], [3, 1], [6, 3]], 'g'); path([[9, 3], [12, 1], [11, 5]], 'g');
      b(5, 3, 3, 2, 'k'); b(8, 5, 2, 2, 'j'); path([[4, 7], [6, 8], [10, 7]], 'w');
    } else if (tier === 1) { // Two long barrels and a hanging trigger loop.
      b(3, 2, 3, 7); b(9, 1, 3, 8); b(5, 7, 5, 3, 'g');
      b(4, 3, 1, 4, 'j'); b(10, 2, 1, 5, 'j'); b(2, 1, 5, 1, 'w'); b(8, 1, 5, 1, 'w');
      path([[9, 10], [11, 10], [11, 12], [9, 12]], 'g');
    } else if (tier === 2) { // Star-engine barrel, four swept fins around its chamber.
      poly([[6, 1], [9, 1], [9, 4], [12, 3], [11, 6], [13, 8], [9, 9], [7, 11], [4, 8], [2, 5], [5, 5]]);
      b(6, 2, 3, 2, 'k'); gem(7, 6, 2); path([[3, 5], [5, 7], [4, 9]], 'g');
    } else { // Serpent launcher: coiled side chamber and hooked mouth.
      poly([[3, 2], [9, 2], [11, 4], [10, 7], [7, 9], [4, 7], [4, 5], [7, 5], [7, 4], [3, 4]]);
      ring(10, 7, 3, 3, 'g'); b(9, 6, 2, 2, 'j'); b(3, 2, 2, 1, 'k'); p(5, 6, 'w');
    }
  } else if (type === 'dagger') {
    if (tier === 0) { // Raven talon, a recurved one-sided hook.
      poly([[10, 2], [6, 3], [4, 6], [5, 9], [8, 10], [9, 7], [7, 8], [6, 6], [8, 4]]);
      path([[8, 4], [5, 6], [6, 8]], 'j'); path([[4, 10], [7, 11], [10, 9]], 'g');
    } else if (tier === 1) { // Wavy kris, alternating shoulders rather than a straight blade.
      poly([[8, 2], [5, 4], [7, 5], [4, 7], [7, 10], [10, 8], [8, 7], [10, 5], [8, 4]]);
      path([[7, 4], [8, 5], [6, 7], [8, 9]], 'j'); b(4, 11, 7, 1, 'g');
    } else if (tier === 2) { // Scorpion sting around an open upper curl.
      path([[5, 8], [3, 5], [4, 2], [8, 1], [11, 3], [11, 5]], 'g');
      poly([[11, 4], [12, 7], [8, 10], [6, 8], [8, 6], [8, 8]]);
      gem(10, 6, 1); path([[4, 10], [7, 11], [10, 10]], 'g');
    } else { // Three fangs on a low crescent guard.
      poly([[3, 4], [6, 7], [7, 2], [9, 7], [12, 4], [10, 9], [7, 10], [4, 9]]);
      b(7, 5, 1, 4, 'j'); path([[3, 10], [5, 12], [9, 12], [12, 10]], 'g');
    }
  } else if (type === 'staff') {
    b(7, 5, 1, 8, 'g');
    if (tier === 0) { // Winged solar orb, layered feather edges.
      poly([[6, 5], [2, 2], [2, 5], [4, 6], [3, 7], [6, 8]], 'm');
      poly([[8, 5], [11, 1], [12, 4], [10, 6], [12, 6], [8, 8]], 'm'); gem(7, 4, 2);
      path([[4, 8], [7, 9], [10, 8]], 'g');
    } else if (tier === 1) { // Antler sceptre with a living crystal between its branches.
      path([[2, 2], [3, 5], [7, 8], [11, 5], [11, 2]], 'g');
      path([[3, 5], [5, 4], [5, 1]], 'm'); path([[11, 5], [9, 4], [9, 1]], 'm');
      gem(7, 5, 2); p(2, 1, 'j'); p(11, 1, 'j');
    } else if (tier === 2) { // Eclipse crook: moon embraces a dark-centred star.
      poly([[8, 1], [4, 2], [2, 5], [4, 8], [8, 9], [6, 7], [5, 5], [6, 3]], 'g');
      gem(9, 5, 2); path([[9, 8], [11, 9], [11, 11]], 'm');
    } else { // Caged lantern head with a broad roof and twin tassels.
      poly([[7, 1], [3, 4], [11, 4]], 'g'); b(4, 5, 1, 3, 'm'); b(10, 5, 1, 3, 'm');
      b(6, 4, 3, 4, 'j'); p(6, 5, 'w'); b(4, 8, 7, 1, 'g');
      path([[3, 5], [2, 8], [3, 10]], 'a'); path([[11, 5], [12, 8], [11, 10]], 'a');
    }
  } else if (type === 'hammer') {
    b(7, 5, 1, 8, 'g');
    if (tier === 0) { // Horned skull maul, square teeth and recessed eyes.
      poly([[4, 2], [10, 2], [12, 4], [11, 7], [9, 7], [9, 9], [5, 9], [5, 7], [3, 6]]);
      path([[4, 3], [2, 1], [2, 4]], 'g'); path([[10, 3], [12, 1], [13, 4]], 'g');
      b(4, 4, 2, 2, 'k'); b(9, 4, 2, 2, 'k'); p(5, 4, 'j'); p(9, 4, 'j'); p(7, 7, 'k'); p(6, 9, 'k'); p(8, 9, 'k');
    } else if (tier === 1) { // Reliquary bell, flared rim and hanging clapper.
      poly([[6, 1], [9, 1], [11, 4], [11, 6], [13, 8], [2, 8], [4, 6], [4, 4]], 'g');
      b(5, 3, 5, 3, 'm'); gem(7, 5, 1); b(3, 8, 9, 1, 'w'); p(10, 10, 'j');
    } else if (tier === 2) { // Storm anvil, narrow waist between two heavy faces.
      poly([[2, 2], [5, 3], [6, 5], [9, 5], [11, 2], [13, 3], [13, 7], [10, 8], [8, 7], [5, 7], [2, 8]]);
      b(2, 3, 2, 4, 'g'); b(11, 3, 2, 4, 'g'); path([[7, 2], [5, 5], [8, 5], [6, 8]], 'j');
    } else { // Orbit crusher: spiked stone and an asymmetric crescent brace.
      poly([[5, 1], [7, 3], [10, 2], [11, 5], [9, 8], [6, 7], [3, 8], [2, 5], [4, 4]]);
      gem(6, 5, 2); path([[11, 1], [13, 3], [13, 7], [10, 9], [7, 9]], 'g');
    }
  } else {
    b(5, 10, 5, 3, 'a');
    if (tier === 0) { // Three long claws mounted on a curved armoured palm.
      poly([[4, 6], [10, 6], [12, 9], [9, 11], [5, 10], [3, 8]]);
      poly([[3, 1], [5, 5], [5, 7], [3, 6]], 'w'); poly([[7, 1], [8, 5], [8, 7], [6, 6]], 'w');
      poly([[11, 2], [11, 7], [9, 7]], 'w'); gem(7, 8, 1);
    } else if (tier === 1) { // Dragon jaw surrounds the fingers, horns face outward.
      poly([[3, 4], [6, 5], [9, 3], [12, 5], [11, 9], [8, 11], [4, 9]]);
      path([[4, 5], [2, 2], [2, 6]], 'g'); path([[10, 4], [13, 2], [13, 6]], 'g');
      b(4, 6, 6, 2, 'k'); p(5, 6, 'w'); p(8, 7, 'w'); gem(10, 8, 1);
    } else if (tier === 2) { // Sun disc knuckles, four radial fins and a lower cuff.
      ring(7, 6, 4, 3); gem(7, 6, 3); b(6, 9, 3, 2, 'm');
      poly([[6, 2], [7, 1], [8, 2]], 'm'); poly([[2, 5], [1, 6], [2, 7]], 'm');
      poly([[12, 5], [14, 6], [12, 7]], 'm');
    } else { // Three crystal knuckles, unequal heights and sharp outer thumb.
      poly([[3, 6], [4, 2], [6, 5], [7, 1], [9, 5], [11, 3], [12, 8], [9, 11], [4, 10]]);
      path([[4, 4], [5, 8], [7, 9], [8, 4]], 'j'); path([[10, 5], [10, 9]], 'w');
      poly([[11, 9], [14, 7], [13, 11], [10, 12]], 'g');
    }
  }
  return cells;
}

const RELIC_COLORS = ['#ffcf76', '#9bdcef', '#92e3b8', '#c4b2ff', '#ff9cbe', '#ffad72', '#95bfff', '#a4efd8'];
function epicAccessory(type: EquipmentTemplate['accessoryType'], index: number): Grid {
  const { cells, p, b, l, path, poly, gem, ring } = brush();
  if (type === 'necklace') {
    // Two upper chain strands identify a pendant even when its relic is broad.
    path([[3, 2], [2, 5], [4, 8], [7, 10], [10, 8], [12, 5], [11, 2]], 'g');
    if (index === 0) { // Crown pendant.
      poly([[4, 8], [4, 5], [6, 7], [7, 4], [9, 7], [11, 5], [10, 10], [5, 10]], 'g'); gem(7, 10, 2);
    } else if (index === 1) { // Feathered heart.
      poly([[6, 8], [1, 5], [2, 8], [1, 9], [5, 11]], 'm'); poly([[8, 8], [13, 4], [12, 8], [14, 9], [9, 11]], 'm');
      poly([[7, 8], [10, 10], [7, 14], [4, 10]], 'j'); p(6, 10, 'w');
    } else if (index === 2) { // All-seeing eye.
      poly([[1, 9], [5, 6], [9, 6], [13, 9], [9, 12], [5, 12]], 'm');
      gem(7, 9, 2); b(7, 8, 1, 3, 'k'); l(4, 5, 3, 3, 'j'); l(10, 5, 11, 3, 'j');
    } else if (index === 3) { // Long crescent with a suspended star.
      poly([[8, 6], [4, 8], [3, 11], [6, 14], [10, 13], [7, 12], [6, 10]], 'm');
      gem(10, 8, 2); p(5, 11, 'j');
    } else if (index === 4) { // Sealed hourglass in a rectangular frame.
      b(4, 7, 7, 1, 'g'); b(4, 13, 7, 1, 'g'); b(4, 8, 1, 5, 'm'); b(10, 8, 1, 5, 'm');
      poly([[5, 8], [9, 8], [7, 10], [9, 12], [5, 12], [7, 10]], 'j');
    } else if (index === 5) { // Curved dragon fang with a toothed gold cap.
      poly([[5, 8], [10, 8], [10, 11], [8, 13], [4, 14], [6, 11]], 'm');
      b(4, 7, 7, 2, 'g'); p(5, 9, 'g'); p(9, 9, 'g'); gem(7, 7, 1);
    } else if (index === 6) { // Tilted orbit around a suspended planet.
      path([[2, 11], [4, 8], [10, 6], [13, 7], [11, 11], [5, 13], [2, 11]], 'm'); gem(7, 10, 2);
      p(12, 6, 'j'); p(3, 12, 'w');
    } else { // Split ancestral mask, left horn and long right tear.
      poly([[4, 7], [10, 7], [11, 10], [8, 14], [5, 12]], 'm');
      path([[4, 8], [2, 6], [2, 4]], 'g'); path([[10, 8], [13, 6], [13, 4]], 'g');
      b(5, 9, 2, 1, 'k'); b(8, 9, 2, 1, 'j'); l(8, 11, 8, 13, 'j');
    }
  } else if (type === 'ring') {
    if (index === 0) { // Three-spired crown setting over a small oval band.
      ring(7, 10, 3, 3); poly([[3, 6], [2, 2], [5, 4], [7, 1], [9, 4], [12, 2], [11, 6]], 'g'); gem(7, 5, 1);
    } else if (index === 1) { // Bat-wing signet.
      ring(7, 10, 3, 3); poly([[6, 6], [1, 3], [1, 7], [3, 6], [5, 9]], 'm');
      poly([[8, 6], [13, 2], [14, 7], [11, 6], [9, 9]], 'm'); gem(7, 6, 2);
    } else if (index === 2) { // Eye above an asymmetric thick band.
      path([[4, 8], [3, 11], [6, 14], [10, 12], [11, 8]], 'g');
      poly([[1, 6], [5, 3], [9, 3], [13, 6], [9, 9], [5, 9]]); gem(7, 6, 2); b(7, 5, 1, 3, 'k');
    } else if (index === 3) { // Planetary ring: oblique outer band and visible polar axis.
      ring(7, 7, 3, 5, 'm'); path([[1, 8], [4, 5], [11, 4], [13, 6], [10, 9], [3, 10], [1, 8]], 'g');
      gem(7, 7, 2); p(7, 1, 'w'); p(7, 13, 'j');
    } else if (index === 4) { // Two interlocked bands with offset stones.
      ring(5, 9, 3, 4); ring(9, 6, 3, 4, 'm'); gem(4, 5, 1); gem(10, 10, 2);
    } else if (index === 5) { // Skull signet, low band visible between teeth.
      ring(7, 11, 3, 3); poly([[4, 2], [10, 2], [12, 4], [11, 7], [9, 7], [9, 9], [5, 9], [5, 7], [2, 6], [2, 4]]);
      b(4, 4, 2, 2, 'k'); b(9, 4, 2, 2, 'k'); p(5, 4, 'j'); p(9, 4, 'j'); p(7, 8, 'k');
    } else if (index === 6) { // Compass star with a band that projects below it.
      ring(7, 10, 4, 3); poly([[7, 1], [9, 4], [13, 5], [10, 7], [9, 10], [7, 8], [4, 9], [5, 6], [2, 4], [6, 4]], 'm');
      gem(7, 5, 1);
    } else { // Coiled serpent, open mouth and a tapering tail.
      path([[4, 4], [2, 7], [3, 11], [7, 13], [11, 11], [12, 8], [9, 6], [6, 8], [7, 10]], 'g');
      poly([[4, 2], [9, 2], [11, 4], [8, 5], [6, 4], [4, 5]], 'm'); p(8, 3, 'j'); p(10, 5, 'j');
    }
  } else {
    if (index === 0) { // Wax-sealed scroll with a torn lower edge.
      poly([[4, 2], [11, 2], [11, 12], [9, 11], [8, 14], [6, 12], [3, 13]], 'm');
      b(2, 1, 11, 2, 'g'); l(5, 4, 9, 4, 'k'); l(5, 6, 8, 6, 'k'); gem(7, 9, 2);
    } else if (index === 1) { // Hourglass relic with an exposed waist and four posts.
      b(3, 2, 9, 2, 'g'); b(3, 12, 9, 2, 'g'); b(3, 4, 1, 8, 'm'); b(11, 4, 1, 8, 'm');
      poly([[5, 4], [9, 4], [7, 7], [10, 11], [4, 11], [7, 7]], 'j'); p(6, 5, 'w');
    } else if (index === 2) { // Winged seal-blade, four separate feather tips.
      poly([[6, 6], [1, 2], [1, 6], [4, 8], [2, 8], [5, 10]], 'm');
      poly([[8, 6], [13, 2], [13, 6], [10, 8], [12, 8], [9, 10]], 'm');
      poly([[7, 3], [9, 8], [7, 14], [5, 8]], 'g'); gem(7, 7, 1);
    } else if (index === 3) { // Horned skull talisman with three hanging teeth.
      poly([[4, 4], [10, 4], [12, 7], [10, 11], [4, 11], [2, 7]], 'm');
      path([[4, 5], [2, 2], [4, 1]], 'g'); path([[10, 5], [12, 2], [10, 1]], 'g');
      b(4, 6, 2, 2, 'k'); b(9, 6, 2, 2, 'k'); p(5, 6, 'j'); p(9, 6, 'j');
      l(4, 11, 4, 13, 'g'); l(7, 11, 7, 14, 'g'); l(10, 11, 10, 13, 'g');
    } else if (index === 4) { // Hanging lantern with a hooked hanger and wide feet.
      path([[6, 3], [6, 1], [9, 1], [9, 3]], 'g'); poly([[7, 3], [3, 6], [12, 6]], 'g');
      b(4, 7, 1, 5, 'm'); b(10, 7, 1, 5, 'm'); b(6, 7, 3, 4, 'j'); p(6, 8, 'w'); b(3, 12, 9, 2, 'g');
    } else if (index === 5) { // Moth seal: four unequal wings around a segmented body.
      poly([[6, 6], [2, 2], [1, 6], [3, 8], [1, 12], [5, 11], [7, 8]], 'm');
      poly([[8, 6], [12, 1], [14, 5], [11, 8], [13, 13], [9, 11], [7, 8]], 'g');
      l(7, 4, 7, 12, 'j'); b(3, 5, 2, 2, 'k'); b(10, 4, 2, 2, 'j'); path([[5, 2], [7, 4], [9, 2]], 'm');
    } else if (index === 6) { // Four-way compass, open gaps between its radial blades.
      ring(7, 7, 4, 4, 'g'); poly([[7, 1], [9, 6], [14, 7], [9, 9], [7, 14], [5, 9], [1, 7], [5, 5]], 'm');
      gem(7, 7, 2); p(7, 3, 'j');
    } else { // Chained grimoire and a separate key silhouette.
      poly([[2, 3], [8, 2], [10, 4], [10, 12], [3, 14], [2, 12]], 'm');
      b(3, 4, 1, 8, 'g'); gem(7, 7, 2); path([[10, 3], [12, 2], [14, 4], [12, 6], [10, 3]], 'g');
      l(12, 6, 12, 12, 'g'); b(12, 10, 3, 1, 'g'); p(14, 11, 'g');
    }
  }
  return cells;
}

export function epicEquipmentIcon(template: EquipmentTemplate, accessoryIndex: number): Sprite {
  const cells = template.weaponType ? epicWeapon(template.weaponType, template.tier) : epicAccessory(template.accessoryType, accessoryIndex);
  const outlined = cells.map(row => [...row]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (cells[y]![x] !== '.') {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (outlined[y + dy!]?.[x + dx!] === '.') outlined[y + dy!]![x + dx!] = 'e';
  }
  return { w: 16, h: 16, frames: [outlined.map(row => row.join(''))], palette: {
    e: '#140c1c', m: '#ddd5ed', w: '#fff4d6', a: '#866087', g: '#dfac69', k: '#413153',
    j: template.weaponType ? WEAPON_COLORS[template.weaponType][template.tier]! : RELIC_COLORS[accessoryIndex]!,
  } };
}
