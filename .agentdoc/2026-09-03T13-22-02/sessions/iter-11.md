# Session record — iter 11

- agent role: builder
- worker: claude
- lane: .worktrees/T59 (branch lane/T59)
- harness version: v3
- task: T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
- result: DONE
- commit: 4c203553fc553e1306113c0be3742a89e3909672
- graphify affected used: none (grep over src/tests was enough: 3 call sites for `companionAttack`, 1 for `pvpResult` in core)

## What I did

- `src/core/types.ts`: `companionAttack` gains `effectiveness: Effectiveness`
  (imported from `types-chart.js`).
- `src/core/types.ts`: added the structural `WireBlow` / `BattleReplay` copies of
  `src/shared/api.ts` (damage as decimal string) so core keeps importing only core,
  plus `PvpResultAction` (`type/won/stolen/lostId/replay?: BattleReplay`) — the
  field had to be declared here because the AC greps `replay?: BattleReplay` in
  types.ts while `CollectionAction` lives in collection.ts.
- `src/core/collection.ts` (1 line, outside Files — forced by the typecheck gate):
  the inline `pvpResult` union member is now `| PvpResultAction`, so the action
  accepts the optional replay. `applyCollection` is untouched and ignores it.
- `src/core/engine.ts`: the volley now deals
  `effectivePower(companionPower(c), typeOf(c.speciesId), state.monster.type) * mult`
  and stamps `effectiveness(attacker, defender)` on the event. The party is still
  recomputed per volley; the type is read per swing, so a kill chaining inside the
  same volley re-types the remaining members.
- `src/core/index.ts` (outside Files): re-export `BattleReplay`, `WireBlow`,
  `PvpResultAction` from the barrel — T66's Notes require `BattleReplay` from
  `../core/index.js`.
- `tests/engine.test.ts` 27 → 30 `it()`s. New: "volley damage is type-adjusted and
  companionAttack carries effectiveness", "the field party changes when a monster of
  another type spawns" (6 companions, 5 slots — the benched member differs vs water
  and vs wind), "pvpResult with a replay is applied exactly like one without"
  (identical events, state and save).
- Value-only updates to two existing tests (titles unchanged): the F35 volley test's
  damages are now type-adjusted (bat 3→6 super into water, slime 4→2 weak into the
  wind bat that spawns mid-volley; the final hp still lands on 4n), and both fever
  expectations carry `effectiveness: 'normal'` (monster 60 is a water slime, so
  only fever scales that damage — the "never crits" draw assertions are unchanged).

## Files touched

- src/core/types.ts
- src/core/engine.ts
- src/core/collection.ts
- src/core/index.ts
- tests/engine.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-11.md

## Gate results

```
$ npm test
 Test Files  33 passed (33)
      Tests  545 passed (545)

$ npm run lint
> eslint . --max-warnings 0      (no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (exit 0)

$ <T59 AC line, verbatim>
 Test Files  3 passed (3)
      Tests  55 passed (55)
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT try to keep `replay?: BattleReplay` inside collection.ts's inline union:
  the AC greps that literal in `src/core/types.ts`, so the action shape must be a
  named type there. Naming it `PvpResult` also collides with `src/shared/api.ts`'s
  existing `PvpResult` — hence `PvpResultAction`.
- Do NOT sidestep the CollectionAction change with a non-fresh object literal in
  the test (excess-property checks only fire on fresh literals): T68's
  `narrowAction` and T66's renderer both need the field on the real type.
