# Session record — iter 02

- agent role: builder
- worker: claude
- lane: .worktrees/T55 (branch lane/T55)
- harness version: v3
- task: T55 — Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type
- result: DONE
- commit: 7955eb26a3f7f6c1b6d7514a27aa25744669cf1d
- graphify affected used: none (grepped MonsterDef / `tier:` / `speciesId:` directly — only `monsterForIndex` builds a `MonsterDef`, so no literal in tests needed a `type` field)

## What I did

- New pure `src/core/types-chart.ts`: `MonsterType`, `TYPE_ORDER` (fire → wind → earth → water → dark), `Effectiveness`, `SUPER = 2n`, `WEAK_DIV = 2n`, `beats(a, d)` = `((idx(d) - idx(a) + 5) % 5) ∈ {1, 2}`, `effectiveness(a, d)` (same type → normal), `effectivePower(power, a, d)`. No lookup table — the whole 5×5 chart is derived from the cycle (ponytail: rung 6/7).
- `src/core/monsters.ts`: `SPECIES_TYPE` (slime water, bat wind, ghost dark, golem earth, dragon fire), `SPECIES_SIZE` (slime 1, bat 1, ghost 2, golem 3, dragon 3 — hidden), `typeOf(speciesId)` (unknown → `'water'`), `sizeOf(speciesId)` (unknown → 1). `monsterForIndex` now fills `type: SPECIES_TYPE[speciesId]`; bosses keep the species type. Catalog order, `BOSS_EVERY` and all HP/XP/coin formulas untouched.
- `src/core/types.ts`: `MonsterDef.type: MonsterType`.
- `src/core/index.ts`: `export * from './types-chart.js'` + `sizeOf`/`SPECIES_SIZE`/`SPECIES_TYPE`/`typeOf` on the monsters line, so renderer/sprites/hud can import them from `../core/index.js`.
- New `tests/typeChart.test.ts` (4 `it(`): the cycle rule in both directions, all 25 cells pinned against a literal chart with a 10/10/5 tally, antisymmetry, and `effectivePower` (×2 super, floored ÷2 weak with a floor of 1 at power 0/1/2, exact at 10^40).
- `tests/formulas.test.ts` 12 → 13 `it(`: "each species has a fixed type and a hidden size" (both maps pinned, 5 distinct types, catalog + boss type, unknown species fall back without throwing). No existing `it(` renamed or removed.

## Files touched

- src/core/types-chart.ts (new)
- src/core/monsters.ts
- src/core/types.ts
- src/core/index.ts
- tests/typeChart.test.ts (new)
- tests/formulas.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-02.md

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  32 passed (32)
      Tests  506 passed (506)
> desmon@0.2.0 lint
> eslint . --max-warnings 0
> desmon@0.2.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

$ <T55 AC line, verbatim>
 ✓ tests/typeChart.test.ts (4 tests)
 ✓ tests/formulas.test.ts (13 tests)
AC EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- No dead ends: gates and AC were green on the first run. Notes for later lanes:
  - `MonsterType`/`TYPE_ORDER` live in `types-chart.ts` (per the task Notes and SPEC F59), NOT in `monsters.ts` as GAME_DESIGN_V3 §1's snippet shows; `monsters.ts` and `types.ts` both import the type from there. Do not move them — `types.ts` importing `monsters.ts` would create a cycle.
  - Do not hand-write a 5×5 chart table in `src/core`; it is derived. The literal table exists only in `tests/typeChart.test.ts`, where it is the pin.
  - No test anywhere builds a `MonsterDef` literal (only `monsterForIndex` does), so adding the required `type` field broke nothing.
