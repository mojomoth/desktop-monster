// One prospectively registered block. Evidence runner only; product/observer are frozen.
import process from 'node:process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { digest, sha } from '../../../.harness/v10/run.mjs';
import { validateObservation } from '../../../.harness/v10/performance-report.mjs';

const here = dirname(fileURLToPath(import.meta.url)), run = dirname(here);
const registrationPath = join(here, 'matched-03-registration.json');
const registrationHash = sha(readFileSync(registrationPath));
const registration = JSON.parse(readFileSync(registrationPath));
const output = registration.output, statusPath = join(output, 'block.json');
const reviewPath = join(run, 'reviews/performance-method-review.json');
const assert = (condition, message) => { if (!condition) throw Error(message); };
const read = path => JSON.parse(readFileSync(path));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
assert(!existsSync(statusPath), 'This single block was already started; inspect its journal.');
const review = read(reviewPath);
assert(review.verdict === 'approved-methodology-only' && review.reviewer === registration.independentReviewer &&
  review.registration.sha256 === registrationHash, 'Independent review must bind this registration.');
mkdirSync(output, { recursive: true });
const status = { version: 1, pid: process.pid, startedAt: new Date().toISOString(), registrationPath,
  registrationHash, reviewPath, reviewHash: sha(readFileSync(reviewPath)), state: 'waiting-current-active', steps: [] };
const persist = () => write(statusPath, status);
const frozen = () => {
  assert(digest() === registration.source, 'Frozen source changed.');
  assert(sha(readFileSync(registrationPath)) === registrationHash, 'Registration changed.');
  for (const binding of [...Object.values(registration.apps), ...Object.values(registration.observers), registration.protocol])
    assert(sha(readFileSync(binding.path)) === binding.sha256, 'Frozen binding changed: ' + binding.path);
};
const diagnostic = label => {
  const commands = [['vm_stat', []], ['sysctl', ['vm.swapusage']], ['memory_pressure', ['-Q']],
    ['ps', ['-axo', 'pid,ppid,pcpu,rss,comm']]];
  write(join(output, `system-${label}.json`), { at: new Date().toISOString(), commands: commands.map(([command, args]) => {
    const result = spawnSync(command, args, { encoding: 'utf8', timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
    return { command, args, exitCode: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message };
  }) });
};
let active;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  status.state = 'interrupted'; status.signal = signal; persist();
  if (active?.pid) { try { process.kill(-active.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
});
const execute = async (label, args) => {
  assert(status.state === 'running', 'Block interrupted.'); frozen(); diagnostic('before-' + label);
  const entry = { label, args, startedAt: new Date().toISOString(), state: 'running' };
  status.steps.push(entry); active = spawn(process.execPath, args, { stdio: 'inherit', detached: true }); entry.pid = active.pid; persist();
  const code = await new Promise(done => {
    active.once('exit', (code, signal) => { entry.signal = signal; done(code ?? 1); });
    active.once('error', error => { entry.error = String(error); done(1); });
  });
  active = null; entry.endedAt = new Date().toISOString(); entry.exitCode = code; entry.state = code === 0 ? 'passed' : 'failed';
  persist(); diagnostic('after-' + label); frozen(); assert(code === 0, 'Failed block step: ' + label);
};
persist();
try {
  frozen();
  const previous = dirname(registration.transition.queue.path), activeReport = join(previous, 'candidate-active.json');
  while (!existsSync(activeReport)) {
    assert(status.state === 'waiting-current-active', 'Block interrupted before start.');
    const queue = read(registration.transition.queue.path);
    assert(queue.pid === registration.transition.pid && queue.startedAt === registration.transition.startedAt, 'Previous queue identity changed.');
    assert(queue.state === 'running', 'Previous active observation stopped without a report.');
    await sleep(5000);
  }
  const report = read(activeReport), rows = readFileSync(report.raw.path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const verified = validateObservation(report, rows, 'candidate-active', read(registration.protocol.path));
  const baseline = registration.rules.oldActive.baseline;
  const cpuLimit = Math.max(baseline.cpuP95 * 1.1, baseline.cpuP95 + 1), ramLimit = registration.rules.oldActive.ramLimitMiB;
  const verdict = { at: new Date().toISOString(), reportPath: activeReport, reportHash: sha(readFileSync(activeReport)),
    passed: verified.cpu.p95 <= cpuLimit && verified.workingSetMiB.p95 <= ramLimit,
    cpu: { actual: verified.cpu.p95, limit: cpuLimit }, workingSetMiB: { actual: verified.workingSetMiB.p95, limit: ramLimit },
    transition: 'End attempt02 after completed active30 regardless of result, as registered before new baseline.' };
  write(join(previous, 'active-verdict.json'), verdict); status.previousActive = verdict; persist();
  let queue = read(registration.transition.queue.path);
  assert(queue.pid === registration.transition.pid && queue.startedAt === registration.transition.startedAt, 'Previous queue identity changed.');
  if (queue.state === 'running') {
    try { process.kill(queue.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  const deadline = Date.now() + 30000;
  while (!queue.endedAt && Date.now() < deadline) { await sleep(500); queue = read(registration.transition.queue.path); }
  assert(queue.endedAt, 'Previous queue has not finished cleanup.');
  // The previous observer and every sampled app process must have exited before a baseline starts.
  for (const pid of [queue.pid, ...queue.slots.map(slot => slot.pid), ...rows.at(-1).processes.map(entry => entry.pid)]) {
    try { process.kill(pid, 0); throw Error('Previous process remains: ' + pid); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  frozen(); status.state = 'running'; status.observationsStartedAt = new Date().toISOString(); persist();
  appendFileSync(join(run, 'sessions/host-01.md'), `\n## Prospective matched block03 started ${status.observationsStartedAt}\n- Registration ${registrationHash}, independently reviewed by ${review.reviewer}. Previous active verdict preserved at performance/attempt-02/active-verdict.json (${verdict.passed ? 'passed' : 'failed'}). Remaining old queue stopped regardless of result.\n- Source/packages/observers frozen; no concurrent agent-controlled tests/builds/Electron/simulation. Baseline active30 → baseline idle30 → candidate active30 → candidate idle30 → mixed180, exactly once.\n- Runner PID${process.pid}; performance/matched-03/block.json. Read-only system diagnostics; user applications untouched.\n`);
  const baselineApp = resolve(registration.apps.baseline.path, '../../..'), candidateApp = resolve(registration.apps.candidate.path, '../../..');
  const baselineActive = join(output, 'baseline-active.json'), baselineIdle = join(output, 'baseline-idle.json');
  await execute('baseline-active', [registration.observers.baseline.path, baselineApp, baselineActive, 'active', '30']);
  await execute('baseline-idle', [registration.observers.baseline.path, baselineApp, baselineIdle, 'idle', '30']);
  await execute('candidate-queue', ['.harness/v10/run-performance.mjs', baselineActive, baselineIdle, candidateApp, output]);
  status.state = 'passed';
} catch (error) {
  status.error = String(error); if (status.state !== 'interrupted') status.state = 'failed'; process.exitCode = 1;
} finally { status.endedAt = new Date().toISOString(); persist(); process.stdout.write(JSON.stringify(status) + '\n'); }
