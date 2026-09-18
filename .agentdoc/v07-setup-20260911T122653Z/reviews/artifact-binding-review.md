# C3 independent artifact binding review

- Reviewer: `/root/ui_pvp_review`; reviewed after `/root/harness_review` froze `develop.mjs` and `develop.test.ts` on 2026-09-11.
- Scope: read-only review of `.harness/v7/loop/develop.mjs`, its focused tests, and final `.harness/v7/config.json` artifact registrations. No v7, product, or v5 files changed by this review.
- Result: no remaining material blocker within C3 scope.

The CLI captures registered output manifests after each command finishes, so generated artifacts do not need to exist before execution. Task verification requires the exact registered root set, nonempty file manifests, valid SHA-256 values, and an exact match to current paths and bytes. Missing roots, omitted files, deletion, addition, and modified content are rejected. Failed or incomplete checks remain recorded but cannot verify the task. `verifyRecordedEvidence` repeats artifact and evidence-log checks for verified tasks, and the CLI calls it before phase advancement.

An initial config coverage gap was reported: registering only journey/package report JSON omitted the screenshots and package inspection sidecars. The root fixed this before final review. V07-06 now writes `evidence/integration/journey.json` and registers the entire `evidence/integration` directory. V07-07 runs `npm run package && node .harness/v7/loop/package-check.mjs ...`, writes `evidence/package/package.json`, and registers both the entire `evidence/package` directory and `release`. The native matrix and final review directories are also registered recursively.

Independent validation after the implementation freeze:

```sh
npx vitest run --config .harness/v7/vitest.config.mts .harness/v7/loop/develop.test.ts
node --check .harness/v7/loop/develop.mjs
```

Both commands exited 0; Vitest passed 11 tests in one file (22:11:43 local time; tests 423 ms). Reviewed regressions cover output absence before generation, command retry after generation, missing/changed/deleted originals, rejection during phase resumption, directory additions and partial manifests, and preservation of previous logs. The final directory-registration config correction was then inspected directly. No full gates, Electron runs, package build, or formal four-role game audit were executed by this reviewer.
