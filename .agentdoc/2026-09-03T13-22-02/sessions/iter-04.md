# Session record — iter 04

- agent role: builder
- worker: claude
- lane: .worktrees/T56 (branch lane/T56)
- harness version: v3
- task: T56 — SaveFileV3 + pvpParty migration + GameState.pvpParty
- result: DONE
- commit: 426a1fabb0adb8dbaf86c01c7d67462fc38ea6db (work commit; this line added by the follow-up docs commit)
- graphify affected used: none (grep over `SaveFile*`/`parseSave`/`toSave` call sites was cheaper)

## What I did

- `src/core/save.ts`: added `SaveFileV3 extends Omit<SaveFileV2, 'version'> { version: 3; pvpParty: string[] }`,
  `SaveFile = SaveFileV3`, local `PARTY_CAP = 5` (mirrors `ROSTER_CAP`; collection.ts owns the gameplay copy in T57).
- `DEFAULT_SAVE` is v3 with a frozen empty `pvpParty`; `upgradeSave(V1|V2|V3) → V3` (v3 passes through,
  v2 gains `pvpParty: []`, v1 keeps its old rules plus `pvpParty: []`).
- `serializeSave(V1|V2|V3)` writes `version: 3` and `pvpParty` last, still byte-stable.
- `parseSave` gained `pvpPartyField(value, companions)`: strings only, must exist on the parsed roster,
  deduped first-wins (`new Set`), `.slice(0, PARTY_CAP)`, anything else → `[]`.
- `GameState.pvpParty: string[]` (types.ts); `initialState` resumes/copies it, `getState()` and `toSave()`
  hand out copies, `toSave()` writes `version: 3`; `createEngine(save: V1|V2|V3|null, rng)` upgrades first,
  so the `SaveFileV2` fixtures in renderer/collection/engine tests keep compiling unchanged.
- `src/core/index.ts` re-exports the `SaveFileV3` type.
- tests/save.test.ts (11 → 13): new "migrates a v2 save: pvpParty defaults to empty" and
  "pvpParty keeps only ids present in the roster, deduped and capped at 5"; `richSave` is now a v3 save
  with `pvpParty: ['c2']`; the v2 junk/migration tests keep their titles, only the pinned `version` value
  moved 2 → 3 (+ `pvpParty: []` in the v1 migration expectation). The DEFAULT_SAVE title says v3 now
  (it stated the old rule — GAME_DESIGN_V3 §0 test-migration policy).
- tests/engine.test.ts (26 → 27): new "toSave writes version 3 and the pvpParty";
  `save.version` pin 2 → 3 and the one `toEqual(makeSaveV2(...))` on a written save now compares against
  `upgradeSave(makeSaveV2(...))`.
- tests/persistence.test.ts and tests/renderer.test.ts were run, not edited: neither pins `version: 2`
  on a parsed/written save (renderer's `v2` fixture is an INPUT to `createEngine`, and
  `game.toSave()` is compared to `DEFAULT_SAVE`), so no STOP condition was hit.

## Files touched

- src/core/save.ts
- src/core/engine.ts
- src/core/types.ts
- src/core/index.ts
- tests/save.test.ts
- tests/engine.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-04.md

## Gate results

```
$ npm test && npm run lint && npm run typecheck   → exit 0
 Test Files  32 passed (32)
      Tests  509 passed (509)
> eslint . --max-warnings 0            (no output)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

$ AC (npx vitest run tests/save.test.ts tests/engine.test.ts tests/renderer.test.ts tests/persistence.test.ts
     && greps && it-counts)            → AC EXIT: 0
 Test Files  4 passed (4)
      Tests  130 passed (130)
grep -c '^\s*it(' tests/save.test.ts   → 13
grep -c '^\s*it(' tests/engine.test.ts → 27
grep -rn "Date.now(" src/core          → none
```

## Attempts & dead ends (what future iterations must NOT retry)

- Feared `tests/collection.test.ts`'s `createEngine({ ...DEFAULT_SAVE, ...save })` (`Partial<SaveFileV2>`)
  would stop compiling once `DEFAULT_SAVE` is v3 (`version: 2 | 3`). It does NOT — tsc accepts it, so that
  file needed no edit. Do not "fix" it.
- Did not import `PARTY_SIZE` from collection.ts into save.ts: collection.ts imports `Companion` from
  save.ts, so that would be a cycle. save.ts keeps its own `PARTY_CAP = 5` next to `ROSTER_CAP`.
