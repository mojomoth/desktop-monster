import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, HERO_FORMS, mulberry32, SPECIES_IDS } from '../src/core/index.js';
import { createParticlePool, PARTICLE_POOL_SIZE, tickParticles } from '../src/renderer/anim.js';
import {
  companionImpactOf, createImpactQueue, heroImpactOf, IMPACT_QUEUE_SIZE, spawnImpact, tickImpacts,
} from '../src/renderer/effects.js';
import type { ImpactPreset } from '../src/renderer/effects.js';
import { createGame, REPLAY_MS } from '../src/renderer/game.js';
import type { GameCanvas } from '../src/renderer/game.js';
import { BANNER_Y, VICTORY_TEXT, createBanner, drawBanner, showBanner } from '../src/renderer/hud.js';

const signature = (preset: ImpactPreset): string => JSON.stringify({ ...preset, colors: undefined });
const paint = (preset: ImpactPreset): unknown => {
  const pool = createParticlePool();
  const queue = createImpactQueue();
  spawnImpact(pool, queue, preset, 160, 100);
  const frames = [];
  for (let t = 0; t <= 360; t += 30) {
    frames.push(pool.filter(p => p.active).map(p => ({ ...p, color: undefined })));
    tickParticles(pool, 30);
    tickImpacts(pool, queue, 30);
  }
  return frames;
};

describe('v0.9 attacker impact signatures', () => {
  it('all 70 hero forms and 135 monster species differ beyond palette', () => {
    expect(HERO_FORMS).toHaveLength(70);
    expect(SPECIES_IDS).toHaveLength(135);
    const heroes = HERO_FORMS.map(form => heroImpactOf(form.id));
    const monsters = SPECIES_IDS.map(companionImpactOf);
    expect(new Set(heroes.map(signature)).size).toBe(70);
    expect(new Set(monsters.map(signature)).size).toBe(135);
    expect(new Set(heroes.map(preset => JSON.stringify(paint(preset)))).size).toBe(70);
    expect(new Set(monsters.map(preset => JSON.stringify(paint(preset)))).size).toBe(135);
  });

  it('emits authored echoes on the injected frame clock and honors invalid dt', () => {
    const pool = createParticlePool();
    const queue = createImpactQueue();
    const preset = heroImpactOf('h11');
    expect(preset.pulses).toBeGreaterThan(1);
    spawnImpact(pool, queue, preset, 20, 30);
    const before = structuredClone(pool);
    tickImpacts(pool, queue, Number.NaN);
    tickImpacts(pool, queue, -1);
    expect(pool).toEqual(before);
    tickImpacts(pool, queue, preset.pulseMs - 1);
    expect(pool.filter(p => p.active)).toHaveLength(preset.points);
    tickImpacts(pool, queue, 1);
    expect(pool.filter(p => p.active)).toHaveLength(preset.points * 2);
    tickImpacts(pool, queue, 1000);
    expect(queue.some(entry => entry.active)).toBe(false);
  });

  it('keeps all visible particles and waiting echoes bounded under mixed spam', () => {
    const pool = createParticlePool();
    const queue = createImpactQueue();
    for (let i = 0; i < 1000; i++) {
      spawnImpact(pool, queue, companionImpactOf(SPECIES_IDS[i % SPECIES_IDS.length]!), 160, 100);
      tickImpacts(pool, queue, 2);
    }
    expect(pool).toHaveLength(PARTICLE_POOL_SIZE);
    expect(queue).toHaveLength(IMPACT_QUEUE_SIZE);
    expect(pool.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('presentation effects preserve the seeded engine outcome and save', () => {
    const save = { ...DEFAULT_SAVE, level: 10, companions: [{ id: 'c1', speciesId: 'dragon', bossIndex: 7, level: 2, stars: 0 }] };
    const direct = createEngine(save, mulberry32(23));
    const game = createGame(createEngine(save, mulberry32(23)));
    for (let i = 0; i < 90; i++) {
      expect(game.attack('keyboard')).toEqual(direct.attack('keyboard'));
      expect(game.update(100)).toEqual(direct.tick(100));
    }
    expect(game.toSave()).toEqual(direct.toSave());
  });

  it('a committed-result replay displays victory without applying rewards again', () => {
    const game = createGame(createEngine(DEFAULT_SAVE, mulberry32(1)));
    const before = game.toSave();
    game.playReplay({ opponentName: 'Rival', opponentParty: [], blows: [] }, true);
    expect(game.toSave()).toEqual(before);
    // Empty replay resolves after its visual hold; only the normal field
    // clock advances. No match win or inventory change is applied.
    game.update(REPLAY_MS);
    expect(game.toSave().companions).toEqual(before.companions);
    expect(game.toSave().progress?.pvpWins).toBe(before.progress?.pvpWins);
    const calls: string[] = [];
    const ctx: GameCanvas = { fillStyle: '', clearRect: () => {}, fillRect: (x, y, w, h) => {
      if (y >= BANNER_Y && y < BANNER_Y + 10 && w === 2 && h === 2) calls.push(`${x},${y},${String(ctx.fillStyle)}`);
    } };
    game.draw(ctx);
    const actual = [...calls];
    calls.length = 0;
    const banner = createBanner();
    showBanner(banner, VICTORY_TEXT);
    drawBanner(ctx, banner, 200);
    expect(actual).toEqual(calls);
  });

  it('does not carry the previous field target impact into a new replay', () => {
    const game = createGame(createEngine(DEFAULT_SAVE, mulberry32(42)));
    game.attack('keyboard');
    const fresh = createGame(createEngine(game.toSave(), mulberry32(42)));
    const replay = { opponentName: 'Rival', opponentParty: [], blows: [] };
    game.playReplay(replay); fresh.playReplay(replay);
    const paintGame = (value: ReturnType<typeof createGame>): string[] => {
      const rects: string[] = [];
      const ctx: GameCanvas = { fillStyle: '', clearRect: () => {}, fillRect: (x, y, w, h) => {
        rects.push(`${x},${y},${w},${h},${String(ctx.fillStyle)}`);
      } };
      value.draw(ctx); return rects;
    };
    expect(paintGame(game)).toEqual(paintGame(fresh));
  });
});
