// Resume-safe final automatic gate after the single registered observation block.
import process from 'node:process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, sha } from '../../../.harness/v10/run.mjs';

const directory = dirname(fileURLToPath(import.meta.url)), run = dirname(directory);
const read = path => JSON.parse(readFileSync(path));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const assert = (ok, why) => { if (!ok) throw Error(why); };
const file = join(directory, 'matched-03/finalization.json');
assert(!existsSync(file), 'Finalization already started; inspect its journal before resuming.');
const status = { pid: process.pid, executor: '/root', startedAt: new Date().toISOString(), state: 'waiting', commands: [] };
const persist = () => write(file, status);
const command = async args => {
  const entry = { args, startedAt: new Date().toISOString() }; status.commands.push(entry); persist();
  const child = spawn(process.execPath, ['.harness/v10/run.mjs', ...args], { stdio: 'inherit' });
  const code = await new Promise(done => {
    child.once('exit', (code, signal) => { entry.signal = signal; done(code ?? 1); });
    child.once('error', error => { entry.error = String(error); done(1); });
  });
  entry.endedAt = new Date().toISOString(); entry.exitCode = code; persist(); assert(code === 0, 'Finalization command failed: ' + args.join(' '));
};
persist();
try {
  let block;
  do { await sleep(10000); block = read(join(directory, 'matched-03/block.json')); } while (!block.endedAt);
  assert(block.state === 'passed', 'Registered block did not pass; preserve its failure and stop.');
  const registration = read(join(directory, 'matched-03-registration.json'));
  assert(digest() === registration.source, 'Frozen source differs.');
  const candidate = join(directory, 'matched-03/comparison.json'), canonical = join(directory, 'comparison.json');
  const comparison = read(candidate); assert(comparison.passed === true, 'Performance did not pass.');
  if (existsSync(canonical)) assert(sha(readFileSync(candidate)) === sha(readFileSync(canonical)), 'Canonical report already contains different evidence.');
  else copyFileSync(candidate, canonical);
  status.state = 'running'; status.source = registration.source; persist();
  await command(['start', run, 'V10-10']);
  // Scope reviews were completed by independent authors. This command execution is the Host's.
  const journalPath = join(run, 'loop.json'), journal = read(journalPath);
  const task = journal.tasks.find(task => task.id === 'V10-10');
  task.executedBy = '/root';
  task.executionNote = 'Host executes the automatic final validator. Existing independent core/backend/visual/balance/harness reviews remain bound; do not attribute this execution to the unavailable backend reviewer.';
  journal.history.push({ at: new Date().toISOString(), action: 'record-actual-executor', id: 'V10-10', executor: '/root' }); write(journalPath, journal);
  await command(['check', run, 'V10-10', 'ac']);
  await command(['verify', run, 'V10-10']);
  const finalJournal = read(journalPath);
  assert(finalJournal.tasks.every(task => task.status === 'verified' && task.verifiedSource === registration.source), 'Some tasks remain unverified.');
  write(join(directory, 'acceptance.json'), { at: new Date().toISOString(), source: registration.source,
    selectedBlock: 'matched-03', registrationHash: block.registrationHash, comparisonHash: sha(readFileSync(candidate)),
    previousFailuresPreserved: ['comparison-failed-01.json', 'attempt-02/active-verdict.json'],
    previousActiveRamLimitMiB: registration.rules.oldActive.ramLimitMiB,
    comparisons: comparison.comparisons, memoryGrowth: comparison.memoryGrowth, allTasksVerified: true });
  appendFileSync(join(run, 'sessions/host-01.md'), `\n## Final automatic acceptance ${new Date().toISOString()}\n- Single registered matched03 block passed, canonical comparison copied without mixing profiles. Earlier failures remain preserved. AllV10-01..10 verified at source${registration.source}.\n- Host /root executed final AC (not the unavailable backend reviewer); actual executor recorded in loop.json. Performance values in performance/acceptance.json. No commits, PRs or operational deployment.\n`);
  status.state = 'passed';
} catch (error) { status.state = 'failed'; status.error = String(error); process.exitCode = 1; }
finally { status.endedAt = new Date().toISOString(); persist(); process.stdout.write(JSON.stringify(status) + '\n'); }
