# Lane T27 — Builder (iteration 27)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T27
"Collection core: companionPower, activeCompanions, lifecycle actions, roster cap" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T27 (branch `lane/T27`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T27. The main checkout (two directories up) is off
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
   T27 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
- AC: `npx vitest run tests/collection.test.ts && grep -q "ROSTER_CAP = 30" src/core/collection.ts && grep -q "COMPANION_MAX_LEVEL = 10" src/core/collection.ts && grep -q "export function applyCollection" src/core/collection.ts && grep -q "companionPower is floor(monsterMaxHp(bossIndex)/20), at least 1, times level times 2^stars" tests/collection.test.ts && grep -q "consume adds 1 plus food stars levels, caps at 10 and removes the food" tests/collection.test.ts && grep -q "fuse needs same species and stars and yields stars+1 at level 1" tests/collection.test.ts && grep -q "reincarnate needs max level and resets to level 1 with stars+1" tests/collection.test.ts && grep -q "sacrifice removes the companion and adds 1 plus stars souls" tests/collection.test.ts && grep -q "rebirth needs monsterIndex 40 or more, adds floor(index/8) souls and resets the run" tests/collection.test.ts && grep -q "activeCompanions picks the 3 strongest, ties by id" tests/collection.test.ts && grep -q "addCompanion refuses a full roster of 30 and removeCompanions ignores unknown ids" tests/collection.test.ts && grep -q "pvpResult adds the stolen companion with a re-minted id and removes the lost one" tests/collection.test.ts` → exit 0
- Deps: T25
- Worker: claude
- Files: src/core/collection.ts, src/core/index.ts, tests/collection.test.ts
- Notes: SPEC F32 (Assumptions 5/23/24/26; GAME_DESIGN_V2 §4, §6). `COMPANION_MAX_LEVEL = 10`, `ACTIVE_SLOTS = 3`, `ROSTER_CAP = 30`, `REBIRTH_MIN_INDEX = 40`; `companionPower(c) = max(1n, monsterMaxHp(c.bossIndex) / 20n) * BigInt(c.level) * 2n ** BigInt(c.stars)`; `activeCompanions(cs)` = top 3 by power desc, tie → lower numeric id part. `CollectionAction` union exactly per §6 (`consume {targetId, foodId}` target.level += 1 + food.stars capped at 10, food removed, target ≠ food; `fuse {aId, bId}` same speciesId && same stars → a.stars + 1, level 1, bossIndex = max, b removed; `reincarnate {id}` level === 10 → level 1, stars + 1; `sacrifice {id}` removed, souls += 1 + stars; `rebirth` needs `state.monster.index ≥ 40`: souls += ⌊index/8⌋, rebirths + 1, level 1, xp 0, monster `monsterForIndex(0)`, monsterHp `maxHp(0)`, keeps companions/items/coins/killCount/bestIndex/nextCompanionId; `addCompanion {companion}` re-minted as `c${nextCompanionId++}`, full → error; `removeCompanions {ids}` unknown ids ignored, never an error; `pvpResult {won, stolen, lostId}` lostId removed if present, stolen added via the addCompanion rule and dropped SILENTLY when full). `applyCollection(state, action) → { state, events } | { error }` — total, never mutates input, fresh objects out; unknown type/ids → `{ error }`. Events only `rebirth { souls }` and `pvpResolved { won, stolen, lostId }`; there is NO `rosterChanged` action or event (ponytail). `GameEvent` variants `rebirth`/`pvpResolved` may be declared here in types via T28 — if T28 has not landed, declare the two event shapes locally in collection.ts and let T28 fold them into the union (do not edit types.ts here: T26/T28/T29 own it). Barrel: `export * from './collection.js';` so T36 needs no barrel edit. `resolvePvp` is T36, not here. All 9 test titles verbatim in the AC. `src/shared/api.ts` (T38) declares its own structural Companion — never import shared from core.

Open task headings (context only — do NOT work on them):

### [~] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
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

| F32 | Companion collection lifecycle | `src/core/collection.ts` (pure, total, never mutates input): `COMPANION_MAX_LEVEL = 10`, `ACTIVE_SLOTS = 3`, `ROSTER_CAP = 30`, `REBIRTH_MIN_INDEX = 40`, `companionPower(c)` (Assumption 24), `activeCompanions(cs)` (top 3 by power desc, tie → lower numeric id part), `CollectionAction` union and `applyCollection(state, action) → { state, events } or { error }` per Assumption 26 (unknown type/ids → error; rebirth keeps companions/items/coins/killCount/bestIndex/nextCompanionId and adds `⌊index/8⌋` souls); events only `rebirth { souls }` and `pvpResolved { won, stolen, lostId }`; barrel `export * from './collection.js'` | claude | `npx vitest run tests/collection.test.ts && grep -q "ROSTER_CAP = 30" src/core/collection.ts && grep -q "COMPANION_MAX_LEVEL = 10" src/core/collection.ts && grep -q "export function applyCollection" src/core/collection.ts && grep -q "companionPower is floor(monsterMaxHp(bossIndex)/20), at least 1, times level times 2^stars" tests/collection.test.ts && grep -q "consume adds 1 plus food stars levels, caps at 10 and removes the food" tests/collection.test.ts && grep -q "fuse needs same species and stars and yields stars+1 at level 1" tests/collection.test.ts && grep -q "reincarnate needs max level and resets to level 1 with stars+1" tests/collection.test.ts && grep -q "sacrifice removes the companion and adds 1 plus stars souls" tests/collection.test.ts && grep -q "rebirth needs monsterIndex 40 or more, adds floor(index/8) souls and resets the run" tests/collection.test.ts && grep -q "activeCompanions picks the 3 strongest, ties by id" tests/collection.test.ts && grep -q "addCompanion refuses a full roster of 30 and removeCompanions ignores unknown ids" tests/collection.test.ts && grep -q "pvpResult adds the stolen companion with a re-minted id and removes the lost one" tests/collection.test.ts` → exit 0 |

## 4. Verify the pick

The heading of T27 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T27a`,
  `T27b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T27): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-27.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T27 (branch lane/T27)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T27","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
