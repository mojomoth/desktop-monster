# Session record — iter 47

- agent role: builder
- worker: claude
- lane: .worktrees/T52 (branch lane/T52)
- harness version: v2
- task: T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
- result: DONE
- commit: d0574f8 (this record's own sha-recording fixup commit follows it)
- graphify affected used: none (verification-only task; config read straight from package.json)

## What I did

- Verified the T01/T19 electron-builder config against F26 WITHOUT touching package.json:
  `mac.identity: null`, `npmRebuild: false`, `notarize: false`, `hardenedRuntime: false`,
  `win`/`nsis` present, `CSC_IDENTITY_AUTO_DISCOVERY=false` in `scripts.package`,
  `files` keeps `dist/**/*` + `static/**/*` and adds `!dist/electron/server/**`. The F26
  `node -e` check exits 0 as-is — no gap, so no BLOCKED report needed.
- Confirmed `overrides.app-builder-lib["@noble/hashes"] = "1.8.0"` is still present (T19 dead end).
- Ran `npm run package` (electron-builder 26.15.3, electron 39.8.10, Node 20.12.2): downloaded the
  electron zip and the dmgbuild bundle on first run, then produced
  `release/DesMon-0.2.0-arm64.dmg` (110 MB) and `release/mac-arm64/DesMon.app`. No hdiutil flake,
  no cache clear needed, no retry.
- Packaged smoke: no DesMon/Electron instance of this app was running (`pgrep` showed only
  Slack/VSCode/Discord/Figma). `SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon`
  printed exactly `SMOKE_OK` and exited — no menu window, no Accessibility prompt (F58).
- Proved the exclusions: `find` for `*node_modules/pg/*` inside the .app is empty, and
  `@electron/asar` `listPackage` of `Contents/Resources/app.asar` (136 entries) has
  0 `node_modules/pg/` and 0 `dist/electron/server/` entries.
- Re-ran the F56 git-side half against `DEPLOYED_SHA=7a81b346439d8a6d9fe3fe1d0fadd8cbd40e4f4c`:
  ancestor of HEAD, and `git log <sha>..HEAD -- <build-filter paths>` empty — this lane touches
  only README.md and .agentdoc, so it stays true after the merge.
- README: added one line under the Gatekeeper section documenting the packaged self-test
  (`SMOKE=1 …/DesMon` prints `SMOKE_OK`). Additive only; every string pinned by
  tests/packaging.test.ts (F27) is untouched.
- Full AC executed literally end to end (including a second `npm run package`) → exit 0.

## Files touched

- README.md (one added line)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-47.md

## Gate results

```
GATES1 (before README edit):  Test Files 31 passed (31) / Tests 501 passed (501) / GATES_EXIT=0
GATES2 (after README edit):   Test Files 31 passed (31) / Tests 501 passed (501) / GATES_EXIT=0
AC (literal, one line):       AC_EXIT=0
  - F26 node -e config check            -> 0
  - npm run package                     -> PKG_EXIT=0
  - release/DesMon-0.2.0-arm64.dmg      -> present
  - release/mac-arm64/DesMon.app        -> present
  - packaged SMOKE=1 run                -> /tmp/desmon-pkg-smoke.log == "SMOKE_OK"
  - find *node_modules/pg/* in .app     -> empty
  - asar listPackage pg/server entries  -> 0 / 0 (136 entries total)
  - F56 git-side ancestry + filter log  -> ancestor ok, log empty
```

## Attempts & dead ends (what future iterations must NOT retry)

- None. package.json/package-lock.json were deliberately NOT modified (build-filter paths —
  any change after `DEPLOYED_SHA=` breaks F56); the config already satisfied F26, so there was
  nothing to patch. Future iterations: do not "fix" the build config here — a package.json fix
  requires the T51 redeploy rule.
- The dmg build is slow (~1 min) and downloads tooling on a cold cache; run it in the background
  rather than assuming a hang.
