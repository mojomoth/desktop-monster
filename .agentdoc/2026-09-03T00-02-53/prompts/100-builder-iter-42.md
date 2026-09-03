# Lane T47 — Builder (iteration 42)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T47
"Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T47 (branch `lane/T47`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T47. The main checkout (two directories up) is off
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
   T47 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
- AC: `npx vitest run tests/renderer.test.ts && grep -q "onAction" src/renderer/index.ts && grep -q "apply(a: CollectionAction)" src/renderer/game.ts && grep -q "apply() forwards collection actions to the engine and reports its events" tests/renderer.test.ts && grep -q "apply(removeCompanions) never touches in-flight presentation" tests/renderer.test.ts && grep -q "a won pvp shows the VICTORY banner and pops the stolen companion in" tests/renderer.test.ts && grep -q "a lost pvp shows the DEFEAT banner and scatters the lost companion" tests/renderer.test.ts && grep -q "a rebirth flushes presentation and restarts at monster 0" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 64 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T37, T45
- Worker: claude
- Files: src/renderer/game.ts, src/renderer/index.ts, tests/renderer.test.ts
- Notes: SPEC F53 + F22 flush rule (Assumptions 26/29/34); GAME_DESIGN_V2 §6, §9. index.ts: `window.desmon.onAction((a) => { saves.onEvents(game.apply(a)); saves.flush(); })` — the flush triggers `SAVE_STATE` → main relays `STATE_CHANGED` to the menu (closing the loop with no new state ownership); keep every T16 literal (`saves.onEvents(game.attack(event.source))`, `window.desmon.saveState(game.toSave())`, `addEventListener('blur'`, `saves.flush()`, `game.reset()`, T37's `saves.onEvents(game.update(dt))`). game.ts: `apply(a: CollectionAction): GameEvent[]` routes the engine's events through the shared `handleEvents`: `pvpResolved` → `showBanner(banner, won ? VICTORY_TEXT : DEFEAT_TEXT)` (T34), `stolen` → `captureSparkle` at its slot (pop-in), `lostId` → `spawnSpriteScatter` of its species idle art at the former slot; `rebirth` → the same presentation clear as `reset()` then the spawn pop-in at monster 0; `removeCompanions` never touches in-flight presentation (floats, particles, drops keep running). No arena replay. Test titles verbatim in the AC; renderer ≥ 64. Smoke stays offline; the menu window is never opened under SMOKE.

Open task headings (context only — do NOT work on them):

### [~] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F22 | Persistence wiring | Main writes `save.json` atomically (tmp file + rename) under userData; renderer loads save at boot, saves on every kill and level-up (companion kills included), debounced 500ms after damage, on window blur, and flushes immediately after every applied collection action (F53); tray "Reset Progress" resets engine to defaults and saves | `grep -q "save.json" src/main/persistence.ts && grep -q rename src/main/persistence.ts && npx vitest run tests/save.test.ts` → exit 0 (restart round-trip: Manual M5) |
| F53 | Game window applies actions | `src/renderer/index.ts`: `window.desmon.onAction((a) => { saves.onEvents(game.apply(a)); saves.flush(); })` (the flush triggers `SAVE_STATE` → main relays `STATE_CHANGED` to the menu); `src/renderer/game.ts` `apply(a: CollectionAction): GameEvent[]` routes the engine's events through the shared `handleEvents`: `pvpResolved` → `showBanner(banner, won ? VICTORY_TEXT : DEFEAT_TEXT)`, stolen → `captureSparkle` at its slot (pop-in), lostId → `spawnSpriteScatter` of its species idle art at the former slot; `rebirth` → the same presentation clear as `reset()` then spawn pop-in at monster 0; `removeCompanions` never touches in-flight presentation; no arena replay | claude | `npx vitest run tests/renderer.test.ts && grep -q "onAction" src/renderer/index.ts && grep -q "apply(a: CollectionAction)" src/renderer/game.ts && grep -q "apply() forwards collection actions to the engine and reports its events" tests/renderer.test.ts && grep -q "apply(removeCompanions) never touches in-flight presentation" tests/renderer.test.ts && grep -q "a won pvp shows the VICTORY banner and pops the stolen companion in" tests/renderer.test.ts && grep -q "a lost pvp shows the DEFEAT banner and scatters the lost companion" tests/renderer.test.ts && grep -q "a rebirth flushes presentation and restarts at monster 0" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 64 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T47 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T47a`,
  `T47b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T47): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-42.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T47 (branch lane/T47)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T47","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
