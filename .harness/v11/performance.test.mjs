import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProtocol, validateObservation, evaluatePerformance, validateLifecycle, validateSerialLifecycles, observerVersions, comparableFixture, SLOTS} from './performance-report.mjs';
const protocol = JSON.parse(readFileSync(new URL('../../docs/v0.11/PERFORMANCE_PROTOCOL.json', import.meta.url)));

function observation(slot = 'baseline-idle', index = 0) {
  const profile = slot.split('-')[1], start = Date.parse('2026-09-18T00:00:00Z') + index * 3600000;
  const fixture = {version: 4, level: 1, killCount: 0, coins: '0', companions: Array.from({length: 5}, (_, i) =>
    ({id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0}))};
  const rows = Array.from({length: 360}, (_, i) => ({elapsedMs: (i + 1) * 5000, inputs: profile === 'active' ? (i + 1) * 10 : 0,
    errors: [], cpu: 1, workingSetMiB: 2,
    processes: [{pid: 1, creationTime: 1, type: 'Browser', cpu: .5, workingSetKiB: 1024}, {pid: 2, creationTime: 1, type: 'Tab', cpu: .5, workingSetKiB: 1024}],
    save: {...structuredClone(fixture), killCount: i, progress: {playTimeMs: (i + 1) * 5000}}}));
  const report = {version: 1, profile, requestedMinutes: 30, passed: true,
    checks: Object.fromEntries(['duration', 'metrics', 'samples', 'progress', 'inputs', 'errors', 'appUnchanged', 'observerUnchanged'].map(key => [key, true])),
    errors: [], exitCode: 0, exitSignal: null, observationMs: 1800000, inputCount: rows.at(-1).inputs,
    startedAt: new Date(start).toISOString(), finishedAt: new Date(start + 1800000).toISOString(),
    cancelSignal: null, cleanup: {state: 'complete', remaining: [], finishedAt: new Date(start + 1801000).toISOString()},
    appPath: '/frozen/DesMon.app', appHash: slot.startsWith('baseline-') ? 'baseline' : 'candidate',
    isolation: {globalHooks: false, osPermissionPrompts: false, network: 'offline', input: 'synthetic production IPC',
      time: 'real wall time; no engine ticks injected', userData: '/owned-fixture-' + index},
    machine: {platform: 'darwin', arch: 'arm64', os: 'fixture', cpu: 'fixture', logicalCpus: 8},
    metadata: {version: slot.startsWith('baseline-') ? '0.10.0' : '0.11.0', runtime: {electron: 'fixture'}, fixture},
    raw: {samples: rows.length}, finalSave: structuredClone(rows.at(-1).save),
    summary: {cpuP95: 1, workingSetMiBP95: 2, initialMemoryMedian: 2, finalMemoryMedian: null}};
  return {report, rows};
}

test('four fixed full-duration slots use the same unchanged observer and unchanged budgets', () => {
  assert.equal(validateProtocol(protocol).comparisonMinutes, 30);
  assert.deepEqual(observerVersions().baseline, observerVersions().candidate);
  for (const change of [p => p.performance.comparisonMinutes = 1, p => p.performance.cpuP95Max.baselineMultiplier = 2,
    p => p.slots.push('mixed'), p => p.latency.visualP95Ms = 500]) {
    const changed = structuredClone(protocol); change(changed); assert.throws(() => validateProtocol(changed));
  }
});

test('complete native rows pass; short duration, gaps, forged summary and wrong versions fail', () => {
  const {report, rows} = observation();
  assert.equal(validateObservation(report, rows, 'baseline-idle', protocol).rawSamples, 360);
  for (const change of [r => r.observationMs--, r => r.summary.cpuP95++, r => r.metadata.version = '0.9.1',
    r => r.cancelSignal = 'SIGINT', r => r.cleanup.remaining.push({pid: 99})]) {
    const changed = structuredClone(report); change(changed);
    assert.throws(() => validateObservation(changed, rows, 'baseline-idle', protocol));
  }
  const missing = structuredClone(rows); missing.splice(100, 3);
  assert.throws(() => validateObservation(report, missing, 'baseline-idle', protocol));
});

test('initial fixture persistence grace cannot hide changed, late or rolled-back saves', () => {
  const {report, rows} = observation(); rows[0].save = structuredClone(report.metadata.fixture);
  assert.deepEqual(validateObservation(report, rows, 'baseline-idle', protocol).initialFixtureSamples, [5000]);
  const changed = structuredClone(rows); changed[0].save.coins = '1';
  assert.throws(() => validateObservation(report, changed, 'baseline-idle', protocol), /Persisted play time/);
  for (let i = 0; i < 3; i++) rows[i].save = structuredClone(report.metadata.fixture);
  assert.throws(() => validateObservation(report, rows, 'baseline-idle', protocol), /Persisted play time/);
});

test('input schedule and raw process totals are independently checked', () => {
  const {report, rows} = observation('candidate-active');
  assert.equal(validateObservation(report, rows, 'candidate-active', protocol).input.actual, 3600);
  const broken = structuredClone(rows); broken[20].inputs = 0;
  assert.throws(() => validateObservation(report, broken, 'candidate-active', protocol), /input cadence/);
  const totals = structuredClone(rows); totals[20].cpu = 50;
  assert.throws(() => validateObservation(report, totals, 'candidate-active', protocol), /totals/);
  const idle = observation(); idle.report.inputCount = 1;
  assert.throws(() => validateObservation(idle.report, idle.rows, 'baseline-idle', protocol), /Final input/);
});

test('only explicit legacy current-monster migration defaults are normalized', () => {
  const old = {version: 4, equipment: {loadout: {weapon: null}}};
  assert.deepEqual(comparableFixture(old), comparableFixture({...old, monsterCurveVersion: 10, monsterCurveRebirths: 0}));
  assert.notDeepEqual(comparableFixture(old), comparableFixture({...old, monsterCurveVersion: 11}));
  assert.notDeepEqual(comparableFixture(old), comparableFixture({...old, equipment: {loadout: {weapon: 'different'}}}));
});

test('paired comparisons require serial unique fixtures, matched machines and frozen apps', () => {
  const observations = Object.fromEntries(SLOTS.map((slot, i) => [slot, observation(slot, i)]));
  assert.equal(evaluatePerformance(observations, protocol).passed, true);
  const overlap = structuredClone(observations); overlap['candidate-idle'].report.startedAt = overlap['candidate-active'].report.startedAt;
  overlap['candidate-idle'].report.finishedAt = overlap['candidate-active'].report.finishedAt;
  assert.throws(() => evaluatePerformance(overlap, protocol), /overlap/);
  const changed = structuredClone(observations); changed['candidate-active'].report.metadata.fixture.equipment = {different: true};
  assert.throws(() => evaluatePerformance(changed, protocol), /fixture differs/);
  const reused = structuredClone(observations); reused['candidate-idle'].report.isolation.userData = reused['baseline-idle'].report.isolation.userData;
  assert.throws(() => evaluatePerformance(reused, protocol), /same save directory/);
  const missing = structuredClone(observations); delete missing['baseline-active'];
  assert.throws(() => evaluatePerformance(missing, protocol), /four registered/);
});

test('a measured CPU regression fails instead of silently broadening the budget', () => {
  const observations = Object.fromEntries(SLOTS.map((slot, i) => [slot, observation(slot, i)]));
  const candidate = observations['candidate-active'];
  for (const row of candidate.rows) { row.cpu = 5; row.processes.forEach(process => process.cpu = 2.5); }
  candidate.report.summary.cpuP95 = 5;
  assert.equal(evaluatePerformance(observations, protocol).passed, false);
});

test('lifecycle binds exact main PID, save path and completed cleanup', () => {
  const {report, rows} = observation();
  const lifecycle = {version: 1, state: 'complete', cancelSignal: null, appPath: report.appPath, appHash: report.appHash,
    userData: report.isolation.userData, childPid: 1, startedAt: report.startedAt, cleanup: structuredClone(report.cleanup)};
  assert.doesNotThrow(() => validateLifecycle(lifecycle, report, rows));
  for (const change of [l => l.childPid++, l => l.userData = '/personal', l => l.cleanup.state = 'failed', l => l.cancelSignal = 'SIGTERM']) {
    const changed = structuredClone(lifecycle); change(changed); assert.throws(() => validateLifecycle(changed, report, rows));
  }
});

test('serial observations cannot launch another app during prior cleanup', () => {
  const lifecycles = [
    {startedAt: '2026-09-18T00:00:00Z', cleanup: {finishedAt: '2026-09-18T00:30:10Z'}},
    {startedAt: '2026-09-18T00:30:10Z', cleanup: {finishedAt: '2026-09-18T01:00:20Z'}},
  ];
  assert.doesNotThrow(() => validateSerialLifecycles(lifecycles));
  lifecycles[1].startedAt = '2026-09-18T00:30:05Z';
  assert.throws(() => validateSerialLifecycles(lifecycles), /lifetimes overlap/);
});
