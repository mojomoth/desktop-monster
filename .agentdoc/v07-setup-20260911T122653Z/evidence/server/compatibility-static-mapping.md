# Final server capture: complete static source mapping

Reviewer: `/root/critic`. Supplemental factual comparison only; no formal audit judgment or compatibility status change.

The immutable `compatibility.json` SHA-256 is `9eeb9ad2554c1aea54100a354557ced0d91d9b2596476bedbdfa4ab3433241c4`. It was captured at `2026-09-13T01:52:43.754Z`, records source digest `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`, and records live status `PENDING` with health `ok: true` and reported commit `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`.

I independently classified **all 35 entries** in `report.sources`: **13 MATCH, 17 MISMATCH, 5 MISSING, 0 ERROR**. The local commit exists. All 35 current source files also match their captured SHA-256 values. The comparison read 30 existing Git blobs with `git show <commit>:<path>`; the other five paths were confirmed absent using the commit tree from `git ls-tree`. No mismatch caused early termination.

## Why the original reason is not a complete traversal log

The capture reason says: “Compared every tested server/core/shared/client file, package manifests and compiler settings against the actual health commit; no deployment performed.”

The frozen `server-check.mjs:22–27` implements this predicate with `Object.entries(files).every(...)`, and lines 74–75 assign the same generic reason text regardless of the predicate result. The first mapped file is `src/core/battle.ts`, which differs at this commit, so the equality loop short-circuits there. The wording describes its intended equality requirement; it does **not** prove that all 35 paths were visited. This separate report supplies the missing complete enumeration while leaving the original capture and its reason unchanged.

## Complete enumeration

Hashes below are SHA-256 of raw file bytes. `MISSING` means that exact path does not exist in the reported commit, not that the local commit is unavailable. The adjacent JSON additionally records each existing blob's Git object ID, byte length and current source comparison; Git blob object IDs are distinct from these SHA-256 content hashes.

| Captured source path | Comparison | Capture SHA-256 | Reported commit blob SHA-256 |
|---|---|---|---|
| `src/core/battle.ts` | MISMATCH | `ceefb54e9a0dbdf583216471948a27d3e34da333bef7cb95d6d7c54eaf0254f4` | `1149a046298497a7d9dacd529731a3d3eb2eb17dd5b4bebb64de6a74d6272288` |
| `src/core/bignum.ts` | MATCH | `10c9479f311b94f5459ca5d21132511150e8c96e8e9678424368730a905152f8` | `10c9479f311b94f5459ca5d21132511150e8c96e8e9678424368730a905152f8` |
| `src/core/collection.ts` | MISMATCH | `5bd191d014eaf9ef641f59bfe1d468e0d0686e7bf91f898b8ca77503890f6338` | `c78576b60d0d13a4c953884145b2567dda249bbdb7250da00bcac2a0403e702f` |
| `src/core/discovery.ts` | MISSING | `20e101f325bd4ed5ebca3f1d8719b68d6d7d66acb43ec6a9a167acf1aa662f18` | Absent from commit tree |
| `src/core/economy.ts` | MISSING | `846acc7adf6842d1f8603df242559b551d7025fd4379cd6bb0afe26d7bd9c59a` | Absent from commit tree |
| `src/core/engine.ts` | MISMATCH | `6004cb3f98c2cb7451d60d156b37f3d367ad3b31f6db9bc14cd8a8a0346dacd3` | `7d4ae4886eed42cf5af0e9cd3e69b60ffec2d4b96a081cde351e159bcfed6e69` |
| `src/core/fever.ts` | MATCH | `b1e11bb4028875c955172687608a74236fcd2c2f117f424d796e1005b80d7f87` | `b1e11bb4028875c955172687608a74236fcd2c2f117f424d796e1005b80d7f87` |
| `src/core/formulas.ts` | MISMATCH | `53f6d184c6a982a1b4dd173396a94037f1b90733eba767a716f464a87c3c5fd5` | `85a1aa4fa203286c6081eaeafe34eda66f6934a9bd2060d25582831d50f550d4` |
| `src/core/fsm.ts` | MATCH | `3de841765d2a080edc9fffba08d4dabf08d25026d141468ac63e09a6f49bd658` | `3de841765d2a080edc9fffba08d4dabf08d25026d141468ac63e09a6f49bd658` |
| `src/core/hero.ts` | MISSING | `6b296b4a4910b9460e44ff7be6775cbe97ca15bc4de91eb2ce304f5b77a85633` | Absent from commit tree |
| `src/core/index.ts` | MISMATCH | `9d5f07383ecbc3d87121aef674ef1671f334e75da002e3ebfc18dc95eacad75e` | `9532ba5db985791d28357165726b693b5063dbe0624ba91a221926650fb0e61e` |
| `src/core/input.ts` | MATCH | `6c00c08634ac86b87e154444ffad48e30e6d81fdd7fa3931f6136dbc277521e5` | `6c00c08634ac86b87e154444ffad48e30e6d81fdd7fa3931f6136dbc277521e5` |
| `src/core/loot.ts` | MATCH | `7ae617d33e5567268172c9c2d294915c1bf2aa7b935f80463a5fd3adbbbf7fff` | `7ae617d33e5567268172c9c2d294915c1bf2aa7b935f80463a5fd3adbbbf7fff` |
| `src/core/monsters.ts` | MISMATCH | `ced4e5e3282e4a32c6f9b2532fab6154e21f3735a1c42cdcec98efff76c4113f` | `7f602ff772819f355565ebc6e80a713b1a56319e74ddee1b47fef3dc6de119b8` |
| `src/core/progress.ts` | MISSING | `dda6622bc66bd090909c0ab404a70bde0ec683a81576b30fd6259c6a4df33284` | Absent from commit tree |
| `src/core/progression.ts` | MISSING | `9828ae64d517982c3ce50d6c45e684f272253cfec97381d4383be44c04e8fdf1` | Absent from commit tree |
| `src/core/rng.ts` | MATCH | `7eba983147e8f892dd0a13c4830def3f942677a5ea084101a7274a0ddd2e3255` | `7eba983147e8f892dd0a13c4830def3f942677a5ea084101a7274a0ddd2e3255` |
| `src/core/save.ts` | MISMATCH | `e3ac4241ad02888394b436f9a7c037768c6fc4711b0dbe15e0e46ab0c276c6ac` | `0c530c869232a893d608513e232a1cad2010e5ff0d9fdc5546f5863973ffc75f` |
| `src/core/types-chart.ts` | MATCH | `98ca060b4bbffd9236eb03141511f014020c8fa2f1892ac203261036ae327193` | `98ca060b4bbffd9236eb03141511f014020c8fa2f1892ac203261036ae327193` |
| `src/core/types.ts` | MISMATCH | `ba26337369373b313c50dfaf4168cc4495a5c65f210ca77e974696f7b01c6d64` | `1c4ead8af55d45ff63a69cb511b75c041c9401a6a3cce773e879a376654faa81` |
| `src/server/app.ts` | MISMATCH | `a0327efb4b135a395cd929f8cbfd5c8badfdd49755b0ddc4e35fd2b63e08349a` | `9e29aeff3a30d99b395b60cb93ab39743b86ad56f74f18531ba2383541f373a4` |
| `src/server/http.ts` | MATCH | `5fe51cf7cd00283383616a858878175e337abede7084bdbc09af0de4774168a3` | `5fe51cf7cd00283383616a858878175e337abede7084bdbc09af0de4774168a3` |
| `src/server/index.ts` | MATCH | `792de7673b8fdc9630a4a3350ad1a7a55caa529ae6c808858980b938a97af09b` | `792de7673b8fdc9630a4a3350ad1a7a55caa529ae6c808858980b938a97af09b` |
| `src/server/pg.d.ts` | MISMATCH | `80ebb37a3080e0e1da36e2862a36122377805eceb774a3396ad5fa3684dbcd76` | `475f9cbd01eddfe6d2fa397208967bc1fabdbce9fcf3bff3217248be72eb7efa` |
| `src/server/pgStore.ts` | MISMATCH | `60f4c16ae35f92ed1558a9626eee937a9586f01ccd7bfe7f0687f831dd094004` | `8fa7c256b1940d742b83f76b8aadf90e03309ffb883e08ad1af4b9e34f7686b3` |
| `src/server/probe.ts` | MATCH | `e27e95f4df03a171fbd8f6acbc29ec7c674d5052c73314c93d49e8f573dd74ee` | `e27e95f4df03a171fbd8f6acbc29ec7c674d5052c73314c93d49e8f573dd74ee` |
| `src/server/store.ts` | MISMATCH | `ea01c23c5d4d40425987deddb74bee5f6b0db805b4392072387792b52ea270c4` | `ea6905fe5becf0d968a24d08018c93efd6999618c026ba2fd1d376c3cf9d900f` |
| `src/shared/api.ts` | MISMATCH | `02147c8063801acecac8c19d1d0db8502de6f9f2e6f4126970f60a931bc67736` | `6c402e82cb2ec83f9affc454ca234ffdcf43ddcc59665ef7fa7c48e040f6d110` |
| `src/shared/ipc.ts` | MISMATCH | `569928268a1e2f2de96ae363a3e35b4cbe3e43348bcd6703be5bb1cf90eb2209` | `e773d5988c95134edf0771129d388592d78324bd22d60ccfe374777a2ceb91a3` |
| `src/shared/serverUrl.ts` | MATCH | `58655905c079fcd3b4a943289ebe12f4d145b3be6c9720af882371f67d6a96fe` | `58655905c079fcd3b4a943289ebe12f4d145b3be6c9720af882371f67d6a96fe` |
| `src/main/net.ts` | MISMATCH | `10ff700c6b4415467ed305c40222532799cfe3ee5815cc6f13f69c8cd31787fa` | `f4d87bda79b8d17899fd1f7da82edee6278e41396e77c215757a005e0e028401` |
| `package.json` | MISMATCH | `bafe3965bcc46eb2b61dc07f1a89283561619f676032a77dcccd34a32a3c073a` | `dc62306c5f6ca6a92bd4bcba87a841718cbb0591975c8951ce586fc50bd8c7ca` |
| `package-lock.json` | MISMATCH | `fd7f73b6343c8e4363f42b502def8e0bcdb663061489d199e86e407b6d1e6137` | `341a091d283bf37c74c85c2216e2056c2654fe82c9955e835dd6d2ffaa0d9304` |
| `tsconfig.main.json` | MATCH | `f1574ffb55c29deb86fe0444ddaa44dcf30e9718d3ceab16e4c2a69d19a41a39` | `f1574ffb55c29deb86fe0444ddaa44dcf30e9718d3ceab16e4c2a69d19a41a39` |
| `tsconfig.base.json` | MATCH | `fe0bda403d82ba522293477fac999d4c75c06466bf46321ed5ba83ec6a6073c7` | `fe0bda403d82ba522293477fac999d4c75c06466bf46321ed5ba83ec6a6073c7` |

## Connection to the earlier functional contract facts

The prior immutable `../server-readonly-preflight/deployed-contract-static.md` has SHA-256 `f64d11f255b2061568ca09ee9139e9e65849e860ef149f5cb922071501cabd98` and inspects **the same commit** `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`.

Its two exact blobs are reproduced by this complete mapping:

- `src/shared/api.ts`: `6c402e82cb2ec83f9affc454ca234ffdcf43ddcc59665ef7fa7c48e040f6d110`. Lines 103–104 set companion levels to 1–10.
- `src/server/app.ts`: `9e29aeff3a30d99b395b60cb93ab39743b86ad56f74f18531ba2383541f373a4`. Lines 126–131 reject levels outside those bounds; the authenticated upload returns 400 before storage at lines 197–215. The route table at 458–480 lacks the PvP directory endpoint. Match lines 358–394 pick a neighbor without reading the requested opponent ID; match/PvP opponent responses omit player ID and hero.

Thus the earlier concrete source-level Lv11+ rejection, missing directory, and ignored specified-opponent contract belong to this final capture's reported commit, not a different historical deployment. This does not assign functional significance to every other mismatched or missing file. Older generic responses may retain compatible nested companion parties; the earlier report explains that legacy optional hero/ID compatibility separately.

## Limits and preservation

This compares only the capture's 35-file source map. It is not an audit of every repository file, a deployed binary attestation, or an authenticated runtime HTTP/DB test. The live status is quoted from the original capture, not newly determined here. No network, fetch, build, test, Native process, engine execution, package inspection or deployment was performed. No `dist/` or `release/` path was accessed, and no capture log or source file was modified.

The original capture bytes were checked unchanged after the complete comparison. Only the two newly authorized files, `compatibility-static-mapping.json` and this Markdown report, were written. The JSON is the machine-readable complete mapping, and its report scope explicitly leaves `formalAuditJudgment` unset.
