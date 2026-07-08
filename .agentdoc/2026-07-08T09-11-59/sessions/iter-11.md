# Session record — iter 11

- agent role: builder
- harness version: v1
- task: T11 — Sprite system, hero art, integrity tests
- result: DONE
- commit: 8acdd83

## What I did

- Adopted T11 (first `[ ]` with deps `[x]` — T01; no `[~]` existed), flipped
  to `[~]`.
- New `src/renderer/sprites/sprite.ts`: `Sprite {w,h,palette,frames}` with
  `TRANSPARENT='.'`; `drawSprite(ctx, sprite, frame, x, y, {flipX, tint})`
  per GAME_ARCHITECTURE §4 — skips unknown frame indices/chars silently
  (never throws mid-render-loop); `SpriteCanvas` is a TYPE-ONLY
  `Pick<CanvasRenderingContext2D,'fillStyle'|'fillRect'>` so the module
  compiles and runs under tsconfig.test's node environment (tsconfig.test
  already included `src/renderer/sprites` since T01 — no config change).
  Plus a registry: `registerSprites(entries)` (duplicate names THROW) and
  `allSprites()` — art modules self-register at load time.
- New `src/renderer/sprites/palette.ts`: DB16 `COLORS` (16 named hexes) and
  pure-math HSL helpers — `hexToHsl`/`hslToHex`/`shiftHue`/`tintPalette`/
  `paletteForTier` with `TIER_HUE_STEP=60` (tier 0 = untinted copy,
  grayscale never shifts).
- New `src/renderer/sprites/hero.ts`: knight facing right — `heroIdle`
  14×12 ×2 (bob), `heroAttack` ×3 (wind-up / slash / recover), `heroSlash`
  5×10 crescent overlay; registered as 'hero.idle'/'hero.attack'/
  'hero.slash'.
- New `tests/sprites.test.ts` (15 tests): both AC-mandated titles verbatim,
  iterating the exported registry (T12 art gets auto-covered once its
  modules are side-effect imported there); plus frame-count pins, hex
  format sweep, duplicate-registration throw, drawSprite paint/flip/tint/
  bad-frame behavior on a recording fake ctx, and hue-math pins
  (red→green at 120°, DB16 round-trip exactness, tier-cycle identity).
- Gates → exit 0 (157 tests, 12 files). Full T11 AC line → exit 0.
- Committed feat(T11) as 8acdd83; then plan update (T11 `[x]`, Notes
  bullet, Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/sprites/sprite.ts (new)
- src/renderer/sprites/palette.ts (new)
- src/renderer/sprites/hero.ts (new)
- tests/sprites.test.ts (new)
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-11.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/window.test.ts (22)  ✓ tests/ipc.test.ts (23)  ✓ tests/globalInput.test.ts (19)
 ✓ tests/persistence.test.ts (10)  ✓ tests/sprites.test.ts (15)  ✓ tests/input.test.ts (9)
 ✓ tests/fsm.test.ts (12)  ✓ tests/formulas.test.ts (10)  ✓ tests/save.test.ts (9)
 ✓ tests/engine.test.ts (16)  ✓ tests/scaffold.test.ts (1)  ✓ tests/loot.test.ts (11)
 Test Files  12 passed (12) / Tests  157 passed (157)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/sprites.test.ts && grep -q "every frame is rectangular with the declared width and height" tests/sprites.test.ts \
  && grep -q "every non-transparent char exists in the palette" tests/sprites.test.ts
 Test Files  1 passed (1) / Tests  15 passed (15)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Only stumble: one hand-counted art row (heroAttack frame 1 row 6) was 13
  chars instead of 14 — the rectangularity sweep caught it on first run,
  fixed immediately. Hand-writing string-matrix art WILL produce length
  slips; run `npx vitest run tests/sprites.test.ts` early and often in T12.
  Facts T12/T13/T14/T15 rely on:
  - Art modules SELF-REGISTER via `registerSprites({...})` at module load;
    duplicate names throw, so never re-register an existing name. The
    integrity sweep only sees a module after tests/sprites.test.ts gains a
    side-effect import of it — T12 MUST add imports for monsters.ts,
    items.ts, font.ts there (plan notes say "extend test imports if
    needed").
  - `drawSprite` accepts any object with `fillStyle`+`fillRect`
    (`SpriteCanvas`); a real 2D context satisfies it structurally. Do not
    widen sprite.ts with runtime DOM references — tsconfig.test compiles it
    in a node environment.
  - Registry keys are dotted names ('hero.idle', 'hero.attack',
    'hero.slash'); hero frames face RIGHT, `flipX` mirrors.
  - Tier tinting: call `paletteForTier(sprite.palette, tier)` (60°/tier,
    tier 0 identity copy) and pass colors through — drawSprite's `tint`
    option is a flat override for hit-flashes, NOT for tier tints.
  - hexToHsl/hslToHex round-trip DB16 exactly (pinned) — safe to
    chain-tint without drift worries at these values.
