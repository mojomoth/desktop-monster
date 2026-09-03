# Lane T68 — Builder (iteration 14)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T68
"IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T68 (branch `lane/T68`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T68. The main checkout (two directories up) is off
  limits. Never run `git push`, `git checkout main` or `git checkout v3`, `git worktree`,
  `git merge`, `git rebase`.
- Never edit `IMPLEMENTATION_PLAN.md`; never edit `SPEC.md` unless it is in
  your task's `Files:`. The orchestrator writes the plan from your JSON report.
- One task only. Do not read the whole plan — your block is below; the open
  headings are context.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/v3/agents/20-builder.md` — your charter; its hard rules bind you.
3. Your task block and the SPEC rows below.
4. `.harness/v3/reference/GAME_DESIGN_V2.md`, `SERVER_ARCHITECTURE.md`,
   `GAME_ARCHITECTURE.md` — ONLY the sections your task cites.
5. Any file in `.agentdoc/2026-09-03T13-22-02/sessions/` whose name or text mentions
   T68 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
- AC: `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "PVP_MATCH: 'desmon:pvp-match'" src/shared/ipc.ts && grep -q "THEFTS: 'desmon:thefts'" src/shared/ipc.ts && grep -q "RECLAIM: 'desmon:reclaim'" src/shared/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP_MATCH' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.THEFTS' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.RECLAIM' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP' src/main/ipc.ts && grep -q "export function sendToAll" src/main/ipc.ts && grep -q "function sendToOthers" src/main/ipc.ts && grep -q "setPvpParty" src/main/ipc.ts && grep -q "process.env.SMOKE ? ''" src/main/ipc.ts && grep -q "'desmon:pvp-match'" src/preload/index.ts && grep -q "pvpMatch" src/renderer/global.d.ts && grep -q "reclaim(" src/renderer/global.d.ts && grep -q "registerIpcHandlers()" src/main/index.ts && grep -q "pvp-match, thefts and reclaim handlers forward to the session and return its NetResult" tests/ipc.test.ts && grep -q "pvp handler requires a matchId string and a party string array" tests/ipc.test.ts && grep -q "narrowAction accepts setPvpParty and a validated pvpResult replay and drops malformed replays" tests/ipc.test.ts && test "$(grep -c '^\s*it(' tests/ipc.test.ts)" -ge 24 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T59, T67
- Worker: claude
- Files: src/shared/ipc.ts, src/main/ipc.ts, src/preload/index.ts, src/renderer/global.d.ts, tests/ipc.test.ts
- Notes: SPEC F73 + amended F49/F51, Assumption 49; GAME_DESIGN_V3 §9 (table is normative). Channels: `PVP_MATCH: 'desmon:pvp-match'` (invoke, none → `NetResult<MatchResult>`, preload `pvpMatch()`), `PVP` (existing `'desmon:pvp'`, payload now `{ matchId: string; party: string[] }` → `NetResult<PvpResult>`, preload `pvp(matchId, party)`), `THEFTS: 'desmon:thefts'` (preload `thefts()`), `RECLAIM: 'desmon:reclaim'` (payload `{ theftId: string }`, preload `reclaim(theftId)`). Handlers validate payloads at the trust boundary (bad `PVP` payload → `{ ok: false, error: 'network' }`-style NetResult as the v2 handlers do; never throw) and forward to the T67 session; `SMOKE` keeps `''` (offline). `narrowAction` += `setPvpParty` (`strs('ids')`) and the optional `replay` on `pvpResult` (validated: `opponentName` string, `opponentParty` array, `blows` array of `{ side, actorId, targetId, damage: string, ko }` — malformed replay → dropped, the action still applies). `export function sendToAll(channel, payload)` (every window; T69 uses it for the main-originated `addCompanion`), `sendToOthers` stays. PINNED LISTS TO EXTEND, never replace: tests/ipc.test.ts IPC `toEqual({...})` table, the preload `it.each` (+ the `desmon:pvp-match`/`desmon:thefts`/`desmon:reclaim` rows), the `ipcMain.handle` literal list, and `registerIpcHandlers()` in src/main/index.ts; `src/renderer/global.d.ts` must declare `pvpMatch`, `thefts`, `reclaim` and the new `pvp` signature because tests/renderer.test.ts "declares every method the preload exposes" compares the preload keys against the declaration (that test is run, not edited). Titles verbatim (tests/ipc.test.ts 21 → ≥ 24): "pvp-match, thefts and reclaim handlers forward to the session and return its NetResult", "pvp handler requires a matchId string and a party string array", "narrowAction accepts setPvpParty and a validated pvpResult replay and drops malformed replays". Smoke in AC → T22 dep.

Open task headings (context only — do NOT work on them):

### [~] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [~] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [~] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F49 | Net IPC and offline SMOKE | `src/shared/ipc.ts` adds `GET_IDENTITY: 'desmon:get-identity'`, `SET_NAME: 'desmon:set-name'`, `LEADERBOARD: 'desmon:leaderboard'`, `PVP: 'desmon:pvp'` (+ `SetNamePayload`, `LeaderboardQueryPayload`; shared stays core-free); v3 (F73) adds `PVP_MATCH: 'desmon:pvp-match'`, `THEFTS: 'desmon:thefts'`, `RECLAIM: 'desmon:reclaim'` and the `PVP` payload becomes `{ matchId, party }`; `src/main/ipc.ts`: `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);` (literal pinned), one `createNetSession` inside `registerIpcHandlers`, four `ipcMain.handle` calls validating payload types (seven with the v3 channels), and `session.onSave(parseSave(data))` appended to the existing `SAVE_STATE` handler after `writeSaveFile` (the save is untrusted renderer input — parsed, never cast); preload gains `getIdentity`, `setName`, `getLeaderboard`, `pvp` as 2-space `name:` properties with inlined channel literals, still value-importing only `electron`; `global.d.ts` mirrors them; `tests/ipc.test.ts` EXTENDS the `toEqual` IPC table, the preload `it.each` list and the `ipcMain.handle` list; main never pushes roster changes to the game window except the single `addCompanion` after a reclaim (v3, Assumption 49, F74); smoke prints `SMOKE_OK` with zero fetch calls | claude | `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "process.env.SMOKE ? ''" src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.GET_IDENTITY' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.SET_NAME' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.LEADERBOARD' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP' src/main/ipc.ts && grep -q "'desmon:leaderboard'" src/preload/index.ts && grep -q 'parseSave' src/main/ipc.ts && grep -q 'registerIpcHandlers()' src/main/index.ts && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log && grep -q "desmon:pvp-match" src/shared/ipc.ts && grep -q "desmon:thefts" src/shared/ipc.ts && grep -q "desmon:reclaim" src/shared/ipc.ts` → exit 0 |
| F51 | Menu IPC relay | `src/shared/ipc.ts` adds `ACTION: 'desmon:action'` (main → game window, `CollectionAction`), `MENU_ACTION: 'desmon:menu-action'` (menu → main invoke, validated: `type` ∈ the union, string ids, arrays of strings; unknown → ignored), `STATE_CHANGED: 'desmon:state-changed'` (main → menu, `SaveFileV2`), `MENU_READY: 'desmon:menu-ready'` (menu → main; answered with `STATE_CHANGED` carrying `parseSave(readSaveFile(userData))`); `src/main/ipc.ts` `sendToOthers(sender, channel, payload)` over `BrowserWindow.getAllWindows()` — stateless relay, `src/main/index.ts` untouched (`registerIpcHandlers()` literal); `SAVE_STATE` handler: write → `session.onSave(parseSave(data))` → `sendToOthers(STATE_CHANGED, parsed)`; preload gains `onAction`, `sendAction`, `onStateChanged`, `reportMenuReady` (2-space `name:` form) and `global.d.ts` mirrors them; pinned lists in `tests/ipc.test.ts` extended, never shrunk; `narrowAction` accepts `setPvpParty { ids }` and the optional `pvpResult.replay` (v3, F73); the only main-originated action is `sendToAll(IPC.ACTION, { type: 'addCompanion', companion })` after a reclaim (v3, Assumption 49) | claude | `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "desmon:action" src/shared/ipc.ts && grep -q "desmon:menu-action" src/shared/ipc.ts && grep -q "desmon:state-changed" src/shared/ipc.ts && grep -q "desmon:menu-ready" src/shared/ipc.ts && grep -q "sendAction" src/preload/index.ts && grep -q "onStateChanged" src/preload/index.ts && grep -q "reportMenuReady" src/preload/index.ts && grep -q "onAction(" src/renderer/global.d.ts && grep -q "function sendToOthers" src/main/ipc.ts && grep -q "the save-state handler relays the written save to every other window as state-changed" tests/ipc.test.ts && grep -q "menu-action is validated and forwarded to every other window as an action" tests/ipc.test.ts && grep -q "menu-ready answers the sender with the current save" tests/ipc.test.ts && grep -q "registerIpcHandlers()" src/main/index.ts && test "$(grep -c '^\s*it(' tests/ipc.test.ts)" -ge 15 && grep -q "setPvpParty" src/main/ipc.ts` → exit 0 |
| F73 | IPC v3 | `src/shared/ipc.ts` adds `PVP_MATCH: 'desmon:pvp-match'`, `THEFTS: 'desmon:thefts'`, `RECLAIM: 'desmon:reclaim'` (+ `PvpPayload { matchId, party }`, `ReclaimPayload { theftId }`); `src/main/ipc.ts`: `ipcMain.handle` for the three (payload types validated), the `PVP` handler validates `{ matchId: string, party: string[] }` and calls `session.pvp(matchId, party)`, `narrowAction` gains `setPvpParty` (`strs('ids')`) and accepts an optional `replay` on `pvpResult` (validated: `opponentName` string, `opponentParty` array, `blows` array of `{ side, actorId, targetId, damage: string, ko }`; invalid → dropped), exported `sendToAll(channel, payload)` over `BrowserWindow.getAllWindows()`; preload gains `pvpMatch()`, `thefts()`, `reclaim(theftId)` and `pvp(matchId, party)` (2-space `name:` form, inlined channel literals, value-importing only `electron`); `global.d.ts` mirrors them; `tests/ipc.test.ts` EXTENDS the `toEqual` table, the preload `it.each` list, the `ipcMain.handle` list and the `global.d.ts` regex; `registerIpcHandlers()` literal kept (GAME_DESIGN_V3 §9) | claude | `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "PVP_MATCH: 'desmon:pvp-match'" src/shared/ipc.ts && grep -q "THEFTS: 'desmon:thefts'" src/shared/ipc.ts && grep -q "RECLAIM: 'desmon:reclaim'" src/shared/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP_MATCH' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.THEFTS' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.RECLAIM' src/main/ipc.ts && grep -q "export function sendToAll" src/main/ipc.ts && grep -q "setPvpParty" src/main/ipc.ts && grep -q "'desmon:pvp-match'" src/preload/index.ts && grep -q "pvpMatch" src/renderer/global.d.ts && grep -q "reclaim(" src/renderer/global.d.ts && grep -q "registerIpcHandlers()" src/main/index.ts && grep -q "pvp-match, thefts and reclaim handlers forward to the session and return its NetResult" tests/ipc.test.ts && grep -q "pvp handler requires a matchId string and a party string array" tests/ipc.test.ts && grep -q "narrowAction accepts setPvpParty and a validated pvpResult replay and drops malformed replays" tests/ipc.test.ts && test "$(grep -c '^\s*it(' tests/ipc.test.ts)" -ge 24` → exit 0 |

## 4. Verify the pick

The heading of T68 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T68a`,
  `T68b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T68): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-14.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T68 (branch lane/T68)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T68","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
