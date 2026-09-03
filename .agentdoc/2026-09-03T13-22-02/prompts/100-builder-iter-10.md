# Lane T70 — Builder (iteration 10)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T70
"Menu window 420×640 + Battle tab v3 markup + view.ts (opponentRows, partyPreview, togglePick, theftRows, battleEnabled)" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T70 (branch `lane/T70`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T70. The main checkout (two directories up) is off
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
   T70 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T70 — Menu window 420×640 + Battle tab v3 markup + view.ts (opponentRows, partyPreview, togglePick, theftRows, battleEnabled)
- AC: `npx vitest run tests/menu.test.ts tests/tray.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "width: 420" src/main/menuWindow.ts && grep -q "height: 640" src/main/menuWindow.ts && grep -q "menu.html" src/main/menuWindow.ts && grep -q "sandbox: true" src/main/menuWindow.ts && grep -q 'id="find"' static/menu.html && grep -q 'id="opponent"' static/menu.html && grep -q 'id="party"' static/menu.html && grep -q 'id="battle-go"' static/menu.html && grep -q 'id="thefts"' static/menu.html && grep -q 'id="save-party"' static/menu.html && grep -q 'id="auto"' static/menu.html && grep -q 'id="preview"' static/menu.html && grep -q "export function partyPreview" src/menu/view.ts && grep -q "export function togglePick" src/menu/view.ts && grep -q "export function theftRows" src/menu/view.ts && grep -q "export function opponentRows" src/menu/view.ts && grep -q "opponent rows render the previewed party in party order with type badges" tests/menu.test.ts && grep -q "party preview sums effective power against the opponent front member type" tests/menu.test.ts && grep -q "togglePick adds and removes ids and never exceeds 5" tests/menu.test.ts && grep -q "theft rows render the thief, the companion and the time left from the injected now" tests/menu.test.ts && grep -q "battle button is enabled only with a live match, a non-empty party and no cooldown" tests/menu.test.ts && test "$(grep -c '^\s*it(' tests/menu.test.ts)" -ge 18 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T54, T57
- Worker: claude
- Files: src/main/menuWindow.ts, static/menu.html, src/menu/view.ts, tests/menu.test.ts
- Notes: SPEC F75 (view half) + amended F52, Assumption 44; GAME_DESIGN_V3 §7 (ids/classes are normative — T63's CSS targets them). menuWindow.ts: `width: 420`, `height: 640`, every other option unchanged (`app.focus({ steal: true })`, singleton). static/menu.html Battle tab top → bottom: `#name` row + `#find` "Find opponent"; `#opponent` panel (`.party` of up to 5 `.card.mini`; empty → "No opponent yet"; bot → "Training Dummy (no party)"); `#party` editor (5 `.slot`, roster as `.card.mini.pick` buttons, `#auto`, `#save-party`, live `#preview` "Σ vs opponent: …"); `#battle-go` "Battle!"; `#result`; `#thefts` inbox. Roster cards gain `<span class="type type-fire">F</span>`-style badges and a "★ PvP" mark (markup only here; binding is T71). view.ts (pure, `MatchResult`/`Theft` types from `src/shared/api.ts`, core `pvpParty`/`autoParty`/`partyOrder`/`effectivePower`/`typeOf`/`format`): `opponentRows(match)`, `partyPreview(myParty, opponentParty)` (sum of `effectivePower` against the opponent's FRONT member type, raw sum without an opponent), `togglePick(ids, id)` (max 5), `theftRows(thefts, now)` (`"<thief> stole <Species Lv n> · <h>h <m>m left"`, `now` injected), `pvpResultText(result)` ("Victory over X — stole Y!" / "Victory over X." / "Defeat by X."), `battleEnabled(state)` (live match ∧ party ≥ 1 ∧ no cooldown). Titles verbatim (tests/menu.test.ts 13 → ≥ 18): "opponent rows render the previewed party in party order with type badges", "party preview sums effective power against the opponent front member type", "togglePick adds and removes ids and never exceeds 5", "theft rows render the thief, the companion and the time left from the injected now", "battle button is enabled only with a live match, a non-empty party and no cooldown"; keep every F55 view title. Do not edit src/menu/index.ts (T71). Smoke in AC → T22 dep.

Open task headings (context only — do NOT work on them):

### [~] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [~] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [~] T70 — Menu window 420×640 + Battle tab v3 markup + view.ts (opponentRows, partyPreview, togglePick, theftRows, battleEnabled)
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F52 | Collection window and tray item | `src/main/menuWindow.ts` `showMenuWindow()` focuses the existing window or creates one with `width: 420, height: 640, useContentSize: true, frame: true, resizable: false, minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, show: false, title: 'DesMon — Collection & Battle'`, webPreferences identical to the overlay (same preload path, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), `loadFile('static/menu.html')`, `once('ready-to-show')` → `show()` then `app.focus({ steal: true })`, reference dropped on `closed`; tray `COLLECTION_LABEL = 'Collection & Battle…'` between the separator and `RESET_LABEL`, `TrayMenuActions.openCollection` → `showMenuWindow()` in `src/main/index.ts` (order pin `app.dock?.hide()` → `createOverlayWindow()` kept); the tray item is the ONLY opener; never opened under `SMOKE=1` (`SMOKE_OK` stays gated on `desmon:first-frame` only); `static/menu.html` minimal shell (`<link rel="stylesheet" href="menu.css">`) until F54 | claude | `npx vitest run tests/tray.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "menu.html" src/main/menuWindow.ts && grep -q "app.focus({ steal: true })" src/main/menuWindow.ts && grep -q "width: 420" src/main/menuWindow.ts && grep -q "height: 640" src/main/menuWindow.ts && grep -q "sandbox: true" src/main/menuWindow.ts && grep -q "showMenuWindow" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts && grep -q "tray menu lists title, status, separator, Collection & Battle, Reset Progress, Quit in that order" tests/tray.test.ts && test -e static/menu.html && test "$(grep -c '^\s*it(' tests/tray.test.ts)" -ge 17 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |
| F55 | Menu ranking and battle | `src/menu/view.ts`: `leaderboardRows(result)` (rows rank/name/deepest/rebirths; `ok: false` → one `Offline` or `Cooldown` row), `pvpResultText(result)` (names the stolen or lost companion and the cooldown), `battleEnabled(state)` (false with 0 party members, during the countdown or without a loaded match; v3, F75); `src/menu/index.ts`: Ranking tab → `getLeaderboard(n?)` on open; Battle tab → name field (`setName(name)` on change, shows the returned `IdentityPayload.name`; ≤ 16 chars) and ONE `Battle!` button → v3 `pvp(matchId, ids)` after `Find opponent` → `pvpMatch()` (opponent chosen by the server, previewed with its party; manual party editor; F75); after a successful `leaderboard()`/`pvp()`: `value.removed.length` → `sendAction({ type: 'removeCompanions', ids })` first, then (pvp only) `sendAction({ type: 'pvpResult', won: win, stolen, lostId: lost?.id ?? null, replay })` (v3: `lost` is always null, `replay = { opponentName, opponentParty, blows }`), then the result text; `cooldown` → client countdown from `retryAfterSec`; `getIdentity().online === false` → tabs render `Offline` without calling the network | claude | `npx vitest run tests/menu.test.ts && grep -q "getLeaderboard" src/menu/index.ts && grep -q "pvp()" src/menu/index.ts && grep -q "setName" src/menu/index.ts && grep -q "getIdentity" src/menu/index.ts && grep -q "type: 'pvpResult'" src/menu/index.ts && grep -q "type: 'removeCompanions'" src/menu/index.ts && grep -q "leaderboard rows render rank, name, deepest monster and rebirths" tests/menu.test.ts && grep -q "offline or failed results render an Offline row" tests/menu.test.ts && grep -q "pvp result text names the stolen or lost companion and the cooldown" tests/menu.test.ts && grep -q "battle button is disabled with no companions or during cooldown" tests/menu.test.ts && grep -q "a successful pvp is forwarded to the game as a pvpResult action" tests/menu.test.ts && grep -q "pvpMatch" src/menu/index.ts` → exit 0 |
| F75 | Menu Battle tab v3 and roster badges | `src/main/menuWindow.ts` `width: 420, height: 640` (F52); `static/menu.html` Battle tab sections in order: `#name` row + `#find` (`Find opponent` → `pvpMatch()`), `#opponent` panel (name, rank/deepest, `.party` of up to 5 `.card.mini` in `partyOrder`; empty → `No opponent yet`; bot → `Training Dummy (no party)`), `#party` editor (5 `.slot`s from `pvpParty(save.companions, save.pvpParty)`, roster `.card.mini.pick` toggles with `.selected`, `#auto` = `autoParty`, `#save-party` → `sendAction({ type: 'setPvpParty', ids })`, live `#preview` `Σ vs opponent: <format(total)>`), `#battle-go` `Battle!` (enabled iff match loaded and not expired, ≥ 1 member, no countdown → `pvp(matchId, ids)`; success → `removeCompanions` if `removed`, then `pvpResult { won, stolen, lostId: null, replay }`, then `#result` via `pvpResultText`; `cooldown` → countdown; `expired` → opponent panel cleared with `Opponent expired — find again`), `#thefts` inbox (rows `"<thief> stole <Species Lv n> · <h>h <m>m left"` + `Reclaim` → `reclaim(theftId)` → `sendAction({ type: 'addCompanion', companion })` then re-list; `expired`/`gone` → row removed with the reason; refreshed on tab open and after every battle); Roster cards gain a `<span class="type type-…">` badge and a `★ PvP` mark for `pvpParty` members; `src/menu/view.ts` (pure): `opponentRows(match)`, `partyPreview(myParty, opponentParty)` (Σ `effectivePower` against the opponent's FRONT member type, raw sum without opponent), `togglePick(ids, id)` (max 5), `theftRows(thefts, now)` (`now` injected), `pvpResultText(result)`, `battleEnabled(state)`; `src/menu/index.ts` stays a thin binder (GAME_DESIGN_V3 §7, Assumption 29) | claude | `npx vitest run tests/menu.test.ts tests/tray.test.ts tests/window.test.ts && grep -q 'id="find"' static/menu.html && grep -q 'id="opponent"' static/menu.html && grep -q 'id="party"' static/menu.html && grep -q 'id="battle-go"' static/menu.html && grep -q 'id="thefts"' static/menu.html && grep -q 'id="save-party"' static/menu.html && grep -q "export function partyPreview" src/menu/view.ts && grep -q "export function togglePick" src/menu/view.ts && grep -q "export function theftRows" src/menu/view.ts && grep -q "export function opponentRows" src/menu/view.ts && grep -q "pvpMatch()" src/menu/index.ts && grep -q "type: 'setPvpParty'" src/menu/index.ts && grep -q "type: 'addCompanion'" src/menu/index.ts && grep -q "reclaim(" src/menu/index.ts && grep -q "Opponent expired" src/menu/index.ts && grep -q "opponent rows render the previewed party in party order with type badges" tests/menu.test.ts && grep -q "party preview sums effective power against the opponent front member type" tests/menu.test.ts && grep -q "togglePick adds and removes ids and never exceeds 5" tests/menu.test.ts && grep -q "theft rows render the thief, the companion and the time left from the injected now" tests/menu.test.ts && grep -q "battle button is enabled only with a live match, a non-empty party and no cooldown" tests/menu.test.ts && grep -q "a successful battle forwards removeCompanions then pvpResult with the replay to the game" tests/menu.test.ts && grep -q "an expired match clears the opponent panel" tests/menu.test.ts && grep -q "a successful reclaim forwards addCompanion to the game and refreshes the inbox" tests/menu.test.ts && grep -q "roster cards show a type badge and a PvP mark for party members" tests/menu.test.ts && test "$(grep -c '^\s*it(' tests/menu.test.ts)" -ge 22` → exit 0 |

## 4. Verify the pick

The heading of T70 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T70a`,
  `T70b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T70): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-10.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T70 (branch lane/T70)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T70","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
