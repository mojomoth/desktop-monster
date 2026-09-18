# Critic implementation review 01

Reviewed: 2026-09-15 09:08 UTC. Sources are being edited concurrently; resolved items below were re-read after their fix. Independent reviewer changed only this report and the earlier architecture report.

Scope: main recovery/coordinator/net/IPC, server ownership records and cached outcomes, core ID allocation, and the renderer freeze/release path. This is not a whole-product or production-DB audit.

## Open findings at review cutoff

### P1 — an expired/pruned reclaim notification can permanently block progress operations

Evidence: `src/server/app.ts:505` returns 404 when the theft inbox no longer contains the ID. `src/main/net.ts:219` maps this to `server` with status 404. `src/main/coordinator.ts:95` clears the persisted pending reclaim only on `expired` or `gone`; `synchronize()` retries any other error, and `resetOrRestore()` refuses while pending.

Trigger: an old native notification is clicked after a theft poll pruned its expired record, or an older already-completed reclaim is clicked after another reclaim replaced the single cached receipt. The app persists a pending ID that can never succeed, blocking all later ranking/battle/reset/restore synchronization across restart.

Minimal fix: after a read-only `/me` confirms no matching cached reclaim receipt, treat a confirmed missing-theft 404 as terminal, clear the pending ID, and allow subsequent synchronization. Route the theft watcher through the coordinator's theft guard as well as the menu. Test a stale native notification after expiry and pruning, including restart.

### P1 — server transfer IDs can be reused after consumption/reset

Evidence: `src/server/app.ts:375` starts transferred IDs from `s${seed}` and checks only the current roster, revoked IDs, and the current victim's theft inbox. A consumed/reset companion is absent from the first two sets. Reclaim IDs similarly derive from a theft suffix at `src/server/app.ts:520`.

Trigger: A gains `s7` from B, consumes it and uploads; A then gains from C with the same seed 7. The server can mint a different `s7`. Restoring the earlier checkpoint aliases two historical companions, and C's reclaim can remove the restored B companion because reclaim looks up the transferred ID alone.

Minimal fix: persist issued-ID uniqueness independently of current ownership, or use a durable monotonic server transfer allocator. Never intentionally reuse seed-derived IDs after consumption. Cover consume/reset, repeated seed, different victim, old checkpoint restore, and reclaim. Balance has been notified.

### P1 — main's normalized saved state and live action replay can diverge

Evidence: the independent focused test run fails two online tests because the committed save has `nextCompanionId: 8` after receiving `s7`, but the live engine has `nextCompanionId: 3`. `RecoveryStore.commit()` normalizes via `parseSave()`, which repairs the allocator using digits from external IDs. Replaying the original collection actions does not perform that normalization.

A second instance: `removeCompanions` changes the roster but leaves `pvpParty` intact, while `parseSave()` removes party IDs no longer present. Thus a manual party containing a revoked companion remains in the live engine after the durable save has already removed it.

Minimal fix: send an explicitly main-owned allocation synchronization action and the committed PvP-party selection with the release, or keep the corresponding reducer invariants synchronized. Preserve fever and pending volley state rather than re-create the live engine. Host/Balance are implementing `syncAllocation`; add a selected-party revocation equality check as well. On successful reclaim, include `syncPvpProgress` from the already-fetched `/me` record so live, saved, and identity counters immediately agree.

## Confirmed fixes during this review

- Lost-result recovery now calls `session.pvp(matchId, party, true)`, and managed sessions suppress implicit `onSave`/`identity` uploads. No old-roster PUT precedes the receipt retry.
- `finishBattle` now reads `/me` after the receipt, removes permanently revoked companions, and uses current absolute server wins/losses before clearing pending. This closes the case where a received companion was reclaimed while the original response was lost. `finishReclaim` also reads `/me` and removes revoked IDs; its counter synchronization follow-up is noted above.
- Successful ordinary operations replay committed actions into the frozen live engine; only reset/restore uses full replacement, preserving fever and companion-volley timing.
- Journals include a complete candidate plus metadata and a committed operation ID. A committed journal left behind by failed cleanup does not rewind later gameplay on restart. Fault-injection tests cover write/rename boundaries.
- Capture uses dedicated request-ID/generation/sender validation rather than waiting on the operation's own queued save. Renderer freeze covers both input routes, ticks, collection actions, and scheduled saves.
- At cutoff, `SAVE_STATE` requires a field URL and explicit numeric generation. Legacy `PVP`/`PVP_MATCH` IPC calls now reject instead of bypassing the coordinator. Renderer-origin `addCompanion`, `removeCompanions`, and `pvpResult` menu actions are rejected.
- Restore loads its selected checkpoint before creating/pruning the pre-restore backup. The five verified checkpoints have no expiry; corrupt checkpoint files are preserved and excluded from valid restoration choices.

## Server SQL review

The append-only `revoked_ids` JSONB column and BEFORE INSERT/UPDATE trigger preserve revocations even when an older service truncates `stolen_ids` or replaces a snapshot. The function filters both companion and party arrays on every write, and the metric SQL uses a fixed allow-list. No dynamic SQL injection path or static syntax blocker was identified.

PostgreSQL documents that a BEFORE row trigger may change the incoming row and that `CREATE OR REPLACE TRIGGER` is supported: [CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html). JSONB membership and concatenation used by the function are documented in [JSON functions and operators](https://www.postgresql.org/docs/current/functions-json.html). This was a static review only; neither the trigger nor a migration was executed against a real DB.

Historical limits remain: the old capped ownership records cannot reconstruct IDs already forgotten before migration. Recovery guarantees begin with v0.9 checkpoints created after the server migration. The permanent issued-ID issue above is separate from permanent revocation retention.

## Verification performed

At 18:06:58 KST, executed:

```sh
npm test -- tests/onlineV9.test.ts tests/recoveryV9.test.ts tests/recoveryCaptureV9.test.ts tests/server/v09.test.ts
```

Result: 27 passed, 2 failed. RecoveryStore 15/15, capture-quota migration 4/4, and v0.9 server scenarios 6/6 passed. Online integration 2/4 passed; both failures were the exact `nextCompanionId: 8` disk versus `3` live mismatch described above. These are meaningful failure assertions and must remain enabled. A later test run is required after the pending fixes; no full verification-gates, native Electron, or real-DB pass is claimed here.
