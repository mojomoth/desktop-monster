# v0.11 development handoff

This is an unfinished development checkpoint. The approved release acceptance
criteria have not been relaxed. `DESMON_SKIP_NET=1`; no push or deployment.

## Baseline and implemented work

`v0.10.0` is an annotated tag on
`c2b20bb7573c39515e21c40f7162d50966468be0`. The original packaged apps and
installers remain local under `.agentdoc/v11-20260918/preservation` and `release`.
Binary outputs are excluded from Git.

The current 0.11.0 source implements the requested HUD placement and effects,
stable menu disclosures and growth selection, the 560px tab row, relocated
utilities, applied-action feedback and persistent manual equipment. Pacing
parameters have not been adopted: production still uses the previous values.

The four-role harness lives in `.harness/v11`; the historical Ralph pointer stays
at v3. The ten imported upstream skill/license/reference files are pinned to
`b105e1cf617adf0b68ed98790a716bbb60993179` with individual hashes in vendor
`SOURCES.json`. They inform the DesMon Designer, Balance, Critic and Host roles;
they are not an upstream ready-made balancing agent.

## Open balance decision

Four registered candidate rounds failed either the unchanged time targets or
independent design review. A candidate with approximately four-hour cycles
allowed capture indices near 50,000 and a reproduced 3,033-digit PvP companion,
so it was rejected. Other tested candidates include excessively fast high-input
runs and 12-hour non-arrivals. This does not prove that all fixed HP functions
are impossible.

The user has been asked whether a fixed field-only companion power curve may be
added while preserving saved attributes, owned/PvP power, and all numerical
targets. No answer has been received at this checkpoint. The proposal is not
authorization. Do not adopt it or consume held-out seeds before the decision and
new candidate registration. Count-dependent companion multipliers are a further
design proposal, not an approved implementation.

Read the evidence in `.agentdoc/v11-20260918`:

- `reviews/CRITIC_BALANCE_FEASIBILITY.md`
- `reviews/DESIGNER_FIELD_CURVE_PROPOSAL.md`
- `balance/FIXED_COUNT_PROPOSAL.md`
- `balance/ORIGINAL_SCOPE_PLATEAUS.md`
- `balance/round-01` through `round-04`, including cancelled-run records

## Verification and resumption

`docs/v0.11/ACCEPTANCE.md` gives the current checkpoint. Exact task states and
source-bound logs are in `.agentdoc/v11-20260918/loop.json`. Never infer release
completion from a development package's version number or a previous pass.

Before launching Electron, inspect the performance queue, lifecycle files and
owned process IDs. Native scenarios, smoke and performance observations must not
overlap. Preserve failed attempts. A first native pilot found a HUD observer
startup timing issue; its time-only visibility assertion is not valid evidence
that the end-of-animation number is visible.

The four full performance observations finished, but `performance/comparison.json`
fails the idle CPU budget (2.430934% versus 2.391905%). Active CPU and memory pass.
Different random capture paths produced different final rosters and encounters;
this is a workload confound, not permission to discard the failure or change the
budget. Any diagnostic or later repeat must remain distinguishable from this run.
A bounded instrumented fixed-scene pair in `performance/diagnostic-profile`
completed its baseline 60 seconds, then lost the candidate main inspector context
after approximately 40 seconds; the app exited 0. Root did not launch, stop or
signal an app during this observation. The cause is unestablished, and the
incomplete pair cannot support a comparison or supersede the failed CPU budget.
Raw errors, partial metrics, lifecycle and source/app hashes are retained. No
speculative production fix was applied.
Pilot02 completed menu interactions and captured actual companion growth, then
failed cross-process clock calibration. Its failed attempt is retained; the
observer now accounts explicitly for pinned Chromium timer precision and retains
the raw intervals and measurement bounds.

Current checkpoint source is
`27b4228e0696122d0ea3e69c25978470246ca881b59c19b99920a6d9bb1b5b7f`.
Canonical gates passed 1,230 tests, lint and typecheck; all 49 Node harness tests
and task 01/03/04 AC passed. Full native pilot06 passed 165 checks, with 407
trusted clicks (visual p95 at most 25 ms; equipment applied-result p95 35.7 ms),
107 actual IPC/apply traces, and 21 exact trusted HUD key pairs. The Critic
independently approved the implemented UI/HUD/manual equipment scope, viewed all
22 screenshots and recomputed 35 HUD regions. That partial approval is not an
overall release approval and does not self-approve the Critic's validator code;
Host verification-code review is recorded separately.

HUD captures now use nonpausing read-only actual animation ages and pixel ink,
phase, outline and rise checks. Pilot05 had unexplained extra early damage before
input provenance was recorded; preserve that failure. Three focused runs and
full pilot06 subsequently matched every intended native input without extras.
A diagnostic also observed a first-attack frame stall. Lazy audio initialization
is an unproven explanation; no app audio change or demonstrated baseline
regression exists.

Smoke, macOS packaging and Windows packaging were refreshed at this source.
`evidence/current-checkpoint-validation.json` binds current native/release
receipts, both extracted installer payloads and vendor provenance. The macOS
ASAR hash remains
`d1c7dfe681fd4c572ad8a2c9fd929921960cd805194140bec78bbab975e6bb34`.
There are no running native/performance observations at this checkpoint.
Tasks 02/05/06/07/08 remain pending; successful component evidence cannot bypass
their balance dependencies. No held-out balance report or final release approval
has been written.

After all source changes, run the canonical gates exactly:

```sh
npm test && npm run lint && npm run typecheck
```

Use `.harness/v11/run.mjs` for task AC/gate receipts, `runtime.mjs` for isolated
native scenarios, `release.mjs` for smoke and platform packaging, and
`performance-report.mjs` for the four complete 30-minute observations. The final
checker requires a passing held-out balance report, independent review bindings,
current package hashes, and every required task receipt.

Accelerated deterministic simulation measures pacing under its registered
policy. Native Electron checks measure actual rendering, input, IPC, persistence
and resource use. Neither certifies human enjoyment. Real Windows hardware,
global Accessibility hooks, live PostgreSQL and production deployment remain
separate, explicitly unperformed checks.
