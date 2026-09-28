import { drawSprite, registerSprites } from './sprite.js';
import type { Sprite, SpriteCanvas } from './sprite.js';
import type { MonsterType } from '../../core/types-chart.js';
import { COLORS } from './palette.js';

// Original sprites-as-code art: an original void-armored giant. The grounded fists and broad
// shoulder-to-head ratio reference Egene in DNF's official Anton dungeon preview:
// https://df.nexon.com/pr/actupdate/MDAwNTk/?cat=3 (에너지 차단).
// Native art stays coarse: scale 2 gives boss dots twice the heroes' dot size.
export const RAID_BOSS_SCALE = 2;
const w = 64;
const h = 44;
const pixels: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
type Point = readonly [number, number];

function shape(color: string, points: readonly Point[]): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i]!;
        const b = points[j]!;
        if ((a[1] > y + 0.5) !== (b[1] > y + 0.5)
          && x + 0.5 < (b[0] - a[0]) * (y + 0.5 - a[1]) / (b[1] - a[1]) + a[0]) {
          inside = !inside;
        }
      }
      if (inside) pixels[y]![x] = color;
    }
  }
}

// Heavy, bent legs brace under the torso; both feet meet the same baseline.
shape('e', [[20,27],[34,29],[45,27],[53,33],[51,39],[55,41],[55,44],[36,44],[35,36],[31,36],[29,44],[13,44],[13,41],[18,37],[16,33]]);
shape('s', [[22,30],[30,32],[29,36],[25,40],[25,42],[16,42],[22,36],[19,34]]);
shape('p', [[23,31],[28,33],[25,37],[20,39],[23,35]]);
shape('s', [[40,30],[48,31],[50,35],[47,39],[51,41],[51,42],[38,42],[39,36],[36,34]]);
shape('p', [[43,32],[48,34],[46,37],[40,39],[42,35]]);
shape('l', [[17,40],[20,39],[19,42],[16,42]]);
shape('l', [[22,40],[24,40],[24,42],[21,42]]);
shape('l', [[40,40],[43,40],[43,42],[39,42]]);
shape('l', [[46,40],[49,40],[50,42],[45,42]]);

// The left fist reaches forward; the larger right carapace stays high behind it.
shape('e', [[20,11],[15,9],[10,11],[6,15],[5,23],[2,27],[0,33],[2,38],[12,39],[16,35],[17,26],[23,20]]);
shape('s', [[14,12],[19,14],[20,19],[15,24],[13,32],[10,36],[3,36],[2,32],[6,26],[7,19],[10,15]]);
shape('p', [[11,14],[17,14],[18,18],[12,21],[8,21],[9,17]]);
shape('l', [[10,14],[15,12],[17,14],[12,16],[9,19],[8,18]]);
shape('p', [[7,24],[12,23],[13,27],[10,31],[4,32],[5,28]]);
shape('l', [[6,25],[9,24],[7,28],[4,31],[4,28]]);
shape('e', [[3,32],[11,30],[14,32],[12,36],[3,36]]);
shape('b', [[3,32],[5,32],[5,35],[3,35]]);
shape('l', [[6,32],[8,31],[8,35],[6,35]]);
shape('l', [[9,32],[11,32],[11,35],[9,35]]);

shape('e', [[39,12],[45,8],[51,10],[55,15],[57,22],[56,27],[60,29],[63,34],[64,40],[59,42],[51,41],[47,37],[47,27],[39,22]]);
shape('s', [[44,14],[49,12],[53,16],[55,23],[53,29],[58,31],[61,35],[62,39],[58,40],[53,38],[50,35],[50,25],[44,23]]);
shape('p', [[50,23],[54,23],[53,28],[57,31],[57,35],[51,33],[48,29]]);
shape('l', [[52,24],[54,24],[53,28],[56,31],[54,31],[51,28]]);
shape('p', [[54,33],[59,34],[61,38],[57,38],[52,36]]);
shape('b', [[54,36],[56,36],[57,40],[55,39]]);
shape('l', [[58,36],[60,37],[61,40],[59,40]]);
shape('e', [[56,37],[58,38],[58,41],[56,40]]);

// Large chest planes taper into a tight waist; a dark neck separates the face.
shape('e', [[20,12],[28,10],[37,10],[46,14],[48,24],[44,31],[38,35],[27,35],[19,31],[15,22]]);
shape('s', [[22,15],[29,13],[37,13],[43,16],[45,24],[41,29],[37,32],[27,32],[22,29],[18,22]]);
shape('p', [[21,17],[28,16],[31,20],[30,25],[24,27],[20,24],[18,21]]);
shape('l', [[21,17],[26,17],[28,19],[22,20],[19,22],[19,20]]);
shape('p', [[35,18],[41,17],[44,22],[40,27],[33,26],[32,21]]);
shape('l', [[37,18],[41,18],[43,21],[38,20],[34,22],[34,20]]);
shape('d', [[22,27],[29,26],[32,28],[34,26],[42,27],[38,31],[35,34],[28,34],[24,31]]);
shape('p', [[25,28],[30,29],[31,31],[27,31]]);
shape('p', [[34,29],[39,28],[37,31],[33,31]]);
shape('e', [[30,22],[33,22],[34,26],[32,29],[30,26]]);
shape('i', [[31,23],[33,23],[32,26],[31,26]]);

// Asymmetric, overlapping shoulder plates with ivory broken spines.
shape('e', [[8,16],[9,10],[7,5],[13,8],[16,8],[18,5],[21,11],[25,14],[23,19],[17,21],[11,19]]);
shape('p', [[11,12],[16,10],[20,12],[23,15],[21,18],[16,19],[11,17]]);
shape('l', [[12,12],[16,11],[20,13],[21,15],[15,14],[11,16]]);
shape('b', [[9,8],[12,10],[13,12],[11,12]]);
shape('l', [[18,8],[20,12],[18,13],[17,11]]);
shape('e', [[39,13],[42,8],[43,2],[47,7],[51,7],[55,4],[55,11],[59,14],[57,19],[50,23],[43,21],[39,18]]);
shape('p', [[43,12],[47,9],[52,10],[56,14],[55,17],[50,20],[44,18],[41,16]]);
shape('l', [[45,11],[49,10],[53,12],[55,15],[50,14],[45,15],[42,16],[43,13]]);
shape('s', [[44,17],[49,16],[54,17],[50,20],[46,19]]);
shape('b', [[44,5],[46,8],[46,11],[44,11]]);
shape('l', [[53,7],[53,12],[51,11],[51,9]]);
shape('i', [[49,16],[51,16],[50,19],[49,18]]);

// Horns curve away from a small armored head, keeping the giant's anatomy clear.
shape('e', [[25,14],[20,10],[19,5],[21,0],[23,0],[22,5],[25,8],[28,9],[34,8],[38,4],[38,0],[41,0],[43,6],[41,11],[36,15]]);
shape('l', [[22,2],[22,6],[25,9],[27,10],[25,12],[22,9],[21,5]]);
shape('b', [[22,2],[22,5],[21,6],[21,4]]);
shape('l', [[40,2],[41,6],[39,10],[36,12],[34,10],[38,8],[39,5]]);
shape('b', [[40,2],[41,6],[39,8],[39,5]]);
shape('e', [[25,8],[33,7],[38,11],[37,17],[34,21],[28,22],[23,18],[23,12]]);
shape('p', [[26,10],[32,9],[36,12],[35,17],[32,20],[28,19],[25,16],[25,12]]);
shape('l', [[27,10],[32,10],[35,12],[31,12],[27,14],[25,13]]);
shape('e', [[24,14],[28,13],[34,13],[36,14],[33,17],[28,18],[24,16]]);
shape('i', [[25,14],[29,14],[33,14],[32,16],[28,16],[26,15]]);
shape('a', [[27,14],[31,14],[31,16],[28,16]]);
shape('b', [[28,14],[30,14],[30,15],[28,15]]);
shape('e', [[27,18],[30,19],[34,17],[33,20],[29,21]]);
shape('l', [[27,17],[29,18],[28,20],[26,18]]);
shape('l', [[34,17],[35,16],[34,19],[32,20],[32,19]]);

const idleA = pixels.map((row) => row.join(''));
// Pulse only the eye and two armor seams; fists and feet never slide.
pixels[14]![28] = 'a';
pixels[14]![29] = 'a';
pixels[15]![29] = 'b';
pixels[15]![30] = 'b';
pixels[24]![31] = 'a';
pixels[17]![49] = 'a';

export const raidBossCaption = '공허의 눈 노크튀르 · 거대 갑각 보스 · 보스 도트 2배';
export const raidBoss: Sprite = {
  w,
  h,
  palette: {
    e: COLORS.void,
    d: '#241c32',
    s: '#362a49',
    p: '#574467',
    l: '#8b7696',
    b: '#d6ccbd',
    i: '#a477cd',
    a: '#e2b6f2',
  },
  frames: [idleA, pixels.map((row) => row.join(''))],
};

/** Four boss designs remain temporary silhouettes, never presented as final art. */
const silhouette: Sprite = { ...raidBoss, palette: Object.fromEntries(Object.keys(raidBoss.palette).map(key => [key, COLORS.slate])) };
export const RAID_BOSS_SPRITES: Record<MonsterType, Sprite> = {
  dark: raidBoss, water: silhouette, wind: silhouette, earth: silhouette, fire: silhouette,
};
registerSprites(Object.fromEntries(Object.entries(RAID_BOSS_SPRITES).map(([element, art]) => [`raidBoss.${element}`, art])));

export function drawRaidBoss(ctx: SpriteCanvas, element: MonsterType, frame: number, x: number, groundY: number,
  options: { tint?: string } = {}): void {
  const art = RAID_BOSS_SPRITES[element];
  drawSprite(ctx, art, frame % art.frames.length, x, groundY - art.h * RAID_BOSS_SCALE,
    { scale: RAID_BOSS_SCALE, ...options });
}
