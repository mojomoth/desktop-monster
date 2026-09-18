# DesMon v0.9.1 execution contract

Explicit user authorization: replace companion theft with balanced gold transfers;
receive defensive battles, pause hunting, play the same result, resume the exact
live hunting state. Keep CURRENT=v3 and all earlier harness/evidence unchanged.

Host (/root) owns this journal, shared API, main/network/recovery/IPC, menu,
renderer bootstrap and packaging. Designer (/root/designer) owns game/hud replay
presentation and renderer tests. Balance (/root/balance) owns core/server and
their tests plus deterministic balance measurements. Critic (/root/critic) owns
independent pvpAbuseV91 tests and read-only final audit. One writer per file.
Judgments are collected Designer -> Critic -> Balance -> Host/Playtester.

Preservation: `.agentdoc/v091-20260917T024712Z/preservation`, with source manifest
and both previous packaged app.asar files. No personal save/auth or production PvP.
No automatic deployment, commits, pushes, or publishing. Old shared-DB services
must stop legacy companion theft before a production launch is declared ready.

Use config.json tasks and run.mjs init/check/verify. Freeze all owned source before
final AC and the exact `npm test && npm run lint && npm run typecheck` gate. Keep
failed attempts. Changed source invalidates affected verification. Host alone
writes the journal. No skipped/weakened tests or claims of unrun hardware checks.

Required evidence: wallet conservation, CAS/retry/crash/restore/legacy receipts,
defense delivery ACK distinct from playback completion, field-state freeze and
resume, identical local-view battle snapshots, duplicate/queue bounds, >=100
seed balance matrix, actual isolated Electron attacker/defender flow, macOS
smoke/package and Windows installer build. Windows hardware/Steam/production
deployment remain PENDING unless separately executed. No human-fun claim.

The v91 audit uses `audit.mjs init/next/submit/report` with the current native,
balance and PostgreSQL reports. It preserves the skill's ordered independent
judgments while replacing the v5 audit's unrelated 5-minute collection schema.
Reports, role responses and the source digest are bound before acceptance; each
response names its actual agent and resolvable JSON evidence pointers. No audit
completion implies production deployment or human play testing.
