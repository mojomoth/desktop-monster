# 0.10.0 equipment and hero art

## Production assets

All assets remain TypeScript pixel geometry; there are no downloaded, generated
binary, or copied Diablo/Dungeon & Fighter sprites. Those games informed the
equipment categories and rarity presentation. The existing DesMon palette,
14×14 hero body and uniform 2× field scale remain the drawing contract.

`src/renderer/sprites/equipment.ts` registers 224 separate 16×16 icon matrices:
128 weapons (eight families × four rarities × four level tiers), and 96
accessories (three shapes × two effect families × four rarities × four variants).
Every occupancy mask is unique even after removing all palette information.
Tiers change blade length/profile, spear head, gun barrel, staff head, hammer
head or gauntlet cuff/knuckles. Rarities change guards, mounts or ornament
geometry. Accessory variants change chain, band or charm body geometry.
Names, level requirements and item properties come from the core catalog.

The shared rarity tokens are common `#d5dbe1`, uncommon `#63cf8b`, rare
`#68b8ff`, epic `#de8aff`. Menu borders and names consume these same tokens.
Held rare weapons have a one-pixel blue contour. Epic weapons have a purple
contour with a timed pale spark. The contour follows the weapon silhouette,
including gauntlets, rather than boxing the whole hero.

## Body, grip and motion

`equippedHero.ts` creates independent body and hand layers for h00 and all 70
existing forms. The original composite sprites remain available for historical
replays. The new layers copy explicit costume regions, rebuild the head from
the unraised source, and omit the old weapon regions. They do not erase pixels
by color. Wide hat/hair edges are kept; the seven legacy polearm costumes have
their separately authored tip region removed at x11–13, y3–6. h58 has a connected diving tank so that its costume remains distinct
after its old fixed sword is removed. All 71 idle body masks are distinct.

The five body poses use these primary/secondary hand coordinates:

| Pose | Primary hand | Secondary hand |
| --- | --- | --- |
| Idle 0 | 9,7 | 8,8 |
| Idle 1 | 9,8 | 8,9 |
| Windup | 5,6 | 5,7 |
| Strike | 7,6 | 7,7 |
| Recovery | 8,7 | 7,8 |

The complete held prop is drawn behind the body, its front portion is drawn
again with the face masked, and the hands are drawn last over the grip. Both
body and weapon mirror around the same 14-pixel body origin. An inverse affine
nearest-neighbor rasterizer samples every destination integer cell, preserving
filled diagonal blade faces without Canvas rotation or image smoothing. The
complete source pixel areas are fitted into y0–13 before sampling; no resulting
weapon pixels are discarded to hide overflow. Gauntlets use .75×.5 sampling so
their cuff and knuckle variants remain distinct. Cached geometry avoids
rebuilding the transform for every frame. Spears and staves pivot on the actual
grip, with upper reach leaning outward by .75 pixel per source pixel so the
orb/crook clears the face. Fever/KO composites reserve ten
pixels of horizontal padding, preserving mirrored contours as well as the body.

| Family | Motion |
| --- | --- |
| None | Windup, closed bare fist, recovery |
| Gauntlet | Same punch with wrist cuff and knuckles around the fist |
| Sword / greatsword / hammer | Raised windup, horizontal strike, recovery |
| Spear / dagger | Ready pose, forward thrust, recovery |
| Gun | Aim, forward firing pose, recovery |
| Staff | Ready, raised casting pose, recovery |

Field swings last 180 ms with three 60 ms poses. Rapid inputs preserve the
current swing and queue at most one additional presentation swing. Every input
still applies core damage immediately. The blank-hand h00 can render every
weapon family; compatibility and current-level restrictions remain core rules.

## Field and PvP integration

`drawEquippedHero` and `drawEquipmentIcon` are shared production drawing APIs.
The field draws the current loadout and a small `BAG FULL` indicator; temporary
overflow adds its current count. Fever and KO scatter use composed body/weapon
pixels. The four accessory slots affect stats, not character anatomy.

New PvP replays freeze the five equipment items and both fighter arrays.
Heroes swing only on their own server-authored turns; companion hits do not
trigger phantom hero attacks. Initial HP comes from the server snapshot and
decreases by recorded blow damage. Hero impacts resolve at the strike pose,
show a hit flash, and scatter/remove a KO hero and its held weapon. KO never
changes ownership. Replay timing compresses the complete motion when needed
to show 200 blows inside 12 seconds. Legacy companion-only replays retain
their historical composite hero art and command animation.

## Executable checks and evidence status

`tests/equipmentSprites.test.ts` checks all 224 unique shapes, all 71 separate
body/hand sets, visible grips, attached hands, grounded feet, h00's complete
128-weapon five-pose left/right matrix, rare/epic contours, and all 2,304
compatible hero/weapon pairings in five poses (11,520 frames). It also checks
that rapid input completes each swing and queues only one more. Additional
regressions check all 128 five-pose held silhouettes without color/contours,
solid greatsword/gun connectivity, complete transformed source bounds and every
visible pixel in left/right fever and KO composites.

`tests/equipmentRendering.test.ts` checks production field drawing, strike-time
server HP updates, absence of phantom companion-triggered hero swings, KO and
field restoration, frozen historical equipment, and the 200-blow replay bound.
Existing art identity, renderer, legacy replay and save/network identity tests
remain in the suite, with explicit v4 currency and equipment expectations.

`renderEquipmentContactSheets(document)` in `equipmentGallery.ts` uses the
production Canvas functions in the actual Electron renderer. It returns PNG
data URLs and per-frame pixel counts; the Host saves them with package/source
hashes. The complete matrix has 150 pages and 7,148 samples:

| Samples, both light and dark backgrounds | Count |
| --- | ---: |
| Every equipment icon | 448 |
| h00: every weapon, five poses, two directions | 2,560 |
| Every hero unarmed, five poses, two directions | 1,420 |
| Other 70 heroes: every compatible highest-tier epic family, five poses, two directions | 2,720 |

Native acceptance requires opening the saved contact sheets, checking face
preservation, recognizable family silhouettes, grip continuity, motion order,
mirror registration, ground/HUD clearance, rarity visibility, and screenshot
evidence from the packaged field/inventory/shop/PvP screens. Code-level pixel
checks alone are not a visual approval. The third pilot capture and Host's
independent visual review are complete, as are the current packaged native and
gallery reruns recorded below. Final performance acceptance is recorded in the
[performance report](PERFORMANCE_REPORT.md). The implementing Designer does not
self-approve the art.

Retained deterministic evidence, in implementation order:

- `.agentdoc/v10-20260917T070144Z/evidence/designer-unit-01.json`: 192/192
  art, renderer, legacy replay and FSM tests passed before the head-edge fix.
- `.agentdoc/v10-20260917T070144Z/evidence/designer-head-fix-03.json`: all three
  directly affected equipment art/rendering/hero rendering suites passed after
  the full-head preservation and polearm-tip removal change. The superseded
  head-fix-02 output is not final art evidence.
- `.agentdoc/v10-20260917T070144Z/evidence/designer-raster-fix-04.json`: all five
  affected sprite, equipment, hero, field and legacy replay suites passed after
  the Host-requested rasterization, held-shape and composite-bounds corrections.
  Renderer TypeScript and changed-file ESLint also passed. This supersedes the
  earlier graphics result.
- `.agentdoc/v10-20260917T070144Z/evidence/designer-pole-grip-fix-05.json`:
  142/142 affected checks passed after the second Host correction. Every weapon
  in every pose joins an actually visible prop pixel to both hands through an
  eight-neighbor connection; all 16 staves retain a visible jewel in idle and
  recovery. Renderer TypeScript and changed-file ESLint passed. This was the
  graphics result before the third pilot gallery and later allocation change.
- `.agentdoc/v10-20260917T070144Z/evidence/equipment-cache-check-02.json`:
  132/132 checks in the five affected suites passed after the allocation change,
  including the 13 equipment-art checks and exact pre/post pixel fingerprints
  for 57,960 hero drawings and 3,840 fever/KO composites. Changed-file ESLint and
  renderer/test TypeScript checks also passed.
- Changed renderer/source tests passed ESLint; renderer TypeScript passed.
  The Host owns the final canonical full-project gates and native evidence.

## Historical native pilot captures

Reusable command (choose a fresh output directory for every attempt):

```sh
node .harness/v10/gallery.mjs REPORT_JSON PACKAGED_DESMON_APP
```

On 2026-09-17 16:47:11–16:47:21 KST this generated all 150 contact sheets,
7,148 frame samples and four overview images from the packaged Electron
renderer. No blank sample was found (minimum 288 painted display pixels).
The drawing operation left its isolated fixture save unchanged; source/build
fingerprints were unchanged, all 118 package-bound files matched, the process
exited 0, no global hooks loaded and both runtime/diagnostic error arrays were
empty. Personal data was not opened.

Manifest, PNG hashes, sample coordinates and runtime evidence:
`.agentdoc/v10-20260917T070144Z/native-art-pilot-01/report.json`.
PNG files are in the sibling `native-art/` directory:
`all-224-icons-dark.png`, `all-224-icons-light.png`, `all-71-bare-dark.png`,
`all-71-bare-light.png`, `native-field.png`, and `equipment-{dark,light}-1..75.png`.

Pilot app.asar SHA-256:
`67d7bbadbf41b3f76ad4430426db6b0a63476233ea29a3c39079f9c4dc92c505`.
This is generation evidence, not the implementing agent's visual approval.
The Host independently opens and judges the images. Final distribution evidence
must rerun the same command against the final packaged artifact.

The Host rejected the pilot-01 visual result after opening the actual PNGs:
forward pixel stamping left checkerboard holes in diagonal weapons, producing
excessive interior glow. This is recorded in `REVIEWS/VISUAL_REVIEW.md`. The
inverse-raster and bounds corrections described above resolve the code-level
counterexamples. At that stage a second native gallery and independent judgment
were required; the subsequent outcomes are retained below.
Pilot-01 is retained as failed visual evidence even though its capture completed.

The Host opened pilot-02 and confirmed the checkerboard defect was resolved.
That review found a further staff/spear defect: the old two-pixel horizontal
shaft offset separated the grip and hid the ornament behind the head. The
pole-grip change and visible prop-neighbor checks above address that finding;
the Host approved pilot-03 after independent inspection. Neither earlier
capture is treated as final visual approval.

## Historical pilot-03 approval

Host independently opened pilot-03 dark pages 10/20/21/50 and light pages
50/60/75 after the earlier family and overview inspections. All four visual
findings were resolved; exact inspected scope and its limits are in
`REVIEWS/VISUAL_REVIEW.md`. The graphics source was frozen at that stage, before
the separately reviewed allocation change below.
This does not claim a person reviewed every one of the 7,148 captured samples.

Preserved pilot-03 capture: `.agentdoc/v10-20260917T070144Z/native-art-pilot-03/report.json`.
It contains 150 pages / 7,148 samples, matching 118 package-bound files, no
runtime errors, and unchanged source and fixture-save checks. Its app.asar
SHA-256 is `91da13f864148a0fbbb0d609ba0f85014243a49eba06b1d5e4ddd61a0a7f7c1c`.
This pilot approval was followed by the packaged reruns below; the pilot record
and its earlier app hash remain historical evidence.

## Current packaged art and allocation recheck

After the first timed memory-budget failure, bounded caches replace repeated
face occlusion, weapon contour and fever-composite allocation. Host independently
read the complete diff. All 61,800 pre-optimization pixel cases remain identical.
The [Host visual review](REVIEWS/VISUAL_REVIEW.md) records that independent recheck.

The current package is bound by these reports:

- [Native final report](../../.agentdoc/v10-20260917T070144Z/native/final.json):
  **16/16 scenarios passed**, including bare/eight-family/epic motions, equipment,
  restart, boss drop, hero-only and six-fighter PvP, and historical replay.
  Every scenario reports successful UI/runtime checks and the same app hash.
- [Gallery final report](../../.agentdoc/v10-20260917T070144Z/native/gallery-final.json):
  **7,148 samples, 150 contact-sheet pages and four overview PNGs**, no recorded
  errors and unchanged source checks. The original rerun receipt is
  [gallery-performance-02/report.json](../../.agentdoc/v10-20260917T070144Z/native/gallery-performance-02/report.json).
- [Gallery equality receipt](../../.agentdoc/v10-20260917T070144Z/evidence/performance-02-gallery-equality.json):
  all **154 contact-sheet/overview PNGs** have identical SHA-256 hashes to the
  preserved pre-optimization gallery. This compares the complete gallery image
  set; it does not claim a human inspected every individual sample.

Current app.asar SHA-256, shared by all 16 native scenarios and the gallery:
`28214fe34acea915f69af280e6f09e098001678d472f62893aa2aba69c222cc7`.

These results establish current packaged behavior and appearance preservation.
The earlier performance failures remain valid evidence. Independent review rejected
matched03 after finding a surviving previous observer app. After correcting observer
cleanup and adding process isolation checks, the prospectively registered matched04
block, independent result review and current-source final AC passed. See the
[performance report](PERFORMANCE_REPORT.md) for earlier failures, changed
baseline-derived numeric limits and the final results. This is not evidence that
the cache change caused a memory reduction or met the original absolute RAM limit.
