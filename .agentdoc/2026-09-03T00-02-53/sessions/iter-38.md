# Session record — iter 38

- agent role: builder
- worker: claude
- lane: .worktrees/T30 (branch lane/T30)
- harness version: v2
- task: T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
- result: DONE
- commit: 074bed7998bd7c34767c32aabf275b70cbb85d5f
- graphify affected used: none (engine.ts/types.ts/collection.ts read directly; small, known surface)

## What I did

- Added `COMPANION_ATTACK_MS = 1000` to `src/core/engine.ts` (SPEC F35).
- Extracted the whole damage + kill chain out of `attack()` into ONE inner
  `function applyDamage(damage, events)` (monsterHit → monsterKilled → loot
  (boss 5x coins) → capture draw → level-ups → monsterSpawned). `attack()` now
  pushes its `attack` event and calls it — behaviour and rng draw order are
  byte-identical (the seeded-log and v1-draw-count tests prove it).
- `tick(dtMs)` now: advances the clock, runs `feverTick` first (feverEnd), then
  accumulates `volleyAcc` and fires ⌊dt/1000⌋ volleys, keeping the remainder.
- Per volley: `activeCompanions(state.companions)` is recomputed, and each
  companion in order deals `companionPower(c) * (fever ? FEVER_MULT : 1n)`,
  never crits, emitting `companionAttack { companionId, speciesId, damage }`
  then going through `applyDamage` — so kills chain into the next monster
  inside the same volley and roll loot/capture like hero kills.
- No companions → `activeCompanions` is empty → no events and no rng draws.
- `GameEvent` gained `companionAttack` in `src/core/types.ts` (the renderer's
  event switch has no exhaustiveness default, so nothing else had to change).
- Added the 3 AC test titles to `tests/engine.test.ts` (23 → 26 `it(`).

## Files touched

- src/core/engine.ts
- src/core/types.ts
- tests/engine.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-38.md

## Gate results

```
 Test Files  27 passed (27)
      Tests  431 passed (431)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC (T30, run literally): exit=0   [tests/engine.test.ts 26 tests passed]
```

## Attempts & dead ends (what future iterations must NOT retry)

- None: the refactor landed first time. Note for later lanes — `applyDamage`
  must stay the single damage path; duplicating the kill chain would desync the
  rng draw order that "same seed yields an identical event log" and "non-boss
  kills consume exactly the v1 rng draws" pin down.
- The fever test uses monster index 60 (~43k hp) on purpose: a smaller monster
  would die to the 20 fever inputs and hide a stray loot draw in the
  "never crits" draw-count assertion.
