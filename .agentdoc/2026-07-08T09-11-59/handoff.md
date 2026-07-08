# Handoff — Desktop Monster

- status: COMPLETE
- session: .agentdoc/2026-07-08T09-11-59
- harness version: v1
- iterations used: 20 of 25 (dev loop) + 1 validation pass (stage 3)

## What was built (vs SPEC)

All 27 feature ACs re-executed literally by the validator on 2026-07-08; 27/27 exit 0.

- F01 ✅ Frozen command contract — all 7 scripts exist; `npm ci && npm test && npm run lint && npm run typecheck` exits 0 from a cold tree.
- F02 ✅ Dual-target build — CJS main/preload under `dist/electron`, ESM renderer under `dist/web`, no bundler.
- F03 ✅ Pinned dependency matrix — electron 39.8.10, uiohook-napi 1.5.5, vite 6.4.3 (and the rest) pinned exactly, no `^`.
- F04 ✅ Progression formulas — frozen Assumption-3 formulas with exact-value tests (10/20/40/163 HP; 20/28/39/54 XP).
- F05 ✅ Monster catalog — 5 species cycle in fixed order, tier = ⌊i/5⌋, HP from `monsterMaxHp(i)`.
- F06 ✅ Deterministic RNG & crits — injected mulberry32; identical seeded event logs; crit rate in 8–12% over 10,000 attacks.
- F07 ✅ Attack engine event sequence — kill emits attack, monsterHit, monsterKilled, itemDropped[, levelUp], monsterSpawned in order.
- F08 ✅ XP & level-up — level 2 at exactly 20 XP, carry-over subtraction, damage = damageForLevel(newLevel).
- F09 ✅ Loot drops — 1+⌊i/3⌋ coins per kill; weighted trinket at 23–27% over 10,000 seeded kills.
- F10 ✅ Save schema & tolerant parsing — SaveFileV1; `parseSave` never throws, junk falls back per-field to DEFAULT_SAVE.
- F11 ✅ Engine resume — `createEngine(save)` resumes monsterIndex/monsterHp exactly.
- F12 ✅ InputDriver abstraction — SimulatedInputDriver drives all tests and smoke; zero uiohook references in tests/src/core.
- F13 ✅ Guarded global hook — `isTrustedAccessibilityClient(true)` once at startup; lazy try/catch require; 5s polling fallback; `uIOhook.stop()` on will-quit.
- F14 ✅ Window-focused fallback input — pure gate attaches in fallback mode, detaches when global activates (no double counting).
- F15 ✅ Transparent always-on-top overlay — screen-saver level, all-workspaces + fullscreen, no throttling, frameless/shadowless, 24-px drag strip.
- F16 ✅ Accessory-app lifecycle — `app.setName('DesMon')`, dock hidden, single-instance lock.
- F17 ✅ Preload bridge & IPC security — contextIsolation/sandbox on, nodeIntegration off, `window.desmon` via contextBridge, channels in `src/shared/ipc.ts`.
- F18 ✅ Smoke mode — `npm run smoke` exits 0 printing SMOKE_OK; ≥3 simulated attacks after first painted frame; 20s watchdog; no uiohook.
- F19 ✅ Sprites-as-code — all art is palette + string matrices; integrity tests over the full registry; zero binary image/audio files in the repo.
- F20 ✅ Animation FSMs — pure dt-driven hero (attack 180ms) and monster (spawn 300 / hit 120 / dying 500ms) machines.
- F21 ✅ Canvas scene & HUD — full scene each rAF frame; first painted frame reported over IPC (drives F18).
- F22 ✅ Persistence wiring — atomic tmp+rename `save.json` under userData; save on kill/level-up, 500ms damage debounce, blur flush, tray reset.
- F23 ✅ Tray icon & menu — pure-code PNG (deflateSync + CRC-32) tray icon; title / input-mode status / Reset Progress / Quit; rebuilds on mode change.
- F24 ✅ WebAudio blips — 3 lazy OscillatorNode blips (tick, kill arpeggio, level-up fanfare); no audio files; failure latches to silence.
- F25 ✅ Unsigned macOS packaging — `npm run package` produces the arm64 dmg + .app under `release/`.
- F26 ✅ Packaging config safety — identity null, npmRebuild/notarize/hardenedRuntime false, asarUnpack for .node, CSC_IDENTITY_AUTO_DISCOVERY=false; win/nsis config-only.
- F27 ✅ README operator docs — run instructions, Accessibility grants, Gatekeeper "Open Anyway", save location/reset, Windows config-only note.

## How to run

- Dev: `npm ci && npm start` (builds then launches Electron; overlay appears top-right-ish, drag by the top 24-px strip).
- Packaged: open `release/DesMon-0.1.0-arm64.dmg`, copy DesMon.app out, launch it. It is unsigned: on first launch use Gatekeeper "Open Anyway" (right-click → Open, or System Settings → Privacy & Security → Open Anyway).
- Global input (attacks from keystrokes/clicks in ANY app) needs the macOS Accessibility permission, which cannot be granted programmatically:
  - dev target = "Electron" (`node_modules/electron/dist/Electron.app`);
  - packaged target = "DesMon" (separate grant).
  Without the grant the app automatically runs in window-focused fallback mode (click the window, then type/click inside it); the tray menu shows the mode and a "grant Accessibility…" shortcut.
- Save file: `~/Library/Application Support/DesMon/save.json` (shared between dev and packaged via `app.setName('DesMon')`); tray → Reset Progress to wipe.

## Artifacts

- release/DesMon-0.1.0-arm64.dmg (110,226,997 bytes, built 2026-07-08 13:01)
- release/mac-arm64/DesMon.app (launch-verified: `SMOKE=1 .../Contents/MacOS/DesMon` → SMOKE_OK, exit 0)
- (release/ is gitignored — rebuild anytime with `npm run package`)

## Gate evidence

```
git status --porcelain                                  → empty (exit 0)
rm -rf node_modules && npm ci                           → exit 0
npm test                                                → exit 0  (Test Files 18 passed (18), Tests 288 passed (288))
npm run lint                                            → exit 0  (--max-warnings 0)
npm run typecheck                                       → exit 0  (3 strict tsc projects)
task AC spot-checks T02 T04 T09 T11 T13 T14 T15 T16 T19 → all exit 0
SPEC sweep F01..F27 (each AC executed literally)        → all EXIT=0 (27/27)
npm run smoke                                           → exit 0, SMOKE_OK
npm run package                                         → exit 0
test -f release/DesMon-0.1.0-arm64.dmg                  → exit 0
test -d release/mac-arm64/DesMon.app                    → exit 0
SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon → SMOKE_OK, exit 0
```

Full per-command log: .agentdoc/2026-07-08T09-11-59/sessions/stage3-eval.md

## Manual steps remaining

- Grant Accessibility to run global input: dev = "Electron", packaged = "DesMon" (System Settings → Privacy & Security → Accessibility). SPEC M4.
- Gatekeeper "Open Anyway" on first launch of the unsigned packaged app. SPEC M8.
- Perform the SPEC Manual Verification Appendix M1–M8 (human-eye checks, explicitly out of loop scope): M1 overlay visuals/always-on-top, M2 fallback combat presentation, M3 kill/loot/level-up presentation, M4 real global hook + revoke/relaunch, M5 persistence restart round-trip + reset, M6 tray icon/menu/quit, M7 the 3 audio blips, M8 packaged-app parity.

## Known limitations

- Unsigned and un-notarized (by design, F26) — every fresh machine needs the Gatekeeper bypass.
- macOS arm64 only; the electron-builder `win`/`nsis` section is CONFIG ONLY and was never built (SPEC Non-Goal).
- Host toolchain constraint: on Node 20.12.2 the package.json override `app-builder-lib → @noble/hashes 1.8.0` is REQUIRED for `npm run package`; removing it breaks packaging (app-builder-lib 26.15.3 CJS-requires an ESM-only @noble/hashes 2.x otherwise). Do not run `npm ci --dry-run` on npm 10.5.0 — it deletes node_modules.
- npm prints engine-mismatch WARNs on Node 20.12.2 — expected and harmless.
- Real global-hook behavior (uiohook) is manual-only verification (M4); automated tests and smoke use SimulatedInputDriver by design.
- No settings UI beyond the tray menu, 3 fixed audio blips with no mute/volume, English only, endless progression with no win state (all SPEC Non-Goals).

## Audit trail

- prompts: .agentdoc/2026-07-08T09-11-59/prompts/
- sessions: .agentdoc/2026-07-08T09-11-59/sessions/ (stage3-eval.md = this validation's command log)
- plan snapshots: .agentdoc/2026-07-08T09-11-59/plans/
