# Approved field-curve execution design

Designer: `/root/menu_review`, 2026-09-18. Root relayed explicit user approval to broaden the implementation to field-only companion power and a fixed accepted-hero-count multiplier with corresponding field HP. This converts the prior Designer proposal and `balance/FIXED_COUNT_PROPOSAL.md` into implementation boundaries; it does not adopt an unmeasured numerical candidate.

## One field power, separate owned/PvP power

Keep `companionPower`, `activeCompanions`, `autoParty`, manual PvP party resolution, battle/network payloads, saved companion attributes and collection arithmetic unchanged. Add `fieldCompanionPower` and `activeFieldCompanions` for hunting only. No input-frequency, elapsed-time, player-relative damage or current-enemy HP feedback is allowed in their formula.

The starting registered family is:

```
B(i) = max(1, floor(monsterMaxHp(i) / 20))
F(i) = B(i)                                  for i <= 31
       floor(B(31) * (i + 1)^2 / 32^2)        for i > 31
r = hero.reincarnations ?? 0
M(r) = (4 + K*r*(r+4)) / 4
fieldPower(c,r) = floor(F(c.bossIndex) * c.level * 2^c.stars * M(r))
fieldHP(i,r,t) = floor(fixedStageHP(i) * M(r) * R(t))
```

Subsequent bounded experiments authorized by Host generalize the tail to
`B(31) + S * (floor(B(31) * (i+1)^p / 32^p) - B(31))`, with fixed `p` in `{1,2}`
and a registered positive integer scale `S`. The splice stays continuous and
the level/star/count/modifier boundaries below remain the same. `p=2,S=1`
recovers the starting proposal. Linear versus quadratic and scale selection
remain Balance's measured candidate choice, not a renderer decision.

`K`, stage HP, fixed total-reset factor `R(t)` and required-level parameters belong to Balance's preregistered bounded candidates and unchanged selection/heldout rules. Do not round `M` to an integer before multiplication; combine rational multipliers and perform the intentional final integer division. Do not compute exponential `B(i)` for indices after the splice. The approved source of `r` is accepted `hero.reincarnations`, never total resets or a value inferred from legacy saves. Stage-40 soul recovery cannot increase `M`.

Preserve the existing full level/star effect, equipped hero type bonus, party equipment bonus, type effectiveness, fever and staggered volley timing. The multiplier may make hunting companion-led; that is an explicit design tradeoff, not a claim of human enjoyment. Hero equipment comparisons continue to use actual hero attack and must not alter companion base power.

## API and party contract

The following signatures are agreed with Balance:

```
fieldCompanionPower(c, acceptedHeroCount = 0, curveVersion = 11)
activeFieldCompanions(cs, enemyType?, heroRoll?, acceptedHeroCount = 0, curveVersion = 11)
fieldMonsterMaxHp(index, totalResets = 0, curveVersion = 11, acceptedHeroCount = 0)
```

For new encounters, rank by type-adjusted, hero-buffed field power, then unbuffed field power, then the existing numeric companion ID. Use the same function for engine volley booking, current actor damage, field renderer membership, recovery/steal pop-in and loss scatter locations, and menu hunting-party shares. Ranking must not reintroduce the exponential raw/PvP value as a tie-breaker. Keep `partyOrder` as a separate stable size-based back-to-front drawing order; it is visual layering, not combat rank. Replay parties and result data continue to use their recorded PvP lineup.

The proposed signatures append context to the old selection arguments so callers make the accepted count and encounter version explicit. The engine owns numeric validation and exports through the existing core barrel. The renderer must not duplicate the formula or infer it from monster index. Menu code resolves the currently saved encounter metadata and uses the same core functions.

## Legacy encounter and reset boundary

A saved v10 encounter, including an absent version interpreted as 10 by the existing loader, retains its frozen HP and exact legacy companion damage **and selection**. `fieldCompanionPower(..., 10)` delegates to `companionPower`; `activeFieldCompanions(..., 10)` delegates to `activeCompanions`, preserving its current tie rules. The first new v11 spawn switches HP, field selection, damage, labels and shares together. Do not refill HP or rewrite stored companion power on upgrade.

An accepted hero reset changes `r` and creates a new encounter. A soul-only reset changes `t` and creates a new encounter without changing `r`. Restart reconstruction must produce the same encounter HP/party as the saved state. Balance should use the already validated saved hero count when reconstructing HP; missing hero history remains zero, never total resets. Existing level/star/training changes still affect the ongoing encounter exactly as collection actions do today.

## User-visible meaning and verification

Retain the owned/raw value and add a clearly labeled `사냥 공격력`. Its number is the current encounter's field base including level, stars and accepted-count multiplier; explain that hero, equipment, type and fever modifiers apply in combat. For a current v10 encounter it shows the legacy number until the next spawn. Field party membership/share previews use current target type and applicable field modifiers; PvP preview and owned stats remain raw. Growth/fusion must refresh both values while preserving the in-progress menu selection, focus and disclosures.

Use a discriminating roster: a trained earlier capture must enter the five-member hunting party while a later untrained capture wins under raw PvP power. Test both selection modes, legacy-to-new spawn, trained/stat changes on the next frame, typed hero bonus, and numeric-ID ties. Verify rendered sprites and companion hit actors agree with core hunting membership. Exercise stolen/recovered/lost companions whose field and raw membership differ; replay stays on recorded PvP fighters. Native verification and menu labels belong to Host; renderer implementation/tests belong to Designer; numeric distributions and core invariants belong to Balance; Critic reviews independently.

Timing targets, first three and later cycles, sample denominators, censor handling, untouched heldout seeds and the no-time-lock rule remain unchanged. First-cycle and repeated-cycle distributions must be measured together. Continue reporting reward gaps, bounded capture frontiers/raw PvP growth, ordinary roster replacement, retained wealth and soul-farming risks. Failed historical evidence remains preserved. Nothing here claims the current candidate satisfies those gates.

## Renderer/performance scope

Designer first edits only `src/renderer/game.ts` and `tests/renderer.test.ts` for field-party integration. Performance investigation may read the render path and retained profiles; any further source ownership is agreed with Host before edits. Keep actual scheduling and animation durations unchanged. No arbitrary FPS reduction, skipped gameplay updates, or removal of required visual effects is authorized as a substitute for finding the cost. The prior incomplete profile cannot establish candidate causality or clear the failed long-duration performance gate.

Host subsequently approved isolated `tests/renderer-field-v11.test.ts` and
`tests/share-field-v11.test.ts` to exercise activated parameters without changing
the default renderer/share test modules, plus the existing v11 native scenario,
fixture and unit-test files. The new native `field-party` scenario adapts only
its synthetic trained companion level to the packaged curve so it always has
independently required membership changes (legacy c6 → hunting c5 → grown c6).
It rejects a neutral/unadopted package and never injects gameplay time or state.
Host owns sprite batching, audio mute optimization and their native performance
validation; Designer does not change those paths.
