# Growth pacing counterexample and independent acceptance requirements

Reviewer: `/root/skills_harness`. This is a design/counterexample review, not approval of the next balance candidate.

## Measured counterexample

`growth-counterexample/run.mjs` uses archived R10-A compiled production core and a preserved evaluator snapshot. It starts from the ordinary fresh-save/input/shop policy with seed 120001. Every five seconds, unless hero reincarnation is ready, it legally consumes one unselected weakest companion into the strongest displayed hunting-power member and keeps five active members. It never edits live state, grants currency, changes capture probability, or looks ahead at future encounters. Every consume checks the production outcome.

The ten consecutive reincarnation intervals were **237, 167.58, 190.25, 129.33, 152.25, 92.83, 93.67, 94.58, 62, and 82 minutes**. All ten arrived; 103 legal consume actions were recorded. The ninth interval of 62 minutes establishes a later-cycle pacing failure. This run did **not** establish an instantaneous or few-minute reincarnation exploit. The result, individual actions, script/evaluator hashes and archived candidate compiled hashes are preserved in `growth-counterexample/result.json`.

An additional synthetic, achievable-roster algebra check used actual core actions to turn thirty equal Lv1/star0 companions into Lv26 plus four Lv1 members: party power rose exactly sixfold, from 56,252,350 to 337,514,100. Actual heroOffer/heroChoose preserved Lv26. That fixture is explicitly not presented as a measured fresh-save playtime. It establishes why full level×2^stars persistence, a shared HP/DPS multiplier M, and a saturating reset multiplier R cannot by themselves control accumulated companion growth.

## Required qualification after the design amendment

The original 280 heldout trajectories, selection rule, 23 original quantitative gate groups and their thresholds remain unchanged. A separately registered growth diagnostic adds 60 exploration-seed trajectories: twenty ordinary and twenty intermittent runs through ten cycles, plus twenty high-input runs through three cycles. Scheduled exposure remains 18 hours for the first three and 60 hours for continuations, including censored rows in every scheduled denominator.

Each of its 23 measured profile/cycle groups must have a finite p10 of at least 120 minutes. A null p10 fails. This additional guard follows the Host's explicit acceptance decision; it does not substitute for the original selection/heldout gates.

The registered policy enumerates every active-five target and inactive food, applies the actual legal consume, and chooses the greatest next-volley gain under the current type, hero, party bonus and fever. Numeric target ID then food ID resolves ties, including zero-gain choices. It preserves five members and prioritizes ready hero reincarnation. This covers the stronger distributed-growth policy under a concave growth curve. Raw action receipts retain full pre-action companion/context snapshots, target/food/outcome snapshots, before/after volley and hashes.

The independent verifier recomputes these decisions against the source-bound compiled candidate, checks legal growth and capture/consume roster continuity, and requires matching candidate/evaluator/protocol/compiled artifacts for the final growth report. A real cross-check of the preliminary R11 growth screen recomputed **253 actions across nine trajectories without mismatch**. Those nine preliminary trajectories do not satisfy final sample or pacing requirements.

## Fixed growth bound

The approved field-only mapping uses Q = level×2^stars and G(Q) = 1 + B(Q−1)/(100Q). For Q≥1, 1≤G(Q)<1+B/100, so B=25/50/100 bounds the field growth contribution by 1.25/1.5/2 regardless of how Q was obtained. Raw/PvP power retains its original Q multiplier. Tests exercise legal consume, fuse and companion reincarnate, large stars/levels, legacy encounter retention and unchanged raw values. The production expression multiplies the rational terms before its final integer division. Fixed capture/HP caps and the newly approved field base floor still need full candidate measurements; an algebraic bound alone does not prove target playtime or enjoyable reward pacing.

The cap/G native fixture also now reverses fixed expected party membership at Q1→Q3 through a real consume and compares the preview's exact integer hunting/PvP values with the applied result, including cases whose rounded visible strings are identical. Its deterministic source checks pass; resumed packaged native evidence is still pending.

Executed after these changes: 50 Node harness tests and 19 targeted progression/field/share tests passed. Our verifier implementation requires the separate Host review. Full balance qualification, early reward/click/equipment contribution review, current native evidence and unchanged-budget performance acceptance remain open.
