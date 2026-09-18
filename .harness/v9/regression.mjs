#!/usr/bin/env node
// v0.9 paired preservation check. Simulated time is never presented as native play.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? `${item}n` : item);
const assert = (condition, message) => { if (!condition) throw Error(message); };
const policies = ['new-active', 'returning-idle'];
const binding = directory => Object.fromEntries(readdirSync(directory).filter(name => /\.(js|ts)$/.test(name)).sort()
  .map(name => [join(directory, name), sha(readFileSync(join(directory, name)))]));

function stableSave(engine) {
  const save = { ...engine.toSave() };
  // The sole permitted metadata difference; all gameplay fields remain compared.
  delete save.earlyCaptureUsed;
  return save;
}

export function sample(core, seed, policy, durationMs = 30 * 60_000) {
  const source = core.mulberry32(seed);
  let draws = 0, captures = 0, attacks = 0;
  const rng = { next: () => { draws++; return source.next(); } };
  const save = policy === 'new-active' ? null : {
    ...core.DEFAULT_SAVE,
    nextCompanionId: 6,
    companions: Array.from({ length: 5 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 })),
  };
  const engine = core.createEngine(save, rng);
  const events = createHash('sha256');
  const checkpoints = [];
  const record = (at, produced) => {
    if (produced.length) events.update(encode([at, produced]) + '\n');
    captures += produced.filter(event => event.type === 'bossCaptured').length;
  };
  for (let at = 0; at < durationMs; at += 100) {
    if (policy === 'new-active' && at % 500 === 0) {
      attacks++;
      record(at, engine.attack('keyboard'));
    }
    record(at + 100, engine.tick(100));
    if ((at + 100) % 60_000 === 0) checkpoints.push({ at: at + 100, stateHash: sha(encode(stableSave(engine))), draws });
  }
  return { seed, policy, durationMs, tickMs: 100, inputs: attacks, draws, captures,
    eventHash: events.digest('hex'), checkpoints, finalSave: stableSave(engine) };
}

export function verifyReport(report, raw) {
  assert(report.version === 9 && report.kind === 'paired-core-regression' && report.seeds === 100 && report.minutes === 30,
    'Wrong experiment contract');
  assert(raw.length === 200 && report.rawHash === sha(raw.map(encode).join('\n') + '\n'), 'Raw evidence mismatch');
  const seen = new Set();
  for (const row of raw) {
    const { seed, policy } = row.baseline;
    assert(Number.isInteger(seed) && seed >= 40001 && seed <= 40100 && policies.includes(policy), 'Wrong seed or policy');
    assert(!seen.has(`${seed}/${policy}`), 'Duplicate paired cell');
    seen.add(`${seed}/${policy}`);
    assert(row.baseline.durationMs === 1_800_000 && row.baseline.tickMs === 100 && row.baseline.checkpoints.length === 30,
      'Incomplete observation');
    assert(row.baseline.inputs === (policy === 'new-active' ? 3600 : 0), 'Wrong input policy');
    assert(isDeepStrictEqual(row.baseline, row.candidate) && row.equal === true, 'Gameplay regression');
  }
  assert(report.passed === true, 'Experiment failed');
  for (const [path, fingerprint] of Object.entries(report.binding)) assert(sha(readFileSync(path)) === fingerprint, `Changed input: ${path}`);
  return true;
}

export async function main(args) {
  if (args[0] === 'verify') {
    const path = resolve(args[1]);
    const report = JSON.parse(readFileSync(path, 'utf8'));
    const raw = readFileSync(report.rawPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    verifyReport(report, raw);
    process.stdout.write('V09_CORE_REGRESSION_OK\n');
    return;
  }
  if (args[0] === '--selftest') {
    const core = require(join(root, 'dist/electron/core/index.js'));
    assert(isDeepStrictEqual(sample(core, 40001, 'new-active', 1000), sample(core, 40001, 'new-active', 1000)), 'Seed drift');
    assert(sample(core, 40001, 'new-active', 1000).inputs === 2, 'Input schedule');
    assert(sample(core, 40001, 'returning-idle', 1000).inputs === 0, 'Idle schedule');
    process.stdout.write('V09_CORE_SELFTEST_OK\n');
    return;
  }
  assert(args.length === 2 || args.length === 3, 'Usage: regression.mjs BASELINE_DIST OUTPUT_JSON [CANDIDATE_DIST] | verify OUTPUT_JSON | --selftest');
  const baselineDir = join(resolve(args[0]), 'electron/core');
  const candidateDir = join(args[2] ? resolve(args[2]) : join(root, 'dist'), 'electron/core');
  assert(baselineDir !== candidateDir, 'Baseline must be independently preserved');
  const inputs = { ...binding(baselineDir), ...binding(candidateDir), ...binding(join(root, 'src/core')),
    [fileURLToPath(import.meta.url)]: sha(readFileSync(fileURLToPath(import.meta.url))) };
  const baseline = require(join(baselineDir, 'index.js'));
  const candidate = require(join(candidateDir, 'index.js'));
  const output = resolve(args[1]);
  mkdirSync(dirname(output), { recursive: true });
  const rawPath = output.replace(/\.json$/, '') + '.jsonl';
  const raw = [];
  for (let seed = 40001; seed <= 40100; seed++) {
    for (const policy of policies) {
      const before = sample(baseline, seed, policy), after = sample(candidate, seed, policy);
      raw.push({ baseline: before, candidate: after, equal: isDeepStrictEqual(before, after) });
    }
    if (seed % 10 === 0) process.stdout.write(`paired seeds ${seed - 40000}/100\n`);
  }
  const bytes = raw.map(encode).join('\n') + '\n';
  writeFileSync(rawPath, bytes, { flag: 'wx' });
  const report = { version: 9, kind: 'paired-core-regression', seeds: 100, minutes: 30, policies,
    interpretation: 'Simulated engine time, paired v0.8/v0.9 gameplay preservation; not human or native play.',
    rawPath, rawHash: sha(bytes), binding: inputs, passed: raw.every(row => row.equal) };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  verifyReport(report, raw);
  process.stdout.write('V09_CORE_REGRESSION_OK\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
}
