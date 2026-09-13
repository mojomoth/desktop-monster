// Exercise the real handlers with injected platform/network boundaries: no Electron process.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SAVE, newHeroProgress, newProgress, parseSave, serializeSave } from '../src/core/index.js';
import { IPC } from '../src/shared/ipc.js';

const fake = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  events: new Map<string, (...args: unknown[]) => unknown>(),
  game: { id: 1, send: vi.fn() }, menu: { id: 2, send: vi.fn() },
  read: vi.fn(), write: vi.fn(), onSave: vi.fn(),
  totals: { wins: 3, losses: 2 }, pvp: vi.fn(),
}));
vi.mock('electron', () => ({
  app: { getPath: () => '/injected/user-data' }, shell: { openExternal: vi.fn() },
  BrowserWindow: { getAllWindows: () => [{ webContents: fake.game }, { webContents: fake.menu }] },
  ipcMain: {
    handle: (channel: string, callback: (...args: unknown[]) => unknown) => fake.handlers.set(channel, callback),
    on: (channel: string, callback: (...args: unknown[]) => unknown) => fake.events.set(channel, callback),
  },
}));
vi.mock('../src/main/globalInput.js', () => ({ getCurrentInputMode: vi.fn() }));
vi.mock('../src/main/persistence.js', () => ({ readSaveFile: fake.read, writeSaveFile: fake.write }));
vi.mock('../src/main/net.js', () => ({
  createNetClient: vi.fn(),
  createNetSession: () => ({ pvpHistory: () => fake.totals, onSave: fake.onSave, pvp: fake.pvp }),
}));
import { registerIpcHandlers } from '../src/main/ipc.js';

beforeEach(() => {
  vi.clearAllMocks(); fake.handlers.clear(); fake.events.clear();
  fake.totals = { wins: 3, losses: 2 };
  fake.read.mockReturnValue(DEFAULT_SAVE);
  fake.write.mockReturnValue(true);
  registerIpcHandlers();
});
const call = (channel: string, data?: unknown, sender = fake.menu): unknown => fake.handlers.get(channel)!({ sender }, data);

describe('v0.5 main-only progress boundary', () => {
  it('shows recovered official records on the first menu render', () => {
    fake.events.get(IPC.MENU_READY)!({ sender: fake.menu });
    expect(fake.menu.send).toHaveBeenCalledWith(IPC.STATE_CHANGED, expect.objectContaining({
      progress: expect.objectContaining({ pvpWins: 3, pvpLosses: 2 }) }));
    expect(fake.game.send).not.toHaveBeenCalled();
  });
  it('recovers official totals on load and overwrites fabricated totals before disk, upload and menu relay', () => {
    expect(call(IPC.LOAD_STATE)).toMatchObject({ progress: { pvpWins: 3, pvpLosses: 2 } });
    call(IPC.SAVE_STATE, { ...DEFAULT_SAVE, coins: 75, progress: { ...newProgress(), pvpWins: 999, pvpLosses: 999 } }, fake.game);
    expect(fake.write).toHaveBeenCalledWith('/injected/user-data', expect.objectContaining({ coins: 75,
      progress: expect.objectContaining({ pvpWins: 3, pvpLosses: 2 }) }));
    expect(fake.onSave).toHaveBeenCalledWith(fake.write.mock.calls[0]![1]);
    expect(fake.menu.send).toHaveBeenCalledWith(IPC.STATE_CHANGED, fake.write.mock.calls[0]![1]);
    expect(fake.game.send).not.toHaveBeenCalled();
  });

  it('rejects menu-forged totals and malformed purchases while forwarding a valid serial-bound purchase once', () => {
    for (const action of [{ type: 'syncPvpProgress', wins: 999, losses: 0 },
      { type: 'shopBuy', item: 'gold', shopSerial: 0 }, { type: 'shopBuy', item: 'training', shopSerial: -1 },
      { type: 'shopBuy', item: 'lure', shopSerial: .5 }, null]) call(IPC.MENU_ACTION, action);
    expect(fake.game.send).not.toHaveBeenCalled();
    const valid = { type: 'shopBuy', item: 'training', shopSerial: 7 };
    call(IPC.MENU_ACTION, valid);
    expect(fake.game.send).toHaveBeenCalledExactlyOnceWith(IPC.ACTION, valid);
    expect(fake.menu.send).not.toHaveBeenCalled();
  });

  it('broadcasts absolute main totals after success and nothing after a failed network verdict', async () => {
    const verdict = { ok: true, value: { bot: false, win: true } };
    fake.pvp.mockResolvedValueOnce(verdict).mockResolvedValueOnce({ ok: false, error: 'network' });
    expect(await call(IPC.PVP, { matchId: 'm1', party: [] })).toBe(verdict);
    for (const window of [fake.game, fake.menu]) expect(window.send)
      .toHaveBeenCalledExactlyOnceWith(IPC.ACTION, { type: 'syncPvpProgress', wins: 3, losses: 2 });
    await call(IPC.PVP, { matchId: 'm2', party: [] });
    expect(fake.game.send).toHaveBeenCalledTimes(1);
  });
});

describe('v0.6 local UI action and save acknowledgement boundary', () => {
  it('normalizes legacy ACK on load, save and menu relay while preserving collection-only hero ACK', () => {
    const save = { ...DEFAULT_SAVE, hero: { ...newHeroProgress(), collection: [{ formId: 'h01', buffPercent: 10 }] },
      progress: { ...newProgress(), seenHeroes: ['h01', 'h02'], seenMonsters: ['slime'], codex: {
        acknowledgedHeroes: ['h01', 'h02'], acknowledgedMonsters: ['slime'], goal: null,
      } } };
    fake.read.mockReturnValue(parseSave(serializeSave(save)));
    const codex = { acknowledgedHeroes: ['h01'], acknowledgedMonsters: [], goal: null };
    expect(call(IPC.LOAD_STATE)).toMatchObject({ progress: { codex } });
    expect(call(IPC.SAVE_STATE, save, fake.game)).toBe(true);
    expect(fake.write.mock.calls[0]![1]).toMatchObject({ progress: { codex } });
    expect(fake.menu.send).toHaveBeenLastCalledWith(IPC.STATE_CHANGED, expect.objectContaining({
      progress: expect.objectContaining({ codex }),
    }));
  });
  it('relays valid discovery IDs and nullable goals, rejecting malformed kinds, IDs and arrays', () => {
    for (const action of [
      { type: 'acknowledgeDiscoveries', heroes: ['slime'], monsters: [] },
      { type: 'acknowledgeDiscoveries', heroes: [], monsters: ['h01'] },
      { type: 'acknowledgeDiscoveries', heroes: 'h01', monsters: [] },
      { type: 'acknowledgeDiscoveries', heroes: [], monsters: [4] },
      { type: 'setDiscoveryGoal', goal: { kind: 'hero', id: 'h71' } },
      { type: 'setDiscoveryGoal', goal: { kind: 'monster', id: 'h01' } },
      { type: 'setDiscoveryGoal', goal: { kind: 'other', id: 'slime' } },
      { type: 'setDiscoveryGoal' },
    ]) call(IPC.MENU_ACTION, action);
    expect(fake.game.send).not.toHaveBeenCalled();
    for (const action of [
      { type: 'acknowledgeDiscoveries', heroes: ['h01', 'h01'], monsters: ['slime'] },
      { type: 'setDiscoveryGoal', goal: { kind: 'hero', id: 'h70' } },
      { type: 'setDiscoveryGoal', goal: { kind: 'monster', id: 'starvoid' } },
      { type: 'setDiscoveryGoal', goal: null },
    ]) {
      call(IPC.MENU_ACTION, action);
      expect(fake.game.send).toHaveBeenLastCalledWith(IPC.ACTION, action);
    }
    expect(fake.menu.send).not.toHaveBeenCalled();
  });

  it('never publishes a failed write as saved and reports success only after a successful retry', () => {
    fake.write.mockReturnValueOnce(false).mockReturnValueOnce(true);
    const save = { ...DEFAULT_SAVE, progress: { ...newProgress(), seenHeroes: ['h01'], heroCounts: { h01: 1 }, codex: {
      acknowledgedHeroes: ['h01'], acknowledgedMonsters: [], goal: { kind: 'hero', id: 'h70' },
    } } };
    expect(call(IPC.SAVE_STATE, save, fake.game)).toBe(false);
    expect(fake.onSave).not.toHaveBeenCalled();
    for (const window of [fake.game, fake.menu]) {
      expect(window.send).toHaveBeenCalledExactlyOnceWith(IPC.SAVE_FAILED, undefined);
    }
    expect(call(IPC.SAVE_STATE, save, fake.game)).toBe(true);
    expect(fake.onSave).toHaveBeenCalledExactlyOnceWith(fake.write.mock.calls[1]![1]);
    expect(fake.menu.send).toHaveBeenLastCalledWith(IPC.STATE_CHANGED, expect.objectContaining({
      progress: expect.objectContaining({ codex: save.progress.codex }),
    }));
    expect(fake.game.send).toHaveBeenCalledTimes(1);
  });
});
