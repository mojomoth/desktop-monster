import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { acceptReport, auditStatus, newAudit, renderReport, reportTemplate, validateArtifacts, verifyEvidence } from './audit.mjs';
import { sha256, sourceDigest, evaluationDigest } from './evidence.mjs';
import { summarize } from './measure.mjs';

// Synthetic fixtures test evidence validation only; these are never real game results.
const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });

function fixtures() {
  const dir = mkdtempSync(resolve(tmpdir(), 'desmon-audit-test-'));
  temporary.push(dir);
  const digest = sourceDigest();
  const screenshot = resolve(dir, 'synthetic.png');
  writeFileSync(screenshot, 'SYNTHETIC SCREENSHOT HASH FIXTURE');
  const e2e = {
    schemaVersion: 1, mode: 'electron-e2e', sourceDigest: digest, command: 'SYNTHETIC E2E FIXTURE',
    status: 'failed', startedAt: '2026-09-10T00:00:00.000Z', elapsedMs: 310_000,
    checks: [{ id: 'progress-gauge', passed: false, details: 'SYNTHETIC BUG' }], errors: [],
    sessions: [{ profile: 'active', minutes: 5, mode: 'real-time', elapsedMs: 300_000, inputs: 600,
      start: { kills: 0 }, end: { kills: 10 }, timeline: [{ elapsedMs: 300_000, kills: 10 }] }],
    screenshots: [{ path: screenshot, sha256: sha256(readFileSync(screenshot)) }], limitations: ['Synthetic fixture, not an actual playtest.'],
  };
  const groups = [5, 15, 30].flatMap((minutes) => ['active', 'idle', 'intermittent'].map((profile) => ({ policy: 'free', minutes, profile })));
  const observed = { level: 1, kills: 10, coins: 10, income: 10, spent: 0, companions: 1, collected: 1, reincarnations: 1,
    rareSeen: 0, monstersSeen: 2, offers: 1, unseenFirstCards: 1, released: 0, strongerReleased: 0, training: 0,
    heroDps: 1, companionDps: 1, heroDamagePercent: 50, longestKillGapSec: 10, longestMeaningfulGapSec: 10,
    longestDiscoveryGapSec: 10, meaningfulEvents: 2, onboardingCompanions: 1, feverStarts: 0,
    firstKillSec: 10, firstRewardSec: 10, firstLevelSec: 10, firstCaptureSec: 10, firstOfferSec: 10 };
  const rawSamples = groups.flatMap((group) => Array.from({ length: 100 }, (_, n) => ({ ...group, seed: n + 1, ...observed })));
  const measure = { mode: 'simulated', sourceDigest: digest, command: ['SYNTHETIC', 'MEASUREMENT'], samples: 100,
    seeds: { first: 1, last: 100, count: 100 }, scenarios: summarize(rawSamples), rawSamples,
  };
  const e2ePath = resolve(dir, 'e2e.json'), measurePath = resolve(dir, 'measure.json');
  writeFileSync(e2ePath, JSON.stringify(e2e));
  writeFileSync(measurePath, JSON.stringify(measure));
  const session = newAudit(e2ePath, measurePath, digest);
  return { dir, digest, e2e, measure, e2ePath, measurePath, screenshot, session, artifacts: { e2e, measure } };
}

function report(session: ReturnType<typeof newAudit>) {
  const draft = reportTemplate(session);
  Object.assign(draft, { agent: `independent-${session.role}`, summary: 'Synthetic role analysis; not game evidence.',
    coverage: draft.coverage.map((c: object) => ({ ...c, assessment: 'Synthetic category coverage.', confidence: 'low', unknowns: ['Human fun unmeasured.'] })),
    evidence: [{ artifact: 'e2e', pointer: '/checks/0', note: 'Synthetic functional check.' }, { artifact: 'measure', pointer: '/scenarios/0', note: 'Synthetic measurement.' }],
  });
  if (session.role === 'designer') Object.assign(draft, {
    alternatives: [{ name: 'A', tradeoff: 'Clarity.' }, { name: 'B', tradeoff: 'Pacing.' }, { name: 'C', tradeoff: 'Choice.' }], choice: 'A',
    hypotheses: [{ metric: 'Gauge correctness', target: 'No misleading full gauge.', rationale: 'Users need an accurate next goal.' }],
    findings: [{ id: 'D1', category: 'bug', severity: 'major', problem: 'Synthetic incorrect gauge.', fix: 'Use the actual required level.', evidence: 'e2e#/checks/0' }],
  });
  if (session.role === 'critic') draft.challenges = [{ proposal: 'A', counterexample: 'A correct gauge alone may still be boring.', verdict: 'Fix the bug; separately test discovery motivation.' }];
  if (session.role === 'balance') draft.metrics = [{ name: 'Kills', evidence: 'measure#/scenarios/0/metrics/kills', interpretation: 'Synthetic distribution.', limitation: 'Not a human observation.' }];
  if (session.role === 'playtester') draft.nextUpdates = [{ priority: 1, title: 'Accurate next goal', hypothesis: 'Clear readiness reduces mistaken opens.', metric: 'Mistaken menu opens', acceptance: 'Gauge reflects required level at each tier.', cost: 'Small HUD change.', basis: ['D1'] }];
  return draft;
}

describe('evidence-first game audit', () => {
  it('requires actual-time Electron evidence and distinct raw simulation seeds', () => {
    const { e2e, measure, digest } = fixtures();
    expect(() => validateArtifacts({ ...e2e, mode: 'browser-preview' }, measure, digest)).toThrow('actual electron-e2e');
    expect(() => validateArtifacts({ ...e2e, checks: [] }, measure, digest)).toThrow('recorded checks');
    expect(() => validateArtifacts({ ...e2e, sessions: [] }, measure, digest)).toThrow('real-time sessions');
    expect(() => validateArtifacts({ ...e2e, sessions: [{ ...e2e.sessions[0], elapsedMs: 10 }] }, measure, digest)).toThrow('actually last');
    expect(() => validateArtifacts({ ...e2e, status: 'passed' }, measure, digest)).toThrow('cannot be labelled passed');
    expect(() => validateArtifacts(e2e, { ...measure, rawSamples: [] }, digest)).toThrow('raw sample');
    expect(() => validateArtifacts(e2e, { ...measure, rawSamples: measure.rawSamples.map((r) => ({ ...r, seed: 1 })) }, digest)).toThrow('distinct raw seeds');
    const invented = structuredClone(measure);
    invented.scenarios[0].metrics.kills.p50 = 999;
    expect(() => validateArtifacts(e2e, invented, digest)).toThrow('must match the raw samples');
  });

  it('rejects stale source, artifact replacement and screenshot replacement', () => {
    const f = fixtures();
    expect(() => newAudit(f.e2ePath, f.measurePath, 'different-source')).toThrow('Stale source');
    expect(() => verifyEvidence(f.session, 'different-source')).toThrow('Stale source');
    expect(verifyEvidence(f.session, f.digest).e2e.status).toBe('failed');
    writeFileSync(f.screenshot, 'REPLACED');
    expect(() => verifyEvidence(f.session, f.digest)).toThrow('screenshot');
    writeFileSync(f.e2ePath, JSON.stringify({ ...f.e2e, status: 'passed' }));
    expect(() => verifyEvidence(f.session, f.digest)).toThrow('Changed e2e artifact');
  });

  it('binds modern single-run tools and linked experiment bytes before accepting a review', () => {
    const f = fixtures();
    expect(() => validateArtifacts({...f.e2e, evaluationDigest:'old-tools'}, f.measure, f.digest)).toThrow('Stale E2E');
    expect(() => validateArtifacts(f.e2e, {...f.measure,evaluationDigest:'old-tools'}, f.digest)).toThrow('Stale measurement');
    const path = resolve(f.dir, 'experiment.json');writeFileSync(path, '{}');
    expect(() => validateArtifacts(f.e2e, {...f.measure,evaluationDigest:evaluationDigest(),experiments:{path,sha256:'changed'}}, f.digest)).toThrow('Changed linked');
    expect(() => validateArtifacts(f.e2e, {...f.measure,experiments:{path,sha256:sha256('{}'),sourceDigest:'old-source'}}, f.digest)).toThrow('Stale linked experiment source');
  });

  it('preserves state on reordered reports, duplicate agents and nonexistent evidence', () => {
    const { session, artifacts } = fixtures();
    const before = JSON.stringify(session);
    expect(() => acceptReport(session, { ...report(session), role: 'critic' }, artifacts)).toThrow('reordered role');
    expect(() => acceptReport(session, { ...report(session), evidence: [{ artifact: 'e2e', pointer: '/invented', note: 'Fake observation' }] }, artifacts)).toThrow('Missing evidence');
    expect(JSON.stringify(session)).toBe(before);
    const critic = acceptReport(session, report(session), artifacts);
    expect(() => acceptReport(critic, { ...report(critic), agent: 'independent-designer' }, artifacts)).toThrow('different agent');
    const balance = acceptReport(critic, report(critic), artifacts);
    expect(() => acceptReport(balance, { ...report(balance), agent: 'independent-designer' }, artifacts)).toThrow('different agent');
    expect(() => acceptReport(balance, report(critic), artifacts)).toThrow('reordered requestId');
  });

  it('completes an honest audit with known bugs while keeping human fun and unplayed durations pending', () => {
    const { session, artifacts } = fixtures();
    let next = session;
    for (const role of ['designer', 'critic', 'balance', 'playtester']) {
      expect(next.role).toBe(role);
      next = acceptReport(next, report(next), artifacts);
    }
    expect(auditStatus(next, artifacts)).toMatchObject({ status: 'audit_complete', functionalE2E: 'failed', humanFun: 'PENDING', release: 'NOT_EVALUATED', findings: 1 });
    const output = renderReport(next, artifacts);
    expect(output).toContain('D1 · major · bug');
    expect(output).toContain('| 5 | active | 5.00분 관측 |');
    expect(output).toContain('| 30 | idle | PENDING: 시뮬레이션만 있음 |');
    expect(output).toContain('1. Accurate next goal');
    expect(() => reportTemplate(next)).toThrow('Audit complete');
  });

  it('requires grounded updates and cannot upgrade automation into human fun validation', () => {
    const { session, artifacts } = fixtures();
    let next = session;
    for (let i = 0; i < 3; i++) next = acceptReport(next, report(next), artifacts);
    const draft = report(next);
    expect(() => acceptReport(next, { ...draft, humanChecks: 'COMPLETE: fun proved' }, artifacts)).toThrow('must remain PENDING');
    draft.nextUpdates[0].basis = ['invented'];
    expect(() => acceptReport(next, draft, artifacts)).toThrow('existing finding');
  });

  it('resumes the CLI from disk and preserves an audit after a rejected submission', () => {
    const f = fixtures();
    const dir = resolve(f.dir, 'audit');
    const cli = (...args: string[]) => spawnSync(process.execPath, [resolve('.harness/v5/loop/audit.mjs'), ...args], { encoding: 'utf8' });
    expect(cli('init', dir, f.e2ePath, f.measurePath).status).toBe(0);
    expect(cli('init', dir, f.e2ePath, f.measurePath).status).toBe(1);
    const issued = cli('next', dir);
    expect(issued.status).toBe(0);
    expect(readFileSync(JSON.parse(issued.stdout).prompt, 'utf8')).toContain('designer');
    const draft = report(f.session);
    const response = resolve(f.dir, 'response.json');
    writeFileSync(response, JSON.stringify({ ...draft, role: 'critic' }));
    const before = readFileSync(resolve(dir, 'audit.json'), 'utf8');
    expect(cli('submit', dir, response).status).toBe(1);
    expect(readFileSync(resolve(dir, 'audit.json'), 'utf8')).toBe(before);
    writeFileSync(response, JSON.stringify(draft));
    expect(cli('submit', dir, response).status).toBe(0);
    expect(JSON.parse(cli('status', dir).stdout)).toMatchObject({ next: 'critic', reports: 1, functionalE2E: 'failed' });
    expect(cli('report', dir).status).toBe(1);
  });
});
