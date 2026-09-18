# Rare third-choice UI coverage — independent Critic preparation

Reviewer: `/root/critic`. Read-only coverage investigation; not a formal fun decision, implementation approval, executed Native result, or release audit.

**Finding: the original checklist/tests did not establish actual selection of a rare third card, including h70.** This is a concrete coverage gap, not evidence that the product cannot select it. The existing standard-first-slot scenarios and h70 engine tests remain useful and must be retained. Historical Native attempt02's 41 passing diagnostics do not certify this missing scenario or final 0.7 source.

| Evidence inspected | What it actually establishes |
|---|---|
| `docs/v0.7/DESIGN_DECISIONS.md:110` | Canonical policy chooses `choices[0]`; rare candidates appear in slot three. The design separately promises rare-choice UI verification. Eligibility is distinct from actual selection. |
| `.harness/v7/loop/electron-e2e.cjs:178–191` | Natural menu visits click the first enabled `.hero-choice button`; the resulting form ID is recorded. This does not exercise the third card. |
| Same file, lines 297–310 | Fixture diagnostic opens three actual candidates and clicks the first button. It checks reset/preservation and replays `choices[0]` with the serial to reject a stale action. No rare ID is asserted. |
| Preserved `rare-choice-repair/journey.cjs.original.txt:72–94` | The codex scenario explicitly stores `choices[0].formId`, clicks the first card, and checks only that selected card's disclosure, goal, unread, ACK and reload. It does not select h70 or another third-slot rare. |
| `tests/menu.test.ts:912–937,1081–1097` | Fake DOM checks three rendered cards/art/buffs and serial-bound dispatch from button `[0]`; the repeat fixture is h01/h02/h03 and also chooses h01. |
| `tests/heroMenuReadiness.test.ts:24–36` | Direct fake-element listener invocation accepts the first standard h01 card from an old offer. No native event or third-slot rare. |
| `tests/progressionV7.test.ts:115–164` | h70's exact 29,999/30,000 eligibility boundary, real offer eligibility/six-draw invariants, and legacy pending rare acceptance are tested in core. The legacy test calls `engine.apply(heroChoose)` directly; helper `pendingChoices` at lines 20–23 places the requested rare **first**, not third. It intentionally tests acceptance while the new eligibility condition is unmet. |
| `src/menu/hero.ts:73–84` | Product rendering binds every card's button to its own `formId` and `offerSerial`, including rare label/name/art. This supports the intended mechanism but cannot substitute for a UI test of the third-card binding. |
| Preserved `rare-choice-repair/e2e.mjs.original.txt:10–21` and `e2e-matrix.test.ts.original.txt:102–116` | No rare-selection required check or dedicated omission regression existed. Matrix aggregation requires the exported list at `.harness/v7/loop/e2e-matrix.mjs:87`; an unlisted scenario could be absent without invalidating old reports. |

The smallest meaningful completion is a separate synthetic diagnostic **after natural observation**: present a valid current-condition offer with h70 in slot three, use the real native click/preload/IPC path for that specific card, and inspect actual post-action state. The fixture should satisfy h70's ten distinct acquired heroes and 30,000 kills, current offer level/rest/serial rules, and three distinct element types; accepting an ineligible legacy offer alone would test a different contract. Assert h70 is equipped and added to collection/history/counts, the correct reincarnation/reset occurs once, and the intended retained resources remain. A screenshot should make the rare third card and selected result reviewable. Existing generic codex/ACK and stale-token checks remain in place; targeted h70 disclosure/persistence checks can strengthen this scenario.

This proves UI selection from a **synthetically presented valid offer**, not natural h70 acquisition, natural roll frequency, a 12-hour policy outcome, or human observation. Natural first-slot policy and the continuous 180-minute ten-minute menu schedule need no change. A fake DOM third-card dispatch check would also be useful but cannot replace the actual Native scenario.

At this report's completion Host has accepted the gap and begun the registered additive repair after the 0.7 version change. I observed `v07-rare-third-choice-ui` added to current `e2e.mjs:21` and the explicit missing-check regression list in `e2e-matrix.test.ts:111`; Designer's journey diagnostic was still being prepared. These are static observations only: I did not execute tests/build/Native, and the completed additive implementation and fresh actual Native evidence remain **PENDING independent review/execution**. Final V01 review/affected AC/gates and final Native runs must use the newly frozen source/evaluation; no old report is recertified here.

Scope disclosure: no validation report, candidate.json or status document was opened and no numerical investigation was performed. A broad search for design/coverage terms unintentionally printed the new DESIGN section 6 validation summary line. Host was immediately informed; this report therefore does **not** claim validation-value blindness. Host then clarified that the now-completed adopted Round08 summary is permitted for this final-preparation stage; the earlier ban on failed historical raw validation and in-progress values is distinct. Those values are not reproduced or used here, and no numerical retuning is proposed. Only this new report is written by Critic.

Read evidence SHA-256 (original repair files are immutable baselines):

- `.agentdoc/v07-setup-20260911T122653Z/evidence/final-native-preparation/rare-choice-repair/journey.cjs.original.txt`: `ebf83311ec5092cccac8e0e6996c15f6716932a4f37b4e095b34209e2feda311`
- `.agentdoc/v07-setup-20260911T122653Z/evidence/final-native-preparation/rare-choice-repair/e2e.mjs.original.txt`: `1da066dbae9d58f654ebfcee7d88e56a3bbc804338d23920ae6292f1e6021f1b`
- `.agentdoc/v07-setup-20260911T122653Z/evidence/final-native-preparation/rare-choice-repair/e2e-matrix.test.ts.original.txt`: `935be3d5e1a52628393c251e657261d6da24aeb51023eafeaf868fdd4b8f07e9`
- `.harness/v7/loop/electron-e2e.cjs`: `4ebdd9e8f31b73a19c632245234fe5c064c8f9fc13d80258725420003c240cdf`
- `tests/menu.test.ts`: `d9c5602443e391846007829539d96e151d1e7cbb8df93b78e3e18521cc061ddf`
- `tests/progressionV7.test.ts`: `18e06a53aae0c70416d4d0f4032abefc1686ee228e8173bc1f5443c38ab51dbb`
