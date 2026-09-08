// SPEC F39 — deterministic, data-driven bursts over anim.ts's fixed pool.

import { isSpeciesId, SPECIES_IDS, typeOf } from '../core/index.js';
import type { MonsterType, SpeciesId } from '../core/index.js';
import { spawnParticle } from './anim.js';
import type { Particle } from './anim.js';
import { COLORS, shiftHue } from './sprites/index.js';

export interface EffectPreset {
  count: number;
  colors: readonly string[];
  speed: number;
  spread: number;
  lifeMs: number;
  gravity: number;
  size: number;
}

/**
 * Per-species hit burst and companion attack (SPEC F35/F39/F63).
 *
 * The catalog is 105 species (user request 2026-09-08), so only the five
 * ORIGINAL species keep a hand-tuned preset — the other 100 derive theirs from
 * an elemental template whose colours are hue-rotated by the species' catalog
 * index. That keeps every species' hit primary distinct (the guarantee
 * tests/effects.test.ts pins) without 105 near-duplicate literals.
 */
const LEGACY_HIT: Partial<Record<SpeciesId, EffectPreset>> = {
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
};

/** Hit-burst template per element, used by every non-original species. */
const TYPE_HIT: Record<MonsterType, EffectPreset> = {
  water: { count: 6, colors: [COLORS.cyan, COLORS.blue], speed: 50, spread: 1.2, lifeMs: 400, gravity: 200, size: 1 },
  wind: { count: 4, colors: [COLORS.steel, COLORS.white], speed: 90, spread: 0.6, lifeMs: 220, gravity: -40, size: 1 },
  earth: { count: 6, colors: [COLORS.brown, COLORS.forest], speed: 55, spread: 1, lifeMs: 360, gravity: 380, size: 1 },
  dark: { count: 5, colors: [COLORS.navy, COLORS.maroon], speed: 25, spread: Math.PI * 2, lifeMs: 600, gravity: -20, size: 1 },
  fire: { count: 7, colors: [COLORS.orange, COLORS.yellow], speed: 60, spread: 1, lifeMs: 420, gravity: -100, size: 1 },
};

/**
 * Hue rotation applied to a derived species' colours: one full turn spread over
 * the whole catalog, so two species of the same element never share a colour.
 */
const SPECIES_HUE_STEP = 360 / SPECIES_IDS.length;

function derivedColors(colors: readonly string[], index: number): readonly string[] {
  return colors.map((c) => shiftHue(c, index * SPECIES_HUE_STEP));
}

function presetFor(base: EffectPreset, index: number): EffectPreset {
  return { ...base, colors: derivedColors(base.colors, index) };
}

function buildSpeciesTable<T>(make: (id: SpeciesId, index: number) => T): Record<SpeciesId, T> {
  const out: Partial<Record<SpeciesId, T>> = {};
  SPECIES_IDS.forEach((id, index) => {
    out[id] = make(id, index);
  });
  return out as Record<SpeciesId, T>;
}

const SPECIES_HIT: Record<SpeciesId, EffectPreset> = buildSpeciesTable(
  (id, index) => LEGACY_HIT[id] ?? presetFor(TYPE_HIT[typeOf(id)], index),
);

export const EFFECTS: {
  heroSlash: EffectPreset;
  heroSlashSouls: EffectPreset;
  feverAura: EffectPreset;
  bossShockwave: EffectPreset;
  captureSparkle: EffectPreset;
  critBurst: EffectPreset;
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
  // A critical hit: a wide ring of hot sparks on top of the species hit burst (user change 2026-09-06).
  critBurst: {
    count: 12,
    colors: [COLORS.yellow, COLORS.white, COLORS.orange],
    speed: 150,
    spread: Math.PI * 2,
    lifeMs: 320,
    gravity: 0,
    size: 2,
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
  hit: SPECIES_HIT,
};

/**
 * How a companion delivers its hit (SPEC F35/F63, GAME_DESIGN_V3 §4/§6).
 * 'slash' is melee — the burst lands ON the target; the ranged styles
 * ('lob','bolt','breath','spectral') fire FROM the actor toward the target.
 * The renderer picks the origin from the style; the preset shapes the burst.
 */
export type AttackStyle = 'lob' | 'bolt' | 'slash' | 'breath' | 'spectral';

/** Companion attack style per element; every species of an element shares it. */
const TYPE_ATTACK: Record<MonsterType, { style: AttackStyle; preset: EffectPreset }> = {
  // water: a heavy gel/tide lob that arcs under gravity.
  water: {
    style: 'lob',
    preset: { count: 3, colors: [COLORS.cyan, COLORS.blue], speed: 120, spread: 0.5, lifeMs: 400, gravity: 200, size: 2 },
  },
  // wind: a fast, tight bolt of compressed air.
  wind: {
    style: 'bolt',
    preset: { count: 2, colors: [COLORS.steel, COLORS.white], speed: 220, spread: 0.15, lifeMs: 250, gravity: 0, size: 2 },
  },
  // dark: slow spectral orbs that spread in every direction and rise.
  dark: {
    style: 'spectral',
    preset: { count: 5, colors: [COLORS.navy, COLORS.maroon], speed: 40, spread: Math.PI * 2, lifeMs: 500, gravity: -20, size: 2 },
  },
  // earth: a melee slash arc that lands on the target, like the hero.
  earth: {
    style: 'slash',
    preset: { count: 6, colors: [COLORS.brown, COLORS.forest], speed: 70, spread: 1.0, lifeMs: 260, gravity: 0, size: 2 },
  },
  // fire: a fanned breath cone that drifts upward as it fades.
  fire: {
    style: 'breath',
    preset: { count: 7, colors: [COLORS.orange, COLORS.yellow], speed: 100, spread: 0.7, lifeMs: 300, gravity: -40, size: 2 },
  },
};

/** The five original species keep their hand-tuned attack verbatim. */
const LEGACY_ATTACK: Partial<Record<SpeciesId, { style: AttackStyle; preset: EffectPreset }>> = {
  // slime (water): a heavy gel lob that arcs under gravity.
  slime: {
    style: 'lob',
    preset: { count: 3, colors: [COLORS.green, COLORS.forest], speed: 120, spread: 0.5, lifeMs: 400, gravity: 200, size: 2 },
  },
  // bat (wind): a fast, tight dark bolt.
  bat: {
    style: 'bolt',
    preset: { count: 2, colors: [COLORS.maroon, COLORS.navy], speed: 220, spread: 0.15, lifeMs: 250, gravity: 0, size: 2 },
  },
  // ghost (dark): slow spectral orbs that spread in every direction and rise.
  ghost: {
    style: 'spectral',
    preset: { count: 5, colors: [COLORS.white, COLORS.steel], speed: 40, spread: Math.PI * 2, lifeMs: 500, gravity: -20, size: 2 },
  },
  // golem (earth): a melee slash arc that lands on the target, like the hero.
  golem: {
    style: 'slash',
    preset: { count: 6, colors: [COLORS.gray, COLORS.slate], speed: 70, spread: 1.0, lifeMs: 260, gravity: 0, size: 2 },
  },
  // dragon (fire): a fanned breath cone that drifts upward as it fades.
  dragon: {
    style: 'breath',
    preset: { count: 7, colors: [COLORS.red, COLORS.orange, COLORS.yellow], speed: 100, spread: 0.7, lifeMs: 300, gravity: -40, size: 2 },
  },
};

export const COMPANION_ATTACK: Record<SpeciesId, { style: AttackStyle; preset: EffectPreset }> =
  buildSpeciesTable((id, index) => {
    const legacy = LEGACY_ATTACK[id];
    if (legacy !== undefined) {
      return legacy;
    }
    const base = TYPE_ATTACK[typeOf(id)];
    return { style: base.style, preset: presetFor(base.preset, index) };
  });

/**
 * Primary hit colour of a runtime species id; unknown → white. Goes through
 * isSpeciesId because SPECIES_HIT is an object literal: 'toString' would
 * otherwise resolve to an inherited property and blow up on `.colors[0]`.
 */
export function hitColorOf(speciesId: string): string {
  return isSpeciesId(speciesId) ? SPECIES_HIT[speciesId].colors[0] ?? COLORS.white : COLORS.white;
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
