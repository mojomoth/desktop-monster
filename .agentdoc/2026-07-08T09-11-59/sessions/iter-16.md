# Session record — iter 16

- agent role: builder
- harness version: v1
- task: T16 — Persistence wiring (load/save/reset round-trip)
- result: DONE
- commit: c8195e7

## What I did

- Adopted T16 (first `[ ]` with dep T13 `[x]`; no `[~]` existed), flipped to
  `[~]`. SPEC F22 renderer half — the main half (atomic tmp+rename write of
  `save.json`) landed in T03 and needed no changes.
- `src/renderer/game.ts`:
  - `Game` gained `toSave()` (delegates to `engine.toSave()`) and `reset()`:
    swaps in a fresh `createEngine()` (random seed is fine — the reset state
    is DEFAULT_SAVE regardless of rng) and clears EVERY presentation system
    (hero/monster anims back to the idle boot, floats, particles, drops
    incl. `arrived` flags, banner, coin-pop age, timeMs). The engine binding
    became mutable (`let engine = initialEngine`).
  - New `createSaveScheduler({save, setTimer?, clearTimer?})` — the WHEN of
    persistence as a DOM-free, timer-injected policy: `onEvents(events)`
    saves immediately when the batch holds `monsterKilled` or `levelUp`
    (canceling any pending debounce — no double save), else a damage-only
    batch (re)arms one trailing `SAVE_DEBOUNCE_MS = 500` timer; `flush()`
    saves unconditionally (blur, reset). Defaults wrap the global
    setTimeout/clearTimeout; the `unknown` handle type keeps it compiling
    under both the DOM and node tsconfig projects.
- `src/renderer/index.ts`: builds the scheduler with
  `save: () => void window.desmon.saveState(game.toSave())`; BOTH input
  paths (IPC `onInput` and the T14 fallback listener) now route
  `game.attack(...)` events into `saves.onEvents(...)`;
  `window.addEventListener('blur', ...)` flushes;
  `window.desmon.onReset(...)` runs `game.reset()` then `saves.flush()` —
  the immediate save of the fresh defaults. Tray menu item arrives in T17;
  the handler is live today.
- Tests (`tests/renderer.test.ts`, +14, 247 total): 6 scheduler-policy tests
  with fake timers (immediate on kill/level-up, 500ms debounce, key-mash
  coalescing, kill-cancels-debounce, flush semantics, empty batch), 3
  toSave/reset behavior tests (engine mirror; reset → DEFAULT_SAVE + idle
  anims; reset clears all in-flight presentation, proven by pixel-identical
  scene equality with a brand-new game), and boot source-contract pins for
  the new index.ts wiring (both `saves.onEvents(...)` spellings,
  `saveState(game.toSave())`, blur flush, reset-then-flush order).
- Gates → exit 0 (247 tests, 15 files; lint 0 warnings; 3 tsc projects).
  T16 AC line (persistence greps + `npx vitest run tests/save.test.ts` +
  index.ts greps + headful smoke) → exit 0, SMOKE_OK.
- Committed feat(T16) as c8195e7; then plan update (T16 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/game.ts
- src/renderer/index.ts
- tests/renderer.test.ts
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-16.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  15 passed (15) / Tests  247 passed (247)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ grep -q "save.json" src/main/persistence.ts && grep -q rename src/main/persistence.ts \
  && npx vitest run tests/save.test.ts \
  && grep -q saveState src/renderer/index.ts && grep -q blur src/renderer/index.ts \
  && grep -q onReset src/renderer/index.ts \
  && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
AC_EXIT=0   (save.test.ts: 9 passed; smoke log tail: SMOKE_OK)
```

## Attempts & dead ends (what future iterations must NOT retry)

- No failed approaches — gates, AC and smoke passed on the first full run.
  Design notes so later tasks do not undo T16 choices:
  - The save POLICY deliberately lives in game.ts (`createSaveScheduler`),
    not index.ts: index.ts value-imports DOM and can only be pin-tested,
    while the scheduler needed behavioral tests (debounce, cancellation).
    Do not inline the debounce into index.ts.
  - `game.reset()` clears presentation pools IN PLACE (`active = false`
    loops) rather than reallocating them — the draw loop and the pool tests
    hold references to the same arrays. The scene-equality test would catch
    a reallocation only indirectly; keep the in-place clear.
  - Reset uses `createEngine()` with its default random seed on purpose.
    Tests never assert post-reset ATTACK outcomes (crit/loot), only the
    reset STATE (= DEFAULT_SAVE, deterministic). If a future task needs a
    seeded post-reset engine, extend `reset(save?, rng?)` — do not make the
    scheduler or index.ts hold a seed.
  - T17's tray Reset only needs `win.webContents.send(IPC.RESET)`; the
    renderer side (reset → immediate flush, order pinned) is done. Blur
    flush is unconditional (saves even with no pending debounce) — SPEC F22
    says "on window blur", not "on blur if dirty"; keep it simple.
  - New pinned index.ts literals (tests/renderer.test.ts):
    `saves.onEvents(game.attack(event.source))`,
    `saves.onEvents(game.attack(source))`,
    `window.desmon.saveState(game.toSave())`, `addEventListener('blur'`,
    `saves.flush()`, `game.reset()` — keep these spellings when editing
    src/renderer/index.ts.
