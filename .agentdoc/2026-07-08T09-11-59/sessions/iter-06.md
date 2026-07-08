# Session record — iter 06

- agent role: builder
- harness version: v1
- task: T06 — Deterministic RNG + loot tables
- result: DONE
- commit: 98b2fe3

## What I did

- Adopted T06 (first `[ ]` with deps `[x]` — T05; no `[~]` existed), flipped to `[~]`.
- New `src/core/rng.ts`: `Rng` interface (`next(): number` in [0,1)) +
  `mulberry32(seed)` (standard 32-bit mulberry32, state seeded via `>>> 0`).
  Pure TS, zero electron/DOM/node imports.
- New `src/core/loot.ts`: `COIN_ITEM`, `TRINKET_CHANCE = 0.25`,
  `TRINKET_TABLE` (frozen order sword_shard:5, slime_gel:4, bone:3, gem:2,
  crown:1), `coinsForIndex(i) = 1 + Math.floor(clamp(i)/3)` (clamp =
  `Math.max(0, Math.floor(i))`, same as monsterForIndex), and
  `rollLoot(rng, monsterIndex)` — coin drop always FIRST element; one
  `rng.next() < 0.25` draw for the trinket chance, a second draw only on
  success for the cumulative-weight pick (amount always 1).
- `src/core/index.ts` barrel: re-exports mulberry32/rollLoot/coinsForIndex +
  constants, type-only `Rng`/`WeightedTrinket`.
- New `tests/loot.test.ts` (11 tests): the two AC-mandated titles verbatim
  (coins exact over 30 indices; 10000-kill seeded trinket rate in the 23–27%
  band), plus mulberry32 determinism + [0,1)/uniformity, at-most-one-trinket +
  valid-id/amount-1 pins, frozen-weights pin, scripted-Rng weight-band mapping
  ([0,5) shard … [14,15) crown over total 15), exclusive 0.25 boundary,
  5/4/3/2/1 empirical ordering, index clamping, end-to-end seed reproducibility.
- Gates → exit 0 (96 tests, 7 files). Full T06 AC line (vitest run + 2 title
  greps) → exit 0.
- Committed feat(T06) as 98b2fe3; then plan update (T06 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/core/rng.ts (new)
- src/core/loot.ts (new)
- src/core/index.ts
- tests/loot.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-06.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22)  ✓ tests/ipc.test.ts (23)  ✓ tests/persistence.test.ts (10)
 ✓ tests/globalInput.test.ts (19)  ✓ tests/scaffold.test.ts (1)
 ✓ tests/formulas.test.ts (10)  ✓ tests/loot.test.ts (11)
 Test Files  7 passed (7) / Tests  96 passed (96)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/loot.test.ts \
  && grep -q "every kill drops exactly 1 + floor(index/3) coins" tests/loot.test.ts \
  && grep -q "trinket drop rate over 10000 seeded kills is within 23 to 27 percent" tests/loot.test.ts
 Tests  11 passed (11)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed gates and the AC. Facts T07 (engine) relies on:
  - `rollLoot` returns the coin drop as `drops[0]` ALWAYS; the optional trinket
    is `drops[1]` with amount 1 — both pinned by tests. Don't reorder.
  - Rng draw discipline: rollLoot consumes 1 draw (no trinket) or 2 draws
    (trinket). Engine crit rolls must use their own `rng.next()` draws — never
    reuse or share a draw with loot, or seeded event-log tests will shear.
  - Trinket chance is EXCLUSIVE (`rng.next() < 0.25`) and the weighted pick is
    a cumulative walk over total weight 15 — the band test in loot.test.ts
    pins the exact band edges; changing the walk order breaks it.
  - Import `Rng`/`mulberry32`/`rollLoot` from the core barrel
    (`src/core/index.js`), not deep paths.
