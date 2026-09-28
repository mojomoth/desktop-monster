import { describe, expect, it, vi } from 'vitest';
import { createRaidWatcher, raidPollDelay } from '../src/main/raid.js';
import { RAID_BOSSES } from '../src/core/raid.js';
import type { NetResult, RaidAttackRequest, RaidLiveResponse } from '../src/shared/api.js';
const view = (seq = 0): RaidLiveResponse => ({ now: 1000, raid: { raidId: 'r1', cycle: 1, boss: RAID_BOSSES[1]!, phase: 'battle',
  capacity: 20, joined: 1, confirmed: 1, openToAll: true, gatherDeadline: 0, conditions: [], participants: [], battleAt: 0, battleEnd: 120000,
  me: { playerId: 'p1', unlocker: false, joined: true, confirmed: true, damage: '0', seq, claimed: false } } });
const hit = { raidId: 'r1', damage: '10', crit: false, fever: false };
const setup = () => {
  const push = vi.fn(), connection = vi.fn(), action = vi.fn(async () => ({ ok: true as const, value: view() }));
  const claim = vi.fn(async () => ({ ok: true as const, value: null }));
  const claimed = new Set<string>();
  const session = { raidLive: vi.fn(async (): Promise<NetResult<RaidLiveResponse>> => ({ ok: true, value: view() })),
    raidAttack: vi.fn(async (batch: RaidAttackRequest) => ({ ok: true as const, value: { ...view(batch.seq), accepted: true, expectedSeq: batch.seq + 1 } })) };
  let timer: (() => void) | undefined;
  const watcher = createRaidWatcher({ session, action, claim, claimed: id => claimed.has(id), push, connection,
    setTimeout: (fn: () => void) => { timer = fn; return 1; }, clearTimeout: () => { timer = undefined; } });
  return { watcher, session, push, connection, action, claim, claimed, tick: () => timer?.() };
};
describe('raid single-flight polling and retry batches', () => {
  it('retries the identical uncertain batch, keeping new hits out until its ACK', async () => {
    const t = setup(); await t.watcher.poll();
    let resolve!: (value: Awaited<ReturnType<typeof t.session.raidAttack>>) => void;
    t.session.raidAttack.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    t.watcher.report(hit); const pending = t.watcher.poll(); t.watcher.report({ ...hit, damage: '20' });
    const duplicate = t.watcher.poll();
    expect(t.session.raidAttack).toHaveBeenCalledTimes(1);
    resolve({ ok: true, value: { ...view(0), accepted: false, expectedSeq: 1 } });
    await Promise.all([pending, duplicate]); await t.watcher.poll();
    expect(t.session.raidAttack.mock.calls[0]![0]).toEqual(t.session.raidAttack.mock.calls[1]![0]);
    await t.watcher.poll();
    expect(t.session.raidAttack.mock.calls[2]![0]).toMatchObject({ seq: 2, damage: '20', clicks: 1 });
  });
  it('handles a lost response, duplicate sequence ACK and reconnect without double-reporting', async () => {
    const t = setup(); await t.watcher.poll(); t.watcher.report(hit);
    t.session.raidAttack.mockRejectedValueOnce(Error('reply lost'));
    await t.watcher.poll(); expect(t.watcher.online).toBe(false);
    t.watcher.report(hit); // offline inputs do not inflate queued damage
    t.session.raidAttack.mockResolvedValueOnce({ ok: true, value: { ...view(1), accepted: false, expectedSeq: 2 } });
    await t.watcher.poll(); expect(t.watcher.online).toBe(true);
    await t.watcher.poll(); expect(t.session.raidAttack).toHaveBeenCalledTimes(2);
    expect(t.session.raidAttack.mock.calls[1]![0]).toMatchObject({ seq: 1, clicks: 1, damage: '10' });
  });
  it('ignores foreign raids, unconfirmed heroes and nonbattle input; bounds a slow batch', async () => {
    const t = setup(); await t.watcher.poll(); t.watcher.report({ ...hit, raidId: 'r2' });
    for (let i = 0; i < 1000; i++) t.watcher.report(hit);
    await t.watcher.poll(); expect(t.session.raidAttack.mock.calls[0]![0].clicks).toBe(24);
    const next = view(1); next.raid.me.confirmed = false;
    t.session.raidLive.mockResolvedValue({ ok: true, value: next }); await t.watcher.poll();
    t.watcher.report(hit); await t.watcher.poll(); expect(t.session.raidAttack).toHaveBeenCalledTimes(1);
  });
  it('does not trust a server claimed flag until durable local application succeeds', async () => {
    const t = setup(), result = view(); result.raid.phase = 'settled'; result.raid.me.claimed = true;
    result.raid.me.reward = { raidId: 'r1', rank: 1, of: 1, xpLevels: 3, goldKills: 500, level: 30, bestIndex: 60, rewardBps: 10000 };
    t.session.raidLive.mockResolvedValue({ ok: true, value: result });
    await t.watcher.poll(); expect(t.watcher.last?.raid.me.claimed).toBe(false);
    t.claim.mockImplementationOnce(async () => { t.claimed.add('r1'); return { ok: true, value: null }; });
    await t.watcher.poll(); expect(t.watcher.last?.raid.me.claimed).toBe(true);
    await t.watcher.poll(); expect(t.claim).toHaveBeenCalledTimes(2);
  });
  it('single-flights actions and stops scheduling after stop during a request', async () => {
    const t = setup(); let resolve!: (v: NetResult<RaidLiveResponse>) => void;
    t.session.raidLive.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    t.watcher.start(); expect(await t.watcher.act({ type: 'confirm' })).toEqual({ ok: false, error: 'busy' });
    t.watcher.stop(); resolve({ ok: true, value: view() }); await t.watcher.poll();
    t.tick(); expect(t.session.raidLive).toHaveBeenCalledTimes(1);
  });
  it('uses 1s battles, 5s prewarm/reconnect and schedules at the countdown boundary', () => {
    const v = view(); expect(raidPollDelay(v)).toBe(1000); expect(raidPollDelay(null)).toBe(5000);
    v.raid.phase = 'countdown'; v.raid.battleAt = v.now + 600;
    expect(raidPollDelay(v)).toBe(600); v.raid.battleAt += 3_600_000; expect(raidPollDelay(v)).toBe(60000);
    v.raid.phase = 'gathering'; expect(raidPollDelay(v)).toBe(60000);
  });
});
