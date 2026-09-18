import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFiniteFarmActions, verifyFieldCounters, recomputeFiniteFarmChecks, verifyFreshHeldout } from '../../../.harness/v11/balance-verify.mjs';

const here = dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path));
const screenPath = resolve(here, '../balance/r19-finite-screen/report.json'), screen = read(screenPath), result = screen.reports[0];
const compiled = resolve(dirname(screenPath), 'compiled-R19-B'), core = require(resolve(compiled, 'index.js'));
const oldPath = resolve(here, '../balance/r18-explore/report.json'), oldReport = read(oldPath);
const oldResult = oldReport.reports.find(entry => entry.candidate.id === 'R18-B');
const oldDirectory = resolve(dirname(oldPath), 'compiled-R18-B'), old = require(resolve(oldDirectory, 'index.js'));
assert.deepEqual(screen.binding, screen.after);
for (const [file, hash] of Object.entries(result.compiledFiles)) assert.equal(sha(readFileSync(resolve(compiled, file))), hash);
for (const [file, hash] of Object.entries(oldResult.compiledFiles)) assert.equal(sha(readFileSync(resolve(oldDirectory, file))), hash);
assert.deepEqual(result.candidate.parameters, oldResult.candidate.parameters);
const protocol = read(resolve(dirname(screenPath), 'protocol.json'));
verifyFreshHeldout(protocol);
const rows = result.raw.flatMap(artifact => {
  const raw = readFileSync(artifact.path); assert.equal(sha(raw), artifact.sha256);
  return raw.toString().trim().split('\n').map(JSON.parse);
});
let replayed = 0;
for (const row of rows) { verifyFieldCounters(row); verifyFiniteFarmActions(row, core); replayed += row.finiteFarmActions.length; }
assert.deepEqual(recomputeFiniteFarmChecks(rows, protocol), result.finiteFarmChecks);

let equalityChecks = 0;
for (let count = 0; count <= 10; count++) for (const index of [0, 1, 7, 31, 32, 63, 79, 80, 159, 160, 199, 255, 367, 368, 399, 400, 407, 461, 999]) {
  assert.equal(core.fieldMonsterMaxHp(index, count, 11), old.fieldMonsterMaxHp(index, count, 11, count)); equalityChecks++;
  assert.equal(core.fieldMonsterMaxHp(index, count, 10), old.fieldMonsterMaxHp(index, count, 10, count)); equalityChecks++;
  for (const [level, stars] of [[1, 0], [3, 2], [250, 10]]) {
    const member = { id: 'c1', speciesId: 'slime', bossIndex: index, level, stars };
    for (const version of [10, 11]) {
      assert.equal(core.fieldCompanionPower(member, count, version), old.fieldCompanionPower(member, count, version)); equalityChecks++;
    }
    assert.equal(core.companionPower(member), old.companionPower(member)); equalityChecks++;
  }
}
const emptyPath = resolve(here, '../balance/r19-empty-party/report.json'), empty = read(emptyPath);
assert.deepEqual(empty.binding, empty.after); assert.deepEqual(empty.binding, screen.binding);
assert.deepEqual(empty.compiledFiles, result.compiledFiles);
assert.equal(empty.scriptSha256, sha(readFileSync(resolve(dirname(emptyPath), 'run.mjs'))));
let boundaryActions = 0;
for (const row of empty.rows) {
  assert.equal(row.actionsSha256, sha(JSON.stringify(row.actions, null, 2)));
  for (const event of row.actions) {
    let offset = 0, restoring = true;
    const engine = core.createEngine(event.before, { next: () => {
      assert(!restoring && offset < event.rngDraws.length); return event.rngDraws[offset++];
    } }, { equipmentSeed: 0xe011, now: () => event.before.equipment.shop.lastObservedAt });
    assert.deepEqual(engine.toSave(), event.before);
    restoring = false; engine.apply(event.action);
    assert.equal(engine.lastActionError(), null); assert.equal(offset, event.rngDraws.length);
    assert.deepEqual(engine.toSave(), event.after); boundaryActions++;
  }
  const recovery = row.actions.find(action => action.action.type === 'rebirth');
  assert.equal(recovery.before.companions.length, 0); assert.equal(recovery.after.companions.length, 0);
  assert(row.nextCaptureMs > row.recoveredAtMs && row.firstHeroMs > row.nextCaptureMs);
  assert.equal(row.final.hero.reincarnations, 1);
}
const receipt = { reviewer: '/root/skills_harness', passed: true, diagnosticOnly: true, adoptionApproved: false,
  source: screen.binding, candidate: result.candidate, replayedFiniteRecoveryActions: replayed,
  replayedEmptyBoundaryActions: boundaryActions, normalAndLegacyExactEqualityChecks: equalityChecks,
  finite: rows.map(row => ({ quota: row.recoveryQuota, seed: row.seed, preparationMinutes: row.quotaCompletedAtMs / 60000,
    intervalsMinutes: row.cycles.map(cycle => cycle.intervalMs / 60000) })),
  empty: empty.rows.map(row => ({ kind: row.kind, controlled: true, noShopOrTraining: true,
    nextCaptureFromStartMinutes: row.nextCaptureMs / 60000, nextCaptureAfterRecoveryMinutes: (row.nextCaptureMs - row.recoveredAtMs) / 60000,
    firstHeroFromStartMinutes: row.firstHeroMs / 60000, longestKillGapMinutes: row.longestKillGapMs / 60000 })),
  artifacts: Object.fromEntries([screenPath, oldPath, emptyPath, fileURLToPath(import.meta.url), resolve('.harness/v11/balance-verify.mjs')]
    .map(path => [path, sha(readFileSync(path))])),
  limitations: ['One seed per quota is not an80-row quantile pass.', 'Empty-party uses controlled RNG, not sampled ordinary play.',
    'Source predates approved auto-release overflow repair; final evidence must use repaired source.', 'Native, performance and overall release remain pending.'] };
writeFileSync(resolve(here, 'CRITIC_TOTAL_RESET_CANARY_REVIEW.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ replayed, boundaryActions, equalityChecks, finite: receipt.finite, empty: receipt.empty }));
