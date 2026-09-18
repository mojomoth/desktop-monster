# Designer encounter-reset consumer handoff

2026-09-18. Author handoff, not independent approval of these consumer/native changes. Critic owns final scope review. No Electron, production core/menu/share edits, full gates, evaluator/protocol changes or journal mutation by Designer.

## Implementation

Renderer field selection now passes the current monster's curveRebirths (missing→0), and its curveVersion (missing→10). It does not derive this from current total resets or accepted heroes. Renderer test oracles follow the same encounter contract.

Two new discriminating raster regressions hold live total resets=2 and accepted heroes=1 while separately restoring encounter snapshots0/2. At snapshot0, weak and normal tiny hits both floor to1, so c5 wins the ID tie; at snapshot2, M=85 yields weak42 vs normal85, so c6 wins. The actual correct party's sprite sequence must appear and the alternate snapshot's party must be absent, before and after save/reload. Thus passing the wrong counter cannot silently pass through a common scalar that normally preserves ordering.

Native field fixture is now internally consistent: hero accepted count1, total resets1 and encounter reset metadata1. Conditional draw-party trace records snapshot count. Field label/membership oracles use the actual encounter snapshot; legacy, new-spawn and post-growth phases each require live/save/trace metadata agreement. Unit regression rejects stale snapshot evidence. Existing strict same-DOM/open/focus/order/page/scroll checks across an actual coin-changing save are untouched.

## Focused verification

- renderer104 + renderer-field9 + hudV11 8 =121/121 Vitest passes.
- runtime24 + final-check13 =37/37 Node passes.
- Scoped ESLint for game.ts and the two renderer test files exits0 with zero warnings.
- Native package screenshots/clicks remain pending; this author handoff does not confer visual approval.

## Independent bounded core-delta read

Compared current formulas/collection/engine/hero/monsters/save against archived r18-explore/source-core. No blocking code finding in the inspected delta. HP and field companion power share fieldResetCycleNumerator, using safe integer total resets without the old hero-specific1,000,000 saturation; cap4 applies only to R. Engine volley booking and landing damage read current encounter snapshot. New encounters and both reset reducers record updated total; restoration uses saved snapshot/default0. V10 returns legacy HP/raw companion power before M. New reset-counter/soul overflow guards execute before mutation; the save parser, owned values and raw PvP paths are unchanged. This is static review, not proof of balance or empty-party safety; registered diagnostics and independent Critic acceptance remain required.

## Authored source binding

- `src/renderer/game.ts`: `2eb9bfeb4ef3c1b27a21f1f543c4558da3a0e1f980399f9a97bc7904f073b654`
- `tests/renderer.test.ts`: `5cd5f007a23dcce62530fd16e6892b7f0dd7f2269147e63b78baac6541eb41bb`
- `tests/renderer-field-v11.test.ts`: `c04e8df9c142d0a00cbf01a219c753c485eb5aa5ee3fd913ad1e4ab9a8f31d98`
- `.harness/v11/runtime.mjs`: `4facb16b9317ff36d6d90c3cb70d91133c44615ab3211b6a70c38a5cac9c71b3`
- `.harness/v11/ui-cases.mjs`: `78af77b498d909965686276d22a04e4f079d2d20913b96bb37a9cfe02f89562d`
- `.harness/v11/runtime.test.mjs`: `c89ee37a99f100db427f72a431ce2ca0c67c2e5836823aedc90b1ecf7d1584d3`

## Inspected core binding

- `src/core/formulas.ts`: `bf1013d844f9fba0a1173f2173486723372df684c3e8d22acdf94ed847a8f942`
- `src/core/collection.ts`: `47b0edab26436932cb6a723539c9b35b3eb22b3534567fe9750e993c6a9369f1`
- `src/core/engine.ts`: `a3b57f221a1eb9eff87fe16b89540dc707cedae13e6cee2fd595ae96af463e96`
- `src/core/hero.ts`: `5d35d3cc29f2113f82e1538cbd51f8887e1ba052019c751e7277fcc33f429693`
- `src/core/monsters.ts`: `e6eb1e4ccaf09beac39a6b7baa0c47236bbc61ec239f95791e97423a4fc77ebb`
- `src/core/save.ts`: `cfee1463f4c64d6168c897e9db4733c44889d8c45de94e2d9897a7c54edfca30`
