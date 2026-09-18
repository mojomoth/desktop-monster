# Final0.7 release policy measurement — independent Balance analysis

Frozen 2026-09-12T20:16:56.963350+00:00; actual separate agent `/root/balance`.

**PASS for measurement completeness, integrity and the registered canonical targets.** Nine policies each completed100 distinct validation seeds1–100 for12hours:900 fresh raw runs. The pre-frozen analyzer and separate Python Decimal pass found0errors. This does not assert that every alternative policy satisfies the canonical windows or that all release work is complete.

Canonical active/free/uniform/no-management/immediate-menu: firstAccepted whole p50=2736.6sec (45.61min),100/100 accepted within5400sec; h70 eligibility whole p50=40596sec (11h16m36sec). Both registered medians and the90/100 deadline pass. h70 eligible50/100,unreached50,seen50,chosen0 remain explicit. The lower population median uses index49; conditional median20933.6sec does not replace40596, and whole p90/worst are null.

## Policies and first acceptance

Every row retains denominator100. Times are seconds. Whole quantiles sort null after finite observations at floor((N−1)q); conditional quantiles include reached samples only. Each policy file retains all first7,12 metric distributions,21 content distributions, checkpoints and100 per-seed records.

| File | Policy: profile/purchase/input/management/menu seconds | First accepted whole p10/p50/p90/worst | Conditional p10/p50/p90/worst | By90min /100 | First unreached /100 |
|---|---|---|---|---:|---:|
| [P1](policy-01.json) | active/free/uniform/none/0 | 1698.4 / 2736.6 / 3539.5 / 3723.3 | 1698.4 / 2736.6 / 3539.5 / 3723.3 | 100 | 0 |
| [P2](policy-02.json) | active/free/uniform/none/600 | 1800 / 3000 / 3600 / 4200 | 1800 / 3000 / 3600 / 4200 | 100 | 0 |
| [P3](policy-03.json) | intermittent/free/uniform/none/600 | 3000 / 4800 / 10800 / 12000 | 3000 / 4800 / 10800 / 12000 | 64 | 0 |
| [P4](policy-04.json) | warm-idle/free/uniform/none/600 | 4800 / 13800 / null / null | 4200 / 9000 / 28200 / 42600 | 13 | 30 |
| [P5](policy-05.json) | pure-idle/free/uniform/none/600 | null / null / null / null | null / null / null / null | 0 | 100 |
| [P6](policy-06.json) | active/free/burst/none/0 | 1164.9 / 1822.6 / 3083 / 3377.1 | 1164.9 / 1822.6 / 3083 / 3377.1 | 100 | 0 |
| [P7](policy-07.json) | active/training/uniform/consume-weakest/600 | 1800 / 2400 / 3600 / 3600 | 1800 / 2400 / 3600 / 3600 | 100 | 0 |
| [P8](policy-08.json) | active/lure/uniform/fuse-first/600 | 1800 / 3000 / 3600 / 4200 | 1800 / 3000 / 3600 / 4200 | 100 | 0 |
| [P9](policy-09.json) | active/reroll/uniform/reincarnate-first/120 | 1440 / 2040 / 3120 / 3840 | 1440 / 2040 / 3120 / 3840 | 100 | 0 |

Uniform active uses86400 inputs over12h; burst active uses the same86400 inputs in20-hit bursts every10sec. Intermittent uses the first120sec onboarding then15sec of each minute (21780 inputs). Warm-idle uses only the first120sec (240 inputs); pure-idle has0 inputs. The900 samples are never pooled for the canonical target.

## Seven first-event whole medians

Seconds. Complete p10/p50/p90/worst/minimum and reached-only distributions are in each linked policy file. Warm-idle has14 first-capture and30 ready/open/accepted unreached; pure-idle has100 unreached for every first event. Other first events reached all100.

| Policy | Kill | Reward | Level | Capture | Ready | Open | Accepted | Ready→open p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| P1 | 4.5 | 4.5 | 15.5 | 50.5 | 2736.6 | 2736.6 | 2736.6 | 0 |
| P2 | 4.5 | 4.5 | 15.5 | 50.5 | 2736.6 | 3000 | 3000 | 311.2 |
| P3 | 4.5 | 4.5 | 15.5 | 50.5 | 4541.2 | 4800 | 4800 | 251.8 |
| P4 | 4.5 | 4.5 | 15.5 | 50.5 | 13555.2 | 13800 | 13800 | 459.9 |
| P5 | null | null | null | null | null | null | null | null |
| P6 | 0.9 | 0.9 | 11 | 41.8 | 1822.6 | 1822.6 | 1822.6 | 0 |
| P7 | 4.5 | 4.5 | 15.5 | 50.5 | 2053 | 2400 | 2400 | 353.1 |
| P8 | 4.5 | 4.5 | 15.5 | 50.5 | 2663.2 | 3000 | 3000 | 306.1 |
| P9 | 4.5 | 4.5 | 15.5 | 50.5 | 1951.8 | 2040 | 2040 | 52.1 |

Open→accepted is0sec for every reached case. Scheduled menu waits are measured separately: P2 ready→open whole p50=311.2sec, P9=52.1sec; a later menu visit must not be treated as later readiness.

## h70 eligibility, presentation and actual choice

| Policy | Eligible /100 | Unreached /100 | Seen /100 | Chosen /100 | Whole eligible p10/p50/p90/worst sec | Conditional eligible p10/p50/p90/worst sec | Before8h / within8–12h |
|---|---:|---:|---:|---:|---|---|---|
| P1 | 50 | 50 | 50 | 0 | 17441.5 / 40596 / null / null | 14841.7 / 20933.6 / 34739.3 / 40596 | 30 / 20 |
| P2 | 89 | 11 | 89 | 0 | 17749.5 / 25894.3 / null / null | 17567 / 24710.4 / 35605.7 / 42600.6 | 64 / 25 |
| P3 | 81 | 19 | 78 | 0 | 19860.4 / 28810.5 / null / null | 19818.9 / 27112.2 / 37959.6 / 42609.8 | 49 / 32 |
| P4 | 44 | 56 | 43 | 0 | 25259.4 / null / null / null | 23452.6 / 30067.4 / 39648.8 / 42873.3 | 17 / 27 |
| P5 | 0 | 100 | 0 | 0 | null / null / null / null | null / null / null / null | 0 / 0 |
| P6 | 68 | 32 | 67 | 0 | 13319.2 / 25651.5 / null / null | 13086.2 / 17327 / 35884.6 / 43161 | 53 / 15 |
| P7 | 100 | 0 | 100 | 0 | 13290.5 / 16807 / 21019.5 / 28108.6 | 13290.5 / 16807 / 21019.5 / 28108.6 | 100 / 0 |
| P8 | 92 | 8 | 92 | 0 | 16273.9 / 22227 / 40220 / null | 16273.9 / 21646.7 / 33783.7 / 41425 | 70 / 22 |
| P9 | 100 | 0 | 100 | 0 | 8567.5 / 9969 / 12559.1 / 17536.4 | 8567.5 / 9969 / 12559.1 / 17536.4 | 100 / 0 |

Alternative-policy limits remain visible. P3 misses the first90-minute rate with64/100. P4 has30 first-unreached and56 h70-unreached; P5 makes no progress. P2/P6/P7/P8/P9 have h70 whole medians below8hours; P7 and P9 reach h70 before8h in all100 cases. These are descriptive outcomes under different registered behavior, not grounds to change numbers, goals or the canonical denominator.

No policy actually selected h58,h62 or h70 because all select the first card while rare heroes occupy the third slot. Eligibility/appearance success is not hero acquisition. The separate actual rare-card UI diagnostic, Native observations and formal result audit have their own evidence.

## Six named content counts

Each cell is eligible/seen/acquired, all out of100. Acquired means actual hero choice or monster species kill. Captures are listed separately. All exact requirements and population/conditional distributions are retained in the JSON.

| Policy | crownwyrm | rootcolossus | h58 | h62 | starvoid | h70 | Monster captures crown/root/star |
|---|---|---|---|---|---|---|---|
| P1 | 100/100/100 | 100/100/100 | 100/98/0 | 81/80/0 | 67/67/67 | 50/50/0 | 21/22/0 |
| P2 | 100/100/100 | 100/100/100 | 100/99/0 | 98/98/0 | 98/98/98 | 89/89/0 | 11/19/0 |
| P3 | 100/100/100 | 100/100/100 | 100/100/0 | 99/99/0 | 97/97/97 | 81/78/0 | 18/11/0 |
| P4 | 68/68/68 | 68/67/67 | 65/65/0 | 65/65/0 | 60/60/60 | 44/43/0 | 9/7/0 |
| P5 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| P6 | 100/100/100 | 100/100/100 | 100/98/0 | 84/84/0 | 71/71/71 | 68/67/0 | 10/13/0 |
| P7 | 100/100/100 | 100/100/100 | 100/100/0 | 100/100/0 | 100/100/100 | 100/100/0 | 49/45/33 |
| P8 | 100/100/100 | 100/100/100 | 100/99/0 | 98/98/0 | 98/98/98 | 92/92/0 | 23/12/0 |
| P9 | 100/100/100 | 100/100/100 | 100/100/0 | 100/100/0 | 100/100/100 | 100/100/0 | 92/92/80 |

## Paired later activity and discovery gaps

8→12h uses the same seed and policy, not subtraction of separate medians. Gaps use first novel seenHero/seenMonster or chosenHero/killedMonster records from2h through12h with both boundaries, calculated as integer100ms differences. A discovery gap does not imply no fighting or reincarnation.

| Policy | Additional kills p10/p50/p90/max | Additional reincarnations p50 | Post8h hero-choice samples /100 | Seen gap p50/worst sec | Acquired gap p50/worst sec |
|---|---|---:|---:|---|---|
| P1 | 1128 / 17231 / 35078 / 66904 | 80 | 100 | 9158.5 / 31089.4 | 11364.3 / 34294.8 |
| P2 | 10993 / 20616 / 30893 / 41175 | 24 | 100 | 10800 / 16200 | 10200 / 12000 |
| P3 | 9265 / 19677 / 32007 / 41412 | 24 | 100 | 8400 / 13200 | 7800 / 12000 |
| P4 | 0 / 11321 / 28866 / 36385 | 24 | 69 | 7200 / 36000 | 6788.8 / 36000 |
| P5 | 0 / 0 / 0 / 0 | 0 | 0 | 36000 / 36000 | 36000 / 36000 |
| P6 | 1275 / 29084 / 46164 / 65630 | 120 | 100 | 17258 / 32334.8 | 25327.7 / 35440.9 |
| P7 | 24832 / 34266 / 43646 / 55910 | 24 | 100 | 12000 / 15600 | 10800 / 12600 |
| P8 | 11894 / 23844 / 34253 / 46546 | 24 | 100 | 10800 / 13800 | 10200 / 12000 |
| P9 | 51265 / 73413 / 80050 / 80254 | 120 | 100 | 33120 / 35280 | 34200 / 35640 |

For P1 all100 continue selecting heroes after8h despite68 unchanged selected-party power values. P4 has31 samples with no post8h choice; P5 has100. P9 has large seen/acquired gaps while every sample continues120 hero selections after8h, separating content exhaustion from combat inactivity. Exact before/after party powers and delta strings remain lossless per seed.

## Economy and actual roster management

All9900 checkpoints independently satisfy initial coins + income − spent = balance; actual management/choice ledgers and expected input counts also match. These are marginal medians: do not subtract median income and median spend to infer median balance.

| Policy |12h income p50|Spent p50|Balance p50|Training p50|Max companion level p50|Actual consume/fuse/reincarnate p50|
|---|---:|---:|---:|---:|---:|---|
| P1 | 1.56308e+06 | 0 | 1.56308e+06 | 0 | 1 | 0/0/0 |
| P2 | 1.14905e+07 | 0 | 1.14905e+07 | 0 | 1 | 0/0/0 |
| P3 | 9.6456e+06 | 0 | 9.6456e+06 | 0 | 1 | 0/0/0 |
| P4 | 2.56563e+06 | 0 | 2.56563e+06 | 0 | 1 | 0/0/0 |
| P5 | 0 | 0 | 0 | 0 | 0 | 0/0/0 |
| P6 | 3.74932e+06 | 0 | 3.74932e+06 | 0 | 1 | 0/0/0 |
| P7 | 3.31945e+07 | 28875 | 3.31656e+07 | 10 | 67 | 71/0/0 |
| P8 | 1.59165e+07 | 62050 | 1.58544e+07 | 0 | 1 | 0/4/0 |
| P9 | 3.02928e+07 | 728000 | 2.95571e+07 | 0 | 7 | 311/0/33 |

P7 consumes in all100 runs and reaches training10; P8 actually fuses in96/100 runs (0–8 fusions). P9 performs both consumption and companion reincarnation: the registered reincarnate-first policy consumes to raise an eligible companion when none can reincarnate. Purchases and management are bundled in these policies, so their differences do not identify the isolated effect of spending. No paid prerequisite is added to the canonical free path.

All297 checkpoint bigint distributions for hero damage, companion damage and selected-party power were recomputed using Python integers and matched exactly. Damage includes emitted overkill; raw selected-party power is not effective DPS. Per-seed exact decimal strings and final bigint quantiles remain available.

## Binding, reproducibility and remaining work

Host COMPLETE authorized analysis after actual execution ended2026-09-12T20:10:10.684924Z. The frozen analyzer ran once and produced immutable snapshot and9 policy files. A separate Python Decimal pass rehashed900 raw files, matched all900 to the report, recomputed108 event and189 milestone distributions,9900 checkpoint first-event/economy/action/input constraints,297 bigint distributions and all900 paired/gap records. Both actual measure and structural verification exited0.

Verified bindings include exact9 policies,21 production and compiled parameters,6 content requirements, completed four-role design session/responses, six current V05/V06 readiness checks, source/evaluator/build/report/manifest/raw hashes and three archives. Archives have151 source,34 evaluator and104 build files with unique safe paths. V06 README is preserved separately as owned metadata; it is not part of the source digest or claimed as a production archive member.

Source `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`; evaluator `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`.

New [release.json](../release.json), SHA `46271facabdeb917748b50b46b2136246c0fd65281b5e76b350a7dcd1e6b1079`.

New [execution.json](../measurement-release-v070/execution.json), SHA `e6b466626375c0638046230a7ef694c98d7e8aa54fa7183d880e17df94d30dbf`.

[final-analysis.json](final-analysis.json), SHA `116b4a84a0dd2a2bf3fa7b3c523ab38f85f39daf6cc635a9ce0fb3c422e5bafc`.

[python-recheck.json](python-recheck.json), SHA `e5f5bfca371b607c3ff3855d4f287c2625c4e3d338ac2a5e51357e598cb6f054`; [snapshot-complete.json](snapshot-complete.json), SHA `6787fb227efd29691851ae61f72bf102be3c3362c44828644e68287e588d1d26`.

FROZEN.json binds every analysis file, including each policy file and original preparation/analyzer/README snapshot. Original measurement reports, raw, archives, logs and prior0.6/0.7 candidate analyses were not changed or reused for release results.

This completed-data analysis is not the separate four-role audit.mjs or full product release verification. Actual330-minute Native observation, independent audit, smoke, actual package and high-level server compatibility have separate status. Host owns any concurrent Native process; this analysis did not inspect or modify it. HumanChecks=PENDING. No new game measurement, build, test, Native launch, source/evaluator edit, numerical change or retrospective optimization was performed.
