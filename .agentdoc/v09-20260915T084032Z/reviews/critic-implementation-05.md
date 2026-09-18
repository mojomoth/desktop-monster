# Critic implementation review 05 — exact-opponent closure

Reviewed: 2026-09-15 09:34 UTC. Read-only review of the final two coordinator changes and Host's new regression evidence. No tests/builds were run alongside Host's canonical gates.

## Decision

**The opponent-mismatch P1 from report 04 is closed. No open P0/P1 remains in the bounded paths reviewed in reports 01–05.** Final full-source gates and artifact/performance verification remain Host-owned; this review does not substitute for them.

`ProgressCoordinator.battleOpponent()` now directly retries a pending battle only when its stored opponent equals the newly requested opponent. A different clicked opponent goes through the existing `synchronize()` path: recover and durably apply A first, then upload reconciled state and request B. A successful B invocation therefore cannot simply return A's recovered result.

`finishBattle()` also clears a pending token on the specific `cooldown` rejection. This is safe under the inspected server protocol: `src/server/app.ts` returns a matching committed receipt before testing cooldown, and the cooldown branch occurs before token consumption or battle writes. The network client distinguishes the specific HTTP 429 `cooldown` body from other rate-limit/server errors. Unknown network/server outcomes still retain pending state.

## Regression evidence inspected

Read the new `tests/onlineV9.test.ts` case `recovers A before handling a new B click and never returns A as the selected B result` and `.agentdoc/v09-20260915T084032Z/test-online-04.log`.

The case commits A and drops its reply, invokes B immediately, and asserts:

- The first two requests are A's raw PvP receipt retry and authenticated `/me`.
- The entire request sequence places both state reconciliation and the snapshot PUT after A's receipt, followed by B's match and battle request.
- B receives cooldown, not A's success; pending clears and the official record remains exactly one A win.
- Stored last-battle history still identifies A.
- After the injected 60-second advance, a successful subsequent B result identifies B exactly.

Host's log records **8/8 online v0.9 tests passing**, 18:33:19 KST. I inspected the code and execution evidence rather than rerunning this suite during the canonical gate run.

## Formal final judgment

Accept the reviewed direct-opponent/recovery/server changes, subject to the final source-bound gates and native artifact checks. Retain the Designer report's documented P2 effect-contrast limitation and P3 sparse-card polish observation; neither is silently upgraded into universal perceptual validation. PostgreSQL 16.15 local evidence and legacy-history/legacy-service limits remain as recorded in report 03. Production deployment and Windows/Steam hardware-specific validation are separate release conditions.
