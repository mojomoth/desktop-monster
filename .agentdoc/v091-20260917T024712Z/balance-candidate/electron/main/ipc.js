"use strict";
// Main-process IPC handlers (SPEC F17 + F22 main half; GAME_ARCHITECTURE §3.2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESSIBILITY_SETTINGS_URL = void 0;
exports.getSaveStatus = getSaveStatus;
exports.requestProgressReset = requestProgressReset;
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
const coordinator_js_1 = require("./coordinator.js");
const share_js_1 = require("./share.js");
let saveStatus = { state: 'ready' };
function getSaveStatus() { return { ...saveStatus }; }
let confirmedReset = async () => ({ ok: false });
function requestProgressReset() { return confirmedReset(); }
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
        managed: true,
    });
    const field = () => electron_1.BrowserWindow.getAllWindows()
        .find(win => win.webContents.getURL().endsWith('/static/index.html'))?.webContents;
    let capture = null;
    let coordinator = null;
    if (!blocked()) {
        try {
            coordinator = new coordinator_js_1.ProgressCoordinator({ directory, initial: (0, index_js_1.parseSave)(latestSave), session,
                capture: generation => new Promise((resolve, reject) => {
                    const contents = field();
                    if (!contents) {
                        reject(Error('Game window unavailable'));
                        return;
                    }
                    const requestId = (0, node_crypto_1.randomUUID)();
                    const timer = setTimeout(() => { capture = null; reject(Error('Game snapshot timed out')); }, 5000);
                    capture = { requestId, generation, sender: contents.id, resolve: save => { clearTimeout(timer); capture = null; resolve(save); } };
                    contents.send(ipc_js_1.IPC.PREPARE_STATE, { requestId, generation });
                }),
                release: state => {
                    latestSave = state.save;
                    sendToAll(ipc_js_1.IPC.RELEASE_STATE, state);
                    sendToAll(ipc_js_1.IPC.STATE_CHANGED, state.save);
                    sendToAll(ipc_js_1.IPC.PVP_PLAYBACK, coordinator?.replaying ?? false);
                },
                status: failed => { const state = failed ? 'write-error' : 'ready'; if (saveStatus.state !== state)
                    setSaveStatus({ state }); }, });
            if (latestSave !== null)
                latestSave = coordinator.latest;
        }
        catch {
            setSaveStatus({ state: 'load-error', reason: 'recovery' });
        }
    }
    const coordinatorBlocked = () => blocked() || coordinator === null || coordinator.busy || coordinator.faulted || coordinator.replaying;
    electron_1.ipcMain.handle(ipc_js_1.IPC.GET_GENERATION, () => coordinator?.generation ?? 0);
    electron_1.ipcMain.handle(ipc_js_1.IPC.CAPTURE_STATE, (event, value) => {
        const p = value;
        if (capture && p?.requestId === capture.requestId && p.generation === capture.generation && event.sender.id === capture.sender) {
            capture.resolve((0, index_js_1.parseSave)(p.save));
        }
    });
    let confirming = false;
    const resetOrRestore = async (id) => {
        if (confirming || coordinatorBlocked() || !coordinator || coordinator.pending)
            return { ok: false, error: '진행 중인 전투·회수를 먼저 완료하세요.' };
        confirming = true;
        try {
            if (id !== undefined && !coordinator.recovery.list().some(c => c.id === id))
                return { ok: false, error: '복원할 백업을 찾을 수 없습니다.' };
            const { response } = await electron_1.dialog.showMessageBox({ type: 'warning', title: id ? '진행 복원' : '진행 초기화',
                message: id ? '선택한 백업 시점으로 돌아갈까요?' : '진행을 초기화할까요?',
                detail: (id ? '백업 이후의 로컬 진행은 선택한 시점으로 교체됩니다.' : '레벨·재화·영웅·동료·도감 등 게임 진행이 처음으로 돌아갑니다.') +
                    '\n현재 진행은 먼저 백업합니다. 최근 5개 백업을 내 기록에서 복원할 수 있습니다.\n계정·이름·설정·온라인 전적은 유지됩니다.',
                buttons: ['취소', id ? '백업으로 복원' : '백업 후 초기화'], defaultId: 0, cancelId: 0, noLink: true });
            return response === 1 ? await coordinator.resetOrRestore(id) : { ok: false };
        }
        catch {
            return { ok: false, error: '확인 창을 열지 못했습니다.' };
        }
        finally {
            confirming = false;
        }
    };
    confirmedReset = () => resetOrRestore();
    electron_1.ipcMain.handle(ipc_js_1.IPC.RESET_PROGRESS, () => resetOrRestore());
    electron_1.ipcMain.handle(ipc_js_1.IPC.RESTORE_CHECKPOINT, (_event, id) => typeof id === 'string' ? resetOrRestore(id) : { ok: false });
    electron_1.ipcMain.handle(ipc_js_1.IPC.LIST_CHECKPOINTS, () => { try {
        return coordinator?.recovery.list() ?? [];
    }
    catch {
        return [];
    } });
    electron_1.ipcMain.handle(ipc_js_1.IPC.LAST_BATTLE, () => coordinator?.recovery.state.lastBattle ?? null);
    electron_1.ipcMain.handle(ipc_js_1.IPC.PENDING_REPLAYS, event => event.sender.id === field()?.id ? coordinator?.pendingReplays() ?? [] : []);
    electron_1.ipcMain.handle(ipc_js_1.IPC.REPLAY_COMPLETE, (event, id) => {
        if (event.sender.id !== field()?.id || typeof id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(id))
            return false;
        const ok = coordinator?.completeReplay(id) ?? false;
        if (ok)
            sendToAll(ipc_js_1.IPC.PVP_PLAYBACK, coordinator?.replaying ?? false);
        return ok;
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.BATTLE_OPPONENT, (_event, id) => !coordinatorBlocked() && coordinator && typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id)
        ? coordinator.battleOpponent(id) : Promise.resolve({ ok: false, error: 'busy' }));
    electron_1.ipcMain.handle(ipc_js_1.IPC.EXPORT_PNG, (_event, value) => (0, share_js_1.exportPng)(value));
    electron_1.ipcMain.handle(ipc_js_1.IPC.FIELD_IMAGE, async () => {
        try {
            return await field()?.executeJavaScript("document.querySelector('#game')?.toDataURL('image/png') ?? null") ?? null;
        }
        catch {
            return null;
        }
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
    electron_1.ipcMain.handle(ipc_js_1.IPC.SAVE_STATE, (event, data, generation) => {
        if (blocked())
            return false;
        if (!event.sender.getURL().endsWith('/static/index.html') || typeof generation !== 'number')
            return false;
        // The renderer's save is untrusted input: parse it, never cast it. The
        // session uploads in the background and its result is deliberately
        // dropped — main never pushes roster changes at the game window.
        const parsed = (0, index_js_1.parseSave)(data);
        Object.assign(parsed, withOfficialRecord(parsed));
        if (coordinator && (typeof generation !== 'number' || !coordinator.save(parsed, generation))) {
            if (saveStatus.state === 'write-error')
                sendToAll(ipc_js_1.IPC.SAVE_FAILED, undefined);
            return false;
        }
        if (!coordinator && !(0, persistence_js_1.writeSaveFile)(electron_1.app.getPath('userData'), parsed)) {
            setSaveStatus({ state: 'write-error' });
            sendToAll(ipc_js_1.IPC.SAVE_FAILED, undefined);
            return false;
        }
        if (saveStatus.state !== 'ready')
            setSaveStatus({ state: 'ready' });
        latestSave = parsed;
        if (!coordinator)
            session.onSave(parsed);
        // …but the OTHER window (the menu) is showing a save it did not write.
        sendToOthers(event.sender, ipc_js_1.IPC.STATE_CHANGED, parsed);
        return true;
    });
    // Menu → game relay (SPEC F51). Unknown/malformed actions are ignored.
    electron_1.ipcMain.handle(ipc_js_1.IPC.MENU_ACTION, (event, payload) => {
        if (coordinator?.replaying)
            throw Error('PvP 재생이 끝난 뒤 다시 시도하세요.');
        if (coordinatorBlocked() || coordinator?.pending)
            return;
        const action = narrowAction(payload);
        if (action !== null && !['addCompanion', 'removeCompanions', 'pvpResult'].includes(action.type)) {
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
        const { metric } = p ?? {};
        const selected = metric && ['level', 'pvpWins', 'bestIndex', 'rebirths'].includes(metric) ? metric : undefined;
        return coordinator ? coordinator.leaderboard(count, selected) : session.leaderboard(count, selected);
    });
    // v3 (T67) step 1: the opponent preview the player picks a party against.
    electron_1.ipcMain.handle(ipc_js_1.IPC.PVP_OPPONENTS, () => blocked()
        ? Promise.resolve({ ok: false, error: 'offline' }) : coordinator ? coordinator.opponents() : session.opponents());
    // v9 reserves all online mutations for the durable coordinator. Older IPC
    // entrypoints remain registered to reject stale renderer calls explicitly.
    electron_1.ipcMain.handle(ipc_js_1.IPC.PVP_MATCH, () => Promise.resolve({ ok: false, error: blocked() ? 'offline' : 'sync-required' }));
    electron_1.ipcMain.handle(ipc_js_1.IPC.PVP, () => Promise.resolve({ ok: false, error: blocked() ? 'offline' : 'sync-required' }));
    electron_1.ipcMain.handle(ipc_js_1.IPC.THEFTS, () => blocked()
        ? Promise.resolve({ ok: false, error: 'offline' }) : coordinator ? coordinator.thefts() : session.thefts());
    electron_1.ipcMain.handle(ipc_js_1.IPC.RECLAIM, (_event, p) => {
        if (blocked())
            return Promise.resolve({ ok: false, error: 'offline' });
        const { theftId } = p ?? {};
        return typeof theftId === 'string'
            ? coordinator ? coordinator.reclaim(theftId) : session.reclaim(theftId)
            : Promise.resolve({ ok: false, error: 'network' });
    });
    electron_1.ipcMain.handle(ipc_js_1.IPC.OPEN_ACCESSIBILITY_SETTINGS, async () => {
        await electron_1.shell.openExternal(exports.ACCESSIBILITY_SETTINGS_URL);
    });
    // The menu's single boot path: answer the SENDER with the save on disk.
    electron_1.ipcMain.on(ipc_js_1.IPC.MENU_READY, (event) => {
        event.sender.send(ipc_js_1.IPC.SAVE_STATUS, getSaveStatus());
        event.sender.send(ipc_js_1.IPC.PVP_PLAYBACK, coordinator?.replaying ?? false);
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
    // Notification clicks share the same durable mutation boundary as the menu.
    return coordinator ? { ...session, reclaim: id => coordinator.reclaim(id), thefts: () => coordinator.thefts(),
        pollIncoming: () => blocked() ? Promise.resolve({ ok: false, error: 'offline' }) : coordinator.pollIncoming() } : session;
}
