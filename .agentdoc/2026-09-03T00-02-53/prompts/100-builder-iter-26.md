# Lane T43 — Builder (iteration 26)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T43
"Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T43 (branch `lane/T43`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T43. The main checkout (two directories up) is off
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
   T43 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin
- AC: `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "process.env.SMOKE ? ''" src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.GET_IDENTITY' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.SET_NAME' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.LEADERBOARD' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP' src/main/ipc.ts && grep -q "'desmon:leaderboard'" src/preload/index.ts && grep -q 'parseSave' src/main/ipc.ts && grep -q 'registerIpcHandlers()' src/main/index.ts && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T42, T24
- Worker: claude
- Files: src/shared/ipc.ts, src/main/ipc.ts, src/preload/index.ts, src/renderer/global.d.ts, tests/ipc.test.ts
- Notes: SPEC F49 + F17 (Assumptions 11/32); SERVER_ARCHITECTURE §6 IPC table + §9 pins; GAME_DESIGN_V2 §9. shared/ipc.ts: `GET_IDENTITY: 'desmon:get-identity'`, `SET_NAME: 'desmon:set-name'`, `LEADERBOARD: 'desmon:leaderboard'`, `PVP: 'desmon:pvp'` + `SetNamePayload { name: string }`, `LeaderboardQueryPayload { n?: number }` (type-only imports from src/shared/api.ts are fine; shared stays core-free; `SaveStatePayload = unknown` stays). main/ipc.ts: `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);` (literal pinned by the AC), ONE `createNetSession({ client: createNetClient({ baseUrl }), userDataDir: app.getPath('userData'), online: baseUrl !== '', randomUUID })` inside `registerIpcHandlers`, four `ipcMain.handle` calls validating payload types (`typeof name === 'string'`, finite `n`), and `session.onSave(parseSave(data))` appended to the existing `SAVE_STATE` handler after `writeSaveFile` (the save is untrusted renderer input — parse, never cast; core `parseSave` accepts V1 | V2 after T24). Preload: `getIdentity`, `setName`, `getLeaderboard`, `pvp` as 2-space `  name:` properties (tests/renderer.test.ts regex `^ {2}(\w+):`), channel literals inlined, still value-imports only `electron`. global.d.ts mirrors them as `name(` (manual declarations from shared types — never import src/preload there). tests/ipc.test.ts: EXTEND the `toEqual` IPC table, the preload `it.each` method list and the `ipcMain.handle(IPC.%s)` list — never shrink. Do NOT touch src/main/index.ts (T22 already isolates SMOKE userData; the `registerIpcHandlers()` literal stays). Handlers return `NetResult<LeaderboardResult>` / `NetResult<PvpResult>` as-is: main NEVER pushes roster changes to the game window — `removed` is forwarded by the MENU (T49) as `removeCompanions`, background `onSave` uploads ignore `removed`. Smoke must print SMOKE_OK with zero fetch calls (offline by code).

Open task headings (context only — do NOT work on them):

### [~] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [ ] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [~] T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin
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

| F17 | Preload bridge & IPC security | `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`; preload exposes `window.desmon` (onInput, onInputMode, onReset, getInputMode, loadState, saveState, openAccessibilitySettings, moveWindowBy) over the channels of GAME_ARCHITECTURE §3.2 (+`desmon:move-window`; v2 adds the 8 channels/methods of F49 and F51, all matching `^desmon:[a-z][a-z-]*$`; `load-state`/`save-state` carry `SaveFileV2`) defined as constants in `src/shared/ipc.ts` | `grep -q "contextIsolation: true" src/main/window.ts && grep -q "nodeIntegration: false" src/main/window.ts && grep -q "sandbox: true" src/main/window.ts && grep -q contextBridge src/preload/index.ts` → exit 0 |
| F49 | Net IPC and offline SMOKE | `src/shared/ipc.ts` adds `GET_IDENTITY: 'desmon:get-identity'`, `SET_NAME: 'desmon:set-name'`, `LEADERBOARD: 'desmon:leaderboard'`, `PVP: 'desmon:pvp'` (+ `SetNamePayload`, `LeaderboardQueryPayload`; shared stays core-free); `src/main/ipc.ts`: `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);` (literal pinned), one `createNetSession` inside `registerIpcHandlers`, four `ipcMain.handle` calls validating payload types, and `session.onSave(parseSave(data))` appended to the existing `SAVE_STATE` handler after `writeSaveFile` (the save is untrusted renderer input — parsed, never cast); preload gains `getIdentity`, `setName`, `getLeaderboard`, `pvp` as 2-space `name:` properties with inlined channel literals, still value-importing only `electron`; `global.d.ts` mirrors them; `tests/ipc.test.ts` EXTENDS the `toEqual` IPC table, the preload `it.each` list and the `ipcMain.handle` list; main NEVER pushes roster changes to the game window; smoke prints `SMOKE_OK` with zero fetch calls | claude | `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "process.env.SMOKE ? ''" src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.GET_IDENTITY' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.SET_NAME' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.LEADERBOARD' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP' src/main/ipc.ts && grep -q "'desmon:leaderboard'" src/preload/index.ts && grep -q 'parseSave' src/main/ipc.ts && grep -q 'registerIpcHandlers()' src/main/index.ts && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T43 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T43a`,
  `T43b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T43): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-26.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T43 (branch lane/T43)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T43","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
