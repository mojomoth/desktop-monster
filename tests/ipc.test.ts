// T03 — shared IPC contract, preload bridge, main handlers (SPEC F17).
// src/shared/ipc.ts is plain TS and imported directly. The preload and the
// main-process handler module value-import `electron` (unloadable under
// vitest — see tests/window.test.ts), so those are source-contract tests;
// the key one keeps the preload's INLINED channel literals in sync with the
// shared constants, because the sandboxed preload cannot require shared/ipc
// at runtime. Runtime behaviour is covered by `npm run smoke`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IPC } from '../src/shared/ipc.js';

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
      RESET: 'desmon:reset',
      OPEN_ACCESSIBILITY_SETTINGS: 'desmon:open-accessibility-settings',
      FIRST_FRAME: 'desmon:first-frame',
      MOVE_WINDOW: 'desmon:move-window',
      GET_IDENTITY: 'desmon:get-identity',
      SET_NAME: 'desmon:set-name',
      LEADERBOARD: 'desmon:leaderboard',
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
    'openAccessibilitySettings',
    'reportFirstFrame',
    'moveWindowBy',
    'getIdentity',
    'setName',
    'getLeaderboard',
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
      "const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);",
    );
    expect(mainIpcTs.match(/createNetSession\(/g)).toHaveLength(1);
    expect(mainIpcTs).toContain("online: baseUrl !== ''");
  });

  it('parses the untrusted renderer save before handing it to the net session', () => {
    const saveHandler = mainIpcTs.slice(mainIpcTs.indexOf('ipcMain.handle(IPC.SAVE_STATE'));
    expect(saveHandler.indexOf('writeSaveFile')).toBeLessThan(saveHandler.indexOf('session.onSave'));
    expect(saveHandler).toContain('const parsed = parseSave(data);');
    expect(saveHandler).toContain('session.onSave(parsed)');
  });

  it('validates the net payload shapes at the IPC trust boundary', () => {
    expect(mainIpcTs).toContain('Number.isFinite(n)');
    expect(mainIpcTs).toContain('LEADERBOARD_DEFAULT');
  });

  it('never originates an action — the only send is the sender-excluding relay (T45/T49)', () => {
    for (const channel of ['IPC.LEADERBOARD', 'IPC.PVP', 'IPC.GET_IDENTITY', 'IPC.SET_NAME']) {
      expect(mainIpcTs).toContain(`ipcMain.handle(${channel}`);
    }
    // `removed`/`stolen`/`lost` reach the game only as MENU actions (T49), so
    // main's sends live inside the relay helpers — sendToOthers and, since v3
    // (F73), sendToAll for the reclaim-originated addCompanion (T69). Both sit
    // ABOVE the handlers, and IPC.ACTION is still produced by exactly one call
    // site: the menu-action relay.
    expect(mainIpcTs.match(/webContents\.send\(/g)).toHaveLength(2);
    expect(mainIpcTs.lastIndexOf('webContents.send(')).toBeLessThan(
      mainIpcTs.indexOf('ipcMain.handle'),
    );
    const relay = mainIpcTs.slice(mainIpcTs.indexOf('function sendToOthers'));
    expect(relay.indexOf('webContents.send(')).toBeLessThan(relay.indexOf('ipcMain.handle'));
    expect(mainIpcTs.match(/IPC\.ACTION/g)).toHaveLength(1);
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
    expect(mainIndexTs).toContain('registerIpcHandlers()');
  });

  it('the save-state handler relays the written save to every other window as state-changed', () => {
    const saveHandler = mainIpcTs.slice(
      mainIpcTs.indexOf('ipcMain.handle(IPC.SAVE_STATE'),
      mainIpcTs.indexOf('ipcMain.handle(IPC.MENU_ACTION'),
    );
    expect(saveHandler.indexOf('writeSaveFile')).toBeLessThan(saveHandler.indexOf('sendToOthers'));
    expect(saveHandler).toContain('sendToOthers(event.sender, IPC.STATE_CHANGED, parsed)');
  });

  it('menu-action is validated and forwarded to every other window as an action', () => {
    const handler = mainIpcTs.slice(
      mainIpcTs.indexOf('ipcMain.handle(IPC.MENU_ACTION'),
      mainIpcTs.indexOf('ipcMain.handle(IPC.GET_IDENTITY'),
    );
    expect(handler).toContain('narrowAction(payload)');
    expect(handler.indexOf('narrowAction')).toBeLessThan(handler.indexOf('sendToOthers'));
    expect(handler).toContain('sendToOthers(event.sender, IPC.ACTION, action)');
    // Unknown/malformed actions are dropped, never forwarded and never thrown.
    expect(handler).toContain('if (action !== null)');
    expect(handler).not.toContain('throw');
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

  it('pvp-match, thefts and reclaim handlers forward to the session and return its NetResult', () => {
    expect(mainIpcTs).toContain(
      'ipcMain.handle(IPC.PVP_MATCH, (): Promise<NetResult<MatchResult>> => session.match());',
    );
    expect(mainIpcTs).toContain(
      'ipcMain.handle(IPC.THEFTS, (): Promise<NetResult<TheftsResult>> => session.thefts());',
    );
    // A theft id is untrusted: no id, no call — and a refusal, never a throw.
    const reclaim = mainIpcTs.slice(
      mainIpcTs.indexOf('ipcMain.handle(IPC.RECLAIM'),
      mainIpcTs.indexOf('ipcMain.handle(IPC.OPEN_ACCESSIBILITY_SETTINGS'),
    );
    expect(reclaim).toContain("typeof theftId === 'string'");
    expect(reclaim).toContain('session.reclaim(theftId)');
    expect(reclaim).toContain("Promise.resolve({ ok: false, error: 'network' })");
    expect(reclaim).not.toContain('throw');
  });

  it('pvp handler requires a matchId string and a party string array', () => {
    const handler = mainIpcTs.slice(
      mainIpcTs.indexOf('ipcMain.handle(IPC.PVP,'),
      mainIpcTs.indexOf('ipcMain.handle(IPC.THEFTS'),
    );
    expect(handler).toContain("typeof matchId === 'string'");
    expect(handler).toContain("Array.isArray(party) && party.every((id) => typeof id === 'string')");
    expect(handler).toContain('session.pvp(matchId, party)');
    // A malformed payload is refused like a dead network — never forwarded.
    expect(handler).toContain("Promise.resolve({ ok: false, error: 'network' })");
    expect(handler).not.toContain('throw');
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
      "event.sender.send(IPC.STATE_CHANGED, parseSave(readSaveFile(app.getPath('userData'))))",
    );
    // The boot answer goes to the SENDER only — not through the relay.
    expect(handler.slice(0, handler.indexOf('ipcMain.on(IPC.FIRST_FRAME'))).not.toContain(
      'sendToOthers',
    );
  });

  it('is registered at startup by src/main/index.ts', () => {
    expect(mainIndexTs).toContain('registerIpcHandlers()');
  });
});
