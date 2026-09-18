# Preexisting demo lint repair

Reviewer/implementer: `/root/ui_pvp_review`. Root-authorized prerequisite repair, restricted to the four preexisting files below. Product source, v5/v7 harness files, dependencies, ESLint configuration and rules were not changed during this repair.

Originals were backed up before editing:

- `.agentdoc/v07-setup-20260911T122653Z/baseline/preexisting-demo-scripts.tar.gz`
- `.agentdoc/v07-setup-20260911T122653Z/baseline/lint-repair-originals.json` (source of the before hashes)

## Changes

Both demo scripts explicitly import Node `process`, `Buffer` and `console`. Both generated adapters also explicitly import Node timer functions. The adapter's unused conditional expression becomes an equivalent if/else; the unused rest-destructured binding becomes a fresh `retainedProgress` result with its `codex` property deleted. Redundant template quote escaping was removed without changing the generated JavaScript string.

Each demo's adapter generator applies the same changes to the v5 source in memory. Regeneration therefore preserves the repair without editing the frozen v5 tool. The demo bodies and packaged application were not executed.

## Validation actually performed

The same targeted ESLint command reported 64 errors before the repair and exited 0 with no warnings/errors afterward:

```sh
npx eslint .agentdoc/v06-live-demo-20260910T151800Z/demo.mjs .agentdoc/v06-live-demo-20260910T151800Z/package-demo-adapter.mjs .agentdoc/v06-live-demo-20260910T151800Z-attempt02/demo.mjs .agentdoc/v06-live-demo-20260910T151800Z-attempt02/package-demo-adapter.mjs --max-warnings 0
```

These exact syntax checks were invoked through Node `spawnSync`; all four exited 0:

```sh
node --check .agentdoc/v06-live-demo-20260910T151800Z/demo.mjs
node --check .agentdoc/v06-live-demo-20260910T151800Z/package-demo-adapter.mjs
node --check .agentdoc/v06-live-demo-20260910T151800Z-attempt02/demo.mjs
node --check .agentdoc/v06-live-demo-20260910T151800Z-attempt02/package-demo-adapter.mjs
```

A read-only Node assertion script evaluated only the adapter-generation expressions, confirming that each result exactly equals its stored adapter. It also compared the cooked `data-discovery-id` template strings against the original v5 source, confirming identical generated JavaScript. Output: `DEMO_SYNTAX_4_OK; ADAPTER_REGENERATION_2_OK; TEMPLATE_RUNTIME_EQUIVALENCE_2_OK`.

No full npm test suite or actual demo/Electron process was run for this bounded repair. Root owns the subsequent repository-wide lint/typecheck verification.

## SHA-256 before and after

| File | Before | After |
| --- | --- | --- |
| `.agentdoc/v06-live-demo-20260910T151800Z/demo.mjs` | `296444918589ddf3e4334bf6facb10275e7bc62d8103a18a49dfa6e7b697bdc3` | `261d3ceed5800efa8929e712b62e75f7afb6e6764d2ecacf268ea560ca80d6a8` |
| `.agentdoc/v06-live-demo-20260910T151800Z/package-demo-adapter.mjs` | `4acd0cd1a3b56ffce82c19ed0d6d6b472b1eb961a28ef5a37539d6f386f04f9a` | `b07f0cefd8e3c6b605bb7e470652e64350d3700ac44b8fad105849339e7d8231` |
| `.agentdoc/v06-live-demo-20260910T151800Z-attempt02/demo.mjs` | `c6bd7635ae09f50d417a9df77f02446d8898edb0da684deff3d61e154952a6a6` | `0cb147f64f2760f7c4aa29a143cfa6c811c16bf40492c472d6ac94efffd550c8` |
| `.agentdoc/v06-live-demo-20260910T151800Z-attempt02/package-demo-adapter.mjs` | `4acd0cd1a3b56ffce82c19ed0d6d6b472b1eb961a28ef5a37539d6f386f04f9a` | `b07f0cefd8e3c6b605bb7e470652e64350d3700ac44b8fad105849339e7d8231` |
