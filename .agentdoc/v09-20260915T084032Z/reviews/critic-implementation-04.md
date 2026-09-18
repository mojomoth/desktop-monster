# Critic implementation review 04 — final judgment follow-up

Scope: source-only check of a different opponent clicked while an earlier battle receipt is pending, plus the Designer's native visual report. No tests, builds, browser operations, or performance workloads were run during Host's performance baseline.

## P1 confirmed — an earlier receipt can be returned as a different clicked opponent's battle

At this source cutoff, `src/main/coordinator.ts:142` returns `finishBattle()` for every pending battle without comparing its opponent to the newly requested ID. The receipt validation at line 90 compares the response with the stored pending opponent, so it does not reject an A result returned from a B invocation.

The menu does not prevent this normal sequence. In `src/menu/index.ts:816`, `done()` clears `battleLoading` and `selectedOpponentId` after the lost-response error. It retains the directory and sets no cooldown on that error. Directory row handlers at line 609 only check loading flags and cooldown, so the user can immediately click B in the still-open list. Main then recovers A and returns its successful result to B's request; the menu treats it as that request's success.

This violates the approved direct battle contract for the exact clicked opponent. Receipt recovery itself remains necessary and authorized; its returned result must stay distinct from a request to battle another opponent.

Minimal fix: return `finishBattle()` directly only when `pendingBattle.opponentId === opponentId`. For a different requested opponent, allow the existing `synchronize()` path to resolve the earlier receipt first, then continue matching the newly clicked opponent under normal cooldown rules. If the earlier receipt cannot be safely resolved, return that failure and retain it. Do not PUT an old snapshot before recovering the earlier receipt and do not report A as B's successful battle.

Required regression: commit battle A but drop its reply; without refreshing the directory, invoke battle B. Assert no successful B invocation returns A's result, and no new snapshot upload or B match precedes A's raw receipt reconciliation. The final exact-source checks need rerunning after the correction. Host was notified immediately.

## Designer evidence judgment

Read `designer-native-01.md`, which records 23 actually inspected packaged screenshots/PNG files, a complete image hash manifest, actual Canvas impact masks for 70 hero and 135 monster sources on two backgrounds, and a five-source overlay image. I did not repeat the Designer's image inspection in this source-only pass.

I agree with its bounded acceptance: the HUD and PNG-sharing evidence supports the requested functional visual changes. Native masks demonstrate source-specific shape/timing variation; they do not prove equal human recognition of every effect during a busy battle. The reported faint dark-on-dark/light-on-light effects are a documented P2 contrast limitation, with no pre-agreed numerical contrast threshold. The sparse single-member card layout is P3 polish. Neither observation justifies discarding the completed visual work or claiming universal perceptual distinction.

## Formal decision at this cutoff

**Hold direct-battle correctness closure for the confirmed opponent mismatch above.** Earlier journal, stale-party, record, revocation, and transfer-ID findings remain closed by their recorded evidence. Visual acceptance is qualified as the Designer states. Preserve any interrupted performance attempt and bind subsequent verification to the corrected source; prior report 03 remains a record of its own earlier bounded cutoff.
