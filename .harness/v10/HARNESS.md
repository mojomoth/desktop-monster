# DesMon 0.10 execution contract

The approved [feature contract](../../docs/v0.10/CONTRACT.md) governs this Host-run loop. The legacy `.harness/CURRENT=v3`, root SPEC and root implementation plan remain preserved. This harness does not commit, push, open a PR, or deploy. `DESMON_SKIP_NET=1`: production deployment is outside the approved scope.

Run memory is `.agentdoc/v10-<session>/loop.json`. The latest session path is in `.agentdoc/v10-current`. Preserve the existing working tree and prior evidence before execution. Resume by reading the journal, sessions and latest failed receipt, then inspecting in-flight processes before launching replacements.

## Roles and ownership

Host (`/root`) integrates main/menu/IPC and conducts native Electron tests and packaging. Balance (`/root/equipment_economy`) owns core equipment, currency, combat and parameter experiments. Designer (`/root/sprite_qa`) owns sprite geometry, composition and animation. Initial independent Critic (`/root/harness_critic`) registers acceptance and baseline counterexamples. No reviewer approves a feature they implemented.

The server subtask was delegated to `/root/backend_v10` after initial Critic handed off. The orchestration service could not resume the retired Critic thread within its four-thread limit. Independent review is therefore split: `/root/backend_v10` reviews core and Host features it did not implement; Designer reviews server/network features it did not implement. Host reviews sprite evidence. Actual IDs and findings remain in the journal and review files. At most four agents, including Host, run concurrently; native interactive cases run serially.

Task files are authoritative locks. `start` rejects parent/child path overlap with another running task. Core's `fsm.ts` is explicitly owned by Designer. Consumer work may start after a producer hands off implemented interfaces; completion requires every dependency verified against the final source.

## Runnable loop

```sh
node .harness/v10/run.mjs init RUN
node .harness/v10/run.mjs register RUN Host /root
node .harness/v10/run.mjs sync RUN
node .harness/v10/run.mjs status RUN
node .harness/v10/run.mjs next RUN
node .harness/v10/run.mjs start RUN V10-01
node .harness/v10/run.mjs implemented RUN V10-01 handoff-note
node .harness/v10/run.mjs check RUN V10-01 ac
node .harness/v10/run.mjs check RUN V10-01 gates
node .harness/v10/run.mjs verify RUN V10-01
```

Repeat `select → implement → AC → independent review → fix → recheck`. The immutable receipt records command, before/after source hash, exit code, log hash and required artifact hashes. Latest failures supersede prior success. Source changes make old receipts stale. When task definitions change, `sync` updates their saved commands and reopens affected tasks and descendants while keeping all receipts; mutations refuse an outdated journal contract. `invalidate` reopens a task and descendants without deleting attempts. `block` requires three distinct environmental recovery attempts with evidence. An implemented handoff is not a verified task.

The canonical gate is exactly:

```sh
npm test && npm run lint && npm run typecheck
```

All tasks must be verified against the final source. Then native runtime, smoke, macOS and Windows packages, held-out balance, five real-duration performance slots and independent review must pass. `run.mjs` never turns a nonzero or missing result into a successful task.

## Measurement and native evidence

[Evaluation protocol](../../docs/v0.10/EVALUATION_PROTOCOL.json) and [registered candidates](../../docs/v0.10/BALANCE_CANDIDATE.json) precede measurement. Compare registered candidates with exploration seeds, select using the preregistered criteria, then run at least 100 different held-out seeds for every policy. Source/rule changes invalidate related evidence. Report purchase time, weapon usefulness, storage/upgrade opportunity costs, destruction losses and independent epic tails.

`runtime.mjs OUTPUT_JSON [APP]` launches isolated packaged apps and exercises the production renderer/preload/IPC/core/server using synthetic accounts, native input and a real clock. The only replacements are platform isolation and the injected in-process server store. It never loads personal saves, native input hooks or external network. A read-only closure observer records the actual game state and animations. Every attempt keeps runtime diagnostics, screenshots and hashes.

`performance.mjs APP OUTPUT PROFILE MINUTES` observes the preserved baseline; `performance-v4.mjs` observes the candidate. Both use actual elapsed time. The candidate adapter only serializes the fixture's BigInt fields at the JSON boundary; `performance-report.mjs` verifies that exact source difference. Timers, input, sampling and isolation are identical. The [performance protocol](../../docs/v0.10/PERFORMANCE_PROTOCOL.json) preserves the existing CPU and memory limits. Baseline and candidate each require active 30 minutes and idle 30 minutes; candidate also requires mixed 180 minutes. Do not overwrite an app being observed. An interrupted run is failed evidence, never a substitute for the requested duration. The verification app tray identifies itself as a timed performance observation.

`gallery.mjs OUTPUT_JSON APP` renders production art in the actual Electron Canvas and records contact sheets, overview images, sample coverage, runtime diagnostics and hashes. Independent visual review is required in addition to occupancy checks; a nonempty sprite can still contain damaged geometry. A final review must identify the images actually inspected.

After both baseline reports pass and the final app is frozen, `run-performance.mjs BASELINE_ACTIVE_JSON BASELINE_IDLE_JSON APP OUTPUT_DIRECTORY` runs candidate active 30 minutes, idle 30 minutes and mixed 180 minutes sequentially, then verifies the comparison. `queue.json` records the owned process and each slot. A failed or interrupted slot stops the queue and preserves all evidence. Resume from the journal and completed reports; never shorten or relabel an interrupted observation.

`npm run smoke`, `npm run package`, `npm run package:win` are mandatory final commands. Windows hardware execution, a real PostgreSQL integration run, production deploy and human fun testing are separate statuses; do not label injected tests as those activities.
