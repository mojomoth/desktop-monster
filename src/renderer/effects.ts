// SPEC F39 — deterministic, data-driven bursts over anim.ts's fixed pool.

import { SPECIES_IDS } from '../core/index.js';
import type { SpeciesId } from '../core/index.js';
import { spawnParticle } from './anim.js';
import type { Particle } from './anim.js';
import { COLORS } from './sprites/index.js';

export interface EffectPreset {
  count: number;
  colors: readonly string[];
  speed: number;
  spread: number;
  lifeMs: number;
  gravity: number;
  size: number;
}

export const EFFECTS: {
  heroSlash: EffectPreset;
  heroSlashSouls: EffectPreset;
  feverAura: EffectPreset;
  bossShockwave: EffectPreset;
  captureSparkle: EffectPreset;
  companionProjectile: EffectPreset;
  hit: Record<SpeciesId, EffectPreset>;
} = {
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
  // The caller supplies its species hit primary.
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
    [SPECIES_IDS[0]]: {
      count: 6,
      colors: [COLORS.green, COLORS.forest],
      speed: 50,
      spread: 1.2,
      lifeMs: 400,
      gravity: 260,
      size: 1,
    },
    [SPECIES_IDS[1]]: {
      count: 4,
      colors: [COLORS.maroon, COLORS.navy],
      speed: 90,
      spread: 0.6,
      lifeMs: 200,
      gravity: 0,
      size: 1,
    },
    [SPECIES_IDS[2]]: {
      count: 5,
      colors: [COLORS.white, COLORS.steel],
      speed: 15,
      spread: Math.PI * 2,
      lifeMs: 700,
      gravity: 0,
      size: 1,
    },
    [SPECIES_IDS[3]]: {
      count: 6,
      colors: [COLORS.gray, COLORS.slate],
      speed: 60,
      spread: 1,
      lifeMs: 350,
      gravity: 400,
      size: 1,
    },
    [SPECIES_IDS[4]]: {
      count: 7,
      colors: [COLORS.red, COLORS.orange, COLORS.yellow],
      speed: 50,
      spread: 1,
      lifeMs: 450,
      gravity: -120,
      size: 1,
    },
  },
};

export function hitColorOf(speciesId: string): string {
  return EFFECTS.hit[speciesId as SpeciesId]?.colors[0] ?? COLORS.white;
}

export function spawnEffect(
  pool: Particle[],
  preset: EffectPreset,
  x: number,
  y: number,
  dirX: 1 | -1,
  seed = 0,
): void {
  const centre = dirX === 1 ? 0 : Math.PI;
  for (let k = 0; k < preset.count; k++) {
    const angleIndex = ((k + seed) % preset.count + preset.count) % preset.count;
    const colorIndex = ((k + seed) % preset.colors.length + preset.colors.length) % preset.colors.length;
    const angle = centre + preset.spread * (angleIndex / Math.max(1, preset.count - 1) - 0.5);
    const color = preset.colors[colorIndex];
    if (color === undefined) {
      continue;
    }
    spawnParticle(pool, {
      x,
      y,
      vx: Math.cos(angle) * preset.speed,
      vy: Math.sin(angle) * preset.speed,
      gravity: preset.gravity,
      color,
      size: preset.size,
      lifeMs: preset.lifeMs,
    });
  }
}
