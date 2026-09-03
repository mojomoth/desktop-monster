# Lane T34 — Graphics Worker (Codex, iteration 39)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T34 "Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T34 (branch `lane/T34`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T34. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T34): Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura [codex]`, then
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

### [~] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
- AC: `npx vitest run tests/renderer.test.ts tests/sprites.test.ts && grep -q "FEVER_TEXT = 'FEVER!'" src/renderer/hud.ts && grep -q "VICTORY_TEXT" src/renderer/hud.ts && grep -q "DEFEAT_TEXT" src/renderer/hud.ts && grep -q "export function drawFeverAura" src/renderer/sprites/aura.ts && grep -q "banner text is configurable: FEVER! and LEVEL UP! both render" tests/renderer.test.ts && grep -q "drawFeverAura paints four hue-shifted copies under the sprite and cycles with time" tests/sprites.test.ts && node -e "const m=require('fs').readFileSync('tests/renderer.test.ts','utf8').match(/^\s*it\(/gm)??[];process.exit(m.length>=52?0:1)" && node -e "const m=require('fs').readFileSync('tests/sprites.test.ts','utf8').match(/^\s*it\(/gm)??[];process.exit(m.length>=25?0:1)"` → exit 0
- Deps: T28, T29
- Worker: codex
- Files: src/renderer/hud.ts, src/renderer/sprites/aura.ts, src/renderer/sprites/index.ts, tests/renderer.test.ts, tests/sprites.test.ts
- Notes: SPEC F41 (GAME_DESIGN_V2 §5, §9). Deps follow the graphics-after-core rule (fever from T29; `pvpResolved`/`rebirth` events from T28) and land after T25's hud.ts/renderer.test.ts edits. hud.ts: `Banner` gains `text: string`; `showBanner(banner, text = LEVEL_UP_TEXT)` (currently `showBanner(banner)` at hud.ts:296 — the DEFAULT is mandatory because the existing caller game.ts is outside the codex file set and must not change); `drawBanner` renders `banner.text`; `FEVER_TEXT = 'FEVER!'`, `VICTORY_TEXT = 'VICTORY!'`, `DEFEAT_TEXT = 'DEFEAT'` (VICTORY needs the A–Z glyphs of T31 only at draw time — spaces and unknown chars still occupy a cell). aura.ts: `drawFeverAura(ctx, sprite, frame, x, y, scale, timeMs)` = `drawSprite` at (±1, 0), (0, ±1) offsets with `tint: shiftHue(COLORS.red, Math.floor(timeMs / 4) % 360)`; the caller draws the real sprite after. Barrel export. EXTEND, never rewrite, the existing level-up banner tests (titles unchanged); add "banner text is configurable: FEVER! and LEVEL UP! both render" (renderer ≥ 52) and "drawFeverAura paints four hue-shifted copies under the sprite and cycles with time" (sprites ≥ 25). Scene hook-up is T37/T47 (claude). Codex: vitest/grep only, no dependencies.

Open task headings (context only — do NOT work on them):

### [~] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
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

| F41 | Banner text and fever aura | `src/renderer/hud.ts`: `Banner` gains `text`; `showBanner(banner, text = LEVEL_UP_TEXT)`; `drawBanner` renders `banner.text`; `FEVER_TEXT = 'FEVER!'`, `VICTORY_TEXT = 'VICTORY!'`, `DEFEAT_TEXT = 'DEFEAT'`; `src/renderer/sprites/aura.ts` `drawFeverAura(ctx, sprite, frame, x, y, scale, timeMs)` draws the sprite at (±1, 0), (0, ±1) offsets tinted `shiftHue(COLORS.red, Math.floor(timeMs / 4) % 360)` (caller draws the real sprite after); barrel export; existing level-up tests unchanged | codex | `npx vitest run tests/renderer.test.ts tests/sprites.test.ts && grep -q "FEVER_TEXT = 'FEVER!'" src/renderer/hud.ts && grep -q "VICTORY_TEXT" src/renderer/hud.ts && grep -q "DEFEAT_TEXT" src/renderer/hud.ts && grep -q "export function drawFeverAura" src/renderer/sprites/aura.ts && grep -q "banner text is configurable: FEVER! and LEVEL UP! both render" tests/renderer.test.ts && grep -q "drawFeverAura paints four hue-shifted copies under the sprite and cycles with time" tests/sprites.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 52 && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 25` → exit 0 |

## 4. Verify the pick

The heading of T34 on disk must be `[~]`. If not, change nothing and
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

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-39.md` following
`.harness/v2/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T34 (branch lane/T34)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v2/loop/status.schema.json`):

{"task":"T34","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
