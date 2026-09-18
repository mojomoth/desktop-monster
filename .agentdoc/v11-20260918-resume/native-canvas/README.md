# Chromium canvas equivalence diagnostic

2026-09-18 Host `/root`: standalone offline Electron Canvas2D, no game input, personal save, global hooks or network. This is a drawing primitive check, not the packaged-app E2E or the registered performance observation.

Compiled the renderer modules into this diagnostic's `compiled/` with `npx tsc -p tsconfig.renderer.json --module commonjs --moduleResolution node --outDir .agentdoc/v11-20260918-resume/native-canvas/compiled`. `check.cjs` transpiles the current sprite primitive independently and compares real RGBA bytes with the frozen v0.10 per-pixel oracle for all 786 registered sprites: 41,832 frame/position/scale/mirror/tint cases. Integer and fractional geometry, clipping, and the production identity context transform are included. All passed. `report.json` records runtime, source, script and atlas hashes.

Run: `env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .agentdoc/v11-20260918-resume/native-canvas/check.cjs`.

Initial setup attempt used the nonexistent `dist/electron/renderer/sprites/index.js` path and failed during application load. The owned Electron PID 47506 was terminated, and the script was retained as `check-initial-path-error.cjs`. The successful attempt used the separately compiled modules; no production source changed to resolve the diagnostic path.
