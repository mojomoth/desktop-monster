# HARNESS.md — Desktop Monster autonomous development harness (v1)

Operator manual for the Ralph-loop harness. The harness builds the game
autonomously in three stages, each available as a project skill:

    plan  → /desmon-1-plan   Spec Clarifier + Planner → SPEC.md + IMPLEMENTATION_PLAN.md
    dev   → /desmon-2-dev    Ralph loop: fresh builder × N, one task per iteration
    eval  → /desmon-3-eval   Validator/Packer → verification + packaging + handoff

## 1. Loop modes

- PRIMARY — in-session: an orchestrating Claude Code session runs the three
  skills; every builder iteration is a NEW subagent with empty context that
  sees only the repo files (fresh context per iteration, no carry-over).
- STANDALONE — `bash .harness/v1/loop/ralph.sh [--max-iterations 25]`: each
  iteration is a fresh `claude -p` subprocess. Requires stage 1 done
  (SPEC.md + IMPLEMENTATION_PLAN.md present); the script uses
  `--dangerously-skip-permissions`, so run it only in a sandboxed/trusted repo.

## 2. One-shot kickoff (intended usage)

Paste into a single claude session, then walk away:

> Run the Desktop Monster harness end to end without asking me anything:
> invoke skill desmon-1-plan with the requirements in
> `.agentdoc/<LATEST>/prompts/000-user-original.md`, then desmon-2-dev, then
> desmon-3-eval. Do not stop between stages. If the dev stage exits without
> the sentinel, still run desmon-3-eval so a handoff is written.

## 3. Session directory lifecycle

- Whoever starts stage 1 (or ralph.sh) creates `.agentdoc/<TS>/`
  (`prompts/`, `sessions/`, `plans/`; TS format `%Y-%m-%dT%H-%M-%S`), writes
  `<TS>` into `.agentdoc/LATEST` (plain file, not a symlink), and fills
  `meta.json` from the template. Stages 2/3 REUSE the active session.
- A session ends when `handoff.md` is written. RULE: whichever process ends the
  session writes handoff.md, even on failure (`status: INCOMPLETE`).
- One session ↔ one harness version. Never change `.harness/CURRENT` inside a
  running session; finish or abort the session first.

## 4. Resuming

`IMPLEMENTATION_PLAN.md` is the memory. To resume a half-finished run, just run
/desmon-2-dev (or ralph.sh) again — it picks up from the first open task. A
leftover `[~]` task means an iteration crashed; the next builder adopts it
(see the builder charter's crash-recovery protocol).

## 5. Exit codes (ralph.sh)

0 = converged (sentinel verified independently) · 1 = iteration cap reached ·
2 = blocked escalation (same task BLOCKED 3 consecutive iterations).

## 6. Observability map (`.agentdoc/<TS>/`)

| Artifact | Writer | When |
|---|---|---|
| `prompts/*` (verbatim agent prompts) | orchestrator / ralph.sh, BEFORE spawning | every spawn |
| `sessions/iter-NN.md` (rich record: attempts, dead ends) | the builder itself | end of its iteration |
| `sessions/iter-NN.log` (builder's final message verbatim) | orchestrator | after each iteration |
| `sessions/iter-NN.gates.log` (independent gate re-run) | orchestrator | after each iteration |
| `sessions/stage1-plan.md`, `stage3-eval.md` | stage agents (+ orchestrator notes) | stage end |
| `sessions/dev-loop.md` / `ralph-run.log` | orchestrator / ralph.sh | one row per iteration |
| `plans/*` (immutable snapshots incl. plan-mode plans) | orchestrator (`cp`) | stage 1 end + every iteration |
| `meta.json`, `../LATEST` | orchestrator | session start / end |
| `handoff.md` | validator (orchestrator fallback on crash) | session end, ALWAYS |

## 7. Trust-but-verify rules (non-negotiable)

- The orchestrator re-runs the gates line itself every iteration, regardless of
  what the builder claims (one retry for flake allowance).
- The sentinel `<promise>DONE</promise>` is honored ONLY if (a) it appears as an
  exact full line in the builder's output, (b) the orchestrator's own gate run
  passes, and (c) `grep -E '^### \[( |~|!)\] T' IMPLEMENTATION_PLAN.md` finds
  nothing. Anything else is a FALSE_SENTINEL: log it and continue the loop.
- The validator cold-installs (`rm -rf node_modules && npm ci`), re-executes
  task ACs and SPEC ACs literally, and flips false `[x]` claims back to `[ ]`.

## 8. Escalation policy

BLOCKED means environmental impossibility (permissions, network, toolchain) —
never mere errors. Streak handling per task: 1st BLOCKED → next fresh builder
retries (fresh eyes often unblock); 2nd consecutive → a Planner subagent
re-scopes/splits that task; 3rd consecutive → loop stops (exit 2) and a human
reads the task's Notes plus the latest session records.

## 9. Skill sync rule

Canonical skills live in `.harness/v1/skills/`. Install with:
`cp -R .harness/v1/skills/. .claude/skills/`. Never hand-edit `.claude/skills/`.

## 10. Versioning (v1 → v2)

Bump on ANY behavior-relevant change: `agents/*.md`, `loop/PROMPT.md`, the gate
command, AGENTS.md §Commands script names, sentinel/status schema, plan grammar,
escalation thresholds, skill flow. Typo-level fixes that cannot change agent
behavior may be edited in place with a CHANGELOG entry.

Mechanics: `cp -R .harness/v1 .harness/v2` (v1 is FROZEN once its first loop
iteration has run — the `.agentdoc` audit trail must stay re-readable against
the exact prompts that produced it) → edit v2 → CHANGELOG entry → update
`.harness/CURRENT` to `v2` → re-sync skills → commit
`chore(harness): bump to v2 — <reason>`. `meta.json.harness_version` records
which version each session used; a mid-project bump starts a NEW session dir.
