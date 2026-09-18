import { describe, expect, it, vi } from 'vitest';
import { COMPANION_ATTACK_MS } from '../src/core/engine.js';
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
    vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS, fieldHeroCycleBonus: 0, fieldRebirthBonus: 30, fieldRebirthHalf: 2, fieldRebirthBonusScale: 1, fieldRebirthCountCap: null } }));
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


describe('v0.11 isolated hunting curve', () => {
  it.each([1, 2])('keeps raw/PvP values and legacy encounters with field exponent %i across resets and reload', async (exponent) => {
    vi.resetModules();
    vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS,
      fieldCompanionBaseFloor: 0, fieldCompanionIndexCap: null, fieldCompanionGrowthBonus: null, fieldHpIndexCap: null, fieldHpResumeIndex: null, fieldCompanionTailPolynomial: exponent, fieldCompanionTailScale: 8, fieldHeroCycleBonus: 53, fieldRebirthBonus: 11, fieldRebirthHalf: 3, fieldRebirthBonusScale: 4, fieldRebirthCountCap: null } }));
    try {
      const c = await import('../src/core/index.js');
      for (const index of [0, 31, 32, 63, 127, 255]) for (const accepted of [0, 1, 2, 9]) {
        const companion = { id: 'c1', speciesId: 'slime', bossIndex: index, level: 3, stars: 2 };
        const raw = monsterMaxHp(index) / 20n;
        const base = index <= 31 ? (raw < 1n ? 1n : raw) : 38n + 8n * (38n * BigInt(index + 1) ** BigInt(exponent) / 32n ** BigInt(exponent) - 38n);
        const factor = 4n + 53n * BigInt(accepted) * BigInt(accepted + 4);
        expect(c.companionPower(companion)).toBe((raw < 1n ? 1n : raw) * 12n);
        expect(c.fieldCompanionPower(companion, accepted)).toBe(base * 12n * factor / 4n);
        expect(c.fieldCompanionPower(companion, accepted, 10)).toBe(c.companionPower(companion));
        expect(c.fieldMonsterMaxHp(index, accepted, 11)).toBe(c.fieldMonsterMaxHp(index) * factor * BigInt(12 + 15 * accepted) / BigInt(16 * (3 + accepted)));
        expect(c.fieldMonsterMaxHp(index, accepted, 10)).toBe(fieldMonsterMaxHp(index, 0, 10));
      }
      const hero = { ...c.newHeroProgress(), reincarnations: 2 };
      const engine = c.createEngine({ ...c.DEFAULT_SAVE, level: c.heroRequiredLevel(2), hero,
        monsterIndex: 127, monsterHp: '123', monsterCurveVersion: 11, monsterCurveRebirths: 8, rebirths: 8 }, { next: () => .25 });
      expect(engine.getState().monster.maxHp).toBe(c.monsterForIndex(127, undefined, 11, 8).maxHp);
      engine.apply({ type: 'heroOffer' });
      const state = engine.getState(), offer = state.hero!;
      const action = { type: 'heroChoose' as const, formId: offer.choices[0]!.formId, offerSerial: offer.offerSerial };
      const pure = c.applyHeroAction(state, action, { next: () => .25 });
      expect('error' in pure).toBe(false);
      if ('error' in pure) throw Error(pure.error);
      expect(pure.state.monster.maxHp).toBe(c.monsterForIndex(0, undefined, 11, 9).maxHp);
      engine.apply(action);
      expect(engine.getState().monster.maxHp).toBe(pure.state.monster.maxHp);
      const saved = engine.toSave();
      expect(c.createEngine(c.parseSave(c.serializeSave(saved))).toSave()).toEqual(saved);
      const recovery = c.applyCollection({ ...engine.getState(), monster: c.monsterForIndex(40, undefined, 11, 9) }, { type: 'rebirth' });
      expect('error' in recovery).toBe(false);
      if ('error' in recovery) throw Error(recovery.error);
      expect(recovery.state.hero!.reincarnations).toBe(3);
      expect(recovery.state.monster.maxHp).toBe(c.monsterForIndex(0, undefined, 11, 10).maxHp);
      const missingHero = c.createEngine({ ...c.DEFAULT_SAVE, monsterCurveVersion: 11, monsterCurveRebirths: 99, rebirths: 99 });
      expect(missingHero.getState().monster.maxHp).toBe(c.monsterForIndex(0, undefined, 11, 99).maxHp);
    } finally { vi.doUnmock('../src/core/progression.js'); vi.resetModules(); }
  });
});


it.each([25, 50, 100])('bounds fixed hunting growth at bonus %i while legal collection actions retain exact owned/PvP values', async (bonus) => {
  vi.resetModules();
  vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS,
    fieldCompanionTailPolynomial: 1, fieldCompanionTailScale: 256, fieldCompanionIndexCap: 79, fieldCompanionBaseFloor: 10000,
    fieldHpIndexCap: 79, fieldHpResumeIndex: null, fieldCompanionGrowthBonus: bonus, fieldHeroCycleBonus: 128 } }));
  try {
    const c = await import('../src/core/index.js');
    const base = { id: 'c1', speciesId: 'slime', bossIndex: 127, level: 1, stars: 0 };
    const original = c.companionPower(base), fresh = c.fieldCompanionPower(base, 3);
    for (const level of [1, 2, 10, 10000]) for (const stars of [0, 1, 10, 100]) {
      const companion = { ...base, level, stars }, q = BigInt(level) * 2n ** BigInt(stars);
      expect(c.companionPower(companion)).toBe(original * q);
      expect(c.fieldCompanionPower(companion, 3, 10)).toBe(original * q);
      expect(c.fieldCompanionPower(companion, 3)).toBe(fresh * (100n * q + BigInt(bonus) * (q - 1n)) / (100n * q));
      expect(c.fieldCompanionPower(companion, 3)).toBeLessThanOrEqual(fresh * BigInt(100 + bonus) / 100n);
    }
    for (const index of [7, 15, 23, 31, 39, 63]) {
      expect(c.fieldCompanionPower({ ...base, bossIndex: index }, 0)).toBe(10000n);
      expect(c.fieldCompanionPower({ ...base, bossIndex: index }, 0, 10)).toBe(c.companionPower({ ...base, bossIndex: index }));
    }
    expect(c.fieldCompanionPower({ ...base, bossIndex: 79 }, 3)).toBe(fresh);
    expect(c.fieldCompanionPower({ ...base, bossIndex: 255 }, 3)).toBe(fresh);
    expect(c.companionPower({ ...base, bossIndex: 255 })).toBeGreaterThan(original);
    expect(c.fieldMonsterMaxHp(255, 3, 11)).toBe(c.fieldMonsterMaxHp(79, 3, 11));
    expect(c.fieldMonsterMaxHp(255, 3, 10)).toBe(fieldMonsterMaxHp(255, 0, 10));
    const state = c.createEngine({ ...c.DEFAULT_SAVE, monsterCurveVersion: 11, companions: [base, { ...base, id: 'c2' }], nextCompanionId: 3 }).getState();
    const consume = c.applyCollection(state, { type: 'consume', targetId: 'c1', foodId: 'c2' });
    if ('error' in consume) throw Error(consume.error);
    expect(c.companionPower(consume.state.companions[0]!)).toBe(original * 2n);
    const fuse = c.applyCollection(state, { type: 'fuse', aId: 'c1', bId: 'c2' });
    if ('error' in fuse) throw Error(fuse.error);
    expect(c.companionPower(fuse.state.companions[0]!)).toBe(original * 2n);
    expect(c.fieldCompanionPower(fuse.state.companions[0]!)).toBe(c.fieldCompanionPower(consume.state.companions[0]!));
    const trained = { ...base, level: 10 };
    const reincarnate = c.applyCollection({ ...state, companions: [trained] }, { type: 'reincarnate', id: 'c1', expected: trained });
    if ('error' in reincarnate) throw Error(reincarnate.error);
    expect(c.companionPower(reincarnate.state.companions[0]!)).toBe(original * 2n);
    expect(c.fieldCompanionPower(reincarnate.state.companions[0]!)).toBeLessThan(c.fieldCompanionPower(trained));
    expect(c.autoParty(state.companions)).toEqual(c.activeCompanions(state.companions));
  } finally { vi.doUnmock('../src/core/progression.js'); vi.resetModules(); }
});


it('resumes the fixed field HP tail after the plateau without changing readiness stages, boss cadence or legacy saves', async () => {
  vi.resetModules();
  vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS,
    fieldHpNumerator: 1080, fieldHpDenominator: 1000, fieldHpTailStartIndex: 79,
    fieldHpTailNumerator: 10955, fieldHpTailDenominator: 10000, fieldHpTailPolynomial: 0,
    fieldHpIndexCap: 159, fieldHpResumeIndex: 399, fieldHeroCycleBonus: 128,
    fieldRebirthBonus: 10, fieldRebirthHalf: 1, fieldRebirthBonusScale: 16 } }));
  try {
    const c = await import('../src/core/index.js');
    const stageHp = (index: number): bigint => {
      const i = BigInt(index), a = i < 79n ? i : 79n, b = i - a;
      return 10n * 1080n ** a * 10955n ** b / (1000n ** a * 10000n ** b);
    };
    for (let index = 0; index <= 399; index++) expect(c.fieldMonsterMaxHp(index)).toBe(stageHp(Math.min(index, 159)));
    for (const index of [400, 407, 799, 1999]) {
      expect(c.fieldMonsterMaxHp(index)).toBe(stageHp(159 + index - 399));
      expect(c.fieldMonsterMaxHp(index, 7, 10)).toBe(fieldMonsterMaxHp(index, 0, 10));
    }
    expect(c.monsterForIndex(399).maxHp).toBe(stageHp(159) * 5n);
    expect(c.monsterForIndex(400).maxHp).toBe(stageHp(160));
    expect(c.monsterForIndex(407).maxHp).toBe(stageHp(167) * 5n);
    expect(c.fieldMonsterMaxHp(799)).toBeGreaterThan(c.fieldMonsterMaxHp(400) * 1000000n);
    const hero = { ...c.newHeroProgress(), reincarnations: 3 };
    const saved = c.createEngine({ ...c.DEFAULT_SAVE, monsterIndex: 407, monsterHp: '123',
      monsterCurveVersion: 11, monsterCurveRebirths: 3, rebirths: 3, hero }).toSave();
    expect(c.createEngine(c.parseSave(c.serializeSave(saved))).toSave()).toEqual(saved);
  } finally { vi.doUnmock('../src/core/progression.js'); vi.resetModules(); }
});


it('uses the registered companion-only fever burst while hero and saved legacy encounters retain triple damage', async () => {
  vi.resetModules();
  vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS,
    fieldCompanionTailPolynomial: 1, fieldCompanionTailScale: 256, fieldCompanionBaseFloor: 14000,
    fieldCompanionIndexCap: 79, fieldCompanionGrowthBonus: 25, fieldCompanionFeverMultiplier: 2 } }));
  try {
    const c = await import('../src/core/index.js');
    expect(c.FEVER_MULT).toBe(3n);
    expect(c.companionFeverMultiplier(10)).toBe(3n);
    expect(c.companionFeverMultiplier(11)).toBe(2n);
    const companion = { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 2, stars: 0 };
    for (const version of [10, 11] as const) {
      const engine = c.createEngine({ ...c.DEFAULT_SAVE, monsterIndex: 200, monsterHp: '999999999999999999',
        monsterCurveVersion: version, monsterCurveRebirths: 0, companions: [companion], nextCompanionId: 2 }, { next: () => .99 });
      const first = engine.attack('keyboard').find(event => event.type === 'attack');
      for (let i = 1; i < c.FEVER_INPUTS - 1; i++) engine.attack('keyboard');
      const last = engine.attack('keyboard').find(event => event.type === 'attack');
      if (first?.type !== 'attack' || last?.type !== 'attack') throw Error('Missing hero attack');
      expect(last.damage).toBe(first.damage * 3n);
      expect(engine.getState().fever.active).toBe(true);
      const state = engine.getState();
      const expected = c.effectivePower(c.heroBuffedPower(c.fieldCompanionPower(companion, 0, version),
        c.typeOf(companion.speciesId), state.hero?.equipped), c.typeOf(companion.speciesId), state.monster.type) * c.companionFeverMultiplier(version);
      const events = engine.tick(COMPANION_ATTACK_MS + c.attackDelayOf(companion.speciesId));
      expect(events.find(event => event.type === 'companionAttack')).toMatchObject({ damage: expected });
      const cooled = engine.tick(c.FEVER_MS).filter(event => event.type === 'companionAttack');
      expect(cooled.at(-1)).toMatchObject({ damage: expected / c.companionFeverMultiplier(version) });
      expect(engine.getState().fever.active).toBe(false);
      expect(c.companionPower(companion)).toBe(2n);
      if (version === 10) {
        const crossing = c.createEngine({ ...c.DEFAULT_SAVE, monsterIndex: 200, monsterHp: String(first.damage * 22n),
          monsterCurveVersion: 10, companions: [companion], nextCompanionId: 2 }, { next: () => .99 });
        for (let input = 0; input < c.FEVER_INPUTS; input++) crossing.attack('keyboard');
        const next = crossing.getState();
        expect(next.monster.curveVersion).toBe(11);
        expect(next.fever.active).toBe(true);
        const nextDamage = c.effectivePower(c.heroBuffedPower(c.fieldCompanionPower(companion, 0, 11),
          c.typeOf(companion.speciesId), next.hero?.equipped), c.typeOf(companion.speciesId), next.monster.type) * 2n;
        expect(crossing.tick(COMPANION_ATTACK_MS + c.attackDelayOf(companion.speciesId))
          .find(event => event.type === 'companionAttack')).toMatchObject({ damage: nextDamage });
      }
    }
  } finally { vi.doUnmock('../src/core/progression.js'); vi.resetModules(); }
});


it.each([3, 4, 5])('caps only the fixed field reset factor at %i without capping shared total-reset scaling or changing saved history and legacy HP', async (cap) => {
  vi.resetModules();
  vi.doMock('../src/core/progression.js', () => ({ PROGRESSION_PARAMETERS: { ...PROGRESSION_PARAMETERS,
    fieldRebirthBonus: 9, fieldRebirthHalf: 1, fieldRebirthBonusScale: 16, fieldRebirthCountCap: cap, fieldHeroCycleBonus: 128 } }));
  try {
    const c = await import('../src/core/index.js');
    const base = c.fieldMonsterMaxHp(200);
    for (const resets of [0, 1, cap - 1, cap, cap + 1, 10, 1_000_001, Number.MAX_SAFE_INTEGER]) {
      const t = BigInt(resets), fixed = BigInt(Math.min(resets, cap));
      const expectedM = 4n + 128n * t * (t + 4n);
      expect(c.fieldResetCycleNumerator(resets)).toBe(expectedM);
      expect(c.fieldMonsterMaxHp(200, resets)).toBe(base * expectedM * (16n * (1n + fixed) + 9n * fixed) / (64n * (1n + fixed)));
      expect(c.fieldMonsterMaxHp(200, resets, 10)).toBe(fieldMonsterMaxHp(200, 0, 10));
    }
    expect(c.fieldMonsterMaxHp(200, cap + 1)).toBeGreaterThan(c.fieldMonsterMaxHp(200, cap));
    for (const invalid of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(c.fieldResetCycleNumerator(invalid)).toBe(4n);
      expect(c.fieldMonsterMaxHp(200, invalid)).toBe(base);
    }
    const count = 1000, hero = { ...c.newHeroProgress(), reincarnations: 10 };
    const engine = c.createEngine({ ...c.DEFAULT_SAVE, monsterIndex: 200, monsterHp: '123',
      monsterCurveVersion: 11, monsterCurveRebirths: count, rebirths: count, hero });
    expect(engine.getState().rebirths).toBe(count);
    expect(engine.getState().monster.curveRebirths).toBe(count);
    expect(engine.getState().hero!.reincarnations).toBe(10);
    const save = engine.toSave();
    expect(c.createEngine(c.parseSave(c.serializeSave(save))).toSave()).toEqual(save);
  } finally { vi.doUnmock('../src/core/progression.js'); vi.resetModules(); }
});

it('uses the encounter total snapshot for HP and actual volleys while preserving distinct saved history', async () => {
  const c = await import('../src/core/index.js');
  const companion = { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 };
  const hero = { ...c.newHeroProgress(), reincarnations: 2 };
  const engine = c.createEngine({ ...c.DEFAULT_SAVE, monsterIndex: 200, monsterHp: '99999999999999999999999',
    monsterCurveVersion: 11, monsterCurveRebirths: 8, rebirths: 12, hero, companions: [companion], nextCompanionId: 2 }, { next: () => .99 });
  const state = engine.getState();
  expect(state.monster.maxHp).toBe(c.fieldMonsterMaxHp(200, 8));
  const expected = c.effectivePower(c.heroBuffedPower(c.fieldCompanionPower(companion, 8), 'water', hero.equipped), 'water', state.monster.type);
  expect(engine.tick(COMPANION_ATTACK_MS + c.attackDelayOf(companion.speciesId)).find(event => event.type === 'companionAttack'))
    .toMatchObject({ damage: expected });
  const save = engine.toSave();
  expect(c.createEngine(c.parseSave(c.serializeSave(save))).toSave()).toEqual(save);
  expect(save).toMatchObject({ rebirths: 12, monsterCurveRebirths: 8, hero: { reincarnations: 2 }, companions: [companion] });
  engine.apply({ type: 'rebirth' });
  expect(engine.lastActionError()).toBeNull();
  expect(engine.getState()).toMatchObject({ rebirths: 13, hero: { reincarnations: 2 }, monster: { curveRebirths: 13 } });
  expect(engine.getState().monster.maxHp).toBe(c.fieldMonsterMaxHp(0, 13));
});

it.each(['rebirths', 'souls'] as const)('rejects %s overflow atomically in pure and engine soul/hero resets', async (field) => {
  const c = await import('../src/core/index.js');
  for (const kind of ['rebirth', 'heroChoose'] as const) {
    const engine = c.createEngine({ ...c.DEFAULT_SAVE, [field]: Number.MAX_SAFE_INTEGER,
      level: c.heroRequiredLevel(0), monsterIndex: 40, monsterCurveVersion: 11, monsterCurveRebirths: 0 }, { next: () => .25 });
    if (kind === 'heroChoose') engine.apply({ type: 'heroOffer' });
    const before = engine.toSave(), state = engine.getState();
    const action = kind === 'rebirth' ? { type: 'rebirth' as const } : {
      type: 'heroChoose' as const, formId: state.hero!.choices[0]!.formId, offerSerial: state.hero!.offerSerial,
    };
    const pure = action.type === 'rebirth' ? c.applyCollection(state, action) : c.applyHeroAction(state, action, { next: () => .25 });
    expect(pure).toHaveProperty('error');
    expect(engine.toSave()).toEqual(before);
    expect(engine.apply(action)).toEqual([]);
    expect(engine.lastActionError()).toMatch(/overflow/);
    expect(engine.toSave()).toEqual(before);
  }
});

it.each(['souls', 'releasedCount'] as const)('preserves both auto-release counters when %s cannot represent the next reward', async (field) => {
  const c = await import('../src/core/index.js');
  const companions = Array.from({ length: 30 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }));
  const engine = c.createEngine({ ...c.DEFAULT_SAVE, companions, nextCompanionId: 31,
    monsterIndex: 7, monsterHp: '1', souls: 3, releasedCount: 1, [field]: Number.MAX_SAFE_INTEGER }, { next: () => 0 });
  const before = engine.toSave();
  expect(engine.attack('keyboard').find(event => event.type === 'companionReleased')).toMatchObject({ souls: 0 });
  const after = engine.toSave();
  expect(after.souls).toBe(before.souls);
  expect(after.releasedCount).toBe(before.releasedCount);
  expect(after.companions).toEqual(before.companions);
  expect(after.monsterIndex).toBe(8);
  expect(c.parseSave(c.serializeSave(after))).toEqual(after);
});
