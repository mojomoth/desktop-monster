# Handoff — Desktop Monster

- status: <COMPLETE | INCOMPLETE>
- session: .agentdoc/<TS>
- harness version: <vN>
- iterations used: <N> (lanes: <LANES>; claude <n> / codex <n>)

## What was built (vs SPEC)

<per feature: F01 ✅/❌ + one line>

## How to run

<`npm start`; packaged app path; Accessibility grant steps (dev = "Electron",
packaged = "DesMon"); Gatekeeper "Open Anyway" note; `npm run start:server`
for a local server (no DATABASE_URL = memory store)>

## Artifacts

<release/ paths>

## Gate evidence

```
<final gate command exit lines>
```

## Deployment

- service: <desmon-server id> · url: <SERVER_URL>
- `curl -fsS $SERVER_URL/healthz` → <verbatim JSON>
- deployed sha: <sha> · ancestor of the integration branch HEAD (v3): <yes/no> · filter-path commits after it: <none | list>
- postgres: <desmon-db id> created <date> · expires <db_expires> · <WARNING if past/within 7 days>
- verified with network: <yes (stage3-deploy.log) | skipped (DESMON_SKIP_NET=1, reused log)>

## Observability

- rgt: `sessions/iter-NN.rgt.json` count <n>; `sessions/stage3.rgt.json`; `rgt sessions` summary: <n sessions, claude <n> / codex <n>>
- graph: `graph/iter-NN.GRAPH_REPORT.md` count <n>; `graph/final.GRAPH_REPORT.md`
- lanes: `lanes/` metadata; conflicts <n>; MERGE_RED <n>; CRASHED <n>; BLOCKED <n>
- worker-rule spot-check: <3 codex commits — sha: paths OK | violation list>

## Ponytail audit

<review lines over `git diff <BASE>..HEAD -- src tests` in PONYTAIL.md §2 format,
then `net: -<N> lines possible.` or `Lean already. Ship.`>

<audit lines over src/ in PONYTAIL.md §3 format, then
`net: -<N> lines, -<M> deps possible.` or `Lean already. Ship.`>

- dependencies added since <BASE>: <none | name@pin — rung <n> (task T<NN> Notes) | UNJUSTIFIED>

## Test integrity

<none | `tests/<file>`: it-count <base> → <head>; `rgt blame` step ids: <…>>

## Manual steps remaining

- <...>

## Known limitations

- <...>

## Audit trail

- prompts: .agentdoc/<TS>/prompts/
- sessions: .agentdoc/<TS>/sessions/ (dev-loop.md = one row per collect)
- plan snapshots: .agentdoc/<TS>/plans/
- lanes: .agentdoc/<TS>/lanes/ · graph: .agentdoc/<TS>/graph/
