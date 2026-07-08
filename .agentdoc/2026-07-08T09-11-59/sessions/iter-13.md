# Session record — iter 13

- agent role: builder
- harness version: v1
- task: T13 — Renderer boot: canvas scene, HUD, first-frame IPC, full smoke
- result: DONE
- commit: 6e190bb

## What I did

- Adopted T13 (first `[ ]` with deps `[x]` — T03/T08/T09/T12; no `[~]`
  existed), flipped to `[~]`.
- New `src/renderer/hud.ts` (DOM-free, SpriteCanvas): `drawMeter` (boxed
  steel frame / void interior / clamped proportional fill, ≥1px while
  nonzero) reused by `drawHpBar` (red) and the XP bar; `drawLevelHud`
  (`LV n` + XP/xpToNext meter, top-left); `drawCounters` (right-aligned
  skull×kills and coin×coins rows); minimal pooled floating damage numbers
  (`createFloatPool`/`spawnFloat`/`tickFloats`/`drawFloats`, fixed
  FLOAT_POOL_SIZE=16, overflow recycles the oldest, 600ms life, 8px rise,
  crits yellow).
- New `src/renderer/game.ts` (DOM-free): `createGame(engine)` →
  `{attack, update, draw, getState}`; draw() clears + repaints the full
  160×110 scene (field strip at GROUND_Y=92, hero at x=26, tier-tinted
  monster unflipped at x=118 with a per-`speciesId:tier` palette cache,
  boxed HP bar above the monster, HUD, floats); attack() steps the engine,
  spawns a damage float per attack event, and returns the events (T16 save
  hooks / T14 FSM feeds); update() clamps bad dt to 0. Idle bob only —
  core FSMs arrive in T14.
- New `src/renderer/global.d.ts`: declares `window.desmon` from shared
  payload types (NOT by importing src/preload — that would pull an
  electron-importing module into the web emit).
- Rewrote `src/renderer/index.ts`: loadState → parseSave → createEngine →
  createGame → onInput subscription → rAF loop (dt clamp 100ms,
  imageSmoothingEnabled=false), `reportFirstFrame()` exactly once after the
  first painted frame.
- Upgraded `src/main/index.ts` SMOKE path: registerIpcHandlers gets an
  `onFirstFrame` callback (smoke only) that runs once — a core
  `SimulatedInputDriver` (start() before emit — T09 rule) fires 3 synthetic
  attacks over `desmon:input`, then SMOKE_OK + app.exit(0) after a 500ms
  render grace; 20s watchdog app.exit(1) kept; globalInput still fully
  bypassed under SMOKE=1. Kept the literals tests/window.test.ts and
  tests/ipc.test.ts pin (`registerIpcHandlers()`, dock-before-window order).
- New `tests/renderer.test.ts` (31 tests): behavioral scene/HUD/float-pool
  coverage on a recording fake GameCanvas (proportional fills, clamping,
  right-alignment, pool recycling/expiry/rise, full-scene draw bounds,
  attack→float, idle-bob advance, tier-tint difference) + source-contract
  pins for renderer boot, main smoke sequence, and global.d.ts↔preload
  method sync.
- Gates → exit 0 (197 tests, 13 files). Full T13 AC line (greps + headful
  smoke, SMOKE_OK) → exit 0.
- Committed feat(T13) as 6e190bb; then plan update (T13 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/hud.ts (new)
- src/renderer/game.ts (new)
- src/renderer/global.d.ts (new)
- src/renderer/index.ts
- src/main/index.ts
- tests/renderer.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-13.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  13 passed (13) / Tests  197 passed (197)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ grep -q reportFirstFrame src/renderer/index.ts && grep -q SimulatedInputDriver src/main/index.ts \
  && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
AC_EXIT=0   (smoke log tail: SMOKE_OK)
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — gates, AC and smoke passed on the first full run. Design notes so
  later tasks do not undo deliberate choices:
  - Smoke fires its 3 attacks FROM the first-frame callback, not from
    did-finish-load: the renderer's async boot (awaited loadState invoke)
    means an input sent at did-finish-load could arrive before
    `onInput` is subscribed and be lost. First-frame implies the
    subscription exists. Keep that ordering in T14/T16 edits.
  - Do NOT import src/preload from renderer code (even type-only):
    tsc includes imported files in the program, so tsconfig.renderer would
    emit dist/web/preload/index.js with a bare `electron` import.
    global.d.ts re-declares the bridge shape instead, and
    tests/renderer.test.ts pins it against the preload source.
  - game.ts/hud.ts must stay DOM-free (GameCanvas/SpriteCanvas typing) —
    tests import them under vitest's node environment. Put any
    document/window/rAF code in src/renderer/index.ts (or T14's input.ts
    behind injected attach/detach).
  - tests/renderer.test.ts pins literal spellings in main/index.ts
    (`new SimulatedInputDriver()`, `SMOKE_ATTACK_COUNT = 3`, `20_000`,
    `process.stdout.write('SMOKE_OK\n')`) and renderer/index.ts
    (`Math.min(now - last, 100)`, draw-before-report order,
    `reportedFirstFrame = true`). Editing those files? Keep the spellings
    or update the pins deliberately (never weaken).
  - `monsterSprites` is keyed by SpeciesId; index with a runtime string via
    the `Partial<Record<string, SpeciesSprites>>` widening (strict mode).
