import { describe, expect, it } from 'vitest';
import { heroAttack, heroIdle } from '../src/renderer/sprites/hero.js';
import { HERO_EVOLUTION_STUDIES } from '../src/renderer/sprites/heroEvolutionStudies.js';

const occupied = (rows: string[]): string[] => rows.flatMap((row, y) =>
  [...row].flatMap((pixel, x) => pixel === '.' ? [] : [`${x},${y}`]));
const skin = (rows: string[]): string[] => rows.flatMap((row, y) =>
  [...row].flatMap((pixel, x) => pixel === 's' ? [`${x},${y}`] : []));

describe('three studies descended from the original 14×14 hero', () => {
  it('makes exactly three new outfits with the original frame size and grounded poses', () => {
    expect(HERO_EVOLUTION_STUDIES).toHaveLength(3);
    for (const study of HERO_EVOLUTION_STUDIES) {
      for (const [kind, base] of [['idle', heroIdle], ['attack', heroAttack]] as const) {
        const sprite = study[kind];
        expect([sprite.w, sprite.h], study.id).toEqual([14, 14]);
        expect(sprite.frames).toHaveLength(base.frames.length);
        expect(new Set(Object.values(sprite.palette)).size).toBeLessThanOrEqual(7);
        sprite.frames.forEach((rows, pose) => {
          expect(rows).toHaveLength(14);
          for (const row of rows) {
            expect(row).toHaveLength(14);
            for (const pixel of row.replaceAll('.', '')) expect(sprite.palette[pixel]).toBeDefined();
          }
          expect(rows[13], `${study.id} ${kind} ${pose}: original footing`).toBe(base.frames[pose]![13]);
          expect(occupied(rows).length).toBeGreaterThan(0);
          expect(rows, `${study.id} ${kind} ${pose}: authored outfit`).not.toEqual(base.frames[pose]);
        });
      }
      expect(new Set([...study.idle.frames, ...study.attack.frames].map(rows => rows.join('/'))).size).toBe(5);
    }
  });

  it('preserves the original head, face, skin positions and identity colors in every pose', () => {
    for (const study of HERO_EVOLUTION_STUDIES) {
      for (const [kind, base] of [['idle', heroIdle], ['attack', heroAttack]] as const) {
        const sprite = study[kind];
        for (const color of ['e', 'b', 's', 'g', 'w', 'y']) expect(sprite.palette[color]).toBe(base.palette[color]);
        sprite.frames.forEach((rows, pose) => {
          const original = base.frames[pose]!;
          const headRows = kind === 'idle' && pose === 1 ? 7 : 6;
          expect(rows.slice(0, headRows), `${study.id} ${kind} ${pose}: same head`).toEqual(original.slice(0, headRows));
          expect(skin(rows), `${study.id} ${kind} ${pose}: hands and face`).toEqual(skin(original));
          const bounds = (frame: string[]): number[] => {
            const points = occupied(frame).map(point => point.split(',').map(Number));
            return [Math.min(...points.map(p => p[0]!)), Math.max(...points.map(p => p[0]!)),
              Math.min(...points.map(p => p[1]!)), Math.max(...points.map(p => p[1]!))];
          };
          expect(bounds(rows), `${study.id} ${kind} ${pose}: same visible size`).toEqual(bounds(original));
        });
      }
    }
  });
});
