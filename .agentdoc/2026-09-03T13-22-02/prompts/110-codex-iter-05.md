# Lane T62 — Graphics Worker (Codex, iteration 05)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T62 "Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T62 (branch `lane/T62`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T62. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T62): Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78 [codex]`, then
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

### [~] T62 — Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78
- AC: `npx vitest run tests/sprites.test.ts tests/renderer.test.ts && test -e src/renderer/sprites/party.ts && grep -q "export function partySlots" src/renderer/sprites/party.ts && grep -q "export function drawParty" src/renderer/sprites/party.ts && grep -q "export function drawTypeBadge" src/renderer/sprites/party.ts && grep -q "export const TYPE_COLORS" src/renderer/sprites/party.ts && grep -q "PARTY_X = 8" src/renderer/sprites/party.ts && grep -q "PARTY_STEP_X = 14" src/renderer/sprites/party.ts && grep -q "PARTY_STEP_Y = 3" src/renderer/sprites/party.ts && grep -q "BOSS_HP_BAR_Y = 78" src/renderer/sprites/boss.ts && grep -q "sizeOf" src/renderer/sprites/boss.ts && grep -q "partySlots stacks back members higher and left of front members with scale by size" tests/sprites.test.ts && grep -q "drawParty paints back members first so front members overlap them" tests/sprites.test.ts && grep -q "drawTypeBadge paints a coloured square with the type initial" tests/sprites.test.ts && grep -q "drawBoss scales by species size plus one" tests/sprites.test.ts && grep -q "drawCompanion paints the species idle frame flipped and tinted by stars at its slot" tests/sprites.test.ts && grep -q "a boss draws at species size plus one with a crown and its hp bar raised" tests/renderer.test.ts && ! grep -q "companionSlot" tests/sprites.test.ts && ! grep -q "BOSS_SCALE" tests/sprites.test.ts && ! grep -q "BOSS_SCALE" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 31 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 68` → exit 0
- Deps: T55
- Worker: codex
- Files: src/renderer/sprites/party.ts, src/renderer/sprites/boss.ts, src/renderer/sprites/companion.ts, src/renderer/sprites/index.ts, tests/sprites.test.ts, tests/renderer.test.ts
- Notes: SPEC F65 (party/boss half) + amended F40, Assumptions 17/43/48/53; GAME_DESIGN_V3 §6 "Party group" (copy the signatures verbatim): `partySlots(party, groundY)` — input already in `partyOrder` (back → front): slot r → `scale = sizeOf(speciesId)`, `x = PARTY_X + r * PARTY_STEP_X`, feet `y = groundY - (n - 1 - r) * PARTY_STEP_Y` (`PARTY_X = 8`, `PARTY_STEP_X = 14`, `PARTY_STEP_Y = 3`); `drawParty(ctx, party, frame, groundY, opts?: { flipX?: boolean; originX?: number })` draws back first with `paletteForTier(idle.palette, stars)`, `flipX` default true (facing right), `originX` + `flipX: false` = the mirrored opponent group (x measured leftwards from originX); `drawTypeBadge(ctx, type, x, y)` = 5×5 square in `TYPE_COLORS[type]` + 3×5 initial glyph F/W/E/A/D from font.ts (the ONLY visible type marker); `TYPE_COLORS` uses existing DB16 `COLORS` entries only (fire red, wind cyan, earth brown, water blue, dark purple). `sizeOf`/`MonsterType` come from `../../core/index.js` (sprites/monsters.ts already imports core; no dependency added). boss.ts: `drawBoss` scales by `sizeOf(speciesId) + 1`, `BOSS_HP_BAR_Y = 78`, crown centred above as before. GREEN-AFTER-TASK RULE: `src/renderer/game.ts` (claude-only) still imports `BOSS_SCALE` and `companionSlot` — KEEP both exported as one-line `ponytail:` shims ("removed by the field task T65"; `companionSlot(k, groundY)` may delegate to `partySlots`) and keep `drawCompanion`'s current signature working; do NOT delete them here (T65 deletes them and their `src` references). tests/sprites.test.ts (29 → ≥ 31): retitle "drawBoss paints the species art at scale 3 with the crown centred above it" → "drawBoss scales by species size plus one" and "companionSlot stacks three slots upward from the ground left of the hero" → "partySlots stacks back members higher and left of front members with scale by size" (values change, `it(` count never decreases), add "drawParty paints back members first so front members overlap them", "drawTypeBadge paints a coloured square with the type initial"; keep "drawCompanion paints the species idle frame flipped and tinted by stars at its slot". tests/renderer.test.ts: retitle "a boss draws at scale 3 with a crown and its hp bar raised" → "a boss draws at species size plus one with a crown and its hp bar raised" and compute the expected box from `sizeOf(species) + 1` (drop the `BOSS_SCALE` import there); leave every `companionSlot`-based renderer test untouched (T65 migrates them). Barrel: export party.ts. `GLYPH_CHARS` append-only (letters already exist — add nothing). No smoke, no network, no new dependency.

Open task headings (context only — do NOT work on them):

### [~] T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types
### [~] T56 — SaveFileV3 + pvpParty migration + GameState.pvpParty
### [ ] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
### [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [~] T62 — Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78
### [ ] T64 — HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds
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

| F40 | Boss and party art helpers | `src/renderer/sprites/boss.ts`: `BOSS_HP_BAR_Y = 78`, `drawBoss(ctx, species, pose, frame, x, groundY, tier, opts?)` = species frame at scale `sizeOf(species) + 1` with feet on `groundY` + `itemSprites.crown` centred above (`BOSS_SCALE = 3` removed; v3, F65); `src/renderer/sprites/party.ts` (v3, replaces `companion.ts`'s `COMPANION_X`/`COMPANION_SLOT_GAP`/`companionSlot`): `PARTY_X = 8`, `PARTY_STEP_X = 14`, `PARTY_STEP_Y = 3`, `partySlots(party, groundY)`, `drawParty`, `drawTypeBadge`, `TYPE_COLORS`; `drawCompanion(ctx, speciesId, frame, slot, stars, groundY)` keeps `flipX: true` and `paletteForTier(idle.palette, stars)`; barrel exports; pure draw helpers (scene hook-up is F36/F64); no new sprites or dependencies; v2 titles "drawBoss paints the species art at scale 3 with the crown centred above it" and "companionSlot stacks three slots upward from the ground left of the hero" are retitled (Assumption 53) | codex | `npx vitest run tests/sprites.test.ts && grep -q "BOSS_HP_BAR_Y = 78" src/renderer/sprites/boss.ts && ! grep -q "BOSS_SCALE" src/renderer/sprites/boss.ts && grep -q "PARTY_X = 8" src/renderer/sprites/party.ts && ! grep -rq "companionSlot" src && grep -q "drawBoss scales by species size plus one" tests/sprites.test.ts && grep -q "drawCompanion paints the species idle frame flipped and tinted by stars at its slot" tests/sprites.test.ts && grep -q "partySlots stacks back members higher and left of front members with scale by size" tests/sprites.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 29` → exit 0 |
| F65 | Party group, type badge and effectiveness colours | `src/renderer/sprites/party.ts` (new): `PARTY_X = 8`, `PARTY_STEP_X = 14`, `PARTY_STEP_Y = 3`, `partySlots(party, groundY) → { x, y, scale }[]` (input already in `partyOrder`, back → front: slot r → `scale = sizeOf(species)`, `x = PARTY_X + r * PARTY_STEP_X`, feet `y = groundY − (n − 1 − r) * PARTY_STEP_Y`), `drawParty(ctx, party, frame, groundY, opts?: { flipX?, originX? })` (slot order back first, `paletteForTier(idle.palette, stars)`, `flipX` default true = facing right; `originX` + `flipX: false` = the mirrored opponent group, x measured leftwards from `originX`), `drawTypeBadge(ctx, type, x, y)` (5×5 filled square in `TYPE_COLORS[type]` with a 3×5 initial glyph F/W/E/A/D — the ONLY visible type marker), `TYPE_COLORS` (fire `COLORS.red`, wind `COLORS.cyan`, earth `COLORS.brown`, water `COLORS.blue`, dark `COLORS.purple` — existing palette entries only); `companion.ts` loses `COMPANION_X`/`COMPANION_SLOT_GAP`/`companionSlot`; `boss.ts` scale by `sizeOf + 1`, `BOSS_HP_BAR_Y = 78` (F40); `src/renderer/hud.ts` `floatColor(effectiveness)` (Assumption 52); `src/renderer/sprites/index.ts` barrel; no new art, no dependency, no `game.ts` edits (GAME_DESIGN_V3 §6) | codex | `npx vitest run tests/sprites.test.ts tests/renderer.test.ts && test -e src/renderer/sprites/party.ts && grep -q "export function partySlots" src/renderer/sprites/party.ts && grep -q "export function drawParty" src/renderer/sprites/party.ts && grep -q "export function drawTypeBadge" src/renderer/sprites/party.ts && grep -q "export const TYPE_COLORS" src/renderer/sprites/party.ts && grep -q "PARTY_STEP_X = 14" src/renderer/sprites/party.ts && grep -q "export function floatColor" src/renderer/hud.ts && ! grep -rq "companionSlot" src/renderer/sprites && grep -q "partySlots stacks back members higher and left of front members with scale by size" tests/sprites.test.ts && grep -q "drawParty paints back members first so front members overlap them" tests/sprites.test.ts && grep -q "drawTypeBadge paints a coloured square with the type initial" tests/sprites.test.ts && grep -q "drawBoss scales by species size plus one" tests/sprites.test.ts && grep -q "floatColor maps super to yellow, weak to steel and normal to white" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 31 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 69` → exit 0 |

## 4. Verify the pick

The heading of T62 on disk must be `[~]`. If not, change nothing and
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

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-05.md` following
`.harness/v3/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T62 (branch lane/T62)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v3/loop/status.schema.json`):

{"task":"T62","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
