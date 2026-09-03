# Lane T26 — Builder (iteration 25)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T26
"Boss cadence in core: every 8th monster, 5× hp/xp/coins" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T26 (branch `lane/T26`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T26. The main checkout (two directories up) is off
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
   T26 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
- AC: `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/loot.test.ts && grep -q "BOSS_EVERY = 8" src/core/monsters.ts && grep -q "boss: boolean" src/core/types.ts && grep -q "every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles" tests/formulas.test.ts && grep -q "killing a boss grants 5x xp and 5x coins" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 12 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 17` → exit 0
- Deps: T25
- Worker: claude
- Files: src/core/monsters.ts, src/core/types.ts, src/core/engine.ts, src/core/index.ts, tests/formulas.test.ts, tests/engine.test.ts
- Notes: SPEC F31 (Assumptions 4/22; GAME_DESIGN_V2 §3). monsters.ts: `BOSS_EVERY = 8`, `isBoss(i) = i >= 0 && i % BOSS_EVERY === BOSS_EVERY - 1` (7, 15, 23 …), `BOSS_HP_MULT = 5n`, `BOSS_XP_MULT = 5`, `BOSS_COIN_MULT = 5`; `MonsterDef.boss: boolean`; boss `maxHp = monsterMaxHp(i) * BOSS_HP_MULT`, name `${Name} Lv.${tier + 1} BOSS` (Lv is tier+1, pinned since T05); the species keeps cycling (8 is not a multiple of 5). engine.ts: on a boss kill `xpGained = xpReward(i) * BOSS_XP_MULT` and the coin drop `amount *= BOSS_COIN_MULT` (loot.ts UNTOUCHED — its exact-coin tests stand; `drops[0]` is always the coin). No new rng draw. Existing test "monsterForIndex maxHp always equals monsterMaxHp(index)" keeps its title — assert `maxHp === monsterMaxHp(i) * (isBoss(i) ? 5n : 1n)`. No v1 test pins an index ≡ 7 (mod 8). Barrel: add `BOSS_EVERY, isBoss` to the named monsters export list (the barrel is a named list, not `export *`). Test titles verbatim: "every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles" (formulas ≥ 12), "killing a boss grants 5x xp and 5x coins" (engine ≥ 17). Shares engine.ts/types.ts/index.ts with T27/T29 — the scheduler withholds overlapping tasks while one is in progress.

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
### [~] T42 — Main net client + net session: injected fetch, 5000 ms timeout, never throws, 401 re-register
### [ ] T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin
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

| F31 | Boss cadence | `src/core/monsters.ts`: `BOSS_EVERY = 8`, `isBoss(i) = i ≥ 0 && i % 8 === 7`, `BOSS_HP_MULT = 5n`, `BOSS_XP_MULT = 5`, `BOSS_COIN_MULT = 5`; `MonsterDef.boss: boolean`; boss `maxHp = monsterMaxHp(i) * 5n`, name `${Name} Lv.${tier+1} BOSS`; the species still cycles; engine multiplies `xpGained` and the coin drop amount for bosses (`loot.ts` untouched, its exact-coin tests stand); `isBoss`/`BOSS_EVERY` exported from the barrel | claude | `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/loot.test.ts && grep -q "BOSS_EVERY = 8" src/core/monsters.ts && grep -q "boss: boolean" src/core/types.ts && grep -q "every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles" tests/formulas.test.ts && grep -q "killing a boss grants 5x xp and 5x coins" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 12 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 17` → exit 0 |

## 4. Verify the pick

The heading of T26 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T26a`,
  `T26b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T26): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-25.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T26 (branch lane/T26)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T26","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
