import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';
import {artifactHash, validateInstalledCopy, validateReceipts, validateReviews, validateLatency, validateNative,
  validatePipeline, validatePipelineTrace, timestampRoundingErrorMs, validateReleaseCommands, validateVendor, REVIEW_SCOPES, NATIVE_SCENARIOS, LATENCY_FAMILIES} from './final-check.mjs';
import {GATES, sha} from './run.mjs';
const asar = createRequire(import.meta.url)('@electron/asar');
const protocol = JSON.parse(readFileSync(new URL('../../docs/v0.11/PERFORMANCE_PROTOCOL.json', import.meta.url)));
const fixture = fn => {
  const root = mkdtempSync(join(tmpdir(), 'desmon-v11-check-')), cleanup = () => rmSync(root, {recursive: true, force: true});
  try {const result = fn(root); if (result?.then) return result.finally(cleanup); cleanup(); return result;} catch (error) {cleanup(); throw error;}
};
const scripts = {'dist/electron/main/ipc.js': 'let action = narrowAction(payload);\n',
  'dist/web/renderer/game.js': 'const events = engine.apply(a);\nhandleEvents(events, verdictScene);\n'};
const pipeline = (i, action) => {
  const key = JSON.stringify([action.type, action.itemId ?? null, action.replaceId ?? null, action.revision ?? null]);
  const clock = () => ({rendererTimeOrigin: 100000, offsetLowMs: -1 - .1 - timestampRoundingErrorMs(120001), offsetHighMs: 1 + .1 + timestampRoundingErrorMs(120001),
    resolution: {basis: 'chromium-time-clamper', chromiumVersion: '142.0.7444.265', crossOriginIsolated: false, quantumMs: .1, maxErrorMs: .1,
      observations: ['before', 'after'].map(phase => ({phase, rendererTimeOrigin: 100000, chromiumVersion: '142.0.7444.265', crossOriginIsolated: false,
        values: Array.from({length: 64}, (_, index) => (phase === 'before' ? 0 : 20001) + index / 10), iterations: 640}))},
    probes: [{phase: 'before', mainBeforeEpochMs: 100009, rendererTimeOrigin: 100000, rendererAt: 10, mainAfterEpochMs: 100011},
      {phase: 'after', mainBeforeEpochMs: 119999, rendererTimeOrigin: 100000, rendererAt: 20000, mainAfterEpochMs: 120001}]});
  return {basis: 'cdp-conditional-false', key, pauseCount: 0, calibration: {id: 'test-batch', menu: clock(), field: clock()},
    events: Object.fromEntries([['ipcEntry', 5], ['applyStart', 10], ['applyEnd', 11]].map(([role, offset]) =>
      [role, [{key, timeOrigin: 100000, at: 100 + i * 100 + offset, ...(role === 'applyEnd' ? {error: null} : {})}]])),
    locations: Object.fromEntries(['ipcEntry', 'applyStart', 'applyEnd'].map(role => {
      const sourcePath = role === 'ipcEntry' ? 'dist/electron/main/ipc.js' : 'dist/web/renderer/game.js';
      return [role, {scriptId: sourcePath, url: 'file:///fixture/app.asar/' + sourcePath, lineNumber: role === 'applyEnd' ? 1 : 0,
        columnNumber: 0, scriptSha256: sha(scripts[sourcePath]), sourcePath}];
    }))};
};
const latency = () => ({families: LATENCY_FAMILIES.map(name => ({name, visualMs: Array(100).fill(20), resultMs: Array(100).fill(name === 'equipment-actions' ? 50 : 20),
  samples: Array.from({length: 100}, (_, i) => {
    const action = {type: 'equipmentEquip', itemId: 'e1', revision: i};
    return {family: name, selector: '#control', eventType: 'click', isTrusted: true, timeOrigin: 100000,
      clickAt: 100 + i * 100, paintAt: 120 + i * 100, resultAt: 100 + i * 100 + (name === 'equipment-actions' ? 50 : 20),
      ...(name === 'equipment-actions' ? {actionResultAt: 130 + i * 100, resultBasis: 'production-onActionResult-and-painted-feedback',
        result: {ok: true, action}, pipeline: pipeline(i, action)} : {})};
  })}))});
const trace = samples => ({basis: 'cdp-conditional-false', pauseCount: 0,
  calibration: structuredClone(samples[0].pipeline.calibration), locations: structuredClone(samples[0].pipeline.locations),
  ...Object.fromEntries([['main', ['ipcEntry']], ['field', ['applyStart', 'applyEnd']]].map(([context, roles]) =>
    [context, {overflow: false, rows: samples.flatMap(sample => roles.flatMap(stage =>
      sample.pipeline.events[stage].map(event => ({...event, stage}))))}]))});

test('package identity includes contents and symlink destinations without following cycles', () => fixture(root => {
  writeFileSync(join(root, 'file'), 'one'); symlinkSync('.', join(root, 'cycle'));
  const hash = artifactHash(root); assert.equal(artifactHash(root), hash);
  writeFileSync(join(root, 'file'), 'two'); assert.notEqual(artifactHash(root), hash);
}));

test('same version with a different payload or native file fails installer equivalence', () => fixture(root => {
  for (const directory of ['actual', 'installed']) {
    mkdirSync(join(root, directory)); writeFileSync(join(root, directory, 'package.json'), '{"version":"0.11.0"}');
    writeFileSync(join(root, directory, 'app.asar'), 'new'); writeFileSync(join(root, directory, 'native.node'), 'native');
  }
  assert.doesNotThrow(() => validateInstalledCopy(join(root, 'actual'), join(root, 'installed')));
  writeFileSync(join(root, 'installed', 'app.asar'), 'old');
  assert.throws(() => validateInstalledCopy(join(root, 'actual'), join(root, 'installed')), /payload differs/);
}));

test('latest failed gate or altered AC rejects prior success; final task has no circular receipt', () => fixture(run => {
  const log = join(run, 'log'); writeFileSync(log, 'passed');
  const receipt = {before: 'source', after: 'source', exitCode: 0, log, logHash: sha('passed'), artifacts: {}, at: '2026-09-18T00:00:00Z'};
  const definitions = [{id: 'V11-01', ac: 'node check.mjs {runDir}'}, {id: 'V11-08', ac: 'node final-check.mjs final'}];
  const task = {id: 'V11-01', status: 'verified', verifiedSource: 'source', checks: [
    {...receipt, id: 'ac', command: `node check.mjs '${run}'`}, {...receipt, id: 'gates', command: GATES}]};
  const journal = {version: 11, run, tasks: [task, {id: 'V11-08', status: 'running', checks: []}]};
  assert.doesNotThrow(() => validateReceipts(journal, 'source', run, definitions));
  task.checks.push({...receipt, id: 'gates', command: GATES, exitCode: 1, at: '2026-09-18T01:00:00Z'});
  assert.throws(() => validateReceipts(journal, 'source', run, definitions), /Latest canonical/);
  task.checks.pop(); task.checks[0].command = 'echo approved';
  assert.throws(() => validateReceipts(journal, 'source', run, definitions), /Latest AC/);
}));

test('independent scope reviews require actual authors, reviewed source and external limitations', () => fixture(root => {
  const evidence = join(root, 'review.md'); writeFileSync(evidence, 'Reviewed');
  const reviews = Object.entries(REVIEW_SCOPES).map(([scope, definition]) => ({scope, reviewer: '/root/independent',
    implementedBy: definition.authors, verdict: 'approved', evidence: {path: evidence, sha256: sha('Reviewed')},
    sourceHashes: Object.fromEntries(definition.files.map(path => {
      mkdirSync(dirname(join(root, path)), {recursive: true}); writeFileSync(join(root, path), 'source'); return [path, sha('source')];
    }))}));
  const document = {version: 11, source: 'current', passed: true, reviews,
    externalChecks: Object.fromEntries(['windowsHardware', 'postgresql', 'humanFun', 'productionDeploy'].map(key => [key, {performed: false, note: 'Not performed'}]))};
  assert.doesNotThrow(() => validateReviews(document, 'current', root));
  reviews[0].reviewer = reviews[0].implementedBy[0]; assert.throws(() => validateReviews(document, 'current', root), /Self-approval/);
  reviews[0].reviewer = '/root/independent'; reviews[0].implementedBy = [];
  assert.throws(() => validateReviews(document, 'current', root), /provenance/);
  reviews[0].implementedBy = REVIEW_SCOPES.core.authors;
  writeFileSync(join(root, 'src/core/equipment.ts'), 'new'); assert.throws(() => validateReviews(document, 'current', root), /source changed/);
}));

test('latency budgets require all families, paired finite samples and enough observations', () => {
  assert.equal(validateLatency(latency(), protocol).length, 4);
  for (const change of [l => l.families.pop(), l => l.families[0].visualMs.pop(),
    l => l.families[0].resultMs[0] = NaN, l => l.families[1].visualMs.fill(101), l => l.families[2].resultMs.fill(251)]) {
    const changed = latency(); change(changed); assert.throws(() => validateLatency(changed, protocol));
  }
});

test('latency summaries cannot detach from trusted raw events or duplicate one click', () => {
  for (const change of [l => delete l.families[0].samples, l => l.families[0].samples[0].isTrusted = false,
    l => l.families[0].samples[0].selector = '', l => l.families[0].samples[0].paintAt++,
    l => l.families[0].samples[0].resultAt++, l => l.families[0].samples[1] = l.families[0].samples[0],
    l => l.families[3].samples[0].result.ok = false, l => l.families[3].samples[0].actionResultAt = 151,
    l => l.families[3].samples[0].resultBasis = 'local-ui-double-rAF']) {
    const changed = latency(); change(changed); assert.throws(() => validateLatency(changed, protocol));
  }
});

test('IPC/apply stages require source-bound events rather than ACK substitution', () => {
  const sample = () => latency().families[3].samples[0], readScript = path => Buffer.from(scripts[path]);
  const measured = validatePipeline(sample(), readScript);
  assert.equal(measured.applyDurationMs, 1);
  assert.equal(measured.calibrationWidthMs.menu, 2 * (1 + .1 + timestampRoundingErrorMs(120001)));
  assert.equal(measured.applyDurationErrorMs, 2 * (.1 + timestampRoundingErrorMs(100111)));
  for (const change of [s => delete s.pipeline, s => s.pipeline.pauseCount++,
    s => s.pipeline.events.applyEnd = [], s => s.pipeline.events.ipcEntry.push(s.pipeline.events.ipcEntry[0]),
    s => s.pipeline.events.applyEnd[0].key = 'unrelated', s => s.pipeline.events.applyEnd[0].error = 'rejected',
    s => s.pipeline.events.applyEnd[0].at = s.actionResultAt + 10,
    s => s.pipeline.events.applyStart[0].at = s.pipeline.events.applyEnd[0].at + 1,
    s => s.pipeline.locations.applyEnd.sourcePath = 'dist/web/renderer/index.js',
    s => s.pipeline.locations.applyEnd.lineNumber = 0,
    s => s.pipeline.locations.ipcEntry.scriptSha256 = '0'.repeat(64)]) {
    const changed = sample(); change(changed); assert.throws(() => validatePipeline(changed, readScript));
  }
});

test('raw clock calibration brackets actions and exposes unresolved intervals without excusing inversions', () => {
  const sample = () => latency().families[3].samples[0];
  const overlap = sample(); overlap.pipeline.events.ipcEntry[0].at = overlap.clickAt;
  assert.equal(validatePipeline(overlap).stages[0].orderResolved, false);
  for (const change of [s => s.pipeline.calibration.menu.offsetLowMs = -1000,
    s => s.pipeline.calibration.menu.probes.pop(),
    s => s.pipeline.calibration.field.probes[1].rendererAt += 10,
    s => s.pipeline.calibration.menu.probes[0].phase = 'after',
    s => s.timeOrigin++, s => s.pipeline.events.ipcEntry[0].at = s.clickAt - 10,
    s => {const p = s.pipeline.calibration.menu.probes[1]; p.mainBeforeEpochMs -= 19950; p.mainAfterEpochMs -= 19950; p.rendererAt -= 19950;}]) {
    const changed = sample(); change(changed); assert.throws(() => validatePipeline(changed));
  }
});

test('pinned timestamp quantization explains sub-quantum gaps but never excuses larger clock drift', () => {
  const sample = () => latency().families[3].samples[0];
  const adjust = (clock, shift) => {
    clock.probes[1].rendererAt += shift;
    const allowances = clock.probes.map(p => .1 + timestampRoundingErrorMs(Math.max(p.rendererTimeOrigin + p.rendererAt, p.mainBeforeEpochMs, p.mainAfterEpochMs)));
    clock.offsetLowMs = Math.max(...clock.probes.map((p, i) => p.rendererTimeOrigin + p.rendererAt - p.mainAfterEpochMs - allowances[i]));
    clock.offsetHighMs = Math.min(...clock.probes.map((p, i) => p.rendererTimeOrigin + p.rendererAt - p.mainBeforeEpochMs + allowances[i]));
  };
  const quantized = sample();
  // Raw intervals [-.04,.04] and [.06,.14] miss by .02ms, within the known100µs jitter.
  for (const clock of [quantized.pipeline.calibration.menu, quantized.pipeline.calibration.field]) {
    for (const p of clock.probes) {const epoch = p.rendererTimeOrigin + p.rendererAt; p.mainBeforeEpochMs = epoch - .04; p.mainAfterEpochMs = epoch + .04;}
    adjust(clock, .1);
  }
  assert.doesNotThrow(() => validatePipeline(quantized));
  const drifted = structuredClone(quantized); adjust(drifted.pipeline.calibration.menu, 1);
  assert.throws(() => validatePipeline(drifted), /drift\/disagree/);
  for (const change of [s => s.pipeline.calibration.menu.resolution.maxErrorMs = 100,
    s => s.pipeline.calibration.menu.resolution.quantumMs = .005,
    s => s.pipeline.calibration.menu.resolution.chromiumVersion = 'newer',
    s => s.pipeline.calibration.menu.resolution.crossOriginIsolated = true,
    s => s.pipeline.calibration.menu.resolution.observations[0].values[1] = .05,
    s => s.pipeline.calibration.menu.resolution.observations.pop()]) {
    const changed = sample(); change(changed); assert.throws(() => validatePipeline(changed));
  }
});

test('grouped pipeline samples cannot hide duplicate stages or detach from the complete trace', () => {
  const samples = latency().families[3].samples;
  assert.doesNotThrow(() => validatePipelineTrace(trace(samples), samples));
  for (const change of [t => t.main.rows.pop(), t => t.field.rows.push({...t.field.rows.at(-1)}),
    t => t.main.overflow = true, t => t.pauseCount = 1, t => t.locations.ipcEntry.scriptId = 'other',
    t => t.field.rows[0].at += .1]) {
    const changed = trace(samples); change(changed); assert.throws(() => validatePipelineTrace(changed, samples));
  }
});

test('latest release command must pass for current source with its intact log', () => fixture(root => {
  const log = join(root, 'log'); writeFileSync(log, 'pass');
  const commands = ['npm run smoke', 'npm run package', 'npm run package:win'].map(command =>
    ({command, exitCode: 0, log, logHash: sha('pass'), before: 'source', after: 'source'}));
  const record = {version: '0.11.0', source: 'source', commands};
  assert.doesNotThrow(() => validateReleaseCommands(record, 'source'));
  record.commands.push({...commands[0], exitCode: 1}); assert.throws(() => validateReleaseCommands(record, 'source'), /Latest release/);
  record.commands.pop(); writeFileSync(log, 'edited'); assert.throws(() => validateReleaseCommands(record, 'source'), /Latest release/);
}));

test('native reports bind all scenarios, current app, screenshots, isolation and latency', () => fixture(async root => {
  const app = join(root, 'app.asar'), launcher = join(root, '.harness/v10/launcher.mjs');
  const payload = join(root, 'payload');
  for (const [path, text] of Object.entries(scripts)) {mkdirSync(dirname(join(payload, path)), {recursive: true}); writeFileSync(join(payload, path), text);}
  await asar.createPackage(payload, app);
  mkdirSync(dirname(launcher), {recursive: true}); writeFileSync(launcher, 'launcher');
  const artifacts = {}, shots = NATIVE_SCENARIOS.map((name, index) => {
    const bytes = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes); bytes.writeUInt32BE(index + 1, 16); bytes.writeUInt32BE(1, 20);
    const path = join(root, name + '.png'); writeFileSync(path, bytes); artifacts[path] = sha(bytes); return {path, sha256: sha(bytes)};
  });
  const runtime = {passed: true, metadata: {version: '0.11.0', runtime: {chrome: '142.0.7444.265'}}, appHash: sha(readFileSync(app)), appUnchanged: true,
    launcherHash: sha('launcher'), exitCode: 0, signal: null, errors: [],
    packageBinding: {passed: true, checked: 1, mismatches: []}, isolation: {globalHooks: false, permissionPrompts: false},
    diagnostics: {errors: [], hookLoads: 0, permissionCalls: [{prompt: false}]}};
  const measured = latency();
  const report = {version: 11, source: 'source', sourceUnchanged: true, passed: true, errors: [], artifacts, latency: measured,
    attempts: NATIVE_SCENARIOS.map((name, i) => {
      const samples = measured.families.filter(family => name === 'menu-live-updates' ? family.name !== 'equipment-actions' :
        name === 'manual-equipment' && family.name === 'equipment-actions').flatMap(family => family.samples);
      return {name, runtime: structuredClone(runtime), ui: {passed: true, checks: [{name: 'state matches', passed: true}], screenshots: [shots[i]], samples,
        ...(name === 'manual-equipment' ? {pipelineTrace: trace(samples)} : {})}};
    })};
  assert.doesNotThrow(() => validateNative(report, 'source', app, protocol, root));
  report.attempts[0].runtime.metadata.version = '0.10.0'; assert.throws(() => validateNative(report, 'source', app, protocol, root), /Failed native/);
  report.attempts[0].runtime.metadata.version = '0.11.0'; delete report.artifacts[shots[0].path];
  assert.throws(() => validateNative(report, 'source', app, protocol, root), /Screenshot omitted/);
}));

test('the pinned vendor subset and unmodified upstream hashes verify', () => {
  assert.deepEqual(validateVendor(), {commit: 'b105e1cf617adf0b68ed98790a716bbb60993179', files: 10});
});
