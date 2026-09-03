# Session record — iter 29

- agent role: builder
- worker: claude
- lane: .worktrees/T28 (branch lane/T28)
- harness version: v2
- task: T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
- result: DONE
- commit: f8775ecf818339cde8bf869e26c29cdde9b8b53f
- graphify affected used: none (task block + SPEC F33 + GAME_DESIGN_V2 §3/§7 named every file; read engine.ts/types.ts/collection.ts directly)

## What I did

- `src/core/types.ts`: `GameEvent` gains `bossCaptured { companion }` (after `itemDropped`),
  `rebirth { souls }` and `pvpResolved { won, stolen, lostId }` — structurally identical to
  T27's local `CollectionEvent`, so `collection.ts` needed no edit (it stays outside my file set).
- `src/core/engine.ts`: `export const CAPTURE_CHANCE = 0.35`; `Engine` gains
  `apply(a: CollectionAction): GameEvent[]`.
- Boss kill: exactly ONE extra `rng.next() < CAPTURE_CHANCE` draw AFTER the loot roll, always
  consumed (`killed.boss && rng.next() < …` short-circuits only on the non-boss branch), capture
  skipped when `companions.length >= ROSTER_CAP`. Captured companion id from `nextCompanionId++`.
- Hero damage `* BigInt(1 + state.souls)`; `bestIndex = max(bestIndex, monster.index)` on every
  spawn and at resume (`initialState`).
- `apply` = `applyCollection(state, a)`; `{ error }` → `[]` and the state object is not touched,
  otherwise `Object.assign(state, result.state)` (keeps any engine-owned extras such as T29's
  fever, which applyCollection carries over by spread) and returns its events.
- `tests/engine.test.ts`: +6 `it(` (17 → 23) with the AC's verbatim titles, plus `makeSaveV2()`
  and `countingRng()` helpers. Capture rate over 10000 seeded boss kills (fresh engine, one
  shared `mulberry32(20260903)`) measured at ~35 %, asserted inside 32–38 %.

## Files touched

- src/core/engine.ts
- src/core/types.ts
- tests/engine.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-29.md

## Gate results

```
$ npm test
 Test Files  25 passed (25)
      Tests  377 passed (377)

$ npm run lint      # eslint . --max-warnings 0
(clean, exit 0)

$ npm run typecheck # tsc main + renderer + test projects
(clean, exit 0)

$ <T28 AC line, literally>
AC exit: 0    (also re-run under bash -c: exit 0)
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT move `Engine` into `types.ts` (GAME_DESIGN_V2 §7 shows it there): it lives in
  `engine.ts` and the barrel re-exports it from there — moving it is a pointless diff and
  would break `import type { Engine } from './engine.js'`.
- Do NOT re-export `ROSTER_CAP` from `engine.ts` (design §3 suggests it): `src/core/index.ts`
  already does `export * from './collection.js'`, so a second export of the same name is a
  duplicate-export error in the barrel. `engine.ts` imports it instead.
- `CAPTURE_CHANCE` is imported in the test from `../src/core/engine.js`, not the barrel —
  `src/core/index.ts` is T29's file, not T28's, so it was left untouched.
- The 10000-kill statistics test needs a FRESH engine per kill (otherwise the roster fills at
  30 and later captures are skipped) but the SAME `Rng` instance passed into each engine, so
  the seeded stream stays continuous.
