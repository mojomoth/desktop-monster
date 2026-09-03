# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 109 files · ~140,810 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 939 nodes · 2130 edges · 59 communities (52 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a340ef98`
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
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 77 edges
2. `Companion` - 19 edges
3. `drawSprite()` - 18 edges
4. `createEngine()` - 17 edges
5. `COLORS` - 16 edges
6. `PgStore` - 16 edges
7. `MemoryStore` - 16 edges
8. `monsterMaxHp()` - 15 edges
9. `parseSave()` - 15 edges
10. `paletteForTier()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `identityFilePath()` --calls--> `join()`  [INFERRED]
  src/main/identity.ts → tests/server/app.test.ts
- `saveFilePath()` --calls--> `join()`  [INFERRED]
  src/main/persistence.ts → tests/server/app.test.ts
- `setup()` --calls--> `createApp()`  [EXTRACTED]
  tests/server/pvp.test.ts → src/server/app.ts
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `stateFixture()` --calls--> `createEngine()`  [EXTRACTED]
  tests/renderer.test.ts → src/core/engine.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (59 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (32): sizeOf(), drawFeverAura(), drawBoss(), drawCompanion(), drawText(), DrawTextOptions, fontSprite, glyphIndex() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (20): PANELS, Pending, battleEnabled(), BattleState, canRebirth(), companionName(), consumeTargets(), displayName() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (21): Battle, Blow, Fighter, line(), simulateBattle(), applyCollection(), autoParty(), CollectionEvent (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (77): [~] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed, [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks, [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal, [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale, [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app, [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal), Tasks, [x] T01 — Scaffold frozen command contract, empty-but-green (+69 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): FALLBACK, getCurrentInputMode(), GlobalInputController, GlobalInputDeps, NativeHook, startGlobalInput(), TrayDeps, InputModePayload (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (23): buildTrayMenuTemplate(), getActiveTray(), setupTray(), TrayController, TrayLike, TrayMenuActions, TrayMenuItem, crc32() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): author, dependencies, uiohook-napi, description, license, main, name, productName (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), FEVER_NOTES, GainNodeLike, GameAudio (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (14): isBoss(), monsterForIndex(), SPECIES_DISPLAY_NAMES, SPECIES_SIZE, SPECIES_TYPE, typeOf(), beats(), effectiveness (+6 more)

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
Cohesion: 0.20
Nodes (14): FallbackEvent, FallbackEventName, FallbackEventTarget, FallbackInputHandle, FallbackInputOptions, FallbackListener, FallbackModeBridge, setupFallbackInput() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (24): xpToNext(), SaveFileV1, GameCanvas, HP_BAR, Banner, drawBanner(), drawCounters(), drawFloats() (+16 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (30): registerIpcHandlers(), createNetClient(), createNetSession(), NetClient, SnapshotSource, toSnapshot(), PendingMatch, main() (+22 more)

### Community 27 - "Community 27"
Cohesion: 0.21
Nodes (17): bigField(), format(), ratio(), suffix(), companionsField(), DEFAULT_SAVE, intField(), isInt() (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): createApp(), isInt(), parseSnapshot(), record(), ApiHandler, ApiRequest, ApiResponse, clientIp() (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (24): SPECIES_IDS, SpeciesId, clamp01(), drawParticles(), DropAnim, dropPosition(), easeInQuad(), easeOutQuad() (+16 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (18): BAT_PALETTE, batHit, batIdle, DRAGON_PALETTE, dragonHit, dragonIdle, GHOST_PALETTE, ghostHit (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): matches, body(), Call, comp(), join(), stolen(), TheftsResponse, read() (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (21): activeCompanions(), partyOrder(), createHeroAnim(), createMonsterAnim(), createDropPool(), createParticlePool(), createGame(), fieldParty() (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.23
Nodes (12): HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT, MonsterAnim, MonsterAnimState, monsterHit() (+4 more)

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
Cohesion: 0.13
Nodes (11): AppDeps, PgStore, toRow(), compareScore(), MemoryRow, PlayerRow, Scored, ScoreKey (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (13): IpcOptions, InputMode, IPC, IpcChannel, LeaderboardQueryPayload, MoveWindowPayload, PvpPayload, ReclaimPayload (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (19): clampHp(), COLD_FEVER, createEngine(), Engine, initialState(), createFever(), Fever, feverActive() (+11 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (20): CollectionAction, MenuBridge, mountMenu(), COMPANIONS, FakeBridge, LOST, LOST_ONE, makeBridge() (+12 more)

### Community 43 - "Community 43"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (10): body(), Call, comp(), fight(), player(), preview(), setup(), titan() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (9): bone, coin, crown, gem, ItemSpriteId, itemSprites, registryEntries, slimeGel (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (8): defaultName(), Identity, identityFilePath(), isValidName(), readIdentity(), writeIdentity(), createTheftWatcher(), TheftWatcher

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (10): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.32
Nodes (5): monsterMaxHp(), SaveFileV3, calmRng(), makeSave(), scriptedRng()

### Community 50 - "Community 50"
Cohesion: 0.19
Nodes (13): COIN_ITEM, coinsForIndex(), pickWeightedTrinket(), rollLoot(), TOTAL_WEIGHT, TRINKET_TABLE, WeightedTrinket, mulberry32() (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.28
Nodes (14): desmon, DesmonApi, Window, IdentityPayload, LeaderboardResult, MatchResult, NetResult, PvpResult (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.19
Nodes (7): isSmoke, reclaimAndApply(), sendToAll(), showMenuWindow(), NetSession, createOverlayWindow(), defaultPosition()

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (4): MenuDocument, MenuElement, button(), FakeDoc

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (5): index, pgStore, pgTypes, pkg, read()

### Community 56 - "Community 56"
Cohesion: 0.90
Nodes (3): readSaveFile(), saveFilePath(), writeSaveFile()

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (4): indexTs, read(), styleCss, windowTs

## Knowledge Gaps
- **309 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+304 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `join()` connect `Community 31` to `Community 39`, `Community 47`, `Community 55`, `Community 56`, `Community 57`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Theft` connect `Community 38` to `Community 1`, `Community 42`, `Community 47`, `Community 52`, `Community 26`, `Community 28`, `Community 31`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `Community 45` to `Community 38`, `Community 28`, `Community 44`, `Community 31`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _309 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0960960960960961 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.025974025974025976 - nodes in this community are weakly interconnected._