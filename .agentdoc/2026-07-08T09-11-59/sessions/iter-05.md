# Session record — iter 05

- agent role: builder
- harness version: v1
- task: T05 — Core types, progression formulas, monster catalog
- result: DONE
- commit: 7396d70

## What I did

- Adopted T05 (first `[ ]` with deps `[x]` — T01; no `[~]` existed), flipped to `[~]`.
- New `src/core/types.ts`: the GAME_ARCHITECTURE §2 shapes verbatim —
  `InputSource`, `MonsterDef`, `ItemDef`/`ItemDrop`, `GameState`, `GameEvent`
  (all 6 event variants). Pure TS, zero electron/DOM/node imports.
- New `src/core/formulas.ts`: the frozen Assumption-3 curves —
  `damageForLevel(l)=l`, `CRIT_CHANCE=0.1`, `CRIT_MULT=2`,
  `monsterMaxHp(i)=Math.floor(10*1.15^i)`, `xpReward(i)=5+3i`,
  `xpToNext(l)=Math.floor(20*1.4^(l-1))`.
- New `src/core/monsters.ts`: `SPECIES_IDS = ['slime','bat','ghost','golem','dragon'] as const`
  (+ `SpeciesId` type), `monsterForIndex(i)` → species cycles in order,
  `tier=Math.floor(i/5)`, `maxHp=monsterMaxHp(i)`, name `"Slime Lv.3"` style
  with Lv = tier+1. Non-integer/negative indices clamped via
  `Math.max(0, Math.floor(i))` (also satisfies noUncheckedIndexedAccess with a
  `?? SPECIES_IDS[0]` that never fires).
- `src/core/index.ts` barrel: re-exports all of the above (type-only exports
  for the interfaces); kept `CORE_VERSION` for tests/scaffold.test.ts.
- New `tests/formulas.test.ts` (10 tests): the four AC-mandated titles verbatim
  (exact-value pins at index 0/5/10/20 and level 1/2/3/4; positive-integer +
  strictly-increasing sweep over 50 levels/indices; species cycle + tier over
  23 monsters) plus pins for damage identity, xpReward closed form, crit
  constants, maxHp==monsterMaxHp(i), Lv=tier+1 names, and index clamping.
- Gates → exit 0 (85 tests, 6 files). Full T05 AC line (vitest run + 4 title
  greps) → exit 0.
- Committed feat(T05) as 7396d70; then plan update (T05 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/core/types.ts (new)
- src/core/formulas.ts (new)
- src/core/monsters.ts (new)
- src/core/index.ts
- tests/formulas.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-05.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22 tests)      ✓ tests/ipc.test.ts (23 tests)
 ✓ tests/scaffold.test.ts (1 test)      ✓ tests/globalInput.test.ts (19 tests)
 ✓ tests/persistence.test.ts (10 tests) ✓ tests/formulas.test.ts (10 tests)
 Test Files  6 passed (6) / Tests  85 passed (85)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/formulas.test.ts \
  && grep -q "monsterMaxHp is exactly 10/20/40/163 at index 0/5/10/20" tests/formulas.test.ts \
  && grep -q "xpToNext is exactly 20/28/39/54 at level 1/2/3/4" tests/formulas.test.ts \
  && grep -q "formula outputs are positive integers and strictly increasing" tests/formulas.test.ts \
  && grep -q "monsterForIndex cycles 5 species in order and tier increments every 5 monsters" tests/formulas.test.ts
 Tests  10 passed (10)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed gates and the AC. Facts future tasks rely on:
  - Display-name Lv is TIER-based (tier+1): "Slime Lv.1" @0, "Slime Lv.2" @5,
    "Slime Lv.3" @10 — pinned by a test; do not switch to index-based names.
  - `monsterForIndex` is total (clamps to `Math.max(0, Math.floor(i))`), also
    pinned by a test.
  - T06/T07/T12 should import `SPECIES_IDS`/`SpeciesId` from the core barrel
    instead of re-declaring the species list.
  - core's `InputSource` duplicates the one in `src/shared/ipc.ts` on purpose:
    tests/ipc.test.ts pins that preload only value-imports `electron`, and
    shared stays dependency-free; do not "deduplicate" them by importing across
    layers.
