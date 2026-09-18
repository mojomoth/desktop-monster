import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { acceptReport, newSession, reportTemplate, requestFor, refreshInputs, verifyDesign } from './fun.mjs';

type Session = ReturnType<typeof newSession>;
const evidence = () => 'SYNTHETIC TEST FIXTURE: verifies queue mechanics, not game balance or human fun.';
const issue = { id: 'C1', severity: 'major', problem: 'Reroll dominates the free path.', fix: 'Shorten free deferral and bound the buff roll.' };

function report(session: Session) {
  const draft = reportTemplate(session);
  draft.coverage = draft.coverage.map((entry: { id: string }) => ({ ...entry, assessment: 'Synthetic feature assessment, not implementation evidence.' }));
  Object.assign(draft, { agent: `test-${session.role}`, summary: 'Synthetic report for queue validation only.', evidence: [{ path: 'fixture.txt', note: 'Synthetic fixture' }] });
  if (session.role === 'designer') Object.assign(draft, {
    alternatives: [
      { name: 'A', tradeoff: 'Stronger level damage; fewer long fights.' },
      { name: 'B', tradeoff: 'More coin rewards; less scarcity.' },
      { name: 'C', tradeoff: 'More prompts; more interruption.' },
    ], choice: 'A', hypotheses: [{ metric: 'Free retry delay', target: '<=30 simulated seconds' }],
    resolves: session.openFindings.map((finding: { id: string }) => ({ id: finding.id, change: 'Bound the retry wait and buff roll.' })),
  });
  if (session.role === 'balance') Object.assign(draft, {
    protocol: {path:'fixture.txt',explorationSeeds:[10001,10020],validationSeeds:[1,100],policy:'free active immediate choice',milestones:'named hero group',censoring:'all seeds count at deadline'},
    metrics: [{name:'first reincarnation',unit:'seconds',target:'p50 2700..3600',deadline:'at least 90 of 100 by 5400'}],
    economy: { sources: 'Kills grant gold.', sinks: 'Reroll consumes gold.', freePath: 'A free retry arrives in 30 seconds.' },
  });
  if (session.role === 'playtester') Object.assign(draft, {
    scenarios: draft.scenarios.map((scenario: object) => ({ ...scenario, action:'Observe a real UI action',expected:'Persist intended state',evidencePlan:'Native screenshot and saved state' })),
  });
  return draft;
}

const advance = (session: Session) => acceptReport(session, report(session), evidence);
const toRole = (role: string) => {
  let session = newSession();
  while (session.role !== role) session = advance(session);
  return session;
};

describe('v7 fun-review protocol', () => {
  it('accepts only ordered reports and distinguishes design approval from measurement and release completion', () => {
    let session = newSession();
    for (const role of ['designer', 'critic', 'balance', 'playtester']) {
      expect(session.role).toBe(role);
      session = advance(session);
    }
    expect(session.status).toBe('design_review_complete');
    expect(verifyDesign(session)).toMatchObject({release:'NOT_EVALUATED',humanFun:'PENDING'});
    expect(session.role).toBeNull();
    expect(session.history.map((entry: { report: { role: string } }) => entry.report.role)).toEqual(['designer', 'critic', 'balance', 'playtester']);
    expect(() => requestFor(session)).toThrow('Review complete');
  });

  it('returns a critic veto to designer, requires a concrete revision and fresh verification', () => {
    let session = toRole('critic');
    const staleCritic = report(session);
    session = acceptReport(session, { ...staleCritic, decision: 'revise', findings: [issue] }, evidence);
    expect(session.round).toBe(2);
    expect(session.role).toBe('designer');
    expect(() => acceptReport(session, { ...report(session), resolves: [] }, evidence)).toThrow('Resolve every veto');
    session = advance(session);
    expect(() => acceptReport(session, staleCritic, evidence)).toThrow('Stale or out-of-order');
    expect(() => acceptReport(session, { ...report(session), verified: [] }, evidence)).toThrow('verify every requested revision');
    session = advance(session);
    expect(session.role).toBe('balance');
    expect(session.openFindings).toEqual([]);
    session = advance(advance(session));
    expect(session.status).toBe('design_review_complete');
  });

  it.each(['balance', 'playtester'])('routes %s failures through a new designer and critic pass', (role) => {
    const session = toRole(role);
    const revised = acceptReport(session, { ...report(session), decision: 'revise', findings: [issue] }, evidence);
    expect(revised.role).toBe('designer');
    expect(revised.round).toBe(2);
    expect(advance(revised).role).toBe('critic');
  });

  it('rejects bypassing critic, self-review and approvals with unresolved major findings', () => {
    const session = toRole('critic');
    expect(() => acceptReport(session, { ...report(session), role: 'balance' }, evidence)).toThrow('out-of-order role');
    expect(() => acceptReport(session, { ...report(session), agent: 'test-designer' }, evidence)).toThrow('different agent');
    expect(() => acceptReport(session, { ...report(session), findings: [issue] }, evidence)).toThrow('veto approval');
  });

  it('rebinds changed preregistration only after a genuine veto, preserving prior evidence and requiring a new full round',()=>{
    const source='a'.repeat(64),oldEvaluation='b'.repeat(64),newEvaluation='c'.repeat(64);
    let session=newSession(source,oldEvaluation);
    const accept=(current:Session,draft:ReturnType<typeof report>,tools=oldEvaluation)=>acceptReport(current,draft,evidence,source,tools);
    expect(()=>refreshInputs(session,source,newEvaluation)).toThrow('reviewer veto');
    session=accept(session,report(session));
    session=accept(session,{...report(session),decision:'revise',findings:[issue]});
    const stale=report(session),oldRequest=requestFor(session).requestId;
    const refreshed=refreshInputs(session,source,newEvaluation);
    expect(refreshed.history).toEqual(session.history);
    expect(refreshed.openFindings).toEqual(session.openFindings);
    expect(refreshed.inputHistory[0].evaluationDigest).toBe(oldEvaluation);
    expect(requestFor(refreshed).requestId).not.toBe(oldRequest);
    expect(()=>accept(refreshed,stale,newEvaluation)).toThrow('Stale');
    session=refreshed;
    for(const role of ['designer','critic','balance','playtester']){
      expect(session.role).toBe(role);session=accept(session,report(session),newEvaluation);
    }
    expect(verifyDesign(session,source,newEvaluation).status).toBe('design_review_complete');
    expect(()=>verifyDesign(session,source,oldEvaluation)).toThrow('Stale');
    expect(()=>refreshInputs(session,source,oldEvaluation)).toThrow('reviewer veto');
    const duplicate=structuredClone(session);duplicate.history.at(-1).report.agent='test-designer';
    expect(()=>verifyDesign(duplicate,source,newEvaluation)).toThrow('independent');
  });
  it('rejects missing evidence without mutating state and snapshots accepted evidence', () => {
    const session = newSession();
    const before = JSON.stringify(session);
    expect(() => acceptReport(session, report(session), () => { throw new Error('Missing log'); })).toThrow('Missing log');
    expect(JSON.stringify(session)).toBe(before);
    const accepted = advance(session);
    expect(accepted.history[0].evidence[0].content).toBe(evidence());
    expect(accepted.history[0].evidence[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('requires preregistered targets, separate seeds and complete planned scenarios without invented play results', () => {
    const balance = toRole('balance');
    const invalid = report(balance);
    invalid.protocol.validationSeeds = [10001,10020];
    expect(() => acceptReport(balance, invalid, evidence)).toThrow('separate');
    expect(() => acceptReport(balance, {...report(balance), metrics:[]}, evidence)).toThrow('targets');
    const playtester = toRole('playtester');
    const duplicate = report(playtester);
    duplicate.scenarios[0] = duplicate.scenarios[1];
    expect(() => acceptReport(playtester, duplicate, evidence)).toThrow('every v7 requirement');
    expect(() => acceptReport(playtester, {...report(playtester), humanChecks:'COMPLETE'}, evidence)).toThrow('PENDING');
  });
  it('rejects legacy sessions and stale source/evaluation requests', () => {
    const session = newSession();
    expect(() => requestFor({...session,version:5})).toThrow('v7');
    expect(() => acceptReport(session,{...report(session),evaluationDigest:'old'},evidence)).toThrow('evaluationDigest');
    const balance = toRole('balance');
    expect(() => acceptReport(balance,{...report(balance),agent:'test-designer'},evidence)).toThrow('different agent');
  });

});

describe('v7 executable CLI', () => {
  const temporary: string[] = [];
  afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });

  it('archives the issued prompt, preserves rejected state, and resumes accepted reports from disk', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'desmon-fun-test-'));
    temporary.push(directory);
    const cli = (...args: string[]) => spawnSync(process.execPath, [resolve('.harness/v7/loop/fun.mjs'), ...args], { encoding: 'utf8' });
    expect(cli('init', directory).status).toBe(0);
    expect(cli('init', directory).status).toBe(1);
    const issued = cli('next', directory);
    expect(issued.status).toBe(0);
    const request = JSON.parse(issued.stdout);
    expect(readFileSync(request.prompt, 'utf8')).toContain(request.requestId);
    const fixture = resolve(directory, 'fixture.txt');
    writeFileSync(fixture, evidence());
    const draft = report(newSession());
    draft.evidence[0].path = fixture;
    const response = resolve(directory, 'response.json');
    writeFileSync(response, JSON.stringify({ ...draft, role: 'critic' }));
    expect(cli('submit', directory, response).status).toBe(1);
    const unchanged=cli('status',directory);
    expect(unchanged.status,unchanged.stderr).toBe(0);
    expect(JSON.parse(unchanged.stdout).reports).toBe(0);
    writeFileSync(response, JSON.stringify(draft));
    expect(cli('submit', directory, response).status).toBe(0);
    expect(JSON.parse(cli('status', directory).stdout)).toMatchObject({ next: 'critic', reports: 1 });
    expect(cli('submit', directory, response).status).toBe(1);
  });
});

describe('v7 feature coverage', () => {
  it('rejects missing, duplicate and blank requirement assessments without advancing', () => {
    const session = newSession();
    const before = JSON.stringify(session);
    const draft = report(session);
    expect(() => acceptReport(session, { ...draft, coverage: draft.coverage.slice(1) }, evidence)).toThrow('every v7 requirement');
    const duplicate = [...draft.coverage];
    duplicate[0] = duplicate[1];
    expect(() => acceptReport(session, { ...draft, coverage: duplicate }, evidence)).toThrow('every v7 requirement');
    draft.coverage[0].assessment = '';
    expect(() => acceptReport(session, draft, evidence)).toThrow('every v7 requirement');
    expect(JSON.stringify(session)).toBe(before);
  });
});
