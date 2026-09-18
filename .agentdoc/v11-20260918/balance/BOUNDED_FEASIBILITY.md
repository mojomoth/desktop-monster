# Bounded fixed-curve counterevidence (R4)

All three preregistered candidates failed the approved first-cycle pacing gates. This finite search does not prove that every fixed curve is impossible. No candidate has been adopted and no heldout seed has been run.

Each candidate measured 20 exploration seeds for each of ordinary 2/s, intermittent 2/s for 15 seconds each minute, and high 8/s, with a 12-hour first-cycle horizon. Missing arrivals remain in the quantile denominator.

| Candidate | Profile | p10 / p50 / p90 (minutes) | Nonarrivals / 20 |
|---|---|---|---|
| R4-A | ordinary | 61.4 / 180.4 / censored | 8 |
| R4-A | intermittent | 89.8 / 118.3 / censored | 5 |
| R4-A | high | 27.1 / 125.7 / censored | 5 |
| R4-B | ordinary | 97.5 / 442.5 / censored | 8 |
| R4-B | intermittent | 105.2 / 171.8 / censored | 5 |
| R4-B | high | 48.6 / 124.5 / censored | 3 |
| R4-C | ordinary | 73.8 / 169.5 / 406.2 | 2 |
| R4-C | intermittent | 67.2 / 327.5 / censored | 5 |
| R4-C | high | 45.8 / 116.2 / censored | 3 |

R4-A/B/C require hero levels 20/21/22, lower early field HP growth to 1.13/1.13/1.12 through index79, then use fixed exponential tails 1.18/1.17/1.165. The intended first-cycle frontiers remain approximately127/152/183. These candidates leave capture probability, owned companion power, PvP, XP and input behavior unchanged.

Censored trajectories stopped at indices103–174 with5–9 companions. Ordinary first-purchase counts were0/4/2 of20 acrossA/B/C; intermittent0/2/2. Thus these candidates also leave sparse equipment spending during long waits. Those reward-cadence values are descriptive design evidence, not a retroactive numeric gate.

The concrete mechanism agrees with R2: a later capture changes raw companion base by roughly1.15^8 per boss, while missed captures allow field HP to advance without a comparable permanent damage gain. Four missed35% capture rolls are locally possible with probability17.85% and span roughly87.6x raw companion power. This is not a whole-run failure probability.

R3 used a polynomial field tail and about50k encounters to distribute progression time across many kills. Its one-seed profile reached222/197/196minute cycles, but about99% of kills were companion finishing blows. A reproducible sacrifice-and-recapture path at index49,959 produced a3033-digit PvP companion. The full round was cancelled with12 completed rows and immutable registration/source/compiled data retained. It is inadmissible for adoption.

The smallest proposed scope amendment is a fixed field-only companion base-power curve, used consistently for field party ranking and field damage. Preserve stored companion attributes, raw/PvP power, PvP party/ranking/replay/snapshots, capture rewards, level/star scaling, elemental multipliers, equipment effects and fever. A possible registered family retains raw base through index63 and changes only later field-base growth to a gentler fixed polynomial. Its concrete constants must come from new exploration and heldout evidence; this memo does not authorize or claim a passing design.

Retained companions and soul farming must still be evaluated through the approved first3/later10 schedules and separate adversarial profiles. The existing fixed rebirth-count HP multiplier remains the authorized lever for permanent reset carry-over. Normal late-stage roster replacement must be included as descriptive stress evidence, because the prior no-management policy hid R3 capture exposure.

Evidence hashes:

- `round-02/report.json`: `210f209a0eb21ccd86a9d39c7728bdd5404ceb567bda1301e81d579565123859`
- `round-03-profile/profile.json`: `28e82fc299cebe0c898d57b6420d677be950be36831d5aad61c7ff8596ddca7e`
- `round-03/CANCELLED.json`: `15f39b76752dfd6c988bb7ce0b44446e98dc70e0c8c2667f6a9df6da8a07ec59`
- `round-04/report.json`: `8e0953cbb6c57e611c5d679fd1b976883b50a2bb78e91ef88ae4c9c9142b42b8`
- `round-04/candidates.registered.json`: `d2c8d095ee074b6616b92b33fb98d025e394af4cc7e7b1ead38a45487f50cc11`


## Unresolved retained-soul sensitivity of the proposed index31 quadratic

This is a rate comparison, not simulated pacing or an adopted parameter choice.
Let H be one ordinary hero hit after permanent progression, C the companion damage
per second, and temporarily omit elemental/fever/critical effects. With input rates
2/s,0.5/s and8/s, the relative interval is inversely proportional to C+2H,
C+0.5H and C+8H. To keep high-input time at least half ordinary time requires
C >=4H. To keep intermittent time no more than5/3 of ordinary time requires
C >=1.75H. These ratios describe a local fixed-HP segment; the actual gates use
full trajectories, conditional party changes and distinct quantiles.

For an illustrative level20 hero, H=344*(1+souls)*(1+0.25*reincarnations).
The proposed F31 quadratic gives846 base power at capture index150. Five such
level1,zero-star companions produce approximatelyC=4230 per second before other
multipliers. Holding that party and level fixed while assuming20 additional souls
per cycle gives:

| Completed hero resets | Illustrative souls | Hero hit H | C/H | High interval if ordinary is240min | Intermittent interval if ordinary is240min |
|---|---|---|---|---|---|
| 0 | 0 | 344 | 12.297 | 169.1 | 268.1 |
| 1 | 20 | 9,030 | 0.468 | 70.0 | 611.7 |
| 2 | 40 | 21,156 | 0.200 | 64.4 | 754.3 |
| 9 | 180 | 202,358 | 0.021 | 60.5 | 931.1 |

Thus a passing first cycle would not establish the repeated-cycle objective.
A fixed rebirth-count HP multiplier stretches all three durations equally at a
fixed segment, so cannot alone repair a damage-contribution ratio. Raising later
required levels changes the encountered ranges and party/hero powers and must be
measured, while keeping practical capture indices bounded. A coherent fixed-count
field-power scaling could also alter the ratio, but it is an additional design
choice to include explicitly in any scope amendment; it has not been implemented
or authorized by this memo. Owned stats/PvP power, timers and player-reactive HP
remain outside the proposed change. Gear usually increases H, and field hero/type
buffs change C, so this table is not a substitute for the registered simulation.
