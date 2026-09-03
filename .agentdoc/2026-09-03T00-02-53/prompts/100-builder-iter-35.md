# Lane T46 — Builder (iteration 35)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T46
"Menu window + tray item "Collection & Battle…"" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T46 (branch `lane/T46`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T46. The main checkout (two directories up) is off
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
   T46 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T46 — Menu window + tray item "Collection & Battle…"
- AC: `npx vitest run tests/tray.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "menu.html" src/main/menuWindow.ts && grep -q "app.focus({ steal: true })" src/main/menuWindow.ts && grep -q "width: 380" src/main/menuWindow.ts && grep -q "height: 520" src/main/menuWindow.ts && grep -q "sandbox: true" src/main/menuWindow.ts && grep -q "showMenuWindow" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts && grep -q "tray menu lists title, status, separator, Collection & Battle, Reset Progress, Quit in that order" tests/tray.test.ts && test -e static/menu.html && test "$(grep -c '^\s*it(' tests/tray.test.ts)" -ge 17 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T45
- Worker: claude
- Files: src/main/menuWindow.ts, src/main/index.ts, src/main/tray.ts, static/menu.html, tests/tray.test.ts
- Notes: SPEC F52 + F23 (Assumptions 16/29); GAME_DESIGN_V2 §9 window block verbatim. Risky-tech task (LSUIElement app + framed DOM window + `app.focus`) pulled as early as its deps allow. menuWindow.ts: singleton `showMenuWindow()` focuses the existing window or creates `new BrowserWindow({ width: 380, height: 520, useContentSize: true, frame: true, resizable: false, minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, show: false, title: 'DesMon — Collection & Battle', webPreferences: { preload: <same path as window.ts>, contextIsolation: true, nodeIntegration: false, sandbox: true } })`, `loadFile('static/menu.html')`, `once('ready-to-show')` → `show()` then `app.focus({ steal: true })`; reference dropped on `closed`. tray.ts: `COLLECTION_LABEL = 'Collection & Battle…'` between the separator and `RESET_LABEL`; `TrayMenuActions.openCollection`; tests/tray.test.ts: retitle the order test to "tray menu lists title, status, separator, Collection & Battle, Reset Progress, Quit in that order" and EXTEND its `toEqual` list; `noopActions()` gains the new action (tray ≥ 17, count never drops). `TRAY_TITLE` stays `DesMon v0.1.0` here (tests/tray.test.ts compares it to package.json — T50 bumps both). index.ts: `openCollection: () => showMenuWindow()` in the existing `setupTray` actions — never called under SMOKE (no tray clicks), so `SMOKE_OK` stays gated on `desmon:first-frame` only; keep every pinned literal/order (`registerIpcHandlers()`, `app.dock?.hide()` before `createOverlayWindow()`, `new Tray(...)`, `Menu.buildFromTemplate(template)`, `tray.refresh(payload)` after `win.webContents.send(IPC.INPUT_MODE, payload)`, T22's `desmon-smoke-` before `requestSingleInstanceLock()`). static/menu.html here is a minimal shell (`<link rel="stylesheet" href="menu.css">`, a `<h1>`, no script) — T48 replaces it. The tray item is the ONLY opener; no hotkey.

Open task headings (context only — do NOT work on them):

### [~] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [~] T46 — Menu window + tray item "Collection & Battle…"
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F23 | Tray icon & menu | Tray icon is a 16×16 pixel matrix encoded to PNG in code (node:zlib deflate + CRC, no asset file) via `nativeImage.createFromBuffer`; menu: `DesMon v0.2.0` (disabled), input-mode status / "Grant Accessibility…" (opens the Privacy pane deep link), separator, `Collection & Battle…` (opens the menu window, F52), `Reset Progress`, `Quit`; menu rebuilds on mode change | `grep -q "Reset Progress" src/main/tray.ts && grep -q Quit src/main/tray.ts && grep -q deflateSync src/main/trayIcon.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "DesMon v0.2.0" src/main/tray.ts` → exit 0 (visibility/behavior: Manual M6) |
| F52 | Collection window and tray item | `src/main/menuWindow.ts` `showMenuWindow()` focuses the existing window or creates one with `width: 380, height: 520, useContentSize: true, frame: true, resizable: false, minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, show: false, title: 'DesMon — Collection & Battle'`, webPreferences identical to the overlay (same preload path, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), `loadFile('static/menu.html')`, `once('ready-to-show')` → `show()` then `app.focus({ steal: true })`, reference dropped on `closed`; tray `COLLECTION_LABEL = 'Collection & Battle…'` between the separator and `RESET_LABEL`, `TrayMenuActions.openCollection` → `showMenuWindow()` in `src/main/index.ts` (order pin `app.dock?.hide()` → `createOverlayWindow()` kept); the tray item is the ONLY opener; never opened under `SMOKE=1` (`SMOKE_OK` stays gated on `desmon:first-frame` only); `static/menu.html` minimal shell (`<link rel="stylesheet" href="menu.css">`) until F54 | claude | `npx vitest run tests/tray.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "menu.html" src/main/menuWindow.ts && grep -q "app.focus({ steal: true })" src/main/menuWindow.ts && grep -q "width: 380" src/main/menuWindow.ts && grep -q "height: 520" src/main/menuWindow.ts && grep -q "sandbox: true" src/main/menuWindow.ts && grep -q "showMenuWindow" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts && grep -q "tray menu lists title, status, separator, Collection & Battle, Reset Progress, Quit in that order" tests/tray.test.ts && test -e static/menu.html && test "$(grep -c '^\s*it(' tests/tray.test.ts)" -ge 17 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T46 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T46a`,
  `T46b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T46): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-35.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T46 (branch lane/T46)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T46","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
