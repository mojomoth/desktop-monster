# Critic implementation review 03 — bounded closure

Reviewed: 2026-09-15 09:23 UTC. Scope: the final stale-party recovery correction and the local PostgreSQL evidence supplied by Host. No production edits.

## Result

**No open P0/P1 finding remains in the bounded recovery, transfer-identity, and direct-battle paths reviewed in reports 01–03.** This closes the stale-party lock from report 02; it does not certify unrelated product behavior or production deployment.

## Stale-party correction

- `src/main/net.ts:216` preserves HTTP 400 `bad_party` as the specific `stale-party` result. Generic server/network failures still retain their existing uncertain-outcome behavior.
- `src/main/coordinator.ts:82` reads authenticated `/me`, durably applies permanent removals and absolute server records, and clears the rejected pending battle in the same journaled commit. A failed state read does not clear it prematurely. The raw receipt request still occurs without an intervening snapshot PUT.
- The existing release actions synchronize the resulting allocator and party into the live engine. `src/menu/view.ts:134` explains the changed party and directs the user to retry.
- `tests/onlineV9.test.ts:126` revokes a selected member between match and battle, observes the specific failure, verifies pending is cleared and both roster and party match disk, and immediately resets successfully without advancing the 120-second TTL.

At 18:23:00 KST I executed:

```sh
npm test -- tests/onlineV9.test.ts tests/net.test.ts tests/menuV9.test.ts
```

Result: **3 files, 56 tests passed** (online v0.9 7, network 44, menu v0.9 5). No failure assertions were removed or weakened by this reviewer.

## PostgreSQL evidence review

Read `.harness/v9/postgres-check.mjs`, `postgres-03.json`, and `postgres-03.log`. The successful run is timestamped **2026-09-15 09:22:16 UTC** and reports database **16.15 (Debian 16.15-1.pgdg12+2)**. This corrects the 16.6 version mentioned in the handoff message.

The script uses the installed `pg` package and real compiled `PgStore`/`createApp` with an explicitly guarded disposable local `desmon_v09` database. Its assertions cover:

- Migration from the legacy schema and revocation backfill/filtering.
- Four metric rankings plus the legacy default, compared against MemoryStore; tied and very large levels, missing legacy levels, and records are included.
- Forty permanent removals surviving capped legacy records and a direct old-style snapshot overwrite, including party filtering.
- Monotonic transfer serials despite a forced rewind, and rollback of both an allocation and a second write.
- The real HTTP handler committing a PostgreSQL-backed battle receipt and returning the identical receipt after application restart without changing the persisted player again.
- A second migration preserving state.

I independently recomputed every recorded SHA-256 and all five match the current files: `src/server/pgStore.ts`, `src/server/store.ts`, `src/server/app.ts`, `dist/electron/server/pgStore.js`, and the PostgreSQL check script. The JSON and log report success consistently. I reviewed this execution evidence; I did not personally rerun the destructive fixture or access production data.

This updates report 02's database limitation: the migration/trigger/allocator and listed handler scenarios now have successful real local PostgreSQL evidence. Production deployment, a continuously running legacy service's multi-request races, exhaustive concurrency/load, and historical IDs already forgotten before migration remain outside those assertions. The legacy compatibility limits in report 02 still apply.
