# Lane T69 — Builder (iteration 18)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T69
"Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T69 (branch `lane/T69`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T69. The main checkout (two directories up) is off
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
   T69 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
- AC: `npx vitest run tests/thefts.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "THEFT_POLL_MS = 300_000" src/main/thefts.ts && grep -q "export function createTheftWatcher" src/main/thefts.ts && ! grep -q "electron" src/main/thefts.ts && ! grep -q "setInterval(" src/main/thefts.ts && grep -q "Notification.isSupported()" src/main/index.ts && grep -q "createTheftWatcher" src/main/index.ts && grep -q "type: 'addCompanion'" src/main/index.ts && grep -q "will-quit" src/main/index.ts && grep -q "poll notifies each pending theft once and records its id" tests/thefts.test.ts && grep -q "start polls immediately then every intervalMs on the injected timer and stop clears it" tests/thefts.test.ts && grep -q "an offline session notifies nothing" tests/thefts.test.ts && grep -q "notifiedTheftIds is capped at 32" tests/thefts.test.ts && grep -q "the watcher is never started under SMOKE" tests/window.test.ts && test "$(grep -c '^\s*it(' tests/thefts.test.ts)" -ge 4 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T68
- Worker: claude
- Files: src/main/thefts.ts, src/main/index.ts, tests/thefts.test.ts, tests/window.test.ts
- Notes: SPEC F74, Assumptions 46/49, `## Input Abstraction` theft-poller bullet; GAME_DESIGN_V3 §8 (normative). New electron-free `src/main/thefts.ts`: `THEFT_POLL_MS = 300_000`, `createTheftWatcher({ session, notify, setInterval, clearInterval, intervalMs = THEFT_POLL_MS, readIdentity, writeIdentity })` → `start()` (poll immediately, then every `intervalMs` on the INJECTED timer — the `! grep "setInterval("` pin forbids the global), `stop()`, `poll()` (`session.thefts()`; `ok: false` → nothing; each pending theft whose id is not in `identity.notifiedTheftIds` → `notify(t)` + record, list capped at 32). src/main/index.ts (non-SMOKE branch only, `isSmoke` guard — the watcher is never started under SMOKE and never fetches): `Notification.isSupported()` false → skip silently; `notify` = `new Notification({ title: 'DesMon', body: \`${t.thiefName} stole your ${speciesName} Lv ${level}! Click to reclaim (${hoursLeft}h left).\` })` with `on('click', …)` → `session.reclaim(id)` → `ok` → `sendToAll(IPC.ACTION, { type: 'addCompanion', companion })` (the ONE main-originated action; `narrowAction` already accepts `addCompanion`; a full roster drops it by the existing rule); `will-quit` → `stop()`. Risky/unknown tech (native `Notification`): guard everything, never crash main. Titles verbatim (tests/thefts.test.ts new, ≥ 4, fake timers + fake session + in-memory identity): "poll notifies each pending theft once and records its id", "start polls immediately then every intervalMs on the injected timer and stop clears it", "an offline session notifies nothing", "notifiedTheftIds is capped at 32"; tests/window.test.ts (source-contract) "the watcher is never started under SMOKE". Files overlap T65 on tests/window.test.ts — `plan.mjs ready` serialises them; do not add a dep. Smoke in AC → T22 dep.

Open task headings (context only — do NOT work on them):

### [~] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [~] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F74 | Theft watcher and native notification | `src/main/thefts.ts` (electron-free): `THEFT_POLL_MS = 300_000`, `createTheftWatcher({ session, notify, setInterval, clearInterval, intervalMs = THEFT_POLL_MS, readIdentity, writeIdentity })` → `start()` (immediate `poll()` then every `intervalMs`), `stop()`, `poll()` (calls `session.thefts()`; for every pending theft whose id is not in `identity.notifiedTheftIds` calls `notify(t)` and records the id, capped at 32; `ok: false` → nothing; never throws); `src/main/index.ts` (non-SMOKE branch only): `Notification.isSupported()` guard; `notify` = `new Notification({ title: 'DesMon', body: '<thief> stole your <Species> Lv <n>! Click to reclaim (<h>h left).' })` with `on('click', () => reclaimAndApply(t.id))`: `session.reclaim(id)` → `ok` → `sendToAll(IPC.ACTION, { type: 'addCompanion', companion })` (the ONE main-originated action); `will-quit` → `stop()`; `isSmoke` never starts the watcher and never fetches; timers are injected in tests (Assumptions 46, 49; GAME_DESIGN_V3 §8) | claude | `npx vitest run tests/thefts.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "THEFT_POLL_MS = 300_000" src/main/thefts.ts && grep -q "export function createTheftWatcher" src/main/thefts.ts && ! grep -q "electron" src/main/thefts.ts && ! grep -q "setInterval(" src/main/thefts.ts && grep -q "Notification.isSupported()" src/main/index.ts && grep -q "createTheftWatcher" src/main/index.ts && grep -q "type: 'addCompanion'" src/main/index.ts && grep -q "will-quit" src/main/index.ts && grep -q "poll notifies each pending theft once and records its id" tests/thefts.test.ts && grep -q "start polls immediately then every intervalMs on the injected timer and stop clears it" tests/thefts.test.ts && grep -q "an offline session notifies nothing" tests/thefts.test.ts && grep -q "notifiedTheftIds is capped at 32" tests/thefts.test.ts && grep -q "the watcher is never started under SMOKE" tests/window.test.ts && test "$(grep -c '^\s*it(' tests/thefts.test.ts)" -ge 4 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T69 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T69a`,
  `T69b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T69): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-18.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T69 (branch lane/T69)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T69","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
