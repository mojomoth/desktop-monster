# Ralph iteration 13 — Builder

You are a fresh agent with no memory of previous iterations. Everything you need
is on disk. Your job: complete EXACTLY ONE task from IMPLEMENTATION_PLAN.md, with
all gates green, committed, and logged. Then stop.

Session dir: .agentdoc/2026-07-08T09-11-59
(If that placeholder is unrendered, resolve it as `.agentdoc/$(cat .agentdoc/LATEST)`.)

## 1. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules. The gates line is:
   `npm test && npm run lint && npm run typecheck`
2. Your charter: `.harness/$(cat .harness/CURRENT)/agents/20-builder.md` — its
   hard rules bind you.
3. `SPEC.md` — only the sections relevant to your task.
4. `IMPLEMENTATION_PLAN.md` — full read.
5. The last 2 files matching `.agentdoc/2026-07-08T09-11-59/sessions/iter-*.md`, if any — for
   "attempts & dead ends" notes so you do not repeat a failed approach.
6. When your task involves architecture decisions (deps, window options, IPC,
   sprites): the matching section of
   `.harness/$(cat .harness/CURRENT)/reference/GAME_ARCHITECTURE.md`.

## 2. Pick your task

- If any task heading is `[~]` (IN_PROGRESS): a previous iteration crashed.
  Adopt THAT task. Inspect `git status` and `git log -3`; either build on the
  leftovers or `git checkout -- . && git clean -fd` to start it clean.
- Otherwise: adopt the FIRST task heading matching `[ ]` whose Deps are all
  `[x]`/`[s]`. First means topmost in the file. Do not choose by preference.
- Immediately flip its status to `[~]` and save the plan file.
- If NO task is `[ ]`/`[~]`/`[!]`: skip to step 7 (you may be the closing
  iteration).

## 3. Implement + test

- Implement the task. WRITE TESTS for it in the same iteration — the AC line
  tells you what must be provable.
- Stay in scope: this task only. If you discover the task is too big for one
  iteration, STOP and follow the split protocol in your charter (mark parent
  `[s]`, add children with ACs, end with `result: SPLIT` — implement nothing
  more).

## 4. Gates — fix until green, never give up

- Run: `npm test && npm run lint && npm run typecheck`
- On any failure: fix and rerun. If an approach fails twice, try a DIFFERENT
  approach (other API, other library, other design). Errors are never a reason
  to stop; they are a reason to change tactics.
- FORBIDDEN under all circumstances: deleting/skipping/weakening tests,
  loosening tsconfig or eslint rules, `--force`/`|| true` shims, marking work
  done that you did not verify. The validator executes AC lines literally and
  will flip false claims back to TODO.
- Also run this task's own `AC:` command(s) and confirm they pass.
- Declare BLOCKED only per your charter (environmental impossibility, ≥3
  genuinely different attempts, evidence in Notes).

## 5. Commit

- `git add -A`
- Conventional message with the task ID as scope, e.g.:
  `feat(T03): knight attack animation state machine`
- One commit for the task (plus the plan/log updates in the same commit).

## 6. Update the plan file (memory for the next iteration)

- Flip your task: `[~]` → `[x]` (or `[!]` BLOCKED / `[s]` SPLIT).
- Append one bullet to its Notes: what you did, and any dead ends.
- Append ONE row to the Iteration Log table (iter 13, task, result,
  gates, commit sha, one-line note). Never edit existing rows or other tasks.

## 7. Write your session record

Create `.agentdoc/2026-07-08T09-11-59/sessions/iter-13.md` following
`.harness/$(cat .harness/CURRENT)/templates/session-record.template.md`:
what you did, files touched, gate output tails, attempts & dead ends, commit
sha. Commit it (the tree must be clean when you finish).

## 8. Report status and stop

End your final message with EXACTLY this block (parseable, values on their own
lines):

<status>
task: T03
result: DONE | SPLIT | BLOCKED | NOTHING_TO_DO
gates: pass | fail
commit: <sha or none>
remaining: <count of headings still [ ]/[~]/[!]>
</status>

THEN, and ONLY IF both are true —
  (a) `grep -E '^### \[( |~|!)\] T' IMPLEMENTATION_PLAN.md` finds NOTHING, and
  (b) you ran the gates line in this iteration and it exited 0 —
output on its own final line:

<promise>DONE</promise>

Never write that sentinel line in any other circumstance, and never quote it
elsewhere in your output (call it "the sentinel" if you must refer to it).
Your iteration ends with this message. Do not start another task.
---

## In-session orchestration note

You are spawned by the in-session orchestrator (not ralph.sh). Two adjustments:

1. Report your final status via the StructuredOutput tool with fields
   {task, result, gates, commit, remaining, sentinel, note} mirroring the
   section-8 status block. The `sentinel` boolean replaces the promise line
   and is bound by EXACTLY the same two conditions: set it true ONLY if
   (a) grep -E '^### \[( |~|!)\] T' IMPLEMENTATION_PLAN.md finds nothing, AND
   (b) you ran the gates line in this iteration and it exited 0.
2. Everything else above still applies verbatim — including the session
   record file (section 7), the plan-file update (section 6), and the
   commit (section 5).
