# Handoff — Desktop Monster (maintenance T21)

- status: COMPLETE
- session: .agentdoc/2026-07-08T13-40-58
- harness version: v1
- iterations used: 1 (interactive maintenance, single task T21)

## What was built (vs SPEC)

- Assumption 10 (amended) ✅ — whole-window threshold drag over
  `desmon:move-window`; default position bottom-right of the primary work
  area with a 16px margin (Dock/taskbar never covered).
- Assumption 17 (new) ✅ — hero/monster at `SPRITE_SCALE = 2`; LV/XP gauge
  floats above the hero's head.
- All prior features F01–F27 remain green (303/303 tests, lint 0 warnings,
  3 strict tsc projects, smoke SMOKE_OK).

## How to run

`npm start` — the overlay now appears at the BOTTOM-RIGHT of the screen and
can be moved by mouse-dragging anywhere on it (a plain click attacks instead).

## Manual steps remaining

- M1 re-check (visual): default position, whole-window drag feel, 2× art,
  gauge placement.
- Packaged artifact under release/ is from the previous session; run
  `npm run package` to rebuild it with T21 included.

## Audit trail

- prompts: .agentdoc/2026-07-08T13-40-58/prompts/ (verbatim user request)
- session record: sessions/maintenance-T21.md
- plan: IMPLEMENTATION_PLAN.md T21 + Iteration Log row 21
