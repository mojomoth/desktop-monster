# Native evidence correction and timing validator handoff

Reviewer/validator implementer: `/root/skills_harness`. No Electron launches or app-source edits. Observed source digest during handoff: `91df520f6c76945e4b9677646798de70142532519ffc4a53f0a37bd038774706`; native observer implementation remains in progress, so this is not final-source approval.

## Independent review of Designer's correction

Reviewed `.harness/v11/ui-cases.mjs` at SHA-256 `db2b9277904c556efab1114d57f5cfa672414933bf4ec23834dc373902788071` and `runtime.test.mjs` at `a383695b250d80a6783490899c78915a22a150146811224cf75fce70c12a53db`. Independently ran `node --test .harness/v11/runtime.test.mjs`: 9/9 passed.

The correction directly addresses C11-NATIVE-01: three frame callbacks settle startup scheduling, the 500 ms endpoint remains, and the actual captured PNG is decoded on a detached canvas. Checks require outlined damage ink within field bounds plus upward displacement; head labels require complete glyph pixel counts, expected color and vertical location. A pure regression recreates the old 100+512 ms expired-float false positive and rejects its empty raster. New native captures are still required; this source change does not approve the old failed pilot.

The native duplicate-click case sends two physical click sequences together, records both trusted click events strictly before one correlated accepted result, and requires exactly one equipment revision increment plus normal success feedback. It is excluded from ordinary latency samples. Pure counterexamples reject sequential-after-ACK clicks, duplicate ACKs and repeated mutations. No blocking source issue found in these corrections.

## Critic-authored validators requiring Host review

`final-check.mjs` hash `153b9e39f1356089a38ab683f9b66777c0ca76aa1ef0d92cae8d7274c597a69f`; `final-check.test.mjs` hash `25db01ebd6b4f5d7c6febf14cd38b2fa00fa5388bc11913a1245e3605781f77d`. Independently executed implementation tests: `node --test .harness/v11/final-check.test.mjs`, 12/12 passed. This is an implementation handoff, not self-approval.

The validator now requires action-correlated conditional-CDP events at actual main MENU_ACTION ingress, before `engine.apply(a)`, and immediately after its successful return. It checks source paths, loaded script hashes and resolved statement coordinates against packaged ASAR bytes. ACK remains distinct from apply, and initial pending-feedback paint may precede apply; result feedback is measured at `resultAt`.

Raw before/after menu/field calibration probes must reproduce their offset intersection and bracket the measured action. Same-clock core duration is exact. Cross-clock stage intervals retain calibration uncertainty; contradictory ordering fails and overlapping intervals remain explicitly unresolved. No new performance threshold is invented. Complete main/field event arrays must match grouped samples, with no pauses, overflow, duplicated stage, changed location or clock reset. Latency family samples must also equal the scenario's observed samples.

Counterexamples cover missing/duplicate markers, ACK substituted outside core-return order, wrong source statement/hash, rejected core outcome, changed clock origin, fabricated offsets, incompatible before/after probes, unbracketed samples and detached raw records. The Designer owns actual probe installation and collection; its behavior still requires a pinned-runtime pilot. Conditional tracepoints can affect JIT/observer overhead, and double-rAF is a feedback-frame proxy rather than a monitor presentation timestamp.

## Completed observer integration review

Independently reviewed the Designer's final integration at observed source digest `1b7aaa0cc21d4edada0f2c562e8b3b878056e91af77e6a5597256baacb139642`:

- `ui-cases.mjs`: `7b8720d49d30bf782aa66a3a803506e6b52d6bb6a3db6f93f4e667b663ff2040`
- `runtime.mjs`: `9a435149fcbf0a02c85ce758e07b013894554ad4f5b9221ab36d95a3f3823100`
- `runtime.test.mjs`: `eb396614f9c9f111705934502aeea565d68f19194b1b3db64d8964b6a1ef4965`

Executed `node --test .harness/v11/runtime.test.mjs .harness/v11/final-check.test.mjs`: 24/24 passed. The public-CDP fake executes generated setup scripts and conditional recorder expressions, returns source locations and loaded source, reconstructs calibration, passes the independent stage/trace validators, and verifies removal of listeners/breakpoints and renderer/main inspector detachment. It does not substitute for a pinned Electron pilot.

No blocking code/schema finding. Main ingress and field core-call return markers use the agreed actual statements and return false from their recording conditions. Both loaded and packaged source hashes must match. The observer retains 20 before plus 20 after probes per renderer and complete raw chronological traces, then correlates with the full production ACK action/revision. On failed scenarios, runtime attempts to preserve partial trace/probes and calls idempotent cleanup before closing the isolated app. No production IPC payload, private invoke-handler table, or game clock is changed.

Normal damage now uses a single new attack after previous burst floats have expired; its start/end raster displacement cannot be attributed to a different old critical hit. Fresh boss/normal PNG assertions and actual non-pausing probe behavior remain mandatory for pilot02. The harness is ready for canonical gates/AC and a new native attempt after performance observation cleanup. Overall release and balance approval remain withheld.

## Pinned clock precision correction and actual pilot03 trace review

Pilot02 remains failed. Its unadjusted menu/field calibration intersections were disjoint by 0.093262/0.059814 ms. Independently inspected the pinned Chromium 142.0.7444.265 primary sources: [time_clamper.h](https://chromium.googlesource.com/chromium/src/+/142.0.7444.265/third_party/blink/renderer/core/timing/time_clamper.h), [time_clamper.cc](https://chromium.googlesource.com/chromium/src/+/142.0.7444.265/third_party/blink/renderer/core/timing/time_clamper.cc), and [performance.cc](https://chromium.googlesource.com/chromium/src/+/142.0.7444.265/third_party/blink/renderer/core/timing/performance.cc). Non-isolated renderer timestamps select either adjacent 100-microsecond boundary using a jitter threshold. The fixed origin error is absorbed into the calibrated offset; each changing timestamp therefore needs a full quantum error bound. The earlier statement that same-clock duration is exact is superseded: the raw delta is retained with explicit ±two-timestamp measurement bounds.

The observer and independently authored validator now require the exact pinned runtime, non-isolated context, and 64 distinct readings both before and after the measured batch. Observed minimum step and lattice must match 0.1 ms. Every probe and mapped event includes its own quantization bound plus two computed IEEE754 epoch ULPs; arbitrary drift tolerance is not accepted. Both original unadjusted intersections remain in the report. Same-clock deltas expose error bounds and unresolved ordering for sub-resolution stages. Adversarial tests reject a larger incompatible drift, forged quantum/version/isolation, off-lattice observations and missing phases.

Owned validator hashes at freeze:

- `final-check.mjs`: `8af588206bbb37bd3d74c3725d9766f82331f0c52adc8a85ea5ed18ea61b1ee0`
- `final-check.test.mjs`: `614d68e976e6bb6c1695944951ded46e5a9fceb9c786db1c9707714c0f6676d1`

Independently executed runtime + final-check + performance tests: **37/37 passed**. Host separately reviewed the Critic-authored precision implementation. No source edits were made during native03.

Read actual `native/pilot-03.json` at source digest `5d88be04ba209901b5b4865fc7906a3923f5ccf5188b6d9c62adba222b27409d` (`sourceUnchanged: true`). Re-executed `validatePipelineTrace`, every `validatePipeline` with the actual packaged ASAR scripts, and `validateLatency`. All 107 measured equipment pipelines pass against the 111 raw main and 222 raw field events, with zero pauses/overflow. Both contexts retain 40 raw probes and two 64-reading observations. Unadjusted intersections again disagree (menu 0.098877 ms, field 0.046875 ms), while bounded offset intersections are respectively [0.015479, 0.117578] and [-0.094385, 0.059717] ms. This is actual runtime evidence for the precision model, rather than only a fake-CDP test.

Raw core-call durations range 0–0.5 ms; 101/107 are explicitly unresolved at timer precision. Feedback p95 is 24.4 ms for tabs, 24.7 for disclosures, 23.5 for growth selection, and 24.1 visual / 36.5 applied result for equipment. These remain double-rAF feedback proxies, not monitor presentation timestamps. Conditional tracepoint overhead remains a measurement limitation.

Pilot03 as a whole still **fails**: the HUD evidence helper indexed `frames[-1]` for a space character. Designer's bounded correction skips negative glyph indexes while preserving production text width; regression compares serialized geometry against actual compiled font drawing for READY, LEVEL UP, spaces/unknown glyphs and scale-two FEVER. Independently ran runtime + final-check after this correction: **29/29 passed**. No blocking finding in that correction. A complete new native attempt with verified actual PNGs is still required; no overall native, performance, balance or release approval is granted here.
