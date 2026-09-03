# Lane T61 — Builder (iteration 15)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T61
"Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T61 (branch `lane/T61`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T61. The main checkout (two directories up) is off
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
   T61 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
- AC: `npx vitest run tests/server/app.test.ts tests/server/pvp.test.ts && grep -q "/v1/thefts" src/server/app.ts && grep -q "/v1/reclaim" src/server/app.ts && grep -q "'expired'" src/server/app.ts && grep -q "'gone'" src/server/app.ts && grep -q "thefts lists only pending records and prunes expired ones" tests/server/app.test.ts && grep -q "reclaim returns the companion under an r id and removes it from the thief" tests/server/app.test.ts && grep -q "reclaim after the window returns 410 expired and drops the record" tests/server/app.test.ts && grep -q "reclaim when the thief no longer holds the companion returns 409 gone" tests/server/app.test.ts && grep -q "snapshot upload answers with the pending thefts" tests/server/app.test.ts && test "$(grep -c '^\s*it(' tests/server/app.test.ts)" -ge 18` → exit 0
- Deps: T60
- Worker: claude
- Files: src/server/app.ts, tests/server/app.test.ts
- Notes: SPEC F70, `## Server / API` rows `/v1/thefts`, `/v1/reclaim`, Reclaim expired, Reclaim gone, `PUT /v1/snapshot` (`thefts`); SERVER_ARCHITECTURE_V3 §3. `GET /v1/thefts`: pending = `reclaimUntil >= now()`, expired entries pruned lazily via `setThefts`. `POST /v1/reclaim { theftId }`: not in MY row → 404 `not_found`; `now() > reclaimUntil` → 410 `expired` (pruned); thief row missing or its roster lacks `transferredId` → 409 `gone` (pruned); else thief roster `without(transferredId)` + thief `stolenIds += transferredId`, returned `{ ...theft.companion, id: 'r' + theft.id.slice(1) }`, my roster `+= returned` only if `< ROSTER_CAP` (full → still 200), record removed, `putSnapshot` both, `setStolenIds(thief)`, `setThefts(me)`. `PUT /v1/snapshot` response gains `thefts` (pending). Titles verbatim (tests/server/app.test.ts 13 → ≥ 18): "thefts lists only pending records and prunes expired ones", "reclaim returns the companion under an r id and removes it from the thief", "reclaim after the window returns 410 expired and drops the record", "reclaim when the thief no longer holds the companion returns 409 gone", "snapshot upload answers with the pending thefts". Error body always `{ error }`; `handle()` never throws; rate limit + bearer as v2.

Open task headings (context only — do NOT work on them):

### [~] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
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

| F70 | Server thefts and reclaim endpoints | `src/server/app.ts`: `GET /v1/thefts` → `200 { thefts }` pending only (`reclaimUntil ≥ now()`; expired entries pruned lazily via `setThefts`); `POST /v1/reclaim { theftId }`: theft must be in MY row (else 404 `not_found`); `now() > reclaimUntil` → 410 `expired` (pruned); thief row missing or its roster lacks `transferredId` → 409 `gone` (pruned); else thief roster `without(transferredId)`, thief `stolenIds += transferredId`, returned `{ ...theft.companion, id: 'r' + theft.id.slice(1) }`, my roster `+= returned` only if `< ROSTER_CAP` (full → still 200, the client's `addCompanion` rule drops it), theft removed, `putSnapshot` both, `setStolenIds(thief)`, `setThefts(me)`; `PUT /v1/snapshot` response gains `thefts` (pending) and accepts `party`; injected `now` only (SERVER_ARCHITECTURE_V3 §3, Assumptions 46–47) | claude | `npx vitest run tests/server/app.test.ts && grep -q "/v1/thefts" src/server/app.ts && grep -q "/v1/reclaim" src/server/app.ts && grep -q "'expired'" src/server/app.ts && grep -q "'gone'" src/server/app.ts && grep -q "thefts lists only pending records and prunes expired ones" tests/server/app.test.ts && grep -q "reclaim returns the companion under an r id and removes it from the thief" tests/server/app.test.ts && grep -q "reclaim after the window returns 410 expired and drops the record" tests/server/app.test.ts && grep -q "reclaim when the thief no longer holds the companion returns 409 gone" tests/server/app.test.ts && grep -q "snapshot upload answers with the pending thefts" tests/server/app.test.ts && test "$(grep -c '^\s*it(' tests/server/app.test.ts)" -ge 18` → exit 0 |

## 4. Verify the pick

The heading of T61 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T61a`,
  `T61b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T61): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-15.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T61 (branch lane/T61)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T61","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
