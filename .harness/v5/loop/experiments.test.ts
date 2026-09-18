import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { bigintDistribution, instrumentEngine, opportunityCounter, pairedComparisons, partyPowers, simulateCapture,
  simulateFever, simulateFreshIdle, summarizeExperiments, summarizeFever, summarizeFreshIdle, validateExperiments, verifyNoopAdapter } from './experiments.mjs';
import { sha256 } from './evidence.mjs';

// These tests use the installed production build. They do not claim release evidence.
const require = createRequire(import.meta.url);
const core = require('../../../dist/electron/core/index.js');
const fresh = core.createEngine(null, core.mulberry32(60006)).toSave();
// A deterministic boundary fixture for tests; release experiments use separately frozen bytes.
const fixture = { ...fresh, companions: Array.from({ length: 30 }, (_, n) => ({
  id: `c${n + 1}`, speciesId: core.COMMON_SPECIES_IDS[n], bossIndex: 7, level: 1, stars: 0,
})), nextCompanionId: 31 };
const adapter = instrumentEngine();
const settings = { stage: 1, interval: 120, seed: 71, fixtureName: 'full-roster-fixed', checkpointSeconds: [120, 180],
  sourceDigest: 'unit-fixture', protocolSha256: 'unit-protocol', fixtureSha256: 'unit-save' };

describe('v0.6 actual-engine experimental policies', () => {
  it('keeps production captures, rewards, RNG, actions and save identical when the adapter declines', () => {
    expect(verifyNoopAdapter(core, adapter, fixture)).toMatchObject({ passed: true });
    expect(adapter.originalSha256).not.toBe(adapter.instrumentedSha256);
    expect(() => instrumentEngine(resolve('.harness/v5/loop/measure.mjs'))).toThrow('exactly one');
  });

  it('retains only first excess capture with no visits and conserves current release parity', () => {
    const run = simulateCapture(core, adapter, fixture, { ...settings, variant: 'one-pending-keep-first', interval: null });
    const held = run.captures.filter((r: { held: boolean }) => r.held);
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ outcome: 'pending', resolvedAt: null });
    expect(run.captures.some((r: { outcome: string }) => r.outcome === 'released')).toBe(true);
    for (const row of run.snapshots) {
      expect(row.pendingCaptures).toBe(1);
      expect(row.explicitOwnedDeletions).toBe(0);
      expect(row.captures).toBe(row.ownedCaptures + row.releasedCaptures + row.pendingCaptures);
      expect(row.souls).toBe(row.soulsInitial + row.heroSouls + row.sacrificeSouls + row.soulsReceived);
      expect(row.releasedCount % core.RELEASES_PER_SOUL).toBe(row.releasedCaptures % core.RELEASES_PER_SOUL);
    }
    expect(run.snapshots[1].soulDelaySeconds).toBeGreaterThan(run.snapshots[0].soulDelaySeconds);
  });

  it('uses one explicit common space-making action, extra pending decision click and retained ledger', () => {
    const existing = simulateCapture(core, adapter, fixture, { ...settings, variant: 'existing-management-only' });
    const pending = simulateCapture(core, adapter, fixture, { ...settings, variant: 'one-pending-keep-first' });
    expect(existing.visits).toHaveLength(1);
    expect(pending.visits).toHaveLength(1);
    expect(existing.visits[0]).toMatchObject({ at: 120, clicks: 4 });
    expect(pending.visits[0]).toMatchObject({ at: 120, clicks: 5 });
    expect(pending.visits[0].sacrifice).not.toBeNull();
    expect(['accept', 'reject']).toContain(pending.visits[0].pending);
    const resolved = pending.captures.find((r: { held: boolean; resolvedAt: number | null }) => r.held && r.resolvedAt !== null);
    expect(resolved.resolvedAt).toBe(120);
    expect(pending.snapshots[0].explicitOwnedDeletions).toBe(1);
    expect(simulateCapture(core, adapter, fixture, { ...settings, variant: 'one-pending-keep-first' })).toEqual(pending);
  });

  it('separates no-visit hero policy from immediate choice and keeps a fresh idle stall', () => {
    const run = simulateCapture(core, adapter, fixture, { ...settings, stage: 2, interval: null, variant: 'current-release' });
    expect(run.snapshots[1]).toMatchObject({ visits: 0, clicks: 0, reincarnations: 0, pendingCaptures: 0 });
    expect(simulateFreshIdle(core, fresh, 1, [60, 120])[1]).toMatchObject({ inputs: 0, menuVisits: 0, kills: 0, companions: 0, firstRewardSec: null, firstCaptureSec: null });
  });

  it('settles weak held candidates once on rejection, respecting an odd inherited release count', () => {
    const strong = { ...fixture, releasedCount: 1, companions: fixture.companions.map((c: object) => ({ ...c, bossIndex: 79 })) };
    const run = simulateCapture(core, adapter, strong, { ...settings, variant: 'one-pending-keep-first', checkpointSeconds: [120, 240] });
    expect(run.visits[0].pending).toBe('reject');
    const first = run.captures.find((r: { held: boolean }) => r.held);
    expect(first).toMatchObject({ outcome: 'released', resolvedAt: 120 });
    expect([0, 1]).toContain(first.releaseSouls);
    for (const row of run.snapshots) expect(row.soulsReceived).toBe(Math.floor((1 + row.releasedCaptures) / 2));
    expect(run.captures.filter((r: { serial: number }) => r.serial === first.serial)).toHaveLength(1);
  });

  it('delivers equal input totals with production fever, preserving burst concentration', () => {
    const uniform = simulateFever(core, fresh, 11, 'uniform', 60);
    const burst = simulateFever(core, fresh, 11, 'burst', 60);
    expect(uniform.inputCount).toBe(120);
    expect(burst.inputCount).toBe(120);
    expect(uniform.feverStarts).toBe(0);
    expect(burst.feverStarts).toBeGreaterThan(0);
    expect(uniform.inputConcentration.maximumPerSecond).toBe(2);
    expect(burst.inputConcentration.maximumPerSecond).toBe(10);
    expect(summarizeFever([uniform, burst]).paired[0].feverStarts).toBe(burst.feverStarts);
    expect(() => summarizeFever([uniform, { ...burst, inputCount: 121 }])).toThrow('Mismatched');
  });

  it('keeps bigint power precision and rejects pairing mismatches, duplicates and missing controls', () => {
    expect(bigintDistribution(['9007199254740994', '9007199254740993']).min).toBe('9007199254740993');
    const powers = partyPowers(core, fixture.companions, fixture.hero?.equipped);
    expect(Object.keys(powers)).toEqual(['fire', 'water', 'wind', 'earth', 'dark']);
    const common = { seed: 1, fixture: 'fresh', stage: 1, interval: 600, minutes: 30, sourceDigest: 'source', protocolSha256: 'protocol', fixtureSha256: 'fixture', inputCount: 3600,
      effectivePartyPowerByType: Object.fromEntries(Object.keys(powers).map((type) => [type, '9007199254740993'])), candidateLosses: 2, clicks: 4, souls: 1, soulDelaySeconds: 0, pendingReleaseUnits: 0 };
    const base = { ...common, variant: 'existing-management-only' };
    const pending = { ...common, variant: 'one-pending-keep-first', effectivePartyPowerByType: { ...common.effectivePartyPowerByType, fire: '9007199254740994' } };
    const comparison = pairedComparisons([base, pending]);
    expect(comparison.raw[0].powerDifferences.fire).toBe('1');
    expect(comparison.groups[0]).toMatchObject({ numericCriteriaPass: true, improvedSeeds: 1 });
    expect(pairedComparisons([base, { ...pending, clicks: 5 }]).groups[0].numericCriteriaPass).toBe(false);
    expect(() => pairedComparisons([base, { ...pending, fixtureSha256: 'different' }])).toThrow('Mismatched');
    expect(() => pairedComparisons([base, base, pending])).toThrow('Duplicate');
    expect(() => pairedComparisons([pending])).toThrow('Missing');
    const raw = simulateCapture(core, adapter, fixture, { ...settings, variant: 'current-release' }).snapshots;
    expect(summarizeExperiments(raw)[0].metrics.captures.reached).toBe(1);
  });

  it('cached candidate thresholds equal full production top-five sums across roster and hero changes', () => {
    const useful = opportunityCounter(core);
    const rosters = [[], fixture.companions.slice(0, 3), fixture.companions, fixture.companions.slice(1)];
    for (const roster of rosters) for (const hero of [undefined, { formId: 'h01', buffPercent: 15, stacks: 3 }]) for (const index of [7, 15, 79]) {
      const candidate = { id: 'c999', speciesId: 'dragon', bossIndex: index, level: 1, stars: 0 };
      const before = partyPowers(core, roster, hero);
      const after = partyPowers(core, [...roster, candidate], hero);
      expect(useful(roster, hero, candidate)).toBe(Object.keys(before).some((t) => BigInt(after[t]) > BigInt(before[t])));
    }
  });
});

// Full-shape synthetic evidence tests only the validator, never game performance.
function syntheticReport() {
  const digest = 'SYNTHETIC TEST DATA';
  const protocol = { version: 2, status: 'frozen-before-execution', captureExperiment: { fixtureRecords: {
    fresh: { sha256: 'fixture', coins: 0, releasedCount: 0 }, 'full-roster-fixed': { sha256: 'fixture', coins: 0, releasedCount: 0 },
  } } };
  const protocolText = JSON.stringify(protocol), protocolSha256 = sha256(protocolText);
  const rawSamples = [], runs = [];
  for (const fixture of ['fresh', 'full-roster-fixed']) for (const stage of [1, 2]) for (const interval of [null, 120, 600]) for (const variant of ['current-release', 'existing-management-only', 'one-pending-keep-first']) for (let seed = 1; seed <= 100; seed++) {
    const visits = interval === null ? [] : Array.from({ length: 1800 / interval }, (_, n) => ({ at: (n + 1) * interval, hero: false, sacrifice: null, sacrificeSouls: 0, pending: null, clicks: 3 }));
    runs.push({ settings: { fixtureName: fixture, stage, interval, variant, seed }, captures: [], visits });
    for (const minutes of [5, 15, 30]) {
      const companionVisits = visits.filter((v) => v.at <= minutes * 60).length;
      rawSamples.push({ fixture, stage, interval, variant, seed, minutes, sourceDigest: digest, protocolSha256, fixtureSha256: 'fixture', inputCount: minutes * 120,
        effectivePartyPowerByType: { fire: '0', water: '0', wind: '0', earth: '0', dark: '0' }, kills: 0, captures: 0, ownedCaptures: 0, releasedCaptures: 0, pendingCaptures: 0,
        candidateLosses: 0, pendingUsefulOpportunity: 0, releasedCount: 0, souls: 0, soulsInitial: 0, heroSouls: 0, sacrificeSouls: 0, soulsReceived: 0, soulsPending: 0,
        pendingReleaseUnits: 0, soulDelaySeconds: 0, maximumPendingSeconds: 0, visits: companionVisits, companionVisits, heroVisits: 0, clicks: companionVisits * 3,
        explicitOwnedDeletions: 0, coins: 0, income: 0,
        automaticDeletionOfOwnedCompanions: 0, duplicateSettlement: 0, forcedWindows: 0 });
    }
  }
  const feverRaw = ['uniform', 'burst'].flatMap((pattern) => Array.from({ length: 100 }, (_, n) => ({ seed: n + 1, pattern, minutes: 30, inputCount: 3600, feverStarts: 0, kills: 0, discoveries: 0, reincarnations: 0 })));
  const idleRaw = [5, 15, 30].flatMap((minutes) => Array.from({ length: 100 }, (_, n) => ({ seed: n + 1, minutes, inputs: 0, menuVisits: 0, kills: 0, companions: 0, firstRewardSec: null, firstCaptureSec: null, level: 1, coins: 0 })));
  return { kind: 'v06-engine-experiments', sourceDigest: digest, protocol, protocolText, protocolSha256, noopAdapter: { passed: true, captureDraws: 1 },
    capture: { rawSamples, runs, scenarios: summarizeExperiments(rawSamples), comparisons: pairedComparisons(rawSamples) },
    fever: { rawSamples: feverRaw, summary: summarizeFever(feverRaw) },
    freshIdle: { rawSamples: idleRaw, scenarios: summarizeFreshIdle(idleRaw) },
    adoption: { numericCriteriaPass: false, increasedSoulDelaySeeds: 0, decision: 'excluded', reason: 'Frozen 600-second per-seed power/loss/click conditions did not all pass.' } };
}

describe('experimental evidence audit', () => {
  it('recomputes complete raw distributions, rejects stale/missing/forged samples and action ledgers', () => {
    const report = syntheticReport();
    expect(validateExperiments(report)).toBe(true);
    expect(() => validateExperiments(report, 'STALE')).toThrow('Stale');
    const original = report.capture.rawSamples[0];
    report.capture.rawSamples[0] = { ...original, fixtureSha256: 'wrong' };
    expect(() => validateExperiments(report)).toThrow('provenance');
    report.capture.rawSamples[0] = original;
    for (const metric of ['automaticDeletionOfOwnedCompanions', 'duplicateSettlement', 'forcedWindows']) {
      report.capture.rawSamples[0] = { ...original, [metric]: 1 };
      expect(() => validateExperiments(report)).toThrow('Zero-tolerance');
    }
    report.capture.rawSamples[0] = original;
    report.adoption.decision = 'adopted';
    expect(() => validateExperiments(report)).toThrow('Adoption decision');
    report.adoption.decision = 'excluded';
    report.adoption.reason = 'Invented approval';
    expect(() => validateExperiments(report)).toThrow('Adoption decision');
    report.adoption.reason = 'Frozen 600-second per-seed power/loss/click conditions did not all pass.';
    const last = report.capture.rawSamples.pop();
    expect(() => validateExperiments(report)).toThrow('Missing');
    report.capture.rawSamples.push(last);
    report.capture.scenarios[0].metrics.kills.p50 = 999;
    expect(() => validateExperiments(report)).toThrow('distributions');
    report.capture.scenarios = summarizeExperiments(report.capture.rawSamples);
    const visit = report.capture.runs.find((r) => r.visits.length > 0).visits[0];
    visit.clicks = 999;
    expect(() => validateExperiments(report)).toThrow('click ledger');
    visit.clicks = 3;
    report.fever.rawSamples[0].inputCount = 3599;
    expect(() => validateExperiments(report)).toThrow('fever configurations');
    report.fever.rawSamples[0].inputCount = 3600;
    report.freshIdle.rawSamples[0].firstRewardSec = 0;
    expect(() => validateExperiments(report)).toThrow('zero/unreached');
  });
});
