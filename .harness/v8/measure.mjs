#!/usr/bin/env node
// v8 policy adapter over the preserved v7 clock/reducer simulation. No gameplay edits.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { simulate as simulateV7, validateRun as validateRunV7, distribution, populationQuantile, workerSimulation } from '../v7/loop/measure.mjs';
import { ROOT, manifest, digestManifest, sha256, sourceDigest } from '../v7/loop/evidence.mjs';
import { CONFIG } from '../v7/loop/config.mjs';

export const POLICIES = Object.freeze([
  { id: 'A', heroChoice: 'first', management: 'none' },
  { id: 'B', heroChoice: 'unowned-rare-first', management: 'none' },
  { id: 'C', heroChoice: 'first', management: 'consume-weakest' },
  { id: 'D', heroChoice: 'unowned-rare-first', management: 'consume-weakest' },
]);
export const CHECKPOINTS = [5, 15, 30, 60, 90, 120, 240, 480, 600, 720];
const PROTOCOL = resolve(ROOT, 'docs/v0.8/EVALUATION_PROTOCOL.json');
const fail = message => { throw new Error(message); };
const equal = (a, b) => isDeepStrictEqual(a, b);
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const hashFile = path => sha256(readFileSync(path));
const integer = (n, min = 0) => Number.isSafeInteger(n) && n >= min;
const settings = checkpointsMinutes => ({ ...CONFIG.measurement, tickMs: 100, observationMs: 1000, checkpointsMinutes });
const basePolicy = policy => ({ profile: 'active', policy: 'free', inputSchedule: 'uniform', management: policy.management, menuVisitSeconds: 600 });
const ownedIds = state => (state.hero?.collection ?? []).map(hero => hero.formId);

export function validateCollectionProtocol(protocol) {
  const p = protocol?.collectionPolicy;
  if (protocol?.version !== '0.8.0' || protocol.corePolicy !== 'preserve-v070' || !p || p.durationMinutes !== 720 ||
    p.tickMs !== 100 || p.inputIntervalMs !== 500 || p.menuVisitSeconds !== 600 || p.purchases !== 'none' ||
    !equal(p.screeningSeeds, { first: 20001, count: 20 }) || !equal(p.validationSeeds, { first: 30001, count: 100 }) ||
    !equal(p.policies, POLICIES)) fail('Collection protocol differs from the registered v0.8 four-cell experiment.');
  if (p.observationMs !== 1000 || !equal(p.checkpointsMinutes, CHECKPOINTS)) fail('Collection observation/checkpoint registration is missing or changed.');
  return p;
}

export function selectHeroChoice(core, state, mode) {
  const choices = state.hero?.choices ?? [];
  if (!['first', 'unowned-rare-first'].includes(mode)) fail('Unknown hero choice policy.');
  if (mode === 'first') return choices[0];
  const owned = new Set(ownedIds(state));
  return choices.find(choice => !owned.has(choice.formId) && core.heroForm(choice.formId)?.rarity === 'rare') ??
    choices.find(choice => !owned.has(choice.formId)) ?? choices[0];
}

/** Only the returned copy is reordered; real offers, saves, RNG and action contracts are untouched. */
export function policyState(core, state, mode) {
  if (mode === 'first' || state.hero?.choices.length !== 3) return state;
  const choice = selectHeroChoice(core, state, mode);
  return { ...state, hero: { ...state.hero, choices: [choice, ...state.hero.choices.filter(other => other !== choice)] } };
}

const gap = (records, kinds, startSec, endSec) => {
  const times = [startSec, ...records.filter(record => kinds.includes(record.kind) && record.sec > startSec && record.sec < endSec)
    .map(record => record.sec), endSec].sort((a, b) => a - b);
  return Math.max(0, ...times.slice(1).map((time, i) => Math.round((time - times[i]) * 10) / 10));
};
const countRecords = (records, kind, after = -1, through = Infinity) =>
  records.filter(record => record.kind === kind && record.sec > after && record.sec <= through).length;

/** Reuse v7 simulate and its consume-weakest implementation verbatim through a read-only view adapter. */
export function simulate(core, policy, seed, options = {}) {
  if (!POLICIES.some(registered => equal(registered, policy))) fail('Unregistered collection policy.');
  const checkpoints = options.checkpointsMinutes ?? CHECKPOINTS;
  let elapsedMs = 0, fullRosterMs = 0, engineCount = 0;
  const choices = [], management = [], companions = [], snapshots = new Map();
  const everCaptured = new Set();
  let initialCaptured = [], initialRoster = [];
  const adaptedCore = { ...core, createEngine(fixture, rng) {
    engineCount++;
    const engine = core.createEngine(fixture, rng);
    const initial = engine.getState();
    let rosterSize = initial.companions.length;
    initialRoster = initial.companions.map(({ id, speciesId }) => ({ id, speciesId }));
    initialCaptured = [...new Set(initial.companions.map(companion => companion.speciesId))];
    initialCaptured.forEach(id => everCaptured.add(id));
    const observe = events => {
      for (const event of events) {
        if (event.type === 'bossCaptured') {
          const c = event.companion;
          if (!engine.getState().companions.some(actual => actual.id === c.id && actual.speciesId === c.speciesId)) fail('Capture did not enter the actual roster.');
          companions.push({ type: 'captured', sec: elapsedMs / 1000, id: c.id, speciesId: c.speciesId, novel: !everCaptured.has(c.speciesId) });
          everCaptured.add(c.speciesId);
          rosterSize++;
        } else if (event.type === 'companionReleased') {
          companions.push({ type: 'released', sec: elapsedMs / 1000, speciesId: event.speciesId,
            novel: !everCaptured.has(event.speciesId), souls: event.souls, strongerThanWeakest: event.strongerThanWeakest });
        }
      }
      return events;
    };
    return { ...engine,
      tick(dt) {
        if (rosterSize === core.ROSTER_CAP) fullRosterMs += dt;
        elapsedMs += dt;
        return observe(engine.tick(dt));
      },
      attack(source) { return observe(engine.attack(source)); },
      getState() {
        const state = engine.getState();
        if (checkpoints.includes(elapsedMs / 60_000)) snapshots.set(elapsedMs / 60_000, {
          fullRosterSeconds: fullRosterMs / 1000, rosterSpecies: [...new Set(state.companions.map(c => c.speciesId))].sort(),
          everCapturedSpecies: [...everCaptured].sort(), souls: state.souls,
        });
        return policyState(core, state, policy.heroChoice);
      },
      apply(action) {
        const before = engine.getState();
        let audit;
        if (action.type === 'heroChoose') {
          const expected = selectHeroChoice(core, before, policy.heroChoice);
          if (action.formId !== expected?.formId) fail('Action differs from the registered original-offer choice.');
          audit = { sec: elapsedMs / 1000, offerSerial: before.hero.offerSerial,
            originalChoices: before.hero.choices.map(choice => ({ ...choice })), beforeOwned: ownedIds(before),
            selectedId: action.formId, originalSlot: before.hero.choices.findIndex(choice => choice.formId === action.formId),
            previousReincarnations: before.hero.reincarnations };
        } else if (action.type === 'consume') {
          const food = before.companions.find(c => c.id === action.foodId), target = before.companions.find(c => c.id === action.targetId);
          const ordered = [...before.companions].sort((a, b) => core.companionPower(a) < core.companionPower(b) ? -1 :
            core.companionPower(a) > core.companionPower(b) ? 1 : a.id.localeCompare(b.id, 'en'));
          if (!food || !target || ordered[0].id !== food.id || ordered.at(-1).id !== target.id || elapsedMs % 600_000 !== 0) fail('Consume policy or visit drift.');
          audit = { sec: elapsedMs / 1000, food: { ...food }, target: { ...target },
            membersBefore: before.companions.map(companion => ({ ...companion })),
            monsterTypeBefore: before.monster.type, equippedHeroBefore: before.hero?.equipped,
            activeIdsBefore: core.activeCompanions(before.companions, before.monster.type, before.hero?.equipped).map(c => c.id),
            lastOfSpecies: before.companions.filter(c => c.speciesId === food.speciesId).length === 1,
            foodWasActive: core.activeCompanions(before.companions, before.monster.type, before.hero?.equipped).some(c => c.id === food.id),
            rosterBefore: before.companions.length };
        }
        const events = observe(engine.apply(action));
        const after = engine.getState();
        if (action.type === 'heroChoose') {
          if (after.hero.reincarnations !== before.hero.reincarnations + 1 || after.hero.equipped.formId !== action.formId ||
            !ownedIds(after).includes(action.formId)) fail('Hero choice did not complete in the actual engine.');
          choices.push({ ...audit, afterOwned: ownedIds(after), equippedId: after.hero.equipped.formId,
            reincarnations: after.hero.reincarnations });
        } else if (action.type === 'consume') {
          const target = after.companions.find(c => c.id === action.targetId);
          if (after.companions.some(c => c.id === action.foodId) || after.companions.length !== before.companions.length - 1 ||
            target?.level !== audit.target.level + 1 + audit.food.stars) fail('Consume did not complete in the actual engine.');
          management.push({ ...audit, targetAfter: { ...target }, rosterAfter: after.companions.length });
          rosterSize = after.companions.length;
        }
        return events;
      },
    };
  } };
  const raw = simulateV7(adaptedCore, basePolicy(policy), seed, {
    settings: settings(checkpoints), milestones: options.milestones ?? [], fixture: options.fixture ?? null,
  });
  if (engineCount !== 1) fail('Policy adapter must create exactly one production engine.');
  return { version: 8, policy, seed, raw, adapter: { engineCount, initialCaptured, initialRoster, choices, management, companions },
    checkpoints: raw.checkpoints.map(row => ({ minutes: row.minutes, ...snapshots.get(row.minutes),
      captures: companions.filter(event => event.type === 'captured' && event.sec <= row.minutes * 60).length,
      releases: companions.filter(event => event.type === 'released' && event.sec <= row.minutes * 60).length,
      releaseSouls: companions.filter(event => event.type === 'released' && event.sec <= row.minutes * 60).reduce((n, event) => n + event.souls, 0),
      lastSpeciesLosses: management.filter(action => action.lastOfSpecies && action.sec <= row.minutes * 60).length,
      activeCompanionLosses: management.filter(action => action.foodWasActive && action.sec <= row.minutes * 60).length,
    })) };
}

export function validateRun(run, core, checkpoints = CHECKPOINTS, milestones = []) {
  if (run?.version !== 8 || !POLICIES.some(policy => equal(policy, run.policy)) || run.seed !== run.raw?.seed ||
    !equal(run.raw.policy, basePolicy(run.policy)) || run.adapter?.engineCount !== 1) fail('Invalid v8 policy/engine binding.');
  validateRunV7(run.raw, settings(checkpoints), milestones, { hero: core.HERO_FORMS.map(hero => hero.id), monster: [...core.SPECIES_IDS] });
  const a = run.adapter;
  for (const row of run.raw.checkpoints) {
    if (row.inputCount !== row.minutes * 120 || row.spent !== 0 || row.rerolls !== 0) fail('Input cadence or no-purchase policy changed.');
  }
  const accepted = run.raw.actions.filter(action => action.type === 'heroChoose');
  if (a.choices.length !== accepted.length || a.management.length !== run.raw.actions.length - accepted.length) fail('Action audit count mismatch.');
  for (const [i, choice] of a.choices.entries()) {
    const state = { hero: { choices: choice.originalChoices, collection: choice.beforeOwned.map(formId => ({ formId })) } };
    if (choice.originalChoices.length !== 3 || new Set(choice.originalChoices.map(c => c.formId)).size !== 3 ||
      selectHeroChoice(core, state, run.policy.heroChoice)?.formId !== choice.selectedId ||
      choice.originalChoices[choice.originalSlot]?.formId !== choice.selectedId || choice.equippedId !== choice.selectedId ||
      !choice.afterOwned.includes(choice.selectedId) || choice.reincarnations !== choice.previousReincarnations + 1 ||
      accepted[i].formId !== choice.selectedId || accepted[i].sec !== choice.sec) fail('Original-offer/actual-choice audit mismatch.');
    if (!equal([...new Set([...choice.beforeOwned, choice.selectedId])].sort(), [...choice.afterOwned].sort())) fail('Permanent hero ownership was lost.');
  }
  const managed = run.raw.actions.filter(action => action.type === 'consume');
  if (managed.length !== a.management.length || new Set(a.management.map(action => action.sec)).size !== managed.length) fail('Management must be at most once per visit.');
  for (const [i, action] of a.management.entries()) {
    const ordered = [...action.membersBefore].sort((left, right) => core.companionPower(left) < core.companionPower(right) ? -1 :
      core.companionPower(left) > core.companionPower(right) ? 1 : left.id.localeCompare(right.id, 'en'));
    if (action.sec % 600 !== 0 || action.sec !== managed[i].sec || action.food.id !== managed[i].foodId || action.target.id !== managed[i].targetId ||
      !equal(ordered[0], action.food) || !equal(ordered.at(-1), action.target) || action.membersBefore.length !== action.rosterBefore ||
      !equal(action.activeIdsBefore, core.activeCompanions(action.membersBefore, action.monsterTypeBefore, action.equippedHeroBefore).map(c => c.id)) ||
      action.lastOfSpecies !== (action.membersBefore.filter(c => c.speciesId === action.food.speciesId).length === 1) ||
      action.foodWasActive !== action.activeIdsBefore.includes(action.food.id) ||
      action.rosterAfter !== action.rosterBefore - 1 || action.targetAfter.level !== action.target.level + 1 + action.food.stars ||
      typeof action.lastOfSpecies !== 'boolean' || typeof action.foodWasActive !== 'boolean') fail('Actual consume audit mismatch.');
  }
  const captured = new Set(a.initialCaptured);
  if (!equal([...new Set(a.initialRoster.map(c => c.speciesId))].sort(), [...a.initialCaptured].sort())) fail('Initial roster/collection mismatch.');
  const firstCaptured = new Map();
  let lastSec = -1;
  for (const event of a.companions) {
    if (!['captured', 'released'].includes(event.type) || !core.SPECIES_IDS.includes(event.speciesId) || event.sec < lastSec ||
      event.sec > checkpoints.at(-1) * 60 || event.novel !== !captured.has(event.speciesId)) fail('Companion event/novelty audit mismatch.');
    if (event.type === 'captured') {
      captured.add(event.speciesId);
      if (!firstCaptured.has(event.speciesId)) firstCaptured.set(event.speciesId, event.sec);
    }
    else if (![0, 1].includes(event.souls) || typeof event.strongerThanWeakest !== 'boolean') fail('Invalid release reward.');
    lastSec = event.sec;
  }
  if (!equal([...firstCaptured].sort(), run.raw.records.filter(record => record.kind === 'capturedMonster')
    .map(record => [record.id, record.sec]).sort())) fail('Actual roster acquisition differs from first capture records.');
  if (!equal(run.checkpoints.map(row => row.minutes), checkpoints)) fail('Missing collection checkpoints.');
  // Input/tick capture events precede the scheduled consume at a shared boundary.
  const timeline = [...a.companions.map(event => ({ ...event, phase: 0 })),
    ...a.management.map(action => ({ type: 'consume', sec: action.sec, phase: 1, food: action.food, target: action.target,
      membersBefore: action.membersBefore }))]
    .sort((left, right) => left.sec - right.sec || left.phase - right.phase);
  const roster = new Map(a.initialRoster.map(c => [c.id, c.speciesId]));
  const allocated = new Set(roster.keys());
  if (roster.size !== a.initialRoster.length || roster.size > core.ROSTER_CAP) fail('Invalid initial roster identity.');
  let cursor = 0, occupancyMs = 0, previousMs = 0;
  for (const [i, row] of run.checkpoints.entries()) {
    const endpointMs = row.minutes * 60_000;
    while (cursor < timeline.length && timeline[cursor].sec * 1000 <= endpointMs) {
      const event = timeline[cursor++], atMs = Math.round(event.sec * 1000);
      if (roster.size === core.ROSTER_CAP) occupancyMs += atMs - previousMs;
      previousMs = atMs;
      if (event.type === 'captured') {
        if (allocated.has(event.id) || roster.size >= core.ROSTER_CAP) fail('Impossible roster capture identity/capacity.');
        allocated.add(event.id); roster.set(event.id, event.speciesId);
      } else if (event.type === 'released') {
        if (roster.size !== core.ROSTER_CAP) fail('Release occurred without a full roster.');
      } else {
        if (roster.get(event.food.id) !== event.food.speciesId || roster.get(event.target.id) !== event.target.speciesId ||
          event.food.id === event.target.id || !equal([...roster].sort(), event.membersBefore.map(c => [c.id, c.speciesId]).sort()))
          fail('Consume references an absent or incorrect roster.');
        roster.delete(event.food.id);
      }
    }
    const occupancyAtCheckpoint = occupancyMs + (roster.size === core.ROSTER_CAP ? endpointMs - previousMs : 0);
    const events = a.companions.filter(event => event.sec <= row.minutes * 60), actions = a.management.filter(action => action.sec <= row.minutes * 60);
    const ever = [...new Set([...a.initialCaptured, ...events.filter(event => event.type === 'captured').map(event => event.speciesId)])].sort();
    if (row.captures !== events.filter(event => event.type === 'captured').length || row.releases !== events.filter(event => event.type === 'released').length ||
      row.releaseSouls !== events.filter(event => event.type === 'released').reduce((n, event) => n + event.souls, 0) ||
      row.lastSpeciesLosses !== actions.filter(action => action.lastOfSpecies).length || row.activeCompanionLosses !== actions.filter(action => action.foodWasActive).length ||
      !equal(row.everCapturedSpecies, ever) || new Set(row.rosterSpecies).size !== row.rosterSpecies.length ||
      !equal(row.rosterSpecies, [...new Set(roster.values())].sort()) || roster.size !== run.raw.checkpoints[i].companions ||
      row.fullRosterSeconds !== occupancyAtCheckpoint / 1000 ||
      row.rosterSpecies.some(id => !captured.has(id)) || row.rosterSpecies.length > run.raw.checkpoints[i].companions ||
      row.fullRosterSeconds < 0 || row.fullRosterSeconds !== Math.round(row.fullRosterSeconds * 10) / 10 ||
      row.fullRosterSeconds > row.minutes * 60 || !integer(row.souls)) fail('Collection checkpoint audit mismatch.');
  }
  return run;
}

const stats = values => ({ ...distribution(values), populationP10: populationQuantile(values, .1),
  populationP50: populationQuantile(values, .5), populationP90: populationQuantile(values, .9), populationWorst: populationQuantile(values, 1) });
export function summarize(runs) {
  const metrics = run => {
    const records = run.raw.records, end = run.raw.checkpoints.at(-1), collection = run.checkpoints.at(-1);
    const atEightHours = run.raw.checkpoints.find(row => row.minutes === 480);
    return { firstAcceptedSec: end.firstAcceptedSec, kills: end.kills, offers: end.offers, managementActions: end.managementActions,
      lateKills: end.kills - atEightHours.kills, lateReincarnations: end.reincarnations - atEightHours.reincarnations,
      chosenHeroes: countRecords(records, 'chosenHero'), killedSpecies: countRecords(records, 'killedMonster'), capturedSpecies: collection.everCapturedSpecies.length,
      currentRosterSpecies: collection.rosterSpecies.length, fullRosterSeconds: collection.fullRosterSeconds,
      captures: collection.captures, releases: collection.releases, releaseSouls: collection.releaseSouls,
      novelReleases: run.adapter.companions.filter(event => event.type === 'released' && event.novel).length,
      lastSpeciesLosses: collection.lastSpeciesLosses, activeCompanionLosses: collection.activeCompanionLosses,
      lateChosenHeroes: countRecords(records, 'chosenHero', 28800), lateKilledSpecies: countRecords(records, 'killedMonster', 28800),
      lateCapturedSpecies: countRecords(records, 'capturedMonster', 28800),
      longestAcquiredGapSec: gap(records, ['chosenHero', 'killedMonster', 'capturedMonster'], 7200, 43200),
      longestCollectionGapSec: gap(records, ['chosenHero', 'capturedMonster'], 7200, 43200),
      ...Object.fromEntries(['h58', 'h62', 'h70'].flatMap(id => ['eligibleHero', 'seenHero', 'chosenHero'].map(kind =>
        [`${id}_${kind}Sec`, records.find(record => record.kind === kind && record.id === id)?.sec ?? null]))) };
  };
  const perSeed = runs.map(run => ({ policy: run.policy.id, seed: run.seed, metrics: metrics(run) }));
  const policies = POLICIES.map(policy => {
    const rows = perSeed.filter(row => row.policy === policy.id);
    return { policy, samples: rows.length, metrics: Object.fromEntries(Object.keys(rows[0]?.metrics ?? {}).map(key => [key, stats(rows.map(row => row.metrics[key]))])) };
  });
  const paired = [['B', 'A'], ['C', 'A'], ['D', 'B'], ['D', 'C']].map(([after, before]) => {
    const rows = perSeed.filter(row => row.policy === after).map(row => {
      const other = perSeed.find(candidate => candidate.policy === before && candidate.seed === row.seed);
      if (!other) fail('Missing paired seed.');
      return { seed: row.seed, deltas: Object.fromEntries(Object.keys(row.metrics).map(key => [key,
        row.metrics[key] === null || other.metrics[key] === null ? null : row.metrics[key] - other.metrics[key]])) };
    });
    return { after, before, rows, metrics: Object.fromEntries(Object.keys(rows[0]?.deltas ?? {}).map(key => [key, stats(rows.map(row => row.deltas[key]))])) };
  });
  return { policies, paired, perSeed, inference: 'Paired modeled policies only. No pacing threshold, human fun, preference, retention or release approval.' };
}

function fingerprint() {
  const files = { ...manifest(['.harness/v7']) };
  for (const path of ['.harness/v8/measure.mjs', '.harness/v8/measure-worker.mjs']) files[path] = hashFile(resolve(ROOT, path));
  files['docs/v0.8/EVALUATION_PROTOCOL.json'] = hashFile(PROTOCOL);
  files['docs/v0.7/EVALUATION_PROTOCOL.json'] = hashFile(resolve(ROOT, 'docs/v0.7/EVALUATION_PROTOCOL.json'));
  files['tests/measurementV8.test.ts'] = hashFile(resolve(ROOT, 'tests/measurementV8.test.ts'));
  const buildFiles = manifest(['dist/electron/core']);
  for (const name of readdirSync(resolve(ROOT, 'src/core')).filter(name => name.endsWith('.ts'))) {
    if (statSync(resolve(ROOT, 'dist/electron/core', name.replace(/\.ts$/, '.js'))).mtimeMs < statSync(resolve(ROOT, 'src/core', name)).mtimeMs) fail('Core build is stale; host must build before measuring.');
  }
  return { sourceDigest: sourceDigest(), coreDigest: digestManifest(manifest(['src/core'])),
    evaluationDigest: digestManifest(files), buildDigest: digestManifest(buildFiles), protocolSha256: hashFile(PROTOCOL),
    evaluatorFiles: files, buildFiles };
}

function immutable(path, value) {
  if (existsSync(path)) fail(`Refusing to overwrite existing evidence: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, `${JSON.stringify(value)}\n`, { flag: 'wx' });
  renameSync(temp, path);
}

async function verifyReport(path, requireCurrent = true) {
  const report = json(path), core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
  validateCollectionProtocol(report.protocol);
  if (report.version !== 8 || report.kind !== 'collection-policy-measurement' || report.rawComplete !== true ||
    !['exploration', 'validation'].includes(report.seedSet) || report.seedSet !== report.identity?.seedSet ||
    !equal(report.identity.policies, POLICIES) || report.binding !== sha256(JSON.stringify(report.identity))) fail('Invalid measurement report identity.');
  if (requireCurrent && !equal(report.identity.fingerprint, fingerprint())) fail('Current source/evaluator/build differs from the measurement.');
  if (requireCurrent && !equal(report.protocol, json(PROTOCOL))) fail('Embedded protocol differs from the registered document.');
  const seeds = report.seedSet === 'exploration' ? report.protocol.collectionPolicy.screeningSeeds : report.protocol.collectionPolicy.validationSeeds;
  if (!equal(report.identity.seeds, seeds) || !equal(report.milestones, json(resolve(ROOT, 'docs/v0.7/EVALUATION_PROTOCOL.json')).milestones)) fail('Seed or preserved milestone registry mismatch.');
  const expected = new Set(POLICIES.flatMap(policy => Array.from({ length: seeds.count }, (_, i) => `${policy.id}/${seeds.first + i}`)));
  const runs = [];
  for (const raw of report.raw) {
    if (hashFile(resolve(ROOT, raw.path)) !== raw.sha256) fail('Raw artifact hash mismatch.');
    const saved = json(resolve(ROOT, raw.path));
    if (saved.binding !== report.binding || saved.sha256 !== sha256(JSON.stringify(saved.run)) ||
      !expected.delete(`${saved.run.policy.id}/${saved.run.seed}`)) fail('Raw policy/seed identity mismatch.');
    validateRun(saved.run, core, CHECKPOINTS, report.milestones);
    if (Object.values(saved.run.raw.initial).some(value => value !== 0) || saved.run.adapter.initialCaptured.length ||
      saved.run.adapter.initialRoster.length) fail('Registered measurement must start fresh.');
    runs.push(saved.run);
  }
  if (expected.size || !equal(report.summary, summarize(runs))) fail('Incomplete matrix or summary differs from raw.');
  return report;
}

async function runCommand(output, values) {
  const protocol = json(PROTOCOL), registry = validateCollectionProtocol(protocol);
  const seedSet = values['seed-set'];
  if (!['exploration', 'validation'].includes(seedSet)) fail('Use --seed-set exploration|validation.');
  const workers = Number(values.workers ?? 4);
  if (!integer(workers, 1) || workers > 4) fail('Workers must be 1..4.');
  const bindingFiles = fingerprint();
  if (seedSet === 'validation') {
    if (!values.freeze) fail('Validation requires a host-approved --freeze file after exploration.');
    const frozen = json(resolve(values.freeze));
    if (frozen.kind !== 'v08-collection-evaluator-freeze' || !equal(frozen.fingerprint, bindingFiles) ||
      hashFile(resolve(ROOT, frozen.explorationPath)) !== frozen.explorationSha256) fail('Validation freeze does not bind this evaluator/build/exploration.');
    await verifyReport(resolve(ROOT, frozen.explorationPath));
  }
  if (existsSync(output)) {
    const existing = await verifyReport(output);
    if (existing.seedSet !== seedSet) fail('Completed output belongs to another seed stage.');
    console.log(JSON.stringify({ output, alreadyComplete: true, seedSet })); return;
  }
  const core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
  const v7 = json(resolve(ROOT, 'docs/v0.7/EVALUATION_PROTOCOL.json'));
  const selected = v7.candidates.find(candidate => candidate.id === v7.selectedExperiment.id);
  if (!equal(core.PROGRESSION_PARAMETERS, selected.parameters)) fail('v0.7 progression values changed.');
  const milestones = v7.milestones;
  for (const milestone of milestones) for (const id of milestone.ids) {
    if (!equal(core.PROGRESSION_CONTENT_RULES[id], milestone.requirements)) fail('v0.7 content conditions changed.');
  }
  const seeds = seedSet === 'exploration' ? registry.screeningSeeds : registry.validationSeeds;
  const identity = { seedSet, seeds, policies: POLICIES, fingerprint: bindingFiles }, binding = sha256(JSON.stringify(identity));
  const directory = `${output}.runs`, manifestPath = resolve(directory, 'manifest.json');
  if (existsSync(manifestPath)) { if (!equal(json(manifestPath), { binding, identity })) fail('Resume identity changed.'); }
  else immutable(manifestPath, { binding, identity });
  const jobs = POLICIES.flatMap(policy => Array.from({ length: seeds.count }, (_, i) => ({ policy, seed: seeds.first + i,
    path: resolve(directory, policy.id, `${seeds.first + i}.json`) })));
  const runs = new Array(jobs.length), raw = new Array(jobs.length), pending = [];
  const accept = (index, run, save) => {
    const job = jobs[index];
    if (run.seed !== job.seed || !equal(run.policy, job.policy)) fail('Worker returned another policy/seed.');
    validateRun(run, core, CHECKPOINTS, milestones);
    if (save) immutable(job.path, { binding, sha256: sha256(JSON.stringify(run)), run });
    runs[index] = run; raw[index] = { path: relative(ROOT, job.path), sha256: hashFile(job.path) };
  };
  for (const [index, job] of jobs.entries()) {
    if (!existsSync(job.path)) pending.push(index);
    else {
      const saved = json(job.path);
      if (saved.binding !== binding || saved.sha256 !== sha256(JSON.stringify(saved.run))) fail('Resumed raw binding mismatch.');
      accept(index, saved.run, false);
    }
  }
  let cursor = 0, completed = jobs.length - pending.length, aborted = false;
  const startedAt = new Date().toISOString(), started = performance.now();
  const results = await Promise.allSettled(Array.from({ length: Math.min(workers, pending.length) }, async () => {
    const worker = new Worker(new URL('./measure-worker.mjs', import.meta.url));
    try {
      while (!aborted && cursor < pending.length) {
        const index = pending[cursor++], job = jobs[index];
        const run = await workerSimulation(worker, { policy: job.policy, seed: job.seed, options: { milestones } });
        accept(index, run, true); completed++;
        if (completed % 10 === 0) console.error(`${completed}/${jobs.length} completed`);
      }
    } catch (error) { aborted = true; throw error; }
    finally { await worker.terminate(); }
  }));
  const rejected = results.find(result => result.status === 'rejected');
  if (rejected) throw rejected.reason;
  if (!equal(bindingFiles, fingerprint())) fail('Source/evaluator/build changed during measurement; raw evidence retained without a completion claim.');
  const report = { version: 8, kind: 'collection-policy-measurement', seedSet, rawComplete: true, identity, binding,
    protocol, milestones, raw, summary: summarize(runs), startedAt, endedAt: new Date().toISOString(),
    wallElapsedSeconds: (performance.now() - started) / 1000, workers,
    method: { clock: 'Preserved v7 simulate;100ms ticks;1s observations;2 inputs/sec;one menu/management visit each600sec.',
      adapter: 'Only copied getState hero choices reorder. One actual production engine/RNG. Underlying original offers and actual completed actions retained.',
      management: 'Exact v7 consume-weakest; no species or active-party protection; losses recorded.',
      fullRosterTime: 'Sum100ms ticks whose starting roster is full; tick-resolution occupancy.',
      gaps: 'First-ever(kind,id) timestamps in2–12h including both boundaries. Collection=chosenHero/capturedMonster; acquired also includes killedMonster.',
      completion: 'Complete independent paired matrix and verified ledgers. No new gameplay timing target.' }, humanChecks: 'PENDING' };
  immutable(output, report);
  await verifyReport(output);
  console.log(JSON.stringify({ output, rawComplete: true, samples: runs.length, seedSet, wallElapsedSeconds: report.wallElapsedSeconds }));
}

async function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    'seed-set': { type: 'string' }, workers: { type: 'string' }, freeze: { type: 'string' },
  } });
  const [command, first, second] = positionals;
  if (command === 'run' && first) await runCommand(resolve(first), values);
  else if (command === 'verify' && first) { const report = await verifyReport(resolve(first)); console.log(JSON.stringify({ verified: true, samples: report.raw.length })); }
  else if (command === 'freeze' && first && second) {
    const report = await verifyReport(resolve(first));
    if (report.seedSet !== 'exploration') fail('Freeze requires the completed exploration matrix.');
    immutable(resolve(second), { kind: 'v08-collection-evaluator-freeze', frozenAt: new Date().toISOString(), fingerprint: fingerprint(),
      explorationPath: relative(ROOT, resolve(first)), explorationSha256: hashFile(resolve(first)) });
    console.log(JSON.stringify({ frozen: true, output: resolve(second) }));
  } else if (command === 'fingerprint') console.log(JSON.stringify(fingerprint()));
  else fail('Usage: measure.mjs run OUTPUT --seed-set exploration|validation [--workers4] [--freeze FILE] | verify OUTPUT | freeze EXPLORATION FREEZE | fingerprint');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
