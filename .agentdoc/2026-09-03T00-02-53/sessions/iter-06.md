# Session record — iter 06

- agent role: builder
- worker: claude
- lane: .worktrees/T23 (branch lane/T23)
- harness version: v2
- task: T23 — Core bignum: A–Z suffix format, ratio, bigField
- result: DONE
- commit: 9252e6bc029a7b23979965f0ae166d259920625a
- graphify affected used: none (pure new module, no callers; barrel read directly)

## What I did

- Verified the pick: `IMPLEMENTATION_PLAN.md:191` heading is `[~] T23`, block matches SPEC F28.
- Found the worktree had no implementation (iter-04's merge was reverted on main) and the
  `node_modules` symlink was DANGLING — the main checkout's real `node_modules` had been
  destroyed by the revert of iter-02's merge (which had committed the symlink over it).
- Removed the dangling symlink and ran `npm ci` in the lane, producing a real `node_modules`
  directory that `.gitignore`'s `node_modules/` pattern actually matches.
- Restored the previously verified implementation from the reachable commit `156e60a`
  (ponytail rung 2 — reuse before writing): `src/core/bignum.ts` and `tests/bignum.test.ts`.
- Re-added the named barrel line `export { bigField, format, ratio, suffix } from './bignum.js';`
  to `src/core/index.ts`.
- Re-derived the whole Assumption 20 value table by hand against the code before trusting it:
  999→`999`, 1000→`1.00A`, 12345→`12.3A`, 123456→`123A`, 999999→`999A`, 1e6→`1.00B`,
  1e9→`1.00C`, 10^78→`1.00Z`, 10^81→`1.00AA`, 10^2106→`1.00ZZ`, 10^2109→`1.00AAA`.
- Gates green and the AC command exits 0 (both executed this iteration).
- Committed EXPLICIT PATHS only — never `git add -A` — so the `graphify-out` symlink stays
  out of the commit. This is the third attempt at T23; the first two died in merge on exactly
  this. See "Attempts & dead ends".

## Files touched

- src/core/bignum.ts (new)
- src/core/index.ts (one named re-export line)
- tests/bignum.test.ts (new, 7 tests, AC titles verbatim)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-06.md (this file)

## Gate results

```
 ✓ tests/bignum.test.ts (7 tests) 3ms
 Test Files  20 passed (20)
      Tests  310 passed (310)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- `git add -A` in a lane worktree → MERGE_RED, twice (iter 02 and iter 04). `.gitignore` uses
  trailing-slash patterns (`node_modules/`, `graphify-out/`) which match DIRECTORIES ONLY, so the
  `node_modules` / `graphify-out` SYMLINKS that dispatch creates are NOT ignored. Committing them
  makes the merge replace main's real directories with self-referential symlinks; npm then dies
  ("stdin" error) and gates fail on main. The bignum code was never at fault in either revert.
  iter 04 believed it had fixed this but its commit still carried `graphify-out`
  (`delete mode 120000 graphify-out` in `iter-04.merge.log`).
- Recommendation for the orchestrator (NOT done here — outside this task's `Files:`): drop the
  trailing slashes in `.gitignore` so the patterns match symlinks too, or have dispatch add the
  lane symlinks to `.git/info/exclude`. Until then every lane must commit explicit paths.
- Do not assume the lane's `node_modules` symlink resolves; after a revert of a merge that
  contained it, the main checkout has no `node_modules` at all and `npm ci` in the lane is
  required (the "never reinstall it" lane rule presumes a healthy symlink).
