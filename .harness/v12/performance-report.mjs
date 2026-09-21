#!/usr/bin/env node
// Verify existing observations only; this CLI never launches or changes an app.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual as equal, parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_PROTOCOL = resolve(ROOT, 'docs/v0.12/PERFORMANCE_PROTOCOL.json');
const OBSERVER = resolve(ROOT, '.harness/v10/performance-v4.mjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw Error(message); };
const requireThat = (condition, message) => { if (!condition) fail(message); };
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
const close = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-8 * Math.max(1, a, b);
const stats = values => ({ samples: values.length, min: Math.min(...values), median: quantile(values, .5), p95: quantile(values, .95), max: Math.max(...values) });
export const COVERAGE = Object.freeze({ minimumFraction: .95, maximumGapSamples: 2, inputJitter: 2 });
export const SLOTS = ['baseline-active', 'baseline-idle', 'candidate-active', 'candidate-idle'];

export function validateProtocol(document) {
  const p = document?.performance;
  requireThat(document?.version === '0.12.0' && document.baselineVersion === '0.11.0' &&
    document.observer === '.harness/v10/performance-v4.mjs' && equal(document.slots, SLOTS) &&
    p?.sampleMs === 5000 && p.warmupMinutes === 5 && p.comparisonMinutes === 30 &&
    equal(p.comparisonProfiles, ['active', 'idle']) && p.crashUnresponsiveSaveProgressErrorsAllowed === 0,
  'Unregistered performance schedule or observer.');
  requireThat(equal(p.cpuP95Max, { baselineMultiplier: 1.1, baselineAddPercentagePoints: 1 }) &&
    equal(p.workingSetP95Max, { baselineMultiplier: 1.2, baselineAddMiB: 50 }) &&
    equal(document.latency, { samplesPerFamily: 100, visualP95Ms: 100, localResultP95Ms: 250 }),
  'Unregistered performance budget.');
  return p;
}

export function comparableFixture(fixture) {
  const value = structuredClone(fixture);
  // The same legacy observer fixture retains its v10 current monster in v11.
  // These are the only new defaults; equipment and all other save data must match.
  value.monsterCurveVersion ??= 10;
  value.monsterCurveRebirths ??= 0;
  return value;
}
export function observerVersions() {
  const observer = {path: OBSERVER, sha256: hash(readFileSync(OBSERVER))};
  return {baseline: observer, candidate: {...observer}};
}

function expectation(slot, p) {
  requireThat(SLOTS.includes(slot), 'Unknown observation slot.');
  return {profile: slot.split('-')[1], minutes: p.comparisonMinutes,
    version: slot.startsWith('baseline-') ? '0.11.0' : '0.12.0', saveVersion: 4};
}

function activeMilliseconds(profile, elapsed) { return profile === 'active' ? elapsed : 0; }

/** Pure validation; artifact hashes are additionally checked by createReport. */
export function validateObservation(report, rows, slot, document) {
  const p = validateProtocol(document), expected = expectation(slot, p);
  const duration = expected.minutes * 60000, maxGap = p.sampleMs * COVERAGE.maximumGapSamples;
  const label = message => `${slot}: ${message}`;
  requireThat(report?.version === 1 && report.profile === expected.profile && report.requestedMinutes === expected.minutes &&
    report.metadata?.version === expected.version && report.passed === true, label('Incomplete or wrong observation.'));
  requireThat(report.checks && ['duration', 'metrics', 'samples', 'progress', 'inputs', 'errors', 'appUnchanged', 'observerUnchanged']
    .every(key => report.checks[key] === true), label('Observer checks did not pass.'));
  requireThat(Array.isArray(report.errors) && report.errors.length === 0, label('Observer errors present.'));
  requireThat(report.exitCode === 0 && report.exitSignal === null, label('Packaged process did not exit cleanly.'));
  requireThat(report.cancelSignal === null && report.cleanup?.state === 'complete' &&
    equal(report.cleanup.remaining, []), label('Interrupted observation or incomplete owned-process cleanup.'));
  requireThat(finite(report.observationMs) && report.observationMs >= duration && report.observationMs <= duration + maxGap,
    label('Actual observation duration does not cover the registered window.'));
  const wallMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  requireThat(finite(wallMs) && wallMs >= report.observationMs - 1000 && wallMs <= report.observationMs + maxGap,
    label('Wall timestamps disagree with elapsed observation.'));
  requireThat(report.isolation?.globalHooks === false && report.isolation.osPermissionPrompts === false && report.isolation.network === 'offline' &&
    report.isolation.input === 'synthetic production IPC' && report.isolation.time === 'real wall time; no engine ticks injected' &&
    typeof report.isolation.userData === 'string', label('Isolation contract differs.'));
  requireThat(report.machine?.platform === 'darwin' && report.machine.arch === 'arm64' &&
    typeof report.machine.os === 'string' && typeof report.machine.cpu === 'string' && integer(report.machine.logicalCpus) && report.machine.logicalCpus > 0 &&
    typeof report.metadata.runtime?.electron === 'string', label('Missing Mac/runtime identity.'));
  requireThat(Array.isArray(rows) && rows.length === report.raw?.samples && rows.length >= duration / p.sampleMs * COVERAGE.minimumFraction,
    label('Too few raw samples.'));
  const fixture = report.metadata.fixture;
  requireThat(fixture?.version === expected.saveVersion && fixture.level === 1 && fixture.killCount === 0 && fixture.coins === '0' &&
    Array.isArray(fixture.companions) && fixture.companions.length === 5 && fixture.companions.every((c, i) =>
      c.id === `c${i + 1}` && c.speciesId === 'slime' && c.bossIndex === 7 && c.level === 1 && c.stars === 0), label('Wrong warm-idle fixture.'));
  // The preserved observer's legacy-shaped fixture has no progress field; engine migration starts its clock at zero.
  const initialPlayTime = fixture.progress?.playTimeMs ?? 0;
  requireThat(finite(initialPlayTime), label('Fixture play time is missing.'));
  let previousMs = 0, previousInputs = 0, previousPlayTime = initialPlayTime, previousKills = fixture.killCount, browserIdentity, fieldIdentity;
  const elapsedGaps = [], initialFixtureSamples = [];
  for (const row of rows) {
    const gap = row.elapsedMs - previousMs;
    requireThat(finite(row.elapsedMs) && gap > 0 && gap <= maxGap && row.elapsedMs <= report.observationMs + maxGap,
      label('Sample cadence has a missing or unordered interval.'));
    elapsedGaps.push(gap);
    requireThat(Array.isArray(row.errors) && row.errors.length === 0, label('Raw sample contains errors.'));
    requireThat(Array.isArray(row.processes) && row.processes.length > 0 && row.processes.every(process => integer(process.pid) && process.pid > 0 &&
      finite(process.creationTime) && typeof process.type === 'string' && finite(process.cpu) && finite(process.workingSetKiB)), label('Invalid process metrics.'));
    requireThat(new Set(row.processes.map(process => process.pid)).size === row.processes.length, label('Duplicate process metric.'));
    const browser = row.processes.filter(process => process.type === 'Browser');
    requireThat(browser.length === 1 && row.processes.some(process => process.type === 'Tab'), label('Main/renderer process missing.'));
    const identity = [browser[0].pid, browser[0].creationTime];
    if (browserIdentity) requireThat(equal(browserIdentity, identity), label('Main process restarted.'));
    browserIdentity = identity;
    if (!fieldIdentity) {
      const field = row.processes.find(process => process.type === 'Tab');
      fieldIdentity = [field.pid, field.creationTime];
    }
    requireThat(row.processes.some(process => process.type === 'Tab' && equal([process.pid, process.creationTime], fieldIdentity)), label('Field renderer restarted or disappeared.'));
    requireThat(close(row.cpu, row.processes.reduce((sum, process) => sum + process.cpu, 0)) &&
      close(row.workingSetMiB, row.processes.reduce((sum, process) => sum + process.workingSetKiB / 1024, 0)), label('Metric totals differ from raw processes.'));
    const expectedInputs = activeMilliseconds(expected.profile, row.elapsedMs, p) / 500;
    const expectedDelta = expectedInputs - activeMilliseconds(expected.profile, previousMs, p) / 500;
    requireThat(integer(row.inputs) && row.inputs >= previousInputs && row.inputs >= expectedInputs * COVERAGE.minimumFraction - COVERAGE.inputJitter &&
      row.inputs <= Math.ceil(expectedInputs) + COVERAGE.inputJitter && row.inputs - previousInputs <= Math.ceil(expectedDelta) + COVERAGE.inputJitter,
    label('Synthetic input cadence differs.'));
    if (expectedDelta === 0) requireThat(row.inputs === previousInputs, label('Input occurred during an idle phase.'));
    // The first sample can precede the first periodic save. Only an unchanged
    // initial fixture may use its known initial clock; the existing lag bound
    // below still rejects it after 10 seconds or after any persisted progress.
    const initialFixture = row.save?.progress?.playTimeMs === undefined &&
      previousPlayTime === initialPlayTime && equal(row.save, fixture);
    const playTime = initialFixture ? initialPlayTime : row.save?.progress?.playTimeMs;
    if (initialFixture) initialFixtureSamples.push(row.elapsedMs);
    requireThat(row.save?.version === expected.saveVersion && integer(row.save.killCount) && row.save.killCount >= previousKills && finite(playTime) && playTime >= previousPlayTime &&
      Math.abs((playTime - initialPlayTime) - row.elapsedMs) <= maxGap, label('Persisted play time is stale, reset, or accelerated.'));
    previousMs = row.elapsedMs; previousInputs = row.inputs; previousPlayTime = playTime; previousKills = row.save.killCount;
  }
  requireThat(previousMs >= duration && previousMs - duration <= maxGap, label('Last raw sample ends before the registered duration.'));
  // The required terminal menu capture runs after the last raw sample. The
  // unchanged observer keeps its timer alive until that capture completes.
  // Apply the same schedule/cadence bounds to this measured closeout interval,
  // and report its inputs separately from the registered observation window.
  const closeoutMs = report.observationMs - previousMs;
  const closeoutExpected = (activeMilliseconds(expected.profile, report.observationMs, p) - activeMilliseconds(expected.profile, previousMs, p)) / 500;
  const closeoutInputs = report.inputCount - previousInputs;
  requireThat(finite(closeoutMs) && closeoutMs <= maxGap && integer(report.inputCount) && integer(closeoutInputs) &&
    (closeoutExpected === 0 ? closeoutInputs === 0 : closeoutInputs >= closeoutExpected * COVERAGE.minimumFraction - COVERAGE.inputJitter &&
      closeoutInputs <= Math.ceil(closeoutExpected) + COVERAGE.inputJitter),
    label('Final input count differs from raw.'));
  if (expected.profile === 'idle') requireThat(report.inputCount === 0, label('Idle observation recorded input.'));
  requireThat(report.finalSave?.version === expected.saveVersion && integer(report.finalSave.killCount) && report.finalSave.killCount >= previousKills && report.finalSave.killCount > fixture.killCount &&
    finite(report.finalSave.progress?.playTimeMs) && report.finalSave.progress.playTimeMs >= previousPlayTime &&
    Math.abs(report.finalSave.progress.playTimeMs - initialPlayTime - report.observationMs) <= maxGap,
  label('Final save does not demonstrate preserved progress.'));
  const phaseMs = duration;
  const phases = [];
  for (let start = 0; start < duration; start += phaseMs) {
    const end = Math.min(duration, start + phaseMs), selected = rows.filter(row => row.elapsedMs >= start && row.elapsedMs <= end);
    const first = start === 0 ? { elapsedMs: 0, inputs: 0 } : selected[0], last = selected.at(-1);
    requireThat(first && last && first.elapsedMs - start <= maxGap && end - last.elapsedMs <= maxGap, label('Incomplete input phase.'));
    const intended = (activeMilliseconds(expected.profile, last.elapsedMs, p) - activeMilliseconds(expected.profile, first.elapsedMs, p)) / 500;
    const actual = last.inputs - first.inputs;
    requireThat(intended === 0 ? actual === 0 : actual >= intended * COVERAGE.minimumFraction - COVERAGE.inputJitter,
      label('An active/idle phase does not satisfy its input schedule.'));
    phases.push({ startMs: start, endMs: end, measuredFromMs: first.elapsedMs, measuredThroughMs: last.elapsedMs, expectedInputs: intended, actualInputs: actual });
  }
  const stable = rows.filter(row => row.elapsedMs >= p.warmupMinutes * 60000);
  requireThat(stable.length >= (duration - p.warmupMinutes * 60000) / p.sampleMs * COVERAGE.minimumFraction, label('Insufficient samples after warmup.'));
  // The unchanged observer always reports its original [5,35] and [150,+inf)
  // memory windows. Verify those values without treating this 30-minute run as a soak.
  const initial = rows.filter(row => row.elapsedMs >= 300000 && row.elapsedMs <= 2100000);
  const final = rows.filter(row => row.elapsedMs >= 9000000);
  const summary = { cpuP95: quantile(stable.map(row => row.cpu), .95), workingSetMiBP95: quantile(stable.map(row => row.workingSetMiB), .95),
    initialMemoryMedian: initial.length ? quantile(initial.map(row => row.workingSetMiB), .5) : null,
    finalMemoryMedian: final.length ? quantile(final.map(row => row.workingSetMiB), .5) : null };
  requireThat(equal(summary, report.summary), label('Reported quantiles differ from raw.'));
  const expectedTotal = activeMilliseconds(expected.profile, duration, p) / 500;
  return { slot, profile: expected.profile, durationMs: report.observationMs, rawSamples: rows.length, stableSamples: stable.length,
    maximumSampleGapMs: Math.max(...elapsedGaps), initialFixtureSamples, cpu: stats(stable.map(row => row.cpu)), workingSetMiB: stats(stable.map(row => row.workingSetMiB)), summary,
    input: { actual: previousInputs, expected: expectedTotal, fraction: expectedTotal ? previousInputs / expectedTotal : null, phases,
      closeout: { elapsedMs: closeoutMs, expectedInputs: closeoutExpected, actualInputs: closeoutInputs, totalAtShutdown: report.inputCount } } };
}

export function evaluatePerformance(observations, document) {
  const p = validateProtocol(document);
  requireThat(equal(Object.keys(observations).sort(), [...SLOTS].sort()), 'Exactly four registered observations are required.');
  const verified = Object.fromEntries(SLOTS.map(slot => [slot, validateObservation(observations[slot].report, observations[slot].rows, slot, document)]));
  const reports = SLOTS.map(slot => observations[slot].report), first = reports[0];
  requireThat(reports.every(report => equal(report.machine, first.machine) && equal(report.metadata.runtime, first.metadata.runtime) &&
    equal(comparableFixture(report.metadata.fixture), comparableFixture(first.metadata.fixture))), 'Machine/runtime/fixture differs between observations.');
  requireThat(new Set(reports.map(report => report.isolation.userData)).size === reports.length, 'Observations reused the same save directory.');
  const chronological = [...reports].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  requireThat(chronological.slice(1).every((report, i) => Date.parse(report.startedAt) >= Date.parse(chronological[i].finishedAt)), 'Performance observations overlap.');
  requireThat(reports[0].appHash === reports[1].appHash && reports.slice(2).every(report => report.appHash === reports[2].appHash) && reports[0].appHash !== reports[2].appHash,
    'Package identity differs within baseline or candidate observations.');
  const comparisons = p.comparisonProfiles.map(profile => {
    const baseline = verified[`baseline-${profile}`], candidate = verified[`candidate-${profile}`];
    const cpuLimit = Math.max(baseline.cpu.p95 * p.cpuP95Max.baselineMultiplier, baseline.cpu.p95 + p.cpuP95Max.baselineAddPercentagePoints);
    const memoryLimit = Math.max(baseline.workingSetMiB.p95 * p.workingSetP95Max.baselineMultiplier, baseline.workingSetMiB.p95 + p.workingSetP95Max.baselineAddMiB);
    return { profile, cpu: { baseline: baseline.cpu.p95, candidate: candidate.cpu.p95, limit: cpuLimit, passed: candidate.cpu.p95 <= cpuLimit },
      workingSetMiB: { baseline: baseline.workingSetMiB.p95, candidate: candidate.workingSetMiB.p95, limit: memoryLimit, passed: candidate.workingSetMiB.p95 <= memoryLimit } };
  });
  return { passed: comparisons.every(pair => pair.cpu.passed && pair.workingSetMiB.passed), observations: verified, comparisons };
}

function readHashed(path, expected, label) {
  path = resolve(path);
  const bytes = readFileSync(path), sha256 = hash(bytes);
  requireThat(typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected) && sha256 === expected, `${label} hash differs: ${path}`);
  return { path, sha256, bytes };
}

export function validateLifecycle(lifecycle, report, rows) {
  requireThat(lifecycle?.version === 1 && lifecycle.state === 'complete' && lifecycle.cancelSignal === null &&
    lifecycle.appPath === report.appPath && lifecycle.appHash === report.appHash &&
    lifecycle.userData === report.isolation.userData && equal(lifecycle.cleanup, report.cleanup) &&
    lifecycle.childPid === rows[0]?.processes.find(process => process.type === 'Browser')?.pid &&
    Date.parse(lifecycle.startedAt) <= Date.parse(report.startedAt) &&
    Date.parse(lifecycle.cleanup.finishedAt) >= Date.parse(report.finishedAt),
  'Lifecycle does not bind the completed observation and owned main process.');
}

export function validateSerialLifecycles(lifecycles) {
  const ordered = [...lifecycles].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  requireThat(ordered.every((entry, i) => Number.isFinite(Date.parse(entry.startedAt)) &&
    Number.isFinite(Date.parse(entry.cleanup?.finishedAt)) && Date.parse(entry.cleanup.finishedAt) >= Date.parse(entry.startedAt) &&
    (i === 0 || Date.parse(entry.startedAt) >= Date.parse(ordered[i - 1].cleanup.finishedAt))),
  'Application launch/cleanup lifetimes overlap.');
}

export function createReport(inputPaths, protocolPath = DEFAULT_PROTOCOL) {
  const protocolBytes = readFileSync(protocolPath), document = JSON.parse(protocolBytes), p = validateProtocol(document);
  const observers = observerVersions(), observations = {}, artifacts = {}, lifecycles = [];
  requireThat(equal(Object.keys(inputPaths).sort(), [...SLOTS].sort()) && new Set(Object.values(inputPaths).map(path => resolve(path))).size === 4,
    'Provide four different observation reports.');
  for (const slot of SLOTS) {
    const path = resolve(inputPaths[slot]), bytes = readFileSync(path), report = JSON.parse(bytes);
    requireThat(report.observerHash === observers[slot.startsWith('baseline-') ? 'baseline' : 'candidate'].sha256, `${slot}: observer source no longer matches the recorded hash.`);
    readHashed(resolve(report.appPath, 'Contents/Resources/app.asar'), report.appHash, 'Packaged app');
    const raw = readHashed(report.raw.path, report.raw.sha256, 'Raw samples');
    const rows = raw.bytes.toString('utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const lifecycleBytes = readFileSync(report.lifecyclePath);
    const lifecycle = JSON.parse(lifecycleBytes);
    validateLifecycle(lifecycle, report, rows); lifecycles.push(lifecycle);
    const names = ['start', 'end'];
    requireThat(Array.isArray(report.screenshots) && equal(report.screenshots.map(item => item.name).sort(), names.sort()), `${slot}: required screenshots are missing or duplicated.`);
    const screenshots = report.screenshots.map(item => {
      const artifact = readHashed(item.path, item.sha256, 'Screenshot');
      requireThat(artifact.bytes.length >= 24 && artifact.bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' &&
        artifact.bytes.readUInt32BE(16) > 0 && artifact.bytes.readUInt32BE(20) > 0, `${slot}: invalid PNG screenshot.`);
      return { name: item.name, path: artifact.path, sha256: artifact.sha256 };
    });
    observations[slot] = { report, rows };
    artifacts[slot] = { path, sha256: hash(bytes), raw: { path: raw.path, sha256: raw.sha256 },
      lifecycle: {path: resolve(report.lifecyclePath), sha256: hash(lifecycleBytes)}, screenshots, appPath: report.appPath, appHash: report.appHash };
  }
  validateSerialLifecycles(lifecycles);
  return { version: 1, kind: 'v12-performance-comparison', ...evaluatePerformance(observations, document), artifacts,
    protocol: { path: resolve(protocolPath), sha256: hash(protocolBytes), performance: p }, observers,
    verifierHash: hash(readFileSync(fileURLToPath(import.meta.url))), coverage: COVERAGE,
    limitations: ['Regression budgets only; no battery-life or human-enjoyment claim.',
      'Synthetic input has measured scheduling loss; counts and closeout intervals are reported.',
      'Input counts describe emitted IPC events; engine progress is checked separately.',
      'Working-set sums may count shared pages more than once; they are not unique physical RAM.',
      'Permission/audio experience, environment power/thermal conditions, and successful menu choices need separate evidence.',
      'Hashes bind the available artifacts; they do not independently authenticate their original capture.'] };
}

async function main(args) {
  const options = Object.fromEntries([...SLOTS, 'protocol'].map(key => [key, { type: 'string' }]));
  const { values, positionals } = parseArgs({ args, options, allowPositionals: true });
  const [command, output] = positionals;
  if (command === 'verify' && output) {
    const saved = JSON.parse(readFileSync(resolve(output), 'utf8'));
    const report = createReport(Object.fromEntries(SLOTS.map(slot => [slot, saved.artifacts[slot].path])), saved.protocol.path);
    requireThat(equal(saved, report), 'Comparison report differs from its bound evidence.');
    console.log(JSON.stringify({ verified: true, passed: report.passed, output }));
    if (!report.passed) process.exitCode = 1;
  } else if (command === 'report' && output && SLOTS.every(slot => values[slot])) {
    requireThat(!existsSync(resolve(output)), 'Refusing to overwrite an existing performance report.');
    const report = createReport(Object.fromEntries(SLOTS.map(slot => [slot, values[slot]])), values.protocol ?? DEFAULT_PROTOCOL);
    mkdirSync(dirname(resolve(output)), { recursive: true });
    writeFileSync(resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output, passed: report.passed, comparisons: report.comparisons }));
    if (!report.passed) process.exitCode = 1;
  } else fail('Usage: performance-report.mjs report OUTPUT --baseline-active FILE --baseline-idle FILE --candidate-active FILE --candidate-idle FILE [--protocol FILE] | verify OUTPUT');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(String(error)); process.exitCode = 1; });
}
