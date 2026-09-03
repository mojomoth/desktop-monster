# Session record — iter 26

- agent role: builder
- worker: claude
- lane: .worktrees/T43 (branch lane/T43)
- harness version: v2
- task: T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin
- result: DONE
- commit: c6f7d2d9206c78df1bf6218ff44aec6560d26382 (the T43 code+test commit; this record line was corrected in the immediate follow-up docs commit)
- graphify affected used: none (task Notes named every symbol; read src/main/net.ts, src/main/identity.ts, src/shared/api.ts directly)

## What I did

- `src/shared/ipc.ts`: added `GET_IDENTITY`/`SET_NAME`/`LEADERBOARD`/`PVP` to the `IPC` table
  (all still matching `^desmon:[a-z][a-z-]*$`) plus `SetNamePayload` and `LeaderboardQueryPayload`.
  Shared stays core-free; `SaveStatePayload = unknown` untouched.
- `src/main/ipc.ts`: pinned `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);`
  and built exactly ONE `createNetSession({ client: createNetClient({ baseUrl }), userDataDir:
  app.getPath('userData'), online: baseUrl !== '', randomUUID })` inside `registerIpcHandlers`
  (which main/index.ts only calls from `app.whenReady()`, so `getPath` is valid and already
  points at the SMOKE tmpdir from T22).
- Four `ipcMain.handle` calls, each validating its untrusted payload with the existing house
  idiom (`(payload as Partial<X> | null | undefined) ?? {}`): `SET_NAME` hands the raw field to
  `session.setName`, whose `isValidName` is the NICK_RE trust boundary; `LEADERBOARD` requires a
  finite `n` and clamps it to `[1, LEADERBOARD_MAX]`, else `LEADERBOARD_DEFAULT`.
- `SAVE_STATE`: appended `session.onSave(parseSave(data))` AFTER `writeSaveFile` — the renderer
  save is parsed, never cast. Upload results (incl. `removed`) are deliberately dropped: main
  never pushes roster changes at the game window (that is the menu's job, T49).
- Preload: `getIdentity`, `setName`, `getLeaderboard`, `pvp` as 2-space `  name:` properties with
  inlined channel literals; the new `../shared/api.js` import is type-only, so the preload still
  value-imports only `electron`. `global.d.ts` mirrors all four as `name(` declarations.
- `tests/ipc.test.ts`: EXTENDED the `toEqual` table (9 → 13 channels), the preload `it.each` list
  (9 → 13) and the `ipcMain.handle(IPC.%s)` list (4 → 8); added 4 tests — the pinned SMOKE
  offline literal + exactly one `createNetSession`, writeSaveFile-before-parseSave ordering, the
  finite-`n` validation, and "no `webContents.send` in main/ipc.ts". Nothing shrank
  (`it(` count 20 → 24).
- Did NOT touch `src/main/index.ts`; its `registerIpcHandlers()` literal is unchanged.

## Files touched

- src/shared/ipc.ts
- src/main/ipc.ts
- src/preload/index.ts
- src/renderer/global.d.ts
- tests/ipc.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-26.md

## Gate results

```
$ npm test
 Test Files  24 passed (24)
      Tests  359 passed (359)

$ npm run lint
> eslint . --max-warnings 0
(no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output, exit 0)

$ <T43 AC line, verbatim>
 ✓ tests/ipc.test.ts (37 tests)
 ✓ tests/renderer.test.ts (64 tests)
 Test Files  2 passed (2)   Tests  101 passed (101)
AC EXIT=0
$ tail /tmp/desmon-smoke.log
SMOKE_OK
```

## Attempts & dead ends (what future iterations must NOT retry)

- Writing the leaderboard handler as a wrapped call (`ipcMain.handle(\n    IPC.LEADERBOARD,\n    ...`)
  → the AC greps the literal `ipcMain.handle(IPC.LEADERBOARD`, so the channel constant MUST stay on
  the same line as `ipcMain.handle(`. Same constraint applies to the other three handlers; the
  callback param is named `p` there purely to keep that line under the line-length limit.
- Re-validating the name with a second `typeof name === 'string'` in the handler → redundant:
  `session.setName` takes `unknown` and `isValidName` already does exactly that plus NICK_RE.
  ponytail: one validation at one boundary, not two.
