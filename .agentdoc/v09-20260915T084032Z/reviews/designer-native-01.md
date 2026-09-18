# Designer — native visual review v0.9

- Reviewer: `/root/designer` (independent agent); 2026-09-15.
- Final artifact: installed DMG app `.agentdoc/v09-20260915T084032Z/installed/DesMon.app`.
- ASAR SHA-256: `86c1e907cd002333161180058106b7779b6d126328a162c226ce66b961efd281`.
- Source evidence: `native-04/first/runtime.json`, `native-04/first/ui.json`, `visual-01/visual.json`.
- All images in the manifest below were opened with `view_image`. These are actual packaged Electron screenshots or Electron-encoded PNG exports. Recording-canvas unit assertions were not treated as screenshot evidence.
- Verdict: HUD/share functional visual acceptance passes; impact native coverage passes with the contrast limitation below. No release-blocking clipping or missing artwork observed. Human recognition of all 205 effects is not established.

## HUD

The left readout is legible in the native 400×260 field: `REBIRTH READY`, a full green meter, and `+123 SOUL` have clear separation. The hero's level/XP labels remain above its head. The right counters have larger glyphs below the top strip and do not touch the left readout.

The suspected currency truncation was a thumbnail false positive. The final screenshot contains the complete `1.23B`. Direct RGBA inspection at screenshot coordinates x318..399/y76..95 reconstructs all five glyphs, including B's complete five-row pattern (`ww. / w.w / ww. / w.w / ww.`). Its last yellow pixel is x395; x398 and x399 are transparent throughout that currency row. The 4-pixel margin is intact. No production offset change was made.

This native fixture uses 1,234,567 coins and a ready gauge. Maximum-safe-integer currencies, other readiness states, and long A/AA/AAA damage suffixes are covered by deterministic HUD tests; this screenshot alone does not demonstrate those states.

## Six PNG card kinds

| Kind | Actual observation |
| --- | --- |
| Hero | Crisp large hero, Korean title and level/attack lines, opaque background and full footer. |
| Individual companion | Dragon remains within its frame; species/level/element/power/stars are readable. |
| Party | Three members, distinct silhouettes, same size cards and readable metadata. Empty lower area is visible but no content is clipped. |
| Codex | Hero 14/70 with page 1/2; monster 135/135 with page 1/12; twelve named entries fit each first page. Native UI checks also exercise pagination. |
| Field | Actual frozen canvas includes the currently playing PvP scene, the visible hit/scatter pixels, currency, and public opponent name. This is expected for a live scene capture; it is not a fabricated field battle. |
| PvP result | Both original battle parties and both heroes are drawn with `VICTORY · 승리`. The card exposes no account ID/token. |

All seven files (two codex variants) are 1200×1200 PNG. The native 420×640 share dialogs show the kind selector, full square preview, success status, save/copy/close controls inside the screen. Text on the preview is necessarily small at that window size; the saved image is full resolution. No direct SNS posting was performed.

P3 visual polish observation: a one-member PvP party is a small portrait in a large reserved five-member lane, so the result card has substantial empty space. The party card similarly reserves room for a second row when only three members exist. Root explicitly accepted keeping the final composition; no late styling changes were made.

## Actual impact atlas

Command:

```sh
node .harness/v9/visual.mjs .agentdoc/v09-20260915T084032Z/installed/DesMon.app .agentdoc/v09-20260915T084032Z/visual-01
node .harness/v9/visual.mjs verify .agentdoc/v09-20260915T084032Z/visual-01/visual.json
```

Results: run `passed: true`, verify `V09_VISUAL_OK`. The isolated app exited 0; the installed ASAR and all checked packaged modules remained unchanged. No native input hook, user save, production network, or real clipboard was used.

- Actual packaged Canvas modules rendered all 70 hero and 135 companion-monster presets against dark `#140c1c` and light `#f2eee7` backgrounds: 410 source/background cases.
- Every case has a nonempty initial native pixel mask (minimum 12 pixels), and the six ages 0/60/120/180/240/360 ms yield 70 distinct hero masks and 135 distinct monster masks even when color is excluded.
- Twelve contact sheets show 0/120/240 ms at integer 2× display scale. Slashes, lances, rings, crosses, waves, claws, and repeated pulses are visibly different shapes. Empty final frames on single-pulse effects are expected after their lifetime expires.
- Native sampled isolated presets peak at 24 active particles within the unchanged 200-slot pool. Unit stress tests cover saturation; this atlas does not claim every preset saturates the pool.
- The thirteenth image overlays five real source presets (slime, bat, ghost, golem, dragon) at one target coordinate. Multiple colors/shapes appear together, then expire; it also stays within the 200-slot pool. This isolates impact painting and is not a full five-companion battle replay.

P2 contrast limitation: dark-element heroes h05/h10 and monsters such as bat/rictus/inkferret are faint on the dark background. Pale wind heroes h03/h08 and monsters such as ghost/kitekin are faint on the light background. Pixels are present and their time/shape signatures are unique, but equal human readability across backgrounds is not proven. No numerical contrast acceptance threshold had been specified; this remains a documented follow-up, not a claim that every source is equally distinguishable. Human perception during a busy five-member fight remains unverified.

Presentation clock injection in this atlas is explicit and is separate from root's real-time performance queue. No game RNG or battle timing was changed by the harness.

## Test optimization in this follow-up

Only `tests/expedition.test.ts` changed: preserve all five depth fixtures and every original rectangle/bound, collect out-of-bounds rectangles into one assertion, and construct `monsterForIndex(0)` with only its displayed index overridden. This removes expensive irrelevant HP generation for depth 10,000,000. No case, bound, timeout, or production code was reduced/changed.

`npx vitest run tests/expedition.test.ts --reporter=dot`: 16/16 PASS, 837 ms total / 356 ms test time. Scoped ESLint: PASS. Root owns full gate, packaging, native integration, and performance results.

## Inspected image manifest

All paths are absolute and hashes refer to the inspected final files.

| Image | Dimensions | SHA-256 |
| --- | --- | --- |
| [field-hud.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/field-hud.png) | 400×260 | `aa4c3e91987cec736f9bdcb05b9a13fcbeb0b6112adeb40e9b854c420fee686c` |
| [share-hero.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-hero.png) | 1200×1200 | `a140c48672f1ac02653a1fd2346fceed79b080d3635eb00b56f4b048a9c0758d` |
| [share-companion.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-companion.png) | 1200×1200 | `160340a48f87471672ad7183998ece81e78e2394f4627749ec2beb61dd639ee9` |
| [share-party.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-party.png) | 1200×1200 | `3b0c7e41dd7341808099826fac29893b60c7c8b764df32293b27bf340b6147f4` |
| [share-codex.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-codex.png) | 1200×1200 | `3ab6b4814b6ea55d4220a2b2d16cb9af620019fe3daf516ec2519ca7f7cdc5b6` |
| [share-codex-monster.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-codex-monster.png) | 1200×1200 | `0e76d23cfe75a030c146416af6e0e40fb2db64f0c47350fc0b4fae2d5d57034d` |
| [share-field.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-field.png) | 1200×1200 | `2617b09535b086869bddd585c097a7550b3b54e3b21e9940d561de890a5b802a` |
| [share-pvp.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-pvp.png) | 1200×1200 | `5bfddd46e6e7dc46688c7d483ac25e63cd86d9677324312d113935713d24446e` |
| [share-modal-hero.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-modal-hero.png) | 420×640 | `b3e763bad9c9b689c4fb566f5487ae3664ade3f2fbc1dcf1d857219eb91fd11c` |
| [share-modal-pvp.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/native-04/first/share-modal-pvp.png) | 420×640 | `1287d584f6e766609aef3d458ff4ff7cf7bbbe945a88015bf2cf2f04a3d81ea3` |
| [five-source-concentration.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/five-source-concentration.png) | 1200×596 | `fccf9302bbb8b50c3b5224ce4a7a1213d8ca47effb42b6ca491f56ae50c06197` |
| [heroes-dark-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/heroes-dark-1.png) | 2000×1340 | `53771ad88adab2ad192ae0658c88f4893bbc7a090ee188aaccec0106bc9e8c9e` |
| [heroes-dark-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/heroes-dark-2.png) | 2000×1340 | `cba4cf590307ce357fae1952b8abe4c24543a7a12956b8b8f30adbacbb2142f5` |
| [heroes-light-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/heroes-light-1.png) | 2000×1340 | `2dbdc9553c64501a29dd95c894864b5a7e8e0beace4fb1fd38d58ea30cf3e389` |
| [heroes-light-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/heroes-light-2.png) | 2000×1340 | `2280eaa18edc7c9d8b0c8c2d8ed6b1084c1b7a59b4352be126b017eba5696723` |
| [monsters-dark-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-dark-1.png) | 2000×1340 | `85557255259aac8bc90fd46405402058d546f5c1cc4b0dc6b9eb637ef4cdeade` |
| [monsters-dark-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-dark-2.png) | 2000×1340 | `237813fab32aa93e72a97a3c59708f7cfc141c2c626b7296b8e74ced85749e43` |
| [monsters-dark-3.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-dark-3.png) | 2000×1340 | `f45fdcfa5f2e49a53ac03d4c5706b15dccc0d33b2bc05e84982826007c42aeb9` |
| [monsters-dark-4.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-dark-4.png) | 2000×1156 | `388bb2e39f2a75ac36bdd5be7d96b778d7535d0c2061af2dbf74f280b918e7a3` |
| [monsters-light-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-light-1.png) | 2000×1340 | `52de0ccb8e6c36ec2fc067671829b6195aba8343bd916b2b34de56a07bc81f1a` |
| [monsters-light-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-light-2.png) | 2000×1340 | `afb217c9b7230711f11aca71977f1b52d42341f4853fef757440b01b1f16b42b` |
| [monsters-light-3.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-light-3.png) | 2000×1340 | `efcf5878ed9c9bbff04885f9e55c290f372dd54a49c1549c530a64fbd54e60bb` |
| [monsters-light-4.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-01/monsters-light-4.png) | 2000×1156 | `44acdf0a025f76d0489c2bc843a487b77ef9f5ad085a5ba2468a1767e2dcee07` |

## Final coordinator correction: installed-02 / visual-02

The isolated rerun uses the unchanged `.harness/v9/visual.mjs` against `installed-02/DesMon.app`, whose ASAR SHA-256 is `3692e162a73de3df7e596ee0756277dfe3496b26edd1591f6e1ce994ad00f044`. Balance completed and closed both `native-05` app sessions before this visual run. This package supersedes installed/native-04 for final source binding; the earlier inspected screenshots remain historical evidence.

The rerun passed all 410 source/background cases with 70 distinct hero and 135 distinct monster pixel signatures. `visual.mjs verify` printed `V09_VISUAL_OK`; its owned Electron process exited 0 without a signal. All 13 generated PNG files are byte-for-byte identical to the personally inspected visual-01 images, so the visual findings and nonblocking contrast limitation above apply unchanged. No production or harness source was changed in this rerun.

Comparison manifest: [visual-02/comparison.json](../visual-02/comparison.json). Runtime evidence: [visual-02/visual.json](../visual-02/visual.json). The complete candidate image hashes follow.

| Candidate image | SHA-256 | Matches visual-01 |
| --- | --- | --- |
| [five-source-concentration.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/five-source-concentration.png) | `fccf9302bbb8b50c3b5224ce4a7a1213d8ca47effb42b6ca491f56ae50c06197` | Yes |
| [heroes-dark-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/heroes-dark-1.png) | `53771ad88adab2ad192ae0658c88f4893bbc7a090ee188aaccec0106bc9e8c9e` | Yes |
| [heroes-dark-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/heroes-dark-2.png) | `cba4cf590307ce357fae1952b8abe4c24543a7a12956b8b8f30adbacbb2142f5` | Yes |
| [heroes-light-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/heroes-light-1.png) | `2dbdc9553c64501a29dd95c894864b5a7e8e0beace4fb1fd38d58ea30cf3e389` | Yes |
| [heroes-light-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/heroes-light-2.png) | `2280eaa18edc7c9d8b0c8c2d8ed6b1084c1b7a59b4352be126b017eba5696723` | Yes |
| [monsters-dark-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-dark-1.png) | `85557255259aac8bc90fd46405402058d546f5c1cc4b0dc6b9eb637ef4cdeade` | Yes |
| [monsters-dark-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-dark-2.png) | `237813fab32aa93e72a97a3c59708f7cfc141c2c626b7296b8e74ced85749e43` | Yes |
| [monsters-dark-3.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-dark-3.png) | `f45fdcfa5f2e49a53ac03d4c5706b15dccc0d33b2bc05e84982826007c42aeb9` | Yes |
| [monsters-dark-4.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-dark-4.png) | `388bb2e39f2a75ac36bdd5be7d96b778d7535d0c2061af2dbf74f280b918e7a3` | Yes |
| [monsters-light-1.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-light-1.png) | `52de0ccb8e6c36ec2fc067671829b6195aba8343bd916b2b34de56a07bc81f1a` | Yes |
| [monsters-light-2.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-light-2.png) | `afb217c9b7230711f11aca71977f1b52d42341f4853fef757440b01b1f16b42b` | Yes |
| [monsters-light-3.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-light-3.png) | `efcf5878ed9c9bbff04885f9e55c290f372dd54a49c1549c530a64fbd54e60bb` | Yes |
| [monsters-light-4.png](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v09-20260915T084032Z/visual-02/monsters-light-4.png) | `44acdf0a025f76d0489c2bc843a487b77ef9f5ad085a5ba2468a1767e2dcee07` | Yes |
