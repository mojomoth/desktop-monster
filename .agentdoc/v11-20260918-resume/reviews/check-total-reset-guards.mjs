import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFiniteFarmActions, verifyFieldCounters, recomputeFiniteFarmChecks } from '../../../.harness/v11/balance-verify.mjs';
const here = dirname(fileURLToPath(import.meta.url)), sha = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(readFileSync(path));
const screenPath = resolve(here, '../balance/r19-finite-screen-guards/report.json'), screen = read(screenPath), result = screen.reports[0];
const compiled = resolve(dirname(screenPath), 'compiled-R19-B'), core = createRequire(import.meta.url)(resolve(compiled, 'index.js'));
assert.deepEqual(screen.binding, screen.after);
for (const [file, hash] of Object.entries(screen.binding.files)) assert.equal(sha(readFileSync(resolve('src/core', file))), hash);
for (const [file, hash] of Object.entries(result.compiledFiles)) assert.equal(sha(readFileSync(resolve(compiled, file))), hash);
const rows = result.raw.flatMap(artifact => {
  const bytes = readFileSync(artifact.path); assert.equal(sha(bytes), artifact.sha256);
  return bytes.toString().trim().split('\n').map(JSON.parse);
});
for (const row of rows) { verifyFieldCounters(row); verifyFiniteFarmActions(row, core); }
assert.deepEqual(recomputeFiniteFarmChecks(rows, read(resolve(dirname(screenPath), 'protocol.json'))), result.finiteFarmChecks);
const boundaryPath = resolve(here, '../balance/r19-after50-empty-party/report.json'), boundary = read(boundaryPath);
assert.deepEqual(boundary.binding, screen.binding); assert.deepEqual(boundary.binding, boundary.after);
assert.deepEqual(boundary.compiledFiles, result.compiledFiles);
assert.equal(boundary.scriptSha256, sha(readFileSync(resolve(dirname(boundaryPath), 'run.mjs'))));
const row = boundary.rows[0], originalSave = rows.find(item => item.recoveryQuota === 50).finiteFarmActions.at(-1).after;
assert.equal(row.startingReceiptSha256, sha(JSON.stringify(originalSave, null, 2)));
assert.deepEqual(row.actions[0].before, originalSave);
assert.equal(row.actionsSha256, sha(JSON.stringify(row.actions, null, 2)));
for (const event of row.actions) {
  let index = 0, restoring = true;
  const engine = core.createEngine(event.before, { next: () => {
    assert(!restoring && index < event.rngDraws.length); return event.rngDraws[index++];
  } }, { equipmentSeed: 0xe011, now: () => event.before.equipment.shop.lastObservedAt });
  assert.deepEqual(engine.toSave(), event.before); restoring = false;
  engine.apply(event.action); assert.equal(engine.lastActionError(), null);
  assert.equal(index, event.rngDraws.length); assert.deepEqual(engine.toSave(), event.after);
}
const releases = row.actions.filter(event => event.action.type === 'sacrifice');
assert.equal(releases.length, 30); assert.equal(releases.at(-1).after.companions.length, 0);
assert.equal(releases.at(-1).after.rebirths, 50); assert.equal(row.final.hero.reincarnations, 1);
const review = { reviewer: '/root/skills_harness', passed: true, qualifyingEvaluationGo: true, adoptionApproved: false,
  source: screen.binding, candidate: result.candidate, replayedRecoveryActions: rows.reduce((sum, item) => sum + item.finiteFarmActions.length, 0),
  replayedBoundaryActions: row.actions.length,
  finite: rows.map(item => ({ quota: item.recoveryQuota, firstHeroIncludingPrepMinutes: item.cycles[0].intervalMs / 60000,
    laterMinutes: item.cycles.slice(1).map(cycle => cycle.intervalMs / 60000) })),
  after50EmptyParty: { sacrifices: 30, preparationMinutes: row.priorFarmingMs / 60000,
    captureAfterRemovalMinutes: row.nextCaptureMs / 60000, heroAfterRemovalMinutes: row.firstHeroMs / 60000,
    totalHeroIncludingPreparationMinutes: (row.firstHeroMs + row.priorFarmingMs) / 60000 },
  artifacts: Object.fromEntries([screenPath, boundaryPath, fileURLToPath(import.meta.url), resolve('.harness/v11/balance-verify.mjs')]
    .map(path => [path, sha(readFileSync(path))])),
  limitations: ['Canary is one seed per quota, not the registered80-row guard.', 'Controlled empty-party paths do not estimate population timing.',
    'Original280, all diagnostics, fresh heldout, native, performance and packaging remain required.'] };
writeFileSync(resolve(here, 'CRITIC_TOTAL_RESET_GUARDS_REVIEW.json'), JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({ replayed: review.replayedRecoveryActions, boundaryActions: review.replayedBoundaryActions,
  after50EmptyParty: review.after50EmptyParty, qualifyingEvaluationGo: true }));
