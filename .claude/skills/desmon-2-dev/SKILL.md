---
name: desmon-2-dev
description: Stage 2 of the Desktop Monster harness — the Ralph loop. Repeatedly spawns a FRESH builder subagent (empty context, sees only repo files) that does exactly one IMPLEMENTATION_PLAN.md task per iteration; the orchestrator independently re-runs the gates, logs everything to .agentdoc, and stops on the completion sentinel or the iteration cap. Requires SPEC.md and IMPLEMENTATION_PLAN.md (run desmon-1-plan first).
---

# desmon-2-dev — Ralph loop stage

You are the ORCHESTRATOR. You never implement game code yourself. Each
iteration is a NEW subagent with no memory; the repo files are the only shared
state. You may drive the loop with sequential Agent-tool calls or a Workflow
script — the contract below is identical either way.

## Setup

`HV=$(cat .harness/CURRENT)`; `TS=$(cat .agentdoc/LATEST)`; `S=.agentdoc/$TS`
MAX_ITER=25 unless the user said otherwise.
GATES = `npm test && npm run lint && npm run typecheck`.
Abort with a clear message if SPEC.md or IMPLEMENTATION_PLAN.md is missing.

## Loop — for ITER in 01..MAX_ITER

1. GUARD dirty tree: if `git status --porcelain` non-empty →
   `git add -A && git commit -m "chore(wip): auto-commit stray changes before iter $ITER [ralph]"`.
2. RENDER prompt: read `.harness/$HV/loop/PROMPT.md`, replace `{{SESSION_DIR}}`
   with `$S` and `{{ITER}}` with `$ITER`. Save the EXACT rendered text to
   `$S/prompts/100-builder-iter-$ITER.md` BEFORE spawning.
3. SPAWN a fresh general-purpose subagent with the rendered prompt. Do not add
   any other context. Capture its final message verbatim into
   `$S/sessions/iter-$ITER.log`.
4. PARSE the `<status>` block from the final message
   (task/result/gates/commit/remaining). Unparseable → treat as result: CRASHED.
5. VERIFY independently (trust but verify): run the GATES line yourself; on
   failure retry once (flake allowance); write full output to
   `$S/sessions/iter-$ITER.gates.log`. If the builder claimed `gates: pass` but
   your run fails → record DISCREPANCY in iter-$ITER.log, revert nothing,
   continue the loop (the next builder must fix it first, since green gates are
   its entry precondition).
6. SNAPSHOT plan: `cp IMPLEMENTATION_PLAN.md $S/plans/IMPLEMENTATION_PLAN.iter-$ITER.md`
7. SENTINEL: if the final message contains the exact line
   `<promise>DONE</promise>` AND your own gate run passed AND
   `grep -E '^### \[( |~|!)\] T' IMPLEMENTATION_PLAN.md` finds nothing → loop
   converged, break with CONVERGED. If the sentinel is present but checks fail
   → log FALSE_SENTINEL, continue.
8. BLOCKED tracking: if result: BLOCKED on the same task as the previous
   BLOCKED:
   - 1st time: next iteration proceeds normally (fresh eyes often unblock).
   - 2nd consecutive: spawn a PLANNER subagent (`agents/10-planner.md` +
     "re-scope ONLY task <ID>; split it or design around the blocker described
     in its Notes"; save prompt as `$S/prompts/12x-replanner-iter-$ITER.md`).
   - 3rd consecutive: stop the loop with BLOCKED_ESCALATION.
9. Append one line to `$S/sessions/dev-loop.md`:
   `| $ITER | task | result | builder-gates | my-gates | commit | decision |`.

## Exit

- CONVERGED → report iterations used; proceed to desmon-3-eval if one-shot.
- Cap reached or BLOCKED_ESCALATION → STILL proceed to desmon-3-eval (it writes
  an INCOMPLETE handoff) after appending the reason to `$S/sessions/dev-loop.md`.

Never leave the session without stage 3 running.
