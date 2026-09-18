# Native readiness sampling: supplemental independent review

Reviewer: `/root/critic`. This is a bounded observation-method review of the completed 30-minute active original and frozen runner. It is not the ordered final audit, a matrix completion verdict, or a new measurement. No running 30-idle/180-minute output was inspected; no application, Native run, build, test, or source edit was performed.

## Observed evidence

The completed `native/30-active-1789247742628.json` has SHA-256 `ed375bb0a67d87818284082267b9071342c6082afd10727cf1a02470b80466ac`, source `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`, evaluation `c27f89371f34647649fd442fffd3b13849b7c20060409210fbe0ca62b90d6d2d`, 43/43 checks passed, no errors, and one completed natural session. Its natural duration is `1800177.2859999998 ms`; total process duration is separately `1830449.1847080002 ms`.

- Start: Lv1, kills0, reincarnations0. All 60 timeline samples are below Lv17 and have reincarnations0.
- Last timeline sample: `1771055.149125 ms`, Lv16, kills74, saved playTime `1771024 ms`.
- End: Lv17, kills76, reincarnations0, saved playTime `1800169.1 ms`, inputs3491.
- `journeyPolicy = observe-only`, `menuVisits = []`, `firstReadyElapsedMs = null`, `firstReincarnationElapsedMs = null`.
- I independently viewed the actual `30-active-1789247742628.json.screenshots/30m-active.png`: it visibly displays **REBIRTH READY / LV 17**. Its bytes match recorded SHA-256 `325ea63002b33c1a71c21c82991c522f001c2fe2325f65724aca83459028f17a`.

The record timestamp gap from the last periodic sample to completion is `29122.13687499985 ms` (about 29.122 seconds). This is a gap between observations, not an exact readiness event duration.

## Why null does not mean never ready

`electron-e2e.cjs:215–222` checks readiness only when the next approximately 30-second sample is due. The while loop stops at the duration deadline (`205`); next samples use `now + 30000`, so scheduling drift can leave a final unsampled interval. After stopping the synthetic input driver, line `229` obtains `summary(await flush())` and lines `230–231` record completion, but that final state is not passed to `recordFirstReadiness`. The screenshot is captured at `236`, before any diagnostic fixture is loaded at `239`.

Thus the ledger correctly says no positive readiness observation was recorded by its sampling helper, while the final saved state and screenshot establish readiness by the end of this natural observation. “Never reached readiness” or treating this null as a 30-minute right-censored failure would contradict those endpoint observations. No real reincarnation occurred: short-run `menuVisitSchedule(30)` is empty (`e2e.mjs:31–32`), so there was no natural menu selection to consume readiness.

The initial progression threshold is Lv17 (`src/core/progression.ts:30`; `src/core/hero.ts:75–98`). With the fresh zero-reincarnation state and no menu choices, the Lv16-to-Lv17 endpoint change is consistent with first readiness in the final sampling gap. It does not recover an exact onset timestamp. In particular, the helper's `readState` calls `window.desmon.loadState()` (`electron-e2e.cjs:50`), whose IPC handler reads the last saved file (`src/main/ipc.ts:191–194`), not an atomic live engine snapshot. Renderer saves are asynchronous; `flush` dispatches blur, waits 150 ms, then reads (`electron-e2e.cjs:51–54`; `src/renderer/index.ts:34–37, 65–67`). Therefore the nominal 29.122-second timestamp interval is not a strictly proven engine-event interval with zero IPC/persistence latency. The screenshot itself has no exact capture timestamp in the report. Preserve the null and original evidence; annotate the endpoint-positive observation without inventing an event time.

## Continuous 180-minute binding

The frozen long-run path addresses the different case where readiness can be consumed between periodic samples:

- Before opening each scheduled menu visit, it flushes the actual save and calls `recordFirstReadiness` (`electron-e2e.cjs:168–170`).
- After opening the menu/offer, it flushes and checks readiness again immediately before the native choice click (`184–188`), covering readiness reached while opening the menu.
- It waits for the actual saved reincarnation count to increase by exactly one, flushes the result, and records the selected form and completion time (`189–194`). `recordFirstReadiness` only assigns the first positive observation (`e2e.mjs:35–36`), so a later reincarnation cannot replace it.
- The schedule contains 18 visits at 10–180 minutes. The final 180-minute visit executes after the input loop (`227–228`). The matrix requires exactly those visits, non-accelerated starts/completions within 30 seconds, connected before/after counts, a first actual selected transition, and `finite(firstReadyElapsedMs) <= firstSelected.completedAtMs`; first reincarnation time must equal that completion timestamp (`e2e-matrix.mjs:60–82`).

This ordering still supports the intended long-run readiness-before-selection observation contract. The 30-minute endpoint omission does not bypass those long-run checks. The aggregate validator does not reconstruct an engine event or a click timestamp from the JSON: its explicit bound is selection completion, supported by the frozen runner's pre-click ordering. Similarly `firstReincarnationElapsedMs` in Native is the observed selection completion time, not the reducer's exact acceptance event timestamp. A first readiness observation missing or later than the first completed selection must fail the matrix.

Existing tests statically cover same-visit readiness followed by reset and later non-overwrite (`e2e.test.ts:26–34`), and reject missing/nonfinite-equivalent/wrong-type/negative/late long-run readiness plus broken visit transitions (`e2e-matrix.test.ts:79–100`). I read these assertions but did not run them. The actual completed 180-minute original and final matrix still need their own review. No distribution claim or seeded timing target is certified by this single Native session; its report already identifies readiness as sampled observation rather than an exact engine transition.

## Frozen source references (SHA-256)

- `.harness/v7/loop/electron-e2e.cjs`: `4ebdd9e8f31b73a19c632245234fe5c064c8f9fc13d80258725420003c240cdf`
- `.harness/v7/loop/e2e.mjs`: `b442c80b180b2c9eab1b18e1f8d82b6c9ea605468427ede74d0f8392e3402d42`
- `.harness/v7/loop/e2e-matrix.mjs`: `02f320e2405b678c53296622d73b08052ca480b7a97732e6399af4594e42768d`
- `src/core/hero.ts`: `6b296b4a4910b9460e44ff7be6775cbe97ca15bc4de91eb2ce304f5b77a85633`

Only this new supplemental report was written. All Native originals, screenshots, runner files and prior reviews remain unchanged.
