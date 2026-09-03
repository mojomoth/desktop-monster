# Session record — iter 23

- agent role: builder
- worker: claude
- lane: .worktrees/T76 (branch lane/T76)
- harness version: v3
- task: T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)
- result: DONE
- commit: (this commit)
- graphify affected used: none (sweep task; the single fix was a pinned test title)

## What I did

- Verified the pick: `### [~] T76` at IMPLEMENTATION_PLAN.md:661, title identical to the prompt.
- Generated a case-per-row runner in the scratchpad `/tmp/desmon-t76/` (NOT committed, as
  T20/T53 did): a Node generator parses SPEC.md, takes the LAST table cell of every
  `| Fnn |` row and of the `## Server / API` rows, and writes one `ac/<ID>.sh` per row
  holding the AC command VERBATIM. Prose rows (`test … :: "title" exists and passes`)
  become `grep -qF '<title>' <file>` per named title plus `npx vitest run <files>`; the
  `## Deployment` bullet AC is copied verbatim into `ac/DEPLOY.sh`. One prose backtick in
  F80 (`bash -c`, from the parenthetical about the orchestrator) was dropped by hand.
- Executed all 98 cases one by one from the repo root: F01–F80 (80) + S01–S17 (17, the
  `## Server / API` table has 17 data rows, not the 18 the task Notes estimate) + DEPLOY.
- **97/98 exited 0 on the first pass. One gap: F29.**
- F29 gap: `tests/save.test.ts` had renamed the v1/v2-pinned title
  `DEFAULT_SAVE is a fresh-game v2 save` → `… v3 save`. F29's AC greps the v2 literal,
  F60's Behavior says "every v2 junk/migration test keeps its title and values", and the
  rename is NOT in Assumption 53's sanctioned retitle list — so it was an unsanctioned
  rename, not an amended row. Fix = restore the pinned title verbatim (assertions and
  `it(` count untouched: still 13). F29, F60 and F10 all re-run → exit 0.
- Nothing else was touched: no source, no config, no README (the README.md placeholder in
  Files was not needed), no build-filter path — so no SPLIT/redeploy child.
- F01 + the T76 AC ran a REAL cold `npm ci`: the lane's `node_modules` symlink was moved
  aside first so the shared install could never be touched, the cold install carried the
  whole sweep, and the symlink was restored at the end (worktree left exactly as dispatched);
  gates were re-run once more after the restore.
- F25/F58/F79 each ran `npm run package` inside the lane (fresh lane has no `release/`):
  all produced `release/DesMon-0.3.0-arm64.dmg` + `release/mac-arm64/DesMon.app`, the
  packaged binary printed `SMOKE_OK`, and neither `node_modules/pg/*` nor
  `dist/electron/server/*` ships inside the .app.
- Deployment AC ran WITH the network (`DESMON_SKIP_NET` unset, recorded here):
  `/healthz` → `{"ok":true,"sha":"3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2"}` = `DEPLOYED_SHA`
  in AGENTS.md, ancestor of HEAD, no build-filter-path commit after it, and `probe.js`
  registered + read the board (`rank: 5`).

## Sweep record (exit code per row)

```
F01 0  F02 0  F03 0  F04 0  F05 0  F06 0  F07 0  F08 0  F09 0  F10 0
F11 0  F12 0  F13 0  F14 0  F15 0  F16 0  F17 0  F18 0  F19 0  F20 0
F21 0  F22 0  F23 0  F24 0  F25 0  F26 0  F27 0  F28 0  F29 1 → 0 (fixed, see above)
F30 0  F31 0  F32 0  F33 0  F34 0  F35 0  F36 0  F37 0  F38 0  F39 0
F40 0  F41 0  F42 0  F43 0  F44 0  F45 0  F46 0  F47 0  F48 0  F49 0
F50 0  F51 0  F52 0  F53 0  F54 0  F55 0  F56 0  F57 0  F58 0  F59 0
F60 0  F61 0  F62 0  F63 0  F64 0  F65 0  F66 0  F67 0  F68 0  F69 0
F70 0  F71 0  F72 0  F73 0  F74 0  F75 0  F76 0  F77 0  F78 0  F79 0
F80 0

S01 0  S02 0  S03 0  S04 0  S05 0  S06 0  S07 0  S08 0  S09 0
S10 0  S11 0  S12 0  S13 0  S14 0  S15 0  S16 0  S17 0

DEPLOY 0 (network, DESMON_SKIP_NET unset)
```

Feature-id row count: `grep -c '^. F[0-9][0-9] ' SPEC.md` = 80.

## Files touched

- tests/save.test.ts (F29 gap: pinned v2 test title restored; 1 line, `it(` count unchanged)
- .agentdoc/2026-09-03T13-22-02/sessions/iter-23.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  34 passed (34) / Tests  589 passed (589)
 eslint . --max-warnings 0        (no output, exit 0)
 tsc main/renderer/test projects  (exit 0)
 GATES_EXIT=0   (cold install)      GATES2_EXIT=0   (after symlink restore)

$ T76 AC, run literally via bash -c
 npm ci && npm test && npm run lint && npm run typecheck
   && test "$(grep -c '^. F[0-9][0-9] ' SPEC.md)" -eq 80
   && test "$(grep -c '^\s*it(' tests/collection.test.ts)" -ge 21   (= 21)
   && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 78     (= 79)
   && ! grep -rq "ACTIVE_SLOTS" src tests && ! grep -rq "companionSlot" src tests
   && ! grep -q "0.2.0" package.json
 T76_AC_EXIT=0

Sweep exit codes: F01..F80 = 0, S01..S17 = 0, DEPLOY = 0 (98/98 after the F29 fix)
```

## Attempts & dead ends (what future iterations must NOT retry)

- The only gap was F29, and it was NOT a code defect: a pinned v1/v2 test title had been
  renamed by a v3 task without its AC naming the new title. Do NOT "fix" this the other way
  (editing SPEC F29, or deleting/duplicating the test) — Assumption 53 is the exhaustive
  retitle list, and anything not on it keeps its v2 title verbatim.
- Operational notes carried over from T53 and re-confirmed here:
  1. F01's `npm ci` must NOT run with the lane's `node_modules` symlink in place — move the
     symlink aside (`mv node_modules …`), run, then `rm -rf node_modules && mv` it back.
     Deleting it in place risks the shared install every other lane uses. The same applies
     to the T76 AC itself, which also starts with `npm ci`.
  2. `release/` is per-worktree and gitignored: a fresh lane has none, so F25/F58/F79 each
     run `npm run package` themselves (~2 min each); T75's artifacts are not visible here.
  3. F43 overwrites `/tmp/desmon-healthz.json` with the LOCAL `sha=dev` boot response — never
     read that file for the deployed sha after the sweep; re-run the Deployment AC instead.
     (In this run DEPLOY ran last, so the file holds the real deployed sha.)
  4. The `## Server / API` table has 17 data rows; the task Notes' "18" is an estimate, not an
     AC.
  5. Manual appendix M1–M20 stays out of loop scope (human-only).
