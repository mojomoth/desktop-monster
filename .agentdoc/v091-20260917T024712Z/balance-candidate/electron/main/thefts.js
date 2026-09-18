"use strict";
// Theft poller (SPEC F74; GAME_DESIGN_V3 §8). Everything platform-specific is
// injected — the session, the notifier and BOTH timer functions — so this
// module is import-clean and drives off a fake clock under vitest. Nothing
// here throws: a poll that fails is simply a poll that notified nothing.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFIED_MAX = exports.THEFT_POLL_MS = void 0;
exports.createTheftWatcher = createTheftWatcher;
/** 5 minutes between polls (GAME_DESIGN_V3 §8). */
exports.THEFT_POLL_MS = 300_000;
/** How many theft ids identity.json remembers; the oldest fall off. */
exports.NOTIFIED_MAX = 32;
/**
 * Notify once per pending theft. The server already drops thefts whose reclaim
 * window closed, so "pending" is exactly what `session.thefts()` returns; the
 * ids already shown live in `identity.notifiedTheftIds`.
 */
function createTheftWatcher(deps) {
    // Renamed on the way in: the globals of the same name are forbidden here.
    const { session, notify, setInterval: every, clearInterval: cancel } = deps;
    const { intervalMs = exports.THEFT_POLL_MS, readIdentity, writeIdentity } = deps;
    let handle = null;
    async function poll() {
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
                notifiedTheftIds: [...identity.notifiedTheftIds, ...fresh.map((t) => t.id)].slice(-exports.NOTIFIED_MAX),
            });
        }
        catch {
            // ponytail: one guard for the whole poll — a notifier that throws costs
            // the rest of THIS batch (they are re-offered next poll), never main.
        }
    }
    return {
        poll,
        start() {
            void poll();
            handle ??= every(() => {
                void poll();
            }, intervalMs);
        },
        stop() {
            if (handle !== null) {
                cancel(handle);
                handle = null;
            }
        },
    };
}
