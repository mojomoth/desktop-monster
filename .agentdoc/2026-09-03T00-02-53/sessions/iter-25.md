# Session record — iter 25

- agent role: builder
- worker: claude
- lane: .worktrees/T26 (branch lane/T26)
- harness version: v2
- task: T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
- result: DONE
- commit: afee6efa013d69034c631d25f19213181dcb6770
- graphify affected used: none (grepped MonsterDef/monsterForIndex directly — 4 call sites)

## What I did

- `src/core/monsters.ts`: added `BOSS_EVERY = 8`, `isBoss(i) = i >= 0 && i % BOSS_EVERY === BOSS_EVERY - 1`
  (7, 15, 23 …), `BOSS_HP_MULT = 5n`, `BOSS_XP_MULT = 5`, `BOSS_COIN_MULT = 5`.
- `monsterForIndex` now sets `boss`, `maxHp = monsterMaxHp(i) * (boss ? 5n : 1n)` and the
  `${Name} Lv.${tier + 1} BOSS` name suffix. Species cycle untouched (8 ∤ 5 → all 5 species get boss turns).
- `src/core/types.ts`: `MonsterDef.boss: boolean`.
- `src/core/engine.ts`: boss kill → `xpGained = xpReward(i) * BOSS_XP_MULT`, and `drops[0].amount *= BOSS_COIN_MULT`
  (rollLoot always puts the coin first). No new rng draw — v1 seeded event logs stay byte-identical
  ("same seed yields an identical event log" still green). `loot.ts` untouched.
- `src/core/index.ts`: barrel exports `BOSS_EVERY, isBoss` from the named monsters list.
- `tests/formulas.test.ts`: new "every 8th monster …" test (bosses 7/15/23/31/39 → boss flag, 5× hp,
  BOSS names, species cycle ghost/slime/golem/bat/dragon; non-bosses 0/6/8/14/16 unchanged; `isBoss(-1)` false);
  the existing "monsterForIndex maxHp always equals monsterMaxHp(index)" test keeps its title and now asserts
  `monsterMaxHp(i) * (isBoss(i) ? 5n : 1n)`. 11 → 12 its.
- `tests/engine.test.ts`: new "killing a boss grants 5x xp and 5x coins" (index 7 → xpReward(7)*5,
  `drops[0]` = coinsForIndex(7)*5, state coins 15; index 6 as the unchanged plain-kill control). 16 → 17 its.

## Files touched

- src/core/monsters.ts
- src/core/types.ts
- src/core/engine.ts
- src/core/index.ts
- tests/formulas.test.ts
- tests/engine.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-25.md

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  23 passed (23)
      Tests  339 passed (339)
> eslint . --max-warnings 0            (exit 0)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (exit 0)

$ <T26 AC line, verbatim>
 Test Files  3 passed (3)
      Tests  40 passed (40)
AC EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- First draft of the boss-species assertion built the expected list from `EXPECTED_ORDER.slice(2) +
  slice(0, 2)` → wrong: the boss species order is ghost, slime, golem, bat, dragon (index steps of 8,
  i.e. +3 mod 5), not a rotation of the cycle. Written out literally instead. No other dead ends —
  gates were green on the first full run.
