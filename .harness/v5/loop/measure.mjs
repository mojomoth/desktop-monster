#!/usr/bin/env node
// Real core reducer, modeled time. No Electron, OS hooks, network or human fun score.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { sourceDigest, evaluationDigest } from './evidence.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const PROFILES = ['active', 'idle', 'intermittent'];
export const MINUTES = [5, 15, 30];
const FIRST_EVENTS = { monsterKilled: 'firstKillSec', itemDropped: 'firstRewardSec', levelUp: 'firstLevelSec', bossCaptured: 'firstCaptureSec' };
const METRICS = ['level', 'kills', 'coins', 'income', 'spent', 'companions', 'collected', 'reincarnations',
  'rareSeen', 'monstersSeen', 'offers', 'unseenFirstCards', 'released', 'strongerReleased', 'training', 'heroDps', 'companionDps',
  'heroDamagePercent', 'longestKillGapSec', 'longestMeaningfulGapSec', 'longestDiscoveryGapSec',
  'meaningfulEvents', 'onboardingCompanions', 'feverStarts', 'firstKillSec', 'firstRewardSec', 'firstLevelSec', 'firstCaptureSec', 'firstOfferSec'];

/** Nulls are censored (not reached); never silently turn an unreachable reward into zero. */
export function distribution(values) {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  if (sorted.some((value) => !Number.isFinite(value))) throw new Error('Non-finite measured value.');
  const at = (q) => sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : null;
  return { reached: sorted.length, unreached: values.length - sorted.length,
    p10: at(.1), p50: at(.5), p90: at(.9), min: at(0), max: at(1) };
}

/** Matches tests/balance.test.ts input cadence and first-card policy; imports production functions. */
export function simulate(core, profile, seed, policy = 'free', checkpoints = MINUTES) {
  if (![...PROFILES, 'pure-idle'].includes(profile) || !['free', 'training', 'lure', 'reroll'].includes(policy)) throw new Error('Unknown profile or policy.');
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be uint32.');
  if (!checkpoints.length || checkpoints.some((minutes, i) => !Number.isSafeInteger(minutes) || minutes < 1 || minutes > 30 || (i > 0 && minutes <= checkpoints[i - 1]))) throw new Error('Checkpoints must be increasing whole minutes in 1..30.');
  const engine = core.createEngine(null, core.mulberry32(seed));
  const first = { firstKillSec: null, firstRewardSec: null, firstLevelSec: null, firstCaptureSec: null, firstOfferSec: null };
  const seen = new Set(engine.getState().progress?.seenMonsters ?? []);
  let income = 0, heroDamage = 0n, companionDamage = 0n;
  let lastKill = 0, lastMeaningful = 0, lastDiscovery = 0;
  let killGap = 0, meaningfulGap = 0, discoveryGap = 0;
  let meaningfulEvents = 0, offers = 0, unseenFirstCards = 0, released = 0, strongerReleased = 0;
  let onboardingCompanions = null, feverStarts = 0, minimumBalance = 0, unaffordableSeconds = 0;
  const raw = [];
  const meaningful = (sec) => {
    meaningfulGap = Math.max(meaningfulGap, sec - lastMeaningful);
    lastMeaningful = sec;
    meaningfulEvents++;
  };
  const discover = (id, sec) => {
    if (seen.has(id)) return;
    seen.add(id);
    discoveryGap = Math.max(discoveryGap, sec - lastDiscovery);
    lastDiscovery = sec;
    meaningful(sec);
  };
  const observe = (events, sec) => {
    for (const event of events) {
      if (FIRST_EVENTS[event.type]) first[FIRST_EVENTS[event.type]] ??= sec;
      if (event.type === 'attack') heroDamage += event.damage;
      if (event.type === 'feverStart') feverStarts++;
      if (event.type === 'companionAttack') companionDamage += event.damage;
      if (event.type === 'itemDropped') income += event.drops.reduce((sum, drop) => sum + (drop.item.kind === 'coin' ? drop.amount : 0), 0);
      if (event.type === 'monsterKilled') { killGap = Math.max(killGap, sec - lastKill); lastKill = sec; }
      if (event.type === 'companionReleased') { released++; if (event.strongerThanWeakest) strongerReleased++; }
      if (event.type === 'levelUp' || event.type === 'bossCaptured') meaningful(sec);
      if (event.type === 'monsterSpawned') discover(event.monster.speciesId, sec);
    }
  };
  for (let sec = 1; sec <= checkpoints.at(-1) * 60; sec++) {
    const active = profile !== 'pure-idle' && (sec <= 120 || profile === 'active' || (profile === 'intermittent' && sec % 60 < 15));
    // Two simultaneous inputs followed by a 1000 ms tick: intentionally the existing regression model.
    for (let i = 0; i < (active ? 2 : 0); i++) observe(engine.attack('keyboard'), sec);
    observe(engine.tick(1000), sec);
    const afterTick = engine.getState();
    if (core.heroReady(afterTick.level, afterTick.hero)) {
      first.firstOfferSec ??= sec;
      observe(engine.apply({ type: 'heroOffer' }), sec);
      let hero = engine.getState().hero;
      if (policy === 'reroll') {
        observe(engine.apply({ type: 'heroReroll', offerSerial: hero.offerSerial }), sec);
        hero = engine.getState().hero;
      }
      if (!hero?.choices?.length) throw new Error(`No hero choices at ${profile}/${seed}/${sec}.`);
      offers++;
      if (!hero.collection.some((entry) => entry.formId === hero.choices[0].formId)) unseenFirstCards++;
      observe(engine.apply({ type: 'heroChoose', formId: hero.choices[0].formId, offerSerial: hero.offerSerial }), sec);
      // heroChoose spawns a monster without a monsterSpawned event; observe its persisted discovery too.
      for (const id of engine.getState().progress?.seenMonsters ?? []) discover(id, sec);
      meaningful(sec);
    }
    if (policy === 'training' || policy === 'lure') {
      const current = engine.getState();
      const result = core.applyEconomyAction(current, { type: 'shopBuy', item: policy, shopSerial: current.progress?.shopSerial ?? 0 });
      if ('error' in result && result.error === 'Not enough gold') unaffordableSeconds++;
      observe(engine.apply({ type: 'shopBuy', item: policy, shopSerial: afterTick.progress?.shopSerial ?? 0 }), sec);
    }
    minimumBalance = Math.min(minimumBalance, engine.getState().coins);
    if (sec === 120) onboardingCompanions = afterTick.companions.length;
    if (!checkpoints.includes(sec / 60)) continue;
    const state = engine.getState();
    const spent = state.progress?.goldSpent ?? 0;
    if (income - spent !== state.coins) throw new Error(`Gold conservation failed at ${profile}/${seed}/${sec}.`);
    raw.push({ profile, policy, seed, minutes: sec / 60, ...first, level: state.level, kills: state.killCount,
      coins: state.coins, income, spent, companions: state.companions.length, collected: state.hero?.collection.length ?? 0,
      reincarnations: state.hero?.reincarnations ?? 0, rareSeen: core.RARE_MONSTERS.filter((monster) => seen.has(monster.id)).length,
      monstersSeen: seen.size, offers, unseenFirstCards, released, strongerReleased, training: state.progress?.trainingLevel ?? 0,
      monsterHp: String(state.monster.maxHp), heroDps: Number(heroDamage) / sec, companionDps: Number(companionDamage) / sec,
      heroDamagePercent: heroDamage + companionDamage === 0n ? null : Number(heroDamage) / Number(heroDamage + companionDamage) * 100,
      longestKillGapSec: Math.max(killGap, sec - lastKill), longestMeaningfulGapSec: Math.max(meaningfulGap, sec - lastMeaningful),
      longestDiscoveryGapSec: Math.max(discoveryGap, sec - lastDiscovery), meaningfulEvents, onboardingCompanions, feverStarts,
      minimumBalance, unaffordableSeconds: policy === 'training' || policy === 'lure' ? unaffordableSeconds : null });
  }
  return raw;
}

export function summarize(raw) {
  return [...new Set(raw.map(({ policy, profile, minutes }) => `${policy}/${profile}/${minutes}`))].map((key) => {
    const [policy, profile, minutes] = key.split('/');
    const rows = raw.filter((row) => row.policy === policy && row.profile === profile && row.minutes === Number(minutes));
    const metrics = [...METRICS, ...['minimumBalance', 'unaffordableSeconds'].filter((metric) => rows.every((row) => metric in row))];
    return { policy, profile, minutes: Number(minutes), samples: rows.length,
      metrics: Object.fromEntries(metrics.map((metric) => [metric, distribution(rows.map((row) => row[metric]))])) };
  });
}

const hash = (value) => createHash('sha256').update(value).digest('hex');
export function provenance() {
  const source = readdirSync(resolve(ROOT, 'src/core'), { recursive: true }).filter((name) => name.endsWith('.ts')).map((name) => `src/core/${name}`).sort();
  const build = source.map((name) => name.replace('src/core/', 'dist/electron/core/').replace(/\.ts$/, '.js'));
  for (let i = 0; i < source.length; i++) {
    if (statSync(resolve(ROOT, source[i])).mtimeMs > statSync(resolve(ROOT, build[i])).mtimeMs) throw new Error('Core build is older than source; run npm run build first.');
  }
  const files = [...source, ...build, 'tsconfig.main.json', 'tsconfig.base.json', 'package-lock.json', '.harness/v5/loop/measure.mjs', '.harness/v5/loop/experiments.mjs', '.harness/v5/loop/evidence.mjs'];
  const hashes = Object.fromEntries(files.map((name) => [name, hash(readFileSync(resolve(ROOT, name)))]));
  return { sha256: hash(JSON.stringify(hashes)), files: hashes,
    buildCheck: 'Every compiled core file exists and is at least as recent as its TypeScript source; both content hashes recorded.' };
}

async function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    seeds: { type: 'string', default: '100' }, seed: { type: 'string', default: '1' }, policies: { type: 'boolean', default: false }, experiments: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (values.help) { console.log('Usage: node .harness/v5/loop/measure.mjs OUTPUT.json [--seeds 100] [--seed 1] [--policies] [--experiments EXPERIMENTS.json]\nRun npm run build first. Simulated engine pacing only; --policies adds active training/lure/reroll comparisons. --experiments binds an already completed same-source experiments.mjs artifact by hash.'); return; }
  if (positionals.length !== 1) throw new Error('Supply exactly one OUTPUT.json path; see --help.');
  const count = Number(values.seeds), seed = Number(values.seed);
  if (!Number.isSafeInteger(count) || count < 100 || count > 10000 || !Number.isSafeInteger(seed) || seed < 0 || seed + count - 1 > 0xffffffff) throw new Error('Use 100..10000 seeds within uint32 range.');
  const source = provenance();
  const sourceVersion = sourceDigest();
  const evaluationVersion = evaluationDigest();
  const core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
  const started = performance.now();
  const raw = [];
  const profiles = [...PROFILES.map((profile) => ({ profile, policy: 'free' })),
    ...(values.policies ? ['training', 'lure', 'reroll'].map((policy) => ({ profile: 'active', policy })) : [])];
  for (const { profile, policy } of profiles) {
    for (let n = 0; n < count; n++) {
      raw.push(...simulate(core, profile, seed + n, policy));
      if ((n + 1) % 25 === 0) { console.error(`${policy}/${profile}: ${n + 1}/${count} seeds`); await new Promise((done) => setImmediate(done)); }
    }
  }
  const pureIdleControl = simulate(core, 'pure-idle', seed);
  if (provenance().sha256 !== source.sha256 || sourceDigest() !== sourceVersion || evaluationDigest() !== evaluationVersion) throw new Error('Source/build/evaluation changed during measurement; rerun on a stable build.');
  const output = resolve(positionals[0]);
  const report = { version: 5, kind: 'simulated-engine-measurement', mode: 'simulated', humanFun: 'PENDING', e2e: false,
    command: [process.execPath, relative(ROOT, fileURLToPath(import.meta.url)), ...args], source, sourceDigest: sourceVersion, evaluationDigest: evaluationVersion, samples: count,
    seeds: { first: seed, last: seed + count - 1, count, rng: 'production mulberry32' },
    timing: { modeledMinutes: MINUTES, wallElapsedSeconds: (performance.now() - started) / 1000,
      tickMs: 1000, eventResolutionSeconds: 1, timestamps: 'Events observed within each simulated second are assigned its end boundary.' },
    method: { input: 'Same as tests/balance.test.ts: 2 simultaneous keyboard inputs then tick(1000); 120s onboarding; idle=0 inputs afterward; intermittent=sec%60<15.',
      choice: 'Choose first offer immediately even while idle; optimistic attention model. No companion management. Optional paid policies buy whenever eligible/affordable; reroll once per offer.',
      independentSamples: '100+ distinct seeds per policy/profile. 5/15/30 minute checkpoints share a trajectory; profiles/policies reuse seeds for paired comparisons.',
      percentiles: 'Sort reached values ascending, take floor((n-1)*q). Report unreached separately; quantiles conditional on reaching are not a success claim.',
      meaningfulEvent: 'Observable proxy: levelUp, bossCaptured, first discovery of a monster species, or accepted hero choice. Ordinary kills/coins excluded. Multiple events can occur in one second; this is not enjoyment or attention.',
      gaps: 'Maximum gap includes initial waiting and trailing silence at each checkpoint. Discovery gap counts only new monster species.',
      damage: 'Cumulative emitted damage divided by modeled seconds, including overkill; not effective removed HP.',
      controls: 'pureIdleControl starts with no companions/input, one seed; it is separate from the 100-seed warm-idle distribution. v0.6 experiments add a frozen-fixture 100-seed fresh-idle control.',
      economy: 'minimumBalance includes initial zero and every post-action balance; unaffordableSeconds counts 1-second observations where production shop reducer rejects an otherwise eligible training/lure purchase for insufficient gold. Free/reroll are null (reroll only exists at offers, not continuously).' },
    scenarios: summarize(raw), pureIdleControl, rawSamples: raw };
  if (values.experiments) {
    const { validateExperiments } = await import('./experiments.mjs');
    const path = resolve(values.experiments), bytes = readFileSync(path);
    const experiments = JSON.parse(bytes);
    validateExperiments(experiments, sourceVersion);
    if (experiments.evaluationDigest !== evaluationVersion) throw new Error('Stale experiment evaluation fingerprint.');
    report.experiments = { path, sha256: hash(bytes), sourceDigest: experiments.sourceDigest, evaluationDigest: experiments.evaluationDigest, protocolSha256: experiments.protocolSha256 };
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ output, kind: report.kind, scenarios: report.scenarios.length, samples: raw.length, wallElapsedSeconds: report.timing.wallElapsedSeconds }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
