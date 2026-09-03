# Session record — iter 06

- agent role: builder
- worker: claude
- lane: .worktrees/T57 (branch lane/T57)
- harness version: v3
- task: T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
- result: DONE
- commit: 32e9505fcb70579724e6e8fce501991f61583378
- graphify affected used: none (grep over `ACTIVE_SLOTS`/`activeCompanions`/`CollectionAction` was enough — 5 call sites)

## What I did

- `src/core/collection.ts`: deleted `ACTIVE_SLOTS = 3`, added `PARTY_SIZE = 5` (F61).
- `activeCompanions(cs, enemyType?)` now sorts by `effectivePower(companionPower(c), typeOf(c.speciesId), enemyType)`
  desc, ties → higher raw power → lower numeric id, sliced to `PARTY_SIZE`. The
  optional param keeps every existing `activeCompanions(roster)` call site (renderer,
  renderer.test.ts) compiling and raw-power-ordered.
- Added `autoParty(cs)` (= the untyped `activeCompanions`), `pvpParty(cs, ids)` (order kept,
  unknown/duplicate dropped, capped, empty → `autoParty`) and `partyOrder(party)`
  (`sizeOf` desc, stable so ties keep party order). One private `resolveIds` helper backs
  both `pvpParty` and the action, so the drop/cap rule exists once.
- `CollectionAction` += `{ type: 'setPvpParty'; ids: string[] }`, handled by `applyCollection`:
  writes `state.pvpParty` from `resolveIds` (never an error, no event, may be empty).
- `src/core/engine.ts`: the volley now reads `activeCompanions(state.companions, state.monster.type)`
  (F63 pin). Damage stays raw `companionPower(c) * mult` — the type-adjusted damage and the
  `effectiveness` field are T59's.
- Tests: retitled `activeCompanions picks the 3 strongest, ties by id` →
  `… picks the 5 highest effective powers against the enemy type`; added
  `the party changes when the enemy type changes`,
  `pvpParty resolves ids in order and falls back to autoParty when empty`,
  `partyOrder sorts by size descending keeping party order on ties`,
  `setPvpParty drops unknown ids and caps at 5` (collection.test.ts 14 → 18 `it(`s).
- Retitled the engine volley test to `… from the 5 best-matched companions …`; its 4-companion
  roster now fires 4 volleys per tick, so the event list, the `hpAfter` chain and the
  2-volley/carried counts (6→8, 3→4) were recomputed against a water slime (order c2/c1/c4/c3).
- Barrel needed no edit — `export * from './collection.js'` already carries the new symbols.

## Files touched

- src/core/collection.ts
- src/core/engine.ts
- tests/collection.test.ts
- tests/engine.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-06.md

## Gate results

```
$ npm test
 Test Files  32 passed (32)
      Tests  519 passed (519)

$ npm run lint
> eslint . --max-warnings 0        (no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
                                  (no output, exit 0)

$ <T57 AC, run literally>
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT make the volley damage type-adjusted here: F35/F63 want
  `effectivePower(...)` damage plus `companionAttack.effectiveness`, but that is T59.
  T57 only changes WHO fires and in WHICH order; the engine test above is written
  against raw `companionPower` damages (3/4/1/2) and T59 must update those numbers.
- Do NOT drop the `enemyType` parameter's optionality: `src/renderer/game.ts` (3 sites)
  and `tests/renderer.test.ts` (2 sites) still call `activeCompanions(roster)`; T65
  retitles/rewires them.
- `setPvpParty` deliberately does NOT use `pvpParty()` — the action must be able to
  store an empty party, while `pvpParty()` falls back to `autoParty`. They share
  `resolveIds` instead.
