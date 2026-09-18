# Independent core and Host review

Reviewer: `/root/backend_v10`, reassigned to Critic after implementing the backend. This review **excludes all backend/network code authored by this reviewer**. Only core equipment/save/engine and Host IPC/coordinator/recovery/bootstrap/UI were examined; production code was not edited by the reviewer.

## Findings and disposition

1. **C10-01 — fixed by Balance.** The former optimizer considered the highest raw-power weapon plus the current weapon, so two unowned weapons with equal *displayed* integer attack could select the later ID. The same omission affected accessory combinations. Example: base attack 1, level 5, e1 common tier-1 sword and e2 common tier-2 sword both display attack 1; e1 must win after equal retention and occupancy. Balance added a suffix feasibility selection that preserves the required priorities without enumerating four-item combinations. Independent weapon and accessory counterexamples now pass.

2. **C10-02 — fixed by Balance.** Temporary gear was excluded from every automatic re-evaluation. A temporary level-5 epic weapon remained unused after reaching level 5, and a strengthened temporary copy remained unused after surpassing the equipped copy. Balance now includes temporary items in ordinary acquisition/level/stat/enhancement/sale selection, while hero changes still clear the confirmed old temporary batch before selecting candidates. Both independent engine regressions pass.

## Executed checks

`npx vitest run tests/v10Review.test.ts` — 7/7 passed. `npx eslint tests/v10Review.test.ts --max-warnings 0` — passed. No full gate was run in this Critic assignment, per Host instruction.

The additional tests exercise two final-ID ties, newly eligible temporary gear after a level threshold, temporary enhancement selection, cancellation/same-hero/duplicate IPC warnings, replacement temporary contents during an open warning (second warning required), and failed quit capture followed by successful persistence of the complete live snapshot. Existing independent `tests/v10Critic.test.ts` also covers rational enhancement decrease, huge unaffordable costs without allocating the exponent, unbiased rejection sampling and overflow replacement.

Static review found the following safeguards present: frame-local hero changes and boss rewards settle before serialization; currency and equipment share one atomic save; old warning tokens include target, hero serial, temporary revision and reincarnation offer serial; purchases stage money and items before refusing destructive temporary replacement; risky enhancement uses a revision-bound warning; hourly stock and hidden rolls are saved; rare cards conceal secondary bonuses until ownership; success text includes exact rational odds and never labels positive probabilities 0%.

Evidence: `.agentdoc/v10-20260917T070144Z/evidence/independent-core-host-review.log` and `reviews/core-host-review.json` (SHA-256 source bindings).

## Final code recheck

The subsequent changes were independently read again: the explicit 70-form job table preserves the intended compatibility memberships and leaves h00 unrestricted; buying an already-owned shop UID is rejected before spending; PvE companion equipment and elemental multipliers now follow the same integer-rounding order as PvP; present-but-malformed persisted ledger fields reject the checkpoint instead of silently resetting debt, while absent legacy fields migrate to zero. The three compact gold displays in `src/menu/hero.ts`, `economy.ts`, and `profile.ts` use exact BigInt formatting and retain the full decimal amount in their title tooltip. No new code-level blocker was found.

The independent IPC test helper's sender type was widened from its inferred literal menu URL to a string-returning URL method; behavior assertions remain unchanged. `npx vitest run tests/v10Review.test.ts tests/equipmentV10.test.ts tests/save.test.ts tests/goldV91.test.ts` passed; the exact result is preserved in `evidence/independent-core-host-review-final.log`. `npx tsc --noEmit -p tsconfig.test.json` and targeted ESLint on the independent test passed. The regenerated review JSON retains the prior review in `core-host-review-01.json` before rebinding the reviewed files.

## Remaining evidence

This code-level review does not certify final convergence. Actual Electron warning/quit behavior, final balance selection/heldout measurements, complete native visuals, performance observations, packaging and the exact final gates remain Host integration responsibilities. Windows hardware, real PostgreSQL and human enjoyment were not exercised by this review.
