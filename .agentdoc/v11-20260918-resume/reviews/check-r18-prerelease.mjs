import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { verifyRun, verifyGrowthBinding, verifyManagementBinding, verifyNoResetBinding } from '../../../.harness/v11/balance-verify.mjs';

const base = '.agentdoc/v11-20260918-resume/balance';
const selection = verifyRun(resolve(base, 'r18-explore/report.json'), true);
const changes = candidate => Object.entries(candidate.parameters).filter(([key, value]) => selection.protocol.baselineParameters[key] !== value).length;
const ranked = selection.report.reports.filter(result => result.passed).sort((a, b) =>
  a.score.maximumMedianDeviation - b.score.maximumMedianDeviation || a.score.maximumP90 - b.score.maximumP90 ||
  changes(a.candidate) - changes(b.candidate) || a.candidate.id.localeCompare(b.candidate.id));
assert.equal(ranked[0].candidate.id, 'R18-B');
const reference = { ...selection, report: { ...selection.report, reports: [ranked[0]] } };
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const checked = [{ mode: 'explore', path: resolve(base, 'r18-explore/report.json'), sha256: sha(resolve(base, 'r18-explore/report.json')),
  rows: selection.report.reports.reduce((sum, result) => sum + result.rows, 0), ranking: ranked.map(result => ({ id: result.candidate.id, score: result.score })) }];
for (const [name, mode] of [['r18-growth-b', 'growth'], ['r18-reserve-b', 'reserve-growth'], ['r18-management-b', 'management'], ['r18-no-reset-b', 'no-reset']]) {
  const path = resolve(base, name, 'report.json');
  if (!existsSync(path)) { checked.push({ mode, path, complete: false }); continue; }
  const diagnostic = verifyRun(path, true);
  if (mode === 'growth' || mode === 'reserve-growth') verifyGrowthBinding(diagnostic, reference, 'R18-B', mode === 'reserve-growth');
  else if (mode === 'management') verifyManagementBinding(diagnostic, reference, 'R18-B');
  else verifyNoResetBinding(diagnostic, reference, 'R18-B');
  const result = diagnostic.report.reports[0];
  const rows = result.raw.flatMap(file => readFileSync(file.path, 'utf8').trim().split('\n').map(JSON.parse));
  const guards = result.growthChecks ?? result.reserveGrowthChecks ?? [];
  checked.push({ mode, path, sha256: sha(path), complete: true, sourceAndRawVerified: true, rows: rows.length,
    growthActions: rows.reduce((sum, row) => sum + (row.growthActions?.length ?? 0), 0),
    releases: rows.reduce((sum, row) => sum + (row.managementReleases ?? 0), 0),
    guards: guards.length, guardsPassed: guards.length ? guards.every(check => check.passed) : null,
    minimumP10Minutes: guards.length ? Math.min(...guards.map(check => check.p10)) : null,
    maximumStage: Math.max(...rows.map(row => row.maximumStage)),
    capturedRawPowerDigits: Math.max(...rows.map(row => row.maxCapturedRawPowerDigits)),
    cyclesCompleted: rows.reduce((sum, row) => sum + row.cycles.length, 0),
    nonarrivals: rows.reduce((sum, row) => sum + row.nonarrival, 0) });
}
const evidence = { reviewer: '/root/skills_harness', selectedByOriginalRule: 'R18-B', heldoutVerified: false, releaseApproved: false,
  note: 'Pre-adoption comparison binds diagnostics to the original selection candidate, not to a nonexistent heldout run.',
  scriptSha256: sha(import.meta.filename), verifierSha256: sha('.harness/v11/balance-verify.mjs'), checked };
writeFileSync('.agentdoc/v11-20260918-resume/reviews/CRITIC_R18_PRERELEASE.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
