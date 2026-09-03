# Session record — iter 09

- agent role: builder
- worker: claude
- lane: .worktrees/T58 (branch lane/T58)
- harness version: v3
- task: T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
- result: DONE
- commit: 9813ae7e9727322a78d341258d0322ca9c91b6f2
- graphify affected used: none (task block + SPEC F37/F62 + GAME_DESIGN_V3 §5 named every file)

## What I did

- New `src/core/battle.ts`: `Blow`, `Battle`, `BATTLE_HP_MULT = 5n`, `BATTLE_MAX_BLOWS = 200`,
  `simulateBattle(attackerParty, defenderParty)` — pure and seedless (no `rng` substring in the file).
  Both parties enter as `partyOrder(...).reverse()` (front = smallest), hp = `companionPower * 5n`,
  blows alternate A/D from the attacker between the two front members,
  `damage = effectivePower(companionPower(actor), typeOf(actor), typeOf(target))`, `hp <= 0n` shifts
  the KO'd member out. The verdict is one expression: `a.length > 0 && d.length === 0` — which gives
  empty attacker → false, empty defender → true, both empty → false, and the 200-blow cap → false,
  with no early returns.
- `src/core/collection.ts`: added `STEAL_CHANCE = 0.15`; `resolvePvp` now takes its verdict/blows from
  `simulateBattle` and consumes exactly 2 draws (steal roll, then victim index) unconditionally.
  Signature `resolvePvp(attacker, defender, rng, attackerRosterSize = attacker.length)` keeps
  `src/server/app.ts`'s v2 3-arg call compiling and its full-roster behaviour intact until T60.
  Dropped the now-unused `attackerPower`/`defenderPower` (and the `ratio` import) — nothing read them.
- `src/core/index.ts`: barrel exports `./battle.js`.
- New `tests/battle.test.ts` (4 tests) with the four AC titles verbatim.
- `tests/collection.test.ts` 18 → 21 tests: retitled the probabilistic v2 test, kept the three pinned
  titles, added the steal-roll, losing-attacker and 10 000-seeded-wins 13–17 % statistical tests.
- `tests/server/pvp.test.ts`: retitled + re-fixtured the v2 loss test to
  "losing the match moves nothing: …" (the minnow-vs-titan fixture is already a deterministic loss and
  now asserts nothing moved). Re-seeded three tests whose v2 seeds no longer pass the 15 % steal roll:
  4 → 7 (`s4` → `s7`), 8 → 35 (so the roster cap, not the roll, is what blocks the steal),
  123_456_789 → 123_456_801. `src/server/app.ts` untouched.

## Files touched

- src/core/battle.ts (new)
- src/core/collection.ts
- src/core/index.ts
- tests/battle.test.ts (new)
- tests/collection.test.ts
- tests/server/pvp.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-09.md

## Gate results

```
$ npm test
 Test Files  33 passed (33)
      Tests  530 passed (530)

$ npm run lint
> eslint . --max-warnings 0      (no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
  (no output, exit 0)

$ <T58 AC line, verbatim>
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- `battle.ts` ↔ `collection.ts` is a deliberate ESM import cycle (battle needs `companionPower` /
  `partyOrder`, collection needs `simulateBattle`). It is safe because neither module calls the other
  at module-evaluation time; do NOT "fix" it by moving `companionPower` out of collection.ts —
  AC pins `resolvePvp` and `STEAL_CHANCE` to collection.ts.
- Do not try to reach `BATTLE_MAX_BLOWS` by tuning two companions' powers: blows-to-KO in the two
  directions multiply to a constant (25 × type multipliers), so a 1v1 can never stall. The cap is
  only reachable with many members a side (the test uses 30 v 30 → 20 KOs each, still 10 alive).
- `npm run smoke` was NOT run: no file under `src/main`, `src/preload`, `src/renderer`, `static` or
  `package.json` was touched (charter §Determinism).
