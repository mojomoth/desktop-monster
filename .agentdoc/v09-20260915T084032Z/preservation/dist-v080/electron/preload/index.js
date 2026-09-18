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
    saveState: (s) => electron_1.ipcRenderer.invoke('desmon:save-state', s),
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
    getLeaderboard: (n) => electron_1.ipcRenderer.invoke('desmon:leaderboard', { n }),
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
