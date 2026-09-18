import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectorConnection, retainedProgress } from './package-check.mjs';

class Socket {
  listeners = new Map<string, Array<(event: { data?: string }) => void>>();
  sent: Array<{ id: number; method: string; params: unknown }> = [];
  addEventListener(type: string, callback: (event: { data?: string }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
  }
  send(raw: string): void { this.sent.push(JSON.parse(raw)); }
  emit(type: string, data?: unknown): void {
    for (const callback of this.listeners.get(type) ?? []) callback({ data: JSON.stringify(data) });
  }
  close(): void { this.emit('close'); }
}

afterEach(() => vi.useRealTimers());
describe('packaged main inspector contract', () => {
  it('pairs out-of-order replies by ID and retains the actual initial pause', async () => {
    vi.useFakeTimers();
    const socket = new Socket(); const connection = inspectorConnection(socket);
    const first = connection.call('Runtime.enable'); const second = connection.call('Debugger.enable');
    socket.emit('message', { method: 'Debugger.paused', params: { callFrames: [{ callFrameId: 'real-frame' }] } });
    socket.emit('message', { id: 2, result: { debuggerId: 'test' } });
    socket.emit('message', { id: 1, result: {} });
    await expect(first).resolves.toEqual({}); await expect(second).resolves.toEqual({ debuggerId: 'test' });
    expect(connection.event('Debugger.paused').callFrames[0].callFrameId).toBe('real-frame');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects protocol errors, disconnected requests and the bounded timeout', async () => {
    vi.useFakeTimers();
    const socket = new Socket(); const connection = inspectorConnection(socket);
    const bad = expect(connection.call('bad')).rejects.toThrow('Unknown method');
    socket.emit('message', { id: 1, error: { message: 'Unknown method' } }); await bad;
    const closed = expect(connection.call('Runtime.evaluate')).rejects.toThrow('disconnected');
    socket.close(); await closed;
    const timeout = expect(connection.call('Runtime.evaluate')).rejects.toThrow('Inspector timeout');
    await vi.advanceTimersByTimeAsync(12_000); await timeout;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('includes currency, roster, hero history, official records and new UI state in restart equality', () => {
    const save = { level: 12, xp: 3, coins: 4321, souls: 9, killCount: 78, rebirths: 1,
      companions: [{ id: 'c1' }], pvpParty: ['c1'], hero: { reincarnations: 1 }, monsterHp: '99',
      progress: { playTimeMs: 1, reincarnationHistory: [{ number: 1 }], heroCounts: { h01: 1 }, pvpWins: 7,
        pvpLosses: 3, goldSpent: 75, trainingLevel: 1, codex: { acknowledgedHeroes: ['h01'], acknowledgedMonsters: ['slime'], goal: { kind: 'hero', id: 'h03' } } } };
    expect(retainedProgress({ ...save, monsterHp: '98', progress: { ...save.progress, playTimeMs: 2 } })).toEqual(retainedProgress(save));
    for (const key of ['coins', 'souls', 'companions', 'hero'] as const) {
      expect(retainedProgress({ ...save, [key]: null })).not.toEqual(retainedProgress(save));
    }
    for (const key of ['reincarnationHistory', 'heroCounts', 'pvpWins', 'pvpLosses', 'trainingLevel', 'codex'] as const) {
      expect(retainedProgress({ ...save, progress: { ...save.progress, [key]: null } })).not.toEqual(retainedProgress(save));
    }
  });
});
