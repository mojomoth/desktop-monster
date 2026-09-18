"use strict";
// Main-process IPC handlers (SPEC F17 + F22 main half; GAME_ARCHITECTURE §3.2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESSIBILITY_SETTINGS_URL = void 0;
exports.getSaveStatus = getSaveStatus;
exports.sendToAll = sendToAll;
exports.registerIpcHandlers = registerIpcHandlers;
const node_crypto_1 = require("node:crypto");
const electron_1 = require("electron");
const index_js_1 = require("../core/index.js");
const hero_js_1 = require("../core/hero.js");
const api_js_1 = require("../shared/api.js");
const ipc_js_1 = require("../shared/ipc.js");
const serverUrl_js_1 = require("../shared/serverUrl.js");
const globalInput_js_1 = require("./globalInput.js");
const net_js_1 = require("./net.js");
const persistence_js_1 = require("./persistence.js");
const settings_js_1 = require("./settings.js");
let saveStatus = { state: 'ready' };
function getSaveStatus() { return { ...saveStatus }; }
/** Deep link to the macOS Privacy & Security → Accessibility pane. */
exports.ACCESSIBILITY_SETTINGS_URL = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
/**
 * Stateless relay (SPEC F51): deliver `payload` to every window EXCEPT the one
 * that sent the event. With the overlay + the menu that is exact and needs no
 * window registry, so src/main/index.ts stays untouched.
 */
function sendToOthers(sender, channel, payload) {
    for (const win of electron_1.BrowserWindow.getAllWindows()) {
        if (win.webContents.id !== sender.id) {
            win.webContents.send(channel, payload);
        }
    }
}
/**
 * Broadcast main-owned updates to every window: companion reclaim and the
 * absolute official PvP counters. Menu actions cannot originate those counters.
 */
function sendToAll(channel, payload) {
    for (const win of electron_1.BrowserWindow.getAllWindows()) {
        win.webContents.send(channel, payload);
    }
}
/**
 * A `pvpResult.replay` (BattleReplay) as the menu hands it over: opponent name,
 * its party and the blow list. ponytail: the companions are only shape-checked
 * as an array — the battle scene just draws them, and a bad replay is dropped
 * (the verdict still applies), so it costs an animation, never the roster.
 */
function isReplay(v) {
    const r = (v ?? {});
    const blows = r['blows'];
    return (typeof r['opponentName'] === 'string' &&
        Array.isArray(r['opponentParty']) &&
        (r['opponentHero'] === undefined || (0, hero_js_1.isHeroRoll)(r['opponentHero'])) &&
        Array.isArray(blows) &&
        blows.every((b) => {
            const blow = (b ?? {});
            return ((blow['side'] === 'A' || blow['side'] === 'D') &&
                typeof blow['actorId'] === 'string' &&
                typeof blow['targetId'] === 'string' &&
                typeof blow['damage'] === 'string' &&
                typeof blow['ko'] === 'boolean');
        }));
}
/**
 * Narrow an untrusted menu payload to a CollectionAction: `type` must be in
 * core's union and every id field a string (id lists, arrays of strings).
 * Anything else yields null and is dropped — the menu must not be able to
 * inject junk into the game window's state, and a bad payload never throws.
 * Nested companions use the save validator before entering the live engine.
 */
function narrowAction(payload) {
    const a = (payload ?? {});
    const str = (k) => typeof a[k] === 'string';
    const companion = (k) => (0, index_js_1.parseSave)({ companions: [a[k]] }).companions.length === 1;
    const strs = (k) => {
        const v = a[k];
        return Array.isArray(v) && v.every((id) => typeof id === 'string');
    };
    const ok = (() => {
        switch (a['type']) {
            case 'acknowledgeDiscoveries':
            case 'setDiscoveryGoal':
                return (0, index_js_1.isDiscoveryAction)(payload);
            case 'consume':
                return str('targetId') && str('foodId');
            case 'fuse':
                return str('aId') && str('bId');
            case 'reincarnate':
                return str('id') && (0, index_js_1.isCompanionSnapshot)(a['expected']);
            case 'sacrifice':
                return str('id');
            case 'rebirth':
            case 'heroOffer':
                return true;
            case 'heroReroll':
            case 'heroDefer':
                return Number.isSafeInteger(a['offerSerial']) && Number(a['offerSerial']) >= 0;
            case 'heroChoose':
                return str('formId') && Number.isSafeInteger(a['offerSerial']) && Number(a['offerSerial']) >= 0;
            case 'heroEquip':
                return str('formId');
            case 'shopBuy':
                return (a['item'] === 'training' || a['item'] === 'lure') &&
                    Number.isSafeInteger(a['shopSerial']) && Number(a['shopSerial']) >= 0;
            case 'addCompanion':
                return companion('companion');
            case 'removeCompanions':
            case 'setPvpParty':
                return strs('ids');
            case 'pvpResult':
                // The replay is optional and only animated: a malformed one is DROPPED
                // and the verdict still applies (F73).
                if (!isReplay(a['replay'])) {
                    delete a['replay'];
                }
                return (typeof a['won'] === 'boolean' &&
                    (a['stolen'] === null || companion('stolen')) &&
                    (a['lostId'] === null || str('lostId')));
            default:
                return false;
        }
    })();
    return ok ? a : null;
}
/**
 * Register all renderer→main handlers. Call once, before the window loads.
 * Returns the net session it owns, so the theft watcher (F74) shares it
 * instead of opening a second identity of its own.
 */
function registerIpcHandlers(options = {}) {
    const directory = electron_1.app.getPath('userData');
    const initialSave = options.initialSave ?? (0, persistence_js_1.readSaveFileResult)(directory);
    let latestSave = initialSave.kind === 'loaded' ? initialSave.value : null;
    saveStatus = options.startupError ? { state: 'load-error', reason: options.startupError }
        : initialSave.kind === 'error' ? { state: 'load-error', reason: initialSave.reason } : { state: 'ready' };
    const blocked = () => saveStatus.state === 'load-error';
    const setSaveStatus = (status) => {
        saveStatus = status;
        sendToAll(ipc_js_1.IPC.SAVE_STATUS, getSaveStatus());
        options.onSaveStatus?.(getSaveStatus());
    };
    // SPEC F49: smoke runs offline BY CODE — an empty baseUrl makes the net
    // client resolve `{ ok: false, error: 'offline' }` without ever calling
    // fetch, so `npm run smoke` needs no network and no server.
    const baseUrl = process.env.SMOKE || blocked() ? '' : (process.env.DESMON_SERVER_URL ?? serverUrl_js_1.SERVER_URL);
    const session = (0, net_js_1.createNetSession)({
        client: (0, net_js_1.createNetClient)({ baseUrl }),
        userDataDir: electron_1.app.getPath('userData'),
        online: baseUrl !== '',
        randomUUID: node_crypto_1.randomUUID,
    });
    const withOfficialRecord = (save) => {
        const { wins, losses } = session.pvpHistory();
        if (!save.progress && wins === 0 && losses === 0)
            return save;
        const progress = (0, index_js_1.migrateProgress)(save);
        progress.pvpWins = wins;
        progress.pvpLosses = losses;
        return { ...save, progress };
    };
    // Live state from the T04 global-input state machine; before/without
    // startGlobalInput (e.g. SMOKE=1) it reports the fallback default.
    electron_1.ipcMain.handle(ipc_js_1.IPC.GET_INPUT_MODE, () => (0, globalInput_js_1.getCurrentInputMode)());
    electron_1.ipcMain.handle(ipc_js_1.IPC.GET_SAVE_STATUS, () => getSaveStatus());
    electron_1.ipcMain.handle(ipc_js_1.IPC.GET_SETTINGS, () => options.getSettings?.() ?? (0, settings_js_1.readSettings)(directory, initialSave.kind === 'loaded'));
    electron_1.ipcMain.handle(ipc_js_1.IPC.UPDATE_SETTINGS, (_event, patch) => {
        const result = options.updateSettings?.(patch) ?? (0, settings_js_1.updateSettings)(directory, patch, initialSave.kind === 'loaded');
        if (result.ok && !options.updateSettings)
            sendToAll(ipc_js_1.IPC.SETTINGS_CHANGED, result.settings);
        return result;
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.CONNECT_GLOBAL_INPUT, () => blocked()
        ? { ok: false, mode: (0, globalInput_js_1.getCurrentInputMode)() } : options.connectGlobalInput?.() ?? { ok: false, mode: (0, globalInput_js_1.getCurrentInputMode)() });
    electron_1.ipcMain.handle(ipc_js_1.IPC.OPEN_SAVE_FOLDER, async () => {
        if (await electron_1.shell.openPath(directory))
            throw new Error('저장 폴더를 열지 못했습니다.');
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.QUIT, () => { electron_1.app.quit(); });
    // Raw parsed JSON or null — validation is core's job (T08).
    electron_1.ipcMain.handle(ipc_js_1.IPC.LOAD_STATE, () => {
        if (blocked())
            return null;
        const raw = latestSave;
        return raw === null && session.pvpHistory().wins === 0 && session.pvpHistory().losses === 0
            ? null : withOfficialRecord((0, index_js_1.parseSave)(raw));
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.SAVE_STATE, (event, data) => {
        if (blocked())
            return false;
        // The renderer's save is untrusted input: parse it, never cast it. The
        // session uploads in the background and its result is deliberately
        // dropped — main never pushes roster changes at the game window.
        const parsed = (0, index_js_1.parseSave)(data);
        Object.assign(parsed, withOfficialRecord(parsed));
        if (!(0, persistence_js_1.writeSaveFile)(electron_1.app.getPath('userData'), parsed)) {
            setSaveStatus({ state: 'write-error' });
            sendToAll(ipc_js_1.IPC.SAVE_FAILED, undefined);
            return false;
        }
        if (saveStatus.state !== 'ready')
            setSaveStatus({ state: 'ready' });
        latestSave = parsed;
        session.onSave(parsed);
        // …but the OTHER window (the menu) is showing a save it did not write.
        sendToOthers(event.sender, ipc_js_1.IPC.STATE_CHANGED, parsed);
        return true;
    });
    // Menu → game relay (SPEC F51). Unknown/malformed actions are ignored.
    electron_1.ipcMain.handle(ipc_js_1.IPC.MENU_ACTION, (event, payload) => {
        if (blocked())
            return;
        const action = narrowAction(payload);
        if (action !== null) {
            sendToOthers(event.sender, ipc_js_1.IPC.ACTION, action);
        }
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.GET_IDENTITY, () => session.identity());
    electron_1.ipcMain.handle(ipc_js_1.IPC.SET_NAME, (_event, payload) => {
        if (blocked())
            return session.identity();
        const { name } = payload ?? {};
        return session.setName(name);
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.LEADERBOARD, (_event, p) => {
        if (blocked())
            return Promise.resolve({ ok: false, error: 'offline' });
        const { n } = p ?? {};
        const count = typeof n === 'number' && Number.isFinite(n)
            ? Math.min(Math.max(Math.trunc(n), 1), api_js_1.LEADERBOARD_MAX)
            : api_js_1.LEADERBOARD_DEFAULT;
        return session.leaderboard(count);
    });
    // v3 (T67) step 1: the opponent preview the player picks a party against.
    electron_1.ipcMain.handle(ipc_js_1.IPC.PVP_OPPONENTS, () => blocked()
        ? Promise.resolve({ ok: false, error: 'offline' }) : session.opponents());
    electron_1.ipcMain.handle(ipc_js_1.IPC.PVP_MATCH, (_event, p) => {
        if (blocked())
            return Promise.resolve({ ok: false, error: 'offline' });
        const { opponentId } = p ?? {};
        return opponentId === undefined || (typeof opponentId === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(opponentId))
            ? session.match(opponentId)
            : Promise.resolve({ ok: false, error: 'network' });
    });
    // v3 (T67) step 2: the battle needs the match from step 1 and my chosen
    // party. The payload is untrusted; a malformed one is refused, never sent.
    electron_1.ipcMain.handle(ipc_js_1.IPC.PVP, (_event, p) => {
        if (blocked())
            return Promise.resolve({ ok: false, error: 'offline' });
        const { matchId, party } = p ?? {};
        return typeof matchId === 'string' && Array.isArray(party) && party.every((id) => typeof id === 'string')
            ? session.pvp(matchId, party).then((result) => {
                if (result.ok) {
                    const { wins, losses } = session.pvpHistory();
                    sendToAll(ipc_js_1.IPC.ACTION, { type: 'syncPvpProgress', wins, losses });
                }
                return result;
            })
            : Promise.resolve({ ok: false, error: 'network' });
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.THEFTS, () => blocked()
        ? Promise.resolve({ ok: false, error: 'offline' }) : session.thefts());
    electron_1.ipcMain.handle(ipc_js_1.IPC.RECLAIM, (_event, p) => {
        if (blocked())
            return Promise.resolve({ ok: false, error: 'offline' });
        const { theftId } = p ?? {};
        return typeof theftId === 'string'
            ? session.reclaim(theftId)
            : Promise.resolve({ ok: false, error: 'network' });
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.OPEN_ACCESSIBILITY_SETTINGS, async () => {
        await electron_1.shell.openExternal(exports.ACCESSIBILITY_SETTINGS_URL);
    });
    // The menu's single boot path: answer the SENDER with the save on disk.
    electron_1.ipcMain.on(ipc_js_1.IPC.MENU_READY, (event) => {
        event.sender.send(ipc_js_1.IPC.SAVE_STATUS, getSaveStatus());
        if (blocked())
            return;
        event.sender.send(ipc_js_1.IPC.STATE_CHANGED, withOfficialRecord((0, index_js_1.parseSave)(latestSave)));
    });
    electron_1.ipcMain.on(ipc_js_1.IPC.FIRST_FRAME, () => {
        options.onFirstFrame?.();
    });
    // Whole-window drag (SPEC Assumption 10): the renderer streams cursor
    // deltas while a drag is in flight; moving the window that SENT the event
    // keeps this handler stateless. Deltas are validated — a compromised
    // renderer must not be able to throw the window to NaN-land.
    electron_1.ipcMain.on(ipc_js_1.IPC.MOVE_WINDOW, (event, payload) => {
        const win = electron_1.BrowserWindow.fromWebContents(event.sender);
        if (win === null) {
            return;
        }
        const delta = payload;
        const dx = typeof delta?.dx === 'number' && Number.isFinite(delta.dx) ? Math.round(delta.dx) : 0;
        const dy = typeof delta?.dy === 'number' && Number.isFinite(delta.dy) ? Math.round(delta.dy) : 0;
        if (dx === 0 && dy === 0) {
            return;
        }
        const [x = 0, y = 0] = win.getPosition();
        win.setPosition(x + dx, y + dy);
    });
    return session;
}
