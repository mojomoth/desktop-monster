// Transparent always-on-top overlay window (SPEC F15).
// Options copied from GAME_ARCHITECTURE §3.1 — literal spellings matter
// (the task AC greps for them) and so does the call order below.

import { BrowserWindow, screen } from 'electron';
import * as path from 'node:path';
import { isGameScale } from './settings.js';

/** Overlay content size, CSS px (Assumption 10 — fixed, not resizable). */
export const WINDOW_W = 400;
export const WINDOW_H = 260;
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

/** Resize around the bottom-right corner, keeping the overlay on its display. */
export function applyOverlayScale(win: BrowserWindow, scale: number): boolean {
  if (!isGameScale(scale) || win.isDestroyed()) return false;
  const bounds = win.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const width = Math.round(WINDOW_W * scale);
  const height = Math.round(WINDOW_H * scale);
  const x = Math.max(area.x, Math.min(bounds.x + bounds.width - width, area.x + area.width - width));
  const y = Math.max(area.y, Math.min(bounds.y + bounds.height - height, area.y + area.height - height));
  win.setBounds({ x, y, width, height });
  return true;
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
