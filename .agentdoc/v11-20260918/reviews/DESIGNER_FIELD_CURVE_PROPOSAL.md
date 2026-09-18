# Field companion curve: proposed scope amendment

Designer: `/root/menu_review`. Date: 2026-09-18.
Status: reviewable proposal only. User amendment is pending. No production source,
candidate, protocol, acceptance target or saved data was changed for this proposal.

## Decision and evidence

If the current authorized fixed-HP/required-level/rebirth-count search cannot find
an acceptable result, add one fixed **field-only companion base-power function**.
Retain saved companions, owned power, PvP calculations, capture probability, XP,
rewards, input cadence and modifier rules. This is a starting candidate for a new
registered experiment, not a claim that it meets pacing or human enjoyment goals.

The reviewed R3 profile has a numerical 222-minute first interval but reaches
49,960 encounters. After its early slow segment, each later 30-minute checkpoint
adds exactly 9,000 companion kills and no hero kills. The longest kill gap is
11.125 minutes; level 18 arrives at 52.65 minutes, then level 33 at 59.65 minutes.
The first purchase is at 56 minutes; only four purchases occur across three
cycles. These outcomes make a long rebirth timer insufficient evidence of useful
growth decisions. They are one simulated trajectory, not human fun measurements.

The Critic also demonstrated that a normal late roster replacement can capture a
boss with index 49,959 and acquire a 3,033-digit PvP power. Preserving formulas
alone does not preserve practical competition when newly reachable stages expand
that far. R3 is therefore unsuitable for adoption in its current form.

R4 tested a bounded frontier and all registered candidates failed the existing
targets. Balance reports ordinary 12-hour non-arrivals of 8/8/2 of 20 and
intermittent non-arrivals of 5/5/5, with high-input p10 intervals 27–49 minutes.
These reject those candidates; they do not prove every possible fixed HP curve
impossible. This proposal addresses the observed capture-luck mechanism directly.

Evidence: `CRITIC_BALANCE_FEASIBILITY.md` in this directory;
`../balance/round-03-profile/profile.json`; and the R4 records referenced by the
Critic. Vendor design references are the pinned RPG `stats-combat-quests.md`
(separate base and modifiers; growth choices) and level-design `pacing-and-flow.md`
(vary challenge and release instead of maintaining a long flat segment).

## Exact starting function

Let `i` be the companion's saved `bossIndex` and
`B(i) = max(1, floor(monsterMaxHp(i) / 20))`, the current owned base.

```
F(i) = B(i)                                      if i <= 31
       floor(B(31) * (i + 1)^2 / 32^2)          if i > 31

fieldCompanionPower(c) = F(c.bossIndex) * c.level * 2^c.stars
```

The existing curve gives `B(31) = 38`. Evaluate the second branch directly with
integer/BigInt arithmetic; do not calculate the exponentially large `B(i)` first.
No player attack, current enemy HP, session clock or elapsed play time enters F.

| Capture index | Existing owned/PvP base | Proposed field base |
| --- | ---: | ---: |
| 7 | 1 | 1 |
| 15 | 4 | 4 |
| 23 | 12 | 12 |
| 31 | 38 | 38 |
| 63 | 3,333 | 152 |
| 95 | 291,920 | 342 |
| 127 | 25,562,052 | 608 |
| 151 | 731,718,268 | 857 |
| 183 | 64,072,960,198 | 1,256 |
| 255 | 1,502,862,661,269,413 | 2,432 |

The first four boss bases remain exact. Splicing at 63 would already retain a
3,333 base before level, stars and a five-member party; that risks leaving ordinary
hero/weapon gains too small. The earlier splice makes later base values hundreds
to low thousands in the intended bounded stage range. This supports meaningful
manual attacks as a hypothesis to measure, not a guaranteed damage-share target.

Four missed boss captures create a 32-index potential gap: after index 63 the
candidate ratio to index 95 is 2.25, compared with approximately 87.6 under the
current exponential base. At index 127 to 159 it is approximately 1.56. These are
local base ratios, not whole-session non-arrival probabilities.

## Invariants and integration boundary

- Keep `companionPower`, saved attributes, collection operations, `autoParty`,
  PvP party selection, combat, wire payloads and server calculations unchanged.
  Existing owned/PvP values retain their exact meaning.
- Multiply the new base by the existing full `level * 2^stars`. Preserve hero
  buffs, type effectiveness, equipment party bonus, fever and volley timing.
  A companion level increase and a star still have their existing proportional
  effect. Reincarnation from level 10 to level 1 plus one star still retains 20%.
- Use the same field power for field party ranking and field damage. Field ties
  should use field power then the existing deterministic ID order, not secretly
  reintroduce raw exponential power as the deciding base.
- Keep manual equipment comparison based on actual hero attack. The companion
  curve must not scale itself when a weapon changes. Party-bonus equipment keeps
  its existing multiplier, so both hero and companion equipment retain effects.
- Use separately named `fieldCompanionPower` / `activeFieldCompanions` paths to
  keep the unchanged raw/PvP call sites easy to audit. Update engine field volleys,
  renderer field party/recovery placement and the field-party share preview.
- Preserve an upgraded save's current encounter: while its saved monster curve
  version is 10, use legacy companion damage **and selection** for that encounter.
  Once the next version-11 monster spawns, use the new field function. No HP reset,
  retroactive save rewrite or mid-encounter power switch is needed.

## UI and native expectations

Add a clearly labeled `사냥 공격력` beside the retained owned/PvP value. The field
number includes the companion's level/stars; a short explanation can state that
hero, equipment, type and fever modifiers apply during combat, as they do today.
If the current legacy encounter still uses its old curve, its field display and
party preview must agree with that encounter until the next spawn.

The field lineup may now differ from the PvP lineup. Native verification should
use companions where a trained earlier capture beats an untrained later capture
under F, while their raw ordering differs. Confirm that field sprites, hit actors
and field-party share preview match the field order; PvP preview remains raw.
After growth/fusion, both labels must update without discarding growth selection,
focus or disclosure state. Capture comparison and the manual equipment tests must
still show that new stronger items upgrade the actual selected loadout correctly.

## Tradeoffs and next evidence

Existing companions captured after index 31 will attack for less in new field
encounters. Their stored and PvP stats are preserved, but that is still a visible
field nerf and must be communicated plainly. Players can retain a trained earlier
capture for longer; constant replacement by capture depth matters less, while
levels, stars and type choices matter more.

Reduced companion dominance also makes 8 inputs/second more consequential than
in R3. Repeat the registered ordinary, intermittent and high-input experiments;
do not assume a good ordinary median protects the high-input minimum. Retained
five-member parties and inventory must be tested through the required later
cycles with the already authorized fixed rebirth multiplier, plus legacy-rich,
growth/star and roster-replacement profiles. Do not introduce a time gate, damage
cap, hidden player-relative HP or a level/star compression to rescue this proposal.

Balance identified a specific repeated-cycle risk: hero attack grows with retained
souls and reincarnations while a static roster's field bases do not. As an
illustration, 20 retained souls per cycle would turn a 344 hero base into roughly
70,000 after ten cycles before the additional reincarnation multiplier; an
unmanaged index-150 companion remains around 1,000 before its modifiers. That is
an assumption illustrating sensitivity, not a measured R4 outcome. A fixed HP
multiplier changes absolute duration but cannot fix the ratio between 2/0.5/8
input rates once hero damage dominates. Test repeated cycles early; the splice at
31 is an explicit starting hypothesis and must not be treated as validated merely
because its first-cycle arithmetic is attractive.

Keep the existing sample counts, censor handling and timing acceptance targets.
Record actual bounded encounter frontiers and newly attainable raw PvP power;
even 150–300 encounters need this check. Also inspect reward timing, longest
kill gaps, captures, purchases, level spacing and effective hero/companion damage
contribution. Finishing-blow share alone can hide meaningful hero damage, so any
added damage diagnostic should exclude overkill. These are review diagnostics,
not silently invented replacement pass/fail gates.

If the newly registered measurements still show long stalls, a companion-only
one-hit plateau, unusable weapon choices or premature repeated rebirths, retain
that failure and review it before changing another system. Native elapsed timing
and later human fun review remain separate from these deterministic simulations.
