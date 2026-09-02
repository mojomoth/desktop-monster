---
name: desmon-3-eval
description: Stage 3 of the Desktop Monster harness (v2). Spawns the Validator/Packer subagent for independent final verification (cold-install gates, AC spot-check, SPEC sweep, smoke, mac packaging, deploy verification via /healthz, rgt/graph exports, test integrity via rgt blame, ponytail audit + dependency check, worker-rule spot-check) and the end-of-session handoff in .agentdoc/{ts}/handoff.md; then re-checks the deployment itself, finalizes meta.json and makes the session's only `git push origin main`. Run after desmon-2-dev, even if the loop did not converge.
---

# desmon-3-eval — Validate, package, deploy-verify, hand off (v2)

`HV=$(cat .harness/CURRENT)`; `TS=$(cat .agentdoc/LATEST)`; `S=.agentdoc/$TS`;
`SERVER_URL` = the `SERVER_URL=` value in AGENTS.md §Server.

1. Compose the validator prompt: contents of
   `.harness/$HV/agents/30-validator-packer.md` + `Active session dir: $S`
   + `SERVER_URL=<value>` + the dev-loop outcome line from
   `$S/sessions/dev-loop.md` (exit code, meaning, iterations) +
   `DESMON_SKIP_NET=<1 if set, else unset>`. Save the EXACT prompt to
   `$S/prompts/900-validator-packer.md` BEFORE spawning.
2. Spawn the fresh subagent. Capture its final message to
   `$S/sessions/stage3-eval.log`.
3. VERIFY the validator's claims yourself:
   - `$S/handoff.md` exists, has a status line, and contains the v2 sections
     `## Deployment`, `## Observability`, `## Ponytail audit`,
     `## Test integrity` (a missing section = NOT_CONVERGED evidence).
   - if it says COMPLETE: re-run the gates line once and check that the
     `release/` artifact paths it names actually exist.
   - Deployment, when `DESMON_SKIP_NET` is unset AND `SERVER_URL` is not the
     placeholder: run
     `curl -fsS --retry 5 --retry-delay 30 --max-time 90 "$SERVER_URL/healthz"`
     yourself → `{"ok":true,"sha":"<sha>"}`, then apply the deploy rule
     (the same one the validator charter and SPEC §Deployment use — no
     equality check against any particular commit):
     `git merge-base --is-ancestor <sha> HEAD && [ -z "$(git log <sha>..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" ]`
     (the render-bootstrap build-filter paths; a later docs/gfx commit after
     `<sha>` is fine, a later commit touching a filter path is stale).
     Rule fails → NOT_CONVERGED, reason "deploy not landed". Placeholder URL
     while the deploy task is `[x]` → NOT_CONVERGED.
     `DESMON_SKIP_NET=1` → skip, and make sure handoff §Deployment says
     "skipped (DESMON_SKIP_NET)".
   - DB expiry (fail-soft): if `db_expires` (handoff §Deployment /
     `$S/meta.json`) is within 7 days or past → add a WARNING line to handoff
     §Known limitations; never a failure.
   - the rgt export and graph snapshot named in handoff §Observability exist
     under `$S/sessions/` and `$S/graph/`.
4. If the validator says NOT_CONVERGED (or your checks fail) and desmon-2-dev
   has not already been re-run this session: run desmon-2-dev again (it
   resumes from the plan file — tasks flipped back to `[ ]` get
   re-dispatched), then this skill again. At most ONE such round trip.
5. Finalize `$S/meta.json`: `ended`, `outcome`, `stages`, `server_url`,
   `db_expires` (from handoff §Deployment). Ensure `$S/handoff.md` exists even
   on failure — if the validator crashed, write it yourself from
   `.harness/$HV/templates/handoff.template.md` with `status: INCOMPLETE` and
   whatever is known.
6. `git add -A && git commit -m "chore(eval): stage-3 validation and handoff [harness $HV]"`
7. `git push origin main` — the ONLY push the harness makes besides the
   loop's deploy task (`RALPH_PUSH` stays 0). Skip when `DESMON_SKIP_NET=1`
   and say so; a failed push is reported, not retried.
8. Final report to the user: outcome, artifact path, `SERVER_URL` + healthz
   result, DB expiry date, manual steps (Accessibility permission), path to
   handoff.md.
