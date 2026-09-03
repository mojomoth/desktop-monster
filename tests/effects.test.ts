import { describe, expect, it } from 'vitest';
import { SPECIES_IDS } from '../src/core/index.js';
import { createParticlePool, PARTICLE_POOL_SIZE } from '../src/renderer/anim.js';
import { EFFECTS, spawnEffect } from '../src/renderer/effects.js';
import type { EffectPreset } from '../src/renderer/effects.js';
import { COLORS } from '../src/renderer/sprites/index.js';

describe('effect presets (SPEC F39)', () => {
  it('matches the data table from GAME_DESIGN_V2 section 8', () => {
    expect(EFFECTS).toEqual({
      heroSlash: {
        count: 6,
        colors: [COLORS.cyan, COLORS.white],
        speed: 60,
        spread: 0.8,
        lifeMs: 250,
        gravity: 0,
        size: 1,
      },
      heroSlashSouls: {
        count: 6,
        colors: [COLORS.yellow, COLORS.orange],
        speed: 60,
        spread: 0.8,
        lifeMs: 250,
        gravity: 0,
        size: 1,
      },
      feverAura: {
        count: 4,
        colors: [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.white],
        speed: 20,
        spread: Math.PI * 2,
        lifeMs: 400,
        gravity: -40,
        size: 1,
      },
      bossShockwave: {
        count: 16,
        colors: [COLORS.white, COLORS.steel],
        speed: 90,
        spread: Math.PI * 2,
        lifeMs: 350,
        gravity: 0,
        size: 2,
      },
      captureSparkle: {
        count: 12,
        colors: [COLORS.yellow, COLORS.white],
        speed: 40,
        spread: Math.PI * 2,
        lifeMs: 600,
        gravity: 0,
        size: 1,
      },
      companionProjectile: {
        count: 1,
        colors: [],
        speed: 200,
        spread: 0,
        lifeMs: 250,
        gravity: 0,
        size: 2,
      },
      hit: {
        slime: {
          count: 6,
          colors: [COLORS.green, COLORS.forest],
          speed: 50,
          spread: 1.2,
          lifeMs: 400,
          gravity: 260,
          size: 1,
        },
        bat: {
          count: 4,
          colors: [COLORS.maroon, COLORS.navy],
          speed: 90,
          spread: 0.6,
          lifeMs: 200,
          gravity: 0,
          size: 1,
        },
        ghost: {
          count: 5,
          colors: [COLORS.white, COLORS.steel],
          speed: 15,
          spread: Math.PI * 2,
          lifeMs: 700,
          gravity: 0,
          size: 1,
        },
        golem: {
          count: 6,
          colors: [COLORS.gray, COLORS.slate],
          speed: 60,
          spread: 1,
          lifeMs: 350,
          gravity: 400,
          size: 1,
        },
        dragon: {
          count: 7,
          colors: [COLORS.red, COLORS.orange, COLORS.yellow],
          speed: 50,
          spread: 1,
          lifeMs: 450,
          gravity: -120,
          size: 1,
        },
      },
    });
  });

  it('every species has a distinct hit effect preset', () => {
    expect(Object.keys(EFFECTS.hit)).toEqual([...SPECIES_IDS]);
    const primaryColors = SPECIES_IDS.map((id) => EFFECTS.hit[id].colors[0]);
    expect(new Set(primaryColors).size).toBe(SPECIES_IDS.length);
  });
});

describe('spawnEffect', () => {
  const preset: EffectPreset = {
    count: 3,
    colors: [COLORS.red, COLORS.green],
    speed: 10,
    spread: Math.PI,
    lifeMs: 123,
    gravity: 45,
    size: 2,
  };

  it('spawnEffect is deterministic and never draws rng', () => {
    const first = createParticlePool(3);
    const second = createParticlePool(3);
    spawnEffect(first, preset, 8, 9, -1, 1);
    spawnEffect(second, preset, 8, 9, -1, 1);
    expect(first).toEqual(second);

    for (let k = 0; k < preset.count; k++) {
      const particle = first[k];
      const index = (k + 1) % preset.count;
      const angle = Math.PI + preset.spread * (index / (preset.count - 1) - 0.5);
      expect(particle).toMatchObject({
        active: true,
        x: 8,
        y: 9,
        gravity: preset.gravity,
        color: preset.colors[(k + 1) % preset.colors.length],
        size: preset.size,
        ageMs: 0,
        lifeMs: preset.lifeMs,
      });
      expect(particle?.vx).toBeCloseTo(Math.cos(angle) * preset.speed);
      expect(particle?.vy).toBeCloseTo(Math.sin(angle) * preset.speed);
    }
  });

  it('centres right-facing effects at zero and handles one-particle presets', () => {
    const pool = createParticlePool(1);
    const projectile = { ...EFFECTS.companionProjectile, colors: EFFECTS.hit.slime.colors };
    spawnEffect(pool, projectile, 1, 2, 1);
    expect(pool[0]).toMatchObject({ vx: 200, vy: 0, color: COLORS.green });
  });

  it('spawnEffect respects the 200-slot pool cap', () => {
    const pool = createParticlePool();
    spawnEffect(pool, { ...preset, count: 300 }, 0, 0, 1);
    expect(pool).toHaveLength(PARTICLE_POOL_SIZE);
    expect(pool.filter((particle) => particle.active)).toHaveLength(PARTICLE_POOL_SIZE);
  });
});
