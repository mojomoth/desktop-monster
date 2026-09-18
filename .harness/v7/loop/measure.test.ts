import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { spawnSync } from 'node:child_process';
import * as core from '../../../src/core/index.js';
import { CONFIG, PROTOCOL_PATH } from './config.mjs';
import { ROOT, sha256 } from './evidence.mjs';
import { bigintDistribution, compareMeasurements, distribution, evaluateTargets, observationSettings, populationQuantile, readMeasurementProtocol, selectExperiment, simulate,
  summarize, validateMeasurement, validateMeasurementPhase, validateOfficialProtocolSnapshot, validateProductionExperiment, validateRun, workerSimulation } from './measure.mjs';

// Synthetic engine owns its clock; its 45min choice and 9h unlock exercise the measurement contract.
function mockCore(options: { transientEligibility?: boolean; levelAtMs?: number } = {}) {
  return {
    HERO_FORMS: [{ id: 'h01' }], SPECIES_IDS: ['slime'], mulberry32: () => ({ next: () => 0 }),
    eligibleHeroIds: (s: { level: number; progress: { playTimeMs: number } }) =>
      (options.transientEligibility ? s.level >= 2 : s.progress.playTimeMs >= 32_400_000) ? ['h01'] : [],
    eligibleMonsterIds: () => ['slime'],
    activeCompanions: () => [], companionPower: () => 0n,
    heroReady: (level: number) => level >= 2,
    createEngine: () => {
      const state = { level: 1, killCount: 0, coins: 0, monster: { type: 'fire', speciesId: 'slime' }, companions: [],
        hero: { reincarnations: 0, collection: [] as { formId: string }[], choices: [] as { formId: string }[],
          offerSerial: 0, deferRemainingMs: 0, restRemainingMs: 0 },
        progress: { goldSpent: 0, playTimeMs: 0, trainingLevel: 0, seenHeroes: [] as string[], seenMonsters: ['slime'] } };
      return {
        getState: () => structuredClone(state), attack: () => [],
        tick: (dt: number) => {
          state.progress.playTimeMs += dt;
          if (state.progress.playTimeMs !== (options.levelAtMs ?? 2_700_000)) return [];
          state.level = 2;
          return [{ type: 'levelUp', newLevel: 2 }];
        },
        apply: (action: { type: string }) => {
          if (action.type === 'heroOffer') state.hero.choices = Array.from({ length: 3 }, () => ({ formId: 'h01' }));
          if (action.type === 'heroChoose') {
            state.hero.reincarnations++;
            state.hero.collection = [{ formId: 'h01' }]; state.hero.choices = [];
            state.progress.seenHeroes = ['h01']; state.level = 1;
          }
          return [];
        },
      };
    },
  };
}

function mockReport() {
  const settings = CONFIG.measurement;
  // The historical baseline contract must not change when the live protocol advances rounds.
  const protocol = JSON.parse(`{"schemaVersion":1,"harnessVersion":7,"kind":"desmon-v07-evaluation","phase":"baseline",
    "fixture":"fresh","milestones":[],"candidates":[],"selectedCandidate":null,"frozenAt":"2026-09-11T12:26:53Z"}`);
  const run = simulate(mockCore(), settings.baseline, 1);
  const runs = Array.from({ length: settings.seeds.baseline.count }, (_, i) => ({ ...structuredClone(run), seed: settings.seeds.baseline.start + i }));
  const files = { 'dist/electron/core/index.js': 'b'.repeat(64) };
  return { version: 7, kind: 'simulated-engine-measurement', phase: 'baseline', rawComplete: true,
    screening: false, checkpointsMinutes: settings.checkpointsMinutes,
    sourceDigest: 'a'.repeat(64), evaluationDigest: 'b'.repeat(64), settings,
    build: { command: 'npm run build', files, sha256: sha256(JSON.stringify(files)) },
    protocol, protocolSha256: sha256(JSON.stringify(protocol)), fixture: null, fixtureSha256: sha256('null'),
    seedSet: 'baseline', seeds: settings.seeds.baseline, policies: [settings.baseline], catalog: { hero: ['h01'], monster: ['slime'] },
    runs, rawSha256: sha256(JSON.stringify(runs)), scenarios: summarize(runs), targets: evaluateTargets(runs, settings, protocol.milestones) };
}

function experimentProtocol() {
  const parameters = { heroMinLevel: 18, xpBase: 20, xpGrowth: 1.4,
    fieldHpNumerator: 115, fieldHpDenominator: 100, companionHpNumerator: 115, companionHpDenominator: 100,
    captureChance: .35, firstCaptureBossIndex: null, heroLevelStepEvery: 2, heroLevelStepCap: 6,
    heroRestMs: 120000, heroDeferMs: 30000, xpRewardBase: 5, xpRewardPerIndex: 3, bossXpMultiplier: 5, bossHpMultiplier: 5 };
  return { schemaVersion: 2, harnessVersion: 7, kind: 'desmon-v07-evaluation', phase: 'candidate',
    fixture: 'fresh', round: 1, experimentStage: 'exploration', selectedExperiment: null as { kind: string; id: string } | null,
    frozenAt: '2026-09-11T12:26:53Z',
    milestones: [{ id: 'late', label: 'Nine-hour form', kind: 'hero', ids: ['h01'], final: true,
      requirements: [{ kind: 'totalKills', count: 30000 }] }],
    controls: CONFIG.measurement.levelControls.map((level) => ({ id: `control-l${level}`, hypothesis: 'Level-only control', parameters: { ...parameters, heroMinLevel: level } })),
    candidates: [{ id: 'candidate-a', hypothesis: 'XP sensitivity', parameters: { ...parameters, xpGrowth: 1.42 } },
      { id: 'candidate-b', hypothesis: 'Field HP sensitivity', parameters: { ...parameters, fieldHpNumerator: 114 } }] };
}

function mockExperimentReport() {
  const report = mockCandidateReport();
  const protocol = experimentProtocol();
  protocol.experimentStage = 'validation'; protocol.selectedExperiment = { kind: 'candidate', id: 'candidate-a' };
  return { ...report, protocol, protocolSha256: sha256(JSON.stringify(protocol)),
    experiment: selectExperiment(protocol, {}, 'candidate', 'validation') };
}

function mockCandidateReport() {
  const report = mockReport();
  report.phase = 'candidate'; report.seedSet = 'validation'; report.seeds = CONFIG.measurement.seeds.validation;
  report.protocol = { ...report.protocol, phase: 'candidate',
    milestones: [{ id: 'late', label: 'Nine-hour form', kind: 'hero', ids: ['h01'], final: true }],
    candidates: [{ id: 'synthetic', hypothesis: 'Measurement acceptance fixture', parameters: { synthetic: true } }],
    selectedCandidate: 'synthetic' };
  report.protocolSha256 = sha256(JSON.stringify(report.protocol));
  for (const run of report.runs) for (const row of run.checkpoints) row.lastUnlockSec = row.minutes >= 540 ? 32_400 : null;
  report.rawSha256 = sha256(JSON.stringify(report.runs)); report.scenarios = summarize(report.runs);
  report.targets = evaluateTargets(report.runs, report.settings, report.protocol.milestones);
  return report;
}

describe('v7 measurement contract', () => {
  it('preserves censored denominators and exact bigint quantiles', () => {
    expect(distribution([null, 3, 2, 1])).toMatchObject({ samples: 4, reached: 3, unreached: 1, p50: 2 });
    expect(populationQuantile([1, null, null, null], .5)).toBeNull();
    expect(() => distribution([Number.NaN])).toThrow('Non-finite');
    expect(bigintDistribution(['9007199254740993', '9007199254740992', '99999999999999999999999']))
      .toMatchObject({ p50: '9007199254740993', max: '99999999999999999999999' });
  });

  it('separates 100ms readiness, delayed visits, first ownership and 1s unlock observation', () => {
    const settings = { ...CONFIG.measurement, checkpointsMinutes: [45, 50, 60] };
    const run = simulate(mockCore(), { ...settings.baseline, menuVisitSeconds: 600 }, 1, { settings });
    expect(run.checkpoints[0]).toMatchObject({ firstReadySec: 2700, firstOpenSec: null, firstAcceptedSec: null });
    expect(run.checkpoints[1]).toMatchObject({ firstReadySec: 2700, firstOpenSec: 3000, firstAcceptedSec: 3000, chosenHeroCount: 1 });
    expect(run.actions[0]).toMatchObject({ type: 'heroChoose', sec: 3000, level: 2 });
    expect(() => validateRun(run, settings, [], { hero: ['h01'], monster: ['slime'] })).not.toThrow();
  });

  it('records a transient level unlock before an immediate reincarnation resets the level', () => {
    const settings = { ...CONFIG.measurement, checkpointsMinutes: [1] };
    const milestones = [{ id: 'level-two', label: 'Level two form', kind: 'hero', ids: ['h01'], final: true }];
    for (const levelAtMs of [1000, 1100]) {
      const run = simulate(mockCore({ transientEligibility: true, levelAtMs }), settings.baseline, 1, { settings, milestones });
      expect(run.checkpoints[0]).toMatchObject({ firstAcceptedSec: levelAtMs / 1000,
        eligibleHeroCount: 1, chosenHeroCount: 1, lastUnlockSec: levelAtMs / 1000, level: 1 });
      expect(run.records.find((r: { kind: string }) => r.kind === 'eligibleHero'))
        .toMatchObject({ id: 'h01', sec: levelAtMs / 1000 });
      validateRun(run, settings, milestones, { hero: ['h01'], monster: ['slime'] });
    }
  });

  it('uses the real reducer deterministically and conserves gold with paid purchases', () => {
    const settings = { ...CONFIG.measurement, checkpointsMinutes: [1, 3] };
    const policy = { ...settings.baseline, policy: 'training' };
    const run = simulate(core, policy, 10001, { settings });
    expect(simulate(core, policy, 10001, { settings })).toEqual(run);
    // Readiness can legitimately remain pending in a three-minute sample.
    // Preserve actual event/ledger consistency; official pacing has its own AC.
    for (const row of run.checkpoints) for (const kind of ['firstReadySec', 'firstOpenSec', 'firstAcceptedSec']) {
      expect(row[kind]).toBe(run.records.find((record) => record.kind === kind && record.sec <= row.minutes * 60)?.sec ?? null);
    }
    expect(run.checkpoints[1].spent).toBeGreaterThan(0);
    for (const row of run.checkpoints) expect(row.income - row.spent).toBe(row.coins);
    validateRun(run, settings, [], { hero: core.HERO_FORMS.map((h) => h.id), monster: [...core.SPECIES_IDS] });
    const idle = simulate(core, { ...settings.baseline, profile: 'pure-idle' }, 10001, { settings });
    expect(idle.checkpoints[1]).toMatchObject({ firstReadySec: null, firstAcceptedSec: null, firstRewardSec: null, kills: 0, inputCount: 0 });
    // A separate unit fixture must actually exercise readiness/offer/accept/reset.
    // This fixture is not a natural observation or candidate measurement.
    const fixture = { ...core.DEFAULT_SAVE, level: core.heroRequiredLevel(0), hero: core.newHeroProgress() };
    const prepared = simulate(core, { ...settings.baseline, profile: 'pure-idle' }, 10001,
      { settings: { ...settings, checkpointsMinutes: [1] }, fixture });
    const accepted = prepared.actions.filter(action => action.type === 'heroChoose');
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({ level: fixture.level });
    expect(prepared.checkpoints[0]).toMatchObject({ firstReadySec: 0,
      firstOpenSec: accepted[0].sec, firstAcceptedSec: accepted[0].sec, reincarnations: 1, level: 1, inputCount: 0 });
    expect(prepared.records).toContainEqual({ kind: 'chosenHero', id: accepted[0].formId, sec: accepted[0].sec });
  });

  it('matches uniform/burst input budgets for active and intermittent profiles', () => {
    const settings = { ...CONFIG.measurement, checkpointsMinutes: [1, 3, 5] };
    for (const profile of ['active', 'intermittent', 'warm-idle']) {
      const uniform = simulate(mockCore(), { ...settings.baseline, profile, inputSchedule: 'uniform' }, 1, { settings });
      const burst = simulate(mockCore(), { ...settings.baseline, profile, inputSchedule: 'burst' }, 1, { settings });
      expect(burst.checkpoints.map((r: { inputCount: number }) => r.inputCount)).toEqual(uniform.checkpoints.map((r: { inputCount: number }) => r.inputCount));
    }
  });

  it('reincarnate-first raises a level-one target by consuming before reincarnating', () => {
    const settings = { ...CONFIG.measurement, checkpointsMinutes: [1] };
    const companions = Array.from({ length: 10 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, stars: 0, level: 1 }));
    const fixture = { ...structuredClone(core.DEFAULT_SAVE), companions, nextCompanionId: 11 };
    const run = simulate(core, { ...settings.baseline, management: 'reincarnate-first' }, 7, { settings, fixture });
    expect(run.actions.some((a: { type: string }) => a.type === 'consume')).toBe(true);
    expect(run.actions.some((a: { type: string }) => a.type === 'reincarnate')).toBe(true);
  });

  it('recomputes complete raw seed evidence and rejects duplicate/missing/forged results', () => {
    const report = mockReport();
    expect(() => validateMeasurement(report)).not.toThrow();
    expect(report.targets.passed).toBe(false); // Baseline has no registered final milestone.
    const forgedSummary = structuredClone(report);
    forgedSummary.scenarios[0].metrics.level.p50 = 99;
    expect(() => validateMeasurement(forgedSummary)).toThrow('Summary');
    const missing = structuredClone(report); missing.runs.pop(); missing.rawSha256 = sha256(JSON.stringify(missing.runs));
    expect(() => validateMeasurement(missing)).toThrow('Missing seed');
    const duplicate = structuredClone(report); duplicate.runs[1] = duplicate.runs[0]; duplicate.rawSha256 = sha256(JSON.stringify(duplicate.runs));
    expect(() => validateMeasurement(duplicate)).toThrow('Duplicate');
    const invalidFirst = structuredClone(report); invalidFirst.runs[0].checkpoints[0].firstAcceptedSec = 1;
    invalidFirst.rawSha256 = sha256(JSON.stringify(invalidFirst.runs));
    expect(() => validateMeasurement(invalidFirst)).toThrow('First records');
    const gold = structuredClone(report); gold.runs[0].checkpoints[0].coins = 1;
    gold.rawSha256 = sha256(JSON.stringify(gold.runs));
    expect(() => validateMeasurement(gold)).toThrow('Gold conservation');
    expect(() => validateMeasurement(report, 'c'.repeat(64))).toThrow('stale');
  });

  it('allows different game sources and protocols in paired comparisons, without comparing different milestones', () => {
    const before = mockReport(), after = structuredClone(before);
    after.sourceDigest = 'c'.repeat(64);
    after.protocol.notes = 'New candidate protocol notes';
    after.protocolSha256 = sha256(JSON.stringify(after.protocol));
    const comparison = compareMeasurements(before, after);
    expect(comparison.rawDeltas).toHaveLength(CONFIG.measurement.seeds.baseline.count);
    expect(comparison.scenarios[0].metrics.heroDamage.p50).toBe('0');
    after.policies = [{ ...CONFIG.measurement.baseline, menuVisitSeconds: 120 }];
    expect(() => compareMeasurements(before, after)).toThrow();
  });

  it('cannot pass the first-reincarnation target from a fast survivor minority', () => {
    const run = { policy: CONFIG.measurement.baseline, records: [], checkpoints: [{ firstAcceptedSec: 3000 }] };
    const stalled = { ...run, checkpoints: [{ firstAcceptedSec: null }] };
    const targets = evaluateTargets([run, ...Array.from({ length: 9 }, () => stalled)], CONFIG.measurement, []);
    expect(targets.checks[0]).toMatchObject({ passed: false, observedSec: null });
    expect(targets.checks[1]).toMatchObject({ passed: false, reached: 1, samples: 10 });
    const optional = evaluateTargets([{ ...run, policy: { ...CONFIG.measurement.baseline, policy: 'training' } }], CONFIG.measurement, []);
    expect(optional).toMatchObject({ status: 'NOT_EVALUATED', passed: null, samples: 0 });
  });

  it('labels the 120-minute exploration screen and omits the unobserved late-unlock verdict', () => {
    const settings = observationSettings(CONFIG.measurement, true);
    expect(settings.checkpointsMinutes.at(-1)).toBe(120);
    const run = simulate(mockCore(), CONFIG.measurement.baseline, 10001, { settings });
    const targets = evaluateTargets([run], CONFIG.measurement, [], true);
    expect(targets).toMatchObject({ status: 'PASS', passed: true });
    expect(targets.checks.map((c: { id: string }) => c.id)).toEqual(['first-reincarnation-median', 'first-reincarnation-deadline']);
    expect(targets.skipped).toHaveLength(1);
    const full = mockReport(); full.screening = true;
    expect(() => validateMeasurement(full)).toThrow('Screening requires');
  });

  it('returns the same seed data from an isolated production worker', async () => {
    const options = { settings: { ...CONFIG.measurement, checkpointsMinutes: [1, 3] } };
    const worker = new Worker(new URL('./measure-worker.mjs', import.meta.url));
    try {
      for (const seed of [10001, 10002]) {
        const result = await workerSimulation(worker, { policy: CONFIG.measurement.baseline, seed, options });
        expect(result).toEqual(simulate(core, CONFIG.measurement.baseline, seed, options));
      }
    } finally { await worker.terminate(); }
  });

  it('requires phase-specific acceptance instead of accepting any structurally valid report', () => {
    const baseline = mockReport();
    expect(() => validateMeasurementPhase(baseline, 'baseline')).not.toThrow();
    expect(() => validateMeasurementPhase(baseline, 'candidate')).toThrow('Expected candidate');
    const candidate = mockCandidateReport();
    expect(() => validateMeasurementPhase(candidate, 'candidate')).not.toThrow();
    expect(() => validateMeasurementPhase(candidate, 'baseline')).toThrow('Expected baseline');
    expect(() => validateMeasurementPhase(candidate, 'release')).toThrow('Expected release');
    const failed = structuredClone(candidate);
    failed.protocol.milestones[0].ids = ['slime']; failed.protocol.milestones[0].kind = 'monster';
    failed.protocolSha256 = sha256(JSON.stringify(failed.protocol));
    for (const run of failed.runs) for (const row of run.checkpoints) row.lastUnlockSec = 0;
    failed.rawSha256 = sha256(JSON.stringify(failed.runs)); failed.scenarios = summarize(failed.runs);
    failed.targets = evaluateTargets(failed.runs, failed.settings, failed.protocol.milestones);
    expect(() => validateMeasurement(failed)).not.toThrow();
    expect(() => validateMeasurementPhase(failed, 'candidate')).toThrow('every registered target');
    const exploration = structuredClone(candidate);
    exploration.seedSet = 'exploration'; exploration.seeds = CONFIG.measurement.seeds.exploration;
    exploration.runs = exploration.runs.slice(0, exploration.seeds.count).map((run, i) => ({ ...run, seed: exploration.seeds.start + i }));
    exploration.rawSha256 = sha256(JSON.stringify(exploration.runs)); exploration.scenarios = summarize(exploration.runs);
    exploration.targets = evaluateTargets(exploration.runs, exploration.settings, exploration.protocol.milestones);
    expect(() => validateMeasurement(exploration)).not.toThrow();
    expect(() => validateMeasurementPhase(exploration, 'candidate')).toThrow('full validation seed set');
    const screening = structuredClone(exploration); screening.screening = true;
    screening.checkpointsMinutes = observationSettings(screening.settings, true).checkpointsMinutes;
    for (const run of screening.runs) {
      run.checkpoints = run.checkpoints.filter((row) => screening.checkpointsMinutes.includes(row.minutes));
      run.records = run.records.filter((record) => record.sec <= screening.checkpointsMinutes.at(-1)! * 60);
    }
    screening.rawSha256 = sha256(JSON.stringify(screening.runs)); screening.scenarios = summarize(screening.runs);
    screening.targets = evaluateTargets(screening.runs, screening.settings, screening.protocol.milestones, true);
    expect(() => validateMeasurement(screening)).not.toThrow();
    expect(() => validateMeasurementPhase(screening, 'candidate')).toThrow('full 12-hour');
    const optional = structuredClone(candidate);
    optional.policies = [{ ...CONFIG.measurement.baseline, policy: 'training' }];
    for (const run of optional.runs) run.policy = optional.policies[0];
    optional.rawSha256 = sha256(JSON.stringify(optional.runs)); optional.scenarios = summarize(optional.runs);
    optional.targets = evaluateTargets(optional.runs, optional.settings, optional.protocol.milestones);
    expect(optional.targets.status).toBe('NOT_EVALUATED');
    expect(() => validateMeasurement(optional)).not.toThrow();
    expect(() => validateMeasurementPhase(optional, 'candidate')).toThrow('canonical baseline policy');
    optional.phase = 'baseline'; optional.seedSet = 'baseline'; optional.seeds = CONFIG.measurement.seeds.baseline;
    expect(() => validateMeasurementPhase(optional, 'baseline')).toThrow('exactly the canonical');
    const incompleteRelease = structuredClone(candidate); incompleteRelease.phase = 'release';
    expect(() => validateMeasurementPhase(incompleteRelease, 'release')).toThrow('full registered validation policy suite');
    expect(() => validateMeasurementPhase(candidate, 'unknown')).toThrow('Unknown');
  });

  it('rejects irrelevant verify options before reading an artifact', () => {
    const result = spawnSync(process.execPath, [resolve(ROOT, '.harness/v7/loop/measure.mjs'), 'verify', 'not-present.json', '--seed', '1'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('verify accepts only --phase');
  });

  it('accepts a passing release only with every registered policy and validation seed', () => {
    const release = mockCandidateReport(); release.phase = 'release';
    release.policies = CONFIG.measurement.validationPolicies;
    release.runs = release.policies.flatMap((policy) => {
      const run = simulate(mockCore(), policy, release.seeds.start, { milestones: release.protocol.milestones });
      return Array.from({ length: release.seeds.count }, (_, i) => ({ ...structuredClone(run), seed: release.seeds.start + i }));
    });
    release.rawSha256 = sha256(JSON.stringify(release.runs)); release.scenarios = summarize(release.runs);
    release.targets = evaluateTargets(release.runs, release.settings, release.protocol.milestones);
    expect(() => validateMeasurementPhase(release, 'release')).not.toThrow();
  });
});

describe('v7 preregistered experiment execution', () => {
  it('requires one explicit registered exploration ID without treating controls as candidates', () => {
    const protocol = experimentProtocol();
    const before = structuredClone(protocol);
    expect(() => selectExperiment(protocol, {}, 'candidate', 'exploration')).toThrow('explicit');
    expect(() => selectExperiment(protocol, { candidate: 'candidate-a', control: 'control-l18' }, 'candidate', 'exploration')).toThrow('mutually exclusive');
    expect(() => selectExperiment(protocol, { candidate: 'control-l18' }, 'candidate', 'exploration')).toThrow('not registered');
    expect(() => selectExperiment(protocol, { control: 'unknown' }, 'candidate', 'exploration')).toThrow('not registered');
    const candidate = selectExperiment(protocol, { candidate: 'candidate-a' }, 'candidate', 'exploration');
    const control = selectExperiment(protocol, { control: 'control-l18' }, 'candidate', 'exploration');
    expect(candidate).toMatchObject({ kind: 'candidate', id: 'candidate-a', parametersSha256: sha256(JSON.stringify(protocol.candidates[0].parameters)) });
    expect(control).toMatchObject({ kind: 'control', id: 'control-l18' });
    expect(control.parametersSha256).not.toBe(candidate.parametersSha256);
    expect(control.contentRulesSha256).toBe(candidate.contentRulesSha256);
    expect(protocol).toEqual(before);
  });

  it('locks validation and release to the adopted experiment and keeps seed roles separate', () => {
    const protocol = experimentProtocol();
    expect(() => selectExperiment(protocol, { candidate: 'candidate-a' }, 'candidate', 'validation')).toThrow('stage');
    expect(() => selectExperiment(protocol, { candidate: 'candidate-a' }, 'release', 'exploration')).toThrow('frozen validation');
    protocol.experimentStage = 'validation'; protocol.selectedExperiment = { kind: 'control', id: 'control-l18' };
    expect(selectExperiment(protocol, {}, 'candidate', 'validation')).toMatchObject(protocol.selectedExperiment);
    expect(selectExperiment(protocol, { control: 'control-l18' }, 'release', 'validation')).toMatchObject(protocol.selectedExperiment);
    expect(() => selectExperiment(protocol, { candidate: 'candidate-a' }, 'candidate', 'validation')).toThrow('frozen selected');
    expect(() => selectExperiment(protocol, { control: 'control-l19' }, 'release', 'validation')).toThrow('frozen selected');
    expect(() => selectExperiment(protocol, { control: 'control-l18' }, 'candidate', 'exploration')).toThrow('stage');
    protocol.selectedExperiment = null;
    expect(() => selectExperiment(protocol, {}, 'candidate', 'validation')).toThrow('frozen selection');
  });

  it('preserves baseline execution while refusing new experiments under the historical schema', () => {
    const baseline = mockReport();
    expect(selectExperiment(baseline.protocol, {}, 'baseline', 'baseline')).toBeNull();
    expect(() => selectExperiment(baseline.protocol, { candidate: 'candidate-a' }, 'baseline', 'baseline')).toThrow('Baseline does not select');
    expect(() => selectExperiment(mockCandidateReport().protocol, { candidate: 'synthetic' }, 'candidate', 'validation')).toThrow('schemaVersion 2');
    expect(() => selectExperiment(experimentProtocol(), {}, 'baseline', 'baseline')).toThrow('preserved');
  });

  it('checks actual production parameters and named rules without depending on object key order', () => {
    const protocol = experimentProtocol();
    const experiment = selectExperiment(protocol, { candidate: 'candidate-a' }, 'candidate', 'exploration');
    const production = { PROGRESSION_PARAMETERS: Object.freeze(Object.fromEntries(Object.entries(protocol.candidates[0].parameters).reverse())),
      PROGRESSION_CONTENT_RULES: { h01: structuredClone(protocol.milestones[0].requirements), h02: [] } };
    const before = structuredClone(production);
    expect(() => validateProductionExperiment(production, protocol, experiment)).not.toThrow();
    for (const change of [{ xpGrowth: 1.4 }, { companionHpNumerator: 114 }, { extra: 1 }]) {
      expect(() => validateProductionExperiment({ ...production, PROGRESSION_PARAMETERS: { ...production.PROGRESSION_PARAMETERS, ...change } }, protocol, experiment)).toThrow('PROGRESSION_PARAMETERS');
    }
    expect(() => validateProductionExperiment({ ...production, PROGRESSION_PARAMETERS: undefined }, protocol, experiment)).toThrow('PROGRESSION_PARAMETERS');
    expect(() => validateProductionExperiment({ ...production, PROGRESSION_CONTENT_RULES: {} }, protocol, experiment)).toThrow('PROGRESSION_CONTENT_RULES');
    expect(() => validateProductionExperiment({ ...production, PROGRESSION_CONTENT_RULES: { h01: [{ kind: 'totalKills', count: 1 }] } }, protocol, experiment)).toThrow('PROGRESSION_CONTENT_RULES');
    expect(production).toEqual(before);
  });

  it('recomputes report experiment fingerprints and rejects a different or missing adopted identity', () => {
    const report = mockExperimentReport();
    expect(() => validateMeasurementPhase(report, 'candidate')).not.toThrow();
    const wrongHash = structuredClone(report); wrongHash.experiment.parametersSha256 = 'a'.repeat(64);
    expect(() => validateMeasurement(wrongHash)).toThrow('fingerprint');
    const wrongRules = structuredClone(report); wrongRules.experiment.contentRulesSha256 = 'a'.repeat(64);
    expect(() => validateMeasurement(wrongRules)).toThrow('fingerprint');
    const wrongId = structuredClone(report); wrongId.experiment.id = 'candidate-b';
    expect(() => validateMeasurement(wrongId)).toThrow('frozen selected');
    expect(() => validateMeasurement({ ...report, experiment: undefined })).toThrow('Missing experiment');
    const reused = structuredClone(report); reused.protocol.candidates[0].parameters.xpGrowth = 1.43;
    reused.protocolSha256 = sha256(JSON.stringify(reused.protocol));
    expect(() => validateMeasurement(reused)).toThrow('fingerprint');
  });

  it('accepts complete exploration evidence without letting its twenty seeds satisfy a candidate AC', () => {
    const report = mockExperimentReport();
    report.protocol.experimentStage = 'exploration'; report.protocol.selectedExperiment = null;
    report.protocolSha256 = sha256(JSON.stringify(report.protocol));
    report.seedSet = 'exploration'; report.seeds = CONFIG.measurement.seeds.exploration;
    report.experiment = selectExperiment(report.protocol, { candidate: 'candidate-a' }, 'candidate', 'exploration');
    report.runs = report.runs.slice(0, report.seeds.count).map((run, i) => ({ ...run, seed: report.seeds.start + i }));
    report.rawSha256 = sha256(JSON.stringify(report.runs)); report.scenarios = summarize(report.runs);
    report.targets = evaluateTargets(report.runs, report.settings, report.protocol.milestones);
    expect(() => validateMeasurement(report)).not.toThrow();
    expect(() => validateMeasurementPhase(report, 'candidate')).toThrow('full validation seed set');
    report.seedSet = 'validation'; report.seeds = CONFIG.measurement.seeds.validation;
    expect(() => validateMeasurement(report)).toThrow('stage');
  });

  it('requires eighteen of all twenty exploration seeds by ninety minutes', () => {
    const reached = { policy: CONFIG.measurement.baseline, records: [], checkpoints: [{ firstAcceptedSec: 3150 }] };
    const unreached = { ...reached, checkpoints: [{ firstAcceptedSec: null }] };
    const passing = evaluateTargets([...Array.from({ length: 18 }, () => reached), unreached, unreached], CONFIG.measurement, [], true);
    expect(passing.checks[0]).toMatchObject({ passed: true, observedSec: 3150 });
    expect(passing.checks[1]).toMatchObject({ passed: true, reached: 18, samples: 20 });
    const failing = evaluateTargets([...Array.from({ length: 17 }, () => reached), unreached, unreached, unreached], CONFIG.measurement, [], true);
    expect(failing.checks[1]).toMatchObject({ passed: false, reached: 17, samples: 20 });
  });

  it('rejects simultaneous CLI selections before building or creating an output', () => {
    const result = spawnSync(process.execPath, [resolve(ROOT, '.harness/v7/loop/measure.mjs'), 'run', 'must-not-exist.json',
      '--phase', 'candidate', '--screening', '--candidate', 'candidate-a', '--control', 'control-l18'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('mutually exclusive');
  });
});

describe('official protocol execution boundary', () => {
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(resolve(tmpdir(), 'desmon-v7-protocol-')); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  it('permits the official realpath but rejects even an identical copy for new experiments', () => {
    const official = JSON.parse(readFileSync(PROTOCOL_PATH, 'utf8'));
    const alias = resolve(directory, 'official-link.json'), copy = resolve(directory, 'copied.json');
    symlinkSync(PROTOCOL_PATH, alias);
    writeFileSync(copy, JSON.stringify(official));
    expect(readMeasurementProtocol(PROTOCOL_PATH, 'candidate')).toEqual(official);
    expect(readMeasurementProtocol(alias, 'candidate')).toEqual(official);
    expect(() => readMeasurementProtocol(copy, 'candidate')).toThrow('official registered protocol path');
    expect(() => readMeasurementProtocol(copy, 'release')).toThrow('official registered protocol path');
    const baseline = mockReport();
    writeFileSync(copy, JSON.stringify(baseline.protocol));
    expect(readMeasurementProtocol(copy, 'baseline')).toEqual(baseline.protocol);
  });

  it('rejects copied validation selection and forged snapshot hashes against the official registration', () => {
    const official = JSON.parse(readFileSync(PROTOCOL_PATH, 'utf8'));
    const candidate = official.candidates[0].id;
    expect(() => validateOfficialProtocolSnapshot(official)).not.toThrow();
    const copied = { ...official, experimentStage: 'validation', selectedExperiment: { kind: 'candidate', id: candidate },
      notes: `${official.notes ?? ''} Copied selection never registered in the official file.` };
    expect(selectExperiment(copied, { candidate }, 'candidate', 'validation')).toMatchObject({ kind: 'candidate', id: candidate });
    expect(() => validateOfficialProtocolSnapshot(copied)).toThrow('current official registered protocol');
    expect(() => validateOfficialProtocolSnapshot(copied, sha256(JSON.stringify(official)))).toThrow('current official registered protocol');
    expect(() => validateOfficialProtocolSnapshot(official, 'a'.repeat(64))).toThrow('current official registered protocol');
  });

  it('rejects alternate CLI registration before building or creating seed outputs', () => {
    const protocol = JSON.parse(readFileSync(PROTOCOL_PATH, 'utf8'));
    const candidate = protocol.candidates[0].id;
    protocol.experimentStage = 'validation'; protocol.selectedExperiment = { kind: 'candidate', id: candidate };
    const copy = resolve(directory, 'validation-copy.json'), output = resolve(directory, 'unregistered.json');
    writeFileSync(copy, JSON.stringify(protocol));
    const result = spawnSync(process.execPath, [resolve(ROOT, '.harness/v7/loop/measure.mjs'), 'run', output,
      '--phase', 'candidate', '--seed-set', 'validation', '--candidate', candidate, '--protocol', copy], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('official registered protocol path');
    expect(existsSync(output)).toBe(false);
    expect(existsSync(`${output}.runs`)).toBe(false);
  });

  it('rejects a completed-output resume whose embedded registration is not official', () => {
    const official = JSON.parse(readFileSync(PROTOCOL_PATH, 'utf8'));
    const copied = { ...official, notes: `${official.notes ?? ''} Unregistered snapshot.` };
    const output = resolve(directory, 'completed.json');
    const embedded = JSON.stringify({ phase: 'candidate', protocol: copied, protocolSha256: sha256(JSON.stringify(copied)) });
    writeFileSync(output, embedded);
    const selected = official.selectedExperiment ?? { kind: 'candidate', id: official.candidates[0].id };
    const result = spawnSync(process.execPath, [resolve(ROOT, '.harness/v7/loop/measure.mjs'), 'run', output,
      '--phase', 'candidate', '--seed-set', official.experimentStage, `--${selected.kind}`, selected.id], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('current official registered protocol');
    expect(readFileSync(output, 'utf8')).toBe(embedded);
    expect(existsSync(`${output}.runs`)).toBe(false);
  });

  it('enforces the official snapshot at CLI verify while preserving historical structural comparisons', () => {
    const official = JSON.parse(readFileSync(PROTOCOL_PATH, 'utf8'));
    const copied = { ...official, experimentStage: 'validation', selectedExperiment: { kind: 'candidate', id: 'candidate-a' },
      notes: `${official.notes ?? ''} Unregistered validation copy.` };
    const output = resolve(directory, 'copied-report.json');
    writeFileSync(output, JSON.stringify({ phase: 'candidate', protocol: copied, protocolSha256: sha256(JSON.stringify(copied)) }));
    for (const options of [[], ['--phase', 'candidate']]) {
      const result = spawnSync(process.execPath, [resolve(ROOT, '.harness/v7/loop/measure.mjs'), 'verify', output, ...options], { encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('current official registered protocol');
    }
    const historical = mockExperimentReport();
    expect(() => validateMeasurement(historical)).not.toThrow();
    expect(compareMeasurements(historical, historical).rawDeltas).toHaveLength(CONFIG.measurement.seeds.validation.count);
    expect(() => validateMeasurementPhase(mockReport(), 'baseline')).not.toThrow();
  });
});
