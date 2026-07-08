// Scene orchestration (SPEC F21 + F20 presentation, T14): full repaint every
// frame — field strip, hero left, tier-tinted monster right, HUD, floating
// damage numbers. The core FSMs from src/core/fsm.ts drive the hero's
// 3-frame attack (restarting on spam) and the monster's white hit flash.
// DOM-free on purpose — draws through GameCanvas (SpriteCanvas + clearRect)
// so tests run under vitest's node environment.

import type {
  Engine,
  GameEvent,
  GameState,
  InputSource,
  MonsterDef,
} from '../core/index.js';
import {
  createHeroAnim,
  createMonsterAnim,
  HERO_ATTACK_MS,
  heroInput,
  monsterHit,
  monsterKilled,
  tickHero,
  tickMonster,
} from '../core/fsm.js';
import type { HeroAnim, MonsterAnim } from '../core/fsm.js';
import {
  COLORS,
  drawSprite,
  heroAttack,
  heroIdle,
  heroSlash,
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
/** ms per hero attack frame: 3 frames (wind-up/slash/recover) over 180 ms. */
export const ATTACK_FRAME_MS = HERO_ATTACK_MS / 3;
/** The attack frame during which the slash-arc overlay shows. */
export const SLASH_FRAME = 1;

/**
 * The minimal canvas surface the scene needs — a real 2D context satisfies
 * it structurally, and tests use a recording fake.
 */
export type GameCanvas = SpriteCanvas & Pick<CanvasRenderingContext2D, 'clearRect'>;

// Species idle art tinted per tier (60° hue per tier), cached per pair so
// the render loop never re-tints palettes frame after frame.
const tintedIdleCache = new Map<string, Sprite>();

/** Species art for a runtime species id (unknown ids fall back to slime). */
function speciesSpritesFor(speciesId: string): SpeciesSprites {
  // MonsterDef.speciesId is a plain string — widen the record to index it.
  const bySpecies: Partial<Record<string, SpeciesSprites>> = monsterSprites;
  return bySpecies[speciesId] ?? monsterSprites.slime;
}

function tintedIdleSprite(monster: MonsterDef): Sprite {
  const key = `${monster.speciesId}:${String(monster.tier)}`;
  const cached = tintedIdleCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const base = speciesSpritesFor(monster.speciesId);
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
  /** Presentation snapshot of the hero animation FSM (tests / T15). */
  getHeroAnim(): HeroAnim;
  /** Presentation snapshot of the monster animation FSM (tests / T15). */
  getMonsterAnim(): MonsterAnim;
}

/** Wrap an engine with the scene/HUD presentation state. */
export function createGame(engine: Engine): Game {
  let timeMs = 0;
  let heroAnim = createHeroAnim();
  let monsterAnim = createMonsterAnim();
  const floats = createFloatPool();

  return {
    attack(source: InputSource): GameEvent[] {
      // Any input (re)starts the 180ms attack — BongoCat spam feel (F20).
      heroAnim = heroInput();
      const events = engine.attack(source);
      for (const event of events) {
        switch (event.type) {
          case 'attack':
            spawnFloat(
              floats,
              MONSTER_X + 6,
              HP_BAR.y - 6,
              String(event.damage),
              event.crit,
            );
            break;
          case 'monsterHit':
            monsterAnim = monsterHit(monsterAnim);
            break;
          case 'monsterKilled':
            // The dying scatter presentation lands in T15; the FSM already
            // tracks the state so the transition wiring never changes.
            monsterAnim = monsterKilled(monsterAnim);
            break;
          case 'monsterSpawned':
            monsterAnim = createMonsterAnim();
            break;
          default:
            break; // itemDropped/levelUp presentation lands in T15
        }
      }
      return events;
    },

    update(dtMs: number): void {
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      timeMs += dt;
      heroAnim = tickHero(heroAnim, dt);
      monsterAnim = tickMonster(monsterAnim, dt);
      tickFloats(floats, dt);
    },

    draw(ctx: GameCanvas): void {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      drawField(ctx);

      if (heroAnim.state === 'attack') {
        const frame = Math.min(
          heroAttack.frames.length - 1,
          Math.floor(heroAnim.t / ATTACK_FRAME_MS),
        );
        drawSprite(ctx, heroAttack, frame, HERO_X, HERO_Y);
        if (frame === SLASH_FRAME) {
          // Slash arc in front of the blade, toward the monster.
          drawSprite(ctx, heroSlash, 0, HERO_X + heroAttack.w, HERO_Y + 1);
        }
      } else {
        const heroFrame = Math.floor(timeMs / IDLE_FRAME_MS) % heroIdle.frames.length;
        drawSprite(ctx, heroIdle, heroFrame, HERO_X, HERO_Y);
      }

      const state = engine.getState();
      const species = speciesSpritesFor(state.monster.speciesId);
      if (monsterAnim.state === 'hit') {
        // White-flash recoil pose for MONSTER_HIT_MS; the full tint makes
        // the tier tint irrelevant while it lasts.
        drawSprite(ctx, species.hit, 0, MONSTER_X, GROUND_Y - species.hit.h, {
          tint: COLORS.white,
        });
      } else {
        const sprite = tintedIdleSprite(state.monster);
        const monsterFrame = Math.floor(timeMs / IDLE_FRAME_MS) % sprite.frames.length;
        drawSprite(ctx, sprite, monsterFrame, MONSTER_X, GROUND_Y - sprite.h);
      }

      drawHpBar(
        ctx,
        Math.round(MONSTER_X + species.idle.w / 2 - HP_BAR.w / 2),
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

    getHeroAnim: (): HeroAnim => heroAnim,

    getMonsterAnim: (): MonsterAnim => monsterAnim,
  };
}
