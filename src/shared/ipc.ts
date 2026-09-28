// Shared IPC contract (SPEC F17; GAME_ARCHITECTURE §3.2): channel constants
// plus payload types used by main, preload and renderer.
//
// NOTE: the sandboxed preload cannot require this module at RUNTIME — it
// inlines the channel literals and imports only the types from here.
// tests/ipc.test.ts asserts the preload's literal copies stay in sync.

export const IPC = {
  RAID_STATE: 'desmon:raid-state',
  GET_RAID_STATE: 'desmon:get-raid-state',
  RAID_ACTION: 'desmon:raid-action',
  RAID_DAMAGE: 'desmon:raid-damage',
  RAID_CONNECTION: 'desmon:raid-connection',
  GET_RAID_CONNECTION: 'desmon:get-raid-connection',
  CONFIRM: 'desmon:confirm',
  CONFIRM_RESPONSE: 'desmon:confirm-response',
  THEFT_NOTICE: 'desmon:theft-notice',

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
  PREPARE_STATE: 'desmon:prepare-state',
  CAPTURE_STATE: 'desmon:capture-state',
  RELEASE_STATE: 'desmon:release-state',
  GET_GENERATION: 'desmon:get-generation',
  RESET_PROGRESS: 'desmon:reset-progress',
  LIST_CHECKPOINTS: 'desmon:list-checkpoints',
  RESTORE_CHECKPOINT: 'desmon:restore-checkpoint',
  BATTLE_OPPONENT: 'desmon:battle-opponent',
  LAST_BATTLE: 'desmon:last-battle',
  PENDING_REPLAYS: 'desmon:pending-replays',
  REPLAY_COMPLETE: 'desmon:replay-complete',
  PVP_PLAYBACK: 'desmon:pvp-playback',
  EXPORT_PNG: 'desmon:export-png',
  FIELD_IMAGE: 'desmon:field-image',
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
  /** field → main → menu: applied/rejected result, distinct from dispatch acknowledgment. */
  ACTION_RESULT: 'desmon:action-result',
  /** menu → main (invoke): a collection action, relayed as ACTION (F51). */
  MENU_ACTION: 'desmon:menu-action',
  /** main → menu (send): the save just written, or the one on disk (F51). */
  STATE_CHANGED: 'desmon:state-changed',
  /** menu → main (send): the menu is live — answered with STATE_CHANGED. */
  MENU_READY: 'desmon:menu-ready',
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

export interface GameSettings {
  gameScale: number;
  muted: boolean;
  screenShake: boolean;
  welcomeSeen: boolean;
  globalInputRequested: boolean;
}

export interface SettingsResult { ok: boolean; settings: GameSettings }
export interface ConnectInputResult { ok: boolean; mode: InputModePayload }
export interface SaveStatus {
  state: 'ready' | 'write-error' | 'load-error';
  reason?: string;
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

/** Payload of `desmon:pvp` (F73): the match from step 1 plus my chosen party. */
export interface PvpPayload {
  matchId: string;
  party: string[];
}

export interface PvpMatchPayload { opponentId?: string }

/** Payload of `desmon:reclaim`: which theft to take back. */
export interface ReclaimPayload {
  theftId: string;
}

/** Payload of `desmon:leaderboard`: how many rows; absent/invalid = the default. */
export interface LeaderboardQueryPayload {
  n?: number;
  metric?: import('./api.js').LeaderboardMetric;
}

export interface PrepareStatePayload { requestId: string; generation: number }
export interface ReleaseStatePayload { generation: number; save: unknown; replace: boolean; actions: unknown[]; blocked: boolean; replays?: import('./api.js').PvpPresentation[] }
export interface CheckpointInfo { id: string; at: number; reason: 'reset' | 'restore'; level: number; bestIndex: number; companions: number }
export interface OperationResult { ok: boolean; error?: string }
export interface LastBattleInfo { at: number; before: unknown; result: import('./api.js').PvpResult }
export interface ExportPngPayload { dataUrl: string; destination: 'file' | 'clipboard'; name: string }
export interface ExportPngResult { ok: boolean; canceled?: boolean; error?: string }

/** Payload of `desmon:move-window`: cursor delta (DIPs) since the last event. */
export interface MoveWindowPayload {
  dx: number;
  dy: number;
}

/**
 * Payload of `desmon:menu-action` / `desmon:action`: a core `CollectionAction`.
 * Opaque here so this module stays import-free from core (the sandboxed
 * preload may only carry type imports); main narrows it before relaying.
 */
export type MenuActionPayload = unknown;

export interface ActionResultPayload { action: MenuActionPayload; ok: boolean; error?: string }

export interface RaidDamagePayload { raidId: string; damage: string; crit: boolean; fever: boolean }
export interface PopupSpec { title: string; body: string | string[]; buttons: { label: string; value: string; primary?: boolean }[]; cancelValue?: string }
export interface PopupRequest { id: string; spec: PopupSpec }
