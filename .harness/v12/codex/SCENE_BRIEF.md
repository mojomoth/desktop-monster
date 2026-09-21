### In-game raid screen — `src/renderer/raidScene.ts`, `src/renderer/sprites/raidBosses.ts`, `#raid-status` pixel button

This lane produces the EXPECTED IN-GAME SCREEN the user will approve before development, and it is real
code that V12-11 later wires into `game.ts`. Nothing here may touch `game.ts`, `index.ts` or the engine.

1. `src/renderer/sprites/raidBosses.ts`: `RAID_BOSS_SPRITES: Record<'water'|'wind'|'dark'|'earth'|'fire', Sprite>`
   from `raidBoss/<element>.ts`; `registerSprites({'raidBoss.water': …})`; `drawRaidBoss(ctx, element, frame, x, groundY, {tint?})`
   mirroring `sprites/boss.ts` but at scale 1, no crown. Import it from `src/renderer/sprites/index.ts` so the
   integrity sweep covers it.
2. `src/renderer/raidScene.ts` (DOM-free, node-testable) exporting exactly the API in plan §4.1:
   `RaidStateView`, `RaidScene`, `RAID_SCALE = 1`, `RAID_HP_BAR = {x:20,y:14,w:160,h:5}`, `RAID_TIME_BAR = {x:20,y:21,w:160,h:3}`,
   `RAID_BOSS_MAX = {w:128,h:88}`, `raidSlots(raidId, playerIds)` (seeded with `mulberry32` from `src/core/rng.ts`
   over a string hash of raidId; ids sorted; alternating left band x∈[2,74] / right band x∈[126,184]; row 0–2 → y offset +row×2),
   `createRaidScene`, `applyRaidState`, `tickRaid`, `raidLocalHit`, `drawRaid(ctx, scene, timeMs)`.
   Draw order: `drawMeter` red HP → `drawMeter` `COLORS.blue` time → remaining seconds text right-aligned (`drawOutlinedText`,
   export it from `hud.ts` — one-word change) → boss centred with feet on GROUND_Y=120, idle frame `floor(timeMs/500)%2`,
   hit = frame 0 tinted `COLORS.white` for 80 ms + x jitter → heroes back row first, `heroFormSprite(formId, attacking)` at scale 1,
   me LAST → 5×3 yellow chevron `raidMarker` sprite bobbing above my head → `LV n` (no XP bar) → my floats
   (`createFloatPool`/`spawnFloat`/`drawFloats`). Others: attack frame while `damageDelta > 0` was seen in the last
   push. >12 others: draw 12 + `+n` text at (2,112). No companions, no screen shake. Settled → VICTORY/DEFEAT banner via the
   existing banner helpers, `tickRaid` returns false ~2 s later.
3. `static/index.html`: add `<button id="raid-status" type="button" hidden></button>` next to `#field-pvp-status`.
   `static/style.css`: `#raid-status` at `top:26px`, centred, `-webkit-app-region:no-drag`, `pointer-events:none`,
   pixel look (2 px stepped border via box-shadow, DB16 palette, monospace, `image-rendering:pixelated`, no images);
   `#raid-status.alert` = warning look (yellow face, red border, 600 ms steps(1) blink) with `pointer-events:auto`;
   `#raid-status.done` = 참여 완료 (green face, no blink). The 24 px drag strip must stay the only
   `-webkit-app-region: drag` (`tests/window.test.ts` pins this).
Tests `tests/raidScene.test.ts`: recording canvas (`{fillStyle, fillRect, clearRect}`) geometric invariants —
boss inside the envelope and above the ground, no rect above y=12 except gauges rows, gauges exactly at the
constants with red / `COLORS.blue`, every hero rect has scale-1 size (h===1 rows), boss drawn before heroes, me last,
marker rects above my hero's top, `LV` glyph ink above the marker, floats spawn at my head, slots deterministic for
the same raidId+ids and inside the bands, >12 overflow text, settled banner. Extend `tests/window.test.ts` if it
enumerates `-webkit-app-region` occurrences.
