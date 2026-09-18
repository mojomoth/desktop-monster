# Allocator safety preparation — draft only

Status: NOT_APPLIED / NOT_TESTED. This directory contains a proposed patch, not an implementation or verification result. No product/test file, protocol, journal, build or measurement was changed. The natural-capture branch and its tests remain Host-owned.

## Confirmed source boundaries

- `src/core/save.ts:272`: the existing save repair takes decimal digits from every retained companion ID, including server s/r IDs. `Number(digits) + 1` currently admits unsafe values or Infinity. The patch preserves the rule and every retained ID, caps finite positive input counters, and checks the digit value before adding one. Existing nonfinite/wrong-type input fallback stays unchanged. A 400-digit local ID saturates safely without constructing an unbounded BigInt.
- `src/core/collection.ts:179`: local IDs currently interpolate any next counter. `addCompanion` increments without a representational guard. The draft centralizes ID validation: only local allocations need a positive safe counter strictly below MAX; all allocations require a unique final ID.
- `src/core/collection.ts:309`: the current PvP preflight protects only external duplicate IDs. Local exhaustion or duplicates are rejected against the original roster before `lostId` is removed. In particular a prospective c1 cannot be made unique by first deleting lost c1.
- Successful external s/r delivery still preserves the ledger ID. A safe counter below MAX advances once as before; MAX stays MAX, with the conditional evaluated before addition. A malformed counter supplied directly to external delivery conservatively becomes MAX. Normal parser-produced counters are always positive safe integers.

## Compatibility and tests

MAX is a representational exhausted sentinel, never a new gameplay level cap. MAX-1 is the last local allocation; it creates c9007199254740990 then stores MAX. Existing full-roster PvP behavior stays void for an otherwise valid incoming allocation, and a real loss may free one slot. An invalid allocation is rejected before loss even if the roster was full. Existing no-stolen PvP and material operations remain unchanged.

The patch only appends tests. Existing assertions are untouched. Proposed new cases cover all-ID repair, huge cID and r9007199254740992 preservation, finite oversized counters, last unique allocation through both add/PvP, restart, seven invalid/exhausted local counters, both retained-ID and lost-ID duplicates, and s/r delivery at MAX followed by duplicate rejection and save/restart.

After explicit implementation authorization, apply the patch only to the three named files, review the diff, and run bounded companion/save/collection tests. Host must integrate the separate natural-capture allocator guard, obtain independent Critic review, and run registered ACs plus canonical gates on the final same source. This draft does not alter the capture quota or candidate numbers, does not inspect validation samples, and claims no measured progression outcome.
