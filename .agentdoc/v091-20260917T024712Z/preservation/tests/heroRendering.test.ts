import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, mulberry32 } from '../src/core/index.js';
import { newHeroProgress } from '../src/core/hero.js';
import { ATTACK_FRAME_MS, createGame, GROUND_Y, HERO_X, IDLE_FRAME_MS, SPRITE_SCALE, VIEW_W } from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import { COLORS } from '../src/renderer/sprites/palette.js';
import { HERO_FORM_IDS, heroFormSprite } from '../src/renderer/sprites/heroForms.js';
import { HERO_RIVAL_PALETTE, heroIdle } from '../src/renderer/sprites/hero.js';
import { drawSprite } from '../src/renderer/sprites/sprite.js';

function gameFor(formId: string): ReturnType<typeof createGame> {
  const roll = { formId, buffPercent: formId === 'h00' ? 0 : 20 };
  return createGame(createEngine({
    ...DEFAULT_SAVE,
    hero: { ...newHeroProgress(), equipped: roll, collection: formId === 'h00' ? [] : [roll], reincarnations: 5 },
  }, mulberry32(7)));
}

interface Pixel { x: number; y: number; w: number; h: number; color: string }
function draw(game: ReturnType<typeof createGame>): Pixel[] {
  const pixels: Pixel[] = [];
  const ctx: GameCanvas = {
    fillStyle: '',
    fillRect(x, y, w, h): void { pixels.push({ x, y, w, h, color: String(ctx.fillStyle) }); },
    clearRect(): void { pixels.length = 0; },
  };
  game.draw(ctx);
  return pixels;
}

describe('reincarnated hero field placement', () => {
  it('keeps the XP bar near each visible crown, stable through idle and wind-up', () => {
    // All ranks retain the starter's 14px height. The four-pixel XP frame
    // ends two pixels above the crown, independent of the breathing bob.
    for (const id of ['h00', ...HERO_FORM_IDS]) {
      const barY = 86;
      const game = gameFor(id);
      const expected = { x: 60, y: barY, w: 40, h: 4, color: COLORS.steel };
      expect(draw(game), `${id} idle`).toContainEqual(expected);
      game.update(IDLE_FRAME_MS);
      expect(draw(game), `${id} breathing`).toContainEqual(expected);
      game.attack('keyboard');
      expect(draw(game), `${id} wind-up`).toContainEqual(expected);
    }
  });

  it('puts the slash beyond the evolved blade and suppresses it in a PvP replay', () => {
    const game = gameFor('h41');
    game.attack('keyboard');
    game.update(ATTACK_FRAME_MS);
    // Every form uses the original 14px strike: the blade ends at x=94
    // and the cyan outer arc starts one art pixel beyond it at x=96.
    const arc = { x: 96, y: 98, w: 2, h: 2, color: COLORS.cyan };
    expect(draw(game)).toContainEqual(arc);
    expect(draw(game)).not.toContainEqual({ ...arc, x: 114 });
    game.playReplay({ opponentName: 'FOE', opponentParty: [], blows: [] });
    expect(draw(game)).not.toContainEqual(arc);
  });

  it('uses the common slash only for swords, rogues, berserkers and guardian knights at every rank', () => {
    for (const [index, id] of HERO_FORM_IDS.entries()) {
      const game = gameFor(id);
      const expected = [0, 4, 5, 8].includes(index % 10);
      game.attack('keyboard');
      const burst = { x: 94, y: 105, w: 1, h: 1, color: COLORS.cyan };
      expect(draw(game).some((p) => JSON.stringify(p) === JSON.stringify(burst)), `${id} slash particles`).toBe(expected);
      game.update(ATTACK_FRAME_MS);
      const arc = { x: 96, y: 98, w: 2, h: 2, color: COLORS.cyan };
      expect(draw(game).some((p) => JSON.stringify(p) === JSON.stringify(arc)), `${id} slash overlay`).toBe(expected);
      // All classes still enter their own strike pose, including non-swords.
      expect(game.getHeroAnim().state).toBe('attack');
    }
    const novice = gameFor('h00');
    novice.attack('keyboard');
    expect(draw(novice)).toContainEqual({ x: 94, y: 105, w: 1, h: 1, color: COLORS.cyan });
    novice.update(ATTACK_FRAME_MS);
    expect(draw(novice)).toContainEqual({ x: 96, y: 98, w: 2, h: 2, color: COLORS.cyan });
  });

  it('draws every compact hero above the field floor, including its class strike pose', () => {
    for (const id of HERO_FORM_IDS) {
      const game = gameFor(id);
      for (const attacking of [false, true]) {
        if (attacking) { game.attack('keyboard'); game.update(ATTACK_FRAME_MS); }
        const actual = new Set(draw(game).map((p) => JSON.stringify(p)));
        const sprite = heroFormSprite(id, attacking);
        const expected: Pixel[] = [];
        const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number): void {
          expected.push({ x, y, w, h, color: ctx.fillStyle });
        } };
        drawSprite(ctx, sprite, attacking ? 1 : 0,
          HERO_X + (heroIdle.w - sprite.w) * SPRITE_SCALE / 2, GROUND_Y - sprite.h * SPRITE_SCALE, { scale: SPRITE_SCALE });
        expect(expected.every((p) => actual.has(JSON.stringify(p))), `${id} ${attacking ? 'strike' : 'idle'} art`).toBe(true);
        expect(expected.every((p) => p.x >= 0 && p.x + p.w <= VIEW_W && p.y >= GROUND_Y - heroIdle.h * SPRITE_SCALE && p.y + p.h <= GROUND_Y), `${id} compact bounds`).toBe(true);
        expect(Math.max(...expected.map((p) => p.y + p.h)), `${id} feet`).toBe(GROUND_Y);
      }
    }
  });

  it('mirrors the opponent around the field center with matching feet and the novice rival palette', () => {
    for (const id of ['h00', 'h01', 'h43', 'unknown-form']) {
      const game = gameFor(id);
      game.playReplay({ opponentName: 'FOE', opponentHero: { formId: id, buffPercent: id === 'h00' ? 0 : 20 }, opponentParty: [], blows: [] });
      const actual = new Set(draw(game).map((p) => JSON.stringify(p)));
      const sprite = heroFormSprite(id);
      const expected: Pixel[] = [];
      const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number): void {
        expected.push({ x, y, w, h, color: ctx.fillStyle });
      } };
      drawSprite(ctx, sprite === heroIdle ? { ...sprite, palette: HERO_RIVAL_PALETTE } : sprite, 0,
        VIEW_W - HERO_X - (heroIdle.w + sprite.w) * SPRITE_SCALE / 2, GROUND_Y - sprite.h * SPRITE_SCALE,
        { scale: SPRITE_SCALE, flipX: true });
      expect(expected.every((p) => actual.has(JSON.stringify(p))), `${id} mirrored art`).toBe(true);
      expect(Math.max(...expected.map((p) => p.y + p.h))).toBe(GROUND_Y);
      expect(draw(game)).not.toContainEqual({ x: 96, y: 98, w: 2, h: 2, color: COLORS.cyan });
    }
  });
});
