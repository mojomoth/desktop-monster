#!/usr/bin/env node
// Production reducer, deterministic modeled time. No Electron, network or player data.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { CONFIG, PROTOCOL_PATH, validateProtocol } from './config.mjs';
import { ROOT, sourceDigest, evaluationDigest, sha256 } from './evidence.mjs';

const fail = (message) => { throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const integer = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
const decimal = (s) => typeof s === 'string' && /^(?:0|-?[1-9]\d*)$/.test(s);
const digest = (s) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const firstNames = ['firstKillSec', 'firstRewardSec', 'firstLevelSec', 'firstCaptureSec', 'firstReadySec', 'firstOpenSec', 'firstAcceptedSec'];
const contentKinds = ['eligibleHero', 'eligibleMonster', 'seenHero', 'seenMonster', 'chosenHero', 'killedMonster', 'capturedMonster'];
const bigintMetrics = ['heroDamage', 'companionDamage', 'partyPower'];
const numberMetrics = ['level', 'kills', 'coins', 'income', 'spent', 'companions', 'maxCompanionLevel', 'reincarnations',
  'training', 'offers', 'rerolls', 'managementActions', 'feverStarts', 'inputCount', 'longestKillGapSec',
  'longestMeaningfulGapSec', 'longestDiscoveryGapSec', 'lastUnlockSec', ...firstNames,
  ...contentKinds.map((kind) => `${kind}Count`)];

const registeredContentRules = (protocol) => Object.fromEntries(protocol.milestones.flatMap((milestone) =>
  milestone.ids.map((id) => [id, milestone.requirements])));

/** Only the official registration may authorize new candidate/validation seed execution. */
export function readMeasurementProtocol(path, phase) {
  if (phase !== 'baseline' && realpathSync(path) !== realpathSync(PROTOCOL_PATH)) fail('Candidate/release must use the official registered protocol path.');
  return JSON.parse(readFileSync(phase === 'baseline' ? path : PROTOCOL_PATH, 'utf8'));
}

/** Live execution/acceptance is stricter than historical, embedded-protocol comparisons. */
export function validateOfficialProtocolSnapshot(protocol, protocolSha256 = sha256(JSON.stringify(protocol))) {
  const official = JSON.parse(readFileSync(PROTOCOL_PATH, 'utf8'));
  if (sha256(JSON.stringify(protocol)) !== protocolSha256 || protocolSha256 !== sha256(JSON.stringify(official))) fail('Measurement snapshot differs from the current official registered protocol.');
}

/** Select a preregistered build, never change production behavior from the measurement CLI. */
export function selectExperiment(protocol, options, phase, seedSet) {
  const candidate = options.candidate, control = options.control;
  if (candidate !== undefined && control !== undefined) fail('--candidate and --control are mutually exclusive.');
  if (phase === 'baseline') {
    if (candidate !== undefined || control !== undefined) fail('Baseline does not select a candidate or control.');
    if (protocol.schemaVersion !== 1 || protocol.phase !== 'baseline') fail('Baseline requires its preserved schemaVersion 1 baseline protocol.');
    return null;
  }
  if (protocol.schemaVersion !== 2) fail('New candidate/release measurements require a schemaVersion 2 protocol.');
  if (protocol.experimentStage !== seedSet || !['exploration', 'validation'].includes(seedSet)) fail('Experiment stage must match the exploration or validation seed set.');
  if (phase === 'release' && seedSet !== 'validation') fail('Release requires the frozen validation experiment.');
  const selected = candidate !== undefined ? { kind: 'candidate', id: candidate }
    : control !== undefined ? { kind: 'control', id: control } : protocol.experimentStage === 'validation' ? protocol.selectedExperiment : null;
  if (!selected || !['candidate', 'control'].includes(selected.kind) || typeof selected.id !== 'string' || !selected.id) fail('Exploration requires an explicit --candidate ID or --control ID; validation requires a frozen selection.');
  const entry = protocol[selected.kind === 'candidate' ? 'candidates' : 'controls'].find((entry) => entry.id === selected.id);
  if (!entry) fail('Experiment ID is not registered in this protocol.');
  if (seedSet === 'validation' && !isDeepStrictEqual(selected, protocol.selectedExperiment)) fail('Validation/release may only measure the frozen selected experiment.');
  return { ...selected, parametersSha256: sha256(JSON.stringify(entry.parameters)),
    contentRulesSha256: sha256(JSON.stringify(registeredContentRules(protocol))) };
}

/** The build must export the values consumed by its actual formulas and content selectors. */
export function validateProductionExperiment(core, protocol, experiment) {
  const entry = protocol[experiment.kind === 'candidate' ? 'candidates' : 'controls'].find((entry) => entry.id === experiment.id);
  if (!entry || !isDeepStrictEqual(core.PROGRESSION_PARAMETERS, entry.parameters)) fail('Production PROGRESSION_PARAMETERS differ from the registered experiment.');
  const rules = registeredContentRules(protocol);
  const production = Object.fromEntries(Object.keys(rules).map((id) => [id,
    core.PROGRESSION_CONTENT_RULES && Object.hasOwn(core.PROGRESSION_CONTENT_RULES, id) ? core.PROGRESSION_CONTENT_RULES[id] : undefined]));
  if (!isDeepStrictEqual(production, rules)) fail('Production PROGRESSION_CONTENT_RULES differ from the registered milestones.');
}

function validateExperimentEvidence(report) {
  if (report.protocol.schemaVersion !== 2) return;
  const selected = report.experiment;
  if (!selected || !['candidate', 'control'].includes(selected.kind)) fail('Missing experiment identity.');
  const expected = selectExperiment(report.protocol, { [selected.kind]: selected.id }, report.phase, report.seedSet);
  if (!isDeepStrictEqual(selected, expected)) fail('Experiment identity or parameter/content fingerprint mismatch.');
}

/** Conditional quantiles are accompanied by their full, uncensored denominator. */
export function distribution(values) {
  if (!Array.isArray(values) || values.some((v) => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) fail('Non-finite measured value.');
  const sorted = values.filter((v) => v !== null).sort((a, b) => a - b);
  const at = (q) => sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : null;
  return { samples: values.length, reached: sorted.length, unreached: values.length - sorted.length,
    p10: at(.1), p50: at(.5), p90: at(.9), min: at(0), max: at(1) };
}

export function bigintDistribution(values) {
  if (values.some((v) => !decimal(v))) fail('Invalid exact bigint.');
  const sorted = [...values].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0);
  const at = (q) => sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : null;
  return { samples: values.length, p10: at(.1), p50: at(.5), p90: at(.9), min: at(0), max: at(1) };
}

/** Non-reachers sort after reached times: never pass a median using survivors only. */
export function populationQuantile(values, q) {
  distribution(values);
  const sorted = [...values].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  return sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : null;
}

function validatePolicy(policy, settings) {
  for (const [field, allowed] of [['profile', settings.profiles], ['policy', settings.policies],
    ['inputSchedule', settings.inputSchedules], ['management', settings.managementPolicies], ['menuVisitSeconds', settings.menuVisitSeconds]]) {
    if (!allowed.includes(policy[field])) fail(`Unknown ${field}: ${String(policy[field])}`);
  }
  return policy;
}
const policyKey = (p) => [p.profile, p.policy, p.inputSchedule, p.management, p.menuVisitSeconds].join('/');

function validateSettings(settings) {
  if (!integer(settings.tickMs, 1, 100) || 1000 % settings.tickMs !== 0 ||
    !integer(settings.observationMs, settings.tickMs) || settings.observationMs % settings.tickMs !== 0) fail('Invalid measurement clock.');
  const cps = settings.checkpointsMinutes;
  if (!Array.isArray(cps) || !cps.length || cps.some((m, i) => !integer(m, 1, 720) || i > 0 && m <= cps[i - 1])) fail('Checkpoints must increase within 1..720 minutes.');
}

export function observationSettings(settings, screening = false) {
  if (!screening) return settings;
  if (!integer(settings.explorationHorizonMinutes, 1, settings.checkpointsMinutes.at(-1))) fail('Invalid exploration horizon.');
  return { ...settings, checkpointsMinutes: settings.checkpointsMinutes.filter((m) => m <= settings.explorationHorizonMinutes) };
}

const emptyFirst = () => Object.fromEntries(firstNames.map((name) => [name, null]));
const mapOf = (records, kind, sec = Infinity) => Object.fromEntries(records.filter((r) => r.kind === kind && r.sec <= sec).map((r) => [r.id, r.sec]));
function firstFromRecords(records, sec = Infinity) {
  const first = emptyFirst();
  for (const r of records) if (r.sec <= sec && firstNames.includes(r.kind)) first[r.kind] = r.sec;
  return first;
}
function unlockTime(records, milestones, sec = Infinity) {
  const finals = milestones.filter((m) => m.final);
  if (!finals.length) return null;
  const times = finals.flatMap((m) => {
    const eligible = mapOf(records, m.kind === 'hero' ? 'eligibleHero' : 'eligibleMonster', sec);
    return m.ids.map((id) => eligible[id] ?? null);
  });
  return times.includes(null) ? null : Math.max(...times);
}

/** Read general-hero eligibility from the production save validator, never duplicate its rank formula. */
export function eligibleContent(core, state, cache = {}) {
  if (core.eligibleHeroIds && core.eligibleMonsterIds) return { heroes: core.eligibleHeroIds(state), monsters: core.eligibleMonsterIds(state) };
  const context = core.discoveryContext(state, core.heroForm(state.hero?.equipped.formId ?? '')?.type);
  const hero = state.hero ?? core.newHeroProgress();
  const cacheKey = hero.reincarnations;
  if (cache.key !== cacheKey) {
    cache.key = cacheKey;
    cache.standard = core.STANDARD_HERO_FORMS.filter((form) => {
      const others = core.STANDARD_HERO_FORMS.filter((f) => f.rank === 1 && f.type !== form.type)
        .filter((f, i, all) => all.findIndex((x) => x.type === f.type) === i).slice(0, 2);
      if (others.length !== 2) fail('Production eligibility adapter needs two distinct introductory hero elements.');
      const choices = [form, ...others].map((f) => ({ formId: f.id, buffPercent: core.HERO_BUFF_MIN }));
      const parsed = core.parseHeroProgress({ ...hero, choices, deferRemainingMs: 0, restRemainingMs: 0 }, context);
      return parsed?.choices.some((c) => c.formId === form.id);
    }).map((f) => f.id);
  }
  // v0.7 can expose the same production selectors used by spawning/offers. The v0.6 adapter is explicit in evidence.
  const heroes = core.eligibleHeroIds ? core.eligibleHeroIds(state) : [...cache.standard,
    ...core.RARE_HERO_FORMS.filter((f) => core.requirementsMet(f.requirements, context)).map((f) => f.id)];
  const monsters = core.eligibleMonsterIds ? core.eligibleMonsterIds(state) : [...core.COMMON_SPECIES_IDS,
    ...core.RARE_MONSTERS.filter((f) => core.requirementsMet(f.requirements, context)).map((f) => f.id)];
  return { heroes, monsters };
}

function manage(core, engine, mode) {
  const state = engine.getState();
  const cs = [...state.companions].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  let action;
  if (mode === 'consume-weakest' && cs.length >= 2) {
    cs.sort((a, b) => core.companionPower(a) < core.companionPower(b) ? -1 : core.companionPower(a) > core.companionPower(b) ? 1 : a.id.localeCompare(b.id, 'en'));
    action = { type: 'consume', targetId: cs.at(-1).id, foodId: cs[0].id };
  } else if (mode === 'fuse-first') {
    for (let i = 0; i < cs.length && !action; i++) {
      const other = cs.slice(i + 1).find((c) => c.speciesId === cs[i].speciesId && c.stars === cs[i].stars);
      if (other) action = { type: 'fuse', aId: cs[i].id, bId: other.id };
    }
  } else if (mode === 'reincarnate-first') {
    const c = cs.find((c) => !('error' in core.applyCollection(state, { type: 'reincarnate', id: c.id })));
    if (c) action = { type: 'reincarnate', id: c.id };
    else return manage(core, engine, 'consume-weakest');
  }
  if (!action || 'error' in core.applyCollection(state, action)) return null;
  const events = engine.apply(action);
  return { action, events };
}

function inputDue(ms, policy) {
  if (policy.profile === 'pure-idle') return false;
  const minuteMs = (ms - 1) % 60_000;
  const active = ms <= 120_000 || policy.profile === 'active' || policy.profile === 'intermittent' && minuteMs < 15_000;
  if (!active) return false;
  if (policy.inputSchedule === 'uniform') return ms % 500 === 0;
  // Six 20-input bursts/minute. Intermittent's second burst is 10 hits: 30 inputs per 15s active window.
  const hits = policy.profile === 'intermittent' && ms > 120_000 && minuteMs >= 10_000 ? 10 : 20;
  return (ms - 1) % 10_000 < hits * 100 && ms % 100 === 0;
}

// Historical v7 reports use safe numeric metrics. v10's separate evaluator uses decimals.
const legacyGoldMetric = value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || BigInt(number) !== BigInt(value)) fail('Gold exceeds legacy report representation; use v10 evaluator.');
  return number;
};

export function simulate(core, policy, seed, options = {}) {
  const settings = options.settings ?? CONFIG.measurement;
  validateSettings(settings); validatePolicy(policy, settings);
  if (!integer(seed, 0, 0xffffffff)) fail('Seed must be uint32.');
  const milestones = options.milestones ?? [];
  const fixture = options.fixture ?? null;
  const engine = core.createEngine(fixture, core.mulberry32(seed));
  const start = engine.getState();
  const initial = { coins: legacyGoldMetric(start.coins), goldSpent: legacyGoldMetric(start.progress?.goldSpent ?? 0), kills: start.killCount,
    reincarnations: start.hero?.reincarnations ?? 0, playTimeSec: (start.progress?.playTimeMs ?? 0) / 1000 };
  const records = [], checkpoints = [], actions = [];
  const recorded = new Set(), eligibilityCache = {};
  let ms = 0, income = 0, heroDamage = 0n, companionDamage = 0n, inputCount = 0, offers = 0, rerolls = 0, managementActions = 0, feverStarts = 0;
  let lastKill = 0, lastMeaningful = 0, lastDiscovery = 0, killGap = 0, meaningfulGap = 0, discoveryGap = 0;
  let readyState = start, readyAt = 0, currentLevel = start.level;
  const refresh = () => { readyState = engine.getState(); readyAt = ms; currentLevel = readyState.level; return readyState; };
  const meaningful = () => { meaningfulGap = Math.max(meaningfulGap, ms - lastMeaningful); lastMeaningful = ms; };
  const record = (kind, id = '') => {
    const key = `${kind}/${id}`;
    if (recorded.has(key)) return;
    recorded.add(key); records.push({ kind, id, sec: ms / 1000 });
    if (kind === 'seenHero' || kind === 'seenMonster') {
      discoveryGap = Math.max(discoveryGap, ms - lastDiscovery); lastDiscovery = ms; meaningful();
    }
  };
  const observe = (events) => {
    let eligibilityChanged = false;
    for (const event of events) {
      if (event.type === 'attack') heroDamage += event.damage;
      if (event.type === 'companionAttack') companionDamage += event.damage;
      if (event.type === 'feverStart') feverStarts++;
      if (event.type === 'itemDropped') {
        record('firstRewardSec');
        income += event.drops.reduce((sum, drop) => sum + (drop.item.kind === 'coin' ? drop.amount : 0), 0);
      }
      if (event.type === 'monsterKilled') {
        eligibilityChanged = true;
        record('firstKillSec'); record('killedMonster', event.monster.speciesId);
        killGap = Math.max(killGap, ms - lastKill); lastKill = ms;
      }
      if (event.type === 'levelUp') { eligibilityChanged = true; currentLevel = event.newLevel; record('firstLevelSec'); meaningful(); }
      if (event.type === 'bossCaptured') { eligibilityChanged = true; record('firstCaptureSec'); record('capturedMonster', event.companion.speciesId); meaningful(); }
      if (event.type === 'heroReady') eligibilityChanged = true;
      if (event.type === 'monsterSpawned') record('seenMonster', event.monster.speciesId);
    }
    // Observe the production state before the next action can reset its level or consume its roster.
    if (eligibilityChanged) content(engine.getState());
  };
  const ready = () => {
    const hero = readyState.hero && { ...readyState.hero,
      restRemainingMs: Math.max(0, (readyState.hero.restRemainingMs ?? 0) - (ms - readyAt)),
      deferRemainingMs: Math.max(0, (readyState.hero.deferRemainingMs ?? 0) - (ms - readyAt)) };
    return core.heroReady(currentLevel, hero);
  };
  const content = (state) => {
    const eligible = eligibleContent(core, state, eligibilityCache);
    for (const id of eligible.heroes) record('eligibleHero', id);
    for (const id of eligible.monsters) record('eligibleMonster', id);
    for (const id of state.progress?.seenHeroes ?? []) record('seenHero', id);
    for (const id of state.progress?.seenMonsters ?? []) record('seenMonster', id);
    for (const hero of state.hero?.collection ?? []) record('chosenHero', hero.formId);
  };
  content(start);
  if (ready()) record('firstReadySec');
  const end = settings.checkpointsMinutes.at(-1) * 60_000;
  for (ms = settings.tickMs; ms <= end; ms += settings.tickMs) {
    observe(engine.tick(settings.tickMs));
    if (inputDue(ms, policy)) { observe(engine.attack('keyboard')); inputCount++; }
    const isReady = ready();
    if (isReady) record('firstReadySec');
    const visit = policy.menuVisitSeconds === 0 || ms % (policy.menuVisitSeconds * 1000) === 0;
    if (visit && isReady) {
      let state = refresh();
      content(state);
      if (!state.hero?.choices.length) { observe(engine.apply({ type: 'heroOffer' })); state = refresh(); }
      if (state.hero?.choices.length === 3) {
        record('firstOpenSec'); offers++;
        for (const choice of state.hero.choices) record('seenHero', choice.formId);
        if (policy.policy === 'reroll') {
          content(state);
          const before = state.hero.offerSerial;
          observe(engine.apply({ type: 'heroReroll', offerSerial: before })); state = refresh();
          if (state.hero.offerSerial !== before) rerolls++;
          for (const choice of state.hero.choices) record('seenHero', choice.formId);
        }
        const before = state.hero.reincarnations, choice = state.hero.choices[0], level = state.level;
        content(state);
        observe(engine.apply({ type: 'heroChoose', formId: choice.formId, offerSerial: state.hero.offerSerial }));
        state = refresh();
        if (state.hero.reincarnations !== before + 1) fail('Production hero choice did not complete.');
        record('firstAcceptedSec'); record('chosenHero', choice.formId); meaningful();
        actions.push({ type: 'heroChoose', sec: ms / 1000, formId: choice.formId, level });
        content(state);
      }
    }
    if (ms % settings.observationMs !== 0) continue;
    if (visit && policy.management !== 'none') {
      content(engine.getState());
      const result = manage(core, engine, policy.management);
      if (result) { observe(result.events); managementActions++; actions.push({ ...result.action, sec: ms / 1000 }); }
    }
    if (visit && ['training', 'lure'].includes(policy.policy)) {
      const state = engine.getState();
      content(state);
      observe(engine.apply({ type: 'shopBuy', item: policy.policy, shopSerial: state.progress.shopSerial }));
    }
    const state = refresh(); content(state);
    const spent = legacyGoldMetric(state.progress.goldSpent) - initial.goldSpent;
    const coins = legacyGoldMetric(state.coins);
    if (!integer(income) || !integer(spent) || !integer(coins) || initial.coins + income - spent !== coins) fail('Gold conservation failed.');
    if (!settings.checkpointsMinutes.includes(ms / 60_000)) continue;
    const sec = ms / 1000;
    checkpoints.push({ minutes: ms / 60_000, level: state.level, kills: state.killCount - initial.kills,
      coins, income, spent, companions: state.companions.length,
      maxCompanionLevel: Math.max(0, ...state.companions.map((c) => c.level)),
      reincarnations: (state.hero?.reincarnations ?? 0) - initial.reincarnations, training: state.progress.trainingLevel,
      offers, rerolls, managementActions, feverStarts, inputCount, heroDamage: String(heroDamage), companionDamage: String(companionDamage),
      partyPower: String(core.activeCompanions(state.companions, state.monster.type, state.hero?.equipped)
        .reduce((sum, c) => sum + core.companionPower(c), 0n)),
      longestKillGapSec: Math.max(killGap, ms - lastKill) / 1000,
      longestMeaningfulGapSec: Math.max(meaningfulGap, ms - lastMeaningful) / 1000,
      longestDiscoveryGapSec: Math.max(discoveryGap, ms - lastDiscovery) / 1000,
      ...firstFromRecords(records), lastUnlockSec: unlockTime(records, milestones),
      ...Object.fromEntries(contentKinds.map((kind) => [`${kind}Count`, Object.keys(mapOf(records, kind, sec)).length])) });
  }
  return { policy, seed, initial, records, actions, checkpoints };
}

export function summarize(runs) {
  const groups = new Map();
  for (const run of runs) for (const row of run.checkpoints) {
    const key = `${policyKey(run.policy)}/${row.minutes}`;
    const group = groups.get(key) ?? { policy: run.policy, minutes: row.minutes, rows: [] };
    group.rows.push(row); groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => `${policyKey(a.policy)}/${a.minutes}`.localeCompare(`${policyKey(b.policy)}/${b.minutes}`, 'en'))
    .map(({ policy, minutes, rows }) => ({ policy, minutes, samples: rows.length,
      metrics: { ...Object.fromEntries(numberMetrics.map((metric) => [metric, distribution(rows.map((r) => r[metric]))])),
        ...Object.fromEntries(bigintMetrics.map((metric) => [metric, bigintDistribution(rows.map((r) => r[metric]))])) } }));
}

export function evaluateTargets(runs, settings, milestones, screening = false) {
  const canonical = runs.filter((r) => same(r.policy, settings.baseline));
  if (!canonical.length) return { status: 'NOT_EVALUATED', passed: null, samples: 0, checks: [],
    method: 'This experiment contains no canonical continuous-active free-policy run; no v0.7 target claim is made.' };
  const times = canonical.map((r) => r.checkpoints.at(-1).firstAcceptedSec);
  const target = settings.targets.firstReincarnation;
  const median = populationQuantile(times, .5);
  const reachedBeforeDeadline = times.filter((t) => t !== null && t <= target.deadlineSec).length;
  const finalTimes = canonical.map((r) => unlockTime(r.records, milestones));
  const lastMedian = populationQuantile(finalTimes, .5), last = settings.targets.lastUnlock;
  const checks = [
    { id: 'first-reincarnation-median', passed: median !== null && median >= target.medianMinSec && median <= target.medianMaxSec,
      observedSec: median, minSec: target.medianMinSec, maxSec: target.medianMaxSec },
    { id: 'first-reincarnation-deadline', passed: times.length > 0 && reachedBeforeDeadline / times.length >= target.minimumReachedFraction,
      reached: reachedBeforeDeadline, samples: times.length, deadlineSec: target.deadlineSec, minimumFraction: target.minimumReachedFraction },
    { id: 'last-unlock-median', passed: milestones.some((m) => m.final) && lastMedian !== null && lastMedian >= last.medianMinSec && lastMedian <= last.medianMaxSec,
      observedSec: lastMedian, minSec: last.medianMinSec, maxSec: last.medianMaxSec, registered: milestones.some((m) => m.final) },
  ];
  if (screening) checks.pop();
  return { status: checks.every((c) => c.passed) ? 'PASS' : 'FAIL', passed: checks.every((c) => c.passed), samples: canonical.length, checks,
    skipped: screening ? ['last-unlock-median: NOT_EVALUATED in 120-minute exploration screening'] : [],
    method: 'Population median sorts unreached after all observed times; deadline fraction always divides by all samples.' };
}

function validateMilestones(milestones, catalog) {
  if (!Array.isArray(milestones)) fail('Missing milestone registry.');
  const seen = new Set();
  for (const m of milestones) {
    if (!m || typeof m.id !== 'string' || !m.id || seen.has(m.id) || typeof m.label !== 'string' || !['hero', 'monster'].includes(m.kind) ||
      typeof m.final !== 'boolean' || !Array.isArray(m.ids) || !m.ids.length || new Set(m.ids).size !== m.ids.length ||
      m.ids.some((id) => !catalog[m.kind].includes(id))) fail('Invalid milestone registry.');
    seen.add(m.id);
  }
}

export function validateRun(run, settings, milestones, catalog) {
  validatePolicy(run.policy, settings);
  if (!integer(run.seed, 0, 0xffffffff) || !run.initial || Object.values(run.initial).some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) fail('Invalid raw run.');
  if (!Array.isArray(run.records) || !Array.isArray(run.actions) || !Array.isArray(run.checkpoints) ||
    !same(run.checkpoints.map((r) => r.minutes), settings.checkpointsMinutes)) fail('Missing or duplicate checkpoints.');
  let actionSec = -1;
  for (const action of run.actions) {
    if (!['heroChoose', 'consume', 'fuse', 'reincarnate'].includes(action.type) || typeof action.sec !== 'number' || !Number.isFinite(action.sec) ||
      action.sec < actionSec || action.sec < 0 || action.sec > settings.checkpointsMinutes.at(-1) * 60 ||
      action.type === 'heroChoose' && (!catalog.hero.includes(action.formId) || !integer(action.level, 1))) fail('Invalid action ledger.');
    actionSec = action.sec;
  }
  const seen = new Set(); let previousSec = -1;
  for (const r of run.records) {
    const key = `${r.kind}/${r.id}`;
    if (![...firstNames, ...contentKinds].includes(r.kind) || seen.has(key) || typeof r.sec !== 'number' || !Number.isFinite(r.sec) ||
      r.sec < previousSec || r.sec > settings.checkpointsMinutes.at(-1) * 60 || r.sec < 0 ||
      firstNames.includes(r.kind) && r.id !== '' || contentKinds.includes(r.kind) && !catalog[r.kind.endsWith('Hero') ? 'hero' : 'monster'].includes(r.id)) fail('Invalid, duplicate or out-of-order first record.');
    seen.add(key); previousSec = r.sec;
  }
  let previous = null;
  for (const row of run.checkpoints) {
    const sec = row.minutes * 60;
    for (const metric of numberMetrics) {
      const nullable = firstNames.includes(metric) || metric === 'lastUnlockSec';
      if (!(nullable && row[metric] === null) && (typeof row[metric] !== 'number' || !Number.isFinite(row[metric]) || row[metric] < 0)) fail(`Invalid ${metric}.`);
    }
    for (const metric of ['level', 'kills', 'coins', 'income', 'spent', 'companions', 'maxCompanionLevel', 'reincarnations', 'training', 'offers', 'rerolls', 'managementActions', 'feverStarts', 'inputCount']) {
      if (!integer(row[metric], metric === 'level' ? 1 : 0)) fail('Invalid integer checkpoint.');
    }
    for (const metric of bigintMetrics) if (!decimal(row[metric]) || BigInt(row[metric]) < 0n) fail('Invalid bigint checkpoint.');
    if (run.initial.coins + row.income - row.spent !== row.coins) fail('Gold conservation failed.');
    const first = firstFromRecords(run.records, sec);
    if (firstNames.some((name) => first[name] !== row[name]) || row.lastUnlockSec !== unlockTime(run.records, milestones, sec)) fail('First records or milestone timing disagree.');
    if (first.firstOpenSec !== null && (first.firstReadySec === null || first.firstOpenSec < first.firstReadySec) ||
      first.firstAcceptedSec !== null && (first.firstOpenSec === null || first.firstAcceptedSec < first.firstOpenSec)) fail('Invalid readiness/open/accept order.');
    for (const kind of contentKinds) if (row[`${kind}Count`] !== Object.keys(mapOf(run.records, kind, sec)).length) fail('Content count disagrees with first records.');
    const accepted = run.actions.filter((a) => a.type === 'heroChoose' && a.sec <= sec);
    if (row.reincarnations !== accepted.length || row.offers !== accepted.length || row.rerolls > row.offers ||
      (accepted[0]?.sec ?? null) !== row.firstAcceptedSec) fail('Reincarnation action ledger mismatch.');
    if (row.managementActions !== run.actions.filter((a) => a.type !== 'heroChoose' && a.sec <= sec).length) fail('Management action ledger mismatch.');
    for (const metric of ['longestKillGapSec', 'longestMeaningfulGapSec', 'longestDiscoveryGapSec']) if (row[metric] > sec) fail('Gap exceeds observation duration.');
    if (previous) {
      for (const key of ['kills', 'income', 'spent', 'inputCount', 'reincarnations', 'offers', 'feverStarts']) if (row[key] < previous[key]) fail('Cumulative counter decreased.');
      for (const key of ['heroDamage', 'companionDamage']) if (BigInt(row[key]) < BigInt(previous[key])) fail('Cumulative damage decreased.');
    }
    previous = row;
  }
  return run;
}

export function validateMeasurement(report, expectedSourceDigest, expectedEvaluationDigest) {
  if (report?.version !== 7 || report.kind !== 'simulated-engine-measurement' || !CONFIG.phases.includes(report.phase) || report.phase === 'setup' ||
    report.rawComplete !== true || !digest(report.sourceDigest) || !digest(report.evaluationDigest) || !digest(report.fixtureSha256) ||
    expectedSourceDigest !== undefined && report.sourceDigest !== expectedSourceDigest || expectedEvaluationDigest !== undefined && report.evaluationDigest !== expectedEvaluationDigest) fail('Invalid or stale measurement provenance.');
  validateSettings(report.settings);
  if (report.screening && (report.phase !== 'candidate' || report.seedSet !== 'exploration')) fail('Screening requires candidate phase and exploration seeds.');
  const observedSettings = observationSettings(report.settings, report.screening === true);
  if (!same(report.checkpointsMinutes, observedSettings.checkpointsMinutes)) fail('Declared observation horizon disagrees with the frozen mode.');
  validateProtocol(report.protocol, report.phase !== 'baseline');
  validateExperimentEvidence(report);
  if (!same(report.settings, CONFIG.measurement)) fail('Measurement settings differ from frozen configuration.');
  if (sha256(JSON.stringify(report.protocol)) !== report.protocolSha256 || sha256(JSON.stringify(report.runs)) !== report.rawSha256 ||
    sha256(JSON.stringify(report.fixture)) !== report.fixtureSha256 || report.fixture !== null) fail('Measurement content fingerprint mismatch or non-fresh canonical fixture.');
  if (!report.build || !digest(report.build.sha256) || sha256(JSON.stringify(report.build.files)) !== report.build.sha256 ||
    !Object.keys(report.build.files ?? {}).length || Object.values(report.build.files).some((hash) => !digest(hash))) fail('Invalid compiled build provenance.');
  if (!report.catalog || !['hero', 'monster'].every((kind) => Array.isArray(report.catalog[kind]) && report.catalog[kind].length > 0 && new Set(report.catalog[kind]).size === report.catalog[kind].length)) fail('Invalid content catalog.');
  const milestones = report.protocol.milestones;
  validateMilestones(milestones, report.catalog);
  if (report.phase !== 'baseline' && !milestones.some((m) => m.final)) fail('Candidate measurement requires final unlock milestones.');
  const declared = report.settings.seeds[report.seedSet];
  if (!declared || !same(report.seeds, declared) || !Array.isArray(report.policies) || report.policies.length < 1 ||
    new Set(report.policies.map(policyKey)).size !== report.policies.length) fail('Invalid seed or policy registry.');
  if (report.phase === 'baseline' && report.seedSet !== 'baseline' || report.phase === 'release' && report.seedSet !== 'validation') fail('Phase uses an invalid seed set.');
  if (report.phase === 'release' && !same(report.policies, report.settings.validationPolicies)) fail('Release requires the full registered validation policy suite.');
  const expected = new Set(report.policies.flatMap((p) => Array.from({ length: declared.count }, (_, i) => `${policyKey(p)}/${declared.start + i}`)));
  if (!Array.isArray(report.runs)) fail('Missing raw runs.');
  for (const run of report.runs) {
    const key = `${policyKey(run.policy)}/${run.seed}`;
    if (!expected.delete(key)) fail('Duplicate or unexpected seed/policy run.');
    validateRun(run, observedSettings, milestones, report.catalog);
    if (Object.values(run.initial).some((n) => n !== 0)) fail('Canonical fresh fixture has nonzero initial progress.');
  }
  if (expected.size) fail('Missing seed/policy runs.');
  if (!same(report.scenarios, summarize(report.runs))) fail('Summary differs from raw runs.');
  if (!same(report.targets, evaluateTargets(report.runs, report.settings, milestones, report.screening === true))) fail('Target verdict differs from raw runs.');
  return report;
}

/** Task acceptance is stricter than structurally valid evidence for an exploratory experiment. */
export function validateMeasurementPhase(report, phase, expectedSourceDigest, expectedEvaluationDigest) {
  if (!['baseline', 'candidate', 'release'].includes(phase)) fail('Unknown measurement acceptance phase.');
  validateMeasurement(report, expectedSourceDigest, expectedEvaluationDigest);
  if (report.phase !== phase) fail(`Expected ${phase} measurement, received ${report.phase}.`);
  if (report.screening || !same(report.checkpointsMinutes, CONFIG.measurement.checkpointsMinutes)) fail('Phase acceptance requires the full 12-hour observation horizon.');
  if (phase === 'baseline') {
    if (report.seedSet !== 'baseline' || !same(report.seeds, CONFIG.measurement.seeds.baseline) ||
      !same(report.policies, [CONFIG.measurement.baseline])) fail('Baseline acceptance requires exactly the canonical baseline policy and baseline seed set.');
  } else {
    if (report.seedSet !== 'validation' || !same(report.seeds, CONFIG.measurement.seeds.validation)) fail('Candidate/release acceptance requires the full validation seed set.');
    if (!report.policies.some((policy) => same(policy, CONFIG.measurement.baseline))) fail('Candidate/release acceptance requires the canonical baseline policy.');
    if (phase === 'release' && !same(report.policies, CONFIG.measurement.validationPolicies)) fail('Release acceptance requires the full registered validation policy suite.');
    if (report.targets.passed !== true) fail('Candidate/release acceptance requires every registered target to pass.');
  }
  return report;
}

export function compareMeasurements(before, after) {
  validateMeasurement(before); validateMeasurement(after);
  if (before.fixtureSha256 !== after.fixtureSha256 ||
    !same(before.settings, after.settings) || !same(before.checkpointsMinutes, after.checkpointsMinutes) ||
    !same(before.seeds, after.seeds) || !same(before.policies, after.policies)) fail('Comparison requires identical settings, horizon, fixture, seeds and policies.');
  const comparableMilestones = same(before.protocol.milestones, after.protocol.milestones);
  const previous = new Map(before.runs.map((r) => [`${policyKey(r.policy)}/${r.seed}`, r]));
  const deltas = after.runs.map((run) => {
    const base = previous.get(`${policyKey(run.policy)}/${run.seed}`);
    return { policy: run.policy, seed: run.seed, checkpoints: run.checkpoints.map((row, i) => ({ minutes: row.minutes,
      ...Object.fromEntries(numberMetrics.map((key) => [key, row[key] === null || base.checkpoints[i][key] === null || key === 'lastUnlockSec' && !comparableMilestones ? null : row[key] - base.checkpoints[i][key]])),
      ...Object.fromEntries(bigintMetrics.map((key) => [key, String(BigInt(row[key]) - BigInt(base.checkpoints[i][key]))])) })) };
  });
  return { version: 7, kind: 'paired-measurement-comparison', beforeSourceDigest: before.sourceDigest, afterSourceDigest: after.sourceDigest,
    beforeProtocolSha256: before.protocolSha256, afterProtocolSha256: after.protocolSha256, comparableMilestones, rawDeltas: deltas, scenarios: summarize(deltas),
    ...(before.experiment ? { beforeExperiment: before.experiment } : {}), ...(after.experiment ? { afterExperiment: after.experiment } : {}),
    method: 'Subtract the same seed/policy/checkpoint before aggregating. Source versions may differ; null pairs remain censored.' };
}

function writeAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`); renameSync(temporary, path);
}

/** Build is run by the host, with source stability checked before loading production modules. */
function buildProduction() {
  const source = sourceDigest();
  const result = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) fail(`Production build failed: ${result.stderr || result.stdout || result.error}`);
  if (sourceDigest() !== source) fail('Source changed during production build.');
  const files = readdirSync(resolve(ROOT, 'src/core'), { recursive: true }).filter((n) => n.endsWith('.ts')).sort();
  const hashes = {};
  for (const name of files) {
    const src = resolve(ROOT, 'src/core', name), built = resolve(ROOT, 'dist/electron/core', name.replace(/\.ts$/, '.js'));
    if (statSync(built).mtimeMs < statSync(src).mtimeMs) fail('Production build is stale.');
    hashes[relative(ROOT, built)] = sha256(readFileSync(built));
  }
  return { sourceDigest: source, build: { command: 'npm run build', files: hashes, sha256: sha256(JSON.stringify(hashes)) } };
}

function verifyBuild(build) {
  const files = Object.fromEntries(Object.keys(build.files).map((name) => [name, sha256(readFileSync(resolve(ROOT, name)))]));
  if (sha256(JSON.stringify(files)) !== build.sha256) fail('Compiled production build changed during measurement.');
}

/** Each worker processes one seed at a time. Only the host writes evidence. */
export function workerSimulation(worker, task) {
  return new Promise((resolveTask, rejectTask) => {
    const clear = () => { worker.off('message', message); worker.off('error', error); worker.off('exit', exited); };
    const message = (result) => { clear(); if (result.ok) resolveTask(result.run); else rejectTask(new Error(result.error)); };
    const error = (cause) => { clear(); rejectTask(cause); };
    const exited = (code) => { clear(); rejectTask(new Error(`Measurement worker exited before completing a seed (${code}).`)); };
    worker.once('message', message); worker.once('error', error); worker.once('exit', exited);
    worker.postMessage(task);
  });
}

async function runCommand(output, values) {
  const settings = CONFIG.measurement;
  const phase = values.phase ?? 'baseline';
  if (!['baseline', 'candidate', 'release'].includes(phase)) fail('Unknown phase.');
  const screening = values.screening === true;
  const workers = values.workers === undefined ? 1 : Number(values.workers);
  if (!integer(workers, 1, 4)) fail('--workers must be an integer from 1 to 4.');
  const seedSet = values['seed-set'] ?? (screening ? 'exploration' : phase === 'baseline' ? 'baseline' : 'validation');
  if (screening && (phase !== 'candidate' || seedSet !== 'exploration')) fail('--screening requires --phase candidate and exploration seeds.');
  const observedSettings = observationSettings(settings, screening);
  const seeds = settings.seeds[seedSet];
  if (!seeds || values.seed !== undefined && Number(values.seed) !== seeds.start || values.seeds !== undefined && Number(values.seeds) !== seeds.count) fail('CLI seeds must match a frozen seed set.');
  const policy = validatePolicy({ profile: values.profile ?? settings.baseline.profile, policy: values.policy ?? settings.baseline.policy,
    inputSchedule: values['input-schedule'] ?? settings.baseline.inputSchedule, management: values.management ?? settings.baseline.management,
    menuVisitSeconds: values['menu-visit-seconds'] === undefined ? settings.baseline.menuVisitSeconds : Number(values['menu-visit-seconds']) }, settings);
  const policies = values.suite ? settings.validationPolicies : [policy];
  policies.forEach((p) => validatePolicy(p, settings));
  if (phase === 'release' && !values.suite) fail('Release measurement requires --suite.');
  const protocolPath = resolve(values.protocol ?? PROTOCOL_PATH);
  const protocol = readMeasurementProtocol(protocolPath, phase);
  validateProtocol(protocol, phase !== 'baseline');
  if (phase !== 'baseline') validateOfficialProtocolSnapshot(protocol);
  if (Date.parse(protocol.frozenAt) > Date.now()) fail('Protocol must be frozen before measurement starts.');
  const experiment = selectExperiment(protocol, values, phase, seedSet);
  const fixture = values.fixture ? JSON.parse(readFileSync(resolve(values.fixture), 'utf8')) : null;
  if (fixture !== null) fail('Canonical measurement requires the registered fresh fixture (null).');
  if (existsSync(output)) {
    const report = JSON.parse(readFileSync(output, 'utf8'));
    if (phase !== 'baseline') validateOfficialProtocolSnapshot(report.protocol, report.protocolSha256);
    validateMeasurement(report, sourceDigest(), evaluationDigest());
    if (report.phase !== phase || report.seedSet !== seedSet || report.screening !== screening || !same(report.policies, policies) || report.protocolSha256 !== sha256(JSON.stringify(protocol)) ||
      !isDeepStrictEqual(report.experiment ?? null, experiment)) fail('Existing completed output belongs to another run; choose a new output path.');
    verifyBuild(report.build);
    if (experiment) validateProductionExperiment(await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href), protocol, experiment);
    console.log(JSON.stringify({ output, resumedCompleted: true, rawComplete: true, targetsPassed: report.targets.passed }));
    if (phase !== 'baseline' && report.targets.passed === false) process.exitCode = 1;
    return;
  }
  const built = buildProduction();
  const evaluation = evaluationDigest();
  if (phase !== 'baseline') validateOfficialProtocolSnapshot(protocol);
  const core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
  if (phase !== 'baseline' && (!core.eligibleHeroIds || !core.eligibleMonsterIds)) fail('Candidate/release requires production eligibleHeroIds(state) and eligibleMonsterIds(state), shared with actual offers/spawns.');
  if (experiment) validateProductionExperiment(core, protocol, experiment);
  const catalog = { hero: core.HERO_FORMS.map((h) => h.id), monster: [...core.SPECIES_IDS] };
  validateMilestones(protocol.milestones, catalog);
  if (phase !== 'baseline' && !protocol.milestones.some((m) => m.final)) fail('Register final unlock milestones before candidate measurement.');
  const fixtureSha256 = sha256(JSON.stringify(fixture)), protocolSha256 = sha256(JSON.stringify(protocol));
  const identity = { phase, seedSet, seeds, policies, settings, screening, checkpointsMinutes: observedSettings.checkpointsMinutes,
    sourceDigest: built.sourceDigest, evaluationDigest: evaluation, fixtureSha256, protocolSha256, buildSha256: built.build.sha256,
    ...(experiment ? { experiment } : {}) };
  const binding = sha256(JSON.stringify(identity));
  const directory = `${output}.runs`;
  mkdirSync(directory, { recursive: true });
  const manifestPath = resolve(directory, 'manifest.json');
  if (existsSync(manifestPath)) {
    const previous = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (previous.binding !== binding) fail('Resume source/evaluation/protocol/fixture/policy mismatch; choose a new output path.');
  } else writeAtomic(manifestPath, { binding, identity });
  const jobs = policies.flatMap((policy) => Array.from({ length: seeds.count }, (_, index) => {
    const seed = seeds.start + index;
    return { policy, seed, path: resolve(directory, sha256(policyKey(policy)), `${seed}.json`) };
  }));
  const runs = new Array(jobs.length), started = performance.now(), pending = [];
  let completed = 0;
  const accept = (index, run, save) => {
    const { policy, seed, path } = jobs[index];
    validateRun(run, observedSettings, protocol.milestones, catalog);
    if (run.seed !== seed || !same(run.policy, policy)) fail('Seed identity mismatch.');
    if (save) {
      if (sourceDigest() !== built.sourceDigest || evaluationDigest() !== evaluation) fail('Source/evaluation changed during measurement.');
      writeAtomic(path, { binding, sha256: sha256(JSON.stringify(run)), run });
    }
    runs[index] = run; completed++;
    if (completed % 10 === 0) console.error(`${policyKey(policy)}: ${completed}/${jobs.length} trajectories`);
  };
  for (const [index, { path }] of jobs.entries()) {
    if (existsSync(path)) {
      const saved = JSON.parse(readFileSync(path, 'utf8'));
      if (saved.binding !== binding || saved.sha256 !== sha256(JSON.stringify(saved.run))) fail('Corrupt resumed seed artifact.');
      accept(index, saved.run, false);
    } else pending.push(index);
  }
  const options = { settings: observedSettings, milestones: protocol.milestones, fixture };
  if (workers === 1) {
    for (const index of pending) {
      const job = jobs[index]; accept(index, simulate(core, job.policy, job.seed, options), true);
      await new Promise((done) => setImmediate(done));
    }
  } else {
    let cursor = 0, aborted = false;
    const results = await Promise.allSettled(Array.from({ length: Math.min(workers, pending.length) }, async () => {
      const worker = new Worker(new URL('./measure-worker.mjs', import.meta.url));
      try {
        while (!aborted && cursor < pending.length) {
          const index = pending[cursor++], job = jobs[index];
          const run = await workerSimulation(worker, { policy: job.policy, seed: job.seed, options });
          accept(index, run, true);
        }
      } catch (error) { aborted = true; throw error; }
      finally { await worker.terminate(); }
    }));
    const rejected = results.find((r) => r.status === 'rejected');
    if (rejected) throw rejected.reason;
  }
  verifyBuild(built.build);
  const report = { version: 7, kind: 'simulated-engine-measurement', phase, rawComplete: true,
    screening, checkpointsMinutes: observedSettings.checkpointsMinutes,
    sourceDigest: built.sourceDigest, evaluationDigest: evaluation, build: built.build, settings,
    protocol, protocolSha256, fixture, fixtureSha256, seedSet, seeds, policies, catalog,
    ...(experiment ? { experiment } : {}),
    runs, rawSha256: sha256(JSON.stringify(runs)), scenarios: summarize(runs), targets: evaluateTargets(runs, settings, protocol.milestones, screening),
    timing: { workers, tickMs: settings.tickMs, readinessResolutionMs: settings.tickMs, eligibilityResolutionMs: settings.observationMs,
      eligibilityEventResolutionMs: settings.tickMs, modeledMinutes: observedSettings.checkpointsMinutes.at(-1), wallElapsedSeconds: (performance.now() - started) / 1000 },
    method: { rng: 'production mulberry32', input: 'uniform=500ms; burst=20 hits/10s at 100ms; warm profiles receive 120s onboarding',
      ordering: 'tick to boundary, input, observe readiness, menu visit, observation/purchases/management; checkpoints after boundary actions',
      visits: '0 means choose immediately and manage/purchase at observation intervals; positive values require a scheduled visit',
      management: 'One action per visit: consume strongest target/weakest food; fuse first ID-ordered eligible pair; reincarnate first eligible ID, otherwise consume strongest/weakest to raise a candidate',
      choice: 'Choose first card, reroll policy attempts one paid reroll first. No PvP simulation.',
      ownership: 'chosenHero is accepted ownership, killedMonster is lifetime defeat; seen is visibility, capturedMonster is actual roster addition',
      eligibility: core.eligibleHeroIds && core.eligibleMonsterIds ? 'production exported selectors' : 'v0.6 production parseHeroProgress/requirementsMet adapter; rare conditions sampled at observation boundaries',
      eligibilityObservation: 'Sample after each engine call emitting a kill, level-up, capture or hero-ready event; before offers, rerolls, choices, purchases and roster management; and at periodic observation boundaries. Multiple events within one engine call share its returned state.',
      eligibilityLimit: 'First observed eligibility, not a continuous-time proof. A time-only condition that appears and disappears between observation boundaries without a relevant event may be missed; no universal maximum-delay guarantee.',
      damage: 'Exact emitted bigint damage including overkill; partyPower is raw production selected-party power, not effective DPS',
      resume: 'Completed seeds are fingerprinted and reused; interrupted seeds restart from initial fixture, never approximate pending attack/RNG state',
      inference: 'Modeled progression only; no claim about player fun, retention, Steam time, Electron E2E or observed human attention' },
    humanFun: 'PENDING', e2e: false };
  validateMeasurement(report, sourceDigest(), evaluationDigest());
  writeAtomic(output, report);
  console.log(JSON.stringify({ output, rawComplete: true, phase, targetsPassed: report.targets.passed, samples: runs.length, wallElapsedSeconds: report.timing.wallElapsedSeconds }));
  // Baseline is complete when evidence is valid. Its v0.7 target failure is an expected finding.
  if (phase !== 'baseline' && report.targets.passed === false) process.exitCode = 1;
}

const USAGE = 'Usage: measure.mjs run OUTPUT.json [--phase baseline|candidate|release] [--candidate ID | --control ID] [--suite] [--screening] [--workers 1..4] [--seed-set baseline|exploration|validation] [--protocol FILE] [--profile NAME] [--policy NAME] [--input-schedule uniform|burst] [--management NAME] [--menu-visit-seconds 0|120|600]\n       measure.mjs verify OUTPUT.json [--phase baseline|candidate|release]\n       measure.mjs compare BEFORE.json AFTER.json OUTPUT.json';

async function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { ...Object.fromEntries([
    'phase', 'seed-set', 'seed', 'seeds', 'protocol', 'fixture', 'profile', 'policy', 'input-schedule', 'management', 'menu-visit-seconds', 'workers', 'candidate', 'control',
  ].map((key) => [key, { type: 'string' }])), suite: { type: 'boolean' }, screening: { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) { console.log(USAGE); return; }
  const [command, ...paths] = positionals;
  if (command === 'run' && paths.length === 1) await runCommand(resolve(paths[0]), values);
  else if (command === 'verify' && paths.length === 1) {
    if (Object.keys(values).some((key) => key !== 'phase')) fail('verify accepts only --phase baseline|candidate|release.');
    const report = JSON.parse(readFileSync(resolve(paths[0]), 'utf8'));
    if (report.phase !== 'baseline') validateOfficialProtocolSnapshot(report.protocol, report.protocolSha256);
    if (values.phase === undefined) validateMeasurement(report, sourceDigest(), evaluationDigest());
    else validateMeasurementPhase(report, values.phase, sourceDigest(), evaluationDigest());
    if (report.protocol.schemaVersion === 2) {
      verifyBuild(report.build);
      validateProductionExperiment(await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href), report.protocol, report.experiment);
    }
    console.log(JSON.stringify({ valid: true, acceptancePhase: values.phase ?? null, phase: report.phase, rawComplete: true, targetsPassed: report.targets.passed, samples: report.runs.length }));
  } else if (command === 'compare' && paths.length === 3) {
    const report = compareMeasurements(...paths.slice(0, 2).map((p) => JSON.parse(readFileSync(resolve(p), 'utf8'))));
    writeAtomic(resolve(paths[2]), report); console.log(JSON.stringify({ output: resolve(paths[2]), pairs: report.rawDeltas.length }));
  } else fail(USAGE);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
