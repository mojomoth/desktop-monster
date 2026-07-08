// Easing helpers + a fixed-cap particle pool (T14; Manual M2/M3 polish).
// Presentation-only and DOM-free: particles draw through SpriteCanvas so
// tests run under vitest's node environment (same policy as game.ts/hud.ts).
// T15 feeds this pool with the monster death scatter, item arcs and
// level-up sparkles.

import type { SpriteCanvas } from './sprites/index.js';

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
