# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 69 files · ~58,552 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 518 nodes · 1006 edges · 30 communities (28 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `370ca126`
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 22 edges
2. `InputModePayload` - 13 edges
3. `AGENTS.md — Desktop Monster (DesMon)` - 13 edges
4. `createGame()` - 12 edges
5. `COLORS` - 12 edges
6. `InputSource` - 11 edges
7. `Sprite` - 11 edges
8. `build` - 10 edges
9. `createEngine()` - 10 edges
10. `monsterMaxHp()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts
- `makeGate()` --calls--> `createFallbackGate()`  [EXTRACTED]
  tests/input.test.ts → src/core/input.ts
- `stateFixture()` --calls--> `monsterForIndex()`  [EXTRACTED]
  tests/renderer.test.ts → src/core/monsters.ts
- `harness()` --calls--> `setupWindowDrag()`  [EXTRACTED]
  tests/drag.test.ts → src/renderer/drag.ts
- `harness()` --calls--> `createSaveScheduler()`  [EXTRACTED]
  tests/renderer.test.ts → src/renderer/game.ts

## Import Cycles
- None detected.

## Communities (30 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (49): Engine, initialState(), damageForLevel(), monsterMaxHp(), xpReward(), xpToNext(), createHeroAnim(), createMonsterAnim() (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (41): createEngine(), clamp01(), createDropPool(), createParticlePool(), drawParticles(), DropAnim, dropPosition(), easeInQuad() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (62): Banner, drawBanner(), drawCounters(), drawFloats(), drawHpBar(), drawLevelHud(), drawMeter(), drawScaledText() (+54 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (13): FALLBACK, GlobalInputController, GlobalInputDeps, TrayDeps, desmon, DesmonApi, Window, InputMode (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (30): @noble/hashes, author, dependencies, uiohook-napi, description, devDependencies, electron, electron-builder (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), GainNodeLike, GameAudio, GameAudioOptions (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (14): buildTrayMenuTemplate(), getActiveTray(), setupTray(), TrayController, TrayLike, TrayMenuActions, TrayMenuItem, chunkOfType() (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (24): IMPLEMENTATION_PLAN — Desktop Monster, Iteration Log (append-only), Tasks, [x] T01 — Scaffold frozen command contract, empty-but-green, [x] T02 — Transparent always-on-top overlay window + accessory lifecycle, [x] T03 — Shared IPC constants, preload bridge, persistence handlers, [x] T04 — Guarded global input hook (uiohook, production only), [x] T05 — Core types, progression formulas, monster catalog (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (8): isSmoke, registerIpcHandlers(), createOverlayWindow(), defaultPosition(), IPC, mainIndexTs, mainIpcTs, preloadTs

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (19): build, appId, asarUnpack, directories, files, mac, npmRebuild, nsis (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (24): createFallbackGate(), FallbackGate, FallbackGateDeps, InputDriver, InputEvent, InputListener, InputMode, SimulatedInputDriver (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (8): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, harness()

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): AGENTS.md — Desktop Monster (DesMon), Code style — ponytail (lazy senior dev), Commands (the contract), Commit convention, Definition of done (loop level), Hard rules, macOS environment notes, Observability (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, outDir, rootDir, types, extends (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (8): compilerOptions, module, moduleResolution, outDir, rootDir, types, extends, include

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): Accessibility permission (global input), DesMon — Desktop Monster, Packaging (unsigned macOS build), Requirements, Run from source, Save file and resetting progress, Windows

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (10): Assumptions, Deployment, Features, Input Abstraction (mandatory), Manual Verification Appendix, Non-Goals, Server / API, SPEC — Desktop Monster (DesMon) (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (7): compilerOptions, forceConsistentCasingInFileNames, noUncheckedIndexedAccess, skipLibCheck, strict, target, useUnknownInCatchVariables

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, types, extends, include

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (5): 0. Session setup, 1. Spec Clarifier (AMEND), 2. Planner (APPEND), 3. Close stage, desmon-1-plan — Spec & Plan stage (v2)

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): A. Primary path (NESTED_CLAUDE=1), B. Fallback path (NESTED_CLAUDE=0) — you drive the same contract, desmon-2-dev — Parallel Ralph loop stage (v2), Exit, Setup

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (3): BuildConfig, pkg, readme

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (3): indexTs, styleCss, windowTs

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (6): NativeHook, startGlobalInput(), FakeHook, FALLBACK, GLOBAL, makeHarness()

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (9): crc32(), encodeTrayIconPng(), getCrcTable(), PNG_SIGNATURE, pngChunk(), Rgba, TRANSPARENT, TRAY_ICON_PALETTE (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.42
Nodes (6): getCurrentInputMode(), IpcOptions, readSaveFile(), saveFilePath(), writeSaveFile(), MoveWindowPayload

## Knowledge Gaps
- **200 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InputModePayload` connect `Community 3` to `Community 10`, `Community 27`, `Community 29`, `Community 6`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `InputSource` connect `Community 10` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08005427408412483 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08069381598793364 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06621004566210045 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._