# 0.10.0 balance selection

Candidate C was selected before the held-out equipment evaluation. The selection
uses the complete exploration04 run (20 seeds × 8 registered labels ×three
checkpoints per candidate), rather than a partial pilot or successful-only sample.
The registered behavior definitions contain seven distinct behaviors: new-active
and deferred-rebirth share the ten-minute-visit control. Checkpoints and that
matching-seed control are correlated; these are not 800 independent behavior trials.

Exploration receipt:
`.agentdoc/v10-20260917T070144Z/balance-explore-04/report.json`.
Candidate registration: [BALANCE_CANDIDATE.json](BALANCE_CANDIDATE.json).
Acceptance rules: [EVALUATION_PROTOCOL.json](EVALUATION_PROTOCOL.json).

| Candidate | First common purchase, active 2h p50 | Still no common purchase at 2h | Weapon contribution to displayed attack, active 2h p50 | Active 8h temporary copies destroyed, p50 | Enhance-first 8h failed upgrades, p50 |
|---|---:|---:|---:|---:|---:|
| A |51.5min|9/20|4.74%|2,653|1|
| B |80min|8/20|16.38%|1,864|1|
| C |70.5min|2/20|21.11%|1,131|2|

A fails the preregistered minimum 5% weapon contribution. Both B and C pass the
selection checks. C gives stronger practical weapon contributions, fewer common
purchase nonarrivals and less overflow loss than B while charging higher prices.
Its risky-enhancement policy destroys more items; this is disclosed rather than
hidden by a pity rule or a maximum upgrade level. All four weapon tiers see use
under progression policies. The completed held-out result is reported separately below;
exploration alone does not establish final acceptance.

## Production values selected

- Required current hero levels: 1,5,10,15.
- Common weapon attack bonuses: 8%,20%,50%,100%; uncommon/rare/epic multiply
  those primary values by 2/4/8. Rolls are 90–110%.
- Base item prices by rarity: 4,500/18,000/72,000/288,000G, with tier price
  multipliers 1/2/4/8. Epic items cannot be purchased. Selling returns one tenth
  of the template price, including epic loot; enhancement is not refunded.
- Enhancement base costs: 100/400/1,600/6,400G by rarity, multiplied by the same
  tier factor. Each subsequent stage doubles the cost. Primary power gains 10%
  of the original rolled primary value per stage. +1..+5 are safe; at target
  t>5, success probability is19/(19+t−5), so +6=95%,+7≈90.48%,+8≈86.36%.
- Bag starts with 24 slots. Each expansion adds 8 slots; the first costs 3,000G,
  and every subsequent expansion costs twice as much. Equipped slots are separate.
- Real hourly shop stock: 12 offers. Ordinary boss equipment chance: 30%, followed
  by rarity weights 60/32/8 for common/uncommon/rare and uniform eligible templates.
- Legendary encounter chance: 4% of eligible boss spawns; epic item chance: 5%
  on a legendary kill, then uniform selection from that particular boss's table.
  Each template is substantially rarer than the overall epic drop rate.

The complete production values and compatibility lists are generated in
[EQUIPMENT_CATALOG.json](EQUIPMENT_CATALOG.json); [CATALOG.md](CATALOG.md) gives
regeneration and verification commands. [EQUIPMENT_ECONOMY.md](EQUIPMENT_ECONOMY.md)
documents arithmetic, ownership transactions, migration and probability limits.

## Interpretation limits recorded before held-out evaluation

The independent preserved 0.9.1 reference is
`.agentdoc/v10-20260917T070144Z/baseline/validation-02/report.json` (four policies,
100 seeds per policy, 1,200 correlated checkpoint rows, preserved compiled-source
hashes). Its ten-minute active visits are the closest reference control. Immediate
visits differ (old 1s, new 5s), and idle starting states differ. Equipment spending
and automated sales are new policy actions. Cross-version wallet differences are
therefore descriptive references, not a claim of isolated causal improvement.
Ordinary gold issuance per monster is unchanged and tested independently.

Purchases are only counted when an affordable offer improves actual displayed
attack. Missing purchases remain in the percentile denominator as infinity;
JSON null percentiles mean the quantile did not arrive within the horizon.
First common purchase includes both common weapons and common accessories.
Weapon contribution is the current checkpoint's attack difference when its weapon
is removed while other equipment is retained; it includes dropped weapons and is
not a direct measurement of the causal benefit of a purchase.
Gold opportunity cost includes lost enhancements and inventory expansion, not
just retained-item value. A first-tier common price of 4,500G equals 60 first
training-price units (75G); actual sequential training prices increase and cap.
The reported longest unarmed interval includes onboarding before first weapon
acquisition and is a conservative interval measure, not a separately measured
post-destruction recovery latency.

Epic theoretical nonacquisition probabilities count spawned eligible opportunities,
including the final boss if it has not yet been killed at the checkpoint. Actual
acquisitions count completed kills only. Per-template probabilities additionally
include the eligible boss-pool size and each boss's loot-table size. There is no
pity, target tracking or promised completion time.

No human enjoyment test is claimed. Exact arithmetic and deterministic simulation
cannot establish that destructive enhancement or these prices are enjoyable.

Every policy receives two minutes of continuous 2Hz input for onboarding, including
intermittent and companion-idle. Intermittent then receives input for the first
15 seconds of each minute; companion-idle receives no further input. Equipped tier
and template durations and four-copy concentration use five-second observations,
so their durations are snapshot-based approximations. All other active policies
continue 2Hz input. Enhancement-first stops its policy's attempts at +8 and ordinary
equipment policies stop at +5; these are simulated spending choices, not game caps.

## Existing gold uses and policy scope

The eight registered labels do not purchase existing training or lures. They
therefore compare the registered equipment policies, not every possible spending
strategy or an optimal route through the game. Existing training grants +5% per
level up to ten levels, costing 75×(current level+1)²G for each purchase: all ten
levels cost 28,875G for +50% trained base attack. This permanent bonus multiplies
equipment attack, remains useful alongside equipment and competes for early gold.
The first three training levels cost 1,050G for +15%, which is a materially cheaper
early attack increase than buying a first-tier common weapon.

| Static purchase | Required current hero level | Purchase cost | Attack increase before rolls | Purchase plus safe +5 cost | Attack increase at +5 before rolls |
|---|---:|---:|---:|---:|---:|
| Ten training levels | No equipment requirement | 28,875G | +50% trained base | — | — |
| Common weapon tier 1 | 1 | 4,500G | +8% | 7,600G | +12% |
| Common weapon tier 2 | 5 | 9,000G | +20% | 15,200G | +30% |
| Common weapon tier 3 | 10 | 18,000G | +50% | 30,400G | +75% |
| Common weapon tier 4 | 15 | 36,000G | +100% | 60,800G | +150% |

These are isolated nominal primary bonuses, not additive returns to add to
training. Weapon rolls range from 90% to 110%; current-level and class restrictions
can temporarily unequip a weapon after hero changes. Training has neither that
restriction nor destructive failure. The displayed comparison stops at the safe
+5 stage; higher upgrades have doubling costs and increasing destruction risk.
Boss drops can provide weapons without a purchase. Lure opportunity cost and
mixed training/equipment strategies require a separately registered experiment.

## Held-out evaluation

Candidate C passed all four registered selection checks on seeds 50001–50100: 8 policy labels × 100 trajectories × 3 checkpoints = 2,400 rows, with seven distinct behaviors and shared-seed/checkpoint correlations. The production source remained unchanged throughout the run. The independent verifier checks raw denominators, exact currency conservation, compiled candidate/source binding and recomputed summaries.

Raw and canonical summaries: `.agentdoc/v10-20260917T070144Z/balance-validation-01/report.json`. Additional reproducible tables and definitions: `.agentdoc/v10-20260917T070144Z/balance/derived.json` (generated by `balance/derive.mjs` in that evidence directory). All arrival quantiles retain nonarrivals as infinity.

| Policy | First common purchase at 2h p10 / p50 / p90, minutes | Not purchased by 2h | Current weapon contribution at 2h p50 | Purchases by 2h p50 |
|---|---:|---:|---:|---:|
| new-active | 50 / 70 / not reached | 21/100 | 19.36% | 4 |
| intermittent | 74.5 / not reached / not reached | 64/100 | 18.47% | 0 |
| companion-idle | not reached / not reached / not reached | 100/100 | 21.01% | 0 |
| wealthy-save | 0.5 / 0.5 / 1.5 | 7/100 | 22.31% | 10 |
| immediate-rebirth | 44 / 73.5 / not reached | 45/100 | 235.2% | 1 |
| deferred-rebirth | 50 / 70 / not reached | 21/100 | 19.36% | 4 |
| enhance-first | 50 / 70.5 / not reached | 23/100 | 19.35% | 3 |
| collect-first | 46.5 / 60.5 / not reached | 11/100 | 16.95% | 4 |

| Policy at 8h | Ordinary income p50 | Wallet p50 | Purchases spent p50 | Enhancement spent p50 | Expansion spent p50 | Share of available gold spent p50 |
|---|---:|---:|---:|---:|---:|---:|
| new-active | 9,950,693G | 1,040,795G | 2,272,500G | 2,657,300G | 3,069,000G | 87.11% |
| intermittent | 752,859G | 40,560G | 72,000G | 676,800G | 189,000G | 94.96% |
| companion-idle | 3,363G | 3,363G | 0G | 0G | 0G | 0% |
| wealthy-save | 12,226,127G | 1,716,363G | 3,348,000G | 2,942,300G | 6,141,000G | 87.64% |
| immediate-rebirth | 1,990,060G | 85,065G | 76,500G | 1,659,500G | 381,000G | 95.2% |
| deferred-rebirth | 9,950,693G | 1,040,795G | 2,272,500G | 2,657,300G | 3,069,000G | 87.11% |
| enhance-first | 9,872,652G | 257,989G | 1,035,000G | 7,135,100G | 1,533,000G | 96.19% |
| collect-first | 10,849,691G | 1,940,264G | 2,178,000G | 0G | 6,141,000G | 80.15% |

Each spending category includes destroyed items where applicable. Wealthy-save begins with 1,000,000G excluded from ordinary income but included in available resources. Separate medians are not an accounting identity; the exact identity passes for every raw trajectory.

| Policy at 8h | Temporary copies destroyed p50 / p90 | Enhancement failures p50 / p90 | Rebirth unequips p50 | Longest unarmed interval p50 / p90, minutes |
|---|---:|---:|---:|---:|
| new-active | 1,254 / 1,942 | 0 / 0 | 133 | 20 / 60.33 |
| intermittent | 383 / 2,782 | 0 / 0 | 200 | 21 / 159.08 |
| companion-idle | 0 / 46 | 0 / 0 | 0 | 1.83 / 479.92 |
| wealthy-save | 1,455 / 2,085 | 0 / 0 | 151 | 0.42 / 7.58 |
| immediate-rebirth | 1,138 / 2,545 | 0 / 0 | 495 | 13.42 / 55.08 |
| deferred-rebirth | 1,254 / 1,942 | 0 / 0 | 133 | 20 / 60.33 |
| enhance-first | 1,270 / 2,040 | 2 / 4 | 134 | 20 / 60.33 |
| collect-first | 1,438 / 2,203 | 0 / 0 | 131 | 13.58 / 60.33 |

The unarmed measure includes onboarding; it does not isolate recovery after a failed enhancement. Rebirth unequips count removals from equipped slots, not permanent item losses. Temporary destruction counts include replacement and confirmed hero-change deletion.

| Rebirth policy | Horizon | Tier 1 users / median minutes | Tier 2 users / median minutes | Tier 3 users / median minutes | Tier 4 users / median minutes |
|---|---:|---:|---:|---:|---:|
| immediate-rebirth | 30min | 25/100 / 0 | 35/100 / 0 | 26/100 / 0 | 26/100 / 0 |
| immediate-rebirth | 120min | 100/100 / 3.92 | 91/100 / 6.83 | 100/100 / 24.33 | 100/100 / 37.42 |
| immediate-rebirth | 480min | 100/100 / 24.33 | 98/100 / 13 | 100/100 / 106.08 | 100/100 / 287.42 |
| deferred-rebirth | 30min | 22/100 / 0 | 34/100 / 0 | 25/100 / 0 | 24/100 / 0 |
| deferred-rebirth | 120min | 99/100 / 0.83 | 82/100 / 6.33 | 95/100 / 14.42 | 96/100 / 43.25 |
| deferred-rebirth | 480min | 100/100 / 4.08 | 92/100 / 6.92 | 100/100 / 55 | 100/100 / 358.83 |

| Policy at 8h | Top weapon template | Share of equipped weapon time | Same-template four-accessory uptime | Weapon contribution points per 1,000G spent on gear, p50 | Zero-spend cases |
|---|---|---:|---:|---:|---:|
| new-active | w-staff-rare-4 | 9.04% | 0% | 0.007998 | 0/100 |
| intermittent | w-gauntlet-uncommon-4 | 5.57% | 0% | 0.35556 | 0/100 |
| companion-idle | w-gauntlet-uncommon-4 | 5.04% | 0% | undefined | 100/100 |
| wealthy-save | w-staff-rare-4 | 9.68% | 0% | 0.006159 | 0/100 |
| immediate-rebirth | w-staff-uncommon-4 | 6.93% | 0% | 0.198729 | 0/100 |
| deferred-rebirth | w-staff-rare-4 | 9.04% | 0% | 0.007998 | 0/100 |
| enhance-first | w-staff-rare-4 | 7.41% | 0.02% | 0.00482 | 0/100 |
| collect-first | w-staff-uncommon-4 | 8.16% | 0.21% | 0.009617 | 0/100 |

The final ratio divides current weapon contribution in percentage points by cumulative gross equipment purchase and enhancement spending. It includes dropped equipment and spending on accessories, and is a descriptive opportunity-cost proxy, not causal purchase efficiency. Zero-spend cases have no defined ratio; their count and the remaining ratio denominator are preserved. Accessory template uptime was not separately logged, so the template concentration table covers weapons and the four-copy metric covers accessories.

| Policy at 8h | Observed no epic | Predicted no epic | Predicted no particular epic, range over 56 templates | Eligible spawned opportunities p50 |
|---|---:|---:|---:|---:|
| new-active | 0% | 0.12% | 79.83%–85.31% | 5,077 |
| intermittent | 14% | 17.74% | 87.02%–90.87% | 1,724 |
| companion-idle | 85% | 83.73% | 99.09%–99.85% | 0 |
| wealthy-save | 0% | 0.12% | 77.31%–83.29% | 5,915 |
| immediate-rebirth | 6% | 6.32% | 81.73%–86.7% | 4,489 |
| deferred-rebirth | 0% | 0.12% | 79.83%–85.31% | 5,077 |
| enhance-first | 0% | 0.11% | 79.7%–85.21% | 4,985 |
| collect-first | 0% | 0.21% | 79.37%–84.94% | 5,331 |

The complete 56-template probability vectors remain in the canonical report. Predicted values include the last spawned boss even when still alive; observations require a completed kill. The independence formula describes the prescribed opportunities, not a completion guarantee.

Observed opportunity counts can correlate with progression accelerated by earlier drops. Their averaged predictions describe an independent model with each opportunity schedule held fixed; they are not unconditional probabilities of acquisition by a given wall-clock time.

| Descriptive old/new reference | 0.9.1 wallet p50 | 0.10.0 wallet p50 | 0.10.0 ordinary income p50 |
|---|---:|---:|---:|
| Ten-minute visits, 30min | 1,178G | 745G | 1,272G |
| Ten-minute visits, 120min | 1,017,518G | 95,863G | 1,251,960G |
| Ten-minute visits, 480min | 10,192,019G | 1,040,795G | 9,950,693G |

This baseline comparison uses different registered seed sets and equipment-enabled actions; it is descriptive rather than paired causal evidence. The old build does not spend on equipment. Gold issuance per kill is unchanged, while gear can change progression and the number of kills.

The slowest policy/horizon averaged 888.59ms of simulation processing per virtual hour, below the registered 10,000ms limit. This is a simulation harness check, not an Electron CPU or memory benchmark; native runtime evidence is separate. Human playtesting was not performed.
