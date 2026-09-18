"use strict";
// Collection & Battle window (SPEC F52). A framed, fixed-size DOM window,
// opened ONLY from the tray item — this app is an accessory (LSUIElement,
// dock hidden), so a plain show() would leave the window behind the frontmost
// app: app.focus({ steal: true }) is what actually brings it forward.
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
exports.getMenuWindow = getMenuWindow;
exports.showMenuWindow = showMenuWindow;
const electron_1 = require("electron");
const path = __importStar(require("node:path"));
// Singleton reference (Assumption 29): a second tray click must focus the
// existing window, not stack a new one. Dropped on 'closed'.
let menuWindow = null;
/** The live menu window, if any (used by tests). */
function getMenuWindow() {
    return menuWindow;
}
/** Focus the open Collection & Battle window, or create and show it. */
function showMenuWindow() {
    if (menuWindow !== null) {
        menuWindow.focus();
        electron_1.app.focus({ steal: true });
        return menuWindow;
    }
    const win = new electron_1.BrowserWindow({
        width: 420,
        height: 640,
        useContentSize: true,
        frame: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        show: false, // show on 'ready-to-show' to avoid white flash
        title: 'DesMon — 영웅과 모험 기록',
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
        electron_1.app.focus({ steal: true }); // accessory app: show() alone stays behind
    });
    win.on('closed', () => {
        menuWindow = null;
    });
    return win;
}
