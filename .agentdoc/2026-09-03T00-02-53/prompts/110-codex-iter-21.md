# Lane T35 — Graphics Worker (Codex, iteration 21)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T35 "Menu window pixel theme: DB16 CSS, pixelated species canvases" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T35 (branch `lane/T35`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T35. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T35): Menu window pixel theme: DB16 CSS, pixelated species canvases [codex]`, then
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

### [~] T35 — Menu window pixel theme: DB16 CSS, pixelated species canvases
- AC: `test -e static/menu.css && grep -q "image-rendering: pixelated" static/menu.css && grep -q "#140c1c" static/menu.css && grep -q "canvas.species" static/menu.css && grep -q "\.card" static/menu.css && grep -q "\.tab" static/menu.css && grep -q "\.btn" static/menu.css && ! grep -q "url(" static/menu.css && npx vitest run tests/sprites.test.ts` → exit 0
- Deps: none
- Worker: codex
- Files: static/menu.css
- Notes: SPEC F42 (Assumption 29; GAME_DESIGN_V2 §9). New file. Style the fixed class names of `static/menu.html` (`.tabs .tab .panel .card .species .name .stars .power .btn .row .footer .result`): DB16 palette (`#140c1c` background, `#deeed6` text, `#8595a1` borders, `#d04648`/`#6dc2ca` accents), monospace pixel look, `canvas.species { image-rendering: pixelated; width: 48px; height: 40px }` (the 24×20 canvas is painted by src/menu/index.ts in T48), disabled buttons dimmed, `.tab.active` highlighted. No `url()`, no @font-face, no binary assets (F19 sweep covers `static/`). The markup arrives in T46/T48 — a stylesheet without its page is harmless. Only this file (`src/menu/**` and `static/menu.html` are outside the codex file set). The `npx vitest run tests/sprites.test.ts` in the AC is the codex-form still-green check.

Open task headings (context only — do NOT work on them):

### [~] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
### [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T31 — Pixel font: full A–Z plus . : - + % glyphs
### [~] T32 — Effects module: data-driven presets on the particle pool, per-species hit effects
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [~] T35 — Menu window pixel theme: DB16 CSS, pixelated species canvases
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [ ] T38 — Client identity.json, shared API wire types, serverUrl constant
### [ ] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T42 — Main net client + net session: injected fetch, 5000 ms timeout, never throws, 401 re-register
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

| F19 | Sprites-as-code, zero binary assets | All art (hero knight idle×2/attack×3/slash, 5 species idle×2+hit, items, 3×5 font — digits, `LVEUP!`, A–Z and `. : - + %` (F38) —, boss/companion/aura helpers (F40, F41), tray icon matrix) is palette + string-row matrices in `src/renderer/sprites/`; every frame rectangular w×h; every non-`.` char in palette; NO binary image/audio files anywhere in the repo | `npx vitest run tests/sprites.test.ts && test -z "$(find src static tests -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' -o -iname '*.bmp' -o -iname '*.ico' -o -iname '*.icns' -o -iname '*.svg' -o -iname '*.wav' -o -iname '*.mp3' -o -iname '*.ogg' \))"` → exit 0; required tests `tests/sprites.test.ts :: "every frame is rectangular with the declared width and height"` and `:: "every non-transparent char exists in the palette"` |
| F42 | Collection window theme | `static/menu.css` styles the fixed class names of `static/menu.html` (`.tabs .tab .panel .card .species .name .stars .power .btn .row .footer .result`) in the DB16 palette (`#140c1c` background, `#deeed6` text, `#8595a1` borders, `#d04648`/`#6dc2ca` accents), monospace pixel look, `canvas.species { image-rendering: pixelated; width: 48px; height: 40px }`, disabled buttons dimmed; no `url()`, no fonts, no binary assets (F19 sweep covers `static/`); only this file | codex | `test -e static/menu.css && grep -q "image-rendering: pixelated" static/menu.css && grep -q "#140c1c" static/menu.css && grep -q "canvas.species" static/menu.css && grep -q "\.card" static/menu.css && grep -q "\.tab" static/menu.css && grep -q "\.btn" static/menu.css && ! grep -q "url(" static/menu.css && npx vitest run tests/sprites.test.ts` → exit 0 |

## 4. Verify the pick

The heading of T35 on disk must be `[~]`. If not, change nothing and
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

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-21.md` following
`.harness/v2/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T35 (branch lane/T35)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v2/loop/status.schema.json`):

{"task":"T35","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
