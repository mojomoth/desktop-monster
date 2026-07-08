# Session record — iter 10

- agent role: builder
- harness version: v1
- task: T10 — Animation state machines (pure FSMs)
- result: DONE
- commit: 4d8a53f

## What I did

- Adopted T10 (first `[ ]` with deps `[x]` — T05; no `[~]` existed), flipped
  to `[~]`.
- New `src/core/fsm.ts` (pure TS, zero electron/DOM/node imports, SPEC
  F20/Assumption 9): plain `{state, t}` snapshots advanced by injected dt —
  no Date.now, no timers; presentation-only, never gates engine logic.
  - Hero: `createHeroAnim()` → `{state:'idle', t:0}`; `heroInput()` → fresh
    `{state:'attack', t:0}` (takes NO argument — the result never depends on
    prior state, so re-input mid-attack restarts by construction);
    `tickHero(anim, dt)` completes ATTACK at exactly `HERO_ATTACK_MS` (180,
    boundary inclusive) back to IDLE with excess dt carried into idle's t.
  - Monster: `createMonsterAnim()` starts SPAWNING; `monsterHit()` → HIT at
    t=0 (re-hit restarts the flash), `monsterKilled()` → DYING at t=0; both
    are no-ops returning the SAME object while already DYING (death scatter
    never interrupted/stretched). `tickMonster(anim, dt)` runs
    SPAWNING(300)→IDLE, HIT(120)→IDLE, DYING(500)→SPAWNING via a
    duration/next lookup loop, so excess dt chains transitions (one
    oversized tick can ride dying→spawning→idle); IDLE is untimed.
  - Exported duration constants `HERO_ATTACK_MS`/`MONSTER_SPAWNING_MS`/
    `MONSTER_HIT_MS`/`MONSTER_DYING_MS`; totality guard treats
    non-finite/negative dt as 0; every function returns a fresh object and
    never mutates its input.
- `src/core/index.ts` barrel: exports the 11 fsm values + type-only
  `HeroAnim`/`HeroAnimState`/`MonsterAnim`/`MonsterAnimState`.
- New `tests/fsm.test.ts` (12 tests): all 3 AC-mandated titles verbatim,
  plus pins for spawn/hit durations, flash restart, idle t accumulation,
  carryover (incl. exact double boundary → idle t=0), ignored-while-dying
  identity returns, dt totality battery, and purity/no-mutation.
- Gates → exit 0 (142 tests, 11 files). Full T10 AC line → exit 0.
- Committed feat(T10) as 4d8a53f; then plan update (T10 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/core/fsm.ts (new)
- src/core/index.ts
- tests/fsm.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-10.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22)  ✓ tests/ipc.test.ts (23)  ✓ tests/persistence.test.ts (10)
 ✓ tests/globalInput.test.ts (19)  ✓ tests/scaffold.test.ts (1)  ✓ tests/input.test.ts (9)
 ✓ tests/fsm.test.ts (12)  ✓ tests/save.test.ts (9)  ✓ tests/formulas.test.ts (10)
 ✓ tests/engine.test.ts (16)  ✓ tests/loot.test.ts (11)
 Test Files  11 passed (11) / Tests  142 passed (142)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/fsm.test.ts && grep -q "hero attack lasts 180ms then returns to idle" tests/fsm.test.ts \
  && grep -q "input during attack restarts the attack" tests/fsm.test.ts \
  && grep -q "monster dying lasts 500ms then transitions to spawning" tests/fsm.test.ts
 Test Files  1 passed (1) / Tests  12 passed (12)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — first attempt passed gates and the AC. Facts T14/T15 rely on:
  - States are LOWERCASE string literals (`'idle' | 'attack'`,
    `'spawning' | 'idle' | 'hit' | 'dying'`), not the SPEC's uppercase prose.
  - `heroInput()` takes no argument (tseslint recommended flags a sole
    unused param — do not "fix" it by adding one back). Snapshots are
    readonly; ticks/transitions return NEW objects — reassign the variable,
    never mutate in place.
  - Boundaries are inclusive and excess dt carries over; with the renderer's
    100ms dt clamp at most one monster transition fires per frame, but the
    chain loop makes oversized dt safe anyway. Detect the dying→spawning
    moment by observing tickMonster's returned state flip to 'spawning' —
    that is when T15 swaps in the next monster's sprite/tint.
  - `monsterHit`/`monsterKilled` return the IDENTICAL object while dying
    (pinned with `toBe`) — safe to call for every engine event without
    checking state first.
  - Idle t grows unbounded by design; derive bob/wobble frames with modulo
    in the renderer. Do not add wrap-around to fsm.ts.
