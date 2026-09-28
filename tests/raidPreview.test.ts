import { describe, expect, it } from 'vitest';
import { GROUND_Y, VIEW_H, VIEW_W } from '../src/renderer/game.js';
import { HERO_FORM_IDS, heroFormSprite } from '../src/renderer/sprites/heroForms.js';
import { COLORS, hexToHsl } from '../src/renderer/sprites/palette.js';
import { drawSprite } from '../src/renderer/sprites/sprite.js';
import type { SpriteCanvas } from '../src/renderer/sprites/sprite.js';
import { RAID_BOSS_SCALE, raidBoss } from '../docs/v0.12/preview-src/boss.js';
import { raidHeroes, RAID_HP, RAID_TIME } from '../docs/v0.12/preview-src/field.js';

function recordingCanvas(): { ctx: SpriteCanvas; rects: { x: number; y: number; w: number; h: number; color: string }[] } {
  const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      rects.push({ x, y, w, h, color: ctx.fillStyle });
    },
  };
  return { ctx, rects };
}

describe('v0.12 preview art and field composition', () => {
  it('keeps the doubled-pixel boss in the raid size band with a complete, legible palette', () => {
    expect(RAID_BOSS_SCALE).toBe(2);
    expect(raidBoss.w * RAID_BOSS_SCALE).toBeGreaterThanOrEqual(96);
    expect(raidBoss.w * RAID_BOSS_SCALE).toBeLessThanOrEqual(128);
    expect(raidBoss.h * RAID_BOSS_SCALE).toBeGreaterThanOrEqual(64);
    expect(raidBoss.h * RAID_BOSS_SCALE).toBeLessThanOrEqual(88);
    expect(raidBoss.frames).toHaveLength(2);
    const colors = Object.values(raidBoss.palette);
    expect(colors.length).toBeLessThanOrEqual(10);
    expect(colors).toContain(COLORS.void);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.some((color) => hexToHsl(color).l >= 0.7)).toBe(true);
    for (const frame of raidBoss.frames) {
      expect(frame).toHaveLength(raidBoss.h);
      for (const row of frame) {
        expect(row).toHaveLength(raidBoss.w);
        for (const cell of row) {
          if (cell !== '.') expect(raidBoss.palette[cell]).toBeDefined();
        }
      }
      expect(frame.at(-1)).toMatch(/[^.]/);
    }
  });

  it('animates a restrained idle without changing more than 15% of its cells', () => {
    const a = raidBoss.frames[0]!.join('');
    const b = raidBoss.frames[1]!.join('');
    const changed = [...a].filter((cell, index) => cell !== b[index]).length;
    expect(changed).toBeGreaterThan(0);
    expect(changed / (raidBoss.w * raidBoss.h)).toBeLessThanOrEqual(0.15);
  });

  it('draws both boss frames with twice the hero pixel size and four times the native area, including silhouettes', () => {
    const x = Math.floor((VIEW_W - raidBoss.w * RAID_BOSS_SCALE) / 2);
    const y = GROUND_Y - raidBoss.h * RAID_BOSS_SCALE;
    for (const [frameIndex, frame] of raidBoss.frames.entries()) {
      for (const tint of [undefined, COLORS.slate]) {
        const { ctx, rects } = recordingCanvas();
        drawSprite(ctx, raidBoss, frameIndex, x, y, { scale: RAID_BOSS_SCALE, tint });
        expect(rects.length).toBeGreaterThan(0);
        expect(rects.reduce((area, rect) => area + rect.w * rect.h, 0))
          .toBe(frame.join('').replaceAll('.', '').length * 4);
        for (const rect of rects) {
          expect(rect.h).toBe(2);
          expect(rect.w % 2).toBe(0);
          expect((rect.x - x) % 2).toBe(0);
          expect((rect.y - y) % 2).toBe(0);
          expect(Number.isInteger(rect.x) && Number.isInteger(rect.y) && Number.isInteger(rect.w)).toBe(true);
          expect(rect.x).toBeGreaterThanOrEqual(x);
          expect(rect.x + rect.w).toBeLessThanOrEqual(x + raidBoss.w * RAID_BOSS_SCALE);
          expect(rect.y).toBeGreaterThanOrEqual(y);
          expect(rect.y + rect.h).toBeLessThanOrEqual(GROUND_Y);
          if (tint) expect(rect.color).toBe(tint);
          else expect(Object.values(raidBoss.palette)).toContain(rect.color);
        }
        expect(rects.some((rect) => rect.y + rect.h === GROUND_Y)).toBe(true);
      }
    }
  });

  it('fits the boss below both meters on the actual game canvas', () => {
    expect(GROUND_Y).toBeLessThan(VIEW_H);
    expect(raidBoss.w * RAID_BOSS_SCALE).toBeLessThanOrEqual(VIEW_W);
    const bossTop = GROUND_Y - raidBoss.h * RAID_BOSS_SCALE;
    expect(bossTop).toBeGreaterThanOrEqual(32);
    for (const meter of [RAID_HP, RAID_TIME]) {
      expect(meter.x).toBeGreaterThanOrEqual(0);
      expect(meter.y).toBeGreaterThanOrEqual(0);
      expect(meter.x + meter.w).toBeLessThanOrEqual(VIEW_W);
      expect(meter.y + meter.h).toBeLessThan(bossTop);
    }
    expect(RAID_HP.y + RAID_HP.h).toBeLessThan(RAID_TIME.y);
  });

  it.each([8, 20, 32, 50, 100])('uses the left, center, and right of the field for %i heroes', (count) => {
    const heroes = raidHeroes(count);
    expect(heroes.some((hero) => hero.x < VIEW_W / 4)).toBe(true);
    expect(heroes.some((hero) => hero.x < VIEW_W / 2
      && hero.x + heroFormSprite(hero.form).w > VIEW_W / 2)).toBe(true);
    expect(heroes.some((hero) => hero.x + heroFormSprite(hero.form).w > VIEW_W * 3 / 4)).toBe(true);
    expect(heroes.at(-1)).toMatchObject({ x: 93, foot: GROUND_Y, form: 'h11', isLocal: true });
  });

  it.each([1, 8, 20, 32, 50, 100])('fits all %i real hero forms and attack frames inside the raid field at native scale', (count) => {
    const heroes = raidHeroes(count);
    expect(heroes).toHaveLength(count);
    expect(heroes).toEqual(raidHeroes(count));
    expect(heroes.filter((hero) => hero.isLocal)).toHaveLength(1);
    expect(heroes.at(-1)).toMatchObject({ form: 'h11', isLocal: true, foot: GROUND_Y });
    expect(heroes.map((hero) => hero.foot)).toEqual(heroes.map((hero) => hero.foot).sort((a, b) => a - b));
    for (const hero of heroes) {
      expect(HERO_FORM_IDS).toContain(hero.form);
      expect(hero.foot).toBeGreaterThanOrEqual(GROUND_Y - 8);
      for (const attacking of [false, true]) {
        const art = heroFormSprite(hero.form, attacking);
        expect(hero.x).toBeGreaterThanOrEqual(0);
        expect(hero.x + art.w).toBeLessThanOrEqual(VIEW_W);
        expect(hero.foot - art.h).toBeGreaterThan(RAID_TIME.y + RAID_TIME.h);
        expect(hero.foot).toBeLessThanOrEqual(GROUND_Y);
        for (let frame = 0; frame < art.frames.length; frame++) {
          const { ctx, rects } = recordingCanvas();
          drawSprite(ctx, art, frame, hero.x, hero.foot - art.h, { scale: 1, flipX: hero.flipX });
          expect(rects.length).toBeGreaterThan(0);
          expect(rects.every((rect) => rect.h === 1 && rect.x >= 0
            && rect.x + rect.w <= VIEW_W && rect.y >= 0 && rect.y + rect.h <= GROUND_Y)).toBe(true);
        }
      }
    }
  });

  it.each([20, 32, 50, 100])('overlaps %i participants across shallow rows including the field center', (count) => {
    const heroes = raidHeroes(count);
    expect(new Set(heroes.map((hero) => hero.foot)).size).toBeGreaterThanOrEqual(1);
    expect(new Set(heroes.map((hero) => hero.foot)).size).toBeLessThanOrEqual(5);
    expect(heroes.filter((hero) => hero.x < 120 && hero.x + heroFormSprite(hero.form).w > 80).length)
      .toBeGreaterThanOrEqual(3);
    expect(heroes.some((a, index) => heroes.slice(index + 1).some((b) => {
      const artA = heroFormSprite(a.form);
      const artB = heroFormSprite(b.form);
      return a.x < b.x + artB.w && b.x < a.x + artA.w
        && a.foot - artA.h < b.foot && b.foot - artB.h < a.foot;
    }))).toBe(true);
  });

  it('preserves every participant in deterministic, distinct positions and paints the local hero last', () => {
    for (let count = 1; count <= 100; count++) {
      const heroes = raidHeroes(count);
      expect(heroes).toHaveLength(count);
      expect(heroes).toEqual(raidHeroes(count));
      expect(new Set(heroes.map((hero) => `${hero.x},${hero.foot}`)).size).toBe(count);
      expect(heroes.filter((hero) => hero.isLocal)).toHaveLength(1);
      expect(heroes.at(-1)).toMatchObject({ x: 93, foot: GROUND_Y, form: 'h11', isLocal: true });
      expect(heroes.map((hero) => hero.foot)).toEqual(heroes.map((hero) => hero.foot).sort((a, b) => a - b));
    }
  });

  it('bounds malformed participant counts without dropping players in supported large raids', () => {
    expect(raidHeroes(0)).toHaveLength(1);
    expect(raidHeroes(-20)).toHaveLength(1);
    expect(raidHeroes(20.9)).toHaveLength(20);
    expect(raidHeroes(101)).toHaveLength(100);
    expect(raidHeroes(Number.NaN)).toHaveLength(32);
    expect(raidHeroes(Infinity)).toHaveLength(32);
  });
});
