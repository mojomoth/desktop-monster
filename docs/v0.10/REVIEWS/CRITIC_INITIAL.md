# Independent Critic — initial implementation observation

Author: `/root/harness_critic`. This is an initial review, not final approval, a
source-bound release gate, native gameplay evidence, or completion of the ordered
Designer → Critic → Balance → Host review.

## Checks observed

`npx vitest run tests/v10Critic.test.ts` passed all 7 tests at 2026-09-17
16:18:26 KST. These independently check 224 catalogue entries, four separate
copies of one accessory, 36 exact exhaustive small-inventory optimizer cases
(including displayed-attack rounding ties), temporary batch replacement,
stale/duplicate hero confirmation, strictly decreasing positive rational
enhancement probability, unaffordable billion-stage exponential quotes without
large integer allocation, and rejection sampling across 32-bit boundaries.
Production sources are still being edited. Repeat this check after integration;
this observation does not bind the final source. No global gates were run.

## Findings and responses

- HC-01–03: initial harness ownership, stale dependency evidence, and missing
  artifact-set checks were recorded with frozen source snapshots in
  `.agentdoc/v10-20260917T070144Z/reviews/critic-live-01/observations.json`.
  Host added overlap enforcement, current dependency digests and exact artifact
  sets. Their independent adversarial verification remains pending.
- HC-04: the candidate lists metrics without numerical selection/acceptance
  bounds. Balance proposed first useful purchase p50 15–90 minutes and p90 at
  most 180 minutes, at most 20% missing first boss equipment by 30 minutes, and
  at least 80% reaching legal tier-four level by two hours. Register the exact
  definitions and policy scope before candidate holdout runs. A never-purchaser
  must remain in the denominator. These are proposals, not measured passes.
- Equipment initially added a flat weapon value to an already scaled hero:
  a 960-point legendary weapon added only 0.055% to one representative 8-hour
  baseline hero. Balance accepted the counterexample and changed weapons to a
  base-relative percentage multiplier. Catalogue and protocol descriptions must
  agree with this change. New hero damage, boss cadence and currency outcomes
  still require candidate measurements; no coin-income inflation is authorized.
- The shared combat snapshot guard currently checks form identity but not
  `HeroRoll.buffPercent` and `stacks`. Reuse `isHeroRoll`; malformed snapshot
  values must fail before HTTP/PvP arithmetic. Reported to Balance.
- Exact currency parsing now deliberately throws for invalid currency instead
  of rounding or zeroing it. Old `parseSave` comments promise it never throws.
  Audit boot, capture-state, save-state, recovery checkpoints and pending
  transactions for caught failure and original-file preservation. A failed
  capture must release or reject its outstanding promise deterministically.

## Baseline handoff — still running

The preserved v0.9.1 compiled core is being measured independently, without
executing the evolving production source. Session ID: **71544**. Do not stop or
rerun this command over its existing output directory.

```
node .agentdoc/v10-20260917T070144Z/baseline/measure-baseline.mjs .agentdoc/v10-20260917T070144Z/baseline/validation-01 100
```

100 seeds × four policies, observed at 30 minutes / two hours / eight hours.
Policies: no hero choice, immediate first hero choice, first choice every ten
minutes, and idle with five starting companions and ten-minute visits. No
purchases or companion management. The idle fixture differs from active fresh
starts; checkpoints on one trajectory are correlated. This is virtual core
simulation, not native performance or human play.

Last polled progress: 70/100 seeds. `raw.jsonl` continues growing and `report.json`
will be written only after all trajectories finish and source hashes still
match. The one-seed pilot has already passed the independent verifier. Validate
the complete run with:

```
node .agentdoc/v10-20260917T070144Z/baseline/verify-baseline.mjs .agentdoc/v10-20260917T070144Z/baseline/validation-01/report.json
```

The verifier checks raw hashes, preserved input/script hashes, 1,200 unique
checkpoint rows, 400 trajectories, input and action counts, monotonic counters,
level-residence totals, and independently recomputed quantiles. Until that
passes, partial-run gold distributions are exploratory only. The main early
constraint is robust: hero-choice policy and rare companion captures cause
large nonlinear gold spread, so a single average gold/minute cannot set all
shop prices or establish current-level tier accessibility.

## Pending release review

Candidate policy experiments and source-bound protocol; full save/IPC/HTTP
currency migration and failure paths; hero-change target/offer binding through
the reducer; shared-frame save atomicity; PvP actor/target replay validation;
native distinct-shape and attachment evidence; global gates and required native
performance sessions; macOS and Windows packages. All remain pending here.
