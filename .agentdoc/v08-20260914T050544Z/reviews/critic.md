# v0.8 independent Critic review

Reviewer: `/root/critic`. Product code and previous harnesses are read-only for this role. This report records planned checks and later observed results separately. Isolated short packaged-app diagnostics were executed in `/tmp` to diagnose the performance observer; no production request or personal app/save access was performed by this reviewer.

## Accepted contract

- macOS external-test candidate; 420×640 fixed menu, current pixel font/style and input-driven growth remain. No Windows release, paid-release approval, numerical balance retuning, new content, auto-management, or runtime input disable/re-enable.
- New settings default to `muted=false`, `screenShake=true`; existing size and progress survive updates. First global-input connection is idempotent and starts the existing controller at most once per process.
- Existing online upload/PvP/theft behavior remains. Production checks involve only two fresh owned synthetic accounts; no deployment, database restart, SQL, or other users' battles.
- Human enjoyment, distraction, real OS permission/audio/notification observations remain pending until people actually perform them.

## Implementation acceptance checklist — observed outcomes recorded below

### Menu and settings

1. Normal 420×640 state exposes all three compact hero-choice buttons. Long names, large numbers, and current→projected effects retain visible text through wrapping/scrolling; aria labels do not substitute for missing visible information.
2. Rebirth loss/retention information stays outside collapsed details. Existing offer serial validation, disabled-state rules, keyboard focus, and exact target selection survive presentation changes.
3. Codex acknowledges only displayed discoveries and preserves remaining counts. Empty sections may disappear without clearing discoveries or goals. Full-roster text correctly describes successful-capture release and two releases per soul.
4. One validated preferences read/patch/write path preserves every unrelated field across size, mute, shake, onboarding, and input-choice updates. Missing fields migrate to defaults; malformed patches and failed writes never report persisted success.
5. Native audio muting applies at startup and immediately on changes. Shake changes affect presentation only, without rebuilding or advancing the game engine.

### Input and load/save boundaries

6. A genuinely missing save may start a new game. A present but unreadable/malformed save must not become a new game, trigger normalization writes, start its engine/autosave/network, or overwrite original bytes. Recovery offers opening the data folder and quitting; restored files are loaded after restart.
7. Valid v1–v3 files retain existing tolerant field normalization, high-level companions, hero collection, ACK/goals, balances, identity, and settings. Existing readSaveFile tests are preserved.
8. A save is considered existing before the fresh-install onboarding decision. A damaged existing save cannot accidentally enable the fresh-install flow.
9. New-install skip/close persists window-only mode across restart. A later explicit connect starts one controller; repeated clicks do not duplicate hooks/polling. Existing valid saves retain previous startup behavior.
10. No `isTrustedAccessibilityClient(false)` call precedes the process's first `true` request. UI reports global mode only after actual hook success; hook failure remains an honest disconnected state.
11. Failed disk writes retain the current in-memory game, skip upload/broadcast-as-saved, and update the main-owned error status. A closed menu can retrieve that status later. A load/menu-ready/ordinary state event does not clear it; only successful persistence does.
12. Error paths reject attempts to bypass blocked loading through renderer SAVE_STATE, menu reset/actions, identity/network requests, or the background theft watcher. Normal startup keeps existing online behavior.

### Evidence and performance

13. Review diffs against `preservation/source-v070.tar.gz` and `source-manifest.json`, not against the old Git HEAD. Pre-existing dirty changes are not v0.8 changes.
14. Run meaningful deterministic regression tests and exact gates `npm test && npm run lint && npm run typecheck`; do not replace functional assertions with snapshots of the implementation.
15. Native tests use final source/package bindings, isolated data, synthetic input and mocked network. Existing v7 bootstrap excludes actual main startup, hooks, tray lifecycle, and live PvP; those exclusions must not be hidden.
16. Full packaged-startup diagnostics cover settings, recovery, and closed-menu write errors. Smoke/package success remains separate from real OS permission and human audio checks.
17. Performance compares preserved v0.7 and final v0.8 packages on the same ARM Mac/OS/power/display/scale/settings and identical fixtures. Record all process PID+creationTime, CPU and `memory.workingSetSize` (KB); report the sum as working-set size, not unique physical RAM or RSS.
18. Discard first CPU sample and initial five-minute warmup. Sample every five seconds; pair 30-minute active and warm-idle conditions. Final 180-minute mixed run checks leaks, crashes, unresponsiveness, and persistence.
19. Pre-fixed relative limits: CPU p95 ≤ max(baseline×1.10, baseline+1 percentage point); working-set p95 ≤ max(baseline×1.20, baseline+50 MiB); long-run last stable 30-minute median growth ≤ max(first stable 30-minute median×20%, 50 MiB). Preserve failures and rerun affected scenarios only after a fix. These are regression budgets, not market or battery-life certification.

## Balance adapter review

The proposed v8 adapter may reuse the existing v7 `simulate` while reordering only the copied three-choice list returned by an engine wrapper. Current production `getState()` copies hero progress; original engine state/RNG/actions must remain unchanged.

Acceptance conditions delivered directly to Balance:

- First-card policy must exactly match unwrapped v7 records/actions/checkpoints for identical seed and fixture.
- Repeated wrapped reads must not mutate original choices, serial, save, or RNG; create exactly one underlying engine.
- Record original offer order, original selected slot, and ownership before the real action; verify requested ID equals actual successful acquisition.
- Label new policies and adapter behavior in the v8 schema. Never present reordered views as original natural offer order.
- Pair four policies on common seeds and identical input/clock/menu/purchase settings; separate roster admission, release, final-member consumption loss, current species, and permanent acquisitions.

## Production probe path (prepared guidance, not executed)

Reuse the route/origin/fresh-credential guards and cleanup approach from the immutable v0.7 `sessions/production-live-probe-v070.mjs`. Existing `src/server/probe.ts` does not test battles or reclaim.

Use exactly two new score-zero synthetic accounts with one slime each at boss index 7, A level 250 and B level 11, stars zero, novice heroes. Upload `party: []` so automatic parties expose the entire tiny roster in later previews; a manual singleton party would hide newly transferred companions.

1. Pin observed deployed SHA, register only two accounts, upload fixtures, and preview only the other owned player ID.
2. A requests at most 40 bounded previews in a token's rate window and evaluates each returned seed with existing local `resolvePvp`; execute only a current, owned, non-bot match predicting victory plus theft. If no such seed is reached, retain that outcome rather than claiming success. Preview draws are test setup, not a natural steal-rate sample.
3. Validate actual battle identity, seed, replay/verdict, and stolen payload. Read B's theft inbox. Before any reconstructive upload, read A/B through owned previews and confirm A has two companions, B none.
4. B reclaims only the exact theft returned for B from A; confirm A's transferred ID is gone, B holds the returned new ID, and B's inbox is empty. An optional B→A loss checks attacker-only loss behavior without waiting for A's battle cooldown.
5. Empty both owned snapshots and retain score zero, then verify each via the other owned account's preview. Account rows/battle counts may remain because no deletion API exists; credentials stay in memory and are never logged.

The mutation guard must bind `POST /v1/pvp` to the verified match ID and both owned identities, and `POST /v1/reclaim` to the freshly read owned theft ID. Never use unspecified-neighbor matching, leaderboard opponents, stale external credentials, or restoring uploads before asserting server moves.

## Observed findings

- C08-001, minor, corrected in source: the initial translation in `src/menu/view.ts` theftRows said `회수까지 N시간 N분 남음`, which describes a wait before reclaim rather than the remaining reclaim deadline. The current text says `회수 가능 시간 ... 남음`; actual rendered screenshot remains for the host to verify.
- C08-002, observer blocker, reproduced and workaround verified: the first `Runtime.evaluate` immediately after `Debugger.resume` fails with `Promise was collected`, even when the evaluated expression is a synchronous Boolean and is retained on a global. This happens before screenshots and before the app's single-instance-lock log. Waiting on a stdout marker emitted by the existing `desmon:first-frame` handler before the first `Runtime.evaluate` resolves it. The preserved v0.7 package then ran for six real seconds, accepted 11 synthetic inputs, saved level 2 / three kills, returned five process metrics, and produced two screenshots. Script, report, raw samples, log, and images are under `/tmp/desmon-v08-critic-perf-debug-20260914T051545Z-c*` (the executable script uses `/private/tmp/` to satisfy its entry-point comparison). This is a bootstrap diagnosis, not a performance budget pass: stable-window quantiles are null for this short run. Shared observer source was not edited by this reviewer.
- C08-003, save protection gap, corrected in source: LOAD_STATE initially re-read through tolerant `readSaveFile()` after main had obtained a typed `initialSave`, allowing a later read failure to turn an existing save into a fresh engine. Current `src/main/ipc.ts` uses `latestSave` initialized from the verified snapshot and updates it only after successful persistence. A new runtimeV8 test changes the file between startup and LOAD_STATE and asserts the verified coins survive. MENU_READY now uses the same cache. Other startup-load-error guards cover SAVE_STATE, menu mutation, network operations, input start, reset, and theft watcher startup.
- C08-004, input-choice persistence edge, corrected in source: a fresh installation initially could fail writing settings while game saves remained writable, then be mistaken for a legacy installation on next boot. Current main sets `startupError: settings-write`, blocking engine/progress/network until restart; runtimeV8 includes a no-progress-write assertion. Menu and field distinguish settings-write recovery from unreadable-save recovery. Packaged new-install failure/restart execution remains a separate host check.
- C08-005, performance BLOCKED by repeated tray shutdown: baseline-active-05 stopped around 60 seconds, detached baseline06 around 13 minutes, and queue-01 around 100 seconds. New queue-01 lifecycle evidence identifies `app.quit` through the preserved main entry's tray quit callback (`index.js:158`), `MenuItem.click`, and `_executeCommand`, followed by normal window closing and exit code 0. The shutdown path is now confirmed as the tray Quit command, not an observer timer or demonstrated CPU crash. Who triggered that menu action is unknown. Earlier exact-60-second external-session-lifetime speculation is superseded by this evidence. The queue stopped and the host did not restart it or suppress legitimate Quit behavior. All observations remain incomplete and MUST NOT pass performance approval.

  The reviewer's diagnostics were isolated from these runs: its six-second run ended at 05:17:08 UTC, before baseline05 started at 05:20:09, and cleanup only called `child.kill` on its directly owned child. Its separate 90-second diagnostic at 05:24:15–05:25:45 UTC completed 18 samples / 178 emitted inputs / level 12 / 33 kills / zero errors, with no mid-observation lifecycle shutdown. Evidence: `/tmp/desmon-v08-critic-exit-20260914T052500Z*`. These short diagnostics are not substitutes for any registered 30/180-minute observation.
- C08-006, UI verification coverage, corrected and covered by final native evidence: the initial details-retention diagnostic changed coins from MAX_SAFE_INTEGER to MAX_SAFE_INTEGER−1, leaving `Math.min(coins, rerollCost)` and the entire controls key unchanged. Designer replaced it with an actual heroReroll action, waits for an increased offerSerial, verifies the rules DOM node was replaced, then asserts open state and focus. The native rules summary now has the stable `heroRules` action identity. The remaining bot label is now Korean. The final UI attempt02 passes these assertions; the reviewer independently read that evidence.

## Measurement source review

The current v8 four-policy adapter retains one underlying engine, original offer order, actual successful hero choice and consume actions, and independent raw bindings for all paired seeds. First-card A/C fixture outputs are directly compared against v7 in Balance's tests. Source/evaluator/build fingerprints are checked at beginning and end and on verification/resume. No execution-path bug was found in this source review.

Feedback sent to Balance and implemented: validate checkpoint current species and cap occupancy from captured IDs and consumed IDs, rather than accepting any historically captured species and any bounded 0.1-second occupancy value. The current validator reconstructs the roster with same-timestamp capture events preceding scheduled consume actions, verifies current members/species and cap occupancy at every checkpoint, and recomputes management loss from before-roster/party context. This source change satisfies the additional review condition; measurement execution remains separate.

The full new matrix and final packaged performance have not been independently observed by this reviewer yet.

## Performance comparison verifier — implemented on host request

Added `.harness/v8/performance-report.mjs` and `tests/performanceV8.test.ts`; the running observation script and all product code were left unchanged. Final exact gates `npm test && npm run lint && npm run typecheck` exited 0 at 2026-09-14 14:43 KST: 62 test files / 987 tests passed. The new six tests include the actual Node CLI report/verify path, immutable-output refusal, altered raw hashes, insufficient duration/cadence, missing screenshots, hidden raw errors, incorrect sums/quantiles, mixed phase input errors, memory growth, and post-registration budget relaxation.

The verifier requires five complete observations (baseline active/idle 30 minutes, candidate active/idle 30 minutes, candidate mixed 180 minutes). It reads the registered protocol, pins its approved schedule/settings and exact budget values, independently recomputes raw process sums and elapsed-time window quantiles, and checks raw/PNG/package/observer hashes. Coverage tolerances were declared before completed observations: at least 95% of nominal samples, no first/adjacent/end gap above two five-second intervals, and measured input coverage of at least 95% with two-event boundary jitter. Every mixed active/idle phase is checked separately; emitted counts and coverage are reported. Saved play time must remain monotone and within the same ten-second bound of elapsed observation. Five observation windows may not overlap or reuse the same isolated save directory.

Usage:

```sh
node .harness/v8/performance-report.mjs report OUTPUT --baseline-active BA.json --baseline-idle BI.json --candidate-active CA.json --candidate-idle CI.json --mixed MIXED.json
node .harness/v8/performance-report.mjs verify OUTPUT
```

Invalid/incomplete evidence exits nonzero without creating a passing result. A complete matrix over budget writes `passed: false` and exits 1. Existing output is never overwritten. Relative budget evaluation is not a battery-life, permission, audible-audio, successful-menu-choice, or human-enjoyment claim. Original artifact authenticity and unrecorded thermal/power conditions are outside hash verification.

Read-only inspection found no external symlink in the preserved v0.7 app; its executable, app.asar and Electron framework have different inodes from the release app and link counts of one. No shared-file overwrite route from packaging was found. The host's non-intercepting lifecycle diagnostics subsequently confirmed the tray Quit path described in C08-005.

## Final installed-package review

Verified installed attempt02 app.asar SHA-256 `7f4a217d0bc49255003721841ccc965a01daf4fcd5100e94a4f464ef72455472`. All 102 packaged dist/static JS/HTML/CSS files matched the current workspace byte-for-byte. Independently read startup attempt02 (37 passing checks), UI attempt02 (16 passing checks), all startup runtime outcomes (exit 0, expected no-hook isolation, unchanged app hash), and verified all 15 referenced PNG hashes. The reviewer directly inspected both earlier and final attempt02 normal/long-value screenshots; Designer independently inspected all final screenshots. The final normal image shows all three CTAs with reset/retention information above; long numbers wrap without horizontal truncation and retain natural vertical scrolling.

Approved implementation scope is supported for settings/input-start/load protection and the retained pixel menu. No additional product-source regression was found in this final bounded review. This is not a complete security audit, a performance pass, or Steam release approval. Real OS permission granting, audible output, distraction and enjoyment remain human checks.

Runner follow-up implemented by host: observers and the final verifier now own detached process groups, and interruption signals only the directly owned group's negative PID. Both observation-stage and comparison-stage interruptions preserve `interrupted`. The reviewer exercised a copy of the actual runner with owned Node child/grandchild fixtures, without launching Electron: both stages exited 1 with `interrupted`, no owned descendant survived, and a separate sentinel process was unaffected. Evidence: `/var/folders/lx/2l4_myln77j11v_rskxlc7kr0000gn/T/desmon-v08-groupcheck-5ew0w8ij/result.json`. All test processes were cleaned up. Queue-01 stopped on the app's own tray Quit command, not this interruption path.

After the observer added explicit exit metadata, the performance verifier was additionally bound to `exitCode === 0` and `exitSignal === null`; a SIGKILL report is rejected by a deterministic test. The reviewer's verification passed 987 tests, targeted lint for the new test, and all TypeScript configurations. That full gates invocation initially stopped in project-wide lint because the separately created `collection/attempt01/run.cjs` had 21 require/global lint errors. Balance preserved the executed driver bytes as `run.cjs.executed.txt`, recorded original path/hash/PID in `runner-archive.json`, and subsequently reported exact gates `npm test && npm run lint && npm run typecheck` passing: 62 files / 987 tests, lint, typecheck, exit 0. The reviewer did not duplicate that latest run or edit the running orchestration source. The earlier complete gates and root's `gates-final.json`/`.log` remain preserved. Current collection evaluator bindings were independently compared to disk and showed zero differences.

## Online evidence and acceptance-document review

Independently inspected `.harness/v8/online-check.mjs`, `online/attempt01/report.json`, `events.ndjson`, and `SHA256SUMS`, without making network requests. Both recorded checksums match: report SHA-256 `7906c82530ac51aee6e770f8107d94ff6c48ad3375986fd05dddbd76d2b074c2`; events SHA-256 `7898e0fdbba2b214ec4ba4230e9a2a49e4c2a65d676e93d73cc33a9dc9621124`. All 79 unique check records pass, and all 42 request records match the event stream in the same order. All 67 source/build bindings are unchanged between start/end and match the current files.

The 42 requests comprise two health reads, two fresh registrations, four snapshot writes, 27 specified-owned-opponent previews, one actual battle, five theft reads, and one reclaim. Snapshot writes occur only twice during fixture setup and twice during cleanup. The actual server roster transfer and reclaim checks therefore precede any restoring upload. The guard pins the origin and deployed SHA, accepts only this run's two fresh credentials, binds matches to the other owned account, permits one predicted own-target battle, and accepts only the exact owned theft for reclaim. The selected winning-steal preview is a setup choice, not a natural steal-rate observation. The 79 passing assertions are not 79 independent battle scenarios.

The fresh Node children (post-battle and post-reclaim) import the actual compiled `createNetSession`, read the isolated identity files, perform guarded own-opponent/theft reads using the saved credentials, and verify saved attacker history of one win. This establishes client identity/history reuse across new Node processes. It does not establish native Electron online restart behavior or server process/database restart durability; ACCEPTANCE.md states those limits correctly.

Cleanup passed both empty-snapshot writes and reciprocal empty-roster readbacks, and the temporary private identity directory is absent on disk. Reports/events contain selected public IDs and results, not credential values; child output byte counts are zero. Cleanup is not account deletion: the two synthetic account rows, battle statistics, and possible stale own stolen-ID markers remain, as the probe records. The acceptance/handoff text correctly states that account rows and synthetic history remain.

Verdict: current online claims in `docs/v0.8/ACCEPTANCE.md` and `HANDOFF.md` are supported within the declared two-account scope. No additional product-code correction is requested. Suggested documentation refresh only: replace the acceptance table's planned final-gates recheck with Balance's now-completed exact-gates result. The documents correctly withhold whole technical completion, identify performance as incomplete, and state that human observations number zero. Collection results remain pending until the registered screening/validation artifacts are complete and verified.

Unexecuted checklist items remain open. Performance is BLOCKED by repeated tray shutdown, and human checks remain PENDING; the bounded implementation approvals above do not certify the entire release.

## Completed collection matrix — independent raw verification

The screening and validation matrices are now complete, replacing the earlier pending collection status in this review. The reviewer separately ran both registered verify commands: screening returned `verified: true, samples: 80`, and validation returned `verified: true, samples: 400`, both exit 0. All four screening policies contain exactly seeds 20001–20020; all four validation policies contain exactly seeds 30001–30100. Every run ends at 720 minutes, every listed raw artifact exists, the directory contains exactly the listed raw files, and all raw artifact hashes match.

Preserved report SHA-256 values:

- Exploration: `4620b467a3faffe98e62a977f70780622a908b7282c43e63fafd145526ca2d69`.
- Evaluator freeze: `d43eb85b534a4627e9ac9cc7e9ce6248a2cf458d24f8788b4d214f33b8269b87`.
- Validation: `88faa41a530a0532b4947ab47def24578facd06ba7320327633caaa338340f64`.

Start, freeze, resume, both completed reports, and the current fingerprint match for source/core/evaluator/build/protocol. The original supervisor's `completion.json: FAIL` is retained: its named validation child received SIGTERM during the authorized worker-count transition from 2 to 4, as recorded by `resume-workers4/transition-request.json`. It is not a failed balance threshold or an engine error. The subsequent resume run and independent verification each returned 0; `resume-workers4/completion.json` records PASS at 06:43:10.986727 UTC. Neither the original interruption nor partial raw evidence was relabeled as a successful first run.

In addition to the registered verifier, an independent inline Python calculation reconstructed every roster from capture/release/consume events in all 480 runs and checked all 4,800 checkpoints. It independently matched current companion IDs/species/count, permanent captured species, exact full-roster occupancy, captures/releases/souls, last-member consumption and active-member consumption counts. It recalculated every per-seed summary metric and every paired seed difference, and checked all policy and paired population quantiles. All matched the stored summaries. This recomputation did not run a replacement engine or alter the evaluator.

Validation medians show the interpretation boundaries clearly: A/B permanently acquire 50/67 hero forms and C/D 50/68; lifetime captured species are 27/27/69/70, while currently retained species are 27/27/26/26. Thus more historical acquisition under consume-weakest does not mean retaining a larger current collection. The paired hero difference is B−A +17 and D−C +18; paired lifetime-capture difference is C−A +42 and D−B +43. These are medians of paired differences, not differences of group medians.

`lastSpeciesLosses` counts consumption events that remove the last current member of a species; repeated loss and recapture of one species can produce multiple events. Independent validation medians are C: 57 loss events, 44 distinct affected species, 43 previously acquired species absent at the end; D: 57 events, 45 distinct affected species, 44 absent at the end. Permanent collection records are retained. The last-species metric must not be described as 57 different species permanently deleted.

The 2–12-hour longest collection-gap medians are A 10,200 seconds, B 600, C 2,998.4, D 600. This metric records first-ever accepted hero or actual captured species, including the observation-window boundaries. Hero acceptance occurs only on the registered 600-second menu visits; the B/D result is conditional on that bot visit/choice schedule, not evidence that real players receive or notice a new discovery every ten minutes. The finite 2–12-hour window also does not characterize later play. The model does not establish fun, preference, retention, real work input patterns, or Steam release readiness. Game numbers and the four policies remain unchanged.

Final document review: `docs/v0.8/COLLECTION_RESULTS.md` matches the validation artifact. An independent parser compared 96 numerical table cells against the raw-derived policy/paired summaries, conditional hero-acquisition times, and separately deduplicated management-species counts; all match, including rounding and denominators. The late first-kill novelty nonzero counts also match A/B/C/D = 5/3/0/0 seeds. The reported 39-minute-53-second simulation interval matches the stored timestamps and elapsed duration. Resume binding records no completed validation raw before the worker-count transition, consistent with the document.

Interpretation approved within the simulation scope. The document distinguishes historical acquisition from current ownership, loss events from distinct species, first-card behavior from human rejection, conditional acquisition times from the full 100-seed denominator, and the 600-second menu policy from a human reward guarantee. It correctly uses medians of paired seed differences and acknowledges downstream hero/companion combat effects. The freeze and retained first-supervisor FAIL are described accurately. No transcription or interpretation correction is requested; no product/evaluator change was made during this review. Long-duration packaged performance and human observations remain open, and this completed collection matrix does not establish whole technical completion or Steam release approval.
