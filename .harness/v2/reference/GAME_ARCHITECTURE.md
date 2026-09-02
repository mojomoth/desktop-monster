# DesMon (Desktop Monster) — Implementation Reference

A BongoCat-style always-on-top desktop companion: every system-wide
keystroke/click makes a pixel-art hero attack a monster. Electron + TypeScript,
zero external assets. Researched and version-verified on 2026-07-08 against the
npm registry and vendor docs.

> **Addendum (harness reconciliation — NORMATIVE, overrides sections below where they differ):**
> 1. The AGENTS.md command contract adds `npm run smoke`: build, launch Electron
>    with `SMOKE=1`; the main process prints `SMOKE_OK` to stdout after the
>    window has loaded, then exits 0 by itself; a ~20s watchdog exits 1 on
>    failure. Smoke must not depend on Accessibility permission (use the
>    simulated/fallback input path only).
> 2. `lint` script is `eslint . --max-warnings 0` (zero warnings allowed).
> 3. electron-builder output directory is `release/` (already reflected in §5).
> 4. Tests must use an injected `InputDriver` abstraction
>    (`SimulatedInputDriver` in tests/smoke); never touch uiohook in tests.

---

## 0. Research results (verified 2026-07-08)

### 0.1 uiohook-napi + Electron

- **uiohook-napi 1.5.5** (latest) ships **N-API prebuilds inside the npm
  tarball** — verified by listing the tarball: it contains
  `prebuilds/darwin-arm64/uiohook-napi.node` (plus darwin-x64, linux-x64/arm64,
  win32-x64/arm64). Its install script is `node-gyp-build`, which just locates
  the prebuild — **no compilation at install time, and because it is N-API
  (ABI-stable), NO `@electron/rebuild` is needed for any Electron version**.
  Its only dependency is `node-gyp-build ^4.8.4`.
- Known-good combo: **uiohook-napi 1.5.5 + Electron 39.x on macOS arm64**. No
  rebuild script needed. The only build-time trap is electron-builder's default
  native rebuild — disabled via `"npmRebuild": false` (see §5).
- **Critical runtime gotcha (uiohook-napi issue #24)**: on macOS, calling
  `uIOhook.start()` **without Accessibility permission crashes the process**.
  You MUST check `systemPreferences.isTrustedAccessibilityClient(...)` first
  and never call `start()` untrusted.
- uiohook must run **in the main process only** (never renderer), and
  `uIOhook.stop()` must be called on `will-quit` or the app can hang/crash on
  exit.

### 0.2 Version matrix — the host Node version is the binding constraint

The machine has **Node v20.12.2**, older than several 2026-era tools require.
Verified engines from the registry:

| Package | Latest | Problem on Node 20.12.2 | **Chosen version** |
|---|---|---|---|
| electron | 43.0.0 | electron ≥40 requires host node `>= 22.12.0` for its npm installer; 37–39 require only `>= 12.20.55` | **39.8.10** (bundles Node 22.20.0, Chromium 142; supports macOS 26) |
| eslint | 10.6.0 | eslint 10 requires node `^20.19.0` → would break | **9.39.4** (engines `^20.9.0` ✓) |
| vitest | 4.1.10 | vitest 4 needs vite 6/7/8; engines edge | **3.2.7** (engines `^20.0.0` ✓) |
| vite (vitest's dep) | 7.3.6 via `^5\|\|^6\|\|^7.0.0-0` range | vite 7 requires node `^20.19.0` — npm would resolve 7.3.6 and break | **pin `vite: 6.4.3` as a direct devDependency** (engines `^20.0.0` ✓; satisfies vitest's range so it dedupes) |
| typescript | 6.0.3 | 6.0 is brand-new; 5.9 fully supported by typescript-eslint | **5.9.3** |
| typescript-eslint | 8.63.0 | none (peers: eslint `^9`, ts `<6.1.0`) ✓ | **8.63.0** |
| electron-builder | 26.15.3 | none (engines `>=14`) ✓ | **26.15.3** |
| @types/node | — | match Electron 39's bundled Node | **22.20.0** |
| uiohook-napi | 1.5.5 | none | **1.5.5** |
| @eslint/js | — | match eslint | **9.39.4** |

npm only *warns* on engines mismatch by default — do **not** set
`engine-strict`. If the machine's Node is ever upgraded to ≥22.12,
Electron/eslint/vitest can all be bumped to latest; until then this matrix is
the newest set that installs and runs cleanly.

### 0.3 Transparent overlay window gotchas (macOS)

- Always-on-top over fullscreen apps needs
  `win.setAlwaysOnTop(true, 'screen-saver')` (highest non-system level) **plus**
  `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })`.
- `setVisibleOnAllWorkspaces` transforms the process type (window/dock flicker)
  unless the app is already a UIElement — so call `app.dock?.hide()` **first**,
  then pass `skipTransformProcessType: true`.
- `transparent: true` requires `frame: false`; set `hasShadow: false` (shadow
  ghosting artifacts on redraw of transparent windows), `resizable: false`
  (resizing transparent windows glitches), `roundedCorners: false`.
- **Occlusion throttling**: unfocused/transparent windows can get
  `requestAnimationFrame` throttled — set
  `webPreferences.backgroundThrottling: false`.
- `-webkit-app-region: drag` regions **swallow mouse events** (page gets no
  mousedown). Since the no-permission fallback needs in-window clicks, only a
  top 24-px strip is draggable; the scene below is `no-drag`.
- ESM in renderer: `<script type="module">` pages loaded via `loadFile()`
  (file://) work in Electron's Chromium ESM loader for relative imports (it
  cannot load bare npm specifiers — we don't need any). Fallback if it ever
  CORS-blocks: serve via `protocol.handle('app', …)` with `standard: true`
  (mitigation in §7 item 7).

### 0.4 electron-builder unsigned macOS build

- Skip signing: env `CSC_IDENTITY_AUTO_DISCOVERY=false` **and**
  `mac.identity: null`.
- Also set `mac.notarize: false` and `mac.hardenedRuntime: false` (hardened
  runtime + no signature can prevent launch).
- On Apple Silicon the unsigned app runs locally after System Settings →
  Privacy & Security → "Open Anyway" (Gatekeeper on macOS 26 requires this once).
- `"npmRebuild": false` prevents electron-builder from trying to rebuild
  uiohook-napi against Electron headers (unnecessary for N-API, and it would
  require network + toolchain).

---

## 1. File / module tree

```
desktop-monster/
├── package.json                  # scripts, pinned deps, electron-builder "build" config
├── tsconfig.base.json            # shared strict compiler options (target ES2022)
├── tsconfig.main.json            # CJS build (module node16): src/{main,preload,core,shared} → dist/electron
├── tsconfig.renderer.json        # ESM build (module es2022): src/{renderer,core,shared} → dist/web
├── tsconfig.test.json            # noEmit typecheck of tests/ + core + sprite data
├── eslint.config.mjs             # flat config: @eslint/js + typescript-eslint recommended
├── vitest.config.ts              # node env, include tests/**/*.test.ts only
├── .gitignore                    # node_modules/ dist/ release/
├── README.md                     # run/permission/build instructions
├── static/
│   ├── index.html                # drag strip + <canvas>, <script type=module src=../dist/web/renderer/index.js>
│   └── style.css                 # transparent bg, image-rendering: pixelated, drag/no-drag regions
├── src/
│   ├── shared/
│   │   └── ipc.ts                # IPC channel name constants + payload types (compiled into both builds)
│   ├── core/                     # PURE TS — zero imports of electron/DOM/node (100% vitest-able)
│   │   ├── types.ts              # GameState, MonsterDef, ItemDef, GameEvent, InputSource
│   │   ├── formulas.ts           # monsterMaxHp(i), xpToNext(lvl), damageForLevel(lvl), xpReward(i)
│   │   ├── monsters.ts           # species catalog, monsterForIndex(i) (species cycling + tier tint id)
│   │   ├── rng.ts                # Rng interface + mulberry32(seed) deterministic PRNG
│   │   ├── loot.ts               # loot table, rollLoot(rng, monsterIndex) → ItemDrop[]
│   │   ├── engine.ts             # createEngine(save?) → { attack(), getState(), toSave() }; emits GameEvent[]
│   │   ├── save.ts               # SaveFileV1 schema, serialize/parse/validate, DEFAULT_SAVE
│   │   └── index.ts              # barrel re-export
│   ├── main/
│   │   ├── index.ts              # app lifecycle: single-instance, dock.hide, create window/tray, wire modules, SMOKE mode
│   │   ├── window.ts             # createMainWindow() with the exact BrowserWindow options (§3)
│   │   ├── tray.ts               # Tray + context menu (status, grant-permission, reset, quit)
│   │   ├── trayIcon.ts           # pixel-matrix tray icon → tiny pure-code PNG encoder (node:zlib) → nativeImage
│   │   ├── globalInput.ts        # accessibility check, uiohook start/stop, permission polling, mode events
│   │   ├── persistence.ts        # atomic JSON read/write in app.getPath('userData')/save.json
│   │   └── ipc.ts                # ipcMain.handle/on registrations
│   ├── preload/
│   │   └── index.ts              # contextBridge.exposeInMainWorld('desmon', …) — CJS, deps: electron only
│   └── renderer/
│       ├── index.ts              # boot: load save → createEngine → input wiring → start rAF loop
│       ├── game.ts               # scene orchestration: entities, animation state machines, event handling
│       ├── anim.ts               # tweens/easing, particle system (death pixel-scatter, sparkles)
│       ├── hud.ts                # HP bar, level + XP bar, kill/coin counters, floating damage numbers
│       ├── input.ts              # subscribes window.desmon.onInput + focused-window fallback listeners
│       ├── audio.ts              # WebAudio-synthesized 8-bit blips (no assets)
│       ├── global.d.ts           # `window.desmon` type declaration (from shared/ipc types)
│       └── sprites/
│           ├── sprite.ts         # Sprite type, drawSprite(ctx, sprite, frame, x, y, opts)
│           ├── palette.ts        # named hex palettes (DB16-style)
│           ├── hero.ts           # knight: idle×2, attack×3, slash-arc overlay frames
│           ├── monsters.ts       # 5 species × (idle×2 + hit) frames
│           ├── items.ts          # coin, trinket sprites
│           └── font.ts           # tiny 3×5 glyphs (digits + a few letters) as string rows
└── tests/
    ├── formulas.test.ts          # curve monotonicity, exact values, integer-ness
    ├── engine.test.ts            # attack/kill/level-up/spawn sequences with seeded rng
    ├── loot.test.ts              # loot distribution with seeded rng, always-coin invariant
    ├── save.test.ts              # round-trip, corrupt-input rejection, defaults
    └── sprites.test.ts           # every frame rectangular & consistent w×h; every char in palette
```

Module strategy (no bundler, plain `tsc`, two compiles of the shared code):
- `package.json` has **no** `"type": "module"` → `tsconfig.main.json` uses
  `module: node16` which therefore **emits CommonJS** for
  main/preload/core/shared (preload must be CJS under sandbox — per Electron
  ESM docs).
- `tsconfig.renderer.json` uses `module: es2022`,
  `moduleResolution: bundler` → native ESM for the browser, loaded by
  `<script type="module">`.
- **Rule for all source files: every relative import uses an explicit `.js`
  extension** (e.g. `import { createEngine } from '../core/engine.js'`).
  `module: node16` enforces this on main/core/shared; the renderer needs it for
  the browser loader. TS resolves `./x.js` → `./x.ts` in both modes.
- Core/shared are compiled twice (once CJS into `dist/electron`, once ESM into
  `dist/web`) — trivial cost, zero tooling.

---

## 2. Core TypeScript interfaces & formulas

```ts
// src/core/types.ts
export type InputSource = 'keyboard' | 'mouse';

export interface MonsterDef {
  index: number;          // 0-based global monster number (drives scaling)
  speciesId: string;      // 'slime' | 'bat' | 'ghost' | 'golem' | 'dragon'
  name: string;           // "Slime Lv.3" style display name
  maxHp: number;
  tier: number;           // Math.floor(index / species count) → renderer tint
}

export interface ItemDef { id: string; name: string; kind: 'coin' | 'trinket'; }
export interface ItemDrop { item: ItemDef; amount: number; }

export interface GameState {
  level: number;          // hero level, starts 1
  xp: number;             // xp into current level
  killCount: number;
  coins: number;
  items: Record<string, number>;   // trinket id → count
  monster: MonsterDef;
  monsterHp: number;
}

export type GameEvent =
  | { type: 'attack'; damage: number; crit: boolean; source: InputSource }
  | { type: 'monsterHit'; hpAfter: number; maxHp: number }
  | { type: 'monsterKilled'; monster: MonsterDef; xpGained: number }
  | { type: 'itemDropped'; drops: ItemDrop[] }
  | { type: 'levelUp'; newLevel: number }
  | { type: 'monsterSpawned'; monster: MonsterDef };

// src/core/engine.ts
export interface Engine {
  attack(source: InputSource): GameEvent[]; // reducer step (rng injected at creation)
  getState(): Readonly<GameState>;
  toSave(): SaveFileV1;
}
export function createEngine(save?: SaveFileV1 | null, rng?: Rng): Engine;
```

Formulas (`src/core/formulas.ts`) — exact, integer, unit-tested:

```ts
export const damageForLevel = (level: number) => level;                       // +1 dmg per level (visible stat)
export const CRIT_CHANCE = 0.1, CRIT_MULT = 2;                                // rng-injected
export const monsterMaxHp  = (index: number) => Math.floor(10 * Math.pow(1.15, index)); // 10, 11, 13 … 40 @10 … 163 @20
export const xpReward      = (index: number) => 5 + 3 * index;
export const xpToNext      = (level: number) => Math.floor(20 * Math.pow(1.4, level - 1)); // 20, 28, 39, 54 …
```

Loot (`src/core/loot.ts`): every kill drops coins `1 + Math.floor(index / 3)`;
plus 25% chance of one weighted trinket from
`[{sword_shard,w:5},{slime_gel,w:4},{bone,w:3},{gem,w:2},{crown,w:1}]`. Rng is
the injected `Rng` interface (`next(): number` in [0,1)); `mulberry32` gives
deterministic tests.

Persistence shape (`src/core/save.ts`) — written by main to
`app.getPath('userData')/save.json` (i.e.
`~/Library/Application Support/DesMon/save.json`; call `app.setName('DesMon')`
so dev and packaged use the same dir):

```ts
export interface SaveFileV1 {
  version: 1;
  level: number; xp: number; killCount: number; coins: number;
  items: Record<string, number>;
  monsterIndex: number;      // respawn exactly where you left off
  monsterHp: number;
}
export const DEFAULT_SAVE: SaveFileV1;
export function parseSave(raw: unknown): SaveFileV1;   // validates types/ranges, fills defaults, never throws on junk → DEFAULT_SAVE
export function serializeSave(s: SaveFileV1): string;  // stable JSON
```

Core has **zero** imports of `electron`, DOM, or `node:*` — vitest runs it in
plain node.

---

## 3. Electron specifics

### 3.1 Exact BrowserWindow options (`src/main/window.ts`)

```ts
app.dock?.hide();                                   // BEFORE window creation (accessory app, no dock icon)
const win = new BrowserWindow({
  width: 320, height: 220, useContentSize: true,
  frame: false, transparent: true, hasShadow: false,
  resizable: false, fullscreenable: false, maximizable: false, minimizable: false,
  skipTaskbar: true, roundedCorners: false,
  acceptFirstMouse: true,                           // fallback clicks register without focusing first
  show: false,                                      // show on 'ready-to-show' to avoid white flash
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true, nodeIntegration: false, sandbox: true,
    backgroundThrottling: false,                    // keep rAF alive while unfocused/occluded
  },
});
win.setAlwaysOnTop(true, 'screen-saver');
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
win.loadFile('static/index.html');
win.once('ready-to-show', () => win.show());
```

Plus in `src/main/index.ts`: `app.setName('DesMon')`,
`app.requestSingleInstanceLock()` (quit second instance),
`app.on('will-quit', stopGlobalInput)`. SMOKE mode: when `process.env.SMOKE`
is set, after the window finishes loading print `SMOKE_OK` to stdout and
`app.exit(0)`; a 20s `setTimeout` watchdog calls `app.exit(1)`.

### 3.2 IPC channels (`src/shared/ipc.ts` — constants + payload types)

| Channel | Direction / kind | Payload |
|---|---|---|
| `desmon:input` | main → renderer (`send`) | `{ source: 'keyboard' \| 'mouse' }` |
| `desmon:input-mode` | main → renderer (`send`) | `{ mode: 'global' \| 'fallback'; accessibilityGranted: boolean }` |
| `desmon:get-input-mode` | renderer → main (`invoke`) | → same payload (initial state) |
| `desmon:load-state` | renderer → main (`invoke`) | → `SaveFileV1 \| null` |
| `desmon:save-state` | renderer → main (`invoke`) | `SaveFileV1` → `void` (atomic write: tmp file + rename) |
| `desmon:reset` | main → renderer (`send`) | none (tray "Reset Progress" → renderer resets engine, saves) |
| `desmon:open-accessibility-settings` | renderer → main (`invoke`) | none → `shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')` |

### 3.3 Preload contextBridge API (`src/preload/index.ts`, CJS, imports only `electron`)

```ts
contextBridge.exposeInMainWorld('desmon', {
  onInput:     (cb: (e: InputPayload) => void) => subscribe('desmon:input', cb),      // returns unsubscribe fn
  onInputMode: (cb: (m: InputModePayload) => void) => subscribe('desmon:input-mode', cb),
  onReset:     (cb: () => void) => subscribe('desmon:reset', cb),
  getInputMode: () => ipcRenderer.invoke('desmon:get-input-mode'),
  loadState:    () => ipcRenderer.invoke('desmon:load-state'),
  saveState:    (s: SaveFileV1) => ipcRenderer.invoke('desmon:save-state', s),
  openAccessibilitySettings: () => ipcRenderer.invoke('desmon:open-accessibility-settings'),
});
```

`src/renderer/global.d.ts` declares `window.desmon` with these types (imported
from `shared/ipc.js`).

### 3.4 Tray

- Icon: 16×16 pixel-matrix (same sprite-as-code style) → encoded to PNG **in
  code** via a ~40-line encoder in `trayIcon.ts` (PNG chunks +
  `node:zlib.deflateSync` + CRC32) → `nativeImage.createFromBuffer(png)`. No
  asset file; avoids `createFromBitmap`'s platform-dependent byte order.
- Menu: `DesMon vX` (disabled) / `Input: Global ✓` or
  `Input: Window-only (grant Accessibility…)` (click → open settings pane) /
  separator / `Reset Progress` / `Quit`. Rebuild menu when input mode changes.

### 3.5 Drag region

`static/index.html`: a 24-px top strip `div.drag-handle
{ -webkit-app-region: drag; }` (subtle grip dots, shown on hover); everything
else `-webkit-app-region: no-drag` so fallback-mode clicks reach the page.
Keyboard fallback needs window focus only, which clicking the window provides.

### 3.6 Accessibility permission detection + fallback (`src/main/globalInput.ts`)

```ts
function startGlobalInput(onInput, onModeChange) {
  if (process.platform !== 'darwin') return tryStartHook();           // win/linux: just start
  // Single prompt=true call at startup: returns status AND shows the native dialog once if never asked.
  // (Do NOT call with false first — Electron issue #28395: a prior false call suppresses the prompt.)
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (trusted) return tryStartHook();
  onModeChange({ mode: 'fallback', accessibilityGranted: false });
  // Poll every 5s with prompt=false; when granted, attempt hook start (works without relaunch in most cases).
  pollUntilTrusted(() => tryStartHook());
}
function tryStartHook() {
  try {
    // lazy require so a missing/broken native module can never crash startup
    const { uIOhook } = require('uiohook-napi') as typeof import('uiohook-napi');
    uIOhook.on('keydown',   () => onInput({ source: 'keyboard' }));
    uIOhook.on('mousedown', () => onInput({ source: 'mouse' }));
    uIOhook.start();
    onModeChange({ mode: 'global', accessibilityGranted: true });
  } catch { onModeChange({ mode: 'fallback', accessibilityGranted: false }); }
}
```

Fallback wiring (renderer `input.ts`): if mode is `fallback`, attach
`window.addEventListener('keydown', …)` and `('mousedown', …)` (ignoring the
drag strip) and feed the same engine path. When mode flips to `global`, detach
them (prevents double-count of in-window events; while global, uiohook already
sees in-window clicks/keys). Note in README: in dev, the TCC grant is for
**"Electron"** (`node_modules/electron/dist/Electron.app`); the packaged
**DesMon.app** needs its own grant. In SMOKE mode, skip global input entirely.

---

## 4. Rendering

- **Canvas**: `<canvas width="160" height="110">` (internal, low-res) displayed
  at CSS `320×220 px` with `image-rendering: pixelated` and
  `ctx.imageSmoothingEnabled = false`. On Retina, each game pixel = 4 device
  px — crisp chunky pixels.
- **Loop**: single `requestAnimationFrame` loop, `dt = min(now - last, 100)` ms
  clamp; `update(dt)` advances animation timers/particles, `draw()` repaints
  the full 160×110 frame (trivial fill cost). `backgroundThrottling: false`
  keeps it live while unfocused.
- **Animation state machines** (per entity, `{ state, t }` advanced by dt):
  - **Hero**: `IDLE` (2-frame bob, 500 ms/frame) → on input → `ATTACK`
    (3 frames over 180 ms: wind-up / slash+arc overlay / recover) → `IDLE`.
    New input during `ATTACK` restarts it (BongoCat-style spam feel). Damage is
    applied on input immediately — logic never waits for animation.
  - **Monster**: `SPAWNING` (300 ms pop-in scale) → `IDLE` (2-frame wobble) →
    on hit → `HIT` (120 ms white-flash palette swap) → `IDLE`; on hp ≤ 0 →
    `DYING` (500 ms: sprite decomposed into its own pixels as scattering
    gravity particles — procedural, no death frames needed) → next monster
    `SPAWNING`.
  - **Item drop**: spawns at monster position, parabolic arc + one ground
    bounce (600 ms), then flies to the HUD counter (300 ms, ease-in) and pops
    the counter (+sparkle).
  - **Floating text**: pooled damage numbers (3×5 pixel digit font from
    `font.ts`), rise 8 px & fade over 600 ms; crits larger/yellow. Level-up
    banner: "LEVEL UP!" flash + hero sparkle particles.
- **HUD** (all canvas-drawn): monster HP bar (boxed, red fill, above monster),
  top-left `LV n` + XP bar, top-right skull×killCount and coin×coins.
- **Sprites-as-code** structure (`sprites/sprite.ts`): palette map + string-row
  frames; `'.'` = transparent. Example:

```ts
export interface Sprite { w: number; h: number; palette: Record<string, string>; frames: string[][]; }

export const slime: Sprite = {
  w: 12, h: 8,
  palette: { g: '#38b764', G: '#257179', e: '#1a1c2c', w: '#f4f4f4' },
  frames: [
    [ '....gggg....',
      '..gggggggg..',
      '.gggwegwegg.',
      '.gggeggeggg.',
      'gggggggggggg',
      'gGGggggggGGg',
      '.GGGGGGGGGG.',
      '............' ],
    [ /* frame 2: squashed variant, same 12×8 */ ],
  ],
};

export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, frame: number,
                           x: number, y: number, opts?: { flipX?: boolean; tint?: string }) {
  const rows = s.frames[frame];
  for (let ry = 0; ry < s.h; ry++) for (let rx = 0; rx < s.w; rx++) {
    const c = s.palette[rows[ry][opts?.flipX ? s.w - 1 - rx : rx]];
    if (c) { ctx.fillStyle = opts?.tint ?? c; ctx.fillRect(x + rx, y + ry, 1, 1); }
  }
}
```

`tests/sprites.test.ts` asserts every frame has exactly `h` rows of length `w`
and every non-`.` char exists in the palette — this makes the "all art as code"
requirement machine-checkable. Tier tint: species repeat with an HSL-shifted
palette per `tier` so scaling monsters look new. Audio (`audio.ts`): WebAudio
`OscillatorNode` square-wave blips (attack tick, kill arpeggio, level-up
fanfare) — synthesized, no assets, created lazily on first input.

---

## 5. Exact package.json

```json
{
  "name": "desmon",
  "productName": "DesMon",
  "version": "0.1.0",
  "description": "Desktop Monster - a BongoCat-style desktop companion battle game",
  "author": "DesMon Developers <devvvick@gmail.com>",
  "license": "MIT",
  "main": "dist/electron/main/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.main.json && tsc -p tsconfig.renderer.json",
    "start": "npm run build && electron .",
    "smoke": "npm run build && SMOKE=1 electron .",
    "test": "vitest run",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json",
    "package": "npm run build && CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --mac"
  },
  "dependencies": {
    "uiohook-napi": "1.5.5"
  },
  "devDependencies": {
    "@eslint/js": "9.39.4",
    "@types/node": "22.20.0",
    "electron": "39.8.10",
    "electron-builder": "26.15.3",
    "eslint": "9.39.4",
    "typescript": "5.9.3",
    "typescript-eslint": "8.63.0",
    "vite": "6.4.3",
    "vitest": "3.2.7"
  },
  "build": {
    "appId": "dev.desmon.app",
    "productName": "DesMon",
    "npmRebuild": false,
    "directories": { "output": "release" },
    "files": ["dist/**/*", "static/**/*"],
    "asarUnpack": ["**/*.node"],
    "mac": {
      "target": [{ "target": "dmg", "arch": ["arm64"] }],
      "identity": null,
      "hardenedRuntime": false,
      "notarize": false,
      "category": "public.app-category.games"
    },
    "win": { "target": [{ "target": "nsis", "arch": ["x64"] }] },
    "nsis": { "oneClick": true, "deleteAppDataOnUninstall": false }
  }
}
```

Notes: exact pins (no `^`) for one-shot reproducibility. No `"type": "module"`
(deliberate — makes the node16 build emit CJS). No
`postinstall`/`electron-builder install-app-deps` (would trigger a pointless
native rebuild). `uiohook-napi` is in `dependencies` so electron-builder
packages it (`asarUnpack` keeps the `.node` prebuild loadable outside asar).

Key config files:
- `tsconfig.base.json`: `strict`, `target: ES2022`,
  `useUnknownInCatchVariables`, `noUncheckedIndexedAccess`,
  `skipLibCheck: true`, `forceConsistentCasingInFileNames`.
- `tsconfig.main.json`: extends base; `module/moduleResolution: node16`,
  `outDir: dist/electron`, `rootDir: src`, `types: ["node"]`, include
  `src/main`, `src/preload`, `src/core`, `src/shared`.
- `tsconfig.renderer.json`: extends base; `module: es2022`,
  `moduleResolution: bundler`, `outDir: dist/web`, `rootDir: src`,
  `lib: ["ES2022","DOM"]`, `types: []`, include `src/renderer`, `src/core`,
  `src/shared`.
- `tsconfig.test.json`: extends base; `noEmit`, `module: es2022`,
  `moduleResolution: bundler`, `types: ["node"]`, include `tests`, `src/core`,
  `src/shared`, `src/renderer/sprites`.
- `vitest.config.ts`: `test: { environment: 'node', include: ['tests/**/*.test.ts'] }`
  — cannot touch electron. Tests use explicit
  `import { describe, it, expect } from 'vitest'` (no globals config needed).
- `eslint.config.mjs`:
  ```js
  import js from '@eslint/js';
  import tseslint from 'typescript-eslint';
  export default tseslint.config(
    { ignores: ['dist/**', 'release/**', 'node_modules/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
  );
  ```
  (`@typescript-eslint/no-require-imports` must be disabled inline for the one
  lazy `require('uiohook-napi')` in `globalInput.ts`, or use `createRequire`.)
- `static/index.html`:
  `<script type="module" src="../dist/web/renderer/index.js"></script>`
  (relative to `static/`, resolves over file:// in dev and inside asar in prod
  since both dirs are packaged at app root).

---

## 6. Ordered task breakdown (12 tasks — gates green after every one)

Each task is one fresh-context agent iteration. "Gates" =
`npm test && npm run lint && npm run typecheck` all exit 0.

1. **Scaffold, empty-but-green.** Create `package.json` (§5 exactly), all four
   tsconfigs, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore` update,
   `static/index.html` + `style.css` (drag strip + empty canvas), stub
   `src/core/index.ts`, minimal `src/main/index.ts` (creates a plain window,
   loads index.html, SMOKE mode support), stub `src/preload/index.ts`, stub
   `src/renderer/index.ts` (paints one test pixel), one trivial test. Run
   `npm install` (commits package-lock.json).
   **Accept:** gates pass; `npm run build` emits `dist/electron` + `dist/web`;
   `npm run smoke` exits 0.
2. **Core: types + formulas + monster catalog.** `types.ts`, `formulas.ts`,
   `monsters.ts` with the exact formulas in §2; real tests (exact values at
   index 0/5/10/20, monotonicity, integers, species cycling).
   **Accept:** gates pass; `npx vitest run tests/formulas.test.ts` shows ≥8
   assertions.
3. **Core: rng + loot + engine.** `rng.ts` (mulberry32), `loot.ts`, `engine.ts`
   (attack reducer emitting the `GameEvent[]` sequences of §2). Tests: seeded
   kill sequence produces `monsterHit→monsterKilled→itemDropped→monsterSpawned`,
   level-up at the right cumulative xp, crit rate ≈10% over 10k seeded rolls,
   always-coin invariant.
   **Accept:** gates pass; engine tests cover kill + level-up + spawn scaling.
4. **Core: save schema.** `save.ts` (SaveFileV1, `parseSave` tolerant of
   junk/missing/wrong-type fields → defaults, round-trip stable).
   `createEngine(save)` resumes `monsterIndex`/`monsterHp`. Tests for
   round-trip, corruption, resume.
   **Accept:** gates pass; `parseSave('{"level":"x"}')`-style cases covered.
5. **Electron shell.** `window.ts` with the exact options block (§3.1),
   `app.setName`, dock hide, single-instance, `tray.ts` + `trayIcon.ts`
   (code-generated PNG icon, Quit item), preload contextBridge with stub
   handlers, `shared/ipc.ts`, `main/ipc.ts` with `load-state`/`save-state`
   wired to `persistence.ts`.
   **Accept:** gates pass; `npm run smoke` exits 0; `npm start` shows a
   transparent, frameless, always-on-top window draggable by its top strip;
   tray icon appears; tray → Quit exits cleanly.
6. **Sprite system + all art.** `sprite.ts`, `palette.ts`, `hero.ts`
   (idle/attack/slash frames), `monsters.ts` (5 species), `items.ts`,
   `font.ts`; `tests/sprites.test.ts` integrity checks; renderer draws the
   static scene (field strip, hero left, slime right).
   **Accept:** gates pass (sprite integrity test green); `npm start` shows hero
   + monster idling on the field.
7. **Combat loop, fallback input.** `input.ts` (window keydown/mousedown
   fallback path only for now), `game.ts` state machines (hero attack, monster
   hit flash), `hud.ts` (HP bar, floating damage numbers, level/XP bar with
   values from engine).
   **Accept:** `npm start`, click the window then mash keys → attack animation,
   damage numbers, HP bar drains. Gates pass.
8. **Kill → death → loot → spawn → level-up flow.** Death pixel-scatter
   particles, item arc + auto-collect + counters, next monster spawn (stronger
   HP, tier tint), XP gain, level-up banner, damage growth visible.
   **Accept:** `npm start`, kill 2 monsters → second has higher max HP;
   level-up banner fires at 20 xp; coin counter increments. Gates pass.
9. **Global input (uiohook).** `globalInput.ts` per §3.6 (accessibility
   prompt-once, guard before `start()`, poll-until-trusted, `will-quit` stop),
   IPC forward, tray shows input mode + "Grant Accessibility…" item, renderer
   switches off fallback listeners when global mode activates.
   **Accept:** without permission `npm start` does NOT crash and window input
   still works; `npm run smoke` still exits 0. Gates pass. (Real global input:
   manual appendix.)
10. **Persistence wiring.** Renderer loads save at boot, saves on every
    kill/level-up + debounced 500 ms after damage + on `blur`; tray "Reset
    Progress" round-trip; atomic write in main.
    **Accept:** kill a monster, note level/kills, quit, `npm start` → identical
    state (including current monster HP); Reset returns to Lv1/monster 0.
    Gates pass.
11. **Polish.** WebAudio blips, idle bob/wobble tuning, crit visuals, spawn
    pop-in, hover-visible drag handle, screen-shake on kill, coin-fly animation.
    **Accept:** gates pass; `npm start` — attack tick sound on input, kill
    arpeggio; no console errors.
12. **Packaging + README.** Verify `build` config (§5), run `npm run package`;
    README documents run, Accessibility grant (dev = "Electron", packaged =
    "DesMon"), Gatekeeper "Open Anyway", reset path, and that the win/nsis
    target is config-only.
    **Accept:** `npm run package` exits 0 and produces
    `release/DesMon-0.1.0-arm64.dmg`; the .app under `release/mac-arm64/`
    launches; all three gates still pass.

---

## 7. Top risks & mitigations

1. **uiohook crash without Accessibility permission** (issue #24): never call
   `uIOhook.start()` before `isTrustedAccessibilityClient` returns true; wrap
   in try/catch anyway; fallback mode keeps the game fully playable. Also
   `uIOhook.stop()` on `will-quit` (hang-on-quit bug). Don't call
   `isTrustedAccessibilityClient(false)` before the `(true)` prompt call
   (electron#28395 — prompt gets suppressed); the tray's "open System Settings"
   deep link is the reliable re-grant path.
2. **Native module rebuild failure**: shouldn't happen — darwin-arm64 N-API
   prebuild verified inside the 1.5.5 tarball, install script is
   `node-gyp-build` (lookup only), `npmRebuild: false` stops electron-builder
   from rebuilding. If the prebuild were ever missing, `node-gyp-build` falls
   back to source compile (needs Xcode CLT); ultimate fallback: ship with
   window-focused input only (the architecture degrades gracefully since
   fallback mode already exists).
3. **Old host Node (20.12.2) vs 2026 tooling**: whole matrix in §0.2 chosen to
   satisfy it — Electron 39 (not 40+), eslint 9 (not 10), vitest 3 + explicit
   `vite@6.4.3` pin (otherwise npm resolves vite 7.3.6 which needs node ≥20.19
   and breaks vitest). Never add `engine-strict`.
4. **Transparent window artifacts / frozen rAF**: `hasShadow: false`,
   `resizable: false`, `roundedCorners: false`, `backgroundThrottling: false`,
   repaint every frame (full clear), CSS `background: transparent` on
   html/body. If GPU compositing glitches appear on macOS 26, escalation path:
   `app.disableHardwareAcceleration()` in main (acceptable at 160×110).
5. **Vitest accidentally pulling in Electron**: `src/core` + `src/shared` +
   `sprites/` data files import nothing from electron/DOM; vitest `include` is
   locked to `tests/**`; environment `node`. Any electron import in core fails
   `tsc -p tsconfig.test.json` too (no electron types there).
6. **ESLint flat-config pitfalls**: no `.eslintignore` (unsupported) — ignores
   go in the first config object (`dist/**`, `release/**`); use the meta
   `typescript-eslint` package (not the two `@typescript-eslint/*` packages
   separately); keep non-type-aware `recommended` (type-checked configs need
   `parserOptions.projectService` and slow every lint run); inline-disable
   `no-require-imports` for the lazy uiohook require.
7. **Renderer ESM over file://**: expected to work (Chromium ESM loader handles
   relative module scripts in Electron; this is the standard production path of
   vite-built Electron apps via `loadFile`). If a CORS error ever appears in
   the console, mitigation is confined to `main/window.ts`:
   `protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true } }])`
   + `protocol.handle('app', …)` serving `static/` and `dist/web/`, then
   `loadURL('app://desmon/index.html')` — no renderer changes.
8. **Electron binary download** (postinstall + electron-builder's separate
   cache): both need network on first run; failures mid-download leave a
   corrupt cache — fix by clearing `~/Library/Caches/electron` /
   `~/Library/Caches/electron-builder` and re-running; `ELECTRON_MIRROR` env is
   the escape hatch behind proxies.
9. **macOS 26 (Tahoe) specifics**: unsigned app launch needs one-time Privacy &
   Security → "Open Anyway" (document in README); TCC Accessibility entries are
   per-bundle — dev grant ("Electron") ≠ packaged grant ("DesMon"); menu-bar
   tinting may recolor non-template tray icons (cosmetic; escalation: switch
   tray icon to a template image). If `hdiutil` flakes during dmg creation
   (historic electron-builder issue), re-run or add a `zip` mac target as
   fallback.
10. **Auto-repeat / input floods**: holding a key fires repeated `keydown` via
    uiohook — intended (BongoCat behavior), but the renderer must treat input
    handling as O(1) (restart attack animation, pool floating texts, cap
    particles ~200) so a key-mash storm can't grow unbounded state; IPC
    messages are tiny and per-event (no batching needed at human input rates).

Sources: uiohook-napi repo + issue #24 · Electron BrowserWindow /
systemPreferences docs · electron#28395 · Electron ESM tutorial ·
electron-builder mac code-signing docs · Electron 39 release notes · npm
registry (versions/engines/tarball verified via `npm view` on 2026-07-08).
