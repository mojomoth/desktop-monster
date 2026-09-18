"use strict";
// Shared IPC contract (SPEC F17; GAME_ARCHITECTURE §3.2): channel constants
// plus payload types used by main, preload and renderer.
//
// NOTE: the sandboxed preload cannot require this module at RUNTIME — it
// inlines the channel literals and imports only the types from here.
// tests/ipc.test.ts asserts the preload's literal copies stay in sync.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC = void 0;
exports.IPC = {
    /** main → renderer (send): one global/simulated input event. */
    INPUT: 'desmon:input',
    /** main → renderer (send): input-mode change (global vs fallback). */
    INPUT_MODE: 'desmon:input-mode',
    /** renderer → main (invoke): current input mode (initial state). */
    GET_INPUT_MODE: 'desmon:get-input-mode',
    /** renderer → main (invoke): raw parsed save JSON, or null. */
    LOAD_STATE: 'desmon:load-state',
    /** renderer → main (invoke): persist the save file (atomic tmp + rename). */
    SAVE_STATE: 'desmon:save-state',
    /** main → windows (send): the latest save failed; no success state is broadcast. */
    SAVE_FAILED: 'desmon:save-failed',
    GET_SAVE_STATUS: 'desmon:get-save-status',
    SAVE_STATUS: 'desmon:save-status',
    GET_SETTINGS: 'desmon:get-settings',
    UPDATE_SETTINGS: 'desmon:update-settings',
    SETTINGS_CHANGED: 'desmon:settings-changed',
    CONNECT_GLOBAL_INPUT: 'desmon:connect-global-input',
    OPEN_SAVE_FOLDER: 'desmon:open-save-folder',
    QUIT: 'desmon:quit',
    /** main → renderer (send): tray "Reset Progress" was clicked. */
    RESET: 'desmon:reset',
    /** renderer → main (invoke): open the macOS Accessibility settings pane. */
    OPEN_ACCESSIBILITY_SETTINGS: 'desmon:open-accessibility-settings',
    /** renderer → main (send): first painted frame — drives smoke (T13). */
    FIRST_FRAME: 'desmon:first-frame',
    /** renderer → main (send): whole-window drag — move the overlay by a cursor delta. */
    MOVE_WINDOW: 'desmon:move-window',
    /** renderer → main (invoke): name/playerId/online of this installation (F49). */
    GET_IDENTITY: 'desmon:get-identity',
    /** renderer → main (invoke): rename the player; junk names are ignored. */
    SET_NAME: 'desmon:set-name',
    /** renderer → main (invoke): top-N leaderboard rows plus this player's row. */
    LEADERBOARD: 'desmon:leaderboard',
    /** renderer → main (invoke): opponents with hero, party and official record. */
    PVP_OPPONENTS: 'desmon:pvp-opponents',
    /** renderer → main (invoke): step 1 of a battle — the opponent preview (F73). */
    PVP_MATCH: 'desmon:pvp-match',
    /** renderer → main (invoke): resolve one asynchronous PvP battle. */
    PVP: 'desmon:pvp',
    /** renderer → main (invoke): what PvP took from me, still reclaimable (F73). */
    THEFTS: 'desmon:thefts',
    /** renderer → main (invoke): take one stolen companion back (F73). */
    RECLAIM: 'desmon:reclaim',
    /** main → game window (send): a validated collection action to apply (F51). */
    ACTION: 'desmon:action',
    /** menu → main (invoke): a collection action, relayed as ACTION (F51). */
    MENU_ACTION: 'desmon:menu-action',
    /** main → menu (send): the save just written, or the one on disk (F51). */
    STATE_CHANGED: 'desmon:state-changed',
    /** menu → main (send): the menu is live — answered with STATE_CHANGED. */
    MENU_READY: 'desmon:menu-ready',
};
