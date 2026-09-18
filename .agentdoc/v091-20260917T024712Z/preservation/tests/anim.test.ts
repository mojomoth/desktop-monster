// T14/T15 — easing helpers, fixed-cap particle pool, death pixel-scatter,
// sparkles and the pooled item-drop flight (src/renderer/anim.ts).
// Pure presentation math, DOM-free: drawing is verified through a recording
// SpriteCanvas fake (same pattern as tests/renderer.test.ts).

import { describe, expect, it } from 'vitest';
import {
  clamp01,
  createDropPool,
  createParticlePool,
  drawParticles,
  DROP_ARC_MS,
  DROP_BOUNCE_H,
  DROP_FLY_MS,
  DROP_HOP_SPLIT,
  DROP_POOL_SIZE,
  dropPosition,
  easeInQuad,
  easeOutQuad,
  lerp,
  PARTICLE_POOL_SIZE,
  SCATTER_GRAVITY,
  SCATTER_LIFE_MS,
  SPARKLE_COUNT,
  spawnDrop,
  spawnParticle,
  spawnSparkles,
  spawnSpriteScatter,
  tickDrops,
  tickParticles,
} from '../src/renderer/anim.js';
import type { DropAnim } from '../src/renderer/anim.js';
import { COLORS } from '../src/renderer/sprites/index.js';
import type { Sprite, SpriteCanvas } from '../src/renderer/sprites/index.js';

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

describe('sprite death scatter (T15)', () => {
  const tiny: Sprite = {
    w: 2,
    h: 2,
    palette: { a: '#111111', b: '#222222' },
    frames: [['ab', '.a']],
  };

  it('spawns one upward gravity particle per opaque pixel, keeping its color', () => {
    const pool = createParticlePool(8);
    spawnSpriteScatter(pool, tiny, 0, 10, 20);
    const active = pool.filter((p) => p.active);
    expect(active).toHaveLength(3);
    expect(active.map((p) => `${String(p.x)},${String(p.y)},${p.color}`).sort()).toEqual([
      '10,20,#111111',
      '11,20,#222222',
      '11,21,#111111',
    ]);
    for (const p of active) {
      expect(p.gravity).toBe(SCATTER_GRAVITY);
      expect(p.lifeMs).toBe(SCATTER_LIFE_MS);
      expect(p.vy).toBeLessThan(0); // launched upward, gravity brings it down
    }
  });

  it('is deterministic: two identical scatters spawn identical pools', () => {
    const a = createParticlePool(8);
    const b = createParticlePool(8);
    spawnSpriteScatter(a, tiny, 0, 10, 20);
    spawnSpriteScatter(b, tiny, 0, 10, 20);
    expect(a).toEqual(b);
  });

  it('an unknown frame spawns nothing (never throws mid-render)', () => {
    const pool = createParticlePool(4);
    spawnSpriteScatter(pool, tiny, 9, 0, 0);
    expect(pool.every((p) => !p.active)).toBe(true);
  });
});

describe('level-up sparkles (T15)', () => {
  it('spawns a deterministic ring of floaty yellow/white sparkles', () => {
    const pool = createParticlePool(SPARKLE_COUNT);
    spawnSparkles(pool, 33, 84);
    const active = pool.filter((p) => p.active);
    expect(active).toHaveLength(SPARKLE_COUNT);
    for (const p of active) {
      expect(p.x).toBe(33);
      expect(p.y).toBe(84);
      expect(p.gravity).toBe(0); // floaty — no gravity pull
      expect([COLORS.yellow, COLORS.white]).toContain(p.color);
    }
    // A ring, not a clump: the directions differ.
    expect(new Set(active.map((p) => p.vx.toFixed(3))).size).toBeGreaterThan(2);
    // Deterministic: a second identical burst matches exactly.
    const again = createParticlePool(SPARKLE_COUNT);
    spawnSparkles(again, 33, 84);
    expect(again).toEqual(pool);
  });
});

describe('item drop flight (T15, pooled)', () => {
  const opts = {
    itemId: 'coin',
    startX: 121,
    startY: 80,
    landX: 100,
    landY: 86,
    targetX: 148,
    targetY: 8,
  };

  const dropAt = (ageMs: number): DropAnim => ({
    active: true,
    arrived: false,
    ...opts,
    ageMs,
  });

  it('pre-allocates an inactive pool and recycles the oldest on overflow', () => {
    const pool = createDropPool();
    expect(pool).toHaveLength(DROP_POOL_SIZE);
    expect(pool.every((d) => !d.active)).toBe(true);

    const small = createDropPool(2);
    spawnDrop(small, { ...opts, itemId: 'a' });
    tickDrops(small, 1);
    spawnDrop(small, { ...opts, itemId: 'b' });
    tickDrops(small, 1);
    spawnDrop(small, { ...opts, itemId: 'c' }); // recycles 'a' (the oldest)
    expect(small).toHaveLength(2);
    expect(small.filter((d) => d.active)).toHaveLength(2);
    expect(small.some((d) => d.itemId === 'a')).toBe(false);
    expect(small.some((d) => d.itemId === 'c')).toBe(true);
  });

  it('arcs with a bounce, then flies to the target: exact endpoints', () => {
    expect(dropPosition(dropAt(0))).toEqual({ x: opts.startX, y: opts.startY });

    // Mid-first-hop: the drop rises above both endpoints.
    const hopMs = DROP_ARC_MS * DROP_HOP_SPLIT;
    const midHop = dropPosition(dropAt(hopMs / 2));
    expect(midHop.y).toBeLessThan(Math.min(opts.startY, opts.landY));

    // The hop lands on the ground line, then the bounce peaks lower.
    expect(dropPosition(dropAt(hopMs)).y).toBeCloseTo(opts.landY);
    const bouncePeak = dropPosition(dropAt((hopMs + DROP_ARC_MS) / 2));
    expect(bouncePeak.y).toBeCloseTo(opts.landY - DROP_BOUNCE_H);
    expect(bouncePeak.y).toBeGreaterThan(midHop.y); // lower than the first hop

    // Arc ends exactly at the landing spot, flight ends exactly at the target.
    expect(dropPosition(dropAt(DROP_ARC_MS))).toEqual({ x: opts.landX, y: opts.landY });
    const midFly = dropPosition(dropAt(DROP_ARC_MS + DROP_FLY_MS / 2));
    // Ease-in: less than halfway across at half the flight time.
    expect(midFly.x - opts.landX).toBeLessThan((opts.targetX - opts.landX) / 2);
    expect(dropPosition(dropAt(DROP_ARC_MS + DROP_FLY_MS))).toEqual({
      x: opts.targetX,
      y: opts.targetY,
    });
  });

  it('raises the one-shot arrived flag exactly when the flight completes', () => {
    const pool = createDropPool(1);
    spawnDrop(pool, opts);
    tickDrops(pool, Number.NaN); // non-finite dt is no time passing
    tickDrops(pool, -50);
    expect(pool[0]?.ageMs).toBe(0);
    tickDrops(pool, DROP_ARC_MS + DROP_FLY_MS - 1);
    expect(pool[0]?.active).toBe(true);
    expect(pool[0]?.arrived).toBe(false);
    tickDrops(pool, 1);
    expect(pool[0]?.active).toBe(false);
    expect(pool[0]?.arrived).toBe(true);
  });
});
