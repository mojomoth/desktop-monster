# Harness changelog

- v1 (2026-07-08): initial harness — 4 agent prompts (spec-clarifier, planner,
  builder, validator-packer), 3 skills (desmon-1-plan / desmon-2-dev /
  desmon-3-eval), Ralph loop (loop/PROMPT.md + loop/ralph.sh), gates =
  `npm test && npm run lint && npm run typecheck`, sentinel
  `<promise>DONE</promise>`, max-iterations default 25.
- v1 (2026-07-08, pre-freeze addition before first loop iteration): added loop/INSESSION_NOTE.md — structured-output adaptation of the section-8 status block for the in-session runner. Same sentinel semantics.
