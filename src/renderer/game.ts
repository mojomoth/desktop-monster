// Scene orchestration (SPEC F21 + F20 presentation, T14/T15): full repaint
// every frame — field strip, hero left, tier-tinted monster right, HUD,
// floating damage numbers. The core FSMs from src/core/fsm.ts drive the
// hero's 3-frame attack (restarting on spam), the monster's white hit flash,
// the death pixel-scatter (dying) and the bottom-up spawn pop-in. Item drops
// arc + bounce then fly to the coin counter; level-ups flash the "LEVEL UP!"
// banner with hero sparkles (Manual M3).
// DOM-free on purpose — draws through GameCanvas (SpriteCanvas + clearRect)
// so tests run under vitest's node environment.

import { createEngine } from '../core/index.js';
import type {
  Engine,
  GameEvent,
  GameState,
  InputSource,
  MonsterDef,
  SaveFile,
} from '../core/index.js';
import {
  createHeroAnim,
  createMonsterAnim,
  HERO_ATTACK_MS,
  heroInput,
  MONSTER_SPAWNING_MS,
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
  itemSprites,
  monsterSprites,
  paletteForTier,
  TRANSPARENT,
} from './sprites/index.js';
import type { SpeciesSprites, Sprite, SpriteCanvas } from './sprites/index.js';
import { createGameAudio } from './audio.js';
import type { GameAudio } from './audio.js';
import {
  createDropPool,
  createParticlePool,
  drawParticles,
  dropPosition,
  easeOutQuad,
  spawnDrop,
  spawnSparkles,
  spawnSpriteScatter,
  tickDrops,
  tickParticles,
} from './anim.js';
import {
  COUNTER_POP_MS,
  createBanner,
  createFloatPool,
  drawBanner,
  drawCounters,
  drawFloats,
  drawHpBar,
  drawLevelHud,
  showBanner,
  spawnFloat,
  tickBanner,
  tickFloats,
} from './hud.js';

/** Internal canvas size in game pixels (CSS-scaled 2x, see static/). */
export const VIEW_W = 160;
export const VIEW_H = 110;
/** Top of the ground strip; entities stand on it. */
export const GROUND_Y = 92;
/** Hero/monster art pixel scale (Assumption 17): every art pixel is 2×2. */
export const SPRITE_SCALE = 2;
/** Hero sprite position (left side, feet on the ground). */
export const HERO_X = 26;
export const HERO_Y = GROUND_Y - heroIdle.h * SPRITE_SCALE;
/** Monster sprite left edge (right side; species art faces left already). */
export const MONSTER_X = 118;
/** Boxed HP bar above the monster (centered over it at draw time). */
export const HP_BAR = { w: 34, h: 5, y: 64 } as const;
/** ms per idle bob frame (GAME_ARCHITECTURE §4: 2-frame bob, 500 ms/frame). */
export const IDLE_FRAME_MS = 500;
/** ms per hero attack frame: 3 frames (wind-up/slash/recover) over 180 ms. */
export const ATTACK_FRAME_MS = HERO_ATTACK_MS / 3;
/** The attack frame during which the slash-arc overlay shows. */
export const SLASH_FRAME = 1;
/** Where item drops land after their arc + bounce (gap left of the monster). */
export const DROP_LAND_X = 100;
/** Horizontal stagger between simultaneous drops so they never stack. */
export const DROP_STAGGER_PX = 8;
/** Drop flight destination: the top-right coin counter (icon position). */
export const DROP_TARGET_X = VIEW_W - 12;
export const DROP_TARGET_Y = 8;
/** Sparkle burst size when a collected drop pops the counter. */
const COLLECT_SPARKLE_COUNT = 6;

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

/** Item art for a runtime item id (unknown ids fall back to the coin). */
function itemSpriteFor(itemId: string): Sprite {
  // ItemDef.id is a plain string — widen the record to index it.
  const byId: Partial<Record<string, Sprite>> = itemSprites;
  return byId[itemId] ?? itemSprites.coin;
}

/**
 * Draw only the bottom `visibleRows` rows of a sprite frame — the spawn
 * pop-in reveals the new monster bottom-up out of the ground (Manual M3).
 * Same skip rules as drawSprite: unknown chars/rows never throw.
 */
function drawSpriteBottomRows(
  ctx: SpriteCanvas,
  sprite: Sprite,
  frame: number,
  x: number,
  y: number,
  visibleRows: number,
  scale = 1,
): void {
  const rows = sprite.frames[frame];
  if (rows === undefined) {
    return;
  }
  const firstRow = Math.max(0, sprite.h - visibleRows);
  for (let ry = firstRow; ry < sprite.h; ry++) {
    const row = rows[ry];
    if (row === undefined) {
      continue;
    }
    for (let rx = 0; rx < sprite.w; rx++) {
      const ch = row.charAt(rx);
      if (ch === TRANSPARENT || ch === '') {
        continue;
      }
      const color = sprite.palette[ch];
      if (color === undefined) {
        continue;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }
  }
}

export interface Game {
  /**
   * One input → one engine step, plus presentation (floating damage number).
   * Returns the engine events so callers can react (the T16 save scheduler
   * feeds on them).
   */
  attack(source: InputSource): GameEvent[];
  /** Advance presentation time by dtMs (non-finite/negative counts as 0). */
  update(dtMs: number): void;
  /** Repaint the full VIEW_W×VIEW_H scene. */
  draw(ctx: GameCanvas): void;
  getState(): Readonly<GameState>;
  /** Snapshot of the current progress for persistence (SPEC F22). */
  toSave(): SaveFile;
  /**
   * Reset Progress (SPEC F22): swap in a fresh default engine and clear all
   * in-flight presentation (floats, particles, drops, banner, anims). The
   * caller persists the fresh state immediately (renderer boot does).
   */
  reset(): void;
  /** Presentation snapshot of the hero animation FSM (tests / T15). */
  getHeroAnim(): HeroAnim;
  /** Presentation snapshot of the monster animation FSM (tests / T15). */
  getMonsterAnim(): MonsterAnim;
}

/**
 * Wrap an engine with the scene/HUD presentation state.
 * `audio` defaults to the real WebAudio blips (SPEC F24) — lazy and fully
 * guarded, so the default is a silent no-op under node/tests and can never
 * break the loop; tests inject a recording fake to pin the triggers.
 */
export function createGame(initialEngine: Engine, audio: GameAudio = createGameAudio()): Game {
  let engine = initialEngine;
  let timeMs = 0;
  let heroAnim = createHeroAnim();
  // Boot straight into idle: the monster on screen at load (fresh or resumed)
  // is already alive — the spawn pop-in is for monsters born from a kill.
  let monsterAnim = tickMonster(createMonsterAnim(), MONSTER_SPAWNING_MS);
  const floats = createFloatPool();
  const particles = createParticlePool();
  const drops = createDropPool();
  const banner = createBanner();
  // ms since the last drop arrived at the counter; Infinity = never popped.
  let coinPopAgeMs = Number.POSITIVE_INFINITY;

  return {
    attack(source: InputSource): GameEvent[] {
      // Any input (re)starts the 180ms attack — BongoCat spam feel (F20).
      heroAnim = heroInput();
      const events = engine.attack(source);
      for (const event of events) {
        switch (event.type) {
          case 'attack':
            audio.attackTick();
            spawnFloat(
              floats,
              MONSTER_X + (12 * SPRITE_SCALE) / 2, // centered over the 12px-wide species art
              HP_BAR.y - 6,
              String(event.damage),
              event.crit,
            );
            break;
          case 'monsterHit':
            monsterAnim = monsterHit(monsterAnim);
            break;
          case 'monsterKilled': {
            // Decompose the (tier-tinted) sprite into gravity particles; the
            // FSM rides DYING for the same 500ms the scatter lives.
            audio.killArpeggio();
            const sprite = tintedIdleSprite(event.monster);
            spawnSpriteScatter(
              particles,
              sprite,
              0,
              MONSTER_X,
              GROUND_Y - sprite.h * SPRITE_SCALE,
              SPRITE_SCALE,
            );
            monsterAnim = monsterKilled(monsterAnim);
            break;
          }
          case 'itemDropped': {
            let slot = 0;
            for (const drop of event.drops) {
              spawnDrop(drops, {
                itemId: drop.item.id,
                // Launch at the monster's left edge — the drop bursts out of
                // the dying monster toward the gap without ever overlapping
                // the scatter pixels.
                startX: MONSTER_X - 6,
                startY: GROUND_Y - 12,
                landX: DROP_LAND_X - slot * DROP_STAGGER_PX,
                landY: GROUND_Y - itemSpriteFor(drop.item.id).h,
                targetX: DROP_TARGET_X,
                targetY: DROP_TARGET_Y,
              });
              slot++;
            }
            break;
          }
          case 'levelUp':
            audio.levelUpFanfare();
            showBanner(banner);
            spawnSparkles(
              particles,
              HERO_X + Math.floor((heroIdle.w * SPRITE_SCALE) / 2),
              HERO_Y + 4 * SPRITE_SCALE,
            );
            break;
          case 'monsterSpawned':
            // Deferred on purpose: the FSM's DYING → SPAWNING transition
            // brings the new monster in after the scatter finishes.
            break;
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
      tickParticles(particles, dt);
      tickDrops(drops, dt);
      tickBanner(banner, dt);
      coinPopAgeMs += dt;
      for (const drop of drops) {
        if (drop.arrived) {
          drop.arrived = false;
          coinPopAgeMs = 0;
          spawnSparkles(particles, drop.targetX, drop.targetY, COLLECT_SPARKLE_COUNT);
        }
      }
    },

    draw(ctx: GameCanvas): void {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      drawField(ctx);

      if (heroAnim.state === 'attack') {
        const frame = Math.min(
          heroAttack.frames.length - 1,
          Math.floor(heroAnim.t / ATTACK_FRAME_MS),
        );
        drawSprite(ctx, heroAttack, frame, HERO_X, HERO_Y, { scale: SPRITE_SCALE });
        if (frame === SLASH_FRAME) {
          // Slash arc in front of the blade, toward the monster.
          drawSprite(ctx, heroSlash, 0, HERO_X + heroAttack.w * SPRITE_SCALE, HERO_Y + 2, {
            scale: SPRITE_SCALE,
          });
        }
      } else {
        const heroFrame = Math.floor(timeMs / IDLE_FRAME_MS) % heroIdle.frames.length;
        drawSprite(ctx, heroIdle, heroFrame, HERO_X, HERO_Y, { scale: SPRITE_SCALE });
      }

      const state = engine.getState();
      const species = speciesSpritesFor(state.monster.speciesId);
      if (monsterAnim.state === 'dying') {
        // The sprite is mid-scatter — its pixels live in the particle pool.
      } else if (monsterAnim.state === 'spawning') {
        // Bottom-up pop-in: the next monster grows out of the ground.
        const sprite = tintedIdleSprite(state.monster);
        const progress = easeOutQuad(monsterAnim.t / MONSTER_SPAWNING_MS);
        const visibleRows = Math.ceil(sprite.h * progress);
        drawSpriteBottomRows(
          ctx,
          sprite,
          0,
          MONSTER_X,
          GROUND_Y - sprite.h * SPRITE_SCALE,
          visibleRows,
          SPRITE_SCALE,
        );
      } else if (monsterAnim.state === 'hit') {
        // White-flash recoil pose for MONSTER_HIT_MS; the full tint makes
        // the tier tint irrelevant while it lasts.
        drawSprite(ctx, species.hit, 0, MONSTER_X, GROUND_Y - species.hit.h * SPRITE_SCALE, {
          tint: COLORS.white,
          scale: SPRITE_SCALE,
        });
      } else {
        const sprite = tintedIdleSprite(state.monster);
        const monsterFrame = Math.floor(timeMs / IDLE_FRAME_MS) % sprite.frames.length;
        drawSprite(ctx, sprite, monsterFrame, MONSTER_X, GROUND_Y - sprite.h * SPRITE_SCALE, {
          scale: SPRITE_SCALE,
        });
      }

      for (const drop of drops) {
        if (!drop.active) {
          continue;
        }
        const pos = dropPosition(drop);
        drawSprite(ctx, itemSpriteFor(drop.itemId), 0, Math.round(pos.x), Math.round(pos.y));
      }
      drawParticles(ctx, particles);

      if (monsterAnim.state !== 'dying') {
        // No HP bar over the scatter — it pops back with the next monster.
        drawHpBar(
          ctx,
          Math.round(MONSTER_X + (species.idle.w * SPRITE_SCALE) / 2 - HP_BAR.w / 2),
          HP_BAR.y,
          HP_BAR.w,
          HP_BAR.h,
          state.monsterHp,
          state.monster.maxHp,
        );
      }
      // LV + XP gauge floats above the hero's head (Assumption 17).
      drawLevelHud(
        ctx,
        state,
        HERO_X + Math.floor((heroIdle.w * SPRITE_SCALE) / 2),
        HERO_Y - 2,
      );
      drawCounters(ctx, state, VIEW_W, coinPopAgeMs < COUNTER_POP_MS);
      drawFloats(ctx, floats);
      drawBanner(ctx, banner, VIEW_W);
    },

    getState(): Readonly<GameState> {
      return engine.getState();
    },

    toSave(): SaveFile {
      return engine.toSave();
    },

    reset(): void {
      engine = createEngine();
      timeMs = 0;
      heroAnim = createHeroAnim();
      // Same idle boot as a fresh createGame — the pop-in stays reserved for
      // kill-born spawns (T15 decision).
      monsterAnim = tickMonster(createMonsterAnim(), MONSTER_SPAWNING_MS);
      for (const f of floats) {
        f.active = false;
      }
      for (const p of particles) {
        p.active = false;
      }
      for (const d of drops) {
        d.active = false;
        d.arrived = false;
      }
      banner.active = false;
      coinPopAgeMs = Number.POSITIVE_INFINITY;
    },

    getHeroAnim: (): HeroAnim => heroAnim,

    getMonsterAnim: (): MonsterAnim => monsterAnim,
  };
}

// ---------------------------------------------------------------------------
// Save scheduling (SPEC F22, T16): WHEN progress persists. Kills and level-ups
// save immediately; damage-only attacks save at most once per debounce window;
// window blur / reset flush unconditionally. DOM-free with injectable timers
// so the policy is unit-testable (production uses the real setTimeout).
// ---------------------------------------------------------------------------

/** Debounce window for damage-only saves, ms (SPEC F22). */
export const SAVE_DEBOUNCE_MS = 500;

export interface SaveScheduler {
  /** Feed one attack's engine events; decides whether/when to save. */
  onEvents(events: readonly GameEvent[]): void;
  /** Save immediately, canceling any pending debounce (blur, reset). */
  flush(): void;
}

export interface SaveSchedulerOptions {
  /** Performs the actual save (renderer boot passes saveState(toSave())). */
  save(): void;
  /** Timer injection for tests; defaults to the global setTimeout. */
  setTimer?(cb: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
}

export function createSaveScheduler(options: SaveSchedulerOptions): SaveScheduler {
  const setTimer =
    options.setTimer ?? ((cb: () => void, ms: number): unknown => setTimeout(cb, ms));
  const clearTimer =
    options.clearTimer ??
    ((handle: unknown): void => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    });
  let pending: unknown = undefined;

  const cancelPending = (): void => {
    if (pending !== undefined) {
      clearTimer(pending);
      pending = undefined;
    }
  };

  const saveNow = (): void => {
    cancelPending();
    options.save();
  };

  return {
    onEvents(events: readonly GameEvent[]): void {
      if (events.some((e) => e.type === 'monsterKilled' || e.type === 'levelUp')) {
        saveNow();
        return;
      }
      if (events.some((e) => e.type === 'attack')) {
        // Damage without a kill: coalesce key-mash into one trailing save.
        cancelPending();
        pending = setTimer(() => {
          pending = undefined;
          options.save();
        }, SAVE_DEBOUNCE_MS);
      }
    },

    flush: saveNow,
  };
}
