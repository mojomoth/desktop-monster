// T14 — easing helpers + fixed-cap particle pool (src/renderer/anim.ts).
// Pure presentation math, DOM-free: drawing is verified through a recording
// SpriteCanvas fake (same pattern as tests/renderer.test.ts).

import { describe, expect, it } from 'vitest';
import {
  clamp01,
  createParticlePool,
  drawParticles,
  easeInQuad,
  easeOutQuad,
  lerp,
  PARTICLE_POOL_SIZE,
  spawnParticle,
  tickParticles,
} from '../src/renderer/anim.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';

interface RectCall {
  x: number;
  y: number;
  w: number;
  h: number;
  fillStyle: string;
}

function makeCtx(): { ctx: SpriteCanvas; calls: RectCall[] } {
  const calls: RectCall[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      calls.push({ x, y, w, h, fillStyle: String(ctx.fillStyle) });
    },
  };
  return { ctx, calls };
}

describe('easing helpers', () => {
  it('hit their endpoints, stay within [0,1] and clamp out-of-range input', () => {
    for (const ease of [easeInQuad, easeOutQuad]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(-1)).toBe(0);
      expect(ease(2)).toBe(1);
      expect(ease(Number.NaN)).toBe(0);
      let prev = 0;
      for (let t = 0.1; t <= 1; t += 0.1) {
        const v = ease(t);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v).toBeLessThanOrEqual(1);
        prev = v;
      }
    }
    // ease-in starts slow, ease-out starts fast.
    expect(easeInQuad(0.5)).toBeLessThan(0.5);
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });

  it('lerp interpolates between its endpoints and clamp01 clamps', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(10, 20, 5)).toBe(20); // t is clamped
    expect(clamp01(-5)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(5)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('particle pool (fixed cap)', () => {
  it('pre-allocates an inactive pool capped at 200', () => {
    expect(PARTICLE_POOL_SIZE).toBe(200);
    const pool = createParticlePool();
    expect(pool).toHaveLength(PARTICLE_POOL_SIZE);
    expect(pool.every((p) => !p.active)).toBe(true);
  });

  it('overflow recycles the oldest particle instead of growing the pool', () => {
    const pool = createParticlePool(4);
    for (let i = 0; i < 6; i++) {
      spawnParticle(pool, { x: 0, y: 0, color: `c${String(i)}`, lifeMs: 10_000 });
      tickParticles(pool, 1); // age existing ones so "oldest" is well-defined
    }
    expect(pool).toHaveLength(4);
    expect(pool.filter((p) => p.active)).toHaveLength(4);
    expect(pool.some((p) => p.color === 'c5')).toBe(true); // newest survived
    expect(pool.some((p) => p.color === 'c0')).toBe(false); // oldest recycled
    expect(pool.some((p) => p.color === 'c1')).toBe(false);
  });

  it('integrates velocity and gravity per tick (semi-implicit Euler)', () => {
    const pool = createParticlePool(1);
    spawnParticle(pool, {
      x: 0,
      y: 0,
      vx: 10,
      vy: -20,
      gravity: 40,
      color: 'c',
      lifeMs: 10_000,
    });
    tickParticles(pool, 500);
    const p = pool[0];
    expect(p?.vy).toBeCloseTo(0); // -20 + 40 * 0.5
    expect(p?.x).toBeCloseTo(5);
    expect(p?.y).toBeCloseTo(0);
    tickParticles(pool, 500);
    expect(p?.vy).toBeCloseTo(20);
    expect(p?.x).toBeCloseTo(10);
    expect(p?.y).toBeCloseTo(10);
  });

  it('expires after lifeMs and treats non-finite dt as no time passing', () => {
    const pool = createParticlePool(1);
    spawnParticle(pool, { x: 0, y: 0, color: 'c', lifeMs: 300 });
    tickParticles(pool, Number.NaN);
    tickParticles(pool, -100);
    expect(pool[0]?.ageMs).toBe(0);
    tickParticles(pool, 299);
    expect(pool[0]?.active).toBe(true);
    tickParticles(pool, 1);
    expect(pool[0]?.active).toBe(false);
  });

  it('draws each active particle as a size×size square snapped to the grid', () => {
    const pool = createParticlePool(3);
    spawnParticle(pool, { x: 3.4, y: 7.6, color: '#d04648', lifeMs: 100 });
    spawnParticle(pool, { x: 10, y: 20, color: '#deeed6', size: 2, lifeMs: 100 });
    const { ctx, calls } = makeCtx();
    drawParticles(ctx, pool);
    expect(calls).toEqual([
      { x: 3, y: 8, w: 1, h: 1, fillStyle: '#d04648' },
      { x: 10, y: 20, w: 2, h: 2, fillStyle: '#deeed6' },
    ]);
  });
});
