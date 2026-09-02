# Session record — iter 05

- agent role: builder
- worker: claude
- lane: .worktrees/T22 (branch lane/T22)
- harness version: v2
- task: T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
- result: DONE
- commit: 8c0881f9717b2dda5170cf2c06f53f710ce59eb9
- graphify affected used: none (all touched symbols are new; src/main/index.ts read directly)

## What I did

- Added `src/server/http.ts`: `ApiRequest`/`ApiResponse`/`ApiHandler`, `BODY_LIMIT = 65_536`,
  `clientIp()` (first trimmed `x-forwarded-for` entry → socket address → ''), and
  `createRequestListener(handle)` — answers `GET /healthz` itself with
  `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }` (key order ok → sha, handler never
  called), parses `?query` via `new URL(url, 'http://x')`, reads the bearer from `authorization`,
  buffers the body counting chunks (over cap → 413 `payload_too_large` + `req.destroy()`, bad JSON →
  400 `bad_request`, empty → `null`), `application/json` on every response.
- Added `src/server/index.ts`: 404 stub handler (T39 swaps in `createApp`), `PORT` default 10000,
  host `0.0.0.0`, one boot line `[desmon-server] listening on :<port> store=memory sha=<sha>`.
- `tsconfig.main.json` `include` += `"src/server"` — build/typecheck/lint cover it with no script change.
- `package.json`: `scripts["start:server"]`, `build.files` += `"!dist/electron/server/**"`
  (appended; `dist/**/*` and `static/**/*` kept for tests/packaging.test.ts).
- `.node-version` = `20.12.2`.
- `tests/server/http.test.ts`: 9 tests driving the listener with a `node:stream` `PassThrough`
  (method/url/headers/socket) + a recording response object — no sockets, no timers. Includes the
  four verbatim AC titles; `/healthz` is pinned with a throwing handler.
- SMOKE isolation (Assumption 40) in `src/main/index.ts`: `app.setPath('userData',
  mkdtempSync(join(tmpdir(), 'desmon-smoke-')))` after `app.setName('DesMon')` and before
  `app.requestSingleInstanceLock()`; every T13/T17/T21 literal left untouched.
- `tests/window.test.ts`: one added source pin in the `accessory lifecycle` describe that
  `desmon-smoke-` precedes `requestSingleInstanceLock()` (`it(` count 9 → 10).
- Ran `npm run smoke` as an extra check of the changed boot path: `SMOKE_OK`.
- Did NOT add: `pg`, `MemoryStore`, `createApp`, any `tsconfig.test.json` change; did not run
  `render-bootstrap.sh`. No 500 path in the adapter — SERVER_ARCHITECTURE §3 assigns
  `500 internal` to `createApp` and guarantees `handle()` never throws (T39).

## Files touched

- src/server/http.ts (new)
- src/server/index.ts (new)
- tests/server/http.test.ts (new)
- .node-version (new)
- tsconfig.main.json
- package.json
- src/main/index.ts
- tests/window.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-05.md (this file)

## Gate results

`npm test && npm run lint && npm run typecheck` → exit 0

```
 ✓ tests/server/http.test.ts (9 tests) 5ms
 ✓ tests/window.test.ts (26 tests) 4ms
 Test Files  20 passed (20)
      Tests  313 passed (313)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
```

T22 `AC:` executed verbatim → `AC_EXIT=0`

```
[desmon-server] listening on :47831 store=memory sha=dev
AC_EXIT=0
--- healthz body ---
{"ok":true,"sha":"dev"}
 Test Files  2 passed (2)
      Tests  35 passed (35)
```

`npm run smoke` (extra, not a gate) → `SMOKE_OK`

## Attempts & dead ends (what future iterations must NOT retry)

- The lane's `node_modules` symlink points at
  `/Users/jeongyounglee/work/repo/desktop-monster/node_modules`, which DOES NOT EXIST — the same
  dead end iter 01 hit. No gate can run through it. Fix that a gate forced (outside the task's
  Files, but not a tracked file): replaced the dangling symlink with a real `npm ci` install
  INSIDE the lane (`rm node_modules && npm ci`, 4s, 453 packages). It is covered by `.gitignore`'s
  `node_modules/` once it is a directory, so nothing extra is committed. Do NOT try to install into
  the main checkout — it is off limits.
- `graphify-out` is a symlink, so `.gitignore`'s `graphify-out/` does not match it and `git add -A`
  would commit the symlink. Staged explicit paths instead of `-A`.
