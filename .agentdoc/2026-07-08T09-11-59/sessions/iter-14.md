# Session record — iter 14

- agent role: builder
- harness version: v1
- task: T14 — Fallback input wiring + combat presentation
- result: DONE
- commit: 59fa474

## What I did

- Adopted T14 (first `[ ]` with deps `[x]` — T04/T09/T10/T13; no `[~]`
  existed), flipped to `[~]`.
- New `src/renderer/input.ts`: `setupFallbackInput({target, bridge, onAttack})`
  wires the T09 core fallback gate to real window listeners — DOM-free by
  injection (production passes `window`/`window.desmon`, tests pass fakes).
  Attach = keydown + mousedown (mousedown ignores the drag strip via a
  structural `closest('.drag-handle')` check); detach the moment 'global'
  activates (no double counting). Mode seeding: subscribe `onInputMode`
  FIRST, then `getInputMode()` — a live event arriving while the invoke is
  in flight outranks the stale seed answer. Handle exposes
  `isAttached()/ready/dispose()`.
- `src/renderer/game.ts` now consumes the core FSMs (imported from
  `'../core/fsm.js'` — the literal 'fsm' is part of the AC): any attack
  restarts the 180ms 3-frame hero attack (`ATTACK_FRAME_MS=60`, slash-arc
  overlay at `SLASH_FRAME=1`, drawn at HERO_X+14); `monsterHit` events
  trigger the 120ms white flash (recoil pose + full white tint);
  `monsterSpawned` resets the anim to a fresh spawning. Added
  `getHeroAnim()/getMonsterAnim()` snapshots to the Game interface.
- `src/renderer/hud.ts`: floats fade to a dim color in the last third of
  their 600ms life (`FLOAT_FADE_RATIO=2/3`; white→steel, yellow→orange) and
  crits draw double-size (`CRIT_FLOAT_SCALE=2`) via a local `drawScaledText`
  (bottom-anchored so bigger glyphs grow upward) — font.ts untouched.
- New `src/renderer/anim.ts`: `clamp01/lerp/easeInQuad/easeOutQuad` +
  fixed-cap particle pool (`PARTICLE_POOL_SIZE=200`, oldest-slot recycling,
  semi-implicit Euler with px/s velocity + px/s² gravity, dt normalized like
  core/fsm.ts). T15 feeds it the death scatter/sparkles.
- Wired `setupFallbackInput` into `src/renderer/index.ts` boot (beyond the
  plan's file list — F14's behavior must actually be live; noted in the
  commit body). All pinned literals in index.ts kept.
- Tests: new `tests/rendererInput.test.ts` (7) with fake target/bridge
  (attach/detach, source mapping, drag-strip ignore, seed-vs-live race,
  dispose), new `tests/anim.test.ts` (7), and `tests/renderer.test.ts`
  +8: FSM presentation (restart-on-spam, attack pose, slash-frame gating,
  white flash + recovery, kill→spawning) and float fade/crit-size; added
  'setupFallbackInput' to the boot source-contract pins.
- Reworked one existing renderer test (see dead ends below).
- Gates → exit 0 (219 tests, 15 files). Full T14 AC line (3 greps + headful
  smoke, SMOKE_OK) → exit 0.
- Committed feat(T14) as 59fa474; then plan update (T14 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/input.ts (new)
- src/renderer/anim.ts (new)
- src/renderer/game.ts
- src/renderer/hud.ts
- src/renderer/index.ts
- tests/rendererInput.test.ts (new)
- tests/anim.test.ts (new)
- tests/renderer.test.ts
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-14.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  15 passed (15) / Tests  219 passed (219)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ grep -q onInputMode src/renderer/input.ts && grep -q mousedown src/renderer/input.ts \
  && grep -q fsm src/renderer/game.ts \
  && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log
AC_EXIT=0   (smoke log tail: SMOKE_OK)
```

## Attempts & dead ends (what future iterations must NOT retry)

- No failed approaches — gates, AC and smoke passed on the first full run.
  One deliberate test rework and design notes so later tasks do not undo
  choices:
  - tests/renderer.test.ts "attack() steps the engine and spawns a floating
    damage number" previously asserted `after.calls.length >
    before.calls.length` under a "same pixels + float" premise. T14 breaks
    that premise BY DESIGN (attack swaps hero to the attack pose and the
    monster to its hit pose; slime hit pose has 8 fewer pixels — exactly the
    float's '1' glyph, netting zero). Replaced with a stronger check: the
    float region (y∈[40,HP_BAR.y), x≥100) must be empty before the attack
    and populated after. Keep new HUD chrome out of that region, or update
    the pin deliberately.
  - game.ts wires `monsterKilled` AND `monsterSpawned`, so after a kill the
    anim lands on 'spawning' (the reset overrides dying in the same event
    batch). T15's dying-scatter must DEFER the spawn reset (hold the
    monsterSpawned handling until the dying FSM finishes) instead of adding
    another kill hook.
  - input.ts is DOM-free on purpose: `window` satisfies FallbackEventTarget
    structurally and `window.desmon` satisfies FallbackModeBridge. Do not
    import DOM values there — tests/rendererInput.test.ts runs it under
    node.
  - The seed race matters: subscribe onInputMode BEFORE getInputMode and
    drop the seed if a live event arrived first (pinned by a test). Reversing
    that order can lose a mode transition during boot.
  - hud.ts's drawScaledText is local; scaling was NOT added to
    sprites/font.ts (outside T14's file list, and the 1px font data is what
    the T11 integrity sweep covers).
