---
name: desmon-1-plan
description: Stage 1 of the Desktop Monster harness (v3, brownfield, integration branch v3). Runs the loop selftest, opens a NEW .agentdoc/{ts} session with tool versions, refreshes the graphify graph, then spawns the Spec Clarifier (AMEND mode — extends SPEC.md, F01–F58 kept, adds F59+) and the Planner (APPEND mode — adds T54+ tasks with Worker/Deps/Files/AC to IMPLEMENTATION_PLAN.md; T01–T53 and Iteration Log rows 01–48 stay immutable). Use when starting a harness v3 run or when the spec/plan must be extended.
---

# desmon-1-plan — Spec & Plan stage (v3)

You are the ORCHESTRATOR for stage 1. You spawn fresh subagents; you do not
write the spec or plan yourself. Loop contract: `.harness/$HV/HARNESS.md`.

## 0. Session setup

1. `HV=$(cat .harness/CURRENT)`. All harness paths below use `.harness/$HV/`.
   `git branch --show-current` must print `v3` (the integration branch; `export DESMON_BASE_BRANCH=v3` for every loop command in this run) and `git worktree list` no `lane/` entries.
2. `bash .harness/$HV/loop/iterate.sh selftest` — must exit 0. Non-zero →
   STOP, report "harness selftest failed" with its output; spawn nothing.
3. ALWAYS open a new session (one session ↔ one harness version):
   `TS=$(date +%Y-%m-%dT%H-%M-%S)`; `S=.agentdoc/$TS`;
   `mkdir -p $S/{prompts,sessions,plans,lanes,graph}`; write `$TS` into
   `.agentdoc/LATEST` (plain file). Fill
   `.harness/$HV/templates/meta.template.json` → `$S/meta.json`:
   `harness_version=$HV`, `branch=v3`, `runner=in-session`, `started`, `lanes=${LANES:-3}`,
   tool versions `claude_cli` / `codex_cli` / `rgt` / `graphify` / `render_cli`
   from `claude --version`, `codex --version`, `rgt version`,
   `graphify --version`, `render --version`; `server_url` = the `SERVER_URL=`
   value in AGENTS.md §Server (placeholder until the deploy task fills it);
   `db_expires` = "".
4. Nested-claude probe (sets stage 2's `NESTED_CLAUDE`; same nine-variable
   `env -u` list as `iterate.sh` `CLAUDE_UNSET` — TOOLING.md §2):
   `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_BRIDGE_SESSION_ID -u CLAUDE_PID -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PLUGIN_DATA claude -p 'Reply with exactly PROBE_OK' --output-format text`
   → output contains `PROBE_OK` ⇒ `NESTED_CLAUDE=1`, else `0`. Record the
   value as a line `NESTED_CLAUDE=<0|1>` under `## Orchestrator` in
   `$S/sessions/stage1-plan.md` (host default: `reference/TOOLING.md §7`).
5. Save the user's ORIGINAL requirements text VERBATIM (no paraphrase, original
   language) to `$S/prompts/000-user-original.md`. If it was given in an
   earlier message, reconstruct it exactly.
6. If any plan-mode plan exists for this effort, copy it to
   `$S/plans/000-plan-mode-approved.md`.
7. Pre-snapshot the brownfield inputs: `cp SPEC.md $S/plans/SPEC.stage1-base.md`,
   `cp IMPLEMENTATION_PLAN.md $S/plans/IMPLEMENTATION_PLAN.stage1-base.md`
   (the immutability checks in §2 diff against these).

## 1. Spec Clarifier (AMEND)

1. Compose the prompt: contents of `.harness/$HV/agents/00-spec-clarifier.md`
   + `Active session dir: $S` + `Mode: AMEND (SPEC.md exists; extend it, keep F01–F58; new rows F59+)`.
2. Save that EXACT prompt to `$S/prompts/010-spec-clarifier.md` BEFORE spawning.
3. Spawn a fresh general-purpose subagent with it. Wait for completion.
4. Verify SPEC.md: non-empty, contains no "TBD"; every feature row has an
   `AC:`; rows F01–F58 still present; new rows (F59+) carry a `Worker` value and sit in a table headed `### v3 features (F59+)`;
   sections `## Server / API` and `## Deployment` exist; the mandatory
   abstractions name an injected clock. Defects → ONE follow-up subagent
   (prompt saved as `011-spec-clarifier-followup.md`) listing them specifically.

## 2. Planner (APPEND)

0. `graphify update .` first (best effort: on failure note it and continue;
   NEVER pass `--no-viz` — graphify 0.8.40's `update` rejects it). The Planner
   fills `Files:`/`Deps:` from `graphify affected` against this graph.
1. Prompt = `.harness/$HV/agents/10-planner.md` + `Active session dir: $S`
   + `Mode: APPEND (T01–T53 and their Iteration Log rows 01–48 are immutable; new tasks are T54+)`.
   Save as `$S/prompts/020-planner.md` BEFORE spawning; spawn; wait.
2. Validate IMPLEMENTATION_PLAN.md — ALL must hold:
   - header comment says `plan-format: v2`; every heading matches
     `^### \[.\] T[0-9]+[a-z]? — `; NO `[~]` heading anywhere.
   - immutability: `grep '^### ' $S/plans/IMPLEMENTATION_PLAN.stage1-base.md`
     is an exact prefix of the same grep on the new file, and the base file's
     Iteration Log rows are unchanged.
   - every NEW task block (T54+) has `- AC:`, `- Deps:`, `- Worker: (claude|codex)`
     and `- Files:` lines; `Deps:` is `none` or comma-separated T-IDs only
     (no ranges, no en-dash `–`), each ID exists and points backward.
   - the FIRST new task's title contains `server`.
   - every `Worker: codex` task (at most 4): all `Files:` paths (ignoring SPEC.md,
     IMPLEMENTATION_PLAN.md, .agentdoc/**) fall in `src/renderer/sprites/**`,
     `src/renderer/anim.ts`, `src/renderer/hud.ts`, `src/renderer/effects.ts`,
     `static/style.css`, `static/menu.css`, `tests/sprites.test.ts`,
     `tests/anim.test.ts`, `tests/effects.test.ts`, `tests/renderer.test.ts`,
     `tests/window.test.ts`; its `AC:` uses only `npx vitest run …`, `grep …`,
     `test -e …`, `node -e …` (never `npm run smoke`, `npm start`, `electron`,
     `curl`, `npm install`); its Notes add no dependency.
   - `node .harness/$HV/loop/plan.mjs ready` exits 0, prints a non-empty
     `READY=` line and NO stderr warning (a warning = unknown/range dep token).
   Any defect → ONE follow-up round (`021-planner-followup.md`) naming the
   failing rule + task IDs; re-validate. Still failing → stop and report.

## 3. Close stage

- Snapshot: `cp SPEC.md $S/plans/SPEC.stage1.md` and
  `cp IMPLEMENTATION_PLAN.md $S/plans/IMPLEMENTATION_PLAN.stage1.md`.
- `git add -A && git commit -m "docs(plan): stage-1 spec and plan [harness $HV]"`
- Append your orchestrator notes (subagent final messages, verification
  results, selftest + probe outcomes, tool versions) to
  `$S/sessions/stage1-plan.md` under `## Orchestrator`.
- Report: new task count and claude/codex split, feature count,
  `NESTED_CLAUDE`, and "ready for desmon-2-dev".

If this is a one-shot run, proceed to the desmon-2-dev skill immediately.
