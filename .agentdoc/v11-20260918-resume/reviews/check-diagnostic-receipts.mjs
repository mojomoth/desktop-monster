import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { verifyRun } from '../../../.harness/v11/balance-verify.mjs';

const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const checks = [];
for (const name of ['r15-reserve-a', 'r16-no-reset-a']) {
  const reportPath = resolve('.agentdoc/v11-20260918-resume/balance', name, 'report.json');
  const started = performance.now();
  const { report } = verifyRun(reportPath);
  const result = report.reports[0];
  const rows = result.raw.flatMap(file => readFileSync(file.path, 'utf8').trim().split('\n').map(JSON.parse));
  checks.push({ name, reportPath, reportSha256: hash(reportPath), archiveVerified: true, mode: report.mode,
    candidate: result.candidate.id, trajectories: rows.length,
    actualActions: rows.reduce((sum, row) => sum + (row.growthActions?.length ?? 0) + (row.noResetActions?.length ?? 0), 0),
    p10Minutes: result.reserveGrowthChecks?.map(check => check.p10) ?? null,
    guardsPassed: result.reserveGrowthPassed ?? null,
    stageRange: [Math.min(...rows.map(row => row.final.stage)), Math.max(...rows.map(row => row.final.stage))],
    rawPowerDigitsRange: [Math.min(...rows.map(row => row.maxCapturedRawPowerDigits)), Math.max(...rows.map(row => row.maxCapturedRawPowerDigits))],
    heroReincarnations: [...new Set(rows.map(row => row.finalHeroReincarnations ?? row.cycles.length))],
    exposureHours: [...new Set(rows.map(row => row.durationMs / 3600000))],
    elapsedMs: performance.now() - started,
    limitation: name === 'r15-reserve-a' ? 'Reserve policy passes its ten guards; original R15-A pacing gates fail, so no adoption.' :
      'All twenty rows have zero releases, so the actual release branch is unobserved. Old arithmetic source superseded; selected-source diagnostic must be rerun.' });
}
const evidence = { reviewer: '/root/skills_harness', currentProductionAcceptance: false,
  verifierSha256: hash('.harness/v11/balance-verify.mjs'), scriptSha256: hash(import.meta.filename), checks };
writeFileSync('.agentdoc/v11-20260918-resume/reviews/CRITIC_DIAGNOSTIC_RECEIPTS.json', JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
