# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 102 files · ~106,022 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 821 nodes · 1790 edges · 53 communities (46 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d0e0480`
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

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 54 edges
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
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `identityFilePath()` --calls--> `join()`  [INFERRED]
  src/main/identity.ts → tests/server/app.test.ts
- `tirelessEngine()` --calls--> `createEngine()`  [EXTRACTED]
  tests/fever.test.ts → src/core/engine.ts
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts
- `tirelessEngine()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/fever.test.ts → src/core/formulas.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (53 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (55): drawFeverAura(), drawBoss(), companionSlot(), drawCompanion(), drawText(), DrawTextOptions, fontSprite, glyphIndex() (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (21): CollectionAction, MenuBridge, MenuDocument, MenuElement, mountMenu(), button(), COMPANIONS, FakeBridge (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (25): xpToNext(), Companion, GameEvent, GameState, GameCanvas, HP_BAR, Banner, drawBanner() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (54): [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14, [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched, [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app, [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal), Tasks, [x] T01 — Scaffold frozen command contract, empty-but-green, [x] T02 — Transparent always-on-top overlay window + accessory lifecycle, [x] T03 — Shared IPC constants, preload bridge, persistence handlers (+46 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (10): FALLBACK, getCurrentInputMode(), GlobalInputController, NativeHook, startGlobalInput(), InputSource, FakeHook, FALLBACK (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (15): InputSource, FallbackEvent, FallbackEventName, FallbackEventTarget, FallbackInputHandle, FallbackInputOptions, FallbackListener, FallbackModeBridge (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): author, dependencies, uiohook-napi, description, license, main, name, productName (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), FEVER_NOTES, GainNodeLike, GameAudio (+10 more)

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
Cohesion: 0.20
Nodes (9): Accessibility permission (global input), DesMon — Desktop Monster, Free-tier caveats, Packaging (unsigned macOS build), Requirements, Run from source, Save file and resetting progress, Server / Leaderboard & PvP (+1 more)

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
Cohesion: 0.28
Nodes (13): GlobalInputDeps, desmon, DesmonApi, Window, IdentityPayload, LeaderboardResult, NetResult, PvpResult (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (18): clamp01(), createDropPool(), createParticlePool(), drawParticles(), DropAnim, dropPosition(), easeInQuad(), easeOutQuad() (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (24): defaultName(), Identity, identityFilePath(), isValidName(), readIdentity(), writeIdentity(), createNetClient(), NetClient (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (11): clampHp(), COLD_FEVER, Engine, initialState(), createFever(), Fever, feverActive(), feverInput() (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (24): readSaveFile(), saveFilePath(), writeSaveFile(), body(), join(), index, pgStore, pgTypes (+16 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (15): DEFAULT_SAVE, SaveFile, PANELS, Pending, battleEnabled(), canRebirth(), companionName(), consumeTargets() (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (17): createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT, MonsterAnim (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (8): applyCollection(), CollectionEvent, CollectionResult, minted(), reroster(), resolvePvp(), SaveFileV2, stateWith()

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (10): companionPower(), damageForLevel(), monsterMaxHp(), xpReward(), isBoss(), monsterForIndex(), calmRng(), makeSave() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (11): activeCompanions(), companionSlotOf(), Game, monsterCentre(), monsterScale(), SaveScheduler, SaveSchedulerOptions, speciesKey() (+3 more)

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
Cohesion: 0.13
Nodes (13): isSmoke, IpcOptions, registerIpcHandlers(), showMenuWindow(), createNetSession(), createOverlayWindow(), defaultPosition(), InputMode (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 42 - "Community 42"
Cohesion: 0.24
Nodes (10): COIN_ITEM, coinsForIndex(), pickWeightedTrinket(), rollLoot(), TOTAL_WEIGHT, TRINKET_TABLE, WeightedTrinket, Rng (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.27
Nodes (7): AppDeps, isInt(), parseSnapshot(), record(), Store, LeaderboardRow, PvpOpponent

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (10): companionsField(), intField(), isInt(), itemsField(), parseSave(), SaveFileV1, serializeSave(), upgradeSave() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (17): mulberry32(), createApp(), Call, setup(), ApiHandler, ApiRequest, ApiResponse, clientIp() (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.39
Nodes (6): SPECIES_IDS, SpeciesId, Particle, EffectPreset, EFFECTS, spawnEffect()

### Community 48 - "Community 48"
Cohesion: 0.32
Nodes (6): body(), Call, comp(), player(), titan(), RegisterResponse

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (13): bigField(), format(), ratio(), suffix(), createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.47
Nodes (5): createEngine(), createSaveScheduler(), boot(), harness(), stateFixture()

## Knowledge Gaps
- **268 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+263 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `join()` connect `Community 28` to `Community 26`, `Community 46`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `Community 43` to `Community 48`, `Community 38`, `Community 44`, `Community 46`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `InputModePayload` connect `Community 19` to `Community 8`, `Community 4`, `Community 5`, `Community 39`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _268 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08165057067603161 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11954022988505747 - nodes in this community are weakly interconnected._