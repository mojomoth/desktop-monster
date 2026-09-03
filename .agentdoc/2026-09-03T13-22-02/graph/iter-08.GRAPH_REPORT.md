# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 105 files · ~129,419 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 887 nodes · 1930 edges · 42 communities (37 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfa8991b`
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
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 46|Community 46]]

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
- `identityFilePath()` --calls--> `join()`  [INFERRED]
  src/main/identity.ts → tests/server/app.test.ts
- `saveFilePath()` --calls--> `join()`  [INFERRED]
  src/main/persistence.ts → tests/server/app.test.ts
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts
- `makeGate()` --calls--> `createFallbackGate()`  [EXTRACTED]
  tests/input.test.ts → src/core/input.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (42 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (72): sizeOf(), Banner, drawBanner(), drawCounters(), drawFloats(), drawHpBar(), drawLevelHud(), drawMeter() (+64 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (46): CollectionAction, MenuBridge, MenuDocument, MenuElement, mountMenu(), PANELS, Pending, battleEnabled() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.90
Nodes (3): readSaveFile(), saveFilePath(), writeSaveFile()

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (77): [~] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action, [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts, [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough, [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire, [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response, [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats, [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed, [~] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds (+69 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): FALLBACK, getCurrentInputMode(), GlobalInputController, GlobalInputDeps, NativeHook, startGlobalInput(), TrayDeps, InputModePayload (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (35): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+27 more)

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
Cohesion: 0.11
Nodes (18): body(), Call, comp(), player(), titan(), ApiError, BattleReplay, MatchResult (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.27
Nodes (9): crc32(), encodeTrayIconPng(), getCrcTable(), PNG_SIGNATURE, pngChunk(), Rgba, TRANSPARENT, TRAY_ICON_PALETTE (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (18): Identity, createNetClient(), NetClient, NetSession, SnapshotSource, toSnapshot(), PendingMatch, main() (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.05
Nodes (77): bigField(), format(), ratio(), suffix(), activeCompanions(), applyCollection(), CollectionEvent, CollectionResult (+69 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (17): body(), join(), index, pgStore, pgTypes, pkg, read(), read() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (62): createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT, MonsterAnim (+54 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (4): isSmoke, showMenuWindow(), createOverlayWindow(), defaultPosition()

### Community 31 - "Community 31"
Cohesion: 0.57
Nodes (5): defaultName(), identityFilePath(), isValidName(), readIdentity(), writeIdentity()

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (14): AppDeps, createApp(), isInt(), matches, parseSnapshot(), partyOf(), record(), Call (+6 more)

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
Cohesion: 0.14
Nodes (9): PgStore, toRow(), compareScore(), MemoryRow, PlayerRow, Scored, ScoreKey, Snapshot (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (13): IpcOptions, registerIpcHandlers(), createNetSession(), InputMode, IPC, IpcChannel, LeaderboardQueryPayload, MoveWindowPayload (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (12): ApiHandler, ApiRequest, ApiResponse, clientIp(), createRequestListener(), HttpReq, HttpRes, call() (+4 more)

## Knowledge Gaps
- **305 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+300 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `join()` connect `Community 28` to `Community 33`, `Community 2`, `Community 39`, `Community 31`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `Community 43` to `Community 38`, `Community 33`, `Community 19`, `Community 46`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `InputModePayload` connect `Community 4` to `Community 8`, `Community 1`, `Community 5`, `Community 39`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _305 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06843090082865544 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.056189640035118525 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.025974025974025976 - nodes in this community are weakly interconnected._