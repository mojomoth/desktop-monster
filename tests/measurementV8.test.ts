import { saveProgress } from '../src/core/progress.js';
import { describe, expect, it } from 'vitest';
import * as core from '../src/core/index.js';
import type { GameState, HeroRoll, SaveFile } from '../src/core/index.js';

type Policy = { id: string; heroChoice: 'first' | 'unowned-rare-first'; management: 'none' | 'consume-weakest' };
type Raw = { policy: unknown; records: unknown[]; actions: unknown[]; checkpoints: unknown[] };
type Run = {
  version: number; policy: Policy; raw: Raw;
  adapter: { choices: Array<{ selectedId: string; originalSlot: number; originalChoices: HeroRoll[]; beforeOwned: string[] }>;
    management: Array<{ sec: number; food: { id: string }; target: { id: string }; lastOfSpecies: boolean; foodWasActive: boolean }>;
    companions: Array<{ type: string; novel: boolean; speciesId: string }> };
  checkpoints: Array<{ captures: number; releases: number; everCapturedSpecies: string[]; fullRosterSeconds: number; rosterSpecies: string[] }>;
};
const modulePath = '../.harness/v8/measure.mjs';
const measurement: {
  POLICIES: Policy[];
  selectHeroChoice: (core: typeof import('../src/core/index.js'), state: GameState, mode: Policy['heroChoice']) => HeroRoll | undefined;
  policyState: (core: typeof import('../src/core/index.js'), state: GameState, mode: Policy['heroChoice']) => GameState;
  simulate: (core: typeof import('../src/core/index.js'), policy: Policy, seed: number, options: { fixture?: SaveFile; checkpointsMinutes: number[] }) => Run;
  validateRun: (run: Run, core: typeof import('../src/core/index.js'), checkpoints: number[]) => Run;
  validateCollectionProtocol: (protocol: unknown) => unknown;
} = await import(modulePath);
const oldPath = '../.harness/v7/loop/measure.mjs';
const previous: { simulate: (core: typeof import('../src/core/index.js'), policy: unknown, seed: number,
  options: { settings: unknown; fixture?: SaveFile }) => Raw } = await import(oldPath);
const configPath = '../.harness/v7/loop/config.mjs';
const { CONFIG }: { CONFIG: { measurement: Record<string, unknown> } } = await import(configPath);

const fresh = (): GameState => ({ ...core.createEngine(null, core.mulberry32(5)).getState(), hero: core.newHeroProgress() });
const choices: HeroRoll[] = [{ formId: 'h01', buffPercent: 10 }, { formId: 'h03', buffPercent: 10 }, { formId: 'h58', buffPercent: 10 }];
const readyFullRoster = (): SaveFile => {
  const save = core.createEngine(null, core.mulberry32(23)).toSave();
  save.level = 17;
  save.killCount = 30000;
  save.hero = { ...core.newHeroProgress(), choices: choices.map(choice => ({ ...choice })), offerSerial: 41, offerLevel: 17 };
  save.progress = { ...saveProgress(core.newProgress()), speciesKills: { reefknight: 100 } };
  save.companions = Array.from({ length: 30 }, (_, n) => ({ id: `c${n + 1}`, speciesId: n === 0 ? 'slime' : 'dragon',
    bossIndex: n === 0 ? 8 : 80, level: 10, stars: 1 }));
  save.nextCompanionId = 31;
  return save;
};

describe('v0.8 collection policy measurement', () => {
  it('preserves the original v7 first-card trajectory exactly', () => {
    for (const policy of [measurement.POLICIES[0]!, measurement.POLICIES[2]!]) {
      const fixture = readyFullRoster();
      const run = measurement.simulate(core, policy, 20001, { fixture, checkpointsMinutes: [10] });
      const old = previous.simulate(core, { profile: 'active', policy: 'free', inputSchedule: 'uniform',
        management: policy.management, menuVisitSeconds: 600 }, 20001,
      { fixture, settings: { ...CONFIG.measurement, tickMs: 100, observationMs: 1000, checkpointsMinutes: [10] } });
      expect(run.raw).toEqual(old);
      expect(run.adapter.choices[0]?.originalSlot).toBe(0);
      expect(measurement.validateRun(run, core, [10])).toBe(run);
    }
  });

  it('uses permanent ownership, prioritizes unowned rare, and retains original slot order for ties', () => {
    const state = fresh();
    state.hero!.choices = choices.map(choice => ({ ...choice }));
    expect(measurement.selectHeroChoice(core, state, 'unowned-rare-first')?.formId).toBe('h58');
    state.hero!.collection.push({ formId: 'h58', buffPercent: 10 });
    expect(measurement.selectHeroChoice(core, state, 'unowned-rare-first')?.formId).toBe('h01');
    state.hero!.collection.push({ formId: 'h01', buffPercent: 10 }, { formId: 'h03', buffPercent: 10 });
    expect(measurement.selectHeroChoice(core, state, 'unowned-rare-first')?.formId).toBe('h01');
    expect(measurement.selectHeroChoice(core, state, 'first')?.formId).toBe('h01');
  });

  it('reorders only the detached policy view and consumes no RNG or engine action', () => {
    const fixture = readyFullRoster();
    const engine = core.createEngine(fixture, core.mulberry32(17));
    const before = { ...engine.getState() }, save = engine.toSave();
    const copy = structuredClone(before);
    for (let n = 0; n < 3; n++) expect(measurement.policyState(core, before, 'unowned-rare-first').hero!.choices[0]!.formId).toBe('h58');
    expect(before).toEqual(copy);
    expect(engine.toSave()).toEqual(save);
    const reference = core.createEngine(fixture, core.mulberry32(17));
    expect(engine.attack('keyboard')).toEqual(reference.attack('keyboard'));
    expect(engine.getState()).toEqual(reference.getState());
  });

  it('chooses the actual third rare card and records the existing consume policy without species protection', () => {
    const run = measurement.simulate(core, measurement.POLICIES[3]!, 20002, { fixture: readyFullRoster(), checkpointsMinutes: [10] });
    expect(run.adapter.choices[0]?.selectedId).toBe('h58');
    expect(run.adapter.choices[0]?.originalSlot).toBe(2);
    expect(run.adapter.management).toHaveLength(1);
    expect(run.adapter.management[0]).toMatchObject({ sec: 600, food: { id: 'c1' }, lastOfSpecies: true });
    expect(measurement.validateRun(run, core, [10])).toBe(run);
    const corrupt = structuredClone(run);
    corrupt.adapter.choices[0]!.originalSlot = 0;
    expect(() => measurement.validateRun(corrupt, core, [10])).toThrow('choice');
    const falseLoss = structuredClone(run);
    falseLoss.adapter.management[0]!.lastOfSpecies = false;
    expect(() => measurement.validateRun(falseLoss, core, [10])).toThrow('consume');
  });

  it('records full-roster releases separately from actual new companions', () => {
    const save = core.createEngine(null, core.mulberry32(23)).toSave();
    save.companions = Array.from({ length: 30 }, (_, n) => ({ id: `c${n + 1}`, speciesId: 'slime' as const,
      bossIndex: 80, level: 10, stars: 1 }));
    save.nextCompanionId = 31;
    const run = measurement.simulate(core, measurement.POLICIES[0]!, 20003, { fixture: save, checkpointsMinutes: [1] });
    expect(run.adapter.companions.some(event => event.type === 'released')).toBe(true);
    expect(run.adapter.companions.some(event => event.type === 'captured')).toBe(false);
    expect(run.checkpoints[0]!.captures).toBe(0);
    expect(run.checkpoints[0]!.everCapturedSpecies).toEqual(['slime']);
    expect(run.checkpoints[0]!.fullRosterSeconds).toBe(60);
    expect(measurement.validateRun(run, core, [1])).toBe(run);
    const corrupt = structuredClone(run);
    corrupt.adapter.companions[0]!.novel = !corrupt.adapter.companions[0]!.novel;
    expect(() => measurement.validateRun(corrupt, core, [1])).toThrow('novelty');
    const falseOccupancy = structuredClone(run);
    falseOccupancy.checkpoints[0]!.fullRosterSeconds = 30;
    expect(() => measurement.validateRun(falseOccupancy, core, [1])).toThrow('checkpoint');
    const falseRoster = structuredClone(run);
    falseRoster.checkpoints[0]!.rosterSpecies = [];
    expect(() => measurement.validateRun(falseRoster, core, [1])).toThrow('checkpoint');
  });

  it('rejects unregistered policies and changed seed registration', () => {
    expect(() => measurement.simulate(core, { id: 'X', heroChoice: 'first', management: 'none' }, 1, { checkpointsMinutes: [1] })).toThrow('Unregistered');
    expect(() => measurement.validateCollectionProtocol({ version: '0.8.0', collectionPolicy: {} })).toThrow('protocol');
  });
});
