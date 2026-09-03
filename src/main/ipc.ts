// Main-process IPC handlers (SPEC F17 + F22 main half; GAME_ARCHITECTURE §3.2).

import { randomUUID } from 'node:crypto';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import type { WebContents } from 'electron';
import type { CollectionAction } from '../core/collection.js';
import { parseSave } from '../core/index.js';
import { LEADERBOARD_DEFAULT, LEADERBOARD_MAX } from '../shared/api.js';
import type {
  IdentityPayload,
  LeaderboardResult,
  NetResult,
  PvpResult,
} from '../shared/api.js';
import { IPC } from '../shared/ipc.js';
import type {
  InputModePayload,
  IpcChannel,
  LeaderboardQueryPayload,
  MoveWindowPayload,
  SetNamePayload,
} from '../shared/ipc.js';
import { SERVER_URL } from '../shared/serverUrl.js';
import { getCurrentInputMode } from './globalInput.js';
import { createNetClient, createNetSession } from './net.js';
import { readSaveFile, writeSaveFile } from './persistence.js';

/** Deep link to the macOS Privacy & Security → Accessibility pane. */
export const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';

/**
 * Stateless relay (SPEC F51): deliver `payload` to every window EXCEPT the one
 * that sent the event. With the overlay + the menu that is exact and needs no
 * window registry, so src/main/index.ts stays untouched.
 */
function sendToOthers(sender: WebContents, channel: IpcChannel, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents.id !== sender.id) {
      win.webContents.send(channel, payload);
    }
  }
}

/**
 * Narrow an untrusted menu payload to a CollectionAction: `type` must be in
 * core's union and every id field a string (id lists, arrays of strings).
 * Anything else yields null and is dropped — the menu must not be able to
 * inject junk into the game window's state, and a bad payload never throws.
 * ponytail: nested Companion objects are only shape-checked here; parseSave
 * re-validates them when the game window flushes the resulting save.
 */
function narrowAction(payload: unknown): CollectionAction | null {
  const a = (payload ?? {}) as Record<string, unknown>;
  const str = (k: string): boolean => typeof a[k] === 'string';
  const obj = (k: string): boolean => typeof a[k] === 'object' && a[k] !== null;
  const strs = (k: string): boolean => {
    const v = a[k];
    return Array.isArray(v) && v.every((id) => typeof id === 'string');
  };
  const ok = ((): boolean => {
    switch (a['type']) {
      case 'consume':
        return str('targetId') && str('foodId');
      case 'fuse':
        return str('aId') && str('bId');
      case 'reincarnate':
      case 'sacrifice':
        return str('id');
      case 'rebirth':
        return true;
      case 'addCompanion':
        return obj('companion');
      case 'removeCompanions':
        return strs('ids');
      case 'pvpResult':
        return (
          typeof a['won'] === 'boolean' &&
          (a['stolen'] === null || obj('stolen')) &&
          (a['lostId'] === null || str('lostId'))
        );
      default:
        return false;
    }
  })();
  return ok ? (a as unknown as CollectionAction) : null;
}

export interface IpcOptions {
  /** Fired when the renderer reports its first painted frame (smoke, T13). */
  onFirstFrame?: () => void;
}

/** Register all renderer→main handlers. Call once, before the window loads. */
export function registerIpcHandlers(options: IpcOptions = {}): void {
  // SPEC F49: smoke runs offline BY CODE — an empty baseUrl makes the net
  // client resolve `{ ok: false, error: 'offline' }` without ever calling
  // fetch, so `npm run smoke` needs no network and no server.
  const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);
  const session = createNetSession({
    client: createNetClient({ baseUrl }),
    userDataDir: app.getPath('userData'),
    online: baseUrl !== '',
    randomUUID,
  });

  // Live state from the T04 global-input state machine; before/without
  // startGlobalInput (e.g. SMOKE=1) it reports the fallback default.
  ipcMain.handle(IPC.GET_INPUT_MODE, (): InputModePayload => getCurrentInputMode());

  // Raw parsed JSON or null — validation is core's job (T08).
  ipcMain.handle(IPC.LOAD_STATE, (): unknown => readSaveFile(app.getPath('userData')));

  ipcMain.handle(IPC.SAVE_STATE, (event, data: unknown): void => {
    writeSaveFile(app.getPath('userData'), data);
    // The renderer's save is untrusted input: parse it, never cast it. The
    // session uploads in the background and its result is deliberately
    // dropped — main never pushes roster changes at the game window.
    const parsed = parseSave(data);
    session.onSave(parsed);
    // …but the OTHER window (the menu) is showing a save it did not write.
    sendToOthers(event.sender, IPC.STATE_CHANGED, parsed);
  });

  // Menu → game relay (SPEC F51). Unknown/malformed actions are ignored.
  ipcMain.handle(IPC.MENU_ACTION, (event, payload: unknown): void => {
    const action = narrowAction(payload);
    if (action !== null) {
      sendToOthers(event.sender, IPC.ACTION, action);
    }
  });

  ipcMain.handle(IPC.GET_IDENTITY, (): IdentityPayload => session.identity());

  ipcMain.handle(IPC.SET_NAME, (_event, payload: unknown): IdentityPayload => {
    const { name } = (payload as Partial<SetNamePayload> | null | undefined) ?? {};
    return session.setName(name);
  });

  ipcMain.handle(IPC.LEADERBOARD, (_event, p: unknown): Promise<NetResult<LeaderboardResult>> => {
    const { n } = (p as Partial<LeaderboardQueryPayload> | null | undefined) ?? {};
    const count =
      typeof n === 'number' && Number.isFinite(n)
        ? Math.min(Math.max(Math.trunc(n), 1), LEADERBOARD_MAX)
        : LEADERBOARD_DEFAULT;
    return session.leaderboard(count);
  });

  ipcMain.handle(IPC.PVP, (): Promise<NetResult<PvpResult>> => session.pvp());

  ipcMain.handle(IPC.OPEN_ACCESSIBILITY_SETTINGS, async (): Promise<void> => {
    await shell.openExternal(ACCESSIBILITY_SETTINGS_URL);
  });

  // The menu's single boot path: answer the SENDER with the save on disk.
  ipcMain.on(IPC.MENU_READY, (event) => {
    event.sender.send(IPC.STATE_CHANGED, parseSave(readSaveFile(app.getPath('userData'))));
  });

  ipcMain.on(IPC.FIRST_FRAME, () => {
    options.onFirstFrame?.();
  });

  // Whole-window drag (SPEC Assumption 10): the renderer streams cursor
  // deltas while a drag is in flight; moving the window that SENT the event
  // keeps this handler stateless. Deltas are validated — a compromised
  // renderer must not be able to throw the window to NaN-land.
  ipcMain.on(IPC.MOVE_WINDOW, (event, payload: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === null) {
      return;
    }
    const delta = payload as Partial<MoveWindowPayload> | null | undefined;
    const dx = typeof delta?.dx === 'number' && Number.isFinite(delta.dx) ? Math.round(delta.dx) : 0;
    const dy = typeof delta?.dy === 'number' && Number.isFinite(delta.dy) ? Math.round(delta.dy) : 0;
    if (dx === 0 && dy === 0) {
      return;
    }
    const [x = 0, y = 0] = win.getPosition();
    win.setPosition(x + dx, y + dy);
  });
}
