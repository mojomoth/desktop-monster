// Independent review by /root/backend_v10: only core and Host code not authored by this reviewer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { autoEquipEquipment, createEquipmentBatch, heroChangeWarning, newEquipment } from '../src/core/equipment.js';
import type { EquipmentItem } from '../src/core/equipment.js';
import { createEngine } from '../src/core/engine.js';
import { DEFAULT_SAVE, parseSave } from '../src/core/save.js';
import { xpToNext } from '../src/core/formulas.js';
import { newHeroProgress } from '../src/core/hero.js';
import { ProgressCoordinator } from '../src/main/coordinator.js';
import type { StateRelease } from '../src/main/coordinator.js';
import type { NetSession } from '../src/main/net.js';
import { writeSaveFile } from '../src/main/persistence.js';
import { IPC } from '../src/shared/ipc.js';

const platform = vi.hoisted(() => ({ directory: '', handlers: new Map<string, (...args: unknown[]) => unknown>(),
  listeners: new Map<string, (...args: unknown[]) => unknown>(),
  game: { id: 1, send: vi.fn(), getURL: () => 'file:///app/static/index.html' },
  menu: { id: 2, send: vi.fn(), getURL: () => 'file:///app/static/menu.html', once: vi.fn(), removeListener: vi.fn() }, onSave: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: () => platform.directory }, shell: { openExternal: vi.fn() },
  BrowserWindow: { getAllWindows: () => [{ webContents: platform.game }, { webContents: platform.menu }] },
  ipcMain: { handle: (channel: string, fn: (...args: unknown[]) => unknown) => platform.handlers.set(channel, fn),
    on: (channel: string, fn: (...args: unknown[]) => unknown) => platform.listeners.set(channel, fn) } }));
vi.mock('../src/main/globalInput.js', () => ({ getCurrentInputMode: () => 'fallback' }));
vi.mock('../src/main/net.js', async importOriginal => ({ ...await importOriginal<typeof import('../src/main/net.js')>(),
  createNetClient: vi.fn(), createNetSession: () => ({ pvpHistory: () => ({ wins: 0, losses: 0 }), onSave: platform.onSave, reclaim: vi.fn() }) }));
import { registerIpcHandlers } from '../src/main/ipc.js';

const item = (id: number, templateId = 'w-sword-common-1'): EquipmentItem =>
  ({ id: `e${id}`, templateId, enhancement: '0', roll: 100, seed: id, attempts: '0' });
const paths: string[] = [];
const directory = (): string => { const path = mkdtempSync(join(tmpdir(), 'desmon-independent-v10-')); paths.push(path); return path; };
afterEach(() => { for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe('independent displayed-attack selection counterexamples', () => {
  it('uses fixed IDs after displayed-power, retention and occupancy ties, including rounded weaker new weapons', () => {
    const equipment = newEquipment(); equipment.bag = [item(2, 'w-sword-common-2'), item(1)];
    autoEquipEquipment(equipment, 'h00', 5, createEquipmentBatch(), [], false, 1n);
    expect(equipment.loadout.weapon?.id).toBe('e1');
  });
  it('chooses the four first IDs when distinct accessory powers all round to the same displayed attack', () => {
    const equipment = newEquipment(); equipment.bag = [1, 2, 3, 4, 5].map(id => item(id, `a-ring-critical-common-${Math.min(id, 4)}`));
    autoEquipEquipment(equipment, 'h00', 1, createEquipmentBatch(), [], false, 1n);
    expect(equipment.loadout.accessories.map(i => i.id).sort()).toEqual(['e1', 'e2', 'e3', 'e4']);
  });
  it('equips a temporary weapon as soon as its current-level requirement becomes satisfied', () => {
    const equipment = newEquipment(); equipment.loadout.weapon = item(1); equipment.temporary = [item(2, 'w-sword-epic-2')];
    const engine = createEngine({ ...DEFAULT_SAVE, level: 4, xp: xpToNext(4) - 1, monsterHp: '1', equipment });
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e1');
    engine.attack('keyboard');
    expect(engine.getState().level).toBe(5);
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e2');
    expect(engine.getState().equipment!.temporary).toEqual([]);
  });
  it('recomputes the best owned weapon after successfully enhancing a temporary copy', () => {
    const equipment = newEquipment(); equipment.loadout.weapon = item(1); equipment.temporary = [item(2)];
    const engine = createEngine({ ...DEFAULT_SAVE, level: 100, coins: '10000', equipment });
    engine.apply({ type: 'equipmentEnhance', itemId: 'e2', revision: engine.getState().equipment!.revision });
    expect(engine.getState().equipment!.loadout.weapon?.id).toBe('e2');
    expect(engine.getState().equipment!.loadout.weapon?.enhancement).toBe('1');
  });
});

describe('independent Host deletion confirmation race checks', () => {
  beforeEach(() => {
    vi.clearAllMocks(); platform.handlers.clear(); platform.listeners.clear(); platform.directory = directory();
    const hero = newHeroProgress(); hero.collection.push({ formId: 'h01', buffPercent: 10 });
    const equipment = newEquipment(); equipment.temporary = [item(1, 'w-gun-common-1')];
    expect(writeSaveFile(platform.directory, parseSave({ ...DEFAULT_SAVE, hero, equipment }))).toBe(true);
    registerIpcHandlers();
  });
  const call = (channel: string, data?: unknown, sender: { id: number; send: typeof platform.menu.send; getURL: () => string } = platform.menu): unknown =>
    platform.handlers.get(channel)!({ sender }, data, 0);
  const requests = (): { id: string; spec: { body: string[] } }[] => platform.menu.send.mock.calls
    .filter(([channel]) => channel === IPC.CONFIRM).map(([, payload]) => payload as { id: string; spec: { body: string[] } });
  const answer = (index: number, value: string, sender = platform.menu): void => {
    platform.listeners.get(IPC.CONFIRM_RESPONSE)!({ sender }, { id: requests()[index]!.id, value });
  };
  const saved = () => parseSave(JSON.parse(readFileSync(join(platform.directory, 'save.json'), 'utf8')) as unknown);
  it('does not relay cancellation, duplicate requests during warning, or same-hero requests', async () => {
    const pending = call(IPC.MENU_ACTION, { type: 'heroEquip', formId: 'h01' });
    await call(IPC.MENU_ACTION, { type: 'heroEquip', formId: 'h01' });
    expect(requests()).toHaveLength(1); answer(0, 'cancel'); await pending;
    expect(platform.game.send.mock.calls.filter(([channel]) => channel === IPC.ACTION)).toEqual([]);
    await call(IPC.MENU_ACTION, { type: 'heroEquip', formId: 'h00' });
    expect(requests()).toHaveLength(1);
    expect(saved().equipment!.temporary.map(i => i.id)).toEqual(['e1']);
  });
  it('accepts only the targeted menu sender, allowed button values and one reply for each request', async () => {
    const pending = call(IPC.MENU_ACTION, { type: 'heroEquip', formId: 'h01' });
    expect(requests()).toHaveLength(1);
    answer(0, 'confirm', { ...platform.menu, id: 99 });
    answer(0, 'confirm', { ...platform.menu, id: platform.game.id });
    answer(0, 'not-a-button');
    await Promise.resolve();
    expect(platform.game.send.mock.calls.filter(([channel]) => channel === IPC.ACTION)).toEqual([]);
    expect(platform.menu.removeListener).not.toHaveBeenCalled();
    answer(0, 'cancel'); await pending;
    answer(0, 'confirm');
    expect(platform.menu.removeListener).toHaveBeenCalledTimes(1);
    expect(platform.game.send.mock.calls.filter(([channel]) => channel === IPC.ACTION)).toEqual([]);
    expect(saved().equipment!.temporary.map(i => i.id)).toEqual(['e1']);
  });
  it('shows the replacement temporary contents again before forwarding a refreshed confirmation', async () => {
    const pending = call(IPC.MENU_ACTION, { type: 'heroEquip', formId: 'h01' });
    const next = saved(); next.equipment!.temporary = [item(2, 'w-gun-common-2'), item(3, 'w-staff-common-1')];
    next.equipment!.temporaryRevision++; next.equipment!.revision++;
    expect(call(IPC.SAVE_STATE, next, platform.game)).toBe(true);
    answer(0, 'confirm'); await Promise.resolve(); await Promise.resolve();
    expect(requests()).toHaveLength(2);
    expect(requests()[1]!.id).not.toBe(requests()[0]!.id);
    expect(requests()[1]!.spec.body).toHaveLength(3);
    expect(platform.game.send.mock.calls.filter(([channel]) => channel === IPC.ACTION)).toEqual([]);
    answer(1, 'confirm'); await pending;
    expect(platform.game.send).toHaveBeenLastCalledWith(IPC.ACTION, { type: 'heroEquip', formId: 'h01', equipmentConfirmation: heroChangeWarning(next.equipment, 'h01') });
  });
});

describe('independent quit boundary preservation', () => {
  it('keeps the complete live transaction after capture failure and allows a later successful quit flush', async () => {
    const dir = directory(), initial = parseSave(DEFAULT_SAVE); writeSaveFile(dir, initial);
    const equipment = newEquipment(); equipment.loadout.weapon = item(1);
    const captured = parseSave({ ...initial, coins: '123456789012345678901234567890', equipment });
    let fail = true;
    const releases: StateRelease[] = [], session = { reclaim: vi.fn(), onSave: vi.fn() } as unknown as NetSession;
    const coordinator = new ProgressCoordinator({ directory: dir, initial, session, status: vi.fn(),
      capture: async () => { if (fail) throw Error('renderer unavailable'); return captured; }, release: value => releases.push(value) });
    expect(await coordinator.flushForQuit()).toBe(false);
    expect(JSON.parse(readFileSync(join(dir, 'save.json'), 'utf8'))).toEqual(initial);
    expect(releases[0]).toMatchObject({ replace: false, blocked: false });
    fail = false; expect(await coordinator.flushForQuit()).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'save.json'), 'utf8'))).toEqual(captured);
    expect(coordinator.latest).toEqual(captured);
  });
});
