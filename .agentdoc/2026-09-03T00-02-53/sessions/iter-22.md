# Session record — iter 22

- agent role: builder
- worker: claude
- lane: .worktrees/T38 (branch lane/T38)
- harness version: v2
- task: T38 — Client identity.json, shared API wire types, serverUrl constant
- result: DONE
- commit: see git log (this commit)
- graphify affected used: none (task cites SERVER_ARCHITECTURE §2/§6 verbatim; persistence.ts read directly as the named precedent)

## What I did

- Added `src/shared/api.ts` with SERVER_ARCHITECTURE §2 verbatim: `Companion`, `Snapshot`, `LeaderboardRow`,
  `RegisterResponse`, `SnapshotResponse`, `LeaderboardResponse`, `PvpOpponent`, `PvpResponse`, `ApiError`,
  `NetError`, `NetResult<T>`, `IdentityPayload`, `LeaderboardResult`, `PvpResult`, plus `NICK_RE`,
  `COMPANION_ID_RE`, `LEVEL_MIN/MAX`, `INT_MAX`, `LEADERBOARD_DEFAULT`, `LEADERBOARD_MAX`. It declares its own
  structural `Companion` and imports nothing from `src/core` (Assumption 41).
- Added `src/shared/serverUrl.ts` = `export const SERVER_URL = '';` (T44 rewrites the value).
- Added `src/main/identity.ts` following the `persistence.ts` pattern (electron-free, dir + `randomUUID`
  injected, never throws): `IDENTITY_FILE_NAME`, `Identity`, `identityFilePath`, `defaultName`, `isValidName`
  (via `NICK_RE`), `readIdentity` (missing/corrupt/wrong-shaped → fresh `{ name: 'Knight-xxxx', playerId: null,
  token: null }`), `writeIdentity` (tmp + rename, boolean).
- Added `tests/identity.test.ts` (7 tests) with `mkdtempSync` per test and a counter-based uuid stub; the four
  AC-pinned titles are verbatim.
- `src/core/save.ts` was not touched — it still contains no occurrence of the word `token` (AC negative grep).
- `src/shared/ipc.ts` untouched (T43 owns the net channels).

## Files touched

- src/shared/api.ts (new)
- src/shared/serverUrl.ts (new)
- src/main/identity.ts (new)
- tests/identity.test.ts (new)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-22.md (new)

## Gate results

```
$ npm test
 Test Files  22 passed (22)
      Tests  328 passed (328)

$ npm run lint
> eslint . --max-warnings 0      (no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
   (no output, exit 0)

$ <task AC line, executed literally>
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- No dead ends: gates and AC were green on the first run. One cosmetic fix — a needless template literal in the
  corrupt-JSON test was replaced with a plain string before committing.
- `npm run smoke` was NOT run: this task adds only new, not-yet-imported modules (nothing under `src/main`
  reaches them until T42/T43), so the Electron boot path is unchanged.
