---
name: desmon-2-dev
description: Stage 2 of the Desktop Monster harness (v3, integration branch v3) — the parallel-lane Ralph loop. Runs `iterate.sh loop` in the background; it dispatches up to LANES ready tasks into git worktrees (a fresh `claude -p` builder or `codex exec` graphics worker per task), merges each finished lane into the integration branch (v3), re-runs gates (+ smoke when needed) and is the plan file's single writer. The orchestrator only waits, services re-plan requests and (fallback) in-session claude lanes, then hands off to desmon-3-eval on ANY exit code. Requires SPEC.md and IMPLEMENTATION_PLAN.md (run desmon-1-plan first).
---

# desmon-2-dev — Parallel Ralph loop stage (v3)

You are the ORCHESTRATOR. You never implement game code, never run gates or
smoke by hand (`collect` did — its logs are the evidence), never edit
IMPLEMENTATION_PLAN.md (`plan.mjs` inside the loop is its single writer),
never merge, never push. Every worker is a fresh process/subagent in its own
worktree; the repo files are the only shared state.

## Setup

`HV=$(cat .harness/CURRENT)`; `TS=$(cat .agentdoc/LATEST)`; `S=.agentdoc/$TS`.
`git branch --show-current` must print `v3`; every `iterate.sh` call below carries `DESMON_BASE_BRANCH=v3` (also `bash .harness/$HV/loop/iterate.sh status`).
Abort with a clear message if SPEC.md, IMPLEMENTATION_PLAN.md or `$S/meta.json`
is missing, or `meta.json.harness_version` ≠ `$HV` (one session ↔ one
version: run desmon-1-plan first).
`MAX_ITER` = user value or 50; `LANES` = user value or 3; pass `CLAUDE_MODEL`,
`CODEX_MODEL`, `CLAUDE_TIMEOUT`, `CODEX_TIMEOUT` only if the user set them.
`NESTED_CLAUDE` = the `NESTED_CLAUDE=` line in `$S/sessions/stage1-plan.md`
(else `.harness/$HV/reference/TOOLING.md §7`; else probe now, with the same
nine-variable `env -u` list `iterate.sh` uses:
`env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_BRIDGE_SESSION_ID -u CLAUDE_PID -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PLUGIN_DATA claude -p 'Reply with exactly PROBE_OK' --output-format text`).
`git worktree list` must show no `lane/` worktrees left by a crashed run;
if it does, follow HARNESS.md §5 first (collect, or remove + `set-status ' '`
+ `rm -f $S/lanes/<id>.*` so no stale `.iter` occupies a lane). A lane whose
worker pid is gone without an `.rc` is self-healed by `iterate.sh` (treated as
rc 999 → CRASHED at the next `status`/`dispatch`/`loop` pass).

## A. Primary path (NESTED_CLAUDE=1)

1. Start the loop via the Bash tool with `run_in_background: true`:
   ```
   DESMON_BASE_BRANCH=v3 RUNNER=in-session NESTED_CLAUDE=1 LANES=$LANES MAX_ITER=$MAX_ITER \
     bash .harness/$HV/loop/iterate.sh loop </dev/null; echo "LOOP_EXIT=$?"
   ```
   (add the model/timeout vars on the same line if set). It repeats
   `dispatch` → sleep 15 → `collect <id>` for every lane whose `.rc` exists,
   until converged, capped, blocked, crashed or deadlocked; every collect
   commits plan + logs and appends a row to `$S/sessions/dev-loop.md`.
2. WAIT for the completion notification. Never `sleep`-poll in the
   foreground. `bash .harness/$HV/loop/iterate.sh status` is the only
   progress probe (read-only); use it at most once per notification.
3. RE-PLAN requests (BLOCKED ×2 on a task) are serviced by the loop itself on
   this path: `collect` archives `$S/prompts/12x-replanner-iter-NN.md`
   (`agents/10-planner.md` + "re-scope ONLY task <id>"), the loop runs
   `claude -p` with it, commits `docs(plan): re-scope <id> [ralph]` and
   removes `$S/lanes/REPLAN-<id>`. You do nothing; the re-planner is the
   ONLY agent besides `plan.mjs` that edits IMPLEMENTATION_PLAN.md, and only
   that task's block/children.
4. On completion read `LOOP_EXIT` and `$S/sessions/dev-loop.md`
   (`| iter | worker | task | result | gates | smoke | commit | decision |`).

## B. Fallback path (NESTED_CLAUDE=0) — you drive the same contract

`dispatch` will not spawn claude lanes; it prints
`PENDING <id> <prompt-path> <lane-dir>` for each (codex lanes are spawned
normally and are unaffected). Run the loop body yourself:
1. Foreground: `DESMON_BASE_BRANCH=v3 RUNNER=in-session NESTED_CLAUDE=0 LANES=$LANES bash .harness/$HV/loop/iterate.sh dispatch`;
   parse the `PENDING` lines.
2. For EVERY PENDING line, in ONE message, spawn a fresh general-purpose
   subagent whose prompt is the exact contents of `<prompt-path>` (dispatch
   already appended the rendered `INSESSION_NOTE.md` to it — it tells the
   subagent its working directory is `<lane-dir>` and to end with the status
   JSON on the first line; do NOT append the note again). No other context.
   When it returns: write its final message verbatim to
   `$S/sessions/iter-NN.log` (NN = `cat $S/lanes/<id>.iter`), then
   `echo 0 > $S/lanes/<id>.rc` (the Agent tool has no exit code; a missing or
   unparseable JSON is what `collect` grades as CRASHED).
3. Codex lanes: wait for `$S/lanes/<id>.rc` with a background Bash
   `until [ -f "$S/lanes/<id>.rc" ]; do sleep 15; done`
   (`run_in_background: true`, wait for its notification).
4. For each lane whose `.rc` exists:
   `bash .harness/$HV/loop/iterate.sh collect <id>` (foreground; it merges,
   verifies, records, cleans up). Read its `DECISION=`: `escalate-crash` →
   drain running lanes, then stop as exit 3; `escalate-blocked` → the task is
   now `[!]` (informational; exit 2 comes from step 6 when nothing else is
   dispatchable). A `$S/lanes/REPLAN-<id>` file (content = path of the
   archived re-planner prompt) → spawn a fresh general-purpose subagent with
   that prompt's exact contents, wait for it, commit
   `git add IMPLEMENTATION_PLAN.md $S && git commit -m "docs(plan): re-scope <id> [ralph]"`
   (the re-planner writes its record to `$S/sessions/replan-<id>.md` and does
   not commit), then `rm "$S/lanes/REPLAN-<id>"` BEFORE the next `dispatch`
   — the re-scope happens before the retry, never after it.
5. Repeat from 1 while `cat $S/sessions/.iter` < `MAX_ITER`; at the cap stop
   dispatching, drain running lanes (3–4), then treat the outcome as exit 1.
6. When `dispatch` prints an empty `READY=` and `status` lists no lanes, run
   `DESMON_BASE_BRANCH=v3 RUNNER=in-session NESTED_CLAUDE=0 bash .harness/$HV/loop/iterate.sh verdict`
   ONCE in the foreground — the final verdict only, no dispatch: no open
   tasks → gates + smoke on `v3` → exit 0 (converged; exit 4 if red);
   otherwise exit 2 if any `[!]` task remains, exit 1 at the iteration cap,
   exit 4 (deadlock) otherwise. That exit code is `LOOP_EXIT`. (`iterate.sh
   loop` refuses `NESTED_CLAUDE=0` with exit 64 — never call it on this path.)

## Exit

Exit codes: 0 converged (no open tasks; gates + smoke green on `v3`) ·
1 iteration cap (`MAX_ITER` dispatched) · 2 blocked escalation (BLOCKED ×3 on
one task) · 3 crash escalation (CRASHED ×3 on one task) · 4 deadlock (nothing
ready, no lanes, open tasks remain — e.g. only `[!]` left).
- Append below the table in `$S/sessions/dev-loop.md`:
  `outcome: exit <N> (<meaning>), iterations <n>, lanes <LANES>, nested_claude <0|1>`.
- `git worktree list` must show no `lane/` worktrees (kept branches
  `lane/<id>-crash-N` / `-conflict-N` / `-red-N` are evidence — leave them).
- `git add -A .agentdoc && git commit -m "docs(agentdoc): stage-2 dev loop exit <N> [harness $HV]"`.
- Report exit code + meaning, iterations used, tasks done/split/blocked, and
  proceed to desmon-3-eval on ANY exit code — it writes the handoff
  (INCOMPLETE when needed). Never leave the session without stage 3 running.
