# DesMon v9 host contract

Product 0.9.0. Explicit user-approved host execution; legacy Ralph CURRENT=v3,
SPEC.md, IMPLEMENTATION_PLAN.md and v3–v8 evidence stay intact. Preserve the dirty
workspace before edits. No automatic git operations or public publishing.

Host owns the journal, shared IPC/main/menu integration, platform work and
Playtester role. Designer owns renderer HUD/effects and pure share-card drawing.
Balance owns core capture migration, shared HTTP types, server and regression
measurement. Critic independently reads production code and evidence; may add independent tests, never implements product changes.
Use four real host agent IDs; no external model CLI. A file has one writer.
Freeze source before each gate/evidence run; changed source invalidates its affected checks.
AC digests include owned paths, dependencies and tests; gates bind the complete source.
One successful global gate can verify several tasks on the same source. Dependencies
must have current verification before a dependent task is marked verified.

Design judgment order: Designer → Critic → Balance → Host/Playtester. The approved
conversation is the design decision record; final observations must be newly run.

`node .harness/v9/run.mjs init|status|check|verify RUN [TASK] [CHECK]` records
registered commands, exit code, start/end source hashes and immutable logs.
`npm test && npm run lint && npm run typecheck` is the exact gate. No skipped or
weakened tests. AC and gates must succeed on the same source to verify a task.
Failed attempts stay on disk. New invocations never replace old evidence.

Source preservation: .agentdoc/v09-20260915T084032Z/preservation (450 files,
v0.8 installed app and compiled baseline). Do not access personal save/auth data.
Native checks use owned fixture directories and simulated input, no production PvP.
Windows hardware/Steam AppID checks remain externally pending until available.
v0.8 incomplete performance and human checks are historical pending, not successes.
