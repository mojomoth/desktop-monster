# DesMon v0.12 harness (boss raid) — art first, then uninterrupted

Contract: `docs/v0.12/CONTRACT.md`; plan: `docs/v0.12/PLAN.md`; task graph: `config.json`. Integration branch `v3`.
Legacy `CURRENT=v3`, v10 and v11 stay untouched. Field balance keeps the v0.11 winner (`.harness/v11/balance*.mjs` are not forked).

## Roles (loop agent ids)
Host `/root/loop/host` (harness, server, client, native, deploy, release) · Balance `/root/loop/balance` (core raid rules, protocol, simulation) ·
Critic `/root/loop/critic` (protocol review, verifier, scope reviews; owns no product code) · Designer `/root/loop/designer` (renderer integration) ·
Codex `/root/loop/codex` (all art and both expected screens, `codex exec` lanes). Charters: `agents/*.md`; Claude workers get `agents/PROMPT.md`, Codex lanes `codex/PROMPT.md` + a brief.
Vision critique of art rounds: `agents/art-critic.md` (Claude reads the PNG boards). The user is the only approver of art (`docs/v0.12/RAID_ART.md`).

## Run
```
node .harness/v12/run.mjs init .agentdoc/v12-<ts>                 # journal (once)
node .harness/v12/loop.mjs .agentdoc/v12-<ts> --stage A            # V12-00…07b, then renders previews and stops at V12-08 (exit 10)
#  → open .agentdoc/v12-<ts>/preview/attempt-NN/*.png, write `approved: <sha> by <name> at <ISO>` (or `rejected: … lanes: …`) into docs/v0.12/RAID_ART.md
node .harness/v12/loop.mjs .agentdoc/v12-<ts> --stage A            # re-run: gate passes → exit 0 (or reopens rejected lanes)
node .harness/v12/loop.mjs .agentdoc/v12-<ts> --stage B            # V12-09…18: server, client, balance, native, deploy, reviews, release; freeze + verify; exit 0
```
Exit codes: 0 stage complete · 10 waiting for the human approval line · 1 iteration cap · 2 blocked tasks remain · 4 deadlock/freeze cap · 70 fatal.
Env: `CODEX_MODEL` (default `config.codexModel`), `CLAUDE_MODEL`, `CODEX_TIMEOUT`/`CLAUDE_TIMEOUT` seconds, `POLL_MS`, `--lanes N`, `--max-iter N`.

## Loop contract
- Dispatch = `run.mjs start` (dependencies implemented, file ownership disjoint) → git worktree `.worktrees/<id>` on `lane/<id>` from HEAD →
  worker (`claude -p` or `codex exec`, prompt archived under the run) → collect = commit leftovers, `merge --no-ff`, `run.mjs check ac`, `check gates`;
  a red check reverts the merge, invalidates the task and retries (≤3 attempts, then `block` with the attempt notes as evidence).
- Art lanes (`art:` tasks): round 1 draws two variants (bosses) or the set → lane AC → `raid-preview.mjs board --lane` → Claude vision critique
  (`pick:`/`blocking:`) → round 2 refines the pick → round 3 only while blocking fixes remain (max 3). Rounds are logged in `docs/v0.12/RAID_ART.md`.
- A Critic that ends `BLOCKED` with `REVISE <id>: …` reopens `<id>` with the findings in its history; the Critic task re-runs after it.
- Human gate V12-08: `raid-preview.mjs html` + `capture` → `{run}/preview/final.json`; `verify` passes only with a matching `approved:` line.
  A later `rejected: <sha> reason: … lanes: …` reopens the listed art lanes with the reason as critique (all art lanes when none listed).
- Freeze (end of stage B): every task's AC re-checked at the frozen source, one canonical gates receipt, `verify` in dependency order,
  then V12-18's `final-check.mjs final`. Any failure invalidates that task and the loop continues (≤3 freezes).
- The journal (`loop.json`), `loop-state.json`, prompts, worker logs, critiques, boards and previews live under the run dir and are committed after each collect.

## Commands
- `node --test .harness/v12/*.test.mjs` · gates `npm test && npm run lint && npm run typecheck`
- `node .harness/v12/raid-preview.mjs html | capture OUT | board --lane DIR --out OUT | verify FINAL_JSON`
- `node .harness/v12/final-check.mjs reviews|deploy|final RUN` · `node .harness/v12/release.mjs RUN smoke|mac|windows|collect`
- `node .harness/v12/run-performance.mjs baseline|candidate APP DIR` · `node .harness/v12/runtime.mjs run OUT APP | verify OUT`
- Deploy (V12-16): plan §9 — rotate Postgres while the live phase is gathering/skipped, `git push origin HEAD:v3`, `render deploys create … --wait --confirm`, `/healthz` + probe, `{run}/deploy.json`.

## Inputs and outputs
`run.mjs` digests `src static tests scripts .harness/v12 SPEC.md README.md docs/v0.12/{CONTRACT.md,BALANCE_CANDIDATE.json,EVALUATION_PROTOCOL.json,PERFORMANCE_PROTOCOL.json,RAID_ART.md}`
plus the reused v10/v7 helpers and build config. Generated evidence (run dir, `docs/v0.12/preview/`, `raid-preview.html`, ACCEPTANCE/HANDOFF/REVIEWS/BALANCE_REPORT)
is hashed separately and never part of the digest. Never edit digest inputs while a `check` or release command runs.
