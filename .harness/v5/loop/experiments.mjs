#!/usr/bin/env node
// v0.6 experimental policies around the actual compiled production engine.
// The one hook exists only in this vm module, never in the shipped game.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Script } from 'node:vm';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { ROOT, sha256, sourceDigest, evaluationDigest } from './evidence.mjs';
import { distribution, provenance } from './measure.mjs';

export const TYPES = ['fire', 'water', 'wind', 'earth', 'dark'];
export const VARIANTS = ['current-release', 'existing-management-only', 'one-pending-keep-first'];
const check = (ok, message) => { if (!ok) throw new Error(message); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sum = (values) => values.reduce((a, b) => a + b, 0);

export function partyPowers(core, companions, hero) {
  return Object.fromEntries(TYPES.map((enemy) => [enemy, core.activeCompanions(companions, enemy, hero)
    .reduce((n, c) => n + core.effectivePower(core.heroBuffedPower(core.companionPower(c), core.typeOf(c.speciesId), hero), core.typeOf(c.speciesId), enemy), 0n).toString()]));
}

/** Adding a card raises a top-five sum exactly when it beats that party's last card.
 * Cache only production party selection; roster arrays/length and equipped roll invalidate it.
 */
export function opportunityCounter(core) {
  let roster, length, equipped, thresholds;
  return (companions, hero, candidate) => {
    const power = (c, enemy) => core.effectivePower(core.heroBuffedPower(core.companionPower(c), core.typeOf(c.speciesId), hero), core.typeOf(c.speciesId), enemy);
    if (roster !== companions || length !== companions.length || equipped !== hero) {
      roster = companions; length = companions.length; equipped = hero;
      thresholds = Object.fromEntries(TYPES.map((enemy) => {
        const party = core.activeCompanions(companions, enemy, hero);
        return [enemy, party.length < core.PARTY_SIZE ? 0n : power(party.at(-1), enemy)];
      }));
    }
    return TYPES.some((enemy) => power(candidate, enemy) > thresholds[enemy]);
  };
}

export function bigintDistribution(values) {
  const sorted = values.map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const at = (q) => sorted.length ? sorted[Math.floor((sorted.length - 1) * q)].toString() : null;
  return { reached: sorted.length, unreached: 0, min: at(0), p10: at(.1), p50: at(.5), p90: at(.9), max: at(1) };
}

/** Fail closed if compilation changes the single capture hook location. */
export function instrumentEngine(buildPath = resolve(ROOT, 'dist/electron/core/engine.js')) {
  const original = readFileSync(buildPath, 'utf8');
  const needle = 'if (drew && state.companions.length < collection_js_1.ROSTER_CAP) {';
  check(original.split(needle).length === 2, 'Expected exactly one production capture branch for instrumentation.');
  const instrumented = original.replace(needle, `if (drew && __captureHook(state, killed)) {\n        } else ${needle}`);
  const evaluate = new Script(`(function(exports, require, module, __filename, __dirname, __captureHook) {\n${instrumented}\n})`, { filename: `${buildPath}.experiment` }).runInThisContext();
  const require = createRequire(buildPath);
  return { originalSha256: sha256(original), instrumentedSha256: sha256(instrumented), create(hook) {
    const module = { exports: {} };
    evaluate(module.exports, require, module, buildPath, dirname(buildPath), hook);
    return module.exports.createEngine;
  } };
}

/** Identical event/save replay proves that the instrumentation itself is a no-op. */
export function verifyNoopAdapter(core, adapter, fixture, seconds = 180) {
  const native = core.createEngine(fixture, core.mulberry32(71));
  let draws = 0;
  const wrapped = adapter.create(() => { draws++; return false; })(fixture, core.mulberry32(71));
  const json = (value) => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v);
  for (let sec = 1; sec <= seconds; sec++) {
    for (let n = 0; n < 2; n++) check(json(native.attack('keyboard')) === json(wrapped.attack('keyboard')), 'Instrumented/native attack mismatch.');
    check(json(native.tick(1000)) === json(wrapped.tick(1000)), 'Instrumented/native tick mismatch.');
    for (const engine of [native, wrapped]) {
      const state = engine.getState();
      if (core.heroReady(state.level, state.hero)) {
        engine.apply({ type: 'heroOffer' });
        const hero = engine.getState().hero;
        engine.apply({ type: 'heroChoose', formId: hero.choices[0].formId, offerSerial: hero.offerSerial });
      }
    }
    check(core.serializeSave(native.toSave()) === core.serializeSave(wrapped.toSave()), 'Instrumented/native save mismatch.');
  }
  check(draws > 0, 'No-op replay must exercise a capture draw.');
  return { seconds, seed: 71, captureDraws: draws, passed: true };
}

export function simulateCapture(core, adapter, fixture, settings) {
  const { variant, stage, interval, seed, fixtureName, checkpointSeconds = [300, 900, 1800] } = settings;
  check(VARIANTS.includes(variant) && [1, 2].includes(stage) && [null, 120, 600].includes(interval), 'Unknown capture policy.');
  check(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff && checkpointSeconds.length > 0 && checkpointSeconds.every((s, n) => Number.isSafeInteger(s) && s > 0 && s <= 1800 && (n === 0 || s > checkpointSeconds[n - 1])), 'Invalid capture seed/checkpoints.');
  const trace = [], visits = [], snapshots = [];
  let sec = 0, pending = null, live = null, income = 0, heroSouls = 0, sacrificeSouls = 0, nativeReleaseSouls = 0, deferredReleaseSouls = 0;
  let heroVisits = 0, heroClicks = 0;
  const initialSouls = fixture.souls, initialReleased = fixture.releasedCount ?? 0;
  const isUseful = opportunityCounter(core);
  const create = adapter.create((state, killed) => {
    live = state;
    const candidate = { id: `candidate${trace.length + 1}`, speciesId: killed.speciesId, bossIndex: killed.index, level: 1, stars: 0 };
    const useful = isUseful(state.companions, state.hero?.equipped, candidate);
    const full = state.companions.length >= core.ROSTER_CAP;
    const hold = full && variant === 'one-pending-keep-first' && pending === null;
    const record = { serial: trace.length + 1, at: sec, species: candidate.speciesId, index: candidate.bossIndex, useful,
      outcome: hold ? 'pending' : full ? 'released' : 'owned', held: hold, resolvedAt: hold ? null : sec, releaseSouls: 0 };
    trace.push(record);
    if (hold) { pending = { candidate, record }; return true; }
    if (full) record.releaseSouls = (state.releasedCount + 1) % core.RELEASES_PER_SOUL === 0 ? 1 : 0;
    return false;
  });
  const engine = create(fixture, core.mulberry32(seed));
  const observe = (events) => {
    for (const event of events) {
      if (event.type === 'itemDropped') income += sum(event.drops.filter((d) => d.item.kind === 'coin').map((d) => d.amount));
      if (event.type === 'companionReleased') nativeReleaseSouls += event.souls;
    }
  };
  const chooseHero = () => {
    const state = engine.getState();
    if (!core.heroReady(state.level, state.hero)) return false;
    engine.apply({ type: 'heroOffer' });
    const hero = engine.getState().hero;
    check(hero?.choices.length > 0, 'Ready hero must offer choices.');
    engine.apply({ type: 'heroChoose', formId: hero.choices[0].formId, offerSerial: hero.offerSerial });
    heroSouls += engine.getState().souls - state.souls;
    return true;
  };
  const visit = () => {
    const entry = { at: sec, hero: false, sacrifice: null, sacrificeSouls: 0, pending: null, clicks: 3 };
    if (stage === 2 && chooseHero()) { entry.hero = true; entry.clicks += 3; }
    const before = engine.getState();
    const beforePowers = partyPowers(core, before.companions, before.hero?.equipped);
    if (variant !== 'current-release' && before.companions.length === core.ROSTER_CAP) {
      const target = before.companions.reduce((a, b) => core.companionPower(b) < core.companionPower(a) ? b : a);
      engine.apply({ type: 'sacrifice', id: target.id });
      const after = engine.getState();
      check(!after.companions.some((c) => c.id === target.id) && after.companions.length === before.companions.length - 1, 'Explicit sacrifice must remove exactly selected target.');
      entry.sacrifice = target.id; entry.sacrificeSouls = after.souls - before.souls; entry.clicks++;
      sacrificeSouls += entry.sacrificeSouls;
    }
    if (pending) {
      const after = engine.getState();
      const powers = partyPowers(core, [...after.companions, pending.candidate], after.hero?.equipped);
      const accept = after.companions.length < core.ROSTER_CAP && TYPES.every((t) => BigInt(powers[t]) >= BigInt(beforePowers[t])) && TYPES.some((t) => BigInt(powers[t]) > BigInt(beforePowers[t]));
      if (accept) {
        engine.apply({ type: 'addCompanion', companion: pending.candidate });
        check(engine.getState().companions.length === after.companions.length + 1, 'Pending acceptance must use the available slot.');
        pending.record.outcome = 'owned';
      } else {
        // Experimental rejection uses the production release unit and current parity.
        // The live reference is obtained only by the vm hook; this never mutates a game instance.
        live.releasedCount++;
        const reward = live.releasedCount % core.RELEASES_PER_SOUL === 0 ? 1 : 0;
        live.souls += reward; deferredReleaseSouls += reward;
        pending.record.outcome = 'released'; pending.record.releaseSouls = reward;
      }
      pending.record.resolvedAt = sec; entry.pending = accept ? 'accept' : 'reject'; entry.clicks++; pending = null;
    }
    visits.push(entry);
  };
  for (sec = 1; sec <= checkpointSeconds.at(-1); sec++) {
    observe(engine.attack('keyboard')); observe(engine.attack('keyboard')); observe(engine.tick(1000));
    if (stage === 1 && chooseHero()) { heroVisits++; heroClicks += 5; }
    if (interval !== null && sec % interval === 0) visit();
    if (!checkpointSeconds.includes(sec)) continue;
    const state = engine.getState();
    const owned = trace.filter((r) => r.outcome === 'owned').length;
    const released = trace.filter((r) => r.outcome === 'released').length;
    const pendingCount = pending ? 1 : 0;
    check(trace.length === owned + released + pendingCount, 'Capture conservation failed.');
    check(state.releasedCount === initialReleased + released, 'Release count conservation failed.');
    check(nativeReleaseSouls + deferredReleaseSouls === Math.floor(state.releasedCount / core.RELEASES_PER_SOUL) - Math.floor(initialReleased / core.RELEASES_PER_SOUL), 'Release parity conservation failed.');
    check(state.souls === initialSouls + heroSouls + sacrificeSouls + nativeReleaseSouls + deferredReleaseSouls, 'Soul conservation failed.');
    check(state.coins === fixture.coins + income, 'Capture experiment gold conservation failed.');
    const delays = trace.filter((r) => r.held).map((r) => (r.resolvedAt ?? sec) - r.at);
    snapshots.push({ seed, fixture: fixtureName, variant, stage, interval, minutes: sec / 60,
      fixtureSha256: settings.fixtureSha256, sourceDigest: settings.sourceDigest, protocolSha256: settings.protocolSha256,
      inputCount: sec * 2, kills: state.killCount - fixture.killCount, reincarnations: (state.hero?.reincarnations ?? 0) - (fixture.hero?.reincarnations ?? 0),
      effectivePartyPowerByType: partyPowers(core, state.companions, state.hero?.equipped), captures: trace.length, ownedCaptures: owned, releasedCaptures: released,
      pendingCaptures: pendingCount, candidateLosses: trace.filter((r) => r.outcome === 'released' && r.useful).length,
      pendingUsefulOpportunity: pending?.record.useful ? 1 : 0, releasedCount: state.releasedCount, soulsInitial: initialSouls,
      souls: state.souls, soulsReceived: nativeReleaseSouls + deferredReleaseSouls, heroSouls, sacrificeSouls,
      soulsPending: pendingCount ? Math.floor((state.releasedCount + 1) / core.RELEASES_PER_SOUL) - Math.floor(state.releasedCount / core.RELEASES_PER_SOUL) : 0,
      pendingReleaseUnits: pendingCount, soulDelaySeconds: sum(delays), maximumPendingSeconds: Math.max(0, ...delays),
      visits: visits.length + heroVisits, companionVisits: visits.length, heroVisits, clicks: sum(visits.map((v) => v.clicks)) + heroClicks,
      explicitOwnedDeletions: visits.filter((v) => v.sacrifice !== null).length, coins: state.coins, income, spent: 0,
      automaticDeletionOfOwnedCompanions: 0, duplicateSettlement: 0, forcedWindows: 0 });
  }
  return { settings, snapshots, captures: trace, visits, finalSaveSha256: sha256(core.serializeSave(engine.toSave())) };
}

export function simulateFever(core, fixture, seed, pattern, durationSeconds = 1800) {
  check(['uniform', 'burst'].includes(pattern), 'Unknown fever pattern.');
  const engine = core.createEngine(fixture, core.mulberry32(seed));
  let inputCount = 0, feverStarts = 0;
  const bins = new Map();
  const observe = (events) => { feverStarts += events.filter((e) => e.type === 'feverStart').length; };
  for (let ms = 0; ms < durationSeconds * 1000; ms += 100) {
    const input = pattern === 'uniform' ? ms % 500 === 0 : ms % 10000 < 2000;
    if (input) { observe(engine.attack('keyboard')); inputCount++; const bin = Math.floor(ms / 1000); bins.set(bin, (bins.get(bin) ?? 0) + 1); }
    observe(engine.tick(100));
    const state = engine.getState();
    if (core.heroReady(state.level, state.hero)) {
      engine.apply({ type: 'heroOffer' });
      const hero = engine.getState().hero;
      engine.apply({ type: 'heroChoose', formId: hero.choices[0].formId, offerSerial: hero.offerSerial });
    }
  }
  const state = engine.getState();
  check(inputCount === durationSeconds * 2, 'Fever experiment must preserve total inputs.');
  return { seed, pattern, minutes: durationSeconds / 60, inputCount, feverStarts,
    kills: state.killCount - fixture.killCount, discoveries: state.progress.seenMonsters.length - (fixture.progress?.seenMonsters.length ?? 0),
    reincarnations: (state.hero?.reincarnations ?? 0) - (fixture.hero?.reincarnations ?? 0),
    inputConcentration: { maximumPerSecond: Math.max(0, ...bins.values()), occupiedSecondShare: bins.size / durationSeconds } };
}

export function simulateFreshIdle(core, fixture, seed, checkpointSeconds = [300, 900, 1800]) {
  const engine = core.createEngine(fixture, core.mulberry32(seed));
  const rows = [];
  for (let sec = 1; sec <= checkpointSeconds.at(-1); sec++) {
    engine.tick(1000);
    if (!checkpointSeconds.includes(sec)) continue;
    const state = engine.getState();
    rows.push({ seed, minutes: sec / 60, inputs: 0, menuVisits: 0, kills: state.killCount - fixture.killCount,
      companions: state.companions.length, firstRewardSec: null, firstCaptureSec: null, level: state.level, coins: state.coins });
  }
  return rows;
}

const CAPTURE_METRICS = ['kills', 'captures', 'candidateLosses', 'pendingUsefulOpportunity', 'releasedCaptures', 'soulsReceived', 'soulsPending', 'pendingReleaseUnits', 'soulDelaySeconds', 'maximumPendingSeconds', 'visits', 'clicks', 'explicitOwnedDeletions'];
const ZERO_TOLERANCE = ['automaticDeletionOfOwnedCompanions', 'duplicateSettlement', 'forcedWindows'];
const keyFor = (r, variant = false) => [r.fixture, r.stage, r.interval, r.minutes, ...(variant ? [r.variant] : [])].join('/');

export function summarizeExperiments(raw) {
  const groups = new Map();
  for (const row of raw) { const key = keyFor(row, true); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
  return [...groups.entries()].map(([key, rows]) => ({ key, samples: rows.length,
    metrics: Object.fromEntries(CAPTURE_METRICS.map((m) => [m, distribution(rows.map((r) => r[m]))])),
    effectivePartyPowerByType: Object.fromEntries(TYPES.map((type) => [type, bigintDistribution(rows.map((r) => r.effectivePartyPowerByType[type]))])) }));
}

export function pairedComparisons(raw) {
  const pairs = new Map();
  for (const row of raw.filter((r) => r.variant !== 'current-release')) {
    const key = `${keyFor(row)}/${row.seed}`;
    if (!pairs.has(key)) pairs.set(key, {});
    const pair = pairs.get(key);
    check(!pair[row.variant], 'Duplicate paired seed/configuration.'); pair[row.variant] = row;
  }
  const rows = [...pairs.entries()].map(([key, pair]) => {
    const base = pair['existing-management-only'], pending = pair['one-pending-keep-first'];
    check(base && pending, `Missing paired comparison: ${key}`);
    for (const field of ['sourceDigest', 'protocolSha256', 'fixtureSha256', 'inputCount']) check(base[field] === pending[field], `Mismatched paired setting: ${field}`);
    return { fixture: base.fixture, stage: base.stage, interval: base.interval, minutes: base.minutes, seed: base.seed,
      powerDifferences: Object.fromEntries(TYPES.map((t) => [t, (BigInt(pending.effectivePartyPowerByType[t]) - BigInt(base.effectivePartyPowerByType[t])).toString()])),
      candidateLossDifference: pending.candidateLosses - base.candidateLosses, savedCandidateLosses: base.candidateLosses - pending.candidateLosses,
      clickDifference: pending.clicks - base.clicks, soulDifference: pending.souls - base.souls,
      soulDelayDifference: pending.soulDelaySeconds - base.soulDelaySeconds, pendingUnitsDifference: pending.pendingReleaseUnits - base.pendingReleaseUnits };
  });
  const groups = new Map();
  for (const row of rows) { const key = keyFor(row); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
  return { raw: rows, groups: [...groups.entries()].map(([key, rows]) => ({ key, samples: rows.length,
    powers: Object.fromEntries(TYPES.map((t) => [t, { ...bigintDistribution(rows.map((r) => r.powerDifferences[t])), improved: rows.filter((r) => BigInt(r.powerDifferences[t]) > 0n).length, regressed: rows.filter((r) => BigInt(r.powerDifferences[t]) < 0n).length }])),
    candidateLossDifference: distribution(rows.map((r) => r.candidateLossDifference)), clickDifference: distribution(rows.map((r) => r.clickDifference)),
    improvedSeeds: rows.filter((r) => TYPES.some((t) => BigInt(r.powerDifferences[t]) > 0n)).length,
    regressedSeeds: rows.filter((r) => TYPES.some((t) => BigInt(r.powerDifferences[t]) < 0n)).length,
    candidateLossRegressedSeeds: rows.filter((r) => r.candidateLossDifference > 0).length, clickRegressedSeeds: rows.filter((r) => r.clickDifference > 0).length,
    increasedSoulDelaySeeds: rows.filter((r) => r.soulDelayDifference > 0).length,
    numericCriteriaPass: rows.every((r) => TYPES.every((t) => BigInt(r.powerDifferences[t]) >= 0n) && r.candidateLossDifference <= 0 && r.clickDifference <= 0) && rows.some((r) => TYPES.some((t) => BigInt(r.powerDifferences[t]) > 0n)) })) };
}

export function summarizeFever(raw) {
  const groups = ['uniform', 'burst'].map((pattern) => ({ pattern,
    metrics: Object.fromEntries(['inputCount', 'feverStarts', 'kills', 'discoveries', 'reincarnations'].map((metric) => [metric, distribution(raw.filter((r) => r.pattern === pattern).map((r) => r[metric]))])) }));
  const uniform = new Map(raw.filter((r) => r.pattern === 'uniform').map((r) => [r.seed, r]));
  const paired = raw.filter((r) => r.pattern === 'burst').map((r) => {
    const base = uniform.get(r.seed); check(base && base.inputCount === r.inputCount && base.minutes === r.minutes, 'Mismatched fever input/seed configuration.');
    return { seed: r.seed, ...Object.fromEntries(['feverStarts', 'kills', 'discoveries', 'reincarnations'].map((m) => [m, r[m] - base[m]])) };
  });
  return { groups, paired, differences: Object.fromEntries(['feverStarts', 'kills', 'discoveries', 'reincarnations'].map((m) => [m, distribution(paired.map((r) => r[m]))])) };
}

export function summarizeFreshIdle(raw) {
  return [5, 15, 30].map((minutes) => ({ minutes, samples: raw.filter((r) => r.minutes === minutes).length,
    metrics: Object.fromEntries(['inputs', 'menuVisits', 'kills', 'companions', 'level', 'coins', 'firstRewardSec', 'firstCaptureSec']
      .map((m) => [m, distribution(raw.filter((r) => r.minutes === minutes).map((r) => r[m]))])) }));
}

function adoptionDecision(groups) {
  const decisions = groups.filter((g) => g.key.endsWith('/600/30'));
  check(decisions.length === 4, 'Adoption requires both fixtures and stages at 600 seconds.');
  const numericCriteriaPass = decisions.every((g) => g.numericCriteriaPass);
  return { numericCriteriaPass, increasedSoulDelaySeeds: sum(decisions.map((g) => g.increasedSoulDelaySeeds)),
    decision: 'excluded', reason: numericCriteriaPass ? 'Human review of pending soul delay and exchange costs is required; PENDING.' : 'Frozen 600-second per-seed power/loss/click conditions did not all pass.' };
}

export function validateExperiments(report, digest = report.sourceDigest) {
  check(report.kind === 'v06-engine-experiments' && report.sourceDigest === digest, 'Stale or invalid experimental artifact.');
  check(report.protocol.version === 2 && report.protocol.status === 'frozen-before-execution', 'Experiments require frozen protocol v2.');
  check(sha256(report.protocolText) === report.protocolSha256 && equal(JSON.parse(report.protocolText), report.protocol), 'Protocol hash mismatch.');
  check(report.noopAdapter.passed && report.noopAdapter.captureDraws > 0, 'Actual engine no-op adapter verification required.');
  const seeds = Array.from({ length: 100 }, (_, n) => n + 1);
  const keys = new Set();
  const runsByKey = new Map();
  for (const row of report.capture.rawSamples) {
    check(seeds.includes(row.seed) && ['fresh', 'full-roster-fixed'].includes(row.fixture) && [1, 2].includes(row.stage) && [null, 120, 600].includes(row.interval) && [5, 15, 30].includes(row.minutes) && VARIANTS.includes(row.variant), 'Unknown experimental configuration.');
    const key = `${keyFor(row, true)}/${row.seed}`; check(!keys.has(key), 'Duplicate experimental raw sample.'); keys.add(key);
    check(row.sourceDigest === report.sourceDigest && row.protocolSha256 === report.protocolSha256 && row.fixtureSha256 === report.protocol.captureExperiment.fixtureRecords[row.fixture].sha256, 'Mismatched raw provenance.');
    check(CAPTURE_METRICS.every((m) => Number.isFinite(row[m]) && row[m] >= 0) && TYPES.every((t) => /^(0|[1-9]\d*)$/.test(row.effectivePartyPowerByType[t])), 'Invalid raw metric/power.');
    check(ZERO_TOLERANCE.every((metric) => row[metric] === 0), 'Zero-tolerance experimental outcomes must be explicitly zero.');
    check(row.inputCount === row.minutes * 120 && row.captures === row.ownedCaptures + row.releasedCaptures + row.pendingCaptures, 'Capture/input conservation mismatch.');
    check(row.souls === row.soulsInitial + row.heroSouls + row.sacrificeSouls + row.soulsReceived && row.coins === report.protocol.captureExperiment.fixtureRecords[row.fixture].coins + row.income, 'Currency conservation mismatch.');
    const runKey = [row.fixture, row.stage, row.interval, row.variant, row.seed].join('/');
    if (!runsByKey.has(runKey)) runsByKey.set(runKey, []);
    runsByKey.get(runKey).push(row);
  }
  check(keys.size === 2 * 2 * 3 * 3 * 3 * 100, 'Missing experimental capture configurations.');
  check(equal(summarizeExperiments(report.capture.rawSamples), report.capture.scenarios), 'Experimental distributions must match raw samples.');
  check(equal(pairedComparisons(report.capture.rawSamples), report.capture.comparisons), 'Experimental paired differences must match raw samples.');
  check(report.capture.runs.length === 3600 && new Set(report.capture.runs.map((r) => [r.settings.fixtureName, r.settings.stage, r.settings.interval, r.settings.variant, r.settings.seed].join('/'))).size === 3600, 'Capture ledgers must cover each independent trajectory.');
  for (const run of report.capture.runs) {
    const rows = runsByKey.get([run.settings.fixtureName, run.settings.stage, run.settings.interval, run.settings.variant, run.settings.seed].join('/'));
    check(rows?.length === 3, 'Capture ledger has missing or unknown configuration.');
    for (const row of rows) {
      const end = row.minutes * 60, records = run.captures.filter((r) => r.at <= end);
      check(records.every((r, n) => r.serial === n + 1 && r.at > 0 && (n === 0 || r.at >= records[n - 1].at) && ['owned', 'released', 'pending'].includes(r.outcome) && (r.resolvedAt === null || r.resolvedAt >= r.at)), 'Invalid capture ledger.');
      const held = records.filter((r) => r.held);
      check(held.every((r, n) => (n === 0 || (held[n - 1].resolvedAt !== null && held[n - 1].resolvedAt < r.at)) && (r.outcome === 'pending' ? r.resolvedAt === null : row.interval !== null && r.resolvedAt % row.interval === 0)), 'First pending candidate was overwritten or settled off-schedule.');
      const atEnd = (r) => r.held && (r.resolvedAt === null || r.resolvedAt > end) ? 'pending' : r.outcome;
      check(row.captures === records.length && row.ownedCaptures === records.filter((r) => atEnd(r) === 'owned').length && row.releasedCaptures === records.filter((r) => atEnd(r) === 'released').length && row.pendingCaptures === records.filter((r) => atEnd(r) === 'pending').length, 'Capture ledger does not match checkpoint.');
      check(row.candidateLosses === records.filter((r) => atEnd(r) === 'released' && r.useful).length, 'Candidate loss ledger mismatch.');
      check(row.soulDelaySeconds === sum(records.filter((r) => r.held).map((r) => Math.min(r.resolvedAt ?? end, end) - r.at)), 'Pending delay ledger mismatch.');
      const ended = run.visits.filter((v) => v.at <= end);
      check(ended.every((v, n) => row.interval !== null && v.at === row.interval * (n + 1) && v.clicks === 3 + (v.hero ? 3 : 0) + (v.sacrifice !== null ? 1 : 0) + (v.pending !== null ? 1 : 0)), 'Visit schedule/click ledger mismatch.');
      check(row.companionVisits === ended.length && row.visits === ended.length + row.heroVisits && row.clicks === sum(ended.map((v) => v.clicks)) + row.heroVisits * 5 && (row.stage !== 2 || row.heroVisits === 0), 'Visit/click totals mismatch.');
      check(row.explicitOwnedDeletions === ended.filter((v) => v.sacrifice !== null).length && row.sacrificeSouls === sum(ended.map((v) => v.sacrificeSouls)), 'Explicit sacrifice ledger mismatch.');
      const initialReleased = report.protocol.captureExperiment.fixtureRecords[row.fixture].releasedCount;
      check(row.releasedCount === initialReleased + row.releasedCaptures && row.soulsReceived === sum(records.filter((r) => atEnd(r) === 'released').map((r) => r.releaseSouls)), 'Release soul ledger mismatch.');
      check(row.soulsReceived === Math.floor(row.releasedCount / 2) - Math.floor(initialReleased / 2) && row.pendingReleaseUnits === row.pendingCaptures && row.pendingCaptures <= 1 && row.soulsPending === (row.pendingCaptures ? Math.floor((row.releasedCount + 1) / 2) - Math.floor(row.releasedCount / 2) : 0), 'Pending/released parity mismatch.');
    }
  }
  check(report.fever.rawSamples.length === 200 && new Set(report.fever.rawSamples.map((r) => `${r.seed}/${r.pattern}`)).size === 200 && report.fever.rawSamples.every((r) => seeds.includes(r.seed) && ['uniform', 'burst'].includes(r.pattern) && r.inputCount === 3600 && r.minutes === 30), 'Missing or invalid fever configurations.');
  check(equal(summarizeFever(report.fever.rawSamples), report.fever.summary), 'Fever distributions must match raw samples.');
  check(report.freshIdle.rawSamples.length === 300 && new Set(report.freshIdle.rawSamples.map((r) => `${r.seed}/${r.minutes}`)).size === 300 && report.freshIdle.rawSamples.every((r) => seeds.includes(r.seed) && [5, 15, 30].includes(r.minutes) && r.inputs === 0 && r.menuVisits === 0 && r.kills === 0 && r.companions === 0 && r.firstRewardSec === null && r.firstCaptureSec === null), 'Fresh idle zero/unreached controls must be retained.');
  check(equal(summarizeFreshIdle(report.freshIdle.rawSamples), report.freshIdle.scenarios), 'Fresh idle distributions must match raw samples.');
  // This experiment does not implement production pending persistence or supply human review.
  // A numeric pass therefore cannot be forged into a shipped/adopted decision.
  check(equal(report.adoption, adoptionDecision(report.capture.comparisons.groups)), 'Adoption decision must follow frozen per-seed groups and pending human review.');
  return true;
}

export async function runExperiments(core, protocolPath, notify = () => {}) {
  const protocolText = readFileSync(protocolPath, 'utf8'), protocol = JSON.parse(protocolText);
  check(protocol.version === 2 && protocol.status === 'frozen-before-execution', 'Use frozen protocol v2.');
  const protocolSha256 = sha256(protocolText), digest = sourceDigest(), evaluationVersion = evaluationDigest(), source = provenance();
  const fixtures = Object.fromEntries(Object.entries(protocol.captureExperiment.fixtureRecords).map(([name, record]) => {
    const text = readFileSync(resolve(ROOT, record.path), 'utf8'); check(sha256(text) === record.sha256, 'Frozen fixture hash mismatch.'); return [name, core.parseSave(text)];
  }));
  const adapter = instrumentEngine(), started = performance.now();
  const noopAdapter = verifyNoopAdapter(core, adapter, fixtures['full-roster-fixed']);
  const capture = { rawSamples: [], runs: [] };
  for (const fixtureName of ['fresh', 'full-roster-fixed']) for (const stage of [1, 2]) for (const interval of [null, 120, 600]) for (const variant of VARIANTS) {
    for (let seed = 1; seed <= 100; seed++) {
      const run = simulateCapture(core, adapter, fixtures[fixtureName], { variant, stage, interval, seed, fixtureName,
        fixtureSha256: protocol.captureExperiment.fixtureRecords[fixtureName].sha256, sourceDigest: digest, protocolSha256 });
      capture.rawSamples.push(...run.snapshots); delete run.snapshots; capture.runs.push(run);
      if (seed % 25 === 0) { notify(`capture ${fixtureName}/stage${stage}/${interval ?? 'none'}/${variant}: ${seed}/100`); await new Promise((done) => setImmediate(done)); }
    }
  }
  capture.scenarios = summarizeExperiments(capture.rawSamples); capture.comparisons = pairedComparisons(capture.rawSamples);
  const fever = { rawSamples: [] }, freshIdle = { rawSamples: [] };
  for (const pattern of ['uniform', 'burst']) for (let seed = 1; seed <= 100; seed++) {
    fever.rawSamples.push(simulateFever(core, fixtures.fresh, seed, pattern));
    if (seed % 25 === 0) { notify(`fever ${pattern}: ${seed}/100`); await new Promise((done) => setImmediate(done)); }
  }
  fever.summary = summarizeFever(fever.rawSamples);
  for (let seed = 1; seed <= 100; seed++) freshIdle.rawSamples.push(...simulateFreshIdle(core, fixtures.fresh, seed));
  freshIdle.scenarios = summarizeFreshIdle(freshIdle.rawSamples);
  const report = { version: 1, kind: 'v06-engine-experiments', mode: 'simulated', humanFun: 'PENDING', sourceDigest: digest, evaluationDigest: evaluationVersion, source,
    protocol, protocolText, protocolSha256, fixtureManifestSha256: protocol.fixtureManifestSha256,
    adapter: { originalSha256: adapter.originalSha256, instrumentedSha256: adapter.instrumentedSha256, harnessSha256: sha256(readFileSync(resolve(ROOT, '.harness/v5/loop/experiments.mjs'))) },
    noopAdapter, capture, fever, freshIdle,
    adoption: adoptionDecision(capture.comparisons.groups),
    timing: { modeledSecondsPerTrajectory: 1800, captureTrajectories: capture.runs.length, wallElapsedSeconds: (performance.now() - started) / 1000 },
    limitations: ['Injected production engine time; not real-time Electron or human play.', 'Pending sidecar is experimental; no production persistence/UI implementation or claim of those state-case gates. candidateLossOnReload remains PENDING.', 'soulDelaySeconds measures held capture release-unit dwell time, including accepted candidates and zero-payout parity; it is not unpaid soul amount multiplied by time.', 'Counterfactual 5-type attack sums omit attack periods, PvP verdict and companion attachment.', 'Same seeds do not imply identical later RNG draws after policy divergence.', 'Unresolved pending entries retained at final checkpoint; no forced final settlement.'] };
  check(sourceDigest() === digest && evaluationDigest() === evaluationVersion && provenance().sha256 === source.sha256 && sha256(readFileSync(protocolPath)) === protocolSha256, 'Source/build/protocol/evaluation changed during experiments.');
  validateExperiments(report);
  return report;
}

async function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { protocol: { type: 'string', default: 'docs/v0.6/EVALUATION_PROTOCOL.json' }, help: { type: 'boolean' } } });
  if (values.help) { console.log('Usage: node .harness/v5/loop/experiments.mjs OUTPUT.json [--protocol docs/v0.6/EVALUATION_PROTOCOL.json]\nRun npm run build first. Fixed 100-seed capture, fever and fresh-idle experiments; production capture default is unchanged.'); return; }
  check(positionals.length === 1, 'Supply one OUTPUT.json path.');
  const core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
  const report = await runExperiments(core, resolve(values.protocol), console.error);
  report.command = [process.execPath, '.harness/v5/loop/experiments.mjs', ...args];
  const output = resolve(positionals[0]); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(report)}\n`);
  console.log(JSON.stringify({ output, sha256: sha256(readFileSync(output)), captureSamples: report.capture.rawSamples.length, feverSamples: report.fever.rawSamples.length, adoption: report.adoption, wallElapsedSeconds: report.timing.wallElapsedSeconds }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2)).catch((error) => { console.error(error.stack ?? error); process.exitCode = 1; });
