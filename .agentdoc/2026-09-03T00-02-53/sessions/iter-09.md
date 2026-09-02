# Session record — iter 09

- agent role: builder
- worker: claude
- lane: .worktrees/T23 (branch lane/T23)
- harness version: v2
- task: T23 — Core bignum: A–Z suffix format, ratio, bigField
- result: DONE
- commit: 1244770 (`feat(T23): core bignum module with A-Z suffix format, ratio and bigField`; this line was amended into that same commit, so the final sha is the one in the status JSON)
- graphify affected used: none (pure new module, no callers yet)

## What I did

- Diagnosed the 4x MERGE_RED loop before writing code. `.agentdoc/.../iter-07.gates.log`
  shows the post-merge gates on main failing with `sh: vitest: command not found` —
  the CODE was never at fault in iters 02/04/06/07.
- Root cause chain: `.gitignore` used trailing-slash patterns (`node_modules/`,
  `graphify-out/`) which match DIRECTORIES ONLY. Dispatch symlinks both into each
  lane, so git saw them as untracked symlinks and `git add -A` committed them
  (`create mode 120000` in every revert log). Merging that into main replaced main's
  real `node_modules` with a self-referential symlink; npm then destroyed it.
  Main now has NO `node_modules` at all, so every merge gate fails regardless of diff.
- Fixed the cause instead of tiptoeing around it: dropped the trailing slash on the
  `node_modules` and `graphify-out` patterns so they match symlinks too. `git
  check-ignore -v` now reports both as ignored, and `git add -A` (mandated by the
  harness commit step) is safe again for this and every future lane.
- The lane's own `node_modules` symlink was dangling (main's target is gone), so ran
  `npm ci` inside the worktree only. It exited 0 and materialised a real directory.
- Implemented `src/core/bignum.ts`: `suffix` (bijective base-26 loop),
  `format` (Assumption 20: truncate to 3 significant digits, never round),
  `ratio` (den ≤ 0n → 0, else `Number(num*10000n/den)/10000` clamped to [0,1]),
  `bigField` (JSON trust-boundary coercion).
- `format` routes number input through `BigInt(Math.floor(n))` after the
  finite/negative check, so a double ≥ 1e21 cannot leak `'1e+21'` into `toString()`.
  Negative bigint also returns `'0'` (the spec only names negative *numbers*; the
  edge-case-correct reading, since the digit rule would emit garbage for `-1000`).
- Added the named barrel line to `src/core/index.ts`.
- Wrote `tests/bignum.test.ts` — 7 tests, the five AC titles verbatim, the full value
  table 999 → 10^2109 checked by hand first, plus truncation counter-examples
  (1999 → `1.99A`, not `2.00A`), negative/non-finite, ratio clamping both ends,
  and bigField accept/reject including `10n` and `'007'`.
- Verified the committed tree contains only the 5 intended paths — no symlinks.

## Files touched

- src/core/bignum.ts (new)
- src/core/index.ts (barrel line)
- tests/bignum.test.ts (new)
- .gitignore (gate-forced: see dead ends — this is why 4 merges were reverted)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-09.md (this file)

## Gate results

```
 ✓ tests/bignum.test.ts (7 tests) 2ms
 Test Files  20 passed (20)
      Tests  310 passed (310)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

ALL_GATES_PASS
```

AC command (run literally, whole chain):

```
 ✓ tests/bignum.test.ts (7 tests) 2ms
 Test Files  1 passed (1)
      Tests  7 passed (7)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT re-implement or re-derive `src/core/bignum.ts` again. Iters 02/04/06/07 all
  produced a correct module with green gates and were all reverted. Re-writing the
  math is not the fix and burns an iteration.
- `git add -A` without the `.gitignore` fix → commits the `node_modules` and
  `graphify-out` symlinks. This caused all four MERGE_REDs.
- "Commit explicit paths instead" (iters 04/06/07) → NOT sufficient on its own. It
  keeps the lane's own commit clean but leaves the trap armed for the next lane, and
  iter 06/07 still shipped `graphify-out` (`delete mode 120000 graphify-out` appears
  in both revert logs). Fix `.gitignore`, do not just dodge it.
- OPEN, NOT FIXABLE FROM THIS LANE: main's `node_modules` directory no longer exists
  (destroyed by iter 02's merged self-referential symlink). `iterate.sh` only
  symlinks lanes to it (line 163) and never runs `npm ci` on main, so the post-merge
  gates on main will keep failing with `vitest: command not found` until someone runs
  `npm ci` in the main checkout ONCE. The lane rules put main off limits, so this
  iteration did not touch it — the orchestrator must do it.
