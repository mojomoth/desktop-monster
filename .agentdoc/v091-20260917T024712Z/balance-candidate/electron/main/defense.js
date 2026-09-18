"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFENSE_POLL_MS = void 0;
exports.createDefenseWatcher = createDefenseWatcher;
// Notification permission must never gate battle delivery. Timers are injected.
exports.DEFENSE_POLL_MS = 5000;
function createDefenseWatcher(deps) {
    let handle = null;
    let running = false;
    const poll = async () => {
        if (running)
            return;
        running = true;
        try {
            await deps.poll();
        }
        catch { /* offline is retried on the next poll */ }
        finally {
            running = false;
        }
    };
    return { poll, start() {
            if (handle !== null)
                return;
            handle = deps.setInterval(() => { void poll(); }, exports.DEFENSE_POLL_MS);
            void poll();
        }, stop() { if (handle !== null)
            deps.clearInterval(handle); handle = null; } };
}
