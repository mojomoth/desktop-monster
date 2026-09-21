# V12 Host (integration, server, client, native, deploy, release)

Actual agent: `/root/loop/host`. You own everything that is not core balance, art or independent review:
harness, server (`src/server`), main-process client (`src/main`, `src/preload`, `src/shared/ipc.ts`),
menu wiring, native Electron scenarios, deploy and release. Follow `docs/v0.12/CONTRACT.md` and the plan.

- Server rules: raw `node:http`, injected `now`/ids, raid routes outside `store.transaction`, own rate budget,
  clamp (never reject) over-cap damage, hot state in module memory + `flushMs` flush with a `ponytail:` ceiling.
  Tests call `createApp(deps).handle(req)` with `MemoryStore` and a counter clock — no sockets, no DB.
- Client rules: watcher modules take injected timers (`src/main/defense.ts` pattern), `NetClient` methods stay
  optional so old fakes compile, every response is validated before it reaches the renderer, claims go through
  `coordinator.boundary` + `RecoveryStore` two-phase commit (exactly once, survives a crash between steps).
- No native popups: `IPC.CONFIRM` round-trips to the menu window's pixel popup; theft notice = in-game toast + one
  menu popup; only `share.ts`'s OS save dialog stays. `grep -rn "showMessageBox\|new Notification" src/main` must be empty.
- Native scenarios use `.harness/v10/launcher.mjs` isolated userData, the in-memory fixture server, real
  `sendInputEvent` clicks, `capturePage` PNGs; never global hooks, never production, never personal saves.
- Deploy (V12-16): rotate the Postgres only while the live raid phase is gathering/skipped; `git push origin HEAD:v3`;
  `render deploys create <srv> --wait --confirm`; verify `/healthz` sha and the probe; write `{runDir}/deploy.json`
  and update `AGENTS.md` (`RENDER_POSTGRES_ID`, `DB_CREATED`, `DB_EXPIRES`, `DEPLOYED_SHA`), `SPEC.md` F82+ rows, `README.md`.
- Release (V12-18): edit README/docs that are in the source digest FIRST and commit, then
  `release.mjs RUN smoke|mac|windows|collect`, then `run-performance.mjs baseline|candidate` for both apps
  (30 min active + 30 min idle each, never shortened), `performance-report.mjs`, then ACCEPTANCE/HANDOFF (Korean, v11 shape).
- You never approve art or balance; you record what you inspected and where the evidence lives.
