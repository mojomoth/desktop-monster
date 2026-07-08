# Session record — iter 12

- agent role: builder
- harness version: v1
- task: T12 — Monster/species art, item sprites, pixel digit font
- result: DONE
- commit: bfa67a4

## What I did

- Adopted T12 (first `[ ]` with deps `[x]` — T11; no `[~]` existed), flipped
  to `[~]`.
- New `src/renderer/sprites/monsters.ts`: all 5 species (slime, bat, ghost,
  golem, dragon) as 12×10 string-matrix art, idle×2 (wobble) + hit×1
  (recoil pose) each, palettes from DB16 `COLORS`. Keyed off core's
  `SPECIES_IDS` (T05 decision — never a re-declared list):
  `monsterSprites: Record<SpeciesId, SpeciesSprites>`, registered as
  `monster.<id>.idle` / `monster.<id>.hit` in a SPECIES_IDS loop. Monsters
  face LEFT (toward the hero, Assumption 1) — renderer draws them unflipped.
- New `src/renderer/sprites/items.ts`: coin (6×6) + the 5 loot-table
  trinkets — sword_shard, slime_gel, bone, gem, crown — one frame each,
  map keys exactly `ItemDef.id`, registered as `item.<id>`.
- New `src/renderer/sprites/font.ts`: ONE registered sprite `font.glyphs`
  (3×5, frames indexed by `GLYPH_CHARS = '0123456789LVEUP!'` — digits plus
  every letter of "LV"/"LEVEL UP!"), plus `FONT_W/FONT_H/FONT_ADVANCE`,
  case-insensitive `glyphIndex` (-1 for unknown/space), `drawText` (spaces
  and unknown chars advance without painting; `{color}` tints via
  drawSprite), `textWidth`.
- New `src/renderer/sprites/index.ts`: barrel — importing it registers ALL
  art modules (T13's single import surface).
- Extended `tests/sprites.test.ts` (+9 tests, 24 in the file): value imports
  of the three art modules feed the T11 integrity sweep automatically; new
  blocks pin species coverage/frame counts/registry identity, item-id parity
  with core's `COIN_ITEM` + `TRINKET_TABLE`, glyph coverage of "LV"/"LEVEL
  UP!", drawText cell layout/space skipping/tinting, textWidth math.
- Gates → exit 0 (166 tests, 12 files). Full T12 AC line (vitest + binary-
  asset find sweep + golem/dragon greps) → exit 0.
- Committed feat(T12) as bfa67a4; then plan update (T12 `[x]`, Notes bullet,
  Iteration Log row) + this record as a docs commit.

## Files touched

- src/renderer/sprites/monsters.ts (new)
- src/renderer/sprites/items.ts (new)
- src/renderer/sprites/font.ts (new)
- src/renderer/sprites/index.ts (new)
- tests/sprites.test.ts
- IMPLEMENTATION_PLAN.md
- .agentdoc/2026-07-08T09-11-59/sessions/iter-12.md (this file)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 ✓ tests/sprites.test.ts (24)  ✓ tests/window.test.ts (22)  ✓ tests/ipc.test.ts (23)
 ✓ tests/globalInput.test.ts (19)  ✓ tests/persistence.test.ts (10)  ✓ tests/input.test.ts (9)
 ✓ tests/fsm.test.ts (12)  ✓ tests/formulas.test.ts (10)  ✓ tests/save.test.ts (9)
 ✓ tests/engine.test.ts (16)  ✓ tests/scaffold.test.ts (1)  ✓ tests/loot.test.ts (11)
 Test Files  12 passed (12) / Tests  166 passed (166)
> eslint . --max-warnings 0             (no output, exit 0)
> tsc main/renderer/test projects       (exit 0)
GATES_EXIT=0

$ npx vitest run tests/sprites.test.ts && test -z "$(find src static tests -type f \( -iname '*.png' ... \))" \
  && grep -q golem src/renderer/sprites/monsters.ts && grep -q dragon src/renderer/sprites/monsters.ts
 Test Files  1 passed (1) / Tests  24 passed (24)
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- None — all 45 hand-written art rows passed the rectangularity sweep on the
  first run (counting every row to exactly `w` chars while writing pays off;
  keep doing that in any future art edits and run
  `npx vitest run tests/sprites.test.ts` immediately after).
  Facts T13/T14/T15 rely on:
  - Import art from `src/renderer/sprites/index.js` — the barrel's imports
    side-effect-register every module. Importing a single module registers
    only that module.
  - Monster sprites face LEFT already; draw them unflipped at the right side
    of the scene. `hit` is only the recoil pose — the white flash is
    `drawSprite(..., { tint: COLORS.white })` during the FSM 'hit' state,
    and tier tint is `paletteForTier(sprite.palette, def.tier)` at draw
    time (T12 bakes in NO tint).
  - `itemSprites` is `Record<ItemSpriteId, Sprite>` (exactly coin + the 5
    trinket ids). To index with a runtime `drop.item.id` (a plain string),
    widen first: `const byId: Partial<Record<string, Sprite>> = itemSprites`
    — direct string indexing is a type error under strict.
  - Font: `drawText(ctx, text, x, y, {color?})`, default COLORS.white;
    letters are case-insensitive; unknown chars/spaces still occupy a
    FONT_ADVANCE(=4px) cell so counters do not jitter; `textWidth` for
    right-aligned HUD placement. Only 'LVEUP!' letters + digits exist — a
    new HUD word needs new glyph frames appended to fontSprite AND
    GLYPH_CHARS (order must stay in sync; integrity sweep covers frames
    automatically).
  - Registry names now: hero.idle/attack/slash, monster.<species>.idle/hit,
    item.<id>, font.glyphs (20 sprites total).
