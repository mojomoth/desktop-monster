# Session record — iter 07

- agent role: builder
- harness version: v1
- task: T07 — Attack engine: event sequences, crits, XP/level-up
- result: DONE
- commit: 8a7df01

## What I did

- Adopted T07 (first `[ ]` with deps `[x]` — T06; no `[~]` existed), flipped to `[~]`.
- New `src/core/engine.ts`: `createEngine(save?, rng?)` → `attack(source)` /
  `getState()` / `toSave()`. Per attack: one rng crit draw
  (`< CRIT_CHANCE`, damage `damageForLevel(level) * (crit ? CRIT_MULT : 1)`),
  damage applied at input time, `monsterHit.hpAfter` clamped to 0. On kill:
  event order attack, monsterHit, monsterKilled, itemDropped[, levelUp…],
  monsterSpawned; drops from `rollLoot` applied to coins/items; XP carry-over
  via `while (xp >= xpToNext(level)) { xp -= …; level++ }` (inclusive
  boundary, one levelUp event per level); next monster `monsterForIndex(i+1)`
  at full HP. Pure TS, zero electron/DOM/node imports; default rng is
  `mulberry32(Math.random-seed)` — tests always inject.
- `EngineSave` (plain shape) mirrors the planned SaveFileV1 field-for-field;
  resume clamps monsterHp into [1, maxHp] (floored). getState() and event
  payloads return defensive copies (monster/items spreads).
- `src/core/index.ts` barrel: re-exports `createEngine`, type-only
  `Engine`/`EngineSave`.
- New `tests/engine.test.ts` (15 tests): the six AC-mandated titles verbatim
  (seeded 500-attack event-log identity; 10000-attack crit band 8–12%;
  non-kill = exactly [attack, monsterHit]; kill order incl. exact payload
  pins; index+1/higher-maxHp spawn; exact-20-xp level-up via
  `xpReward(5) === xpToNext(1) === 20` from a monsterIndex-5 save, next
  attack damage 2) plus pins for carry-over (19+5→L2 xp 4), multi-level kill
  (index 20 → L3 xp 17, two levelUp events), per-attack crit draws, overkill
  hpAfter=0, drop application (scripted [0.5, 0, 0] → coin + sword_shard),
  toSave round-trip state identity, resume-exact + hp clamping, and
  getState defensive-copy.
- Gates → exit 0 (111 tests, 8 files). Full T07 AC line (vitest run + 6 title
  greps) → exit 0.
- Committed feat(T07) as 8a7df01; then plan update (T07 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/core/engine.ts (new)
- src/core/index.ts
- tests/engine.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-07.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22)  ✓ tests/ipc.test.ts (23)  ✓ tests/globalInput.test.ts (19)
 ✓ tests/persistence.test.ts (10)  ✓ tests/scaffold.test.ts (1)
 ✓ tests/formulas.test.ts (10)  ✓ tests/engine.test.ts (15)  ✓ tests/loot.test.ts (11)
 Test Files  8 passed (8) / Tests  111 passed (111)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/engine.test.ts && grep -q <6 AC titles> tests/engine.test.ts
 Tests  15 passed (15)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed gates and the AC. Facts T08 (save schema) relies on:
  - `EngineSave` in engine.ts is already the exact SaveFileV1 shape
    `{version:1, level, xp, killCount, coins, items, monsterIndex, monsterHp}`.
    T08 should define SaveFileV1 in save.ts and have engine.ts import it
    (replace EngineSave or alias it) — do NOT introduce a second, diverging
    shape. `createEngine(save)` already resumes monsterIndex/monsterHp and
    clamps hp into [1, maxHp] (pinned by
    "createEngine(save) resumes exactly and clamps monsterHp into [1, maxHp]");
    parseSave only needs to add junk/type tolerance ahead of the engine.
  - Rng draw discipline is pinned by the seeded event-log test: exactly one
    crit draw per attack, then rollLoot's 1–2 draws on a kill. Any new
    rng.next() call inserted into the attack path shears
    "same seed yields an identical event log" — extend at your peril.
  - Level-up boundary is INCLUSIVE (`xp >= xpToNext`), pinned by the
    exact-20-xp test; multi-level kills emit one levelUp per level, between
    itemDropped and monsterSpawned. Don't change to `>`.
  - Engine hands out defensive copies (getState and monsterKilled/
    monsterSpawned payloads); renderer code (T13+) may mutate what it
    receives without corrupting the engine.
