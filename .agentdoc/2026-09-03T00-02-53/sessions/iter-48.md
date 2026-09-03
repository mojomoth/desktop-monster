# Session record — iter 48

- agent role: builder
- worker: claude
- lane: .worktrees/T53 (branch lane/T53)
- harness version: v2
- task: T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)
- result: DONE
- commit: <this commit>
- graphify affected used: none (sweep task — no source symbol was changed)

## What I did

- Verified the pick: `### [~] T53` at IMPLEMENTATION_PLAN.md:477, title identical.
- Generated a case-per-feature runner (scratchpad `/tmp/desmon-t53/`, not committed,
  like T20's): a small Node generator parses SPEC.md, takes the LAST table cell of
  every `| Fnn |` row and of the 10 `## Server / API` rows, and writes one
  `ac/<ID>.sh` per row holding the AC command VERBATIM. Prose rows
  (`test … :: "title" exists and passes`) become `grep -qF '<title>' <file>` for
  every named title plus `npx vitest run <files>`; the `## Deployment` bullet AC is
  copied verbatim into `ac/DEPLOY.sh`.
- Executed all 69 cases one by one from the repo root (F01–F58 + S01–S10 + DEPLOY).
  **All 69 exited 0 — zero gaps, no fix needed, no source file touched.**
- Deployment AC ran WITH the network (no `DESMON_SKIP_NET`): `/healthz` →
  `{"ok":true,"sha":"7a81b346439d8a6d9fe3fe1d0fadd8cbd40e4f4c"}` = `DEPLOYED_SHA`
  in AGENTS.md, ancestor of HEAD, no build-filter-path commit after it, and
  `probe.js` registered + read the board (`rank: 1`). Re-run once at the end of the
  iteration → exit 0 again.
- F01 ran a REAL cold `npm ci` (never `--dry-run`): the lane's `node_modules`
  symlink was moved aside first so the shared install could not be touched, the
  cold install then carried the whole sweep, and the symlink was restored at the
  end (worktree left exactly as dispatched).
- F25/F58 ran `npm run package` inside the lane (this worktree had no `release/`):
  both produced `release/DesMon-0.2.0-arm64.dmg` + `release/mac-arm64/DesMon.app`,
  the packaged binary printed `SMOKE_OK`, and no `node_modules/pg/*` ships inside
  the .app.
- Per-row result table below; then gates + T53's own AC.

```
F01 npm ci + gates (cold install) ................. PASS   F30 bigint cutover ............. PASS
F02 dual-target build ............................. PASS   F31 bosses ..................... PASS
F03 pinned dependency matrix ...................... PASS   F32 collection ops ............. PASS
F04 progression formulas .......................... PASS   F33 capture / engine.apply ..... PASS
F05 monster catalog cycle ......................... PASS   F34 fever ...................... PASS
F06 seeded log + crit band ........................ PASS   F35 companion volleys .......... PASS
F07 attack/kill event order ....................... PASS   F36 renderer v2 + smoke ........ PASS
F08 level-up at 20 xp ............................. PASS   F37 resolvePvp ................. PASS
F09 coins + trinket band .......................... PASS   F38 3x5 font A–Z ............... PASS
F10 save round-trip / junk ........................ PASS   F39 effect presets ............. PASS
F11 engine resume ................................. PASS   F40 boss/companion sprites ..... PASS
F12 input tests + no uiohook ...................... PASS   F41 fever aura + banners ....... PASS
F13 guarded global hook ........................... PASS   F42 menu.css ................... PASS
F14 fallback gate ................................. PASS   F43 server scaffold + boot ..... PASS
F15 overlay window options ........................ PASS   F44 app routes ................. PASS
F16 accessory lifecycle ........................... PASS   F45 pvp routes ................. PASS
F17 preload / IPC security ........................ PASS   F46 PgStore + pg.d.ts .......... PASS
F18 headful smoke ................................. PASS   F47 identity + wire types ...... PASS
F19 sprite integrity + zero binaries .............. PASS   F48 net client ................. PASS
F20 FSM timing .................................... PASS   F49 net IPC + smoke ............ PASS
F21 headful smoke (scene painted) ................. PASS   F50 deploy wiring .............. PASS
F22 atomic persistence ............................ PASS   F51 menu IPC relay ............. PASS
F23 tray menu v0.2.0 .............................. PASS   F52 menu window + smoke ........ PASS
F24 audio blips ................................... PASS   F53 game hook-up + smoke ....... PASS
F25 npm run package (dmg + .app) .................. PASS   F54 menu roster page ........... PASS
F26 packaging config safety ....................... PASS   F55 ranking/battle page ........ PASS
F27 README operator docs .......................... PASS   F56 deploy re-verify (git side)  PASS
F28 bignum A–Z .................................... PASS   F57 version 0.2.0 + docs ....... PASS
F29 save v2 ....................................... PASS   F58 packaged 0.2.0 smoke ....... PASS

S01 /healthz .......... PASS   S06 pvp cooldown ..... PASS
S02 /v1/players ....... PASS   S07 rate limit ....... PASS
S03 /v1/snapshot ...... PASS   S08 body cap ......... PASS
S04 /v1/leaderboard ... PASS   S09 unauthorized ..... PASS
S05 /v1/pvp ........... PASS   S10 404 / 500 ........ PASS

DEPLOYMENT (network, DESMON_SKIP_NET unset) ....... PASS (twice)
```

## Files touched

- .agentdoc/2026-09-03T00-02-53/sessions/iter-48.md (this file)
- (no src/tests/config/README change — the sweep found zero gaps, so the ≤5-file
  fix budget and the build-filter-path hard rule never came into play)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  31 passed (31) / Tests  501 passed (501)
 eslint . --max-warnings 0        (no output, exit 0)
 tsc main/renderer/test projects  (exit 0)

$ npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
 SMOKE_OK

$ S=$(sed -n 's/^DEPLOYED_SHA=//p' AGENTS.md) && git merge-base --is-ancestor "$S" HEAD \
  && test -z "$(git log "$S"..HEAD -- src/server src/core src/shared package.json \
     package-lock.json tsconfig.main.json .node-version)"
 S=7a81b346439d8a6d9fe3fe1d0fadd8cbd40e4f4c   ancestor: yes   filter-path log: empty

T53_AC_EXIT=0
Sweep exit codes: F01..F58 = 0, S01..S10 = 0, DEPLOY = 0 (69/69)
```

## Attempts & dead ends (what future iterations must NOT retry)

- No AC failed, so nothing was fixed and nothing was split. Operational notes worth
  keeping:
  1. F01's `npm ci` must NOT be run with the lane's `node_modules` symlink in place —
     move the symlink aside first (`mv node_modules …`), run the AC, then restore it.
     Deleting it in place risks the shared install every other lane uses.
  2. `release/` is per-worktree and gitignored: a fresh lane has none, so F25/F58 must
     run `npm run package` themselves (~2 min each) — T52's artifacts are not visible here.
  3. F43 overwrites `/tmp/desmon-healthz.json` with the LOCAL `sha=dev` boot response,
     so never read that file for the deployment sha after the sweep — re-run the
     Deployment AC instead.
  4. The Render free-tier dyno resets bare `curl` connections while it is asleep
     (`curl: (35) Recv failure`); the Deployment AC's own `--retry 5 --retry-delay 30
     --max-time 90` rides it out and passed both times. A bare one-shot curl is not
     evidence of a deploy problem.
  5. Manual appendix M1–M14 stays out of loop scope (human-only).
