---
name: desmon-3-eval
description: Stage 3 of the Desktop Monster harness. Spawns the Validator/Packer subagent for independent final verification (cold-install gates, spot-check of done tasks' acceptance commands, SPEC sweep, smoke run), mac packaging via electron-builder, and the end-of-session handoff in .agentdoc/{ts}/handoff.md. Run after desmon-2-dev, even if the loop did not converge.
---

# desmon-3-eval — Validate, package, hand off

`HV=$(cat .harness/CURRENT)`; `TS=$(cat .agentdoc/LATEST)`; `S=.agentdoc/$TS`

1. Compose the validator prompt: contents of
   `.harness/$HV/agents/30-validator-packer.md` + `Active session dir: $S` +
   the dev-loop outcome line (CONVERGED / cap reached / blocked escalation).
   Save the EXACT prompt to `$S/prompts/900-validator-packer.md` BEFORE spawning.
2. Spawn the fresh subagent. Capture its final message to
   `$S/sessions/stage3-eval.log`.
3. VERIFY the validator's claims yourself: `$S/handoff.md` exists and has a
   status line; if it says COMPLETE, re-run the gates one final time and check
   that the `release/` artifact paths it names actually exist.
4. If the validator says NOT_CONVERGED and desmon-2-dev has not already been
   re-run once this session: run desmon-2-dev again (it resumes from the plan
   file), then this skill again. At most ONE such round trip per session.
5. Finalize `$S/meta.json` (ended timestamp, outcome). Ensure `$S/handoff.md`
   exists even on failure — if the validator crashed, write it yourself from
   `.harness/$HV/templates/handoff.template.md` with `status: INCOMPLETE` and
   whatever is known.
6. `git add -A && git commit -m "chore(eval): stage-3 validation and handoff [harness $HV]"`
7. Final report to the user: outcome, artifact path, manual steps
   (Accessibility permission), path to handoff.md.
