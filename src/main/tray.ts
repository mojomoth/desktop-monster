// Tray + context menu (SPEC F23, Assumption 16). Electron-free by injection
// (persistence.ts pattern): Tray/Menu construction is passed in by
// src/main/index.ts, so the menu contents and the rebuild-on-mode-change
// behavior have real vitest coverage without an Electron process.

import type { InputModePayload } from '../shared/ipc.js';

/** First (disabled) menu row; tests pin the version against package.json. */
export const TRAY_TITLE = 'DesMon v0.2.0';
export const TRAY_TOOLTIP = 'DesMon';
export const INPUT_GLOBAL_LABEL = 'Input: Global';
export const INPUT_FALLBACK_LABEL = 'Input: Window-only (grant Accessibility…)';
export const COLLECTION_LABEL = 'Collection & Battle…';
export const RESET_LABEL = 'Reset Progress';
export const QUIT_LABEL = 'Quit';

/** Structural subset of Electron.MenuItemConstructorOptions this emits. */
export interface TrayMenuItem {
  label?: string;
  type?: 'separator';
  enabled?: boolean;
  click?: () => void;
}

export interface TrayMenuActions {
  /** Fallback status row clicked → Accessibility pane deep link. */
  openAccessibilitySettings: () => void;
  /** "Collection & Battle…" clicked → open the menu window (SPEC F52). */
  openCollection: () => void;
  /** "Reset Progress" clicked → send desmon:reset to the renderer. */
  resetProgress: () => void;
  /** "Quit" clicked → app.quit(). */
  quit: () => void;
}

/**
 * Pure menu description for an input mode. In global mode the status row is
 * informational (disabled); in fallback mode clicking it opens the macOS
 * Accessibility settings pane so the user can grant the permission.
 */
export function buildTrayMenuTemplate(
  mode: InputModePayload,
  actions: TrayMenuActions,
): TrayMenuItem[] {
  const status: TrayMenuItem =
    mode.mode === 'global'
      ? { label: INPUT_GLOBAL_LABEL, enabled: false }
      : { label: INPUT_FALLBACK_LABEL, click: actions.openAccessibilitySettings };
  return [
    { label: TRAY_TITLE, enabled: false },
    status,
    { type: 'separator' },
    { label: COLLECTION_LABEL, click: actions.openCollection },
    { label: RESET_LABEL, click: actions.resetProgress },
    { label: QUIT_LABEL, click: actions.quit },
  ];
}

/** The subset of Electron.Tray this module drives. */
export interface TrayLike {
  setToolTip(tip: string): void;
  setContextMenu(menu: unknown): void;
}

export interface TrayDeps {
  /** Wraps `new Tray(nativeImage.createFromBuffer(encodeTrayIconPng()))`. */
  createTray: () => TrayLike;
  /** Wraps `Menu.buildFromTemplate(template)`. */
  buildMenu: (template: TrayMenuItem[]) => unknown;
  /** Initial input mode — main wires getCurrentInputMode (T04). */
  getInputMode: () => InputModePayload;
  actions: TrayMenuActions;
}

export interface TrayController {
  /** Rebuild the context menu for a new input mode (T04 mode events). */
  refresh(mode: InputModePayload): void;
}

// Module-scope reference (Assumption 16): without a live reference the Tray
// would be garbage-collected and the menu-bar icon silently vanish.
let activeTray: TrayLike | null = null;

/** The currently live tray, if any (module-scope keep-alive; used by tests). */
export function getActiveTray(): TrayLike | null {
  return activeTray;
}

/** Create the tray, apply tooltip + initial menu, return the rebuild handle. */
export function setupTray(deps: TrayDeps): TrayController {
  const tray = deps.createTray();
  activeTray = tray;
  tray.setToolTip(TRAY_TOOLTIP);
  const refresh = (mode: InputModePayload): void => {
    tray.setContextMenu(deps.buildMenu(buildTrayMenuTemplate(mode, deps.actions)));
  };
  refresh(deps.getInputMode());
  return { refresh };
}
