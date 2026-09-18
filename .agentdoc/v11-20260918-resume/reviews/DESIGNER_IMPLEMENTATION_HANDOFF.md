# Designer implementation handoff

Owner `/root/menu_review`; 2026-09-18. Source implementation and bounded automated checks are ready for independent review. Native execution and overall acceptance remain with Host. No Electron process was launched in this resumed implementation task.

- `src/renderer/game.ts`: one field-party helper now calls the core field selector with accepted hero count and current encounter version. Ordinary party rendering, companion effects, capture/recovery pop-in and post-PvP field loss scatter share it. Recorded PvP replay parties are unchanged.
- `tests/renderer-field-v11.test.ts`: six isolated activated-curve regressions cover legacy/new party pixels, legacy-to-new spawn plus saved roster/restart, actual volley actors and their particle origin, immediate growth refresh and loss scatter for a companion omitted by raw/PvP ranking. The mock pins quadratic/scale1/K28 independently of future production adoption.
- `tests/share-field-v11.test.ts`: two isolated quadratic/scale64/K28 regressions use one trained index31 member and five same-type later captures. Hunting and raw membership demonstrably differ; fixed expected IDs and independently calculated field numbers prove card membership and separate labels. Legacy labels and an individual companion card are also checked.
- `tests/hud-v09.test.ts`: restores horizontal strips to individual 1px glyph cells in the affected assertions. Existing pixel geometry, reference glyph/outline, gap and boundary checks remain present.
- `.harness/v11/ui-cases.mjs`, `runtime.mjs`, `runtime.test.mjs`: preserve the original four required scenarios and add `field-party`. Its synthetic trained level adapts to the actual accepted linear/quadratic tail while fixed expected membership remains legacy c6 → hunting c5 → grown c6. The package must use an adopted non-neutral curve. Real field key input and real menu growth/material clicks exercise production actions; labels, applied ACK, persisted roster, six PNGs and source-bound actual `drawParty` argument observations are retained. The observer never pauses or mutates game state/time. These additional actions do not replace any latency-family samples.
- Every v11 isolated native launch now records pass-through `app.quit`/`app.exit` call stacks and application/window/process shutdown events in `lifecycle.jsonl`, with its hash attached to the attempt. Logging failure cannot prevent the original call. The owned test tray says `자동 검증`; production app files remain untouched. This improves later exit diagnosis without claiming a cause for the prior incomplete profile.

Validation in this task:

- Renderer-field + share-field + existing share: 14/14 passed.
- HUD + renderer-field + share-field after strip normalization: 11/11 passed.
- Node runtime and final-check selftests: 34/34 passed; output retained in `DESIGNER_NATIVE_SELFTEST.log` beside this note.
- ESLint over `src/renderer/game.ts` and the three owned TS test files: exit0, zero warnings.

The existing renderer test module initially exposed four expected per-cell-call assumptions after Host's sprite batching; Host took ownership and reported 104/104 after pixel normalization. Host also owns final integrated gates, package rebuild, actual screenshot inspection, lifecycle evidence, native scenario execution and renewed registered performance observations.

The prior retained CPU profile supports measuring sprite raster submission as a candidate cost; it does not prove the v11 regression cause. Renderer state copying and per-frame party sorting are existing costs, so no extra caching, FPS reduction or gameplay scheduling change was made here. The original failed long-duration performance result remains failed until the approved current-source measurement passes.
