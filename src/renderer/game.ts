// Scene orchestration (SPEC F21): full repaint every frame — field strip,
// hero left, tier-tinted monster right, HUD, floating damage numbers.
// DOM-free on purpose — draws through GameCanvas (SpriteCanvas + clearRect)
// so tests run under vitest's node environment. Animation here is only the
// minimal idle bob; the core FSMs (attack/hit/dying) wire in at T14.

import type {
  Engine,
  GameEvent,
  GameState,
  InputSource,
  MonsterDef,
} from '../core/index.js';
import {
  COLORS,
  drawSprite,
  heroIdle,
  monsterSprites,
  paletteForTier,
} from './sprites/index.js';
import type { SpeciesSprites, Sprite, SpriteCanvas } from './sprites/index.js';
import {
  createFloatPool,
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  spawnFloat,
  tickFloats,
} from './hud.js';

/** Internal canvas size in game pixels (CSS-scaled 2x, see static/). */
export const VIEW_W = 160;
export const VIEW_H = 110;
/** Top of the ground strip; entities stand on it. */
export const GROUND_Y = 92;
/** Hero sprite position (left side, feet on the ground). */
export const HERO_X = 26;
export const HERO_Y = GROUND_Y - heroIdle.h;
/** Monster sprite left edge (right side; species art faces left already). */
export const MONSTER_X = 118;
/** Boxed HP bar above the monster (centered over it at draw time). */
export const HP_BAR = { w: 34, h: 5, y: 68 } as const;
/** ms per idle bob frame (GAME_ARCHITECTURE §4: 2-frame bob, 500 ms/frame). */
export const IDLE_FRAME_MS = 500;

/**
 * The minimal canvas surface the scene needs — a real 2D context satisfies
 * it structurally, and tests use a recording fake.
 */
export type GameCanvas = SpriteCanvas & Pick<CanvasRenderingContext2D, 'clearRect'>;

// Species idle art tinted per tier (60° hue per tier), cached per pair so
// the render loop never re-tints palettes frame after frame.
const tintedIdleCache = new Map<string, Sprite>();

function tintedIdleSprite(monster: MonsterDef): Sprite {
  const key = `${monster.speciesId}:${String(monster.tier)}`;
  const cached = tintedIdleCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  // MonsterDef.speciesId is a plain string — widen the record to index it.
  const bySpecies: Partial<Record<string, SpeciesSprites>> = monsterSprites;
  const base = bySpecies[monster.speciesId] ?? monsterSprites.slime;
  const tinted: Sprite = {
    ...base.idle,
    palette: paletteForTier(base.idle.palette, monster.tier),
  };
  tintedIdleCache.set(key, tinted);
  return tinted;
}

/** The field strip: grass line over packed earth, full width. */
function drawField(ctx: SpriteCanvas): void {
  ctx.fillStyle = COLORS.forest;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 3);
  ctx.fillStyle = COLORS.maroon;
  ctx.fillRect(0, GROUND_Y + 3, VIEW_W, VIEW_H - GROUND_Y - 3);
}

export interface Game {
  /**
   * One input → one engine step, plus presentation (floating damage number).
   * Returns the engine events so callers can react (saving wires in at T16).
   */
  attack(source: InputSource): GameEvent[];
  /** Advance presentation time by dtMs (non-finite/negative counts as 0). */
  update(dtMs: number): void;
  /** Repaint the full VIEW_W×VIEW_H scene. */
  draw(ctx: GameCanvas): void;
  getState(): Readonly<GameState>;
}

/** Wrap an engine with the scene/HUD presentation state. */
export function createGame(engine: Engine): Game {
  let timeMs = 0;
  const floats = createFloatPool();

  return {
    attack(source: InputSource): GameEvent[] {
      const events = engine.attack(source);
      for (const event of events) {
        if (event.type === 'attack') {
          spawnFloat(
            floats,
            MONSTER_X + 6,
            HP_BAR.y - 6,
            String(event.damage),
            event.crit,
          );
        }
      }
      return events;
    },

    update(dtMs: number): void {
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      timeMs += dt;
      tickFloats(floats, dt);
    },

    draw(ctx: GameCanvas): void {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      drawField(ctx);

      const heroFrame = Math.floor(timeMs / IDLE_FRAME_MS) % heroIdle.frames.length;
      drawSprite(ctx, heroIdle, heroFrame, HERO_X, HERO_Y);

      const state = engine.getState();
      const sprite = tintedIdleSprite(state.monster);
      const monsterFrame = Math.floor(timeMs / IDLE_FRAME_MS) % sprite.frames.length;
      drawSprite(ctx, sprite, monsterFrame, MONSTER_X, GROUND_Y - sprite.h);

      drawHpBar(
        ctx,
        Math.round(MONSTER_X + sprite.w / 2 - HP_BAR.w / 2),
        HP_BAR.y,
        HP_BAR.w,
        HP_BAR.h,
        state.monsterHp,
        state.monster.maxHp,
      );
      drawLevelHud(ctx, state);
      drawCounters(ctx, state, VIEW_W);
      drawFloats(ctx, floats);
    },

    getState(): Readonly<GameState> {
      return engine.getState();
    },
  };
}
