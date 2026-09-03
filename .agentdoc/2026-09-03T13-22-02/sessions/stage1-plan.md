# stage1-plan (harness v3, branch v3)

## Orchestrator
NESTED_CLAUDE=1
- selftest (DESMON_BASE_BRANCH=v3): all checks passed
- session 2026-09-03T13-22-02 opened on branch v3, lanes=3
- requirements: user Korean text verbatim in prompts/000-user-original.md; normative design refs GAME_DESIGN_V3.md + SERVER_ARCHITECTURE_V3.md

## Spec Clarifier

# Session record — stage 1 (Spec Clarifier, AMEND mode)

- agent role: spec-clarifier
- worker: claude
- lane: v3
- harness version: v3
- task: Spec Clarifier (AMEND SPEC.md, F01–F58 kept, F59–F80 added)
- result: DONE
- commit: none (orchestrator commits)
- graphify affected used: none

## What I did

- Read the charter, GAME_DESIGN_V3.md (all), SERVER_ARCHITECTURE_V3.md, SPEC.md, TOOLING §6, session/SPEC templates, and the current `it(` counts per test file (thresholds in new ACs are current count + new titles).
- Amended SPEC.md in place via a checked replacement script (every replacement asserted unique): Summary (v3 paragraph), Assumptions 16/17/24/29/34/35/37 rewritten, 42–50 appended verbatim from §14, 51–53 added (battle.ts vs collection.ts placement of resolvePvp/STEAL_CHANCE; floatColor helper in hud.ts; the full list of retitled v2 tests).
- v1 rows: F21 (SPRITE_SCALE 1), F23/F25 (0.3.0). v2 rows amended: F32, F35, F36, F37 (replaced), F40 (replaced, codex), F45 (replaced), F49, F50, F51, F52 (420×640), F53, F55, F57, F58 — ACs only extended, never weakened; retitled tests named with their old titles.
- Third table `### v3 features (F59+)` directly below the v2 table: F59–F80 (22 rows; F65 and F67 codex with vitest/grep/test -e ACs only; smoke only in F64/F66/F74/F79).
- `## Server / API`: intro rewritten (v3 delta, handler-direct vitest ACs, in-memory matches), `PUT /v1/snapshot` amended (party, thefts), `POST /v1/pvp` replaced, new rows `POST /v1/pvp/match`, 410 match_expired, 400 bad_party, `GET /v1/thefts`, `POST /v1/reclaim`, 410 expired, 409 gone.
- `## Deployment`: two services (v2 `desmon-server` from main kept as V2_SERVER_URL; v3 `desmon-server-v3` from branch `v3`, shared `desmon-db`), `SERVER_URL=<set by render-bootstrap>` placeholder again, push rule `git push origin HEAD:v3`, healthz ancestor + filter-path rule against the `v3` HEAD, free-tier facts + match TTL note; the network AC unchanged and still guarded by DESMON_SKIP_NET=1.
- Input Abstraction: added the theft-poller bullet (injected `setInterval`/`clearInterval` in `src/main/thefts.ts`, core/server never read the clock) and the deterministic-battle bullet.
- Non-Goals: dropped "no PvP arena replay"; added the five v3 items. Manual appendix: M1/M6/M8/M9/M10/M11 literals updated, M15–M20 added.
- Copied SPEC.md to plans/SPEC.stage1.md. Verified mechanically: 80 feature rows in order, every AC non-empty, no `|` inside any cell (5 pipes on v1 rows, 6 on v2/v3 rows, 7 on API rows), no TBD, assumptions 42–50 present.

## Files touched

- SPEC.md
- .agentdoc/2026-09-03T13-22-02/plans/SPEC.stage1.md
- .agentdoc/2026-09-03T13-22-02/sessions/stage1-plan.md

## Gate results

```
(no code changed — gates not run; structural checks: 80 rows F01..F80 in order, 0 bad-pipe rows, TBD absent, 18 Server/API rows)
```

## Attempts & dead ends (what future iterations must NOT retry)

- A previous Spec Clarifier attempt exhausted its budget while still reading; this run read GAME_DESIGN_V3 + SERVER_ARCHITECTURE_V3 + SPEC.md only, then wrote everything through one asserted replacement script (/tmp/amend_spec.py) — do not re-read the v2 docs for the amendments, the v3 docs cite them.
- Original F80 AC used `grep -c '^| F..'` which puts a `|` inside a cell → replaced by `'^. F[0-9][0-9] '`.

## Planner

# Session record — stage 1 (Planner, APPEND mode)

- agent role: planner
- worker: claude
- lane: v3
- harness version: v3
- task: Planner (APPEND T54–T76 to IMPLEMENTATION_PLAN.md; T01–T53 and Iteration Log rows 01–48 immutable)
- result: DONE
- commit: none (orchestrator commits)
- graphify affected used (depth 2): `createApp`, `resolvePvp`, `activeCompanions`, `companionSlot`, `drawBoss`, `createNetClient`, `showMenuWindow`, `registerIpcHandlers`, `narrowAction`, `playReplay` (file-path queries return "No unique node match" — symbol names work)

## What I did

- Read the charter, AGENTS.md §Workers/§ponytail, SPEC.md v3 rows F59–F80 + amended F21/F23/F25/F32/F35/F36/F37/F40/F45/F49–F53/F55/F57/F58 + `## Server / API` + `## Deployment` + Assumptions 42–53, GAME_DESIGN_V3 §6–§11 + §13, SERVER_ARCHITECTURE_V3 (all), TOOLING §3/§6, the template header, and the current `it(` counts per test file (renderer 68, sprites 29, collection 14, engine 26, menu 13, ipc 21, net 10, identity 7, server app 10 / pvp 9 / pgStore 19, window 10, effects 5, formulas 12, save 11, packaging 14, tray 22).
- Appended 23 tasks T54–T76 following the §13 baseline (ids/titles/chains kept), ACs copied from the SPEC rows with the cumulative `it(` floors (renderer 68 → 69 (T64) → 72 (T65) → 78 (T66); collection 18 (T57) → 21 (T58); engine 27 (T56) → 30 (T59); menu 18 (T70) → 22 (T71); server app 13 (T54) → 18 (T61); pvp 14 (T60); sprites 31 (T62); pgStore 22 (T54)); test titles verbatim in AC greps and Notes.
- Header comment: only the Brownfield sentence changed (T01–T53 / T54+). No task is `[~]`; the v2 Iteration Log table is still the last table, rows 01–48 byte-identical.
- Deviations from §13, forced by "green after every task" (all recorded in the tasks' Notes):
  - T57 also owns `src/core/engine.ts` + `tests/engine.test.ts` (the volley count 3 → 5 breaks the pinned 4-companion engine test the moment `activeCompanions` returns 5; `activeCompanions(cs, enemyType?)` keeps one-arg call sites in tests/renderer.test.ts compiling until T65).
  - T58 also owns `tests/server/pvp.test.ts` (the v2 "losing the match moves one of my companions…" test asserts the old probabilistic outcome; retitled per Assumption 53) and keeps `resolvePvp` positional-compatible so `src/server/app.ts` (T54's file) is untouched.
  - T62 (codex) keeps `BOSS_SCALE`/`companionSlot` as one-line shims because `src/renderer/game.ts` (claude-only) imports them; T65 deletes the shims (+3 sprite files, 10 files total, exempt by design like the 7-file layout core) and carries the `! grep companionSlot`/`BOSS_SCALE` pins; T64 depends on T62 only to serialise tests/renderer.test.ts between the two codex tasks.
  - T56: `createEngine` accepts V1/V2/V3 via `upgradeSave` so the `SaveFileV2` fixtures in renderer/collection/engine tests keep compiling without touching tests/renderer.test.ts (which the codex lanes own at that time).
  - T70 depends on T54 + T57 (not T68): view.ts is pure; the binder T71 depends on T68. T73 drops README.md (T72 owns the `desmon-server-v3` README mention) to keep the deploy lane disjoint from the tail.
  - T54's `/v1/pvp/match` party preview uses the existing `companionPower` locally (core `pvpParty`/`autoParty` do not exist until T57); T60 swaps in the core helpers.
- Validation: `plan.mjs ready` → `READY=T54 T55 T63`, no stderr; `plan.mjs open` lists only `[ ]` T54+; 76 headings all match `^### \[.\] T[0-9]+[a-z]? — `; base headings are an exact prefix; every new block has AC/Deps/Worker/Files/Notes in order; Deps `none` or backward comma-separated ids (no ranges/en-dash); 3 codex tasks (T62, T63, T64) with graphics-set files and vitest/grep/test -e/node -e ACs only; every smoke/binary AC lists T22; `push: yes` only in T73/T74 with `git push origin HEAD:v3` + the `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh` line; longest Deps chain = 12 (T55→…→T76).

## Files touched

- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-09-03T13-22-02/plans/IMPLEMENTATION_PLAN.stage1.md
- .agentdoc/2026-09-03T13-22-02/sessions/stage1-plan.md

## Gate results

```
(no code changed — gates not run; node .harness/v3/loop/plan.mjs ready → READY=T54 T55 T63, exit 0, no warnings)
```

## Attempts & dead ends (what future iterations must NOT retry)

- `graphify affected "<file path>"` finds nothing ("No unique node match") — query by symbol name.
- Do not let a codex task delete `companionSlot`/`BOSS_SCALE`: game.ts imports them and codex cannot edit game.ts (typecheck would go red) — the shim-then-delete split (T62 → T65) is deliberate.
- Do not give T54 a core dependency to reach `pvpParty`: the charter needs T54 in the initial READY set.

## Orchestrator (close)
- First Spec Clarifier attempt was cut by the account session limit (HTTP 429, reset 14:50 KST) before writing; retried at 20:27 → done. SPEC: F01–F58 kept, F59–F80 added (22; F65/F67 codex), assumptions 42–53, Server/API 18 rows, Deployment v3 (desmon-server-v3, branch v3). Verified: no TBD, every F row has an AC cell, every F59+ row has a Worker.
- graphify update .: ok; snapshot graph/GRAPH_REPORT.stage1.md.
- Planner: T54–T76 (23 tasks; 20 claude / 3 codex T62–T64); header brownfield T01–T53/T54+; T01–T53 headings + log rows 01–48 byte-identical; v2 log table still last; fields/deps/codex/smoke/push rules verified; READY=T54 T55 T63; longest chain 12.
- Committed as "docs(plan): stage-1 spec and plan [harness v3]".
