import { describe, expect, it } from 'vitest';
import { HERO_FORMS } from '../src/core/hero.js';
import { heroAttack, heroIdle } from '../src/renderer/sprites/hero.js';
import { drawHeroForm, HERO_FORM_IDS, heroFormSprite } from '../src/renderer/sprites/heroForms.js';
import { allSprites, drawSprite } from '../src/renderer/sprites/sprite.js';
import type { SpriteCanvas } from '../src/renderer/sprites/sprite.js';

function canvas(): { ctx: SpriteCanvas; pixels: unknown[] } {
  const pixels: unknown[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      pixels.push([x, y, w, h, ctx.fillStyle]);
    },
  };
  return { ctx, pixels };
}

describe('v0.5 reincarnated hero art', () => {
  it('supplies 70 complete registered 14×14 forms with animated idle and attack poses', () => {
    expect(HERO_FORM_IDS).toHaveLength(70);
    expect(HERO_FORM_IDS.slice(0, 50)).toEqual(Array.from({ length: 50 }, (_, i) => `h${String(i + 1).padStart(2, '0')}`));
    expect(HERO_FORM_IDS).toEqual(HERO_FORMS.map((form) => form.id));
    expect(HERO_FORM_IDS[0]).toBe('h01');
    expect(HERO_FORM_IDS[49]).toBe('h50');
    for (const id of HERO_FORM_IDS) {
      const idle = heroFormSprite(id);
      const attack = heroFormSprite(id, true);
      expect(idle.frames, id).toHaveLength(2);
      expect(attack.frames, id).toHaveLength(3);
      expect(allSprites().get(`hero.${id}.idle`)).toBe(idle);
      expect(allSprites().get(`hero.${id}.attack`)).toBe(attack);
      const poses = [...idle.frames, ...attack.frames];
      expect(new Set(poses.map((rows) => rows.join('/'))).size, `${id}: animated poses`).toBe(5);
      for (const sprite of [idle, attack]) {
        expect([sprite.w, sprite.h]).toEqual([14, 14]);
        for (const color of Object.values(sprite.palette)) expect(color).toMatch(/^#[0-9a-f]{6}$/);
        for (const rows of sprite.frames) {
          expect(rows, id).toHaveLength(14);
          for (const row of rows) {
            expect(row.length, id).toBe(14);
            for (const char of row.replaceAll('.', '')) expect(sprite.palette[char], `${id} color ${char}`).toBeDefined();
          }
          expect(rows[13]?.replaceAll('.', '').length, `${id}: feet stay grounded`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('all 70 silhouettes differ even after erasing every color', () => {
    const masks = new Map<string, string>();
    for (const id of HERO_FORM_IDS) {
      const mask = heroFormSprite(id).frames[0]?.map((row) => row.replace(/[^.]/g, '#')).join('/');
      expect(mask).toBeDefined();
      expect(masks.get(mask ?? ''), `${id} duplicates another form`).toBeUndefined();
      masks.set(mask ?? '', id);
    }
    expect(masks.size).toBe(70);
  });

  it('keeps every SD pose at the original 14-pixel height and seven colors', () => {
    for (const id of HERO_FORM_IDS) {
      for (const sprite of [heroFormSprite(id), heroFormSprite(id, true)]) {
        expect(new Set(Object.values(sprite.palette)).size, `${id}: simple palette`).toBeLessThanOrEqual(7);
        for (const [pose, rows] of sprite.frames.entries()) {
          const occupied = rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '.' ? [] : [{ x, y }]));
          const top = Math.min(...occupied.map(({ y }) => y));
          const bottom = Math.max(...occupied.map(({ y }) => y));
          expect(bottom, `${id} pose ${pose}: feet`).toBe(13);
          expect(bottom - top + 1, `${id} pose ${pose}: compact SD height`).toBe(sprite === heroFormSprite(id) && pose === 1 ? 13 : 14);
        }
      }
    }
  });

  it('holds all equipment in one connected figure, including every attack pose', () => {
    for (const id of HERO_FORM_IDS) {
      for (const sprite of [heroFormSprite(id), heroFormSprite(id, true)]) {
        for (const [pose, rows] of sprite.frames.entries()) {
          const remaining = new Set(rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '.' ? [] : [y * sprite.w + x])));
          const start = remaining.values().next().value;
          expect(start).toBeDefined();
          const pending = start === undefined ? [] : [start];
          if (start !== undefined) remaining.delete(start);
          while (pending.length > 0) {
            const point = pending.pop()!;
            const x = point % sprite.w, y = Math.floor(point / sprite.w);
            // Pixel-art diagonals are joined; isolated effects or loose weapons are not.
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (x + dx < 0 || x + dx >= sprite.w || y + dy < 0 || y + dy >= sprite.h) continue;
                const neighbor = (y + dy) * sprite.w + x + dx;
                if (remaining.delete(neighbor)) pending.push(neighbor);
              }
            }
          }
          expect(remaining.size, `${id} pose ${pose}: held props and attached headwear`).toBe(0);
        }
      }
    }
  });

  it('each family changes its equipment at every rank without growing or using palette swaps', () => {
    for (let family = 0; family < 10; family++) {
      const outfits = new Set<string>();
      for (let rank = 0; rank < 5; rank++) {
        const id = HERO_FORM_IDS[rank * 10 + family] ?? '';
        // Outfit construction changes inside the same original-sized body;
        // progressively larger figures were explicitly rejected by the user.
        const outfit = heroFormSprite(id).frames[0]!.slice(6).join('/');
        expect(outfits.has(outfit), `${id} rank ${rank + 1} authored equipment`).toBe(false);
        outfits.add(outfit);
      }
      expect(outfits.size).toBe(5);
    }
  });

  it('preserves the starter eye, hand and sole anchors through every pose with colored irises and varied skin', () => {
    const skins = new Set<string>(), irises = new Set<string>();
    const hands = [[[9, 7], [8, 8]], [[9, 8], [8, 9]], [[5, 6], [5, 7]], [[7, 6], [7, 7]], [[8, 7], [7, 8]]];
    const eyes = [[7, 3], [7, 4], [9, 3], [8, 3], [7, 3]];
    for (const id of HERO_FORM_IDS) {
      const idle = heroFormSprite(id), attack = heroFormSprite(id, true);
      skins.add(idle.palette.s!); irises.add(idle.palette.i!);
      expect(attack.palette, id).toEqual(idle.palette);
      expect(idle.palette.e, `${id} original outline`).toBe(heroIdle.palette.e);
      expect(idle.palette.i, `${id} visible iris`).not.toBe(idle.palette.e);
      expect(idle.palette.i, `${id} visible iris`).not.toBe(idle.palette.s);
      for (const [pose, rows] of [...idle.frames, ...attack.frames].entries()) {
        const [eyeX, eyeY] = eyes[pose]!;
        expect(rows[eyeY!]![eyeX!], `${id} pose ${pose} iris anchor`).toBe('i');
        expect(rows.join('').split('i'), `${id} pose ${pose} single visible eye`).toHaveLength(2);
        for (const [x, y] of hands[pose]!) expect(rows[y!]![x!], `${id} pose ${pose} hand`).toBe('s');
        const soles = pose < 2 ? [[1, 5], [7, 11]] : pose === 4 ? [[0, 4], [7, 11]] : [[1, 5], [8, 12]];
        for (const [left, right] of soles) expect(rows[13]!.slice(left!, right! + 1), `${id} pose ${pose} sole`).toBe('eeeee');
      }
    }
    expect(skins.size, 'skin tones across the catalogue').toBeGreaterThanOrEqual(10);
    expect(irises.size, 'eye colors across the catalogue').toBeGreaterThanOrEqual(10);
  });

  it('the card helper uses the same art and integer scale / mirror / tint as world drawing', () => {
    const preview = canvas();
    const world = canvas();
    const options = { scale: 2, flipX: true, tint: '#ffffff' };
    drawHeroForm(preview.ctx, 'h50', 7, 13, options);
    drawSprite(world.ctx, heroFormSprite('h50'), 0, 7, 13, options);
    expect(preview.pixels.length).toBeGreaterThan(0);
    expect(preview.pixels).toEqual(world.pixels);
  });

  it('unknown saved form IDs fall back to the novice in both animation states', () => {
    expect(heroFormSprite('missing')).toBe(heroIdle);
    expect(heroFormSprite('__proto__', true)).toBe(heroAttack);
  });
});
