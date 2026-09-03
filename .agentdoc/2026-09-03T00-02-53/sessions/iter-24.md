# Session record — iter 24

- agent role: builder
- worker: claude
- lane: .worktrees/T42 (branch lane/T42)
- harness version: v2
- task: T42 — Main net client + net session: injected fetch, 5000 ms timeout, never throws, 401 re-register
- result: DONE
- commit: cdca5ff7630b20b4c10c0ed0299bb9cef09faf34 (code + tests; this record follows in a docs commit)
- graphify affected used: none (T38's src/main/identity.ts + src/shared/api.ts read directly; both are small and are the only deps)

## What I did

- Added `src/main/net.ts` (electron-free): `NET_TIMEOUT_MS = 5000`, `createNetClient({ baseUrl, fetchFn = fetch, timeoutMs })`
  with `register` (POST /v1/players), `upload` (PUT /v1/snapshot), `leaderboard` (GET /v1/leaderboard?n=), `pvp` (POST /v1/pvp),
  all through one `call()` helper that sets `signal: AbortSignal.timeout(timeoutMs)` and `content-type: application/json`
  (+ `authorization: Bearer <token>` only when a token is given).
- Mapping per SERVER_ARCHITECTURE §6, checked in that order so 401 wins over an unparsable body: `baseUrl === ''` →
  `offline` before any fetch; thrown/aborted fetch → `network`; 401 → `unauthorized`; 429 with `error: 'cooldown'` →
  `cooldown` + `retryAfterSec`; any other non-2xx **or** an unparsable/empty JSON body → `server` + `status`. Fetch and
  `res.json()` are both wrapped, so no method can throw.
- `toSnapshot(name, save)` over the structural `SnapshotSource` (no src/core import; SaveFileV2 is assignable).
- `createNetSession({ client, userDataDir, online, randomUUID })`: owns identity.json, `ensureRegistered()` before every
  bearer call, `withToken()` which on `unauthorized` clears playerId/token (keeping the name), re-registers and retries
  ONCE per session (a second 401 is returned as-is). Dirtiness is *derived* — `rosterKey = JSON.stringify([name, rebirths,
  companions])` compared against the last successfully uploaded key — so no extra flag exists to get out of sync, and
  `setName` marks the roster dirty for free because the name is part of the key. bestIndex is deliberately not in the key.
- Sync moments: `onSave` (fire-and-forget, upload only when the key changed), `identity()` (background upload when dirty),
  `leaderboard(n)` (upload if dirty → GET), `pvp()` (ALWAYS upload → POST). `removed` from the pre-flight upload is merged
  into `LeaderboardResult`/`PvpResult`; background uploads ignore it.
- Added `tests/net.test.ts` (10 tests): fake fetch recording url/method/headers/body/signal answering real `Response`s,
  a recording fake `NetClient`, and a per-test tmp userData dir. Offline test asserts the fake fetch has ZERO calls both
  for the client and end to end through the session.

## Files touched

- src/main/net.ts (new)
- tests/net.test.ts (new)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-24.md (this record)

## Gate results

```
 Test Files  24 passed (24)
      Tests  345 passed (345)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC (full line, run literally): exit 0
 ✓ tests/net.test.ts (10 tests) 65ms
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT parse the JSON body before the status checks: a 401 (or any error) with a non-JSON body must still map to
  `unauthorized`, so status is inspected first and `readJson` only feeds the cooldown/`server` branches.
- Do NOT drive the session's fire-and-forget `onSave` upload through the real client + a fake fetch: `Response.json()`
  does not settle within a microtask flush, which makes the background-upload assertions flaky. Session tests use a
  recording fake `NetClient` (immediate `Promise.resolve`) plus a 20-turn microtask `flush()`; timers are never used.
- Do NOT add an explicit `dirty` boolean next to the roster key — it duplicates state that the key comparison already
  expresses and would have to be reset in four places.
- `DOMException` is not in the ambient types under `types: ["node"]`; the aborted-fetch case is simulated with
  `Object.assign(new Error(...), { name: 'TimeoutError' })`.
