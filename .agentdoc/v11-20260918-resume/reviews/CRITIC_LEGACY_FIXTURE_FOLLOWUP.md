# Historical progression and current field-party oracles

Reviewer: `/root/skills_harness`. The two narrow test corrections preserve their intended assertions. No product/core/evaluator change was made by this reviewer; no heavy tests or Electron were run.

`progressionV5.test.ts` retains the exact historical17-based stepped sequence, large-count plateau and invalid-count normalization under explicit legacy parameters. Its readiness threshold and defer checks remain and are also exercised separately against the adopted exact26 plateau. Offer persistence compares against the actual required level for that same reincarnation count, while the independent exact26 test prevents this from becoming a tautological progression oracle. The dynamically mocked module is restored in finally.

The renderer's post-spawn party oracle now uses field power with the current hero, accepted count and encounter version. Independent fixed ID expectations distinguish the initial legacy water party from the seeded v11 earth party. The original changed-membership assertion and current-party sprite inclusion/previous-party sprite exclusion remain. This preserves behavior coverage while removing the stale assumption that post-migration hunting uses raw PvP power.

The required core review bindings now include `tests/progressionV5.test.ts`; visual bindings include `tests/renderer.test.ts`. Their hashes must be captured in final receipts after the new global source freeze. This test-source approval does not resolve the separately recorded finite-soul-farming balance counterexample.
