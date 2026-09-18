import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, parseSave, serializeSave, mulberry32 } from '../src/core/index.js';
import type { SaveFile } from '../src/core/index.js';

const companion = (id: string) => ({ id, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 });
function bossAttempt(save: SaveFile) {
  let draws = 0;
  const engine = createEngine({ ...save, monsterIndex: 63, monsterSpeciesId: 'bat', monsterHp: '1' },
    { next: () => { draws++; return 0.5; } });
  const events = engine.attack('keyboard');
  expect(draws).toBe(4);
  return { save: engine.toSave(), captures: events.filter(e => e.type === 'bossCaptured') };
}

describe('v0.9 checkpointed initial quota with durable companion IDs', () => {
  it('synchronizes only a valid monotonic allocation high-water without spending capture quota', () => {
    const state = createEngine({ ...DEFAULT_SAVE, nextCompanionId: 2, earlyCaptureUsed: 1 }, mulberry32(9));
    state.apply({ type: 'syncAllocation', nextCompanionId: 8 });
    expect(state.toSave()).toMatchObject({ nextCompanionId: 8, earlyCaptureUsed: 1 });
    for (const nextCompanionId of [1, 0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      state.apply({ type: 'syncAllocation', nextCompanionId });
      expect(state.toSave()).toMatchObject({ nextCompanionId: 8, earlyCaptureUsed: 1 });
    }
    state.apply({ type: 'syncAllocation', nextCompanionId: Number.MAX_SAFE_INTEGER });
    expect(state.toSave()).toMatchObject({ nextCompanionId: Number.MAX_SAFE_INTEGER, earlyCaptureUsed: 1 });
  });
  it('migrates the legacy repaired allocation count before applying an outside high-water', () => {
    expect(parseSave({ ...DEFAULT_SAVE, companions: [companion('c5')] })).toMatchObject({ nextCompanionId: 6, earlyCaptureUsed: 5 });
    expect(parseSave({ ...DEFAULT_SAVE, nextCompanionId: 4 })).toMatchObject({ nextCompanionId: 4, earlyCaptureUsed: 3 });
    expect(parseSave({ ...DEFAULT_SAVE, companions: [companion('r9007199254740992')] })).toMatchObject({ nextCompanionId: Number.MAX_SAFE_INTEGER, earlyCaptureUsed: 5 });
    const old = parseSave({ ...DEFAULT_SAVE, nextCompanionId: 2 });
    const restored = parseSave({ ...old, nextCompanionId: 10000 });
    expect(restored).toMatchObject({ nextCompanionId: 10000, earlyCaptureUsed: 1 });
    expect(bossAttempt(restored).captures).toHaveLength(1);
  });

  it('grants exactly the original five slots after full reset even with high IDs, preserving boss RNG', () => {
    let save: SaveFile = { ...DEFAULT_SAVE, nextCompanionId: 10000, earlyCaptureUsed: 0 };
    for (let i = 0; i < 6; i++) {
      const result = bossAttempt(save);
      expect(result.captures).toHaveLength(i < 5 ? 1 : 0);
      expect(result.save.earlyCaptureUsed).toBe(Math.min(5, i + 1));
      expect(result.save.nextCompanionId).toBe(10000 + Math.min(5, i + 1));
      save = parseSave(serializeSave(result.save));
    }
    expect(save.companions.map(c => c.id)).toEqual(['c10000', 'c10001', 'c10002', 'c10003', 'c10004']);
  });

  it('restores earned remaining quota, not empty-roster quota, after progress rollback', () => {
    const checkpoint = parseSave({ ...DEFAULT_SAVE, nextCompanionId: 4 });
    const state = createEngine({ ...checkpoint, nextCompanionId: 500 }, mulberry32(9));
    state.apply({ type: 'addCompanion', companion: companion('ra') });
    state.apply({ type: 'pvpResult', won: true, stolen: companion('sb'), lostId: null });
    state.apply({ type: 'removeCompanions', ids: ['ra', 'sb'] });
    expect(state.toSave()).toMatchObject({ earlyCaptureUsed: 5, nextCompanionId: 502, companions: [] });
    expect(bossAttempt(parseSave(serializeSave(state.toSave()))).captures).toHaveLength(0);
    // Restoring this checkpoint intentionally restores its progression quota.
    const restored = { ...checkpoint, nextCompanionId: 502 };
    expect(bossAttempt(restored).save).toMatchObject({ earlyCaptureUsed: 4, nextCompanionId: 503 });
  });

  it('does not spend quota on rejected or full-roster deliveries, or synthesize release rewards from guarantees', () => {
    const roster = Array.from({ length: 30 }, (_, i) => companion(`c${i + 1}`));
    const state = createEngine({ ...DEFAULT_SAVE, nextCompanionId: 500, earlyCaptureUsed: 0, companions: roster }, mulberry32(9));
    state.apply({ type: 'addCompanion', companion: companion('ra') });
    state.apply({ type: 'pvpResult', won: true, stolen: companion('sb'), lostId: null });
    expect(state.toSave()).toMatchObject({ nextCompanionId: 500, earlyCaptureUsed: 0, companions: roster });
    expect(bossAttempt(state.toSave())).toMatchObject({ captures: [], save: { earlyCaptureUsed: 0, souls: 0, releasedCount: 0 } });
  });
});
