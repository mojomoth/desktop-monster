// Preload bridge (SPEC F17; GAME_ARCHITECTURE §3.3): exposes `window.desmon`.
//
// This script runs SANDBOXED with contextIsolation, so it may value-import
// ONLY 'electron' — a sandboxed preload cannot require relative modules.
// Channel names below are therefore literal copies of src/shared/ipc.ts
// (imported type-only, erased at emit); tests/ipc.test.ts keeps them in sync.
// Emitted as CommonJS by tsconfig.main.json.

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { InputModePayload, InputPayload, SaveStatePayload } from '../shared/ipc.js';

/** `ipcRenderer.on` wrapper that hands back an unsubscribe function. */
function subscribe(channel: string, cb: (payload: unknown) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: unknown): void => {
    cb(payload);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const desmon = {
  onInput: (cb: (e: InputPayload) => void): (() => void) =>
    subscribe('desmon:input', (payload) => {
      cb(payload as InputPayload);
    }),
  onInputMode: (cb: (m: InputModePayload) => void): (() => void) =>
    subscribe('desmon:input-mode', (payload) => {
      cb(payload as InputModePayload);
    }),
  onReset: (cb: () => void): (() => void) =>
    subscribe('desmon:reset', () => {
      cb();
    }),
  getInputMode: (): Promise<InputModePayload> =>
    ipcRenderer.invoke('desmon:get-input-mode') as Promise<InputModePayload>,
  loadState: (): Promise<SaveStatePayload | null> =>
    ipcRenderer.invoke('desmon:load-state') as Promise<SaveStatePayload | null>,
  saveState: (s: SaveStatePayload): Promise<void> =>
    ipcRenderer.invoke('desmon:save-state', s) as Promise<void>,
  openAccessibilitySettings: (): Promise<void> =>
    ipcRenderer.invoke('desmon:open-accessibility-settings') as Promise<void>,
  reportFirstFrame: (): void => {
    ipcRenderer.send('desmon:first-frame');
  },
  moveWindowBy: (dx: number, dy: number): void => {
    ipcRenderer.send('desmon:move-window', { dx, dy });
  },
};

/** Shape of `window.desmon`; the renderer's global.d.ts imports this (T13). */
export type DesmonApi = typeof desmon;

contextBridge.exposeInMainWorld('desmon', desmon);
