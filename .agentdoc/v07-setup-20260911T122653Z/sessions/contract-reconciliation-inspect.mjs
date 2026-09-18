// Read-only investigation of the frozen contract; this is NOT a registered AC.
import assert from 'node:assert/strict';
const { structuredClone, console } = globalThis;
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sourceDigest, evaluationDigest, manifest, digestManifest, sha256 } from '../../../.harness/v7/loop/evidence.mjs';
import { validateLoop, transition, fileManifest } from '../../../.harness/v7/loop/develop.mjs';
import { verifyMatrix } from '../../../.harness/v7/loop/e2e-matrix.mjs';
import { validateMeasurement } from '../../../.harness/v7/loop/measure.mjs';
import { verifyDesign } from '../../../.harness/v7/loop/fun.mjs';

const R = '.agentdoc/v07-setup-20260911T122653Z';
const O = `${R}/evidence/production-v070-20260913`;
const Q = `${R}/evidence/contract-reconciliation-20260914`;
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => sha256(readFileSync(path));
const save = (name, value) => writeFileSync(`${Q}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const startedAt = new Date().toISOString();
const registration = read(`${Q}/preregistration-r2.json`);
assert.equal(hash(registration.inspectionScript.path), registration.inspectionScript.sha256);
const S = sourceDigest(), E = evaluationDigest();
assert.equal(S, registration.sourceDigest);
assert.equal(E, registration.evaluationDigest);
const loop = validateLoop(read(`${R}/loop.json`));
const task = loop.tasks.find(t => t.id === 'V07-07');
assert.equal(task.status, 'running');
assert.equal(task.verificationHistory.length, 0);

const originalChecks = task.attempts.flatMap(a => a.checks);
const ownedNow = fileManifest(task.files);
const oldChecks = originalChecks.map(c => {
  assert.equal(hash(c.log), c.sha256);
  let artifactFiles = 0;
  for (const files of Object.values(c.artifacts)) for (const [path, expected] of Object.entries(files)) {
    assert.equal(hash(path), expected, `Historical artifact changed: ${path}`);
    artifactFiles++;
  }
  return { commandId: c.commandId, exitCode: c.exitCode, at: c.at, log: c.log, sha256: c.sha256, artifactFiles,
    changedOwnedAtStart: task.files.filter(p => c.filesHash[p] !== ownedNow[p]),
    changedOwnedAtEnd: task.files.filter(p => c.endedFilesHash[p] !== ownedNow[p]) };
});
const evidence = Object.fromEntries(Object.entries(registration.operationalEvidence).map(([name, expected]) => {
  assert.equal(hash(`${O}/${name}`), expected);
  return [name, { path: `${O}/${name}`, sha256: expected }];
}));
const capture = read(`${O}/compatibility-after-deploy.json`);
for (const [path, expected] of Object.entries(capture.sources)) {
  assert.equal(hash(path), expected);
  assert.equal(sha256(execFileSync('git', ['show', `${capture.live.health.sha}:${path}`])), expected);
}
const probe = read(`${O}/live-probe/report.json`);
assert.equal(probe.checks.length, 47);
assert.ok(probe.checks.every(c => c.passed === true));
assert.equal(probe.requests.length, 28);
assert.equal(probe.requests.filter(r => r.status === 400).length, 7);
assert.equal(hash(`${O}/live-probe/events.ndjson`), probe.eventsSha256);
assert.deepEqual(probe.bindingsBefore, probe.bindingsAfter);
for (const entry of probe.bindingsAfter) assert.equal(hash(entry.path), entry.sha256);
const audit = read(`${R}/reviews/final/audit.json`);
const findings = audit.history.flatMap(r => r.findings);
assert.deepEqual(findings.filter(f => ['major', 'blocker'].includes(f.severity)).map(f => f.id), ['C070-LIVE-SERVER-CONTRACT']);
const supplemental = read(`${O}/supplemental-review.json`);
assert.equal(supplemental.formalAuditChanged, false);
assert.equal(supplemental.registeredAcStatusChanged, false);
assert.equal(supplemental.operationalCause, 'RESOLVED_WITHIN_TESTED_SCOPE');

// Hypothetical bytes only: never replace the active config or mutate a check.
const proposal = read('.harness/v7/config.json');
const server = proposal.tasks.find(t => t.id === 'V07-07').ac.find(a => a.id === 'server');
server.command = 'node .harness/v7/loop/server-check.mjs {runDir}/evidence/production-v070-20260913/compatibility-after-deploy.json';
server.artifacts = ['{runDir}/evidence/production-v070-20260913'];
save('server-path-only.config.proposed-r2.json', proposal);
const evaluationFiles = manifest(['.harness/v7']);
evaluationFiles['docs/v0.7/EVALUATION_PROTOCOL.json'] = hash('docs/v0.7/EVALUATION_PROTOCOL.json');
evaluationFiles['.harness/v7/config.json'] = hash(`${Q}/server-path-only.config.proposed-r2.json`);
const hypotheticalE = digestManifest(evaluationFiles);
assert.notEqual(E, hypotheticalE);
const rejections = [];
const reject = (id, action, pattern) => {
  assert.throws(action, error => { assert.match(error.message, pattern); rejections.push({ id, reason: error.message }); return true; });
};
const changedLoop = structuredClone(loop);
Object.assign(changedLoop.tasks.find(t => t.id === 'V07-07').ac.find(a => a.id === 'server'), server);
reject('journal-only-path-change', () => validateLoop(changedLoop), /Task contract changed/);
reject('current-release-verification', () => transition(loop, 'V07-07', 'verify', {}, S, E, ownedNow), /Failed or stale checks/);
reject('old-native-under-proposed-E', () => verifyMatrix(read(`${R}/evidence/native/matrix.json`), S, hypotheticalE), /Matrix source\/tools stale/);
reject('old-measurement-under-proposed-E', () => validateMeasurement(read(`${R}/evidence/release.json`), S, hypotheticalE), /Invalid or stale measurement provenance/);
reject('old-design-under-proposed-E', () => verifyDesign(read(`${R}/reviews/design-final-v070/session.json`), S, hypotheticalE), /Stale source or evaluation evidence/);
const matrixState = read(`${R}/evidence/native/matrix-state.json`);
assert.equal(matrixState.runs.length, 10);
assert.ok(matrixState.runs.every(r => r.endedAt && r.exitCode === 0 && r.completion === 'completed'));
assert.equal(sourceDigest(), S);
assert.equal(evaluationDigest(), E);
const result = { kind: 'frozen-contract-inspection', startedAt, endedAt: new Date().toISOString(), sourceDigest: S, evaluationDigest: E,
  inspectionScriptSha256: hash(registration.inspectionScript.path), status: 'PASS', registeredAcSatisfied: false,
  oldChecks, evidence, sourceFilesMatched: Object.keys(capture.sources).length,
  historicalProbe: { startedAt: probe.startedAt, endedAt: probe.endedAt, checks: 47, httpRequests: 28, expected400: 7,
    directory: probe.checks.filter(c => c.id.endsWith('-directory')), cleanup: probe.cleanup, createdAccountCount: probe.createdAccountCount,
    limits: supplemental.limits },
  formalFindings: findings, hypotheticalServerPathOnlyE: hypotheticalE, rejections,
  completedNativeRuns: matrixState.runs.map(({ key, endedAt, exitCode, completion }) => ({ key, endedAt, exitCode, completion })),
  note: 'Expected guard rejections confirm the contract remains strict. No new capture, authenticated probe, measurement, Native, audit, smoke or package execution. Hypothetical E was not activated.' };
save('inspection-r2.json', result);
console.log(JSON.stringify({ status: result.status, historicalChecks: oldChecks.length, expectedRejections: rejections.length, hypotheticalE, registeredAcSatisfied: false }));
