# Lane T30 — Builder (iteration 38)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T30
"Engine tick: companion volley every 1000 ms from the 3 strongest" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T30 (branch `lane/T30`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T30. The main checkout (two directories up) is off
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
   T30 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
- AC: `npx vitest run tests/engine.test.ts && grep -q "COMPANION_ATTACK_MS = 1000" src/core/engine.ts && grep -q "function applyDamage" src/core/engine.ts && grep -q "tick fires one volley per 1000ms from the 3 strongest companions and kills chain into the next monster" tests/engine.test.ts && grep -q "tick with no companions emits nothing and never spends rng draws" tests/engine.test.ts && grep -q "companion damage is tripled during fever and never crits" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 26` → exit 0
- Deps: T28, T29
- Worker: claude
- Files: src/core/engine.ts, src/core/types.ts, tests/engine.test.ts
- Notes: SPEC F35 (Assumption 24; GAME_DESIGN_V2 §4). `COMPANION_ATTACK_MS = 1000`; `tick(dt)` accumulates `volleyAcc` and fires `⌊dt/1000⌋` volleys (remainder kept; the renderer clamps dt to 100 anyway); per volley, each of `activeCompanions(companions)` (recomputed per volley) in order deals `companionPower(c) * (feverActive ? FEVER_MULT : 1n)` — never crits — → events `companionAttack { companionId, speciesId, damage }`, `monsterHit`, then the shared kill chain. Refactor the damage/kill chain into ONE `applyDamage(damage, events)` used by `attack()` and the volley: kills chain into the next monster inside the same volley and roll loot/capture exactly like hero kills (rng draws only on kills). No companions → no events, no rng draws. `GameEvent` gains `companionAttack`. Test titles verbatim in the AC; engine ≥ 26 `it(`. Keep every earlier engine title (F06/F07/F08/F11/F31/F33/F34) green.

Open task headings (context only — do NOT work on them):

### [~] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [~] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F06 | Deterministic RNG & crits | `src/core/rng.ts` exports `Rng` interface + `mulberry32(seed)`; engine takes an injected Rng; crits: 10% chance, ×2 damage | tests `tests/engine.test.ts :: "same seed yields an identical event log"` and `:: "crit rate over 10000 seeded attacks is within 8 to 12 percent"` exist and pass |
| F07 | Attack engine event sequence | `createEngine(save?, rng?)` exposes `attack(source)`, `getState()`, `toSave()`; a non-killing attack emits `attack, monsterHit`; a killing blow emits `attack, monsterHit, monsterKilled, itemDropped[, bossCaptured][, levelUp], monsterSpawned` in that order (`bossCaptured` only on captured boss kills, F33); next monster uses index+1 | tests `tests/engine.test.ts :: "non-killing attack emits attack then monsterHit"` and `:: "killing blow emits attack, monsterHit, monsterKilled, itemDropped, monsterSpawned in order"` and `:: "next monster spawns with index+1 and higher maxHp"` exist and pass |
| F08 | XP & level-up | Kills grant `xpReward(index)` XP; at `xpToNext(level)` the hero levels up, XP progress carries over (subtract threshold); damage becomes `damageForLevel(newLevel)` | test `tests/engine.test.ts :: "hero reaches level 2 at exactly 20 cumulative xp and damage becomes 2"` exists and passes |
| F11 | Engine resume from save | `createEngine(save)` resumes exactly at `monsterIndex`/`monsterHp` (clamped into `[1n, maxHp]`) plus level/xp/coins/kills/items and the v2 fields (companions, nextCompanionId, souls, rebirths, `bestIndex = max(bestIndex, monsterIndex)`) | test `tests/engine.test.ts :: "createEngine(save) resumes monsterIndex and monsterHp exactly"` exists and passes |
| F31 | Boss cadence | `src/core/monsters.ts`: `BOSS_EVERY = 8`, `isBoss(i) = i ≥ 0 && i % 8 === 7`, `BOSS_HP_MULT = 5n`, `BOSS_XP_MULT = 5`, `BOSS_COIN_MULT = 5`; `MonsterDef.boss: boolean`; boss `maxHp = monsterMaxHp(i) * 5n`, name `${Name} Lv.${tier+1} BOSS`; the species still cycles; engine multiplies `xpGained` and the coin drop amount for bosses (`loot.ts` untouched, its exact-coin tests stand); `isBoss`/`BOSS_EVERY` exported from the barrel | claude | `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/loot.test.ts && grep -q "BOSS_EVERY = 8" src/core/monsters.ts && grep -q "boss: boolean" src/core/types.ts && grep -q "every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles" tests/formulas.test.ts && grep -q "killing a boss grants 5x xp and 5x coins" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 12 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 17` → exit 0 |
| F33 | Boss capture and `engine.apply` | `src/core/engine.ts`: `CAPTURE_CHANCE = 0.35`; on a boss kill ONE extra `rng.next() < CAPTURE_CHANCE` draw AFTER the loot roll, always consumed, capture skipped when the roster holds 30 (Assumption 23); captured companion `{ id: c${nextCompanionId++}, speciesId, bossIndex: i, level: 1, stars: 0 }` pushed and `bossCaptured { companion }` emitted after `itemDropped`; non-boss kills consume exactly the v1 draw sequence (the "same seed yields an identical event log" test proves it); hero damage gains `* BigInt(1 + souls)`; `bestIndex = max(bestIndex, index)` on every spawn and at resume; `apply(a: CollectionAction): GameEvent[]` runs `applyCollection` on the live state (`{ error }` → `[]`, state untouched; fever preserved); `GameEvent` gains `bossCaptured`, `rebirth`, `pvpResolved` | claude | `npx vitest run tests/engine.test.ts tests/collection.test.ts && grep -q "CAPTURE_CHANCE = 0.35" src/core/engine.ts && grep -q "apply(a: CollectionAction)" src/core/engine.ts && grep -q "a boss kill rolls capture after loot and emits bossCaptured with a c-prefixed id at 35 percent" tests/engine.test.ts && grep -q "non-boss kills consume exactly the v1 rng draws" tests/engine.test.ts && grep -q "a capture into a full roster of 30 is skipped but still spends the draw" tests/engine.test.ts && grep -q "apply(rebirth) emits rebirth and multiplies hero damage by 1 plus souls" tests/engine.test.ts && grep -q "apply with an invalid action emits nothing and leaves state untouched" tests/engine.test.ts && grep -q "bestIndex tracks the deepest monster index ever spawned" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 23` → exit 0 |
| F34 | Fever mode | `src/core/fever.ts`: `FEVER_INPUTS = 20`, `FEVER_WINDOW_MS = 3000`, `FEVER_MS = 5000`, `FEVER_COOLDOWN_MS = 10000`, `FEVER_MULT = 3n`; pure `createFever`, `feverInput(f, nowMs)` (keeps the last 20 stamps; starts iff 20 stamps within 3000 ms, not active, past cooldown; stamps cleared on start), `feverTick(f, nowMs)` (ended → `cooldownUntil = now + 10000`), `feverActive(f, nowMs)`; engine owns `clockMs` advanced ONLY by `tick(dtMs)` (Assumption 39); `attack()` stamps the clock and may emit `feverStart` before that input's `attack` event; `tick` runs `feverTick` first and emits `feverEnd`; hero damage ×3 while active; `GameState.fever { active, remainingMs }`; never persisted; `attack` event shape unchanged | claude | `npx vitest run tests/fever.test.ts tests/engine.test.ts && grep -q "FEVER_INPUTS = 20" src/core/fever.ts && grep -q "FEVER_MULT = 3n" src/core/fever.ts && grep -q "tick(dtMs: number)" src/core/engine.ts && grep -q "20 inputs within 3000ms start fever, 19 do not" tests/fever.test.ts && grep -q "fever lasts 5000ms, triples damage, then cools down for 10000ms" tests/fever.test.ts && grep -q "fever never persists: toSave has no fever field" tests/fever.test.ts && grep -q "engine time advances only through tick" tests/fever.test.ts && ! grep -rq "Date.now(" src/core` → exit 0 |
| F35 | Companion volley | `COMPANION_ATTACK_MS = 1000` in `src/core/engine.ts`; `tick(dt)` accumulates and fires `⌊dt/1000⌋` volleys (remainder kept); per volley, each of `activeCompanions` in order deals `companionPower(c) * (fever ? 3n : 1n)` (never crits) → events `companionAttack { companionId, speciesId, damage }`, `monsterHit`, then the shared kill chain via one `applyDamage(damage, events)` used by `attack()` and the volley; kills chain into the next monster inside the same volley and roll loot/capture like hero kills; no companions → no events and no rng draws | claude | `npx vitest run tests/engine.test.ts && grep -q "COMPANION_ATTACK_MS = 1000" src/core/engine.ts && grep -q "function applyDamage" src/core/engine.ts && grep -q "tick fires one volley per 1000ms from the 3 strongest companions and kills chain into the next monster" tests/engine.test.ts && grep -q "tick with no companions emits nothing and never spends rng draws" tests/engine.test.ts && grep -q "companion damage is tripled during fever and never crits" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 26` → exit 0 |

## 4. Verify the pick

The heading of T30 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T30a`,
  `T30b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T30): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-38.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T30 (branch lane/T30)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T30","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
