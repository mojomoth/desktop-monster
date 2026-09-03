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

  // parseSave never throws and tolerates null/junk (SPEC F11) — a bad save
  // file must never prevent boot, so no try/catch is needed here.
  const engine = createEngine(parseSave(await window.desmon.loadState()));
  const game = createGame(engine);

  // WHEN to save is the scheduler's policy (game.ts, unit-tested there);
  // WHAT a save is stays right here: the engine snapshot over the bridge.
  const saves = createSaveScheduler({
    save: () => {
      void window.desmon.saveState(game.toSave());
    },
  });

  window.desmon.onInput((event) => {
    saves.onEvents(game.attack(event.source));
  });

  // Window-focused fallback input (SPEC F14): keydown/mousedown listeners
  // attach only while the input mode is 'fallback' and detach when the
  // global hook takes over, so attacks are never double-counted.
  setupFallbackInput({
    target: window,
    bridge: window.desmon,
    onAttack: (source) => {
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
    // Trust boundary: main already narrowed the menu payload (narrowAction).
    const a = payload as CollectionAction;
    saves.onEvents(game.apply(a));
    saves.flush();
  });

  // Tray "Reset Progress" (menu arrives in T17; the handler works today):
  // fresh default engine, then persist the reset state immediately.
  window.desmon.onReset(() => {
    game.reset();
    saves.flush();
  });

  let reportedFirstFrame = false;
  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(now - last, 100); // dt clamp: throttle/wake safety
    last = now;
    // The engine clock lives in the rAF loop: companion volleys and fever
    // transitions come back as events and persist like any other progress.
    saves.onEvents(game.update(dt));
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
