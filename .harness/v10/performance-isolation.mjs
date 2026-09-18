#!/usr/bin/env node
// A single prospectively registered five-slot block. Never kills an unrelated app.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, digest, sha } from './run.mjs';
import { createReport, observerVersions, SLOTS } from './performance-report.mjs';
import { runObservedChild } from './run-performance.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
export const ISOLATION = Object.freeze({ sampleMs: 5000, maximumGapMs: 10000 });
export const SCHEDULE = SLOTS.map(slot => [slot, slot === 'mixed' ? 'mixed' : slot.split('-')[1], slot === 'mixed' ? 180 : 30]);
const identity = row => JSON.stringify([row.pid, row.started, row.command]);
const binding = path => ({ path: resolve(path), sha256: sha(readFileSync(path)) });
const bound = record => {
  assert(record && typeof record.path === 'string' && /^[a-f0-9]{64}$/.test(record.sha256), 'Missing isolation artifact binding');
  assert.equal(sha(readFileSync(record.path)), record.sha256, 'Isolation artifact changed: ' + record.path);
  return record.path;
};

export function parseProcessTable(stdout) {
  const rows = stdout.trim().split('\n').map(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(\S.*)$/);
    assert(match, 'Unparsed process-table row');
    const row = { pid: +match[1], ppid: +match[2], pgid: +match[3], started: match[4].replace(/\s+/g, ' '), command: match[5] };
    assert(Number.isFinite(Date.parse(row.started)), 'Invalid process start identity');
    return row;
  });
  assert(rows.length && new Set(rows.map(row => row.pid)).size === rows.length, 'Missing/duplicate process-table rows');
  return rows;
}
export function isDesmonProcess(row) {
  // Includes helper executables and a reparented app with an old fixture directory.
  return /^\/.+\.app\/Contents\/MacOS\/DesMon(?: Helper(?: \([^)]+\))?)?(?: |$)/.test(row.command) ||
    /(?:^| )--user-data-dir=\S*desmon-v10-perf-/.test(row.command) ||
    /(?:^| )--database=\S*desmon-v10-perf-[^ /]+\/Crashpad(?: |$)/.test(row.command);
}
export function snapshot(slot, phase) {
  const result = spawnSync('/bin/ps', ['-axo', 'pid=,ppid=,pgid=,lstart=,command='], {
    encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' }, timeout: 5000, maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, 'Process inventory failed: ' + (result.error ?? result.stderr));
  const rows = parseProcessTable(result.stdout);
  return { at: new Date().toISOString(), slot, phase, tableRows: rows.length, processes: rows.filter(isDesmonProcess) };
}

/** Replay raw inventories instead of trusting a saved `passed` flag. */
export function validateSlotIsolation(rows, lifecycle, report) {
  assert(rows.length >= 3 && rows[0].phase === 'before' && rows.at(-1).phase === 'after', 'Missing isolation boundaries');
  assert(rows[0].processes.length === 0 && rows.at(-1).processes.length === 0, 'DesMon process at isolation boundary');
  assert(lifecycle.version === 1 && lifecycle.state === 'complete' && lifecycle.cancelSignal === null &&
    lifecycle.cleanup?.state === 'complete' && lifecycle.cleanup.remaining.length === 0, 'Incomplete observer cleanup');
  assert(Number.isSafeInteger(lifecycle.childPid) && lifecycle.childPid > 0 && Number.isSafeInteger(lifecycle.observerPid) && lifecycle.observerPid > 0, 'Missing observer/app identity');
  assert(report.cancelSignal === null && report.appPath === lifecycle.appPath && report.appHash === lifecycle.appHash &&
    report.isolation.userData === lifecycle.userData, 'Lifecycle/report identity mismatch');
  assert.deepEqual(report.cleanup, lifecycle.cleanup, 'Cleanup/report mismatch');
  const launch = Date.parse(lifecycle.startedAt), end = Date.parse(lifecycle.cleanup.finishedAt);
  assert(Date.parse(rows[0].at) <= launch && Date.parse(rows.at(-1).at) >= end &&
    launch <= Date.parse(report.startedAt) && Date.parse(report.finishedAt) <= end, 'Isolation does not cover launch through cleanup');
  const known = new Set(); let mainIdentity, observedMain = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    assert(row.slot === rows[0].slot && (i === 0 || i === rows.length - 1 || row.phase === 'during'), 'Unexpected isolation phase/slot');
    assert(Number.isSafeInteger(row.tableRows) && row.tableRows > 0, 'Missing process inventory');
    if (i) {
      const gap = Date.parse(row.at) - Date.parse(rows[i - 1].at);
      assert(gap >= 0 && gap <= ISOLATION.maximumGapMs, 'Isolation sample gap');
    }
    const processes = row.processes;
    assert(new Set(processes.map(p => p.pid)).size === processes.length && processes.every(isDesmonProcess), 'Invalid isolation process list');
    const main = processes.find(p => p.pid === lifecycle.childPid);
    if (Date.parse(row.at) >= Date.parse(report.startedAt) && Date.parse(row.at) <= Date.parse(report.finishedAt))
      assert(main, 'Measured app missing from process inventory');
    const permitted = new Set();
    if (main) {
      const executable = lifecycle.appPath + '/Contents/MacOS/DesMon';
      const marker = '--user-data-dir=' + lifecycle.userData;
      assert(main.command.startsWith(executable + ' ') && (main.command.endsWith(marker) || main.command.includes(marker + ' ')) &&
        main.ppid === lifecycle.observerPid, 'Wrong app ownership');
      assert(Math.abs(Date.parse(main.started) - launch) <= 2000, 'App process predates observer launch');
      if (mainIdentity) assert.equal(identity(main), mainIdentity, 'App PID was reused');
      mainIdentity = identity(main); observedMain = true; permitted.add(main.pid);
    }
    let added;
    do {
      added = false;
      for (const process of processes) if (!permitted.has(process.pid) && permitted.has(process.ppid)) {
        assert(process.command.startsWith(lifecycle.appPath + '/Contents/'), 'Foreign app descendant');
        permitted.add(process.pid); added = true;
      }
    } while (added);
    for (const process of processes) {
      assert(permitted.has(process.pid) || known.has(identity(process)), 'Unexpected competing DesMon process: ' + process.pid);
      known.add(identity(process));
    }
  }
  assert(observedMain, 'App never appeared in process inventory');
  return { samples: rows.length, observedIdentities: known.size };
}

function validateRegistration(registration, source) {
  assert(registration.version === 2 && registration.source === source, 'Stale isolation registration');
  assert.deepEqual(registration.schedule, SCHEDULE, 'Unregistered isolation schedule');
  assert.deepEqual(registration.isolation, ISOLATION, 'Changed isolation cadence');
  assert.equal(bound(registration.runner), resolve(ROOT, '.harness/v10/performance-isolation.mjs'), 'Wrong isolation runner');
  assert.deepEqual(registration.observers, observerVersions(), 'Changed registered observers');
  for (const item of [...Object.values(registration.apps), ...Object.values(registration.observers), registration.protocol]) bound(item);
  assert.equal(registration.protocol.path, resolve(ROOT, 'docs/v0.10/PERFORMANCE_PROTOCOL.json'));
  assert(registration.registeredBy === '/root' && registration.independentReviewer !== registration.registeredBy &&
    typeof registration.independentReviewer === 'string' && /^\/root\/[a-z0-9_/]+$/.test(registration.independentReviewer) &&
    registration.independentReviewer !== '/root/sprite_qa' && registration.rules?.noAgentConcurrentWork && registration.rules?.selection && registration.rules?.ambient,
  'Missing prospective isolation rules');
}
function methodReview(path, registration, registrationBinding) {
  const review = read(path);
  assert(review.verdict === 'approved-methodology-only' && review.reviewer === registration.independentReviewer, 'Missing independent method approval');
  assert.deepEqual(review.registration, registrationBinding, 'Method review does not bind registration');
  assert(Date.parse(review.at) >= Date.parse(registration.registeredAt), 'Method review predates registration');
  return review;
}

export function verifyIsolation(path, comparison, source = digest()) {
  const saved = read(path), registration = read(bound(saved.registration));
  validateRegistration(registration, source);
  const review = methodReview(bound(saved.methodReview), registration, saved.registration);
  assert(saved.version === 1 && saved.state === 'complete' && saved.source === source, 'Incomplete isolation block');
  assert(Date.parse(registration.registeredAt) <= Date.parse(review.at) && Date.parse(review.at) < Date.parse(saved.startedAt), 'Block was not prospectively reviewed');
  assert.deepEqual(saved.slots.map(slot => slot.slot), SLOTS, 'Missing isolation slots');
  const rows = readFileSync(bound(saved.raw), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert(rows.length === saved.samples && rows.every(row => SLOTS.includes(row.slot)), 'Unknown/missing isolation samples');
  let previousTime = Date.parse(saved.startedAt), previousSlot = 0;
  for (const row of rows) {
    const time = Date.parse(row.at), index = SLOTS.indexOf(row.slot);
    assert(time >= previousTime && time - previousTime <= ISOLATION.maximumGapMs && index >= previousSlot, 'Global isolation cadence/order gap');
    previousTime = time; previousSlot = index;
  }
  assert(Date.parse(saved.endedAt) >= previousTime && Date.parse(saved.endedAt) - previousTime <= ISOLATION.maximumGapMs, 'Isolation end coverage gap');
  const result = {};
  let previousEnd = saved.startedAt;
  for (const entry of saved.slots) {
    const reportPath = bound(entry.report), report = read(reportPath), lifecycle = read(bound(entry.lifecycle));
    assert.deepEqual(entry.report, { path: comparison.artifacts[entry.slot].path, sha256: comparison.artifacts[entry.slot].sha256 }, 'Isolation/comparison report mismatch');
    assert.equal(report.lifecyclePath, entry.lifecycle.path, 'Wrong lifecycle path');
    const app = registration.apps[entry.slot.startsWith('baseline-') ? 'baseline' : 'candidate'];
    assert.equal(report.appHash, app.sha256, 'Isolation app changed');
    assert.equal(join(report.appPath, 'Contents/Resources/app.asar'), app.path, 'Wrong registered app path');
    const metrics = readFileSync(bound(report.raw), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert(metrics.length > 0 && metrics.every(row => {
      const browsers = row.processes.filter(process => process.type === 'Browser');
      return browsers.length === 1 && browsers[0].pid === lifecycle.childPid &&
        Math.abs(browsers[0].creationTime - Date.parse(lifecycle.startedAt)) <= 2000;
    }), 'Isolation identity differs from measured Browser process');
    const slotRows = rows.filter(row => row.slot === entry.slot);
    assert(Date.parse(slotRows[0]?.at) >= Date.parse(previousEnd), 'Overlapping isolation slots');
    result[entry.slot] = validateSlotIsolation(slotRows, lifecycle, report);
    previousEnd = slotRows.at(-1).at;
  }
  assert(rows.at(-1).at === previousEnd && Date.parse(saved.endedAt) >= Date.parse(previousEnd), 'Isolation final boundary missing');
  return result;
}

export async function runBlock(registrationPath, reviewPath) {
  const registered = binding(registrationPath), registration = read(registrationPath), source = digest();
  validateRegistration(registration, source);
  methodReview(reviewPath, registration, registered);
  const output = resolve(registration.output), statusPath = join(output, 'block.json'), isolationPath = join(output, 'isolation.json');
  assert(!existsSync(output), 'Preserve previous block; a new prospective registration is required');
  mkdirSync(output, { recursive: true });
  const rawPath = join(output, 'processes.jsonl'); writeFileSync(rawPath, '', { flag: 'wx' });
  const status = { version: 1, pid: process.pid, source, startedAt: new Date().toISOString(), registration: registered,
    methodReview: binding(reviewPath), state: 'running', slots: [] };
  const persist = () => write(statusPath, status);
  const frozen = () => { assert.equal(digest(), source, 'Source changed during observation'); bound(registered); bound(status.methodReview); validateRegistration(registration, source); };
  let interrupted;
  const signalHandlers = ['SIGTERM', 'SIGINT'].map(signal => [signal, () => {
    interrupted = signal;
  }]);
  for (const [signal, handler] of signalHandlers) process.on(signal, handler);
  const allRows = [], reports = {};
  persist();
  try {
    for (const [slot, profile, minutes] of SCHEDULE) {
      assert(!interrupted, 'Block interrupted'); frozen();
      const rows = [], sample = phase => { const row = snapshot(slot, phase); rows.push(row); allRows.push(row); appendFileSync(rawPath, JSON.stringify(row) + '\n'); return row; };
      assert.equal(sample('before').processes.length, 0, 'DesMon process remains before ' + slot);
      const kind = slot.startsWith('baseline-') ? 'baseline' : 'candidate';
      const app = resolve(registration.apps[kind].path, '../../..'), reportPath = join(output, slot + '.json');
      const entry = { slot, startedAt: new Date().toISOString(), state: 'running' }; status.slots.push(entry);
      let inventoryError, timer, result;
      try {
        result = await runObservedChild([registration.observers[kind].path, app, reportPath, profile, String(minutes)], child => {
          timer = setInterval(() => {
            try { sample('during'); }
            catch (error) { if (!inventoryError) { inventoryError = error; child.kill('SIGTERM'); } }
          }, ISOLATION.sampleMs);
          entry.pid = child.pid; persist();
        }, signal => { interrupted = signal; });
      } finally { clearInterval(timer); }
      const { code, signal, error } = result; entry.signal = signal; if (error) entry.error = error;
      sample('after');
      entry.endedAt = new Date().toISOString(); entry.exitCode = code; entry.state = code === 0 ? 'passed' : 'failed'; persist();
      assert(!inventoryError, String(inventoryError)); assert(!interrupted && code === 0, 'Interrupted/failed observer: ' + slot); frozen();
      const lifecyclePath = reportPath + '.lifecycle.json', report = read(reportPath);
      validateSlotIsolation(rows, read(lifecyclePath), report);
      entry.report = binding(reportPath); entry.lifecycle = binding(lifecyclePath); reports[slot] = reportPath; persist();
    }
    const comparison = createReport(reports, registration.protocol.path);
    write(join(output, 'comparison.json'), comparison);
    const isolation = { ...status, state: 'complete', endedAt: new Date().toISOString(), raw: binding(rawPath), samples: allRows.length };
    write(isolationPath, isolation); verifyIsolation(isolationPath, comparison, source);
    status.state = comparison.passed ? 'awaiting-independent-result-review' : 'numeric-failure';
    if (!comparison.passed) process.exitCode = 1;
  } catch (error) {
    status.state = 'failed'; status.error = String(error); process.exitCode = 1;
  } finally {
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
    status.endedAt = new Date().toISOString(); persist();
    console.log(JSON.stringify(status));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBlock(process.argv[2], process.argv[3]).catch(error => { console.error(error); process.exitCode = 1; });
}
