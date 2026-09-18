# Original-scope plateau/sawtooth assessment

Read-only design analysis; no source, registration or protocol edits, no engine
trajectories or heldout seeds. This does not certify feasibility or impossibility.

## What remains plausible

A first-cycle fixed plateau immediately after boss63 is materially different from
the failed exponential/polynomial-tail candidates. The permanent early quota
forces capture on bosses at/after63 while fewer than5 companions have ever been
acquired. Before63 there are7 ordinary35% trials. Exactly5.560753515625% already
have5 captures, so94.439246484375% receive the boss63 capture. Keeping stages0–63
cheap and concentrating fixed HP at64–70 would place most first-cycle work after
an almost deterministic raw-power anchor, without a timer or player-reactive HP.
A two-plateau shape may distribute additional work at72–74 after boss71.

This is a legitimate original-scope idea. R2/R4 do not reject it because they used
exponential tails rather than these discrete fixed stage weights. However, it is
not yet a credible complete first3/later10 solution for the reasons below.

## The guarantee does not restart

`earlyCaptureUsed` is permanent. It guarantees roster count, not a deterministic
capture index, and it is not replenished by hero reincarnation or soul recovery.
With unchanged XP, level16 is reached immediately after63, level17 after74,
level18 after88, level19 after106, level20 after127. Therefore a required level17
or higher necessarily introduces additional capture opportunities after the
almost deterministic63 anchor. Those new captures are retained across reset.

An exact finite enumeration of independent35% capture outcomes, applying the
existing conditional quota and selecting the five largest raw level1/zero-star
powers, gives the following. Species, gear, hero buffs and elemental effects are
omitted; these are raw-party distributions, not complete production timings.
No random seeds or balance simulations are involved.

| Next encounter / endpoint | Raw DPS p10 | p50 | p90 | p90/p10 |
|---|---|---|---|---|
|64, immediately after63|3,334|3,693|4,778|1.43|
|75, level17 ready|4,791|13,663|14,740|3.08|
|89, level18 ready|13,900|96,676|140,512|10.11|
|107, level19 ready|44,732|337,736|1,229,638|27.49|
|128, level20 ready|140,512|8,757,160|34,055,155|242.36|

For a companion-only single fixed-HP plateau with the same retained party, high
fever makes its time approximately0.6 of ordinary time. High p10>=120 therefore
requires ordinary p10>=200; ordinary p90<=360 allows at most1.8x between those
quantiles. Since plateau time is inversely proportional to fixed party DPS, raw
DPS p90/p10 must be<=1.8 in this stripped model. A scalar HP multiplier cannot
repair the3.08x or larger retained-party spread. This is a necessary condition
for that model, not a theorem about the complete game or arbitrary HP sequences.

## First-cycle two-plateau diagnostic

A small analytic grid examined101 nonnegative HP weight mixtures between64–70
and72–74. It enumerated250 exact joint capture outcomes through71 and used
level16 hero hit212, mean critical factor1.1, input rates2/0.5/8, high fever
factor5/3, instantaneous intervening stages, and neutral elemental multipliers.
It applied the existing first-cycle quantile limits to these idealized times.
There was no engine run and no registered candidate selection.

No grid point satisfied every bound. The nearest allocated75% of plateau HP after63
and25% after71. At its largest allowed scale it yielded:

| Profile | p10 / p50 / p90 minutes |
|---|---|
|Ordinary|232.0 /278.6 /300.5|
|Intermittent|248.2 /300.0 /329.0|
|High|110.6 /130.5 /134.4|

It would need8.47% more total HP to bring high p10 to120, exceeding the intermittent
median ceiling. This makes the idea strained, but does not reject continuous
weights between grid points, additional plateau phases, actual elemental mixtures,
or other allowed fixed tier shapes. Types and sparse captures can add variation;
actual hero/party equipment and fever boundaries must be measured in production.

## Why there is no general impossibility proof

A fixed hero-reset-tier curve can move later-cycle work to low-level early
encounters. There hero base damage is small while retained companions already
exist. This can avoid the late-level hero/soul input-ratio problem without changing
companion power, so that ratio alone does not rule out all original-scope curves.
Similarly, different stage weights can exploit correlations between earlier
captures and later party power; a single scalar impossibility argument cannot
cover every such sequence.

Those choices have concrete drawbacks: a few very long early encounters provide
few rewards, enemy-type variance is averaged over fewer kills, and retained-party
strength still differs by capture history. Increasing the first frontier adds
capture opportunities but also magnifies raw exponential-power variation. These
are design evidence and investigation costs, not newly invented numeric gates.

## Honest recommendation

Describe original scope as unvalidated, not mathematically impossible. There is
one identifiable remaining family (cheap capture approach plus fixed post63/71
plateaus, with separately registered later-cycle stage weights), but no demonstrated
candidate that can be responsibly called likely to satisfy first3 and later10.
A bounded preregistered first3-cycle diagnostic could still test it if desired;
there is no basis to claim a production pass or to secretly change capture/PvP.
The requested field-only curve amendment addresses the measured raw-power variance
more directly. Until approval or additional original-scope evidence, keep balance
adoption unfinished and retain all existing target and evidence requirements.
