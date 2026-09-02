# Lane T22 — Builder (iteration 14)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T22
"Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T22 (branch `lane/T22`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T22. The main checkout (two directories up) is off
  limits. Never run `git push`, `git checkout main`, `git worktree`,
  `git merge`, `git rebase`.
- Never edit `IMPLEMENTATION_PLAN.md`; never edit `SPEC.md` unless it is in
  your task's `Files:`. The orchestrator writes the plan from your JSON report.
- One task only. Do not read the whole plan — your block is below; the open
  headings are context.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/v2/agents/20-builder.md` — your charter; its hard rules bind you.
3. Your task block and the SPEC rows below.
4. `.harness/v2/reference/GAME_DESIGN_V2.md`, `SERVER_ARCHITECTURE.md`,
   `GAME_ARCHITECTURE.md` — ONLY the sections your task cites.
5. Any file in `.agentdoc/2026-09-03T00-02-53/sessions/` whose name or text mentions
   T22 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
- AC: `npx vitest run tests/server/http.test.ts tests/window.test.ts && grep -q 'rejects bodies over 65536 bytes with 413 payload_too_large' tests/server/http.test.ts && grep -q 'rejects malformed JSON with 400 bad_request' tests/server/http.test.ts && grep -q 'takes the client ip from the first x-forwarded-for entry' tests/server/http.test.ts && grep -q 'answers GET /healthz with ok and the RENDER_GIT_COMMIT sha without touching the handler' tests/server/http.test.ts && grep -q '"src/server"' tsconfig.main.json && test "$(cat .node-version)" = 20.12.2 && node -e "const p=require('./package.json');process.exit(p.scripts['start:server']==='node dist/electron/server/index.js'&&p.build.files.includes('!dist/electron/server/**')&&p.build.files.includes('dist/**/*')?0:1)" && grep -q 'RENDER_GIT_COMMIT' src/server/http.ts && grep -q 'x-forwarded-for' src/server/http.ts && npm run build && test -f dist/electron/server/index.js && (PORT=47831 node dist/electron/server/index.js & P=$!; R=1; for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -sf -o /tmp/desmon-healthz.json http://127.0.0.1:47831/healthz && grep -q '"ok":true' /tmp/desmon-healthz.json && R=0 && break; done; kill $P; exit $R) && grep -q "desmon-smoke-" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts` → exit 0
- Deps: none
- Worker: claude
- Files: src/server/index.ts, src/server/http.ts, tsconfig.main.json, package.json, .node-version, tests/server/http.test.ts, src/main/index.ts, tests/window.test.ts
- Notes: SPEC F43 + `## Server / API` rows healthz and body cap; SERVER_ARCHITECTURE §1/§3/§4 (http.ts contract verbatim). FIRST new task; 8 files by design (T01-style exception: the build wiring must land in one iteration, every server file is a tiny stub). No pg, no MemoryStore, no createApp, no tsconfig.test.json change, does NOT run render-bootstrap.sh. http.ts: `ApiRequest { method, path, query, auth, body, ip }`, `ApiResponse`, `ApiHandler`, `BODY_LIMIT = 65_536`, `clientIp(headers, remoteAddress)` = first `x-forwarded-for` entry (trimmed) else socket address, `createRequestListener(handle)` answers `GET /healthz` ITSELF with `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }` (key order ok → sha; the handler is never called — pin it with a throwing handler in the test), parses `?query` via `new URL(url, 'http://x')`, reads the bearer from `authorization`, buffers the body counting chunks (over the cap → 413 `payload_too_large` + `req.destroy()`; `JSON.parse` failure → 400 `bad_request`; empty body → `null`), `application/json` on every response. index.ts: stub handler `async () => ({ status: 404, body: { error: 'not_found' } })` (T39 swaps in createApp), `PORT` default 10000, host `0.0.0.0`, one boot line `[desmon-server] listening on :<port> store=memory sha=<sha>`. tsconfig.main.json `include` += `"src/server"` (CJS node16, `types: ["node"]` — typecheck/lint/build cover it with no script change). package.json: `scripts["start:server"] = "node dist/electron/server/index.js"` (the only new script name); `build.files` becomes `["dist/**/*", "static/**/*", "!dist/electron/server/**"]` (APPEND — tests/packaging.test.ts pins `dist/**/*`). `.node-version` = `20.12.2` exactly. SMOKE isolation (Assumption 40): in src/main/index.ts, when `process.env.SMOKE` is set, call `app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "desmon-smoke-")))` AFTER `app.setName('DesMon')` and BEFORE `app.requestSingleInstanceLock()`; keep the bare `registerIpcHandlers()` literal in the non-smoke branch (tests/ipc.test.ts `toContain('registerIpcHandlers()')`) and every T13/T17/T21 index.ts literal (`new SimulatedInputDriver()`, `SMOKE_ATTACK_COUNT = 3`, `20_000`, `app.dock?.hide()` before `createOverlayWindow()`). tests/window.test.ts: EXTEND the `accessory lifecycle` describe with one source pin that `desmon-smoke-` appears before `requestSingleInstanceLock()` (the `it(` count grows from 9). Test titles verbatim: "rejects bodies over 65536 bytes with 413 payload_too_large", "rejects malformed JSON with 400 bad_request", "takes the client ip from the first x-forwarded-for entry", "answers GET /healthz with ok and the RENDER_GIT_COMMIT sha without touching the handler". Tests drive the listener with a `node:stream` `PassThrough` carrying `method/url/headers/socket` + a recording response object — NO sockets, NO timers. The loopback `127.0.0.1:47831` boot in the AC is the runtime proof and the ONLY loopback check allowed in any builder AC (F43). vitest already includes `tests/**/*.test.ts`, so `tests/server/` needs no config. Title keeps the word `server`.
- Notes (iter 01, claude): MERGE_RED: merge reverted (gates=fail smoke=skipped); Added src/server/http.ts (ApiRequest/ApiResponse/ApiHandler, BODY_LIMIT 65536, clientIp x-forwarded-for, createRequestListener answering GET /healthz itself, 413/400/null body, application/json) + src/server/index.ts (404 stub, PORT 10000, 0.0.0.0, one boot line); tsconfig.main.json include, start:server, build.files += !dist/electron/server/**, .node-version 20.12.2; tests/server/http.test.ts (9 tests, PassThrough, no sockets); SMOKE desmon-smoke- userData before requestSingleInstanceLock + window.test.ts pin (it( 9->10). Dead end: node_modules symlink targets a non-existent dir in the main c
- Notes (iter 05, claude): MERGE_RED: merge reverted (gates=fail smoke=skipped); Added src/server/http.ts (ApiRequest/ApiResponse/ApiHandler, BODY_LIMIT 65536, clientIp from first x-forwarded-for entry, createRequestListener answering GET /healthz itself, 413+destroy/400/null body, application/json) and src/server/index.ts (404 stub, PORT 10000, 0.0.0.0, one boot line); tsconfig.main.json include += src/server; start:server; build.files += !dist/electron/server/**; .node-version 20.12.2; tests/server/http.test.ts (9 tests, PassThrough, no sockets); SMOKE userData isolation before requestSingleInstanceLock + window.test.ts pin (it( 9->10). Gates + AC verbatim exit 0; npm ru
- Notes (iter 08, claude): CRASHED: no status JSON in .agentdoc/2026-09-03T00-02-53/sessions/iter-08.log
- Notes (iter 12, claude): CRASHED: no status JSON in .agentdoc/2026-09-03T00-02-53/sessions/iter-12.log

Open task headings (context only — do NOT work on them):

### [~] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
### [ ] T23 — Core bignum: A–Z suffix format, ratio, bigField
### [ ] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
### [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T31 — Pixel font: full A–Z plus . : - + % glyphs
### [ ] T32 — Effects module: data-driven presets on the particle pool, per-species hit effects
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T35 — Menu window pixel theme: DB16 CSS, pixelated species canvases
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [ ] T38 — Client identity.json, shared API wire types, serverUrl constant
### [ ] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T42 — Main net client + net session: injected fetch, 5000 ms timeout, never throws, 401 re-register
### [ ] T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [ ] T45 — Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync
### [ ] T46 — Menu window + tray item "Collection & Battle…"
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F43 | Server scaffold and healthz | `src/server/http.ts`: `ApiRequest { method, path, query, auth, body, ip }`, `ApiResponse`, `ApiHandler`, `BODY_LIMIT = 65_536`, `clientIp(headers, remoteAddress)` (first `x-forwarded-for` entry else socket address), `createRequestListener(handle)` answering `GET /healthz` itself with `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }` (never touching any store), 413 `payload_too_large` + `req.destroy()` over the cap, 400 `bad_request` on bad JSON, empty body → `null`, `application/json` everywhere; `src/server/index.ts` boots on `PORT` (default 10000) host `0.0.0.0` with one log line (stub 404 handler until F44); `tsconfig.main.json` include += `src/server`; `scripts["start:server"] = "node dist/electron/server/index.js"`; `build.files` += `!dist/electron/server/**`; `.node-version` = `20.12.2`; SMOKE isolation: when `process.env.SMOKE` is set, `src/main/index.ts` calls `app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "desmon-smoke-")))` BEFORE `app.requestSingleInstanceLock()` (Assumption 40) while the bare `registerIpcHandlers()` literal stays; `tests/window.test.ts` gains a source pin for that order; tests drive the listener with `PassThrough` streams — no sockets | claude | `npx vitest run tests/server/http.test.ts tests/window.test.ts && grep -q 'rejects bodies over 65536 bytes with 413 payload_too_large' tests/server/http.test.ts && grep -q 'rejects malformed JSON with 400 bad_request' tests/server/http.test.ts && grep -q 'takes the client ip from the first x-forwarded-for entry' tests/server/http.test.ts && grep -q '"src/server"' tsconfig.main.json && test "$(cat .node-version)" = 20.12.2 && node -e "const p=require('./package.json');process.exit(p.scripts['start:server']==='node dist/electron/server/index.js'&&p.build.files.includes('!dist/electron/server/**')&&p.build.files.includes('dist/**/*')?0:1)" && grep -q 'RENDER_GIT_COMMIT' src/server/http.ts && grep -q 'x-forwarded-for' src/server/http.ts && npm run build && test -f dist/electron/server/index.js && (PORT=47831 node dist/electron/server/index.js & P=$!; R=1; for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -sf -o /tmp/desmon-healthz.json http://127.0.0.1:47831/healthz && grep -q '"ok":true' /tmp/desmon-healthz.json && R=0 && break; done; kill $P; exit $R) && grep -q "desmon-smoke-" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts` → exit 0 |

## 4. Verify the pick

The heading of T22 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T22a`,
  `T22b`…, each with title/worker/files/deps/ac; `files` complete
  including tests).
- `git push` is allowed ONLY if your task's Notes contain `push: yes`.

## 6. Gates — fix until green, never give up

- Run exactly `npm test && npm run lint && npm run typecheck`, then this
  task's `AC:` command(s), and confirm both pass.
- On any failure: fix and rerun. If an approach fails twice, try a DIFFERENT
  approach. Errors are information, never a reason to stop.
- FORBIDDEN: deleting/skipping/weakening tests, loosening tsconfig or eslint,
  `--force`/`|| true` shims, reporting what you did not verify. The Validator
  re-executes AC lines literally and reverts false claims.
- `BLOCKED` only for environmental impossibility (permissions, network,
  toolchain) after ≥3 genuinely different attempts, listed in `note`.
- A `npm run smoke` that exits without `SMOKE_OK` and without any error is
  almost always a collision with another lane's smoke (Electron single-instance
  lock, until the SMOKE-isolation change of T22 lands): retry it once.

## 7. Commit (inside this worktree)

`git add -A && git commit -m "<type>(T22): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-14.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T22 (branch lane/T22)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T22","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
