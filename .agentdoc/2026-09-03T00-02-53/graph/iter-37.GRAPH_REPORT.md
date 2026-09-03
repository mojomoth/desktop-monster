# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 96 files · ~95,785 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 1568 edges · 46 communities (42 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f2bc02c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 54 edges
2. `createEngine()` - 17 edges
3. `monsterMaxHp()` - 15 edges
4. `PgStore` - 15 edges
5. `MemoryStore` - 15 edges
6. `monsterForIndex()` - 14 edges
7. `mulberry32()` - 14 edges
8. `COLORS` - 14 edges
9. `InputModePayload` - 13 edges
10. `AGENTS.md — Desktop Monster (DesMon)` - 13 edges

## Surprising Connections (you probably didn't know these)
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `identityFilePath()` --calls--> `join()`  [INFERRED]
  src/main/identity.ts → tests/server/app.test.ts
- `saveFilePath()` --calls--> `join()`  [INFERRED]
  src/main/persistence.ts → tests/server/app.test.ts
- `stateFixture()` --calls--> `createEngine()`  [EXTRACTED]
  tests/renderer.test.ts → src/core/engine.ts
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (46 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (74): GameCanvas, HP_BAR, Banner, drawBanner(), drawCounters(), drawFloats(), drawHpBar(), drawLevelHud() (+66 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (14): companionPower(), damageForLevel(), monsterMaxHp(), xpReward(), xpToNext(), isBoss(), monsterForIndex(), SPECIES_DISPLAY_NAMES (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (12): activeCompanions(), applyCollection(), CollectionAction, CollectionEvent, CollectionResult, minted(), reroster(), Companion (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (54): [~] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura, [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip, [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README, [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation, [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth, [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions, [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14, [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched (+46 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (10): FALLBACK, getCurrentInputMode(), GlobalInputController, NativeHook, startGlobalInput(), InputSource, FakeHook, FALLBACK (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (14): InputSource, FallbackEvent, FallbackEventName, FallbackEventTarget, FallbackInputHandle, FallbackInputOptions, FallbackListener, FallbackModeBridge (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): author, dependencies, uiohook-napi, description, license, main, name, productName (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), GainNodeLike, GameAudio, GameAudioOptions (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (24): buildTrayMenuTemplate(), getActiveTray(), setupTray(), TrayController, TrayDeps, TrayLike, TrayMenuActions, TrayMenuItem (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (13): build, appId, asarUnpack, directories, files, npmRebuild, nsis, productName (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): AGENTS.md — Desktop Monster (DesMon), Code style — ponytail (lazy senior dev), Commands (the contract), Commit convention, Definition of done (loop level), Hard rules, macOS environment notes, Observability (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (10): Assumptions, Deployment, Features, Input Abstraction (mandatory), Manual Verification Appendix, Non-Goals, Server / API, SPEC — Desktop Monster (DesMon) (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, outDir, rootDir, types, extends (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (8): compilerOptions, module, moduleResolution, outDir, rootDir, types, extends, include

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (7): Accessibility permission (global input), DesMon — Desktop Monster, Packaging (unsigned macOS build), Requirements, Run from source, Save file and resetting progress, Windows

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): compilerOptions, forceConsistentCasingInFileNames, noUncheckedIndexedAccess, skipLibCheck, strict, target, useUnknownInCatchVariables

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, types, extends, include

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): 0. Session setup, 1. Spec Clarifier (AMEND), 2. Planner (APPEND), 3. Close stage, desmon-1-plan — Spec & Plan stage (v2)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): A. Primary path (NESTED_CLAUDE=1), B. Fallback path (NESTED_CLAUDE=0) — you drive the same contract, desmon-2-dev — Parallel Ralph loop stage (v2), Exit, Setup

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (12): GlobalInputDeps, desmon, DesmonApi, Window, IdentityPayload, LeaderboardResult, NetResult, PvpResult (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (26): Engine, createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT (+18 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (20): Identity, NetClient, NetSession, SnapshotSource, toSnapshot(), body(), Call, comp() (+12 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (11): clampHp(), COLD_FEVER, createEngine(), initialState(), createFever(), Fever, feverActive(), feverInput() (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (16): body(), join(), index, pgStore, pgTypes, pkg, read(), BuildConfig (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.17
Nodes (9): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.05
Nodes (33): AppDeps, createApp(), isInt(), parseSnapshot(), record(), Call, setup(), ApiHandler (+25 more)

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (11): companionsField(), DEFAULT_SAVE, intField(), isInt(), itemsField(), parseSave(), SaveFile, SaveFileV1 (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.48
Nodes (5): bigField(), format(), ratio(), suffix(), resolvePvp()

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (21): SPECIES_IDS, clamp01(), drawParticles(), DropAnim, dropPosition(), easeInQuad(), easeOutQuad(), lerp() (+13 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (11): devDependencies, electron, electron-builder, eslint, @eslint/js, pg, @types/node, typescript (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (9): scripts, build, lint, package, smoke, start, start:server, test (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (6): mac, category, hardenedRuntime, identity, notarize, target

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (3): @noble/hashes, overrides, app-builder-lib

### Community 38 - "Community 38"
Cohesion: 0.60
Nodes (4): createSaveScheduler(), boot(), setupFallbackInput(), harness()

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (14): IpcOptions, registerIpcHandlers(), createNetClient(), createNetSession(), InputMode, IPC, IpcChannel, LeaderboardQueryPayload (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 42 - "Community 42"
Cohesion: 0.21
Nodes (12): COIN_ITEM, coinsForIndex(), pickWeightedTrinket(), rollLoot(), TOTAL_WEIGHT, TRINKET_TABLE, WeightedTrinket, mulberry32() (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.31
Nodes (4): isSmoke, showMenuWindow(), createOverlayWindow(), defaultPosition()

### Community 44 - "Community 44"
Cohesion: 0.57
Nodes (5): defaultName(), identityFilePath(), isValidName(), readIdentity(), writeIdentity()

### Community 45 - "Community 45"
Cohesion: 0.90
Nodes (3): readSaveFile(), saveFilePath(), writeSaveFile()

## Knowledge Gaps
- **253 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `join()` connect `Community 28` to `Community 44`, `Community 45`, `Community 30`, `Community 39`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `Community 30` to `Community 26`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `InputModePayload` connect `Community 19` to `Community 8`, `Community 4`, `Community 5`, `Community 39`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.059244126659857 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._