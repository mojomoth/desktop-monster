# Lane T65 — Builder (iteration 13)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T65
"Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T65 (branch `lane/T65`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T65. The main checkout (two directories up) is off
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
   T65 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
- AC: `npx vitest run tests/window.test.ts tests/renderer.test.ts tests/drag.test.ts tests/sprites.test.ts && grep -q "WINDOW_W = 480" src/main/window.ts && grep -q "WINDOW_H = 300" src/main/window.ts && grep -q 'width="240"' static/index.html && grep -q 'height="150"' static/index.html && grep -q "width: 480px" static/style.css && grep -q "height: 300px" static/style.css && grep -q "VIEW_W = 240" src/renderer/game.ts && grep -q "GROUND_Y = 132" src/renderer/game.ts && grep -q "SPRITE_SCALE = 1" src/renderer/game.ts && grep -q "HERO_X = 96" src/renderer/game.ts && grep -q "MONSTER_X = 176" src/renderer/game.ts && grep -q "DROP_LAND_X = 150" src/renderer/game.ts && grep -q "drawParty" src/renderer/game.ts && grep -q "drawTypeBadge" src/renderer/game.ts && grep -q "floatColor" src/renderer/game.ts && ! grep -rq "companionSlot" src tests && ! grep -q "BOSS_SCALE" src/renderer/sprites/boss.ts && ! grep -rq "BOSS_SCALE" src && grep -q "the overlay window is 480 by 300 and still sits above the dock margin" tests/window.test.ts && grep -q "the field monster shows a type badge at the left end of its hp bar" tests/renderer.test.ts && grep -q "a normal monster draws at its species size" tests/renderer.test.ts && grep -q "the field party is re-read from state every frame so a new monster changes it" tests/renderer.test.ts && grep -q "companion floats are coloured by effectiveness" tests/renderer.test.ts && grep -q "active companions draw as an overlapping party group left of the hero, flipped to face right, star-tinted" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 72 && test "$(grep -c '^\s*it(' tests/window.test.ts)" -ge 11 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T59, T62, T64
- Worker: claude
- Files: src/main/window.ts, static/index.html, static/style.css, src/renderer/game.ts, src/renderer/sprites/boss.ts, src/renderer/sprites/companion.ts, src/renderer/sprites/index.ts, tests/window.test.ts, tests/renderer.test.ts, tests/drag.test.ts
- Notes: SPEC F64 + amended F21/F36/F40, Assumptions 10/17/48/53; GAME_DESIGN_V3 §6 (the constants table is normative). Exceeds the 5-file cap BY DESIGN: a half-resized field cannot pass its pins (window, html, css, game.ts and their pinned tests move together) and the codex shims (`BOSS_SCALE`, `companionSlot`, left by T62 for this task) are deleted here with their last `src` references (boss.ts / companion.ts / sprites/index.ts: 3 one-line deletions). Values: `WINDOW_W = 480`, `WINDOW_H = 300` (bottom-right `workArea` − `EDGE_MARGIN` rule unchanged), canvas `240×150` at CSS `480px × 300px` (`image-rendering: pixelated`, drag handle unchanged), `VIEW_W = 240`, `VIEW_H = 150`, `GROUND_Y = 132`, `SPRITE_SCALE = 1`, `HERO_X = 96`, `MONSTER_X = 176`, `HP_BAR = { w: 40, h: 5, y: 96 }`, `DROP_LAND_X = 150`, `DROP_TARGET_X = VIEW_W - 12`, `DROP_TARGET_Y = 8`; monster draw scale = `sizeOf(species)` (normal) / `sizeOf + 1` (boss; hit boxes, float `barY - 6`, crown, `BOSS_HP_BAR_Y` follow); `drawTypeBadge` at the left end of the field monster's HP bar (`y = barY`); the party drawn EVERY frame via `drawParty(partyOrder(activeCompanions(state.companions, state.monster.type)), …)` (no cached party — auto-change visible the frame after a spawn); projectiles start at the member's `partySlots` centre; capture sparkle at the new member's slot or the boss position when it is not in the party; `companionAttack` floats coloured by `floatColor(event.effectiveness)`. Every pinned coordinate in tests/renderer.test.ts, tests/window.test.ts, tests/drag.test.ts changes VALUE (never delete an `it(`); `companionSlot(k, GROUND_Y)` call sites in tests become `partySlots(...)`; retitle "active companions draw in a column left of the hero, flipped to face right, star-tinted" → "active companions draw as an overlapping party group left of the hero, flipped to face right, star-tinted". New titles verbatim: "the overlay window is 480 by 300 and still sits above the dock margin" (tests/window.test.ts 10 → ≥ 11), "the field monster shows a type badge at the left end of its hp bar", "a normal monster draws at its species size", "the field party is re-read from state every frame so a new monster changes it", "companion floats are coloured by effectiveness" (tests/renderer.test.ts 69 → ≥ 72). The tests/renderer.test.ts preload regex (`window.desmon` ↔ preload keys) is untouched here. Smoke in AC → T22 dep. `playReplay` is T66.

Open task headings (context only — do NOT work on them):

### [~] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [~] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F21 | Canvas scene & HUD boot render | Renderer draws the full scene each rAF frame: field strip, hero left and monster right at `SPRITE_SCALE = 1` on the 240×150 canvas (Assumption 17; v3, F64), boxed HP bar above monster, `LV n`+XP bar floating above the hero's head, top-right kill and coin counters, pooled floating damage numbers in A–Z format (F36); first painted frame reported via IPC (drives F18) | `npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 (proves the scene painted without renderer exception; layout/quality: Manual M2, M3) |
| F36 | Renderer v2 wiring and presentation | `src/renderer/game.ts` `update(dtMs): GameEvent[]` = `engine.tick(dt)` routed through the same `handleEvents` as `attack()`; `src/renderer/index.ts` adds `saves.onEvents(game.update(dt))` and keeps `saves.onEvents(game.attack(event.source))` literally; floats `spawnFloat(..., barY - 6, format(event.damage), crit)` with `barY = monster.boss ? BOSS_HP_BAR_Y : HP_BAR.y`, companion hits in steel; hero slash `heroSlash`/`heroSlashSouls`, `monsterHit` → `EFFECTS.hit[speciesId]` at the monster centre (`dirX = 1`, seed = hit counter), boss spawn → `bossShockwave`, `companionAttack` → `companionProjectile` from that companion's `partySlots` centre toward `MONSTER_X` (v3, F64), `bossCaptured` → `captureSparkle`; boss drawn via `drawBoss` (scale `sizeOf + 1` + crown, raised bar, death scatter at the same scale; v3); active companions via `drawParty` (v3, F64); fever → `drawFeverAura` + `feverAura` sparkles every 100 ms + `showBanner(banner, FEVER_TEXT)` + `audio.feverStart()` (4th blip, `FEVER_NOTES`); boss tests never reuse the `floatRegion` helper | claude | `npx vitest run tests/renderer.test.ts tests/audio.test.ts tests/effects.test.ts && grep -q "saves.onEvents(game.update(dt))" src/renderer/index.ts && grep -q "update() ticks the engine and returns companion events to the save scheduler" tests/renderer.test.ts && grep -q "damage floats use the letter-suffix format" tests/renderer.test.ts && grep -q "a monster hit spawns the species hit effect" tests/renderer.test.ts && grep -q "a boss draws at species size plus one with a crown and its hp bar raised" tests/renderer.test.ts && grep -q "a boss spawn fires the shockwave effect" tests/renderer.test.ts && grep -q "active companions draw as an overlapping party group left of the hero, flipped to face right, star-tinted" tests/renderer.test.ts && grep -q "a companion volley spawns one projectile per companion toward the monster" tests/renderer.test.ts && grep -q "a capture shows the sparkle effect and the new companion appears" tests/renderer.test.ts && grep -q "fever draws a hue-cycling aura behind the hero and a FEVER banner" tests/renderer.test.ts && grep -q "feverStart plays the fourth blip" tests/audio.test.ts && grep -q "feverStart" src/renderer/audio.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 60 && test "$(grep -c '^\s*it(' tests/audio.test.ts)" -ge 14 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |
| F40 | Boss and party art helpers | `src/renderer/sprites/boss.ts`: `BOSS_HP_BAR_Y = 78`, `drawBoss(ctx, species, pose, frame, x, groundY, tier, opts?)` = species frame at scale `sizeOf(species) + 1` with feet on `groundY` + `itemSprites.crown` centred above (`BOSS_SCALE = 3` removed; v3, F65); `src/renderer/sprites/party.ts` (v3, replaces `companion.ts`'s `COMPANION_X`/`COMPANION_SLOT_GAP`/`companionSlot`): `PARTY_X = 8`, `PARTY_STEP_X = 14`, `PARTY_STEP_Y = 3`, `partySlots(party, groundY)`, `drawParty`, `drawTypeBadge`, `TYPE_COLORS`; `drawCompanion(ctx, speciesId, frame, slot, stars, groundY)` keeps `flipX: true` and `paletteForTier(idle.palette, stars)`; barrel exports; pure draw helpers (scene hook-up is F36/F64); no new sprites or dependencies; v2 titles "drawBoss paints the species art at scale 3 with the crown centred above it" and "companionSlot stacks three slots upward from the ground left of the hero" are retitled (Assumption 53) | codex | `npx vitest run tests/sprites.test.ts && grep -q "BOSS_HP_BAR_Y = 78" src/renderer/sprites/boss.ts && ! grep -q "BOSS_SCALE" src/renderer/sprites/boss.ts && grep -q "PARTY_X = 8" src/renderer/sprites/party.ts && ! grep -rq "companionSlot" src && grep -q "drawBoss scales by species size plus one" tests/sprites.test.ts && grep -q "drawCompanion paints the species idle frame flipped and tinted by stars at its slot" tests/sprites.test.ts && grep -q "partySlots stacks back members higher and left of front members with scale by size" tests/sprites.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 29` → exit 0 |
| F64 | Field v3 layout (window, canvas, constants) | `src/main/window.ts` `WINDOW_W = 480`, `WINDOW_H = 300` (default position rule and drag unchanged); `static/index.html` canvas `width="240" height="150"`; `static/style.css` canvas `480px × 300px`, `image-rendering: pixelated`, drag handle unchanged; `src/renderer/game.ts` constants per GAME_DESIGN_V3 §6: `VIEW_W = 240`, `VIEW_H = 150`, `GROUND_Y = 132`, `SPRITE_SCALE = 1`, `HERO_X = 96`, `MONSTER_X = 176`, `HP_BAR = { w: 40, h: 5, y: 96 }`, `DROP_LAND_X = 150`, `DROP_TARGET_X = VIEW_W - 12`, `DROP_TARGET_Y = 8`; monster draw scale `sizeOf(species)` (boss via `drawBoss`, `sizeOf + 1`); `drawTypeBadge` at the left end of the field monster's HP bar (`y = barY`); the field party is `drawParty(partyOrder(activeCompanions(state.companions, state.monster.type)), …)` every frame (no cache); `companionAttack` floats coloured by `floatColor(effectiveness)` (Assumption 52), projectiles from the actor's `partySlots` centre, capture sparkle at the new member's slot (not in the party → at the boss position); `tests/window.test.ts` (320/220 → 480/300), `tests/renderer.test.ts` (`VIEW_W`, `GROUND_Y`, `MONSTER_X`, `HP_BAR`, `floatRegion`) and `tests/drag.test.ts` assertion VALUES are updated in the same task, no `it(` deleted (Assumptions 17, 48) | claude | `npx vitest run tests/window.test.ts tests/renderer.test.ts tests/drag.test.ts tests/sprites.test.ts && grep -q "WINDOW_W = 480" src/main/window.ts && grep -q "WINDOW_H = 300" src/main/window.ts && grep -q 'width="240"' static/index.html && grep -q 'height="150"' static/index.html && grep -q "width: 480px" static/style.css && grep -q "height: 300px" static/style.css && grep -q "VIEW_W = 240" src/renderer/game.ts && grep -q "GROUND_Y = 132" src/renderer/game.ts && grep -q "SPRITE_SCALE = 1" src/renderer/game.ts && grep -q "HERO_X = 96" src/renderer/game.ts && grep -q "MONSTER_X = 176" src/renderer/game.ts && grep -q "DROP_LAND_X = 150" src/renderer/game.ts && grep -q "drawParty" src/renderer/game.ts && grep -q "drawTypeBadge" src/renderer/game.ts && grep -q "floatColor" src/renderer/game.ts && grep -q "the overlay window is 480 by 300 and still sits above the dock margin" tests/window.test.ts && grep -q "the field monster shows a type badge at the left end of its hp bar" tests/renderer.test.ts && grep -q "a normal monster draws at its species size" tests/renderer.test.ts && grep -q "the field party is re-read from state every frame so a new monster changes it" tests/renderer.test.ts && grep -q "companion floats are coloured by effectiveness" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 72 && test "$(grep -c '^\s*it(' tests/window.test.ts)" -ge 11 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |

## 4. Verify the pick

The heading of T65 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T65a`,
  `T65b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T65): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-13.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T65 (branch lane/T65)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T65","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
