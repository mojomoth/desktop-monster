// T03 — shared IPC contract, preload bridge, main handlers (SPEC F17).
// src/shared/ipc.ts is plain TS and imported directly. The preload and the
// main-process handler module value-import `electron` (unloadable under
// vitest — see tests/window.test.ts), so those are source-contract tests;
// the key one keeps the preload's INLINED channel literals in sync with the
// shared constants, because the sandboxed preload cannot require shared/ipc
// at runtime. Runtime behaviour is covered by `npm run smoke`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { IPC } from '../src/shared/ipc.js';

const relay = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  match: vi.fn(), pvp: vi.fn(),
  game: { id: 1, send: vi.fn(), getURL: () => 'file:///app/static/index.html' }, menu: { id: 2, send: vi.fn(), getURL: () => 'file:///app/static/menu.html' },
}));
vi.mock('electron', () => ({
  app: { getPath: () => '/injected/v7-test' }, shell: { openExternal: vi.fn() },
  BrowserWindow: { getAllWindows: () => [{ webContents: relay.game }, { webContents: relay.menu }] },
  ipcMain: { handle: (name: string, fn: (...args: unknown[]) => unknown) => relay.handlers.set(name, fn), on: vi.fn() },
}));
vi.mock('../src/main/globalInput.js', () => ({ getCurrentInputMode: vi.fn() }));
vi.mock('../src/main/persistence.js', () => ({ readSaveFile: vi.fn(), readSaveFileResult: vi.fn(() => ({ kind: 'missing' })), writeSaveFile: vi.fn() }));
vi.mock('../src/main/net.js', () => ({ createNetClient: vi.fn(), createNetSession: () => ({ reclaim: vi.fn(), onSave: vi.fn(), match: relay.match, pvp: relay.pvp }) }));
// The real coordinator stays active; only its filesystem boundary is injected.
vi.mock('../src/main/recovery.js', () => ({ RecoveryStore: class {
  state = {};
  allocationSafe(value: unknown): unknown { return value; }
} }));
import { registerIpcHandlers } from '../src/main/ipc.js';

describe('v0.9 main-owned companion IPC', () => {
  it('rejects malformed and well-formed menu-forged ownership and battle results', () => {
    relay.game.send.mockClear(); relay.menu.send.mockClear();
    registerIpcHandlers();
    const send = (payload: unknown) => relay.handlers.get(IPC.MENU_ACTION)!({ sender: relay.menu }, payload);
    const c = { id: 'c1', speciesId: 'bat', bossIndex: 7, level: 250, stars: 0 };
    for (const level of [0, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
      send({ type: 'addCompanion', companion: { ...c, level } });
      send({ type: 'pvpResult', won: true, stolen: { ...c, level }, lostId: null });
    }
    expect(relay.game.send).not.toHaveBeenCalled();
    for (const level of [11, 250, Number.MAX_SAFE_INTEGER]) {
      send({ type: 'addCompanion', companion: { ...c, level } });
      send({ type: 'pvpResult', won: true, stolen: { ...c, level }, lostId: null });
    }
    for (const ids of [[], ['c1'], [3], null]) send({ type: 'removeCompanions', ids });
    for (const nextCompanionId of [1, 999, Number.MAX_SAFE_INTEGER, -1, NaN]) send({ type: 'syncAllocation', nextCompanionId });
    expect(relay.game.send).not.toHaveBeenCalled();
    expect(relay.menu.send).not.toHaveBeenCalled();
  });

  it('drops missing/malformed confirmations and relays an exact safe-integer snapshot', () => {
    relay.game.send.mockClear(); relay.menu.send.mockClear();
    registerIpcHandlers();
    const send = (payload: unknown) => relay.handlers.get(IPC.MENU_ACTION)!({ sender: relay.menu }, payload);
    const expected = { speciesId: 'bat', bossIndex: 7, level: Number.MAX_SAFE_INTEGER, stars: 0 };
    for (const snapshot of [undefined, null, {}, { ...expected, level: Number.MAX_SAFE_INTEGER + 1 },
      { ...expected, stars: -1 }, { ...expected, bossIndex: 0.5 }, { ...expected, speciesId: '' }]) {
      send({ type: 'reincarnate', id: 'c1', expected: snapshot });
    }
    expect(relay.game.send).not.toHaveBeenCalled();
    const valid = { type: 'reincarnate', id: 'c1', expected };
    send(valid);
    expect(relay.game.send).toHaveBeenCalledExactlyOnceWith(IPC.ACTION, valid);
    expect(relay.menu.send).not.toHaveBeenCalled();
  });
});

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

const preloadTs = read('src/preload/index.ts');
const mainIpcTs = read('src/main/ipc.ts');
const mainIndexTs = read('src/main/index.ts');

describe('shared IPC channels (src/shared/ipc.ts)', () => {
  it('defines the GAME_ARCHITECTURE §3.2 table plus first-frame, move-window and the net channels', () => {
    expect(IPC).toEqual({
      INPUT: 'desmon:input',
      INPUT_MODE: 'desmon:input-mode',
      GET_INPUT_MODE: 'desmon:get-input-mode',
      LOAD_STATE: 'desmon:load-state',
      SAVE_STATE: 'desmon:save-state',
      SAVE_FAILED: 'desmon:save-failed',
      GET_SAVE_STATUS: 'desmon:get-save-status',
      SAVE_STATUS: 'desmon:save-status',
      GET_SETTINGS: 'desmon:get-settings',
      UPDATE_SETTINGS: 'desmon:update-settings',
      SETTINGS_CHANGED: 'desmon:settings-changed',
      CONNECT_GLOBAL_INPUT: 'desmon:connect-global-input',
      OPEN_SAVE_FOLDER: 'desmon:open-save-folder',
      QUIT: 'desmon:quit',
      RESET: 'desmon:reset',
      PREPARE_STATE: 'desmon:prepare-state',
      CAPTURE_STATE: 'desmon:capture-state',
      RELEASE_STATE: 'desmon:release-state',
      GET_GENERATION: 'desmon:get-generation',
      RESET_PROGRESS: 'desmon:reset-progress',
      LIST_CHECKPOINTS: 'desmon:list-checkpoints',
      RESTORE_CHECKPOINT: 'desmon:restore-checkpoint',
      BATTLE_OPPONENT: 'desmon:battle-opponent',
      LAST_BATTLE: 'desmon:last-battle',
      PENDING_REPLAYS: 'desmon:pending-replays',
      REPLAY_COMPLETE: 'desmon:replay-complete',
      PVP_PLAYBACK: 'desmon:pvp-playback',
      EXPORT_PNG: 'desmon:export-png',
      FIELD_IMAGE: 'desmon:field-image',
      OPEN_ACCESSIBILITY_SETTINGS: 'desmon:open-accessibility-settings',
      FIRST_FRAME: 'desmon:first-frame',
      MOVE_WINDOW: 'desmon:move-window',
      GET_IDENTITY: 'desmon:get-identity',
      SET_NAME: 'desmon:set-name',
      LEADERBOARD: 'desmon:leaderboard',
      PVP_OPPONENTS: 'desmon:pvp-opponents',
      PVP_MATCH: 'desmon:pvp-match',
      PVP: 'desmon:pvp',
      THEFTS: 'desmon:thefts',
      RECLAIM: 'desmon:reclaim',
      ACTION: 'desmon:action',
      MENU_ACTION: 'desmon:menu-action',
      STATE_CHANGED: 'desmon:state-changed',
      MENU_READY: 'desmon:menu-ready',
    });
  });

  it('uses unique, desmon:-prefixed channel names', () => {
    const values = Object.values(IPC);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(value).toMatch(/^desmon:[a-z][a-z-]*$/);
    }
  });
});

describe('preload bridge (src/preload/index.ts)', () => {
  it('exposes window.desmon via contextBridge', () => {
    expect(preloadTs).toContain("contextBridge.exposeInMainWorld('desmon'");
  });

  it.each([
    'onInput',
    'onInputMode',
    'onReset',
    'getInputMode',
    'loadState',
    'saveState',
    'onSaveFailed',
    'openAccessibilitySettings',
    'reportFirstFrame',
    'moveWindowBy',
    'getIdentity',
    'setName',
    'getLeaderboard',
    'pvpOpponents',
    'pvpMatch',
    'pvp',
    'thefts',
    'reclaim',
    'onAction',
    'sendAction',
    'onStateChanged',
    'reportMenuReady',
  ])('exposes %s on the bridge', (method) => {
    expect(preloadTs).toContain(`${method}:`);
  });

  it('inlines every shared channel literal (sandboxed preload cannot require shared/ipc)', () => {
    for (const channel of Object.values(IPC)) {
      expect(preloadTs).toContain(`'${channel}'`);
    }
  });

  it('value-imports only electron — a relative runtime require would crash the sandboxed preload', () => {
    const valueImports = [...preloadTs.matchAll(/^import (?!type[\s{])[^;]*?from '([^']+)'/gm)].map(
      (match) => match[1],
    );
    expect(valueImports).toEqual(['electron']);
  });

  it('returns unsubscribe functions from the on* subscriptions', () => {
    expect(preloadTs).toContain('ipcRenderer.removeListener');
  });
});

describe('main IPC handlers (src/main/ipc.ts)', () => {
  it.each([
    'GET_INPUT_MODE',
    'LOAD_STATE',
    'SAVE_STATE',
    'OPEN_ACCESSIBILITY_SETTINGS',
    'GET_IDENTITY',
    'SET_NAME',
    'LEADERBOARD',
    'PVP_OPPONENTS',
    'PVP_MATCH',
    'PVP',
    'THEFTS',
    'RECLAIM',
    'MENU_ACTION',
  ])(
    'registers an invoke handler for IPC.%s',
    (name) => {
      expect(mainIpcTs).toContain(`ipcMain.handle(IPC.${name}`);
    },
  );

  it('listens for the renderer first-frame report', () => {
    expect(mainIpcTs).toContain('ipcMain.on(IPC.FIRST_FRAME');
  });

  it('moves the SENDING window on validated move-window deltas (T21)', () => {
    expect(mainIpcTs).toContain('ipcMain.on(IPC.MOVE_WINDOW');
    expect(mainIpcTs).toContain('BrowserWindow.fromWebContents(event.sender)');
    expect(mainIpcTs).toContain('win.setPosition(x + dx, y + dy)');
    expect(mainIpcTs).toContain('Number.isFinite');
  });

  it('serves the live input mode from the T04 global-input state machine', () => {
    // Replaced the T03 fallback stub; the fallback DEFAULT (what SMOKE runs
    // see) is behaviorally asserted in tests/globalInput.test.ts.
    expect(mainIpcTs).toContain('getCurrentInputMode()');
    expect(mainIpcTs).toContain("from './globalInput.js'");
  });

  it('persists under the userData directory via the persistence module', () => {
    expect(mainIpcTs).toContain("app.getPath('userData')");
    expect(mainIpcTs).toContain('readSaveFile');
    expect(mainIpcTs).toContain('writeSaveFile');
  });

  it('opens the macOS Accessibility pane deep link', () => {
    expect(mainIpcTs).toContain('shell.openExternal');
    expect(mainIpcTs).toContain(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
    );
  });

  it('builds ONE net session, pinned offline under SMOKE (T43)', () => {
    // SMOKE must reach SMOKE_OK with zero fetch calls: baseUrl '' makes the
    // client short-circuit to `offline` before it ever touches the network.
    expect(mainIpcTs).toContain(
      "const baseUrl = process.env.SMOKE || blocked() ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);",
    );
    expect(mainIpcTs.match(/createNetSession\(/g)).toHaveLength(1);
    expect(mainIpcTs).toContain("online: baseUrl !== ''");
  });

  it('parses the untrusted renderer save before handing it to the net session', () => {
    const saveHandler = mainIpcTs.slice(mainIpcTs.indexOf('ipcMain.handle(IPC.SAVE_STATE'));
    expect(saveHandler.indexOf('writeSaveFile')).toBeLessThan(saveHandler.indexOf('session.onSave'));
    expect(saveHandler).toContain('try { parsed = parseSave(data); } catch {');
    expect(saveHandler).toContain('session.onSave(parsed)');
  });

  it('validates the net payload shapes at the IPC trust boundary', () => {
    expect(mainIpcTs).toContain('Number.isFinite(n)');
    expect(mainIpcTs).toContain('LEADERBOARD_DEFAULT');
  });

  it('releases official ownership and PvP progress only from the durable coordinator (v9)', () => {
    for (const channel of ['IPC.LEADERBOARD', 'IPC.PVP', 'IPC.GET_IDENTITY', 'IPC.SET_NAME']) {
      expect(mainIpcTs).toContain(`ipcMain.handle(${channel}`);
    }
    // Raw ACTION is only the local menu relay. Server-owned mutations are
    // committed first, then delivered as a single RELEASE_STATE transaction.
    expect(mainIpcTs.match(/webContents\.send\(/g)).toHaveLength(2);
    expect(mainIpcTs.lastIndexOf('webContents.send(')).toBeLessThan(mainIpcTs.indexOf('ipcMain.handle'));
    expect(mainIpcTs.match(/IPC\.ACTION/g)).toHaveLength(1);
    expect(mainIpcTs).toContain('sendToAll(IPC.RELEASE_STATE, state)');
    const coordinator = read('src/main/coordinator.ts');
    expect(coordinator).toContain("{ type: 'syncPvpProgress', wins: me.value.wins, losses: me.value.losses }");
    const mutationBoundary = coordinator.slice(coordinator.indexOf('private apply('), coordinator.indexOf('private async finishBattle'));
    expect(mutationBoundary.indexOf('this.recovery.commit')).toBeLessThan(mutationBoundary.indexOf('this.o.release'));
    const narrow = mainIpcTs.slice(mainIpcTs.indexOf('function narrowAction'), mainIpcTs.indexOf('export interface IpcOptions'));
    expect(narrow).not.toContain("case 'syncPvpProgress'");
    expect(narrow).not.toContain("case 'syncAllocation'");
  });

  it('relays over every window except the sender, statelessly (F51)', () => {
    expect(mainIpcTs).toContain(
      'function sendToOthers(sender: WebContents, channel: IpcChannel, payload: unknown): void',
    );
    const relay = mainIpcTs.slice(
      mainIpcTs.indexOf('function sendToOthers'),
      mainIpcTs.indexOf('function narrowAction'),
    );
    expect(relay).toContain('BrowserWindow.getAllWindows()');
    expect(relay).toContain('win.webContents.id !== sender.id');
    // v3 (F73): the broadcast twin T69 sends the reclaimed companion with.
    expect(relay).toContain('export function sendToAll(channel: IpcChannel, payload: unknown): void');
    // No window registry: src/main/index.ts keeps its bare registration call.
    expect(mainIndexTs).toContain('registerIpcHandlers({');
  });

  it('the save-state handler relays the written save to every other window as state-changed', () => {
    const saveHandler = mainIpcTs.slice(
      mainIpcTs.indexOf('ipcMain.handle(IPC.SAVE_STATE'),
      mainIpcTs.indexOf('ipcMain.handle(IPC.MENU_ACTION'),
    );
    expect(saveHandler.indexOf('writeSaveFile')).toBeLessThan(saveHandler.indexOf('sendToOthers'));
    expect(saveHandler).toContain('sendToOthers(event.sender, IPC.STATE_CHANGED, parsed)');
  });

  it('menu-action validates local actions and rejects server-owned actions before forwarding', () => {
    const handler = mainIpcTs.slice(
      mainIpcTs.indexOf('ipcMain.handle(IPC.MENU_ACTION'),
      mainIpcTs.indexOf('ipcMain.handle(IPC.GET_IDENTITY'),
    );
    expect(handler).toContain('narrowAction(payload)');
    expect(handler.indexOf('narrowAction')).toBeLessThan(handler.indexOf('sendToOthers'));
    expect(handler).toContain('sendToOthers(event.sender, IPC.ACTION, action)');
    // Unknown/malformed actions are dropped. Valid mutations during playback
    // receive an explicit busy error so the menu cannot claim they succeeded.
    expect(handler).toContain('if (action === null ||');
    expect(handler).toContain("['addCompanion', 'removeCompanions', 'pvpResult'].includes(action.type)) return;");
    expect(handler).toContain("if (coordinator?.replaying) throw Error('PvP 재생이 끝난 뒤 다시 시도하세요.');");
  });

  it('narrows the untrusted menu payload against the whole CollectionAction union', () => {
    const narrow = mainIpcTs.slice(
      mainIpcTs.indexOf('function narrowAction'),
      mainIpcTs.indexOf('export interface IpcOptions'),
    );
    for (const type of [
      'consume',
      'fuse',
      'reincarnate',
      'sacrifice',
      'rebirth',
      'addCompanion',
      'removeCompanions',
      'setPvpParty',
      'pvpResult',
    ]) {
      expect(narrow).toContain(`case '${type}':`);
    }
    // Unknown type → null; ids are strings; id lists are arrays of strings.
    expect(narrow).toContain('default:');
    expect(narrow).toContain('return false;');
    expect(narrow).toContain("typeof a[k] === 'string'");
    expect(narrow).toContain("Array.isArray(v) && v.every((id) => typeof id === 'string')");
    expect(mainIpcTs).toContain("import type { CollectionAction } from '../core/collection.js';");
  });

  it('rejects legacy match requests while routing thefts and reclaim through the coordinator', () => {
    const legacy = mainIpcTs.slice(mainIpcTs.indexOf('ipcMain.handle(IPC.PVP_MATCH'), mainIpcTs.indexOf('ipcMain.handle(IPC.THEFTS'));
    expect(legacy).toContain("blocked() ? 'offline' : 'sync-required'");
    expect(legacy).not.toContain('session.match(');
    expect(mainIpcTs).toContain('coordinator.opponents()');
    expect(mainIpcTs).toContain('session.opponents()');
    const thefts = mainIpcTs.slice(mainIpcTs.indexOf('ipcMain.handle(IPC.THEFTS'), mainIpcTs.indexOf('ipcMain.handle(IPC.RECLAIM'));
    expect(thefts).toContain('blocked()');
    expect(thefts).toContain("error: 'offline'");
    expect(thefts).toContain('coordinator.thefts()');
    expect(thefts).toContain('session.thefts()');
    // A theft id is still untrusted: no id, no call and no thrown error.
    const reclaim = mainIpcTs.slice(mainIpcTs.indexOf('ipcMain.handle(IPC.RECLAIM'), mainIpcTs.indexOf('ipcMain.handle(IPC.OPEN_ACCESSIBILITY_SETTINGS'));
    expect(reclaim).toContain("typeof theftId === 'string'");
    expect(reclaim).toContain('coordinator.reclaim(theftId)');
    expect(reclaim).toContain('session.reclaim(theftId)');
    expect(reclaim).toContain("Promise.resolve({ ok: false, error: 'network' })");
    expect(reclaim).not.toContain('throw');
  });

  it('rejects valid and malformed legacy PvP payloads without calling the network', async () => {
    relay.match.mockClear(); relay.pvp.mockClear();
    registerIpcHandlers({ initialSave: { kind: 'missing' } });
    const payloads = [undefined, null, {}, { matchId: 1, party: ['c1'] }, { matchId: 'm1', party: [1] },
      { matchId: 'm1', party: ['c1'] }, { opponentId: 'player-1' }];
    for (const channel of [IPC.PVP_MATCH, IPC.PVP]) {
      for (const payload of payloads) {
        expect(await relay.handlers.get(channel)!({ sender: relay.menu }, payload)).toEqual({ ok: false, error: 'sync-required' });
      }
    }
    registerIpcHandlers({ initialSave: { kind: 'error', reason: 'format' } });
    for (const channel of [IPC.PVP_MATCH, IPC.PVP]) {
      expect(await relay.handlers.get(channel)!({ sender: relay.menu }, { matchId: 'm1', party: ['c1'] }))
        .toEqual({ ok: false, error: 'offline' });
    }
    expect(relay.match).not.toHaveBeenCalled();
    expect(relay.pvp).not.toHaveBeenCalled();
  });

  it('narrowAction accepts setPvpParty and a validated pvpResult replay and drops malformed replays', () => {
    const narrow = mainIpcTs.slice(
      mainIpcTs.indexOf('function isReplay'),
      mainIpcTs.indexOf('export interface IpcOptions'),
    );
    // The party editor's action is an id list, like removeCompanions.
    expect(narrow).toContain("case 'setPvpParty':");
    expect(narrow).toContain("strs('ids')");
    // Every field the battle scene reads off a BattleReplay is checked (F73).
    expect(narrow).toContain("typeof r['opponentName'] === 'string'");
    expect(narrow).toContain("Array.isArray(r['opponentParty'])");
    expect(narrow).toContain("blow['side'] === 'A' || blow['side'] === 'D'");
    expect(narrow).toContain("typeof blow['actorId'] === 'string'");
    expect(narrow).toContain("typeof blow['targetId'] === 'string'");
    expect(narrow).toContain("typeof blow['damage'] === 'string'");
    expect(narrow).toContain("typeof blow['ko'] === 'boolean'");
    // A malformed replay is dropped and the verdict still applies.
    expect(narrow).toContain("if (!isReplay(a['replay'])) {");
    expect(narrow).toContain("delete a['replay'];");
    expect(narrow).toContain("typeof a['won'] === 'boolean'");
  });

  it('menu-ready answers the sender with the current save', () => {
    const handler = mainIpcTs.slice(mainIpcTs.indexOf('ipcMain.on(IPC.MENU_READY'));
    expect(handler).toContain(
      "event.sender.send(IPC.STATE_CHANGED, withOfficialRecord(parseSave(latestSave)))",
    );
    // The boot answer goes to the SENDER only — not through the relay.
    expect(handler.slice(0, handler.indexOf('ipcMain.on(IPC.FIRST_FRAME'))).not.toContain(
      'sendToOthers',
    );
  });

  it('is registered at startup by src/main/index.ts', () => {
    expect(mainIndexTs).toContain('registerIpcHandlers({');
  });
});
