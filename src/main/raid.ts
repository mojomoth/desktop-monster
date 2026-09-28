// A single request chain owns polling, batches and actions. An uncertain batch is
// immutable until the server's sequence acknowledges it; later hits stay separate.
import type { NetResult, RaidAction, RaidAttackRequest, RaidLiveResponse, RaidView } from '../shared/api.js';
import type { RaidDamagePayload } from '../shared/ipc.js';
import type { NetSession } from './net.js';

export function raidPollDelay(view: RaidLiveResponse | null): number {
  if (!view) return 5000;
  const r = view.raid;
  if (r.phase === 'battle' || r.phase === 'confirming') return 1000;
  if (r.phase === 'countdown') return Math.max(250, Math.min((r.battleAt ?? view.now) - view.now, (r.battleAt ?? 0) - view.now <= 600000 ? 5000 : 60000));
  return 60000;
}
export function createRaidWatcher<H>(o: {
  session: Pick<NetSession, 'raidLive' | 'raidAttack'>;
  action: (action: RaidAction) => Promise<NetResult<RaidLiveResponse>>;
  claim: (id: string) => Promise<NetResult<unknown>>;
  claimed: (id: string) => boolean;
  push: (view: RaidLiveResponse) => void;
  connection: (online: boolean) => void;
  setTimeout: (fn: () => void, ms: number) => H;
  clearTimeout: (handle: H) => void;
}) {
  let last: RaidLiveResponse | null = null, online = false, active = false;
  let timer: H | null = null;
  let busy: Promise<unknown> | null = null;
  let pending: RaidAttackRequest | null = null;
  let flight: RaidAttackRequest | null = null;
  const connected = (value: boolean): void => { if (online !== value) { online = value; o.connection(value); } };
  const schedule = (): void => {
    if (timer !== null) o.clearTimeout(timer);
    timer = active ? o.setTimeout(() => { timer = null; void poll(); }, online ? raidPollDelay(last) : 5000) : null;
  };
  const delivered = (r: RaidView): RaidView => ({ ...r, me: { ...r.me,
    // Server claimed and local delivered are distinct crash boundaries.
    claimed: r.me.reward ? o.claimed(r.raidId) : r.me.claimed } });
  const accept = (view: RaidLiveResponse): void => {
    last = { ...view, raid: delivered(view.raid), ...(view.previous ? { previous: delivered(view.previous) } : {}) };
    connected(true);
    if (pending && (pending.raidId !== view.raid.raidId || view.raid.phase !== 'battle')) pending = null;
    if (flight && (flight.raidId !== view.raid.raidId || view.raid.phase !== 'battle' || view.raid.me.seq >= flight.seq)) flight = null;
    o.push(last);
  };
  const claimRewards = async (): Promise<void> => {
    if (!last) return;
    for (const r of [last.previous, last.raid]) if (r?.me.reward && !o.claimed(r.raidId)) {
      await o.claim(r.raidId);
    }
    if (last) {
      const next = { ...last, raid: delivered(last.raid), ...(last.previous ? { previous: delivered(last.previous) } : {}) };
      if (JSON.stringify(next) !== JSON.stringify(last)) { last = next; o.push(next); }
    }
  };
  const run = (work: () => Promise<void>): Promise<void> => {
    const task = work().catch(() => { connected(false); }).finally(() => { busy = null; schedule(); });
    busy = task;
    return task;
  };
  const poll = (): Promise<void> => {
    if (busy) return busy.then(() => {});
    return run(async () => {
      if (!flight && pending && last) {
        flight = { ...pending, seq: last.raid.me.seq + 1 };
        pending = null;
      }
      const sent = flight;
      const reply = sent && o.session.raidAttack ? await o.session.raidAttack(sent)
        : await o.session.raidLive?.();
      if (!reply?.ok) {
        connected(false);
        // An expired attack cannot supply a live view: fetch the result next tick.
        if (reply && (reply.error === 'expired' || reply.error === 'raid-phase')) { flight = null; pending = null; }
        return;
      }
      accept(reply.value);
      if (sent && flight && 'expectedSeq' in reply.value) {
        const expected = reply.value.expectedSeq;
        if (typeof expected === 'number' && expected < sent.seq) flight = { ...sent, seq: expected };
      }
      await claimRewards();
    });
  };
  return {
    get last(): RaidLiveResponse | null { return last; },
    get online(): boolean { return online; },
    poll,
    start(): void { if (active) return; active = true; void poll(); },
    stop(): void { active = false; if (timer !== null) o.clearTimeout(timer); timer = null; },
    async act(action: RaidAction): Promise<NetResult<RaidLiveResponse>> {
      if (busy) return { ok: false, error: 'busy' };
      let result: NetResult<RaidLiveResponse> = { ok: false, error: 'network' };
      await run(async () => {
        result = await o.action(action);
        if (result.ok) { accept(result.value); await claimRewards(); }
        else if (result.error === 'network' || result.error === 'offline' || result.error === 'server') connected(false);
      });
      return result;
    },
    report(hit: RaidDamagePayload): void {
      const r = last?.raid;
      if (!online || !r || r.raidId !== hit.raidId || r.phase !== 'battle' || !r.me.confirmed) return;
      pending ??= { raidId: hit.raidId, seq: 0, clicks: 0, crits: 0, damage: '0', feverMs: 0 };
      // Bound IPC accumulation during a slow request; the server independently
      // clamps cadence and damage against its frozen combat snapshot.
      if (pending.clicks >= 24) return;
      const sum = BigInt(pending.damage) + BigInt(hit.damage);
      pending.damage = String(sum > 10n ** 40n - 1n ? 10n ** 40n - 1n : sum);
      pending.clicks++; pending.crits += Number(hit.crit);
      if (hit.fever) pending.feverMs = 1000;
    },
  };
}
