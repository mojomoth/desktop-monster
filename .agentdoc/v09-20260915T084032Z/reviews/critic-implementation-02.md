# Critic implementation review 02

Reviewed: 2026-09-15 09:20 UTC. Independent read-only follow-up of the coordinator/reclaim corrections and server transfer allocator. No production edits in this pass. The only separately authorized test addition is `tests/menuV9.test.ts`.

## Remaining finding at this cutoff

### P1 — a selected party becoming stale between match creation and battle traps the pending operation

`src/server/app.ts:338` rejects a submitted party containing a companion no longer in the caller's current roster with HTTP 400 `bad_party`. This can happen normally if another player steals a manually selected companion between `/v1/pvp/match` and `/v1/pvp`. The branch is before token consumption and before any battle write.

`src/main/net.ts:219` maps that response to generic `server` with status 400. `src/main/coordinator.ts:79` retries the original persisted party, and line 81 clears pending only for `expired`. The pending operation prevents party editing/reset and blocks subsequent synchronization; repeated clicks send the same invalid IDs until the 120-second match TTL (`src/shared/api.ts:153`) expires. This is a bounded lock, not permanent loss of progress, but is an ordinary opponent-concurrency failure in the newly direct battle flow.

Minimal fix: preserve the specific authenticated `bad_party` failure in the network result and clear its pending operation as a known uncommitted stale-party rejection. Reconcile revocations before a subsequent direct battle attempt and explain that the party changed. Do not clear uncertain network/server failures or insert a PUT before retrying a potentially committed result. Test an injected roster revocation immediately before the battle POST, then verify the user can retry/reset without advancing the match TTL. Host notified during the review.

## Earlier findings now closed in the inspected source

- `src/main/coordinator.ts:68` releases the committed allocator and party selection into the existing engine. The two previous disk/live allocator failures now pass, and the selected-party revocation test confirms both roster and party agree between disk and live state. Full engine replacement is still limited to reset/restore.
- `src/main/coordinator.ts:103` authenticates `/me` after a missing-theft 404, recovers a matching cached receipt or clears the missing ID as `gone`. The new online test confirms no permanent reset lock. Successful reclaim also applies absolute current server wins/losses.
- `src/main/net.ts:229` validates `lastReclaim` rather than trusting an arbitrary object. Missing/invalid v0.9 state fails before reconciliation uploads; an uncertain receipt remains pending.
- `src/main/coordinator.ts:86` refreshes permanent revocations after a receipt. The new real-handler test reclaims the attacker's reward during a lost reply and confirms retry does not resurrect it.
- `src/server/store.ts:189` and `src/server/pgStore.ts:195` use a permanent per-player transfer serial. Steal and reclaim IDs, including the victim's theft receipt ID, are allocated inside the same request transaction as their roster changes. The consumed-transfer/same-seed/older-checkpoint test now passes; a later victim cannot reclaim the earlier restored companion.
- `src/server/pgStore.ts:44` retains the old serial during every update and observes decimal c/s/r/t identifiers before filtering. Removed roster members and pruned theft inboxes cannot rewind a previously observed serial. Revocations remain a union of previous permanent records, incoming records, legacy stolen IDs, and theft originals.

## Concurrency and recovery review limits

The request transaction serializes v0.9 operations; the PostgreSQL table lock also excludes simultaneous legacy row writes during each v0.9 transaction. Allocation uses one atomic UPDATE RETURNING. Static inspection found no additional blocker in this change. Real PostgreSQL execution/migration remains unverified; the PostgreSQL tests mock `pg` and inspect calls.

The old service still originates legacy seed-derived IDs and can perform its own multi-write operations outside this new request transaction. The trigger preserves observed serials and revocations, but does not upgrade that old service's whole protocol. Nor can migration reconstruct historical IDs already discarded before rollout. Documentation must limit guarantees accordingly; full permanent transfer uniqueness applies to v0.9-created transfers after migration.

The commit-journal fault tests, stale-generation rejection, raw-receipt retry without PUT, and online revoke-before-PUT tests remain green. This bounded pass does not claim full IPC adversarial, whole-product, native Electron, power-loss filesystem, or production-server validation.

## Verification executed

At 18:18:27 KST:

```sh
npm test -- tests/onlineV9.test.ts tests/recoveryV9.test.ts tests/recoveryCaptureV9.test.ts tests/server/v09.test.ts tests/server/pgTransaction.test.ts tests/server/pgStore.test.ts tests/menuV9.test.ts
```

Result: **7 files, 70 tests passed** (online 6; recovery 15; capture/allocator 5; server v0.9 8; PostgreSQL transaction 9; PostgreSQL store 22; menu v0.9 5). These tests do not cover the newly reported stale-party race yet.

Earlier own-test verification at 18:15:21 KST: `npm test -- tests/menuV9.test.ts` passed 5/5 and `npx eslint tests/menuV9.test.ts --max-warnings 0` exited 0. Menu tests exercise the real mount function with an injected DOM/bridge: exact clicked opponent, double-click/party lock, four ranking metrics and refresh, latest-response ordering, and no renderer-owned battle/reclaim rewards.
