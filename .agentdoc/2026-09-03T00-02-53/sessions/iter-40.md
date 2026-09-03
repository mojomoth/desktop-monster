# Session record — iter 40

- agent role: builder
- worker: claude
- lane: .worktrees/T44 (branch lane/T44)
- harness version: v2
- task: T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
- result: DONE
- commit: <feat sha> (+ DEPLOYED_SHA fixup)
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
AC (live, no DESMON_SKIP_NET): <filled after the deploy>
```

## Attempts & dead ends (what future iterations must NOT retry)

- Exporting `runProbe` from a plain top-level script would have run the CLI on import and
  set `process.exitCode = 1` inside vitest. Guarded the entry point with
  `require.main === module` (CommonJS output) so the module is import-safe for tests.
