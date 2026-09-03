# Session record — iter 19

- agent role: builder
- worker: claude
- lane: .worktrees/T24 (branch lane/T24)
- harness version: v2
- task: T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
- result: DONE
- commit: 60681b7bf0eed66a9e28396c0c9320bc9f953490
- graphify affected used: none (task Notes named every call site; `grep -rn "SaveFileV1"` confirmed them)

## What I did

- `src/core/save.ts`: added `Companion`, `SaveFileV2` (GAME_DESIGN_V2 §2), `type SaveFile = SaveFileV2`;
  kept `SaveFileV1` as the legacy input shape. `DEFAULT_SAVE` is now v2 (`monsterHp: '10'`, companions
  `[]`, nextCompanionId 1, souls/rebirths/bestIndex 0).
- Added `upgradeSave(V1 | V2) → V2` (v1: `monsterHp = String(max(1, floor))`, `bestIndex = monsterIndex`);
  `serializeSave` upgrades first and keeps fixed key order + sorted item keys + fixed companion key order.
- `parseSave` now returns v2: input `version` ignored, `monsterHp` via `bigField` (T23) with `'0' → '1'`,
  new int fields clamped, `companionsField` drops invalid entries (non-empty string id, `speciesId ∈
  SPECIES_IDS`, integer `bossIndex ≥ 0`, integer `1 ≤ level ≤ 10`, integer `stars ≥ 0`), duplicate ids
  first-wins, truncated to 30; `nextCompanionId` raised to `1 + max(numeric part of ids)`.
- `src/core/engine.ts`: `createEngine(save?: SaveFileV1 | SaveFileV2 | null, rng?)` upgrades internally;
  `toSave(): SaveFile` emits v2 (`String(hp)`); resume reads `Number(save.monsterHp)`. Engine maths stays
  number-based — T25 flips it to bigint.
- `src/core/types.ts`: `GameState` gains `companions/nextCompanionId/souls/rebirths/bestIndex` (carried
  through from the save, no logic). This file is outside the task's Files list but the change is forced by
  the AC/typecheck — `GameState` lives there, not in engine.ts.
- Barrel re-exports `upgradeSave` (value) and `Companion, SaveFile, SaveFileV2` (types);
  `src/renderer/game.ts` `toSave(): SaveFile` (interface + impl, type-only edit).
- Tests: `richSave` is a V2 literal, the DEFAULT_SAVE title is now "…v2 save", `monsterHp: 0 → '1'`,
  `{ monsterHp: 10n }` still defaults; two new cases (v1 migration, companion validation + cap).
  `tests/engine.test.ts` `makeSave()` stays a V1 literal (proves createEngine accepts V1);
  `tests/renderer.test.ts` `stateFixture` is now `{ ...createEngine(null, mulberry32(1)).getState(),
  ...overrides }`. `persistence.ts`, `tests/persistence.test.ts`, `tests/audio.test.ts` untouched.
- `it(` counts: save 9 → 11, engine 16, renderer 51 (unchanged). No test deleted, skipped or weakened.

## Files touched

- src/core/save.ts
- src/core/engine.ts
- src/core/types.ts (forced by typecheck: GameState lives here)
- src/core/index.ts
- src/renderer/game.ts
- tests/save.test.ts
- tests/engine.test.ts
- tests/renderer.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-19.md

## Gate results

```
 Test Files  20 passed (20)
      Tests  312 passed (312)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC (verbatim): exit=0
 Test Files  5 passed (5)
      Tests  113 passed (113)
grep -c token src/core/save.ts → 0 (T38's future AC stays satisfiable)
```

## Attempts & dead ends (what future iterations must NOT retry)

- `companions: Object.freeze<Companion>([]) as Companion[]` in DEFAULT_SAVE → TS2352/TS2345 (the
  `freeze<T>(o: T)` overload wins). Use `Object.freeze([] as Companion[]) as Companion[]`.
- A first draft of the roster-cap test asserted `parseSave({ companions: many })` equals
  `parseSave(serializeSave(capped))` — false: the id-derived `nextCompanionId` (31) differs from the
  explicit 99 in `capped`. Assert the two separately.
- `src/core/types.ts` must import `Companion` from `./save.js` with `import type` (types → save →
  monsters → types is a type-only cycle, erased at compile time; a value import would be a real cycle).
