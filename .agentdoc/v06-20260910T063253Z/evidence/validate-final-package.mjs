import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from 'node:console';
import { ROOT, sourceDigest, evaluationDigest, sha256 } from '../../../.harness/v5/loop/evidence.mjs';
const evidence = dirname(fileURLToPath(import.meta.url));
const read = name => JSON.parse(readFileSync(resolve(evidence, name), 'utf8'));
const build = read('package-build-record.json');
const runtime = read('package.json');
assert.equal(build.command, 'npm run package');
assert.equal(build.exitCode, 0);
assert.equal(build.sourceDigest, sourceDigest());
assert.equal(build.endedSourceDigest, sourceDigest());
assert.equal(build.evaluationDigest, evaluationDigest());
assert.equal(build.endedEvaluationDigest, evaluationDigest());
assert.equal(sha256(readFileSync(build.log.path)), build.log.sha256);
for (const file of build.outputs) {
  assert.ok(statSync(file.path).size > 0);
  assert.equal(sha256(readFileSync(file.path)), file.sha256);
}
assert.ok(build.outputs.some(file => file.path.endsWith('/DesMon-0.6.0-arm64.dmg')));
assert.equal(JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version, '0.6.0');
assert.equal(runtime.mode, 'package-verification');
assert.equal(runtime.status, 'passed');
assert.equal(runtime.sourceDigest, sourceDigest());
assert.equal(runtime.evaluationDigest, evaluationDigest());
assert.equal(runtime.runtime.version, '0.6.0');
assert.equal(runtime.temporaryDataRemoved, true);
assert.deepEqual(runtime.errors, []);
assert.equal(runtime.checks.length, 10);
assert.ok(runtime.checks.every(check => check.passed));
assert.equal(sha256(readFileSync(runtime.executable)), runtime.packageHashes.executable);
assert.equal(sha256(readFileSync(runtime.asar)), runtime.packageHashes.asar);
for (const shot of runtime.screenshots) assert.equal(sha256(readFileSync(shot.path)), shot.sha256);
const packed = runtime.checks.find(check => check.id === 'packaged-files-match-verified-build');
assert.deepEqual(packed.details.files, packed.details.packagedFiles);
for (const file of packed.details.files) assert.equal(sha256(readFileSync(resolve(ROOT, file.path))), file.sha256);
assert.ok(runtime.checks.find(check => check.id === 'packaged-save-restart-preservation').passed);
assert.ok(runtime.checks.find(check => check.id === 'legacy-value-and-history-preservation').passed);
log(JSON.stringify({ status: 'passed', version: runtime.runtime.version, checks: runtime.checks.length,
  sourceDigest: runtime.sourceDigest, evaluationDigest: runtime.evaluationDigest, outputs: build.outputs,
  runtimeArtifactSha256: sha256(readFileSync(resolve(evidence, 'package.json'))) }, null, 2));
