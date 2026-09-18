import { describe, expect, it } from 'vitest';
import { heroAttack, heroIdle } from '../src/renderer/sprites/hero.js';
import { HERO_JOB_STUDIES } from '../src/renderer/sprites/heroJobStudies.js';
import { drawSprite, UNIT_SCALE } from '../src/renderer/sprites/sprite.js';

const skin = (rows: string[]): string[] => rows.flatMap((row, y) =>
  [...row].flatMap((pixel, x) => pixel === 's' ? [`${x},${y}`] : []));

describe('three DFO-inspired job studies on the starter skeleton', () => {
  it('keeps all fifteen frames at 14×14, grounded, with the original face and hand anchors', () => {
    expect(HERO_JOB_STUDIES).toHaveLength(3);
    expect(new Set(HERO_JOB_STUDIES.map(study => study.idle.palette.s)).size).toBe(3);
    expect(new Set(HERO_JOB_STUDIES.map(study => study.idle.palette.i)).size).toBe(3);
    for (const study of HERO_JOB_STUDIES) {
      expect(new Set(Object.values(study.idle.palette)).size).toBeLessThanOrEqual(7);
      expect(study.attack.palette).toEqual(study.idle.palette);
      for (const [kind, base] of [['idle', heroIdle], ['attack', heroAttack]] as const) {
        const sprite = study[kind];
        expect([sprite.w, sprite.h]).toEqual([14, 14]);
        expect(sprite.frames).toHaveLength(base.frames.length);
        expect(sprite.palette.s).not.toBe(base.palette.s);
        expect(sprite.palette.e).toBe(base.palette.e);
        expect(sprite.palette.i).not.toBe(sprite.palette.s);
        expect(sprite.palette.i).not.toBe(sprite.palette.e);
        sprite.frames.forEach((rows, pose) => {
          const label = `${study.id} ${kind} ${pose}`;
          expect(rows, label).toHaveLength(14);
          rows.forEach(row => {
            expect(row, label).toHaveLength(14);
            for (const pixel of row.replaceAll('.', '')) expect(sprite.palette[pixel], label).toMatch(/^#[0-9a-f]{6}$/i);
          });
          // The user requested hood/helmet brims. Verify their exact two-pixel
          // forehead coverage, and keep EVERY other face/hand pixel unchanged.
          const browY = kind === 'idle' && pose === 1 ? 3 : 2;
          const browX = kind === 'attack' && pose !== 2 ? 7 : 6;
          const brim = study.id === 'study-shadow' ? ['h', 'c'] : study.id === 'study-dawn' ? ['c', 'c'] : [];
          const covered = brim.map((pixel, offset) => {
            expect(rows[browY]![browX + offset], `${label}: headgear brim`).toBe(pixel);
            expect(base.frames[pose]![browY]![browX + offset], `${label}: brim over forehead`).toBe('s');
            return `${browX + offset},${browY}`;
          });
          expect(skin(rows), `${label}: visible face and both hands`).toEqual(skin(base.frames[pose]!).filter(point => !covered.includes(point)));
          const [eyeX, eyeY] = kind === 'idle' ? [7, pose === 0 ? 3 : 4] : [[9, 3], [8, 3], [7, 3]][pose]!;
          expect(rows[eyeY!]![eyeX!], `${label}: colored iris at original eye position`).toBe('i');
          expect(rows.join('').split('i')).toHaveLength(2);
          // The two boot soles are invariant; the weapon tip to their right
          // can differ because the rogue now carries a genuinely short blade.
          const soles = kind === 'idle' ? [[1, 5], [7, 11]] : pose === 2 ? [[0, 4], [7, 11]] : [[1, 5], [8, 12]];
          for (const [left, right] of soles) expect(rows[13]!.slice(left!, right! + 1), label).toBe('eeeee');
        });
      }
    }
  });

  it('provides distinct authored silhouettes and attached, pose-consistent blades', () => {
    for (let pose = 0; pose < 5; pose++) {
      const frames = HERO_JOB_STUDIES.map(study => [...study.idle.frames, ...study.attack.frames][pose]!);
      expect(new Set(frames.map(frame => frame.map(row => row.replace(/[^.]/g, '#')).join('/'))).size).toBe(3);
    }
    for (const study of HERO_JOB_STUDIES) {
      expect(new Set([...study.idle.frames, ...study.attack.frames].map(frame => frame.join('/'))).size).toBe(5);
      // Same raised diagonal, forward strike and lowered recovery direction.
      for (const [pose, x, y] of [[0, 4, 4], [1, 9, 6], [2, 11, 9]]) expect(study.attack.frames[pose!]![y!]![x!]).toBe('w');
    }
    const rogue = HERO_JOB_STUDIES[1];
    for (const [kind, pose] of [['idle', 0], ['idle', 1], ['attack', 2]] as const) {
      for (const row of rogue[kind].frames[pose]!.slice(11)) expect(row.slice(11)).not.toContain('w');
    }
  });

  it('renders every pose and its mirror on the existing integer pixel scale', () => {
    for (const study of HERO_JOB_STUDIES) for (const sprite of [study.idle, study.attack]) {
      sprite.frames.forEach((rows, frame) => {
        const rectangles = (flipX: boolean): string[] => {
          const result: string[] = [];
          const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number) {
            expect([w, h]).toEqual([UNIT_SCALE, UNIT_SCALE]);
            expect(x % UNIT_SCALE).toBe(0);
            expect(y % UNIT_SCALE).toBe(0);
            result.push(`${x},${y},${ctx.fillStyle}`);
          } };
          drawSprite(ctx, sprite, frame, 0, 0, { flipX, scale: UNIT_SCALE });
          return result.sort();
        };
        const expected = rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '.' ? [] :
          [`${(13 - x) * UNIT_SCALE},${y * UNIT_SCALE},${sprite.palette[pixel]}`])).sort();
        expect(rectangles(true)).toEqual(expected);
        expect(rectangles(false)).toHaveLength(expected.length);
      });
    }
  });
});
