// Tray + context menu (SPEC F23, Assumption 16). Electron-free by injection
// (persistence.ts pattern): Tray/Menu construction is passed in by
// src/main/index.ts, so the menu contents and the rebuild-on-mode-change
// behavior have real vitest coverage without an Electron process.

import type { GameSettings, InputModePayload, SaveStatus } from '../shared/ipc.js';
import { GAME_SCALES, SCALE_LABELS } from './settings.js';

/** First (disabled) menu row; tests pin the version against package.json. */
export const TRAY_TITLE = 'DesMon v0.9.0';
export const TRAY_TOOLTIP = 'DesMon';
export const INPUT_GLOBAL_LABEL = '입력: 전체 입력 연결됨';
export const INPUT_FALLBACK_LABEL = '입력: 게임 창 안에서만 · 연결 안내…';
export const COLLECTION_LABEL = '영웅과 모험 기록…';
export const SETTINGS_LABEL = '설정';
export const RESET_LABEL = '진행 초기화';
export const QUIT_LABEL = '종료';

/** Structural subset of Electron.MenuItemConstructorOptions this emits. */
export interface TrayMenuItem {
  label?: string;
  type?: 'separator' | 'radio' | 'checkbox';
  checked?: boolean;
  submenu?: TrayMenuItem[];
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
  setGameScale: (scale: number) => void;
  setMuted?: (muted: boolean) => void;
  setScreenShake?: (enabled: boolean) => void;
  showWelcome?: () => void;
}

/**
 * Pure menu description for an input mode. In global mode the status row is
 * informational (disabled); in fallback mode clicking it opens the macOS
 * Accessibility settings pane so the user can grant the permission.
 */
export function buildTrayMenuTemplate(
  mode: InputModePayload,
  actions: TrayMenuActions,
  gameScale = 1,
  title = TRAY_TITLE,
  preferences?: Pick<GameSettings, 'muted' | 'screenShake'>,
  status?: SaveStatus,
  settingsError = false,
): TrayMenuItem[] {
  const inputStatus: TrayMenuItem =
    mode.mode === 'global'
      ? { label: INPUT_GLOBAL_LABEL, enabled: false }
      : { label: INPUT_FALLBACK_LABEL, click: actions.openAccessibilitySettings };
  return [
    { label: title, enabled: false },
    inputStatus,
    { type: 'separator' },
    { label: COLLECTION_LABEL, click: actions.openCollection },
    {
      label: SETTINGS_LABEL,
      submenu: [
        { label: '게임 크기', enabled: false },
        ...GAME_SCALES.map((scale, i): TrayMenuItem => ({
          label: SCALE_LABELS[i],
          type: 'radio',
          checked: scale === gameScale,
          click: () => actions.setGameScale(scale),
        })),
        { type: 'separator' },
        ...(preferences ? [
          { label: '음소거', type: 'checkbox' as const, checked: preferences.muted,
            click: () => actions.setMuted?.(!preferences.muted) },
          { label: '화면 흔들림', type: 'checkbox' as const, checked: preferences.screenShake,
            click: () => actions.setScreenShake?.(!preferences.screenShake) },
          { label: '시작 안내 다시 보기…', click: () => actions.showWelcome?.() },
        ] : []),
        ...(settingsError ? [{ label: '설정을 저장하지 못했습니다 · 다시 선택해 주세요', enabled: false }] : []),
        { label: title, enabled: false },
      ],
    },
    ...(status?.state !== undefined && status.state !== 'ready' ? [{ label: status.state === 'load-error'
      ? status.reason === 'settings-write' ? '처음 설정을 저장하지 못했습니다 · 복구 안내…'
        : '저장 파일을 읽지 못했습니다 · 복구 안내…'
      : '저장 실패 · 자동 재시도 중…', click: actions.openCollection }] : []),
    { label: RESET_LABEL, click: actions.resetProgress, ...(status?.state === 'load-error' ? { enabled: false } : {}) },
    { label: QUIT_LABEL, click: actions.quit },
  ];
}

/** The subset of Electron.Tray this module drives. */
export interface TrayLike {
  setToolTip(tip: string): void;
  setContextMenu(menu: unknown): void;
}

export interface TrayDeps {
  getGameScale?: () => number;
  getSettings?: () => GameSettings;
  getSaveStatus?: () => SaveStatus;
  getSettingsError?: () => boolean;
  title?: string;
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
    tray.setContextMenu(deps.buildMenu(buildTrayMenuTemplate(mode, deps.actions, deps.getGameScale?.() ?? 1, deps.title,
      deps.getSettings?.(), deps.getSaveStatus?.(), deps.getSettingsError?.())));
  };
  refresh(deps.getInputMode());
  return { refresh };
}
