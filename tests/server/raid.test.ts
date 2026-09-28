import { isRaidLive } from '../../src/main/net.js';
import { heroicAttack } from '../../src/core/battle.js';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import { RAID_EPOCH, RAID_FLUSH_MS, advance, newRaid, phaseAt } from '../../src/server/raid.js';
import { RAID_PARAMETERS } from '../../src/core/raid.js';
import type { RaidParameters } from '../../src/core/raid.js';
import type { RaidAttackResponse, RaidLiveResponse, RaidClaimResponse, Snapshot } from '../../src/shared/api.js';
import { modernSnapshot } from './v10-fixture.js';

const parameters: RaidParameters = { ...RAID_PARAMETERS, periodMs: 300000, gatherMs: 30000, countdownMs: 10000,
  priorityMs: 5000, confirmGraceMs: 10000, battleMs: 120000, conditionNeed: 2, claimWindowMs: 900000 };
const snapshot = (name: string, level = 40): Snapshot => modernSnapshot({ name, level, bestIndex: 100, rebirths: 0, companions: [], party: [] });
function setup(over: Partial<RaidParameters> = {}) {
  const store = new MemoryStore(); let time = RAID_EPOCH, serial = 0;
  const deps = { store, now: () => time, randomSeed: () => 7, randomUUID: () => `p${serial}`,
    randomBytesHex: () => `token${serial++}`, raidParameters: { ...parameters, ...over } };
  let app = createApp(deps);
  const call = async (token: string | null, path = 'live', body?: unknown) => {
    const response = await app.handle({ method: body === undefined ? 'GET' : 'POST',
    path: `/v1/raid/${path}`, auth: token, body: body ?? null, ip: 'test', query: {} });
    if (response.status === 200 && path !== 'claim') expect(isRaidLive(response.body)).toBe(true);
    return response;
  };
  const users: { playerId: string; token: string }[] = [];
  const enroll = async (count = 2) => {
    for (let i = 0; i < count; i++) {
      const user = { playerId: `p${i}`, token: `token${i}` }; users.push(user);
      await store.createPlayer({ id: user.playerId, name: user.playerId, tokenHash: createHash('sha256').update(user.token).digest('hex') });
      await store.putSnapshot(user.playerId, snapshot(user.playerId));
    }
  };
  const unlock = async () => {
    for (const user of users.slice(0, 2)) for (const conditionId of ['level', 'bestIndex'])
      expect((await call(user.token, 'participate', { conditionId })).status).toBe(200);
  };
  const battle = async (count = 2) => {
    await enroll(count); await unlock(); time += 5000;
    for (const user of users) expect((await call(user.token, 'join', {})).status).toBe(200);
    time += 5000;
    for (const user of users) expect((await call(user.token, 'confirm', {})).status).toBe(200);
    time += 10000;
    return (await call(users[0]!.token)).body as RaidLiveResponse;
  };
  return { store, users, call, enroll, unlock, battle, advance: (ms: number) => { time += ms; },
    restart: () => { app = createApp(deps); }, normal: (token: string) => app.handle({ method: 'GET', path: '/v1/me', auth: token, body: null, query: {}, ip: 'test' }) };
}
const batch = (seq: number, damage = '100') => ({ raidId: 'r0', seq, damage, clicks: 8, crits: 0, feverMs: 0 });

async function clear(s: ReturnType<typeof setup>): Promise<RaidLiveResponse> {
  let view = (await s.call(s.users[0]!.token)).body as RaidLiveResponse;
  for (let n = 0; n < 100 && view.raid.phase === 'battle'; n++) {
    s.advance(3000);
    const seq = view.raid.me.seq + 1;
    const response = await s.call(s.users[0]!.token, 'attack', { ...batch(seq, '999999999999999999'), clicks: 24, crits: 24, feverMs: 3000 });
    expect(response.status).toBe(200); view = response.body as RaidLiveResponse;
  }
  expect(view.raid.phase).toBe('settled'); expect(view.raid.battle?.killed).toBe(true);
  return view;
}

describe('authoritative raid service', () => {
  it('runs conditions → reveal → priority → explicit confirmation; only confirmed heroes set HP', async () => {
    const s = setup(); await s.enroll(3);
    expect((await s.call(null)).status).toBe(401);
    expect((await s.call('token0', 'confirm', {})).status).toBe(409);
    await s.unlock();
    expect((await s.call('token2', 'join', {})).body).toEqual({ error: 'raid_phase' });
    for (const token of ['token0', 'token1']) expect((await s.call(token, 'join', {})).status).toBe(200);
    s.advance(10000); expect((await s.call('token0')).body as RaidLiveResponse).toMatchObject({ raid: { phase: 'confirming', confirmed: 0 } });
    for (const token of ['token0', 'token1']) expect((await s.call(token, 'confirm', {})).status).toBe(200);
    // Snapshot changes after confirmation cannot inflate the frozen attack.
    await s.store.putSnapshot('p0', snapshot('p0', 500));
    s.advance(10000);
    const view = (await s.call('token0')).body as RaidLiveResponse;
    expect(view.raid.phase).toBe('battle'); expect(view.raid.participants.map(h => h.level)).toEqual([40, 40]);
    expect(view.raid.battle?.bossHp).toBe(String(heroicAttack(snapshot('p0').combat!) * 2n * 2n * 120n * 6500n / 10000n));
    expect((await s.call('token2', 'attack', batch(1))).status).toBe(403);
  });
  it('rejects extreme combat power and unrepresentable XP without poisoning other participants', async () => {
    const s = setup(); await s.enroll(3); await s.unlock(); s.advance(10000);
    for (const user of s.users) await s.call(user.token, 'join', {});
    const extreme = snapshot('p1');
    extreme.combat!.loadout.weapon = { id: 'e1', templateId: 'w-sword-common-1', enhancement: '1' + '0'.repeat(80), roll: 100, seed: 1, attempts: '0' };
    await s.store.putSnapshot('p1', extreme);
    expect((await s.call('token1', 'confirm', {})).body).toEqual({ error: 'raid_power_limit' });
    await s.store.putSnapshot('p1', snapshot('p1', Number.MAX_SAFE_INTEGER));
    expect((await s.call('token1', 'confirm', {})).body).toEqual({ error: 'raid_power_limit' });
    for (const token of ['token0', 'token2']) expect((await s.call(token, 'confirm', {})).status).toBe(200);
    s.advance(10000); const view = (await s.call('token0')).body as RaidLiveResponse;
    expect(view.raid.phase).toBe('battle'); expect(view.raid.confirmed).toBe(2);
    expect(view.raid.participants.map(p => p.playerId)).toEqual(['p0', 'p2']);
  });
  it('keeps all 50 confirmed players, enforces the actual configured capacity and serializes concurrent entry', async () => {
    const s = setup({ capacity: 50 }); await s.enroll(51); await s.unlock(); s.advance(10000);
    const results = await Promise.all(s.users.map(u => s.call(u.token, 'join', {})));
    expect(results.filter(r => r.status === 200)).toHaveLength(50);
    expect(results.filter(r => r.status === 409)).toHaveLength(1);
    for (const u of s.users.slice(0, 50)) await s.call(u.token, 'confirm', {});
    s.advance(10000); const view = (await s.call('token0')).body as RaidLiveResponse;
    expect(view.raid.participants).toHaveLength(50); expect(view.raid.capacity).toBe(50);
    expect(new Set(view.raid.participants.map(p => p.playerId)).size).toBe(50);
  });
  it('skips expired gathering and absent or insufficient confirmations without any rewards', () => {
    const gathering = newRaid(0, 1, parameters); advance(gathering, RAID_EPOCH + parameters.gatherMs);
    expect(phaseAt(gathering, RAID_EPOCH + parameters.gatherMs)).toBe('skipped');
    const absent = newRaid(0, 1, parameters); absent.unlockedAt = RAID_EPOCH; absent.battleAt = RAID_EPOCH + 10000;
    absent.joins = ['p0', 'p1']; advance(absent, RAID_EPOCH + 20000);
    expect(absent.skipped).toBe(true); expect(absent.bossHp).toBeUndefined(); expect(absent.rewards).toEqual({});
  });
  it('deduplicates sequences, rejects malformed trust-boundary input and caps same-tick click floods', async () => {
    const s = setup(); await s.battle(); s.advance(1000);
    const first = await s.call('token0', 'attack', batch(1)); expect(first.status).toBe(200);
    expect((first.body as RaidAttackResponse).accepted).toBe(true);
    const duplicate = (await s.call('token0', 'attack', batch(1))).body as RaidAttackResponse;
    expect(duplicate.accepted).toBe(false); expect(duplicate.expectedSeq).toBe(2); expect(duplicate.raid.me.damage).toBe('100');
    const future = (await s.call('token0', 'attack', batch(9))).body as RaidAttackResponse;
    expect(future.accepted).toBe(false); expect(future.expectedSeq).toBe(2);
    const flooded = (await s.call('token0', 'attack', { ...batch(2, '99999999999999'), clicks: 10000, crits: 10000, feverMs: 300000 })).body as RaidAttackResponse;
    expect(flooded.raid.me.damage).toBe('100');
    for (const bad of [{ damage: '-1' }, { damage: '9'.repeat(41) }, { seq: 1.5 }, { clicks: -1 }, { crits: 9 }, { feverMs: Infinity }]) {
      expect((await s.call('token0', 'attack', { ...batch(3), ...bad })).status).toBe(400);
    }
    expect((await s.call('token0', 'attack', { ...batch(3), raidId: 'r1' })).status).toBe(410);
    // Idle time cannot bank an unlimited burst of distinct sequence numbers.
    s.advance(10000);
    const delayed = (await s.call('token0', 'attack', batch(3))).body as RaidAttackResponse;
    const instant = (await s.call('token0', 'attack', batch(4))).body as RaidAttackResponse;
    expect(instant.raid.me.damage).toBe(delayed.raid.me.damage);
  });
  it('settles deterministic ranks/rewards, scales AFK and failure, and claims idempotently across restart', async () => {
    const s = setup(); await s.battle(); const victory = await clear(s);
    expect(victory.raid.me.reward).toMatchObject({ rank: 1, of: 2, rewardBps: 10000, level: 40, bestIndex: 100 });
    const inactive = (await s.call('token1')).body as RaidLiveResponse;
    expect(inactive.raid.me.reward).toMatchObject({ rank: 2, rewardBps: parameters.failRewardBps });
    expect(inactive.raid.me.reward?.itemTemplateId).toBeUndefined();
    const a = await s.call('token0', 'claim', { raidId: 'r0' }); expect(a.status).toBe(200);
    s.restart(); const b = await s.call('token0', 'claim', { raidId: 'r0' }); expect(b).toEqual(a);
    expect((a.body as RaidClaimResponse).reward).toEqual(victory.raid.me.reward);
    expect((await s.call('token0', 'attack', batch(100))).status).toBe(410);
    s.advance(300000); const previous = (await s.call('token1')).body as RaidLiveResponse;
    expect(previous.previous?.raidId).toBe('r0'); expect(previous.previous?.me.claimed).toBe(false);
    s.advance(parameters.claimWindowMs); expect((await s.call('token1', 'claim', { raidId: 'r0' })).status).toBe(410);
  });
  it('settles timeout at the fixed deadline and rejects unjoined claims', async () => {
    const s = setup(); await s.battle(); await s.store.createPlayer({ id: 'outsider', name: 'outside', tokenHash: createHash('sha256').update('outside').digest('hex') });
    s.advance(parameters.battleMs);
    const fail = (await s.call('token0')).body as RaidLiveResponse;
    expect(fail.raid.phase).toBe('settled'); expect(fail.raid.battle?.killed).toBe(false);
    expect(fail.raid.me.reward?.rewardBps).toBe(parameters.failRewardBps);
    expect((await s.call('outside', 'claim', { raidId: 'r0' })).status).toBe(409);
  });
  it('flushes every five seconds and preserves seq after restart; failed durable claim can be retried', async () => {
    const s = setup(); await s.battle(); s.advance(RAID_FLUSH_MS);
    const hit = await s.call('token0', 'attack', batch(1)); expect(hit.status).toBe(200);
    s.restart(); expect(((await s.call('token0')).body as RaidLiveResponse).raid.me.seq).toBe(1);
    await clear(s);
    const put = s.store.putRaid.bind(s.store); let fail = true;
    s.store.putRaid = async (...args) => { if (fail) throw new Error('disk'); await put(...args); };
    expect((await s.call('token0', 'claim', { raidId: 'r0' })).status).toBe(500);
    fail = false; expect((await s.call('token0', 'claim', { raidId: 'r0' })).status).toBe(200);
  });
  it('raid traffic bypasses the players transaction and has a separate 150/min budget', async () => {
    const s = setup(); await s.enroll();
    s.store.transaction = async () => { throw new Error('players lock unavailable'); };
    for (let i = 0; i < 150; i++) expect((await s.call('token0')).status).toBe(200);
    expect((await s.call('token0')).status).toBe(429);
    // Separate normal budget: failure is the injected store error, not throttling.
    expect((await s.normal('token0')).status).toBe(500);
    s.advance(60000); expect((await s.call('token0')).status).toBe(200);
  });
});
