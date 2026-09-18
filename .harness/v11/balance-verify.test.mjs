import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { verifySchedule, verifyManagementSchedule, verifyManagementBinding, recompute,
  verifyGrowthSchedule, verifyReserveGrowthSchedule, verifyGrowthActions, verifyGrowthBinding, recomputeGrowthChecks,
  verifyNoResetSchedule, verifyNoResetActions, verifyNoResetBinding,
  verifyFreshHeldout, verifyFiniteFarmSchedule, verifyFiniteFarmActions, recomputeFiniteFarmChecks, verifyFiniteFarmBinding, verifyFieldCounters,
  verifyParameterScope, progressionParameters, PARAMETER_BASELINES } from './balance-verify.mjs';

const protocol = JSON.parse(readFileSync(new URL('../../docs/v0.11/EVALUATION_PROTOCOL.json', import.meta.url), 'utf8'));
function censoredRows() {
  const rows = [];
  for (const profile of [...protocol.ordinaryProfiles, ...protocol.stressProfiles]) {
    const ordinary = protocol.ordinaryProfiles.includes(profile), count = ordinary ? 100 : 20;
    for (let index = 0; index < count; index++) {
      const cyclesWanted = ordinary && index < 20 ? 10 : 3;
      rows.push({ profile, seed: protocol.heldOutSeeds.first + index, cyclesWanted, cycles: [], nonarrival: cyclesWanted,
        durationMs: 18 * 3600000, final: { coins: profile === 'wealthy' ? '1000000' : '0', income: '0', sales: '0', spent: '0' } });
    }
  }
  return rows;
}
test('censored ordinary and stress trajectories must finish their registered exposure', () => {
  const rows = censoredRows();
  assert.equal(verifySchedule(rows, protocol), true);
  rows.find(row => row.profile === 'idle').durationMs = 1;
  assert.throws(() => verifySchedule(rows, protocol), /scheduled exposure/);
});
test('ten-cycle continuations may stop at18h only when first three cycles failed', () => {
  const rows = censoredRows(), row = rows[0];
  row.cycles = [1, 2, 3].map(number => ({ number, readyAtMs: number * 4 * 3600000, acceptedAtMs: number * 4 * 3600000, intervalMs: 4 * 3600000 }));
  row.nonarrival = 7;
  assert.throws(() => verifySchedule(rows, protocol), /scheduled exposure/);
  row.durationMs = 60 * 3600000;
  assert.equal(verifySchedule(rows, protocol), true);
});

function managementFixture() {
  const registered = { ...structuredClone(protocol), management: { profile: 'management',
    seeds: { first: protocol.explorationSeeds.first, count: 20 }, cycles: 10, maxHours: 60, firstThreeMaxHours: 18,
    decisionMs: 5000, releasePolicy: 'full-roster-visible-boss-stronger-than-raw-weakest',
    weakestOrder: ['raw-companion-power', 'numeric-id'], heroReadyFirst: true } };
  const rows = Array.from({ length: 20 }, (_, index) => ({ profile: 'management', seed: registered.explorationSeeds.first + index,
    cyclesWanted: 10, cycles: [], nonarrival: 10, durationMs: 18 * 3600000,
    managementReleases: 7, maximumStage: 199, maxCapturedIndex: 191, maxCapturedRawPowerDigits: 11,
    purchases: 3, enhancements: 0, soulRecoveries: 0,
    final: { stage: 175, souls: 7, coins: '70', income: '100', sales: '20', spent: '50' } }));
  return { protocol: registered, rows };
}
test('management keeps its20 exploration seeds separate from the280 heldout schedule and pacing verdict', () => {
  const f = managementFixture();
  assert.equal(verifyManagementSchedule(f.rows, f.protocol), true);
  assert.equal(censoredRows().length, 280);
  assert.equal(verifySchedule(censoredRows(), f.protocol), true);
  assert.throws(() => verifySchedule([...censoredRows(), ...f.rows], f.protocol), /trajectory count/);
  assert.throws(() => verifyManagementSchedule(censoredRows(), f.protocol), /denominator/);
  const computed = recompute(f.rows, f.protocol);
  assert.equal(computed.summaries.length, 10);
  assert.deepEqual(computed.checks, []);
  assert.equal(computed.passed, false);
});
test('management rejects shortened/corrupt schedules, changed policy, and inconsistent reward telemetry', () => {
  for (const mutate of [
    f => f.rows.pop(),
    f => { f.rows[0].seed = f.rows[1].seed; },
    f => { f.rows[0].seed = f.protocol.heldOutSeeds.first; },
    f => { f.rows[0].profile = 'ordinary'; },
    f => { f.rows[0].cyclesWanted = 3; },
    f => { f.rows[0].durationMs = 1; },
    f => { f.protocol.management.decisionMs = 1000; },
    f => { f.protocol.management.heroReadyFirst = false; },
    f => { f.protocol.management.weakestOrder.reverse(); },
    f => { f.protocol.management.seeds.count = 19; },
    f => { f.protocol.simulation.tenCyclesMaxHours = 18; },
    f => { f.rows[0].managementReleases = -1; },
    f => { f.rows[0].maxCapturedRawPowerDigits = 0; },
    f => { f.rows[0].maxCapturedIndex = 200; },
    f => { f.rows[0].final.stage = 200; },
    f => { f.rows[0].final.souls = 0.5; },
    f => { f.rows[0].soulRecoveries = 1; },
    f => { f.rows[0].final.coins = '71'; },
  ]) {
    const f = managementFixture(); mutate(f);
    assert.throws(() => verifyManagementSchedule(f.rows, f.protocol));
  }
  const f = managementFixture(), row = f.rows[0];
  row.cycles = [1, 2, 3].map(number => ({ number, readyAtMs: number * 4 * 3600000,
    acceptedAtMs: number * 4 * 3600000, intervalMs: 4 * 3600000 }));
  row.nonarrival = 7;
  assert.throws(() => verifyManagementSchedule(f.rows, f.protocol), /scheduled exposure/);
  row.durationMs = 60 * 3600000;
  assert.equal(verifyManagementSchedule(f.rows, f.protocol), true);
  row.cycles[1].intervalMs++;
  assert.throws(() => verifyManagementSchedule(f.rows, f.protocol), /cycle interval/);
});
test('management cannot substitute another candidate, evaluator, compiled artifact, or pacing pass', () => {
  const result = { candidate: { id: 'R8-A', parameters: { fieldCompanionTailPolynomial: 1 } },
    compiledFiles: { 'collection.js': 'abc' }, rows: 20, passed: false, checks: [], humanFun: false };
  const validation = { protocol: managementFixture().protocol, report: { binding: { scriptHash: 'evaluator' }, reports: [result] } };
  const management = { ...structuredClone(validation), report: { ...structuredClone(validation.report), mode: 'management', diagnostic: true } };
  assert.equal(verifyManagementBinding(management, validation, 'R8-A'), true);
  for (const mutate of [
    f => { f.report.mode = 'explore'; },
    f => { delete f.report.diagnostic; },
    f => { f.report.reports.push(structuredClone(result)); },
    f => { f.protocol.management.decisionMs++; },
    f => { f.report.binding.scriptHash = 'different evaluator'; },
    f => { f.report.reports[0].candidate.id = 'R8-B'; },
    f => { f.report.reports[0].candidate.parameters.fieldCompanionTailPolynomial = 2; },
    f => { f.report.reports[0].compiledFiles['collection.js'] = 'different code'; },
    f => { f.report.reports[0].rows = 19; },
    f => { f.report.reports[0].passed = true; },
    f => { f.report.reports[0].humanFun = true; },
    f => { f.report.reports[0].checks = [{ passed: true }]; },
  ]) {
    const changed = structuredClone(management); mutate(changed);
    assert.throws(() => verifyManagementBinding(changed, validation, 'R8-A'));
  }
});

function growthFixture() {
  const registered = { ...structuredClone(protocol), growth: { profiles: ['ordinary', 'intermittent', 'high'],
    seeds: { first: protocol.explorationSeeds.first, count: 20 }, cycles: 10,
    profileCycles: { ordinary: 10, intermittent: 10, high: 3 }, maxHours: 60, firstThreeMaxHours: 18,
    highMaxHours: 18, decisionMs: 5000, p10Minimum: 120, policy: 'maximum-next-volley-consume-gain', target: 'active-five',
    food: 'inactive', tieBreak: ['target-numeric-id', 'food-numeric-id'], minimumRoster: 5, heroReadyFirst: true, futureInformation: false } };
  const rows = registered.growth.profiles.flatMap(profile => Array.from({ length: 20 }, (_, index) => {
    const cyclesWanted = profile === 'high' ? 3 : 10;
    return { profile, seed: registered.explorationSeeds.first + index, cyclesWanted, nonarrival: 0, durationMs: cyclesWanted * 240 * 60000,
      cycles: Array.from({ length: cyclesWanted }, (_, i) => ({ number: i + 1, readyAtMs: (i + 1) * 240 * 60000,
        acceptedAtMs: (i + 1) * 240 * 60000, intervalMs: 240 * 60000 })), final: { coins: '0', income: '0', sales: '0', spent: '0' } };
  }));
  return { protocol: registered, rows };
}
test('growth diagnostic retains60 trajectories and23 guards including later cycles without replacing heldout', () => {
  const f = growthFixture();
  assert.equal(verifyGrowthSchedule(f.rows, f.protocol), true);
  const checks = recomputeGrowthChecks(f.rows, f.protocol);
  assert.equal(checks.length, 23); assert(checks.every(check => check.n === 20 && check.passed));
  // Two early cycle9 arrivals establish p10=62 with the unconditional20-seed denominator.
  for (const row of f.rows.slice(0, 2)) {
    row.cycles[8].intervalMs = 62 * 60000;
    for (const cycle of row.cycles.slice(8)) { cycle.readyAtMs -= 178 * 60000; cycle.acceptedAtMs -= 178 * 60000; }
  }
  assert.equal(verifyGrowthSchedule(f.rows, f.protocol), true);
  const later = recomputeGrowthChecks(f.rows, f.protocol).find(check => check.profile === 'ordinary' && check.cycle === 9);
  assert.equal(later.p10, 62); assert.equal(later.passed, false);
  assert.throws(() => verifySchedule([...censoredRows(), ...f.rows], f.protocol), /trajectory count/);
});
test('growth censored rows remain in every scheduled quantile and never turn null into a pass', () => {
  const f = growthFixture();
  for (const row of f.rows) { row.cycles = []; row.nonarrival = row.cyclesWanted; row.durationMs = 18 * 3600000; }
  assert.equal(verifyGrowthSchedule(f.rows, f.protocol), true);
  assert(recomputeGrowthChecks(f.rows, f.protocol).every(check => check.n === 20 && check.nonarrival === 20 && check.p10 === null && !check.passed));
  f.rows[0].durationMs--;
  assert.throws(() => verifyGrowthSchedule(f.rows, f.protocol), /scheduled exposure/);
  for (const mutate of [
    x => x.rows.pop(), x => { x.rows[0].seed = x.rows[1].seed; },
    x => { x.rows[0].cyclesWanted = 3; }, x => { x.protocol.growth.profileCycles.ordinary = 3; },
    x => { x.protocol.growth.p10Minimum = 119; }, x => { x.protocol.growth.tieBreak.reverse(); },
    x => { x.protocol.growth.futureInformation = true; },
  ]) { const changed = growthFixture(); mutate(changed); assert.throws(() => verifyGrowthSchedule(changed.rows, changed.protocol)); }
});

const growthCore = {
  isSpeciesId: id => id === 'slime', typeOf: () => 'water',
  fieldCompanionPower: item => BigInt(item.bossIndex * item.level),
  heroBuffedPower: power => power, effectivePower: power => power,
  activeFieldCompanions: roster => [...roster].sort((a, b) => b.bossIndex * b.level - a.bossIndex * a.level || Number(a.id.slice(1)) - Number(b.id.slice(1))).slice(0, 5),
};
function hashActions(row) {
  row.growthConsumes = row.growthActions.length;
  row.growthActionsSha256 = createHash('sha256').update(JSON.stringify(row.growthActions, null, 2)).digest('hex');
  return row;
}
function growthActionFixture() {
  const companions = Array.from({ length: 6 }, (_, i) => ({ id: 'c' + (i + 1), speciesId: 'slime', bossIndex: i + 1, level: 1, stars: 0 }));
  const first = { atMs: 5000, cycle: 1, targetId: 'c6', foodId: 'c1', targetBefore: { ...companions[5] }, foodBefore: { ...companions[0] },
    targetAfter: { ...companions[5], level: 2 }, volleyBefore: '20', volleyAfter: '26', context: { companions, heroEquipped: null,
      acceptedHeroCount: 0, enemyType: 'water', curveVersion: 11, partyBonusBps: '0', feverMultiplier: 1 } };
  const secondRoster = companions.slice(1).map(c => c.id === 'c6' ? first.targetAfter : c);
  secondRoster.push({ id: 'c7', speciesId: 'slime', bossIndex: 8, level: 1, stars: 0 });
  const second = { atMs: 10000, cycle: 1, targetId: 'c7', foodId: 'c2', targetBefore: { ...secondRoster[5] }, foodBefore: { ...secondRoster[0] },
    targetAfter: { ...secondRoster[5], level: 2 }, volleyBefore: '32', volleyAfter: '40', context: { ...first.context, companions: secondRoster } };
  return hashActions({ ...growthFixture().rows[0], growthActions: [first, second] });
}
test('growth actions independently enumerate actual volley gains, preserve owned stats and follow capture/consume continuity', () => {
  const row = growthActionFixture();
  assert.equal(verifyGrowthActions(row, growthCore), true);
  for (const mutate of [
    r => { r.growthActions[0].targetId = 'c5'; }, r => { r.growthActions[0].foodId = 'c2'; },
    r => { r.growthActions[0].volleyAfter = '27'; }, r => { r.growthActions[0].targetAfter.stars = 1; },
    r => { r.growthActions[0].targetBefore.level = 7; }, r => { r.growthActions[0].atMs = 1000; },
    r => { r.growthActions[1].atMs = 5000; }, r => { r.growthActions[0].cycle = 2; },
    r => { r.growthActions[0].context.acceptedHeroCount = 1; }, r => { r.growthActions[0].context.feverMultiplier = 2; },
    r => { r.growthActions[0].context.partyBonusBps = '-1'; },
    r => { r.growthActions[1].context.companions.find(c => c.id === 'c3').level = 8; },
    r => { r.growthActions[1].context.companions = r.growthActions[1].context.companions.filter(c => c.id !== 'c3'); },
    r => { r.growthActions[1].context.companions.at(-1).id = 'c1'; },
    r => { r.cycles[0].acceptedAtMs = 5000; },
  ]) {
    const changed = growthActionFixture(); mutate(changed); hashActions(changed);
    assert.throws(() => verifyGrowthActions(changed, growthCore));
  }
  const changed = growthActionFixture(); changed.growthActions[0].volleyAfter = '900';
  assert.throws(() => verifyGrowthActions(changed, growthCore), /receipt mismatch/);
});
test('growth accepts zero marginal gain only with the registered target/food tie break', () => {
  const row = growthActionFixture(); row.growthActions = row.growthActions.slice(0, 1);
  const core = { ...growthCore, fieldCompanionPower: () => 1n, activeFieldCompanions: roster => roster.slice(0, 5) };
  const action = row.growthActions[0];
  Object.assign(action, { targetId: 'c1', foodId: 'c6', targetBefore: { ...action.context.companions[0] },
    foodBefore: { ...action.context.companions[5] }, targetAfter: { ...action.context.companions[0], level: 2 }, volleyBefore: '5', volleyAfter: '5' });
  assert.equal(verifyGrowthActions(hashActions(row), core), true);
  action.targetId = 'c2'; hashActions(row);
  assert.throws(() => verifyGrowthActions(row, core), /maximum legal volley gain/);
});
test('new growth receipts bind the active fever factor to the actual version-specific core helper', () => {
  const core = { ...growthCore, companionFeverMultiplier: version => version === 10 ? 3n : 2n };
  const active = growthActionFixture();
  for (const action of active.growthActions) {
    action.context.feverActive = true; action.context.feverMultiplier = 2;
    action.volleyBefore = String(BigInt(action.volleyBefore) * 2n);
    action.volleyAfter = String(BigInt(action.volleyAfter) * 2n);
  }
  assert.equal(verifyGrowthActions(hashActions(active), core), true);
  for (const mutate of [
    r => { r.growthActions[0].context.feverMultiplier = 3; },
    r => { r.growthActions[0].context.feverMultiplier = 1; },
    r => { r.growthActions[0].context.feverActive = false; },
    r => { delete r.growthActions[0].context.feverActive; },
  ]) { const row = structuredClone(active); mutate(row); assert.throws(() => verifyGrowthActions(hashActions(row), core), /Growth fever factor/); }
  const inactive = growthActionFixture();
  for (const action of inactive.growthActions) action.context.feverActive = false;
  assert.equal(verifyGrowthActions(hashActions(inactive), core), true);
  assert.throws(() => verifyGrowthActions(hashActions(active), growthCore), /archived growth fever/);
});
test('growth report binding cannot omit guards or substitute a different code/candidate', () => {
  const fixture = growthFixture(), result = { candidate: { id: 'R11-A', parameters: { fieldCompanionGrowthBonus: 25 } },
    compiledFiles: { 'collection.js': 'approved' }, rows: 60, humanFun: false, growthPassed: true, growthChecks: recomputeGrowthChecks(fixture.rows, fixture.protocol) };
  const validation = { protocol: fixture.protocol, report: { binding: { scriptHash: 'script' }, reports: [result] } };
  const growth = { ...structuredClone(validation), report: { ...structuredClone(validation.report), mode: 'growth', diagnostic: true } };
  assert.equal(verifyGrowthBinding(growth, validation, 'R11-A'), true);
  for (const mutate of [
    f => { f.report.diagnostic = false; }, f => { f.report.reports[0].rows = 59; },
    f => { f.report.reports[0].growthPassed = false; }, f => { f.report.reports[0].growthChecks.pop(); },
    f => { f.report.reports[0].growthChecks[0].passed = false; },
    f => { f.report.reports[0].candidate.parameters.fieldCompanionGrowthBonus = 100; },
    f => { f.report.reports[0].compiledFiles['collection.js'] = 'other'; },
    f => { f.report.binding.scriptHash = 'other'; },
  ]) { const changed = structuredClone(growth); mutate(changed); assert.throws(() => verifyGrowthBinding(changed, validation, 'R11-A')); }
});

function reserveFixture() {
  const f = growthFixture();
  f.protocol.reserveGrowth = { profile: 'high', seeds: { first: f.protocol.explorationSeeds.first, count: 20 }, cycles: 10,
    maxHours: 60, firstThreeMaxHours: 18, decisionMs: 5000, p10Minimum: 120, trigger: 'full-roster', rosterCapacity: 30,
    policy: 'maximum-next-volley-consume-gain', target: 'active-five', food: 'inactive',
    tieBreak: ['target-numeric-id', 'food-numeric-id'], minimumRoster: 29, heroReadyFirst: true, futureInformation: false };
  f.rows = f.rows.slice(0, 20).map(row => hashActions({ ...row, profile: 'high', growthActions: [] }));
  return f;
}
test('reserve growth keeps20 high-input ten-cycle trajectories separate and usesp10 rather than a single minimum', () => {
  const f = reserveFixture();
  assert.equal(verifyReserveGrowthSchedule(f.rows, f.protocol), true);
  assert.equal(recomputeGrowthChecks(f.rows, f.protocol).length, 10);
  const lowerEighth = row => {
    const reduction = 240 * 60000 - 7195000;
    row.cycles[7].intervalMs = 7195000;
    for (const cycle of row.cycles.slice(7)) { cycle.readyAtMs -= reduction; cycle.acceptedAtMs -= reduction; }
  };
  lowerEighth(f.rows[0]);
  assert.equal(verifyReserveGrowthSchedule(f.rows, f.protocol), true);
  // One119m55s result does not establish failure of the registered20-seedp10.
  assert(recomputeGrowthChecks(f.rows, f.protocol).every(check => check.passed));
  lowerEighth(f.rows[1]);
  const eighth = recomputeGrowthChecks(f.rows, f.protocol).find(check => check.cycle === 8);
  assert.equal(eighth.n, 20); assert.equal(eighth.p10, 7195000 / 60000); assert.equal(eighth.passed, false);
  assert.throws(() => verifyGrowthSchedule(f.rows, f.protocol), /denominator/);
  assert.throws(() => verifySchedule([...censoredRows(), ...f.rows], f.protocol), /trajectory count/);
});
test('reserve growth rejects incomplete horizons, aggressive five-member consumption and altered registration', () => {
  for (const mutate of [
    f => f.rows.pop(), f => { f.rows[0].profile = 'ordinary'; }, f => { f.rows[0].seed = f.rows[1].seed; },
    f => { f.rows[0].cyclesWanted = 3; }, f => { f.protocol.reserveGrowth.minimumRoster = 5; },
    f => { f.protocol.reserveGrowth.p10Minimum = 119; }, f => { f.protocol.reserveGrowth.trigger = 'always'; },
    f => { f.rows[0].growthActions = [{ context: { companions: Array(29).fill(null) } }]; },
  ]) { const f = reserveFixture(); mutate(f); assert.throws(() => verifyReserveGrowthSchedule(f.rows, f.protocol)); }
  const f = reserveFixture();
  for (const row of f.rows) { row.cycles = []; row.nonarrival = 10; row.durationMs = 18 * 3600000; }
  assert.equal(verifyReserveGrowthSchedule(f.rows, f.protocol), true);
  assert(recomputeGrowthChecks(f.rows, f.protocol).every(check => check.n === 20 && check.nonarrival === 20 && !check.passed));
  f.rows[0].durationMs = 1;
  assert.throws(() => verifyReserveGrowthSchedule(f.rows, f.protocol), /scheduled exposure/);
});
test('reserve growth reuses real action checks and requires its own source-bound ten-group receipt', () => {
  const f = reserveFixture();
  const companions = Array.from({ length: 30 }, (_, i) => ({ id: 'c' + (i + 1), speciesId: 'slime', bossIndex: i + 1, level: 1, stars: 0 }));
  const action = growthActionFixture().growthActions[0];
  Object.assign(action, { targetId: 'c30', foodId: 'c1', targetBefore: { ...companions[29] }, foodBefore: { ...companions[0] },
    targetAfter: { ...companions[29], level: 2 }, volleyBefore: '140', volleyAfter: '170', context: { ...action.context, companions } });
  f.rows[0].growthActions = [action]; hashActions(f.rows[0]);
  assert.equal(verifyReserveGrowthSchedule(f.rows, f.protocol), true);
  assert.equal(verifyGrowthActions(f.rows[0], growthCore), true);
  const result = { candidate: { id: 'R15-A', parameters: { fieldCompanionBaseFloor: 14000 } }, compiledFiles: { 'collection.js': 'approved' },
    rows: 20, humanFun: false, reserveGrowthPassed: true, reserveGrowthChecks: recomputeGrowthChecks(f.rows, f.protocol) };
  const validation = { protocol: f.protocol, report: { binding: { scriptHash: 'script' }, reports: [result] } };
  const reserve = { ...structuredClone(validation), report: { ...structuredClone(validation.report), mode: 'reserve-growth', diagnostic: true } };
  assert.equal(verifyGrowthBinding(reserve, validation, 'R15-A', true), true);
  assert.throws(() => verifyGrowthBinding(reserve, validation, 'R15-A'), /Missing separate/);
  for (const mutate of [
    r => { r.report.reports[0].reserveGrowthChecks.pop(); }, r => { r.report.reports[0].reserveGrowthPassed = false; },
    r => { r.report.reports[0].rows = 60; }, r => { r.report.mode = 'growth'; },
    r => { r.report.reports[0].candidate.parameters.fieldCompanionBaseFloor = 10000; },
  ]) { const changed = structuredClone(reserve); mutate(changed); assert.throws(() => verifyGrowthBinding(changed, validation, 'R15-A', true)); }
});

function noResetFixture() {
  const f = reserveFixture();
  f.protocol.noReset = { profile: 'high', seeds: { first: f.protocol.explorationSeeds.first, count: 20 }, durationHours: 24,
    decisionMs: 5000, heroReset: false, releasePolicy: 'full-roster-visible-boss-stronger-than-raw-weakest',
    weakestOrder: ['raw-companion-power', 'numeric-id'], rosterCapacity: 30 };
  f.rows = f.rows.map(row => hashNoResetActions({ ...row, cyclesWanted: 0, cycles: [], nonarrival: 0, durationMs: 24 * 3600000,
    finalHeroReincarnations: 0, heroOffers: 0, heroChoices: 0, soulRecoveries: 0, maximumStage: 459, maxCapturedIndex: 447,
    maxCapturedRawPowerDigits: 28, longestKillGapMs: 1000, final: { ...row.final, stage: 459, souls: 0 }, noResetActions: [] }));
  return f;
}
function hashNoResetActions(row) {
  row.managementReleases = row.noResetActions.length;
  row.noResetActionsSha256 = createHash('sha256').update(JSON.stringify(row.noResetActions, null, 2)).digest('hex');
  return row;
}
function noResetActionFixture() {
  const row = noResetFixture().rows[0];
  const companions = Array.from({ length: 30 }, (_, i) => ({ id: 'c' + (i + 1), speciesId: 'slime', bossIndex: i + 1, level: 1, stars: 0 }));
  const first = { atMs: 5000, targetBefore: { ...companions[0] }, context: { companions, heroReincarnations: 0,
    monsterIndex: 39, monsterBoss: true, monsterSpeciesId: 'slime', souls: 0 }, after: { companions: companions.slice(1), souls: 1 } };
  const roster = [...first.after.companions, { id: 'c31', speciesId: 'slime', bossIndex: 39, level: 1, stars: 0 }];
  const second = { atMs: 10000, targetBefore: { ...roster[0] }, context: { ...first.context, companions: roster, monsterIndex: 47, souls: 1 },
    after: { companions: roster.slice(1), souls: 2 } };
  row.noResetActions = [first, second];
  return hashNoResetActions(row);
}
const noResetCore = { ...growthCore, isBoss: index => (index + 1) % 8 === 0,
  companionPower: item => BigInt(item.bossIndex * item.level) };
test('no-reset retains20 complete24-hour exposures, zero hero actions and separate non-pacing telemetry', () => {
  const f = noResetFixture();
  assert.equal(verifyNoResetSchedule(f.rows, f.protocol), true);
  assert(f.rows.every(row => verifyNoResetActions(row, noResetCore)));
  const computed = recompute(f.rows, f.protocol, 0);
  assert.deepEqual(computed.summaries, []); assert.deepEqual(computed.checks, []); assert.equal(computed.passed, false);
  for (const mutate of [
    x => x.rows.pop(), x => { x.rows[0].seed = x.rows[1].seed; }, x => { x.rows[0].profile = 'ordinary'; },
    x => { x.rows[0].durationMs--; }, x => { x.rows[0].cyclesWanted = 3; }, x => { x.rows[0].nonarrival = 1; },
    x => { x.rows[0].heroOffers = 1; }, x => { x.rows[0].heroChoices = 1; }, x => { x.rows[0].finalHeroReincarnations = 1; },
    x => { x.rows[0].soulRecoveries = 1; }, x => { x.rows[0].final.coins = '1'; },
    x => { x.rows[0].maxCapturedIndex = 460; }, x => { x.rows[0].longestKillGapMs = 24 * 3600000 + 1; },
    x => { x.protocol.noReset.durationHours = 23; }, x => { x.protocol.noReset.heroReset = true; },
  ]) { const changed = noResetFixture(); mutate(changed); assert.throws(() => verifyNoResetSchedule(changed.rows, changed.protocol)); }
});
test('no-reset verifies actual legal raw-weakest releases, capture continuity, souls and exact after-roster', () => {
  assert.equal(verifyNoResetActions(noResetActionFixture(), noResetCore), true);
  for (const mutate of [
    r => { r.noResetActions[0].targetBefore = r.noResetActions[0].context.companions[1]; },
    r => { r.noResetActions[0].context.companions.pop(); }, r => { r.noResetActions[0].context.monsterBoss = false; },
    r => { r.noResetActions[0].context.monsterIndex = 40; }, r => { r.noResetActions[0].context.heroReincarnations = 1; },
    r => { r.noResetActions[0].context.companions[0].level = 2; },
    r => { r.noResetActions[0].after.souls = 2; }, r => { r.noResetActions[0].after.companions = []; },
    r => { r.noResetActions[0].atMs = 4999; }, r => { r.noResetActions[1].atMs = 5000; },
    r => { r.noResetActions[1].context.companions.at(-1).id = 'c1'; },
    r => { r.noResetActions[1].context.companions.find(c => c.id === 'c3').bossIndex = 99; },
  ]) {
    const changed = JSON.parse(JSON.stringify(noResetActionFixture())); mutate(changed); hashNoResetActions(changed);
    assert.throws(() => verifyNoResetActions(changed, noResetCore));
  }
  const stale = noResetActionFixture(); stale.noResetActions[0].after.souls++;
  assert.throws(() => verifyNoResetActions(stale, noResetCore), /receipt mismatch/);
  const tied = noResetActionFixture(); tied.noResetActions = tied.noResetActions.slice(0, 1);
  assert.throws(() => verifyNoResetActions(hashNoResetActions(tied), { ...noResetCore, companionPower: () => 1n }), /weaker\/equal/);
});
test('no-reset receipt binds selected code and cannot claim pacing or human-fun acceptance', () => {
  const f = noResetFixture(), result = { candidate: { id: 'R16-A', parameters: { fieldHpResumeIndex: 399 } },
    compiledFiles: { 'formulas.js': 'approved' }, rows: 20, passed: false, humanFun: false, checks: [], summaries: [] };
  const validation = { protocol: f.protocol, report: { binding: { scriptHash: 'script' }, reports: [result] } };
  const noReset = { ...structuredClone(validation), report: { ...structuredClone(validation.report), mode: 'no-reset', diagnostic: true } };
  assert.equal(verifyNoResetBinding(noReset, validation, 'R16-A'), true);
  for (const mutate of [
    r => { r.report.mode = 'management'; }, r => { r.report.diagnostic = false; }, r => { r.report.reports[0].rows = 19; },
    r => { r.report.reports[0].passed = true; }, r => { r.report.reports[0].humanFun = true; },
    r => { r.report.reports[0].summaries = [{ cycle: 1 }]; }, r => { r.report.reports[0].checks = [{ passed: true }]; },
    r => { r.report.binding.scriptHash = 'other'; }, r => { r.report.reports[0].compiledFiles['formulas.js'] = 'other'; },
    r => { r.report.reports[0].candidate.parameters.fieldHpResumeIndex = 499; },
  ]) { const changed = structuredClone(noReset); mutate(changed); assert.throws(() => verifyNoResetBinding(changed, validation, 'R16-A')); }
});

const unchanged = { xpBase: 20, xpGrowth: 1.42, companionHpNumerator: 115, companionHpDenominator: 100,
  captureChance: .35, firstCaptureBossIndex: 63, earlyCaptureCount: 5, heroRestMs: 0, heroDeferMs: 30000,
  xpRewardBase: 5, xpRewardPerIndex: 3, bossXpMultiplier: 5, bossHpMultiplier: 5 };
const source = parameters => 'export const PROGRESSION_PARAMETERS = Object.freeze({\n' +
  Object.entries(parameters).map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`).join('\n') + '\n});';
function candidateScope() {
  return { protocol: { baselineParameters: { ...PARAMETER_BASELINES } },
    registration: { candidates: [{ id: 'R5-A', parameters: { heroMinLevel: 20, fieldCompanionTailPolynomial: 2, fieldCompanionTailScale: 8, fieldHeroCycleBonus: 52 } }],
      fixed: { captureChance: .35, heroRestMs: 0, companionHpNumerator: 115, fieldCompanionTailStartIndex: 31 } },
    parameters: { ...PARAMETER_BASELINES, ...unchanged } };
}
test('approved field curve candidates preserve raw/PvP, XP, capture and no-timer parameters', () => {
  const f = candidateScope();
  assert.equal(verifyParameterScope(f.protocol, f.registration, source(f.parameters)), true);
  f.registration.candidates[0].parameters.fieldCompanionTailPolynomial = 1;
  assert.equal(verifyParameterScope(f.protocol, f.registration, source(f.parameters)), true);
  f.registration.candidates[0].parameters.fieldCompanionTailScale = 256;
  f.registration.candidates[0].parameters.fieldRebirthBonusScale = 16;
  f.registration.candidates[0].parameters.fieldCompanionIndexCap = 79;
  f.registration.candidates[0].parameters.fieldHpIndexCap = 159;
  f.registration.candidates[0].parameters.fieldHpResumeIndex = 399;
  f.registration.candidates[0].parameters.fieldCompanionFeverMultiplier = 2;
  f.registration.candidates[0].parameters.fieldRebirthCountCap = 3;
  f.registration.candidates[0].parameters.fieldCompanionGrowthBonus = 25;
  f.registration.candidates[0].parameters.fieldCompanionBaseFloor = 10000;
  assert.equal(verifyParameterScope(f.protocol, f.registration, source(f.parameters)), true);
  // Adoption changes only the explicitly registered source parameters.
  Object.assign(f.parameters, f.registration.candidates[0].parameters);
  assert.equal(verifyParameterScope(f.protocol, f.registration, source(f.parameters)), true);
  for (const key of Object.keys(unchanged)) {
    const value = structuredClone(f); value.parameters[key] = unchanged[key] + 1;
    assert.throws(() => verifyParameterScope(value.protocol, value.registration, source(value.parameters)), /Frozen progression/);
  }
});
test('reject hidden source tuning, changed tie-break baselines and fixed-registration contradictions', () => {
  for (const mutate of [
    f => { f.parameters.fieldRebirthBonus = 10; },
    f => { f.protocol.baselineParameters.fieldHeroCycleBonus = 52; },
    f => { delete f.protocol.baselineParameters.fieldHeroCycleBonus; },
    f => { f.registration.fixed.fieldHeroCycleBonus = 0; },
    f => { f.registration.fixed.fieldCompanionTailStartIndex = 63; },
    f => { f.registration.candidates[0].parameters.fieldCompanionTailPolynomial = 0; },
    f => { f.parameters.unregisteredTimer = 100; },
    f => { f.registration.candidates[0].parameters.fieldHpResumeIndex = 399; },
    f => { Object.assign(f.registration.candidates[0].parameters, { fieldHpIndexCap: 399, fieldHpResumeIndex: 159 }); },
  ]) {
    const f = candidateScope(); mutate(f);
    assert.throws(() => verifyParameterScope(f.protocol, f.registration, source(f.parameters)));
  }
});
test('candidate mutation rejects frozen keys, regex/path injection and invalid numeric domains', () => {
  for (const [key, value] of [['xpGrowth', 1.1], ['captureChance', .9], ['heroRestMs', 100], ['.*', 2],
    ['fieldCompanionTailPolynomial', 3], ['fieldHeroCycleBonus', 129], ['fieldHeroCycleBonus', 1.5],
    ['fieldCompanionTailScale', 0], ['fieldCompanionTailScale', 257], ['fieldCompanionTailScale', 1.5],
    ['fieldRebirthBonusScale', 0], ['fieldRebirthBonusScale', 17], ['fieldRebirthBonusScale', 1.5], ['fieldRebirthBonusScale', null],
    ['fieldCompanionIndexCap', 0], ['fieldHpIndexCap', -1], ['fieldHpIndexCap', 1.5],
    ['fieldHpResumeIndex', 0], ['fieldHpResumeIndex', -1], ['fieldHpResumeIndex', 1.5],
    ['fieldCompanionFeverMultiplier', 1], ['fieldCompanionFeverMultiplier', 4],
    ['fieldCompanionFeverMultiplier', 2.5], ['fieldCompanionFeverMultiplier', null],
    ['fieldRebirthCountCap', 0], ['fieldRebirthCountCap', -1], ['fieldRebirthCountCap', 1.5],
    ['fieldRebirthCountCap', Number.MAX_SAFE_INTEGER + 1],
    ['fieldCompanionBaseFloor', -1], ['fieldCompanionBaseFloor', 1.5], ['fieldCompanionBaseFloor', null],
    ['fieldCompanionGrowthBonus', 26], ['fieldCompanionGrowthBonus', -1],
    ['fieldHeroCycleBonus', -1], ['fieldHeroCycleBonus', null], ['fieldHpDenominator', 0], ['heroLevelStepEvery', 0],
    ['fieldHpNumerator', Number.MAX_SAFE_INTEGER + 1]]) {
    const f = candidateScope(); f.registration.candidates[0].parameters[key] = value;
    assert.throws(() => verifyParameterScope(f.protocol, f.registration, source(f.parameters)), /candidate parameter/);
  }
  for (const id of ['../escape', 'R5/A', '', 'R5-A.js']) {
    const f = candidateScope(); f.registration.candidates[0].id = id;
    assert.throws(() => verifyParameterScope(f.protocol, f.registration, source(f.parameters)), /candidate ID/);
  }
});
test('fixed reset count cap retains neutral null and cannot hide in source or alter selection baseline', () => {
  for (const cap of [null, 3, 4, 5]) {
    const f = candidateScope(); f.registration.candidates[0].parameters.fieldRebirthCountCap = cap;
    assert.equal(verifyParameterScope(f.protocol, f.registration, source(f.parameters)), true);
  }
  const hidden = candidateScope(); hidden.parameters.fieldRebirthCountCap = 3;
  assert.throws(() => verifyParameterScope(hidden.protocol, hidden.registration, source(hidden.parameters)), /Unregistered source/);
  const baseline = candidateScope(); baseline.protocol.baselineParameters.fieldRebirthCountCap = 3;
  assert.throws(() => verifyParameterScope(baseline.protocol, baseline.registration, source(baseline.parameters)), /baseline changed/);
});
test('progression scope parses literal source without executing expressions or accepting duplicates', () => {
  assert.equal(progressionParameters(source({ fieldHeroCycleBonus: 52 })).fieldHeroCycleBonus, 52);
  for (const literal of ['fieldHeroCycleBonus: Math.random(),', '...other,',
    'fieldHeroCycleBonus: 0, fieldHeroCycleBonus: 52,', 'fieldHeroCycleBonus: (() => 52)(),']) {
    assert.throws(() => progressionParameters('export const PROGRESSION_PARAMETERS = Object.freeze({' + literal + '});'));
  }
});

function finiteFarmFixture() {
  const registered = { ...structuredClone(protocol), fieldCounterBasis: 'encounter-total-resets',
    consumedHeldOutSeeds: [{ first: 125001, count: 100 }], heldOutSeeds: { first: 126001, count: 100 },
    continuationSeeds: { first: 126001, count: 20 }, finiteFarm: { profile: 'high',
      seeds: { first: protocol.explorationSeeds.first, count: 20 }, recoveries: [1, 3, 10, 50], cycles: 3,
      maxHours: 18, decisionMs: 5000, p10Minimum: 120, recoveryReadyFirst: true, totalPreparationIncluded: true,
      afterQuota: 'hero-ready-first' } };
  const rows = [1, 3, 10, 50].flatMap(recoveryQuota => Array.from({ length: 20 }, (_, i) => ({
    profile: 'high', seed: registered.explorationSeeds.first + i, recoveryQuota, cyclesWanted: 3, nonarrival: 0,
    cycles: [1, 2, 3].map(number => ({ number, readyAtMs: number * 240 * 60000,
      acceptedAtMs: number * 240 * 60000, intervalMs: 240 * 60000, field: { acceptedHeroCount: number - 1,
        totalResets: recoveryQuota + number - 1, curveRebirths: recoveryQuota + number - 1, curveVersion: 11 } })),
    durationMs: 720 * 60000, soulRecoveries: recoveryQuota, quotaCompletedAtMs: recoveryQuota * 5000,
    finalHeroReincarnations: 3, finalTotalResets: recoveryQuota + 3, heroOffers: 3, heroChoices: 3,
    final: { coins: '0', income: '0', sales: '0', spent: '0' },
  })));
  return { protocol: registered, rows };
}
test('fresh heldout cannot relabel the consumed R18 range or silently remove its history', () => {
  assert.equal(verifyFreshHeldout(finiteFarmFixture().protocol), true);
  for (const mutate of [
    p => { p.heldOutSeeds.first = 125001; }, p => { p.heldOutSeeds.first = 125099; },
    p => { p.consumedHeldOutSeeds = []; }, p => { p.consumedHeldOutSeeds[0].count = 1; },
    p => { p.continuationSeeds.first = 125001; }, p => { p.fieldCounterBasis = 'accepted-heroes'; },
  ]) { const p = finiteFarmFixture().protocol; mutate(p); assert.throws(() => verifyFreshHeldout(p)); }
});
test('finite-farm80 keeps quotas separate, includes preparation and leaves original280 unchanged', () => {
  const f = finiteFarmFixture();
  assert.equal(verifyFiniteFarmSchedule(f.rows, f.protocol), true);
  const checks = recomputeFiniteFarmChecks(f.rows, f.protocol);
  assert.equal(checks.length, 12); assert(checks.every(row => row.n === 20 && row.p10 === 240 && row.passed));
  assert.equal(censoredRows().length, 280);
  assert.throws(() => verifySchedule([...censoredRows(), ...f.rows], f.protocol), /trajectory count/);
  for (const mutate of [
    x => x.rows.pop(), x => { x.rows[0].seed = x.rows[1].seed; }, x => { x.rows[0].recoveryQuota = 2; },
    x => { x.rows[0].profile = 'ordinary'; }, x => { x.rows[0].cyclesWanted = 10; },
    x => { x.rows[0].cycles[0].intervalMs -= x.rows[0].quotaCompletedAtMs; },
    x => { x.rows[0].quotaCompletedAtMs = x.rows[0].cycles[0].readyAtMs; },
    x => { x.rows[0].heroOffers++; }, x => { x.rows[0].finalTotalResets--; },
    x => { x.rows[0].cycles[0].field.curveRebirths = 0; },
    x => { x.protocol.finiteFarm.totalPreparationIncluded = false; }, x => { x.protocol.finiteFarm.p10Minimum = 119; },
    x => { x.protocol.finiteFarm.recoveryReadyFirst = false; }, x => { x.protocol.finiteFarm.maxHours = 60; },
  ]) { const changed = finiteFarmFixture(); mutate(changed); assert.throws(() => verifyFiniteFarmSchedule(changed.rows, changed.protocol)); }
});
test('finite-farm nonarrivals retain all20 rows, cannot pass nullp10, and use quantiles rather than a minimum', () => {
  const f = finiteFarmFixture();
  for (const row of f.rows) Object.assign(row, { cycles: [], nonarrival: 3, durationMs: 18 * 3600000, soulRecoveries: 0,
    quotaCompletedAtMs: null, finalHeroReincarnations: 0, finalTotalResets: 0, heroOffers: 0, heroChoices: 0 });
  assert.equal(verifyFiniteFarmSchedule(f.rows, f.protocol), true);
  assert(recomputeFiniteFarmChecks(f.rows, f.protocol).every(check => check.n === 20 && check.nonarrival === 20 && check.p10 === null && !check.passed));
  f.rows[0].durationMs--;
  assert.throws(() => verifyFiniteFarmSchedule(f.rows, f.protocol), /scheduled exposure/);
  const measured = finiteFarmFixture();
  measured.rows[0].cycles[0].intervalMs = 119 * 60000;
  assert.equal(recomputeFiniteFarmChecks(measured.rows, measured.protocol)[0].passed, true);
  measured.rows[1].cycles[0].intervalMs = 119 * 60000;
  const lower = recomputeFiniteFarmChecks(measured.rows, measured.protocol)[0];
  assert.equal(lower.p10, 119); assert.equal(lower.passed, false);
});
const finiteSave = { version: 4, monsterIndex: 40, monsterHp: '1', monsterSpeciesId: 'slime', monsterCurveVersion: 11,
  monsterCurveRebirths: 0, rebirths: 0, souls: 0, level: 10, xp: 5, coins: '19', killCount: 40,
  companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 }],
  items: {}, nextCompanionId: 2, earlyCaptureUsed: 1, releasedCount: 0, pvpParty: [], pvpGoldNet: '0', pvpGoldDebt: '0',
  equipment: { revision: 2, shop: { lastObservedAt: 0 } } };
const finiteReplayCore = { REBIRTH_MIN_INDEX: 40, RELEASES_PER_SOUL: 2, isSpeciesId: name => ['slime', 'bat'].includes(name), createEngine: (before, rng) => {
  const state = structuredClone(before);
  return { toSave: () => structuredClone(state), beginEquipmentBatch() {}, lastActionError: () => null,
    apply: () => { state.monsterSpeciesId = rng.next() >= .5 ? 'bat' : 'slime';
      state.souls += Math.floor(state.monsterIndex / 8); state.rebirths++; state.monsterCurveRebirths++;
      state.monsterIndex = 0; state.level = 1; state.xp = 0; state.monsterHp = '1610'; state.equipment.revision++; } };
} };
function finiteActionFixture() {
  const row = finiteFarmFixture().rows[0], before = structuredClone(finiteSave);
  const engine = finiteReplayCore.createEngine(before, { next: () => .8 }); engine.apply();
  row.finiteFarmActions = [{ atMs: 5000, action: { type: 'rebirth' }, before, after: engine.toSave(), rngDraws: [.8] }];
  return hashFiniteActions(row);
}
function hashFiniteActions(row) {
  row.finiteFarmActionsSha256 = createHash('sha256').update(JSON.stringify(row.finiteFarmActions, null, 2)).digest('hex');
  return row;
}
test('finite-farm independently replays source-bound legal recovery, equipment outcome and exact RNG consumption', () => {
  assert.equal(verifyFiniteFarmActions(finiteActionFixture(), finiteReplayCore), true);
  for (const mutate of [
    r => { r.finiteFarmActions[0].before.monsterIndex = 39; }, r => { r.finiteFarmActions[0].before.souls = 1; },
    r => { r.finiteFarmActions[0].before.hero = { reincarnations: 1 }; },
    r => { r.finiteFarmActions[0].before.hero = { reincarnations: 0, choices: [{}] }; },
    r => { r.finiteFarmActions[0].before.monsterCurveRebirths = 1; },
    r => { r.finiteFarmActions[0].after.souls = 6; }, r => { r.finiteFarmActions[0].after.companions = []; },
    r => { r.finiteFarmActions[0].after.coins = '20'; }, r => { r.finiteFarmActions[0].after.equipment.revision = 2; },
    r => { r.finiteFarmActions[0].rngDraws = []; }, r => { r.finiteFarmActions[0].rngDraws = [.1]; },
    r => { r.finiteFarmActions[0].rngDraws = [.8, .8]; }, r => { r.finiteFarmActions[0].rngDraws = [NaN]; },
    r => { r.finiteFarmActions[0].atMs = 5001; }, r => { r.quotaCompletedAtMs = 10000; },
  ]) { const changed = finiteActionFixture(); mutate(changed); hashFiniteActions(changed);
    assert.throws(() => verifyFiniteFarmActions(changed, finiteReplayCore)); }
  const stale = finiteActionFixture(); stale.finiteFarmActions[0].after.coins = '20';
  assert.throws(() => verifyFiniteFarmActions(stale, finiteReplayCore), /receipt mismatch/);
});
test('finite-farm permits only the exact automatic full-roster soul payout between recoveries', () => {
  const row = finiteActionFixture(), first = row.finiteFarmActions[0];
  row.recoveryQuota = 3; row.soulRecoveries = 2; row.quotaCompletedAtMs = null;
  const before = { ...structuredClone(first.after), monsterIndex: 40, monsterHp: '1', releasedCount: 3, souls: 6,
    companions: Array.from({ length: 30 }, (_, i) => ({ id: `c${i + 1}`, speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 })) };
  const engine = finiteReplayCore.createEngine(before, { next: () => .8 }); engine.apply();
  row.finiteFarmActions.push({ atMs: 10000, action: { type: 'rebirth' }, before, after: engine.toSave(), rngDraws: [.8] });
  hashFiniteActions(row);
  assert.equal(verifyFiniteFarmActions(row, finiteReplayCore), true);
  for (const mutate of [
    r => { r.finiteFarmActions[1].before.souls++; },
    r => { r.finiteFarmActions[1].before.releasedCount = 1; },
    r => { r.finiteFarmActions[1].before.companions.pop(); },
    r => { r.finiteFarmActions[1].before.companions[0].level = 2; },
    r => { r.finiteFarmActions[1].after.releasedCount++; },
  ]) { const changed = structuredClone(row); mutate(changed); hashFiniteActions(changed);
    assert.throws(() => verifyFiniteFarmActions(changed, finiteReplayCore)); }
});
test('finite-farm binding cannot replace heldout, omit a quota, or use another candidate/evaluator', () => {
  const f = finiteFarmFixture(), result = { candidate: { id: 'R19-B', parameters: { fieldHeroCycleBonus: 128 } },
    compiledFiles: { 'formulas.js': 'approved' }, rows: 80, passed: false, humanFun: false, checks: [], summaries: [],
    finiteFarmPassed: true, finiteFarmChecks: recomputeFiniteFarmChecks(f.rows, f.protocol) };
  const validation = { protocol: f.protocol, report: { binding: { scriptHash: 'script' }, reports: [result] } };
  const farm = { ...structuredClone(validation), report: { ...structuredClone(validation.report), mode: 'finite-farm', diagnostic: true } };
  assert.equal(verifyFiniteFarmBinding(farm, validation, 'R19-B'), true);
  for (const mutate of [
    r => { r.report.mode = 'validate'; }, r => { r.report.diagnostic = false; }, r => { r.report.reports[0].rows = 60; },
    r => { r.report.reports[0].passed = true; }, r => { r.report.reports[0].finiteFarmPassed = false; },
    r => { r.report.reports[0].finiteFarmChecks.pop(); }, r => { r.report.reports[0].checks = [{ passed: true }]; },
    r => { r.report.reports[0].summaries = [{ profile: 'high' }]; }, r => { r.report.binding.scriptHash = 'other'; },
    r => { r.report.reports[0].compiledFiles['formulas.js'] = 'other'; },
    r => { r.report.reports[0].candidate.parameters.fieldHeroCycleBonus = 52; },
  ]) { const changed = structuredClone(farm); mutate(changed); assert.throws(() => verifyFiniteFarmBinding(changed, validation, 'R19-B')); }
});
test('total-count telemetry stays distinct from hero history and encounter mismatches are rejected', () => {
  const row = finiteFarmFixture().rows[0];
  assert.equal(verifyFieldCounters(row), true);
  row.checkpoints = [{ cycle: 1, field: { acceptedHeroCount: 0, totalResets: 0, curveRebirths: 0, curveVersion: 11 } }];
  assert.equal(verifyFieldCounters(row), true); // Recorded preparation may precede quota completion.
  row.cycles[0].field.curveRebirths = 0;
  assert.throws(() => verifyFieldCounters(row), /Encounter counter/);
  const ordinary = growthActionFixture(), core = { ...growthCore, fieldResetCycleNumerator: () => 4n };
  for (const action of ordinary.growthActions) Object.assign(action.context, { totalResets: 0, curveRebirths: 0 });
  hashActions(ordinary);
  assert.equal(verifyGrowthActions(ordinary, core), true);
  ordinary.growthActions[0].context.curveRebirths = 1; hashActions(ordinary);
  assert.throws(() => verifyGrowthActions(ordinary, core), /encounter total/);
});
