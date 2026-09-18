import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const modulePath = '../.harness/v8/performance-report.mjs';
const verifier: {
  validateObservation: (report: unknown, rows: unknown[], slot: string, protocol: unknown) => { cpu: { p95: number }; input: { fraction: number | null } };
  evaluatePerformance: (observations: unknown, protocol: unknown) => { passed: boolean; comparisons: Array<{ cpu: { passed: boolean; limit: number }; workingSetMiB: { passed: boolean; limit: number } }>; memoryGrowth: { passed: boolean } };
  createReport: (paths: Record<string, string>, protocolPath?: string) => { passed: boolean };
} = await import(modulePath);
const protocolPath = resolve('docs/v0.8/EVALUATION_PROTOCOL.json');
const protocol: unknown = JSON.parse(readFileSync(protocolPath, 'utf8'));
const slots = ['baseline-active', 'baseline-idle', 'candidate-active', 'candidate-idle', 'mixed'];
const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const directories: string[] = [];
afterEach(() => { directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true })); });

function observation(slot: string, index = slots.indexOf(slot)) {
  const profile = slot === 'mixed' ? 'mixed' : slot.split('-')[1]!;
  const minutes = profile === 'mixed' ? 180 : 30, duration = minutes * 60000;
  const inputs = (ms: number): number => profile === 'idle' ? 0 : profile === 'active' ? ms / 500
    : (Math.floor(ms / 600000) * 300000 + Math.min(ms % 600000, 300000)) / 500;
  const rows = Array.from({ length: duration / 5000 }, (_, i) => {
    const elapsedMs = (i + 1) * 5000;
    return { elapsedMs, inputs: inputs(elapsedMs), cpu: 10, workingSetMiB: 200, errors: [] as unknown[],
      processes: [{ pid: 1, creationTime: 123, type: 'Browser', cpu: 6, workingSetKiB: 120 * 1024 },
        { pid: 2, creationTime: 124, type: 'Tab', cpu: 4, workingSetKiB: 80 * 1024 }],
      save: { version: 3, killCount: 1, progress: { playTimeMs: elapsedMs } } };
  });
  const started = Date.UTC(2026, 0, 1) + index * 31 * 60000;
  const report = { version: 1, profile, requestedMinutes: minutes, passed: true, exitCode: 0, exitSignal: null as string | null,
    checks: { duration: true, metrics: true, samples: true, progress: true, inputs: true, errors: true, appUnchanged: true, observerUnchanged: true },
    startedAt: new Date(started).toISOString(), finishedAt: new Date(started + duration).toISOString(), observationMs: duration,
    inputCount: inputs(duration), appPath: '', appHash: (slot.startsWith('baseline') ? 'a' : 'b').repeat(64), observerHash: 'c'.repeat(64),
    errors: [] as unknown[], raw: { samples: rows.length, path: '', sha256: '' }, screenshots: [] as Array<{ name: string; path: string; sha256: string }>,
    machine: { platform: 'darwin', arch: 'arm64', os: 'test-os', cpu: 'test-cpu', logicalCpus: 8 },
    metadata: { version: slot.startsWith('baseline') ? '0.7.0' : '0.8.0', runtime: { electron: '39.8.10', node: '22.0.0' }, fixture: {
      version: 3, level: 1, killCount: 0, coins: 0,
      companions: Array.from({ length: 5 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 })),
    } },
    isolation: { userData: `/isolated/${slot}`, globalHooks: false, osPermissionPrompts: false, network: 'offline', input: 'synthetic production IPC', time: 'real wall time; no engine ticks injected' },
    finalSave: { version: 3, killCount: 2, progress: { playTimeMs: duration } },
    summary: { cpuP95: 10, workingSetMiBP95: 200, initialMemoryMedian: 200, finalMemoryMedian: profile === 'mixed' ? 200 : null },
  };
  return { report, rows };
}
type Observation = ReturnType<typeof observation>;
const matrix = (): Record<string, Observation> => Object.fromEntries(slots.map(slot => [slot, observation(slot)]));
function setMetrics(run: Observation, cpu: number, memory: number): void {
  for (const row of run.rows) {
    row.cpu = cpu; row.workingSetMiB = memory;
    row.processes[0]!.cpu = cpu; row.processes[1]!.cpu = 0;
    row.processes[0]!.workingSetKiB = memory * 1024; row.processes[1]!.workingSetKiB = 0;
  }
  run.report.summary = { cpuP95: cpu, workingSetMiBP95: memory, initialMemoryMedian: memory,
    finalMemoryMedian: run.report.profile === 'mixed' ? memory : null };
}

describe('v0.8 performance evidence validation', () => {
  it('requires all five complete observations and applies both registered allowance branches', () => {
    const runs = matrix();
    setMetrics(runs['candidate-active']!, 11, 250);
    setMetrics(runs['baseline-idle']!, 20, 300);
    setMetrics(runs['candidate-idle']!, 22, 360);
    const result = verifier.evaluatePerformance(runs, protocol);
    expect(result.passed).toBe(true);
    expect(result.comparisons.map(pair => [pair.cpu.limit, pair.workingSetMiB.limit])).toEqual([[11, 250], [22, 360]]);
    setMetrics(runs['candidate-active']!, 11.01, 250.01);
    expect(verifier.evaluatePerformance(runs, protocol).passed).toBe(false);
    const relaxed = structuredClone(protocol) as { performance: { cpuP95Max: { baselineMultiplier: number } } };
    relaxed.performance.cpuP95Max.baselineMultiplier = 2;
    expect(() => verifier.evaluatePerformance(runs, relaxed)).toThrow('budget');
    delete runs.mixed;
    expect(() => verifier.evaluatePerformance(runs, protocol)).toThrow('five');
  });

  it('rejects a short run, missing interval, fabricated endpoint, or a stale saved clock even when observer passed is true', () => {
    const short = observation('candidate-active'); short.report.observationMs = 60000;
    expect(() => verifier.validateObservation(short.report, short.rows, 'candidate-active', protocol)).toThrow('duration');
    const killed = observation('candidate-active'); killed.report.exitSignal = 'SIGKILL';
    expect(() => verifier.validateObservation(killed.report, killed.rows, 'candidate-active', protocol)).toThrow('exit cleanly');
    const gap = observation('candidate-active'); gap.rows.splice(20, 3); gap.report.raw.samples = gap.rows.length;
    expect(() => verifier.validateObservation(gap.report, gap.rows, 'candidate-active', protocol)).toThrow('cadence');
    const early = observation('candidate-active'); early.rows.pop(); early.report.raw.samples--;
    expect(() => verifier.validateObservation(early.report, early.rows, 'candidate-active', protocol)).toThrow('Last raw sample');
    const stale = observation('candidate-active'); stale.rows[9]!.save.progress.playTimeMs = stale.rows[5]!.save.progress.playTimeMs;
    expect(() => verifier.validateObservation(stale.report, stale.rows, 'candidate-active', protocol)).toThrow('play time');
  });

  it('recomputes sums and quantiles, rejects hidden raw errors and excludes warmup by elapsed time', () => {
    const run = observation('candidate-active');
    for (const row of run.rows.filter(row => row.elapsedMs < 300000)) { row.cpu = 999; row.processes[0]!.cpu = 995; }
    expect(verifier.validateObservation(run.report, run.rows, 'candidate-active', protocol).cpu.p95).toBe(10);
    run.report.summary.cpuP95 = 1;
    expect(() => verifier.validateObservation(run.report, run.rows, 'candidate-active', protocol)).toThrow('quantiles');
    run.report.summary.cpuP95 = 10; run.rows[60]!.cpu = 9;
    expect(() => verifier.validateObservation(run.report, run.rows, 'candidate-active', protocol)).toThrow('totals');
    run.rows[60]!.cpu = 10; run.rows[60]!.errors.push({ type: 'save-failed' });
    expect(() => verifier.validateObservation(run.report, run.rows, 'candidate-active', protocol)).toThrow('Raw sample');
  });

  it('rejects a lost active phase or input in an idle phase instead of accepting the mixed grand total', () => {
    const lost = observation('mixed');
    // Lose 40 inputs late in the run: less than 1% overall, but over 5% of this active phase.
    for (const row of lost.rows) if (row.elapsedMs >= 6000000) row.inputs -= Math.min(40, Math.max(0, (row.elapsedMs - 6000000) / 500));
    lost.report.inputCount -= 40;
    expect(() => verifier.validateObservation(lost.report, lost.rows, 'mixed', protocol)).toThrow('phase');
    const idle = observation('mixed');
    for (const row of idle.rows) if (row.elapsedMs >= 305000) row.inputs++;
    idle.report.inputCount++;
    expect(() => verifier.validateObservation(idle.report, idle.rows, 'mixed', protocol)).toThrow('idle phase');
  });

  it('rejects mismatched machines and overlapping sessions, and detects mixed memory growth from the real windows', () => {
    const runs = matrix(); runs.mixed!.report.machine.os = 'another-os';
    expect(() => verifier.evaluatePerformance(runs, protocol)).toThrow('Machine');
    runs.mixed!.report.machine.os = 'test-os';
    const overlap = runs['baseline-idle']!.report;
    overlap.startedAt = runs['baseline-active']!.report.startedAt; overlap.finishedAt = runs['baseline-active']!.report.finishedAt;
    expect(() => verifier.evaluatePerformance(runs, protocol)).toThrow('overlap');
    runs['baseline-idle'] = observation('baseline-idle');
    for (const row of runs.mixed!.rows) if (row.elapsedMs >= 9000000) { row.workingSetMiB = 251; row.processes[0]!.workingSetKiB = 171 * 1024; }
    runs.mixed!.report.summary.workingSetMiBP95 = 251; runs.mixed!.report.summary.finalMemoryMedian = 251;
    expect(verifier.evaluatePerformance(runs, protocol).memoryGrowth.passed).toBe(false);
  });

  it('binds reports, raw samples, screenshots, app bytes and observer source before accepting a matrix', () => {
    const directory = mkdtempSync(join(tmpdir(), 'desmon-perf-verifier-')); directories.push(directory);
    const runs = matrix(), paths: Record<string, string> = {};
    const observerHash = sha(readFileSync(resolve('.harness/v8/performance.mjs')));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/2sAAAAASUVORK5CYII=', 'base64');
    for (const slot of slots) {
      const run = runs[slot]!, group = slot.startsWith('baseline') ? 'baseline' : 'candidate';
      run.report.appPath = join(directory, group + '.app');
      mkdirSync(join(run.report.appPath, 'Contents/Resources'), { recursive: true });
      writeFileSync(join(run.report.appPath, 'Contents/Resources/app.asar'), group);
      run.report.appHash = sha(group); run.report.observerHash = observerHash;
      run.report.raw.path = join(directory, slot + '.jsonl');
      const raw = run.rows.map(row => JSON.stringify(row)).join('\n') + '\n';
      writeFileSync(run.report.raw.path, raw); run.report.raw.sha256 = sha(raw);
      const names = ['start', 'end', ...(slot === 'mixed' ? Array.from({ length: 18 }, (_, i) => `menu-${(i + 1) * 10}m`) : [])];
      run.report.screenshots = names.map(name => {
        const path = join(directory, `${slot}-${name}.png`); writeFileSync(path, png); return { name, path, sha256: sha(png) };
      });
      paths[slot] = join(directory, slot + '.json'); writeFileSync(paths[slot]!, JSON.stringify(run.report));
    }
    expect(verifier.createReport(paths, protocolPath).passed).toBe(true);
    const output = join(directory, 'comparison.json');
    const script = resolve('.harness/v8/performance-report.mjs');
    const args = ['report', output, ...slots.flatMap(slot => [`--${slot}`, paths[slot]!])];
    expect(JSON.parse(execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' })).passed).toBe(true);
    expect(JSON.parse(execFileSync(process.execPath, [script, 'verify', output], { encoding: 'utf8' })).verified).toBe(true);
    expect(() => execFileSync(process.execPath, [script, ...args], { stdio: 'pipe' })).toThrow();
    const missing = runs.mixed!.report.screenshots.pop()!;
    writeFileSync(paths.mixed!, JSON.stringify(runs.mixed!.report));
    expect(() => verifier.createReport(paths, protocolPath)).toThrow('screenshots');
    runs.mixed!.report.screenshots.push(missing); writeFileSync(paths.mixed!, JSON.stringify(runs.mixed!.report));
    const raw = runs['baseline-active']!.report.raw;
    writeFileSync(raw.path, readFileSync(raw.path, 'utf8') + '\n');
    expect(() => verifier.createReport(paths, protocolPath)).toThrow('Raw samples hash');
  });
});
