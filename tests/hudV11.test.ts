import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, FEVER_INPUTS, FEVER_MS, HERO_FORMS, monsterForIndex, SPECIES_IDS, xpToNext } from '../src/core/index.js';
import { heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';
import {
  BAG_FULL_Y, BANNER_MS, BANNER_Y, COIN_COUNTER_X, COIN_COUNTER_Y, createBanner, createFloatPool,
  drawBanner, drawCounters, drawFeverLabel, drawFloats, drawLevelHud, FEVER_FLASH_MS,
  FIELD_FLOAT_RISE_PX, LEVEL_UP_FLASH_MS, LEVEL_UP_MS, showBanner, spawnFieldFloat, spawnFloat,
  tickBanner, tickFloats, VICTORY_TEXT,
} from '../src/renderer/hud.js';
import { createGame, DROP_TARGET_X, DROP_TARGET_Y, heroHudTop, monsterFloatAnchor, monsterHpBarY, VIEW_H, VIEW_W } from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import { COLORS, drawText, monsterSprites } from '../src/renderer/sprites/index.js';

interface Rect { x: number; y: number; w: number; h: number; color: string }
function canvas() {
  const rects: Rect[] = [];
  const ctx: GameCanvas = { fillStyle: '', clearRect() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h, color: String(ctx.fillStyle) }); } };
  return { ctx, rects };
}
const bounds = (rects: Rect[]) => ({ left: Math.min(...rects.map(r => r.x)), right: Math.max(...rects.map(r => r.x + r.w)),
  top: Math.min(...rects.map(r => r.y)), bottom: Math.max(...rects.map(r => r.y + r.h)) });
const overlaps = (a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const ink = (rects: Rect[]) => rects.filter(r => r.color !== COLORS.void);

describe('v0.11 head labels and field damage', () => {
  it('stacks every combination above every idle hero without overlaps or cropped outlines', () => {
    const base = createEngine(DEFAULT_SAVE).getState();
    for (const form of ['h00', ...HERO_FORMS.map(hero => hero.id)]) {
      for (const ready of [false, true]) for (const levelUp of [false, true]) for (const fever of [false, true]) {
        for (const ageMs of [0, 200, 600, 2399]) {
          const state = { ...base, level: ready ? heroRequiredLevel(0) : 1,
            hero: { ...newHeroProgress(), equipped: { formId: form, buffPercent: 0 } } };
          const bottom = heroHudTop(form) - 2;
          const banner = createBanner(); if (levelUp) { showBanner(banner); tickBanner(banner, ageMs); }
          const first = canvas(); drawLevelHud(first.ctx, state, 80, bottom);
          const leveled = canvas(); drawLevelHud(leveled.ctx, state, 80, bottom, { levelUp: banner });
          const out = canvas(); drawLevelHud(out.ctx, state, 80, bottom,
            { levelUp: banner, ...(fever ? { feverAgeMs: ageMs } : {}) });
          const groups = [first.rects, leveled.rects.slice(first.rects.length), out.rects.slice(leveled.rects.length)]
            .filter(group => group.length).map(bounds);
          for (const [i, box] of groups.entries()) {
            expect(box.left).toBeGreaterThanOrEqual(1);
            expect(box.right).toBeLessThan(120);
            expect(box.top).toBeGreaterThanOrEqual(1);
            expect(box.bottom).toBeLessThan(heroHudTop(form));
            for (const other of groups.slice(i + 1)) expect(overlaps(box, other)).toBe(false);
          }
          if (levelUp) {
            const label = leveled.rects.slice(first.rects.length);
            expect(label.some(rect => rect.color === COLORS.void)).toBe(true);
            expect(new Set(ink(label).map(rect => rect.color))).toEqual(new Set([
              Math.floor(ageMs / LEVEL_UP_FLASH_MS) % 2 ? COLORS.white : COLORS.yellow,
            ]));
          }
        }
      }
    }
  });

  it('uses slow 600 ms level-up phases for 2400 ms, retaining PvP result timing and position', () => {
    expect(LEVEL_UP_MS).toBe(2400); expect(LEVEL_UP_FLASH_MS).toBe(600);
    const level = createBanner(); showBanner(level);
    tickBanner(level, 2399); expect(level.active).toBe(true);
    tickBanner(level, 1); expect(level.active).toBe(false);
    const victory = createBanner(); showBanner(victory, VICTORY_TEXT);
    tickBanner(victory, BANNER_MS - 1);
    const out = canvas(); drawBanner(out.ctx, victory, VIEW_W);
    expect(bounds(out.rects).top).toBe(BANNER_Y);
    expect(out.rects.every(rect => rect.w === 2 && rect.h === 2)).toBe(true);
    tickBanner(victory, 1); expect(victory.active).toBe(false);
  });

  it('keeps the head anchor fixed through every hero attack pose in the complete scene', () => {
    for (const formId of ['h00', ...HERO_FORMS.map(hero => hero.id)]) {
      const hero = newHeroProgress();
      hero.equipped = { formId, buffPercent: 0 }; hero.collection = [hero.equipped];
      const game = createGame(createEngine({ ...DEFAULT_SAVE, hero, monsterIndex: 100, monsterHp: '999999999999' }));
      const expected = canvas(); drawLevelHud(expected.ctx, game.getState(), 80, heroHudTop(formId) - 2);
      game.attack('keyboard');
      for (const dt of [0, 60, 60, 60, 500]) {
        game.update(dt);
        const actual = canvas(); game.draw(actual.ctx);
        const painted = new Set(actual.rects.map(rect => JSON.stringify(rect)));
        expect(expected.rects.every(rect => painted.has(JSON.stringify(rect)))).toBe(true);
      }
    }
  });

  it('retains simultaneous level-up, ready and fever feedback in the live field through every color phase', () => {
    const level = heroRequiredLevel(0);
    const game = createGame(createEngine({ ...DEFAULT_SAVE, level, xp: xpToNext(level) - 1, monsterHp: '1', hero: newHeroProgress() }));
    let sawLevelUp = false;
    for (let i = 0; i < FEVER_INPUTS; i++) {
      const events = game.attack('keyboard');
      sawLevelUp ||= events.some(event => event.type === 'levelUp');
    }
    expect(sawLevelUp).toBe(true);
    expect(game.getState().fever.active).toBe(true);
    let age = 0;
    for (const target of [0, 199, 200, 599, 600, 1199, 1200, 2399, 2400]) {
      game.update(target - age); age = target;
      const banner = createBanner(); showBanner(banner); tickBanner(banner, age);
      const expected = canvas(); drawLevelHud(expected.ctx, game.getState(), 80, heroHudTop('h00') - 2,
        { levelUp: banner, feverAgeMs: FEVER_MS - game.getState().fever.remainingMs });
      const actual = canvas(); game.draw(actual.ctx);
      const painted = new Set(actual.rects.map(rect => JSON.stringify(rect)));
      expect(expected.rects.every(rect => painted.has(JSON.stringify(rect)))).toBe(true);
      expect(actual.rects.filter(rect => rect.y >= BANNER_Y && rect.y < BANNER_Y + 10 && rect.w === 2 && rect.h === 2)).toEqual([]);
    }
  });

  it('flashes the outlined fever head label every 200 ms without changing its geometry', () => {
    expect(FEVER_FLASH_MS).toBe(200);
    let geometry: string | undefined;
    for (const age of [0, 199, 200, 399, 400, 4999]) {
      const out = canvas(); drawFeverLabel(out.ctx, 80, 52, age);
      const shape = JSON.stringify(out.rects.map(({ x, y, w, h }) => [x, y, w, h]));
      expect(shape).toBe(geometry ?? shape); geometry = shape;
      expect(new Set(ink(out.rects).map(rect => rect.color)))
        .toEqual(new Set([Math.floor(age / 200) % 2 ? COLORS.white : COLORS.yellow]));
      expect(out.rects.some(rect => rect.color === COLORS.void)).toBe(true);
    }
  });

  it('anchors every monster and crown above its HP bar and keeps long rising hits inside the field', () => {
    expect(FIELD_FLOAT_RISE_PX).toBe(28);
    for (const speciesId of SPECIES_IDS) for (const boss of [false, true]) {
      const monster = { ...monsterForIndex(0), speciesId, boss };
      const anchor = monsterFloatAnchor(monster);
      expect(anchor.x).toBe(150 + monsterSprites[speciesId].idle.w);
      expect(anchor.y + 8).toBe(monsterHpBarY(monster));
      for (const crit of [false, true]) for (const text of ['9', '1.00AAA']) {
        let startTop = 0;
        for (const age of [0, 300, 599]) {
          const pool = createFloatPool(); spawnFieldFloat(pool, anchor.x, anchor.y, text, crit); tickFloats(pool, age);
          const out = canvas(); drawFloats(out.ctx, pool);
          const box = bounds(out.rects);
          if (age === 0) startTop = box.top;
          expect(box.top).toBeLessThanOrEqual(startTop);
          expect(box.bottom).toBeLessThan(monsterHpBarY(monster));
          for (const shake of [-1, 0, 1]) {
            expect(box.left + shake).toBeGreaterThanOrEqual(120);
            expect(box.right + shake).toBeLessThanOrEqual(VIEW_W);
            expect(box.top + shake).toBeGreaterThanOrEqual(0);
            expect(box.bottom + shake).toBeLessThan(VIEW_H);
          }
        }
      }
    }
    for (const [crit, rise] of [[false, 28], [true, 42]] as const) {
      const pool = createFloatPool(); spawnFieldFloat(pool, 170, 90, '9', crit);
      const before = canvas(); drawFloats(before.ctx, pool); tickFloats(pool, 599);
      const after = canvas(); drawFloats(after.ctx, pool);
      expect(bounds(before.rects).top - bounds(after.rects).top).toBe(rise);
    }
  });

  it('retains the original replay rise even when a reused slot previously held a field hit', () => {
    const pool = createFloatPool(1); spawnFieldFloat(pool, 170, 90, '9', true);
    spawnFloat(pool, 170, 90, '9', true);
    const start = canvas(); drawFloats(start.ctx, pool); tickFloats(pool, 599);
    const end = canvas(); drawFloats(end.ctx, pool);
    expect(bounds(start.rects).top - bounds(end.rects).top).toBe(21);
  });

  it('collects coins at the new icon and keeps full-bag feedback below the counters', () => {
    expect(DROP_TARGET_X).toBe(COIN_COUNTER_X); expect(DROP_TARGET_Y).toBe(COIN_COUNTER_Y);
    const equipment = createEngine(DEFAULT_SAVE).toSave().equipment!;
    equipment.capacity = 1;
    equipment.bag = [{ id: 'e99', templateId: 'w-sword-common-4', enhancement: '0', roll: 100, seed: 99, attempts: '0' }];
    const engine = createEngine({ ...DEFAULT_SAVE, equipment });
    const out = canvas(); createGame(engine).draw(out.ctx);
    const counters = canvas(); drawCounters(counters.ctx, engine.getState(), VIEW_W);
    const bag = canvas(); drawText(bag.ctx, 'BAG FULL', 8, BAG_FULL_Y, { color: COLORS.yellow });
    expect(overlaps(bounds(counters.rects), bounds(bag.rects))).toBe(false);
    const painted = new Set(out.rects.map(rect => JSON.stringify(rect)));
    expect(bag.rects.every(rect => painted.has(JSON.stringify(rect)))).toBe(true);
  });
});
