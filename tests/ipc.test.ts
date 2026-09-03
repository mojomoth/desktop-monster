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
      PVP: 'desmon:pvp',
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
    'pvp',
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
    'PVP',
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
    expect(saveHandler).toContain('session.onSave(parseSave(data))');
  });

  it('validates the net payload shapes at the IPC trust boundary', () => {
    expect(mainIpcTs).toContain('Number.isFinite(n)');
    expect(mainIpcTs).toContain('LEADERBOARD_DEFAULT');
  });

  it('never pushes roster changes at the game window (removed is the menu\'s job, T49)', () => {
    for (const channel of ['IPC.LEADERBOARD', 'IPC.PVP', 'IPC.GET_IDENTITY', 'IPC.SET_NAME']) {
      expect(mainIpcTs).toContain(`ipcMain.handle(${channel}`);
    }
    expect(mainIpcTs).not.toContain('webContents.send');
  });

  it('is registered at startup by src/main/index.ts', () => {
    expect(mainIndexTs).toContain('registerIpcHandlers()');
  });
});
