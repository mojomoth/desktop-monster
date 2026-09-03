# Session record — iter 32

- agent role: builder
- worker: claude
- lane: .worktrees/T39 (branch lane/T39)
- harness version: v2
- task: T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
- result: DONE
- commit: see below (feat(T39))
- graphify affected used: none (SERVER_ARCHITECTURE §2–§4 + the existing
  src/server/http.ts and src/shared/api.ts were enough; core exports read
  straight from src/core/index.ts)

## What I did

- `src/server/store.ts` (new): `ScoreKey`, `PlayerRow`, the full 9-method
  `Store`, `compareScore` (bestIndex DESC then rebirths DESC) and `MemoryStore`
  (Map + insertion `seq`). `ranked()` sorts score DESC then seq ASC, so `rank`,
  `top`, and both `neighbor` directions fall out of one ordering: `up` is the
  last row with a strictly greater score (ties → latest seq), `down` the first
  row with score ≤ key excluding me (ties → earliest seq). `neighbor` is
  included now so T40 only has to touch app.ts. A `view()` mapper keeps
  `tokenHash`/`seq` inside the store.
- `src/server/app.ts` (new): `AppDeps { store, now, randomUUID,
  randomBytesHex, randomSeed }`, `RATE_LIMIT = 60`, `RATE_WINDOW_MS = 60_000`,
  `STOLEN_IDS_MAX = 32`, `parseSnapshot` (never throws; NICK_RE /
  COMPANION_ID_RE / LEVEL_MIN..LEVEL_MAX / 0..INT_MAX / unique ids /
  `ROSTER_CAP` from core / `SPECIES_IDS`; unknown fields dropped by rebuilding
  a minimal object), sha256 token hashing, `POST /v1/players` (201),
  `PUT /v1/snapshot` (strip caller's stolenIds → `{ rank, removed }`),
  `GET /v1/leaderboard?n=` (clamp 1..50, default 10, `me` null before the first
  upload, present-but-unknown bearer → 401), 404 fallthrough (so
  `POST /v1/pvp` stays 404 until T40) and a try/catch 500 `internal` guard so
  `handle()` never throws. Rate limit is a fixed window keyed by
  `sha256(bearer)` else `ip:<ip>`, swept of expired keys above 10 000 entries.
  No wall clock: `now()` is injected (source guard honoured).
- Leaderboard ranks are computed inside the returned prefix
  (`findIndex(compareScore === 0) + 1`), which equals `1 + count(score > key)`
  because `top` is a prefix of the global order — one store call instead of n.
- `src/server/index.ts`: replaced the T22 404 stub with `createApp({ store: new
  MemoryStore(), now: Date.now, randomUUID, randomBytesHex, randomSeed })` —
  `Date.now` is wired here and only here.
- `tests/server/app.test.ts` (new, 10 tests): the 7 AC titles verbatim plus
  x-forwarded-for/bearer key isolation, unknown-field dropping and a MemoryStore
  ordering/neighbour test. `handle()` is called directly with `MemoryStore`, a
  counter clock and a `mulberry32`-driven id/token source; `removed`
  idempotence and the 429 window boundary (59 999 ms vs 60 000 ms) are covered.
  A 51-player set proves the n=50 clamp. No sockets, no timers, no DB.

## Files touched

- src/server/store.ts (new)
- src/server/app.ts (new)
- src/server/index.ts
- tests/server/app.test.ts (new)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-32.md

## Gate results

```
 Test Files  26 passed (26)
      Tests  385 passed (385)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC (executed literally): tests/server/app.test.ts 10 passed, typecheck clean,
all 11 greps matched, "Date.now(" absent from src/server/app.ts → AC EXIT=0
```

Smoke not run: no file under `src/main`, `src/preload`, `src/renderer`,
`static` or `package.json` is touched (electron-builder already excludes
`dist/electron/server/**`).

## Attempts & dead ends (what future iterations must NOT retry)

- `MemoryStore.seq` is the INSERTION sequence (per the task Notes), while
  PgStore's tie-breaker will be `updated_at`. The two only disagree on ties
  after a re-upload; do not "fix" MemoryStore to bump `seq` in `putSnapshot`
  without changing the Notes/T41 contract too.
- Object literals with extra fields cannot be passed through the typed
  `snap()`/`comp()` helpers in the test (TS excess-property check) — the
  unknown-field case builds its request body inline, where `body: unknown`
  gives no contextual type.
