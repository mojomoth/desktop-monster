// Main-process IPC handlers (SPEC F17 + F22 main half; GAME_ARCHITECTURE §3.2).

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { IPC } from '../shared/ipc.js';
import type { InputModePayload, MoveWindowPayload } from '../shared/ipc.js';
import { getCurrentInputMode } from './globalInput.js';
import { readSaveFile, writeSaveFile } from './persistence.js';

/** Deep link to the macOS Privacy & Security → Accessibility pane. */
export const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';

export interface IpcOptions {
  /** Fired when the renderer reports its first painted frame (smoke, T13). */
  onFirstFrame?: () => void;
}

/** Register all renderer→main handlers. Call once, before the window loads. */
export function registerIpcHandlers(options: IpcOptions = {}): void {
  // Live state from the T04 global-input state machine; before/without
  // startGlobalInput (e.g. SMOKE=1) it reports the fallback default.
  ipcMain.handle(IPC.GET_INPUT_MODE, (): InputModePayload => getCurrentInputMode());

  // Raw parsed JSON or null — validation is core's job (T08).
  ipcMain.handle(IPC.LOAD_STATE, (): unknown => readSaveFile(app.getPath('userData')));

  ipcMain.handle(IPC.SAVE_STATE, (_event, data: unknown): void => {
    writeSaveFile(app.getPath('userData'), data);
  });

  ipcMain.handle(IPC.OPEN_ACCESSIBILITY_SETTINGS, async (): Promise<void> => {
    await shell.openExternal(ACCESSIBILITY_SETTINGS_URL);
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
