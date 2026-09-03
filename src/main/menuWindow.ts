// Collection & Battle window (SPEC F52). A framed, fixed-size DOM window,
// opened ONLY from the tray item — this app is an accessory (LSUIElement,
// dock hidden), so a plain show() would leave the window behind the frontmost
// app: app.focus({ steal: true }) is what actually brings it forward.

import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';

// Singleton reference (Assumption 29): a second tray click must focus the
// existing window, not stack a new one. Dropped on 'closed'.
let menuWindow: BrowserWindow | null = null;

/** The live menu window, if any (used by tests). */
export function getMenuWindow(): BrowserWindow | null {
  return menuWindow;
}

/** Focus the open Collection & Battle window, or create and show it. */
export function showMenuWindow(): BrowserWindow {
  if (menuWindow !== null) {
    menuWindow.focus();
    app.focus({ steal: true });
    return menuWindow;
  }

  const win = new BrowserWindow({
    width: 380,
    height: 520,
    useContentSize: true,
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    show: false, // show on 'ready-to-show' to avoid white flash
    title: 'DesMon — Collection & Battle',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  menuWindow = win;

  // Relative path resolves against the app root in dev AND inside the asar.
  void win.loadFile('static/menu.html');
  win.once('ready-to-show', () => {
    win.show();
    app.focus({ steal: true }); // accessory app: show() alone stays behind
  });
  win.on('closed', () => {
    menuWindow = null;
  });

  return win;
}
