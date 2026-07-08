// Main-process entry: accessory-app lifecycle (SPEC F16) + overlay window
// + IPC handlers (T03) + guarded global input hook (T04, production only).

import { app, systemPreferences } from 'electron';
import { IPC } from '../shared/ipc.js';
import { startGlobalInput } from './globalInput.js';
import { registerIpcHandlers } from './ipc.js';
import { createOverlayWindow } from './window.js';

const isSmoke = Boolean(process.env.SMOKE);

// Accessory lifecycle order matters: setName first, single-instance gate,
// dock hidden BEFORE window creation (see GAME_ARCHITECTURE §0.3/§3.1).
app.setName('DesMon');

if (!app.requestSingleInstanceLock()) {
  // A DesMon instance is already running — this second instance quits.
  app.quit();
} else {
  if (isSmoke) {
    // Watchdog: if the window never finishes loading, fail the smoke run.
    setTimeout(() => {
      app.exit(1);
    }, 20_000);
  }

  void app.whenReady().then(() => {
    app.dock?.hide(); // BEFORE window creation: accessory app, no dock icon

    registerIpcHandlers(); // BEFORE the window loads, so early invokes resolve

    const win = createOverlayWindow();

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

    if (isSmoke) {
      win.webContents.on('did-finish-load', () => {
        process.stdout.write('SMOKE_OK\n');
        app.exit(0);
      });
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
