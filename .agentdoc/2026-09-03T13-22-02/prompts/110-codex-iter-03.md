# Lane T63 — Graphics Worker (Codex, iteration 03)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T63 "Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T63 (branch `lane/T63`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T63. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T63): Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows [codex]`, then
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

### [~] T63 — Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows
- AC: `test -e static/menu.css && grep -q "\.type-fire" static/menu.css && grep -q "\.type-wind" static/menu.css && grep -q "\.type-earth" static/menu.css && grep -q "\.type-water" static/menu.css && grep -q "\.type-dark" static/menu.css && grep -q "\.card\.mini" static/menu.css && grep -q "\.slot" static/menu.css && grep -q "\.pick\.selected" static/menu.css && grep -q "#thefts \.row" static/menu.css && ! grep -q "url(" static/menu.css && ! grep -q "@font-face" static/menu.css && ! grep -q "@import" static/menu.css` → exit 0
- Deps: none
- Worker: codex
- Files: static/menu.css
- Notes: SPEC F67; GAME_DESIGN_V3 §7 (selectors the markup of T70 targets): `.type` badge base + `.type-fire`/`.type-wind`/`.type-earth`/`.type-water`/`.type-dark` (DB16 colours matching `TYPE_COLORS`: red/cyan/brown/blue/purple), `.card.mini` (compact card: species canvas, `Lv`, `★`, badge), `.slot` (5 party slots, empty state), `.pick` buttons + `.pick.selected`, `#opponent .party`, `#preview`, `#battle-go[disabled]`, `#thefts .row` + its `Reclaim` button, the `★ PvP` mark on roster cards. Extend the existing T35 DB16 pixel theme in place; keep every existing selector (roster/ranking/battle tabs still styled); no `url()`, no `@font-face`, no `@import`, no new files, no smoke. Pure CSS — nothing to test beyond the greps.

Open task headings (context only — do NOT work on them):

### [~] T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types
### [~] T55 — Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type
### [ ] T56 — SaveFileV3 + pvpParty migration + GameState.pvpParty
### [ ] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
### [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T62 — Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78
### [~] T63 — Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows
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

| F67 | Menu CSS v3 | `static/menu.css` styles the fixed v3 hooks of GAME_DESIGN_V3 §7 with the DB16 palette only: `.type` badge base + `.type-fire`, `.type-wind`, `.type-earth`, `.type-water`, `.type-dark` (five colours matching `TYPE_COLORS`), `.card.mini` (compact card for opponent/party rows), `.slot` (5 party slots), `.pick` + `.pick.selected` (roster toggle buttons), `#thefts .row` (inbox rows with a `Reclaim` button), `#opponent`, `#party`, `#preview`, `#find`, `#auto`, `#save-party`; no `url()`, no web fonts, no images, no new file | codex | `test -e static/menu.css && grep -q "\.type-fire" static/menu.css && grep -q "\.type-wind" static/menu.css && grep -q "\.type-earth" static/menu.css && grep -q "\.type-water" static/menu.css && grep -q "\.type-dark" static/menu.css && grep -q "\.card\.mini" static/menu.css && grep -q "\.slot" static/menu.css && grep -q "\.pick\.selected" static/menu.css && grep -q "#thefts \.row" static/menu.css && ! grep -q "url(" static/menu.css && ! grep -q "@font-face" static/menu.css && ! grep -q "@import" static/menu.css` → exit 0 |

## 4. Verify the pick

The heading of T63 on disk must be `[~]`. If not, change nothing and
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

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-03.md` following
`.harness/v3/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T63 (branch lane/T63)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v3/loop/status.schema.json`):

{"task":"T63","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
