#!/usr/bin/env node
// Current-source review/release checks. This verifier never launches the game.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, readlinkSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { ROOT, GATES, config, digest, manifest, receiptValid, sha } from './run.mjs';
import { createReport, SLOTS, validateProtocol } from './performance-report.mjs';
const require = createRequire(import.meta.url), asar = require('@electron/asar'), yaml = require('js-yaml');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
export function artifactHash(path) {
  path=resolve(path);
  if (!lstatSync(path).isDirectory()) return sha(readFileSync(path));
  const entries={};
  const visit=directory=>{for(const name of readdirSync(directory).sort()) {
    const file=join(directory,name), key=relative(path,file), stat=lstatSync(file);
    if(stat.isSymbolicLink())entries[key]={link:readlinkSync(file)};
    else if(stat.isDirectory())visit(file);
    else entries[key]=sha(readFileSync(file));
  }};
  visit(path); assert(Object.keys(entries).length,'Empty artifact directory');
  return sha(JSON.stringify(entries,null,2)+'\n');
}
function hashed(record) {
  assert(record&&typeof record.path==='string'&&/^[a-f0-9]{64}$/.test(record.sha256),'Missing artifact path/hash');
  assert.equal(artifactHash(record.path),record.sha256,'Artifact changed: '+record.path);
  return resolve(record.path);
}

export const REVIEW_SCOPES = Object.freeze({
  raidCore: {authors: ['/root/loop/balance'], files: ['src/core/raid.ts', 'src/core/engine.ts', 'src/core/equipment.ts', 'src/core/battle.ts',
    'src/core/collection.ts', 'src/shared/api.ts', 'tests/raidCore.test.ts', 'docs/v0.12/EVALUATION_PROTOCOL.json', 'docs/v0.12/BALANCE_CANDIDATE.json',
    '.harness/v12/raid-balance.mjs']},
  raidServer: {authors: ['/root/loop/host'], files: ['src/server/raid.ts', 'src/server/app.ts', 'src/server/store.ts', 'src/server/pgStore.ts',
    'src/server/probe.ts', 'tests/server/raid.test.ts', 'tests/server/pgStore.test.ts']},
  raidClient: {authors: ['/root/loop/host'], files: ['src/main/raid.ts', 'src/main/net.ts', 'src/main/coordinator.ts', 'src/main/recovery.ts',
    'src/main/ipc.ts', 'src/main/index.ts', 'src/main/thefts.ts', 'src/shared/ipc.ts', 'src/preload/index.ts', 'src/renderer/global.d.ts',
    'tests/raidWatcher.test.ts', 'tests/ipc.test.ts', 'tests/net.test.ts', 'tests/recoveryRaid.test.ts']},
  raidUi: {authors: ['/root/loop/codex', '/root/loop/host'], files: ['src/menu/raid.ts', 'src/menu/popup.ts', 'src/menu/index.ts',
    'static/menu.html', 'static/menu.css', 'tests/menuRaid.test.ts', 'tests/menuPopup.test.ts', 'tests/menu.test.ts']},
  raidVisual: {authors: ['/root/loop/codex', '/root/loop/designer'], files: ['src/renderer/raidScene.ts', 'src/renderer/game.ts', 'src/renderer/index.ts',
    'src/renderer/hud.ts', 'src/renderer/sprites/raidBosses.ts', 'src/renderer/sprites/raidEquipment.ts', 'src/renderer/sprites/index.ts',
    'static/index.html', 'static/style.css', 'tests/raidScene.test.ts', 'tests/renderer-raid.test.ts', 'tests/raidBosses.test.ts',
    'tests/raidEquipment.test.ts', 'tests/sprites.test.ts']},
  raidArt: {authors: ['/root/loop/codex'], files: ['src/renderer/sprites/raidBoss/water.ts', 'src/renderer/sprites/raidBoss/wind.ts',
    'src/renderer/sprites/raidBoss/dark.ts', 'src/renderer/sprites/raidBoss/earth.ts', 'src/renderer/sprites/raidBoss/fire.ts', 'docs/v0.12/RAID_ART.md']},
  verification: {authors: ['/root/loop/critic'], files: ['.harness/v12/final-check.mjs', '.harness/v12/final-check.test.mjs',
    '.harness/v12/raid-balance-verify.mjs', '.harness/v12/raid-balance-verify.test.mjs',
    '.harness/v12/performance-report.mjs', '.harness/v12/performance.test.mjs',
    '.harness/v12/vendor/awesome-gamedev-agent-skills/SOURCES.json', '.harness/v12/agents/designer.md',
    '.harness/v12/agents/critic.md', '.harness/v12/agents/balance.md', '.harness/v12/agents/playtester.md', '.harness/v12/agents/art-critic.md']},
  orchestration: {authors: ['/root/loop/host'], files: ['.harness/v12/run.mjs', '.harness/v12/run.test.mjs', '.harness/v12/config.json',
    '.harness/v12/loop.mjs', '.harness/v12/loop.test.mjs', '.harness/v12/raid-preview.mjs', '.harness/v12/preview-shell.mjs',
    '.harness/v12/runtime.mjs', '.harness/v12/runtime.test.mjs', '.harness/v12/ui-cases.mjs', '.harness/v12/release.mjs', '.harness/v12/run-performance.mjs',
    '.harness/v12/HARNESS.md', 'SPEC.md', 'docs/v0.12/CONTRACT.md', 'docs/v0.12/PERFORMANCE_PROTOCOL.json']},
});
const agentId = value => typeof value === 'string' && /^\/root(?:\/[a-z0-9_]+)*$/.test(value);

export function validateReviews(document, current, root = ROOT) {
  assert(document?.version === 12 && document.source === current && document.passed === true, 'Review is stale/incomplete');
  assert(Array.isArray(document.reviews), 'Missing independent reviews');
  assert.deepEqual(document.reviews.map(review => review.scope).sort(), Object.keys(REVIEW_SCOPES).sort(), 'Missing/duplicate review scopes');
  for (const review of document.reviews) {
    const required = REVIEW_SCOPES[review.scope];
    assert.equal(review.verdict, 'approved', 'Unresolved review: ' + review.scope);
    assert(agentId(review.reviewer) && Array.isArray(review.implementedBy) && review.implementedBy.every(agentId) &&
      required.authors.every(id => review.implementedBy.includes(id)), 'Incomplete author/reviewer provenance');
    assert(!review.implementedBy.includes(review.reviewer), 'Self-approval: ' + review.scope);
    hashed(review.evidence);
    assert(review.sourceHashes && required.files.every(path => Object.hasOwn(review.sourceHashes, path)), 'Missing reviewed source bindings');
    for (const [path, hash] of Object.entries(review.sourceHashes))
      assert.equal(sha(readFileSync(resolve(root, path))), hash, 'Reviewed source changed: ' + path);
  }
  for (const key of ['windowsHardware', 'postgresql', 'humanFun', 'productionDeploy']) {
    const record = document.externalChecks?.[key];
    assert(record && typeof record.performed === 'boolean' && typeof record.note === 'string' && record.note.trim(), 'External check status missing: ' + key);
    if (record.performed) hashed(record.evidence);
  }
  return document;
}

export function validateReceipts(journal, current, run, tasks = config.tasks) {
  assert(journal?.version === 12 && journal.run === resolve(run) && Array.isArray(journal.tasks), 'Wrong journal');
  const latest = journal.tasks.flatMap(task => task.checks ?? []).filter(receipt => receipt.id === 'gates')
    .sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  assert(latest?.command === GATES && receiptValid(latest, current), 'Latest canonical gates failed, stale, or altered');
  for (const definition of tasks.filter(task => task.id !== 'V12-18')) {
    const task = journal.tasks.find(task => task.id === definition.id);
    assert(task?.status === 'verified' && task.verifiedSource === current, 'Task not verified for current source: ' + definition.id);
    const receipt = task.checks.filter(check => check.id === 'ac').at(-1);
    const command = definition.ac.replaceAll('{runDir}', quote(resolve(run)));
    const artifacts = (definition.artifacts ?? []).map(path => path.replaceAll('{runDir}', resolve(run)));
    assert(receipt?.command === command && receiptValid(receipt, current, artifacts), 'Latest AC failed, stale, or altered: ' + definition.id);
  }
}

export const NATIVE_SCENARIOS = ['menu-live-updates', 'manual-equipment', 'equipment-restart', 'hud-states', 'field-party', 'raid-hud-states', 'raid-battle'];
export const LATENCY_FAMILIES = ['tabs', 'disclosures', 'growth-selection', 'equipment-actions', 'raid-click', 'raid-confirm'];
const percentile95 = values => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * .95)];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const TIMING_CHROMIUM = '142.0.7444.265';
// Two IEEE754 ULPs cover epoch addition and subsequent bound arithmetic.
export const timestampRoundingErrorMs = epoch => 2 ** (Math.floor(Math.log2(Math.abs(epoch))) - 52) * 2;
export function validateClockResolution(clock) {
  const resolution = clock.resolution;
  assert(resolution?.basis === 'chromium-time-clamper' && resolution.chromiumVersion === TIMING_CHROMIUM &&
    resolution.crossOriginIsolated === false && resolution.quantumMs === .1 && resolution.maxErrorMs === .1,
  'Unregistered renderer timestamp precision');
  assert(Array.isArray(resolution.observations) && resolution.observations.length === 2 &&
    ['before', 'after'].every(phase => resolution.observations.filter(row => row.phase === phase).length === 1),
  'Missing before/after measured clock resolution');
  for (const row of resolution.observations) {
    assert(row.rendererTimeOrigin === clock.rendererTimeOrigin && row.chromiumVersion === TIMING_CHROMIUM &&
      row.crossOriginIsolated === false && Array.isArray(row.values) && row.values.length === 64 &&
      row.values.every((value, i) => finite(value) && value >= 0 && (i === 0 || value > row.values[i - 1])) &&
      Number.isSafeInteger(row.iterations) && row.iterations >= row.values.length, 'Invalid raw clock resolution observations');
    const rounding = timestampRoundingErrorMs(clock.rendererTimeOrigin + row.values.at(-1));
    const deltas = row.values.slice(1).map((value, i) => value - row.values[i]);
    assert(Math.abs(Math.min(...deltas) - resolution.quantumMs) <= rounding &&
      row.values.every(value => Math.abs((value - row.values[0]) - Math.round((value - row.values[0]) / resolution.quantumMs) * resolution.quantumMs) <= rounding),
    'Measured renderer clock disagrees with the pinned quantum');
  }
  return resolution.maxErrorMs;
}
const stageDefinitions = {
  ipcEntry: {sourcePath: 'dist/electron/main/ipc.js', anchor: 'let action = narrowAction(payload);'},
  applyStart: {sourcePath: 'dist/web/renderer/game.js', anchor: 'const events = engine.apply(a);'},
  applyEnd: {sourcePath: 'dist/web/renderer/game.js', anchor: 'handleEvents(events, verdictScene);'},
};

/** Clock offsets are renderer-minus-main; retain uncertainty instead of equating ACK with apply. */
export function validatePipeline(sample, readScript) {
  const pipeline = sample.pipeline, action = sample.result?.action;
  assert(Number.isSafeInteger(action?.revision) && action.revision >= 0, 'Equipment pipeline is missing its actual action revision');
  const key = JSON.stringify([action?.type, action?.itemId ?? null, action?.replaceId ?? null, action?.revision ?? null]);
  assert(pipeline?.basis === 'cdp-conditional-false' && pipeline.pauseCount === 0 && pipeline.key === key,
    'Missing/non-observational IPC/apply provenance');
  const events = {};
  for (const [role, definition] of Object.entries(stageDefinitions)) {
    const rows = pipeline.events?.[role], location = pipeline.locations?.[role];
    assert(Array.isArray(rows) && rows.length === 1 && rows[0].key === key &&
      finite(rows[0].timeOrigin) && rows[0].timeOrigin > 0 && finite(rows[0].at) && rows[0].at >= 0,
    'Missing/duplicate/mismatched pipeline event: ' + role);
    assert(location?.sourcePath === definition.sourcePath && typeof location.scriptId === 'string' && location.scriptId &&
      typeof location.url === 'string' && location.url.endsWith('/' + definition.sourcePath) &&
      /^[a-f0-9]{64}$/.test(location.scriptSha256) && Number.isSafeInteger(location.lineNumber) && location.lineNumber >= 0 &&
      Number.isSafeInteger(location.columnNumber) && location.columnNumber >= 0, 'Missing resolved production stage location: ' + role);
    if (readScript) {
      const bytes = readScript(definition.sourcePath), line = bytes.toString().split('\n')[location.lineNumber];
      assert.equal(sha(bytes), location.scriptSha256, 'Pipeline script differs from packaged source: ' + role);
      assert(line?.includes(definition.anchor) && location.columnNumber >= line.indexOf(definition.anchor) &&
        location.columnNumber < line.indexOf(definition.anchor) + definition.anchor.length,
        'Pipeline breakpoint is not at the production stage: ' + role);
    }
    events[role] = rows[0];
  }
  assert(events.applyStart.timeOrigin === events.applyEnd.timeOrigin && events.applyEnd.at >= events.applyStart.at &&
    events.applyEnd.error === null, 'Core apply did not return successfully in its own clock');
  assert(pipeline.locations.applyStart.scriptId === pipeline.locations.applyEnd.scriptId &&
    pipeline.locations.applyStart.url === pipeline.locations.applyEnd.url &&
    pipeline.locations.applyStart.scriptSha256 === pipeline.locations.applyEnd.scriptSha256, 'Core apply markers came from different scripts');
  assert(typeof pipeline.calibration?.id === 'string' && pipeline.calibration.id, 'Clock calibration identity missing');
  const clocks = {};
  for (const name of ['menu', 'field']) {
    const clock = pipeline.calibration?.[name];
    assert(clock && finite(clock.rendererTimeOrigin) && Array.isArray(clock.probes) && clock.probes.length >= 2 &&
      ['before', 'after'].every(phase => clock.probes.some(probe => probe.phase === phase)), 'Missing before/after clock calibration: ' + name);
    const quantumErrorMs = validateClockResolution(clock), lows = [], highs = [];
    for (const probe of clock.probes) {
      assert(['before', 'after'].includes(probe.phase) && probe.rendererTimeOrigin === clock.rendererTimeOrigin &&
        [probe.mainBeforeEpochMs, probe.rendererAt, probe.mainAfterEpochMs].every(finite) && probe.rendererAt >= 0 &&
        probe.mainBeforeEpochMs <= probe.mainAfterEpochMs, 'Invalid raw clock probe: ' + name);
      const epoch = probe.rendererTimeOrigin + probe.rendererAt;
      const allowance = quantumErrorMs + timestampRoundingErrorMs(Math.max(epoch, probe.mainBeforeEpochMs, probe.mainAfterEpochMs));
      lows.push(epoch - probe.mainAfterEpochMs - allowance); highs.push(epoch - probe.mainBeforeEpochMs + allowance);
    }
    const low = Math.max(...lows), high = Math.min(...highs);
    assert(low <= high && clock.offsetLowMs === low && clock.offsetHighMs === high,
      'Clock probes drift/disagree with claimed intersection: ' + name);
    clocks[name] = {low, high, widthMs: high - low, quantumErrorMs};
  }
  assert(sample.timeOrigin === pipeline.calibration.menu.rendererTimeOrigin &&
    events.applyStart.timeOrigin === pipeline.calibration.field.rendererTimeOrigin, 'Stage clock origin differs from calibration');
  const interval = (epoch, clock = {low: 0, high: 0, quantumErrorMs: 0}) => {
    const allowance = clock.quantumErrorMs + timestampRoundingErrorMs(epoch);
    return {low: epoch - clock.high - allowance, high: epoch - clock.low + allowance};
  };
  const click = interval(sample.timeOrigin + sample.clickAt, clocks.menu);
  const ack = interval(sample.timeOrigin + sample.actionResultAt, clocks.menu);
  const painted = interval(sample.timeOrigin + sample.resultAt, clocks.menu);
  const ipc = interval(events.ipcEntry.timeOrigin + events.ipcEntry.at);
  const start = interval(events.applyStart.timeOrigin + events.applyStart.at, clocks.field);
  const end = interval(events.applyEnd.timeOrigin + events.applyEnd.at, clocks.field);
  for (const name of ['menu', 'field']) {
    const clock = pipeline.calibration[name];
    assert(clock.probes.filter(probe => probe.phase === 'before').every(probe => probe.mainAfterEpochMs <= click.high) &&
      clock.probes.filter(probe => probe.phase === 'after').every(probe => probe.mainBeforeEpochMs >= painted.low),
    'Clock calibration does not bracket the measured action: ' + name);
    for (const observation of clock.resolution.observations) {
      const observed = interval(clock.rendererTimeOrigin + (observation.phase === 'before' ? observation.values.at(-1) : observation.values[0]), clocks[name]);
      assert(observation.phase === 'before' ? observed.low <= click.high : observed.high >= painted.low,
        'Clock resolution sampling does not bracket the measured action: ' + name);
    }
  }
  const chain = [['click', click], ['ipcEntry', ipc], ['applyStart', start], ['applyEnd', end], ['ack', ack], ['resultPaint', painted]];
  const stages = chain.slice(1).map(([to, later], index) => {
    const [from, earlier] = chain[index];
    assert(earlier.low <= later.high, 'Pipeline timestamps contradict causal order: ' + from + '→' + to);
    const rawDelta = from === 'applyStart' ? events.applyEnd.at - events.applyStart.at : from === 'ack' ? sample.resultAt - sample.actionResultAt : null;
    if (rawDelta !== null) {
      const clock = from === 'applyStart' ? clocks.field : clocks.menu;
      const epoch = from === 'applyStart' ? events.applyEnd.timeOrigin + events.applyEnd.at : sample.timeOrigin + sample.resultAt;
      const error = 2 * (clock.quantumErrorMs + timestampRoundingErrorMs(epoch));
      return {from, to, rawDeltaMs: rawDelta, minimumMs: rawDelta - error, maximumMs: rawDelta + error, orderResolved: rawDelta >= error};
    }
    return {from, to, minimumMs: later.low - earlier.high, maximumMs: later.high - earlier.low,
      orderResolved: earlier.high <= later.low};
  });
  return {key, calibrationWidthMs: {menu: clocks.menu.widthMs, field: clocks.field.widthMs},
    applyDurationMs: events.applyEnd.at - events.applyStart.at,
    applyDurationErrorMs: 2 * (clocks.field.quantumErrorMs + timestampRoundingErrorMs(events.applyEnd.timeOrigin + events.applyEnd.at)),
    applyToFeedbackMs: {minimum: painted.low - end.high, maximum: painted.high - end.low}, stages};
}

export function validatePipelineTrace(trace, samples) {
  assert(trace?.basis === 'cdp-conditional-false' && trace.pauseCount === 0 &&
    trace.main?.overflow === false && trace.field?.overflow === false, 'Raw pipeline trace was paused, lost or overflowed');
  for (const [context, roles] of [['main', ['ipcEntry']], ['field', ['applyStart', 'applyEnd']]]) {
    const rows = trace[context].rows;
    assert(Array.isArray(rows) && rows.length > 0 && rows.every(row => roles.includes(row.stage) &&
      typeof row.key === 'string' && finite(row.timeOrigin) && row.timeOrigin > 0 && finite(row.at) && row.at >= 0),
    'Missing/invalid complete raw pipeline trace: ' + context);
    assert(rows.every((row, i) => i === 0 || row.timeOrigin === rows[0].timeOrigin && row.at >= rows[i - 1].at),
      'Raw pipeline trace clock reset or event order changed: ' + context);
  }
  const withoutStage = ({stage: _stage, ...event}) => event;
  for (const sample of samples) {
    const pipeline = sample.pipeline;
    assert(pipeline, 'Scenario sample omitted its raw pipeline');
    assert.deepEqual(pipeline.calibration, trace.calibration, 'Sample calibration differs from complete trace');
    assert.deepEqual(pipeline.locations, trace.locations, 'Sample locations differ from complete trace');
    for (const role of Object.keys(stageDefinitions)) {
      const rows = trace[role === 'ipcEntry' ? 'main' : 'field'].rows.filter(row => row.stage === role && row.key === pipeline.key);
      assert.equal(rows.length, 1, 'Complete trace contains missing/duplicate action stage: ' + role);
      assert.deepEqual(pipeline.events?.[role]?.map(withoutStage), rows.map(withoutStage), 'Sample pipeline detached from complete raw trace');
    }
  }
}

export function validateLatency(latency, protocol, readScript) {
  validateProtocol(protocol);
  assert(Array.isArray(latency?.families), 'Missing latency samples');
  assert.deepEqual(latency.families.map(family => family.name).sort(), [...LATENCY_FAMILIES].sort(), 'Missing/duplicate latency families');
  return latency.families.map(family => {
    const pipelines = [];
    for (const key of ['visualMs', 'resultMs']) assert(Array.isArray(family[key]) &&
      family[key].length >= protocol.latency.samplesPerFamily && family[key].every(value => Number.isFinite(value) && value >= 0),
    'Incomplete/nonfinite latency samples: ' + family.name + '/' + key);
    assert.equal(family.visualMs.length, family.resultMs.length, 'Unpaired latency samples');
    assert(Array.isArray(family.samples) && family.samples.length === family.visualMs.length, 'Raw latency provenance missing');
    family.samples.forEach((sample, index) => {
      assert(sample?.eventType === 'click' && sample.isTrusted === true && typeof sample.selector === 'string' && sample.selector.trim() &&
        [sample.clickAt, sample.paintAt, sample.resultAt].every(value => Number.isFinite(value) && value >= 0) &&
        sample.paintAt >= sample.clickAt && sample.resultAt >= sample.clickAt &&
        (index === 0 || sample.clickAt > family.samples[index - 1].clickAt), 'Invalid/untrusted latency event');
      assert.equal(family.visualMs[index], sample.paintAt - sample.clickAt, 'Visual latency differs from raw timestamps');
      assert.equal(family.resultMs[index], sample.resultAt - sample.clickAt, 'Result latency differs from raw timestamps');
      if (family.name === 'equipment-actions') {
        assert(sample.resultBasis === 'production-onActionResult-and-painted-feedback' &&
          Number.isFinite(sample.actionResultAt) && sample.actionResultAt >= sample.clickAt && sample.actionResultAt <= sample.resultAt &&
          sample.result?.ok === true && typeof sample.result.action?.type === 'string' && sample.result.action.type.startsWith('equipment'),
        'Equipment latency lacks an applied production result');
        pipelines.push(validatePipeline(sample, readScript));
      } else assert.equal(sample.resultAt, sample.paintAt, 'Local UI result must be its measured paint completion');
    });
    const visualP95Ms = percentile95(family.visualMs), localResultP95Ms = percentile95(family.resultMs);
    assert(visualP95Ms <= protocol.latency.visualP95Ms && localResultP95Ms <= protocol.latency.localResultP95Ms,
      'Latency budget exceeded: ' + family.name);
    if (pipelines.length) assert.equal(new Set(pipelines.map(row => row.key)).size, pipelines.length, 'Pipeline events reused across actions');
    return {name: family.name, samples: family.visualMs.length, visualP95Ms, localResultP95Ms,
      ...(pipelines.length ? {pipelines, calibrationNote: 'Intervals include pinned Chromium timestamp coarsening, observed clock offsets and calculated epoch rounding. Raw same-clock deltas are retained with measurement bounds. orderResolved=false means the short stage cannot be ordered by clock readings alone. ACK is distinct from the observed core apply return.'} : {})};
  });
}

export function validateNative(report, current, macAsar, protocol, root = ROOT) {
  assert(report?.version === 12 && report.source === current && report.sourceUnchanged === true && report.passed === true,
    'Native report is stale/incomplete');
  assert.deepEqual(report.errors, [], 'Native errors');
  assert(Array.isArray(report.attempts), 'Missing native attempts');
  assert.deepEqual(report.attempts.map(attempt => attempt.name).sort(), [...NATIVE_SCENARIOS].sort(), 'Missing/duplicate native scenarios');
  const appHash = sha(readFileSync(macAsar)), launcherHash = sha(readFileSync(resolve(root, '.harness/v10/launcher.mjs')));
  for (const attempt of report.attempts) {
    const runtime = attempt.runtime;
    assert(attempt.ui?.passed === true && runtime?.passed === true && runtime.metadata?.version === '0.12.0', 'Failed native scenario: ' + attempt.name);
    assert.equal(runtime.metadata.runtime?.chrome, TIMING_CHROMIUM, 'Native Chromium differs from pinned timing precision source');
    assert(Array.isArray(attempt.ui.checks) && attempt.ui.checks.length > 0 && attempt.ui.checks.every(check => check?.passed === true),
      'Missing or failed native assertions: ' + attempt.name);
    assert(Array.isArray(attempt.ui.screenshots) && (attempt.name === 'equipment-restart' || attempt.ui.screenshots.length > 0),
      'Scenario screenshot missing: ' + attempt.name);
    assert(runtime.appHash === appHash && runtime.appUnchanged === true && runtime.launcherHash === launcherHash &&
      runtime.exitCode === 0 && runtime.signal === null, 'Native package changed or failed');
    assert(runtime.packageBinding?.passed === true && runtime.packageBinding.checked > 0 &&
      runtime.packageBinding.mismatches?.length === 0, 'Native package binding failed');
    assert.deepEqual(runtime.errors, []); assert.deepEqual(runtime.diagnostics?.errors, []);
    assert(runtime.diagnostics.hookLoads === 0 && Array.isArray(runtime.diagnostics.permissionCalls) &&
      runtime.diagnostics.permissionCalls.every(call => !call.prompt), 'Native input isolation failed');
    assert(runtime.isolation?.globalHooks === false && runtime.isolation.permissionPrompts === false, 'Missing native isolation');
    for (const shot of attempt.ui.screenshots ?? []) {
      assert.equal(report.artifacts?.[shot.path], shot.sha256, 'Screenshot omitted from native artifacts');
      hashed(shot);
    }
    const appliedSamples = attempt.ui.samples?.filter(sample => sample.family === 'equipment-actions') ?? [];
    if (attempt.name === 'manual-equipment') assert(appliedSamples.length >= protocol.latency.samplesPerFamily,
      'Manual equipment scenario omitted its measured actions');
    if (appliedSamples.length) validatePipelineTrace(attempt.ui.pipelineTrace, appliedSamples);
  }
  for (const family of report.latency?.families ?? []) assert.deepEqual(family.samples,
    report.attempts.flatMap(attempt => attempt.ui.samples ?? []).filter(sample => sample.family === family.name),
  'Latency family detached from observed scenario samples: ' + family.name);
  assert(report.artifacts && Object.keys(report.artifacts).length >= 4, 'Native visual evidence missing');
  for (const [path, hash] of Object.entries(report.artifacts)) {
    const bytes = readFileSync(path);
    assert.equal(sha(bytes), hash, 'Native artifact changed: ' + path);
    assert(bytes.length >= 24 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' &&
      bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0, 'Invalid native PNG');
  }
  return validateLatency(report.latency, protocol, path => asar.extractFile(macAsar, path));
}

export function validateReleaseCommands(release, current) {
  assert(release?.version === '0.12.0' && release.source === current && Array.isArray(release.commands), 'Release record is stale/incomplete');
  for (const command of ['npm run smoke', 'npm run package', 'npm run package:win']) {
    const receipt = release.commands.filter(item => item.command === command).at(-1);
    assert(receipt && receiptValid(receipt, current), 'Latest release command failed, missing, or stale: ' + command);
  }
}

export function validateVendor(root = ROOT) {
  const base = resolve(root, '.harness/v12/vendor/awesome-gamedev-agent-skills'), sources = read(join(base, 'SOURCES.json'));
  assert.equal(sources.commit, 'b105e1cf617adf0b68ed98790a716bbb60993179');
  assert.equal(sources.repository, 'https://github.com/gamedev-skills/awesome-gamedev-agent-skills');
  assert.equal(sources.license, 'Apache-2.0');
  const expected = ['LICENSE', 'NOTICE', 'skills/genres/rpg/SKILL.md', 'skills/genres/rpg/references/stats-combat-quests.md',
    'skills/disciplines/level-design/SKILL.md', 'skills/disciplines/level-design/references/pacing-and-flow.md',
    'skills/disciplines/game-ui-ux/SKILL.md', 'skills/disciplines/game-ui-ux/references/layout-and-flow.md',
    'skills/disciplines/game-feel/SKILL.md', 'skills/disciplines/game-feel/references/feedback-recipes.md',
    'skills/disciplines/create-game-assets/SKILL.md', 'skills/disciplines/create-game-assets/references/art-direction.md',
    'skills/disciplines/create-game-assets/references/raster-pipeline.md', 'skills/disciplines/create-game-assets/assets/art-direction-brief.md'];
  assert.deepEqual(sources.files.map(file => file.sourcePath).sort(), expected.sort(), 'Unexpected vendor subset');
  for (const file of sources.files) {
    assert(file.localPath === file.sourcePath && file.modified === false, 'Unexpected vendor adaptation');
    assert.equal(file.url, sources.repository + '/blob/' + sources.commit + '/' + file.sourcePath);
    const bytes = readFileSync(join(base, file.localPath));
    assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256, 'Vendor source changed: ' + file.sourcePath);
  }
  return {commit: sources.commit, files: sources.files.length};
}

export function validateInstalledCopy(expected, extracted) {
  const expectedHash=artifactHash(expected), extractedHash=artifactHash(extracted);
  assert.equal(extractedHash,expectedHash,'Installer payload differs from verified app: '+expected);
  return extractedHash;
}
export async function validateInstallerPayloads(paths) {
  const scratch=mkdtempSync(join(tmpdir(),'desmon-v12-installers-')), mount=join(scratch,'dmg');
  const run=(command,args)=>{
    const result=spawnSync(command,args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
    assert.equal(result.status,0,'Installer extraction failed: '+command+' '+(result.error??'')+(result.stderr??'')+(result.stdout??''));
  };
  let mounted=false;
  try {
    mkdirSync(mount);
    run('/usr/bin/hdiutil',['attach','-readonly','-nobrowse','-noautoopen','-mountpoint',mount,resolve(paths.macDmg)]);
    mounted=true;
    const macPayloadHash=validateInstalledCopy(paths.macApp,join(mount,basename(paths.macApp)));
    const sevenZip=await require('app-builder-lib/out/toolsets/7zip').getPath7za();
    const installer=join(scratch,'installer'), windows=join(scratch,'windows');
    run(sevenZip,['x','-y',resolve(paths.windowsInstaller),'-o'+installer,'$PLUGINSDIR/app-64.7z']);
    run(sevenZip,['x','-y',join(installer,'$PLUGINSDIR/app-64.7z'),'-o'+windows]);
    const windowsPayloadHash=validateInstalledCopy(resolve(dirname(paths.windowsAppAsar),'..'),windows);
    return {macPayloadHash,windowsPayloadHash,extractor:{path:sevenZip,sha256:sha(readFileSync(sevenZip))},
      macDmgHash:artifactHash(paths.macDmg),windowsInstallerHash:artifactHash(paths.windowsInstaller)};
  } finally {
    // Never remove a still-mounted image if detach fails; retain its owned scratch path for diagnosis.
    if(mounted)run('/usr/bin/hdiutil',['detach',mount]);
    rmSync(scratch,{recursive:true,force:true});
  }
}
export async function validatePackages(packages) {
  assert(packages&&['macApp','macDmg','windowsInstaller','windowsAppAsar'].every(key=>packages[key]),'Missing platform artifacts');
  const paths=Object.fromEntries(Object.entries(packages).map(([key,value])=>[key,hashed(value)]));
  assert(paths.macApp.endsWith('.app')&&statSync(paths.macApp).isDirectory(),'Missing macOS app');
  assert(paths.macDmg.endsWith('.dmg')&&statSync(paths.macDmg).size>0,'Missing DMG');
  assert(paths.windowsInstaller.endsWith('.exe')&&readFileSync(paths.windowsInstaller).subarray(0,2).toString()==='MZ','Invalid Windows installer');
  for(const [path,name] of [[paths.macDmg,'latest-mac.yml'],[paths.windowsInstaller,'latest.yml']]) {
    const update=yaml.load(readFileSync(join(dirname(path),name),'utf8')), bytes=readFileSync(path);
    assert.equal(update.version,'0.12.0','Wrong installer/disk-image version');
    const hash=createHash('sha512').update(bytes).digest('base64');
    assert(update.files?.some(file=>file.sha512===hash&&file.size===bytes.length),'Installer/disk-image differs from versioned builder manifest');
  }
  const executable=readFileSync(paths.windowsInstaller), versionOffset=executable.indexOf(Buffer.from('ProductVersion','utf16le'));
  assert(versionOffset>=0&&/^ProductVersion\u0000+0\.11\.0(?:\.0)?\u0000/.test(executable.subarray(versionOffset,versionOffset+100).toString('utf16le')),'Windows resource version differs');
  const macAsar=join(paths.macApp,'Contents/Resources/app.asar');
  const payload=manifest(['dist','static']);
  for(const archive of [macAsar,paths.windowsAppAsar]) {
    const pkg=JSON.parse(asar.extractFile(archive,'package.json').toString());
    assert.equal(pkg.version,'0.12.0','Wrong packaged version');
    for(const [path,hash] of Object.entries(payload).filter(([path])=>!path.startsWith('dist/electron/server/'))) {
      assert.equal(sha(asar.extractFile(archive,path)),hash,'Package differs from current compiled payload: '+path);
    }
  }
  return {macAsar,installerPayloads:await validateInstallerPayloads(paths)};
}


/** The deployed server must run the same server-side source as HEAD (docs/reviews may land after the deploy). */
export const DEPLOY_PATHS = ['src/server', 'src/core', 'src/shared', 'package.json', 'package-lock.json', 'tsconfig.main.json', '.node-version'];
export function validateDeploy(record, root = ROOT, git = (args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'})) {
  assert(record && /^[a-f0-9]{40}$/.test(record.sha) && record.healthz?.ok === true && record.healthz.sha === record.sha &&
    typeof record.url === 'string' && record.url.startsWith('https://') && typeof record.at === 'string', 'Deploy record incomplete');
  assert.equal(record.skipped, undefined, 'DESMON_SKIP_NET is not allowed for v0.12: the raid needs the deployed server');
  assert.equal(git(['diff', '--stat', record.sha, 'HEAD', '--', ...DEPLOY_PATHS]).trim(), '', 'Server-side source changed after the deploy: ' + record.sha);
  return record;
}

export async function verifyFinal(run) {
  run = resolve(run); const current = digest();
  assert.equal(read(resolve(ROOT, 'package.json')).version, '0.12.0');
  validateReceipts(read(join(run, 'loop.json')), current, run);
  const vendor = validateVendor();
  const {verifyRaidBalance} = await import('./raid-balance-verify.mjs');
  assert.equal(typeof verifyRaidBalance, 'function', 'Missing raid balance verifier');
  const balance = await verifyRaidBalance(join(run, 'raid-balance/final.json'));
  assert.equal(balance?.passed, true, 'Raid balance verification did not explicitly pass');
  const {verifyApproval} = await import('./raid-preview.mjs');
  const preview = verifyApproval(join(run, 'preview/final.json'));
  assert.equal(preview?.passed, true, 'Raid art/preview approval missing or stale');
  const deploy = validateDeploy(read(join(run, 'deploy.json')));
  const reviews = validateReviews(read(join(run, 'reviews/final.json')), current);
  const release = read(join(run, 'release.json'));
  validateReleaseCommands(release, current);
  const {macAsar, installerPayloads} = await validatePackages(release.packages);
  const protocol = read(resolve(ROOT, 'docs/v0.12/PERFORMANCE_PROTOCOL.json'));
  const latency = validateNative(read(join(run, 'native/final.json')), current, macAsar, protocol);
  const comparisonPath = join(run, 'performance/comparison.json'), comparison = read(comparisonPath);
  assert.equal(resolve(comparison.protocol.path), resolve(ROOT, 'docs/v0.12/PERFORMANCE_PROTOCOL.json'), 'Wrong performance protocol');
  const recomputed = createReport(Object.fromEntries(SLOTS.map(slot => [slot, comparison.artifacts[slot].path])), comparison.protocol.path);
  assert.deepEqual(comparison, recomputed, 'Performance evidence changed');
  assert.equal(comparison.passed, true, 'Performance budget failed');
  for (const slot of ['candidate-active', 'candidate-idle'])
    assert.equal(comparison.artifacts[slot].appHash, sha(readFileSync(macAsar)), 'Performance package differs from release');
  const reviewedPerformance = reviews.reviews.find(review => review.scope === 'verification').performance;
  assert.equal(hashed(reviewedPerformance), comparisonPath, 'Independent performance review must bind final comparison');
  assert.equal(digest(), current, 'Source changed during final verification');
  return {version: 12, passed: true, source: current, balance, preview, deploy, latency, vendor, installerPayloads, externalChecks: reviews.externalChecks};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [action, run] = process.argv.slice(2);
    assert(run && ['reviews', 'final', 'deploy'].includes(action), 'Usage: final-check.mjs reviews|final|deploy RUN');
    const result = action === 'final' ? await verifyFinal(run) : action === 'deploy' ? validateDeploy(read(resolve(run, 'deploy.json')))
      : validateReviews(read(resolve(run, 'reviews/final.json')), digest());
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
