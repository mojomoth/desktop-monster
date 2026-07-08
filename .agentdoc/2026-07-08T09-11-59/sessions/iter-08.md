# Session record — iter 08

- agent role: builder
- harness version: v1
- task: T08 — Save schema, tolerant parsing, engine resume
- result: DONE
- commit: affb847

## What I did

- Adopted T08 (first `[ ]` with deps `[x]` — T07; no `[~]` existed), flipped to `[~]`.
- New `src/core/save.ts`: `SaveFileV1` (the exact shape engine.ts's `EngineSave`
  already had), frozen `DEFAULT_SAVE` (fresh game: level 1, monsterHp =
  monsterMaxHp(0) = 10), `serializeSave` (stable JSON: fixed top-level key
  order + sorted items keys, byte-identical for the same logical save), and
  `parseSave(raw: unknown)` — NEVER throws; accepts pre-parsed JSON values
  (what main's load-state returns) or raw JSON text (one try/caught JSON.parse
  on string input); every invalid field independently falls back to its
  DEFAULT_SAVE value; numeric fields floored + clamped to minimums (level and
  monsterHp ≥ 1, others ≥ 0); items keeps only entries with finite counts
  flooring to ≥ 1; always returns fresh objects. Pure TS, zero
  electron/DOM/node imports.
- `src/core/engine.ts`: deleted the local `EngineSave` interface, switched
  createEngine/toSave/initialState to the shared `SaveFileV1` (per iter-07
  guidance: one shape, not two). No behavior change — the field-identity is
  proven by the untouched toSave round-trip test still passing.
- `src/core/index.ts` barrel: exports `DEFAULT_SAVE`, `parseSave`,
  `serializeSave`, type-only `SaveFileV1`; dropped the `EngineSave` type
  export (its only consumer was tests/engine.test.ts, updated).
- New `tests/save.test.ts` (9 tests): both AC-mandated titles verbatim
  (lossless round-trip incl. an engine-produced save after 200 seeded attacks;
  junk/missing/wrong-typed → DEFAULT_SAVE incl. the `'{"level":"x"}'` raw-text
  case and per-field independence), plus byte-stability of serializeSave,
  never-throws battery (cyclic objects, Symbol, BigInt, truncated JSON, Date),
  floor/min-clamp pins, items filtering, fresh-object/no-leak pin, and
  bad-save-still-boots-engine.
- `tests/engine.test.ts`: added the AC-mandated
  "createEngine(save) resumes monsterIndex and monsterHp exactly" (rich save
  at monsterIndex 12/hp 5 resumes every field exactly, plus the full
  serialize→parse→resume F10→F11 path); kept iter-07's clamp test untouched;
  swapped the `EngineSave` import for `SaveFileV1`.
- Gates → exit 0 (121 tests, 9 files). Full T08 AC line (vitest run on
  save+engine + 3 title greps) → exit 0.
- Committed feat(T08) as affb847; then plan update (T08 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/core/save.ts (new)
- src/core/engine.ts
- src/core/index.ts
- tests/save.test.ts (new)
- tests/engine.test.ts
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-08.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22)  ✓ tests/persistence.test.ts (10)  ✓ tests/globalInput.test.ts (19)
 ✓ tests/ipc.test.ts (23)  ✓ tests/scaffold.test.ts (1)  ✓ tests/save.test.ts (9)
 ✓ tests/formulas.test.ts (10)  ✓ tests/engine.test.ts (16)  ✓ tests/loot.test.ts (11)
 Test Files  9 passed (9) / Tests  121 passed (121)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/save.test.ts tests/engine.test.ts && grep -q <3 AC titles>
 Test Files  2 passed (2) / Tests  25 passed (25)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed gates and the AC. Facts T13/T16 rely on:
  - The type name `EngineSave` NO LONGER EXISTS — import `SaveFileV1` (and
    `parseSave`/`serializeSave`/`DEFAULT_SAVE`) from the core barrel.
  - Renderer boot (T13) can be `createEngine(parseSave(await loadState()))`
    with no try/catch: parseSave handles null, junk objects, and raw JSON
    strings alike, never throws, and always returns fresh mutable objects.
  - parseSave does NOT clamp monsterHp against the monster's maxHp — that
    remains createEngine's clamp into [1, maxHp]. Both behaviors are pinned by
    tests ("monsterHp).toBe(1)" floor pin in save.test.ts; clamp test in
    engine.test.ts). Don't move the maxHp clamp into parseSave.
  - serializeSave is byte-stable (fixed key order, items keys sorted) and
    save.test.ts pins `serializeSave(a) === serializeSave(parseSave(serializeSave(a)))`.
    T16 should persist `serializeSave(engine.toSave())` output (or the object;
    main's save-state writes JSON) — never a hand-rolled JSON.stringify shape.
  - items filtering drops zero/negative/non-finite/non-number counts and
    floors fractional ones; a save round-trip is only guaranteed lossless for
    valid saves (integer fields, counts ≥ 1) — engine-produced saves always
    qualify.
