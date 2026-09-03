// T69 — theft watcher (SPEC F74, GAME_DESIGN_V3 §8). Every dependency of
// createTheftWatcher is injected, so this suite needs neither a clock nor a
// disk: a fake session answers thefts(), a hand-rolled interval table stands
// in for the timers, and identity.json is a plain object in memory.

import { describe, expect, it } from 'vitest';
import type { NetResult, Theft, TheftsResult } from '../src/shared/api.js';
import type { Identity } from '../src/main/identity.js';
import { NOTIFIED_MAX, THEFT_POLL_MS, createTheftWatcher } from '../src/main/thefts.js';

const theft = (id: string): Theft => ({
  id,
  companion: { id: 'c1', speciesId: 'dragon', bossIndex: 7, level: 5, stars: 0 },
  transferredId: 's1',
  thiefId: 'p2',
  thiefName: 'Bandit',
  at: 1000,
  reclaimUntil: 87_400_000,
});

/** Fresh identity plus the read/write pair the watcher persists through. */
function memoryIdentity(notifiedTheftIds: string[] = []): {
  current: () => Identity;
  writes: () => number;
  readIdentity: () => Identity;
  writeIdentity: (identity: Identity) => void;
} {
  let identity: Identity = { name: 'Knight-abcd', playerId: 'p1', token: 't', notifiedTheftIds };
  let writes = 0;
  return {
    current: () => identity,
    writes: () => writes,
    readIdentity: () => identity,
    writeIdentity: (next) => {
      identity = next;
      writes++;
    },
  };
}

/** setInterval/clearInterval as a table of pending callbacks. */
function fakeTimers(): {
  setInterval: (fn: () => void, ms: number) => number;
  clearInterval: (handle: number) => void;
  pending: () => { fn: () => void; ms: number }[];
  fire: () => Promise<void>;
} {
  const table = new Map<number, { fn: () => void; ms: number }>();
  let next = 1;
  return {
    setInterval: (fn, ms) => {
      table.set(next, { fn, ms });
      return next++;
    },
    clearInterval: (handle) => {
      table.delete(handle);
    },
    pending: () => [...table.values()],
    fire: async () => {
      for (const t of [...table.values()]) {
        t.fn();
      }
      await Promise.resolve();
    },
  };
}

/** A session whose thefts() answers `results` in order (last one repeats). */
function fakeSession(results: NetResult<TheftsResult>[]): {
  thefts: () => Promise<NetResult<TheftsResult>>;
  calls: () => number;
} {
  let calls = 0;
  return {
    calls: () => calls,
    thefts: () => {
      const res = results[Math.min(calls, results.length - 1)];
      calls++;
      return Promise.resolve(res as NetResult<TheftsResult>);
    },
  };
}

const ok = (thefts: Theft[]): NetResult<TheftsResult> => ({ ok: true, value: { thefts } });

describe('createTheftWatcher (F74, src/main/thefts.ts)', () => {
  it('poll notifies each pending theft once and records its id', async () => {
    const identity = memoryIdentity();
    const timers = fakeTimers();
    const seen: string[] = [];
    const watcher = createTheftWatcher({
      session: fakeSession([ok([theft('t1'), theft('t2')])]),
      notify: (t) => seen.push(t.id),
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      readIdentity: identity.readIdentity,
      writeIdentity: identity.writeIdentity,
    });

    await watcher.poll();
    expect(seen).toEqual(['t1', 't2']);
    expect(identity.current().notifiedTheftIds).toEqual(['t1', 't2']);

    // Same two thefts still open: already notified, so nothing new is shown
    // and identity.json is not rewritten.
    await watcher.poll();
    expect(seen).toEqual(['t1', 't2']);
    expect(identity.writes()).toBe(1);
  });

  it('start polls immediately then every intervalMs on the injected timer and stop clears it', async () => {
    const identity = memoryIdentity();
    const timers = fakeTimers();
    const session = fakeSession([ok([])]);
    const watcher = createTheftWatcher({
      session,
      notify: () => undefined,
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      readIdentity: identity.readIdentity,
      writeIdentity: identity.writeIdentity,
    });

    watcher.start();
    await Promise.resolve();
    expect(session.calls()).toBe(1); // immediate poll, before any tick
    expect(timers.pending()).toEqual([{ fn: expect.any(Function), ms: THEFT_POLL_MS }]);

    await timers.fire();
    await timers.fire();
    expect(session.calls()).toBe(3);

    watcher.stop();
    expect(timers.pending()).toEqual([]);
    await timers.fire();
    expect(session.calls()).toBe(3); // the cleared interval never fires again
  });

  it('an offline session notifies nothing', async () => {
    const identity = memoryIdentity();
    const timers = fakeTimers();
    const seen: string[] = [];
    const watcher = createTheftWatcher({
      session: fakeSession([{ ok: false, error: 'offline' }]),
      notify: (t) => seen.push(t.id),
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      readIdentity: identity.readIdentity,
      writeIdentity: identity.writeIdentity,
    });

    await watcher.poll();
    expect(seen).toEqual([]);
    expect(identity.writes()).toBe(0);
  });

  it('notifiedTheftIds is capped at 32', async () => {
    const many = Array.from({ length: 40 }, (_, i) => theft(`t${String(i)}`));
    const identity = memoryIdentity();
    const timers = fakeTimers();
    const watcher = createTheftWatcher({
      session: fakeSession([ok(many)]),
      notify: () => undefined,
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      readIdentity: identity.readIdentity,
      writeIdentity: identity.writeIdentity,
    });

    await watcher.poll();
    const recorded = identity.current().notifiedTheftIds;
    expect(NOTIFIED_MAX).toBe(32);
    expect(recorded).toHaveLength(32);
    // The newest ids survive: t8…t39, so t39 can never be re-notified.
    expect(recorded[0]).toBe('t8');
    expect(recorded.at(-1)).toBe('t39');
  });

  it('a notifier that throws never rejects the poll', async () => {
    const identity = memoryIdentity();
    const timers = fakeTimers();
    const watcher = createTheftWatcher({
      session: fakeSession([ok([theft('t1')])]),
      notify: () => {
        throw new Error('no notification centre');
      },
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      readIdentity: identity.readIdentity,
      writeIdentity: identity.writeIdentity,
    });

    await expect(watcher.poll()).resolves.toBeUndefined();
    expect(identity.writes()).toBe(0); // unshown thefts stay unrecorded
  });
});
