# Independent HUD observer and focused visual acceptance

Reviewer: `/root/skills_harness`; no application edits or Electron launches. Scope is the Designer-authored native HUD observer and actual visual evidence. Performance and balance remain open; this is not release approval.

## Source review

Reviewed `ui-cases.mjs` SHA-256 `1c487ecb4ba0661e39cea90e93107dc12380ccf2d12999050f4bda6105f492c3`, `runtime.test.mjs` `600e8526e6ece054ea0dc3781ca780611dd610b8311f4d83368937955796d7b7`, and runtime integration `ce61d1251a1e82931a17705b29128130784e12159a0dadd5d1eddfd0a846d3a9`. Independently executed `node --test .harness/v11/runtime.test.mjs .harness/v11/final-check.test.mjs`: **30/30 pass**.

The conditional breakpoint installs a read-only snapshot closure over actual presentation time, banner and float state. It resolves the unique production `tickFloats(floats, dt)` statement, requires loaded script bytes to equal the packaged script, records zero pauses, removes the breakpoint and detaches the debugger before test input. Snapshots copy values; the observer does not write gameplay state, tick the engine or change duration constants. The retained per-frame history makes startup timing visible rather than hiding it.

`assertDamageTimeline` requires one active float before/after each capture, stable float identity attributes, actual end age in [500,600) ms, glyph ink and outline, field bounds, and y-position matching the unchanged 28/42-pixel lifetime curve across capture-time uncertainty. The regression reproduces a 100 ms startup increment and still rejects wrong positions, early endpoints and expired/empty rasters. No blocking finding in this bounded correction. The snapshot/frame-history observer can itself add overhead; it is visual evidence instrumentation, not the long CPU observer.

## Independent focused evidence review

Artifact: `native/hud-age-diagnostic-1789713291388/diagnostic.json`; source `580bf1b6202d1b18de708622c05577aabb871b1574aae51a843269a0df6369ba`, unchanged during observation. All 38 UI checks and runtime checks passed. Packaged ASAR hash `d1c7dfe681fd4c572ad8a2c9fd929921960cd805194140bec78bbab975e6bb34` matches actual bytes. Observer script hash `898e3c17310a5b82474f746ce1344a191ead0d69ff2ae4a0728ecdc82e79afb8` matches the actual ASAR game script at zero-based line 800, column 12 (`tickFloats(floats, dt);`).

Viewed all ten PNGs through `view_image` and independently decoded them with Pillow. All artifact hashes match. Thirty-nine independently sampled damage/label regions reproduce the recorded colors, ink counts and bounds. The expired level region was excluded from the independent region comparison because FEVER relocates into it; expired LEVEL UP is separately visually absent.

| Capture | Actual float age before–after (ms) | Visible ink pixels | Top y (game px) |
|---|---:|---:|---:|
| Boss start | 113.3–127.5 | 164 | 62 |
| Boss end | 501.0–514.2 | 164 | 44 |
| Normal critical start | 40.0–53.0 | 459 | 57 |
| Normal critical end | 506.0–520.2 | 459 | 25 |

The 18/32-pixel observed displacements agree with the different capture ages and fixed total 28/42-pixel slopes. Both endpoint glyphs remain above the respective HP bar and within field bounds. Normal-hit start/end concern one isolated float after the burst's previous floats have expired.

READY is yellow with an outline; LEVEL UP appears immediately above it and alternates yellow/white slowly; FEVER sits above that stack, changes phase faster, then moves down after LEVEL UP expires. Left counters remain legible, and there is no duplicate top FEVER banner. The captured phases reproduce 116 READY ink pixels, 70 LEVEL UP pixels and 212 FEVER pixels in the normalized game canvas, plus outlines.

The 220-frame history exposes an actual first-float age jump 13.3→113.3 ms when renderer dt reaches its 100 ms clamp. Boss endpoint wall age was only 380.8–398.2 ms while its actual animation age was 501.0–514.2 ms. This supports replacing the misleading wall-age assumption; it does not establish the cause of the stall. Audio initialization remains an unproved hypothesis. Previous failed native attempts remain failed and preserved.

Focused visual acceptance and observer source are approved within this scope. A complete source-bound native run must still pass separately; CPU regression and balance acceptance remain unresolved.

## Full-run pilot05 remains failed

`native/pilot-05.json` at the same source digest passed menu, equipment and restart, then correctly failed `boss-damage-start`: the start snapshot already held two floats at ages ~220 and 80 ms after one requested native input. Retained HP observations show two hits (12580→11322→10064). This invalidates the isolated-single-float scenario and must not be accepted by increasing its start-age ceiling or dropping isolation. The Designer is tracing actual key/mouse events. This does not negate the focused PNG evidence, and it does not grant complete native acceptance.

If event evidence confirms an extra native event, a HUD-only synthetic production INPUT-IPC trigger is suitable for visual acceptance, with explicit labeling and one recorded emission per intended hit. Real engine/update/draw/PNG behavior and all actual-age/ink/bounds/slope assertions must remain; direct engine calls or time injection are excluded. Required trusted menu/equipment latency clicks remain native. Such a trigger does not prove the native keyboard path, and a genuine one-keydown/two-attack product defect could not be hidden by this fallback. No fallback has been approved as evidence until its source and event findings are available.
