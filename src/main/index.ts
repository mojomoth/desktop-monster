// Main-process entry: accessory-app lifecycle (SPEC F16) + overlay window.
// IPC lands in T03; guarded global input in T04.

import { app } from 'electron';
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

    const win = createOverlayWindow();

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
