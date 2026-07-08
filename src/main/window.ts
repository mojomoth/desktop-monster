// Transparent always-on-top overlay window (SPEC F15).
// Options copied from GAME_ARCHITECTURE §3.1 — literal spellings matter
// (the task AC greps for them) and so does the call order below.

import { BrowserWindow, screen } from 'electron';
import * as path from 'node:path';

/** Overlay content size, CSS px (Assumption 10 — fixed, not resizable). */
export const WINDOW_W = 320;
export const WINDOW_H = 220;
/**
 * Gap between the overlay and the work-area edges. The work area already
 * excludes the macOS Dock / Windows taskbar; the margin adds visible air.
 */
export const EDGE_MARGIN = 16;

/** Default spot: bottom-right corner of a display's work area, inset by the margin. */
export function defaultPosition(workArea: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  return {
    x: workArea.x + workArea.width - WINDOW_W - EDGE_MARGIN,
    y: workArea.y + workArea.height - WINDOW_H - EDGE_MARGIN,
  };
}

export function createOverlayWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: WINDOW_W,
    height: WINDOW_H,
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

  // Default position: bottom-right of the primary display, clear of the
  // Dock/taskbar (the work area excludes them; EDGE_MARGIN adds a gap).
  const spot = defaultPosition(screen.getPrimaryDisplay().workArea);
  win.setPosition(spot.x, spot.y);

  // Relative path resolves against the app root in dev AND inside the asar.
  void win.loadFile('static/index.html');
  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}
