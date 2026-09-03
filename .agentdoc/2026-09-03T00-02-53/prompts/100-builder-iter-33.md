# Lane T45 — Builder (iteration 33)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T45
"Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T45 (branch `lane/T45`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T45. The main checkout (two directories up) is off
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
   T45 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T45 — Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync
- AC: `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "desmon:action" src/shared/ipc.ts && grep -q "desmon:menu-action" src/shared/ipc.ts && grep -q "desmon:state-changed" src/shared/ipc.ts && grep -q "desmon:menu-ready" src/shared/ipc.ts && grep -q "sendAction" src/preload/index.ts && grep -q "onStateChanged" src/preload/index.ts && grep -q "reportMenuReady" src/preload/index.ts && grep -q "onAction(" src/renderer/global.d.ts && grep -q "function sendToOthers" src/main/ipc.ts && grep -q "the save-state handler relays the written save to every other window as state-changed" tests/ipc.test.ts && grep -q "menu-action is validated and forwarded to every other window as an action" tests/ipc.test.ts && grep -q "menu-ready answers the sender with the current save" tests/ipc.test.ts && grep -q "registerIpcHandlers()" src/main/index.ts && test "$(grep -c '^\s*it(' tests/ipc.test.ts)" -ge 15` → exit 0
- Deps: T27, T43
- Worker: claude
- Files: src/shared/ipc.ts, src/preload/index.ts, src/main/ipc.ts, src/renderer/global.d.ts, tests/ipc.test.ts
- Notes: SPEC F51 (Assumption 29); GAME_DESIGN_V2 §9 relay flow; SERVER_ARCHITECTURE §6/§9. Add `ACTION: 'desmon:action'` (main → game window, send, `CollectionAction`), `MENU_ACTION: 'desmon:menu-action'` (menu → main, invoke), `STATE_CHANGED: 'desmon:state-changed'` (main → menu, send, `SaveFileV2`), `MENU_READY: 'desmon:menu-ready'` (menu → main, send) to `IPC` — EXTEND the `toEqual` table and the `it.each` method list in tests/ipc.test.ts (ipc ≥ 15, currently 12 + T43's additions) — and `onAction(cb)`, `sendAction(a)`, `onStateChanged(cb)`, `reportMenuReady()` to the preload (2-space `  name:` form, literals inlined, electron-only value import) and to global.d.ts (`name(`). Relay is stateless: `sendToOthers(sender, channel, payload)` over `BrowserWindow.getAllWindows()` — src/main/index.ts is NOT touched and `registerIpcHandlers()` keeps its literal. `MENU_ACTION` validates the action shape before forwarding (`type` ∈ the `CollectionAction` union — type-import it from src/core/collection.js (T27) in main/ipc.ts; string ids; arrays of strings; unknown type → ignored, never thrown) then `sendToOthers(event.sender, IPC.ACTION, action)`. `SAVE_STATE`: write → `session.onSave(parseSave(data))` (T43, keep) → `sendToOthers(event.sender, IPC.STATE_CHANGED, parsed)`. `MENU_READY` (`ipcMain.on`): answer the SENDER with `STATE_CHANGED` carrying `parseSave(readSaveFile(app.getPath('userData')))` — the menu's single boot path. There are NO main-originated actions (`removed`/`stolen`/`lost` reach the game only as menu actions, T49). shared/ipc.ts stays import-free from core (`MenuActionPayload = unknown`; main narrows). Tests are source-contract (main/ipc.ts value-imports electron); titles verbatim in the AC.

Open task headings (context only — do NOT work on them):

### [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [~] T45 — Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync
### [ ] T46 — Menu window + tray item "Collection & Battle…"
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F51 | Menu IPC relay | `src/shared/ipc.ts` adds `ACTION: 'desmon:action'` (main → game window, `CollectionAction`), `MENU_ACTION: 'desmon:menu-action'` (menu → main invoke, validated: `type` ∈ the union, string ids, arrays of strings; unknown → ignored), `STATE_CHANGED: 'desmon:state-changed'` (main → menu, `SaveFileV2`), `MENU_READY: 'desmon:menu-ready'` (menu → main; answered with `STATE_CHANGED` carrying `parseSave(readSaveFile(userData))`); `src/main/ipc.ts` `sendToOthers(sender, channel, payload)` over `BrowserWindow.getAllWindows()` — stateless relay, `src/main/index.ts` untouched (`registerIpcHandlers()` literal); `SAVE_STATE` handler: write → `session.onSave(parseSave(data))` → `sendToOthers(STATE_CHANGED, parsed)`; preload gains `onAction`, `sendAction`, `onStateChanged`, `reportMenuReady` (2-space `name:` form) and `global.d.ts` mirrors them; pinned lists in `tests/ipc.test.ts` extended, never shrunk; no main-originated actions | claude | `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "desmon:action" src/shared/ipc.ts && grep -q "desmon:menu-action" src/shared/ipc.ts && grep -q "desmon:state-changed" src/shared/ipc.ts && grep -q "desmon:menu-ready" src/shared/ipc.ts && grep -q "sendAction" src/preload/index.ts && grep -q "onStateChanged" src/preload/index.ts && grep -q "reportMenuReady" src/preload/index.ts && grep -q "onAction(" src/renderer/global.d.ts && grep -q "function sendToOthers" src/main/ipc.ts && grep -q "the save-state handler relays the written save to every other window as state-changed" tests/ipc.test.ts && grep -q "menu-action is validated and forwarded to every other window as an action" tests/ipc.test.ts && grep -q "menu-ready answers the sender with the current save" tests/ipc.test.ts && grep -q "registerIpcHandlers()" src/main/index.ts && test "$(grep -c '^\s*it(' tests/ipc.test.ts)" -ge 15` → exit 0 |

## 4. Verify the pick

The heading of T45 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T45a`,
  `T45b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T45): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-33.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T45 (branch lane/T45)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T45","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
