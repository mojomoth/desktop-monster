# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 86 files · ~84,614 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 660 nodes · 1347 edges · 38 communities (35 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92524af7`
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 54 edges
2. `createEngine()` - 14 edges
3. `COLORS` - 14 edges
4. `monsterMaxHp()` - 13 edges
5. `InputModePayload` - 13 edges
6. `AGENTS.md — Desktop Monster (DesMon)` - 13 edges
7. `monsterForIndex()` - 12 edges
8. `createGame()` - 12 edges
9. `drawSprite()` - 12 edges
10. `parseSave()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `stateWith()` --calls--> `createEngine()`  [EXTRACTED]
  tests/collection.test.ts → src/core/engine.ts
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts
- `makeGate()` --calls--> `createFallbackGate()`  [EXTRACTED]
  tests/input.test.ts → src/core/input.ts
- `harness()` --calls--> `setupWindowDrag()`  [EXTRACTED]
  tests/drag.test.ts → src/renderer/drag.ts
- `harness()` --calls--> `createSaveScheduler()`  [EXTRACTED]
  tests/renderer.test.ts → src/renderer/game.ts

## Import Cycles
- 3-file cycle: `src/core/monsters.ts -> src/core/types.ts -> src/core/save.ts -> src/core/monsters.ts`

## Communities (38 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (52): drawBoss(), companionSlot(), drawCompanion(), DrawTextOptions, fontSprite, HERO_PALETTE, heroAttack, heroIdle (+44 more)

### Community 1 - "Community 1"
Cohesion: 0.27
Nodes (9): crc32(), encodeTrayIconPng(), getCrcTable(), PNG_SIGNATURE, pngChunk(), Rgba, TRANSPARENT, TRAY_ICON_PALETTE (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (61): bigField(), format(), ratio(), suffix(), activeCompanions(), applyCollection(), CollectionAction, CollectionEvent (+53 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (54): [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage, [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage, [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest, [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura, [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip, [~] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500, [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown, [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch (+46 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (10): IpcOptions, InputMode, IPC, IpcChannel, LeaderboardQueryPayload, MoveWindowPayload, SetNamePayload, mainIndexTs (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (24): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): author, dependencies, uiohook-napi, description, license, main, name, productName (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), GainNodeLike, GameAudio, GameAudioOptions (+9 more)

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
Cohesion: 0.40
Nodes (3): BuildConfig, pkg, readme

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (3): indexTs, styleCss, windowTs

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (26): defaultName(), Identity, identityFilePath(), isValidName(), readIdentity(), writeIdentity(), registerIpcHandlers(), createNetClient() (+18 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (12): ApiHandler, ApiRequest, ApiResponse, clientIp(), createRequestListener(), HttpReq, HttpRes, call() (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.47
Nodes (3): isSmoke, createOverlayWindow(), defaultPosition()

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): FALLBACK, getCurrentInputMode(), GlobalInputController, GlobalInputDeps, NativeHook, startGlobalInput(), TrayDeps, InputModePayload (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (67): createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT, MonsterAnim (+59 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (10): devDependencies, electron, electron-builder, eslint, @eslint/js, @types/node, typescript, typescript-eslint (+2 more)

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
Cohesion: 0.33
Nodes (9): desmon, DesmonApi, Window, IdentityPayload, LeaderboardResult, NetResult, PvpResult, InputPayload (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 41 - "Community 41"
Cohesion: 0.90
Nodes (3): readSaveFile(), saveFilePath(), writeSaveFile()

## Knowledge Gaps
- **247 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InputModePayload` connect `Community 31` to `Community 8`, `Community 4`, `Community 5`, `Community 38`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `parseSave()` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08134920634920635 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06562819203268641 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.10084033613445378 - nodes in this community are weakly interconnected._