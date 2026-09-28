import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server/app.js';
import { MemoryStore } from '../src/server/store.js';
import { RAID_EPOCH } from '../src/server/raid.js';
import { RAID_PARAMETERS } from '../src/core/raid.js';
import { createEngine, parseSave } from '../src/core/index.js';
import { createNetClient, createNetSession, isRaidLive, isRaidReward } from '../src/main/net.js';
import { ProgressCoordinator } from '../src/main/coordinator.js';
import { writeSaveFile } from '../src/main/persistence.js';
import type { RaidLiveResponse } from '../src/shared/api.js';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
async function setup() {
  const store = new MemoryStore(); let serial = 0, now = RAID_EPOCH + 1000, lostClaim = false, offline = false;
  const deps = { store, now: () => now, randomUUID: () => `p-${++serial}`,
    randomBytesHex: (n: number) => (++serial).toString(16).padStart(n * 2, '0'), randomSeed: () => 7,
    raidParameters: { ...RAID_PARAMETERS, conditionNeed: 1, minConfirmed: 1, countdownMs: 1000, confirmGraceMs: 1000 } };
  let server = createApp(deps);
  const client = createNetClient({ baseUrl: 'https://fixture.invalid', fetchFn: async (input, init = {}) => {
    if (offline) throw Error('offline');
    const url = new URL(String(input));
    const res = await server.handle({ method: init.method ?? 'GET', path: url.pathname, query: Object.fromEntries(url.searchParams),
      auth: new Headers(init.headers).get('authorization')?.replace('Bearer ', '') ?? null,
      body: init.body ? JSON.parse(String(init.body)) as unknown : null, ip: 'fixture' });
    if (lostClaim && url.pathname === '/v1/raid/claim' && res.status === 200) { lostClaim = false; throw Error('lost claim response'); }
    return new Response(JSON.stringify(res.body), { status: res.status });
  } });
  const registered = await client.register('Raider'); if (!registered.ok) throw Error('register');
  const dir = mkdtempSync(join(tmpdir(), 'desmon-raid-recovery-')); dirs.push(dir);
  writeFileSync(join(dir, 'identity.json'), JSON.stringify({ name: 'Raider', ...registered.value, notifiedTheftIds: [] }));
  let live = createEngine(parseSave({ level: 40, bestIndex: 100, coins: '1000' })); writeSaveFile(dir, live.toSave());
  let session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: () => 'unused', managed: true });
  const start = () => new ProgressCoordinator({ directory: dir, initial: live.toSave(), session, now: () => now,
    capture: async () => live.toSave(), status: () => {}, release: state => {
      if (state.replace) live = createEngine(state.save); else for (const action of state.actions) live.apply(action);
    } });
  let coordinator = start();
  return { dir, store, get coordinator() { return coordinator; }, get session() { return session; },
    save: () => live.toSave(), advance: (ms: number) => { now += ms; }, loseClaim: () => { lostClaim = true; },
    offline: (flag: boolean) => { offline = flag; }, restartServer: () => { server = createApp(deps); },
    restart() { live = createEngine(parseSave(JSON.parse(readFileSync(join(dir, 'save.json'), 'utf8'))));
      session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: () => 'unused', managed: true }); coordinator = start(); },
  };
}
async function settle(t: Awaited<ReturnType<typeof setup>>): Promise<RaidLiveResponse> {
  expect((await t.coordinator.raidAction({ type: 'participate', conditionId: 'level' })).ok).toBe(true);
  expect((await t.coordinator.raidAction({ type: 'participate', conditionId: 'bestIndex' })).ok).toBe(true);
  expect((await t.coordinator.raidAction({ type: 'join' })).ok).toBe(true);
  t.advance(1000);
  expect(await t.coordinator.raidAction({ type: 'confirm' })).toMatchObject({ ok: true });
  t.advance(1000 + RAID_PARAMETERS.battleMs);
  const result = await t.session.raidLive!(); if (!result.ok) throw Error(JSON.stringify(result));
  expect(result.value.raid.phase).toBe('settled'); return result.value;
}
describe('raid main/server durability integration (injected HTTP, clock, store)', () => {
  it('qualifies using current capture, requires explicit confirm and applies an automatically claimed reward exactly once', async () => {
    const t = await setup(), result = await settle(t), before = t.save();
    expect(isRaidLive(result)).toBe(true); expect(result.raid.me.reward).toBeDefined();
    expect((await t.coordinator.claimRaid('r0')).ok).toBe(true);
    const after = t.save(); expect(BigInt(after.coins)).toBeGreaterThan(BigInt(before.coins));
    expect(after.appliedRaidIds).toEqual(['r0']);
    expect((await t.coordinator.claimRaid('r0')).ok).toBe(true); expect(t.save()).toEqual(after);
    t.restart(); expect((await t.coordinator.claimRaid('r0')).ok).toBe(true); expect(t.save()).toEqual(after);
  });
  it('recovers a lost claim response after both server and client restart', async () => {
    const t = await setup(); await settle(t); const before = t.save(); t.loseClaim();
    expect(await t.coordinator.claimRaid('r0')).toMatchObject({ ok: false, error: 'network' });
    expect(t.save()).toEqual(before); expect(t.coordinator.recovery.state.pendingRaidClaim).toEqual({ raidId: 'r0' });
    t.restart(); t.restartServer();
    expect((await t.coordinator.pollIncoming()).ok).toBe(true);
    expect(t.coordinator.hasRaidClaim('r0')).toBe(true); const after = t.save();
    expect((await t.coordinator.claimRaid('r0')).ok).toBe(true); expect(t.save()).toEqual(after);
  });
  it('recovers a durable reward without network and does not resurrect rewards via reset/restore', async () => {
    const t = await setup(), result = await settle(t);
    const backup = t.coordinator.recovery.backup(t.save(), 'restore');
    t.coordinator.recovery.update({ pendingRaidClaim: { raidId: 'r0', reward: result.raid.me.reward! } });
    t.restart(); t.offline(true);
    expect((await t.coordinator.pollIncoming()).ok).toBe(true); expect(t.coordinator.hasRaidClaim('r0')).toBe(true);
    expect((await t.coordinator.resetOrRestore(backup.id)).ok).toBe(true); const restored = t.save();
    expect(restored.appliedRaidIds).toContain('r0');
    expect((await t.coordinator.claimRaid('r0')).ok).toBe(true); expect(t.save()).toEqual(restored);
    expect((await t.coordinator.resetOrRestore()).ok).toBe(true); const reset = t.save();
    expect((await t.coordinator.claimRaid('r0')).ok).toBe(true); expect(t.save()).toEqual(reset);
  });
  it('rejects malformed wire rosters, bigints, rewards and phase data', async () => {
    const t = await setup(), good = await settle(t);
    const malformed: unknown[] = [null, {}, { ...good, now: NaN }];
    for (const mutate of [
      (v: RaidLiveResponse) => { v.raid.participants.push(v.raid.participants[0]!); },
      (v: RaidLiveResponse) => { v.raid.battle!.hpLeft = '-1'; },
      (v: RaidLiveResponse) => { v.raid.me.reward!.itemTemplateId = 'unknown'; },
      (v: RaidLiveResponse) => { delete v.raid.battleEnd; },
      (v: RaidLiveResponse) => { v.raid.me.reward!.raidId = 'r999'; },
    ]) { const value = structuredClone(good); mutate(value); malformed.push(value); }
    for (const value of malformed) expect(isRaidLive(value)).toBe(false);
    expect(isRaidReward({ ...good.raid.me.reward, rewardBps: 10001 })).toBe(false);
    expect(isRaidReward({ ...good.raid.me.reward, level: 10000 })).toBe(false);
  });
});
