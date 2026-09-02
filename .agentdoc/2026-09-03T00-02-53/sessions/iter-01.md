# Session record — iter 01

- agent role: builder
- worker: claude
- lane: .worktrees/T22 (branch lane/T22)
- harness version: v2
- task: T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
- result: DONE
- commit: <see below>
- graphify affected used: none (all touched modules read directly: src/main/index.ts, tests/window.test.ts; src/server is new)

## What I did

- Added `src/server/http.ts`: `ApiRequest/ApiResponse/ApiHandler`, `BODY_LIMIT = 65_536`,
  `clientIp(headers, remoteAddress)` (first trimmed `x-forwarded-for` entry, else socket address),
  `createRequestListener(handle)` — answers `GET /healthz` itself with `{ ok: true, sha: RENDER_GIT_COMMIT ?? 'dev' }`
  (handler never called), parses `?query` via `new URL(url, 'http://x')`, bearer from `authorization`,
  buffers the body counting chunks (413 `payload_too_large` + `req.destroy()`, 400 `bad_request` on bad JSON,
  empty → `null`), `application/json` on every response.
- Added `src/server/index.ts`: 404 stub `ApiHandler` (T39 swaps in `createApp`), `PORT` default 10000,
  host `0.0.0.0`, one boot line `[desmon-server] listening on :<port> store=memory sha=<sha>`.
- Wired the build: `tsconfig.main.json` include += `"src/server"` (no script change — typecheck/lint/build
  cover it), `scripts["start:server"]`, `build.files` += `!dist/electron/server/**` (appended; `dist/**/*` kept
  for tests/packaging.test.ts), `.node-version` = `20.12.2`.
- Added `tests/server/http.test.ts` (9 tests) driving the listener with a `node:stream` `PassThrough` and a
  recording response object — no sockets, no ports, no timers. Includes the four AC-pinned titles.
- SMOKE isolation (Assumption 40): `src/main/index.ts` redirects `userData` to
  `mkdtempSync(join(tmpdir(), 'desmon-smoke-'))` after `app.setName('DesMon')` and before
  `app.requestSingleInstanceLock()`; every T13/T17/T21 literal (`registerIpcHandlers()`,
  `new SimulatedInputDriver()`, `SMOKE_ATTACK_COUNT = 3`, `20_000`, `app.dock?.hide()` before
  `createOverlayWindow()`) untouched.
- `tests/window.test.ts`: one new source pin in the `accessory lifecycle` describe (`it(` count 9 → 10).
- Environmental fix (outside the task's Files, forced by the gates): the dispatched `node_modules` symlink
  pointed at `<main checkout>/node_modules`, which does not exist — nothing could run. Ran `npm ci` inside the
  lane instead (gitignored, main checkout untouched, `package-lock.json` unchanged).

## Files touched

- src/server/http.ts (new)
- src/server/index.ts (new)
- tests/server/http.test.ts (new)
- .node-version (new)
- tsconfig.main.json
- package.json
- src/main/index.ts
- tests/window.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-01.md (this file)

## Gate results

```
$ npm test
 Test Files  20 passed (20)
      Tests  313 passed (313)

$ npm run lint
> eslint . --max-warnings 0
(no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output, exit 0)

$ <T22 AC line, verbatim>
 ✓ tests/server/http.test.ts (9 tests)
 ✓ tests/window.test.ts (26 tests)
 Test Files  2 passed (2)
      Tests  35 passed (35)
[desmon-server] listening on :47831 store=memory sha=dev
AC_EXIT=0

$ npm run smoke   (src/main + package.json touched)
exit=0
SMOKE_OK
```

## Attempts & dead ends (what future iterations must NOT retry)

- `npm test` failed with `sh: vitest: command not found`: the lane's `node_modules` symlink targets
  `/Users/jeongyounglee/work/repo/desktop-monster/node_modules`, which does not exist in the main checkout.
  Do NOT assume the symlink is live — `npm ci` in the lane is the fix (fast, ~11 s, lockfile untouched).
- `node_modules` and `graphify-out` are SYMLINKS in a fresh lane and `.gitignore` only lists
  `node_modules/` / `graphify-out/` (trailing slash = directories only), so `git add -A` would commit them.
  Commit explicit paths in a lane, or install `node_modules` as a real directory first (then it is ignored).
  `graphify-out` was left untracked and out of the commit.
- Typing `HttpRes.end(chunk: string)` as required (not optional) is what keeps `createServer(listener)`
  assignable under `strictFunctionTypes` — an optional `chunk?: string` does not match `ServerResponse.end`'s
  overloads.
