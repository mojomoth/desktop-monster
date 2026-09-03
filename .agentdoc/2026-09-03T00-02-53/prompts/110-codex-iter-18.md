# Lane T31 — Graphics Worker (Codex, iteration 18)

You are a fresh agent in an isolated git worktree, running in a sandbox (no
network, no Electron, no git commits). Your job: complete EXACTLY ONE
graphics task — T31 "Pixel font: full A–Z plus . : - + % glyphs" — with gates green, proven by vitest,
then end with the JSON status object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T31 (branch `lane/T31`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Sandbox + lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T31. Never touch files outside it.
- NEVER run: `npm start`, `npm run smoke`, `npm run package`, `electron`,
  `npm install`/`npm ci`, anything that needs the network, `git commit`,
  `git push`, `git checkout`, `git worktree`, `git merge`, `git rebase`,
  `git reset`. Leave the working tree DIRTY with your changes — the
  orchestrator commits them as `<type>(T31): Pixel font: full A–Z plus . : - + % glyphs [codex]`, then
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

### [~] T31 — Pixel font: full A–Z plus . : - + % glyphs
- AC: `npx vitest run tests/sprites.test.ts && grep -q "the 3x5 font covers digits, every letter A to Z and the characters . : - + %" tests/sprites.test.ts && grep -qF "GLYPH_CHARS = '0123456789LVEUP!ABCDFGHIJKMNOQRSTWXYZ.:-+%'" src/renderer/sprites/font.ts && node -e "const m=require('fs').readFileSync('tests/sprites.test.ts','utf8').match(/^\s*it\(/gm)??[];process.exit(m.length>=25?0:1)"` → exit 0
- Deps: none
- Worker: codex
- Files: src/renderer/sprites/font.ts, tests/sprites.test.ts
- Notes: SPEC F38 (Assumption 20/36; GAME_DESIGN_V2 §1). APPEND to `GLYPH_CHARS` (currently `'0123456789LVEUP!'` at font.ts:20) the 21 missing letters in alphabetical order then `.:-+%`, giving EXACTLY `'0123456789LVEUP!ABCDFGHIJKMNOQRSTWXYZ.:-+%'` (grep-pinned as a fixed string) — existing frame indices stay stable, `FONT_W = 3`/`FONT_H = 5`/`FONT_ADVANCE = 4` unchanged; one 3×5 frame per new char (26 new frames) appended to the single `font.glyphs` sprite; `.` is a single bottom-centre pixel; `%` = two dots + diagonal; `glyphIndex` stays case-insensitive. The registry integrity sweep ("every frame is rectangular…", "every non-transparent char exists in the palette") covers the new frames automatically. Keep the existing glyph test and its title; add "the 3x5 font covers digits, every letter A to Z and the characters . : - + %" (sprites ≥ 25, currently 24). Codex: vitest/grep/node -e only, no smoke, no dependencies, no other file.
- Notes (iter 03, codex): MERGE_RED: merge reverted (gates=fail smoke=skipped); Appended 21 missing A–Z letter frames and .:-+% to the 3x5 font without changing existing indices or font dimensions; added the required coverage and punctuation-shape test. Full gates passed: 304 tests, lint, and typecheck; literal AC passed with 25 sprite tests. Initial gates hit the broken shared node_modules symlink; used an exact read-only lane dependency tree and restored the symlink unchanged.
- Notes (iter 10, codex): MERGE_RED: merge reverted (gates=fail smoke=skipped); Appended 21 missing A–Z glyphs and .:-+% as 26 new 3x5 frames while preserving all existing indices and font dimensions; added full coverage plus period/percent shape assertions. Full gates passed (304 tests, lint, typecheck); literal AC passed with 25 sprite tests. Initial test hit the broken shared node_modules symlink; used the identical-lockfile T22 tree read-only and restored the original target.

Open task headings (context only — do NOT work on them):

### [~] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
### [~] T23 — Core bignum: A–Z suffix format, ratio, bigField
### [ ] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
### [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T31 — Pixel font: full A–Z plus . : - + % glyphs
### [ ] T32 — Effects module: data-driven presets on the particle pool, per-species hit effects
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T35 — Menu window pixel theme: DB16 CSS, pixelated species canvases
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

| F38 | Pixel font A–Z | `src/renderer/sprites/font.ts`: `GLYPH_CHARS` = `'0123456789LVEUP!'` + the 21 missing letters in alphabetical order + `.:-+%` (APPENDED — existing frame indices unchanged), one 3×5 frame per new char (26 new frames), `FONT_W/FONT_H/FONT_ADVANCE` unchanged; `.` is a single bottom-centre pixel; `%` = two dots + diagonal; the registry integrity sweep covers the new frames; existing glyph test and title kept | codex | `npx vitest run tests/sprites.test.ts && grep -q "the 3x5 font covers digits, every letter A to Z and the characters . : - + %" tests/sprites.test.ts && node -e "const s=require('fs').readFileSync('src/renderer/sprites/font.ts','utf8');const m=/GLYPH_CHARS = '([^']+)'/.exec(s);process.exit(m&&m[1].startsWith('0123456789LVEUP!')&&[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ.:-+%'].every(c=>m[1].includes(c))?0:1)" && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 25` → exit 0 |

## 4. Verify the pick

The heading of T31 on disk must be `[~]`. If not, change nothing and
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

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-18.md` following
`.harness/v2/templates/session-record.template.md` (`- worker: codex`,
`- lane: .worktrees/T31 (branch lane/T31)`, `- commit: none`). Leave it
in the tree with your changes.

## 8. Report — final message

Your final message is EXACTLY one JSON object (schema-enforced by
`.harness/v2/loop/status.schema.json`):

{"task":"T31","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"none","note":"<what you did + dead ends, <=600 chars>","children":[]}

`commit` is always `"none"` (you never commit). `children` is REQUIRED by the schema: `[]` unless you SPLIT.
