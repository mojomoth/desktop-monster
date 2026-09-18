"use strict";
// Transparent always-on-top overlay window (SPEC F15).
// Options copied from GAME_ARCHITECTURE §3.1 — literal spellings matter
// (the task AC greps for them) and so does the call order below.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDGE_MARGIN = exports.WINDOW_H = exports.WINDOW_W = void 0;
exports.defaultPosition = defaultPosition;
exports.applyOverlayScale = applyOverlayScale;
exports.createOverlayWindow = createOverlayWindow;
const electron_1 = require("electron");
const path = __importStar(require("node:path"));
const settings_js_1 = require("./settings.js");
/** Overlay content size, CSS px (Assumption 10 — fixed, not resizable). */
exports.WINDOW_W = 400;
exports.WINDOW_H = 260;
/**
 * Gap between the overlay and the work-area edges. The work area already
 * excludes the macOS Dock / Windows taskbar; the margin adds visible air.
 */
exports.EDGE_MARGIN = 16;
/** Default spot: bottom-right corner of a display's work area, inset by the margin. */
function defaultPosition(workArea) {
    return {
        x: workArea.x + workArea.width - exports.WINDOW_W - exports.EDGE_MARGIN,
        y: workArea.y + workArea.height - exports.WINDOW_H - exports.EDGE_MARGIN,
    };
}
/** Resize around the bottom-right corner, keeping the overlay on its display. */
function applyOverlayScale(win, scale) {
    if (!(0, settings_js_1.isGameScale)(scale) || win.isDestroyed())
        return false;
    const bounds = win.getBounds();
    const area = electron_1.screen.getDisplayMatching(bounds).workArea;
    const width = Math.round(exports.WINDOW_W * scale);
    const height = Math.round(exports.WINDOW_H * scale);
    const x = Math.max(area.x, Math.min(bounds.x + bounds.width - width, area.x + area.width - width));
    const y = Math.max(area.y, Math.min(bounds.y + bounds.height - height, area.y + area.height - height));
    win.setBounds({ x, y, width, height });
    return true;
}
function createOverlayWindow() {
    const win = new electron_1.BrowserWindow({
        width: exports.WINDOW_W,
        height: exports.WINDOW_H,
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
    const spot = defaultPosition(electron_1.screen.getPrimaryDisplay().workArea);
    win.setPosition(spot.x, spot.y);
    // Relative path resolves against the app root in dev AND inside the asar.
    void win.loadFile('static/index.html');
    win.once('ready-to-show', () => {
        win.show();
    });
    return win;
}
