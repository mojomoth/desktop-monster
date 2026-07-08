---
name: desmon-1-plan
description: Stage 1 of the Desktop Monster harness. Runs the Spec Clarifier and Planner subagents to produce SPEC.md (testable pass criteria per feature) and IMPLEMENTATION_PLAN.md (one-iteration task units). Use when starting a harness run or when the spec/plan must be regenerated. Creates the .agentdoc/{ts} session dir if none is active.
---

# desmon-1-plan — Spec & Plan stage

You are the ORCHESTRATOR for stage 1. You spawn fresh subagents; you do not
write the spec or plan yourself.

## 0. Session setup

1. `HV=$(cat .harness/CURRENT)`. All harness paths below use `.harness/$HV/`.
2. If `.agentdoc/LATEST` is missing or the user says "new session":
   `TS=$(date +%Y-%m-%dT%H-%M-%S)`; `mkdir -p .agentdoc/$TS/{prompts,sessions,plans}`;
   write `$TS` into `.agentdoc/LATEST`; fill
   `.harness/$HV/templates/meta.template.json` → `.agentdoc/$TS/meta.json`
   (record harness_version=$HV, `claude --version`, started timestamp, runner).
3. Save the user's ORIGINAL requirements text VERBATIM (no paraphrase, original
   language) to `.agentdoc/$TS/prompts/000-user-original.md`. If it was given in
   an earlier message, reconstruct it exactly.
4. If any plan-mode plan exists for this effort, copy it to
   `.agentdoc/$TS/plans/000-plan-mode-approved.md`.
5. If the repo is not a git repo: `git init -b main`; commit the harness files
   as `chore: materialize harness $HV`.

## 1. Spec Clarifier

1. Compose the subagent prompt: contents of
   `.harness/$HV/agents/00-spec-clarifier.md` + a line
   `Active session dir: .agentdoc/$TS`.
2. Save that EXACT prompt to `.agentdoc/$TS/prompts/010-spec-clarifier.md`
   BEFORE spawning.
3. Spawn a fresh general-purpose subagent with it. Wait for completion.
4. Verify SPEC.md exists, is non-empty, contains no "TBD", and every feature
   row has an `AC:` entry. If not, spawn ONE follow-up subagent (save prompt as
   `011-spec-clarifier-followup.md`) with the specific defects listed.

## 2. Planner

Same protocol with `agents/10-planner.md` → `prompts/020-planner.md`.
Verify IMPLEMENTATION_PLAN.md: matches the grammar (task headings match
`^### \[.\] T[0-9]+`), T01 is the scaffold/gates task, every task has an AC
line. One follow-up round max (`021-planner-followup.md`).

## 3. Close stage

- Snapshot: `cp SPEC.md .agentdoc/$TS/plans/SPEC.stage1.md` and
  `cp IMPLEMENTATION_PLAN.md .agentdoc/$TS/plans/IMPLEMENTATION_PLAN.stage1.md`
- `git add -A && git commit -m "docs(plan): stage-1 spec and plan [harness $HV]"`
- Append your orchestrator notes (subagent final messages, verification
  results) to `.agentdoc/$TS/sessions/stage1-plan.md` under `## Orchestrator`.
- Report: task count, feature count, and "ready for desmon-2-dev".

If this is a one-shot run, proceed to the desmon-2-dev skill immediately.
