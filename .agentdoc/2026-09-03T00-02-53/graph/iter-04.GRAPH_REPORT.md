# Graph Report - desktop-monster  (2026-09-03)

## Corpus Check
- 69 files · ~70,409 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 550 nodes · 1038 edges · 26 communities (23 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3822e1cd`
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

## God Nodes (most connected - your core abstractions)
1. `Tasks` - 54 edges
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
- `stateFixture()` --calls--> `monsterForIndex()`  [EXTRACTED]
  tests/renderer.test.ts → src/core/monsters.ts
- `makeSave()` --calls--> `monsterMaxHp()`  [EXTRACTED]
  tests/engine.test.ts → src/core/formulas.ts
- `makeGate()` --calls--> `createFallbackGate()`  [EXTRACTED]
  tests/input.test.ts → src/core/input.ts
- `Wired` --references--> `InputSource`  [EXTRACTED]
  tests/rendererInput.test.ts → src/core/types.ts
- `harness()` --calls--> `setupWindowDrag()`  [EXTRACTED]
  tests/drag.test.ts → src/renderer/drag.ts

## Import Cycles
- None detected.

## Communities (26 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (62): Banner, drawBanner(), drawCounters(), drawFloats(), drawHpBar(), drawLevelHud(), drawMeter(), drawScaledText() (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (46): createEngine(), Engine, initialState(), damageForLevel(), monsterMaxHp(), xpReward(), xpToNext(), createFallbackGate() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (52): createHeroAnim(), createMonsterAnim(), HeroAnim, HeroAnimState, heroInput(), MONSTER_DURATION, MONSTER_NEXT, MonsterAnim (+44 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (54): [ ] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation, [ ] T23 — Core bignum: A–Z suffix format, ratio, bigField, [ ] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2, [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end, [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins, [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap, [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage, [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage (+46 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (32): FALLBACK, getCurrentInputMode(), GlobalInputController, GlobalInputDeps, NativeHook, startGlobalInput(), isSmoke, IpcOptions (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (24): DragEventName, DragEventTarget, DragListener, DragPointerEvent, setupWindowDrag(), WindowDragHandle, WindowDragOptions, createSaveScheduler() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (30): @noble/hashes, author, dependencies, uiohook-napi, description, devDependencies, electron, electron-builder (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): ATTACK_TICK_NOTES, AudioContextLike, AudioParamLike, BlipNote, createGameAudio(), GainNodeLike, GameAudio, GameAudioOptions (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (24): buildTrayMenuTemplate(), getActiveTray(), setupTray(), TrayController, TrayDeps, TrayLike, TrayMenuActions, TrayMenuItem (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (19): build, appId, asarUnpack, directories, files, mac, npmRebuild, nsis (+11 more)

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

## Knowledge Gaps
- **232 isolated node(s):** `name`, `productName`, `version`, `description`, `author` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InputModePayload` connect `Community 4` to `Community 8`, `Community 5`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `InputSource` connect `Community 1` to `Community 2`, `Community 5`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Tasks` connect `Community 3` to `Community 21`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `productName`, `version` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06621004566210045 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07757885763000852 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06547619047619048 - nodes in this community are weakly interconnected._