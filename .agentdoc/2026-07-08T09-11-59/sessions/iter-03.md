# Session record — iter 03

- agent role: builder
- harness version: v1
- task: T03 — Shared IPC constants, preload bridge, persistence handlers
- result: DONE
- commit: f86ea91

## What I did

- Adopted T03 (first `[ ]` with deps `[x]`; no `[~]` existed), flipped to `[~]`.
- New `src/shared/ipc.ts`: the full GAME_ARCHITECTURE §3.2 channel table as an `IPC` const object plus `FIRST_FRAME = 'desmon:first-frame'`, with payload types (`InputPayload`, `InputModePayload`, `InputMode`, `InputSource`, `SaveStatePayload = unknown` — tightens to `SaveFileV1` in T08).
- Rewrote `src/preload/index.ts` (sandboxed, CJS emit): `contextBridge.exposeInMainWorld('desmon', …)` with onInput/onInputMode/onReset (each returning an unsubscribe fn via a shared `subscribe` helper), getInputMode, loadState, saveState, openAccessibilitySettings, reportFirstFrame. Value-imports ONLY `electron`; channel strings are inlined literals; shared payload types are `import type` (erased at emit). Exports `DesmonApi` for T13's `global.d.ts`.
- New `src/main/persistence.ts`: deliberately electron-free — `readSaveFile(userDataDir)` (raw parsed JSON or null on ANY error) and `writeSaveFile(userDataDir, data)` (mkdir -p, write `save.json.tmp`, `renameSync` over `save.json`; returns false, never throws). The dir is injected so vitest can do real filesystem tests.
- New `src/main/ipc.ts`: `registerIpcHandlers({onFirstFrame?})` — invoke handlers for get-input-mode (fallback stub until T04), load-state / save-state (persistence with `app.getPath('userData')`), open-accessibility-settings (`shell.openExternal` x-apple.systempreferences deep link); `ipcMain.on(IPC.FIRST_FRAME)` fires the injectable callback (T13's smoke hook).
- `src/main/index.ts`: `registerIpcHandlers()` inside `whenReady`, after `app.dock?.hide()` and before `createOverlayWindow()` (keeps tests/window.test.ts ordering pins intact).
- New `tests/persistence.test.ts` (10 tests, behavioral): round-trip, mkdir-on-missing, no tmp residue after atomic write, overwrite, false-not-throw on unwritable path, null on missing/corrupt, raw-JSON-no-validation.
- New `tests/ipc.test.ts` (23 tests): shared constant table pinned exactly; preload source-contract — every `IPC` value appears as an inlined literal in the preload AND the preload's only value import is `electron` (regex over import lines); main handler registrations, fallback stub literals, deep link.
- Gates (`npm test && npm run lint && npm run typecheck`) → exit 0 first run (56 tests). Full T03 AC line (4 greps + `npm run smoke` + SMOKE_OK grep) → exit 0 — smoke now boots WITH the live sandboxed bridge.
- Committed feat(T03) as f86ea91; then plan update (T03 `[x]`, Notes bullet, Iteration Log row) + this record as a docs commit.

## Files touched

- src/shared/ipc.ts (new)
- src/preload/index.ts
- src/main/persistence.ts (new)
- src/main/ipc.ts (new)
- src/main/index.ts
- tests/persistence.test.ts (new)
- tests/ipc.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-03.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22 tests) 3ms
 ✓ tests/scaffold.test.ts (1 test) 1ms
 ✓ tests/ipc.test.ts (23 tests) 4ms
 ✓ tests/persistence.test.ts (10 tests) 8ms
 Test Files  4 passed (4)
      Tests  56 passed (56)
> eslint . --max-warnings 0        (no output, exit 0)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (exit 0)
GATES_EXIT=0

$ grep -q contextBridge src/preload/index.ts && grep -q "desmon:first-frame" src/shared/ipc.ts \
  && grep -q "save.json" src/main/persistence.ts && grep -q rename src/main/persistence.ts \
  && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
AC_EXIT=0        (smoke log tail: "SMOKE_OK")
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed all gates and the AC. Facts future tasks rely on:
  - `src/main/persistence.ts` must stay electron-free (dir injected, not `app.getPath` inside) or tests/persistence.test.ts stops loading under vitest — T16 should keep calling it through `src/main/ipc.ts`.
  - tests/ipc.test.ts enforces: every shared `IPC` channel literal appears verbatim (quoted) in the preload, and the preload's only VALUE import is `'electron'`. Adding a channel means editing shared/ipc.ts AND inlining the literal in preload; any new preload import of project modules must be `import type`.
  - T13: pass `onFirstFrame` into `registerIpcHandlers({...})` for the SMOKE_OK-after-first-frame upgrade; the `ipcMain.on` side is already in place. `DesmonApi` (exported from preload) is the type for `window.desmon`.
