# Session record — iter 01

- agent role: builder
- harness version: v1
- task: T01 — Scaffold frozen command contract, empty-but-green
- result: DONE
- commit: da27dce

## What I did

- Adopted T01 (first `[ ]` with no deps), flipped to `[~]`, implemented the full scaffold.
- package.json copied VERBATIM from GAME_ARCHITECTURE §5: exact pins (electron 39.8.10, uiohook-napi 1.5.5, vite 6.4.3, eslint 9.39.4, typescript 5.9.3, typescript-eslint 8.63.0, vitest 3.2.7, electron-builder 26.15.3, @types/node 22.20.0), no `^`, no `"type":"module"`, frozen scripts, electron-builder `build` config.
- Four tsconfigs: base (strict/ES2022/noUncheckedIndexedAccess), main (node16 → CJS → dist/electron, includes src/{main,preload,core,shared}), renderer (es2022/bundler → ESM → dist/web, DOM lib), test (noEmit, bundler, node types, includes tests + src/core + src/shared + src/renderer/sprites).
- eslint.config.mjs flat config per §5 (ignores dist/release/node_modules in first object, js recommended + tseslint recommended); vitest.config.ts (node env, `tests/**/*.test.ts` only).
- static/index.html (24-px drag strip div, canvas 160×110, module script `../dist/web/renderer/index.js`) + style.css (transparent bg, CSS 320×220, pixelated, drag/no-drag regions).
- Stubs: src/main/index.ts (plain BrowserWindow, loadFile('static/index.html'), SMOKE=1 → SMOKE_OK on did-finish-load then app.exit(0), 20s watchdog app.exit(1)); src/preload/index.ts (empty CJS-safe stub); src/renderer/index.ts (paints one pixel); src/core/index.ts (barrel with CORE_VERSION).
- tests/scaffold.test.ts imports the core barrel via `.js`-extension relative import and asserts it is a non-null object.
- Ran `npm install` once; committed package-lock.json so `npm ci` works.
- Ran T01's full AC line literally (npm ci → gates → build → dist file checks → pin check → smoke) — exit 0.
- Updated IMPLEMENTATION_PLAN.md: T01 `[x]`, iter-01 Notes bullet, Iteration Log row.

## Files touched

- package.json, package-lock.json
- tsconfig.base.json, tsconfig.main.json, tsconfig.renderer.json, tsconfig.test.json
- eslint.config.mjs, vitest.config.ts
- static/index.html, static/style.css
- src/main/index.ts, src/preload/index.ts, src/renderer/index.ts, src/core/index.ts
- tests/scaffold.test.ts
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-01.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/scaffold.test.ts (1 test) 1ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
> eslint . --max-warnings 0        (no output, exit 0)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (exit 0)
GATES_EXIT=0

$ <full T01 AC line: npm ci && gates && build && test -f dist/... && pin check && npm run smoke && grep SMOKE_OK>
AC_EXIT=0        (smoke log tail: "SMOKE_OK")
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — everything worked on the first attempt. Useful facts confirmed for later iterations:
  - vitest (vite 6) resolves `.js`-extension relative imports in tests to `.ts` sources natively; no aliasing needed.
  - npm EBADENGINE WARNs on Node 20.12.2 are expected (warn-only); do NOT add engine-strict.
  - Headful `npm run smoke` runs unattended on this Mac and exits 0 by itself; `did-finish-load` fires even though the renderer module script is a stub.
  - `win.loadFile('static/index.html')` with a relative path resolves against the app root in dev — keep it relative (asar-compatible for T19).
