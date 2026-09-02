# SPEC — Desktop Monster (DesMon)
<!-- RULES: no TBDs. Every feature row must have an AC a shell can decide.
     Ambiguities become numbered Assumptions with rationale.
     Worker column = claude | codex hint by the plan-grammar file-set rule
     (codex iff every file the feature touches is in src/renderer/sprites/**,
     src/renderer/{anim,hud,effects}.ts, static/{style,menu}.css and their
     tests); the Planner may override only toward claude, with a Notes line.
     codex-hinted rows get vitest/grep/test -e ACs only (never smoke).
     No external network or hostnames in a feature AC; loopback 127.0.0.1 is
     allowed only for the server-scaffold boot proof (F43 / T22). The only
     external network check is the ## Deployment row, guarded by
     DESMON_SKIP_NET=1. -->

## Summary

<2–4 sentences: what the product is>

## Assumptions

1. <assumption> — <rationale>

## Features

| ID | Name | Behavior | Worker | AC (pass = what) |
|---|---|---|---|---|
| F01 | <name> | <observable behavior> | claude | `<runnable command>` exits 0 / test `<file> :: <name>` passes |

## Server / API

<`SERVER_URL` is `''` (offline) until the deploy task fills it; `SMOKE=1` forces offline.>

| Endpoint | Method | Request | Response | Auth | AC |
|---|---|---|---|---|---|
| `/healthz` | GET | — | `200 {"ok":true,"sha":"<RENDER_GIT_COMMIT or dev>"}` (no DB access) | none | test `tests/server.test.ts :: <name>` passes (handler called directly, injected store + now, no sockets) |

## Deployment

- Host: Render free tier, region oregon; web service `desmon-server`
  (`npm ci --include=dev --ignore-scripts && npm run build`, start
  `npm run start:server`, health path `/healthz`), Postgres `desmon-db`.
- `SERVER_URL=<set by render-bootstrap>` — placeholder until the deploy task
  runs `.harness/<HV>/loop/render-bootstrap.sh`; recorded in AGENTS.md §Server,
  `src/shared/serverUrl.ts`, and `.agentdoc/<TS>/meta.json` (`server_url`).
- Health contract: `GET $SERVER_URL/healthz` → `200 {"ok":true,"sha":"<sha>"}`
  where `<sha>` is an ancestor of `main` and no commit after it touches the
  build-filter paths (`src/server/** src/core/** src/shared/** package.json
  package-lock.json tsconfig.main.json .node-version`).
- Free-tier facts: service sleeps after 15 min idle (~60 s cold start) — the
  client uses `AbortSignal.timeout(5000)` and never throws; free Postgres
  expires 30 days after creation (`db_expires` in meta.json) — the server
  runs idempotent DDL on boot so a recreated DB is a one-command recovery.
- Node pinned by `.node-version` = `20.12.2`.
- AC (stage 3 only, once with network): `[ -n "$DESMON_SKIP_NET" ] || curl -fsS --retry 5 --retry-delay 30 --max-time 90 "$SERVER_URL/healthz"` → exit 0 and the sha rule above.

## Input Abstraction (mandatory)

- `InputDriver` interface: emits `{ source: 'keyboard' | 'mouse' }` events.
- `SimulatedInputDriver`: used by ALL tests and by `npm run smoke`.
- Global hook path (uiohook-napi): production only, behind an Accessibility
  permission check, with automatic fallback to window-focused input.
- Injected clock: no `Date.now`/timers in core or server logic. The engine
  advances by `engine.tick(dt)` (engine clock: companions, fever windows);
  the server takes `now` as an injected function (cooldowns, rate limits).
  Tests advance time explicitly; wall-clock time is never observed.
- Injected RNG (`mulberry32(seed)`), injected store (`MemoryStore`) and
  injected `fetch` for the net client — tests never open sockets, never reach
  the network, never touch a real DB.

## Non-Goals

- <explicit exclusions: keep no auto-update, no Windows/Linux builds executed,
  no localization, no code signing, no CI; networking ONLY via
  `src/main/net.ts` (client) and `src/server/**` (server)>

## Manual Verification Appendix

<the ONLY place for non-automatable checks (real global hooks after the
Accessibility grant, visual quality, live leaderboard/PvP against the deployed
server). Each entry: steps + expected observation.>
