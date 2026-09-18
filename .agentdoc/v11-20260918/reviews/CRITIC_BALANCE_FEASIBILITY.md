# Curve-only balance feasibility review

Reviewer: `/root/skills_harness`. Author: `/root/balance`. 2026-09-18.
Verdict after R4: request a narrowly scoped field-only companion-curve amendment
before further production tuning. R3 is not approved for adoption. This is an
evidence-based recommendation, not proof that every conceivable fixed HP curve
is insufficient. No scope or numerical gate has been changed by this review.

## Evidence and mechanism

The authorized levers are required hero level, fixed field HP, and fixed difficulty
by rebirth count. XP, 35% capture chance, companion power and PvP remain unchanged.
R2-A, with required level 21 and a 1.12 HP tail, reached stage 152 at first rebirth.
Across the registered 20 seeds, ordinary p10/p50/p90 were 107/174/633 minutes;
intermittent p50 was 370 minutes and p90 did not arrive within 12 hours. High-input
p10 was 60 minutes. Increasing the same exponential tail in R2-B/C increased
non-arrivals. These measurements reject those candidates, not every fixed curve.

The variance mechanism is concrete: companion power uses approximately
`1.15 ** bossIndex`, with bosses eight encounters apart. Four consecutive missed
capture rolls have probability `0.65 ** 4 = 17.85%` at a specified run of four
bosses and create a 32-index power gap of about 87.6x. This is a local mechanism,
not an estimate of whole-session failure probability; parties, types and existing
early capture guarantees also affect the measured result.

R3-A's single ordinary profiling trajectory reached first three intervals of
222, 197.4 and 196.4 minutes. Its polynomial HP tail moved the required encounter
counts to 49,960 / 59,521 / 59,531 per cycle. First-cycle finishing blows were 57
hero and 49,903 companion; at each later 30-minute checkpoint, kills increased by
exactly 9,000 while the hero kill counter stayed unchanged. This demonstrates a
long companion one-hit plateau, not measured human enjoyment. Level 18 to 33
arrived in approximately seven minutes after an earlier slow segment. The first
purchase was at 56 minutes; only four purchases occurred across all three cycles.

First-cycle retained gold was 231,634,915, with 395,570,400 spent, and soul count
after rebirth was 7,307. Those values are descriptive consequences; no new numeric
economy gate is being invented. The full three-cycle simulation took 22.6 seconds
of processing, serialized 33,778 bytes in 1.14 ms, and sampled about 57.5 MB heap.
These are one Node-process simulation, not native Electron performance evidence.

## C11-R3-01 — major: high-stage capture changes practical PvP power

The profiling policy never manages companions after its 30-slot roster fills.
A player can release one weak companion near the end of the first cycle, then
capture the next boss at the unchanged 35% chance. At boss index 49,959 the new
level-1, zero-star companion has **3,033 decimal digits** of raw power, compared
with 31 digits for the profile's strongest owned capture index, 511. Both indices
are valid saved/server integers. Unchanged formulas do not preserve practical PvP
balance when accessible capture indices increase by this amount.

Counterexample executed locally against the archived R3-A compiled production
core, without Electron or network: create a valid late-stage save at index 49,959
with 30 companions and `monsterHp: '1'`; apply `sacrifice` to `c1`; attack using an
injected RNG returning zero (a permitted successful capture draw). The roster
changed 30→29→30, captured `c31`/`charspine` with `bossIndex: 49959`, and its power
had 3,033 digits. Serialize/parse preserved that exact companion. This proves the
ordinary action path; it does not claim every seed captures on its first attempt.

## R4 bounded-stage follow-up

R4 reduced the prefix to 1.13/1.12 and tested bounded required levels 20/21/22 with
tails 1.18/1.17/1.165. I independently checked all 180 unique profile/seed records,
their original registration hashes, source archives, current core hashes, actual
compiled candidate bytes and raw sample hashes. I recomputed the unconditional
quantiles with non-arrivals retained as infinity. The stored summaries match.

| Candidate | Ordinary p10/p50/p90 minutes | Intermittent p10/p50/p90 minutes | High-input p10 minutes | 12h non-arrivals: ordinary / intermittent / high |
| --- | --- | --- | --- | --- |
| R4-A | 61 / 180 / censored | 90 / 118 / censored | 27 | 8 / 5 / 5 |
| R4-B | 98 / 443 / censored | 105 / 172 / censored | 49 | 8 / 5 / 3 |
| R4-C | 74 / 170 / 406 | 67 / 328 / censored | 46 | 2 / 5 / 3 |

Each group has 20 trajectories and measures the first cycle only. Censored runs
completed the full 12-hour horizon and stalled at stages 103–174 with 5–9
companions. Every candidate fails the unchanged first-cycle targets; none is a
valid selection for held-out testing. These results show the earlier-prefix
adjustment did not resolve the observed fast-tail/slow-tail tradeoff. They do not
establish a universal impossibility result for all possible fixed HP functions.

## Smallest proposed amendment

Based on R2 and R4's bounded-stage failures and R3's reproduced PvP consequence,
I recommend adding only a **field-only companion base-power
curve**, applied to field damage and field party selection, while preserving
saved companion attributes, owned/PvP power, PvP serialization and PvP combat.
A fixed gentler function of capture index could reduce capture-luck gaps and
permit ordinary encounter counts. It must retain meaningful level/star/gear gains
and needs fresh registered experiments. It is outside the current approval;
do not implement it without an explicit amendment.

A capture/reward frontier could instead constrain newly acquired boss indices,
but that changes what encounters reward and does not by itself repair R3's long
one-hit plateau. It is a broader design choice, not a hidden normalization fix.

## Evidence integrity review

The revised verifier now binds original registered protocol/candidate bytes,
requires fixed 100/20 validation denominators and numerical targets, measures all
registered candidates, and compares actual compiled selection/validation code.
It also now enforces evaluator-script equality across those runs, explicit
10-cycle ordinary / at-least-3-cycle high selection horizons despite optional
overrides, and full scheduled exposure for censored trajectories. The reproduced
one-millisecond stress-row omission is rejected, and the two new horizon tests
pass independently. Full final-artifact verification awaits a selected candidate;
there has been no held-out adoption or final pacing approval.

Evidence hashes:

- `balance/round-02/report.json`: `210f209a0eb21ccd86a9d39c7728bdd5404ceb567bda1301e81d579565123859`
- `balance/round-03-profile/profile.json`: `28e82fc299cebe0c898d57b6420d677be950be36831d5aad61c7ff8596ddca7e`
- `balance/round-03-profile/candidates.registered.json`: `6c0d93bd7be4f1abffc7ed7d20794f4decf911ea13cf2b5722514aabd346e414`
- `balance/round-04/report.json`: `8e0953cbb6c57e611c5d679fd1b976883b50a2bb78e91ef88ae4c9c9142b42b8`
- `balance/round-04/candidates.registered.json`: `d2c8d095ee074b6616b92b33fb98d025e394af4cc7e7b1ead38a45487f50cc11`

Paths above are relative to `.agentdoc/v11-20260918`. This memo is generated review
evidence outside the source digest; later candidate or evaluator changes require
a new final review.
