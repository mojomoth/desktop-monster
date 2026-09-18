# v0.5 progression / economy preliminary audit

Read-only source audit: `hero.ts`, `engine.ts`, `formulas.ts`, `loot.ts`, `save.ts`,
hero tests, current identity/network boundaries, and V4 design. This is a proposal
for the later designer and critic stages, not evidence that implementation is done.

## Decisions to freeze before implementation

1. **Reincarnation levels:** for completed hero reincarnations `R`, require
   `12 + min(6, floor((R + 1) / 2))`. The next thresholds are 12, 13, 13, 14,
   14, 15, 15, 16, 16, 17, 17, then 18 permanently. Keep the existing 120 seconds
   of active engine rest after acceptance and 30-second free deferral.
2. **Duplicate mastery:** keep raw rolls uniformly 10–25 and retain the maximum
   raw roll. Each accepted return to the same form adds one stack, including
   nonconsecutive returns. Effective buff = best raw roll + stack count, in
   percentage points. The existing elemental specialization still doubles this
   amount for matching companions; party forms apply the amount to every member.
   First acquisition has zero repeat stacks; the second has one. No silent cap
   that makes a repeat worthless. Use a safe integer ceiling consistent with the
   existing one-million reincarnation parser bound and reject further overflow.
3. **Choices:** preserve three distinct IDs and elements, with the highest
   unlocked standard rank still represented while it contains unseen forms.
   Give owned and lower-rank forms nonzero weight even while unseen forms remain.
   Suggested unseen weight 2, owned weight 1. A guaranteed highest-rank first
   slot leaves two genuinely random lower-rank/repeat/rare opportunities.
4. **Rare is a collection label, not a higher numerical tier.** The 20 rare
   heroes share the existing five elements and elemental/party buff types. All
   are rank 1 for eligibility once their distinct secret requirements are met;
   rarity itself grants no additional PvP multiplier. Unlocking makes a form
   eligible; only appearing in an offer reveals its art. Choosing records it as
   owned. A reroll never bypasses a secret requirement.
5. **Gold gets predictable purchases as well as rerolls.** Add two small
   permanent upgrades and one repeatable rare-hunting consumable. Keep all
   purchases optional; the free defer/reincarnate path remains complete.

## Why the thresholds are modest

The real XP requirement is `floor(20 * 1.4^(L-1))`; monster HP rises by 15% per
depth. A fixed +2 level requirement every cycle grows far faster than the hero's
current +25% per-reincarnation multiplier. Existing mature parties also make a
repeated L12 gate effectively instantaneous, which is why V4 already has the
120-second rest.

The following exact baseline uses the existing XP/coin reward formulas and
every-eighth-monster 5x boss rewards, with no new upgrades. It measures required
kills and guaranteed gold, not time-to-kill or human enjoyment.

| Target level | Cumulative XP | Minimum sequential kills | Gold earned |
| --- | ---: | ---: | ---: |
| 12 | 1,970 | 30 | 233 |
| 13 | 2,779 | 34 | 322 |
| 14 | 3,912 | 40 | 455 |
| 15 | 5,499 | 48 | 640 |
| 16 | 7,721 | 57 | 878 |
| 17 | 10,832 | 69 | 1,224 |
| 18 | 15,187 | 80 | 1,707 |
| 20 | 29,822 | 114 | 3,363 |

The proposed plateau avoids an unlimited exponential gate while leaving the
first several cycles visibly different. Seeded simulation must check later
cycles against companions acquired in earlier cycles, not a fabricated full
roster alone. Adjust the cap down before release if returning players stall.

## Gold shop proposal

| Purchase | Price before purchase | Benefit | Limit |
| --- | --- | --- | --- |
| Weapon training | `75 * (currentLevel + 1)^2` | +5 percentage points hero PvE attack per level | 10 levels, +50% |
| Field study | `100 * (currentLevel + 1)^2` | +3 percentage points kill XP per level, floor after existing boss multiplier | 10 levels, +30% |
| Rare lure | `75 + 25 * min(100, R)` | Next 20 eligible spawn rolls use 25% rare chance instead of 10% | One active charge pack |
| Hero reroll | Existing `50 + 25 * min(100, R)` | New three-card offer | Current offer serial |

The first run's 233 guaranteed gold can buy one training level plus one study
level, or choose a reroll/lure instead. Gold, purchases and unspent lure charges
survive both hero reincarnation and legacy rebirth. No upgrade sells a direct
PvP multiplier: companion mastery remains the common PvE/PvP buff source.
Permanent training/study may be simplified to one upgrade if implementation
time makes the second one mostly duplicate UI; retain at least one guaranteed
power purchase and the consumable to avoid a reroll-only economy.

Purchase payloads must contain only an upgrade ID and expected upgrade level
or transaction serial. Derive price/benefit in core, check funds before RNG or
mutation, and atomically deduct/apply/increment revision. A stale double click,
unknown ID, NaN, maxed purchase, or second lure while one is active is a no-op.

Rare chance applies only when at least one monster currently satisfies its
requirements. Do not spend lure charges when the rare pool is empty. A rare
replacement keeps the current depth, boss cadence and base reward rules;
avoiding a rarity HP multiplier prevents unlocks from becoming progression traps.

## Discovery and history semantics

- Use one pure condition evaluator shared by hero offers, monster spawning and
  codex progress text. Conditions should be an explicit typed data union for
  species kills, total kills, active play milliseconds, equipped hero/form/type,
  accepted hero history, successful PvP wins, and UTC or explicitly local time
  windows. AND/OR must be represented deliberately, never inferred from prose.
- Display a silhouette until a monster is actually spawned or a hero actually
  appears in an offer. Unlock, discovery and ownership are different states.
  The codex can show exact discovery requirements and progress while hiding
  the name/art; this meets the user's inspectable conditions without claiming
  unrevealed art has been discovered. Show stats, description and owned mastery
  once discovered. An undiscovered silhouette must be made from the species'
  real outline rather than a generic question mark.
- Prefer broad time windows and alternative active-play conditions so shift
  workers can complete the collection. For instance, night window OR one hour
  of active play, with the chosen interpretation written in the entry.
- `killCount` already counts lifetime monster deaths. Do not reset it or add a
  second independently incremented total. Add bounded per-species counters.
- Active play is accumulated from validated positive `engine.tick(dtMs)` only;
  offline wall-clock gaps do not add playtime, consume lure/rest, or forge
  condition progress. Actual time-of-day needs a separately injected clock,
  defaulted outside core; tests inject exact boundaries.
- Existing nickname persistence and `session.setName`/`identity:setName` already
  exist. Reuse them in a Profile tab instead of introducing a second name.
  Current validation is ASCII 1–16 characters; Korean names require one shared
  client/server Unicode rule, not a renderer-only relaxation.
- Accepted hero history stores form ID, ordinal, achieved level, best raw roll,
  resulting repeat stacks, and active-play timestamp. Store compact all-time
  per-form counts for secret conditions and a capped recent event list for UI.
  A list cap must not make older hero requirements become locked again.
- Count PvP wins once from the server's successful response, keyed by result or
  match ID. Renderer-submitted `pvpResult` is currently an event bridge; do not
  treat arbitrary renderer booleans as newly authoritative win records.

## Minimal integration / migration shape

- Keep additive save v3 extensions, as v0.4 did. Add optional `journey` and `shop`
  fields with parsers, copies, `serializeSave`, `getState`, and `toSave` support.
- Extend `HeroRoll` with optional `stacks`. Keep `buffPercent` a raw 10–25 roll
  and use `heroEffectiveBuff` everywhere (UI, PvE, auto-pick, shared PvP battle).
  The current `isHeroRoll` is reused by server/network validation, so changing
  only renderer text or only engine damage would desynchronize PvP.
- Canonicalize zero-stack output without requiring a new field on V4 records.
  A valid legacy best roll retains its exact value. A previously owned form
  implies one prior acquisition; do not invent the number or order of old
  reincarnations. Show historical detail as tracked from v0.5, while preserving
  the existing lifetime `hero.reincarnations` aggregate.
- Existing owned heroes and saved current monster are already discovered on
  migration. Owned companions prove those species were encountered, but not
  exact lifetime kills. Do not backfill unrecorded species kills.
- Expand collection parser capacity from 50 to 70 and validate rare offer
  eligibility against journey data after parsing both fields. Saved choices
  must also have three distinct elements and IDs; stale choices cannot smuggle
  locked rare heroes. Preserve a valid existing V4 open offer even if the new
  next-level requirement has risen, or invalidate with an explicit migration
  reason and no resource loss; never leave an unclickable modal open.

## Required focused checks

1. Exact threshold sequence, rest/defer boundaries, invalid inputs, legacy
   current offer behavior, and restart persistence.
2. A maximum-roll duplicate still strictly increases effective buff; lower raw
   rolls never weaken it; equip alone never adds a stack; nonconsecutive repeats
   add one; duplicate/stale acceptance adds neither stack nor history.
3. Seeded samples cover all unlocked lower tiers and owned forms before all
   unseen forms are collected; three distinct elements always survive rare
   insertion; locked rare forms never enter offers.
4. Gold purchase costs/effects agree with UI, insufficient funds changes no
   state, repeated serial spends once, cap behavior, persistence, and lure
   consumption only on eligible spawns.
5. Each secret condition has an achievable witness and a near-miss; every
   dependency graph is acyclic or has an unconditional path. Time windows and
   authenticated PvP counts get boundary/replay tests.
6. Playtime/history/save corruption tests preserve unrelated progress and
   deep-copy nested maps/arrays. Old saves do not claim invented historical
   events. Discovery remains after changing heroes, time windows or rebirth.
7. Seeded fresh/mature runs at 5/15/30 active minutes compare no-spend,
   training-first, reroll-first, and lure paths. Report facts separately from
   subjective fun hypotheses; synthetic harness selftest is not balance proof.
