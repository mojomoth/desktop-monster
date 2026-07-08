// Main-process stub for T01: plain BrowserWindow that loads the static page.
// Overlay window options / accessory lifecycle land in T02; IPC in T03;
// guarded global input in T04.

import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';

const isSmoke = Boolean(process.env.SMOKE);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 320,
    height: 220,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  if (isSmoke) {
    win.webContents.on('did-finish-load', () => {
      process.stdout.write('SMOKE_OK\n');
      app.exit(0);
    });
  }

  void win.loadFile('static/index.html');
}

if (isSmoke) {
  // Watchdog: if the window never finishes loading, fail the smoke run.
  setTimeout(() => {
    app.exit(1);
  }, 20_000);
}

void app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
