// Renderer boot (SPEC F21 + F18, Assumption 11): load save → parseSave →
// createEngine → subscribe input → rAF loop repainting the full scene, and
// report the first painted frame over IPC exactly once (drives smoke).
// Persistence wiring (SPEC F22, T16): progress saves on every kill and
// level-up, debounced 500ms after damage, on window blur, and immediately
// after a Reset Progress request from main, and after every applied
// collection action (F53).

import { createEngine, parseSave } from '../core/index.js';
import type { ActionResultPayload } from '../shared/ipc.js';
import type { CollectionAction } from '../core/index.js';
import type { RaidLiveResponse } from '../shared/api.js';
import { raidViewOf } from './raidScene.js';
import { raidStatus } from './raidStatus.js';
import { setupWindowDrag } from './drag.js';
import { createGame, createSaveScheduler } from './game.js';
import type { GameOptions } from './game.js';
import { setupFallbackInput } from './input.js';
import { createGameAudio } from './audio.js';
import type { GameEvent } from '../core/index.js';
import type { InputSource } from '../shared/ipc.js';
import type { SaveStatus } from '../shared/ipc.js';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return;
  }
  ctx.imageSmoothingEnabled = false; // chunky pixels (canvas is CSS-scaled 2x)

  const statusElement = document.getElementById('field-save-status');
  const recovery = document.getElementById('field-save-recovery');
  const showSaveStatus = (status: SaveStatus): void => {
    if (statusElement) {
      statusElement.hidden = status.state === 'ready';
      statusElement.textContent = status.state === 'load-error'
        ? status.reason === 'settings-write'
          ? '처음 시작할 설정을 저장하지 못했습니다. 저장 폴더 권한을 확인하고 앱을 다시 실행하세요.'
          : '저장 파일을 읽지 못했습니다. 원본을 보존했습니다. 복원 후 앱을 다시 실행하세요.'
        : status.state === 'write-error' ? '저장 실패 · 자동 재시도 중입니다. 앱을 닫지 마세요.' : '';
    }
    if (recovery) recovery.hidden = status.state !== 'load-error';
  };
  window.desmon.onSaveStatus(showSaveStatus);
  const saveStatus = await window.desmon.getSaveStatus();
  showSaveStatus(saveStatus);
  document.getElementById('field-open-save')?.addEventListener('click', () => { void window.desmon.openSaveFolder(); });
  document.getElementById('field-quit')?.addEventListener('click', () => { void window.desmon.quit(); });
  if (saveStatus.state === 'load-error') return;

  // Main has already rejected unreadable/unsupported files. Core still
  // normalizes fields in supported v1–v4 saves and migrates older progress.
  const loaded = await window.desmon.loadState();
  const engine = createEngine(loaded == null ? null : parseSave(loaded));
  const settings = await window.desmon.getSettings();
  let muted = settings.muted;
  const audio = createGameAudio({ isMuted: () => muted });
  const completing = new Set<string>();
  const completeReplay = (id: string): void => {
    if (completing.has(id)) return;
    completing.add(id);
    const attempt = (): void => {
      void window.desmon.completeReplay(id).then(ok => {
        if (ok) completing.delete(id); else window.setTimeout(attempt, 1000);
      }, () => { window.setTimeout(attempt, 1000); });
    };
    attempt();
  };
  const pvpStatus = document.getElementById('field-pvp-status');
  const finishedRaids = new Set<string>();
  const options: GameOptions = { screenShake: settings.screenShake,
    raidConnected: true,
    onRaidDamage: hit => window.desmon.raidDamage(hit),
    onRaidComplete: id => { finishedRaids.add(id); },
    onReplayComplete: completeReplay,
    onReplayStatus: presentation => {
      if (!pvpStatus) return;
      pvpStatus.hidden = presentation === null;
      pvpStatus.textContent = presentation
        ? `${presentation.role === 'defense' ? 'PvP 발생' : 'PvP'} · 상대 ${presentation.replay.opponentName}와 전투 중` : '';
    },
  };
  window.desmon.onSettingsChanged((next) => { options.screenShake = next.screenShake; muted = next.muted; });
  let game = createGame(engine, audio, options);
  let generation = await window.desmon.getGeneration();
  let paused = false;
  window.desmon.onTheftNotice(notice => {
    if (!pvpStatus || game.isReplaying() || game.isRaiding()) return;
    const text = `동료 Lv ${notice.companion.level} 약탈 · 메뉴에서 회수 가능`;
    pvpStatus.hidden = false;
    pvpStatus.textContent = text;
    window.setTimeout(() => { if (pvpStatus.textContent === text) pvpStatus.hidden = true; }, 5000);
  });
  let raidLive: RaidLiveResponse | null = null;
  let raidReceivedAt = performance.now();
  let raidBusy = false;
  let raidError = '';
  let raidErrorUntil = 0;
  const raidButton = document.getElementById('raid-status') as HTMLButtonElement | null;
  const paintRaidStatus = (): void => {
    if (!raidButton) return;
    const now = (raidLive?.now ?? 0) + performance.now() - raidReceivedAt;
    const status = raidStatus(raidLive, now, options.raidConnected !== false);
    const retryError = raidError && performance.now() < raidErrorUntil;
    raidButton.hidden = status.hidden && !retryError;
    raidButton.textContent = raidBusy ? '참전 확인 중…' : retryError ? raidError : status.text;
    raidButton.className = status.className;
    raidButton.disabled = raidBusy || paused || !status.actionable;
  };
  const receiveRaid = (live: RaidLiveResponse | null): void => {
    if (live && raidLive && live.now < raidLive.now) return;
    const view = live ? raidViewOf(live, raidLive) : null;
    if (!view || !finishedRaids.has(view.raidId)) game.raidState(view);
    raidLive = live;
    raidReceivedAt = performance.now();
    paintRaidStatus();
  };
  let sawRaidPush = false;
  window.desmon.onRaidState(live => { sawRaidPush = true; receiveRaid(live); });
  void window.desmon.getRaidState().then(live => { if (!sawRaidPush) receiveRaid(live); }, () => { options.raidConnected = false; paintRaidStatus(); });
  let sawConnectionPush = false;
  const connection = (connected: boolean): void => { options.raidConnected = connected; paintRaidStatus(); };
  window.desmon.onRaidConnection(connected => { sawConnectionPush = true; connection(connected); });
  void window.desmon.getRaidConnection().then(connected => { if (!sawConnectionPush) connection(connected); }, () => connection(false));
  for (const event of ['mousedown', 'keydown'] as const) raidButton?.addEventListener(event, e => e.stopPropagation());
  raidButton?.addEventListener('click', e => {
    e.stopPropagation();
    if (raidBusy || raidButton.disabled) return;
    raidBusy = true;
    raidError = '';
    paintRaidStatus();
    void window.desmon.raidAction({ type: 'confirm' }).then(reply => {
      if (reply.ok) receiveRaid(reply.value);
      else raidError = reply.error === 'raid-full' ? '레이드 정원 마감' : reply.error === 'raid-phase'
        ? '참여 시간이 지났습니다' : '참여 실패 · 다시 참여';
    }, () => { raidError = '참여 실패 · 다시 참여'; }).finally(() => {
      raidBusy = false;
      raidErrorUntil = performance.now() + 5000;
      paintRaidStatus();
    });
  });

  // WHEN to save is the scheduler's policy (game.ts, unit-tested there);
  // WHAT a save is stays right here: the engine snapshot over the bridge.
  const saves = createSaveScheduler({
    save: () => {
      if (!paused) void window.desmon.saveState(game.toSave(), generation);
    },
  });

  const inputs: InputSource[] = [];
  const actions: CollectionAction[] = [];
  // One frame is one inventory transaction, including hero changes and drops.
  const settleFrame = (dt: number): void => {
    if (paused) return;
    const events: GameEvent[] = [];
    game.beginEquipmentBatch();
    const mutations = actions.splice(0);
    const results: ActionResultPayload[] = [];
    try {
      for (const action of mutations) {
        events.push(...game.apply(action));
        const error = game.lastActionError();
        results.push({ action, ok: error === null, ...(error ? { error } : {}) });
      }
      for (const source of inputs.splice(0)) events.push(...game.attack(source));
      events.push(...game.update(dt));
      events.push(...game.refreshShop(Date.now()));
    } finally { game.endEquipmentBatch(); }
    saves.onEvents(events);
    if (mutations.length) saves.flush();
    for (const result of results) window.desmon.reportActionResult(result);
  };
  window.desmon.onInput(event => { if (!paused) inputs.push(event.source); });

  // Window-focused fallback input (SPEC F14): keydown/mousedown listeners
  // attach only while the input mode is 'fallback' and detach when the
  // global hook takes over, so attacks are never double-counted.
  setupFallbackInput({
    target: window,
    bridge: window.desmon,
    onAttack: (source) => {
      if (paused) return;
      inputs.push(source);
    },
  });

  // Whole-window drag (SPEC Assumption 10): mouse-dragging anywhere moves the
  // overlay; clicks stay attacks (the drag engages only past a small
  // cursor-travel threshold).
  setupWindowDrag({
    target: window,
    moveBy: (dx, dy) => {
      window.desmon.moveWindowBy(dx, dy);
    },
  });

  // Losing focus is the last reliable moment before a quit — flush progress.
  window.addEventListener('blur', () => {
    settleFrame(0);
    saves.flush();
  });

  // Collection & Battle actions (SPEC F53): the game window owns the state,
  // so the menu's requests are applied HERE and persisted immediately — the
  // flush's SAVE_STATE is what main relays back as STATE_CHANGED.
  window.desmon.onAction((payload) => {
    if (paused) { window.desmon.reportActionResult({ action: payload, ok: false, error: '진행을 저장하는 중입니다. 잠시 후 다시 시도해 주세요.' }); return; }
    // Trust boundary: main already narrowed the menu payload (narrowAction).
    const a = payload as CollectionAction;
    actions.push(a);
  });

  // Legacy reset notification is a request for the same confirmed main flow.
  window.desmon.onReset(() => {
    void window.desmon.resetProgress();
  });

  window.desmon.onPrepareState((request) => {
    if (request.generation !== generation) return;
    settleFrame(0);
    paused = true;
    saves.flush(); // cancel debounce; the paused save callback does not write
    void window.desmon.captureState(request.requestId, generation, game.toSave());
  });
  window.desmon.onReleaseState((release) => {
    if (release.generation <= generation) return;
    if (release.replace) {
      game = createGame(createEngine(parseSave(release.save)), audio, options);
      if (raidLive && !finishedRaids.has(raidLive.raid.raidId)) game.raidState(raidViewOf(raidLive, raidLive));
    }
    else for (const action of release.actions) game.apply(action as CollectionAction);
    for (const replay of release.replays ?? []) game.enqueueReplay(replay);
    generation = release.generation;
    paused = release.blocked;
    last = performance.now();
    unsavedActiveMs = 0;
  });

  for (const replay of await window.desmon.getPendingReplays()) game.enqueueReplay(replay);
  let reportedFirstFrame = false;
  let last = performance.now();
  let unsavedActiveMs = 0;
  const frame = (now: number): void => {
    const dt = Math.min(now - last, 100); // dt clamp: throttle/wake safety
    last = now;
    // The engine clock lives in the rAF loop: companion volleys and fever
    // transitions come back as events and persist like any other progress.
    const hunting = !paused && !game.isReplaying() && !game.isRaiding();
    if (!paused) settleFrame(dt);
    // Even an untouched, companion-less field has play time to preserve.
    if (hunting) unsavedActiveMs += dt;
    if (unsavedActiveMs >= 5000) {
      unsavedActiveMs %= 5000;
      saves.flush();
    }
    game.draw(ctx);
    paintRaidStatus();
    if (!reportedFirstFrame) {
      reportedFirstFrame = true;
      // First painted frame: tell main the scene is live (smoke exits on it).
      window.desmon.reportFirstFrame();
    }
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
}

void boot();

export {};
