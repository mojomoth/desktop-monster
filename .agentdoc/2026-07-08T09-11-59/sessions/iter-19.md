# Session record — iter 19

- agent role: builder
- harness version: v1
- task: T19 — Unsigned macOS packaging + README
- result: DONE
- commit: f4c0c3b

## What I did

- Adopted T19 (first `[ ]` with deps T01/T17 `[x]`; no `[~]` existed),
  flipped to `[~]`. SPEC F25/F26/F27, GAME_ARCHITECTURE §5.
- Verified (did NOT rewrite) the T01-era electron-builder config: the F26
  node check passed as-is (identity null, npmRebuild false, notarize false,
  hardenedRuntime false, asarUnpack `**/*.node`, files dist/static, output
  release/, win/nsis config-only, `CSC_IDENTITY_AUTO_DISCOVERY=false` in the
  package script).
- Wrote `README.md` (F27): run-from-source (`npm ci`/`npm start` + script
  table), Accessibility grant with BOTH identities (dev = "Electron" at
  `node_modules/electron/dist/Electron.app`, packaged = "DesMon", separate
  entries), window-only fallback mode + tray status + auto-upgrade, packaging
  output paths, Gatekeeper "Open Anyway" steps for the unsigned dmg,
  save-file location (`~/Library/Application Support/DesMon/save.json`) +
  tray "Reset Progress", Windows target config-only.
- First `npm run package` run CRASHED (see dead ends): fixed with a
  package.json `overrides` entry scoped to app-builder-lib pinning
  `@noble/hashes@1.8.0`; `npm install` updated the lockfile; electron-builder
  stays at the normative 26.15.3 pin.
- Tests (`tests/packaging.test.ts`, +11, 288 total): F26 config pins
  (never-sign fields, npmRebuild/asarUnpack, output dirs/files, mac target
  dmg/arm64-only + `--mac`-only script, win/nsis config-only) and F27 README
  pins (run commands, both Accessibility identities, "Open Anyway", save
  path + Reset Progress, config-only wording, artifact names kept in sync
  with `pkg.version`).
- Gates → exit 0 (288 tests, 18 files; lint 0 warnings; 3 tsc projects) —
  run on the final tree after a REAL `npm ci` reinstall.
- Full T19 AC (F26 node check + `npm run package` + dmg/.app existence +
  README greps) → exit 0 TWICE, the second time from a freshly `npm ci`-built
  node_modules: `release/DesMon-0.1.0-arm64.dmg` +
  `release/mac-arm64/DesMon.app`, "skipped macOS code signing
  reason=identity explicitly is set to null". Never built the win target.
- Committed feat(T19) as f4c0c3b; then plan update (T19 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- README.md (new)
- package.json (overrides entry only)
- package-lock.json
- tests/packaging.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-19.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  18 passed (18) / Tests  288 passed (288)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ node -e "...F26 check..." && npm run package \
  && test -f release/DesMon-0.1.0-arm64.dmg \
  && test -d release/mac-arm64/DesMon.app \
  && grep -qi accessibility README.md && grep -q "Open Anyway" README.md \
  && grep -qi reset README.md
  • skipped macOS code signing  reason=identity explicitly is set to null
  • building        target=DMG arch=arm64 file=release/DesMon-0.1.0-arm64.dmg
AC_EXIT=0   (passed twice; second run from a fresh `npm ci` tree)
```

## Attempts & dead ends (what future iterations must NOT retry)

- `npm run package` with the stock dependency tree → CRASH on host Node
  20.12.2: `app-builder-lib@26.15.3/out/targets/blockmap/blockmap.js` does
  `require("@noble/hashes/blake2.js")`, which npm resolves to ESM-only
  `@noble/hashes@2.2.0` (`"type":"module"`, no require condition) →
  `ERR_REQUIRE_ESM`. require(esm) needs Node ≥20.19/≥22.12;
  app-builder-lib's `engines: {node: ">=14"}` is wrong. Do NOT retry the
  stock tree, and do NOT try bumping electron-builder: 26.15.4/.5/.6 all
  still declare `@noble/hashes ^2.2.0` (checked via `npm view`).
- WORKING fix (keep it): package.json
  `"overrides": {"app-builder-lib": {"@noble/hashes": "1.8.0"}}` —
  1.8.0 is the last dual CJS/ESM line, exports `./blake2.js` with a
  `require` condition and a `blake2b` export, and satisfies pkijs `^1.4.0`
  (both nested copies resolve to 1.8.0). Removing this override breaks
  `npm run package` on this host. If a future electron-builder release
  switches to `import()` for blake2, the override can go — verify first.
- `npm ci --dry-run` (npm 10.5.0) DELETED node_modules despite --dry-run —
  known npm bug; never use it as a "cheap consistency check". A real
  `npm ci` restored the tree and doubles as the lockfile proof.
- T20 heads-up: `release/DesMon-0.1.0-arm64.dmg` and
  `release/mac-arm64/DesMon.app` exist NOW (T20's AC tests for the dmg);
  release/ is gitignored, so a `git clean -fd` would delete the artifacts —
  rerun `npm run package` if that happens. README artifact names are pinned
  to `pkg.version` by tests: a version bump must update README.md AND
  tray.ts (TRAY_TITLE, per iter-17) together.
