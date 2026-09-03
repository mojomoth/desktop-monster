# Handoff — Desktop Monster

- status: COMPLETE
- session: .agentdoc/2026-09-03T00-02-53
- harness version: v2
- iterations used: 48 (lanes: 3; claude 41 / codex 7) — run 1 = iters 01–15 (exit 3, environment only), run 2 = iters 16–48 (exit 0, converged); nested_claude 1
- validator verdict: CONVERGED — every check of the v2 Validator/Packer charter re-executed on main (`sessions/stage3-eval.md`); no task flipped.

## What was built (vs SPEC)

All 58 feature ACs, the 10 `## Server / API` rows and the `## Deployment` AC were executed literally by the validator (`sessions/stage3-spec-sweep.log`, 69/69 rc=0).

- F01 ✅ Frozen command contract — `npm ci && npm test && npm run lint && npm run typecheck` exit 0 (cold install)
- F02 ✅ Dual-target build — dist/electron + dist/web emitted
- F03 ✅ Pinned dependency matrix — electron 39.8.10 / uiohook-napi 1.5.5 / vite 6.4.3
- F04 ✅ Progression formulas — exact 10/20/40/163, xpToNext 20/28/39/54
- F05 ✅ Monster catalog & tier scaling
- F06 ✅ Deterministic RNG & crits
- F07 ✅ Attack engine event sequence
- F08 ✅ XP & level-up
- F09 ✅ Loot drops
- F10 ✅ Save schema & tolerant parsing (+ `upgradeSave`)
- F11 ✅ Engine resume from save
- F12 ✅ InputDriver abstraction — no uiohook in tests/src/core
- F13 ✅ Guarded global hook (production only)
- F14 ✅ Window-focused fallback input
- F15 ✅ Transparent always-on-top overlay
- F16 ✅ Accessory-app lifecycle
- F17 ✅ Preload bridge & IPC security
- F18 ✅ Smoke mode — SMOKE_OK
- F19 ✅ Sprites-as-code, zero binary assets
- F20 ✅ Animation state machines
- F21 ✅ Canvas scene & HUD boot render
- F22 ✅ Persistence wiring
- F23 ✅ Tray icon & menu (title `DesMon v0.2.0`, Collection & Battle item)
- F24 ✅ WebAudio blips (+ feverStart)
- F25 ✅ Unsigned macOS packaging — DesMon-0.2.0-arm64.dmg + DesMon.app
- F26 ✅ Packaging config safety
- F27 ✅ README operator docs
- F28 ✅ A–Z number format (`src/core/bignum.ts`)
- F29 ✅ SaveFileV2 + v1 migration
- F30 ✅ Unbounded HP and damage (bigint end to end)
- F31 ✅ Boss cadence (every 8th, 5×)
- F32 ✅ Companion collection lifecycle (consume/fuse/reincarnate/sacrifice/rebirth, cap 30)
- F33 ✅ Boss capture and `engine.apply` (35 %)
- F34 ✅ Fever mode (20 inputs / 3 s → 5 s ×3, 10 s cooldown, engine clock only)
- F35 ✅ Companion volley (1000 ms, 3 strongest)
- F36 ✅ Renderer v2 wiring and presentation
- F37 ✅ PvP resolution (core, shared with the server)
- F38 ✅ Pixel font A–Z + . : - + %
- F39 ✅ Effect presets (deterministic, pooled)
- F40 ✅ Boss and companion art helpers
- F41 ✅ Banner text and fever aura
- F42 ✅ Collection window theme (DB16 CSS)
- F43 ✅ Server scaffold and healthz (node:http adapter, 64 KB body cap, x-forwarded-for)
- F44 ✅ Server players/snapshot/leaderboard (rate limit 60/min, 401/404/500)
- F45 ✅ Server PvP (neighbour or Training Dummy, 60 s cooldown)
- F46 ✅ PgStore (pg 8.23.0 devDependency, hand-written pg.d.ts, idempotent DDL)
- F47 ✅ Identity and wire types
- F48 ✅ Net client (5000 ms timeout, never throws, 401 re-register once)
- F49 ✅ Net IPC and offline SMOKE
- F50 ✅ Render deployment (SERVER_URL filled, probe.js)
- F51 ✅ Menu IPC relay
- F52 ✅ Collection window and tray item
- F53 ✅ Game window applies actions (VICTORY/DEFEAT/rebirth)
- F54 ✅ Menu roster UI
- F55 ✅ Menu ranking and battle
- F56 ✅ Deploy re-verify (DEPLOYED_SHA ancestry + build-filter paths)
- F57 ✅ Version 0.2.0 and docs (M9–M14 in SPEC)
- F58 ✅ Packaged 0.2.0 smoke (no pg / no server build inside the .app)
- Server / API ✅ `/healthz`, `POST /v1/players`, `PUT /v1/snapshot`, `GET /v1/leaderboard`, `POST /v1/pvp`, PvP cooldown, Rate limit, Body cap, Unauthorized, Not found / internal — all test titles present and passing
- Deployment AC ✅ (network) — healthz ok, sha ancestor, filter paths clean, `probe.js` → `{"playerId":"04dd8a14-…","rank":1}`

## How to run

- Dev: `npm ci && npm start` (builds, then launches Electron). First launch: macOS → System Settings → Privacy & Security → Accessibility → grant **"Electron"** (`node_modules/electron/dist/Electron.app`); without it the app stays in window-focused fallback input (tray shows the mode).
- Packaged: open `release/mac-arm64/DesMon.app` (or mount `release/DesMon-0.2.0-arm64.dmg`). Unsigned: Gatekeeper → right-click → Open, or Privacy & Security → **"Open Anyway"**. Grant Accessibility to **"DesMon"** (separate from the dev grant).
- Local server: `npm run build && npm run start:server` (reads `PORT`, default 10000; without `DATABASE_URL` it uses the in-memory store and prints one warning). Point the app at it with `DESMON_SERVER_URL=http://127.0.0.1:10000 npm start`.
- Gates: `npm test && npm run lint && npm run typecheck`; smoke: `npm run smoke` (headful, prints `SMOKE_OK`, exits by itself).

## Artifacts

- `release/mac-arm64/DesMon.app` (arm64, unsigned)
- `release/DesMon-0.2.0-arm64.dmg` (+ `.blockmap`, `latest-mac.yml`)
- `dist/electron/server/index.js` (Render start command; excluded from the .app), `dist/electron/server/probe.js`
- Validator logs: `.agentdoc/2026-09-03T00-02-53/sessions/stage3-{gates,spotcheck,spec-sweep,smoke-package,deploy}.log`

## Gate evidence

```
rm -rf node_modules && npm ci && npm test && npm run lint && npm run typecheck
  added 467 packages, and audited 468 packages in 4s
  Test Files  31 passed (31)   Tests  501 passed (501)
  eslint . --max-warnings 0    (clean)
  tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (clean)
  GATES_RC=0
npm run smoke                                  rc=0  SMOKE_OK
PORT=50576 node dist/electron/server/index.js  curl /healthz → {"ok":true,"sha":"dev"}  store=memory
npm run package                                rc=0  release/mac-arm64/DesMon.app + release/DesMon-0.2.0-arm64.dmg
SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon   rc=0  SMOKE_OK
plan spot-check (15 ACs)                       15/15 rc=0
SPEC sweep (58 features + 10 API rows + Deployment AC)   69/69 rc=0
```

## Deployment

- service: `srv-dacd4l15efls73e0fbig` (`desmon-server`, Render free tier, oregon) · url: https://desmon-server.onrender.com
- `curl -fsS $SERVER_URL/healthz` → `{"ok":true,"sha":"7a81b346439d8a6d9fe3fe1d0fadd8cbd40e4f4c"}`
- deployed sha: 7a81b346439d8a6d9fe3fe1d0fadd8cbd40e4f4c · ancestor of main: yes (`git merge-base --is-ancestor` rc=0) · filter-path commits after it: none (`git log 7a81b34..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version` empty) · equals AGENTS.md `DEPLOYED_SHA`
- postgres: `dpg-dacd4k2jnfac73c43llg-a` (`desmon-db`) created 2026-09-03T01:50:08Z · expires 2026-10-03 (30 days out — no warning today, 2026-09-03)
- verified with network: yes (`sessions/stage3-deploy.log`; plus the SPEC Deployment AC incl. `probe.js` → rank 1). No redeploy was needed; the validator made no push.
- note: `meta.json` `server_url` / `db_expires` still hold the placeholder / empty string — the orchestrator finalizes meta.json; AGENTS.md §Server is the filled source (`SERVER_URL`, `RENDER_SERVICE_ID`, `RENDER_POSTGRES_ID`, `DB_CREATED`, `DB_EXPIRES=2026-10-03`, `DEPLOYED_SHA`).

## Observability

- rgt: `sessions/iter-NN.rgt.json` count 48; `sessions/stage3.rgt.json` (1.4 MB, `rgt log --json -n 5000`); `rgt sessions` summary: 6 sessions — 5 claude_code (2 bypassPermissions orchestrator sessions, 3 short default-mode probes) / 1 codex_cli probe (`sessions/stage3.rgt-sessions.txt`). Codex lane activity is captured via `.codex/config.toml` hooks only where the sandbox allowed it (capture caveat below).
- graph: `graph/iter-NN.GRAPH_REPORT.md` count 48; `graph/final.GRAPH_REPORT.md` (graphify 0.8.40, refreshed by the validator)
- lanes: `lanes/` empty at stage 3 (all `.pid`/`.rc` cleaned); conflicts 0; MERGE_RED 9 (all run 1); CRASHED 7 (6 in run 1 + T27 iter 27 in run 2, retried DONE); BLOCKED 0; SPLIT 0
- run 1 (iters 01–15) failed for environment reasons only: (A) `.gitignore` used `node_modules/` / `graphify-out/` (trailing slash = directories only), so lane commits tracked the lanes' node_modules/graphify-out SYMLINKS; merging them into main replaced main's real node_modules → MERGE_RED ×9 although every worker's own gates were green (fix: commit b09df3d drops the trailing slashes; `npm ci` restored node_modules); (B) `claude -p` HTTP 429 "session limit" → CRASHED ×6 → exit 3. Run 2 (iters 16–48, MAX_ITER 65) converged: 33 iterations for 32 tasks. The kept branches `lane/T22-red-01/05`, `lane/T23-red-02/04/06/07/09`, `lane/T31-red-03/10` (green-in-lane work) and `lane/T22-crash-08/12/14`, `lane/T23-crash-11/13/15`, `lane/T27-crash-27` (empty crash runs) are evidence and were deliberately left in place.
- worker-rule spot-check (all 7 `[codex]` commits since BASE): b161689 T34 (hud.ts, sprites/aura.ts, sprites/index.ts, tests/renderer+sprites) OK · 94ee707 T33 (sprites/boss.ts, sprites/companion.ts, sprites/index.ts, tests/sprites) OK · b0a9b22 T32 (effects.ts, tests/effects) OK · a4451f8 T35 (static/menu.css) OK · 58aa2aa T31 (sprites/font.ts, tests/sprites) OK · eba44a1 + 4076291 T31 run-1 duplicates: graphics paths PLUS the `graphify-out` / `node_modules` symlink entries from bug (A) — their merges were reverted on main (e98cc0b, e43f3cd); neither touched package.json/package-lock.json → violation recorded, verdict unchanged. No codex commit added a dependency.

## Ponytail audit

Review of `git diff aca9faf..HEAD -- src tests` (PONYTAIL.md §2; findings recorded, not applied):

- `src/core/collection.ts:L51-53: delete: CollectionEvent duplicates the rebirth/pvpResolved members already in GameEvent (types.ts L66-67); no importer outside the file. Extract<GameEvent, {type:'rebirth'|'pvpResolved'}>, 1 line.`
- `src/menu/view.ts:L37-47: shrink: idNum + the power/id comparator re-implement collection.ts L32-42. Export byPower from core and .sort(byPower), -8 lines.`
- `src/core/save.ts:L11: delete: private ROSTER_CAP copy of collection.ts's. Move the constant to save.ts and re-export it from collection.ts (collection already imports save types), -1 line.`
- `src/main/net.ts:L84-86: shrink: two-branch header object. { 'content-type': 'application/json', ...(token !== null && { authorization: \`Bearer ${token}\` }) }, -3 lines.`
- `src/server/probe.ts:L17-20: yagni: exported ProbeResult interface with one producer and no importer. Inline the return type, -4 lines.`
- `src/main/menuWindow.ts:L13-16: delete: getMenuWindow "(used by tests)" has no caller in src or tests. Nothing replaces it, -4 lines.`
- `src/renderer/effects.ts:L142-143: shrink: double-modulo guards a negative seed that no caller passes (game.ts passes 0/1/positive). (k + seed) % n, -2 lines.`
- `src/menu/view.ts:L79-83: shrink: guard + filter + map. cs.some(c => c.id === foodId) ? cs.filter(c => c.id !== foodId).map(c => c.id) : [], -2 lines.`
- `src/core/engine.ts:L58-62: yagni: COLD_FEVER placeholder stored in state only so getState() can overwrite it. Omit fever from the stored GameState and add it in getState(), -3 lines.`

net: -28 lines possible.

Audit of `src/` (PONYTAIL.md §3, biggest cut first):

- `shrink: the strongest-first comparator lives in both core/collection.ts and menu/view.ts. One exported byPower. -8 lines. [src/menu/view.ts]`
- `delete: CollectionEvent/CollectionResult exports nobody imports; CollectionEvent duplicates GameEvent members. Extract<GameEvent, …>. -5 lines. [src/core/collection.ts]`
- `delete: getMenuWindow — no caller anywhere. Nothing. -4 lines. [src/main/menuWindow.ts]`
- `yagni: ProbeResult interface, one producer. Inline. -4 lines. [src/server/probe.ts]`
- `native: vite@6.4.3 pinned as a devDependency but no script or config imports it (vitest brings its own). Drop the pin — BLOCKED by SPEC F03, which mandates the pin; needs a SPEC amendment first. -1 dep. [package.json]`
- `delete: CORE_VERSION = '0.1.0' — stale value, no importer. Nothing. -1 line. [src/core/index.ts]`
- `delete: 6 exported layout constants (SLASH_FRAME, DROP_LAND_X, DROP_STAGGER_PX, DROP_TARGET_X, DROP_TARGET_Y, SWORD_TIP_X/Y) with no importer in src or tests. Drop the export keyword. 0 lines. [src/renderer/game.ts]`
- `shrink: private ROSTER_CAP copy. Import it. -1 line. [src/core/save.ts]`
- Exports that exist only for tests (audio *Like interfaces, tray labels, window constants, identity helpers) are the injection seams the deterministic-test rule requires — not flagged.

net: -23 lines, -1 deps possible (the dep cut is SPEC-blocked).

- dependencies added since aca9faf: `pg@8.23.0` (devDependency) — pre-approved; rung 5 (task T41 Notes, IMPLEMENTATION_PLAN.md L374–375: "no stdlib Postgres client"). `@types/pg`: absent (hand-written `src/server/pg.d.ts`, 3 members). No other additions; `uiohook-napi@1.5.5` remains the only runtime dependency.

## Test integrity

none — it-count per file at BASE → HEAD: anim 14→14, audio 13→15, drag 7→7, engine 16→26, formulas 10→12, fsm 12→12, globalInput 16→16, input 9→9, ipc 12→21, loot 11→11, packaging 11→14, persistence 10→10, renderer 51→68, rendererInput 7→7, save 9→11, scaffold 1→1, sprites 24→29, tray 17→22, window 9→10 (no decrease; no `rgt blame` required). New test files since BASE: bignum, collection, deploy, effects, fever, identity, menu, net, server/{app,http,pgStore,pvp}. Total 31 files / 501 tests.

## Manual steps remaining

- Accessibility grant (cannot be scripted): dev = "Electron", packaged = "DesMon" — System Settings → Privacy & Security → Accessibility. Restart the app after granting.
- Gatekeeper: the .app/.dmg is unsigned and un-notarized → right-click → Open, or "Open Anyway" in Privacy & Security.
- SPEC §Manual Verification Appendix M1–M8 (overlay visuals, drag, tray, audio, save round-trip) and M9–M14 against the live server (https://desmon-server.onrender.com): rename in the Collection & Battle window, leaderboard after a boss kill, PvP vs Training Dummy / neighbour, cooldown countdown, offline behaviour, stolen-companion removal on next upload. Expect ~60 s cold start after 15 min idle (first click may show "Offline"; retry).
- DB expiry: `desmon-db` expires 2026-10-03 (14-day grace, no backups). To recreate: `.harness/v2/loop/render-bootstrap.sh` (idempotent by name), then update AGENTS.md §Server (`DB_CREATED`/`DB_EXPIRES`) — `render services update` cannot rotate `DATABASE_URL`; use the dashboard env edit or recreate the service. The server runs idempotent DDL on boot; clients get 401 and re-register.
- Orchestrator: finalize `.agentdoc/2026-09-03T00-02-53/meta.json` (`server_url`, `db_expires`, `ended`, `stages`, `outcome`) and make the session's single `git push origin main`.
- Optional: apply the ponytail findings above (-28 lines) in a follow-up task; the vite pin removal needs a SPEC F03 amendment.

## Known limitations

- Render free tier: the web service sleeps after 15 min idle (~60 s cold start > `NET_TIMEOUT_MS = 5000`) — the first leaderboard/PvP click after idle may report `network`/Offline; the app is offline-first and never blocks on the server.
- Free Postgres expires 30 days after creation (2026-10-03); identities and the board are disposable by design.
- Leaderboard stats are self-reported (accept-and-rank); only the PvP verdict and roster moves are server-authoritative.
- Codex capture caveat: codex lanes run sandboxed (no network/git/Electron), so `rgt` captures their activity only through the orchestrator's `[codex]` commits and `sessions/iter-NN.codex.jsonl`; their steps are not attributable per file the way claude lanes are.
- PvP roster moves are three store writes without a transaction (`ponytail:` note in `src/server/app.ts`); the per-player 60 s cooldown on one instance makes a double-steal unreachable in practice.
- Global input needs the Accessibility grant; without it the app runs in window-focused fallback mode (by design).

## Audit trail

- prompts: .agentdoc/2026-09-03T00-02-53/prompts/ (000-user-original, 010-spec-clarifier, 020-planner, 100-builder-iter-NN ×41, 110-codex-iter-NN ×7, 900-validator-packer)
- sessions: .agentdoc/2026-09-03T00-02-53/sessions/ (dev-loop.md = one row per collect; stage1-plan.md; stage3-eval.md = this validation; stage3-*.log)
- plan snapshots: .agentdoc/2026-09-03T00-02-53/plans/ (IMPLEMENTATION_PLAN.iter-01…48.md)
- lanes: .agentdoc/2026-09-03T00-02-53/lanes/ · graph: .agentdoc/2026-09-03T00-02-53/graph/ (iter-01…48 + final)
