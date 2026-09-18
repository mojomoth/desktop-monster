import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { acceptReport, auditStatus, newAudit, renderReport, reportTemplate, validateArtifacts, verifyEvidence, verifyReleaseReview } from './audit.mjs';
import { sha256, sourceDigest, evaluationDigest } from './evidence.mjs';
import { summarize, evaluateTargets } from './measure.mjs';
import { CONFIG } from './config.mjs';

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
    schemaVersion: 3, mode: 'electron-e2e', sourceDigest: digest, evaluationDigest:evaluationDigest(), command: 'SYNTHETIC E2E FIXTURE',
    status: 'failed', startedAt: '2026-09-10T00:00:00.000Z', elapsedMs: 310_000,
    checks: [{ id: 'progress-gauge', passed: false, details: 'SYNTHETIC BUG' }], errors: [],
    sessions: [{ profile: 'active', minutes: 5, mode: 'real-time', elapsedMs: 300_000, inputs: 600,
      start: { kills: 0 }, end: { kills: 10 }, timeline: [{ elapsedMs: 300_000, kills: 10 }] }],
    screenshots: [{ path: screenshot, sha256: sha256(readFileSync(screenshot)) }], limitations: ['Synthetic fixture, not an actual playtest.'],
  };
  const settings=CONFIG.measurement;
  const protocol={schemaVersion:1,harnessVersion:7,kind:'desmon-v07-evaluation',phase:'candidate',fixture:'fresh',
    milestones:[{id:'late-hero',label:'Synthetic milestone',kind:'hero',ids:['synthetic-hero'],final:true}],
    candidates:[{id:'synthetic',hypothesis:'Fixture only',parameters:{}}],selectedCandidate:'synthetic',frozenAt:'2026-09-11T00:00:00Z'};
  const firsts=Object.fromEntries(['firstKillSec','firstRewardSec','firstLevelSec','firstCaptureSec','firstReadySec','firstOpenSec','firstAcceptedSec'].map(key=>[key,null]));
  const counts=Object.fromEntries(['eligibleHero','eligibleMonster','seenHero','seenMonster','chosenHero','killedMonster','capturedMonster'].map(key=>[`${key}Count`,0]));
  const checkpoints=settings.checkpointsMinutes.map((minutes:number)=>({minutes,level:1,kills:0,coins:0,income:0,spent:0,companions:0,maxCompanionLevel:0,reincarnations:0,
    training:0,offers:0,rerolls:0,managementActions:0,feverStarts:0,inputCount:0,longestKillGapSec:minutes*60,longestMeaningfulGapSec:minutes*60,longestDiscoveryGapSec:minutes*60,
    lastUnlockSec:null,...firsts,...counts,heroDamage:'0',companionDamage:'0',partyPower:'0'}));
  const runs=Array.from({length:100},(_,n)=>({policy:settings.baseline,seed:n+1,initial:{coins:0,kills:0,reincarnations:0},records:[],actions:[],checkpoints}));
  const fixture=null;
  const buildFiles={'synthetic.js':sha256('synthetic build')};
  const measure={version:7,kind:'simulated-engine-measurement',phase:'candidate',rawComplete:true,screening:false,checkpointsMinutes:settings.checkpointsMinutes,sourceDigest:digest,evaluationDigest:evaluationDigest(),
    build:{files:buildFiles,sha256:sha256(JSON.stringify(buildFiles))},settings,protocol,protocolSha256:sha256(JSON.stringify(protocol)),fixture,fixtureSha256:sha256(JSON.stringify(fixture)),seedSet:'validation',seeds:settings.seeds.validation,
    policies:[settings.baseline],catalog:{hero:['synthetic-hero'],monster:['synthetic-monster']},runs,rawSha256:sha256(JSON.stringify(runs)),
    scenarios:summarize(runs),targets:evaluateTargets(runs,settings,protocol.milestones)};
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
    expect(() => validateArtifacts({ ...e2e, mode: 'browser-preview' }, measure, digest)).toThrow('Actual Electron');
    expect(() => validateArtifacts({ ...e2e, checks: [] }, measure, digest)).toThrow('individual check');
    expect(() => validateArtifacts({ ...e2e, sessions: [] }, measure, digest)).toThrow('Real observation');
    expect(() => validateArtifacts({ ...e2e, sessions: [{ ...e2e.sessions[0], elapsedMs: 10 }] }, measure, digest)).toThrow('shorter');
    expect(() => validateArtifacts({ ...e2e, status: 'passed' }, measure, digest)).toThrow('cannot be marked passed');
    expect(() => validateArtifacts(e2e, { ...measure, runs: [] }, digest)).toThrow('fingerprint');
    expect(() => validateArtifacts(e2e, { ...measure, runs: measure.runs.map(r => ({ ...r, seed: 1 })) }, digest)).toThrow('fingerprint');
    const invented = structuredClone(measure);
    invented.scenarios[0].metrics.kills.p50 = 999;
    expect(() => validateArtifacts(e2e, invented, digest)).toThrow('Summary differs');
  });

  it('accepts evidence larger than the old 30MB limit but rejects files above the configured bound before parsing',()=>{
    const f=fixtures();
    writeFileSync(f.measurePath,JSON.stringify(f.measure)+' '.repeat(31_000_000));
    expect(()=>newAudit(f.e2ePath,f.measurePath,f.digest)).not.toThrow();
    // Sparse extension tests the upper bound without allocating a 256MiB JSON value.
    truncateSync(f.measurePath,CONFIG.measurement.maxArtifactBytes+1);
    expect(()=>newAudit(f.e2ePath,f.measurePath,f.digest)).toThrow(`<=${CONFIG.measurement.maxArtifactBytes} bytes`);
  });
  it('rejects stale source, artifact replacement and screenshot replacement', () => {
    const f = fixtures();
    expect(() => newAudit(f.e2ePath, f.measurePath, 'different-source')).toThrow('stale measurement');
    expect(() => verifyEvidence(f.session, 'different-source')).toThrow('Stale source');
    expect(verifyEvidence(f.session, f.digest).e2e.status).toBe('failed');
    writeFileSync(f.screenshot, 'REPLACED');
    expect(() => verifyEvidence(f.session, f.digest)).toThrow('screenshot');
    writeFileSync(f.e2ePath, JSON.stringify({ ...f.e2e, status: 'passed' }));
    expect(() => verifyEvidence(f.session, f.digest)).toThrow('Changed e2e artifact');
  });

  it('binds v7 source/evaluation and rejects a baseline masquerading as a candidate', () => {
    const f=fixtures();
    expect(()=>validateArtifacts({...f.e2e,evaluationDigest:'old-tools'},f.measure,f.digest)).toThrow('Stale Electron');
    expect(()=>validateArtifacts(f.e2e,{...f.measure,evaluationDigest:'old-tools'},f.digest)).toThrow('stale measurement');
    expect(()=>validateArtifacts(f.e2e,{...f.measure,phase:'baseline'},f.digest)).toThrow('baseline');
    expect(()=>validateArtifacts(f.e2e,{...f.measure,version:5},f.digest)).toThrow('v7');
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
    expect(() => verifyReleaseReview(next,artifacts)).toThrow('Release-phase measurement');
  });

  it('rejects candidate-only policies for release approval even when a claimed target verdict passes',()=>{
    const {session,artifacts}=fixtures();let next=session;
    for(let i=0;i<4;i++)next=acceptReport(next,report(next),artifacts);
    const smallerSuite={...artifacts.measure,phase:'candidate',targets:{...artifacts.measure.targets,passed:true}};
    expect(smallerSuite.policies.length).toBeLessThan(CONFIG.measurement.validationPolicies.length);
    expect(()=>verifyReleaseReview(next,{...artifacts,measure:smallerSuite})).toThrow('full registered policy suite');
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

  it('permits an empty next-update list when reviewers have no findings instead of forcing an invented problem',()=>{
    const {session,artifacts}=fixtures();let next=session;
    for(let i=0;i<3;i++)next=acceptReport(next,{...report(next),findings:[]},artifacts);
    next=acceptReport(next,{...report(next),nextUpdates:[]},artifacts);
    expect(next.status).toBe('audit_complete');
  });
  it('resumes the CLI from disk and preserves an audit after a rejected submission', () => {
    const f = fixtures();
    const dir = resolve(f.dir, 'audit');
    const cli = (...args: string[]) => spawnSync(process.execPath, [resolve('.harness/v7/loop/audit.mjs'), ...args], { encoding: 'utf8' });
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
