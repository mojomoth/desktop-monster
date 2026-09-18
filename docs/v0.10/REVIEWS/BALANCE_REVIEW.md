# Independent balance evidence review

Reviewer: `/root/backend_v10`. The reviewer did not implement core equipment rules, the measurement simulation, registered candidates or candidate selection. This review does not approve the reviewer's own backend implementation. Production, measurement and harness source were left unchanged during this review.

## Exploration findings

The reviewer independently parsed all 1,440 rows in `balance-explore-04` (three candidates × eight labels × 20 seeds × three checkpoints), checked the exact seed/horizon denominator, unique tuples, exact integer currency conservation and inventory/loot counter constraints, and recomputed every summary and acceptance check. Recomputed reports match the stored reports. Source and raw-file hashes are preserved in `.agentdoc/v10-20260917T070144Z/reviews/balance-exploration-review.json`.

| Candidate | General-grade first purchase median at 120 minutes | No general-grade purchase by 120 minutes | Current weapon contribution median at 120 minutes | Registered checks |
|---|---:|---:|---:|---|
| A | 51.5 min | 9/20 | 4.74% | Rejected: contribution below 5% |
| B | 80 min | 8/20 | 16.38% | Passed |
| C | 70.5 min | 2/20 | 21.11% | Passed |

These are unconditional nearest-rank summaries; nonarrival remains infinity and may produce a null percentile. The purchase measure includes both weapons and accessories. The weapon contribution includes boss drops and enhancements and is not a causal estimate of damage purchased with gold. C's registered base purchase-price vector is 4,500/18,000/72,000/288,000G; its weapon percentage vector is 8/20/50/100, boss drop chance 30%, and risky-enhancement K is 19. Production matches C. Relative to B, C has higher prices, larger measured weapon contribution and fewer unpurchased general-grade items at two hours in these exploration seeds. Selecting it as the expensive-economy tradeoff is consistent with the registered acceptance criteria; the data do not establish universal optimality or enjoyment.

All four level tiers have users under progression policies. In C's 480-minute immediate-rebirth policy, median equipped minutes by tier are 28.33/16.17/119.83/269.75; the ten-minute deferred policy has 13.42/5.92/55.00/356.75. Thus the top requirement tier is not rendered unusable by reincarnation. The maximum observed processing time among C policy/checkpoint summaries is about 865.60ms per virtual hour, below the registered 10,000ms budget. This is simulation processing throughput, not the Electron CPU/memory gate.

## Required interpretation and report completeness

The actual policy implementation was compared with the registry and raw results:

- The eight labels contain seven distinct behaviors. `new-active` and `deferred-rebirth` produce identical same-seed game observations after removing policy labels and wall-time processing costs. Three checkpoints per trajectory are correlated. They must not be presented as 800 independent behavioral experiments.
- Intermittent input is continuous at 2Hz during the first two minutes, then active for the first 15 seconds of each minute. The same two-minute onboarding also precedes companion-idle. This qualifies the shorter `binding.definitions.input` description.
- The simulations do not buy existing training or lures, manage/fuse companions, or optimize every possible gold sink. They compare the registered equipment policies. Spending opportunity-cost claims must be limited accordingly.
- Equipped-tier time, weapon-template time and four-identical-accessory concentration are five-second sample integrals. They are not exact event-time durations. The top-template report can be derived from raw weapon-template minutes; the four-copy metric covers identical accessories without identifying a dominant accessory template.
- `weaponGainPercent` is the current weapon's contribution at a checkpoint. Dividing it by equipment spending produces a descriptive percentage-point-per-gold ratio, including drops and subsequent reincarnations; it does not measure the causal benefit of an individual purchase. The final report must include this qualification alongside the requested spending, concentration, top-template and reincarnation-loss tables.
- Enhancement spending and destroyed-copy counts are measured. The simulation does not separately retain a ledger of each destroyed item's sunk purchase and enhancement cost; it must not claim an exact per-destroyed-item replacement-cost estimate from these rows.
- Epic zero-acquisition predictions use independent encounter and drop probabilities and per-boss loot-table weights. The theoretical opportunity count includes the last spawned, potentially un-killed boss. Observed acquisitions include completed kills only. Specific-item nonarrival remains high even when any-epic nonarrival becomes low: for C's deferred policy at eight hours, predicted any-epic nonarrival averages about 0.47%, while individual template predictions range from about 80.79% to 86.07%.

The Balance agent acknowledged these qualifications and is preparing the missing derived report tables from frozen raw rows. No forged result or changed acceptance threshold was found. Candidate selection evidence is accepted within the registered policy scope. No source change or new policy was requested after observing exploration results.

## Final held-out verdict: approved within the registered scope

The completed run contains all 2,400 rows: eight labels × 100 held-out seeds (50001–50100) × three checkpoints. The reviewer independently executed `node .harness/v10/balance-verify.mjs .agentdoc/v10-20260917T070144Z/balance/final.json`; it exited 0 and confirmed selected C, current core hash `0d70a8954909793281c94be89ba45c4694b94f8f84afae1a29e936229ea2cf59`, raw row denominators, disjoint exploration/validation seeds, exact currency conservation, compiled/source identity and all recomputed acceptance checks. Evidence is in `evidence/independent-balance-final-verification.log`.

At two hours, new-active's common-grade first purchase median is 70 minutes, with 21/100 nonarrivals retained; median current weapon contribution is 19.36%. All four registered checks pass. The longest policy/checkpoint processing average is about 888.59ms per virtual hour. The active policy's eight-hour weapon tier-4 median use is 358.83 minutes; immediate-rebirth has 287.42 minutes, so the high-level tier remains usable under the registered frequent-reset policy.

The reviewer also independently recomputed all extra fields in all 24 groups of `balance/derived.json`: purchase spending, purchases, reincarnation unequips, eligible opportunities, gross gear-spending ratios and their zero-spend denominators, spending fractions, pooled top-five weapon-template time/share/player counts and per-template epic ranges. Every value matches frozen raw rows and canonical summaries. Every observed money value converted to Number for presentation was checked to remain within the exact integer range; authoritative arithmetic remains BigInt. All 56 epic template IDs match the generated catalog, and the any-epic fixed-opportunity survival values agree with the independent formula. Hashed evidence and checks are recorded in `reviews/balance-heldout-review.json`.

The final `BALANCE_REPORT.md` includes the previously requested derived tables and interpretation limits. It now also states that observed opportunity counts may correlate with earlier loot and resulting growth: the predicted averages hold the observed opportunity schedules fixed and apply the independent-trial model, rather than claiming calibrated unconditional no-drop probabilities by real elapsed time. The report does not claim that an individual destroyed item's exact sunk replacement cost was measured. No unresolved mandatory evidence discrepancy, fabricated completion claim or relaxed acceptance criterion was found.

Human enjoyment, physical Windows execution, live PostgreSQL, native visual approval and Electron long-duration performance remain separate checks and are not certified by this balance review. This approval certifies the registered equipment simulation and its accurately limited report, not universal spending optimality or game enjoyment.
