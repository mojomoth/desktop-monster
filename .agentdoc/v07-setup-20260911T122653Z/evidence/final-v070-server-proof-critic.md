# Final 0.7 server compatibility proof — independent Critic review

Reviewer: `/root/critic`. Read-only inspection of server-check.mjs, its tests, actual high-level server/client tests, companion boundary tests, PgStore test methods and the production health handler. **Under its stated deployment-SHA trust assumption, healthz-only cannot pass this checker.** No network, test, build, measurement or server operation was executed here; no partial release output was read. This review does not assign a current live status.

**Local evidence actually required.** Capture builds using `npm run build`, verifies source stability, and executes exactly `npx vitest run tests/companionLevelsV7.test.ts tests/server`. The companion tests cover levels11/250/MAX_SAFE through JSON/engine/restart, invalid levels, overflow rejection before loss, Lv1/stars+1 exact power and allocator/transfer IDs. `tests/server/companionLevelsV7.test.ts` uses the actual createNetClient→JSON→createApp routes with an injected transport/MemoryStore/clock/RNG: high-level upload, directory, selected opponent ID, PvP theft, engine/save/restart/re-upload preserving s7, reclaim preserving r IDs, removal sync, and invalid upload preserving the original roster. These are real local implementations across JSON boundaries, not live server writes. PgTransaction tests inject the pg pool/client and check JSONB values/rollback/transaction commands; pgStore source-contract tests do not connect to Postgres. Thus local PASS does not mean a production DB transaction was observed.

**Exact classification (`server-check.mjs:33–42,60–85`):**

| Condition | Result |
|---|---|
| Captured test subprocess exit0 | local.status PASSED; any other status yields FAILED. Overall verification additionally requires the exact command, unchanged current test manifest and matching test-log hash. |
| Build fails or source changes during build/tests | Capture exits nonzero. Any produced exclusive log is retained; a complete compatibility JSON may not exist. |
| Fixed `https://desmon-server-v3.onrender.com` returns HTTP success, JSON ok=true and a lower-case40-hex SHA; every tested source manifest entry equals that commit's git blob | Captured live.status PASSED. This field alone is not overall AC success. |
| Health fetch/JSON/HTTP fails, ok is not true, SHA is missing/dev/malformed, local git cannot read that commit/path, or any mapped file differs | live.status PENDING (with observed health/reason when available), preserved JSON, overall verification nonzero. Unknown local commit objects are insufficient evidence, not proof the deployed code is incompatible. |
| local/build/tests/log/source evidence passes AND captured live proof passes AND a fresh second health request reports the same ok=true SHA | CLI exit0 with local/live PASSED. A later deployment change or failed second request causes exit1 even if the retained captured JSON still says live PASSED. Check command exit/log as well as the JSON. |

The deployment source map is deliberately broad: all `src/core`, `src/server`, `src/shared`, plus `src/main/net.ts`, package.json, package-lock.json, tsconfig.main.json and tsconfig.base.json. The local build map includes compiled core/server/shared/net. `verifyCompatibility` compares these current maps and sourceDigest with the report, verifies exact local/build command logs and tests, fixes the production URL, and calls `git show <health SHA>:<path>` for every mapped source. The helper's current manifest is nonempty; a mere ok response or valid-looking SHA does not satisfy those comparisons. The tests reject dev/missing commit blobs, different source, a localhost URL, stale build/tests/logs and the old empty-roster probe.

**Inference limits.** `src/server/http.ts:71–72` obtains the SHA from RENDER_GIT_COMMIT (or dev); health does not access the DB. This is source correspondence plus local compatibility testing, conditional on the reported deployment commit accurately identifying the running server. It is not cryptographic runtime/build attestation, live high-level endpoint exercise, production database durability proof, or performance/availability proof. A functionally compatible older deployment can still fail the strict all-file/package-version comparison; the current contract does not permit calling that PASSED without matching evidence. The checker itself uses current sourceDigest rather than an explicit package0.7/phase assertion; the already-required frozen0.7 V01–06/release contract supplies that prerequisite. It also does not replace canonical gates or the other release AC.

**Host final capture (not run here).** After checking actual global PID/PGID and waiting for release900/Native/build activity to finish, preserve the frozen final source and execute from the repository root:

```sh
node .harness/v7/loop/server-check.mjs capture .agentdoc/v07-setup-20260911T122653Z/evidence/server/compatibility.json
```

This uses the registered production URL by default, writes `.build.log` and `.tests.log` exclusively, reads health, and verifies the new report. The server evidence directory was absent when inspected. If any target file/log already exists, preserve it and choose a new explicitly tracked capture path; do not overwrite a failed/PENDING original. A later healthy deployment cannot turn an old PENDING snapshot into current PASS without new evidence.

Record the registered release AC separately:

```sh
node .harness/v7/loop/develop.mjs check .agentdoc/v07-setup-20260911T122653Z V07-07 server
```

That command verifies the registered compatibility.json and rechecks live health. If local passes but live remains PENDING, record local PASSED/live PENDING and release not verified. Neither command pushes, deploys, registers a production player, uploads a live roster, plays PvP or reclaims. Commit/push/deployment remain outside automatic authorization; humanChecks remains PENDING without people.

Inspected evidence SHA-256:

- `.harness/v7/loop/server-check.mjs`: `83011d1ab7136c62e6a9a81afa5519c5d904209fd32d87962122ee3b62ebf3b1`
- `.harness/v7/loop/server-check.test.ts`: `1fd3626248ed4d7b3e11c6650f769bfa4e1a77c9d273b6bb824a1c9bf1e460b0`
- `tests/server/companionLevelsV7.test.ts`: `5c413c0e9f59fe04bb7dc583c95c9fd2604c1266fc4f53a7b3338aa311e543f9`
- `tests/companionLevelsV7.test.ts`: `f7984cd1d49af4952f182e66d0e91ffdc3ba25f518329ba15037bbf8f0a6ea30`
- `tests/server/pgTransaction.test.ts`: `d8c8dcb5592337b90988a127e44defcbe81574b2d5c55e4e6eb6875048dda45c`
- `src/server/http.ts`: `5fe51cf7cd00283383616a858878175e337abede7084bdbc09af0de4774168a3`
