# Balance final judgment — v0.9

## Decision

Accept the bounded v0.9 balance, ranking, recovery and selected-opponent behavior. No additional progression tuning experiment is required for this change. This judgment follows the Designer review and Critic implementation review 05; it does not replace the remaining native performance and platform release checks owned by Host.

## Progression and battle invariants

- The final core verification command `node .harness/v9/regression.mjs verify .agentdoc/v09-20260915T084032Z/core-regression-2.json` passed again after the final coordinator correction.
- The preserved v0.8 compiled core and candidate core produce identical paired results for 100 seeds × two policies × 30 virtual minutes: 200/200 cells match their event hashes, RNG draw counts, minute-state hashes and final saves, excluding only the additive capture-quota metadata. This is regression evidence for those policies and duration, not a new 12-hour balance study.
- Initial capture entitlement is independent of the irreversible companion allocator. Focused tests cover legacy migration before high-water application, exactly five initial allocation slots after reset, restored remaining quota, rejected/full-roster deliveries, and trusted monotonic `syncAllocation` without quota changes.
- Four ranking views separate level, official PvP wins, maximum stage and rebirths. Equal selected values share ranks; ranking order does not change battle power or rewards. Level/stage/rebirth uploads retain the existing self-reported model; official PvP records remain server-owned.
- The opponent directory remains explicit. A clicked opponent invokes that opponent's match and battle using the saved party. Critic 05 closes the recovered-A/requested-B mismatch: A is recovered and durably applied before B is requested; B cannot receive A's success as its own result. Specific cooldown/stale-party rejections clear safely, while uncertain outcomes retain recovery state.
- Permanent revocations and transactionally allocated transfer/theft IDs protect new ownership moves from reset/restore and repeated-seed aliasing. Critic 03 reviewed successful local PostgreSQL 16.15 migration, filtering, allocator, rollback and receipt-replay evidence. All writers must adopt the new allocator before universal no-reuse claims; previously discarded historical IDs cannot be reconstructed.

## Final installed-app verification

Executed `native-05` against the app copied from the final DMG:

- App: `.agentdoc/v09-20260915T084032Z/installed-02/DesMon.app`
- ASAR SHA-256: `3692e162a73de3df7e596ee0756277dfe3496b26edd1591f6e1ce994ad00f044`
- Report: `.agentdoc/v09-20260915T084032Z/native-05/native.json`
- Verification: `node .harness/v9/runtime.mjs verify .agentdoc/v09-20260915T084032Z/native-05/native.json` → `V09_NATIVE_UI_OK`.

Both launches compared 109 packaged build/static files against the workspace with zero mismatches. All 29 UI checks passed, including four rankings, one-click selected battle, saved manual party, cooldown, reset cancellation/confirmation, stale-generation rejection, restart, restore cancellation, recovery and backup-before-restore. Eight real 1200×1200 PNG outputs passed decompression/scanline validation, covering all six share kinds plus the monster codex and clipboard image. Twelve actual window screenshots were preserved.

Both owned app processes exited 0 without signals, native hook loads, permission prompt attempts or diagnostic errors. The server adapter used exactly two synthetic accounts and production `createApp`/`MemoryStore` behind intercepted fetch; no real service or personal user data was used. Source, build and evaluator hashes stayed unchanged throughout the run. Earlier failed harness-fixture attempts remain preserved.

## Remaining scope limits

Designer retains the documented P2 effect-contrast limitation and P3 sparse-card polish observation. Atlas geometry and native screenshots do not establish universal human perceptual distinctness or enjoyment. Visual-02 was handed to Designer after both native-05 apps closed; Host's final native performance queue must run without overlapping apps. Windows/Steam hardware validation and production deployment remain release conditions separate from this balance acceptance.
