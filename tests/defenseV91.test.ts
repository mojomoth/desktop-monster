import { describe, expect, it, vi } from 'vitest';
import { createDefenseWatcher, DEFENSE_POLL_MS } from '../src/main/defense.js';

describe('defensive delivery without native notifications', () => {
  it('polls at five seconds, never overlaps, retries failure and stops its injected timer', async () => {
    let finish!: () => void;
    const poll = vi.fn<() => Promise<void>>().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    let tick = () => {};
    const every = vi.fn((fn: () => void, ms: number) => { tick = fn; expect(ms).toBe(5000); return 7; });
    const cancel = vi.fn();
    const watcher = createDefenseWatcher({ poll, setInterval: every, clearInterval: cancel });
    expect(DEFENSE_POLL_MS).toBe(5000);
    watcher.start(); watcher.start(); tick(); await watcher.poll();
    expect(poll).toHaveBeenCalledTimes(1); expect(every).toHaveBeenCalledTimes(1);
    finish(); await Promise.resolve(); await Promise.resolve();
    await watcher.poll(); await watcher.poll();
    expect(poll).toHaveBeenCalledTimes(3);
    watcher.stop(); expect(cancel).toHaveBeenCalledExactlyOnceWith(7);
  });
});
