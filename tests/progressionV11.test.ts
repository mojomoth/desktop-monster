import { describe, expect, it, vi } from 'vitest';
import { createEngine, DEFAULT_SAVE, fieldMonsterMaxHp, heroRequiredLevel, monsterMaxHp, newHeroProgress,
  parseSave, PROGRESSION_PARAMETERS, serializeSave } from '../src/core/index.js';

describe('v0.11 curve compatibility and timer-free readiness', () => {
  it('keeps a legacy live encounter on its frozen v0.10 curve and adopts the new curve at the next spawn', () => {
    const old = parseSave({ ...DEFAULT_SAVE, level: 50, monsterIndex: 100, monsterHp: '17', rebirths: 4,
      coins: '123456', companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 79, level: 20, stars: 2 }], nextCompanionId: 2 });
    expect(old.monsterCurveVersion).toBeUndefined();
    const engine = createEngine(old, { next: () => .99 });
    expect(engine.getState().monster).toMatchObject({ curveVersion: 10, curveRebirths: 0, maxHp: fieldMonsterMaxHp(100, 0, 10) });
    expect(engine.getState().monsterHp).toBe(17n);
    const saved = engine.toSave();
    expect(createEngine(parseSave(serializeSave(saved))).toSave()).toEqual(saved);
    engine.attack('keyboard');
    expect(engine.getState().monster).toMatchObject({ index: 101, curveVersion: 11, curveRebirths: 4, maxHp: fieldMonsterMaxHp(101, 4, 11) });
    expect(engine.getState().companions).toEqual(old.companions);
    expect(engine.getState().coins).toBeGreaterThan(BigInt(old.coins));
  });

  it('validates additive curve metadata without deleting valid legacy fields', () => {
    const valid = parseSave({ ...DEFAULT_SAVE, monsterCurveVersion: 11, monsterCurveRebirths: 7, coins: '123' });
    expect(parseSave(serializeSave(valid))).toEqual(valid);
    for (const invalid of [-1, 1.5, '7', Number.MAX_SAFE_INTEGER + 1]) {
      expect(parseSave({ ...valid, monsterCurveRebirths: invalid })).toMatchObject({ monsterCurveVersion: 11, monsterCurveRebirths: 0, coins: '123' });
    }
    expect(parseSave({ ...valid, monsterCurveVersion: 999 }).monsterCurveVersion).toBeUndefined();
  });

  it('opens another level-qualified offer without advancing time after a completed hero reincarnation', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(0), hero: newHeroProgress() }, { next: () => .25 });
    engine.apply({ type: 'heroOffer' });
    const offer = engine.getState().hero!;
    engine.apply({ type: 'heroChoose', formId: offer.choices[0]!.formId, offerSerial: offer.offerSerial });
    const reset = engine.toSave();
    expect(reset.hero!.reincarnations).toBe(1);
    expect(reset.progress!.playTimeMs).toBe(0);
    const progressed = createEngine({ ...reset, level: heroRequiredLevel(1) }, { next: () => .25 });
    progressed.apply({ type: 'heroOffer' });
    expect(progressed.getState().hero!.choices).toHaveLength(3);
    expect(progressed.getState().progress!.playTimeMs).toBe(0);
    expect(PROGRESSION_PARAMETERS.heroRestMs).toBe(0);
  });

  it('preserves an already open old-level offer while future offers use the current curve', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, level: heroRequiredLevel(0) }, { next: () => .25 });
    engine.apply({ type: 'heroOffer' });
    const save = engine.toSave(); save.level = 12; save.hero!.offerLevel = 12;
    const restored = createEngine(parseSave(serializeSave(save)), { next: () => .25 });
    const offer = restored.getState().hero!;
    restored.apply({ type: 'heroChoose', formId: offer.choices[0]!.formId, offerSerial: offer.offerSerial });
    expect(restored.lastActionError()).toBeNull();
    expect(restored.getState().hero!.reincarnations).toBe(1);
  });

  it('applies a fixed reset-count curve only to field HP, independently of companion power and the frozen legacy curve', async () => {
    vi.resetModules();
    vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS, fieldRebirthBonus: 30, fieldRebirthHalf: 2 } }));
    try {
      const formulas = await import('../src/core/formulas.js');
      const collection = await import('../src/core/collection.js');
      for (const index of [0, 79, 107]) for (const resets of [0, 1, 2, 10, 100]) {
        const r = BigInt(resets), base = formulas.fieldMonsterMaxHp(index);
        expect(formulas.fieldMonsterMaxHp(index, resets)).toBe(base * (2n + 31n * r) / (2n + r));
        expect(formulas.fieldMonsterMaxHp(index, resets, 10)).toBe(fieldMonsterMaxHp(index, 0, 10));
        const companion = { id: 'c1', speciesId: 'slime', bossIndex: index, level: 3, stars: 2 };
        const raw = monsterMaxHp(index) / 20n;
        expect(collection.companionPower(companion)).toBe((raw < 1n ? 1n : raw) * 12n);
      }
    } finally { vi.doUnmock('../src/core/progression.js'); vi.resetModules(); }
  });
});
