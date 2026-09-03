# Session record — iter 16

- agent role: builder
- worker: claude
- lane: .worktrees/T73 (branch lane/T73)
- harness version: v3
- task: T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
- result: DONE
- commit: 23cf0cf (source pin + push) and the follow-up commit recording the live facts
- graphify affected used: none (deploy/config task; the three Files were read directly)

## What I did

- Baked `SERVER_URL = 'https://desmon-server-v3.onrender.com'` into `src/shared/serverUrl.ts`
  (the `DESMON_SERVER_URL` runtime override is untouched).
- Rewrote AGENTS.md §Server for v3: `SERVER_URL=` (v3), `V2_SERVER_URL=` (the v2 service, kept
  for reference), `RENDER_SERVICE_ID=` (the v3 service), unchanged `RENDER_POSTGRES_ID=`/
  `DB_CREATED=`/`DB_EXPIRES=` (same shared `desmon-db`), `DEPLOYED_SHA=`, plus the v3
  bootstrap/deploy/verify commands and the branch-ordering caveat found below.
- Ran gates green, committed, then the single allowed `git push origin HEAD:v3` (23cf0cf; the
  branch did not exist on the remote before — this push created it).
- Provisioned with the documented command
  `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh`
  → `srv-dacmju6k1f9s73csi2v0`, branch `v3`, URL `https://desmon-server-v3.onrender.com`,
  reusing `desmon-db` (`dpg-dacd4k2jnfac73c43llg-a`, expires 2026-10-03).
- `render deploys create srv-dacmju6k1f9s73csi2v0 --wait --confirm` → `status: live`,
  commit `23cf0cf8ab233332433e7345fa5bc4a2a3b3c75e`.
- Verified live: `/healthz` → `{"ok":true,"sha":"23cf0cf8ab233332433e7345fa5bc4a2a3b3c75e"}`
  (the pushed sha) and `node dist/electron/server/probe.js https://desmon-server-v3.onrender.com`
  → `{"playerId":"05bae1e9-5a1c-4378-82e8-4d58c04860c9","rank":5}`.
- `src/server/probe.ts` needed no change: it already registers → uploads → reads the leaderboard
  and never calls `pvp(` or `reclaim(` (its SOURCE GUARD comment already states this).
- Recorded `server_url`/`db_expires` in `.agentdoc/2026-09-03T13-22-02/meta.json`.
- README untouched on purpose — its `desmon-server-v3` mention belongs to T72 (lane disjointness).

## Files touched

- src/shared/serverUrl.ts
- AGENTS.md
- .agentdoc/2026-09-03T13-22-02/meta.json
- .agentdoc/2026-09-03T13-22-02/sessions/iter-16.md

## Gate results

```
 Test Files  33 passed (33)
      Tests  564 passed (564)

> desmon@0.2.0 lint
> eslint . --max-warnings 0

> desmon@0.2.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
GATES_EXIT=0
```

AC (network half included, `DESMON_SKIP_NET` unset):

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
{"ok":true,"sha":"23cf0cf8ab233332433e7345fa5bc4a2a3b3c75e"}
{"playerId":"...","rank":5}
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 …/render-bootstrap.sh` BEFORE the push →
  `Error: received response code 400: branch v3 does not exist in the repository`. Render only
  accepts a branch it can already see, so the bootstrap must run AFTER `git push origin HEAD:v3`.
  The task's step order (bootstrap → commit → push) is therefore impossible on the first v3 deploy.
- `render services update <srv-id> --branch v3 --confirm` (to retarget a service created from
  `main`) → `Error: received response code 500: internal server error`, 4 times, also with
  `--repo` added. `services update` cannot fix the branch; add it to TOOLING §6's limitations
  next to the missing `--env-var`. Recovery that worked: `render services delete <srv-id>
  --confirm` and re-run the bootstrap with `DESMON_BRANCH=v3` once the branch is on the remote
  (the service is stateless — all data lives in the shared `desmon-db`, which was never touched).
- Consequence for the ordering: the first commit had to carry an interim
  `RENDER_SERVICE_ID=`/`DEPLOYED_SHA=pending`, both replaced with the live values in the
  follow-up commit (the sanctioned T44/T51 pattern — AGENTS.md is not a build-filter path, so
  the follow-up commit cannot make the deployed sha stale).
