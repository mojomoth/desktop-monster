# Session record — iter 20

- agent role: builder
- harness version: v1
- task: T20 — SPEC criteria sweep (F01–F27)
- result: DONE
- commit: fc69ecb

## What I did

- Adopted T20 (the only remaining `[ ]`; deps T01–T19 all `[x]`; no `[~]`
  existed), flipped to `[~]`. Working tree was clean at adoption.
- Wrote a case-per-feature runner script (scratchpad, not committed) with
  every SPEC.md feature-table AC command copied VERBATIM, and executed all
  27, one by one, from the repo root, capturing exit codes and logs.
- ALL 27 ACs exited 0 on the first pass — ZERO fixes needed, no source file
  touched this iteration. Per-feature results:

```
F01 npm ci + gates line ............................ PASS (exit 0)
F02 dual-target build (dist/electron + dist/web) ... PASS
F03 pinned deps (electron/uiohook-napi/vite) ....... PASS
F04 progression formula tests ...................... PASS
F05 monster catalog cycle/tier test ................ PASS
F06 seeded event log + 8–12% crit band ............. PASS
F07 attack/kill event sequence tests ............... PASS
F08 level-up at 20 xp test ......................... PASS
F09 coin formula + 23–27% trinket band ............. PASS
F10 save round-trip + junk-tolerant parse .......... PASS
F11 engine resume from save ........................ PASS
F12 input tests + no uiohook in tests/src/core ..... PASS
F13 guarded global hook greps ...................... PASS
F14 fallback gate attach/detach test ............... PASS
F15 overlay window option greps .................... PASS
F16 accessory lifecycle greps ...................... PASS
F17 preload bridge / IPC security greps ............ PASS
F18 headful smoke → SMOKE_OK ....................... PASS
F19 sprite integrity tests + zero-binary find ...... PASS
F20 FSM timing tests ............................... PASS
F21 headful smoke (scene painted) → SMOKE_OK ....... PASS
F22 atomic persistence greps + save tests .......... PASS
F23 tray menu / PNG-encoder greps .................. PASS
F24 createOscillator grep + no audio files ......... PASS
F25 npm run package → dmg + .app under release/ .... PASS
F26 packaging config safety node check ............. PASS
F27 README operator docs greps ..................... PASS
```

- Noteworthy re-verifications inside the sweep: F01 ran a REAL fresh
  `npm ci` (per iter-19: never `npm ci --dry-run`); F25 rebuilt the dmg from
  scratch with the `@noble/hashes@1.8.0` override in place (electron-builder
  completed, signing skipped, identity null); F18 and F21 each ran their own
  headful smoke, zero interaction.
- Ran T20's own AC line (gates + a third smoke + dmg existence) → exit 0;
  288/288 tests in 18 files, lint 0 warnings, 3 strict tsc projects.
- Flipped T20 `[x]`, appended its Notes bullet and Iteration Log row 20.
  Plan is CONVERGED: no `[ ]`/`[~]`/`[!]` headings remain; only the Manual
  Verification Appendix M1–M8 (out of loop scope) is left for a human.

## Files touched

- IMPLEMENTATION_PLAN.md (status flip, Notes bullet, log row)
- .agentdoc/2026-07-08T09-11-59/sessions/iter-20.md (this file)
- (no src/tests/config changes — sweep found zero gaps)

## Gate results

```
$ npm test && npm run lint && npm run typecheck && npm run smoke > /tmp/desmon-smoke.log 2>&1 \
  && grep -q SMOKE_OK /tmp/desmon-smoke.log && test -f release/DesMon-0.1.0-arm64.dmg
 Test Files  18 passed (18) / Tests  288 passed (288)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
smoke → SMOKE_OK; release/DesMon-0.1.0-arm64.dmg present
T20_AC_EXIT=0   (the gates line is the first three commands of this chain)

Sweep exit codes: F01=0 ... F27=0 (all 27, listed above)
```

## Attempts & dead ends (what future iterations must NOT retry)

- None this iteration — every AC passed on its first literal execution.
  Operational notes confirmed rather than discovered: (1) the iter-19
  `@noble/hashes` override is still required for `npm run package` on host
  Node 20.12.2 — F25 succeeds WITH it, do not remove it; (2) `release/` is
  gitignored, so any future `git clean -fd` deletes the dmg/.app that
  T20's AC and F25 test for — rerun `npm run package` after cleaning;
  (3) three smoke runs back-to-back are fine headfully (no TCC prompts,
  SMOKE=1 never touches globalInput).
