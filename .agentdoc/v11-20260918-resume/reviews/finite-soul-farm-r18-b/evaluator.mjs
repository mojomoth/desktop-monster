#!/usr/bin/env node
// Fixed-protocol, current-core pacing experiments. No Electron or real timers.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd(), require = createRequire(import.meta.url);
const script = fileURLToPath(import.meta.url);
const protocolPath = resolve(root, 'docs/v0.11/EVALUATION_PROTOCOL.json');
const candidatesPath = resolve(root, 'docs/v0.11/BALANCE_CANDIDATE.json');
export const sha = value => createHash('sha256').update(value).digest('hex');
export const json = value => JSON.stringify(value, (_, entry) => typeof entry === 'bigint' ? String(entry) : entry, 2);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const assert = (value, message) => { if (!value) throw Error(message); };
export function binding() {
  const files = Object.fromEntries(readdirSync(resolve(root, 'src/core')).filter(file => file.endsWith('.ts')).sort()
    .map(file => [file, sha(readFileSync(resolve(root, 'src/core', file)))]));
  return { files, coreHash: sha(json(files)), protocolHash: sha(readFileSync(protocolPath)), candidatesHash: sha(readFileSync(candidatesPath)), scriptHash: sha(readFileSync(script)) };
}
function compile(directory, candidate, sourceDirectory) {
  mkdirSync(directory, { recursive: true });
  for (const file of readdirSync(sourceDirectory).filter(file => file.endsWith('.ts'))) {
    let source = readFileSync(resolve(sourceDirectory, file), 'utf8');
    if (file === 'progression.ts') for (const [key, value] of Object.entries(candidate.parameters)) {
      const pattern = new RegExp('(' + key + ': )([0-9_.]+|null)(?=,)');
      assert(pattern.test(source), 'Unknown candidate parameter ' + key);
      source = source.replace(pattern, (_, prefix) => prefix + JSON.stringify(value));
    }
    const output = ts.transpileModule(source, { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true } }).outputText;
    writeFileSync(resolve(directory, file.replace(/\.ts$/, '.js')), output);
  }
}
export function simulate(c, profile, seed, cyclesWanted, maxHours, tickMs = profile === 'high' ? 100 : 500, policy = 'ordinary') {
  let now = 0, nextInput = 0, previousAccepted = 0, income = 0n, sales = 0n, lastKill = 0, longestKillGap = 0;
  const started = performance.now(), cycles = [], wealthy = profile === 'wealthy';
  const initialCoins = wealthy ? 1000000n : 0n;
  const save = wealthy ? { ...c.DEFAULT_SAVE, level: 15, souls: 20, coins: String(initialCoins), companions: Array.from({ length: 5 }, (_, i) =>
    ({ id: `c${i + 1}`, speciesId: ['slime', 'bat', 'ghost', 'golem', 'dragon'][i], bossIndex: 39, level: 5, stars: 0 })), nextCompanionId: 6 } : null;
  const engine = c.createEngine(save, c.mulberry32(seed), { equipmentSeed: seed ^ 0xe011, now: () => now });
  let purchases = 0, enhancements = 0, soulRecoveries = 0, firstCompanionMs = null, firstReadyMs = null, firstPurchaseMs = null, firstEquippedWeaponMs = null, firstPartyBonusMs = null, equippedWeaponMs = 0;
  const firstLevels = {}, checkpoints = [], growthActions = [], noResetActions = [], finiteSoulFarmActions = [];
  let heroOffers = 0, heroChoices = 0;
  let observedHp = engine.getState().monsterHp, feverUntil = 0, longestKillGapContext = null, cycleLevelTimes = {}, heroApplied = 0n, companionApplied = 0n, heroReported = 0n, companionReported = 0n;
  let feverCertainApplied = 0n, feverBoundaryApplied = 0n, feverActiveMs = 0, feverStarts = 0;
  const damageMetrics = () => ({ heroApplied: String(heroApplied), companionApplied: String(companionApplied), heroReported: String(heroReported),
    companionReported: String(companionReported), feverCertainApplied: String(feverCertainApplied), feverBoundaryApplied: String(feverBoundaryApplied), feverActiveMs, feverStarts });
  let managementReleases = 0, maximumStage = 0, maxCapturedIndex = 0, maxCapturedRawPowerDigits = 1;
  let heroKills = 0, companionKills = 0, nextCheckpoint = 1800000, sampledHeapPeakBytes = 0;
  const measure = (events, feverWindow = 'inactive') => {
    let actor = null;
    for (const event of events) {
      if (event.type === 'feverStart') { feverWindow = 'active'; feverStarts++; feverUntil = now + c.FEVER_MS; }
      if (event.type === 'feverEnd') feverUntil = 0;
      if (event.type === 'attack') { actor = 'hero'; heroReported += event.damage; }
      if (event.type === 'companionAttack') { actor = 'companion'; companionReported += event.damage; }
      if (event.type === 'monsterHit') {
        const applied = observedHp - event.hpAfter; assert(applied >= 0n, 'Observed damage accounting');
        if (actor === 'hero') heroApplied += applied; else if (actor === 'companion') companionApplied += applied;
        if (feverWindow === 'active') feverCertainApplied += applied;
        else if (feverWindow === 'boundary') feverBoundaryApplied += applied;
        observedHp = event.hpAfter;
      }
      if (event.type === 'monsterSpawned') observedHp = event.monster.maxHp;
      if (event.type === 'itemDropped') income += event.drops.filter(drop => drop.item.kind === 'coin').reduce((sum, drop) => sum + BigInt(drop.amount), 0n);
      if (event.type === 'monsterKilled') {
        if (now - lastKill > longestKillGap) { longestKillGap = now - lastKill; longestKillGapContext = { durationMs: longestKillGap, fromMs: lastKill, toMs: now, cycle: cycles.length + 1, stage: event.monster.index, boss: event.monster.boss }; }
        lastKill = now;
        if (actor === 'hero') heroKills++; else if (actor === 'companion') companionKills++;
      }
      if (event.type === 'bossCaptured') {
        firstCompanionMs ??= now; maxCapturedIndex = Math.max(maxCapturedIndex, event.companion.bossIndex);
        maxCapturedRawPowerDigits = Math.max(maxCapturedRawPowerDigits, c.companionPower(event.companion).toString().length);
      }
      if (event.type === 'levelUp') { firstLevels[event.newLevel] ??= now; cycleLevelTimes[event.newLevel] ??= now - previousAccepted; }
    }
  };
  const apply = action => { const events = engine.apply(action); measure(events); observedHp = engine.getState().monsterHp;
    const accepted = engine.lastActionError() === null;
    if (accepted && action.type === 'heroOffer') heroOffers++;
    if (accepted && action.type === 'heroChoose') heroChoices++;
    return accepted; };
  const volley = (state, companions = state.companions) => c.activeFieldCompanions(companions, state.monster.type,
    state.hero?.equipped, state.hero?.reincarnations ?? 0, state.monster.curveVersion ?? 10).reduce((sum, companion) => sum +
      c.effectivePower(c.heroBuffedPower(c.fieldCompanionPower(companion, state.hero?.reincarnations ?? 0, state.monster.curveVersion ?? 10),
        c.typeOf(companion.speciesId), state.hero?.equipped) * (10000n + c.equipmentBonus(state.equipment?.loadout, 'party')) / 10000n,
        c.typeOf(companion.speciesId), state.monster.type) * (state.fever.active ? c.companionFeverMultiplier(state.monster.curveVersion ?? 10) : 1n), 0n);
  const fieldContext = state => ({ companions: state.companions.map(companion => ({ ...companion })), heroEquipped: state.hero?.equipped ?? null,
    acceptedHeroCount: state.hero?.reincarnations ?? 0, enemyType: state.monster.type, curveVersion: state.monster.curveVersion ?? 10,
    partyBonusBps: String(c.equipmentBonus(state.equipment?.loadout, 'party')), feverActive: state.fever.active, feverMultiplier: state.fever.active ? Number(c.companionFeverMultiplier(state.monster.curveVersion ?? 10)) : 1 });
  const grow = state => {
    if (state.companions.length <= 5) return;
    const active = c.activeFieldCompanions(state.companions, state.monster.type, state.hero?.equipped, state.hero?.reincarnations ?? 0, state.monster.curveVersion ?? 10);
    const ids = new Set(active.map(companion => companion.id)), before = volley(state);
    let best = null;
    for (const target of active) for (const food of state.companions.filter(companion => !ids.has(companion.id))) {
      const action = { type: 'consume', targetId: target.id, foodId: food.id }, result = c.applyCollection(state, action);
      if ('error' in result) continue;
      const after = volley(state, result.state.companions), gain = after - before;
      if (!best || gain > best.gain || gain === best.gain && (Number(target.id.slice(1)) < Number(best.target.id.slice(1)) ||
        target.id === best.target.id && Number(food.id.slice(1)) < Number(best.food.id.slice(1)))) best = { action, target, food, gain, after,
          targetAfter: result.state.companions.find(companion => companion.id === target.id) };
    }
    if (best && apply(best.action)) growthActions.push({ atMs: now, cycle: cycles.length + 1, targetId: best.target.id, foodId: best.food.id,
      targetBefore: best.target, foodBefore: best.food, targetAfter: best.targetAfter, volleyBefore: String(before), volleyAfter: String(best.after), context: fieldContext(state) });
  };
  const shop = () => {
    let state = engine.getState(), eq = state.equipment;
    if (eq.bag.length === eq.capacity) apply({ type: 'equipmentExpand', revision: eq.revision });
    state = engine.getState(); eq = state.equipment;
    const attack = c.displayedHeroAttack(state), base = c.trainedHeroPower(c.heroAttackPower(state.level, state.souls, state.hero?.reincarnations), state.progress.trainingLevel);
    let best = null;
    for (const item of eq.shop.stock) {
      if (eq.shop.boughtIds.includes(item.id) || !c.canEquip(item, state.hero?.equipped.formId ?? 'h00', state.level)) continue;
      const price = BigInt(c.equipmentTemplate(item.templateId).price); if (price > state.coins) continue;
      const trial = c.copyEquipment(eq); c.acquireEquipment(trial, { ...item }, state.hero?.equipped.formId ?? 'h00', state.level, undefined, base);
      if (eq.temporary.some(old => !c.equipmentItems(trial).some(entry => entry.id === old.id))) continue;
      const gain = c.loadoutAttack(base, trial.loadout) - attack; if (gain <= 0n) continue;
      if (!best || gain * best.price > best.gain * price || gain * best.price === best.gain * price && (price < best.price || price === best.price && item.id < best.item.id)) best = { item, price, gain };
    }
    if (best && apply({ type: 'equipmentBuy', itemId: best.item.id, shopSerial: eq.shop.serial, revision: eq.revision })) {
      purchases++; firstPurchaseMs ??= now;
    }
    state = engine.getState(); eq = state.equipment;
    const weapon = eq.loadout.weapon;
    if (weapon && BigInt(weapon.enhancement) < 5n && apply({ type: 'equipmentEnhance', itemId: weapon.id, revision: eq.revision })) enhancements++;
    state = engine.getState(); eq = state.equipment;
    const kept = new Set();
    for (const item of eq.bag) {
      if (!kept.has(item.templateId)) { kept.add(item.templateId); continue; }
      if (apply({ type: 'equipmentSell', itemId: item.id, revision: engine.getState().equipment.revision })) sales += c.sellPrice(item);
    }
  };
  while (now < maxHours * 3600000 && (policy === 'no-reset' || cycles.length < cyclesWanted)) {
    if (cyclesWanted > 3 && cycles.length < 3 && now >= 18 * 3600000) break;
    engine.beginEquipmentBatch();
    const active = profile !== 'idle' || now < 120000;
    const interval = profile === 'high' ? 125 : 500;
    while (nextInput <= now) {
      if (active && (profile !== 'intermittent' || nextInput % 60000 < 15000)) measure(engine.attack('keyboard'), now < feverUntil ? 'active' : 'inactive');
      nextInput += interval;
    }
    const remainingFeverMs = Math.max(0, feverUntil - now); feverActiveMs += Math.min(tickMs, remainingFeverMs);
    measure(engine.tick(tickMs), remainingFeverMs > tickMs ? 'active' : remainingFeverMs > 0 ? 'boundary' : 'inactive'); now += tickMs;
    if (now % 5000 === 0) {
      let state = engine.getState(); maximumStage = Math.max(maximumStage, state.monster.index);
      if (policy !== 'no-reset' && c.heroReady(state.level, state.hero)) {
        firstReadyMs ??= now;
        if (!state.hero?.choices.length) apply({ type: 'heroOffer' });
        state = engine.getState();
        const choice = state.hero?.choices[0];
        if (choice && apply({ type: 'heroChoose', formId: choice.formId, offerSerial: state.hero.offerSerial,
          equipmentConfirmation: c.heroChangeWarning(state.equipment, choice.formId, state.hero.offerSerial) })) {
          const after = engine.getState();
          cycles.push({ number: after.hero.reincarnations, readyAtMs: firstReadyMs, acceptedAtMs: now, intervalMs: now - previousAccepted,
            level: state.level, stage: state.monster.index, souls: after.souls, companions: after.companions.length,
            kills: state.killCount, gold: String(state.coins), spent: String(state.progress.goldSpent), heroKills, companionKills, damage: damageMetrics(), field: fieldContext(state), levelTimesMs: cycleLevelTimes });
          previousAccepted = now; cycleLevelTimes = {}; firstReadyMs = null; nextCheckpoint = now + 1800000;
        }
      } else if (policy === 'growth' || policy === 'reserve-growth' && state.companions.length === c.ROSTER_CAP) { grow(state);
      } else if ((profile === 'management' || policy === 'no-reset') && state.companions.length === c.ROSTER_CAP && state.monster.boss) {
        const weakest = [...state.companions].sort((a, b) => {
          const difference = c.companionPower(a) - c.companionPower(b);
          return difference < 0n ? -1 : difference > 0n ? 1 : Number(a.id.slice(1)) - Number(b.id.slice(1));
        })[0];
        if (c.companionPower({ id: 'visible-boss', speciesId: state.monster.speciesId, bossIndex: state.monster.index, level: 1, stars: 0 }) > c.companionPower(weakest) && apply({ type: 'sacrifice', id: weakest.id })) {
          managementReleases++;
          if (policy === 'no-reset') {
            const after = engine.getState();
            noResetActions.push({ atMs: now, targetBefore: weakest, context: { companions: state.companions,
              monsterIndex: state.monster.index, monsterBoss: state.monster.boss, monsterSpeciesId: state.monster.speciesId,
              heroReincarnations: state.hero?.reincarnations ?? 0, souls: state.souls }, after: { companions: after.companions, souls: after.souls } });
          }
        }
      } else if ((profile === 'soul-farming' || policy === 'finite-soul-farm' && soulRecoveries < 50) && state.monster.index >= c.REBIRTH_MIN_INDEX) {
        const before = engine.toSave(); const action = { type: 'rebirth', equipmentConfirmation: c.heroChangeWarning(state.equipment, state.hero?.equipped.formId ?? 'h00') };
        if (apply(action)) { soulRecoveries++; finiteSoulFarmActions.push({ atMs: now, action, before, after: engine.toSave() }); }
      }
      engine.refreshShop(now);
      if (now % 30000 === 0 && profile !== 'idle') shop();
      state = engine.getState();
      if (state.equipment.loadout.weapon) { equippedWeaponMs += 5000; firstEquippedWeaponMs ??= now; }
      if (c.equipmentBonus(state.equipment.loadout, 'party') > 0n) firstPartyBonusMs ??= now;
      if (now >= nextCheckpoint) {
        checkpoints.push({ cycle: cycles.length + 1, elapsedMs: now - previousAccepted, kills: state.killCount, stage: state.monster.index,
          level: state.level, monsterHp: String(state.monsterHp), monsterMaxHp: String(state.monster.maxHp), gold: String(state.coins), spent: String(state.progress.goldSpent), souls: state.souls, roster: state.companions.length,
          attack: String(c.displayedHeroAttack(state)), heroKills, companionKills, damage: damageMetrics(), field: fieldContext(state), weaponId: state.equipment.loadout.weapon?.id ?? null });
        nextCheckpoint += 1800000; sampledHeapPeakBytes = Math.max(sampledHeapPeakBytes, process.memoryUsage().heapUsed);
      }
      const items = c.equipmentItems(state.equipment), ids = items.map(item => item.id);
      assert(new Set(ids).size === ids.length, 'Duplicate equipment UID');
      assert(c.equippedItems(state.equipment).every(item => c.canEquip(item, state.hero?.equipped.formId ?? 'h00', state.level)), 'Invalid loadout');
      assert(state.coins >= 0n && state.coins === initialCoins + income + sales - state.progress.goldSpent, 'Currency conservation');
    }
    engine.endEquipmentBatch();
  }
  const state = engine.getState();
  const serializationStart = performance.now(), serialized = c.serializeSave(engine.toSave());
  const serializationMs = performance.now() - serializationStart;
  return { profile, seed, cyclesWanted, cycles, durationMs: now, nonarrival: cyclesWanted - cycles.length, firstCompanionMs,
    final: { level: state.level, stage: state.monster.index, kills: state.killCount, souls: state.souls, companions: state.companions.length, coins: String(state.coins), spent: String(state.progress.goldSpent), income: String(income), sales: String(sales) },
    finiteSoulFarmActions, finalHeroReincarnations: state.hero?.reincarnations ?? 0, heroOffers, heroChoices, noResetActions, noResetActionsSha256: sha(json(noResetActions)),
    growthConsumes: growthActions.length, growthActions, growthActionsSha256: sha(json(growthActions)), damage: damageMetrics(), purchases, enhancements, soulRecoveries, managementReleases, maximumStage, maxCapturedIndex, maxCapturedRawPowerDigits, firstPurchaseMs, firstEquippedWeaponMs, firstPartyBonusMs, firstLevels, equippedWeaponMs, heroKills, companionKills, checkpoints,
    sampledHeapPeakBytes, serializationMs, saveBytes: Buffer.byteLength(serialized), maxCompanionBossIndex: Math.max(0, ...state.companions.map(companion => companion.bossIndex)),
    longestKillGapMs: Math.max(longestKillGap, now - lastKill), longestKillGapContext: now - lastKill > longestKillGap ? { durationMs: now - lastKill, fromMs: lastKill, toMs: now, cycle: cycles.length + 1, stage: state.monster.index, boss: state.monster.boss, censored: true } : longestKillGapContext, processingMs: performance.now() - started,
    saveHash: sha(serialized) };
}
export function summarize(rows, protocol, cyclesWanted) {
  const quantile = (values, p) => { const sorted = [...values].sort((a, b) => a - b), value = sorted[Math.floor((sorted.length - 1) * p)]; return Number.isFinite(value) ? value : null; };
  const summaries = [], checks = [];
  for (const profile of [...new Set(rows.map(row => row.profile))]) for (let cycle = 1; cycle <= cyclesWanted; cycle++) {
    const group = rows.filter(row => row.profile === profile && row.cyclesWanted >= cycle);
    if (!group.length) continue;
    const values = group.map(row => row.cycles[cycle - 1]?.intervalMs / 60000 || Infinity);
    const q = { p10: quantile(values, .1), p50: quantile(values, .5), p90: quantile(values, .9) };
    const entry = { profile, cycle, n: group.length, arrived: values.filter(Number.isFinite).length, nonarrival: values.filter(value => !Number.isFinite(value)).length, ...q };
    summaries.push(entry);
    if (protocol.ordinaryProfiles.includes(profile)) {
      const gate = cycle <= 3 ? protocol.gates.ordinaryFirstThreeMinutes : protocol.gates.ordinaryLaterMinutes;
      const passed = q.p50 !== null && q.p50 >= gate.p50Minimum && q.p50 <= gate.p50Maximum &&
        (cycle > 3 || q.p10 !== null && q.p10 >= gate.p10Minimum && q.p90 !== null && q.p90 <= gate.p90Maximum);
      checks.push({ profile, cycle, passed });
    } else if (profile === 'high' && cycle <= 3) checks.push({ profile, cycle,
      passed: q.p10 !== null && q.p10 >= protocol.gates.highFirstThreeMinutes.p10Minimum && entry.arrived / entry.n >= protocol.gates.highFirstThreeMinutes.minimumArrivalFraction });
  }
  const ordinary = summaries.filter(entry => protocol.ordinaryProfiles.includes(entry.profile));
  return { summaries, checks, passed: checks.length > 0 && checks.every(check => check.passed),
    score: { maximumMedianDeviation: Math.max(...ordinary.map(entry => entry.p50 === null ? Infinity : Math.abs(entry.p50 - 240))), maximumP90: Math.max(...ordinary.map(entry => entry.p90 ?? Infinity)) }, humanFun: false };
}
async function main() {
  const [mode, destination, argument] = process.argv.slice(2);
  if (mode === 'worker') {
    const job = JSON.parse(argument), c = require(resolve(destination, 'compiled-' + job.candidate.id, 'index.js'));
    for (let i = 0; i < job.count; i++) appendFileSync(job.output, JSON.stringify(simulate(c, job.profile, job.first + i, job.cycles, job.maxHours, undefined, job.policy)) + '\n');
    return;
  }
  assert(['explore', 'validate', 'pilot', 'profile', 'screen', 'management', 'growth', 'growth-screen', 'reserve-growth', 'no-reset'].includes(mode), 'Use explore|validate|pilot|profile|screen|management|growth|growth-screen|reserve-growth|no-reset RUN [candidateID]');
  const run = resolve(destination), protocol = read(protocolPath), registration = read(candidatesPath), before = binding();
  assert(JSON.stringify(protocol.simulation) === JSON.stringify({ tickMs: 500, highTickMs: 100, decisionMs: 5000, shopVisitMs: 30000, firstCycleMaxHours: 12, firstThreeMaxHours: 18, tenCyclesMaxHours: 60, workers: 2 }), 'Evaluator rates/horizons must match the registered protocol');
  assert(!existsSync(resolve(run, 'binding.json')), 'A new immutable run directory is required');
  mkdirSync(run, { recursive: true });
  writeFileSync(resolve(run, 'binding.json'), json(before));
  writeFileSync(resolve(run, 'protocol.json'), json(protocol));
  writeFileSync(resolve(run, 'candidates.json'), json(registration));
  writeFileSync(resolve(run, 'protocol.registered.json'), readFileSync(protocolPath));
  writeFileSync(resolve(run, 'candidates.registered.json'), readFileSync(candidatesPath));
  const sourceDirectory = resolve(run, 'source-core'); mkdirSync(sourceDirectory);
  for (const file of Object.keys(before.files)) writeFileSync(resolve(sourceDirectory, file), readFileSync(resolve(root, 'src/core', file)));
  if (mode === 'pilot' || mode === 'profile') {
    const candidate = registration.candidates[0], directory = resolve(run, 'compiled-' + candidate.id); compile(directory, candidate, sourceDirectory);
    const c = require(resolve(directory, 'index.js')), rows = [];
    if (mode === 'profile') rows.push(simulate(c, 'ordinary', protocol.explorationSeeds.first, registration.cycles, registration.maxHours));
    else for (const profile of ['ordinary', 'intermittent']) {
      const a = simulate(c, profile, protocol.explorationSeeds.first, 1, .25, 100), b = simulate(c, profile, protocol.explorationSeeds.first, 1, .25, 500);
      assert(a.saveHash === b.saveHash, '100/500ms cadence mismatch: ' + profile); rows.push(b);
    }
    const after = binding(); assert(JSON.stringify(before) === JSON.stringify(after), 'Pilot source changed');
    writeFileSync(resolve(run, mode + '.json'), json({ ...(mode === 'pilot' ? { cadenceEqual: true } : {}), rows, binding: before, after })); return;
  }
  const selected = mode === 'validate' || mode === 'management' || mode === 'growth' || mode === 'reserve-growth' || mode === 'no-reset' ? registration.candidates.filter(candidate => candidate.id === argument) : registration.candidates;
  assert(selected.length && (mode !== 'validate' || registration.selected === argument), 'Validation requires a preregistered selected candidate');
  const reports = [];
  for (const candidate of selected) {
    const directory = resolve(run, 'compiled-' + candidate.id); compile(directory, candidate, sourceDirectory);
    const queue = [], outputs = [];
    if (mode === 'explore' || mode === 'screen') for (const profile of registration.profiles) queue.push({ candidate, profile, ...protocol.explorationSeeds, ...(mode === 'screen' ? { count: 1 } : {}), cycles: mode === 'screen' ? 3 : registration.profileCycles?.[profile] ?? registration.cycles, maxHours: mode === 'screen' ? 18 : registration.maxHours });
    else if (mode === 'growth' || mode === 'growth-screen') for (const profile of protocol.growth.profiles) queue.push({ candidate, profile, ...protocol.explorationSeeds, policy: 'growth', ...(mode === 'growth-screen' ? { count: 1 } : {}), cycles: mode === 'growth-screen' ? 3 : protocol.growth.profileCycles[profile], maxHours: mode === 'growth-screen' || profile === 'high' ? 18 : 60 });
    else if (mode === 'reserve-growth') queue.push({ candidate, profile: protocol.reserveGrowth.profile, ...protocol.reserveGrowth.seeds, policy: 'reserve-growth', cycles: protocol.reserveGrowth.cycles, maxHours: protocol.reserveGrowth.maxHours });
    else if (mode === 'no-reset') queue.push({ candidate, profile: protocol.noReset.profile, ...protocol.noReset.seeds, policy: 'no-reset', cycles: 0, maxHours: protocol.noReset.durationHours });
    else if (mode === 'management') queue.push({ candidate, profile: 'management', ...protocol.explorationSeeds, cycles: 10, maxHours: 60 });
    else {
      for (const profile of protocol.ordinaryProfiles) {
        queue.push({ candidate, profile, ...protocol.continuationSeeds, cycles: 10, maxHours: protocol.simulation.tenCyclesMaxHours });
        queue.push({ candidate, profile, first: protocol.heldOutSeeds.first + protocol.continuationSeeds.count, count: protocol.heldOutSeeds.count - protocol.continuationSeeds.count, cycles: 3, maxHours: protocol.simulation.firstThreeMaxHours });
      }
      for (const profile of protocol.stressProfiles) queue.push({ candidate, profile, first: protocol.heldOutSeeds.first, count: 20, cycles: 3, maxHours: protocol.simulation.firstThreeMaxHours });
    }
    await Promise.all(Array.from({ length: protocol.simulation.workers }, async () => {
      while (queue.length) {
        const job = queue.shift(); job.output = resolve(run, `${candidate.id}-${job.profile}-${job.cycles}.jsonl`); outputs.push(job.output);
        assert(!existsSync(job.output), 'Refuse to overwrite raw evidence');
        await new Promise((yes, no) => { const child = spawn(process.execPath, [script, 'worker', run, JSON.stringify(job)], { stdio: ['ignore', 'inherit', 'inherit'] });
          child.on('error', no); child.on('exit', code => code === 0 ? yes() : no(Error('Balance worker exit ' + code))); });
        process.stdout.write(`${candidate.id} ${job.profile}: ${job.count} trajectories through ${job.cycles} cycles\n`);
      }
    }));
    const rows = outputs.flatMap(file => readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)));
    const compiledFiles = Object.fromEntries(readdirSync(directory).sort().map(file => [file, sha(readFileSync(resolve(directory, file)))]));
    reports.push({ candidate, compiledFiles, rows: rows.length, raw: outputs.map(file => ({ path: file, sha256: sha(readFileSync(file)) })), ...summarize(rows, protocol, mode === 'no-reset' ? 0 : mode === 'validate' || mode === 'management' || mode === 'growth' || mode === 'reserve-growth' ? 10 : mode === 'screen' || mode === 'growth-screen' ? 3 : registration.cycles) });
    if (mode === 'growth' || mode === 'growth-screen') {
      reports.at(-1).growthChecks = reports.at(-1).summaries.map(entry => ({ profile: entry.profile, cycle: entry.cycle, n: entry.n, arrived: entry.arrived, nonarrival: entry.nonarrival, p10: entry.p10, passed: entry.p10 !== null && entry.p10 >= protocol.growth.p10Minimum }));
      reports.at(-1).growthPassed = reports.at(-1).growthChecks.every(check => check.passed);
    }
    if (mode === 'reserve-growth') {
      reports.at(-1).reserveGrowthChecks = reports.at(-1).summaries.map(entry => ({ profile: entry.profile, cycle: entry.cycle, n: entry.n, arrived: entry.arrived, nonarrival: entry.nonarrival, p10: entry.p10, passed: entry.p10 !== null && entry.p10 >= protocol.reserveGrowth.p10Minimum }));
      reports.at(-1).reserveGrowthPassed = reports.at(-1).reserveGrowthChecks.every(check => check.passed);
    }
    writeFileSync(resolve(run, candidate.id + '-report.json'), json(reports.at(-1)));
  }
  const after = binding(); assert(JSON.stringify(before) === JSON.stringify(after), 'Source or protocol changed during run; evidence is stale');
  writeFileSync(resolve(run, 'report.json'), json({ mode, ...(['management', 'growth', 'growth-screen', 'reserve-growth', 'no-reset'].includes(mode) ? { diagnostic: true } : {}), binding: before, after, reports, completedAt: new Date().toISOString() }));
}
if (process.argv[1] && resolve(process.argv[1]) === script) await main();
