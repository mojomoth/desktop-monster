# Fixed-count field curve proposal — awaiting scope approval

This document is algebra and design analysis only. No production source, registered protocol, candidate registration or heldout evidence was changed. None of the example constants is adopted or measured as a passing candidate.

## Exact proposed scope

If explicitly approved, keep the raw companion/PvP formula and every stored companion attribute unchanged. Add one field-only damage curve composed of (a) a gentler fixed capture-index base and (b) a predetermined accepted-hero-cycle multiplier. Use that same field power for field-party ranking, actual damage and labeled hunting-power UI. Existing level, stars, hero/type bonuses, party equipment and fever still multiply field damage.

Use `r = hero.reincarnations ?? 0`, not total `state.rebirths`. The latter also increases on stage40 soul recovery. A total-reset quadratic would let cheap retreats raise the new companion multiplier before any hero reincarnation. Never infer a missing hero count from legacy total resets.

For illustration, the requested multiplier family is `M(r) = 1 + K*r*(r+4)/4`. It depends only on a permanent accepted hero count, not time, souls, current damage, roster strength, input frequency or current enemy. Compute the rational expression with integer arithmetic and one intentional final floor. Existing counter validation and hero cap remain in force.

The corresponding fixed field HP must include the same `M(r)` factor: `HP(i,r,t) = fixedStageHP(i) * M(r) * R(t)`, where `t` is the existing total-reset counter and `R(t)` is the separately registered fixed carry-over HP adjustment. This preserves the intended growth of companion-versus-enemy damage while `R` handles retained roster/early-stage advantage. Applying an unbounded quadratic damage multiplier against only the existing saturating HP multiplier would eventually collapse later cycles. This paired change is explicitly part of the proposed amendment, not an already approved implementation.

A current saved v10 encounter must retain both its old HP and its old companion damage/selection until the next spawn; new encounters use the new rules consistently. Hero count changes only at an accepted hero reset, which also spawns a new encounter. No timer gate is added.

## Fever changes the input-ratio calculation

From `src/core/fever.ts`:20 inputs within3seconds starts5seconds of3x damage, followed by10seconds cooldown. High8/s can sustain approximately one-third fever duty; ordinary2/s and intermittent2/s cannot trigger it. Fever multiplies both hero and companion damage, so the high profile has an approximately5/3 average multiplier. This is a sustained-rate approximation; exact simulation remains necessary.

Let H denote mean non-fever hero damage per hit, including crit expectations, and C mean non-fever companion damage per second. Locally, ordinary DPS is C+2H, intermittent average DPS is C+0.5H, and high DPS is approximately(5/3)*(C+8H). Thus high time at least half ordinary time requires C>=28H, rather than the no-fever condition C>=4H. This is not a new hard gate or a claim about trajectory quantiles.

| Illustrative ordinary minutes | C/H needed for high>=120 | C/H needed for intermittent<=300 | Combined C/H | Illustrative asymptotic K |
|---|---|---|---|---|
| 240 | 28.00 | 5.50 | 28.00 | 50.10 |
| 260 | 18.00 | 9.25 | 18.00 | 32.20 |
| 270 | 15.14 | 13.00 | 15.14 | 27.09 |
| 280 | 13.00 | 20.50 | 20.50 | 36.68 |
| 290 | 11.33 | 43.00 | 43.00 | 76.93 |

The local joint minimum is near ordinary272.73minutes and C/H14.5. Choosing290minutes eases the high condition but leaves little room for intermittent play before its300minute ceiling. Those values explain the tradeoff; they do not replace the approved selection rule, whose preference remains the passing candidate closest to240minutes.

## Illustrative count factors, not production recommendations

For comparison only: level20 has base hit344; assume20 accumulated souls per completed hero cycle, baseline10% double crits (mean1.1), and five quadratic-F31 companions with capture index150, level1 andzero stars. This gives C0=4230 damage/second and H=1.1*344*(1+20r)*(1+r/4). Actual mixed party types, captures, level changes, equipment, hero buffs, fever boundaries and missing swings change the result.

| K | Completed hero cycles | M(r) | C/H | High minutes if ordinary270 | Intermittent minutes if ordinary270 |
|---|---|---|---|---|---|
| 0 | 0 | 1.00 | 11.18 | 111.3 | 304.7 |
| 0 | 1 | 1.00 | 0.43 | 46.6 | 707.4 |
| 0 | 2 | 1.00 | 0.18 | 43.2 | 864.0 |
| 0 | 9 | 1.00 | 0.02 | 40.8 | 1050.3 |
| 10 | 0 | 1.00 | 11.18 | 111.3 | 304.7 |
| 10 | 1 | 13.50 | 5.75 | 91.3 | 334.8 |
| 10 | 2 | 31.00 | 5.63 | 90.7 | 336.0 |
| 10 | 9 | 293.50 | 5.58 | 90.4 | 336.6 |
| 28 | 0 | 1.00 | 11.18 | 111.3 | 304.7 |
| 28 | 1 | 36.00 | 15.33 | 120.3 | 295.6 |
| 28 | 2 | 85.00 | 15.45 | 120.6 | 295.4 |
| 28 | 9 | 820.00 | 15.58 | 120.8 | 295.2 |
| 52 | 0 | 1.00 | 11.18 | 111.3 | 304.7 |
| 52 | 1 | 66.00 | 28.11 | 135.1 | 284.2 |
| 52 | 2 | 157.00 | 28.54 | 135.4 | 283.9 |
| 52 | 9 | 1522.00 | 28.92 | 135.7 | 283.8 |

K around28 in this deliberately simplified case restores a similar input ratio after retained souls at a270minute ordinary interval; K around52 supports the stricter240minute local ratio. Neither fixes cycle0 because M(0)=1. The first-cycle base curve, practical frontier and required level must therefore be calibrated separately. No finite chosen K handles arbitrary wealthy saves, farming or equipment without measurement.

## Remaining risks and required evidence

- Retained souls do not equal a fixed multiple of hero count: sacrifice, full-roster releases and soul recovery can add souls at unchanged r. Legacy-rich and soul-farming evidence must remain separate; this curve does not promise universal minimum playtime for arbitrary saves.
- Bound practical encounter frontiers and test ordinary roster replacement. Keeping PvP code unchanged is insufficient if normal play admits vastly larger capture indices, as R3 proved.
- First3 cycles must be explored together immediately; a first-cycle pass is inadequate. Later4–10, fixed denominators, high input, missing arrivals and unchanged selection/validation rules still apply.
- Multiplying damage and HP together can preserve long-run ratios but also make early-stage monsters much tougher on reset. Check low-index kill gaps, gear ownership/purchases, companion capture/growth and feedback cadence, rather than only final rebirth times.
- Companion-led desktop play is an acceptable explicit tradeoff under the current contract. Hero damage share is descriptive, not a new gate. Manual equipment, party accessories, companion growth and fever can remain meaningful; automatic simulation cannot certify human enjoyment.
- Index31 quadratic, K, fixed HP carry-over and later level requirements are an exploratory family only. Register a bounded candidate matrix before any measurement, preserve failed evidence, and use untouched heldout seeds only after deterministic candidate selection.

Independent Critic agrees on the fever correction, hero-count-only multiplier, asymptotic HP matching, legacy encounter preservation and separately reported rich/farming risks.
