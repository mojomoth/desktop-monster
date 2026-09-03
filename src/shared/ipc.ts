// Shared IPC contract (SPEC F17; GAME_ARCHITECTURE §3.2): channel constants
// plus payload types used by main, preload and renderer.
//
// NOTE: the sandboxed preload cannot require this module at RUNTIME — it
// inlines the channel literals and imports only the types from here.
// tests/ipc.test.ts asserts the preload's literal copies stay in sync.

export const IPC = {
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
  /** renderer → main (invoke): resolve one asynchronous PvP battle. */
  PVP: 'desmon:pvp',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

/** Where an input event came from. */
export type InputSource = 'keyboard' | 'mouse';

/** Payload of `desmon:input`. */
export interface InputPayload {
  source: InputSource;
}

/** How input is currently captured. */
export type InputMode = 'global' | 'fallback';

/** Payload of `desmon:input-mode` / result of `desmon:get-input-mode`. */
export interface InputModePayload {
  mode: InputMode;
  accessibilityGranted: boolean;
}

/**
 * Raw save-state payload carried over `desmon:save-state` / `desmon:load-state`.
 * Main treats it as opaque JSON; parsing/validation is core's job — the
 * concrete SaveFileV1 schema lands in T08 and this alias tightens then.
 */
export type SaveStatePayload = unknown;

/** Payload of `desmon:set-name`. Anything not matching NICK_RE is dropped by main. */
export interface SetNamePayload {
  name: string;
}

/** Payload of `desmon:leaderboard`: how many rows; absent/invalid = the default. */
export interface LeaderboardQueryPayload {
  n?: number;
}

/** Payload of `desmon:move-window`: cursor delta (DIPs) since the last event. */
export interface MoveWindowPayload {
  dx: number;
  dy: number;
}
