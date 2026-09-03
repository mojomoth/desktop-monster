# Session record — iter 15

- agent role: builder
- worker: claude
- lane: .worktrees/T61 (branch lane/T61)
- harness version: v3
- task: T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
- result: DONE
- commit: f2ebbb4eeaf518389ab0d499143c2cc589bb3a0b
- graphify affected used: none (the two files of the task plus store.ts/api.ts were enough)

## What I did

- `src/server/app.ts`: added a `pending(row)` helper (`reclaimUntil >= now()`), the
  `GET /v1/thefts` handler (answers the pending records and lazily `setThefts`
  the pruned list back when anything expired) and the `POST /v1/reclaim` handler.
- Reclaim order per SERVER_ARCHITECTURE_V3 §3: auth → theft must be in MY row
  (else 404 `not_found`) → `now() > reclaimUntil` → 410 `expired` (pruned) →
  thief row / snapshot missing or roster lacks `transferredId` → 409 `gone`
  (pruned) → thief `stolenIds += transferredId` (last 32), thief roster and party
  `without(transferredId)`, `{ ...theft.companion, id: 'r' + theft.id.slice(1) }`
  appended to my roster only below `ROSTER_CAP` (full → still 200), record removed.
- `PUT /v1/snapshot` response now carries `thefts` (pending) — the field
  `SnapshotResponse` already declared.
- Routed both paths next to `/v1/pvp`; every error keeps the `{ error }` body and
  `handle()` still never throws (the new handlers only await the store).
- `tests/server/app.test.ts`: a `stolen(id, over)` theft factory plus the five
  AC titles verbatim; 13 → 18 `it(`. Records are planted straight into the
  victim's row via `store.setThefts`, so no PvP fixture and no wall clock.
- Boundaries pinned by the tests: `reclaimUntil` itself is still pending (410
  only one ms past it), a 30-companion roster still answers 200 without growing,
  a spent/unknown/absent `theftId` is 404, both `gone` shapes (thief consumed it,
  thief row absent) prune and hand out nothing, and the upload's `thefts` shrink
  as the clock advances.

## Files touched

- src/server/app.ts
- tests/server/app.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-15.md

## Gate results

```
 Test Files  33 passed (33)
      Tests  555 passed (555)

> desmon@0.2.0 lint
> eslint . --max-warnings 0

> desmon@0.2.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC: npx vitest run tests/server/app.test.ts tests/server/pvp.test.ts
 ✓ tests/server/pvp.test.ts (14 tests)
 ✓ tests/server/app.test.ts (18 tests)
AC exit=0   (grep -c '^\s*it(' tests/server/app.test.ts = 18)
```

## Attempts & dead ends (what future iterations must NOT retry)

- None: gates and AC were green on the first run. Note for later tasks —
  `SnapshotResponse.thefts` and every `Theft`/`TheftsResponse`/`ReclaimResponse`
  type already existed in `src/shared/api.ts` (T54), so this task needed no wire
  type change; do not re-add them.
- Do not filter the upload's `thefts` through `setThefts`: only `GET /v1/thefts`
  and a reclaim prune the row (SERVER_ARCHITECTURE_V3 §3 says the upload just
  answers with the pending list).
