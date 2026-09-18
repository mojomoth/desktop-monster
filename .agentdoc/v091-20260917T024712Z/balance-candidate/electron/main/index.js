"use strict";
// Main-process entry: accessory-app lifecycle (SPEC F16) + overlay window
// + IPC handlers (T03) + guarded global input hook (T04, production only)
// + tray icon/menu (T17, SPEC F23) + the SMOKE=1 self-test sequence (T13).
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const electron_1 = require("electron");
const index_js_1 = require("../core/index.js");
const ipc_js_1 = require("../shared/ipc.js");
const globalInput_js_1 = require("./globalInput.js");
const identity_js_1 = require("./identity.js");
const ipc_js_2 = require("./ipc.js");
const steam_js_1 = require("./steam.js");
const menuWindow_js_1 = require("./menuWindow.js");
const thefts_js_1 = require("./thefts.js");
const defense_js_1 = require("./defense.js");
const tray_js_1 = require("./tray.js");
const trayIcon_js_1 = require("./trayIcon.js");
const window_js_1 = require("./window.js");
const settings_js_1 = require("./settings.js");
const persistence_js_1 = require("./persistence.js");
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
function runSmokeSequence(win) {
    const driver = new index_js_1.SimulatedInputDriver();
    driver.subscribe((event) => {
        win.webContents.send(ipc_js_1.IPC.INPUT, event);
    });
    driver.start(); // emit() drops events while the driver is stopped
    for (let i = 0; i < SMOKE_ATTACK_COUNT; i++) {
        driver.emit(i % 2 === 0 ? 'keyboard' : 'mouse');
    }
    setTimeout(() => {
        process.stdout.write('SMOKE_OK\n');
        electron_1.app.exit(0);
    }, SMOKE_EXIT_DELAY_MS);
}
/** Whole hours left in a theft's 24 h reclaim window, never negative. */
const hoursLeft = (reclaimUntil) => Math.max(0, Math.ceil((reclaimUntil - Date.now()) / 3_600_000));
/**
 * SPEC F74: the ONE main-originated action. The server re-ids the companion,
 * so the game window adds it as-is, flushes the save, and STATE_CHANGED
 * carries it on to the menu. A failed reclaim is silent — the inbox in the
 * menu is the place that explains why.
 */
function reclaimAndApply(session, theftId) { void session.reclaim(theftId); }
/**
 * Native notification for one theft, click → reclaim. The whole body is
 * guarded: `Notification` is OS-owned and its failure must cost a toast, not
 * the app.
 */
function makeNotifier(session) {
    return (t) => {
        try {
            const species = t.companion.speciesId;
            const speciesName = species.charAt(0).toUpperCase() + species.slice(1);
            const n = new electron_1.Notification({
                title: 'DesMon',
                body: `${t.thiefName}에게 ${speciesName} Lv ${String(t.companion.level)} 동료를 빼앗겼습니다. 눌러 회수하세요 · 회수 기한 ${String(hoursLeft(t.reclaimUntil))}시간 남음.`,
            });
            n.on('click', () => {
                reclaimAndApply(session, t.id);
            });
            n.show();
        }
        catch {
            // an unusable notifier is not a reason to take the game down
        }
    };
}
// Accessory lifecycle order matters: setName first, single-instance gate,
// dock hidden BEFORE window creation (see GAME_ARCHITECTURE §0.3/§3.1).
electron_1.app.setName('DesMon');
if (isSmoke) {
    // Assumption 40: the single-instance lock file lives in userData, so a smoke
    // run sharing it with a real (or parallel) instance would quit before ever
    // printing SMOKE_OK. A throwaway dir also keeps save.json out of the way.
    // Must land AFTER setName (it seeds the default path) and BEFORE the lock.
    electron_1.app.setPath('userData', (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'desmon-smoke-')));
}
if (!electron_1.app.requestSingleInstanceLock()) {
    // A DesMon instance is already running — this second instance quits.
    electron_1.app.quit();
}
else {
    if (isSmoke) {
        // Watchdog: if boot/render/input never completes, fail the smoke run.
        setTimeout(() => {
            electron_1.app.exit(1);
        }, 20_000);
    }
    void electron_1.app.whenReady().then(() => {
        if (process.platform === 'win32')
            electron_1.app.setAppUserModelId('dev.desmon.app');
        const steam = (0, steam_js_1.initializeSteam)({ appId: process.env.DESMON_STEAM_APP_ID, smoke: isSmoke });
        if (steam.state !== 'disabled')
            console.log('STEAM_STATUS', steam.state);
        electron_1.app.dock?.hide(); // BEFORE window creation: accessory app, no dock icon
        let smokeWin = null;
        let smokeStarted = false;
        const directory = electron_1.app.getPath('userData');
        const initialSave = (0, persistence_js_1.readSaveFileResult)(directory);
        const legacySave = initialSave.kind === 'loaded';
        let preferences = (0, settings_js_1.readSettings)(directory, legacySave);
        const runtime = {};
        let settingsError = false;
        const refreshTray = () => { runtime.tray?.refresh((0, globalInput_js_1.getCurrentInputMode)()); };
        const changeSettings = (patch) => {
            const result = (0, settings_js_1.updateSettings)(directory, patch, legacySave);
            settingsError = !result.ok;
            if (result.ok) {
                preferences = result.settings;
                if (runtime.win && !runtime.win.isDestroyed()) {
                    (0, window_js_1.applyOverlayScale)(runtime.win, preferences.gameScale);
                    runtime.win.webContents.setAudioMuted(preferences.muted);
                }
                (0, ipc_js_2.sendToAll)(ipc_js_1.IPC.SETTINGS_CHANGED, preferences);
            }
            refreshTray();
            return result;
        };
        // Persist the fresh-install choice before its first automatic progress save.
        const startupError = initialSave.kind === 'missing' && !isSmoke && !changeSettings(preferences).ok
            ? 'settings-write' : undefined;
        const globalInput = (0, globalInput_js_1.onceGlobalInput)(() => (0, globalInput_js_1.startGlobalInput)({
            isTrustedAccessibilityClient: (prompt) => electron_1.systemPreferences.isTrustedAccessibilityClient(prompt),
            onInput: (payload) => { runtime.win?.webContents.send(ipc_js_1.IPC.INPUT, payload); },
            onModeChange: (payload) => { (0, ipc_js_2.sendToAll)(ipc_js_1.IPC.INPUT_MODE, payload); refreshTray(); },
        }));
        let startDefense = () => { };
        const session = (0, ipc_js_2.registerIpcHandlers)({
            initialSave,
            startupError,
            getSettings: () => ({ ...preferences }),
            updateSettings: changeSettings,
            onSaveStatus: refreshTray,
            connectGlobalInput: () => {
                if (isSmoke || (0, ipc_js_2.getSaveStatus)().state === 'load-error')
                    return { ok: false, mode: (0, globalInput_js_1.getCurrentInputMode)() };
                const result = changeSettings({ welcomeSeen: true, globalInputRequested: true });
                if (result.ok)
                    globalInput.start();
                return { ok: result.ok, mode: (0, globalInput_js_1.getCurrentInputMode)() };
            },
            onFirstFrame: () => {
                if (!isSmoke)
                    startDefense();
                if (!isSmoke || smokeWin === null || smokeStarted)
                    return;
                smokeStarted = true;
                runSmokeSequence(smokeWin);
            },
        });
        const win = (0, window_js_1.createOverlayWindow)();
        runtime.win = win;
        (0, window_js_1.applyOverlayScale)(win, preferences.gameScale);
        win.webContents.setAudioMuted(preferences.muted);
        smokeWin = win;
        const openMenu = (guide = false) => {
            if (guide && !changeSettings({ welcomeSeen: false }).ok)
                return;
            const menu = (0, menuWindow_js_1.showMenuWindow)();
            if (!preferences.welcomeSeen)
                menu.once('closed', () => {
                    if (!preferences.welcomeSeen)
                        changeSettings({ welcomeSeen: true });
                });
        };
        runtime.tray = (0, tray_js_1.setupTray)({
            title: `DesMon v${electron_1.app.getVersion()}`,
            getGameScale: () => preferences.gameScale,
            getSettings: () => preferences,
            getSaveStatus: ipc_js_2.getSaveStatus,
            getSettingsError: () => settingsError,
            createTray: () => new electron_1.Tray(electron_1.nativeImage.createFromBuffer((0, trayIcon_js_1.encodeTrayIconPng)())),
            buildMenu: (template) => electron_1.Menu.buildFromTemplate(template),
            getInputMode: globalInput_js_1.getCurrentInputMode,
            actions: {
                setGameScale: (scale) => { changeSettings({ gameScale: scale }); },
                setMuted: (muted) => { changeSettings({ muted }); },
                setScreenShake: (screenShake) => { changeSettings({ screenShake }); },
                showWelcome: () => { openMenu(true); },
                openAccessibilitySettings: () => { openMenu(true); },
                openCollection: () => { openMenu(); },
                resetProgress: () => { void (0, ipc_js_2.requestProgressReset)(); },
                quit: () => { electron_1.app.quit(); },
            },
        });
        if (!isSmoke && ((0, ipc_js_2.getSaveStatus)().state === 'load-error' || !preferences.welcomeSeen))
            openMenu();
        if (!isSmoke) {
            const defense = session.pollIncoming ? (0, defense_js_1.createDefenseWatcher)({ poll: () => session.pollIncoming(), setInterval, clearInterval }) : null;
            startDefense = () => defense?.start();
            // Theft watcher (SPEC F74): SMOKE never starts it, so a smoke run stays
            // offline. No notification support → no watcher at all: there would be
            // nothing to show, so there is nothing to poll for either.
            const watcher = (0, ipc_js_2.getSaveStatus)().state !== 'load-error' && electron_1.Notification.isSupported()
                ? (0, thefts_js_1.createTheftWatcher)({
                    session,
                    notify: makeNotifier(session),
                    setInterval,
                    clearInterval,
                    readIdentity: () => (0, identity_js_1.readIdentity)(electron_1.app.getPath('userData'), node_crypto_1.randomUUID),
                    writeIdentity: (identity) => {
                        (0, identity_js_1.writeIdentity)(electron_1.app.getPath('userData'), identity);
                    },
                })
                : null;
            watcher?.start();
            // Permission is requested only after the fresh user chooses global input.
            if ((0, ipc_js_2.getSaveStatus)().state !== 'load-error' && preferences.globalInputRequested)
                globalInput.start();
            electron_1.app.on('will-quit', () => {
                globalInput.stop(); // uIOhook.stop() + cancel the grant poll
                watcher?.stop();
                defense?.stop();
            });
        }
    });
    electron_1.app.on('window-all-closed', () => {
        electron_1.app.quit();
    });
}
