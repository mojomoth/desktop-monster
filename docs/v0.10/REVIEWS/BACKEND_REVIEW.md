# Independent backend review — Designer

Reviewer: `/root/sprite_qa`; 2026-09-17. Reviewed production code is owned by
Host/backend, not this reviewer. No production files were changed for this
review. Scope: `src/server/**`, `src/main/net.ts`, and `src/shared/api.ts`.
The graph cache was queried first; the actual source was then inspected.

## Judgment: accepted within reviewed scope after corrections

The original independent counterexamples passed unchanged after the backend
owner's fixes: **5/5**, recorded in
`.agentdoc/v10-20260917T070144Z/evidence/backend-designer-recheck-02.json`.
The reviewer inspected the corrective code: both MemoryStore and PgStore filter
protocol/combat/enrollment before neighbor selection; the PostgreSQL protocol
value is a query parameter. Shared WireBlow now declares `crit?: boolean`, and
the client rejects a present nonboolean flag. No tests were weakened.

The two initial findings below are **resolved**. This approval covers the
reviewed source and deterministic boundary scenarios; Native and real-database
claims remain subject to the limits below.

Independent check:

```sh
npx vitest run tests/server/backendReviewV10.test.ts --reporter=verbose
```

Initial run at 16:37 KST: **3 passed, 2 failed**. The original cases remain
executable; none were skipped, inverted or relaxed. The later unchanged 5/5
recheck above supersedes this initial result.

### 1. Automatic matching selects an ineligible legacy neighbor (P2)

In `src/server/app.ts`, default `/v1/pvp/match` asks the unfiltered store for
the neighboring ranks, selects one, and only then checks the new equipment
protocol and gold enrollment. A current player at depth 100, legacy player at
101 and current eligible player at 103 produces HTTP **426** instead of a
preview against the eligible player. The client maps this to `sync-required`,
even though its own snapshot/protocol is current.

The explicit opponent list filters legacy rows, but automatic matching must
use equivalent eligibility before choosing its neighbor. When no eligible
player exists, use the current bot behavior; an explicitly selected incompatible
player may still receive the upgrade response. The regression test pins the
mixed-version case, which matters while existing players migrate.

### 2. Malformed critical flags cross the replay validation boundary (P2)

Core heroic blows include `crit`, and the renderer uses it to show critical
damage. `src/shared/api.ts` does not declare the optional boolean, and
`isPvpResponse` in `src/main/net.ts` does not validate it. A valid response
whose first blow has `crit: 'not-a-boolean'` still returns `true`, allowing
malformed external data into the durable replay journal and critical effects.

Add the optional field to the shared contract and reject nonboolean values
when present, while keeping old receipts without it valid. This is a response
validation and presentation correctness issue; the reviewer found no gold
creation through this flag.

## Passed independent scenarios

- A defender changes its weapon after preview; the resolved battle and defense
  receipt keep all five items from that preview. The attacker changes equipment
  before resolution; its first-resolution loadout is used instead.
- Four distinct accessory UIDs with an identical template are accepted; duplicate
  UIDs, five accessory slots, incorrect item kind, insufficient level and an
  incompatible job are rejected at upload.
- Hero-only parties generate typed `@hero` actors/targets and initial fighter
  snapshots accepted by the client boundary. The defense receipt reverses sides
  and swaps initial fighter arrays without consulting the current inventory.
- Both players begin with `900719925474099312345678901234` gold. Settlement
  preserves their exact combined balance and opposite net amounts. New money
  fields are decimal strings. Unsafe legacy numeric gold is rejected explicitly.
- A stale wallet revision returns 409 without replacing equipment or balance.
  Repeating the committed match ID returns the identical result without another
  record, gold transfer, inbox event, or loadout mutation.

## Scope limits

These are deterministic in-process boundary tests using `MemoryStore`, injected
IDs, RNG seed and clock. They use no network, sockets, personal saves or live
PvP. The PostgreSQL implementation was read and existing transaction tests were
inspected; this review does not claim a real PostgreSQL migration run. Backend
approval is independent of this reviewer's own art/replay implementation, which
still requires Native visual evidence and another role's review.

Reviewed source SHA-256 (before corrective changes):

```text
9d7336b1f5af6d1236d8695e42fd98faca6d259e151aba46b25ea467de8e87d2  src/server/app.ts
c070a5d9f24503100eee2fc7e2e9df59af5361c525f7be6c2e812d308c855d6b  src/server/gold.ts
ef98787a874b2b27ae7d866a9a6a07626eae325386c4ddd49448223d6b48f14c  src/server/store.ts
7411b5ec200429abdd9a2caad4473a7bd7f5f2d25b6130d7024c0096b4dfc313  src/server/pgStore.ts
74cc7da0a9f802294a99f386f075ebc195d3fc2659be9c7aac9188d5db931e37  src/main/net.ts
edbe04f91925095f8cc267217154a1115df45ba5605afe4541b2f01616014ab7  src/shared/api.ts
cc5cca942a732fc912be7ef22230d161c0a56c5f5fb9d20da3242f1f7be468ac  tests/server/backendReviewV10.test.ts
```

Accepted source SHA-256 after the corrective changes (gold and the independent
test are unchanged):

```text
dd55b5df247c7960bd37e3f7540d5de4562e738beedcc142c2f84ab656bf4eb1  src/server/app.ts
460830edb9491331f29f42febc6c887e919493ebecd60d3c9ab7c14fd69b48ef  src/server/store.ts
7bb1ca885dd0dacd6d7dae0227409bdab5e1c674ad31162d91c161208306f7ca  src/server/pgStore.ts
6e408ed70467dde3a8c63ac98990f8d56391261b555595f5a467a8f9f9ec23d7  src/main/net.ts
5dbce2c8e99e65ad43bfe4c79837b9952403819355c46e240a528720c409c793  src/shared/api.ts
```
