// Transparent always-on-top overlay window (SPEC F15).
// Options copied from GAME_ARCHITECTURE §3.1 — literal spellings matter
// (the task AC greps for them) and so does the call order below.

import { BrowserWindow } from 'electron';
import * as path from 'node:path';

export function createOverlayWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 320,
    height: 220,
    useContentSize: true,
    frame: false,
    transparent: true,
    hasShadow: false, // shadow ghosting artifacts on redraw of transparent windows
    resizable: false, // resizing transparent windows glitches
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    roundedCorners: false,
    acceptFirstMouse: true, // fallback clicks register without focusing first
    show: false, // show on 'ready-to-show' to avoid white flash
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // keep rAF alive while unfocused/occluded
    },
  });

  // 'screen-saver' is the highest non-system window level: stays above
  // fullscreen apps. setVisibleOnAllWorkspaces must come AFTER it;
  // skipTransformProcessType avoids the window/dock flicker (the dock is
  // already hidden by the accessory lifecycle in index.ts).
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });

  // Relative path resolves against the app root in dev AND inside the asar.
  void win.loadFile('static/index.html');
  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}
