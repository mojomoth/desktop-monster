// Main-process entry: accessory-app lifecycle (SPEC F16) + overlay window
// + IPC handlers (T03) + guarded global input hook (T04, production only)
// + tray icon/menu (T17, SPEC F23) + the SMOKE=1 self-test sequence (T13).

import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app, Menu, nativeImage, systemPreferences, Tray } from 'electron';
import type { BrowserWindow } from 'electron';
import { SimulatedInputDriver } from '../core/index.js';
import { IPC } from '../shared/ipc.js';
import { getCurrentInputMode, onceGlobalInput, startGlobalInput } from './globalInput.js';
import { readIdentity, writeIdentity } from './identity.js';
import { getSaveStatus, showTheftNotice, flushProgressBeforeQuit, registerIpcHandlers, sendToAll, requestProgressReset } from './ipc.js';
import { initializeSteam } from './steam.js';
import { showMenuWindow } from './menuWindow.js';
import { createTheftWatcher } from './thefts.js';
import { createDefenseWatcher } from './defense.js';
import { setupTray, type TrayController } from './tray.js';
import { encodeTrayIconPng } from './trayIcon.js';
import { applyOverlayScale, createOverlayWindow } from './window.js';
import { readSettings, updateSettings } from './settings.js';
import { readSaveFileResult } from './persistence.js';
import type { SettingsResult } from '../shared/ipc.js';

const isSmoke = Boolean(process.env.SMOKE);

/** How many synthetic attacks the smoke run fires (SPEC F18: at least 3). */
const SMOKE_ATTACK_COUNT = 3;
/** Render grace after the synthetic attacks before declaring success. */
const SMOKE_EXIT_DELAY_MS = 500;

/**
 * SMOKE=1 proof sequence. Runs only AFTER the renderer reported its first
 * painted frame over IPC, so success covers boot + render + the input path:
 * a core SimulatedInputDriver (never the native hook — no permissions, no
 * interaction) fires synthetic attacks through the real desmon:input channel,
 * the renderer gets a moment to process/repaint, then SMOKE_OK + exit(0).
 */
function runSmokeSequence(win: BrowserWindow): void {
  const driver = new SimulatedInputDriver();
  driver.subscribe((event) => {
    win.webContents.send(IPC.INPUT, event);
  });
  driver.start(); // emit() drops events while the driver is stopped
  for (let i = 0; i < SMOKE_ATTACK_COUNT; i++) {
    driver.emit(i % 2 === 0 ? 'keyboard' : 'mouse');
  }
  setTimeout(() => {
    process.stdout.write('SMOKE_OK\n');
    app.exit(0);
  }, SMOKE_EXIT_DELAY_MS);
}

// Accessory lifecycle order matters: setName first, single-instance gate,
// dock hidden BEFORE window creation (see GAME_ARCHITECTURE §0.3/§3.1).
app.setName('DesMon');

if (isSmoke) {
  // Assumption 40: the single-instance lock file lives in userData, so a smoke
  // run sharing it with a real (or parallel) instance would quit before ever
  // printing SMOKE_OK. A throwaway dir also keeps save.json out of the way.
  // Must land AFTER setName (it seeds the default path) and BEFORE the lock.
  app.setPath('userData', mkdtempSync(join(tmpdir(), 'desmon-smoke-')));
}

if (!app.requestSingleInstanceLock()) {
  // A DesMon instance is already running — this second instance quits.
  app.quit();
} else {
  if (isSmoke) {
    // Watchdog: if boot/render/input never completes, fail the smoke run.
    setTimeout(() => {
      app.exit(1);
    }, 20_000);
  }

  void app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('dev.desmon.app');
    const steam = initializeSteam({ appId: process.env.DESMON_STEAM_APP_ID, smoke: isSmoke });
    if (steam.state !== 'disabled') console.log('STEAM_STATUS', steam.state);
    app.dock?.hide(); // BEFORE window creation: accessory app, no dock icon

    let smokeWin: BrowserWindow | null = null;
    let smokeStarted = false;

    const directory = app.getPath('userData');
    const initialSave = readSaveFileResult(directory);
    const legacySave = initialSave.kind === 'loaded';
    let preferences = readSettings(directory, legacySave);
    const runtime: { tray?: TrayController; win?: BrowserWindow } = {};
    let settingsError = false;
    const refreshTray = (): void => { runtime.tray?.refresh(getCurrentInputMode()); };
    const changeSettings = (patch: unknown): SettingsResult => {
      const result = updateSettings(directory, patch, legacySave);
      settingsError = !result.ok;
      if (result.ok) {
        preferences = result.settings;
        if (runtime.win && !runtime.win.isDestroyed()) {
          applyOverlayScale(runtime.win, preferences.gameScale);
          runtime.win.webContents.setAudioMuted(preferences.muted);
        }
        sendToAll(IPC.SETTINGS_CHANGED, preferences);
      }
      refreshTray();
      return result;
    };
    // Persist the fresh-install choice before its first automatic progress save.
    const startupError = initialSave.kind === 'missing' && !isSmoke && !changeSettings(preferences).ok
      ? 'settings-write' : undefined;
    const globalInput = onceGlobalInput(() => startGlobalInput({
      isTrustedAccessibilityClient: (prompt) => systemPreferences.isTrustedAccessibilityClient(prompt),
      onInput: (payload) => { runtime.win?.webContents.send(IPC.INPUT, payload); },
      onModeChange: (payload) => { sendToAll(IPC.INPUT_MODE, payload); refreshTray(); },
    }));
    let startDefense = (): void => {};
    const session = registerIpcHandlers({
      initialSave,
      startupError,
      getSettings: () => ({ ...preferences }),
      updateSettings: changeSettings,
      onSaveStatus: refreshTray,
      connectGlobalInput: () => {
        if (isSmoke || getSaveStatus().state === 'load-error') return { ok: false, mode: getCurrentInputMode() };
        const result = changeSettings({ welcomeSeen: true, globalInputRequested: true });
        if (result.ok) globalInput.start();
        return { ok: result.ok, mode: getCurrentInputMode() };
      },
      onFirstFrame: () => {
        if (!isSmoke) startDefense();
        if (!isSmoke || smokeWin === null || smokeStarted) return;
        smokeStarted = true;
        runSmokeSequence(smokeWin);
      },
    });
    const win = createOverlayWindow();
    runtime.win = win;
    applyOverlayScale(win, preferences.gameScale);
    win.webContents.setAudioMuted(preferences.muted);
    smokeWin = win;
    const openMenu = (guide = false): BrowserWindow | undefined => {
      if (guide && !changeSettings({ welcomeSeen: false }).ok) return;
      const menu = showMenuWindow();
      if (!preferences.welcomeSeen) menu.once('closed', () => {
        if (!preferences.welcomeSeen) changeSettings({ welcomeSeen: true });
      });
      return menu;
    };
    runtime.tray = setupTray({
      title: `DesMon v${app.getVersion()}`,
      getGameScale: () => preferences.gameScale,
      getSettings: () => preferences,
      getSaveStatus,
      getSettingsError: () => settingsError,
      createTray: () => new Tray(nativeImage.createFromBuffer(encodeTrayIconPng())),
      buildMenu: (template) => Menu.buildFromTemplate(template),
      getInputMode: getCurrentInputMode,
      actions: {
        setGameScale: (scale) => { changeSettings({ gameScale: scale }); },
        setMuted: (muted) => { changeSettings({ muted }); },
        setScreenShake: (screenShake) => { changeSettings({ screenShake }); },
        showWelcome: () => { openMenu(true); },
        openAccessibilitySettings: () => { openMenu(true); },
        openCollection: () => { openMenu(); },
        resetProgress: () => {
          const menu = openMenu();
          if (!menu) return;
          if (menu.webContents.isLoading()) menu.webContents.once('did-finish-load', () => { void requestProgressReset(); });
          else void requestProgressReset();
        },
        quit: () => { app.quit(); },
      },
    });
    if (!isSmoke && (getSaveStatus().state === 'load-error' || !preferences.welcomeSeen)) openMenu();

    if (!isSmoke) {
      const defense = session.pollIncoming ? createDefenseWatcher({ poll: () => session.pollIncoming!(), setInterval, clearInterval }) : null;
      startDefense = () => defense?.start();
      // Theft watcher (SPEC F74): SMOKE never starts it, so a smoke run stays
      // offline. Game notices use the field toast and menu pixel popup.
      const watcher = getSaveStatus().state !== 'load-error'
        ? createTheftWatcher({
            session,
            notify: showTheftNotice,
            setInterval,
            clearInterval,
            readIdentity: () => readIdentity(app.getPath('userData'), randomUUID),
            writeIdentity: (identity) => {
              writeIdentity(app.getPath('userData'), identity);
            },
          })
        : null;
      watcher?.start();

      // Permission is requested only after the fresh user chooses global input.
      if (getSaveStatus().state !== 'load-error' && preferences.globalInputRequested) globalInput.start();
      let quitting = false;
      app.on('before-quit', event => {
        if (quitting) return;
        event.preventDefault();
        void flushProgressBeforeQuit().then(saved => { if (saved) { quitting = true; app.quit(); } });
      });
      app.on('will-quit', () => {
        globalInput.stop(); // uIOhook.stop() + cancel the grant poll
        watcher?.stop();
        defense?.stop();
      });
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
