// Main-process entry: accessory-app lifecycle (SPEC F16) + overlay window
// + IPC handlers (T03) + guarded global input hook (T04, production only)
// + the SMOKE=1 self-test sequence (T13, SPEC F18).

import { app, systemPreferences } from 'electron';
import type { BrowserWindow } from 'electron';
import { SimulatedInputDriver } from '../core/index.js';
import { IPC } from '../shared/ipc.js';
import { startGlobalInput } from './globalInput.js';
import { registerIpcHandlers } from './ipc.js';
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

// Accessory lifecycle order matters: setName first, single-instance gate,
// dock hidden BEFORE window creation (see GAME_ARCHITECTURE §0.3/§3.1).
app.setName('DesMon');

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
    if (isSmoke) {
      registerIpcHandlers({
        onFirstFrame: () => {
          // SMOKE_OK may only follow the renderer's first painted frame.
          if (smokeWin === null || smokeStarted) {
            return;
          }
          smokeStarted = true;
          runSmokeSequence(smokeWin);
        },
      });
    } else {
      registerIpcHandlers();
    }

    const win = createOverlayWindow();
    smokeWin = win;

    if (!isSmoke) {
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
        },
      });
      app.on('will-quit', () => {
        globalInput.stop(); // uIOhook.stop() + cancel the grant poll
      });
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
