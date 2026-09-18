// Preload bridge (SPEC F17; GAME_ARCHITECTURE §3.3): exposes `window.desmon`.
//
// This script runs SANDBOXED with contextIsolation, so it may value-import
// ONLY 'electron' — a sandboxed preload cannot require relative modules.
// Channel names below are therefore literal copies of src/shared/ipc.ts
// (imported type-only, erased at emit); tests/ipc.test.ts keeps them in sync.
// Emitted as CommonJS by tsconfig.main.json.

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  IdentityPayload,
  LeaderboardResult,
  MatchResult,
  NetResult,
  OpponentListResult,
  PvpResult,
  ReclaimResult,
  TheftsResult,
  LeaderboardMetric,
  PvpPresentation,
} from '../shared/api.js';
import type {
  GameSettings,
  SettingsResult,
  ConnectInputResult,
  SaveStatus,
  InputModePayload,
  InputPayload,
  MenuActionPayload,
  SaveStatePayload,
  PrepareStatePayload, ReleaseStatePayload, CheckpointInfo, OperationResult, LastBattleInfo, ExportPngPayload, ExportPngResult,
} from '../shared/ipc.js';

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
  onPrepareState: (cb: (p: PrepareStatePayload) => void): (() => void) => subscribe('desmon:prepare-state', p => cb(p as PrepareStatePayload)),
  captureState: (requestId: string, generation: number, save: unknown): Promise<void> => ipcRenderer.invoke('desmon:capture-state', { requestId, generation, save }) as Promise<void>,
  onReleaseState: (cb: (p: ReleaseStatePayload) => void): (() => void) => subscribe('desmon:release-state', p => cb(p as ReleaseStatePayload)),
  getGeneration: (): Promise<number> => ipcRenderer.invoke('desmon:get-generation') as Promise<number>,
  resetProgress: (): Promise<OperationResult> => ipcRenderer.invoke('desmon:reset-progress') as Promise<OperationResult>,
  listCheckpoints: (): Promise<CheckpointInfo[]> => ipcRenderer.invoke('desmon:list-checkpoints') as Promise<CheckpointInfo[]>,
  restoreCheckpoint: (id: string): Promise<OperationResult> => ipcRenderer.invoke('desmon:restore-checkpoint', id) as Promise<OperationResult>,
  battleOpponent: (opponentId: string): Promise<NetResult<PvpResult>> => ipcRenderer.invoke('desmon:battle-opponent', opponentId) as Promise<NetResult<PvpResult>>,
  getLastBattle: (): Promise<LastBattleInfo | null> => ipcRenderer.invoke('desmon:last-battle') as Promise<LastBattleInfo | null>,
  getPendingReplays: (): Promise<PvpPresentation[]> => ipcRenderer.invoke('desmon:pending-replays') as Promise<PvpPresentation[]>,
  completeReplay: (id: string): Promise<boolean> => ipcRenderer.invoke('desmon:replay-complete', id) as Promise<boolean>,
  onPvpPlayback: (cb: (active: boolean) => void): (() => void) => subscribe('desmon:pvp-playback', p => cb(p === true)),
  exportPng: (payload: ExportPngPayload): Promise<ExportPngResult> => ipcRenderer.invoke('desmon:export-png', payload) as Promise<ExportPngResult>,
  getFieldImage: (): Promise<string | null> => ipcRenderer.invoke('desmon:field-image') as Promise<string | null>,
  getSettings: (): Promise<GameSettings> => ipcRenderer.invoke('desmon:get-settings') as Promise<GameSettings>,
  updateSettings: (patch: Partial<GameSettings>): Promise<SettingsResult> =>
    ipcRenderer.invoke('desmon:update-settings', patch) as Promise<SettingsResult>,
  onSettingsChanged: (cb: (settings: GameSettings) => void): (() => void) =>
    subscribe('desmon:settings-changed', (value) => { cb(value as GameSettings); }),
  connectGlobalInput: (): Promise<ConnectInputResult> =>
    ipcRenderer.invoke('desmon:connect-global-input') as Promise<ConnectInputResult>,
  getSaveStatus: (): Promise<SaveStatus> => ipcRenderer.invoke('desmon:get-save-status') as Promise<SaveStatus>,
  onSaveStatus: (cb: (status: SaveStatus) => void): (() => void) =>
    subscribe('desmon:save-status', (value) => { cb(value as SaveStatus); }),
  openSaveFolder: (): Promise<void> => ipcRenderer.invoke('desmon:open-save-folder') as Promise<void>,
  quit: (): Promise<void> => ipcRenderer.invoke('desmon:quit') as Promise<void>,
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
  saveState: (s: SaveStatePayload, generation = 0): Promise<boolean> =>
    ipcRenderer.invoke('desmon:save-state', s, generation) as Promise<boolean>,
  onSaveFailed: (cb: () => void): (() => void) =>
    subscribe('desmon:save-failed', () => { cb(); }),
  openAccessibilitySettings: (): Promise<void> =>
    ipcRenderer.invoke('desmon:open-accessibility-settings') as Promise<void>,
  reportFirstFrame: (): void => {
    ipcRenderer.send('desmon:first-frame');
  },
  moveWindowBy: (dx: number, dy: number): void => {
    ipcRenderer.send('desmon:move-window', { dx, dy });
  },
  getIdentity: (): Promise<IdentityPayload> =>
    ipcRenderer.invoke('desmon:get-identity') as Promise<IdentityPayload>,
  setName: (name: string): Promise<IdentityPayload> =>
    ipcRenderer.invoke('desmon:set-name', { name }) as Promise<IdentityPayload>,
  getLeaderboard: (n?: number, metric?: LeaderboardMetric): Promise<NetResult<LeaderboardResult>> =>
    ipcRenderer.invoke('desmon:leaderboard', { n, metric }) as Promise<NetResult<LeaderboardResult>>,
  pvpOpponents: (): Promise<NetResult<OpponentListResult>> =>
    ipcRenderer.invoke('desmon:pvp-opponents') as Promise<NetResult<OpponentListResult>>,
  pvpMatch: (opponentId?: string): Promise<NetResult<MatchResult>> =>
    ipcRenderer.invoke('desmon:pvp-match', { opponentId }) as Promise<NetResult<MatchResult>>,
  pvp: (matchId: string, party: string[]): Promise<NetResult<PvpResult>> =>
    ipcRenderer.invoke('desmon:pvp', { matchId, party }) as Promise<NetResult<PvpResult>>,
  thefts: (): Promise<NetResult<TheftsResult>> =>
    ipcRenderer.invoke('desmon:thefts') as Promise<NetResult<TheftsResult>>,
  reclaim: (theftId: string): Promise<NetResult<ReclaimResult>> =>
    ipcRenderer.invoke('desmon:reclaim', { theftId }) as Promise<NetResult<ReclaimResult>>,
  onAction: (cb: (a: MenuActionPayload) => void): (() => void) =>
    subscribe('desmon:action', (payload) => {
      cb(payload);
    }),
  sendAction: (a: MenuActionPayload): Promise<void> =>
    ipcRenderer.invoke('desmon:menu-action', a) as Promise<void>,
  onStateChanged: (cb: (s: SaveStatePayload) => void): (() => void) =>
    subscribe('desmon:state-changed', (payload) => {
      cb(payload);
    }),
  reportMenuReady: (): void => {
    ipcRenderer.send('desmon:menu-ready');
  },
};

/** Shape of `window.desmon`; the renderer's global.d.ts imports this (T13). */
export type DesmonApi = typeof desmon;

contextBridge.exposeInMainWorld('desmon', desmon);
