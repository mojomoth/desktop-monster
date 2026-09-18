# Critic: shared total-reset field multiplier

Decision: GO for preregistered candidate evaluation, not adoption. No production source or simulations changed for this review. This follows Host's shared-scale proposal, Designer's `DESIGNER_PAIRED_TOTAL_RESET_M_REVIEW.md`, and Balance's `BALANCE_TOTAL_RESET_ASSESSMENT.md`.

## The measured problem and narrower repair

The archived R18-B finite50 counterexample completed 50 legal soul recoveries in 4m15s, then accepted its first hero at 6m20s **including** those preparations. Its later hero intervals were 108m15s and 133m50s. This is a material reachable shortcut, not a p10 estimate from one seed. The original 280 heldout results remain historical measurements, but do not certify this omitted policy.

Using the same predetermined `M(t)=(4+K*t*(t+4))/4` for both field companion power and field HP, where t is total resets, directly removes the discrepancy that allowed hero-soul growth to outrun HP while accepted-hero count stayed zero. For no-soul-recovery paths t=r, arithmetic can remain byte-for-byte numerically equal. Unlike a new level26 recovery gate, the candidate preserves access and earned raw assets. This is preferable as the first bounded repair.

Cancellation of a common multiplier is not a pacing proof: integer rounding, elemental roster selection, retained equipment/party bonuses, and increased raw hero souls remain relevant. Empty-party recovery provides no companion benefit to offset the HP increase. Designer's roughly34.4x same-level HP/hero ratio is a static warning, not proof of an unacceptable stall and not an automatic reason to impose eligibility restrictions.

## Required source semantics

- Use the existing encounter `curveRebirths` snapshot for M in HP, companion damage, party selection, renderer, menu/share labels, and growth previews. HP already uses that snapshot for R. Live `state.rebirths` and accepted hero count must not silently replace it during an existing encounter.
- Keep raw saved `rebirths`, hero reincarnations, and encounter snapshot distinct. No save-count normalization, inferred history, added field, or ownership/PvP mutation. The next legitimate spawn records the live total as usual.
- Return through the legacy-v10 path before applying the new M. Legacy encounter HP, raw companion selection/damage, and FEVER3 remain unchanged until the next v11 spawn.
- Sanitize M input to a nonnegative safe integer, convert to bigint, and remove the hero-specific1,000,000 clamp. The full safe-integer quadratic is bounded arithmetic, not an exponentiation workload. Keep R's registered count cap out of M.
- Reject total reset increment or soul addition overflow before either reset is accepted; preserve state, equipment, offers and counters on rejection. Test both pure reducers and the engine.
- Remove the redundant accepted-hero HP argument so callers cannot provide two conflicting M counters. Retain accepted hero count separately in telemetry; do not relabel that field to mean total resets.

Meaningful checks include t=r equality over the first10 cycles, t>r paired scaling, saved encounter count deliberately differing from live total, v10 preservation, countcap/R versus uncapped M, MAX_SAFE_INTEGER handling, overflow rejection, and exact field/owned-PvP preview agreement. A synthetic native fixture currently containing hero1/rebirth0 must be made internally coherent without normalizing real saves.

## Proposed minimum finite-farm registration

Before any new qualifying measurement: high-input profile, the same20 exploration seeds, recovery quotas1/3/10/50, each through three hero choices within18h. At each5s decision, perform an eligible recovery while its quota remains; do not open or choose a hero until the actual recovery quota is complete. Then resume ordinary hero-ready-first behavior. Input, shop, RNG and damage rules stay those of the existing high profile.

First interval starts at time zero and includes all farming. Each quota/cycle has an unconditional20-row denominator; missing cycles are Infinity. Proposed additional design guard is nonnull p10>=120min for each of12 groups, with arrivals and incomplete quotas explicitly reported. This does not replace or relax the original280 schedule,23 timing groups, growth60, reserve20, management20, or no-reset20. It adds no upper-time claim for deliberate preparations and does not certify every possible management strategy.

Preserve full before/action/after receipts for every accepted recovery, hashed raw actions, actual count/quota completion time, subsequent cycle counts and source/compiled/evaluator/protocol bindings. Independently verify legal eligibility, exact soul grant, total increment, unchanged hero history/owned companions/wallet, reset level/XP/encounter count, and no hero acceptance before quota. Counter provenance in every field context must be independently checked. The final manifest must bind the separate finite-farm report.

Keep R18's already used125001..125100 heldout range explicitly consumed. A new source/evaluator requires a preregistered untouched range (Host proposes126001..126100), while historical R18 receipts retain their original names/hashes.

## Empty-party boundaries

Run bounded actual-core cases for stage40 with no owned companions and for legally sacrificing the last companions before recovery. Clearly distinguish a controlled valid save/RNG fixture from a naturally sampled trajectory. Preserve actual recovery/sacrifice actions, next capture, kill-gap and first-hero times, and all assets. Do not infer a new stall threshold or eligibility restriction from a ratio alone. These observations inform design acceptance separately from the fixed quantitative schedules.

Overall release approval remains pending this repair and its fresh numeric, native, performance and package evidence.
