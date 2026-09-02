# HARNESS.md — Desktop Monster autonomous development harness (v2)

Operator manual for the parallel-lane Ralph-loop harness. Three stages, each a
project skill:

    plan  → /desmon-1-plan   selftest + Spec Clarifier (AMEND) + Planner (APPEND) → SPEC.md + IMPLEMENTATION_PLAN.md
    dev   → /desmon-2-dev    iterate.sh loop: up to LANES fresh workers in parallel worktrees, one task each
    eval  → /desmon-3-eval   Validator/Packer → verification + packaging + deploy check + handoff

This file restates the loop contract (script names, subcommands, fields, env,
rules); `bash .harness/v2/loop/iterate.sh selftest` is its runnable check.
Tool facts: `reference/TOOLING.md`. Code-style ruleset: `reference/PONYTAIL.md`.

## 1. Loop modes

Both modes run the SAME engine, `bash .harness/v2/loop/iterate.sh loop` (§4);
they differ only in who starts it and who services its two callbacks
(re-plan requests, in-session claude lanes).

- IN-SESSION (primary): an orchestrating Claude Code session runs the three
  skills; /desmon-2-dev starts `iterate.sh loop` with `RUNNER=in-session` via
  Bash `run_in_background: true` and waits for the completion notification.
  Claude lanes are nested `claude -p` subprocesses when `NESTED_CLAUDE=1`;
  with `NESTED_CLAUDE=0` (host probe failed) `dispatch` prints
  `PENDING <id> <prompt-path> <lane-dir>` and the skill spawns an Agent
  subagent per lane with the exact contents of `<prompt-path>` (dispatch
  already appended the rendered `loop/INSESSION_NOTE.md` to it) and writes
  `$S/lanes/<id>.rc` itself; the final verdict comes from `iterate.sh verdict`.
  Codex lanes are unaffected.
- STANDALONE: `bash .harness/v2/loop/ralph.sh [--max-iterations N] [--lanes N] [--version vN]`
  — thin driver: preflight, session dir, `iterate.sh loop`, exit code
  passthrough; re-plan requests are served with `claude -p`. Requires stage 1
  done. Workers run with `--dangerously-skip-permissions` /
  `-s workspace-write`: trusted repo only.

## 2. One-shot kickoff (intended usage)

Paste into a single claude session, then walk away:

> Run the Desktop Monster harness v2 end to end without asking me anything:
> invoke skill desmon-1-plan with the requirements in
> `.agentdoc/<LATEST>/prompts/000-user-original.md` (new session), then
> desmon-2-dev with LANES=3, then desmon-3-eval. Do not stop between stages.
> Whatever exit code the dev loop returns (0–4), still run desmon-3-eval so a
> handoff is written.

## 3. Session directory lifecycle

- /desmon-1-plan (or ralph.sh) creates `.agentdoc/<TS>/` (`prompts/`,
  `sessions/`, `plans/`, `lanes/`, `graph/`; TS `%Y-%m-%dT%H-%M-%S`), writes
  `<TS>` into `.agentdoc/LATEST` (plain file, not a symlink), and fills
  `meta.json` from the template (v2 fields: `lanes`, `codex_cli`, `rgt`,
  `graphify`, `render_cli`, `server_url`, `db_expires`). Stages 2/3 REUSE the
  active session.
- A session ends when `handoff.md` is written. RULE: whichever process ends the
  session writes handoff.md, even on failure (`status: INCOMPLETE`).
- One session ↔ one harness version. Stage 1 ALWAYS opens a new session; never
  change `.harness/CURRENT` inside a running one.
- `lanes/` holds per-lane metadata (`<id>.{iter,worker,pid,started,rc}`,
  `REPLAN-<id>`) and is empty while the loop is idle; `graph/` holds the
  per-collect `GRAPH_REPORT.md` snapshots.

## 4. Parallel lane model (the v2 core)

Scripts under `.harness/v2/loop/`: `plan.mjs` (plan-file toolkit; node ESM,
no deps), `ready-tasks.sh` (wrapper: `plan.mjs ready`), `render.mjs` (prompt
templating), `iterate.sh` (`dispatch | collect <id> | loop | verdict | status | selftest`),
`status.schema.json`, `PROMPT.md`, `CODEX_PROMPT.md`, `INSESSION_NOTE.md`,
`ralph.sh`, `render-bootstrap.sh`, `fixtures/`.

- SINGLE WRITER: the orchestrator (`iterate.sh` through `plan.mjs
  set-status | note | log-row | children`) is the only thing that edits
  IMPLEMENTATION_PLAN.md. Workers report through the status JSON
  (`task, result, gates, commit, note, children`, `status.schema.json`; Codex
  must always send `children` — `[]` unless SPLIT — because the API enforces
  the schema in strict mode; Claude workers may omit it).
  There is NO worker sentinel — convergence is orchestrator-decided.
- READY (`plan.mjs ready`): status `[ ]`, every `Deps:` ID is `[x]`/`[s]`
  (`none` = satisfied; unknown/range tokens = unsatisfied + stderr warning),
  and no `Files:` path overlaps the `Files:` of any `[~]` task. Plan order.
  `Files:` must therefore be COMPLETE (tests included): an omission is a
  merge conflict later.
- DISPATCH fills free lanes up to `LANES` (default 3), skipping workers listed
  in `SKIP_WORKERS`: allocate iteration NN (`$S/sessions/.iter`, 2 digits),
  `set-status <id> ~`, commit `docs(agentdoc): dispatch iter NN <id> (<worker>) [ralph]`,
  create worktree `.worktrees/<id>` on branch `lane/<id>` from `main`,
  symlink `node_modules` (433 MB, never re-installed; `dist/` builds per
  lane) and `graphify-out/` (gitignored; read-only for workers) into it,
  render `PROMPT.md` (claude) or `CODEX_PROMPT.md` (codex) with
  `{{SESSION_DIR}} {{ITER}} {{TASK}} {{TITLE}} {{WORKER}} {{LANE_DIR}}
  {{TASK_BLOCK}} {{OPEN_TASKS}} {{SPEC_ROWS}} {{HV}}` → archive as
  `$S/prompts/100-builder-iter-NN.md` / `110-codex-iter-NN.md`, spawn the
  worker in the background under `gtimeout`, `$S/lanes/<id>.rc` on exit.
  Exact worker commands: TOOLING.md §2/§3 (claude `--output-format json` →
  `iter-NN.claude.json`, status object extracted into `iter-NN.log`; codex
  `--output-schema … -o iter-NN.log`, event stream in `iter-NN.codex.jsonl`).
- WORKER ROUTING: `- Worker: codex` iff every `Files:` path (ignoring SPEC.md,
  IMPLEMENTATION_PLAN.md, .agentdoc/**) is in the graphics set
  (`src/renderer/sprites/**`, `src/renderer/{anim,hud,effects}.ts`,
  `static/{style,menu}.css`, `tests/{sprites,anim,effects,renderer,window}.test.ts`);
  codex ACs use only `npx vitest run`, `grep`, `test -e`, `node -e`; codex
  tasks add no dependencies. The Planner sets the field; the loop never
  re-decides.
- COLLECT `<id>` (one finished lane): parse the status JSON from
  `iter-NN.log`; dirty lane without a worker commit → commit inside the lane
  as `<type>(<id>): <title> [<worker>]` (feat for DONE, docs for
  SPLIT/BLOCKED, chore otherwise);
  `git merge --no-ff lane/<id>` into main (conflict → `git merge --abort`,
  `[ ]`, note `CONFLICT`, branch kept as `lane/<id>-conflict-N`); gates
  `npm test && npm run lint && npm run typecheck` (one retry) →
  `iter-NN.gates.log`; `npm run smoke` ONLY if the merge touched
  `src/main|src/preload|src/renderer|static|package.json` → `iter-NN.smoke.log`;
  red → `git revert --no-edit -m 1 <merge-sha>`, `[ ]`, note `MERGE_RED`;
  green → apply the result (DONE→`x`, SPLIT→`s` + children inserted,
  BLOCKED→streak rule §9, NOTHING_TO_DO→`x` (the worker verified the AC on a
  clean tree; the merge is empty; the validator re-executes the AC in stage
  3), MISMATCH→`[ ]` + note), Notes bullet
  from `note`, log row `| NN | ts | worker | id | result | gates | sha | note≤80 |`,
  `rgt log --json -n 1000` export and `graphify update .` + report snapshot
  (both best effort), commit `docs(agentdoc): collect iter NN <id> (<result>) [ralph]`,
  remove worktree + branch (kept as `lane/<id>-crash-N` / `-conflict-N` /
  `-red-N` for crash/conflict/reverted merges). Prints
  `TASK= ITER= WORKER= RESULT= MERGE= GATES= SMOKE=<pass|fail|skipped> COMMIT= DECISION=<continue|escalate-blocked|escalate-crash>`
  (`converged`/`deadlock`/cap are LOOP verdicts, see exit codes)
  and appends `| iter | worker | task | result | gates | smoke | commit | decision |`
  to `$S/sessions/dev-loop.md`.
- LOOP: service every `$S/lanes/REPLAN-<id>` request, THEN `dispatch`; if no
  lanes are running and READY is empty → `verdict`; sleep 15; `collect` every
  lane whose `.rc` exists; stop dispatching once dispatched iterations ≥
  `MAX_ITER` (default 50) → drain → exit 1. CRASHED ×3 → exit 3 after
  draining. On BLOCKED ×2 `collect` sets the task `[ ]`, archives the
  re-planner prompt (`$S/prompts/12x-replanner-iter-NN.md` =
  `agents/10-planner.md` + "re-scope ONLY task <id>") and writes
  `$S/lanes/REPLAN-<id>` containing that path; the re-scope happens BEFORE
  the retry: the loop services the request at the top of its next pass, before
  any dispatch, when `NESTED_CLAUDE=1` (ralph.sh and the in-session primary
  path: `claude -p` with that prompt, commit `docs(plan): re-scope <id>
  [ralph]`, remove the file); on the fallback path (`NESTED_CLAUDE=0`) the
  desmon-2-dev skill does the same with an Agent subagent before its next
  `dispatch`.
- VERDICT (`iterate.sh verdict`, also what `loop` runs when nothing is running
  or ready): no open tasks → gates + smoke on main → CONVERGED (exit 0), red →
  exit 4; open tasks remain → exit 2 if any `[!]`, exit 1 at the iteration
  cap, else DEADLOCK (exit 4). The fallback skill calls it directly.
- DEAD LANES: a lane whose worker pid is gone without an `.rc` is self-healed
  (treated as rc 999 → CRASHED) at the next `status`/`dispatch`/`loop` pass.
- STRAY CHANGES: before every `dispatch`/`collect`, real uncommitted changes
  on main outside `.agentdoc/` and `.worktrees/` are auto-committed as
  `chore(wip): auto-commit stray changes before <dispatch|collect NN> [ralph]`;
  live lane output under `.agentdoc/` (`lanes/*.pid|.rc`, streaming
  `iter-NN.claude.*|.codex.jsonl`) is never auto-committed — `collect`
  commits it.
- No per-iteration push: `RALPH_PUSH=0` by default; `git push origin main`
  happens only in the loop's deploy task (Notes `push: yes`) and in stage 3.
- Env: `LANES` (3), `MAX_ITER` (50), `CLAUDE_MODEL` (unset → CLI default),
  `CLAUDE_TIMEOUT` (3600), `CODEX_MODEL` (gpt-5.6-sol), `CODEX_TIMEOUT` (2400),
  `RUNNER` (`standalone`|`in-session`), `NESTED_CLAUDE` (probed in stage 1),
  `SKIP_WORKERS` (space-separated workers never dispatched, e.g. `codex` when
  its quota is exhausted), `POLL_SECONDS` (15), `PLAN` (`IMPLEMENTATION_PLAN.md`),
  `RALPH_PUSH` (0).

## 5. Resuming

IMPLEMENTATION_PLAN.md is the memory. Re-run /desmon-2-dev (or ralph.sh):
`dispatch` picks up every ready task. A leftover `[~]` means the LOOP itself
died (a worker cannot leave one — `collect` always resets it): run
`git worktree list`; for each `lane/<id>` worktree either
`bash .harness/v2/loop/iterate.sh collect <id>` (if `$S/lanes/<id>.rc` exists)
or `git worktree remove --force .worktrees/<id>` +
`node .harness/v2/loop/plan.mjs set-status <id> ' '` + `rm -f $S/lanes/<id>.*`
(a stale `.iter` without `.rc` would otherwise occupy a lane forever). A lane
whose worker pid is gone without an `.rc` is self-healed by `iterate.sh`
(treated as rc 999 → CRASHED, branch kept as `lane/<id>-crash-N`). Never
hand-edit status chars. Kept branches `lane/<id>-crash-N` / `lane/<id>-conflict-N` are
evidence; delete them only after reading.

## 6. Exit codes (iterate.sh loop / ralph.sh)

0 = converged (no `[ ]`/`[~]`/`[!]` headings AND gates + smoke green on main,
orchestrator-verified) · 1 = iteration cap (`MAX_ITER`) · 2 = blocked
escalation (BLOCKED ×3 on one task) · 3 = crash escalation (CRASHED ×3 on one
task: no/unparseable status JSON, or rc 124/137 from gtimeout) · 4 = deadlock
(nothing ready, no lanes running, open tasks remain — e.g. only `[!]` left, or
an unknown/range dep token nobody satisfies; also final gates/smoke red on
main). `iterate.sh verdict` returns the same codes (0 / 2 / 1 / 4) without
dispatching; it is how the `NESTED_CLAUDE=0` fallback ends.

## 7. Observability map (`.agentdoc/<TS>/`)

| Artifact | Writer | When |
|---|---|---|
| `prompts/*` (verbatim agent prompts: `0xx`/`9xx` stage prompts, `100-builder-iter-NN.md`, `110-codex-iter-NN.md`, `12x-replanner-iter-NN.md`) | orchestrator / dispatch, BEFORE spawning | every spawn |
| `sessions/iter-NN.md` (rich record: attempts, dead ends) | the worker, inside its worktree (lands on main via the merge) | end of its iteration |
| `sessions/iter-NN.log` (worker's status JSON) | dispatch/collect (claude: extracted from `result`; codex: `-o`) | lane end |
| `sessions/iter-NN.claude.json` / `iter-NN.codex.jsonl` (raw CLI envelope / event stream) | dispatch (redirect) | lane end |
| `sessions/iter-NN.gates.log`, `iter-NN.smoke.log` (independent re-run on main) | collect | after each merge |
| `sessions/iter-NN.rgt.json` (agent-activity export, best effort) | collect | after each merge |
| `graph/iter-NN.GRAPH_REPORT.md` (graphify snapshot, best effort) | collect | after each merge |
| `sessions/.iter`, `sessions/.streak` (`<id> <KIND> <count>`) | dispatch / collect | loop state |
| `lanes/<id>.{iter,worker,pid,started,rc}`, `lanes/REPLAN-<id>` | dispatch / worker exit / loop | while a lane runs |
| `sessions/dev-loop.md` (`\| iter \| worker \| task \| result \| gates \| smoke \| commit \| decision \|`) | collect | one row per collect |
| `sessions/stage1-plan.md`, `stage3-eval.md` | stage agents (+ orchestrator notes) | stage end |
| `plans/*` (immutable snapshots incl. plan-mode plans, stage-1 base + result) | orchestrator (`cp`) | stage 1 |
| `meta.json`, `../LATEST` | orchestrator | session start / end |
| `handoff.md` | validator (orchestrator fallback on crash) | session end, ALWAYS |

Local caches outside the session dir, all gitignored: `.regent/` (rgt store),
`graphify-out/` (graph), `.worktrees/` (live lanes).

## 8. Trust-but-verify rules (non-negotiable)

- Gates + conditional smoke run on MAIN after EVERY merge, by `collect`,
  regardless of what the worker's JSON claims (`gates: pass` is data, not
  evidence); red → the merge is reverted and the task returns to `[ ]`.
- No worker sentinel exists. Convergence is the loop's own check: no open
  headings AND gates + smoke green on main. Nothing a worker prints can end
  the loop.
- Workers cannot flip status chars: they never edit the plan file; `collect`
  applies DONE/SPLIT/BLOCKED after its own verification.
- The validator cold-installs (`rm -rf node_modules && npm ci`), re-executes
  task ACs and SPEC ACs literally, flips false `[x]` claims back to `[ ]`,
  verifies the deployment (`/healthz` ok AND
  `git merge-base --is-ancestor <sha> HEAD` AND
  `git log <sha>..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version`
  empty — no equality check against any particular commit),
  audits test integrity (`it(` counts vs session base + `rgt blame`) and runs
  the ponytail audit + dependency check (§11).

## 9. Escalation policy (streaks in `$S/sessions/.streak`)

BLOCKED means environmental impossibility (permissions, network, toolchain)
after ≥3 different attempts — never mere errors. Per task: BLOCKED ×1 → back
to `[ ]` (fresh eyes retry); ×2 → `[ ]` + REPLAN request; the re-planner (§4
REPLAN) re-scopes ONLY that task before the retry is dispatched (re-scope
happens before the retry); ×3 → `[!]` stays; when nothing else is ready →
exit 2. CRASHED ×1..2 → `[ ]` + note, branch kept as `lane/<id>-crash-N`; ×3
→ exit 3. NOTHING_TO_DO → `[x]` + note, no streak (the worker verified the AC
on a clean tree; the validator re-executes it).
CONFLICT / MERGE_RED / MISMATCH → `[ ]` + note, no streak (the next dispatch
starts from the newer main; branches kept as `lane/<id>-conflict-N` /
`lane/<id>-red-N` for inspection). A human reads the task's Notes, the latest
`iter-NN.md` and the raw CLI output before resuming.

## 10. Skill sync rule

Canonical skills live in `.harness/v2/skills/`. Install with:
`cp -R .harness/v2/skills/. .claude/skills/`. Never hand-edit `.claude/skills/`
(`rgt init --skip-skills` and no `graphify claude install` keep it a mirror).

## 11. Tooling

- **rgt (re_gent)** — agent-activity VCS. Hooks are committed in
  `.claude/settings.json` / `.codex/config.toml` so every lane is captured;
  `collect` exports `rgt log --json -n 1000` per iteration, stage 3 exports
  `rgt sessions` + `rgt log --json -n 5000` and runs `rgt blame` on any test
  file whose `it(` count dropped. Best effort: never an AC. TOOLING.md §4.
- **graphify** — offline code graph. `graphify update .` (tree-sitter only;
  never `--no-viz`) runs before the Planner and in every `collect`; the
  Planner fills `Files:`/`Deps:` with `graphify affected "<symbol>" --depth 2`,
  workers orient with `graphify query` / `affected`. `graphify-out/` is a
  gitignored cache; the audit artifact is `graph/iter-NN.GRAPH_REPORT.md`.
  No hook/claude/codex installs. TOOLING.md §5.
- **ponytail** — the lazy-senior-dev ruleset, vendored verbatim in
  `reference/PONYTAIL.md` (MIT). Binds both workers via AGENTS.md §Code style;
  vitest is the "one runnable check"; a new dependency needs a Notes line
  naming the rung (pre-approved: `pg`). Stage 3 writes the review/audit in
  the one-line format (`net: -N lines possible.` / `Lean already. Ship.`).
- **render** — hosting. `loop/render-bootstrap.sh` provisions `desmon-db`
  (free Postgres, EXPIRES 30 days after creation → `db_expires`) and
  `desmon-server` (free web service, sleeps after 15 min idle) idempotently
  by name and prints `SERVER_URL`; run ONLY by the loop's deploy task, never
  by a harness bump. Deploy = push + `render deploys create <srv> --wait`.
  `DESMON_SKIP_NET=1` makes stage-3 reruns hermetic. TOOLING.md §6, PONYTAIL.md.
- **codex** — graphics worker (`codex exec -C <lane> -s workspace-write …
  --output-schema status.schema.json`, model `CODEX_MODEL`, reasoning high, no
  MCP). The sandbox blocks network / Electron / `.git` writes → it never
  commits (the orchestrator commits `[codex]`), never runs smoke (`collect`
  does), proof = vitest. TOOLING.md §3.

## 11b. Dry run (test the loop without touching this repo)

Clone the repo to a throwaway dir, copy the working tree over it, symlink
`node_modules`, append one trivial `[ ]` task per worker (e.g. a codex task that
adds a CSS comment, a claude task that adds a one-line vitest test), create a
session dir, then run the loop there:

    D=/tmp/desmon-dryrun; rm -rf $D; git clone -q . $D
    rsync -a --exclude node_modules --exclude .git --exclude dist --exclude release --exclude .worktrees --exclude graphify-out --exclude .regent ./ $D/
    cd $D && ln -s "$OLDPWD/node_modules" node_modules && git add -A && git commit -qm wip
    TS=dryrun-$(date +%H%M%S); mkdir -p .agentdoc/$TS/{prompts,sessions,plans,lanes,graph}; echo $TS > .agentdoc/LATEST
    # append the dummy tasks to IMPLEMENTATION_PLAN.md above "## Iteration Log", commit, then:
    RUNNER=standalone NESTED_CLAUDE=1 LANES=2 MAX_ITER=2 POLL_SECONDS=10 bash .harness/v2/loop/iterate.sh loop

Read `.agentdoc/$TS/sessions/dev-loop.md`, the merge/gates/smoke logs and
`git log`. Expect `DONE` rows, `SMOKE=pass` when `static/` or `src/main`
changed, kept branches only for CRASHED/CONFLICT/MERGE_RED. Costs about
$0.50 per Claude lane and one short Codex run. (gitignore note: `node_modules/`
does not ignore a SYMLINK, so the clone tracks it — harmless there.)

## 12. Versioning (v2 → v3)

Bump on ANY behavior-relevant change: `agents/*.md`, `loop/*` (scripts,
prompts, schema, fixtures), templates, the gate command, AGENTS.md §Commands
script names, plan grammar, status JSON, escalation thresholds, exit codes,
skill flow, lane/merge policy. Typo-level fixes that cannot change agent
behavior may be edited in place with a CHANGELOG entry.

v1 is FROZEN (its `.agentdoc` sessions must stay re-readable against the exact
prompts that produced them); v2 freezes the moment its first `dispatch` runs.
Mechanics: `cp -R .harness/v2 .harness/v3` → edit v3 → CHANGELOG entry →
`bash .harness/v3/loop/iterate.sh selftest` → `printf v3 > .harness/CURRENT`
→ re-sync skills (§10) → commit `chore(harness): bump to v3 — <reason>`.
`meta.json.harness_version` records which version each session used; a
mid-project bump starts a NEW session dir (stage 1 always does).
