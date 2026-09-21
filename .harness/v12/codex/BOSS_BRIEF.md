### Raid boss sprite — element `{{ELEMENT}}` (file `src/renderer/sprites/raidBoss/{{ELEMENT}}.ts`)

Draw the v0.12 raid boss for the `{{ELEMENT}}` element as sprites-as-code. This is the ONE deliberate
exception to the ≤16×16 frame rule: the raid scene draws every sprite at scale 1 on the 200×130 canvas,
so the boss is drawn at native resolution and must read as a huge creature towering over 14×14 heroes.

Hard constraints (all pinned by `tests/raidBosses.test.ts` — extend that file if you add checks):
- Size: `96 ≤ w ≤ 128`, `64 ≤ h ≤ 88` art pixels. Feet on the bottom row (bottom row has ink). The
  top must stay clear of the gauges: the scene places the boss with its feet on y=120, so h ≤ 88 keeps
  the head below y=32.
- Frames: `frames: [idleA, idleB]` — two idle frames of identical size; frame 2 differs from frame 1 in
  at most 15 % of cells (breathing / flicker / sway), never a different silhouette.
- Palette: ≤10 keys, every value lowercase `#rrggbb`; include `COLORS.void` (`#140c1c`) as the outline key
  and at least one highlight key with lightness ≥ 70 %. The dominant hue (most painted non-outline cells)
  must sit in the element band: water 190–230°, wind 80–160°, dark 260–300° (plus void mass), earth 20–45°,
  fire 0–20° or 40–55°. Use `COLORS` from `palette.ts` where a DB16 colour fits; custom hexes are allowed.
- Export shape (round 1): `export const {{ELEMENT}}A: Sprite = {...}` and `export const {{ELEMENT}}B: Sprite = {...}`
  — two genuinely different creature designs (different silhouette/pose, same element reading), not palette
  swaps. Round ≥2: `export const {{ELEMENT}}: Sprite` only (the picked one, refined), losers deleted.
- Do NOT register the sprite yourself and do NOT touch `raidBosses.ts`, `sprites/index.ts` or `game.ts`
  (V12-07a wires it). Keep the file self-contained: `import type { Sprite } from '../sprite.js'` +
  `import { COLORS } from '../palette.js'` (relative to `src/renderer/sprites/raidBoss/`).
- Silhouette must survive a flat tint (the menu shows it as a single-colour silhouette): strong outer
  shape, readable at 1× and 2×, asymmetry welcome, no thin 1-px floating specks.
- Character direction: a raid boss faces LEFT-down toward the heroes at the bottom of the field.
  Element flavour: water = tidal leviathan/sea serpent mass; wind = storm raptor/cloud wyrm; dark =
  void horror with a void-coloured body and a single bright focus; earth = mossy stone colossus/golem;
  fire = furnace beast/magma dragon. It must not resemble the existing companion species art
  (`src/renderer/sprites/species/*.ts` are ≤20×17; the raid boss is a different class of creature).

Tests to add/extend in `tests/raidBosses.test.ts` (node environment, no DOM): size range, frame count and
equal size, ≤15 % frame diff, bottom-row ink, palette rules, dominant hue band (write a tiny hex→HSL helper
in the test), a recording-canvas draw of both frames at scale 1 producing only rects with `h === 1`
inside `[x, x+w) × [groundY−h, groundY)`, and a `tint` draw that repaints every colour. In round 1 test
both variants (import both); in round ≥2 test the single export. Also import the file from
`tests/sprites.test.ts`'s sweep only if it already loads `raidBosses.ts` — otherwise leave that sweep alone.
