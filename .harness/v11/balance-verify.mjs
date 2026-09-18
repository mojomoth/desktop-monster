#!/usr/bin/env node
// Independent receipt validation: never trust report.pass or stored percentiles.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const ensure = (value, message) => { if (!value) throw Error(message); };
const stable = value => JSON.stringify(value, null, 2);
const same = (actual, expected, message) => ensure(JSON.stringify(actual) === JSON.stringify(expected), message);
const ordinaryProfiles = ['ordinary', 'intermittent'];
const stressProfiles = ['high', 'idle', 'wealthy', 'soul-farming'];
function verifyExposure(row, maximumMs, firstThreeMaximumMs) {
  if (!row.nonarrival) return;
  const scheduled = row.cyclesWanted > 3 && row.cycles.length < 3 ? Math.min(maximumMs, firstThreeMaximumMs) : maximumMs;
  ensure(row.durationMs === scheduled, 'Censored trajectory stopped before scheduled exposure ' + row.profile + ':' + row.seed);
}
export function verifySchedule(rows, protocol) {
  const expected = new Map();
  for (const profile of ordinaryProfiles) for (let i = 0; i < protocol.heldOutSeeds.count; i++) expected.set(`${profile}:${protocol.heldOutSeeds.first + i}`, i < protocol.continuationSeeds.count ? 10 : 3);
  for (const profile of stressProfiles) for (let i = 0; i < 20; i++) expected.set(`${profile}:${protocol.heldOutSeeds.first + i}`, 3);
  ensure(rows.length === expected.size, 'Incomplete validation trajectory count');
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.profile}:${row.seed}`;
    ensure(expected.has(key) && !seen.has(key), 'Unexpected or duplicate trajectory ' + key); seen.add(key);
    ensure(row.cyclesWanted === expected.get(key), 'Wrong scheduled cycle horizon ' + key);
    ensure(Array.isArray(row.cycles) && row.cycles.length <= row.cyclesWanted && row.nonarrival === row.cyclesWanted - row.cycles.length, 'Wrong nonarrival count ' + key);
    let previous = 0;
    for (const [index, cycle] of row.cycles.entries()) {
      ensure(cycle.number === index + 1 && Number.isFinite(cycle.acceptedAtMs) && cycle.acceptedAtMs > previous &&
        cycle.intervalMs === cycle.acceptedAtMs - previous && cycle.readyAtMs <= cycle.acceptedAtMs && cycle.readyAtMs > previous, 'Malformed cycle interval ' + key);
      if (index < 3) ensure(cycle.acceptedAtMs <= protocol.simulation.firstThreeMaxHours * 3600000, 'First-three horizon exceeded ' + key);
      previous = cycle.acceptedAtMs;
    }
    ensure(Number.isFinite(row.durationMs) && row.durationMs >= previous && row.durationMs <= (row.cyclesWanted === 10 ? protocol.simulation.tenCyclesMaxHours : protocol.simulation.firstThreeMaxHours) * 3600000, 'Invalid duration ' + key);
    verifyExposure(row, (row.cyclesWanted === 10 ? protocol.simulation.tenCyclesMaxHours : protocol.simulation.firstThreeMaxHours) * 3600000, protocol.simulation.firstThreeMaxHours * 3600000);
    for (const field of ['coins', 'spent', 'income', 'sales']) ensure(typeof row.final[field] === 'string' && /^(0|[1-9]\d*)$/.test(row.final[field]), 'Invalid currency ' + key);
    ensure(BigInt(row.final.coins) === (row.profile === 'wealthy' ? 1000000n : 0n) + BigInt(row.final.income) + BigInt(row.final.sales) - BigInt(row.final.spent), 'Currency mismatch ' + key);
  }
  return true;
}
export function recompute(rows, protocol, through = 10) {
  const quantile = (values, p) => { const ordered = [...values].sort((a, b) => a - b), result = ordered[Math.floor((ordered.length - 1) * p)]; return Number.isFinite(result) ? result : null; };
  const summaries = [], checks = [];
  for (const profile of [...new Set(rows.map(row => row.profile))]) for (let cycle = 1; cycle <= through; cycle++) {
    const group = rows.filter(row => row.profile === profile && row.cyclesWanted >= cycle); if (!group.length) continue;
    const times = group.map(row => row.cycles[cycle - 1] ? row.cycles[cycle - 1].intervalMs / 60000 : Infinity);
    const stat = { profile, cycle, n: group.length, arrived: times.filter(Number.isFinite).length, nonarrival: times.filter(time => !Number.isFinite(time)).length,
      p10: quantile(times, .1), p50: quantile(times, .5), p90: quantile(times, .9) };
    summaries.push(stat);
    if (ordinaryProfiles.includes(profile)) {
      const target = cycle <= 3 ? protocol.gates.ordinaryFirstThreeMinutes : protocol.gates.ordinaryLaterMinutes;
      checks.push({ profile, cycle, passed: stat.p50 !== null && stat.p50 >= target.p50Minimum && stat.p50 <= target.p50Maximum &&
        (cycle > 3 || stat.p10 !== null && stat.p10 >= target.p10Minimum && stat.p90 !== null && stat.p90 <= target.p90Maximum) });
    } else if (profile === 'high' && cycle <= 3) checks.push({ profile, cycle, passed: stat.p10 !== null && stat.p10 >= protocol.gates.highFirstThreeMinutes.p10Minimum &&
      stat.arrived / stat.n >= protocol.gates.highFirstThreeMinutes.minimumArrivalFraction });
  }
  const normal = summaries.filter(entry => ordinaryProfiles.includes(entry.profile));
  return { summaries, checks, passed: checks.length > 0 && checks.every(check => check.passed), score: {
    maximumMedianDeviation: Math.max(...normal.map(entry => entry.p50 === null ? Infinity : Math.abs(entry.p50 - 240))),
    maximumP90: Math.max(...normal.map(entry => entry.p90 ?? Infinity)) }, humanFun: false };
}
function verifyRun(reportPath, current = false) {
  const directory = dirname(reportPath), report = read(reportPath), protocol = read(resolve(directory, 'protocol.json')), registration = read(resolve(directory, 'candidates.json'));
  same(report.binding, report.after, 'Source changed during measurement');
  same(read(resolve(directory, 'binding.json')), report.binding, 'Binding receipt mismatch');
  ensure(digest(readFileSync(resolve(directory, 'protocol.registered.json'))) === report.binding.protocolHash, 'Registered protocol hash mismatch');
  ensure(digest(readFileSync(resolve(directory, 'candidates.registered.json'))) === report.binding.candidatesHash, 'Registered candidate hash mismatch');
  same(read(resolve(directory, 'protocol.registered.json')), protocol, 'Protocol archive differs from registered bytes');
  same(read(resolve(directory, 'candidates.registered.json')), registration, 'Candidate archive differs from registered bytes');
  ensure(digest(stable(report.binding.files)) === report.binding.coreHash, 'Core aggregate hash mismatch');
  const coreFiles = Object.keys(report.binding.files).sort();
  same(readdirSync(resolve(directory, 'source-core')).sort(), coreFiles, 'Source archive file set changed');
  const currentFiles = {};
  for (const file of coreFiles) {
    ensure(digest(readFileSync(resolve(directory, 'source-core', file))) === report.binding.files[file], 'Source archive hash mismatch ' + file);
    if (current) currentFiles[file] = digest(readFileSync(resolve('src/core', file)));
  }
  if (current) {
    same(readdirSync(resolve('src/core')).filter(file => file.endsWith('.ts')).sort(), coreFiles, 'Production core file set changed');
    same(currentFiles, report.binding.files, 'Production core is stale');
    ensure(digest(readFileSync('.harness/v11/balance.mjs')) === report.binding.scriptHash, 'Evaluator changed after measurement');
    ensure(digest(readFileSync('docs/v0.11/EVALUATION_PROTOCOL.json')) === report.binding.protocolHash, 'Protocol changed after measurement');
    ensure(digest(readFileSync('docs/v0.11/BALANCE_CANDIDATE.json')) === report.binding.candidatesHash, 'Candidate registration changed after measurement');
  }
  if (report.mode === 'explore') {
    ensure(registration.candidates.length >= 3, 'Fewer than three registered candidates');
    same(report.reports.map(result => result.candidate.id).sort(), registration.candidates.map(candidate => candidate.id).sort(), 'Not every registered candidate was measured');
    ensure(new Set(registration.candidates.map(candidate => candidate.id)).size === registration.candidates.length, 'Duplicate registered candidate');
  }
  for (const result of report.reports) {
    const registered = registration.candidates.find(candidate => candidate.id === result.candidate.id);
    same(result.candidate, registered, 'Unregistered measured candidate');
    const compiledDirectory = resolve(directory, 'compiled-' + registered.id);
    const expectedJs = coreFiles.map(file => file.replace(/\.ts$/, '.js')).sort();
    same(readdirSync(compiledDirectory).sort(), expectedJs, 'Compiled file set mismatch');
    for (const file of coreFiles) {
      let source = readFileSync(resolve(directory, 'source-core', file), 'utf8');
      if (file === 'progression.ts') for (const [key, value] of Object.entries(registered.parameters)) {
        const pattern = new RegExp('(' + key + ': )([0-9_.]+|null)(?=,)'); ensure(pattern.test(source), 'Unknown candidate mutation');
        source = source.replace(pattern, (_, prefix) => prefix + JSON.stringify(value));
      }
      const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true } }).outputText;
      const js = file.replace(/\.ts$/, '.js');
      ensure(digest(compiled) === result.compiledFiles[js] && digest(readFileSync(resolve(compiledDirectory, js))) === result.compiledFiles[js], 'Compiled candidate differs from registered source ' + js);
    }
    const paths = new Set();
    const rows = result.raw.flatMap(artifact => {
      ensure(!paths.has(artifact.path), 'Duplicate raw artifact'); paths.add(artifact.path);
      const raw = readFileSync(artifact.path); ensure(digest(raw) === artifact.sha256, 'Raw trajectory hash mismatch');
      return raw.toString('utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    });
    ensure(rows.length === result.rows, 'Report trajectory count mismatch');
    if (report.mode === 'validate') verifySchedule(rows, protocol);
    else {
      const tuples = new Set();
      ensure(rows.length === registration.profiles.length * protocol.explorationSeeds.count, 'Exploration denominator mismatch');
      for (const row of rows) {
        const key = `${row.profile}:${row.seed}`;
        ensure(registration.profiles.includes(row.profile) && row.seed >= protocol.explorationSeeds.first && row.seed < protocol.explorationSeeds.first + protocol.explorationSeeds.count && !tuples.has(key), 'Invalid exploration tuple'); tuples.add(key);
        ensure(row.cyclesWanted === (registration.profileCycles?.[row.profile] ?? registration.cycles), 'Exploration horizon mismatch');
        ensure(Array.isArray(row.cycles) && row.cycles.length <= row.cyclesWanted && row.nonarrival === row.cyclesWanted - row.cycles.length, 'Invalid exploration censoring');
        verifyExposure(row, registration.maxHours * 3600000, protocol.simulation.firstThreeMaxHours * 3600000);
      }
    }
    const computed = recompute(rows, protocol, report.mode === 'validate' ? 10 : registration.cycles);
    for (const key of ['summaries', 'checks', 'passed', 'score', 'humanFun']) same(JSON.parse(JSON.stringify(computed[key])), result[key], 'Recomputed ' + key + ' differs');
  }
  return { report, protocol, registration };
}
export function verifyBalance(finalPath) {
  const manifest = read(finalPath);
  ensure(manifest.version === 11 && typeof manifest.selected === 'string', 'Invalid final balance manifest');
  ensure(digest(readFileSync(manifest.validationReport)) === manifest.validationSha256, 'Validation report hash mismatch');
  ensure(digest(readFileSync(manifest.selectionReport)) === manifest.selectionSha256, 'Selection report hash mismatch');
  const validation = verifyRun(manifest.validationReport, true), selection = verifyRun(manifest.selectionReport);
  same(validation.protocol, selection.protocol, 'Selection and heldout protocols differ');
  ensure(validation.report.binding.scriptHash === selection.report.binding.scriptHash, 'Evaluator changed between selection and validation');
  const protocol = validation.protocol;
  ensure(protocol.heldOutSeeds.count === 100 && protocol.continuationSeeds.count === 20 && protocol.continuationSeeds.first === protocol.heldOutSeeds.first && protocol.explorationSeeds.count === 20, 'Required seed denominators changed');
  same(protocol.ordinaryProfiles, ordinaryProfiles, 'Ordinary profile schedule changed');
  same(protocol.stressProfiles, stressProfiles, 'Adversarial profile schedule changed');
  same(protocol.gates.ordinaryFirstThreeMinutes, { p10Minimum: 120, p50Minimum: 180, p50Maximum: 300, p90Maximum: 360 }, 'First-three targets changed');
  same(protocol.gates.ordinaryLaterMinutes, { cycles: [4,5,6,7,8,9,10], p50Minimum: 180, p50Maximum: 300 }, 'Later targets changed');
  same(protocol.gates.highFirstThreeMinutes, { p10Minimum: 120, minimumArrivalFraction: .9 }, 'High-input targets changed');
  ensure(protocol.simulation.firstThreeMaxHours === 18 && protocol.simulation.tenCyclesMaxHours === 60, 'Scheduled exposure horizons changed');
  ensure(validation.report.mode === 'validate' && validation.report.reports.length === 1 && validation.registration.selected === manifest.selected, 'Wrong final validation candidate');
  const result = validation.report.reports[0];
  ensure(result.candidate.id === manifest.selected && result.passed, 'Final pacing gates failed');
  ensure(selection.report.mode === 'explore' && selection.registration.cycles === 10 &&
    ordinaryProfiles.every(profile => selection.registration.profiles.includes(profile)) && selection.registration.profiles.includes('high'), 'Selection did not evaluate all required cycles/profiles');
  ensure(ordinaryProfiles.every(profile => (selection.registration.profileCycles?.[profile] ?? selection.registration.cycles) === 10) &&
    (selection.registration.profileCycles?.high ?? selection.registration.cycles) >= 3 && selection.registration.maxHours === 60, 'Selection overrides shorten required horizons');
  const changes = candidate => Object.entries(candidate.parameters).filter(([key, value]) => protocol.baselineParameters[key] !== value).length;
  const passing = selection.report.reports.filter(entry => entry.passed).sort((a, b) =>
    a.score.maximumMedianDeviation - b.score.maximumMedianDeviation || a.score.maximumP90 - b.score.maximumP90 ||
    changes(a.candidate) - changes(b.candidate) || a.candidate.id.localeCompare(b.candidate.id));
  ensure(passing[0]?.candidate.id === manifest.selected, 'Candidate selection rule violated');
  same(passing[0].candidate.parameters, result.candidate.parameters, 'Selected parameters changed during validation');
  same(passing[0].compiledFiles, result.compiledFiles, 'Measured code changed between selection and validation');
  ensure(validation.protocol.explorationSeeds.first + validation.protocol.explorationSeeds.count <= validation.protocol.heldOutSeeds.first ||
    validation.protocol.heldOutSeeds.first + validation.protocol.heldOutSeeds.count <= validation.protocol.explorationSeeds.first, 'Exploration and validation seeds overlap');
  ensure(result.checks.length === 23 && result.checks.every(check => check.passed), 'Required gate groups missing');
  const source = readFileSync('src/core/progression.ts', 'utf8');
  for (const [key, value] of Object.entries(result.candidate.parameters)) {
    const match = source.match(new RegExp(key + ': ([0-9_.]+|null)(?=,)'));
    ensure(match && JSON.parse(match[1].replaceAll('_', '')) === value, 'Production parameter differs from measured candidate: ' + key);
  }
  return { passed: true, selected: manifest.selected, ordinaryTrajectories: 200, continuedTrajectories: 40, adversarialTrajectories: 80, humanFun: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(verifyBalance(resolve(process.argv[2]))) + '\n'); }
  catch (error) { process.stderr.write(String(error) + '\n'); process.exitCode = 1; }
}
