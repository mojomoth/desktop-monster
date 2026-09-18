# Partial approval: UI, HUD, equipment and native evidence

Reviewer: `/root/skills_harness`. Source digest `27b4228e0696122d0ea3e69c25978470246ca881b59c19b99920a6d9bb1b5b7f`. This independently approves the application/UI scope reviewed in `CRITIC_FUNCTIONAL_REVIEW.md`, Designer HUD changes, and Designer-authored native observer implementation/evidence. Critic-authored verification code remains subject to the Host's independent review. **Release, balance and long-run performance are not approved.**

## Source and execution evidence

Read the new input observer and its success/failure integration. It adds read-only native-event records and independent preload subscriptions; it does not replace existing callbacks, stop propagation, synthesize extra events, invoke game methods or alter time. Requests retain native `sendInputEvent`. Physical codes, repeat/trusted flags, mouse/drag-strip provenance, IPC inputs and mode changes are retained without key text. This preserves the native trigger and supports diagnosing the earlier unexplained duplicate.

Independently ran `node --test .harness/v11/runtime.test.mjs .harness/v11/final-check.test.mjs`: **31/31 pass**. Source hashes and report hash are recorded in `CRITIC_NATIVE_PILOT_06.json`.

Independently executed `validateNative` against actual package bytes and the current source digest on `native/pilot-06.json`: pass. The unchanged source binding, all four isolated runtime results, all 165 UI assertions, packaged/loaded stage hashes, complete pipeline traces, raw clock calibration, screenshots and latency recomputation pass. No Electron instance was launched for this review.

| Scenario | Passed checks | PNGs |
|---|---:|---:|
| Menu live updates and growth | 11 | 6 |
| Manual equipment and rejection handling | 111 | 5 |
| Restart persistence | 4 | 1 |
| HUD visual states and native input | 39 | 10 |

The four latency families contain 100/100/100/107 trusted click samples. Recomputed visual p95 is 25.0 ms for tabs, 24.2 for disclosures, 23.5 for growth selection, and 23.4 for equipment; equipment applied-result feedback p95 is 35.7 ms. Actual IPC ingress and core-call start/return remain distinct from ACK, with precision bounds rather than fabricated exact submillisecond claims. These are isolated package observations and double-rAF feedback proxies, not universal hardware or monitor-presentation guarantees.

## Visual and behavioral review

Viewed all 22 current-run PNGs. The menu tabs, including My Record, share one row; codex arrows are at card bottom-right; inventory/shop disclosures remain open with stable scroll/content under live updates; duplicated footer actions are absent from unrelated panels. Growth selection, cancellation and actual consumption are covered, with success feedback and the expected companion level/material changes persisted.

Manual equipment evidence covers a deliberately weaker weapon, explicit accessory replacement with a full bag, rejection of a stale revision without economic mutation, duplicate trusted clicks applying once, unrelated purchase/sale preserving manual choice, stronger new acquisition replacing it, compatible/incompatible hero transitions, and a weaker choice surviving restart. Prior source review of pending/rejected actions and additive save migration is retained; all 25 source/test hashes bound in `CRITIC_FUNCTIONAL_REVIEW.json` were recomputed and remain unchanged.

Independently decoded all ten HUD PNGs with Pillow, reproducing 35 asserted damage/label regions. Actual endpoint damage remains visible:

- Boss: age 513.6–526.8 ms, 164 ink pixels, top y=43; start y=62, consistent with the 28-pixel lifetime curve.
- Normal: age 506.9–519.3 ms, 180 ink pixels, top y=45; start y=67, consistent with the same curve. Critical 42-pixel behavior is covered by the earlier focused real-PNG run and deterministic tests.

Left counters and BAG FULL are legible, damage stays above the monster/HP bar, READY/LEVEL UP/FEVER form the intended outlined stack, slow/fast color phases are observed, and the top FEVER banner is absent. LEVEL UP expires while the remaining FEVER label moves down without duplicating.

Rechecked all 21 native HUD requests against the raw chronological trace: each is followed by exactly one trusted, nonrepeat KeyA down/up pair before the next request. There are 42 DOM events, no mouse events, no production INPUT IPC and no mode changes. Actual-age observations retain startup dt effects; no trigger fallback was used.

## Open boundaries

Pilot05 remains a preserved failed attempt with unexplained extra-hit provenance because raw input instrumentation was not yet present. Pilot06 and focused traced runs do not prove what caused that earlier incident; this review makes no such claim. The new native-input trace guards the passing run and future reproductions.

The registered 30-minute comparison still fails idle CPU and remains binding; this native pass does not supersede it. Balance has no accepted candidate/heldout validation under the approved scope. Final release gates, final source/package receipts and overall release review must wait for those outstanding outcomes.
