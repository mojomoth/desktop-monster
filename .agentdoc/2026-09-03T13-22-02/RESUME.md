# RESUME — DesMon v3 harness run (handoff for a new session)

Written 2026-09-04 02:20 KST by the orchestrator session. Read this first,
then `AGENTS.md`, then `.harness/v3/HARNESS.md`.

## Where things stand

| item | state |
|---|---|
| branch | `v3` (integration branch; `main` = v2, git tag `v2` at 36ce280, pushed) |
| harness | `.harness/CURRENT` = `v3`; skills synced into `.claude/skills/` |
| session dir | `.agentdoc/2026-09-03T13-22-02` (`.agentdoc/LATEST` points here) |
| stage 1 (desmon-1-plan) | DONE — SPEC.md F01–F80 (+ assumptions 42–53, Server/API 18 rows, Deployment v3), plan T54–T76 appended; commit eddeb22 |
| stage 2 (desmon-2-dev) | DONE — exit 0, converged after 23 iterations (22 DONE, 1 NOTHING_TO_DO, no failures); `sessions/dev-loop.md`; last loop commit 17839fe + this handoff |
| stage 3 (desmon-3-eval) | **NOT RUN YET** — this is the next step |
| v3 server | `https://desmon-server-v3.onrender.com` (Render service `desmon-server-v3`, built from branch `v3`, shares `desmon-db`, DB expires 2026-10-03); `DEPLOYED_SHA=3aa900a…` (AGENTS.md §Server); v2 server stays at `https://desmon-server.onrender.com` |
| pushes so far | T73/T74 pushed `HEAD:v3` (deploy); `origin/v3` is BEHIND local v3 (the stage-3 push is the sanctioned final push) |
| package version | 0.3.0 (T72); `release/` artifacts are rebuilt by stage 3 |
| working tree | clean after the handoff commit; no `.worktrees/`; kept `lane/*-red-N` / `lane/*-crash-N` branches are v2-run evidence only |

## What v3 built (T54–T76)

Type chart (5-cycle, `src/core/types-chart.ts`), hidden species sizes,
`SaveFileV3.pvpParty`, `PARTY_SIZE = 5` + effective-power party selection,
deterministic `simulateBattle` + `resolvePvp` v3 (attacker-only 15 % steal),
type-adjusted volley, 480×300 field (canvas 240×150, units 1×, party group
overlapping by size, type badge), battle replay scene (`Game.playReplay`),
server `POST /v1/pvp/match` / `POST /v1/pvp` v3 / `GET /v1/thefts` /
`POST /v1/reclaim` + `thefts` column, net client/session v3, IPC v3,
theft watcher + native Notification + reclaim → `addCompanion`, menu window
420×640 with opponent preview / party editor / thefts inbox, version 0.3.0,
Render v3 service + re-verify, packaging, SPEC sweep (F01–F80 all executed).

## How to resume (new session, same machine)

1. `git checkout v3 && git status` (must be clean; `git worktree list` shows only the main checkout).
2. `ls node_modules/.bin/vitest` — if missing, `npm ci` (the v2 run once lost `node_modules` to a lane symlink; `.gitignore` is fixed).
3. Run **stage 3**: invoke the skill `desmon-3-eval` (v3). It spawns the Validator/Packer (cold gates, AC spot-check T54+, SPEC sweep F01–F80, smoke, `npm run package` → `release/DesMon-0.3.0-arm64.dmg`, healthz sha rule against the `v3` HEAD, rgt/graph exports, test integrity, ponytail audit), writes `handoff.md`, finalizes `meta.json`, and makes the session's only `git push origin v3`.
   Suggested prompt: "Run desmon-3-eval for the v3 session .agentdoc/2026-09-03T13-22-02 (branch v3, DESMON_BASE_BRANCH=v3). Stage 2 converged with exit 0 after 23 iterations. Do not ask questions."
4. If the validator says NOT_CONVERGED: run `desmon-2-dev` once more (it resumes from the plan file; export `DESMON_BASE_BRANCH=v3`), then `desmon-3-eval` again (at most one round trip).
5. Merging v3 into `main` is the user's decision (not done by the harness).

## Gotchas learned in this run

- Claude account session limit: `claude -p` (and in-session subagents) can hit HTTP 429 "session limit · resets HH:MM"; the loop grades it CRASHED (×3 → exit 3). Wait for the reset, then re-run the stage (HARNESS §5). Happened twice (v2 run 01:00 KST; v3 Spec Clarifier 13:xx KST).
- Run the loop with stdin from `/dev/null` (`iterate.sh loop </dev/null`) — otherwise npm can fail with "Cannot read properties of undefined (reading 'stdin')".
- Never `git checkout main` on this branch; all pushes are `origin v3` / `HEAD:v3`.
- Screenshots: `screencapture` needs Screen Recording permission for the parent app; Electron `webContents.capturePage` with `app.setAppPath(repo)` works instead (see `/tmp/desmon-shot*.js` pattern in the v2 session notes if still present).
- Manual checks that need a human: Accessibility grant ("Electron" dev / "DesMon" packaged), Gatekeeper "Open Anyway", SPEC M9–M20 (v3: party group, type badge, opponent preview + replay, theft notification + reclaim, expiry, bigger field).

## Evidence map

- `sessions/stage1-plan.md`, `prompts/010-spec-clarifier.md`, `prompts/020-planner.md`, `plans/*.stage1*.md`
- `sessions/dev-loop.md`, `sessions/iter-NN.{log,gates.log,merge.log,rgt.json}`, `graph/`, `sessions/loop-stdout.log`, `sessions/ralph-run.log`
- `IMPLEMENTATION_PLAN.md` Iteration Log rows 49–71 (v3), task Notes per iteration
