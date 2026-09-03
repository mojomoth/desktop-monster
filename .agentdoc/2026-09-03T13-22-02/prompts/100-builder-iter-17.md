# Lane T66 — Builder (iteration 17)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T66
"Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T66 (branch `lane/T66`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T66. The main checkout (two directories up) is off
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
   T66 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
- AC: `npx vitest run tests/renderer.test.ts && grep -q "playReplay(replay: BattleReplay)" src/renderer/game.ts && grep -q "BLOW_MS" src/renderer/game.ts && grep -q "originX: VIEW_W - 8" src/renderer/game.ts && grep -q "hitColorOf" src/renderer/game.ts && grep -q "playReplay draws the opponent party mirrored on the right with its name" tests/renderer.test.ts && grep -q "each blow spawns a projectile then a float at the target" tests/renderer.test.ts && grep -q "a ko scatters the target and removes it from the opponent group" tests/renderer.test.ts && grep -q "the field monster is hidden while a replay plays and returns afterwards" tests/renderer.test.ts && grep -q "replay pacing clamps to 12 s" tests/renderer.test.ts && grep -q "field presentation is suppressed while a replay plays" tests/renderer.test.ts && grep -q "a won pvp shows the VICTORY banner and pops the stolen companion in" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 78 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T59, T65
- Worker: claude
- Files: src/renderer/game.ts, tests/renderer.test.ts
- Notes: SPEC F66 + amended F53, Assumption 45; GAME_DESIGN_V3 §6 "Battle scene" (normative). `Game.playReplay(replay: BattleReplay): void` (type from `../core/index.js`, T59) driven by `update(dt)` on the presentation clock: my party as usual (left, facing right); field monster + HP bar hidden for the duration; opponent party mirrored right via `drawParty(..., { flipX: false, originX: VIEW_W - 8 })` with `opponentName` in the 3×5 font above it; `showBanner(banner, 'VS ' + name)` opens; `BLOW_MS = clamp(12000 / blows.length, 250, 600)`; per blow: `companionProjectile` in `hitColorOf(actor species)` from actor slot to target slot, then the target species hit effect + a float `format(damage)` coloured by `floatColor(effectiveness(typeOf(actor), typeOf(target)))`; `ko` → `spawnSpriteScatter` of the target art and it leaves its group; last blow + 600 ms → `VICTORY!`/`DEFEAT` banner, then the field returns. The engine keeps running underneath: inputs still attack, field events are applied but their floats/effects are suppressed while the scene plays; `pvpResult`'s roster change is applied immediately by the engine, the pop-in sparkle / scatter play after the scene. `apply({ type: 'pvpResult', …, replay })` → `playReplay(replay)` when present; without a replay the v2 VICTORY/DEFEAT presentation stays (keep "a won pvp shows the VICTORY banner and pops the stolen companion in", "a lost pvp shows the DEFEAT banner and scatters the lost companion" green — the lost path is now unreachable from the server but the action shape still allows `lostId`). Reuse blips `attack`/`kill` per blow/ko (no new blip). Titles verbatim (tests/renderer.test.ts 72 → ≥ 78, recording canvas, injected clock): "playReplay draws the opponent party mirrored on the right with its name", "each blow spawns a projectile then a float at the target", "a ko scatters the target and removes it from the opponent group", "the field monster is hidden while a replay plays and returns afterwards", "replay pacing clamps to 12 s", "field presentation is suppressed while a replay plays". Smoke in AC → T22 dep.

Open task headings (context only — do NOT work on them):

### [~] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F53 | Game window applies actions | `src/renderer/index.ts`: `window.desmon.onAction((a) => { saves.onEvents(game.apply(a)); saves.flush(); })` (the flush triggers `SAVE_STATE` → main relays `STATE_CHANGED` to the menu); `src/renderer/game.ts` `apply(a: CollectionAction): GameEvent[]` routes the engine's events through the shared `handleEvents`: `pvpResolved` → `showBanner(banner, won ? VICTORY_TEXT : DEFEAT_TEXT)`, stolen → `captureSparkle` at its slot (pop-in), lostId → `spawnSpriteScatter` of its species idle art at the former slot; v3 (F66): when the action carries `replay`, `playReplay(replay)` runs first and the banner + pop-in/scatter play after the scene ends; `rebirth` → the same presentation clear as `reset()` then spawn pop-in at monster 0; `removeCompanions` never touches in-flight presentation; the replay is a deterministic re-enactment of the server blow list (no re-simulation) | claude | `npx vitest run tests/renderer.test.ts && grep -q "onAction" src/renderer/index.ts && grep -q "apply(a: CollectionAction)" src/renderer/game.ts && grep -q "apply() forwards collection actions to the engine and reports its events" tests/renderer.test.ts && grep -q "apply(removeCompanions) never touches in-flight presentation" tests/renderer.test.ts && grep -q "a won pvp shows the VICTORY banner and pops the stolen companion in" tests/renderer.test.ts && grep -q "a lost pvp shows the DEFEAT banner and scatters the lost companion" tests/renderer.test.ts && grep -q "a rebirth flushes presentation and restarts at monster 0" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 64 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log && grep -q "playReplay" src/renderer/game.ts` → exit 0 |
| F66 | Battle scene replay | `src/renderer/game.ts` `playReplay(replay: BattleReplay): void`, driven by `update(dt)` on the presentation clock: `showBanner(banner, 'VS ' + opponentName)` opens the scene; my party group as usual (left, facing right); the field monster and its HP bar are hidden for the duration; the opponent party drawn mirrored on the right via `drawParty(..., { flipX: false, originX: VIEW_W - 8 })` with `opponentName` in the 3×5 font above it; pacing `BLOW_MS = clamp(12000 / blows.length, 250, 600)`; per blow a `companionProjectile` (actor species hit colour) from the actor slot to the target slot, then the target species hit effect + a float `format(damage)` coloured by `floatColor(effectiveness)` at the target, `attack` blip; `ko` → `spawnSpriteScatter` of the target art, it leaves its group, `kill` blip; last blow + 600 ms → `VICTORY!`/`DEFEAT` banner, then the field returns; the engine keeps running underneath (inputs still attack, events applied, their presentation suppressed); `pvpResult`'s roster change is applied immediately, the pop-in sparkle / scatter play after the scene; no new effect preset, no animation framework (GAME_DESIGN_V3 §6, Assumption 45) | claude | `npx vitest run tests/renderer.test.ts && grep -q "playReplay(replay: BattleReplay)" src/renderer/game.ts && grep -q "BLOW_MS" src/renderer/game.ts && grep -q "originX: VIEW_W - 8" src/renderer/game.ts && grep -q "playReplay draws the opponent party mirrored on the right with its name" tests/renderer.test.ts && grep -q "each blow spawns a projectile then a float at the target" tests/renderer.test.ts && grep -q "a ko scatters the target and removes it from the opponent group" tests/renderer.test.ts && grep -q "the field monster is hidden while a replay plays and returns afterwards" tests/renderer.test.ts && grep -q "replay pacing clamps to 12 s" tests/renderer.test.ts && grep -q "field presentation is suppressed while a replay plays" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 78 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T66 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T66a`,
  `T66b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T66): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-17.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T66 (branch lane/T66)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T66","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
