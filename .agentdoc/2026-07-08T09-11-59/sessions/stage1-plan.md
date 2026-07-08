# Session record — stage 1 (plan)

## Spec Clarifier

- agent role: spec-clarifier
- harness version: v1
- task: stage 1 — write SPEC.md
- result: DONE
- commit: none (main session commits stage snapshots)

### What I did

- Read AGENTS.md, prompts/000-user-original.md, .harness/v1/reference/GAME_ARCHITECTURE.md (normative version matrix, window options, input hazards), and SPEC.template.md.
- Wrote `SPEC.md` at repo root filling the template structure exactly: Summary, 16 numbered Assumptions (each with rationale), 27-feature table F01–F27, Input Abstraction, Non-Goals, Manual Verification Appendix M1–M8.
- Every AC is shell-decidable: either a literal command with expected exit 0 or a named deterministic vitest test (`file :: "name"`); no TBDs, no open questions (self-checked by grep).
- Designed around the mandated hazards: InputDriver + SimulatedInputDriver in `src/core/input.ts` for all tests and smoke (F12, F18); uiohook behind `isTrustedAccessibilityClient(true)` with lazy require, poll-until-trusted, `will-quit` stop, and fallback input (F13, F14); overlay window flags (F15); unsigned packaging + config-safety node check (F25, F26); zero binary assets enforced by a `find` AC (F19, F24).
- Hardened smoke semantics (Assumption 11): `SMOKE_OK` only after the renderer reports its first painted frame and SimulatedInputDriver fires ≥3 synthetic attacks — smoke proves boot+render+input with no permissions.
- Made animation timing testable by mandating pure FSMs in `src/core/fsm.ts` (Assumption 9, F20) instead of leaving timing logic renderer-only.
- Froze all formulas/numbers (Assumption 3) so ACs carry exact expected values (10/20/40/163 HP; 20/28/39/54 XP thresholds).
- Copied the spec to `.agentdoc/2026-07-08T09-11-59/plans/SPEC.stage1.md`.

### Files touched

- SPEC.md (new)
- .agentdoc/2026-07-08T09-11-59/plans/SPEC.stage1.md (copy)
- .agentdoc/2026-07-08T09-11-59/sessions/stage1-plan.md (this record)

### Gate results

```
not applicable at spec stage — no package.json / code exists yet;
self-check: grep -Ei "TBD|to be decided|works correctly|feels responsive|looks good|open question" SPEC.md
matches only the template's RULES comment (line 2); 27 feature rows, 16 assumptions.
```

### Attempts & dead ends (what future iterations must NOT retry)

- Do NOT phrase renderer-visual ACs as runtime observations — they are not shell-decidable; visuals live only in the Manual Verification Appendix, while their AC anchors are smoke (first-frame IPC) and pure-core tests.
- Do NOT plan to unit-test electron-importing modules in vitest (env is node, include locked to tests/**) — spec routes their verification through grep-conformance ACs + smoke instead.
- Note for Planner: tests/input.test.ts and tests/fsm.test.ts extend GAME_ARCHITECTURE's 5-file test tree; `src/core/input.ts` and `src/core/fsm.ts` extend its core module list (both pure TS, tsconfig.test already includes src/core). AC greps match literal strings (e.g. "backgroundThrottling: false", "visibleOnFullScreen: true") — builders must keep those exact spellings in src/main/window.ts.

## Planner

- agent role: planner
- harness version: v1
- task: stage 1 — write IMPLEMENTATION_PLAN.md
- result: DONE
- commit: none (main session commits stage snapshots)

### What I did

- Read AGENTS.md (frozen contract + gates), SPEC.md (F01–F27), .harness/v1/reference/GAME_ARCHITECTURE.md §6 (12-task baseline) and templates/IMPLEMENTATION_PLAN.template.md (normative grammar).
- Wrote `IMPLEMENTATION_PLAN.md` (repo root): 20 tasks T01–T20, template grammar copied exactly, empty append-only Iteration Log.
- Expanded the reference's 12-task baseline to 20 to honor the ≤5-files/≤300-LOC sizing and SPEC's additions (src/core/input.ts F12/F14, src/core/fsm.ts F20, first-frame smoke semantics F18): split Electron shell into window(T02)/IPC(T03)/globalInput(T04), art into system+hero(T11)/species+items+font(T12), and gave input abstraction (T09) and FSMs (T10) their own tasks.
- T01 = scaffold empty-but-green: every AGENTS §Commands script exists, exact §5 package.json pins, lockfile committed, stub smoke prints SMOKE_OK; file count exceeds 5 by mandate of the ordering rule (noted in the task).
- Risky-tech tasks pulled as early as deps allow: transparent overlay window T02, guarded uiohook hook T04 (right after the IPC channels it needs).
- Every AC is a verbatim shell command chain (npx vitest run + test-title greps, grep-conformance for electron-touching modules, smoke log grep) — SPEC feature ACs reused verbatim wherever they exist; every feature F01–F27 traces to exactly one owning task.
- Ordering: deps only point backward; packaging T19 is last-but-one; T20 is the literal F01–F27 sweep with split-don't-balloon instructions.
- Resolved a T03/T08 cycle: main persistence stores raw JSON (parse/validation stays in core save.ts, T08) so IPC handlers can land before the save schema exists.
- Prescribed smoke pipeline plumbing early: `desmon:first-frame` channel + preload `reportFirstFrame` defined in T03 so T13 (full smoke: ≥3 SimulatedInputDriver attacks + first painted frame) touches ≤5 files.
- Copied the plan to `.agentdoc/2026-07-08T09-11-59/plans/IMPLEMENTATION_PLAN.stage1.md`.

### Files touched

- IMPLEMENTATION_PLAN.md (new)
- .agentdoc/2026-07-08T09-11-59/plans/IMPLEMENTATION_PLAN.stage1.md (copy)
- .agentdoc/2026-07-08T09-11-59/sessions/stage1-plan.md (this record)

### Gate results

```
not applicable at plan stage — no package.json/code exists yet;
self-check: grep -cE '^### \[ \] T[0-9]{2} — ' IMPLEMENTATION_PLAN.md → 20;
each task has exactly one AC:/Deps:/Files:/Notes: field (20/20/20/20);
convergence grep '^### \[( |~|!)\]' currently matches all 20 (expected pre-dev).
```

### Attempts & dead ends (what future iterations must NOT retry)

- Do NOT let preload value-import ../shared/ipc.js — sandboxed preloads cannot require relative modules; inline channel string literals, type-only imports are fine (T03 note).
- Do NOT make main/persistence.ts depend on core save.ts parsing (would invert T03<T08 ordering); main stores/returns raw JSON, renderer parses via parseSave.
- Do NOT plan vitest coverage for electron-importing modules (env=node, include locked to tests/**) — their ACs are grep-conformance + smoke, matching SPEC's approach.
- Do NOT write "uiohook" anywhere in tests/ or src/core, even comments — F12's AC is a case-insensitive negative grep over both.
- Do NOT re-lump T13's smoke upgrade with renderer polish: SMOKE_OK must gate on first-frame IPC + ≥3 simulated attacks; polish (T14/T15) rides on smoke staying green, not the reverse.

## Orchestrator

- Spec Clarifier subagent (a772164a): SPEC.md — 27 features F01–F27, 16 assumptions, ~33 shell-decidable ACs. Verified: no real TBDs (only the template rule comment), all 27 feature rows carry executable ACs (one `node -e` form). Snapshot + session record present. No follow-up round needed.
- Planner subagent (ae2f18d6): IMPLEMENTATION_PLAN.md — 20 tasks T01–T20. Verified grammar: 20 headings matching `^### \[.\] T[0-9]+`, 20 `- AC:` lines, 20 `- Deps:` lines, T01 = scaffold/empty-but-green, Iteration Log table present, 20 open tasks. No follow-up round needed.
- Known risk carried into dev: several ACs are grep-based on literal spellings (e.g. "backgroundThrottling: false", exact test titles) — builder prompt + plan Notes both state the strings must be kept verbatim.
