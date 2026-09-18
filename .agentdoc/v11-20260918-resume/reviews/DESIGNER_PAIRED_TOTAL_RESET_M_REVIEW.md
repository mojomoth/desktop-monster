# Designer decision: paired M from total resets

2026-09-18. **Explicit GO for bounded, preregistered evaluation of paired M(total resets).** This is the preferred next candidate over immediately raising soul-recovery eligibility or reducing its payout. It is not production adoption, numerical acceptance, or a claim that every farming strategy is safe. Designer performed read-only code/evidence review; no production edit or new simulation.

## Concrete recommendation

Use the existing saved total reset count `t = state.rebirths` (hero reincarnations plus soul recoveries) for the same fixed factor on BOTH v11 field companion power and field HP:

`M(t) = (4 + K*t*(t+4))/4`, with currently registered K=128.

Keep the fixed reset surcharge R separate, including its selected count cap4. Keep hero attack/soul formulas, manual equipment behavior, companion owned level/stars and raw/PvP power unchanged. Do not add a timer, observe current attack/roster power, delete assets or infer a new adaptive difficulty value. One validated count rule and exact bigint arithmetic must serve damage, party selection, HP spawn/restore/reset, hunting labels, growth previews and share cards. Preserve the old HP, companion selection and damage for the current v10 encounter until next spawn.

For normal policies without soul recovery, total resets equal accepted hero reincarnations, so the numerical mapping is identical to R18-B (subject to verifying call-site consistency and existing integer order). Soul recovery continues to be available at its current progression requirement and preserves its reward/current form. Its count now affects the same predetermined field progression factor as a hero reset.

At50 soul recoveries, M(50)=86,401. This counteracts the reproduced route where linear soul/gear hero damage dominated HP whose M remained1. Companion-to-monster scale stays paired, rather than imposing a one-sided HP surcharge. Do not describe this as preserving every player's overall DPS ratio: hero damage is not multiplied by M, type/gear effects and integer rounding still matter.

## Comparison with the alternatives

- Raising recovery to the hero required level (currently26) removes the initial stage40 farming loop, but also restricts the existing recovery option. Repeated qualifying soul resets would still retain assets while accepted-hero M staysunchanged; the threshold alone does not prove second/third hero intervals safe.
- Reducing soul payout leaves boss drops, gold, enhancement and full-roster/type advantages available from repeated early resets. It reduces the visible reward without addressing the whole loop.
- A bounded field-only soul-effect curve could reduce the direct hero shortcut while keeping saved souls, but introduces another formula/label distinction and likewise leaves gear farming. It is a fallback if the simpler paired-M candidate fails, not a concurrent change.

The paired-M candidate directly repairs the inconsistent reset count input and preserves the existing recovery choice. Do not add a recovery threshold or owned-companion requirement absent a measured boundary problem.

## Evidence and bounded risks

The archived R18-B diagnostic uses high input, seed120001, exactly50 legal recoveries, then normal hero choices. All50 before/after action receipts were verified. Farming ends at4.25min with447souls; hero intervals are6.3333min total including preparation,108.25min and133.8333min. The first hero's actual applied damage is99.25% from the hero. Its party bonus is22.32%; the trajectory has0 equipment shop purchases but12 enhancements across its three hero intervals. These facts show both the direct soul route and retained equipment opportunity. One trajectory is not a p10 failure claim.

**Empty-party boundary:** recovery is legal at index40, before guaranteed capture at boss63. Five independent35% capture misses are possible (0.65^5≈11.6%). With no owned companion, first recovery scales HP by M(1)=161 and R(1)=1.28125 while5 earned souls scale same-level hero attack by6. The resulting≈34.4× same-level HP/hero ratio is a static sensitivity, NOT evidence of a permanent or hours-long stall. Leveling and FEVER change the path. Measure it before adding any restriction. Also test recovery after legally removing the last companion.

M does not cancel stronger party accessories, better elemental reserves, rare drops or equipment enhancement gains. A farmed party can be better than a fresh party even with perfectly paired M. The real finite-farm paths must be remeasured, with actual loadouts and party bonuses retained in the evidence.

Both HP and companion calls must use the same validated nonnegative integer total. The former helper's1,000,000 cap was derived from the hero acceptance limit; total resets need an explicit shared safe-range/overflow decision so silent saturation cannot reopen the hero-only route. Gameplay maintains total resets≥accepted hero count, but parsing currently accepts the fields independently. Legacy inconsistent saves need an explicit preservation policy rather than silent deletion of counts/assets. The native field fixture currently has synthetic hero count1/total resets0; align it to a valid total if this amendment is implemented.

## Required bounded evaluation

Keep all original quantitative thresholds, policies and censor denominators/horizons intact. Add the agreed finite-farm diagnostic counts1,3,10,50: while quota remains, perform a legal recovery before choosing a hero when both are eligible; once the quota is exhausted, return to normal hero-ready-first policy. Count every preparation minute in the first hero interval, and retain second/third hero intervals, actual action receipts, souls, total and hero counts, roster, gear, enhancements and party bonus. Do not merely leave recovery behind the existing hero-ready branch, which can make a diagnostic vacuous when both are ready.

Include the zero-companion stage40 and legally removed-last-companion boundary cases. Continue the separate retained-party/manual-party-equipment, management, reserve-growth and no-reset diagnostics. A missing arrival stays visible; neither censoring nor a single safe run is a universal guarantee. Critic reviews the rule/schema and Balance performs registered measurements before Host adoption.

## Read-only binding

- `.agentdoc/v11-20260918-resume/reviews/finite-soul-farm-r18-b/result.json`: `91f5741e3db9c2673ae0f5066d9b2e64a31c295788f83d1a4f59fc4db8eb0e09`
- `.agentdoc/v11-20260918-resume/reviews/finite-soul-farm-r18-b/run.mjs`: `fb977603556d0c04d3d347ce49c3e91b1356a64d255b136be2c58bec9cf0bcab`
- `.agentdoc/v11-20260918-resume/reviews/finite-soul-farm-r18-b/evaluator.mjs`: `ebfb6320896b0e0f81595e915a1d8b9d145795b8da97b9a9fb60f4fe242088ab`
- `src/core/formulas.ts`: `159c8c6d4d6ab97155995d93428ac478837cddf4b66dc71d1cf562bf173c3bfb`
- `src/core/collection.ts`: `2f3c677365d6ee3aa3ccd151482e0a9c6fc4b1c7da8a3c58f2bd281485189ec0`
- `src/core/hero.ts`: `4f342b906624ada81d02671102a429031da85b69c93787e38e4dfe4fc15d6308`
- `src/core/engine.ts`: `8030905686033a03b05dd99b318879fb369b44367a8b986bf0cc1b06f35befb6`
- `src/core/save.ts`: `cfee1463f4c64d6168c897e9db4733c44889d8c45de94e2d9897a7c54edfca30`
- `src/core/progression.ts`: `ca5d745ac66964a4d25fa5f0508ceaa3c30076afebe094d3d087d0973aa2fa8b`
