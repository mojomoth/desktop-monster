# DesMon v0.8 — approved implementation contract

Approved 2026-09-14. Goal: a macOS Apple Silicon external-test candidate. Preserve the 420×640 pixel menu, input-driven progression, all core numbers/content and existing online functions. No Windows, Steam release, signing/notarization, deployment, automatic companion management, new quests or idle progression redesign.

Session: `.agentdoc/v08-20260914T050544Z`. Source/tests/docs/harness and the v0.7 app are preserved before edits. The root Ralph plan and CURRENT pointer remain unchanged. Existing user edits are not reset or committed.

## Tasks

- [x] V08-01 Designer: compact vertical hero choices, always-visible reset/retention/reward summary, collapsible rules, codex discovery/goal ordering, displayed-only ACK, roster-full shortcut, Korean interaction/status/error copy. Keep 12px pixel typography; important actions/summary 14px.
- [x] V08-02 Host: first-run inline guide and explicit global-input connection; skip/close persists fallback, legacy saves retain automatic connection; idempotent one-controller start. Atomic shared preferences for gameScale/muted/screenShake/welcomeSeen/globalInputRequested; tray mute/shake with immediate effect and persistence.
- [x] V08-03 Host: persistent save status in main, field/tray/menu errors cleared only by successful disk save. Missing/loaded/read-or-format-failure distinction; invalid existing save is preserved and blocks gameplay, writing and online activity until restored and restarted.
- [x] V08-04 Balance: preregistered paired 2×2 policy measurement, 20 screening + 100 validation seeds per policy, 12h each; no balance tuning. Report eligibility/offers/acquisition, roster admission/release, unique holdings/lost final species, actions and acquisition gaps.
- [ ] V08-05 Host + Critic: canonical gates, actual Electron integration, package migration/restart, smoke/package, baseline/candidate performance, isolated-account online verification and independent result review.
- [ ] V08-06 Human: five new users/90m actual work, two Apple Silicon Macs, separate fixture comprehension tasks, next-workday voluntary return observation. At least 4/5 understand each core task; repeated misunderstanding in 2+ users requires UI revision and fresh observation.

## Verification and completion

Run exactly `npm test && npm run lint && npm run typecheck` before marking implementation tasks complete. Preserve failures and source/evaluator provenance. Native tests use isolated saves, simulated input and mocked/offline networking. Actual OS hooks/permissions and human enjoyment remain separate.

Performance: same machine/fixture for v0.7 and final v0.8 active30m and companion-idle30m; final mixed180m alternates active/idle every5m and visits menu every10m. Sample every5s, exclude first5m. Frozen budgets are in EVALUATION_PROTOCOL.json. Exceeding a budget requires investigation and scoped revalidation, not moving the threshold.

Online production verification uses identified test accounts only, including chosen opponent, battle/steal/reclaim and client restart. Never operate on real-user opponents. No server deployment.

Completion states: `implementation_in_progress` → `technical_verification_complete_human_pending` → `external_test_and_usability_complete`. Never infer human completion from synthetic tests. No client publishing or invitations are performed automatically.

## Current evidence — 2026-09-14

V08-01–04 passed the exact canonical gates (987 tests, lint/typecheck; final run 2026-09-14T06:43:42Z), final DMG installation and actual Electron UI16/startup37 checks, and the frozen collection experiment (80 screening + 400 validation trajectories, all 12h and independently verified). Core/server/art/HTTP contracts match the pre-edit snapshot. COLLECTION_RESULTS.md separates acquisition gains from the cost of consuming the last member of a species; no balance values changed. V08-05 is not complete: online79, smoke and package passed, but repeated native tray Quit actions interrupted the required performance observations. No incomplete measurement is a pass. Human work remains pending. See ACCEPTANCE.md for artifact links.
