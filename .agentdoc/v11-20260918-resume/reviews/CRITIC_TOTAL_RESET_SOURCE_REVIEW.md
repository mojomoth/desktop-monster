# Critic — total-reset source and canary review

Verdict: GO for the full preregistered qualifying evaluation. No remaining blocker found in this bounded source delta. This is not final balance or release approval.

## Independent source review

Compared the R18 archived core with current `formulas.ts`, `collection.ts`, `hero.ts`, `engine.ts`, `monsters.ts` and `index.ts`. Both HP and field companion power now use the same total-reset M; R alone receives its registered count cap. The redundant hero-count HP argument was removed. The bigint helper accepts the full nonnegative safe-integer range and keeps invalid-count normalization consistent. Pure hero/soul reset reducers reject count or soul overflow before producing an accepted mutation, and the engine exits on their error before equipment confirmation/reconciliation or spawn. Open offers and owned assets remain unchanged on those rejections.

The additional full-roster capture fix computes the prospective automatic-release count and soul reward, commits both only if representable, and reports zero reward otherwise. It preserves normal payouts and avoids unsafe saved counters or a fictitious positive reward event. No unregistered balancing coefficients changed.

Reviewed HP restore/spawn/epic replacement, booked party membership and landing damage: existing encounters use `monster.curveRebirths`; only new spawns capture current total resets. Saved total, encounter snapshot and accepted hero history are not normalized into one another. v10 HP and raw companion damage/selection still return before new field scaling. Owned/PvP formulas, type and FEVER arithmetic order are unchanged.

Reviewed Host's menu/share paths, including roster cache key and exact consume/fuse/reincarnation previews, plus Designer's renderer and native observer paths. All use the same encounter snapshot. Regression fixtures intentionally distinguish snapshot from both live total and hero history; the share label oracle uses independent M(3)=148 rather than the production helper. Renderer tests distinguish membership through integer type-rounding ties, retain pixel inclusion/exclusion, and test save/reload. The native fixture now records coherent hero1/total1/snapshot1 and checks actual drawParty IDs and snapshot, rather than treating shared species art as identity evidence. Existing disclosure, latency and raster assertions were retained.

## Independent executions

- `check-total-reset-canary.mjs`: 2,299 exact old/new HP, raw/PvP and field-power comparisons across t=r0..10, relevant curve boundaries and owned growth combinations; legacy behavior also exactly equal. Replayed 64 finite-recovery actions and 11 controlled empty-party actions using recorded RNG and full before/after saves.
- `check-total-reset-guards.mjs`: after the auto-release fix, verified current source/compiled hashes and replayed all64 fresh finite-recovery actions plus32 actual actions in the post50 all-companions-removed boundary. Full saves and exact RNG consumption matched; no report boolean substitutes for this replay.
- Focused verifier/final-check Node tests:42 passed (`CRITIC_TOTAL_RESET_VERIFIER_SELFTEST.log`). Includes deliberately stale counter snapshots, arbitrary inter-action soul grants, non-full-roster releases, changed retained companions, omitted preparation, missing/censored trajectories, null p10, reused holdouts, forged reset RNG/outcomes and altered candidate bindings.

The first canary script initially had an incorrect relative import; correcting that evidence-script path was necessary before its successful execution. This was not a production or test-expectation change.

## Outcomes and limits

One-seed quota1/3/10/50 canaries have all12 hero intervals at least161m20s. With50 recoveries, first hero is206m40s including8m35s preparation, compared with the archived R18 counterexample's6m20s including its preparation. This supports the repair direction; it does not establish the registered80-row p10 guards.

The zero-owned-party controlled path recaptured4m22s after recovery and first accepted a hero232m40s from start. The legal five-companion removal path recaptured2m26.8s after recovery and first hero299m20s from start. After the actual50-recovery receipt, legally sacrificing all30 companions led to a new capture9m35.2s after removal and a hero209m35s after removal,218m10s including farming. These controlled paths did not demonstrate a permanent stall. They are not population quantiles or a certification of every management strategy; no extra eligibility restriction is justified by the earlier static ratio alone.

The verifier now accounts for the existing one-soul-per-two automatic full-roster releases between recoveries, using exact releasedCount differences and immutable retained companion checks. It does not allow arbitrary unrecorded grants or sacrifice actions in the registered finite-farm policy.

Full selection, finite80, fresh280 on126001..126100, unchanged original23 groups, all existing management/growth/reserve/no-reset diagnostics, current native screenshots/pipeline traces,30-minute candidate performance slots and packaged artifact checks remain required. Historical125001..125100 is explicitly consumed; old passes are retained as historical evidence.

My verifier and charter edits require Host review. Balance charter now defers to the exact approved CONTRACT scope, freezes XP/capture/owned-PvP, and makes consumed holdouts and preparation-time accounting explicit. Other charters contain no conflicting narrow balance scope.
