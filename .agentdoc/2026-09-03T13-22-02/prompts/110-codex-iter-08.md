# Lane T64 — Graphics Worker (Codex, iteration 08)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T64 "HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T64 (branch `lane/T64`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T64. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T64): HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts [codex]`, then
  runs `npm run smoke` itself.
- Never add dependencies. Never edit `IMPLEMENTATION_PLAN.md` or `SPEC.md`.
- One task only.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/v3/agents/25-gfx-worker.md` — your charter; it binds you.
3. Your task block and the SPEC rows below.
4. `.harness/v3/reference/GAME_DESIGN_V2.md` — the sections your task
   cites (effects presets, boss/companion/fever presentation, font, menu CSS).
5. `src/renderer/sprites/sprite.ts` (Sprite shape, registry), `palette.ts`
   (DB16 `COLORS`, `paletteForTier`), `anim.ts` (particle pool), and the
   recording-canvas pattern in `tests/renderer.test.ts` (`makeCtx`) /
   `tests/sprites.test.ts` (registry integrity sweep).
6. `graphify query "<question>"` / `graphify affected "<symbol>" --depth 2`
   (offline; `graphify-out/` is symlinked into your worktree by dispatch — run
   `graphify update .` only if it is missing) before reading unfamiliar modules.

## 3. Your task

### [~] T64 — HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts
- AC: `npx vitest run tests/renderer.test.ts tests/effects.test.ts && grep -q "export function floatColor" src/renderer/hud.ts && grep -q "export function hitColorOf" src/renderer/effects.ts && ! grep -q "koScatter" src/renderer/effects.ts && ! grep -q "koBurst" src/renderer/effects.ts && grep -q "floatColor maps super to yellow, weak to steel and normal to white" tests/renderer.test.ts && grep -q "hitColorOf returns the species hit primary colour" tests/effects.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 69 && test "$(grep -c '^\s*it(' tests/effects.test.ts)" -ge 6` → exit 0
- Deps: T55, T62
- Worker: codex
- Files: src/renderer/hud.ts, src/renderer/effects.ts, tests/renderer.test.ts, tests/effects.test.ts
- Notes: SPEC F65 (colour half), Assumption 52; GAME_DESIGN_V3 §6 "HUD" + "Battle scene". `floatColor(effectiveness: Effectiveness): string` in hud.ts — `'super'` → `COLORS.yellow`, `'weak'` → `COLORS.steel`, `'normal'` → `COLORS.white` (type from `../core/index.js`, T55; hud.ts already imports core). effects.ts: `hitColorOf(speciesId): string` = the species hit preset's primary colour (`EFFECTS.hit[species].colors[0]`, unknown → `COLORS.white`) — the replay projectile colour game.ts needs; add NO new preset (`koScatter`/`koBurst` are explicitly rejected: the KO reuses `spawnSpriteScatter`). Titles verbatim: "floatColor maps super to yellow, weak to steel and normal to white" (tests/renderer.test.ts 68 → ≥ 69, a pure unit test — do not touch the canvas scene tests, T65 owns them), "hitColorOf returns the species hit primary colour" (tests/effects.test.ts 5 → ≥ 6). Deps T62 only serialises tests/renderer.test.ts (both codex tasks edit it). No smoke, no network, no new dependency; ≤ 40 LOC.

Open task headings (context only — do NOT work on them):

### [~] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
### [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [~] T64 — HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [~] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T70 — Menu window 420×640 + Battle tab v3 markup + view.ts (opponentRows, partyPreview, togglePick, theftRows, battleEnabled)
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F65 | Party group, type badge and effectiveness colours | `src/renderer/sprites/party.ts` (new): `PARTY_X = 8`, `PARTY_STEP_X = 14`, `PARTY_STEP_Y = 3`, `partySlots(party, groundY) → { x, y, scale }[]` (input already in `partyOrder`, back → front: slot r → `scale = sizeOf(species)`, `x = PARTY_X + r * PARTY_STEP_X`, feet `y = groundY − (n − 1 − r) * PARTY_STEP_Y`), `drawParty(ctx, party, frame, groundY, opts?: { flipX?, originX? })` (slot order back first, `paletteForTier(idle.palette, stars)`, `flipX` default true = facing right; `originX` + `flipX: false` = the mirrored opponent group, x measured leftwards from `originX`), `drawTypeBadge(ctx, type, x, y)` (5×5 filled square in `TYPE_COLORS[type]` with a 3×5 initial glyph F/W/E/A/D — the ONLY visible type marker), `TYPE_COLORS` (fire `COLORS.red`, wind `COLORS.cyan`, earth `COLORS.brown`, water `COLORS.blue`, dark `COLORS.purple` — existing palette entries only); `companion.ts` loses `COMPANION_X`/`COMPANION_SLOT_GAP`/`companionSlot`; `boss.ts` scale by `sizeOf + 1`, `BOSS_HP_BAR_Y = 78` (F40); `src/renderer/hud.ts` `floatColor(effectiveness)` (Assumption 52); `src/renderer/sprites/index.ts` barrel; no new art, no dependency, no `game.ts` edits (GAME_DESIGN_V3 §6) | codex | `npx vitest run tests/sprites.test.ts tests/renderer.test.ts && test -e src/renderer/sprites/party.ts && grep -q "export function partySlots" src/renderer/sprites/party.ts && grep -q "export function drawParty" src/renderer/sprites/party.ts && grep -q "export function drawTypeBadge" src/renderer/sprites/party.ts && grep -q "export const TYPE_COLORS" src/renderer/sprites/party.ts && grep -q "PARTY_STEP_X = 14" src/renderer/sprites/party.ts && grep -q "export function floatColor" src/renderer/hud.ts && ! grep -rq "companionSlot" src/renderer/sprites && grep -q "partySlots stacks back members higher and left of front members with scale by size" tests/sprites.test.ts && grep -q "drawParty paints back members first so front members overlap them" tests/sprites.test.ts && grep -q "drawTypeBadge paints a coloured square with the type initial" tests/sprites.test.ts && grep -q "drawBoss scales by species size plus one" tests/sprites.test.ts && grep -q "floatColor maps super to yellow, weak to steel and normal to white" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 31 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 69` → exit 0 |

## 4. Verify the pick

The heading of T64 on disk must be `[~]`. If not, change nothing and
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

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-08.md` following
`.harness/v3/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T64 (branch lane/T64)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v3/loop/status.schema.json`):

{"task":"T64","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
