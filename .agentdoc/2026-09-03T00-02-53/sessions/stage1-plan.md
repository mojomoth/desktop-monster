# stage1-plan

## Orchestrator
NESTED_CLAUDE=1
- selftest: all checks passed (rc 0)
- session opened: .agentdoc/2026-09-03T00-02-53 (lanes=3)
- tool versions: claude 2.1.258, codex-cli 0.150.1, rgt dev, graphify 0.8.40, render v2.26.0
- no plan-mode plan for this effort (step 6 skipped)
- requirements text received only as placeholder; normative source = reference/GAME_DESIGN_V2.md + SERVER_ARCHITECTURE.md (see prompts/000-user-original.md)

## Spec Clarifier

- agent role: spec-clarifier
- worker: claude
- lane: main
- harness version: v2
- task: stage 1 — SPEC.md AMEND
- result: DONE
- commit: none (stage agent; the skill commits)
- graphify affected used: none (spec work; repo facts taken from tests/*.test.ts `it(` counts, src/main/tray.ts labels, src/renderer/sprites/font.ts GLYPH_CHARS, package.json build.files)

### What I did

- Amended `SPEC.md` in place: Summary extended (bosses/companions/fever/lifecycle/A–Z/menu window/leaderboard+PvP, offline-first); Assumptions 3, 4, 5, 7, 11, 13, 14, 15, 16, 17 rewritten, 18–41 appended (18–38 from GAME_DESIGN_V2 §14, 39 injected clock, 40 SMOKE userData isolation, 41 shared/core import boundary).
- F01–F27 kept (same IDs, names, test titles, 4-column table); literal edits only: 0.1.0 → 0.2.0 (F23, F25), F04/F05/F07/F10/F11/F17/F19/F21/F22 behaviors reflect bigint/SaveFileV2/bossCaptured/v2 IPC; ACs only strengthened (F10 +upgradeSave grep, F23 +Collection & Battle/title greps, F24 +feverStart grep, F26 +build.files pins, F27 +leaderboard/rebirth greps).
- Added `### v2 features (F28+)` table with the Worker column: F28–F58 (F38–F42 codex, all vitest/grep/test -e/node -e ACs; the rest claude). ACs copied from GAME_DESIGN_V2 §13 / SERVER_ARCHITECTURE §10 with every `|`/`||` removed from table cells (rows are grepped by line and executed literally): T22's `curl … | grep` → `curl -o file && grep file`; T40's `p.dependencies||{}` → `??`; T52's `|| true` → `; true`. F50/F56 ACs are hermetic pins (source + local git ancestry against `DEPLOYED_SHA=`); the only network check is the `## Deployment` AC (guarded by `DESMON_SKIP_NET=1`, includes the ancestor + filter-path rule + probe).
- Added `## Server / API` (10 rows: healthz, players, snapshot, leaderboard, pvp, cooldown, rate limit, body cap, 401, 404/500 — every AC a vitest test with injected store/now) and `## Deployment` (template text + bootstrap output keys, health contract, free-tier facts, probe, AC).
- `## Input Abstraction (mandatory)` heading kept (template/validator grep) with the injected-clock bullets (engine tick, server `now/randomUUID/randomBytesHex/randomSeed`, `fetchFn`, no `Date.now` in core/server).
- Non-Goals rewritten per the charter list; Manual appendix M1–M8 updated (0.2.0, 4th blip, roster in M5/M6), M9–M14 added (collection window, boss+capture, volley+fever+4th blip, A–Z past 1000, rebirth, live ranking/PvP incl. cold-start wait).
- Copied to `.agentdoc/2026-09-03T00-02-53/plans/SPEC.stage1.md`.

### Files touched

- SPEC.md
- .agentdoc/2026-09-03T00-02-53/plans/SPEC.stage1.md
- .agentdoc/2026-09-03T00-02-53/sessions/stage1-plan.md

### Gate results

```
(no code changed — gates not run by the Spec Clarifier)
structural checks: 58 feature rows (F01–F58), all with AC; F28+ all carry Worker; 41 assumptions; M1–M14; sections Summary/Assumptions/Features/v2 features/Server / API/Deployment/Input Abstraction (mandatory)/Non-Goals/Manual present; no "TBD"; no 0.1.0 literal; no `|` inside table-cell ACs
```

### Attempts & dead ends (what future iterations must NOT retry)

- Do not put `|` or `||` inside a feature-table AC cell — `iterate.sh spec_rows` greps rows by line and the validator executes cells literally; use file redirection / `??` / `; true` instead.
- Do not rename `## Input Abstraction (mandatory)` (GAME_DESIGN_V2 §12 suggests "Input & Clock Abstraction"); the template, charter and stage-1 verification reference the template heading — the clock bullets live under it.

### Risks for the Planner

- F56's hermetic AC requires that NO commit after `DEPLOYED_SHA=` touches a build-filter path: T52 (packaging) must not modify package.json and any T53 sweep fix touching src/core, src/shared, src/server, package.json or package-lock.json invalidates it — either redeploy (T51 rule) or order such fixes before T51.
- F58 (packaged smoke) was added beyond §12's F57; it maps to the reference T52 and needs T22's SMOKE userData isolation and a quit dev instance.
- Server ACs name two test titles not in the reference task list: `tests/server/http.test.ts :: "answers GET /healthz with ok and the RENDER_GIT_COMMIT sha without touching the handler"`, `tests/server/app.test.ts :: "leaderboard clamps n to 1..50, shares ranks on ties and returns me null before the first upload"` and `:: "unknown routes yield 404 not_found and a throwing store yields 500 internal"` — add them to T22/T38 Notes.
- F34/F44 ACs add `! grep -q "Date.now("` on src/core and src/server/app.ts (injected clock guard); F39 adds `! grep -q "Math.random"`; F54 adds `! grep -rq "from 'electron'" src/menu`; F55 adds `grep -q "type: 'removeCompanions'" src/menu/index.ts`; F50 adds `! grep -q 'pvp(' src/server/probe.ts` and `^RENDER_SERVICE_ID=`.

## Planner

- agent role: planner (v2, APPEND mode)
- worker: claude
- lane: main
- harness version: v2
- task: stage 1 — IMPLEMENTATION_PLAN.md APPEND (T22–T53)
- result: DONE
- commit: none (stage agent; the skill commits)
- graphify affected (depth 2) symbols used: monsterMaxHp, createEngine, parseSave, serializeSave, drawHpBar, spawnParticle, showBanner, registerIpcHandlers, buildTrayMenuTemplate, writeSaveFile, createGame, createGameAudio, monsterForIndex, rollLoot, drawSprite, paletteForTier, createSaveScheduler, createOverlayWindow (path queries `src/shared/ipc.ts`, `src/preload/index.ts`, `src/renderer/global.d.ts`, `src/main/index.ts`, `src/renderer/index.ts`, `GLYPH_CHARS`, `package.json` returned no unique node — their consumers were taken from the T03/T13/T17/T21 notes and the tests/ipc.test.ts + tests/renderer.test.ts pins instead)

### What I did

- Replaced the v1 header comment with the template's v2 header (`plan-format: v2`); T01–T21 blocks and Iteration Log rows 01–21 are byte-identical (diffed); `grep '^### '` of the old file is an exact prefix of the new one (21 → 53 headings); the v2 log header + separator is the last table, nothing follows it.
- Appended 32 tasks T22–T53 in plan grammar v2 (`[ ]` only; AC / Deps / Worker / Files / Notes). Baseline = GAME_DESIGN_V2 §13 + SERVER_ARCHITECTURE §10 with these adjustments:
  - RENUMBERED to satisfy backward-only Deps (the baseline had T31 ← T33–T36 and T38 ← T41): codex T31 font, T32 effects, T33 boss/companion art, T34 banner/aura, T35 menu CSS; T36 resolvePvp; T37 renderer wiring; T38 identity/api/serverUrl; T39 store/createApp; T40 pvp; T41 PgStore. T22–T30 and T42–T53 keep the baseline ids (T44 deploy, T51 re-verify, T52 packaging, T53 sweep unchanged).
  - Every AC is the amended SPEC row's AC (F28–F58, pipe-free forms) so the Validator and the task run the same line; T22's AC adds the `## Server / API` healthz test title + tests/window.test.ts; T39's AC adds the leaderboard clamp/ties/me-null and 404/500 titles (Spec Clarifier risk 3).
  - SPEC source guards are in the ACs and spelled out in Notes (risk 4): `! grep "Date.now("` src/core → T29, src/server/app.ts → T39; `! grep Math.random` → T32; no electron import in src/menu → T48; `type: 'removeCompanions'` literal → T49; probe never `pvp(` + `^RENDER_SERVICE_ID=` → T44; T24 forbids the word `token` in save.ts (T38's AC greps it).
  - Codex ACs use only `npx vitest run` / `grep` / `test -e` / `node -e` per `&&` segment (the `it(` counters are `node -e` regex counts; the font pin is one `grep -F` of the exact mandated `GLYPH_CHARS`).
  - Graphics-after-core rule: T33 ← T26, T27; T34 ← T28, T29; T31/T32/T35 draw no core entity → Deps none. T45 also depends on T27 (validates the `CollectionAction` union).
  - Deploy integrity (risks 1–2): T51 depends transitively on every build-filter-path task incl. T50's version bump; T52 (F25/F26/F58) lists README.md only and embeds F56's hermetic git-side check in its AC; T53 embeds the same check and its Notes forbid build-filter-path fixes (SPLIT → fix child + redeploy child cloned from T51). T52 also proves via `@electron/asar` `listPackage` that neither `node_modules/pg/` nor `dist/electron/server/` shipped inside app.asar.
  - Sizing: T22 (8 files) and T25 (7 files) are the declared exemptions; T24 (7 files, two type-only edits) and T50 (6 files, lockfile version fields) are flagged; T37 carries an explicit T37a/T37b split boundary.
- Copied to `.agentdoc/2026-09-03T00-02-53/plans/IMPLEMENTATION_PLAN.stage1.md`.

### Validation

```
node .harness/v2/loop/plan.mjs open  → exactly the 32 [ ] headings T22–T53
node .harness/v2/loop/plan.mjs ready → READY=T22 T23 T31 T32 T35 T38 (rc 0, no stderr; pairwise file-disjoint)
grammar script: 32 new blocks; field order AC/Deps/Worker/Files/Notes; Deps = none | comma-separated existing backward T-ids (no ranges, no en-dash);
  Worker matches the graphics file-set rule (codex = T31 T32 T33 T34 T35, ACs npx vitest run / grep / test -e / node -e only);
  every `npm run smoke` / `SMOKE=1` AC lists T22; `push: yes` only in T44 and T51;
  longest Deps chain = 14 (T23→T24→T25→T26→T28→T30→T37→T47→T48→T49→T50→T51→T52→T53)
```

### Attempts & dead ends (what future iterations must NOT retry)

- Do not restore the baseline ids for T31–T41: T31 ← T33–T36 and T38 ← T41 are forward deps and `plan.mjs ready` treats them as satisfiable only by luck of status; backward-only is mandatory.
- Do not re-order T23/T24/T25 to make the bigint cutover READY at t=0: the §1 test-migration policy needs SaveFileV2 strings before the engine flips to bigint; T23 (bignum) heads the core chain and READY has 6 ids.
- Do not give T52/T53 `package.json` in Files: any build-filter-path change after `DEPLOYED_SHA=` breaks F56; both ACs carry the git-side check.
- Do not put `|` in a SPEC-derived AC; T22's loopback check uses `curl -o file && grep file` exactly like SPEC F43.

### Files touched

- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-09-03T00-02-53/plans/IMPLEMENTATION_PLAN.stage1.md
- .agentdoc/2026-09-03T00-02-53/sessions/stage1-plan.md

## Orchestrator (close)
- graphify update .: ok (518 nodes, 1006 edges, 30 communities); snapshot graph/GRAPH_REPORT.stage1.md
- Spec Clarifier: F01–F27 kept; F28–F58 added (31 rows, F31–F35 codex art per Planner mapping; spec rows F38–F42 codex); 41 assumptions; Server/API 10 rows; Deployment section with DESMON_SKIP_NET guard; injected-clock bullets present. Verification: no TBD, every F row has an AC cell, every F28+ row has Worker.
- Planner: 32 new tasks T22–T53 (27 claude / 5 codex: T31–T35); header plan-format v2; T01–T21 headings + log rows 01–21 byte-identical; all new blocks have AC/Deps/Worker/Files/Notes; Deps backward, no ranges; codex Files in graphics set and ACs vitest/grep/test -e/node -e only; v2 Iteration Log table is the last table.
- plan.mjs ready → READY=T22 T23 T31 T32 T35 T38 (rc 0, no stderr). Longest chain 14.
- No follow-up rounds needed. Committed as "docs(plan): stage-1 spec and plan [harness v2]".
