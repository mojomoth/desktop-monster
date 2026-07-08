# Session record — iter 09

- agent role: builder
- harness version: v1
- task: T09 — InputDriver abstraction + fallback gate (pure core)
- result: DONE
- commit: a91cb9e

## What I did

- Adopted T09 (first `[ ]` with deps `[x]` — T05; no `[~]` existed), flipped
  to `[~]`.
- New `src/core/input.ts` (pure TS, zero electron/DOM/node imports):
  - `InputDriver` interface per SPEC F12: `start()`, `stop()`,
    `subscribe(cb)` → unsubscribe, emitting `{ source: 'keyboard' | 'mouse' }`
    (reuses core's `InputSource` from types.ts).
  - `SimulatedInputDriver implements InputDriver` with programmatic
    `emit(source)`: events are DROPPED while not started; stop() keeps
    subscriptions and start() resumes delivery; unsubscribe removes only that
    listener and is idempotent; delivery iterates a listener snapshot so a
    listener unsubscribing mid-delivery never skips others.
  - `createFallbackGate({attach, detach})` → `{setMode(mode), isAttached()}`
    (pure half of F14): starts detached; `'fallback'` attaches once,
    `'global'` detaches once; repeated same-mode notifications are no-ops;
    an initial `'global'` never calls detach; global→fallback re-attaches.
  - Core-local `InputMode = 'global' | 'fallback'` type, duplicated from
    shared/ipc.ts on purpose (core and shared stay import-free of each
    other — same policy as InputSource, iter-05 notes).
- `src/core/index.ts` barrel: exports `SimulatedInputDriver`,
  `createFallbackGate`, type-only `InputDriver`/`InputEvent`/`InputListener`/
  `InputMode`/`FallbackGate`/`FallbackGateDeps`.
- New `tests/input.test.ts` (9 tests): both AC-mandated titles verbatim, plus
  pins for interface conformance (compile-time `InputDriver` assignment),
  unsubscribe isolation/idempotence, drop-before-start/after-stop + resume,
  snapshot-safe delivery, gate idempotence, initial-global no-detach, and
  fallback→global→fallback re-attach. No file in tests/ or src/core mentions
  the native hook module by name (AC greps for it case-insensitively).
- Gates → exit 0 (130 tests, 10 files). Full T09 AC line → exit 0.
- Committed feat(T09) as a91cb9e; then plan update (T09 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/core/input.ts (new)
- src/core/index.ts
- tests/input.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-09.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22)  ✓ tests/ipc.test.ts (23)  ✓ tests/persistence.test.ts (10)
 ✓ tests/globalInput.test.ts (19)  ✓ tests/scaffold.test.ts (1)  ✓ tests/save.test.ts (9)
 ✓ tests/input.test.ts (9)  ✓ tests/engine.test.ts (16)  ✓ tests/formulas.test.ts (10)
 ✓ tests/loot.test.ts (11)
 Test Files  10 passed (10) / Tests  130 passed (130)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/input.test.ts && ! grep -rqi <hook module> tests src/core \
  && grep -q "SimulatedInputDriver delivers keyboard and mouse events to subscribers" tests/input.test.ts \
  && grep -q "fallback gate attaches listeners in fallback mode and detaches them when global mode activates" tests/input.test.ts
 Test Files  1 passed (1) / Tests  9 passed (9)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed gates and the AC. Facts T13/T14 rely on:
  - `SimulatedInputDriver.emit()` is a NO-OP until `start()` is called —
    T13's main-process smoke path must `start()` the driver before firing its
    ≥3 synthetic attacks (pinned by the drop-before-start test).
  - The fallback gate is renderer-agnostic: T14's renderer/input.ts should
    construct it with real attach/detach closures over window
    keydown/mousedown listeners, seed it with `getInputMode()`'s `.mode`
    FIRST (mode events fired before window load are lost — iter-04 note),
    then feed every `onInputMode` payload's `.mode`. Idempotence is pinned,
    so replayed/duplicate mode events are safe.
  - Import `InputMode` from the core barrel in renderer code that talks to
    the gate; shared/ipc.ts has its own identical `InputMode` for IPC
    payloads. The two are assignment-compatible string unions — do NOT add a
    cross-import between core and shared to "deduplicate" (tests pin
    shared/ipc.ts import-freedom, and core purity is policy).
