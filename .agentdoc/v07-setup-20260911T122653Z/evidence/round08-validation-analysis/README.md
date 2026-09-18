# Round08 adopted-candidate validation — independent Balance analysis

Frozen 2026-09-12T17:56:22.905978+00:00; actual agent `/root/balance`.

**PASS for this completed prefinal 0.6.0 validation.** All100 validation seeds1–100 ran the canonical active/free/uniform/no-management/immediate-menu policy for12hours. Integrity has0errors. First accepted p50=2736.6sec (45.61min),100/100 accepted by5400sec; h70 eligibility whole-population p50=40596sec (11h16m36sec). Both registered target medians and the90/100 deadline pass.

h70 eligibility and presentation each reached50/100;50 remain unreached, and actual h70 choices are0/100. The registered lower whole-population median uses index49 of100, so it is40596sec despite50 censored samples. Its conditional median20933.6sec is reported separately; whole p90/worst are null. No additional reach-rate target or tuning was introduced.

## First seven events

Seconds; every event reached100/100, so whole and conditional distributions coincide.

| Event | p10 | p50 | p90 | Worst | Unreached |
|---|---:|---:|---:|---:|---:|
| firstKillSec | 4.0 | 4.5 | 5.0 | 5.0 | 0/100 |
| firstRewardSec | 4.0 | 4.5 | 5.0 | 5.0 | 0/100 |
| firstLevelSec | 14.5 | 15.5 | 16.5 | 17.0 | 0/100 |
| firstCaptureSec | 35.5 | 50.5 | 192.5 | 2783.0 | 0/100 |
| firstReadySec | 1698.4 | 2736.6 | 3539.5 | 3723.3 | 0/100 |
| firstOpenSec | 1698.4 | 2736.6 | 3539.5 | 3723.3 | 0/100 |
| firstAcceptedSec | 1698.4 | 2736.6 | 3539.5 | 3723.3 | 0/100 |

Ready→open and open→accepted are0sec for every sample. Actual minimum accepted=1403.9sec, maximum=3723.3sec. There were no first-acceptance failures or90-minute misses.

## Final named content and all six milestones

| h70 event | Reached /100 | Whole p10 / p50 / p90 / worst (sec) | Conditional p10 / p50 / p90 / worst (sec) |
|---|---:|---|---|
| h70EligibleSec | 50 | 17441.5 / 40596.0 / null / null | 14841.7 / 20933.6 / 34739.3 / 40596.0 |
| h70SeenSec | 50 | 17555.4 / 40692.5 / null / null | 15063.0 / 21271.6 / 34841.4 / 40692.5 |
| h70ChosenSec | 0 | null / null / null / null | null / null / null / null |

Eligibility timing: 30 before8h, 20 within8–12h inclusive,50 unreached. These are descriptive diagnostics, not new acceptance criteria.

Each count below retains denominator100. Acquired means actual hero choice or monster kill; monster capture is a separate event.

| Content ID | Eligible | Seen | Chosen / killed | Captured | Eligible whole p50 sec | Eligible conditional p50 sec |
|---|---:|---:|---:|---:|---:|---:|
| crownwyrm | 100 | 100 | 100 | 21 | 4044.1 | 4044.1 |
| rootcolossus | 100 | 100 | 100 | 22 | 3872.2 | 3872.2 |
| h58 | 100 | 98 | 0 | n/a | 5607.5 | 5607.5 |
| h62 | 81 | 80 | 0 | n/a | 16582.3 | 13401.8 |
| starvoid | 67 | 67 | 67 | 0 | 31037.5 | 23365.5 |
| h70 | 50 | 50 | 0 | n/a | 40596 | 20933.6 |

The canonical first-slot choice policy explains why h58/h62/h70 presentation does not imply actual choice. The JSON preserves all six eligible/seen/chosen-or-killed/captured distributions, every unreached count, first events, checkpoints and per-seed actual choices; no old exploration result is substituted.

## Integrity and reproduction

Analysis began only after Host COMPLETE and execution.endedAt=2026-09-12T17:48:20.318754Z. The pre-frozen JavaScript analyzer did not import or run the engine. A separate Python Decimal pass reread all100 raw files, recomputed12 metric distributions and21 milestone distributions at exact100ms, and matched the snapshot without errors. Both report commands exited0.

Verified: adoption before execution; exact selected candidate and21 parameters against source and compiled export; six content requirement bindings; source/evaluator/build digests; three literal archive SHA values and safe archive members; full report/manifest/raw identity;100 distinct seeds1–100 at720minutes; fixture=null; policy and protocol identity; command/readiness log SHA values; same-source progression/harness/gates readiness; checkpoint currency conservation and actual event/choice counts. Archives, execution and raw reports remain unchanged. Live files were not used during finalization because Host subsequently began the version bump.

Source digest `ab965fd745fde7b68ea1b46eb715b0bdc1e86456bd4d2fdfae3a4ec79bb34af7`; evaluator digest `4f5e3cb6b3b7654b8f07cf55fb9950b37192c003dc088a7673c295be296b20d4`.

Report [candidate-round08.json](../candidate-round08.json), SHA `e7b607b205ec26557685bd1db0d80d46f5102d29a428fad1a7c3e2a6569d75c0`.

Execution [execution.json](../validation-round08-v060/execution.json), SHA `ecca14ae106d3fdd45544bb0e63431e2965efd84341cf9da6743fca427f7b5fe`.

Adopted protocol SHA `52f4206ceefec593171a7017db41f4ab7eb8c930a0314c5b018999bd81358192`; build digest `e82aa7cbe99a6c586550ba94dbd25dda7bd4306fca2eedc0fd4453e6100c3997`.

[final-analysis.json](final-analysis.json), SHA `60b24d28ab9d452ee7af5d07ab26b6bdb2507c4c64fd30468debc20a25d7ec37`.

[python-recheck.json](python-recheck.json), SHA `f8279bb16e2f218481adbf551335bd20e78459d642c545a355839801122e001c`. Original [snapshot-complete.json](snapshot-complete.json), SHA `b2c0a5237b71dce515bac796d3ed45e56048df23253c323c21f938507e08fd54`.

## Scope and pending evidence

Preparation, design review, exploration selection, this candidate validation and final release are separate states. This report binds app/package/lock0.6.0 only and does not certify the subsequent0.7.0 source. It is an independent result analysis, not the separate four-role audit.mjs. Final9-policy measurements, actual5/15/30-minute×3-profile Native observations, separate continuous180-minute active observation with10-minute menu choices, smoke, actual package and high-level server compatibility remain separate required evidence. HumanChecks=PENDING.

No source/evaluator/protocol/product edits, new game measurement, build, test, numerical optimization or candidate proposal were performed by this analysis. The100 validation samples were accessed only after completion and were not used to adjust numbers. Previously frozen exploration and failed rounds remain unchanged.
