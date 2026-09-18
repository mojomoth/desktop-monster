// Theft poller (SPEC F74; GAME_DESIGN_V3 §8). Everything platform-specific is
// injected — the session, the notifier and BOTH timer functions — so this
// module is import-clean and drives off a fake clock under vitest. Nothing
// here throws: a poll that fails is simply a poll that notified nothing.

import type { NetResult, Theft, TheftsResult } from '../shared/api.js';
import type { Identity } from './identity.js';

/** 5 minutes between polls (GAME_DESIGN_V3 §8). */
export const THEFT_POLL_MS = 300_000;

/** How many theft ids identity.json remembers; the oldest fall off. */
export const NOTIFIED_MAX = 32;

export interface TheftWatcher {
  /** Poll now, then every `intervalMs`. */
  start(): void;
  stop(): void;
  poll(): Promise<void>;
}

/**
 * Notify once per pending theft. The server already drops thefts whose reclaim
 * window closed, so "pending" is exactly what `session.thefts()` returns; the
 * ids already shown live in `identity.notifiedTheftIds`.
 */
export function createTheftWatcher<H>(deps: {
  session: { thefts: () => Promise<NetResult<TheftsResult>> };
  notify: (t: Theft) => void;
  setInterval: (fn: () => void, ms: number) => H;
  clearInterval: (handle: H) => void;
  intervalMs?: number;
  readIdentity: () => Identity;
  writeIdentity: (identity: Identity) => void;
}): TheftWatcher {
  // Renamed on the way in: the globals of the same name are forbidden here.
  const { session, notify, setInterval: every, clearInterval: cancel } = deps;
  const { intervalMs = THEFT_POLL_MS, readIdentity, writeIdentity } = deps;
  let handle: H | null = null;

  async function poll(): Promise<void> {
    try {
      const res = await session.thefts();
      if (!res.ok) {
        return; // offline / unauthorized / server: nothing to say
      }
      const identity = readIdentity();
      const seen = new Set(identity.notifiedTheftIds);
      const fresh = res.value.thefts.filter((t) => !seen.has(t.id));
      if (fresh.length === 0) {
        return;
      }
      for (const t of fresh) {
        notify(t);
      }
      writeIdentity({
        ...identity,
        notifiedTheftIds: [...identity.notifiedTheftIds, ...fresh.map((t) => t.id)].slice(
          -NOTIFIED_MAX,
        ),
      });
    } catch {
      // ponytail: one guard for the whole poll — a notifier that throws costs
      // the rest of THIS batch (they are re-offered next poll), never main.
    }
  }

  return {
    poll,
    start(): void {
      void poll();
      handle ??= every(() => {
        void poll();
      }, intervalMs);
    },
    stop(): void {
      if (handle !== null) {
        cancel(handle);
        handle = null;
      }
    },
  };
}
