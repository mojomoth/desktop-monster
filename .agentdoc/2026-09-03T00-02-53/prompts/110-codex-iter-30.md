# Lane T33 — Graphics Worker (Codex, iteration 30)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T33 "Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T33 (branch `lane/T33`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T33. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T33): Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots [codex]`, then
  runs `npm run smoke` itself.
- Never add dependencies. Never edit `IMPLEMENTATION_PLAN.md` or `SPEC.md`.
- One task only.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/v2/agents/25-gfx-worker.md` — your charter; it binds you.
3. Your task block and the SPEC rows below.
4. `.harness/v2/reference/GAME_DESIGN_V2.md` — the sections your task
   cites (effects presets, boss/companion/fever presentation, font, menu CSS).
5. `src/renderer/sprites/sprite.ts` (Sprite shape, registry), `palette.ts`
   (DB16 `COLORS`, `paletteForTier`), `anim.ts` (particle pool), and the
   recording-canvas pattern in `tests/renderer.test.ts` (`makeCtx`) /
   `tests/sprites.test.ts` (registry integrity sweep).
6. `graphify query "<question>"` / `graphify affected "<symbol>" --depth 2`
   (offline; `graphify-out/` is symlinked into your worktree by dispatch — run
   `graphify update .` only if it is missing) before reading unfamiliar modules.

## 3. Your task

### [~] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
- AC: `npx vitest run tests/sprites.test.ts && grep -q "BOSS_SCALE = 3" src/renderer/sprites/boss.ts && grep -q "BOSS_HP_BAR_Y = 54" src/renderer/sprites/boss.ts && grep -q "COMPANION_X = 2" src/renderer/sprites/companion.ts && grep -q "drawBoss paints the species art at scale 3 with the crown centred above it" tests/sprites.test.ts && grep -q "drawCompanion paints the species idle frame flipped and tinted by stars at its slot" tests/sprites.test.ts && grep -q "companionSlot stacks three slots upward from the ground left of the hero" tests/sprites.test.ts && node -e "const m=require('fs').readFileSync('tests/sprites.test.ts','utf8').match(/^\s*it\(/gm)??[];process.exit(m.length>=27?0:1)"` → exit 0
- Deps: T26, T27
- Worker: codex
- Files: src/renderer/sprites/boss.ts, src/renderer/sprites/companion.ts, src/renderer/sprites/index.ts, tests/sprites.test.ts
- Notes: SPEC F40 (Assumption 17; GAME_DESIGN_V2 §3, §4). Deps follow the graphics-after-core rule (bosses from T26, companions from T27); the helpers themselves take primitives and import nothing from core. boss.ts: `BOSS_SCALE = 3`, `BOSS_HP_BAR_Y = 54`, `drawBoss(ctx, species: SpeciesSprites, pose: 'idle' | 'hit', frame, x, groundY, tier, opts?: { tint?: string })` → species frame via `drawSprite(..., { scale: 3, tint })` with feet on `groundY` (top = `groundY − h·3`) + `itemSprites.crown` centred above the head (reuse, no new art; 12×10 art → 36×30 at `x = 118` fits 160×110). companion.ts: `COMPANION_X = 2`, `COMPANION_SLOT_GAP = 14`, `companionSlot(k, groundY) = { x: COMPANION_X, y: groundY − 10 − 14·k }` (k = 0..2; the caller passes `GROUND_Y` — sprites never import game.ts), `drawCompanion(ctx, speciesId, frame, k, stars, groundY)` = `monsterSprites[speciesId].idle` frame at scale 1 with `flipX: true` (species art faces left) and palette `paletteForTier(idle.palette, stars)`. Barrel (sprites/index.ts) exports all of it. Recording-canvas tests (`makeCtx` pattern in tests/sprites.test.ts); titles verbatim in the AC; sprites ≥ 27 (after T31: 25 → +2 here). Pure draw helpers — the scene hook-up is T37 (claude). No new sprites, no dependencies, no smoke.

Open task headings (context only — do NOT work on them):

### [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
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

| F40 | Boss and companion art helpers | `src/renderer/sprites/boss.ts`: `BOSS_SCALE = 3`, `BOSS_HP_BAR_Y = 54`, `drawBoss(ctx, species, pose, frame, x, groundY, tier, opts?)` = species frame at scale 3 with feet on `groundY` + `itemSprites.crown` centred above (reuse, no new art); `src/renderer/sprites/companion.ts`: `COMPANION_X = 2`, `COMPANION_SLOT_GAP = 14`, `companionSlot(k, groundY) = { x: 2, y: groundY − 10 − 14k }`, `drawCompanion(ctx, speciesId, frame, k, stars, groundY)` with `flipX: true` and `paletteForTier(idle.palette, stars)`; barrel exports; pure draw helpers (scene hook-up is F36); no new sprites or dependencies | codex | `npx vitest run tests/sprites.test.ts && grep -q "BOSS_SCALE = 3" src/renderer/sprites/boss.ts && grep -q "BOSS_HP_BAR_Y = 54" src/renderer/sprites/boss.ts && grep -q "COMPANION_X = 2" src/renderer/sprites/companion.ts && grep -q "drawBoss paints the species art at scale 3 with the crown centred above it" tests/sprites.test.ts && grep -q "drawCompanion paints the species idle frame flipped and tinted by stars at its slot" tests/sprites.test.ts && grep -q "companionSlot stacks three slots upward from the ground left of the hero" tests/sprites.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 27` → exit 0 |

## 4. Verify the pick

The heading of T33 on disk must be `[~]`. If not, change nothing and
report `result: "MISMATCH"`.

## 5. Implement + prove

- Art is code: palette + string-row frames (`'.'` transparent), DB16 colors
  via `COLORS`, every frame rectangular, every char in the palette, no binary
  files. Effects are data presets over the existing particle pool
  (deterministic: angles from index/seed, never `Math.random`).
- Proof is vitest only: registry integrity, recording-canvas rect assertions,
  frame counts, palette membership, pool sizes, timing constants. Extend the
  existing tests; never delete or weaken any.
- Ponytail: shortest correct diff, reuse `drawSprite`/`spawnParticle`/
  `drawText`, no new abstractions.
- Too big for one iteration → change nothing, report `result: "SPLIT"` with
  `children`.

## 6. Gates — fix until green

Run exactly `npm test && npm run lint && npm run typecheck`, then this task's
`AC:` command(s). Fix and rerun on failure; after two failed attempts change
approach. FORBIDDEN: deleting/skipping/weakening tests, loosening tsconfig or
eslint, shims. `BLOCKED` only for environmental impossibility after ≥3
different attempts (list them in `note`).

## 7. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-30.md` following
`.harness/v2/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T33 (branch lane/T33)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v2/loop/status.schema.json`):

{"task":"T33","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
