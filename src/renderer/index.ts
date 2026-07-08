// Renderer boot (SPEC F21 + F18, Assumption 11): load save → parseSave →
// createEngine → subscribe input → rAF loop repainting the full scene, and
// report the first painted frame over IPC exactly once (drives smoke).

import { createEngine, parseSave } from '../core/index.js';
import { createGame } from './game.js';

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

  window.desmon.onInput((event) => {
    game.attack(event.source);
  });

  let reportedFirstFrame = false;
  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(now - last, 100); // dt clamp: throttle/wake safety
    last = now;
    game.update(dt);
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
