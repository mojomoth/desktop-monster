// Main-process IPC handlers (SPEC F17 + F22 main half; GAME_ARCHITECTURE §3.2).

import { randomUUID } from 'node:crypto';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import type { WebContents } from 'electron';
import type { CollectionAction } from '../core/collection.js';
import { isCompanionSnapshot, isDiscoveryAction, migrateProgress, parseSave } from '../core/index.js';
import type { SaveFile } from '../core/save.js';
import { equipmentItems, equipmentName, heroChangeWarning } from '../core/equipment.js';
import { isHeroRoll } from '../core/hero.js';
import { LEADERBOARD_DEFAULT, LEADERBOARD_MAX } from '../shared/api.js';
import type {
  RaidAction, RaidLiveResponse, Theft,
  IdentityPayload,
  LeaderboardResult,
  MatchResult,
  NetResult,
  OpponentListResult,
  PvpResult,
  ReclaimResult,
  TheftsResult,
} from '../shared/api.js';
import { IPC } from '../shared/ipc.js';
import type {
  RaidDamagePayload, PopupSpec, GameSettings, ActionResultPayload,
  SettingsResult,
  ConnectInputResult,
  SaveStatus,
  InputModePayload,
  IpcChannel,
  LeaderboardQueryPayload,
  MoveWindowPayload,
  ReclaimPayload,
  SetNamePayload,
} from '../shared/ipc.js';
import { SERVER_URL } from '../shared/serverUrl.js';
import { getCurrentInputMode } from './globalInput.js';
import { createNetClient, createNetSession, type NetSession } from './net.js';
import { readSaveFileResult, writeSaveFile, type SaveFileReadResult } from './persistence.js';
import { readSettings, updateSettings } from './settings.js';
import { createRaidWatcher } from './raid.js';
import { ProgressCoordinator } from './coordinator.js';
import { exportPng } from './share.js';
import type { OperationResult } from '../shared/ipc.js';

const pendingThefts: Theft[] = [];
export function showTheftNotice(theft: Theft): void {
  if (!pendingThefts.some(t => t.id === theft.id)) pendingThefts.push(theft);
  sendToAll(IPC.THEFT_NOTICE, theft);
  if (pendingThefts.length > 32) pendingThefts.shift();
}
let saveStatus: SaveStatus = { state: 'ready' };
export function getSaveStatus(): SaveStatus { return { ...saveStatus }; }
let flushForQuit: () => Promise<boolean> = async () => true;
export const flushProgressBeforeQuit = (): Promise<boolean> => flushForQuit();
let confirmedReset: () => Promise<OperationResult> = async () => ({ ok: false });
export function requestProgressReset(): Promise<OperationResult> { return confirmedReset(); }

/** Deep link to the macOS Privacy & Security → Accessibility pane. */
export const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';

/**
 * Stateless relay (SPEC F51): deliver `payload` to every window EXCEPT the one
 * that sent the event. With the overlay + the menu that is exact and needs no
 * window registry, so src/main/index.ts stays untouched.
 */
function sendToOthers(sender: WebContents, channel: IpcChannel, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents.id !== sender.id) {
      win.webContents.send(channel, payload);
    }
  }
}

/**
 * Broadcast main-owned updates to every window: companion reclaim and the
 * absolute official PvP counters. Menu actions cannot originate those counters.
 */
export function sendToAll(channel: IpcChannel, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

/**
 * A `pvpResult.replay` (BattleReplay) as the menu hands it over: opponent name,
 * its party and the blow list. ponytail: the companions are only shape-checked
 * as an array — the battle scene just draws them, and a bad replay is dropped
 * (the verdict still applies), so it costs an animation, never the roster.
 */
function isReplay(v: unknown): boolean {
  const r = (v ?? {}) as Record<string, unknown>;
  const blows = r['blows'];
  return (
    typeof r['opponentName'] === 'string' &&
    Array.isArray(r['opponentParty']) &&
    (r['opponentHero'] === undefined || isHeroRoll(r['opponentHero'])) &&
    Array.isArray(blows) &&
    blows.every((b) => {
      const blow = (b ?? {}) as Record<string, unknown>;
      return (
        (blow['side'] === 'A' || blow['side'] === 'D') &&
        typeof blow['actorId'] === 'string' &&
        typeof blow['targetId'] === 'string' &&
        typeof blow['damage'] === 'string' &&
        typeof blow['ko'] === 'boolean'
      );
    })
  );
}

/**
 * Narrow an untrusted menu payload to a CollectionAction: `type` must be in
 * core's union and every id field a string (id lists, arrays of strings).
 * Anything else yields null and is dropped — the menu must not be able to
 * inject junk into the game window's state, and a bad payload never throws.
 * Nested companions use the save validator before entering the live engine.
 */
function narrowAction(payload: unknown): CollectionAction | null {
  const a = (payload ?? {}) as Record<string, unknown>;
  const str = (k: string): boolean => typeof a[k] === 'string';
  const companion = (k: string): boolean => parseSave({ companions: [a[k]] }).companions.length === 1;
  const strs = (k: string): boolean => {
    const v = a[k];
    return Array.isArray(v) && v.every((id) => typeof id === 'string');
  };
  const ok = ((): boolean => {
    switch (a['type']) {
      case 'equipmentBuy':
        return str('itemId') && /^e[1-9]\d*$/.test(String(a['itemId'])) &&
          Number.isSafeInteger(a['revision']) && Number(a['revision']) >= 0 &&
          Number.isSafeInteger(a['shopSerial']) && Number(a['shopSerial']) >= 0;
      case 'equipmentEquip':
        return str('itemId') && /^e[1-9]\d*$/.test(String(a['itemId'])) &&
          Number.isSafeInteger(a['revision']) && Number(a['revision']) >= 0 &&
          (a['replaceId'] === undefined || str('replaceId') && /^e[1-9]\d*$/.test(String(a['replaceId'])));
      case 'equipmentSell':
      case 'equipmentEnhance':
      case 'equipmentMove':
        return str('itemId') && /^e[1-9]\d*$/.test(String(a['itemId'])) &&
          Number.isSafeInteger(a['revision']) && Number(a['revision']) >= 0;
      case 'equipmentExpand':
        return Number.isSafeInteger(a['revision']) && Number(a['revision']) >= 0;
      case 'acknowledgeDiscoveries':
      case 'setDiscoveryGoal':
        return isDiscoveryAction(payload);
      case 'consume':
        return str('targetId') && str('foodId');
      case 'fuse':
        return str('aId') && str('bId');
      case 'reincarnate':
        return str('id') && isCompanionSnapshot(a['expected']);
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
        return (
          typeof a['won'] === 'boolean' &&
          (a['stolen'] === null || companion('stolen')) &&
          (a['lostId'] === null || str('lostId'))
        );
      default:
        return false;
    }
  })();
  return ok ? (a as unknown as CollectionAction) : null;
}

export interface IpcOptions {
  /** Fired when the renderer reports its first painted frame (smoke, T13). */
  onFirstFrame?: () => void;
  initialSave?: SaveFileReadResult;
  startupError?: string;
  onSaveStatus?: (status: SaveStatus) => void;
  getSettings?: () => GameSettings;
  updateSettings?: (patch: unknown) => SettingsResult;
  connectGlobalInput?: () => ConnectInputResult;
}

/**
 * Register all renderer→main handlers. Call once, before the window loads.
 * Returns the net session it owns, so the theft watcher (F74) shares it
 * instead of opening a second identity of its own.
 */
export function registerIpcHandlers(options: IpcOptions = {}): NetSession {
  const directory = app.getPath('userData');
  const initialSave = options.initialSave ?? readSaveFileResult(directory);
  let latestSave = initialSave.kind === 'loaded' ? initialSave.value : null;
  saveStatus = options.startupError ? { state: 'load-error', reason: options.startupError }
    : initialSave.kind === 'error' ? { state: 'load-error', reason: initialSave.reason } : { state: 'ready' };
  const blocked = (): boolean => saveStatus.state === 'load-error';
  const setSaveStatus = (status: SaveStatus): void => {
    saveStatus = status;
    sendToAll(IPC.SAVE_STATUS, getSaveStatus());
    options.onSaveStatus?.(getSaveStatus());
  };
  // SPEC F49: smoke runs offline BY CODE — an empty baseUrl makes the net
  // client resolve `{ ok: false, error: 'offline' }` without ever calling
  // fetch, so `npm run smoke` needs no network and no server.
  const baseUrl = process.env.SMOKE || blocked() ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);
  const session = createNetSession({
    client: createNetClient({ baseUrl }),
    userDataDir: app.getPath('userData'),
    online: baseUrl !== '',
    randomUUID,
    managed: true,
  });

  const field = (): WebContents | undefined => BrowserWindow.getAllWindows()
    .find(win => win.webContents.getURL().endsWith('/static/index.html'))?.webContents;
  let capture: { requestId: string; generation: number; sender: number; resolve: (save: SaveFile) => void } | null = null;
  let coordinator: ProgressCoordinator | null = null;
  if (!blocked()) {
    try {
      coordinator = new ProgressCoordinator({ directory, initial: parseSave(latestSave), session,
        capture: generation => new Promise<SaveFile>((resolve, reject) => {
          const contents = field();
          if (!contents) { reject(Error('Game window unavailable')); return; }
          const requestId = randomUUID();
          const timer = setTimeout(() => { capture = null; reject(Error('Game snapshot timed out')); }, 5000);
          capture = { requestId, generation, sender: contents.id, resolve: save => { clearTimeout(timer); capture = null; resolve(save); } };
          contents.send(IPC.PREPARE_STATE, { requestId, generation });
        }),
        release: state => { latestSave = state.save; sendToAll(IPC.RELEASE_STATE, state); sendToAll(IPC.STATE_CHANGED, state.save);
          sendToAll(IPC.PVP_PLAYBACK, coordinator?.replaying ?? false); },
        status: failed => { const state = failed ? 'write-error' : 'ready'; if (saveStatus.state !== state) setSaveStatus({ state }); },
      });
      if (latestSave !== null) latestSave = coordinator.latest;
    } catch { setSaveStatus({ state: 'load-error', reason: 'recovery' }); }
  }
  flushForQuit = () => coordinator ? coordinator.flushForQuit() : Promise.resolve(true);
  const coordinatorBlocked = (): boolean => blocked() || coordinator === null || coordinator.busy || coordinator.faulted || coordinator.replaying;
  ipcMain.handle(IPC.GET_GENERATION, (): number => coordinator?.generation ?? 0);
  ipcMain.handle(IPC.CAPTURE_STATE, (event, value: unknown): void => {
    const p = value as { requestId?: unknown; generation?: unknown; save?: unknown } | null;
    if (capture && p?.requestId === capture.requestId && p.generation === capture.generation && event.sender.id === capture.sender) {
      try { capture.resolve(parseSave(p.save)); } catch {
        setSaveStatus({ state: 'write-error', reason: 'invalid-capture' });
      }
    }
  });
  const raid = createRaidWatcher({ session,
    action: action => coordinator ? coordinator.raidAction(action) : Promise.resolve({ ok: false, error: 'offline' }),
    claim: id => coordinator ? coordinator.claimRaid(id) : Promise.resolve({ ok: false, error: 'offline' }),
    claimed: id => coordinator?.hasRaidClaim(id) ?? false,
    push: view => { sendToAll(IPC.RAID_STATE, view); },
    connection: online => sendToAll(IPC.RAID_CONNECTION, online), setTimeout, clearTimeout,
  });
  const inRaid = (): boolean => raid.last?.raid.phase === 'battle' && raid.last.raid.me.confirmed;
  ipcMain.handle(IPC.GET_RAID_STATE, (): Promise<RaidLiveResponse | null> => {
    if (!process.env.SMOKE && !blocked()) void raid.poll();
    return Promise.resolve(raid.last);
  });
  ipcMain.handle(IPC.GET_RAID_CONNECTION, () => raid.online);
  ipcMain.handle(IPC.RAID_ACTION, (event, payload: unknown): Promise<NetResult<RaidLiveResponse>> => {
    const p = payload as Partial<RaidAction> | null;
    const menu = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/static/menu.html'));
    const authorized = event.sender.id === field()?.id || event.sender.id === menu?.webContents.id;
    if (!authorized || blocked() || !p || !['participate', 'join', 'confirm'].includes(String(p.type)) ||
      (p.type === 'participate' && p.conditionId !== 'level' && p.conditionId !== 'bestIndex')) return Promise.resolve({ ok: false, error: 'raid-phase' });
    return raid.act(p as RaidAction);
  });
  ipcMain.on(IPC.RAID_DAMAGE, (event, payload: unknown) => {
    if (blocked() || event.sender.id !== field()?.id || !payload || typeof payload !== 'object') return;
    const p = payload as Partial<RaidDamagePayload>;
    if (typeof p.raidId !== 'string' || !/^r\d{1,12}$/.test(p.raidId) ||
      typeof p.damage !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(p.damage) || typeof p.crit !== 'boolean' || typeof p.fever !== 'boolean') return;
    raid.report(p as RaidDamagePayload);
  });
  const confirmations = new Map<string, { sender: number; finish: (value: string) => void; values: string[] }>();
  const pixelConfirm = (spec: PopupSpec): Promise<boolean> => {
    const menu = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/static/menu.html'));
    if (!menu) return Promise.resolve(false);
    return new Promise(resolve => {
      const id = randomUUID();
      const finish = (value: string): void => {
        if (!confirmations.delete(id)) return;
        clearTimeout(timer); menu.webContents.removeListener('destroyed', closed); resolve(value === 'confirm');
      };
      const closed = (): void => finish('cancel');
      const timer = setTimeout(closed, 120000);
      confirmations.set(id, { sender: menu.webContents.id, finish, values: spec.buttons.map(b => b.value) });
      menu.webContents.once('destroyed', closed);
      menu.webContents.send(IPC.CONFIRM, { id, spec });
    });
  };
  ipcMain.on(IPC.CONFIRM_RESPONSE, (event, payload: unknown) => {
    const p = payload as { id?: unknown; value?: unknown } | null;
    if (typeof p?.id !== 'string' || typeof p.value !== 'string') return;
    const request = confirmations.get(p.id);
    if (request?.sender === event.sender.id && request.values.includes(p.value)) request.finish(p.value);
  });
  let confirming = false;
  const resetOrRestore = async (id?: string): Promise<OperationResult> => {
    if (inRaid() || confirming || coordinatorBlocked() || !coordinator || coordinator.pending) return { ok: false, error: '진행 중인 전투·회수를 먼저 완료하세요.' };
    confirming = true;
    try {
      if (id !== undefined && !coordinator.recovery.list().some(c => c.id === id)) return { ok: false, error: '복원할 백업을 찾을 수 없습니다.' };
      const yes = await pixelConfirm({ title: id ? '진행 복원' : '진행 초기화',
        body: [(id ? '선택한 백업 시점으로 돌아갈까요?' : '레벨·재화·영웅·동료·도감 등 게임 진행이 처음으로 돌아갑니다.'),
          '현재 진행은 먼저 백업합니다. 최근 5개 백업을 내 기록에서 복원할 수 있습니다.', '계정·이름·설정·온라인 전적은 유지됩니다.'],
        buttons: [{ label: '취소', value: 'cancel', primary: true }, { label: id ? '백업으로 복원' : '백업 후 초기화', value: 'confirm' }], cancelValue: 'cancel' });
      return yes && !inRaid() && !coordinatorBlocked() && !coordinator.pending ? await coordinator.resetOrRestore(id) : { ok: false };
    } catch { return { ok: false, error: '확인 창을 열지 못했습니다.' }; }
    finally { confirming = false; }
  };
  confirmedReset = () => resetOrRestore();
  ipcMain.handle(IPC.RESET_PROGRESS, () => resetOrRestore());
  ipcMain.handle(IPC.RESTORE_CHECKPOINT, (_event, id: unknown) => typeof id === 'string' ? resetOrRestore(id) : { ok: false });
  ipcMain.handle(IPC.LIST_CHECKPOINTS, () => { try { return coordinator?.recovery.list() ?? []; } catch { return []; } });
  ipcMain.handle(IPC.LAST_BATTLE, () => coordinator?.recovery.state.lastBattle ?? null);
  ipcMain.handle(IPC.PENDING_REPLAYS, event => event.sender.id === field()?.id ? coordinator?.pendingReplays() ?? [] : []);
  ipcMain.handle(IPC.REPLAY_COMPLETE, (event, id: unknown) => {
    if (event.sender.id !== field()?.id || typeof id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(id)) return false;
    const ok = coordinator?.completeReplay(id) ?? false;
    if (ok) sendToAll(IPC.PVP_PLAYBACK, coordinator?.replaying ?? false);
    return ok;
  });
  ipcMain.handle(IPC.BATTLE_OPPONENT, (_event, id: unknown): Promise<NetResult<PvpResult>> =>
    !inRaid() && !coordinatorBlocked() && coordinator && typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id)
      ? coordinator.battleOpponent(id) : Promise.resolve({ ok: false, error: 'busy' }));
  ipcMain.handle(IPC.EXPORT_PNG, (_event, value: unknown) => exportPng(value));
  ipcMain.handle(IPC.FIELD_IMAGE, async (): Promise<string | null> => {
    try { return await field()?.executeJavaScript("document.querySelector('#game')?.toDataURL('image/png') ?? null") as string | null ?? null; }
    catch { return null; }
  });

  const withOfficialRecord = (save: SaveFile): SaveFile => {
    const { wins, losses } = session.pvpHistory();
    if (!save.progress && wins === 0 && losses === 0) return save;
    const progress = migrateProgress(save);
    progress.pvpWins = wins;
    progress.pvpLosses = losses;
    return { ...save, progress: { ...progress, goldSpent: String(progress.goldSpent) } };
  };

  // Live state from the T04 global-input state machine; before/without
  // startGlobalInput (e.g. SMOKE=1) it reports the fallback default.
  ipcMain.handle(IPC.GET_INPUT_MODE, (): InputModePayload => getCurrentInputMode());
  ipcMain.handle(IPC.GET_SAVE_STATUS, (): SaveStatus => getSaveStatus());
  ipcMain.handle(IPC.GET_SETTINGS, (): GameSettings => options.getSettings?.() ?? readSettings(directory, initialSave.kind === 'loaded'));
  ipcMain.handle(IPC.UPDATE_SETTINGS, (_event, patch: unknown): SettingsResult => {
    const result = options.updateSettings?.(patch) ?? updateSettings(directory, patch, initialSave.kind === 'loaded');
    if (result.ok && !options.updateSettings) sendToAll(IPC.SETTINGS_CHANGED, result.settings);
    return result;
  });
  ipcMain.handle(IPC.CONNECT_GLOBAL_INPUT, (): ConnectInputResult => blocked()
    ? { ok: false, mode: getCurrentInputMode() } : options.connectGlobalInput?.() ?? { ok: false, mode: getCurrentInputMode() });
  ipcMain.handle(IPC.OPEN_SAVE_FOLDER, async (): Promise<void> => {
    if (await shell.openPath(directory)) throw new Error('저장 폴더를 열지 못했습니다.');
  });
  ipcMain.handle(IPC.QUIT, (): void => { app.quit(); });

  // Raw parsed JSON or null — validation is core's job (T08).
  ipcMain.handle(IPC.LOAD_STATE, (): unknown => {
    if (blocked()) return null;
    const raw = latestSave;
    return raw === null && session.pvpHistory().wins === 0 && session.pvpHistory().losses === 0
      ? null : withOfficialRecord(parseSave(raw));
  });

  ipcMain.handle(IPC.SAVE_STATE, (event, data: unknown, generation: unknown): boolean => {
    if (blocked()) return false;
    if (!event.sender.getURL().endsWith('/static/index.html') || typeof generation !== 'number') return false;
    // The renderer's save is untrusted input: parse it, never cast it. The
    // session uploads in the background and its result is deliberately
    // dropped — main never pushes roster changes at the game window.
    let parsed: SaveFile;
    try { parsed = parseSave(data); } catch {
      setSaveStatus({ state: 'write-error', reason: 'invalid-state' });
      sendToAll(IPC.SAVE_FAILED, undefined); return false;
    }
    Object.assign(parsed, withOfficialRecord(parsed));
    if (coordinator && (typeof generation !== 'number' || !coordinator.save(parsed, generation))) {
      if (saveStatus.state === 'write-error') sendToAll(IPC.SAVE_FAILED, undefined);
      return false;
    }
    if (!coordinator && !writeSaveFile(app.getPath('userData'), parsed)) {
      setSaveStatus({ state: 'write-error' });
      sendToAll(IPC.SAVE_FAILED, undefined);
      return false;
    }
    if (saveStatus.state !== 'ready') setSaveStatus({ state: 'ready' });
    latestSave = parsed;
    if (!coordinator) session.onSave(parsed);
    // …but the OTHER window (the menu) is showing a save it did not write.
    sendToOthers(event.sender, IPC.STATE_CHANGED, parsed);
    return true;
  });

  // Menu → game relay (SPEC F51). Unknown/malformed actions are ignored.
  ipcMain.handle(IPC.MENU_ACTION, async (event, payload: unknown): Promise<void> => {
    let action = narrowAction(payload);
    if (action === null || ['addCompanion', 'removeCompanions', 'pvpResult'].includes(action.type)) return;
    let relayed = false;
    try {
    if (inRaid()) throw Error('레이드가 끝난 뒤 다시 시도하세요.');
    if (coordinator?.replaying) throw Error('PvP 재생이 끝난 뒤 다시 시도하세요.');
    if (coordinatorBlocked() || coordinator?.pending || confirming) return;
    if (action.type === 'heroEquip' || action.type === 'heroChoose' || action.type === 'rebirth') {
      const change = action;
      const current = coordinator?.latest ?? parseSave(latestSave);
      if (change.type === 'heroEquip' && current.hero?.equipped.formId === change.formId) return;
      const target = change.type === 'rebirth' ? current.hero?.equipped.formId ?? 'h00' : change.formId;
      const offer = change.type === 'heroChoose' ? change.offerSerial : undefined;
      let expected = heroChangeWarning(current.equipment, target, offer);
      confirming = true;
      try {
        for (;;) {
          const state = coordinator?.latest ?? parseSave(latestSave);
          if (state.equipment?.temporary.length) {
            const yes = await pixelConfirm({ title: '임시 장비 소멸 확인',
              body: ['영웅을 변경하면 아래 임시 장비가 사라집니다.', ...state.equipment.temporary.map(equipmentName)],
              buttons: [{ label: '취소', value: 'cancel', primary: true }, { label: '장비 삭제 후 변경', value: 'confirm' }], cancelValue: 'cancel' });
            if (!yes || inRaid() || coordinatorBlocked() || coordinator?.pending) return;
          }
          const live = coordinator?.latest ?? parseSave(latestSave);
          const next = heroChangeWarning(live.equipment, target, offer);
          if (next.heroChangeSerial !== expected.heroChangeSerial) return;
          if (JSON.stringify(next) !== JSON.stringify(expected)) { expected = next; continue; }
          action = { ...change, equipmentConfirmation: expected };
          break;
        }
      } finally { confirming = false; }
    } else if (action.type === 'equipmentEnhance') {
      const state = coordinator?.latest ?? parseSave(latestSave);
      const itemId = action.itemId;
      const item = state.equipment && equipmentItems(state.equipment).find(item => item.id === itemId);
      if (!item || state.equipment?.revision !== action.revision) return;
      if (BigInt(item.enhancement) >= 5n) {
        confirming = true;
        try {
          const yes = await pixelConfirm({ title: '장비 강화',
            body: [`${equipmentName(item)} 강화에 실패하면 장비가 파괴됩니다.`, '확인한 확률과 비용으로 강화를 진행합니다. 장비 상태가 바뀌면 이 요청은 취소됩니다.'],
            buttons: [{ label: '취소', value: 'cancel', primary: true }, { label: '강화', value: 'confirm' }], cancelValue: 'cancel' });
          if (!yes || inRaid() || coordinatorBlocked() || coordinator?.pending) return;
        } finally { confirming = false; }
      }
    }
    sendToOthers(event.sender, IPC.ACTION, action);
    relayed = true;
    } finally {
      if (!relayed) event.sender.send(IPC.ACTION_RESULT, { action: payload, ok: false,
        error: '상태가 바뀌었거나 요청이 취소됐습니다. 현재 상태를 확인해 주세요.' });
    }
  });
  ipcMain.on(IPC.ACTION_RESULT, (event, payload: unknown) => {
    if (event.sender.id !== field()?.id || !payload || typeof payload !== 'object') return;
    const result = payload as Partial<ActionResultPayload>;
    const action = narrowAction(result.action);
    if (!action || typeof result.ok !== 'boolean' || result.error !== undefined &&
      (typeof result.error !== 'string' || result.error.length > 240)) return;
    sendToOthers(event.sender, IPC.ACTION_RESULT, { action, ok: result.ok, ...(result.error ? { error: result.error } : {}) });
  });

  ipcMain.handle(IPC.GET_IDENTITY, (): IdentityPayload => session.identity());

  ipcMain.handle(IPC.SET_NAME, (_event, payload: unknown): IdentityPayload => {
    if (blocked()) return session.identity();
    const { name } = (payload as Partial<SetNamePayload> | null | undefined) ?? {};
    return session.setName(name);
  });

  ipcMain.handle(IPC.LEADERBOARD, (_event, p: unknown): Promise<NetResult<LeaderboardResult>> => {
    if (blocked()) return Promise.resolve({ ok: false, error: 'offline' });
    const { n } = (p as Partial<LeaderboardQueryPayload> | null | undefined) ?? {};
    const count =
      typeof n === 'number' && Number.isFinite(n)
        ? Math.min(Math.max(Math.trunc(n), 1), LEADERBOARD_MAX)
        : LEADERBOARD_DEFAULT;
    const { metric } = (p as Partial<LeaderboardQueryPayload> | null | undefined) ?? {};
    const selected = metric && ['level', 'pvpWins', 'bestIndex', 'rebirths'].includes(metric) ? metric : undefined;
    return coordinator ? coordinator.leaderboard(count, selected) : session.leaderboard(count, selected);
  });

  // v3 (T67) step 1: the opponent preview the player picks a party against.
  ipcMain.handle(IPC.PVP_OPPONENTS, (): Promise<NetResult<OpponentListResult>> => blocked()
    ? Promise.resolve({ ok: false, error: 'offline' }) : coordinator ? coordinator.opponents() : session.opponents());
  // v9 reserves all online mutations for the durable coordinator. Older IPC
  // entrypoints remain registered to reject stale renderer calls explicitly.
  ipcMain.handle(IPC.PVP_MATCH, (): Promise<NetResult<MatchResult>> =>
    Promise.resolve({ ok: false, error: blocked() ? 'offline' : 'sync-required' }));
  ipcMain.handle(IPC.PVP, (): Promise<NetResult<PvpResult>> =>
    Promise.resolve({ ok: false, error: blocked() ? 'offline' : 'sync-required' }));

  ipcMain.handle(IPC.THEFTS, (): Promise<NetResult<TheftsResult>> => blocked()
    ? Promise.resolve({ ok: false, error: 'offline' }) : coordinator ? coordinator.thefts() : session.thefts());

  ipcMain.handle(IPC.RECLAIM, (_event, p: unknown): Promise<NetResult<ReclaimResult>> => {
    if (blocked()) return Promise.resolve({ ok: false, error: 'offline' });
    const { theftId } = (p as Partial<ReclaimPayload> | null | undefined) ?? {};
    return typeof theftId === 'string'
      ? coordinator ? coordinator.reclaim(theftId) : session.reclaim(theftId)
      : Promise.resolve({ ok: false, error: 'network' });
  });

  ipcMain.handle(IPC.OPEN_ACCESSIBILITY_SETTINGS, async (): Promise<void> => {
    await shell.openExternal(ACCESSIBILITY_SETTINGS_URL);
  });

  // The menu's single boot path: answer the SENDER with the save on disk.
  ipcMain.on(IPC.MENU_READY, (event) => {
    event.sender.send(IPC.RAID_STATE, raid.last);
    event.sender.send(IPC.RAID_CONNECTION, raid.online);
    for (const theft of pendingThefts.splice(0)) event.sender.send(IPC.THEFT_NOTICE, theft);
    event.sender.send(IPC.SAVE_STATUS, getSaveStatus());
    event.sender.send(IPC.PVP_PLAYBACK, coordinator?.replaying ?? false);
    if (blocked()) return;
    event.sender.send(IPC.STATE_CHANGED, withOfficialRecord(parseSave(latestSave)));
  });

  ipcMain.on(IPC.FIRST_FRAME, () => {
    if (!process.env.SMOKE && !blocked()) raid.start();
    options.onFirstFrame?.();
  });

  // Whole-window drag (SPEC Assumption 10): the renderer streams cursor
  // deltas while a drag is in flight; moving the window that SENT the event
  // keeps this handler stateless. Deltas are validated — a compromised
  // renderer must not be able to throw the window to NaN-land.
  ipcMain.on(IPC.MOVE_WINDOW, (event, payload: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === null) {
      return;
    }
    const delta = payload as Partial<MoveWindowPayload> | null | undefined;
    const dx = typeof delta?.dx === 'number' && Number.isFinite(delta.dx) ? Math.round(delta.dx) : 0;
    const dy = typeof delta?.dy === 'number' && Number.isFinite(delta.dy) ? Math.round(delta.dy) : 0;
    if (dx === 0 && dy === 0) {
      return;
    }
    const [x = 0, y = 0] = win.getPosition();
    win.setPosition(x + dx, y + dy);
  });

  app.on?.('will-quit', () => { raid.stop(); for (const request of [...confirmations.values()]) request.finish('cancel'); });

  // Notification clicks share the same durable mutation boundary as the menu.
  return coordinator ? { ...session, reclaim: id => coordinator!.reclaim(id), thefts: () => coordinator!.thefts(),
    pollIncoming: () => blocked() ? Promise.resolve({ ok: false, error: 'offline' }) : coordinator!.pollIncoming() } : session;
}
