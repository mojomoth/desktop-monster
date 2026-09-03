# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 102 files · ~125,104 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 847 nodes · 1816 edges · 52 communities (47 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b5f2e1cb`
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
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 77 edges
2. `createEngine()` - 17 edges
3. `drawSprite()` - 16 edges
4. `monsterMaxHp()` - 15 edges
5. `COLORS` - 15 edges
6. `PgStore` - 15 edges
7. `MemoryStore` - 15 edges
8. `monsterForIndex()` - 14 edges
9. `mulberry32()` - 14 edges
10. `parseSave()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `identityFilePath()` --calls--> `join()`  [INFERRED]
  src/main/identity.ts → tests/server/app.test.ts
- `saveFilePath()` --calls--> `join()`  [INFERRED]
  src/main/persistence.ts → tests/server/app.test.ts
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `stateFixture()` --calls--> `createEngine()`  [EXTRACTED]
  tests/renderer.test.ts → src/core/engine.ts
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (52 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (53): drawFeverAura(), drawBoss(), companionSlot(), drawCompanion(), DrawTextOptions, fontSprite, HERO_PALETTE, heroAttack (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (46): CollectionAction, SaveFile, MenuBridge, MenuDocument, MenuElement, mountMenu(), PANELS, Pending (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (66): activeCompanions(), xpToNext(), SPECIES_IDS, SpeciesId, Companion, SaveFileV1, GameEvent, GameState (+58 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (77): [~] T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types, [~] T55 — Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type, [ ] T56 — SaveFileV3 + pvpParty migration + GameState.pvpParty, [ ] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action, [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts, [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough, [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire, [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response (+69 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (12): FALLBACK, getCurrentInputMode(), GlobalInputController, GlobalInputDeps, NativeHook, startGlobalInput(), InputPayload, InputSource (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (14): FallbackEvent, FallbackEventName, FallbackEventTarget, FallbackInputHandle, FallbackInputOptions, FallbackListener, FallbackModeBridge, setupFallbackInput() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): author, dependencies, uiohook-napi, description, license, main, name, productName (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), FEVER_NOTES, GainNodeLike, GameAudio (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (16): buildTrayMenuTemplate(), getActiveTray(), setupTray(), TrayController, TrayDeps, TrayLike, TrayMenuActions, TrayMenuItem (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (13): build, appId, asarUnpack, directories, files, npmRebuild, nsis, productName (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): AGENTS.md — Desktop Monster (DesMon), Code style — ponytail (lazy senior dev), Commands (the contract), Commit convention, Definition of done (loop level), Hard rules, macOS environment notes, Observability (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (11): Assumptions, Deployment, Features, Input Abstraction (mandatory), Manual Verification Appendix, Non-Goals, Server / API, SPEC — Desktop Monster (DesMon) (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, outDir, rootDir, types, extends (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (8): compilerOptions, module, moduleResolution, outDir, rootDir, types, extends, include

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (11): Accessibility permission (global input), Collection & Battle window, DesMon — Desktop Monster, Free-tier caveats, Gameplay, Packaging (unsigned macOS build), Requirements, Run from source (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): compilerOptions, forceConsistentCasingInFileNames, noUncheckedIndexedAccess, skipLibCheck, strict, target, useUnknownInCatchVariables

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, types, extends, include

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): 0. Session setup, 1. Spec Clarifier (AMEND), 2. Planner (APPEND), 3. Close stage, desmon-1-plan — Spec & Plan stage (v3)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): A. Primary path (NESTED_CLAUDE=1), B. Fallback path (NESTED_CLAUDE=0) — you drive the same contract, desmon-2-dev — Parallel Ralph loop stage (v3), Exit, Setup

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (16): clampHp(), COLD_FEVER, createEngine(), Engine, initialState(), createFever(), Fever, feverActive() (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.27
Nodes (9): crc32(), encodeTrayIconPng(), getCrcTable(), PNG_SIGNATURE, pngChunk(), Rgba, TRANSPARENT, TRAY_ICON_PALETTE (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (13): defaultName(), Identity, identityFilePath(), isValidName(), readIdentity(), writeIdentity(), NetClient, NetSession (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (14): companionPower(), damageForLevel(), monsterMaxHp(), xpReward(), isBoss(), monsterForIndex(), mulberry32(), SaveFileV2 (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): index, pgStore, pgTypes, pkg, read()

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (14): createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT, MonsterAnim (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (4): isSmoke, showMenuWindow(), createOverlayWindow(), defaultPosition()

### Community 31 - "Community 31"
Cohesion: 0.90
Nodes (3): readSaveFile(), saveFilePath(), writeSaveFile()

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (12): COIN_ITEM, coinsForIndex(), pickWeightedTrinket(), rollLoot(), TOTAL_WEIGHT, TRINKET_TABLE, WeightedTrinket, SPECIES_DISPLAY_NAMES (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (10): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+2 more)

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
Cohesion: 0.15
Nodes (8): PgStore, toRow(), compareScore(), MemoryRow, PlayerRow, Scored, ScoreKey, Snapshot

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (13): IpcOptions, registerIpcHandlers(), createNetSession(), InputMode, IPC, IpcChannel, LeaderboardQueryPayload, MoveWindowPayload (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 42 - "Community 42"
Cohesion: 0.21
Nodes (10): bigField(), format(), ratio(), suffix(), applyCollection(), CollectionEvent, CollectionResult, minted() (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (9): body(), Call, join(), LeaderboardResponse, NetError, RegisterResponse, SnapshotResponse, read() (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (10): companionsField(), DEFAULT_SAVE, intField(), isInt(), itemsField(), parseSave(), serializeSave(), upgradeSave() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (14): createApp(), ApiHandler, ApiRequest, ApiResponse, clientIp(), createRequestListener(), HttpReq, HttpRes (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.27
Nodes (7): AppDeps, isInt(), parseSnapshot(), record(), Store, LeaderboardRow, PvpOpponent

### Community 48 - "Community 48"
Cohesion: 0.28
Nodes (7): body(), Call, comp(), player(), titan(), ApiError, PvpResponse

### Community 49 - "Community 49"
Cohesion: 0.48
Nodes (6): createNetClient(), toSnapshot(), main(), probeName(), ProbeResult, runProbe()

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (4): BuildConfig, pkg, read(), readme

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (4): indexTs, read(), styleCss, windowTs

## Knowledge Gaps
- **294 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+289 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `join()` connect `Community 44` to `Community 39`, `Community 50`, `Community 51`, `Community 26`, `Community 28`, `Community 31`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `Community 43` to `Community 38`, `Community 44`, `Community 46`, `Community 47`, `Community 48`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `InputModePayload` connect `Community 8` to `Community 1`, `Community 4`, `Community 5`, `Community 39`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _294 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08298368298368299 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.056189640035118525 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06044303797468355 - nodes in this community are weakly interconnected._