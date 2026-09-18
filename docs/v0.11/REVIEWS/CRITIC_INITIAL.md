# V11 independent initial design and acceptance review

Reviewer: `/root/skills_harness`. Baseline: `c2b20bb`, annotated tag `v0.10.0`.
Implementers: Host `/root`, Designer `/root/menu_review`, Balance `/root/balance`.
This approves the bounded design direction, not implementation, numerical balance,
native behavior, packages or release completion. No V11 checks have passed here.

## Accepted direction

The registered contract covers the requested HUD corrections, menu state/response
bugs, manual equipment and several-hour curve-only rebirth pacing. Preserve
`.harness/CURRENT=v3`, V10 sources/evidence and the local baseline tag. No deployment.
Use existing Electron/Canvas and source-bound harness behavior without new engines.

The selected upstream subset is RPG, level-design, game-ui-ux and game-feel, with
their four references, LICENSE and NOTICE, pinned to
`b105e1cf617adf0b68ed98790a716bbb60993179`. Files are unchanged; provenance and SHA-256
hashes are in `.harness/v11/vendor/awesome-gamedev-agent-skills/SOURCES.json`.
Upstream has no dedicated DesMon balancing/playtime agent. Our Balance charter
adapts its generic progression/pacing advice to measurable production-core runs.
Host must review these Critic-authored vendor and charter files independently.

## Findings to close with implementation and evidence

| ID | Severity | Required evidence |
| --- | --- | --- |
| C11-01 | major | Each of the first three rebirth intervals meets the registered policy-specific quantiles; cumulative timing cannot hide a short later cycle. Preserve non-arrivals and test later cycles/wealthy/high-input exceptions. Intermediate rewards must not disappear. |
| C11-02 | major | Manual equipment survives unrelated actions, live updates and restart; only approved new/changed candidates affect it. Validate full storage, stale actions, exact identities, ties, destruction and hero compatibility without silent item loss. |
| C11-03 | major | Native disclosure clicks remain open across live updates and the one-second shop refresh. V10's programmatic `details.open=true` coverage is insufficient. Growth selection similarly survives unrelated state updates. |
| C11-04 | major | Native event-to-painted-feedback and local-applied-result distributions meet the registered limits. A pending message alone cannot prove action completion; verify no missed or duplicate actions. |
| C11-05 | major | Final receipts bind current execution inputs and artifacts. Generated reports/journals do not change the input digest; changed source/protocol/candidate/imported launcher/vendor does. Latest failure wins and final verification is non-circular. |
| C11-06 | major | Screenshots plus deterministic geometry cover every supported hero/monster size and scale: stable label stack, outlined slow LEVEL UP, one head FEVER, longer unclipped monster damage, unchanged PvP result behavior. |

FEVER's 200ms color phase is a 400ms full cycle; text remains legible in both
phases. LEVEL UP uses the registered 600ms phase and 2400ms lifetime. No animation
wait may postpone input. The unified hero stack uses a stable idle silhouette.

## Review and measurement requirements

Freeze policies, candidates, horizon and quantile method before exploration;
freeze selected source before held-outs. Ordinary/intermittent targets and
adversarial profiles are distinct. Report each profile honestly rather than
claiming a guaranteed real-time minimum from curves with no timer.

Use exact canonical gates, task-specific checks, actual packaged native input,
restart/persistence, matched 30-minute active/idle performance observations and
independent final review. Run measured native slots serially. Simulated hours,
native elapsed runtime, Windows hardware and human enjoyment remain separate.

V0.10 staging preserves source, docs, tests and evidence while leaving duplicated
apps/installers/archives local. Its tag records the baseline with known reported
defects; it does not certify V11 changes or refresh historical V10 receipts.

All six findings await implementation/evidence review. No test, gate, performance
run, held-out outcome or human session is inferred from this document.
