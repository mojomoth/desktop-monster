// Easing helpers + a fixed-cap particle pool (T14; Manual M2/M3 polish),
// plus the T15 presentation math: monster death pixel-scatter, level-up
// sparkles and the pooled item-drop flight (parabolic arc + bounce, then
// fly to the HUD counter). Presentation-only and DOM-free: everything draws
// through SpriteCanvas so tests run under vitest's node environment (same
// policy as game.ts/hud.ts).

import { COLORS, TRANSPARENT } from './sprites/index.js';
import type { Sprite, SpriteCanvas } from './sprites/index.js';

/** Clamp a number into [0, 1]; non-finite input counts as 0. */
export function clamp01(t: number): number {
  if (!Number.isFinite(t) || t <= 0) {
    return 0;
  }
  return t >= 1 ? 1 : t;
}

/** Linear interpolation from a to b by clamped t. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

/** Quadratic ease-in: slow start, fast finish (item fly-to-HUD, T15). */
export function easeInQuad(t: number): number {
  const c = clamp01(t);
  return c * c;
}

/** Quadratic ease-out: fast start, slow finish (pop-ins, arcs). */
export function easeOutQuad(t: number): number {
  const c = clamp01(t);
  return 1 - (1 - c) * (1 - c);
}

/** One pooled particle. Slots are reused, never reallocated. */
export interface Particle {
  active: boolean;
  /** Position in game pixels. */
  x: number;
  y: number;
  /** Velocity in game pixels per second. */
  vx: number;
  vy: number;
  /** Downward acceleration in px/s² (0 = floaty sparkle). */
  gravity: number;
  color: string;
  /** Square side length in game pixels. */
  size: number;
  ageMs: number;
  lifeMs: number;
}

/** Fixed particle pool cap — key-mashing can never grow an unbounded array. */
export const PARTICLE_POOL_SIZE = 200;

/** Pre-allocate a pool of inactive particle slots. */
export function createParticlePool(size: number = PARTICLE_POOL_SIZE): Particle[] {
  return Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    gravity: 0,
    color: '',
    size: 1,
    ageMs: 0,
    lifeMs: 0,
  }));
}

export interface SpawnParticleOptions {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  gravity?: number;
  color: string;
  size?: number;
  lifeMs: number;
}

/** Activate a slot: the first inactive one, else recycle the oldest active. */
export function spawnParticle(pool: Particle[], opts: SpawnParticleOptions): void {
  let slot = pool.find((p) => !p.active);
  if (slot === undefined) {
    for (const p of pool) {
      if (slot === undefined || p.ageMs > slot.ageMs) {
        slot = p;
      }
    }
  }
  if (slot === undefined) {
    return; // zero-size pool
  }
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.vx = opts.vx ?? 0;
  slot.vy = opts.vy ?? 0;
  slot.gravity = opts.gravity ?? 0;
  slot.color = opts.color;
  slot.size = opts.size ?? 1;
  slot.ageMs = 0;
  slot.lifeMs = opts.lifeMs;
}

/**
 * Advance every active particle by dtMs: semi-implicit Euler (gravity into
 * velocity first, then velocity into position), then age; slots past their
 * lifetime deactivate. Non-finite or negative dt counts as 0 (same policy
 * as core/fsm.ts).
 */
export function tickParticles(pool: Particle[], dtMs: number): void {
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
  const dtS = dt / 1000;
  for (const p of pool) {
    if (!p.active) {
      continue;
    }
    p.vy += p.gravity * dtS;
    p.x += p.vx * dtS;
    p.y += p.vy * dtS;
    p.ageMs += dt;
    if (p.ageMs >= p.lifeMs) {
      p.active = false;
    }
  }
}

/** Draw active particles as size×size squares, snapped to the pixel grid. */
export function drawParticles(ctx: SpriteCanvas, pool: Particle[]): void {
  for (const p of pool) {
    if (!p.active) {
      continue;
    }
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
}

// ---------------------------------------------------------------------------
// Death pixel-scatter (Manual M3): a dying monster's sprite decomposes into
// its own pixels as gravity particles — procedural, no death frames needed.
// ---------------------------------------------------------------------------

/** Scatter particle lifetime — matches the FSM's dying duration (500ms). */
export const SCATTER_LIFE_MS = 500;
/** Downward acceleration on scatter pixels, px/s². */
export const SCATTER_GRAVITY = 260;

/**
 * Spawn one gravity particle per opaque pixel of a sprite frame, at the
 * pixel's own position and palette color. Velocities radiate outward from
 * the sprite's horizontal center with a jitter derived from the pixel's own
 * coordinates — deterministic on purpose: no RNG draw is ever consumed, so
 * the engine's seeded event log and the tests stay reproducible.
 */
export function spawnSpriteScatter(
  pool: Particle[],
  sprite: Sprite,
  frame: number,
  x: number,
  y: number,
): void {
  const rows = sprite.frames[frame];
  if (rows === undefined) {
    return;
  }
  const centerX = x + sprite.w / 2;
  for (let ry = 0; ry < sprite.h; ry++) {
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
      const px = x + rx;
      spawnParticle(pool, {
        x: px,
        y: y + ry,
        vx: (px - centerX) * 6 + ((rx * 31 + ry * 17) % 11) - 5,
        vy: -40 - ((rx * 13 + ry * 7) % 30),
        gravity: SCATTER_GRAVITY,
        color,
        lifeMs: SCATTER_LIFE_MS,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Sparkles (level-up hero burst, drop-collection counter pop).
// ---------------------------------------------------------------------------

/** Sparkle particle lifetime, ms. */
export const SPARKLE_LIFE_MS = 600;
/** Default sparkle burst size. */
export const SPARKLE_COUNT = 12;

/**
 * Spawn a ring of floaty (gravity-free) sparkles around (x, y), alternating
 * yellow/white. Deterministic — directions come from the sparkle's index.
 */
export function spawnSparkles(
  pool: Particle[],
  x: number,
  y: number,
  count: number = SPARKLE_COUNT,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    spawnParticle(pool, {
      x,
      y,
      vx: Math.cos(angle) * 28,
      vy: Math.sin(angle) * 28 - 22,
      gravity: 0,
      color: i % 2 === 0 ? COLORS.yellow : COLORS.white,
      lifeMs: SPARKLE_LIFE_MS,
    });
  }
}

// ---------------------------------------------------------------------------
// Item-drop flight (Manual M3): parabolic arc + one ground bounce (600ms),
// then fly to the HUD counter (300ms, ease-in). Pooled and capped like every
// other presentation system — key-mash kill streaks can never grow state.
// ---------------------------------------------------------------------------

/** Arc + bounce phase length, ms. */
export const DROP_ARC_MS = 600;
/** Fly-to-HUD phase length, ms. */
export const DROP_FLY_MS = 300;
/** Share of the arc phase spent on the first hop (the rest is the bounce). */
export const DROP_HOP_SPLIT = 0.6;
/** Peak height of the first hop above the start→land line, game pixels. */
export const DROP_ARC_H = 12;
/** Peak height of the ground bounce, game pixels. */
export const DROP_BOUNCE_H = 4;
/** Fixed drop pool cap. */
export const DROP_POOL_SIZE = 8;

/** One pooled item-drop flight. Slots are reused, never reallocated. */
export interface DropAnim {
  active: boolean;
  /** One-shot arrival flag: set when the flight completes; consumer clears. */
  arrived: boolean;
  /** ItemDef.id — the renderer looks the sprite up per drop. */
  itemId: string;
  /** Launch position (the dying monster). */
  startX: number;
  startY: number;
  /** Where the arc + bounce lands on the ground. */
  landX: number;
  landY: number;
  /** Flight destination (the HUD counter). */
  targetX: number;
  targetY: number;
  ageMs: number;
}

/** Pre-allocate a pool of inactive drop slots. */
export function createDropPool(size: number = DROP_POOL_SIZE): DropAnim[] {
  return Array.from({ length: size }, () => ({
    active: false,
    arrived: false,
    itemId: '',
    startX: 0,
    startY: 0,
    landX: 0,
    landY: 0,
    targetX: 0,
    targetY: 0,
    ageMs: 0,
  }));
}

export interface SpawnDropOptions {
  itemId: string;
  startX: number;
  startY: number;
  landX: number;
  landY: number;
  targetX: number;
  targetY: number;
}

/** Activate a slot: the first inactive one, else recycle the oldest active. */
export function spawnDrop(pool: DropAnim[], opts: SpawnDropOptions): void {
  let slot = pool.find((d) => !d.active);
  if (slot === undefined) {
    for (const d of pool) {
      if (slot === undefined || d.ageMs > slot.ageMs) {
        slot = d;
      }
    }
  }
  if (slot === undefined) {
    return; // zero-size pool
  }
  slot.active = true;
  slot.arrived = false;
  slot.itemId = opts.itemId;
  slot.startX = opts.startX;
  slot.startY = opts.startY;
  slot.landX = opts.landX;
  slot.landY = opts.landY;
  slot.targetX = opts.targetX;
  slot.targetY = opts.targetY;
  slot.ageMs = 0;
}

/**
 * Age every active drop by dtMs (non-finite/negative counts as 0). A drop
 * whose full flight elapsed deactivates and raises its one-shot `arrived`
 * flag for the consumer (counter pop + sparkle).
 */
export function tickDrops(pool: DropAnim[], dtMs: number): void {
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
  for (const d of pool) {
    if (!d.active) {
      continue;
    }
    d.ageMs += dt;
    if (d.ageMs >= DROP_ARC_MS + DROP_FLY_MS) {
      d.active = false;
      d.arrived = true;
    }
  }
}

/**
 * Pure position of a drop at its current age: first hop (start → 70% of the
 * way to the landing spot), ground bounce (→ landing spot), then ease-in
 * flight to the target. Endpoints are exact: age 0 = start, DROP_ARC_MS =
 * (landX, landY), DROP_ARC_MS + DROP_FLY_MS = target.
 */
export function dropPosition(d: DropAnim): { x: number; y: number } {
  const hopMs = DROP_ARC_MS * DROP_HOP_SPLIT;
  const hopX = lerp(d.startX, d.landX, 0.7);
  if (d.ageMs < hopMs) {
    const p = d.ageMs / hopMs;
    return {
      x: lerp(d.startX, hopX, p),
      y: lerp(d.startY, d.landY, p) - DROP_ARC_H * 4 * p * (1 - p),
    };
  }
  if (d.ageMs < DROP_ARC_MS) {
    const q = (d.ageMs - hopMs) / (DROP_ARC_MS - hopMs);
    return {
      x: lerp(hopX, d.landX, q),
      y: d.landY - DROP_BOUNCE_H * 4 * q * (1 - q),
    };
  }
  const f = easeInQuad((d.ageMs - DROP_ARC_MS) / DROP_FLY_MS);
  return {
    x: lerp(d.landX, d.targetX, f),
    y: lerp(d.landY, d.targetY, f),
  };
}
