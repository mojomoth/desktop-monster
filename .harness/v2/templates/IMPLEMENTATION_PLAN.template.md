# IMPLEMENTATION_PLAN — Desktop Monster
<!-- plan-format: v2
     SINGLE WRITER = the orchestrator, via `node .harness/<HV>/loop/plan.mjs`
     (set-status / note / log-row / children). Workers NEVER edit this file —
     they report through their final status JSON (task, result, gates, commit,
     note, children[]). The only other writers: the stage-1 Planner (APPEND
     mode) and the re-planner ("re-scope ONLY task <id>").
     Never renumber, reorder, or delete task IDs.
     Status chars: [ ]=TODO [~]=IN_PROGRESS [x]=DONE [!]=BLOCKED [s]=SPLIT.
     Task block: `### [<c>] T<NN> — <title>` then `- AC:`, `- Deps:`,
       `- Worker:`, `- Files:`, `- Notes:` (this order, every task).
     Worker: claude | codex. codex iff EVERY Files path (ignoring SPEC.md,
       IMPLEMENTATION_PLAN.md, .agentdoc/**) is in the graphics set:
       src/renderer/sprites/**, src/renderer/anim.ts, src/renderer/hud.ts,
       src/renderer/effects.ts, static/style.css, static/menu.css,
       tests/sprites.test.ts, tests/anim.test.ts, tests/effects.test.ts,
       tests/renderer.test.ts, tests/window.test.ts. Anything else = claude.
     codex ACs: only `npx vitest run …`, `grep …`, `test -e …`, `node -e …`
       (no smoke/start/electron/network); codex tasks add no dependencies.
     Deps: `none` or comma-separated T-IDs (no ranges); deps point backward only.
     Files: COMPLETE list incl. tests, one plain path per entry, comma-separated
       (no `{a,b}` groups, no suffixes) — `plan.mjs ready` excludes any task
       whose Files overlap a [~] task's Files (conflict avoidance). A missing
       path = merge conflict later; an over-broad list = an idle lane.
     Split: the orchestrator flips the parent to [s] and inserts children
       T<NN>a.. directly below it (children inherit Worker unless given).
     Brownfield: T01–T21 and their log rows are immutable; new tasks are
       appended as T22+.
     Iteration Log v2 columns: | iter | ts | worker | task | result | gates | commit | note |
       — append-only; the v2 table is the LAST table in the file.
     Converged == no [ ] [~] [!] headings AND gates + smoke green on main
       (orchestrator-verified; workers emit no sentinel). -->

## Tasks

### [ ] T01 — <title>
- AC: <runnable command(s) + expected result; codex: vitest/grep/test -e/node -e only>
- Deps: none
- Worker: claude
- Files: <complete comma-separated path list incl. tests>
- Notes: <SPEC refs, literals, pinned tests to respect; `push: yes` only on the deploy task; new dependency ⇒ name the ponytail rung that failed (pre-approved: pg)>

## Iteration Log (append-only)

| iter | ts | worker | task | result | gates | commit | note |
|---|---|---|---|---|---|---|---|
