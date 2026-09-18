#!/usr/bin/env node
// Independent receipt validation: never trust report.pass or stored percentiles.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url);
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const ensure = (value, message) => { if (!value) throw Error(message); };
const stable = value => JSON.stringify(value, null, 2);
const same = (actual, expected, message) => ensure(JSON.stringify(actual) === JSON.stringify(expected), message);
const ordinaryProfiles = ['ordinary', 'intermittent'];
const stressProfiles = ['high', 'idle', 'wealthy', 'soul-farming'];
// Approved levers and their v0.10 / neutral-amendment baselines. Keep this
// independent of the mutable registration and production initializer.
export const PARAMETER_BASELINES = Object.freeze({
  heroMinLevel: 17, heroLevelStepEvery: 2, heroLevelStepCap: 6,
  fieldHpNumerator: 1153, fieldHpDenominator: 1000, fieldHpTailStartIndex: 79,
  fieldHpTailNumerator: 10450, fieldHpTailDenominator: 10000, fieldHpTailPolynomial: 0,
  fieldRebirthBonus: 0, fieldRebirthHalf: 1, fieldRebirthBonusScale: 1, fieldRebirthCountCap: null,
  fieldCompanionTailPolynomial: 0, fieldCompanionTailScale: 1, fieldHeroCycleBonus: 0,
  fieldCompanionIndexCap: null, fieldHpIndexCap: null, fieldCompanionGrowthBonus: null,
  fieldCompanionBaseFloor: 0,
  fieldHpResumeIndex: null,
  fieldCompanionFeverMultiplier: 3,
});
const FROZEN_PARAMETERS = Object.freeze({
  xpBase: 20, xpGrowth: 1.42, companionHpNumerator: 115, companionHpDenominator: 100,
  captureChance: .35, firstCaptureBossIndex: 63, earlyCaptureCount: 5,
  heroRestMs: 0, heroDeferMs: 30000, xpRewardBase: 5, xpRewardPerIndex: 3,
  bossXpMultiplier: 5, bossHpMultiplier: 5,
});
// The approved splice is a literal in collection.ts, not a tunable initializer.
const FIXED_SOURCE_CONSTANTS = Object.freeze({ fieldCompanionTailStartIndex: 31 });
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function validLever(key, value) {
  if (key === 'fieldHpTailStartIndex' && value === null) return true;
  if (['fieldCompanionIndexCap', 'fieldHpIndexCap', 'fieldHpResumeIndex', 'fieldRebirthCountCap'].includes(key)) return value === null || Number.isSafeInteger(value) && value > 0;
  if (key === 'fieldCompanionGrowthBonus') return value === null || [25, 50, 100].includes(value);
  if (key === 'fieldCompanionFeverMultiplier') return [2, 3].includes(value);
  if (!Number.isSafeInteger(value) || value < 0) return false;
  if (key === 'fieldCompanionTailPolynomial') return value === 0 || value === 1 || value === 2;
  if (key === 'fieldCompanionTailScale') return value >= 1 && value <= 256;
  if (key === 'fieldRebirthBonusScale') return value >= 1 && value <= 16;
  if (key === 'fieldHeroCycleBonus') return value <= 128;
  return !['heroMinLevel', 'heroLevelStepEvery', 'fieldHpNumerator', 'fieldHpDenominator',
    'fieldHpTailNumerator', 'fieldHpTailDenominator', 'fieldRebirthHalf'].includes(key) || value > 0;
}
/** Parse literals, never execute a candidate module to establish its scope. */
export function progressionParameters(source) {
  const tree = ts.createSourceFile('progression.ts', source, ts.ScriptTarget.ES2022, true);
  const declarations = tree.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'PROGRESSION_PARAMETERS');
  ensure(declarations.length === 1, 'Missing/duplicate progression initializer');
  const initializer = declarations[0].initializer;
  ensure(initializer && ts.isCallExpression(initializer) && initializer.expression.getText(tree) === 'Object.freeze' &&
    initializer.arguments.length === 1 && ts.isObjectLiteralExpression(initializer.arguments[0]), 'Nonliteral progression initializer');
  const result = {};
  for (const property of initializer.arguments[0].properties) {
    ensure(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name), 'Nonliteral progression property');
    const key = property.name.text, value = property.initializer;
    ensure(!has(result, key) && (ts.isNumericLiteral(value) || value.kind === ts.SyntaxKind.NullKeyword), 'Duplicate/nonliteral progression value');
    result[key] = value.kind === ts.SyntaxKind.NullKeyword ? null : Number(value.text.replaceAll('_', ''));
  }
  return result;
}
export function verifyParameterScope(protocol, registration, source) {
  const parameters = progressionParameters(source);
  for (const [key, expected] of Object.entries(FROZEN_PARAMETERS)) ensure(parameters[key] === expected, 'Frozen progression changed: ' + key);
  for (const [key, value] of Object.entries(parameters)) ensure(has(FROZEN_PARAMETERS, key) ||
    has(PARAMETER_BASELINES, key) && validLever(key, value), 'Unknown/invalid progression lever: ' + key);
  ensure(record(protocol.baselineParameters), 'Missing selection baselines');
  for (const [key, value] of Object.entries(protocol.baselineParameters)) ensure(has(PARAMETER_BASELINES, key) &&
    value === PARAMETER_BASELINES[key], 'Selection baseline changed: ' + key);
  ensure(Array.isArray(registration.candidates) && registration.candidates.length > 0, 'Missing registered candidates');
  const ids = new Set();
  for (const candidate of registration.candidates) {
    ensure(typeof candidate.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(candidate.id) && !ids.has(candidate.id), 'Invalid/duplicate candidate ID');
    ids.add(candidate.id);
    ensure(record(candidate.parameters) && Object.keys(candidate.parameters).length > 0, 'Missing candidate parameters');
    for (const [key, value] of Object.entries(candidate.parameters)) ensure(has(PARAMETER_BASELINES, key) && has(parameters, key) &&
      has(protocol.baselineParameters, key) && validLever(key, value), 'Unapproved/invalid candidate parameter: ' + key);
    for (const [key, value] of Object.entries(parameters)) if (has(PARAMETER_BASELINES, key) && !has(candidate.parameters, key)) {
      ensure(value === PARAMETER_BASELINES[key], 'Unregistered source parameter change: ' + key);
    }
    const effective = { ...parameters, ...candidate.parameters };
    ensure(effective.fieldHpResumeIndex == null || Number.isSafeInteger(effective.fieldHpIndexCap) &&
      effective.fieldHpIndexCap > 0 && effective.fieldHpResumeIndex >= effective.fieldHpIndexCap, 'HP resume requires a preceding finite HP cap');
    ensure(effective.fieldCompanionTailPolynomial !== 0 || effective.fieldHeroCycleBonus === 0,
      'Neutral companion curve cannot pair raw damage with count-scaled HP');
    for (const [key, value] of Object.entries(registration.fixed ?? {})) ensure(has(FIXED_SOURCE_CONSTANTS, key)
      ? value === FIXED_SOURCE_CONSTANTS[key]
      : has(parameters, key) && effective[key] === value, 'Candidate contradicts fixed registration: ' + key);
  }
  return true;
}
function verifyExposure(row, maximumMs, firstThreeMaximumMs) {
  if (!row.nonarrival) return;
  const scheduled = row.cyclesWanted > 3 && row.cycles.length < 3 ? Math.min(maximumMs, firstThreeMaximumMs) : maximumMs;
  ensure(row.durationMs === scheduled, 'Censored trajectory stopped before scheduled exposure ' + row.profile + ':' + row.seed);
}
function verifyTrajectory(row, protocol) {
  const key = `${row.profile}:${row.seed}`;
  ensure(Array.isArray(row.cycles) && row.cycles.length <= row.cyclesWanted && row.nonarrival === row.cyclesWanted - row.cycles.length, 'Wrong nonarrival count ' + key);
  let previous = 0;
  for (const [index, cycle] of row.cycles.entries()) {
    ensure(cycle.number === index + 1 && Number.isFinite(cycle.acceptedAtMs) && cycle.acceptedAtMs > previous &&
      cycle.intervalMs === cycle.acceptedAtMs - previous && cycle.readyAtMs <= cycle.acceptedAtMs && cycle.readyAtMs > previous, 'Malformed cycle interval ' + key);
    if (index < 3) ensure(cycle.acceptedAtMs <= protocol.simulation.firstThreeMaxHours * 3600000, 'First-three horizon exceeded ' + key);
    previous = cycle.acceptedAtMs;
  }
  const maximumMs = (row.cyclesWanted === 10 ? protocol.simulation.tenCyclesMaxHours : protocol.simulation.firstThreeMaxHours) * 3600000;
  ensure(Number.isFinite(row.durationMs) && row.durationMs >= previous && row.durationMs <= maximumMs, 'Invalid duration ' + key);
  verifyExposure(row, maximumMs, protocol.simulation.firstThreeMaxHours * 3600000);
  for (const field of ['coins', 'spent', 'income', 'sales']) ensure(typeof row.final[field] === 'string' && /^(0|[1-9]\d*)$/.test(row.final[field]), 'Invalid currency ' + key);
  ensure(BigInt(row.final.coins) === (row.profile === 'wealthy' ? 1000000n : 0n) + BigInt(row.final.income) + BigInt(row.final.sales) - BigInt(row.final.spent), 'Currency mismatch ' + key);
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
    verifyTrajectory(row, protocol);
  }
  return true;
}
export function verifyFreshHeldout(protocol) {
  ensure(protocol.fieldCounterBasis === 'encounter-total-resets', 'Missing encounter-total counter registration');
  same(protocol.consumedHeldOutSeeds, [{ first: 125001, count: 100 }], 'Consumed heldout history changed');
  same(protocol.heldOutSeeds, { first: 126001, count: 100 }, 'Fresh heldout range changed or reused');
  same(protocol.continuationSeeds, { first: 126001, count: 20 }, 'Fresh continuation range changed');
  for (const consumed of protocol.consumedHeldOutSeeds) ensure(protocol.heldOutSeeds.first >= consumed.first + consumed.count ||
    protocol.heldOutSeeds.first + protocol.heldOutSeeds.count <= consumed.first, 'Consumed heldout range reused');
  return true;
}
export function verifyFiniteFarmSchedule(rows, protocol) {
  same(protocol.finiteFarm, { profile: 'high', seeds: { first: protocol.explorationSeeds.first, count: 20 },
    recoveries: [1, 3, 10, 50], cycles: 3, maxHours: 18, decisionMs: 5000, p10Minimum: 120,
    recoveryReadyFirst: true, totalPreparationIncluded: true, afterQuota: 'hero-ready-first' }, 'Finite-farm registration changed');
  ensure(protocol.explorationSeeds.count === 20 && protocol.simulation.firstThreeMaxHours === 18 && rows.length === 80,
    'Finite-farm denominator/exposure changed');
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.recoveryQuota}:${row.seed}`;
    ensure(row.profile === 'high' && [1, 3, 10, 50].includes(row.recoveryQuota) && Number.isSafeInteger(row.seed) &&
      row.seed >= protocol.explorationSeeds.first && row.seed < protocol.explorationSeeds.first + 20 && !seen.has(key),
    'Invalid finite-farm tuple'); seen.add(key);
    ensure(row.cyclesWanted === 3, 'Finite-farm horizon changed');
    verifyTrajectory(row, protocol);
    ensure(Number.isSafeInteger(row.soulRecoveries) && row.soulRecoveries >= 0 && row.soulRecoveries <= row.recoveryQuota &&
      row.finalHeroReincarnations === row.cycles.length && row.heroOffers === row.cycles.length && row.heroChoices === row.cycles.length &&
      row.finalTotalResets === row.soulRecoveries + row.cycles.length, 'Finite-farm action/counter mismatch');
    const completed = row.soulRecoveries === row.recoveryQuota;
    ensure(completed ? Number.isSafeInteger(row.quotaCompletedAtMs) && row.quotaCompletedAtMs > 0 &&
      row.quotaCompletedAtMs % 5000 === 0 && row.quotaCompletedAtMs <= row.durationMs : row.quotaCompletedAtMs === null,
    'Finite-farm quota completion mismatch');
    ensure(!row.cycles.length || completed && row.cycles[0].readyAtMs > row.quotaCompletedAtMs,
      'Finite-farm hero choice preceded completion or omitted preparation');
    for (const cycle of row.cycles) ensure(cycle.field?.acceptedHeroCount === cycle.number - 1 &&
      cycle.field.totalResets === row.recoveryQuota + cycle.number - 1 && cycle.field.curveRebirths === cycle.field.totalResets &&
      cycle.field.curveVersion === 11, 'Finite-farm cycle counter provenance mismatch');
  }
  return true;
}
export function recomputeFiniteFarmChecks(rows, protocol) {
  return [1, 3, 10, 50].flatMap(recoveryQuota => recompute(rows.filter(row => row.recoveryQuota === recoveryQuota), protocol, 3)
    .summaries.map(stat => ({ recoveryQuota, ...stat, passed: stat.p10 !== null && stat.p10 >= 120 })));
}
export function verifyFiniteFarmActions(row, core) {
  const actions = row.finiteFarmActions;
  ensure(core.RELEASES_PER_SOUL === 2, 'Finite-farm automatic release payout changed');
  ensure(Array.isArray(actions) && actions.length === row.soulRecoveries &&
    row.finiteFarmActionsSha256 === digest(stable(actions)), 'Finite-farm action receipt mismatch');
  let previousAt = 0, previousSouls = 0, previousReleases = 0, retained = new Map(), allocated = 0;
  for (const [index, event] of actions.entries()) {
    const { before, after, action, rngDraws } = event;
    ensure(Number.isSafeInteger(event.atMs) && event.atMs >= previousAt + 5000 && event.atMs % 5000 === 0 &&
      event.atMs <= row.durationMs, 'Invalid finite-farm action time'); previousAt = event.atMs;
    ensure(record(before) && record(after) && action?.type === 'rebirth' &&
      Number.isSafeInteger(before.monsterIndex) && before.monsterIndex >= core.REBIRTH_MIN_INDEX &&
      before.rebirths === index && before.monsterCurveVersion === 11 && before.monsterCurveRebirths === index &&
      (before.hero?.reincarnations ?? 0) === 0 && (before.hero?.choices?.length ?? 0) === 0 &&
      Number.isSafeInteger(before.souls) && Number.isSafeInteger(before.releasedCount) && before.releasedCount >= previousReleases &&
      before.souls === previousSouls + Math.floor(before.releasedCount / 2) - Math.floor(previousReleases / 2),
    'Invalid finite-farm recovery context');
    // Automatic full-roster releases pay one soul per two releases. The policy
    // performs no sacrifice/consume, so retained companions must remain exact.
    ensure(before.releasedCount === previousReleases || before.companions.length === 30, 'Finite-farm release without a full roster');
    const current = capturedRoster(before.companions, core, retained, allocated); allocated = current.allocated;
    ensure(after.rebirths === index + 1 && after.monsterCurveVersion === 11 && after.monsterCurveRebirths === index + 1 &&
      after.level === 1 && after.xp === 0 && after.monsterIndex === 0 && after.souls === before.souls + Math.floor(before.monsterIndex / 8) &&
      Number.isSafeInteger(after.souls), 'Finite-farm recovery result mismatch');
    previousSouls = after.souls;
    previousReleases = after.releasedCount;
    for (const field of ['hero', 'companions', 'coins', 'items', 'nextCompanionId', 'earlyCaptureUsed', 'killCount',
      'releasedCount', 'pvpParty', 'pvpGoldNet', 'pvpGoldDebt']) same(after[field], before[field], 'Finite-farm recovery rewrote ' + field);
    ensure(Array.isArray(rngDraws) && rngDraws.length > 0 && rngDraws.every(value => Number.isFinite(value) && value >= 0 && value < 1),
      'Missing finite-farm reset RNG provenance');
    let draw = 0, restoring = true;
    const engine = core.createEngine(before, { next: () => {
      ensure(!restoring && draw < rngDraws.length, 'Finite-farm reset replay consumed unrecorded randomness');
      return rngDraws[draw++];
    } }, { equipmentSeed: row.seed ^ 0xe011, now: () => before.equipment.shop.lastObservedAt });
    same(engine.toSave(), before, 'Finite-farm replay changed pre-action save');
    restoring = false; engine.beginEquipmentBatch(); engine.apply(action);
    ensure(engine.lastActionError() === null && draw === rngDraws.length, 'Finite-farm reset replay rejected or RNG count differs');
    same(engine.toSave(), after, 'Finite-farm reset replay differs from recorded outcome');
    retained = new Map(after.companions.map(item => [item.id, item]));
  }
  ensure(row.quotaCompletedAtMs === (actions.length === row.recoveryQuota ? actions.at(-1)?.atMs : null),
    'Finite-farm completion time differs from actual actions');
  return true;
}
export function verifyManagementSchedule(rows, protocol) {
  same(protocol.management, { profile: 'management', seeds: { first: protocol.explorationSeeds.first, count: 20 },
    cycles: 10, maxHours: 60, firstThreeMaxHours: 18, decisionMs: 5000,
    releasePolicy: 'full-roster-visible-boss-stronger-than-raw-weakest',
    weakestOrder: ['raw-companion-power', 'numeric-id'], heroReadyFirst: true }, 'Management registration changed');
  ensure(protocol.explorationSeeds.count === 20 && protocol.simulation.firstThreeMaxHours === 18 &&
    protocol.simulation.tenCyclesMaxHours === 60, 'Management exposure changed');
  ensure(rows.length === 20, 'Management denominator mismatch');
  const seen = new Set();
  for (const row of rows) {
    ensure(row.profile === 'management' && Number.isSafeInteger(row.seed) && row.seed >= protocol.explorationSeeds.first &&
      row.seed < protocol.explorationSeeds.first + 20 && !seen.has(row.seed), 'Invalid management tuple'); seen.add(row.seed);
    ensure(row.cyclesWanted === 10, 'Management horizon mismatch');
    verifyTrajectory(row, protocol);
    for (const field of ['managementReleases', 'maximumStage', 'maxCapturedIndex', 'purchases', 'enhancements', 'soulRecoveries'])
      ensure(Number.isSafeInteger(row[field]) && row[field] >= 0, 'Invalid management metric ' + field);
    ensure(Number.isSafeInteger(row.maxCapturedRawPowerDigits) && row.maxCapturedRawPowerDigits >= 1, 'Invalid captured power digits');
    ensure(row.maxCapturedIndex <= row.maximumStage && Number.isSafeInteger(row.final.stage) && row.final.stage >= 0 &&
      row.final.stage <= row.maximumStage && Number.isSafeInteger(row.final.souls) && row.final.souls >= 0 &&
      row.soulRecoveries === 0, 'Inconsistent management telemetry');
  }
  return true;
}
export function verifyGrowthSchedule(rows, protocol) {
  same(protocol.growth, { profiles: ['ordinary', 'intermittent', 'high'], seeds: { first: protocol.explorationSeeds.first, count: 20 },
    cycles: 10, profileCycles: { ordinary: 10, intermittent: 10, high: 3 }, maxHours: 60, firstThreeMaxHours: 18,
    highMaxHours: 18, decisionMs: 5000, p10Minimum: 120, policy: 'maximum-next-volley-consume-gain', target: 'active-five',
    food: 'inactive', tieBreak: ['target-numeric-id', 'food-numeric-id'], minimumRoster: 5, heroReadyFirst: true,
    futureInformation: false }, 'Growth registration changed');
  ensure(protocol.explorationSeeds.count === 20 && protocol.simulation.firstThreeMaxHours === 18 &&
    protocol.simulation.tenCyclesMaxHours === 60, 'Growth exposure changed');
  ensure(rows.length === 60, 'Growth denominator mismatch');
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.profile}:${row.seed}`;
    ensure(protocol.growth.profiles.includes(row.profile) && Number.isSafeInteger(row.seed) &&
      row.seed >= protocol.explorationSeeds.first && row.seed < protocol.explorationSeeds.first + 20 && !seen.has(key), 'Invalid growth tuple');
    seen.add(key);
    ensure(row.cyclesWanted === protocol.growth.profileCycles[row.profile], 'Growth horizon mismatch');
    verifyTrajectory(row, protocol);
  }
  return true;
}
export function verifyReserveGrowthSchedule(rows, protocol) {
  same(protocol.reserveGrowth, { profile: 'high', seeds: { first: protocol.explorationSeeds.first, count: 20 }, cycles: 10,
    maxHours: 60, firstThreeMaxHours: 18, decisionMs: 5000, p10Minimum: 120, trigger: 'full-roster', rosterCapacity: 30,
    policy: 'maximum-next-volley-consume-gain', target: 'active-five', food: 'inactive',
    tieBreak: ['target-numeric-id', 'food-numeric-id'], minimumRoster: 29, heroReadyFirst: true,
    futureInformation: false }, 'Reserve growth registration changed');
  ensure(protocol.explorationSeeds.count === 20 && protocol.simulation.firstThreeMaxHours === 18 &&
    protocol.simulation.tenCyclesMaxHours === 60, 'Reserve growth exposure changed');
  ensure(rows.length === 20, 'Reserve growth denominator mismatch');
  const seen = new Set();
  for (const row of rows) {
    ensure(row.profile === 'high' && Number.isSafeInteger(row.seed) && row.seed >= protocol.explorationSeeds.first &&
      row.seed < protocol.explorationSeeds.first + 20 && !seen.has(row.seed), 'Invalid reserve growth tuple'); seen.add(row.seed);
    ensure(row.cyclesWanted === 10, 'Reserve growth horizon mismatch');
    verifyTrajectory(row, protocol);
    ensure(Array.isArray(row.growthActions) && row.growthActions.every(action => action.context?.companions?.length === 30), 'Reserve growth consumed before full roster');
  }
  return true;
}
const naturalString = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
function capturedRoster(companions, core, retained, allocated) {
  const byId = new Map(), idNumber = item => Number(item.id.slice(1));
  for (const item of companions) {
    ensure(typeof item.id === 'string' && /^c[1-9]\d*$/.test(item.id) && Number.isSafeInteger(idNumber(item)) && !byId.has(item.id) &&
      Number.isSafeInteger(item.level) && item.level >= 1 && item.stars === 0 && Number.isSafeInteger(item.bossIndex) && item.bossIndex >= 0 &&
      core.isSpeciesId(item.speciesId), 'Invalid diagnostic companion');
    byId.set(item.id, item);
    if (retained.has(item.id)) same(item, retained.get(item.id), 'Unrecorded companion growth');
    else ensure(idNumber(item) > allocated && item.level === 1, 'Unrecorded transfer or reused capture ID');
  }
  for (const id of retained.keys()) ensure(byId.has(id), 'Unrecorded companion removal');
  return { byId, allocated: Math.max(allocated, ...companions.map(idNumber)) };
}
/** Recompute each registered consume against the bound candidate's pure combat rules. */
export function verifyGrowthActions(row, core) {
  const actions = row.growthActions;
  ensure(Array.isArray(actions) && row.growthConsumes === actions.length &&
    row.growthActionsSha256 === digest(stable(actions)), 'Growth action receipt mismatch');
  let previousAt = 0, retained = new Map(), allocated = 0;
  const idNumber = item => Number(item.id.slice(1));
  for (const action of actions) {
    const context = action.context;
    ensure(Number.isSafeInteger(action.atMs) && action.atMs % 5000 === 0 && action.atMs >= previousAt + 5000 &&
      action.atMs <= row.durationMs, 'Invalid growth decision time'); previousAt = action.atMs;
    ensure(!row.cycles.some(cycle => cycle.acceptedAtMs === action.atMs) &&
      action.cycle === 1 + row.cycles.filter(cycle => cycle.acceptedAtMs < action.atMs).length, 'Growth bypassed hero-ready priority');
    ensure(context && context.acceptedHeroCount === action.cycle - 1 && context.curveVersion === 11 &&
      naturalString(context.partyBonusBps) &&
      ['water', 'wind', 'dark', 'earth', 'fire'].includes(context.enemyType), 'Invalid growth combat context');
    if (typeof core.companionFeverMultiplier === 'function') ensure(typeof context.feverActive === 'boolean' &&
      context.feverMultiplier === (context.feverActive ? Number(core.companionFeverMultiplier(context.curveVersion)) : 1),
    'Growth fever factor differs from the recorded active state and bound field curve');
    else ensure([1, 3].includes(context.feverMultiplier), 'Invalid archived growth fever factor');
    const companions = context.companions;
    ensure(Array.isArray(companions) && companions.length > 5 && companions.length <= 30, 'Invalid growth roster');
    allocated = capturedRoster(companions, core, retained, allocated).allocated;
    const fieldCount = typeof core.fieldResetCycleNumerator === 'function' ? context.curveRebirths : context.acceptedHeroCount;
    if (typeof core.fieldResetCycleNumerator === 'function') ensure(context.totalResets === action.cycle - 1 &&
      context.curveRebirths === context.totalResets, 'Growth encounter total differs from recorded reset history');
    const active = core.activeFieldCompanions(companions, context.enemyType, context.heroEquipped ?? undefined, fieldCount, 11);
    ensure(active.length === 5, 'Growth does not retain five active companions');
    const activeIds = new Set(active.map(item => item.id)), food = companions.filter(item => !activeIds.has(item.id));
    const volley = roster => core.activeFieldCompanions(roster, context.enemyType, context.heroEquipped ?? undefined, fieldCount, 11)
      .reduce((sum, item) => sum + core.effectivePower(core.heroBuffedPower(core.fieldCompanionPower(item, fieldCount, 11),
        core.typeOf(item.speciesId), context.heroEquipped ?? undefined) * (10000n + BigInt(context.partyBonusBps)) / 10000n,
      core.typeOf(item.speciesId), context.enemyType) * BigInt(context.feverMultiplier), 0n);
    const before = volley(companions); let best;
    for (const target of active) for (const material of food) {
      const afterTarget = { ...target, level: target.level + 1 + material.stars };
      const roster = companions.filter(item => item.id !== material.id).map(item => item.id === target.id ? afterTarget : item);
      const after = volley(roster), gain = after - before;
      if (!best || gain > best.gain || gain === best.gain && (idNumber(target) < idNumber(best.target) ||
        idNumber(target) === idNumber(best.target) && idNumber(material) < idNumber(best.material))) best = { target, material, afterTarget, roster, after, gain };
    }
    ensure(best && best.gain >= 0n && action.targetId === best.target.id && action.foodId === best.material.id, 'Growth did not select maximum legal volley gain/tie');
    same(action.targetBefore, best.target, 'Growth target snapshot mismatch');
    same(action.foodBefore, best.material, 'Growth food snapshot mismatch');
    same(action.targetAfter, best.afterTarget, 'Growth outcome rewrites owned stats');
    ensure(naturalString(action.volleyBefore) && BigInt(action.volleyBefore) === before && naturalString(action.volleyAfter) &&
      BigInt(action.volleyAfter) === best.after, 'Growth volley mismatch');
    retained = new Map(best.roster.map(item => [item.id, item]));
  }
  return true;
}
export function verifyNoResetSchedule(rows, protocol) {
  same(protocol.noReset, { profile: 'high', seeds: { first: protocol.explorationSeeds.first, count: 20 }, durationHours: 24,
    decisionMs: 5000, heroReset: false, releasePolicy: 'full-roster-visible-boss-stronger-than-raw-weakest',
    weakestOrder: ['raw-companion-power', 'numeric-id'], rosterCapacity: 30 }, 'No-reset registration changed');
  ensure(protocol.explorationSeeds.count === 20 && rows.length === 20, 'No-reset denominator mismatch');
  const seen = new Set();
  for (const row of rows) {
    ensure(row.profile === 'high' && Number.isSafeInteger(row.seed) && row.seed >= protocol.explorationSeeds.first &&
      row.seed < protocol.explorationSeeds.first + 20 && !seen.has(row.seed), 'Invalid no-reset tuple'); seen.add(row.seed);
    ensure(row.cyclesWanted === 0 && Array.isArray(row.cycles) && row.cycles.length === 0 && row.nonarrival === 0 &&
      row.durationMs === 24 * 3600000, 'No-reset exposure/reset schedule changed');
    ensure(row.finalHeroReincarnations === 0 && row.heroOffers === 0 && row.heroChoices === 0 && row.soulRecoveries === 0, 'No-reset policy performed a reset/offer');
    for (const field of ['coins', 'spent', 'income', 'sales']) ensure(naturalString(row.final[field]), 'Invalid no-reset currency');
    ensure(BigInt(row.final.coins) === BigInt(row.final.income) + BigInt(row.final.sales) - BigInt(row.final.spent), 'No-reset currency mismatch');
    for (const value of [row.maximumStage, row.maxCapturedIndex, row.final.stage, row.final.souls]) ensure(Number.isSafeInteger(value) && value >= 0, 'Invalid no-reset telemetry');
    ensure(row.maxCapturedIndex <= row.maximumStage && row.final.stage <= row.maximumStage &&
      Number.isSafeInteger(row.maxCapturedRawPowerDigits) && row.maxCapturedRawPowerDigits >= 1 &&
      Number.isFinite(row.longestKillGapMs) && row.longestKillGapMs >= 0 && row.longestKillGapMs <= row.durationMs, 'Inconsistent no-reset telemetry');
  }
  return true;
}
export function verifyNoResetActions(row, core) {
  const actions = row.noResetActions;
  ensure(Array.isArray(actions) && row.managementReleases === actions.length &&
    row.noResetActionsSha256 === digest(stable(actions)), 'No-reset action receipt mismatch');
  let previousAt = 0, retained = new Map(), allocated = 0;
  for (const action of actions) {
    const context = action.context;
    ensure(Number.isSafeInteger(action.atMs) && action.atMs % 5000 === 0 && action.atMs >= previousAt + 5000 &&
      action.atMs <= row.durationMs, 'Invalid no-reset decision time'); previousAt = action.atMs;
    ensure(context && Array.isArray(context.companions) && context.companions.length === 30 && context.heroReincarnations === 0 &&
      Number.isSafeInteger(context.monsterIndex) && context.monsterIndex >= 0 && context.monsterBoss === true &&
      core.isBoss(context.monsterIndex) && core.isSpeciesId(context.monsterSpeciesId) &&
      Number.isSafeInteger(context.souls) && context.souls >= 0, 'Invalid no-reset release context');
    const current = capturedRoster(context.companions, core, retained, allocated); allocated = current.allocated;
    ensure(context.companions.every(item => item.level === 1), 'No-reset policy contains unregistered growth');
    const weakest = [...context.companions].sort((a, b) => {
      const difference = core.companionPower(a) - core.companionPower(b);
      return difference < 0n ? -1 : difference > 0n ? 1 : Number(a.id.slice(1)) - Number(b.id.slice(1));
    })[0];
    same(action.targetBefore, weakest, 'No-reset did not release the raw weakest/numeric-ID tie');
    const incoming = { id: '', speciesId: context.monsterSpeciesId, bossIndex: context.monsterIndex, level: 1, stars: 0 };
    ensure(core.companionPower(incoming) > core.companionPower(weakest), 'No-reset released for a weaker/equal incoming boss');
    const remaining = context.companions.filter(item => item.id !== weakest.id);
    same(action.after.companions, remaining, 'No-reset release changed another companion');
    ensure(action.after.souls === context.souls + 1 + weakest.stars, 'No-reset release souls mismatch');
    retained = new Map(remaining.map(item => [item.id, item]));
  }
  return true;
}
export function recomputeGrowthChecks(rows, protocol) {
  return recompute(rows, protocol).summaries.map(stat => ({ profile: stat.profile, cycle: stat.cycle, n: stat.n,
    arrived: stat.arrived, nonarrival: stat.nonarrival, p10: stat.p10, passed: stat.p10 !== null && stat.p10 >= 120 }));
}
export function verifyFieldCounters(row) {
  ensure(Number.isSafeInteger(row.finalTotalResets) && row.finalTotalResets === row.soulRecoveries + row.cycles.length &&
    row.finalHeroReincarnations === row.cycles.length, 'Final total/hero reset provenance mismatch');
  for (const { number, field } of [...row.cycles, ...(row.checkpoints ?? []).map(point => ({ number: point.cycle, field: point.field }))]) {
    ensure(field && field.curveVersion === 11 && field.acceptedHeroCount === number - 1 &&
      Number.isSafeInteger(field.totalResets) && field.totalResets >= field.acceptedHeroCount &&
      field.totalResets <= row.finalTotalResets && field.curveRebirths === field.totalResets,
    'Encounter counter differs from simulated total/hero history');
    if (row.profile !== 'soul-farming' && !row.recoveryQuota) ensure(field.totalResets === field.acceptedHeroCount,
      'No-recovery trajectory changed total count');
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
export function verifyRun(reportPath, current = false) {
  const directory = dirname(reportPath), report = read(reportPath), protocol = read(resolve(directory, 'protocol.json')), registration = read(resolve(directory, 'candidates.json'));
  ensure(['explore', 'validate', 'management', 'growth', 'reserve-growth', 'no-reset', 'finite-farm'].includes(report.mode), 'Nonadoptable measurement mode');
  if (['management', 'growth', 'reserve-growth', 'no-reset', 'finite-farm'].includes(report.mode)) ensure(report.diagnostic === true && report.reports.length === 1, 'Separate single-candidate diagnostic required');
  verifyParameterScope(protocol, registration, readFileSync(resolve(directory, 'source-core/progression.ts'), 'utf8'));
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
    const core = require(resolve(compiledDirectory, 'index.js'));
    if (typeof core.fieldResetCycleNumerator === 'function') {
      verifyFreshHeldout(protocol);
      for (const row of rows) verifyFieldCounters(row);
    } else ensure(protocol.fieldCounterBasis !== 'encounter-total-resets', 'Total-reset registration measured old hero-count core');
    if (report.mode === 'validate') verifySchedule(rows, protocol);
    else if (report.mode === 'management') verifyManagementSchedule(rows, protocol);
    else if (report.mode === 'no-reset') {
      verifyNoResetSchedule(rows, protocol);
      for (const row of rows) verifyNoResetActions(row, core);
    }
    else if (report.mode === 'finite-farm') {
      verifyFiniteFarmSchedule(rows, protocol);
      for (const row of rows) verifyFiniteFarmActions(row, core);
      const checks = recomputeFiniteFarmChecks(rows, protocol);
      same(result.finiteFarmChecks, checks, 'Finite-farm p10 guards differ');
      ensure(checks.length === 12 && result.finiteFarmPassed === checks.every(check => check.passed), 'Finite-farm guard verdict mismatch');
    }
    else if (report.mode === 'growth' || report.mode === 'reserve-growth') {
      const reserve = report.mode === 'reserve-growth';
      if (reserve) verifyReserveGrowthSchedule(rows, protocol); else verifyGrowthSchedule(rows, protocol);
      for (const row of rows) verifyGrowthActions(row, core);
      const checks = recomputeGrowthChecks(rows, protocol);
      same(result[reserve ? 'reserveGrowthChecks' : 'growthChecks'], checks, 'Growth p10 guards differ');
      ensure(checks.length === (reserve ? 10 : 23) && result[reserve ? 'reserveGrowthPassed' : 'growthPassed'] === checks.every(check => check.passed), 'Growth guard verdict mismatch');
    }
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
    const computed = recompute(rows, protocol, ['no-reset', 'finite-farm'].includes(report.mode) ? 0 : ['validate', 'management', 'growth', 'reserve-growth'].includes(report.mode) ? 10 : registration.cycles);
    for (const key of ['summaries', 'checks', 'passed', 'score', 'humanFun']) same(JSON.parse(JSON.stringify(computed[key])), result[key], 'Recomputed ' + key + ' differs');
  }
  return { report, protocol, registration };
}
export function verifyManagementBinding(management, validation, selected) {
  ensure(management.report.mode === 'management' && management.report.diagnostic === true && management.report.reports.length === 1,
    'Missing separate management diagnostic');
  same(management.protocol, validation.protocol, 'Management protocol differs from heldout');
  ensure(management.report.binding.scriptHash === validation.report.binding.scriptHash, 'Management evaluator differs from heldout');
  const result = management.report.reports[0], measured = validation.report.reports[0];
  ensure(result.candidate.id === selected && result.rows === 20 && result.passed === false && result.humanFun === false,
    'Invalid management diagnostic candidate/status');
  same(result.checks, [], 'Management cannot replace pacing gates');
  same(result.candidate.parameters, measured.candidate.parameters, 'Management candidate differs from heldout');
  same(result.compiledFiles, measured.compiledFiles, 'Management measured code differs from heldout');
  return true;
}
export function verifyGrowthBinding(growth, validation, selected, reserve = false) {
  ensure(growth.report.mode === (reserve ? 'reserve-growth' : 'growth') && growth.report.diagnostic === true && growth.report.reports.length === 1, 'Missing separate growth diagnostic');
  same(growth.protocol, validation.protocol, 'Growth protocol differs from heldout');
  ensure(growth.report.binding.scriptHash === validation.report.binding.scriptHash, 'Growth evaluator differs from heldout');
  const result = growth.report.reports[0], measured = validation.report.reports[0];
  ensure(result.candidate.id === selected && result.rows === (reserve ? 20 : 60) && result.humanFun === false && result[reserve ? 'reserveGrowthPassed' : 'growthPassed'] === true,
    'Growth diagnostic candidate/design guard failed');
  const checks = result[reserve ? 'reserveGrowthChecks' : 'growthChecks'];
  ensure(checks.length === (reserve ? 10 : 23) && checks.every(check => check.passed), 'Growth design guard groups missing');
  same(result.candidate.parameters, measured.candidate.parameters, 'Growth candidate differs from heldout');
  same(result.compiledFiles, measured.compiledFiles, 'Growth measured code differs from heldout');
  return true;
}
export function verifyNoResetBinding(noReset, validation, selected) {
  ensure(noReset.report.mode === 'no-reset' && noReset.report.diagnostic === true && noReset.report.reports.length === 1,
    'Missing separate no-reset diagnostic');
  same(noReset.protocol, validation.protocol, 'No-reset protocol differs from heldout');
  ensure(noReset.report.binding.scriptHash === validation.report.binding.scriptHash, 'No-reset evaluator differs from heldout');
  const result = noReset.report.reports[0], measured = validation.report.reports[0];
  ensure(result.candidate.id === selected && result.rows === 20 && result.passed === false && result.humanFun === false,
    'Invalid no-reset diagnostic candidate/status');
  same(result.checks, [], 'No-reset cannot replace pacing gates');
  same(result.summaries, [], 'No-reset cannot claim reincarnation observations');
  same(result.candidate.parameters, measured.candidate.parameters, 'No-reset candidate differs from heldout');
  same(result.compiledFiles, measured.compiledFiles, 'No-reset measured code differs from heldout');
  return true;
}
export function verifyFiniteFarmBinding(finiteFarm, validation, selected) {
  ensure(finiteFarm.report.mode === 'finite-farm' && finiteFarm.report.diagnostic === true && finiteFarm.report.reports.length === 1,
    'Missing separate finite-farm diagnostic');
  same(finiteFarm.protocol, validation.protocol, 'Finite-farm protocol differs from heldout');
  ensure(finiteFarm.report.binding.scriptHash === validation.report.binding.scriptHash, 'Finite-farm evaluator differs from heldout');
  const result = finiteFarm.report.reports[0], measured = validation.report.reports[0];
  ensure(result.candidate.id === selected && result.rows === 80 && result.passed === false && result.humanFun === false &&
    result.finiteFarmPassed === true && result.finiteFarmChecks.length === 12 && result.finiteFarmChecks.every(check => check.passed),
  'Finite-farm diagnostic candidate/design guard failed');
  same(result.checks, [], 'Finite-farm cannot replace original pacing gates');
  same(result.summaries, [], 'Finite-farm quotas cannot be pooled into original profiles');
  same(result.candidate.parameters, measured.candidate.parameters, 'Finite-farm candidate differs from heldout');
  same(result.compiledFiles, measured.compiledFiles, 'Finite-farm measured code differs from heldout');
  return true;
}
export function verifyBalance(finalPath) {
  const manifest = read(finalPath);
  ensure(manifest.version === 11 && typeof manifest.selected === 'string', 'Invalid final balance manifest');
  ensure(digest(readFileSync(manifest.validationReport)) === manifest.validationSha256, 'Validation report hash mismatch');
  ensure(digest(readFileSync(manifest.selectionReport)) === manifest.selectionSha256, 'Selection report hash mismatch');
  ensure(typeof manifest.managementReport === 'string' && digest(readFileSync(manifest.managementReport)) === manifest.managementSha256, 'Management report missing/hash mismatch');
  ensure(typeof manifest.growthReport === 'string' && digest(readFileSync(manifest.growthReport)) === manifest.growthSha256, 'Growth report missing/hash mismatch');
  ensure(typeof manifest.reserveGrowthReport === 'string' && digest(readFileSync(manifest.reserveGrowthReport)) === manifest.reserveGrowthSha256, 'Reserve growth report missing/hash mismatch');
  ensure(typeof manifest.noResetReport === 'string' && digest(readFileSync(manifest.noResetReport)) === manifest.noResetSha256, 'No-reset report missing/hash mismatch');
  ensure(typeof manifest.finiteFarmReport === 'string' && digest(readFileSync(manifest.finiteFarmReport)) === manifest.finiteFarmSha256,
    'Finite-farm report missing/hash mismatch');
  const validation = verifyRun(manifest.validationReport, true), selection = verifyRun(manifest.selectionReport);
  const management = verifyRun(manifest.managementReport);
  verifyManagementBinding(management, validation, manifest.selected);
  verifyGrowthBinding(verifyRun(manifest.growthReport), validation, manifest.selected);
  verifyGrowthBinding(verifyRun(manifest.reserveGrowthReport), validation, manifest.selected, true);
  verifyNoResetBinding(verifyRun(manifest.noResetReport), validation, manifest.selected);
  verifyFiniteFarmBinding(verifyRun(manifest.finiteFarmReport), validation, manifest.selected);
  same(validation.protocol, selection.protocol, 'Selection and heldout protocols differ');
  ensure(validation.report.binding.scriptHash === selection.report.binding.scriptHash, 'Evaluator changed between selection and validation');
  const protocol = validation.protocol;
  verifyFreshHeldout(protocol);
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
  ensure([1, 2].includes(result.candidate.parameters.fieldCompanionTailPolynomial), 'Final candidate omits approved field-only curve');
  ensure(['fieldCompanionIndexCap', 'fieldHpIndexCap', 'fieldHpResumeIndex'].every(key => Number.isSafeInteger(result.candidate.parameters[key]) && result.candidate.parameters[key] > 0) &&
    [25, 50, 100].includes(result.candidate.parameters.fieldCompanionGrowthBonus), 'Final candidate omits approved field/growth bounds');
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
  return { passed: true, selected: manifest.selected, ordinaryTrajectories: 200, continuedTrajectories: 40, adversarialTrajectories: 80,
    managementTrajectories: 20, growthTrajectories: 60, reserveGrowthTrajectories: 20, noResetTrajectories: 20,
    finiteFarmTrajectories: 80, humanFun: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(verifyBalance(resolve(process.argv[2]))) + '\n'); }
  catch (error) { process.stderr.write(String(error) + '\n'); process.exitCode = 1; }
}
