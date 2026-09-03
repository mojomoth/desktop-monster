# Session record — iter 14

- agent role: builder
- worker: claude
- lane: .worktrees/T68 (branch lane/T68)
- harness version: v3
- task: T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
- result: DONE
- commit: 821f12b6b79d2f3db26025b43cc8245127152d8c
- graphify affected used: none (the five task files + src/core/collection.ts, src/core/types.ts, src/main/net.ts, src/shared/api.ts were read directly — the touched surface is exactly the task's Files)

## What I did

- `src/shared/ipc.ts`: added `PVP_MATCH: 'desmon:pvp-match'`, `THEFTS: 'desmon:thefts'`,
  `RECLAIM: 'desmon:reclaim'` to the IPC table plus `PvpPayload { matchId, party }` and
  `ReclaimPayload { theftId }` (F73). Shared stays core-free.
- `src/main/ipc.ts`: three new `ipcMain.handle` calls forwarding to the T67 session
  (`session.match()`, `session.thefts()`, `session.reclaim(theftId)`); the reclaim payload is
  validated (`typeof theftId === 'string'`) and a bad one resolves the v2-shaped
  `{ ok: false, error: 'network' }` instead of throwing. The existing `PVP` handler now casts to
  `PvpPayload` (was `PvpRequest`); its matchId/party validation was already in place from T67.
- `narrowAction`: `setPvpParty` folded into the `removeCompanions` case (both are `strs('ids')`),
  and the optional `pvpResult.replay` is validated by a new `isReplay()` (opponentName string,
  opponentParty array, blows array of `{ side: 'A'|'D', actorId, targetId, damage: string, ko }`);
  a malformed replay is `delete`d and the verdict still applies.
- `export function sendToAll(channel, payload)` over `BrowserWindow.getAllWindows()` for T69's
  reclaim-originated `addCompanion`; `sendToOthers` untouched.
- Preload: `pvpMatch()`, `thefts()`, `reclaim(theftId)` and the new `pvp(matchId, party)` signature,
  2-space `name:` form with inlined channel literals; still value-imports only `electron`.
  `src/renderer/global.d.ts` mirrors all four (tests/renderer.test.ts "declares every method the
  preload exposes" is run, not edited, and passes).
- `tests/ipc.test.ts`: EXTENDED the pinned lists (IPC `toEqual` table, preload `it.each`,
  `ipcMain.handle` list, the narrowAction union list) and added the three AC-named tests —
  21 → 24 `it(` blocks, none removed or renamed.
- One pinned assertion had to move with the spec: "never originates an action" counted exactly ONE
  `webContents.send(`. v3 (F49/F73/Assumption 49) adds `sendToAll`, so the count is now 2, tightened
  with `lastIndexOf('webContents.send(') < indexOf('ipcMain.handle')` (both sends stay in the relay
  helpers, above the handlers) and `IPC.ACTION` still produced by exactly one call site.
- `src/menu/index.ts` was deliberately NOT touched: it types the bridge through its own local
  `MenuBridge` interface, so its `api.pvp()` call still compiles — the two-step flow is T71.

## Files touched

- src/shared/ipc.ts
- src/main/ipc.ts
- src/preload/index.ts
- src/renderer/global.d.ts
- tests/ipc.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-14.md

## Gate results

```
$ npm test
 Test Files  33 passed (33)
      Tests  554 passed (554)

$ npm run lint
> eslint . --max-warnings 0
(no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output, exit 0)

$ AC line
 Test Files  2 passed (2)   (tests/ipc.test.ts tests/renderer.test.ts, 137 tests)
GREPS_OK
smoke exit=0
AC_OK          # SMOKE_OK present in /tmp/desmon-smoke.log
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT try to keep `webContents.send(` at one occurrence by delegating `sendToOthers` to
  `sendToAll(channel, payload, sender?)`: the pinned "relays over every window except the sender"
  test requires the literal `win.webContents.id !== sender.id` inside the sendToOthers body, which
  the delegating form cannot contain. Two loops + the count bumped to 2 is the honest shape.
- Do NOT convert the new narrowAction/replay tests to behavioural ones by importing
  `src/main/ipc.ts` under vitest: the module value-imports `electron` and pulls in
  `./globalInput.js` (uiohook native module). tests/ipc.test.ts is source-contract by design
  (its header says so) and no test in this repo mocks `electron`.
