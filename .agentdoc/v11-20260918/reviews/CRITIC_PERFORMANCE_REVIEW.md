# Independent performance review — failure retained

Reviewer: `/root/skills_harness`. Evidence-only review; no Electron launches or application edits. Observed source at handoff: `5d88be04ba209901b5b4865fc7906a3923f5ccf5188b6d9c62adba222b27409d`. Exact recomputation and raw distributions are in `CRITIC_PERFORMANCE_REVIEW.json`.

## Decision

The registered four-slot comparison **fails idle CPU**. Independently ran `createReport` over all original artifacts and deep-compared its complete output to `performance/comparison.json`: identical. Raw hashes, process CPU sums, package identity, unchanged observer, fixture migration, sample coverage, serial lifecycle and cleanup checks pass. Each slot contains 360 raw samples and 301 after the five-minute warmup. This is not a rounding or comparator error, and it is not permission to waive the budget.

| Profile / metric | Baseline p95 | Candidate p95 | Fixed limit | Result |
|---|---:|---:|---:|---|
| Active CPU (%) | 2.038031 | 1.911263 | 3.038031 | Pass |
| Active working set (MiB) | 216.765625 | 210.531250 | 266.765625 | Pass |
| Idle CPU (%) | 1.391905 | 2.430934 | 2.391905 | **Fail** |
| Idle working set (MiB) | 200.328125 | 216.671875 | 250.328125 | Pass |

Idle exceeds the limit by 0.039029 percentage points, but the concern is broader than the last percentile sample: 19/301 samples exceed the limit, distributed from minute 5.5 through 29.95. Idle median rises 1.115609→1.418033 (+27%); mean rises 1.138392→1.530147 (+34%). Original failed observations and protocol remain unchanged.

## Localization and limits of causality

The renderer and GPU carry the increase. Browser/main mean CPU is essentially flat (0.018099→0.018681). GPU mean rises 0.601525→0.822871 and Tab mean 0.510337→0.677897. Their p95 values rise 0.698977→1.292363 and 0.629531→1.104243 respectively. These per-process percentiles do not add to the total percentile. Menu/ACK interactions were not exercised in the long idle slot; blaming their code directly is unsupported.

The identical initial fixture does not imply identical later rendered workload: the preserved observer uses unseeded production RNG. Baseline idle ends with six companions at monster index 33, while candidate idle ends with eight at index 42. Sprite/species, drops and progression histories differ. This limits attribution but does not invalidate or erase a preregistered valid run. Within one fixed candidate encounter at index 39 and unchanged eight-companion roster, 92 samples still span CPU 0.9670–2.9141 (p95 2.5028), so encounter transitions alone cannot explain the whole spread.

The raw long observation does not record rAF cadence, CPU frequency, power state or thermal state. A 60/120 Hz environment explanation is a hypothesis, not evidence. The separate serial `diagnostic-cadence03` run holds both versions at index 7/five companions and observes exactly 2,232 callbacks each in ~30 seconds: 74.40 versus 74.37 Hz, both median 13.3 ms and p95 14.1 ms intervals. It does not reproduce different cadence. Across its ~25-second metric interval, summed cumulative CPU is 4.3120→4.5274 seconds (+5%); GPU 2.1724→2.3615 and Tab 1.7975→1.9408. This short cold diagnostic is neither a replacement gate nor a causal proof.

## Next evidence needed

Retain the failed comparison and investigate renderer/GPU work with identical frozen state and recorded frame cadence before selecting a remediation. A measurable source fix should be validated with the original registered budgets and fresh complete candidate evidence. If an environmental cause is demonstrated, any repeat needs a documented rationale and retained original failure; repeating until a favorable p95 appears is unacceptable. There is no evidence here to relax the threshold or approve release. Balance acceptance is also still incomplete.
