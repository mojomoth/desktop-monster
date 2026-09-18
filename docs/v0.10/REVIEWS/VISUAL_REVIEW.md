# Independent Host visual review

Reviewer: `/root`. Implementer: `/root/sprite_qa`. This review covers production sprite rendering, not Host-authored menu implementation.

## Initial native inspection — changes required

Evidence: `.agentdoc/v10-20260917T070144Z/native-art-pilot-01/report.json` (actual packaged Electron Canvas, 150 pages / 7,148 pose samples). Host opened both 224-icon overview sheets, both 71-bare-hero overview sheets, and dark contact-sheet pages 2, 6, 10 and 13. Host also opened native field spear and hero-PvP captures from `native-pilot-02`.

- All eight weapon families and three accessory shapes are recognizable; body costumes retain visible face, hands and feet in both background overviews.
- **V10-VIS-01, required fix:** diagonally held greatswords and guns contain checkerboard gaps. The renderer rounds forward-transformed source pixels, leaving disconnected destination pixels. Rare outlines trace those internal gaps and obscure the blade. Nonempty-frame tests alone did not catch this visual defect.
- **V10-VIS-02, required check:** the renderer silently drops transformed pixels outside y=0..13. Replace cropping with a pose transform that fits the complete source bounds and test those bounds directly.
- **V10-VIS-03, required check:** icon silhouettes are distinct, but the held-art path also needs a color-independent five-pose uniqueness check. Its stronger regression subsequently exposed gauntlet variants collapsing under compression.
- Contact-sheet long identifiers overlap adjacent labels; adjust evidence typography without changing game appearance.

Designer is fixing these findings. Approval remains pending a fresh packaged native gallery and independent image inspection. The machine-generated gallery report is evidence of capture and coverage, not a visual approval.

## Second native inspection

Host opened `native-art-pilot-02/native-art/equipment-dark-{3,6,10,13,17,20,24,28}.png`, spanning sword, greatsword, spear, gun, dagger, staff, hammer and gauntlet. The filled rotated blades and guns now read coherently; their outlines no longer trace artificial checkerboard holes. Pure shape tests also distinguish all 128 held weapons across five poses, and full bounds replace silent clipping.

**V10-VIS-04, required fix:** idle staves place the shaft two pixels away from the authored hand and hide the ornament behind the head (page 20). Align the polearm transform to the real grip, lean the upper shaft outward, and check final prop-to-hand adjacency plus visible staff gems. Designer added these regressions and produced a subsequent fix; fresh native inspection is pending.

Host separately inspected corrected menu captures and the actual six-fighter PvP capture from `native-pilot-03`. Tab capture now waits for the rendered selection; inventory separates equipped/bag/temporary items and presents the loss warning. The PvP observation recorded 12 own hero turns and 12 hero animation starts while companions also acted. These are observed Host integration results, not self-issued approval of the Host scope.

## Third native inspection — approved visual implementation

Evidence: `native-art-pilot-03/report.json`. Host opened dark pages 10, 20, 21 and 50 and light pages 50, 60 and 75. The polearm shaft now starts at the hand, leans clear of the face, and preserves visible tips/gems; long hats, robes and the last rare hero forms retain their heads and feet. Earlier diagonal holes remain fixed. Rare blue and epic violet/gold contours are visibly distinct. V10-VIS-01 through V10-VIS-04 are resolved in the inspected production implementation.

Review also read the inverse raster bounds/grip transform, final layer order, fever/KO padding, input FSM and replay actor routing. Tests cover every allowed pairing, exact mirror coordinates, both hands' real prop adjacency, full source bounds, all 128 held shape signatures, and lossless composite padding. Native observations cover all eight families plus bare and epic, each at 1/5/10/20Hz. This approval covers visual correctness under these checks; it is not a claim that a human reviewed all 7,148 images or judged the game's long-term fun.

The release package must regenerate the full gallery and run the final source-bound native scenarios. Final evidence receipt will bind the final gallery and the unchanged reviewed sprite files. Pilot artifacts are retained and are not substituted for final package verification.

## Final release capture

`native/final.json` passed all 16 native scenarios on the final 0.10.0 package with unchanged source. `native/gallery-final.json` regenerated 150 pages, 7,148 samples and four overview sheets from that same package. Host reopened the final dark 224-icon overview, light 71-hero overview and dark staff page 20. The previously repaired grip, visible ornament and pixel continuity remain intact. The final receipt binds these captures and the independently reviewed production files; all limits stated above still apply.

## Allocation optimization after the first timed comparison

The first complete activity observation exceeded its RAM budget by 2.17 MiB (292.546875 versus 290.375 MiB p95). Other CPU, idle-memory and mixed-memory checks passed. The failed report and exact app/installers remain preserved. This is a required failed gate, not a rounded pass.

Host independently read the complete diff of `equippedHero.ts` against the preserved pre-optimization source and all four new `equippedHeroCache.test.ts` cases. Template/form/pose layers now reuse face occlusion, front prop pixels and outline coordinates; drawing preserves the original paint order and calculates epic shimmer color per time phase. Owned UID, roll and enhancement do not affect geometry keys. FIFO limits are 640 held geometries, 128 layer combinations and 64 composites. Composite keys distinguish pose, facing, tint and five cyclic epic phases. These bounds prevent arbitrary visits or elapsed time from retaining an unbounded number of combinations.

The 57,960 draw and 3,840 composite pixel fingerprints match their pre-optimization expectations, including all five phases and phase wrap, hit tint and mirrored poses. Host approves this code change within the visual scope, subject to fresh native/package evidence and complete timed remeasurement. The 2Hz timed profile never triggered fever; fever reuse is an additional fast-input improvement, not an asserted cause of the measured RAM excess. Shared process working-set measurements do not prove that this one renderer change caused all observed memory differences.

Fresh packaged gallery `native/gallery-performance-02/report.json` passed. Host compared all 150 page PNGs and four overview PNGs with the preserved prior gallery: **all 154 files have identical SHA-256 hashes**. The comparison receipt is `evidence/performance-02-gallery-equality.json`; no frame was excluded. The canonical `native/gallery-final.json` now binds this new package and unchanged pixels.

The rebound complete native AC passed all 16 scenarios with unchanged assertions at source `85a1265fd4d134a1158bd468bf424b4c9d6d3893e3311d41f62a76cb67adc2a1`. One earlier bare/1Hz observation failed after unusually little recorded game progression; that failure, a persisted-state diagnosis and three passing identical fresh-fixture diagnoses remain in the journal. Its exact initial cause is unproven. The latest full pass does not erase this failure history. Timed performance acceptance remains a separate gate.
