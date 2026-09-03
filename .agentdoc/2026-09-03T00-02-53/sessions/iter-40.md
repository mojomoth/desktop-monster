# Session record — iter 40

- agent role: builder
- worker: claude
- lane: .worktrees/T44 (branch lane/T44)
- harness version: v2
- task: T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
- result: DONE
- commit: 9708404 (+ DEPLOYED_SHA fixup)
- graphify affected used: none (task Files were explicit; read src/main/net.ts, src/main/identity.ts, src/shared/api.ts directly)

## What I did

- Preconditions: `render whoami` → mojomoth (logged in), render CLI 2.26.0.
- `bash .harness/v2/loop/render-bootstrap.sh > /tmp/desmon-render.env` — created BOTH
  resources (neither existed): `SERVER_URL=https://desmon-server.onrender.com`,
  `SRV_ID=srv-dacd4l15efls73e0fbig`, `DB_ID=dpg-dacd4k2jnfac73c43llg-a`,
  `DB_CREATED=2026-09-03T01:50:08.492032Z`, `DB_EXPIRES=2026-10-03`.
- `src/shared/serverUrl.ts`: `export const SERVER_URL = 'https://desmon-server.onrender.com';`.
- AGENTS.md §Server: replaced the placeholder with `SERVER_URL=`, `RENDER_SERVICE_ID=`,
  `RENDER_POSTGRES_ID=`, `DB_CREATED=`, `DB_EXPIRES=`, `DEPLOYED_SHA=` lines.
- README: new "## Server / Leaderboard & PvP" + "### Free-tier caveats" sections only
  (identity `Knight-xxxx`, `npm run start:server`, `DESMON_SERVER_URL`, offline behaviour,
  `self-reported` accept-and-rank, 15-min sleep, 30-day Postgres expiry). No v1 string touched,
  so tests/packaging.test.ts (F27) keeps passing.
- `src/server/probe.ts`: reuses `createNetClient`/`toSnapshot` from src/main/net.ts — register
  `probe-<4hex>` → upload `{ bestIndex: 0, rebirths: 0, companions: [] }` → `leaderboard(token, 10)`
  → assert `me.rank >= 1` → print `{"playerId","rank"}` → exit 0/1. 90 s timeout for the free-dyno
  cold start. Never battles another player; the file contains no literal `pvp(`.
- `tests/deploy.test.ts` (7 tests): runProbe happy path + both rank failures against a fake
  NetClient whose battle method throws, `probeName`, the source guard, and the deployment facts
  in serverUrl.ts / AGENTS.md / README.md.
- Gates green → commit → `git push origin HEAD:main` (fast-forward) →
  `render deploys create "$SRV_ID" --wait --confirm` → `/healthz` `"ok":true` → probe → fixup
  commit setting `DEPLOYED_SHA=`.

## Files touched

- src/shared/serverUrl.ts
- src/server/probe.ts (new)
- tests/deploy.test.ts (new)
- AGENTS.md
- README.md
- .agentdoc/2026-09-03T00-02-53/sessions/iter-40.md

## Gate results

```
Test Files  30 passed (30)
     Tests  466 passed (466)
> desmon@0.1.0 lint
> eslint . --max-warnings 0
> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
GATES_EXIT=0

AC (hermetic, DESMON_SKIP_NET=1): AC_HERMETIC_EXIT=0
AC (live, no DESMON_SKIP_NET): AC_LIVE_EXIT=0
healthz: {"ok":true,"sha":"970840437a14f8b0c86008fee097ecf34e29c153"}
probe:   {"playerId":"52c5ffb9-1134-4ac3-96e3-3cadd52136e8","rank":1}
```

## Attempts & dead ends (what future iterations must NOT retry)

- The live AC failed twice with `curl: (56) ... 404` right after `render deploys create --wait`
  reported the deploy live: a brand-new free service's edge routing flaps between the new
  instance and `x-render-routing: no-server` for ~5 min. Nothing was wrong with the build
  (`render logs` showed `listening on :10000 store=pg sha=9708404…`). Do NOT redeploy or
  re-run the bootstrap for this — poll `/healthz` until it returns 200 several times in a
  row, then run the AC. `curl --retry` does not help: it never retries a 404.
- The service's FIRST auto-deploy (at creation, commit e4bbbe4, before the push) failed with
  `npm error Missing script: "start:server"` and shows as `update_failed` in
  `render deploys list`. It is superseded by the pushed deploy and needs no action.

- Exporting `runProbe` from a plain top-level script would have run the CLI on import and
  set `process.exitCode = 1` inside vitest. Guarded the entry point with
  `require.main === module` (CommonJS output) so the module is import-safe for tests.
