// Main-process entry: accessory-app lifecycle (SPEC F16) + overlay window
// + IPC handlers (T03) + guarded global input hook (T04, production only)
// + tray icon/menu (T17, SPEC F23) + the SMOKE=1 self-test sequence (T13).

import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app, Menu, nativeImage, Notification, shell, systemPreferences, Tray } from 'electron';
import type { BrowserWindow } from 'electron';
import type { Theft } from '../shared/api.js';
import { SimulatedInputDriver } from '../core/index.js';
import { IPC } from '../shared/ipc.js';
import { getCurrentInputMode, startGlobalInput } from './globalInput.js';
import { readIdentity, writeIdentity } from './identity.js';
import { ACCESSIBILITY_SETTINGS_URL, registerIpcHandlers, sendToAll } from './ipc.js';
import { showMenuWindow } from './menuWindow.js';
import type { NetSession } from './net.js';
import { createTheftWatcher } from './thefts.js';
import { setupTray } from './tray.js';
import { encodeTrayIconPng } from './trayIcon.js';
import { createOverlayWindow } from './window.js';

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

/** Whole hours left in a theft's 24 h reclaim window, never negative. */
const hoursLeft = (reclaimUntil: number): number =>
  Math.max(0, Math.ceil((reclaimUntil - Date.now()) / 3_600_000));

/**
 * SPEC F74: the ONE main-originated action. The server re-ids the companion,
 * so the game window adds it as-is, flushes the save, and STATE_CHANGED
 * carries it on to the menu. A failed reclaim is silent — the inbox in the
 * menu is the place that explains why.
 */
function reclaimAndApply(session: NetSession, theftId: string): void {
  void session.reclaim(theftId).then((res) => {
    if (res.ok) {
      sendToAll(IPC.ACTION, { type: 'addCompanion', companion: res.value.companion });
    }
  });
}

/**
 * Native notification for one theft, click → reclaim. The whole body is
 * guarded: `Notification` is OS-owned and its failure must cost a toast, not
 * the app.
 */
function makeNotifier(session: NetSession): (t: Theft) => void {
  return (t) => {
    try {
      const species = t.companion.speciesId;
      const speciesName = species.charAt(0).toUpperCase() + species.slice(1);
      const n = new Notification({
        title: 'DesMon',
        body: `${t.thiefName} stole your ${speciesName} Lv ${String(t.companion.level)}! Click to reclaim (${String(hoursLeft(t.reclaimUntil))}h left).`,
      });
      n.on('click', () => {
        reclaimAndApply(session, t.id);
      });
      n.show();
    } catch {
      // an unusable notifier is not a reason to take the game down
    }
  };
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
    app.dock?.hide(); // BEFORE window creation: accessory app, no dock icon

    let smokeWin: BrowserWindow | null = null;
    let smokeStarted = false;

    // Register BEFORE the window loads, so early invokes resolve.
    const session = isSmoke
      ? registerIpcHandlers({
          onFirstFrame: () => {
            // SMOKE_OK may only follow the renderer's first painted frame.
            if (smokeWin === null || smokeStarted) {
              return;
            }
            smokeStarted = true;
            runSmokeSequence(smokeWin);
          },
        })
      : registerIpcHandlers();

    const win = createOverlayWindow();
    smokeWin = win;

    // Tray (SPEC F23): 16×16 pixel-matrix icon PNG-encoded in code, menu
    // rebuilt on every input-mode change. setupTray holds the module-scope
    // reference that keeps the icon from being garbage-collected.
    const tray = setupTray({
      createTray: () => new Tray(nativeImage.createFromBuffer(encodeTrayIconPng())),
      buildMenu: (template) => Menu.buildFromTemplate(template),
      getInputMode: getCurrentInputMode,
      actions: {
        openAccessibilitySettings: () => {
          void shell.openExternal(ACCESSIBILITY_SETTINGS_URL);
        },
        openCollection: () => {
          showMenuWindow(); // SPEC F52: the tray item is the ONLY opener
        },
        resetProgress: () => {
          win.webContents.send(IPC.RESET);
        },
        quit: () => {
          app.quit();
        },
      },
    });

    if (!isSmoke) {
      // Theft watcher (SPEC F74): SMOKE never starts it, so a smoke run stays
      // offline. No notification support → no watcher at all: there would be
      // nothing to show, so there is nothing to poll for either.
      const watcher = Notification.isSupported()
        ? createTheftWatcher({
            session,
            notify: makeNotifier(session),
            setInterval,
            clearInterval,
            readIdentity: () => readIdentity(app.getPath('userData'), randomUUID),
            writeIdentity: (identity) => {
              writeIdentity(app.getPath('userData'), identity);
            },
          })
        : null;
      watcher?.start();

      // SMOKE=1 bypasses global input ENTIRELY: no Accessibility prompt and
      // no native hook (starting it without the grant crashes the process).
      const globalInput = startGlobalInput({
        isTrustedAccessibilityClient: (prompt) =>
          systemPreferences.isTrustedAccessibilityClient(prompt),
        onInput: (payload) => {
          win.webContents.send(IPC.INPUT, payload);
        },
        onModeChange: (payload) => {
          win.webContents.send(IPC.INPUT_MODE, payload);
          tray.refresh(payload); // SPEC F23: rebuild the menu on mode change
        },
      });
      app.on('will-quit', () => {
        globalInput.stop(); // uIOhook.stop() + cancel the grant poll
        watcher?.stop();
      });
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
