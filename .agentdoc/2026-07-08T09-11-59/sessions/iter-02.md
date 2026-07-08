# Session record — iter 02

- agent role: builder
- harness version: v1
- task: T02 — Transparent always-on-top overlay window + accessory lifecycle
- result: DONE
- commit: 98c8c1b

## What I did

- Adopted T02 (first `[ ]` with deps `[x]`; no `[~]` existed), flipped to `[~]`.
- New `src/main/window.ts`: the verbatim GAME_ARCHITECTURE §3.1 BrowserWindow options block (transparent/frame:false/hasShadow:false/resizable:false/fullscreenable:false/maximizable:false/minimizable:false/skipTaskbar/roundedCorners:false/acceptFirstMouse/show:false; webPreferences preload + contextIsolation:true + nodeIntegration:false + sandbox:true + backgroundThrottling:false), then `win.setAlwaysOnTop(true, 'screen-saver')` followed by `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })`, relative `loadFile('static/index.html')`, show on `ready-to-show`.
- Rewrote `src/main/index.ts` around the accessory lifecycle: `app.setName('DesMon')` → `requestSingleInstanceLock` (second instance `app.quit()`) → `whenReady` → `app.dock?.hide()` BEFORE `createOverlayWindow()`. SMOKE path preserved: `did-finish-load` → `SMOKE_OK` + `app.exit(0)`, 20s watchdog `app.exit(1)`.
- `static/style.css`: added `-webkit-app-region: no-drag` on html/body (only the 24-px `.drag-handle` strip stays draggable — drag regions swallow mousedown, fallback input needs clicks) + a subtle hover grip hint. `static/index.html` needed no change (drag strip + canvas already present from T01).
- New `tests/window.test.ts` (22 tests): source-contract tests pinning every F15/F16 AC literal plus the orderings the greps cannot check (setAlwaysOnTop before setVisibleOnAllWorkspaces; dock hide before window creation; drag confined to the 24-px strip). Main-process modules cannot be imported under vitest (`electron` resolves to a binary path outside Electron), so file-content assertions are the deterministic option; runtime is covered by smoke + Manual M1.
- Ran gates (`npm test && npm run lint && npm run typecheck`) → exit 0 (23 tests pass).
- Ran T02's full AC line literally (11 greps + `npm run smoke` + SMOKE_OK grep) → exit 0.
- Committed feat(T02) as 98c8c1b; then plan update (T02 `[x]`, Notes bullet, Iteration Log row) + this record as a docs commit.

## Files touched

- src/main/window.ts (new)
- src/main/index.ts
- static/style.css
- tests/window.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-02.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/scaffold.test.ts (1 test) 1ms
 ✓ tests/window.test.ts (22 tests) 3ms
 Test Files  2 passed (2)
      Tests  23 passed (23)
> eslint . --max-warnings 0        (no output, exit 0)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (exit 0)
GATES_EXIT=0

$ <full T02 AC line: 11 greps && npm run smoke > /tmp/desmon-smoke.log && grep SMOKE_OK>
AC_EXIT=0        (smoke log tail: "SMOKE_OK")
```

## Attempts & dead ends (what future iterations must NOT retry)

- First test run failed: the call-order assertion used bare `indexOf('setVisibleOnAllWorkspaces')`, which matched the method name inside a COMMENT above the calls. Fix: match the `win.`-prefixed call sites. Lesson for anyone editing `src/main/window.ts` / `src/main/index.ts` later: tests/window.test.ts pins `win.setAlwaysOnTop` before `win.setVisibleOnAllWorkspaces` and `app.dock?.hide()` before `createOverlayWindow()` — keep those exact spellings and orderings.
- Confirmed: headful `npm run smoke` still runs unattended and exits 0 with the transparent/frameless/dock-hidden window; no TCC or focus interaction needed.
