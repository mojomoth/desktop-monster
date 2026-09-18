// Notification permission must never gate battle delivery. Timers are injected.
export const DEFENSE_POLL_MS = 5000;
export function createDefenseWatcher<H>(deps: {
  poll: () => Promise<unknown>;
  setInterval: (fn: () => void, ms: number) => H;
  clearInterval: (handle: H) => void;
}): { start(): void; stop(): void; poll(): Promise<void> } {
  let handle: H | null = null;
  let running = false;
  const poll = async (): Promise<void> => {
    if (running) return;
    running = true;
    try { await deps.poll(); } catch { /* offline is retried on the next poll */ }
    finally { running = false; }
  };
  return { poll, start() {
    if (handle !== null) return;
    handle = deps.setInterval(() => { void poll(); }, DEFENSE_POLL_MS);
    void poll();
  }, stop() { if (handle !== null) deps.clearInterval(handle); handle = null; } };
}
