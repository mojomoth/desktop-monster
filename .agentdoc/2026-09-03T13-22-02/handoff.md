# Handoff — Desktop Monster

- status: COMPLETE
- session: .agentdoc/2026-09-03T13-22-02
- harness version: v3
- iterations used: 23 (lanes: 3; claude 20 / codex 3) — one run, exit 0 (converged); nested_claude 1
- validator verdict: CONVERGED — every check of the v3 Validator/Packer charter re-executed in the main checkout on branch `v3` (`sessions/stage3-eval.md`); no task flipped.

## What was built (vs SPEC)

All 80 feature ACs, the 17 `## Server / API` rows and the `## Deployment` AC were executed literally by the validator (`sessions/stage3-spec-sweep.log`, 98/98 rc=0; the Deployment AC also ran WITH network, `sessions/stage3-probe.log`), on top of every plan AC T54–T76 (`sessions/stage3-plan-ac.log`, 23/23 rc=0).

- F01 ✅ Frozen command contract — cold `npm ci && npm test && npm run lint && npm run typecheck` exit 0
- F02 ✅ Dual-target build — dist/electron + dist/web emitted
- F03 ✅ Pinned dependency matrix — electron 39.8.10 / uiohook-napi 1.5.5 / vite 6.4.3
- F04 ✅ Progression formulas — 10/20/40/163, xpToNext 20/28/39/54
- F05 ✅ Monster catalog & tier scaling
- F06 ✅ Deterministic RNG & crits
- F07 ✅ Attack engine event sequence
- F08 ✅ XP & level-up
- F09 ✅ Loot drops
- F10 ✅ Save schema & tolerant parsing (+ `upgradeSave`)
- F11 ✅ Engine resume from save
- F12 ✅ InputDriver abstraction — no uiohook in tests/src/core
- F13 ✅ Guarded global hook (production only)
- F14 ✅ Window-focused fallback input
- F15 ✅ Transparent always-on-top overlay
- F16 ✅ Accessory-app lifecycle
- F17 ✅ Preload bridge & IPC security
- F18 ✅ Smoke mode — SMOKE_OK
- F19 ✅ Sprites-as-code, zero binary assets
- F20 ✅ Animation state machines
- F21 ✅ Canvas scene & HUD boot render
- F22 ✅ Persistence wiring
- F23 ✅ Tray icon & menu (title `DesMon v0.3.0`, Collection & Battle item)
- F24 ✅ WebAudio blips
- F25 ✅ Unsigned macOS packaging — DesMon-0.3.0-arm64.dmg + DesMon.app
- F26 ✅ Packaging config safety
- F27 ✅ README operator docs
- F28 ✅ A–Z number format
- F29 ✅ SaveFileV2 + v1 migration (pinned v2 test titles intact)
- F30 ✅ Unbounded HP and damage (bigint)
- F31 ✅ Boss cadence (every 8th)
- F32 ✅ Companion collection lifecycle (roster 30, level 10)
- F33 ✅ Boss capture and `engine.apply`
- F34 ✅ Fever mode
- F35 ✅ Companion volley (5 best-matched, 1000 ms)
- F36 ✅ Renderer v2 wiring and presentation
- F37 ✅ PvP resolution (core) — `resolvePvp` + `STEAL_CHANCE = 0.15`
- F38 ✅ Pixel font A–Z
- F39 ✅ Effect presets
- F40 ✅ Boss and party art helpers (`BOSS_HP_BAR_Y = 78`, `PARTY_X = 8`)
- F41 ✅ Banner text and fever aura
- F42 ✅ Collection window theme
- F43 ✅ Server scaffold and healthz
- F44 ✅ Server players/snapshot/leaderboard
- F45 ✅ Server PvP
- F46 ✅ PgStore (pg 8.23.0 devDependency, hand-written `pg.d.ts`)
- F47 ✅ Identity and wire types
- F48 ✅ Net client
- F49 ✅ Net IPC and offline SMOKE
- F50 ✅ Render deployment (AGENTS.md §Server keys)
- F51 ✅ Menu IPC relay
- F52 ✅ Collection window and tray item
- F53 ✅ Game window applies actions
- F54 ✅ Menu roster UI
- F55 ✅ Menu ranking and battle
- F56 ✅ Deploy re-verify (sha ancestor, build-filter paths untouched)
- F57 ✅ Version 0.2.0 and docs (row amended to 0.3.0)
- F58 ✅ Packaged smoke (row amended to 0.3.0)
- F59 ✅ Type chart and species attributes — `types-chart.ts` 5-cycle, `SPECIES_TYPE`/`SPECIES_SIZE`
- F60 ✅ SaveFileV3 and pvpParty migration
- F61 ✅ Party selection and setPvpParty — `PARTY_SIZE = 5`, `autoParty`/`pvpParty`/`partyOrder`
- F62 ✅ Battle simulation and resolvePvp v3 — `simulateBattle`, attacker-only steal
- F63 ✅ Engine type-adjusted volley and replay passthrough
- F64 ✅ Field v3 layout — window 480×300, canvas 240×150, `SPRITE_SCALE = 1`
- F65 ✅ Party group, type badge and effectiveness colours
- F66 ✅ Battle scene replay — `Game.playReplay`
- F67 ✅ Menu CSS v3
- F68 ✅ Server match endpoint — `POST /v1/pvp/match`, `MATCH_TTL_MS = 120_000`
- F69 ✅ Server PvP v3 with steal and theft records
- F70 ✅ Server thefts and reclaim endpoints (410 expired / 409 gone)
- F71 ✅ PgStore thefts column (additive idempotent DDL)
- F72 ✅ Net client and session v3
- F73 ✅ IPC v3 — PVP_MATCH/THEFTS/RECLAIM, `sendToAll`
- F74 ✅ Theft watcher and native notification (`THEFT_POLL_MS = 300_000`)
- F75 ✅ Menu Battle tab v3 and roster badges (420×640)
- F76 ✅ Version 0.3.0 and docs
- F77 ✅ Render deployment v3 — `desmon-server-v3` from branch `v3`
- F78 ✅ Deploy re-verify v3
- F79 ✅ Packaged 0.3.0 smoke (re-run by the validator: SMOKE_OK)
- F80 ✅ SPEC criteria sweep v3 (re-run by the validator: 98/98)

Server / API rows (17): `/healthz`, `POST /v1/players`, `PUT /v1/snapshot`, `GET /v1/leaderboard`, `POST /v1/pvp/match`, `POST /v1/pvp`, match expired (410), bad party (400), `GET /v1/thefts`, `POST /v1/reclaim`, reclaim expired (410), reclaim gone (409), PvP cooldown (429), rate limit (429), body cap (413/400), unauthorized (401), not found/internal (404/500) — all ✅ (titled vitest cases executed one by one).

## How to run

- Dev: `npm ci && npm start` (build then Electron). Global input needs the macOS Accessibility grant for **"Electron"** (`node_modules/electron/dist/Electron.app`); until granted the app runs in window-focused fallback mode (tray shows "Input: Window-only").
- Packaged: open `release/mac-arm64/DesMon.app` (or mount `release/DesMon-0.3.0-arm64.dmg`). Unsigned: first launch → Gatekeeper blocks → System Settings › Privacy & Security › **"Open Anyway"**. Grant Accessibility to **"DesMon"** (separate grant from the dev one).
- Collection & Battle window: tray menu → "Collection & Battle" (420×640). Battle tab: Find opponent → edit/auto party → Battle! (replay plays on the field) → thefts inbox → Reclaim.
- Local server: `npm run build && npm run start:server` (reads `PORT`, `DATABASE_URL`, `RENDER_GIT_COMMIT`; no `DATABASE_URL` = MemoryStore). Point the app at it with `DESMON_SERVER_URL=http://127.0.0.1:<port> npm start`.
- Gates: `npm test && npm run lint && npm run typecheck`; smoke: `npm run smoke` (offline, no menu window); package: `npm run package`.

## Artifacts

- `release/mac-arm64/DesMon.app` (unsigned, arm64; no `node_modules/pg`, no `dist/electron/server` inside)
- `release/DesMon-0.3.0-arm64.dmg` (110,227,271 bytes) + `release/DesMon-0.3.0-arm64.dmg.blockmap`
- `dist/electron/**` (main/preload/core/shared/server), `dist/web/**` (renderer/menu)
- (older `release/DesMon-0.1.0-arm64.dmg`, `DesMon-0.2.0-arm64.dmg` from previous sessions remain in the gitignored `release/`)

## Gate evidence

```
$ rm -rf node_modules && npm ci && npm test && npm run lint && npm run typecheck   (sessions/stage3-gates.log)
added 467 packages, and audited 468 packages in 5s
 Test Files  34 passed (34)
      Tests  589 passed (589)
> eslint . --max-warnings 0          (clean)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (clean)
EXIT=0
$ npm run smoke                       → SMOKE_OK, rc=0            (sessions/stage3-smoke.log)
$ env -u DATABASE_URL PORT=65503 node dist/electron/server/index.js & curl -fsS http://127.0.0.1:65503/healthz
{"ok":true,"sha":"dev"}
$ npm run package                     → rc=0 (attempt 2; attempt 1 = transient electron-builder `read ECONNRESET`, sessions/stage3-package.attempt1-econnreset.log)
$ SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon → SMOKE_OK, rc=0  (sessions/stage3-packaged-smoke.log)
plan ACs T54–T76: 23/23 rc=0   (rc table: sessions/stage3-eval.md Step 3; command tails: sessions/stage3-plan-ac.log)
SPEC ACs F01–F80 + 17 API rows + Deployment: 98/98 rc=0   (sessions/stage3-spec-sweep.log)
$ npm test && npm run lint && npm run typecheck   (orchestrator re-run at HEAD 7a92fa3, sessions/stage3-orchestrator-gates.log)
 Test Files  34 passed (34)
      Tests  589 passed (589)
EXIT=0
```

Independent re-verification (orchestrator, `sessions/stage3-eval.log`): 7 read-only adversarial verifiers (handoff/artifacts, SPEC sweep F01–F27 / F28–F58 / F59–F80 + API, plan ACs T54–T76, deploy rule, test integrity + deps + worker rule) and a completeness critic re-executed every non-mutating check — 152 checks, 0 failures, 0 blocking discrepancies; the text corrections they found are applied in this file.

## Deployment

- service: `desmon-server-v3` id `srv-dacmju6k1f9s73csi2v0` (Render free web service, branch `v3`) · url: https://desmon-server-v3.onrender.com (v2 service `desmon-server` stays at https://desmon-server.onrender.com, untouched)
- `curl -fsS $SERVER_URL/healthz` → `{"ok":true,"sha":"3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2"}` (22 s incl. cold start; `sessions/stage3-deploy.log`)
- deployed sha: 3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2 · ancestor of the integration branch HEAD (v3): yes (`git merge-base --is-ancestor` rc=0) · filter-path commits after it: none (`git log 3aa900a..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version` empty; every later commit — 17 at validation time, plus the orchestrator's stage-3 commits — touches only `.agentdoc/`, `IMPLEMENTATION_PLAN.md`, `AGENTS.md` (DEPLOYED_SHA bump) and one test-title fix in `tests/save.test.ts`, none inside the Render build filter) · AGENTS.md `DEPLOYED_SHA` matches
- probe: `node dist/electron/server/probe.js https://desmon-server-v3.onrender.com` → `{"playerId":"4c54f0a2-0ccc-4197-a7ab-21fdfa4fd22f","rank":5}` (register → upload → leaderboard; `sessions/stage3-probe.log`)
- postgres: `desmon-db` id `dpg-dacd4k2jnfac73c43llg-a` (shared with the v2 service) created 2026-09-03T01:50:08Z · expires 2026-10-03 · 29 days left — no warning (not within 7 days)
- verified with network: yes (stage3-deploy.log + stage3-probe.log); no redeploy needed, no push made by the validator
- orchestrator re-check at HEAD 7a92fa3: `curl -fsS --retry 5 --retry-delay 30 --max-time 90 $SERVER_URL/healthz` → `{"ok":true,"sha":"3aa900a5d62f1b0b6d457dd503d31fdcbafb60c2"}` · `git merge-base --is-ancestor` rc=0 · filter-path log empty → deploy landed; the session's single `git push origin v3` follows the stage-3 commit
- meta.json `server_url` = AGENTS.md `SERVER_URL` (cross-check OK)

## Observability

- rgt: `sessions/iter-NN.rgt.json` count 23; `sessions/stage3.rgt.json` (171 KB); `rgt sessions` summary: 10 sessions, claude_code 9 / codex_cli 1 (`sessions/stage3.rgt-sessions.txt`)
- graph: `graph/iter-NN.GRAPH_REPORT.md` count 23; `graph/final.GRAPH_REPORT.md` (323 lines, `graphify update .` exit 0)
- lanes: `lanes/` metadata (empty after the drain — no `.pid` without `.rc`, no `lane/` worktrees); conflicts 0; MERGE_RED 0; CRASHED 0; BLOCKED 0; SPLIT 0; 22 DONE + 1 NOTHING_TO_DO (T75); smoke ran on 11 collects, skipped on 12
- worker-rule spot-check: 3 codex commits (all there are) — 468237b (T64): src/renderer/effects.ts, src/renderer/hud.ts, tests/effects.test.ts, tests/renderer.test.ts OK · 8b2e230 (T62): src/renderer/sprites/{boss,companion,index,party}.ts, tests/renderer.test.ts, tests/sprites.test.ts OK · 3fdc4b4 (T63): static/menu.css OK · none touched package.json/package-lock.json
- environment note: 5 Electron processes from another account's session (started 12:16, `.claude-devvvick-account`) were running from this repo's `node_modules/electron` during stage 3; left untouched, no effect observed.

## Ponytail audit

### Review — `git diff eddeb22..HEAD -- src tests` (PONYTAIL.md §2 format; recorded, not applied)

- `src/menu/view.ts:L260-264: delete: battleEnabled() still accepts the v2 `(save, cooldownUntil)` form ("T71 rewrites it and this leg goes with it" — T71 is done, src has no v2 caller left; only tests/menu.test.ts:520-522 use it). Drop the `'companions' in state` branch and the union parameter; re-point those 3 asserts at the BattleState form. -4 lines.`
- `src/shared/api.ts:L58 + src/menu/view.ts:L141-150 + src/menu/index.ts:L475: delete: `PvpResponse.lost` is never set by the v3 server (attacker-only steals) and the menu's "Defeat … was stolen from you" leg can never render. Remove the field, the `lost ?` ternary and `lostId: null`; PvpResultAction.lostId stays (core). -8 lines.`
- `src/core/collection.ts:L64-66: yagni: autoParty(cs) is a one-line wrapper around activeCompanions(cs). Kept only because SPEC F61's AC greps for `export function autoParty`; otherwise `export const autoParty = activeCompanions` (1 line). -2 lines.`
- `src/core/collection.ts:L290: yagni: `attackerRosterSize = attacker.length` default exists "so the v2 3-arg call still compiles"; src has one caller (app.ts, 4 args). Make it required; the 3-arg tests in tests/collection.test.ts pass `attacker.length` explicitly. -0 lines net, one fewer silent default at a rule boundary.`
- `src/renderer/sprites/boss.ts:L23-24: shrink: `Object.entries(monsterSprites).find(([, art]) => art === species)?.[0]` reverse-looks-up the species id from its art. Both callers know the id (game.ts has `state.monster.speciesId`); pass `scale` (or the id) in, drop the scan. -2 lines.`
- `src/renderer/game.ts:L223-238: shrink: opponentSlotOf() re-derives drawParty's originX mirror (`originX - (slot.x - PARTY_X) - w*scale`). Give partySlots() an `originX?` option and let drawParty and opponentSlotOf both call it. -6 lines.`
- `src/menu/view.ts:L173-179 + src/renderer/sprites/party.ts:L21-27: shrink: TYPE_BADGE and TYPE_INITIALS are the same 5-entry table in two files (view.ts may only import core). Export `TYPE_INITIAL` from src/core/types-chart.ts and import it in both. -6 lines.`
- `src/main/index.ts:L80 + src/menu/view.ts:L39: shrink: two hand-rolled `charAt(0).toUpperCase() + slice(1)` species capitalisers next to core's private SPECIES_DISPLAY_NAMES. Export `speciesName()` from src/core/monsters.ts; both call it. -2 lines.`
- `src/renderer/sprites/companion.ts:L7-21 + sprites/index.ts:L32: delete: drawCompanion() (the v2 column draw) has no src caller after T65 — only tests/sprites.test.ts:271 paints it. Delete the file, the re-export and re-title that test onto drawParty (it-count stays ≥). -21 lines.`
- `src/core/index.ts:L3: delete: `CORE_VERSION = '0.1.0'` is exported and read by nobody (src or tests). -1 line.`
- `src/server/app.ts:L140: stdlib: `.filter((id, i, all) => all.indexOf(id) === i)` dedupe. `[...new Set(ids)]` (same length, O(n)). -0 lines.`
- `tests/*.test.ts: lean: per-file fixtures (fakeTimers, memoryIdentity, makeCtx, join) are each defined once and used 3–5 times; no cross-file duplication worth a shared helper yet; the it( counts are AC-pinned. Lean already. -0 lines.`

`net: -52 lines possible.`

### Audit — `src/` repo-wide (PONYTAIL.md §3 format; ranked biggest cut first; recorded, not applied)

- `shrink: src/renderer/global.d.ts re-types the whole preload `desmon` surface (22 methods) by hand next to src/preload/index.ts. `Window['desmon'] = typeof import('../preload/index.js').desmon` (type-only, erased at build) keeps one source. [src/renderer/global.d.ts] -35 lines.`
- `delete: drawCompanion() v2 column draw with no src caller (see review). [src/renderer/sprites/companion.ts] -21 lines.`
- `yagni: Companion / MonsterType / WireBlow / BattleReplay are re-declared in src/shared/api.ts and src/core/types.ts because "shared must never import core". A `import type` is erased at build and creates no runtime edge — one home for the four shapes. Architecture rule, so record only. [src/shared/api.ts, src/core/types.ts] -18 lines.`
- `delete: PvpResponse.lost + the menu's lost leg (see review). [src/shared/api.ts, src/menu/view.ts, src/menu/index.ts] -8 lines.`
- `shrink: opponentSlotOf() duplicates drawParty's mirror math (see review). [src/renderer/game.ts] -6 lines.`
- `shrink: TYPE_BADGE/TYPE_INITIALS duplicate table (see review). [src/menu/view.ts, src/renderer/sprites/party.ts] -6 lines.`
- `delete: battleEnabled() v2 leg (see review). [src/menu/view.ts] -4 lines.`
- `shrink: PARTY_SIZE (core/collection.ts), PARTY_CAP (core/save.ts) and PARTY_SIZE_MAX (shared/api.ts) are three names for 5; ROSTER_CAP already has the same three-way copy. save.ts can import collection's constant today (it already imports monsters.ts); shared keeps its own per the rule. [src/core/save.ts] -2 lines.`
- `shrink: two species capitalisers (see review). [src/main/index.ts, src/menu/view.ts] -2 lines.`
- `delete: CORE_VERSION (see review). [src/core/index.ts] -1 line.`
- dependencies: runtime deps are none; devDependencies = electron, electron-builder, vite, vitest, typescript, eslint (+typescript-eslint), uiohook-napi, pg. Each is used by a frozen command or a SPEC feature; `pg` is pre-approved and hand-typed (`src/server/pg.d.ts`). No dep to cut.

`net: -103 lines, -0 deps possible.`

- dependencies added since eddeb22: none (`git diff eddeb22..HEAD -- package.json` adds only `"version": "0.3.0"`; no `@types/pg`; `src/server/pg.d.ts` is the pg contract)

## Test integrity

none — every `tests/*.test.ts` present at BASE eddeb22 has an equal or higher `it(` count at HEAD (31 files, 0 decreases; 16 increased: collection 14→21, effects 5→6, engine 26→30, formulas 12→13, identity 7→8, ipc 21→24, menu 13→23, net 10→16, packaging 14→16, renderer 68→79, save 11→13, server/app 10→18, server/pgStore 19→22, server/pvp 9→14, sprites 29→31, window 10→13; the other 15 unchanged); 3 new files (tests/battle.test.ts, tests/thefts.test.ts, tests/typeChart.test.ts). `rgt blame` not required. Re-counted by the orchestrator's stage-3 verifiers: same result.

## Manual steps remaining

- Accessibility grant: dev = "Electron" (`node_modules/electron/dist/Electron.app`), packaged = "DesMon" — cannot be granted programmatically; until then input is window-focused fallback.
- Gatekeeper: the .app/.dmg are unsigned → "Open Anyway" once in Privacy & Security.
- SPEC §Manual Verification Appendix M9–M20 against the live server (https://desmon-server-v3.onrender.com): ranking/name, two-step PvP (Find opponent → party editor → Battle! → replay scene), steal + native theft notification + Reclaim, match expiry (410 → find again), 5-member overlapping party group + type badge on the 480×300 field, cold-start tolerance (first click after idle may report `network`; retry).
- DB expiry: `desmon-db` expires 2026-10-03 (29 days). Before then, recreate via `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh` (Render free Postgres is deleted after 30 days + grace; `render services update` cannot rotate `DATABASE_URL` — edit the env var in the dashboard or recreate the service). The v2 service shares the same DB.
- Merging `v3` into `main` is the user's decision (the harness never touches `main`); `origin/v3` is behind local `v3` until the orchestrator's single push.
- Ponytail findings above are recorded for the next plan, not applied.

## Known limitations

- Free-tier cold start (~1 min after 15 min idle) exceeds `NET_TIMEOUT_MS = 5000`: the first Ranking/Find-opponent call after idle may show `network`; the client never throws and stays offline-first.
- Postgres free tier: 1 GB, expires 30 days after creation (2026-10-03); pending matches live in server memory (lost on restart/redeploy → `410 match_expired`, find again).
- Leaderboard stats are self-reported (accept-and-rank); only the PvP verdict and roster moves are server-authoritative. Steals are attacker-only with a 24 h reclaim window; a reclaim into a full roster is dropped client-side.
- Codex capture caveat: codex lanes are captured as `iter-NN.codex.jsonl` and committed by the orchestrator with `[codex]`; rgt shows a single codex_cli session (1 of 10) so codex step attribution is coarser than claude's.
- Sprite art is pixel-scale 1 on a 240×150 canvas (CSS 2×); hidden sizes 1–3 drive scale/z-order only.
- `electron-builder` performs a network fetch during `npm run package`; a flaky link can fail the run with `read ECONNRESET` (seen once in stage 3) — just rerun.

## Audit trail

- prompts: .agentdoc/2026-09-03T13-22-02/prompts/ (010 spec clarifier, 020 planner, per-iteration builder/gfx prompts, 900-validator-packer.md)
- sessions: .agentdoc/2026-09-03T13-22-02/sessions/ (dev-loop.md = one row per collect; stage3-eval.md = this validation; stage3-*.log = its evidence; stage3-eval.log = the validator's final message; stage3-orchestrator-gates.log = the orchestrator's gates re-run)
- plan snapshots: .agentdoc/2026-09-03T13-22-02/plans/
- lanes: .agentdoc/2026-09-03T13-22-02/lanes/ · graph: .agentdoc/2026-09-03T13-22-02/graph/
