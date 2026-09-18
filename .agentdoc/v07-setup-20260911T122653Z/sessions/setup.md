# H07-01 setup verification

Scope: v7 harness preparation and unchanged v0.6 baseline only. All required setup commands below exited 0 on the same final source/evaluator and owned files. V07-01–07 remain pending in setup phase.

- node .harness/v7/loop/fun.mjs selftest
  - exit 0; log /Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z/evidence/H07-01-1789132407979.log; SHA-256 b24a8f09c17fb2dfad0115ea87daf41e5f14a0f0838bd3ff74500543444ad29a
- node .harness/v7/loop/measure.mjs verify '/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z'/evidence/baseline.json --phase baseline
  - exit 0; log /Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z/evidence/H07-01-1789132877692.log; SHA-256 6325b7ea40565d51a1e8f77f165eb1a79674648bfcfc62c4880d34448e9f4a24
- node .harness/v7/loop/setup-check.mjs '/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z'
  - exit 0; log /Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z/evidence/H07-01-1789132878185.log; SHA-256 a3eeb0d62dda99732113344b967e11d20fa1e64fee9def1030482a1841de7fac
- npm test && npm run lint && npm run typecheck
  - exit 0; log /Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z/evidence/H07-01-1789132418732.log; SHA-256 b5a3ed745d97785ebac8e8db957f5c84373a04c4c90ed367b4770735bf90053b

Harness tests: 98 passed in 9 files. Repository tests: 776 passed in 52 files; lint and typecheck passed through the exact canonical gate line. No tests skipped/weakened and no lint/TypeScript strictness change.

Baseline: all 100 seeds (1–100), 11 checkpoints through 720 minutes each, RNG/clock/input-injected production engine, 100ms ticks, fresh game, uniform 2 inputs/second, no spending or companion management, immediate first-offer choice. Raw artifacts are immutable and strict baseline phase verification passed. First ready/open/accepted p50=78.5s, p10=76s, p90=80.5s; 100/100 succeeded by90min. v0.7 median target FAIL as expected for baseline. Named final unlock stage not preregistered yet, so no8–12h milestone success claim. No eligible/selected-hero/killed-species count increases after2h in this policy across100seeds.

Independent Python raw check: unique seeds1–100; exactly11checkpoints; 86,400inputs/seed; 0spent; firstAccepted events match population median and deadline; all post2h content count deltas0. Full raw data and table at evidence/baseline.json and baseline-checkpoints.csv. Calculation elapsed412.424804625s; this is simulation, not1,200hours human/native play.

Original product/179files preserved; app0.6.0 and CURRENT=v3. Four preexisting .agentdoc demo scripts had64lint errors; backedup original bytes then repaired imports/semantics-preserving syntax and generator. Targeted eslint, syntax, generatedadapter equality and embeddedstring invariance passed. Review diff and SHA inventory are preserved. No product/v5/npm command changes.

Cross-review fixes resolved: M1 transient eligibility observed at event/decision boundaries; C1 strict phase acceptance; C2 package AC rebuilds current source before inspecting; C3 registered original-artifact SHA/path sets rechecked on taskverify andphase. Independent author/reviewer records under reviews/. Earlier interrupted attempts64/36seeds retained separately and excluded fromfinal100. No fabricated four-role game audit was submitted.

Future game implementation, candidate protocol/milestones, actual native shortmatrix+180minjourney, smoke, package, server compatibility/deployment, and human fun remain PENDING. Resume from docs/v0.7/START_PROMPT.md; advance setup→candidate before editing source/protocol.

Source SHA-256: c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef
Evaluator SHA-256: 4933f879e09866b5d660d420842a274c1ff85914d71c703d7d175f81b6766823

Summary/evidence hashes:
- reviews/final-contract-review.md: bea616b2b46bab07868bcd9a483cf19a8b62010c06068418f668df45c99cdc7f
- reviews/cross-review-measure.md: e973f939b6a60224203a0f766aa6ce0f96c3564645df07ddf841e38ddd32e0ab
- reviews/artifact-binding-review.md: 478e025a02862242895ab986e8c30cbb72a604cea22f5af22f9278cb8477e2a3
- reviews/preexisting-lint-repair.md: f318f15466f90e1eecf0f6a36cc818ff0b5e79d15bebce0ec1ab2b38111766db
- evidence/setup-result.md: 33de53b578718104388b3de829c62d21f370493972fcf5253a32d1b4d02751c3
- evidence/setup-result.json: 7150335cd281610b3371cc3cfe7b54523fbae1c5381e71ceaaec07876d63fa94
- evidence/baseline-checkpoints.csv: 1eed71b76843eba9d01889e4ed953df0b9c7ba65ac42d67c5bbfe9d4c24348bd
