"use strict";
// Preload bridge (SPEC F17; GAME_ARCHITECTURE §3.3): exposes `window.desmon`.
//
// This script runs SANDBOXED with contextIsolation, so it may value-import
// ONLY 'electron' — a sandboxed preload cannot require relative modules.
// Channel names below are therefore literal copies of src/shared/ipc.ts
// (imported type-only, erased at emit); tests/ipc.test.ts keeps them in sync.
// Emitted as CommonJS by tsconfig.main.json.
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/** `ipcRenderer.on` wrapper that hands back an unsubscribe function. */
function subscribe(channel, cb) {
    const listener = (_event, payload) => {
        cb(payload);
    };
    electron_1.ipcRenderer.on(channel, listener);
    return () => {
        electron_1.ipcRenderer.removeListener(channel, listener);
    };
}
const desmon = {
    onPrepareState: (cb) => subscribe('desmon:prepare-state', p => cb(p)),
    captureState: (requestId, generation, save) => electron_1.ipcRenderer.invoke('desmon:capture-state', { requestId, generation, save }),
    onReleaseState: (cb) => subscribe('desmon:release-state', p => cb(p)),
    getGeneration: () => electron_1.ipcRenderer.invoke('desmon:get-generation'),
    resetProgress: () => electron_1.ipcRenderer.invoke('desmon:reset-progress'),
    listCheckpoints: () => electron_1.ipcRenderer.invoke('desmon:list-checkpoints'),
    restoreCheckpoint: (id) => electron_1.ipcRenderer.invoke('desmon:restore-checkpoint', id),
    battleOpponent: (opponentId) => electron_1.ipcRenderer.invoke('desmon:battle-opponent', opponentId),
    getLastBattle: () => electron_1.ipcRenderer.invoke('desmon:last-battle'),
    getPendingReplays: () => electron_1.ipcRenderer.invoke('desmon:pending-replays'),
    completeReplay: (id) => electron_1.ipcRenderer.invoke('desmon:replay-complete', id),
    onPvpPlayback: (cb) => subscribe('desmon:pvp-playback', p => cb(p === true)),
    exportPng: (payload) => electron_1.ipcRenderer.invoke('desmon:export-png', payload),
    getFieldImage: () => electron_1.ipcRenderer.invoke('desmon:field-image'),
    getSettings: () => electron_1.ipcRenderer.invoke('desmon:get-settings'),
    updateSettings: (patch) => electron_1.ipcRenderer.invoke('desmon:update-settings', patch),
    onSettingsChanged: (cb) => subscribe('desmon:settings-changed', (value) => { cb(value); }),
    connectGlobalInput: () => electron_1.ipcRenderer.invoke('desmon:connect-global-input'),
    getSaveStatus: () => electron_1.ipcRenderer.invoke('desmon:get-save-status'),
    onSaveStatus: (cb) => subscribe('desmon:save-status', (value) => { cb(value); }),
    openSaveFolder: () => electron_1.ipcRenderer.invoke('desmon:open-save-folder'),
    quit: () => electron_1.ipcRenderer.invoke('desmon:quit'),
    onInput: (cb) => subscribe('desmon:input', (payload) => {
        cb(payload);
    }),
    onInputMode: (cb) => subscribe('desmon:input-mode', (payload) => {
        cb(payload);
    }),
    onReset: (cb) => subscribe('desmon:reset', () => {
        cb();
    }),
    getInputMode: () => electron_1.ipcRenderer.invoke('desmon:get-input-mode'),
    loadState: () => electron_1.ipcRenderer.invoke('desmon:load-state'),
    saveState: (s, generation = 0) => electron_1.ipcRenderer.invoke('desmon:save-state', s, generation),
    onSaveFailed: (cb) => subscribe('desmon:save-failed', () => { cb(); }),
    openAccessibilitySettings: () => electron_1.ipcRenderer.invoke('desmon:open-accessibility-settings'),
    reportFirstFrame: () => {
        electron_1.ipcRenderer.send('desmon:first-frame');
    },
    moveWindowBy: (dx, dy) => {
        electron_1.ipcRenderer.send('desmon:move-window', { dx, dy });
    },
    getIdentity: () => electron_1.ipcRenderer.invoke('desmon:get-identity'),
    setName: (name) => electron_1.ipcRenderer.invoke('desmon:set-name', { name }),
    getLeaderboard: (n, metric) => electron_1.ipcRenderer.invoke('desmon:leaderboard', { n, metric }),
    pvpOpponents: () => electron_1.ipcRenderer.invoke('desmon:pvp-opponents'),
    pvpMatch: (opponentId) => electron_1.ipcRenderer.invoke('desmon:pvp-match', { opponentId }),
    pvp: (matchId, party) => electron_1.ipcRenderer.invoke('desmon:pvp', { matchId, party }),
    thefts: () => electron_1.ipcRenderer.invoke('desmon:thefts'),
    reclaim: (theftId) => electron_1.ipcRenderer.invoke('desmon:reclaim', { theftId }),
    onAction: (cb) => subscribe('desmon:action', (payload) => {
        cb(payload);
    }),
    sendAction: (a) => electron_1.ipcRenderer.invoke('desmon:menu-action', a),
    onStateChanged: (cb) => subscribe('desmon:state-changed', (payload) => {
        cb(payload);
    }),
    reportMenuReady: () => {
        electron_1.ipcRenderer.send('desmon:menu-ready');
    },
};
electron_1.contextBridge.exposeInMainWorld('desmon', desmon);
