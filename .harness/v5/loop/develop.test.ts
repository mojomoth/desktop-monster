import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// @ts-expect-error executable Node harness has no declaration file
import { newLoop, transition as applyTransition, pathsOverlap, GATES } from './develop.mjs';
const digest = 'a'.repeat(64);
const toolsDigest = 'b'.repeat(64);
const filesHash = { 'owned.test.ts': 'c'.repeat(64) };
const transition = (loop: unknown, id: string, action: string, payload = {}, source = digest, tools = toolsDigest, files = filesHash) =>
  applyTransition(loop, id, action, payload, source, tools, files);
const proof = { ac: 'AC.md', review: 'review.md', filesHash };
const record = (command: string, exitCode = 0) => ({ command, exitCode, sourceDigest: digest, endedDigest: digest,
  evaluationDigest: toolsDigest, endedEvaluationDigest: toolsDigest, filesHash, endedFilesHash: filesHash,
  log: 'check.log', sha256: digest, ac: command !== GATES });
function checked() {
  let loop = transition(newLoop(digest), 'V06-01', 'start', {}, digest);
  loop = transition(loop, 'V06-01', 'check', record('node selftest'), digest);
  return transition(loop, 'V06-01', 'check', record(GATES), digest);
}
describe('development task journal', () => {
  it('requires dependencies, actual AC and gates, keeping failed transitions immutable', () => {
    const loop = newLoop(digest); const before = JSON.stringify(loop);
    expect(() => transition(loop, 'V06-04', 'start', {}, digest)).toThrow(/Dependencies/);
    expect(() => transition(loop, 'V06-01', 'verify', proof, digest)).toThrow(/running/);
    expect(JSON.stringify(loop)).toBe(before);
    const verified = transition(checked(), 'V06-01', 'verify', proof, digest);
    expect(verified.tasks[0].status).toBe('verified');
    expect(verified.tasks[0].verificationHistory[0].sourceDigest).toBe(digest);
  });
  it('rejects stale and failed checks and arbitrary exclusions', () => {
    const loop = checked();
    expect(() => transition(loop, 'V06-01', 'verify', proof, 'd'.repeat(64))).toThrow(/stale/);
    expect(() => transition(loop, 'V06-01', 'verify', proof, digest, 'd'.repeat(64))).toThrow(/stale/);
    expect(() => transition(loop, 'V06-01', 'verify', proof, digest, toolsDigest, {'owned.test.ts':'d'.repeat(64)})).toThrow(/stale/);
    const failed = transition(loop, 'V06-01', 'check', record('AC', 1), digest);
    expect(() => transition(failed, 'V06-01', 'verify', proof, digest)).toThrow(/Failed/);
    expect(() => transition(loop, 'V06-02', 'exclude', {reason:'skip'}, digest)).toThrow(/conditional/);
    expect(() => transition(loop, 'V06-07', 'exclude', {reason:'no data'}, digest)).toThrow(/experiment/);
  });
  it('resumes explicitly without losing old attempts or resetting independent tasks', () => {
    let loop = transition(checked(), 'V06-01', 'verify', proof, digest);
    loop = transition(loop, 'V06-02', 'start', {}, digest);
    loop = transition(loop, 'V06-02', 'retry', {reason:'interrupted worker'}, digest);
    expect(loop.tasks[0].status).toBe('verified');
    expect(loop.tasks[1].attempts).toHaveLength(1);
    loop = transition(loop, 'V06-02', 'start', {}, digest);
    expect(loop.tasks[1].attempts).toHaveLength(2);
    loop = transition(loop, 'V06-01', 'invalidate', {reason:'measurement changed'}, digest);
    expect(loop.tasks[0].status).toBe('pending');
    expect(loop.tasks[0].verificationHistory).toHaveLength(1);
    expect(loop.tasks[1].status).toBe('running');
  });
  it('preserves failed and mid-check stale evidence, and permits only a current successful retry of each command', () => {
    let loop = checked();
    const failed = {...record('node selftest', 1), endedDigest:'d'.repeat(64)};
    loop = transition(loop, 'V06-01', 'check', failed);
    expect(loop.tasks[0].attempts[0].checks.at(-1)).toEqual(failed);
    expect(() => transition(loop, 'V06-01', 'verify', proof)).toThrow(/Failed or stale/);
    loop = transition(loop, 'V06-01', 'check', record('node selftest'));
    loop = transition(loop, 'V06-01', 'verify', proof);
    expect(loop.tasks[0].attempts[0].checks).toHaveLength(4);
    expect(loop.tasks[0].verificationHistory[0].checks).toHaveLength(2);
    expect(loop.tasks[0].verificationHistory[0].evaluationDigest).toBe(toolsDigest);
  });
  it('invalidates conditional exclusions when their experiment changes, retaining old exclusion history', () => {
    let loop = transition(checked(), 'V06-01', 'verify', proof);
    loop = transition(loop, 'V06-06', 'start');
    for (const command of ['node experiments', GATES]) loop = transition(loop, 'V06-06', 'check', record(command));
    loop = transition(loop, 'V06-06', 'verify', proof);
    for (const id of ['V06-07', 'V06-08']) loop = transition(loop, id, 'exclude', {reason:'measured loss',evidence:'experiment.json'});
    const directlyInvalidated = transition(loop, 'V06-07', 'invalidate', {reason:'decision changed'});
    expect(directlyInvalidated.tasks[6].status).toBe('pending');
    expect(directlyInvalidated.tasks[7].status).toBe('pending');
    loop = transition(loop, 'V06-01', 'invalidate', {reason:'policy changed'});
    expect(loop.tasks[5].status).toBe('pending');
    for (const index of [6, 7]) {
      expect(loop.tasks[index].status).toBe('pending');
      expect(loop.tasks[index].exclusion).toBeUndefined();
      expect(loop.tasks[index].exclusionHistory).toHaveLength(1);
      expect(loop.tasks[index].exclusionHistory[0].reason).toBe('measured loss');
    }
    expect(() => transition(loop, 'V06-07', 'exclude', {reason:'skip',evidence:'old.json'})).toThrow(/experiment/);
  });
  it('rejects directory/descendant ownership overlap, allowing similarly named siblings', () => {
    expect(pathsOverlap('tests', 'tests/menu.test.ts')).toBe(true);
    expect(pathsOverlap('tests/menu.test.ts', 'tests/../tests')).toBe(true);
    expect(pathsOverlap('tests', 'tests-other/file.ts')).toBe(false);
    let loop = newLoop(digest, toolsDigest);
    loop.tasks[0].files = ['tests']; loop.tasks[1].files = ['tests/hero.test.ts'];
    loop = transition(loop, 'V06-01', 'start');
    expect(() => transition(loop, 'V06-02', 'start')).toThrow(/already owned/);
  });
  it('does not treat a string or the same recovery record three times as independent blocker attempts', () => {
    const loop=transition(newLoop(digest,toolsDigest),'V06-01','start');
    for(const attemptEvidence of ['three', ['same','same','same']]) {
      expect(()=>transition(loop,'V06-01','block',{reason:'environment',attemptEvidence})).toThrow(/three different/);
    }
    expect(transition(loop,'V06-01','block',{reason:'environment',attemptEvidence:['one','two','three']}).tasks[0].status).toBe('blocked');
  });
  it('creates a fresh CLI evidence directory, retaining actual failed command logs for retry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'desmon-v06-loop-'));
    const command = resolve('.harness/v5/loop/develop.mjs');
    const cli = (...args: string[]) => spawnSync(process.execPath, [command, ...args], {encoding:'utf8'});
    try {
      expect(cli('init', dir).status).toBe(0);
      expect(cli('start', dir, 'V06-03').status).toBe(0);
      const run = cli('check', dir, 'V06-03', 'node -e "process.exit(7)"');
      expect(run.status, run.stderr).toBe(7);
      const loop = JSON.parse(readFileSync(join(dir, 'loop.json'), 'utf8'));
      const recorded = loop.tasks[2].attempts[0].checks[0];
      expect(recorded.exitCode).toBe(7);
      expect(existsSync(recorded.log)).toBe(true);
      expect(recorded.filesHash['tests/ipc.test.ts']).toMatch(/^[a-f0-9]{64}$/);
      expect(recorded.evaluationDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(recorded.endedEvaluationDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(cli('verify', dir, 'V06-03', recorded.log).status).toBe(1);
    } finally { rmSync(dir, {recursive:true, force:true}); }
  });
});
