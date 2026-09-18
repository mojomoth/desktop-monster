import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { acceptReport, newSession, reportTemplate, requestFor } from './fun.mjs';

type Session = ReturnType<typeof newSession>;
const evidence = () => 'SYNTHETIC TEST FIXTURE: verifies queue mechanics, not game balance or human fun.';
const issue = { id: 'C1', severity: 'major', problem: 'Reroll dominates the free path.', fix: 'Shorten free deferral and bound the buff roll.' };

function report(session: Session) {
  const draft = reportTemplate(session);
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
    seed: 404, samples: 1000,
    metrics: [{ name: 'Free retry delay', unit: 'seconds', p10: 30, p50: 30, p90: 30, min: 0, max: 30 }],
    economy: { sources: 'Kills grant gold.', sinks: 'Reroll consumes gold.', freePath: 'A free retry arrives in 30 seconds.' },
  });
  if (session.role === 'playtester') Object.assign(draft, {
    sessions: draft.sessions.map((scenario: object) => ({ ...scenario, passed: true, observations: 'Synthetic coverage scenario completed.' })),
  });
  return draft;
}

const advance = (session: Session) => acceptReport(session, report(session), evidence);
const toRole = (role: string) => {
  let session = newSession();
  while (session.role !== role) session = advance(session);
  return session;
};

describe('v4 fun-review protocol', () => {
  it('accepts only ordered reports and distinguishes simulation from release completion', () => {
    let session = newSession();
    for (const role of ['designer', 'critic', 'balance', 'playtester']) {
      expect(session.role).toBe(role);
      session = advance(session);
    }
    expect(session.status).toBe('simulation_complete');
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
    expect(session.status).toBe('simulation_complete');
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

  it('rejects missing evidence without mutating state and snapshots accepted evidence', () => {
    const session = newSession();
    const before = JSON.stringify(session);
    expect(() => acceptReport(session, report(session), () => { throw new Error('Missing log'); })).toThrow('Missing log');
    expect(JSON.stringify(session)).toBe(before);
    const accepted = advance(session);
    expect(accepted.history[0].evidence[0].content).toBe(evidence());
    expect(accepted.history[0].evidence[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('requires honest balance bounds and actual simulated scenario coverage', () => {
    const balance = toRole('balance');
    const invalidBalance = report(balance);
    invalidBalance.metrics[0].p90 = 31;
    expect(() => acceptReport(balance, invalidBalance, evidence)).toThrow('Balance target failed');
    expect(() => acceptReport(balance, { ...report(balance), samples: 0 }, evidence)).toThrow('>=100 samples');
    const playtester = toRole('playtester');
    const invalidPlaytest = report(playtester);
    invalidPlaytest.sessions[0].passed = false;
    expect(() => acceptReport(playtester, invalidPlaytest, evidence)).toThrow('failed scenario');
    const duplicate = report(playtester);
    duplicate.sessions[0] = duplicate.sessions[1];
    expect(() => acceptReport(playtester, duplicate, evidence)).toThrow('Missing scenarios');
    expect(() => acceptReport(playtester, { ...report(playtester), mode: 'human' }, evidence)).toThrow('participant/session evidence');
    expect(() => acceptReport(playtester, { ...report(playtester), humanChecks: 'COMPLETE' }, evidence)).toThrow('human checks PENDING');
  });
});

describe('v4 executable CLI', () => {
  const temporary: string[] = [];
  afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });

  it('archives the issued prompt, preserves rejected state, and resumes accepted reports from disk', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'desmon-fun-test-'));
    temporary.push(directory);
    const cli = (...args: string[]) => spawnSync(process.execPath, [resolve('.harness/v4/loop/fun.mjs'), ...args], { encoding: 'utf8' });
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
    expect(JSON.parse(cli('status', directory).stdout).reports).toBe(0);
    writeFileSync(response, JSON.stringify(draft));
    expect(cli('submit', directory, response).status).toBe(0);
    expect(JSON.parse(cli('status', directory).stdout)).toMatchObject({ next: 'critic', reports: 1 });
    expect(cli('submit', directory, response).status).toBe(1);
  });
});
