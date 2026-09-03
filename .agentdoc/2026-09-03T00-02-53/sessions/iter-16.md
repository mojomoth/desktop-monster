# Session record — iter 16

- agent role: builder
- worker: claude
- lane: .worktrees/T22 (branch lane/T22)
- harness version: v2
- task: T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
- result: DONE
- commit: d6ae91a (this record's own sha differs — see the follow-up docs commit)
- graphify affected used: none (task Files list is complete; src/server is new)

## What I did

- Confirmed the T22 heading on disk is `[~]` and the block matches the plan file.
- Read the iter-01/iter-05 lane logs: both attempts were MERGE_RED for an
  ENVIRONMENT reason — the merge-side gate run reported `sh: vitest: command not
  found` (main checkout's node_modules was broken), not a defect in the diff.
  iters 08/12/14 CRASHED and only left accidental `graphify-out`/`node_modules`
  symlink commits (b09df3d has since fixed `.gitignore`).
- Verified nothing on `main` has touched the eight T22 files since iter-05's base
  (`git diff 52b07b4^ HEAD -- <files>` is empty), then re-applied that verified
  diff into this lane.
- `src/server/http.ts`: `ApiRequest { method, path, query, auth, body, ip }`,
  `ApiResponse`, `ApiHandler`, `BODY_LIMIT = 65_536`, `clientIp()` = first
  `x-forwarded-for` entry (trimmed) else socket address else `''`,
  `createRequestListener(handle)` answering `GET /healthz` itself with
  `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }` (key order ok → sha,
  handler never called), `?query` via `new URL(url, 'http://x')`, bearer from
  `authorization`, body buffered with a running byte count → 413
  `payload_too_large` + `req.destroy()` over the cap, 400 `bad_request` on bad
  JSON, empty body → `null`, `application/json` on every response.
- `src/server/index.ts`: stub `async () => ({ status: 404, body: { error: 'not_found' } })`
  handler (T39 swaps in createApp), `PORT` default 10000, host `0.0.0.0`, one boot
  line `[desmon-server] listening on :<port> store=memory sha=<sha>`.
- Build wiring: `tsconfig.main.json` include += `"src/server"`;
  `scripts["start:server"] = "node dist/electron/server/index.js"`;
  `build.files` = `["dist/**/*", "static/**/*", "!dist/electron/server/**"]`
  (appended — tests/packaging.test.ts still pins `dist/**/*`); `.node-version` = `20.12.2`.
- SMOKE isolation (Assumption 40): `src/main/index.ts` calls
  `app.setPath('userData', mkdtempSync(join(tmpdir(), 'desmon-smoke-')))` AFTER
  `app.setName('DesMon')` and BEFORE `app.requestSingleInstanceLock()`; the bare
  `registerIpcHandlers()` literal and every T13/T17/T21 literal are untouched.
- Tests: `tests/server/http.test.ts` (9 tests) drives the listener with a
  `node:stream` `PassThrough` carrying method/url/headers/socket plus a recording
  response object — no sockets, no timers, no store; the four AC-pinned titles are
  verbatim and use a throwing `never` handler where the handler must not be reached.
  `tests/window.test.ts` gains one source-order pin in the `accessory lifecycle`
  describe (`desmon-smoke-` before `requestSingleInstanceLock()`), `it(` 9 → 10.
- Ran the full AC verbatim (including the `127.0.0.1:47831` loopback boot) → exit 0,
  and `npm run smoke` → `SMOKE_OK`.

## Files touched

- src/server/http.ts (new)
- src/server/index.ts (new)
- tests/server/http.test.ts (new)
- .node-version (new)
- tsconfig.main.json
- package.json
- src/main/index.ts
- tests/window.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-16.md (this record)

## Gate results

```
$ npm test
 ✓ tests/window.test.ts (26 tests) 3ms
 ✓ tests/server/http.test.ts (9 tests) 6ms
 Test Files  20 passed (20)
      Tests  313 passed (313)

$ npm run lint
> eslint . --max-warnings 0
(no output)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output)

$ <T22 AC, verbatim>
 Test Files  2 passed (2)
      Tests  35 passed (35)
> tsc -p tsconfig.main.json && tsc -p tsconfig.renderer.json
[desmon-server] listening on :47831 store=memory sha=dev
AC EXIT=0

$ npm run smoke
SMOKE_OK
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT re-derive the adapter from scratch: iter-05's diff (52b07b4) is
  gate-green and AC-green; both of its MERGE_RED verdicts came from the
  merge-side environment, never from the code.
- Do NOT run `npm ci` inside the lane (iter-05 did). The `node_modules` symlink
  target exists in this iteration; reinstalling is forbidden by the lane rules
  and was only ever a symptom of the broken main checkout.
- Do NOT `git add` `graphify-out` or `node_modules` (iters 08/12/14 committed
  those symlinks). `.gitignore` now lists both without a trailing slash — leave it.
- Do NOT try to answer `/healthz` from the application handler: F43 requires the
  adapter to answer it so a Render probe never touches a sleeping store; the test
  pins that with a throwing handler.
