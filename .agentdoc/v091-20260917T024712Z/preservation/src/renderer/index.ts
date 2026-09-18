// Renderer boot (SPEC F21 + F18, Assumption 11): load save → parseSave →
// createEngine → subscribe input → rAF loop repainting the full scene, and
// report the first painted frame over IPC exactly once (drives smoke).
// Persistence wiring (SPEC F22, T16): progress saves on every kill and
// level-up, debounced 500ms after damage, on window blur, and immediately
// after a Reset Progress request from main, and after every applied
// collection action (F53).

import { createEngine, parseSave } from '../core/index.js';
import type { CollectionAction } from '../core/index.js';
import { setupWindowDrag } from './drag.js';
import { createGame, createSaveScheduler } from './game.js';
import { setupFallbackInput } from './input.js';
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
  // normalizes fields in supported v1–v3 saves and migrates older progress.
  const loaded = await window.desmon.loadState();
  const engine = createEngine(loaded == null ? null : parseSave(loaded));
  const settings = await window.desmon.getSettings();
  const options = { screenShake: settings.screenShake };
  window.desmon.onSettingsChanged((next) => { options.screenShake = next.screenShake; });
  let game = createGame(engine, undefined, options);
  let generation = await window.desmon.getGeneration();
  let paused = false;

  // WHEN to save is the scheduler's policy (game.ts, unit-tested there);
  // WHAT a save is stays right here: the engine snapshot over the bridge.
  const saves = createSaveScheduler({
    save: () => {
      if (!paused) void window.desmon.saveState(game.toSave(), generation);
    },
  });

  window.desmon.onInput((event) => {
    if (paused) return;
    saves.onEvents(game.attack(event.source));
  });

  // Window-focused fallback input (SPEC F14): keydown/mousedown listeners
  // attach only while the input mode is 'fallback' and detach when the
  // global hook takes over, so attacks are never double-counted.
  setupFallbackInput({
    target: window,
    bridge: window.desmon,
    onAttack: (source) => {
      if (paused) return;
      saves.onEvents(game.attack(source));
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
    saves.flush();
  });

  // Collection & Battle actions (SPEC F53): the game window owns the state,
  // so the menu's requests are applied HERE and persisted immediately — the
  // flush's SAVE_STATE is what main relays back as STATE_CHANGED.
  window.desmon.onAction((payload) => {
    if (paused) return;
    // Trust boundary: main already narrowed the menu payload (narrowAction).
    const a = payload as CollectionAction;
    saves.onEvents(game.apply(a));
    saves.flush();
  });

  // Legacy reset notification is a request for the same confirmed main flow.
  window.desmon.onReset(() => {
    void window.desmon.resetProgress();
  });

  window.desmon.onPrepareState((request) => {
    if (request.generation !== generation) return;
    paused = true;
    saves.flush(); // cancel debounce; the paused save callback does not write
    void window.desmon.captureState(request.requestId, generation, game.toSave());
  });
  window.desmon.onReleaseState((release) => {
    if (release.generation <= generation) return;
    if (release.replace) game = createGame(createEngine(parseSave(release.save)), undefined, options);
    else for (const action of release.actions) game.apply(action as CollectionAction);
    generation = release.generation;
    paused = release.blocked;
    last = performance.now();
    unsavedActiveMs = 0;
  });

  let reportedFirstFrame = false;
  let last = performance.now();
  let unsavedActiveMs = 0;
  const frame = (now: number): void => {
    const dt = Math.min(now - last, 100); // dt clamp: throttle/wake safety
    last = now;
    // The engine clock lives in the rAF loop: companion volleys and fever
    // transitions come back as events and persist like any other progress.
    if (!paused) saves.onEvents(game.update(dt));
    // Even an untouched, companion-less field has play time to preserve.
    if (!paused) unsavedActiveMs += dt;
    if (unsavedActiveMs >= 5000) {
      unsavedActiveMs %= 5000;
      saves.flush();
    }
    game.draw(ctx);
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
