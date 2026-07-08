# Session record — iter 15

- agent role: builder
- harness version: v1
- task: T15 — Kill/loot/spawn/level-up presentation
- result: DONE
- commit: 0fc5875

## What I did

- Adopted T15 (first `[ ]` with dep T14 `[x]`; no `[~]` existed), flipped to
  `[~]`. All presentation-only, driven by engine events (Manual M3).
- `src/renderer/anim.ts` (+3 systems, all pooled in the existing 200-cap
  particle pool or their own fixed pool):
  - `spawnSpriteScatter(pool, sprite, frame, x, y)` — one gravity particle
    per opaque pixel at its own position/color (`SCATTER_GRAVITY=260`,
    `SCATTER_LIFE_MS=500` = the FSM dying duration). Velocities radiate from
    the sprite center with jitter derived from pixel coordinates — NO rng
    draws consumed, so seeded engine event logs stay byte-identical.
  - `spawnSparkles` — deterministic ring of floaty yellow/white sparkles
    (level-up burst at the hero, collection pop at the counter).
  - Pooled `DropAnim` flight (`DROP_POOL_SIZE=8`, oldest-slot recycling):
    `dropPosition` is pure — first hop (peak 12px) → ground bounce (peak
    4px) over `DROP_ARC_MS=600`, then `easeInQuad` fly to the HUD counter
    over `DROP_FLY_MS=300`; exact endpoints. `tickDrops` raises a one-shot
    `arrived` flag the consumer clears.
- `src/renderer/hud.ts`: `LEVEL_UP_TEXT='LEVEL UP!'` banner (single timer
  slot: `createBanner/showBanner/tickBanner/drawBanner`; `BANNER_MS=1200`,
  scale 2, yellow/white flash every 100ms, centered at `BANNER_Y=20`);
  `drawCounters` gained an optional `coinPop` param (`COUNTER_POP_MS=150`):
  the coin count flashes white and the icon lifts 1px.
- `src/renderer/game.ts`: monsterKilled → scatter the tier-tinted sprite +
  FSM dying (HP bar hidden while dying); monsterSpawned → deliberate no-op
  (the FSM's dying→spawning transition brings the new monster in, per the
  iter-14 note); spawning → bottom-up pop-in reveal (`drawSpriteBottomRows`
  with `easeOutQuad` progress); itemDropped → staggered drops launched at
  `MONSTER_X-6`; levelUp → banner + 12 hero sparkles; drop arrival (in
  update()) → counter pop + 6 sparkles. Boot now starts the monster anim in
  IDLE (`tickMonster(createMonsterAnim(), MONSTER_SPAWNING_MS)`) — pop-in
  is for kill-born spawns only, and the fresh-scene test keeps its pixels.
- Tests: `tests/anim.test.ts` +7 (scatter position/color/determinism,
  sparkle ring, drop pool recycling, arc/bounce/fly endpoints, one-shot
  arrival), `tests/renderer.test.ts` +6 incl. counter pop, banner
  lifecycle/flash, scatter-equals-sprite-then-moves, drop corridor +
  arrival flash, bottom-up pop-in growth, level-up banner + hero sparkles;
  reworked the T14 kill pin to the new dying(500)→spawning(300)→idle
  timeline (behavior change is the point of T15). 233 tests total.
- Gates → exit 0 (233 tests, 15 files; lint 0 warnings; 3 tsc projects).
  T15 AC line (2 greps + headful smoke) → exit 0, SMOKE_OK.
- Committed feat(T15) as 0fc5875; then plan update (T15 `[x]`, Notes
  bullet, Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/anim.ts
- src/renderer/hud.ts
- src/renderer/game.ts
- tests/anim.test.ts
- tests/renderer.test.ts
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-15.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  15 passed (15) / Tests  233 passed (233)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ grep -q "LEVEL UP" src/renderer/hud.ts && grep -qi particle src/renderer/anim.ts \
  && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
AC_EXIT=0   (smoke log tail: SMOKE_OK)
```

## Attempts & dead ends (what future iterations must NOT retry)

- One real failure, fixed structurally: drops originally launched at
  `MONSTER_X+3` — INSIDE the monster art box — so at kill-time the trinket
  sprite's pixels (a red gem pixel at (124,83) with seed 7) polluted the
  "scatter equals the sprite's own pixels" set comparison. Filtering test
  colors would have been fragile (slime_gel is green like the slime);
  instead drops now launch at `MONSTER_X-6`, structurally outside the box
  (drop sprites are ≤6px wide, so max x is 117 < 118). Keep drop launches
  left of x=118 or rework that renderer test knowingly.
- Design notes so later tasks do not undo T15 choices:
  - `monsterSpawned` in game.ts is an intentional no-op; the dying→spawning
    FSM transition (dt carryover, T10) does the reset. Re-adding
    `createMonsterAnim()` there would skip the death scatter again.
  - Boot-time monster anim is IDLE on purpose (resume shows the live
    monster instantly); only kill-born monsters pop in. T16's onReset
    handler replaces the engine — if it also wants a pop-in it must build
    a new Game or accept the idle boot.
  - Scatter/sparkle randomness is derived from pixel coords / burst index,
    never from an Rng — do not "improve" it with the engine's rng (that
    would shear the seeded event-log tests).
  - The banner sits at y 20..30 and drops land at x ≤ 100: both chosen to
    stay out of the T14 float-region pin (y∈[40,68), x≥100 empty on a
    pre-attack draw). Keep new chrome out of that region too.
