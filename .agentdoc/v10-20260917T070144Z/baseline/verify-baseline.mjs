import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportPath = resolve(process.argv[2]);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.kind, 'independent-preserved-baseline');
assert.equal(report.agentId, '/root/harness_critic');
assert.equal(report.passed, true);
assert.equal(hash(readFileSync(report.raw)), report.rawHash);
assert.equal(hash(readFileSync(join(dirname(reportPath), 'protocol.json'))), report.protocolHash);
for (const [path, expected] of Object.entries(report.binding)) assert.equal(hash(readFileSync(path)), expected, path);
const rows = readFileSync(report.raw, 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(rows.length, report.seeds.count * report.policies.length * report.checkpointsMs.length);
assert.equal(rows.length, report.rowCount);
assert.equal(new Set(rows.map(row => `${row.seed}/${row.policy}/${row.atMs}`)).size, rows.length);
for (const row of rows) {
  const policy = report.policies.find(policy => policy.id === row.policy);
  assert(policy);
  assert(row.seed >= report.seeds.first && row.seed < report.seeds.first + report.seeds.count);
  assert(report.checkpointsMs.includes(row.atMs));
  assert.equal(row.inputCount, policy.inputEveryMs ? row.atMs / policy.inputEveryMs : 0);
  for (const key of ['coins', 'level', 'maxLevel', 'kills', 'bossKills', 'reincarnations']) assert(Number.isSafeInteger(row[key]) && row[key] >= 0, key);
  assert(row.maxLevel >= row.level);
  assert.equal(Object.values(row.levelSeconds).reduce((sum, count) => sum + count, 0), row.atMs / 1000);
  assert.equal(row.heroActions.length, row.reincarnations);
  row.heroActions.forEach((action, i) => {
    assert.equal(action.reincarnations, i + 1);
    assert(action.atMs <= row.atMs && action.atMs % policy.visitEveryMs === 0);
    assert(action.priorLevel <= row.maxLevel);
  });
  const earlier = rows.filter(other => other.policy === row.policy && other.seed === row.seed && other.atMs < row.atMs);
  for (const previous of earlier) {
    assert(row.coins >= previous.coins);
    assert(row.kills >= previous.kills);
    assert(row.maxLevel >= previous.maxLevel);
    assert(row.reincarnations >= previous.reincarnations);
  }
}
function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], p10: sorted[Math.floor((sorted.length - 1) * .1)], p50: sorted[Math.floor((sorted.length - 1) * .5)],
    p90: sorted[Math.floor((sorted.length - 1) * .9)], max: sorted.at(-1) };
}
for (const summary of report.summary) {
  const subset = rows.filter(row => row.policy === summary.policy && row.atMs === summary.minutes * 60000);
  assert.equal(subset.length, summary.samples);
  assert.equal(summary.samples, report.seeds.count);
  for (const key of ['coins', 'level', 'maxLevel', 'bossKills', 'reincarnations', 'bestIndex']) {
    assert.deepEqual(summary[key], distribution(subset.map(row => row[key])));
  }
  for (const [level, share] of Object.entries(summary.levelReach)) assert.equal(share, subset.filter(row => row.maxLevel >= Number(level)).length / subset.length);
}
console.log(JSON.stringify({ passed: true, report: reportPath, trajectories: report.seeds.count * report.policies.length, rows: rows.length }));
