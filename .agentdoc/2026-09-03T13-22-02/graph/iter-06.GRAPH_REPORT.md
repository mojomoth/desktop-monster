# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 105 files · ~130,186 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 894 nodes · 1950 edges · 50 communities (45 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf19f7ab`
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

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 77 edges
2. `drawSprite()` - 18 edges
3. `createEngine()` - 17 edges
4. `COLORS` - 16 edges
5. `PgStore` - 16 edges
6. `MemoryStore` - 16 edges
7. `monsterMaxHp()` - 15 edges
8. `parseSave()` - 15 edges
9. `paletteForTier()` - 15 edges
10. `SpriteCanvas` - 15 edges

## Surprising Connections (you probably didn't know these)
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `makeSaveV2()` --calls--> `monsterForIndex()`  [EXTRACTED]
  tests/engine.test.ts → src/core/monsters.ts
- `identityFilePath()` --calls--> `join()`  [INFERRED]
  src/main/identity.ts → tests/server/app.test.ts
- `saveFilePath()` --calls--> `join()`  [INFERRED]
  src/main/persistence.ts → tests/server/app.test.ts
- `tirelessEngine()` --calls--> `createEngine()`  [EXTRACTED]
  tests/fever.test.ts → src/core/engine.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (50 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (60): sizeOf(), drawFeverAura(), drawBoss(), companionSlot(), drawCompanion(), drawText(), DrawTextOptions, fontSprite (+52 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (36): CollectionAction, SaveFile, MenuBridge, MenuDocument, MenuElement, mountMenu(), PANELS, Pending (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (14): applyCollection(), autoParty(), CollectionEvent, CollectionResult, companionPower(), minted(), partyOrder(), pvpParty() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (77): [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts, [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough, [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire, [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response, [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats, [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed, [~] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds, [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll (+69 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): FALLBACK, getCurrentInputMode(), GlobalInputController, GlobalInputDeps, NativeHook, startGlobalInput(), TrayDeps, InputModePayload (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (24): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): author, dependencies, uiohook-napi, description, license, main, name, productName (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), FEVER_NOTES, GainNodeLike, GameAudio (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (14): buildTrayMenuTemplate(), getActiveTray(), setupTray(), TrayController, TrayLike, TrayMenuActions, TrayMenuItem, chunkOfType() (+6 more)

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
Cohesion: 0.15
Nodes (12): BattleReplay, LeaderboardRow, MatchResult, MonsterType, NetError, PvpRequest, ReclaimRequest, ReclaimResponse (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.27
Nodes (9): crc32(), encodeTrayIconPng(), getCrcTable(), PNG_SIGNATURE, pngChunk(), Rgba, TRANSPARENT, TRAY_ICON_PALETTE (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (19): registerIpcHandlers(), createNetClient(), createNetSession(), NetClient, NetSession, SnapshotSource, toSnapshot(), PendingMatch (+11 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (20): createEngine(), companionsField(), intField(), isInt(), itemsField(), parseSave(), pvpPartyField(), SaveFileV2 (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (17): body(), join(), index, pgStore, pgTypes, pkg, read(), read() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (67): activeCompanions(), xpToNext(), SPECIES_IDS, SpeciesId, Companion, SaveFileV1, GameEvent, GameState (+59 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (4): isSmoke, showMenuWindow(), createOverlayWindow(), defaultPosition()

### Community 31 - "Community 31"
Cohesion: 0.47
Nodes (6): defaultName(), Identity, identityFilePath(), isValidName(), readIdentity(), writeIdentity()

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (18): bigField(), format(), ratio(), suffix(), createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (13): mulberry32(), AppDeps, isInt(), matches, parseSnapshot(), record(), Call, setup() (+5 more)

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
Cohesion: 0.17
Nodes (8): PgStore, toRow(), MemoryRow, PlayerRow, Scored, ScoreKey, Snapshot, Theft

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (14): IpcOptions, readSaveFile(), saveFilePath(), writeSaveFile(), InputMode, IPC, IpcChannel, LeaderboardQueryPayload (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (11): clampHp(), COLD_FEVER, Engine, initialState(), createFever(), Fever, feverActive(), feverInput() (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.24
Nodes (10): COIN_ITEM, coinsForIndex(), pickWeightedTrinket(), rollLoot(), TOTAL_WEIGHT, TRINKET_TABLE, WeightedTrinket, Rng (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.32
Nodes (11): desmon, DesmonApi, Window, IdentityPayload, LeaderboardResult, NetResult, PvpResult, InputPayload (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (10): damageForLevel(), monsterMaxHp(), xpReward(), isBoss(), monsterForIndex(), SPECIES_DISPLAY_NAMES, SPECIES_SIZE, SPECIES_TYPE (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (13): createApp(), ApiHandler, ApiRequest, clientIp(), createRequestListener(), HttpReq, HttpRes, call() (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (8): resolvePvp(), body(), Call, comp(), player(), titan(), ApiError, PvpResponse

### Community 49 - "Community 49"
Cohesion: 0.38
Nodes (7): beats(), effectiveness, effectivePower(), idx(), MonsterType, TYPE_ORDER, MonsterDef

## Knowledge Gaps
- **306 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+301 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `join()` connect `Community 28` to `Community 33`, `Community 39`, `Community 31`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `Community 43` to `Community 48`, `Community 33`, `Community 46`, `Community 38`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `InputModePayload` connect `Community 4` to `Community 8`, `Community 44`, `Community 5`, `Community 39`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _306 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07997038134024435 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._