# Session record — iter 34

- agent role: builder
- worker: claude
- lane: .worktrees/T29 (branch lane/T29)
- harness version: v2
- task: T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
- commit: 96bbcdc4eed120ea7042410200c459e7dce9136d
- graphify affected used: none (read engine.ts/types.ts/collection.ts directly — the
  task's file set is 4 files I already had to open)

## What I did

- New `src/core/fever.ts`: `FEVER_INPUTS = 20`, `FEVER_WINDOW_MS = 3000`, `FEVER_MS = 5000`,
  `FEVER_COOLDOWN_MS = 10000`, `FEVER_MULT = 3n`, readonly `Fever { stamps, activeUntil,
  cooldownUntil }`, `createFever`, `feverInput` (last 20 stamps; starts iff 20 stamps &&
  now − oldest ≤ 3000 && !active && now ≥ cooldownUntil; stamps cleared on start),
  `feverTick` (ends once → `cooldownUntil = now + 10000`, `activeUntil = 0`), `feverActive`.
  Pure — no clock of its own, so the `Date.now(` source guard holds.
- `src/core/types.ts`: `GameState.fever { active, remainingMs }`; `GameEvent` gains
  `feverStart` / `feverEnd` (no payload — T37 only needs the trigger + `state.fever.active`).
- `src/core/engine.ts`: closure-owned `clockMs` (advanced ONLY by the new
  `tick(dtMs: number): GameEvent[]`, non-finite/negative → 0, runs `feverTick` first and
  emits `feverEnd`; T30 hangs the volley off the same method). `attack()` stamps `clockMs`
  and pushes `feverStart` BEFORE its own `attack` event, so the 20th input already hits at
  ×3. Damage is now `level × crit × fever × (1 + souls)` — T28's souls factor kept.
  `getState()` recomputes `fever` from the clock; `toSave()` untouched (never persisted).
- `src/core/index.ts`: `export * from './fever.js';`.
- New `tests/fever.test.ts` (4 tests, AC titles verbatim): the pure 19-vs-20 window rule,
  the engine's 5000ms burn → ×3 damage → 10000ms cooldown (a burst inside the cooldown
  lights nothing, a burst past it does), no `fever` key in `toSave()` and a resumed engine
  starting cold, and "1000 attacks are not time" + junk dt → 0ms.
- `tests/engine.test.ts` (outside the task's Files — the AC runs it, so a gate forced it):
  two v1 tests spam ≥20 inputs on one engine and now legitimately trigger fever.
  "crit rate over 10000 seeded attacks" takes the attack event by type instead of index 0
  (`feverStart` can precede it); the `toSave()` round-trip ticks `FEVER_MS` first so the
  fever it lit burns out before comparing with the resumed engine. No assertion weakened,
  no test renamed or removed (23 `it(` before and after).

## Files touched

- src/core/fever.ts (new)
- src/core/engine.ts
- src/core/types.ts
- src/core/index.ts
- tests/fever.test.ts (new)
- tests/engine.test.ts (gate-forced, 3 lines)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-34.md

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  26 passed (26)
      Tests  388 passed (388)
> eslint . --max-warnings 0
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

$ <T29 AC, verbatim>
 Test Files  2 passed (2)
      Tests  27 passed (27)
AC EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT try to keep `tests/engine.test.ts` untouched: with the clock frozen at 0, 20+
  attacks on one engine are 20 stamps inside the 3000ms window, so fever really does light
  in the v1 spam tests. Both edits above are the minimum; weakening either assertion is not.
- Do NOT read `state.fever` from inside the engine — it is a boot placeholder
  (`COLD_FEVER`); the live truth is `feverActive(fever, clockMs)`, and `getState()`
  recomputes the view. T30's companion volley must use `feverActive`, not `state.fever`.
- `feverTick` clears nothing but `activeUntil` and is idempotent (a second tick after the
  end emits no second `feverEnd`) — pinned by the "engine time advances only through tick"
  and "fever lasts 5000ms…" tests.
- No `Date.now(` may appear anywhere in `src/core`, comments included (the AC greps it).
