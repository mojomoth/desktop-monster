# Session record — iter 28

- agent role: builder
- worker: claude
- lane: .worktrees/T27 (branch lane/T27)
- harness version: v2
- task: T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
- result: DONE
- commit: <filled below>
- graphify affected used: none (types.ts / save.ts / monsters.ts / formulas.ts read directly — three small files)

## What I did

- Found that iter 27 had already produced a complete, green implementation at commit `080dc97`
  which was never merged (the iteration crashed before printing its status JSON, so the lane was
  reverted). Ponytail rung 2 — reused it instead of rewriting.
- Restored `src/core/collection.ts` and `tests/collection.test.ts` from `080dc97` and re-added the
  single barrel line `export * from './collection.js';` to `src/core/index.ts` by hand (index.ts has
  moved on since iter 27; the checkout would have clobbered it).
- Reviewed the restored code against the task Notes line by line: constants
  (`COMPANION_MAX_LEVEL = 10`, `ACTIVE_SLOTS = 3`, `ROSTER_CAP = 30`, `REBIRTH_MIN_INDEX = 40`),
  `companionPower = max(1n, monsterMaxHp(bossIndex)/20n) * level * 2n**stars`, `activeCompanions`
  top-3 power desc with the lower-numeric-id tiebreak, the exact `CollectionAction` union, and
  `applyCollection` totality (unknown type/ids → `{ error }`, no input mutation, fresh objects out,
  pvp overflow steal dropped silently, rebirth keeping companions/items/coins/killCount/bestIndex/
  nextCompanionId and adding ⌊index/8⌋ souls).
- `types.ts` is untouched: the `rebirth` / `pvpResolved` shapes live locally as `CollectionEvent`
  for T28 to fold into `GameEvent`.
- Ran the gates line and the AC command literally; both exit 0.

## Files touched

- src/core/collection.ts (new)
- src/core/index.ts (one added line)
- tests/collection.test.ts (new, 10 tests — the 9 AC titles verbatim + a no-mutation/unknown-action check)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-28.md

## Gate results

```
 Test Files  25 passed (25)
      Tests  371 passed (371)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC: npx vitest run tests/collection.test.ts → 10 passed; all 12 grep -q → AC EXIT: 0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT re-derive T27 from scratch: the finished work is in the unmerged commit `080dc97`
  (parent of `df2237d`); its objects are in the shared object store.
- Do NOT `git checkout <sha> -- src/core/index.ts` when recovering a lane commit — index.ts is a
  shared barrel that other landed tasks have edited since; re-apply only the one export line.
- The interactive Claude Code shell aliases `grep` to a ugrep shim which treats the mid-pattern `^`
  in the AC title `times 2^stars` as an anchor, so the AC falsely reports exit 1 there. Run the AC
  under `bash -c` / `/usr/bin/grep` (as the orchestrator and validator do) — it exits 0. The test
  title is correct as written; do not "fix" it.
