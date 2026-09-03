# Lane T50 — Builder (iteration 45)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T50
"Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T50 (branch `lane/T50`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T50. The main checkout (two directories up) is off
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
   T50 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
- AC: `node -e "process.exit(require('./package.json').version==='0.2.0'&&require('./package-lock.json').version==='0.2.0'?0:1)" && grep -q "DesMon v0.2.0" src/main/tray.ts && grep -qi leaderboard README.md && grep -qi pvp README.md && grep -qi fever README.md && grep -qi rebirth README.md && grep -qi companion README.md && grep -qi boss README.md && grep -q "DesMon-0.2.0-arm64.dmg" README.md && grep -q "M9" SPEC.md && grep -q "M14" SPEC.md && npx vitest run tests/tray.test.ts tests/packaging.test.ts && test "$(grep -c '^\s*it(' tests/packaging.test.ts)" -ge 11` → exit 0
- Deps: T35, T44, T49
- Worker: claude
- Files: package.json, package-lock.json, src/main/tray.ts, README.md, SPEC.md, tests/packaging.test.ts
- Notes: SPEC F57 + F23/F25/F27 literals (Assumption 37). 6 files, flagged: package-lock.json only changes its two `version` fields (edit by hand or `npm install --package-lock-only`; no network needed). `TRAY_TITLE = 'DesMon v0.2.0'` (tests/tray.test.ts compares to package.json). README sections: gameplay v2 (bosses every 8th, capture, companions/volley, fever, lifecycle + rebirth, A–Z numbers), Collection window, Ranking/PvP + `SERVER_URL`/`DESMON_SERVER_URL` override, offline behaviour, Render free-tier caveats (sleep, 30-day Postgres expiry), `npm run start:server`, artifact names 0.2.0 (`DesMon-0.2.0-arm64.dmg`) — every v1 README literal kept (tests/packaging.test.ts pins them; its artifact-name pin follows `package.json` version). SPEC.md: the Spec Clarifier already wrote M9–M14 — only fill gaps (exact artifact names, M8 → 0.2.0); never touch feature rows. This is the LAST task that touches a build-filter path (package.json/package-lock.json) before the T51 redeploy: before finishing, re-run the hermetic ACs of SPEC rows F28–F37 and F43–F49 literally (cheap vitest/grep lines) so no core/shared/server gap survives into T51 — report any failure in the note rather than fixing unrelated files here.

Open task headings (context only — do NOT work on them):

### [~] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F23 | Tray icon & menu | Tray icon is a 16×16 pixel matrix encoded to PNG in code (node:zlib deflate + CRC, no asset file) via `nativeImage.createFromBuffer`; menu: `DesMon v0.2.0` (disabled), input-mode status / "Grant Accessibility…" (opens the Privacy pane deep link), separator, `Collection & Battle…` (opens the menu window, F52), `Reset Progress`, `Quit`; menu rebuilds on mode change | `grep -q "Reset Progress" src/main/tray.ts && grep -q Quit src/main/tray.ts && grep -q deflateSync src/main/trayIcon.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "DesMon v0.2.0" src/main/tray.ts` → exit 0 (visibility/behavior: Manual M6) |
| F25 | Unsigned macOS packaging | `npm run package` produces an unsigned arm64 dmg and .app under `release/` (version 0.2.0; the server build output is excluded via `!dist/electron/server/**`, F26) | `npm run package && test -f release/DesMon-0.2.0-arm64.dmg && test -d release/mac-arm64/DesMon.app` → exit 0 |
| F27 | README operator docs | README documents: how to run, Accessibility grant (dev target is "Electron", packaged is "DesMon"), Gatekeeper "Open Anyway" for the unsigned app, save-file location and reset, that the Windows target is config-only, and (v2) fever, bosses, companions, rebirth, leaderboard/PvP, the server URL / `DESMON_SERVER_URL` override / offline behaviour, `npm run start:server`, the Render free-tier caveats (sleep, 30-day Postgres expiry) and that stats are self-reported | `grep -qi accessibility README.md && grep -q "Open Anyway" README.md && grep -qi reset README.md && grep -qi leaderboard README.md && grep -qi rebirth README.md` → exit 0 |
| F28 | A–Z number format | `src/core/bignum.ts` exports `suffix(g)` (bijective base-26: 1→A, 26→Z, 27→AA, 702→ZZ, 703→AAA, g ≤ 0 → `''`), `format(n: bigint or number)` (Assumption 20 rule: `s = n.toString()`; ≤ 3 digits verbatim; else `g = ⌊(d−1)/3⌋`, 3 leading digits with a dot after `d − 3g` of them, + `suffix(g)`; truncation never rounding; negative/non-finite number → `'0'`), `ratio(num, den)` (den ≤ 0n → 0; else `Number(num*10000n/den)/10000` clamped to [0, 1]) and `bigField(raw)` (finite number → `String(max(0, floor))`; `/^\d+$/` string → itself; else null, bigint input included); barrel re-exports | claude | `npx vitest run tests/bignum.test.ts && grep -q "export function format" src/core/bignum.ts && grep -q "formats 1000 as 1.00A, 12345 as 12.3A, 123456 as 123A and 1000000 as 1.00B" tests/bignum.test.ts && grep -q "suffix 1/26/27/702/703 is A/Z/AA/ZZ/AAA" tests/bignum.test.ts && grep -q "format truncates and never rounds: 999999 is 999A" tests/bignum.test.ts && grep -q "ratio divides bigints into a clamped number" tests/bignum.test.ts && grep -q "bigField accepts finite numbers and digit strings and rejects everything else" tests/bignum.test.ts` → exit 0 |
| F37 | PvP resolution (core) | `src/core/collection.ts` `resolvePvp(attacker, defender, rng) → { attackerWon, moved, attackerPower, defenderPower }` per Assumption 34: powers = Σ `companionPower` over the FULL rosters; `p = total === 0n ? 0.5 : ratio(attackerPower, total)`; draw 1 win roll; draw 2 victim index ALWAYS consumed (`⌊rng.next() · loser.length⌋`, null when the loser is empty); `moved = null` when the winner's roster already holds 30; exactly 2 draws; no bot/cooldown logic in core; shared byte-for-byte with the server (F45) | claude | `npx vitest run tests/collection.test.ts && grep -q "export function resolvePvp" src/core/collection.ts && grep -q "resolvePvp wins with probability myPower over total and moves one random companion from the loser to the winner" tests/collection.test.ts && grep -q "resolvePvp with an empty loser roster steals nothing" tests/collection.test.ts && grep -q "resolvePvp never moves into a full roster of 30" tests/collection.test.ts && grep -q "resolvePvp is reproducible from its seed and draws exactly 2 rng values" tests/collection.test.ts` → exit 0 |
| F43 | Server scaffold and healthz | `src/server/http.ts`: `ApiRequest { method, path, query, auth, body, ip }`, `ApiResponse`, `ApiHandler`, `BODY_LIMIT = 65_536`, `clientIp(headers, remoteAddress)` (first `x-forwarded-for` entry else socket address), `createRequestListener(handle)` answering `GET /healthz` itself with `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }` (never touching any store), 413 `payload_too_large` + `req.destroy()` over the cap, 400 `bad_request` on bad JSON, empty body → `null`, `application/json` everywhere; `src/server/index.ts` boots on `PORT` (default 10000) host `0.0.0.0` with one log line (stub 404 handler until F44); `tsconfig.main.json` include += `src/server`; `scripts["start:server"] = "node dist/electron/server/index.js"`; `build.files` += `!dist/electron/server/**`; `.node-version` = `20.12.2`; SMOKE isolation: when `process.env.SMOKE` is set, `src/main/index.ts` calls `app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "desmon-smoke-")))` BEFORE `app.requestSingleInstanceLock()` (Assumption 40) while the bare `registerIpcHandlers()` literal stays; `tests/window.test.ts` gains a source pin for that order; tests drive the listener with `PassThrough` streams — no sockets | claude | `npx vitest run tests/server/http.test.ts tests/window.test.ts && grep -q 'rejects bodies over 65536 bytes with 413 payload_too_large' tests/server/http.test.ts && grep -q 'rejects malformed JSON with 400 bad_request' tests/server/http.test.ts && grep -q 'takes the client ip from the first x-forwarded-for entry' tests/server/http.test.ts && grep -q '"src/server"' tsconfig.main.json && test "$(cat .node-version)" = 20.12.2 && node -e "const p=require('./package.json');process.exit(p.scripts['start:server']==='node dist/electron/server/index.js'&&p.build.files.includes('!dist/electron/server/**')&&p.build.files.includes('dist/**/*')?0:1)" && grep -q 'RENDER_GIT_COMMIT' src/server/http.ts && grep -q 'x-forwarded-for' src/server/http.ts && npm run build && test -f dist/electron/server/index.js && (PORT=47831 node dist/electron/server/index.js & P=$!; R=1; for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -sf -o /tmp/desmon-healthz.json http://127.0.0.1:47831/healthz && grep -q '"ok":true' /tmp/desmon-healthz.json && R=0 && break; done; kill $P; exit $R) && grep -q "desmon-smoke-" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts` → exit 0 |
| F49 | Net IPC and offline SMOKE | `src/shared/ipc.ts` adds `GET_IDENTITY: 'desmon:get-identity'`, `SET_NAME: 'desmon:set-name'`, `LEADERBOARD: 'desmon:leaderboard'`, `PVP: 'desmon:pvp'` (+ `SetNamePayload`, `LeaderboardQueryPayload`; shared stays core-free); `src/main/ipc.ts`: `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);` (literal pinned), one `createNetSession` inside `registerIpcHandlers`, four `ipcMain.handle` calls validating payload types, and `session.onSave(parseSave(data))` appended to the existing `SAVE_STATE` handler after `writeSaveFile` (the save is untrusted renderer input — parsed, never cast); preload gains `getIdentity`, `setName`, `getLeaderboard`, `pvp` as 2-space `name:` properties with inlined channel literals, still value-importing only `electron`; `global.d.ts` mirrors them; `tests/ipc.test.ts` EXTENDS the `toEqual` IPC table, the preload `it.each` list and the `ipcMain.handle` list; main NEVER pushes roster changes to the game window; smoke prints `SMOKE_OK` with zero fetch calls | claude | `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "process.env.SMOKE ? ''" src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.GET_IDENTITY' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.SET_NAME' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.LEADERBOARD' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP' src/main/ipc.ts && grep -q "'desmon:leaderboard'" src/preload/index.ts && grep -q 'parseSave' src/main/ipc.ts && grep -q 'registerIpcHandlers()' src/main/index.ts && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |
| F57 | Version 0.2.0 and docs | `package.json` and `package-lock.json` version `0.2.0` (lock: only its two `version` fields); `TRAY_TITLE = 'DesMon v0.2.0'`; README sections: gameplay v2 (bosses every 8th, capture, companions/volley, fever, lifecycle + rebirth, A–Z numbers), Collection window, Ranking/PvP + `SERVER_URL`/`DESMON_SERVER_URL` override, offline behaviour, Render free-tier caveats, `npm run start:server`, artifact names 0.2.0 (every v1 README literal kept); SPEC.md M9–M14 present (written here; the task fills gaps only, never feature rows); `tests/packaging.test.ts` artifact-name pin follows the version | claude | `node -e "process.exit(require('./package.json').version==='0.2.0'&&require('./package-lock.json').version==='0.2.0'?0:1)" && grep -q "DesMon v0.2.0" src/main/tray.ts && grep -qi leaderboard README.md && grep -qi pvp README.md && grep -qi fever README.md && grep -qi rebirth README.md && grep -qi companion README.md && grep -qi boss README.md && grep -q "DesMon-0.2.0-arm64.dmg" README.md && grep -q "M9" SPEC.md && grep -q "M14" SPEC.md && npx vitest run tests/tray.test.ts tests/packaging.test.ts && test "$(grep -c '^\s*it(' tests/packaging.test.ts)" -ge 11` → exit 0 |

## 4. Verify the pick

The heading of T50 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T50a`,
  `T50b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T50): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-45.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T50 (branch lane/T50)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T50","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
