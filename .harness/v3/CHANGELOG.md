# Harness changelog

- v1 (2026-07-08): initial harness — 4 agent prompts (spec-clarifier, planner,
  builder, validator-packer), 3 skills (desmon-1-plan / desmon-2-dev /
  desmon-3-eval), Ralph loop (loop/PROMPT.md + loop/ralph.sh), gates =
  `npm test && npm run lint && npm run typecheck`, sentinel
  `<promise>DONE</promise>`, max-iterations default 25.
- v1 (2026-07-08, pre-freeze addition before first loop iteration): added loop/INSESSION_NOTE.md — structured-output adaptation of the section-8 status block for the in-session runner. Same sentinel semantics.
- v2 (2026-09-02): parallel-lane loop, codex graphics worker, server/deploy,
  observability, ponytail. Every behavior-relevant change:
  - Loop engine: `loop/iterate.sh {dispatch|collect <id>|loop|verdict|status|selftest}`
    shared by both runners (`ralph.sh` is a thin driver with `--lanes`; the
    in-session skill runs `iterate.sh loop` in the background). Up to `LANES`
    (3) tasks run in parallel, each in a git worktree `.worktrees/<id>` on
    branch `lane/<id>` (node_modules symlinked), merged with
    `git merge --no-ff`; gates re-run on main after every merge, `npm run smoke`
    only when the merge touched src/main|src/preload|src/renderer|static|
    package.json; red → merge reverted, task back to `[ ]`. Convergence is
    verified on main by the loop itself (gates + smoke), never by a worker.
  - Plan single writer: `loop/plan.mjs` (`ready|block|open|set-status|note|
    log-row|children`; `ready-tasks.sh` wraps `ready`) — workers never edit
    IMPLEMENTATION_PLAN.md; they return the status JSON
    (`task, result, gates, commit, note[, children]`, `loop/status.schema.json`).
    SPLIT children arrive as JSON and are inserted by the orchestrator.
    `ready` excludes tasks whose `Files:` overlap an in-progress `[~]` task.
  - Sentinel removed: no `<promise>DONE</promise>`, no `sentinel`/`remaining`
    fields, no FALSE_SENTINEL path; `INSESSION_NOTE.md` is now only appended
    on the `NESTED_CLAUDE=0` fallback.
  - Plan grammar v2: `plan-format: v2` header; mandatory `- Worker: claude|codex`
    (codex iff every Files path is in the graphics set; codex ACs limited to
    `npx vitest run`/`grep`/`test -e`/`node -e`; codex tasks add no deps);
    `Deps:` = `none` or comma-separated IDs (no ranges); `Files:` must be
    complete incl. tests; Iteration Log gains a `worker` column; brownfield:
    T01–T21 and their log rows immutable, new tasks appended as T22+.
  - Codex graphics worker: new charter `agents/25-gfx-worker.md` +
    `loop/CODEX_PROMPT.md`; `codex exec -C <lane> -s workspace-write …
    --output-schema` (model `CODEX_MODEL`, reasoning high, no MCP); never
    commits (orchestrator commits `<type>(TNN): <title> [codex]`), never runs
    Electron/network/npm install.
  - Prompt diet: `loop/render.mjs` injects `{{TASK_BLOCK}}`, `{{SPEC_ROWS}}`,
    `{{OPEN_TASKS}}`, `{{LANE_DIR}}`, `{{WORKER}}`, `{{HV}}`; workers no
    longer read the whole plan. Builder charter's crash-recovery / adopt-`[~]`
    protocol rewritten: the orchestrator sets `[~]`; workers always start in a
    clean worktree; MISMATCH only when the prompt's task is not `[~]`.
  - Streaks in `$S/sessions/.streak`: BLOCKED ×1 retry / ×2 re-planner
    (`$S/lanes/REPLAN-<id>` handshake, prompt `12x-replanner-iter-NN.md`) /
    ×3 exit 2; new CRASHED class (no/unparseable JSON, gtimeout rc 124/137)
    ×3 → exit 3, branch kept as `lane/<id>-crash-N`; CONFLICT / MERGE_RED /
    MISMATCH → `[ ]` without streak. New exit 4 = deadlock. `MAX_ITER` default
    25 → 50; wall clocks `CLAUDE_TIMEOUT` 3600 / `CODEX_TIMEOUT` 2400.
  - Push policy: no per-iteration push (`RALPH_PUSH=0`); `git push origin main`
    only in the loop's deploy task (Notes `push: yes`) and in stage 3.
  - AGENTS.md: one new script row `npm run start:server`
    (`node dist/electron/server/index.js`, created by the loop's server-scaffold
    task; `typecheck` body unchanged — `src/server` compiles through
    tsconfig.main.json's include); new §Server (`SERVER_URL=` placeholder until
    the deploy task, `/healthz` contract, free-tier facts, server authoritative
    for verdict/roster only), §Workers, §Code style — ponytail, §Observability;
    hard rules reworded: injected clock, no external network (loopback-free:
    injected streams/stores), no real DB, no new dependency without a Notes
    line naming the ponytail rung (pre-approved `pg`), workers never edit the
    plan or leave their worktree, codex commits made by the orchestrator
    `[codex]`; Definition of done adds deploy verification (or
    `DESMON_SKIP_NET` recorded).
  - Tooling: ponytail vendored (`reference/PONYTAIL.md`, MIT) and bound in the
    charters; rgt hooks committed (`.claude/settings.json`,
    `.codex/config.toml`), `rgt log --json` export per collect, `rgt blame`
    test-integrity check in stage 3; graphify `update .` before the Planner
    and per collect (no `--no-viz`), `GRAPH_REPORT.md` snapshots in `graph/`,
    `.graphifyignore`; `.gitignore` + eslint ignores += `.regent/`,
    `graphify-out/`, `.worktrees/`; `reference/TOOLING.md` records tool
    versions, codex trust and the nested-claude probe (`NESTED_CLAUDE`);
    `loop/render-bootstrap.sh` (idempotent Render provisioning; free Postgres
    expiry recorded as `db_expires`).
  - Templates v2: plan header (single writer = orchestrator, Worker line, log
    worker column), SPEC (Worker column, `## Server / API`, `## Deployment`,
    injected clock in mandatory abstractions, Non-Goals no longer forbid
    networking), handoff (`## Deployment`, `## Observability`,
    `## Ponytail audit`, `## Test integrity`), session record (worker,
    graphify affected), meta.json (`lanes`, `codex_cli`, `rgt`, `graphify`,
    `render_cli`, `server_url`, `db_expires`).
  - Stage skills (names unchanged): desmon-1-plan runs `iterate.sh selftest`
    first, always opens a NEW session, records tool versions, probes nested
    claude, `graphify update .` before the Planner, Spec Clarifier in AMEND
    mode / Planner in APPEND mode with v2 validation (Worker/Deps/Files/AC,
    codex file-set + AC rules, first new task title contains `server`, no
    `[~]`, comma-only Deps); desmon-2-dev = background `iterate.sh loop` +
    REPLAN / PENDING servicing, proceeds to stage 3 on any exit code;
    desmon-3-eval adds `SERVER_URL` + dev-loop outcome to the validator prompt,
    re-checks `/healthz` itself, verifies the four new handoff sections, warns
    on DB expiry, makes the single final push.
  - Charters: Spec Clarifier AMEND mode (reads `GAME_DESIGN_V2.md`,
    `SERVER_ARCHITECTURE.md`; Render/codex-sandbox/bigint/clock hazards);
    Planner APPEND mode (Worker rule, complete Files, `graphify affected`,
    parallel chains, deploy-verify before packaging); Builder (worktree-only,
    JSON reporting, ponytail, server test rules); Validator (deploy
    verification with build-filter sha, rgt/graph exports, test integrity,
    ponytail audit + dependency check, worker-rule spot-check, DB-expiry
    warning, final push).
  - post-review fixes: verdict subcommand, NOTHING_TO_DO marks [x], re-plan
    before retry, dead-lane self-heal, graphify-out symlink, SMOKE isolation
    folded into T22, deploy-verification ancestor rule, session-record field
    forms.
- v3 (2026-09-03): "v3" feature run on the integration branch `v3` (main = v2,
  tag `v2`). Behavior-relevant changes:
  - Loop: `iterate.sh`/`ralph.sh` take `DESMON_BASE_BRANCH` (`$BASE`, default
    main) — worktrees fork from it, merges/verdict target it; the v3 run sets
    `DESMON_BASE_BRANCH=v3`. `render-bootstrap.sh` takes `DESMON_BRANCH`
    (service branch) next to the existing `DESMON_SRV_NAME`; v3 provisions
    `desmon-server-v3` from `v3`, sharing `desmon-db`.
  - Pushes: deploy tasks `git push origin HEAD:v3`; stage 3 `git push origin v3`;
    validator deploy-fix push likewise. Never main.
  - References: `GAME_DESIGN_V3.md` (types chart, hidden sizes, 5-member
    overlapping party, effective-power auto party, PvP match → battle with
    opponent preview + manual party, deterministic battle simulation + replay
    scene, attacker-only 15 % steal + theft record + notification + 24 h
    reclaim, 480×300 field at 1× units, version 0.3.0) and
    `SERVER_ARCHITECTURE_V3.md` (match/pvp v3/thefts/reclaim, `thefts` column,
    in-memory matches, v3 service). v2 docs stay normative where not overridden.
  - Charters: Spec Clarifier AMEND keeps F01–F58, adds `### v3 features (F59+)`,
    assumptions 42–50, Non-Goal edits, M15–M20; Planner APPEND T54+ (T01–T53 +
    log rows 01–48 immutable; no new log table), chains per GAME_DESIGN_V3 §13,
    T54 title contains `server`, ≤ 4 codex tasks; Builder/gfx: never checkout
    main or v3; Validator: v3 push, 0.3.0 artifacts, spot-check T54+.
  - Templates: plan header brownfield sentence (T54+), converged wording,
    SPEC deployment (v3 service, ancestor of the v3 HEAD), meta.json `branch`.
  - Skills: stage 1 keeps F01–F58 / T01–T53 immutable and validates F59+/T54+;
    stage 2 exports `DESMON_BASE_BRANCH=v3` and runs the loop with stdin from
    /dev/null; stage 3 pushes `origin v3`.
  - Fixes carried from the v2 run: `.gitignore` patterns without trailing
    slash (lane symlinks never tracked); loop stdin redirected.
