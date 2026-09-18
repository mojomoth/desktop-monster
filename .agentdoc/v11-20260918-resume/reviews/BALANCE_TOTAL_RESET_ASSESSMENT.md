# Shared fixed total-reset multiplier — read-only assessment

No source, registration, protocol, or measurements changed. This evaluates Host's proposal after the archived finite50-farm counterexample.

## Feasibility

Current `M(r)=(4+128*r*(r+4))/4` uses accepted hero reincarnations. Replacing r with validated total reset count t on BOTH field companion power and HP preserves ordinary no-soul-reset trajectories exactly when t=r, including arithmetic order. M(0)=1, M(1)=161, M(50)=86,401. The farm50 receipt has447souls, so a linear hero-soul bonus can no longer dominate the quadratic shared field scale by taking cheap resets. Companion-only damage/HP ratio remains approximately the same after a recovery, apart from existing R/count and integer rounding.

This is not a timing proof. Farming still retains gold, gear and roster/type coverage: archived first-cycle party bonus22.32%, later41.30%, versus ordinary heldout first-cycle median8.20%. A fresh finite-farm schedule and quantitative verification are required. Hero attacks become relatively less important after soul recovery, and both hunting power and monster HP visibly jump; this tradeoff needs explicit copy/review.

## Small coherent API change

`src/core/formulas.ts:42–57`: replace accepted-hero helper with total-reset helper; fieldMonsterMaxHp already receives rebirths, so use that same count for M and the existing clamped R. Remove the redundant acceptedHeroCount argument rather than permit two different M counters.

`src/core/monsters.ts:549–558`: remove its extra acceptedHeroCount argument. Existing curveRebirths is the encounter snapshot, used for both M and R. Pure heroChoose (`hero.ts:304`), soul recovery (`collection.ts:335`), engine restore (`engine.ts:124`) and spawn/epic replacement (`engine.ts:227–231`) already supply the proper total count.

`fieldCompanionPower` and `activeFieldCompanions` keep positional shape, renaming the count argument to totalResets. Every current encounter call must pass `monster.curveRebirths ?? 0`, not live state.rebirths, and menus/share must pass `save.monsterCurveRebirths ?? 0`. A restored encounter can deliberately have an older saved snapshot than the latest state counter; HP and damage must match that snapshot. No new save field or version bump is required.

Call sites: engine.ts385/402, renderer/game.ts323, menu/index.ts524/552, menu/share.ts75/81, balance.mjs87–97 (selection, volley, growth). Evaluator action context must add explicit curveRebirths/total-reset provenance and independently verify that value; keep acceptedHeroCount separately for identity/history instead of relabeling it. Menu text currently says 영웅 환생 효과 and must explain total reset scaling.

Legacy curveVersion10 must return before either M/R logic: current old HP, raw companion selection/damage, and companion fever3 stay exact. Raw companionPower, PvP autoParty, levels/stars and saved soul/reset assets remain unchanged.

## Boundaries and regression checks

Current helper clamps r to1,000,000, matching hero counter bounds. Total resets have a different valid range: safe nonnegative integers. Remove the1,000,000 cap for the new total helper; bigint multiplication of the full safe-integer count is bounded to roughly34 decimal digits for M and has no exponential cost. Invalid counts map to0 consistently. Keeping the old cap would introduce an unrelated saturation for repeat recovery.

Guard total reset+1 overflow before accepting either reset action, otherwise a valid maximum saved count can become unsafe and subsequently normalize to0. Also reject soul-addition overflow in those reducers, which currently lack the sacrifice branch's overflow guard. These checks are directly relevant to the newly authoritative total-counter scale and must leave rejected state unchanged.

Tests should establish t=r bit equality against archived old formula on first10 ordinary counts, t>r shared M, current snapshot restoration even when live total differs, both pure reset reducers and engine first-spawn count increments, legacy unchanged, invalid/maximum-safe counts, no count clamp leakage from R into M, and old party/rawPvP preservation. Growth preview, renderer party/volley IDs, and save/share display need the same count.

## Comparison with Lv26 soul-recovery eligibility

Raising recovery eligibility from stage40 to Lv26 removes the cheap early loop but changes access to an existing feature and its UI/menu validation. It can consume hours for each recovery and can trade a ready hero choice for recovery; persistent hero offers also require explicit semantics. More importantly, existing evaluator prioritizes heroReady over recovery. At Lv26 it would always choose the hero and never exercise the proposed recovery path. Any finite-farm policy must explicitly prefer its remaining legal recovery quota before hero choice, then return to hero-ready-first after the quota. Simply raising eligibility while retaining the old stress branch would hide the path.

Shared M(t) is the smaller gameplay change: eligibility and raw rewards stay intact, ordinary arithmetic is unchanged, and the missed path can be tested directly. It still requires fresh registered source/evaluator evidence, all existing schedules/guards, and unused heldout seeds because the original125001–125100 have been consumed.
