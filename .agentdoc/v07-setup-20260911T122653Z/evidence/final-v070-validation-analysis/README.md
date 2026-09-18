# Final0.7 canonical validation — independent Balance analysis

Frozen 2026-09-12T19:00:25.764840+00:00; actual agent `/root/balance`.

**PASS for the fresh final0.7 canonical100-seed validation.** The registered first accepted p50 is2736.6sec (45.61min), with100/100 accepted by5400sec. The final h70 eligibility whole-population p50 is40596sec (11h16m36sec), within8–12h. All100 distinct validation seeds1–100 completed720minutes; integrity has0errors.

Exactly50/100 reached h70 eligibility and50 remain unreached. The lower whole-population median uses index49, so40596sec is finite while whole p90/worst are null. Conditional p50=20933.6sec is a different distribution and is not used for acceptance. h70 was presented to50/100 and actually chosen by0/100. Of the50 eligible,30 arrived before8h and20 within8–12h.

## First seven events

Seconds. All events reached100/100; whole and conditional distributions coincide.

| Event | p10 | p50 | p90 | Worst | Unreached |
|---|---:|---:|---:|---:|---:|
| firstKillSec | 4.0 | 4.5 | 5.0 | 5.0 | 0/100 |
| firstRewardSec | 4.0 | 4.5 | 5.0 | 5.0 | 0/100 |
| firstLevelSec | 14.5 | 15.5 | 16.5 | 17.0 | 0/100 |
| firstCaptureSec | 35.5 | 50.5 | 192.5 | 2783.0 | 0/100 |
| firstReadySec | 1698.4 | 2736.6 | 3539.5 | 3723.3 | 0/100 |
| firstOpenSec | 1698.4 | 2736.6 | 3539.5 | 3723.3 | 0/100 |
| firstAcceptedSec | 1698.4 | 2736.6 | 3539.5 | 3723.3 | 0/100 |

Ready→open and open→accepted are0sec throughout this immediate-menu policy. Accepted minimum1403.9sec, maximum3723.3sec; no90-minute misses.

## Final h70 and six content milestones

| Event | Reached/100 | Whole p10 / p50 / p90 / worst sec | Conditional p10 / p50 / p90 / worst sec |
|---|---:|---|---|
| h70EligibleSec | 50 | 17441.5 / 40596.0 / null / null | 14841.7 / 20933.6 / 34739.3 / 40596.0 |
| h70SeenSec | 50 | 17555.4 / 40692.5 / null / null | 15063.0 / 21271.6 / 34841.4 / 40692.5 |
| h70ChosenSec | 0 | null / null / null / null | null / null / null / null |

Counts retain denominator100. Acquired means actual hero choice or monster species kill; captures remain separate.

| ID | Eligible | Seen | Chosen / killed | Captured | Eligible whole p50 sec | Eligible conditional p50 sec |
|---|---:|---:|---:|---:|---:|---:|
| crownwyrm | 100 | 100 | 100 | 21 | 4044.1 | 4044.1 |
| rootcolossus | 100 | 100 | 100 | 22 | 3872.2 | 3872.2 |
| h58 | 100 | 98 | 0 | n/a | 5607.5 | 5607.5 |
| h62 | 81 | 80 | 0 | n/a | 16582.3 | 13401.8 |
| starvoid | 67 | 67 | 67 | 0 | 31037.5 | 23365.5 |
| h70 | 50 | 50 | 0 | n/a | 40596 | 20933.6 |

The first-slot policy does not choose the rare third-slot heroes. Presentation and eligibility therefore do not establish actual hero acquisition. Every first/content distribution, minimum, worst and unreached count is retained in the JSON.

## Paired late activity and discovery gaps

Same seed,8h versus12h; no subtraction of cross-sectional medians. Gaps use first novel seenHero/seenMonster or chosenHero/killedMonster events and both2h/12h boundaries, calculated in integer100ms. Discovery gaps are not combat inactivity.

| Metric | p10 | p50 | p90 | Worst / maximum |
|---|---:|---:|---:|---:|
| kills | 1128.0 | 17231.0 | 35078.0 | 66904.0 |
| reincarnations | 5.0 | 80.0 | 120.0 | 120.0 |
| post8hHeroChooseActions | 5.0 | 80.0 | 120.0 | 120.0 |
| seenGapSec | 3532.0 | 9158.5 | 25518.1 | 31089.4 |
| acquiredGapSec | 2155.0 | 11364.3 | 31954.9 | 34294.8 |

100/100 had a real post8h hero choice;68/100 had unchanged selected party power. Exact before/after party values, deltas, choice/species counts, management and currency are in python-recheck.json. These are diagnostics, not added target thresholds.

## Evidence and limits

Access began only after Host COMPLETE and execution endedAt2026-09-12T18:56:43.131880Z. Frozen v2 analyzer checked all new100 raw files and the completed design,29 owned source/test files, same-source readiness logs,21 source/compiled parameters,6 content bindings, source/evaluator/build/report/manifest hashes and3 safe archives. A separate Python Decimal pass matched12 event distributions and21 milestone distributions, all1100 checkpoint first-event/currency constraints, plus paired late diagnostics. Both actual measurement and structural commands exited0.

Source `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`; evaluator `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`.

New report [candidate-final-v070.json](../candidate-final-v070.json), SHA `30ceb515136951b931860908e0fa951727305ed5f4678f48155a60d2bd48c15a`.

New [execution.json](../validation-final-v070/execution.json), SHA `36f2a3c85a22cd90ebbcfe238e7db1d0d8036f3a4c3e2325c7fcb1f6691b5f3d`.

[final-analysis.json](final-analysis.json), SHA `b83f65710605875226a68b5d028b660fcde343dff0ad0f60f250f8764326f1cc`.

[python-recheck.json](python-recheck.json), SHA `1e6bbfc8e138f9572a40cac43dfea1e82af38c890b7a8ab8e1958eef564ef507`; immutable [snapshot-complete.json](snapshot-complete.json), SHA `9b9c2bbf7a37ca679afac22c2b3423a17250d0993d4510bb1b75f0c920de0ba2`.

Original preparation/analyzer and explicitv2 amendment remain unchanged. Completed prefinal0.6 evidence remains history and was not substituted or resumed; equal reported numbers do not imply reused execution. No candidate tuning or numerical proposal was made from validation.

This analysis verifies the current0.7 canonical candidate measurement. Complete9-policy release measurement, actual330-minute Native matrix, separate four-role audit.mjs, smoke, actual package and high-level server compatibility remain distinct requirements. The previously completed0-minute diagnostic is not natural progression evidence. HumanChecks=PENDING. No product/evaluator changes, extra measurement, build or tests were executed by this analysis.
