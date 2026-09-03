# Lane T28 — Builder (iteration 29)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T28
"Engine: boss capture roll, apply(action), bestIndex, souls damage" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T28 (branch `lane/T28`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T28. The main checkout (two directories up) is off
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
   T28 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
- AC: `npx vitest run tests/engine.test.ts tests/collection.test.ts && grep -q "CAPTURE_CHANCE = 0.35" src/core/engine.ts && grep -q "apply(a: CollectionAction)" src/core/engine.ts && grep -q "a boss kill rolls capture after loot and emits bossCaptured with a c-prefixed id at 35 percent" tests/engine.test.ts && grep -q "non-boss kills consume exactly the v1 rng draws" tests/engine.test.ts && grep -q "a capture into a full roster of 30 is skipped but still spends the draw" tests/engine.test.ts && grep -q "apply(rebirth) emits rebirth and multiplies hero damage by 1 plus souls" tests/engine.test.ts && grep -q "apply with an invalid action emits nothing and leaves state untouched" tests/engine.test.ts && grep -q "bestIndex tracks the deepest monster index ever spawned" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 23` → exit 0
- Deps: T26, T27
- Worker: claude
- Files: src/core/engine.ts, src/core/types.ts, tests/engine.test.ts
- Notes: SPEC F33 (Assumptions 23/27; GAME_DESIGN_V2 §3, §6, §7). `CAPTURE_CHANCE = 0.35`. Kill order `attack, monsterHit, monsterKilled, itemDropped, [bossCaptured], [levelUp…], monsterSpawned` — the capture draw (`rng.next() < CAPTURE_CHANCE`) comes AFTER the loot roll and is ALWAYS consumed on a boss kill, skipped (draw still spent) when `companions.length ≥ ROSTER_CAP`; non-boss kills consume exactly the v1 sequence (crit, loot 1–2) so "same seed yields an identical event log" stays byte-identical. Captured `{ id: \`c${nextCompanionId++}\`, speciesId, bossIndex: i, level: 1, stars: 0 }` pushed, event `bossCaptured { companion }` — ids from the counter, never uuid. Hero damage gains `* BigInt(1 + souls)`. `bestIndex = max(bestIndex, monster.index)` on every spawn and at resume. `apply(a: CollectionAction): GameEvent[]` runs `applyCollection` on the live state; `{ error }` → `[]`, state untouched; fever state (T29) preserved across apply. types.ts: `GameEvent` gains `bossCaptured`, `rebirth`, `pvpResolved`; `Engine` gains `apply`; `CollectionAction` type-imported from collection.ts. `getState()` keeps returning defensive copies (companions array copied). Test titles verbatim in the AC; engine ≥ 23 `it(`. The 35 % test: seeded 10000 boss kills, capture band 32–38 % (Assumption 15 style).

Open task headings (context only — do NOT work on them):

### [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [ ] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
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

| F33 | Boss capture and `engine.apply` | `src/core/engine.ts`: `CAPTURE_CHANCE = 0.35`; on a boss kill ONE extra `rng.next() < CAPTURE_CHANCE` draw AFTER the loot roll, always consumed, capture skipped when the roster holds 30 (Assumption 23); captured companion `{ id: c${nextCompanionId++}, speciesId, bossIndex: i, level: 1, stars: 0 }` pushed and `bossCaptured { companion }` emitted after `itemDropped`; non-boss kills consume exactly the v1 draw sequence (the "same seed yields an identical event log" test proves it); hero damage gains `* BigInt(1 + souls)`; `bestIndex = max(bestIndex, index)` on every spawn and at resume; `apply(a: CollectionAction): GameEvent[]` runs `applyCollection` on the live state (`{ error }` → `[]`, state untouched; fever preserved); `GameEvent` gains `bossCaptured`, `rebirth`, `pvpResolved` | claude | `npx vitest run tests/engine.test.ts tests/collection.test.ts && grep -q "CAPTURE_CHANCE = 0.35" src/core/engine.ts && grep -q "apply(a: CollectionAction)" src/core/engine.ts && grep -q "a boss kill rolls capture after loot and emits bossCaptured with a c-prefixed id at 35 percent" tests/engine.test.ts && grep -q "non-boss kills consume exactly the v1 rng draws" tests/engine.test.ts && grep -q "a capture into a full roster of 30 is skipped but still spends the draw" tests/engine.test.ts && grep -q "apply(rebirth) emits rebirth and multiplies hero damage by 1 plus souls" tests/engine.test.ts && grep -q "apply with an invalid action emits nothing and leaves state untouched" tests/engine.test.ts && grep -q "bestIndex tracks the deepest monster index ever spawned" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 23` → exit 0 |

## 4. Verify the pick

The heading of T28 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T28a`,
  `T28b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T28): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-29.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T28 (branch lane/T28)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T28","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
