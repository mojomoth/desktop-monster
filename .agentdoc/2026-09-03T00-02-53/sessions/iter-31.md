# Session record — iter 31

- agent role: builder
- worker: claude
- lane: .worktrees/T36 (branch lane/T36)
- harness version: v2
- task: T36 — PvP resolution in core (shared with the server)
- result: DONE
- commit: see below
- graphify affected used: none (task Files were exactly the two files touched; read
  src/core/collection.ts, rng.ts, bignum.ts directly)

## What I did

- Added `resolvePvp(attacker, defender, rng)` to `src/core/collection.ts` per SPEC F37 /
  Assumption 34: powers = Σ `companionPower` over the FULL rosters, `p = total === 0n ? 0.5
  : ratio(attackerPower, total)`, draw 1 = win roll, draw 2 = victim index (ALWAYS consumed,
  `loser[⌊rng.next() · loser.length⌋]`, null when the loser is empty), `moved = null` when the
  winner already holds `ROSTER_CAP`.
- Reused the existing `ratio` (bignum.ts) and `Rng` (rng.ts) rather than adding helpers; no
  bot/cooldown logic (server, T40). Exported through the T27 `export * from './collection.js'`
  barrel line — no barrel edit needed.
- Added 4 vitest cases with the AC's verbatim titles to `tests/collection.test.ts`: seeded
  10000-trial 1:3 statistical test (win rate 0.22–0.28), empty-loser case, full-roster case
  (both as winner and as loser), and a recording Rng proving exactly 2 draws + seed
  reproducibility.

## Files touched

- src/core/collection.ts
- tests/collection.test.ts
- .agentdoc/2026-09-03T00-02-53/sessions/iter-31.md

## Gate results

```
$ npm test
 Test Files  25 passed (25)
      Tests  375 passed (375)

$ npm run lint
> eslint . --max-warnings 0
(no output, exit 0)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output, exit 0)

$ AC line (vitest tests/collection.test.ts + 5 greps)
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- First draft of the "never moves into a full roster of 30" test asserted that a 1-companion
  attacker LOSING to the 30-companion defender still moves a companion — wrong: the full roster
  is then the WINNER, so `moved` is null. The full roster only gives one away when it is the
  loser (`seq(0.01, 0)`, p = ratio(1n, 31n)). Fixed; do not re-assert the old expectation.
