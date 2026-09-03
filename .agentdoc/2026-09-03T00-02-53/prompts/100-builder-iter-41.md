# Lane T37 — Builder (iteration 41)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T37
"Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T37 (branch `lane/T37`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T37. The main checkout (two directories up) is off
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
   T37 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
- AC: `npx vitest run tests/renderer.test.ts tests/audio.test.ts tests/effects.test.ts && grep -q "saves.onEvents(game.update(dt))" src/renderer/index.ts && grep -q "update() ticks the engine and returns companion events to the save scheduler" tests/renderer.test.ts && grep -q "damage floats use the letter-suffix format" tests/renderer.test.ts && grep -q "a monster hit spawns the species hit effect" tests/renderer.test.ts && grep -q "a boss draws at scale 3 with a crown and its hp bar raised" tests/renderer.test.ts && grep -q "a boss spawn fires the shockwave effect" tests/renderer.test.ts && grep -q "active companions draw in a column left of the hero, flipped to face right, star-tinted" tests/renderer.test.ts && grep -q "a companion volley spawns one projectile per companion toward the monster" tests/renderer.test.ts && grep -q "a capture shows the sparkle effect and the new companion appears" tests/renderer.test.ts && grep -q "fever draws a hue-cycling aura behind the hero and a FEVER banner" tests/renderer.test.ts && grep -q "feverStart plays the fourth blip" tests/audio.test.ts && grep -q "feverStart" src/renderer/audio.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 60 && test "$(grep -c '^\s*it(' tests/audio.test.ts)" -ge 14 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T30, T31, T32, T33, T34
- Worker: claude
- Files: src/renderer/game.ts, src/renderer/index.ts, src/renderer/audio.ts, tests/renderer.test.ts, tests/audio.test.ts
- Notes: SPEC F36 (Assumptions 17/28/30; GAME_DESIGN_V2 §3–§5, §8). Integration only — helpers come from the codex tasks: `EFFECTS`/`spawnEffect` (T32, src/renderer/effects.ts), `drawBoss`/`BOSS_SCALE`/`BOSS_HP_BAR_Y`/`drawCompanion`/`companionSlot` (T33), `drawFeverAura`/`showBanner(banner, text)`/`FEVER_TEXT` (T34), A–Z glyphs (T31). `Game.update(dtMs)` changes from `void` to `GameEvent[]` = `engine.tick(dt)` routed through the SAME `handleEvents` as `attack()` (companion kills save via the existing scheduler; empty batches are a no-op); index.ts rAF loop adds `saves.onEvents(game.update(dt))` while keeping the pinned literals `saves.onEvents(game.attack(event.source))`, `const dt = Math.min(now - last, 100)`, draw-before-`reportFirstFrame()`, `saves.flush()`, `game.reset()`. Floats: `spawnFloat(..., barY - 6, format(event.damage), crit)` with `barY = monster.boss ? BOSS_HP_BAR_Y : HP_BAR.y`; companion hits spawn floats in `COLORS.steel`. Effects: `attack` → `EFFECTS.heroSlash` (`heroSlashSouls` when `souls > 0`) at the sword tip with `dirX = 1`; `monsterHit` → `EFFECTS.hit[speciesId]` at the monster centre, `dirX = 1`, seed = hit counter; boss `monsterSpawned` → `bossShockwave`; `companionAttack` → `companionProjectile` (colors overridden to the species hit primary) from `companionSlot(k, GROUND_Y)` toward `MONSTER_X`; `bossCaptured` → `captureSparkle` at the boss then at the new slot. Boss: `drawBoss` (scale 3 + crown), HP bar at `BOSS_HP_BAR_Y`, death scatter at scale 3; active companions via `drawCompanion` (3 slots, `flipX`, star tint). Fever: `drawFeverAura` under the hero while `state.fever.active`, `feverAura` sparkles every 100 ms, `showBanner(banner, FEVER_TEXT)` on `feverStart`, `audio.feverStart()` — audio.ts gains `feverStart(): void` on `GameAudio` + exported `FEVER_NOTES` (ascending 4-note square sweep, same lazy/guarded path as the other three; test "feverStart plays the fourth blip", audio ≥ 14). Boss tests must NOT reuse the `floatRegion` helper (boss rows y = 62..63 at x ≥ 118 fall inside it). Keep T14/T15/T16 pins: monsterSpawned handler stays a no-op for the FSM reset, drops launch left of x = 118, kill timeline dying(500)→spawning(300)→idle. renderer ≥ 60 `it(`. If this overruns ~300 LOC, SPLIT into T37a (update/format/blip/effects) + T37b (boss/companion/fever draw) — never rush it. Smoke: SMOKE_OK with zero network (offline by code).

Open task headings (context only — do NOT work on them):

### [~] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F36 | Renderer v2 wiring and presentation | `src/renderer/game.ts` `update(dtMs): GameEvent[]` = `engine.tick(dt)` routed through the same `handleEvents` as `attack()`; `src/renderer/index.ts` adds `saves.onEvents(game.update(dt))` and keeps `saves.onEvents(game.attack(event.source))` literally; floats `spawnFloat(..., barY - 6, format(event.damage), crit)` with `barY = monster.boss ? BOSS_HP_BAR_Y : HP_BAR.y`, companion hits in steel; hero slash `heroSlash`/`heroSlashSouls`, `monsterHit` → `EFFECTS.hit[speciesId]` at the monster centre (`dirX = 1`, seed = hit counter), boss spawn → `bossShockwave`, `companionAttack` → `companionProjectile` from `companionSlot(k, GROUND_Y)` toward `MONSTER_X`, `bossCaptured` → `captureSparkle`; boss drawn via `drawBoss` (scale 3 + crown, raised bar, death scatter at scale 3); active companions via `drawCompanion`; fever → `drawFeverAura` + `feverAura` sparkles every 100 ms + `showBanner(banner, FEVER_TEXT)` + `audio.feverStart()` (4th blip, `FEVER_NOTES`); boss tests never reuse the `floatRegion` helper | claude | `npx vitest run tests/renderer.test.ts tests/audio.test.ts tests/effects.test.ts && grep -q "saves.onEvents(game.update(dt))" src/renderer/index.ts && grep -q "update() ticks the engine and returns companion events to the save scheduler" tests/renderer.test.ts && grep -q "damage floats use the letter-suffix format" tests/renderer.test.ts && grep -q "a monster hit spawns the species hit effect" tests/renderer.test.ts && grep -q "a boss draws at scale 3 with a crown and its hp bar raised" tests/renderer.test.ts && grep -q "a boss spawn fires the shockwave effect" tests/renderer.test.ts && grep -q "active companions draw in a column left of the hero, flipped to face right, star-tinted" tests/renderer.test.ts && grep -q "a companion volley spawns one projectile per companion toward the monster" tests/renderer.test.ts && grep -q "a capture shows the sparkle effect and the new companion appears" tests/renderer.test.ts && grep -q "fever draws a hue-cycling aura behind the hero and a FEVER banner" tests/renderer.test.ts && grep -q "feverStart plays the fourth blip" tests/audio.test.ts && grep -q "feverStart" src/renderer/audio.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 60 && test "$(grep -c '^\s*it(' tests/audio.test.ts)" -ge 14 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T37 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T37a`,
  `T37b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T37): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-41.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T37 (branch lane/T37)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T37","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
