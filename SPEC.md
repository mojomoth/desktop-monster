# SPEC — Desktop Monster (DesMon)
<!-- RULES: no TBDs. Every feature row must have an AC a shell can decide.
     Ambiguities become numbered Assumptions with rationale. -->

## Summary

DesMon is a BongoCat-style macOS desktop companion: a small transparent,
frameless, always-on-top pixel-art overlay in which every keystroke or mouse
click makes a sword-wielding pixel knight attack a monster. Monsters have HP
bars; killed monsters scatter into pixels, drop items that are auto-collected,
grant XP, and are replaced by a stronger monster, while the hero levels up.
Built with Electron + TypeScript, all art and sound generated from code
committed in-repo, verified end-to-end by the frozen AGENTS.md command
contract (`npm test && npm run lint && npm run typecheck`, `npm run smoke`,
`npm run package`).

## Assumptions

1. Hero stands on the LEFT facing right; monster on the RIGHT facing left — the requirement allows either side; fixing one makes rendering and tests deterministic.
2. Attack triggers are every `keydown` (OS auto-repeat included) and every `mousedown`, each counting as exactly one attack; key-up, mouse-up, scroll and mouse-move do not — matches the BongoCat per-event feel and is the simplest countable rule.
3. Progression formulas are frozen to GAME_ARCHITECTURE §2: `damageForLevel(l)=l`; crit chance 10% × multiplier 2; `monsterMaxHp(i)=⌊10·1.15^i⌋`; `xpReward(i)=5+3i`; `xpToNext(l)=⌊20·1.4^(l−1)⌋`; coins per kill `1+⌊i/3⌋`; trinket chance 25% — exact formulas make every AC numerically decidable.
4. Exactly 5 monster species (slime, bat, ghost, golem, dragon) cycle forever, with a palette tint per `tier = ⌊index/5⌋` — bounds art effort while making endless scaling visible.
5. Progression is endless: no win state, no final boss, no prestige — DesMon is a companion toy, not a completable game.
6. Trinket items are collection-only counters (5 kinds, weighted) with zero gameplay effect — keeps the engine minimal; coins and trinkets are just HUD/save counters.
7. The save file is `app.getPath('userData')/save.json` (`app.setName('DesMon')` so dev and packaged share it), schema `SaveFileV1`; any missing/corrupt/wrong-typed file silently falls back to `DEFAULT_SAVE` — the app must never fail to boot because of a bad save.
8. Damage is applied at input time; animations are presentation-only and never gate game logic — keeps the engine deterministic and key-mash-safe.
9. Animation timing state machines (hero IDLE/ATTACK; monster SPAWNING/IDLE/HIT/DYING) are pure functions in `src/core/fsm.ts`, advanced by injected `dt`, consumed by the renderer — the only way animation timing is unit-testable without a DOM.
10. The window is fixed at 320×220 CSS px (internal canvas 160×110, `image-rendering: pixelated`), not resizable, draggable ONLY by a 24-px top strip — resizing transparent windows glitches and full-window drag regions swallow the fallback clicks.
11. In SMOKE mode the app never touches uiohook, drives a `SimulatedInputDriver` to fire ≥3 synthetic attacks, and prints `SMOKE_OK` only after the renderer reports its first painted frame over IPC — smoke then proves boot + render + input path with zero permissions and zero interaction.
12. All UI text is English only — localization is a Non-Goal.
13. Sound is exactly 3 synthesized WebAudio blips (attack tick, kill arpeggio, level-up fanfare), created lazily on first input, with no mute/volume UI — included only because it is trivially achievable without assets.
14. Dependency versions are pinned EXACTLY per GAME_ARCHITECTURE §0.2 (electron 39.8.10, eslint 9.39.4, typescript 5.9.3, typescript-eslint 8.63.0, vitest 3.2.7, vite 6.4.3, electron-builder 26.15.3, @types/node 22.20.0, uiohook-napi 1.5.5, no `^` ranges) — host Node 20.12.2 is the binding constraint; newer majors break install.
15. Statistical ACs use a fixed seed and tolerance bands (crit 8–12%, trinket 23–27%, over 10,000 trials) — deterministic because the RNG is injected mulberry32.
16. The tray menu is the entire settings surface: title row, input-mode status / "Grant Accessibility…" item, "Reset Progress", "Quit" — no other settings UI exists.

## Features

All ACs are executed literally from the repo root. The gates line
`npm test && npm run lint && npm run typecheck` must also exit 0 for any task
to be considered done (AGENTS.md).

| ID | Name | Behavior | AC (pass = what) |
|---|---|---|---|
| F01 | Frozen command contract | `npm ci`, `npm start`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run smoke`, `npm run package` all exist with AGENTS.md semantics; `package-lock.json` committed; gates green | `npm ci && npm test && npm run lint && npm run typecheck` → exit 0 |
| F02 | Dual-target build | `npm run build` compiles main/preload/core/shared to CJS in `dist/electron` and renderer/core/shared to ESM in `dist/web`; no bundler; all relative imports use `.js` extension | `npm run build && test -f dist/electron/main/index.js && test -f dist/web/renderer/index.js` → exit 0 |
| F03 | Pinned dependency matrix | package.json pins the exact versions of Assumption 14 (critical pins: electron, uiohook-napi, vite) | `node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d.electron==='39.8.10'&&d['uiohook-napi']==='1.5.5'&&d.vite==='6.4.3'?0:1)"` → exit 0 |
| F04 | Progression formulas | `src/core/formulas.ts` implements the exact formulas of Assumption 3; all outputs are positive integers, curves strictly increasing | tests `tests/formulas.test.ts :: "monsterMaxHp is exactly 10/20/40/163 at index 0/5/10/20"` and `:: "xpToNext is exactly 20/28/39/54 at level 1/2/3/4"` and `:: "formula outputs are positive integers and strictly increasing"` exist and pass (`npx vitest run tests/formulas.test.ts` → exit 0) |
| F05 | Monster catalog & tier scaling | `src/core/monsters.ts`: `monsterForIndex(i)` cycles the 5 species of Assumption 4 in fixed order with `tier=⌊i/5⌋` and display name; maxHp from `monsterMaxHp(i)` | test `tests/formulas.test.ts :: "monsterForIndex cycles 5 species in order and tier increments every 5 monsters"` exists and passes |
| F06 | Deterministic RNG & crits | `src/core/rng.ts` exports `Rng` interface + `mulberry32(seed)`; engine takes an injected Rng; crits: 10% chance, ×2 damage | tests `tests/engine.test.ts :: "same seed yields an identical event log"` and `:: "crit rate over 10000 seeded attacks is within 8 to 12 percent"` exist and pass |
| F07 | Attack engine event sequence | `createEngine(save?, rng?)` exposes `attack(source)`, `getState()`, `toSave()`; a non-killing attack emits `attack, monsterHit`; a killing blow emits `attack, monsterHit, monsterKilled, itemDropped[, levelUp], monsterSpawned` in that order; next monster uses index+1 | tests `tests/engine.test.ts :: "non-killing attack emits attack then monsterHit"` and `:: "killing blow emits attack, monsterHit, monsterKilled, itemDropped, monsterSpawned in order"` and `:: "next monster spawns with index+1 and higher maxHp"` exist and pass |
| F08 | XP & level-up | Kills grant `xpReward(index)` XP; at `xpToNext(level)` the hero levels up, XP progress carries over (subtract threshold); damage becomes `damageForLevel(newLevel)` | test `tests/engine.test.ts :: "hero reaches level 2 at exactly 20 cumulative xp and damage becomes 2"` exists and passes |
| F09 | Loot drops | Every kill drops `1+⌊index/3⌋` coins; 25% chance of exactly one weighted trinket from {sword_shard:5, slime_gel:4, bone:3, gem:2, crown:1}; drops auto-added to state | tests `tests/loot.test.ts :: "every kill drops exactly 1 + floor(index/3) coins"` and `:: "trinket drop rate over 10000 seeded kills is within 23 to 27 percent"` exist and pass |
| F10 | Save schema & tolerant parsing | `src/core/save.ts`: `SaveFileV1 {version:1, level, xp, killCount, coins, items, monsterIndex, monsterHp}`; `serializeSave` stable; `parseSave(raw)` never throws — junk/missing/wrong types → `DEFAULT_SAVE` values | tests `tests/save.test.ts :: "serialize then parse round-trips losslessly"` and `:: "junk, missing and wrong-typed fields yield DEFAULT_SAVE values"` exist and pass |
| F11 | Engine resume from save | `createEngine(save)` resumes exactly at `monsterIndex`/`monsterHp` plus level/xp/coins/kills/items | test `tests/engine.test.ts :: "createEngine(save) resumes monsterIndex and monsterHp exactly"` exists and passes |
| F12 | InputDriver abstraction | `src/core/input.ts`: `InputDriver` interface (`start`, `stop`, `subscribe(cb)` → unsubscribe) emitting `{source:'keyboard'∣'mouse'}`; `SimulatedInputDriver` with programmatic `emit()` used by ALL tests and by smoke; no test imports uiohook | `npx vitest run tests/input.test.ts && ! grep -rqi uiohook tests src/core` → exit 0; required test `tests/input.test.ts :: "SimulatedInputDriver delivers keyboard and mouse events to subscribers"` |
| F13 | Guarded global hook (production only) | `src/main/globalInput.ts`: on darwin call `systemPreferences.isTrustedAccessibilityClient(true)` ONCE at startup; only if trusted, lazy-require uiohook-napi and `uIOhook.start()` inside try/catch; if untrusted, emit fallback mode and poll (prompt=false) every 5s until granted; `uIOhook.stop()` on `will-quit`; uiohook is never imported by core/shared/renderer | `grep -q isTrustedAccessibilityClient src/main/globalInput.ts && grep -q will-quit src/main/index.ts && ! grep -rq uiohook-napi src/core src/shared src/renderer` → exit 0 |
| F14 | Window-focused fallback input | When mode=fallback the renderer attaches window `keydown`/`mousedown` listeners (ignoring the drag strip) feeding the same engine path; when mode flips to global they detach (no double counting); gate logic is pure in `src/core/input.ts` with injected attach/detach | test `tests/input.test.ts :: "fallback gate attaches listeners in fallback mode and detaches them when global mode activates"` exists and passes |
| F15 | Transparent always-on-top overlay | BrowserWindow per GAME_ARCHITECTURE §3.1: transparent, frameless, no shadow, not resizable, skipTaskbar, `setAlwaysOnTop(true,'screen-saver')`, `setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true,skipTransformProcessType:true})`, `backgroundThrottling: false`, 24-px drag strip only | `grep -q "screen-saver" src/main/window.ts && grep -q "visibleOnFullScreen: true" src/main/window.ts && grep -q "backgroundThrottling: false" src/main/window.ts && grep -q "transparent: true" src/main/window.ts && grep -q "hasShadow: false" src/main/window.ts` → exit 0 (visuals: Manual M1) |
| F16 | Accessory-app lifecycle | `app.setName('DesMon')`; `app.dock?.hide()` before window creation; single instance via `requestSingleInstanceLock` (second instance quits); clean quit from tray | `grep -q requestSingleInstanceLock src/main/index.ts && grep -q "app.setName" src/main/index.ts && grep -q "dock" src/main/index.ts` → exit 0 |
| F17 | Preload bridge & IPC security | `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`; preload exposes `window.desmon` (onInput, onInputMode, onReset, getInputMode, loadState, saveState, openAccessibilitySettings) over the channels of GAME_ARCHITECTURE §3.2 defined as constants in `src/shared/ipc.ts` | `grep -q "contextIsolation: true" src/main/window.ts && grep -q "nodeIntegration: false" src/main/window.ts && grep -q "sandbox: true" src/main/window.ts && grep -q contextBridge src/preload/index.ts` → exit 0 |
| F18 | Smoke mode | `npm run smoke` builds and launches Electron with `SMOKE=1`: no uiohook, SimulatedInputDriver fires ≥3 attacks, renderer reports first painted frame via IPC, main prints `SMOKE_OK` to stdout and `app.exit(0)`; 20s watchdog → `app.exit(1)`; headful, zero interaction | `npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 |
| F19 | Sprites-as-code, zero binary assets | All art (hero knight idle×2/attack×3/slash, 5 species idle×2+hit, items, 3×5 digit font, tray icon matrix) is palette + string-row matrices in `src/renderer/sprites/`; every frame rectangular w×h; every non-`.` char in palette; NO binary image/audio files anywhere in the repo | `npx vitest run tests/sprites.test.ts && test -z "$(find src static tests -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' -o -iname '*.bmp' -o -iname '*.ico' -o -iname '*.icns' -o -iname '*.svg' -o -iname '*.wav' -o -iname '*.mp3' -o -iname '*.ogg' \))"` → exit 0; required tests `tests/sprites.test.ts :: "every frame is rectangular with the declared width and height"` and `:: "every non-transparent char exists in the palette"` |
| F20 | Animation state machines | Pure FSMs in `src/core/fsm.ts` (Assumption 9): hero ATTACK lasts 180ms then IDLE, re-input restarts ATTACK; monster SPAWNING 300ms, HIT flash 120ms, DYING 500ms then next spawn — all advanced by injected dt | tests `tests/fsm.test.ts :: "hero attack lasts 180ms then returns to idle"` and `:: "input during attack restarts the attack"` and `:: "monster dying lasts 500ms then transitions to spawning"` exist and pass |
| F21 | Canvas scene & HUD boot render | Renderer draws the full scene each rAF frame: field strip, hero left, monster right, boxed HP bar above monster, top-left `LV n`+XP bar, top-right kill and coin counters, pooled floating damage numbers; first painted frame reported via IPC (drives F18) | `npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0 (proves the scene painted without renderer exception; layout/quality: Manual M2, M3) |
| F22 | Persistence wiring | Main writes `save.json` atomically (tmp file + rename) under userData; renderer loads save at boot, saves on every kill and level-up, debounced 500ms after damage, and on window blur; tray "Reset Progress" resets engine to defaults and saves | `grep -q "save.json" src/main/persistence.ts && grep -q rename src/main/persistence.ts && npx vitest run tests/save.test.ts` → exit 0 (restart round-trip: Manual M5) |
| F23 | Tray icon & menu | Tray icon is a 16×16 pixel matrix encoded to PNG in code (node:zlib deflate + CRC, no asset file) via `nativeImage.createFromBuffer`; menu: `DesMon v0.1.0` (disabled), input-mode status / "Grant Accessibility…" (opens the Privacy pane deep link), `Reset Progress`, `Quit`; menu rebuilds on mode change | `grep -q "Reset Progress" src/main/tray.ts && grep -q Quit src/main/tray.ts && grep -q deflateSync src/main/trayIcon.ts` → exit 0 (visibility/behavior: Manual M6) |
| F24 | WebAudio blips | `src/renderer/audio.ts` synthesizes the 3 blips of Assumption 13 with OscillatorNode, lazily created on first input; no audio files | `grep -q createOscillator src/renderer/audio.ts && test -z "$(find src static -type f \( -iname '*.wav' -o -iname '*.mp3' -o -iname '*.ogg' \))"` → exit 0 (audibility: Manual M7) |
| F25 | Unsigned macOS packaging | `npm run package` produces an unsigned arm64 dmg and .app under `release/` | `npm run package && test -f release/DesMon-0.1.0-arm64.dmg && test -d release/mac-arm64/DesMon.app` → exit 0 |
| F26 | Packaging config safety | electron-builder config: `mac.identity: null`, `npmRebuild: false`, `notarize: false`, `hardenedRuntime: false`, `asarUnpack` for `.node`, `CSC_IDENTITY_AUTO_DISCOVERY=false` in the package script; Windows nsis target present as CONFIG ONLY (never built in this run) | `node -e "const p=require('./package.json');const b=p.build;const ok=b.mac.identity===null&&b.npmRebuild===false&&b.mac.notarize===false&&b.mac.hardenedRuntime===false&&!!b.win&&!!b.nsis&&p.scripts.package.includes('CSC_IDENTITY_AUTO_DISCOVERY=false');process.exit(ok?0:1)"` → exit 0 |
| F27 | README operator docs | README documents: how to run, Accessibility grant (dev target is "Electron", packaged is "DesMon"), Gatekeeper "Open Anyway" for the unsigned app, save-file location and reset, and that the Windows target is config-only | `grep -qi accessibility README.md && grep -q "Open Anyway" README.md && grep -qi reset README.md` → exit 0 |

## Input Abstraction (mandatory)

- `InputDriver` interface (`src/core/input.ts`): `start()`, `stop()`,
  `subscribe(cb)` → unsubscribe; emits `{ source: 'keyboard' | 'mouse' }`.
- `SimulatedInputDriver` (same file, pure TS): programmatic `emit(source)`;
  used by ALL tests and by `npm run smoke`. Tests never import uiohook-napi
  (enforced by F12's AC).
- Global hook path (uiohook-napi, `src/main/globalInput.ts`): PRODUCTION ONLY,
  main process only, behind `systemPreferences.isTrustedAccessibilityClient(true)`
  called once at startup (never call with `false` first — electron#28395
  suppresses the prompt), lazy `require` inside try/catch (a broken native
  module must never crash startup), `uIOhook.stop()` on `will-quit`.
- Automatic graceful fallback to window-focused input (renderer `keydown` /
  `mousedown`, drag strip excluded) whenever the permission is missing or the
  hook fails; fallback listeners detach when global mode activates (F14).
- Real-hook behavior is verified ONLY in the Manual Verification Appendix (M4).

## Non-Goals

- No networking, telemetry, analytics, or cloud saves.
- No auto-update mechanism.
- No Windows or Linux builds executed in this run — the electron-builder
  `win`/`nsis` section is config-only (F26); `npm run package` targets macOS
  arm64 only. No code signing or notarization.
- No localization; all text is English.
- No settings UI beyond the tray menu (no preferences window, no volume/mute
  control, no window-size or scale options).
- No sound beyond the 3 synthesized WebAudio blips (Assumption 13).
- No gameplay systems beyond the spec: no equipment/abilities/trinket effects,
  no idle or offline progression, no achievements or leaderboards, no
  win/end state.
- No multi-window or multi-display placement features; single fixed-size window.
- No CI pipeline setup in this run.

## Manual Verification Appendix

The ONLY place for non-automatable checks. Perform after the loop converges.

- **M1 — Overlay window.** Run `npm start`. Expect: a small (320×220)
  transparent, frameless, shadowless window with no dock icon that stays on
  top of other apps (including over a fullscreen app on another Space) and can
  be dragged ONLY by its top 24-px strip.
- **M2 — Fallback combat.** With Accessibility NOT granted: click the window,
  then mash keys and click inside it. Expect: knight plays its 3-frame attack
  (restarting on spam), monster flashes white on hit, floating damage numbers
  rise and fade, HP bar drains; crits show larger yellow numbers.
- **M3 — Kill / loot / level-up presentation.** Keep attacking until two kills.
  Expect: dying monster scatters into gravity pixels, items arc out with a
  bounce then fly to the HUD counters (coin counter increments), next monster
  pops in with higher max HP (tier tint after every 5th), "LEVEL UP!" banner
  fires at 20 XP and the LV/XP bar updates.
- **M4 — Global input (real hook).** Grant Accessibility to "Electron"
  (System Settings → Privacy & Security → Accessibility) in dev. Expect: tray
  shows `Input: Global`; typing/clicking IN ANOTHER APP attacks the monster;
  in-window input is not double-counted. Revoke the grant and relaunch:
  expect NO crash, tray shows window-only mode, and its grant item opens the
  Accessibility settings pane.
- **M5 — Persistence.** Kill at least one monster, note level/kills/monster HP,
  quit from the tray, `npm start` again. Expect: identical state, including
  current monster HP. Tray → Reset Progress: expect Lv1, 0 kills, 0 coins,
  monster 0.
- **M6 — Tray.** Expect: pixel-art tray icon visible in the menu bar; menu
  shows title, input-mode line, Reset Progress, Quit; Quit exits with no
  lingering process (`pgrep -f DesMon` empty).
- **M7 — Audio.** With sound on: attack tick on each input, short arpeggio on
  kill, fanfare on level-up. No console errors about AudioContext.
- **M8 — Packaged app.** Open `release/DesMon-0.1.0-arm64.dmg`, copy the app,
  launch via Gatekeeper "Open Anyway". Expect: app runs identically to dev;
  global input requires a separate Accessibility grant for "DesMon".
