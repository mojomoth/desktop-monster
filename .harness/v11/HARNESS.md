# DesMon v0.11 Host harness

The user-approved contract is docs/v0.11/CONTRACT.md. Host owns journal and integration; workers edit only assigned paths without git. Legacy Ralph CURRENT=v3 and v10 remain unchanged. Baseline c2b20bb has annotated tag v0.10.0; binaries are preserved outside Git. DESMON_SKIP_NET=1.

## Roles
Host /root: menu/IPC/native packaging. Designer /root/menu_review: HUD. Balance /root/balance: equipment/progression and experiments. Critic /root/skills_harness: independent product review and evidence validators; Host independently reviews validator changes. Designer judgement was reviewed by Critic before implementation; Balance protocol is independently reviewed before measurement. Host observes native tests as Playtester; this is not a separate invented identity.

## Resume
Read .agentdoc/v11-20260918/loop.json, sessions and latest failed receipt; inspect queue.json/lifecycle and owned processes before starting any native observation. Use run.mjs init/register/start/implemented/check/verify/status/next. Dependencies permit implemented handoff; final status requires AC and canonical gates bound to final inputs. File locks reject overlap. Retain failed attempts. No source edits during final measurements.

## Inputs and outputs
Digest includes production source/tests/configuration, contract/protocol/candidate, v11 harness/vendor, and imported v10/v7 helpers. Generated evidence/reviews/reports/package bytes are separately hashed artifacts and excluded from the input digest. Do not put changing result reports under the hashed harness. Changes invalidate relevant final evidence.

## Commands
- node --test .harness/v11/*.test.mjs
- npm test && npm run lint && npm run typecheck
- node .harness/v11/run-performance.mjs baseline|candidate APP ATTEMPT_DIRECTORY
- node .harness/v11/runtime.mjs run OUTPUT APP
- node .harness/v11/runtime.mjs verify OUTPUT
- node .harness/v11/final-check.mjs reviews|final RUN
- node .harness/v11/release.mjs RUN smoke|mac|windows (records each canonical release command and its source/log hashes).
- node .harness/v11/release.mjs RUN collect (binds macOS and Windows artifacts after all three commands pass).

Performance observations are serial and real30min per profile, never shortened or time-accelerated. Native actions use sendInputEvent, production DOM/IPC/core/save, isolated fixture userData, simulated input and no production server. Human fun, real Windows hardware, global hooks and live database remain explicit unperformed checks.
