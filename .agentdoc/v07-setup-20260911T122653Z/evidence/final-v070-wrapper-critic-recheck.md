# Final 0.7 wrapper repair — independent Critic recheck

Reviewer: `/root/critic`. **Both previously reported prelaunch gaps are closed in the inspected repair. No remaining concrete defect was found in this bounded delta.** This is a static read/diff/hash review, not execution of either wrapper, a test run, validation results analysis, or final release approval. No partial validation output was read.

The entire updated wrappers and their full diffs were checked against the preserved originals in `evidence/final-v070-wrapper-repair`. Both original/updated SHA pairs match change.json. The first review remains unchanged, SHA256 `81abf7cf9b14313394bbf396fa2299b6bf2553b9e50d925108dfbf76cec499bb`.

1. `final-v070-fresh-verification.py` now reloads V05's latest attempt after its three checks and requires every latest check to exit0, retain the completed review's source/evaluation digests at both ends, and preserve its owned-file manifest during execution. This closes the earlier V04→V05 review-binding omission.
2. `final-v070-validation.py` now requires a completed final fun session whose S/E matches live S/E; the preceding check already requires all three selected V05 checks to match that live pair. It also calls the actual existing `fun.mjs verify` with `check=True`, which rejects stale/incomplete/unresolved or improperly ordered role reports. These checks precede output-directory creation and measurement.
3. The validation wrapper imports the existing exported `fileManifest` from `develop.mjs`, reads V05's registered files, and requires every selected check's start/end manifest to equal the current manifest. Python dictionary equality is insensitive to key order while still detecting a changed hash or missing/added entry. The module's CLI main guard prevents importing fileManifest from launching develop commands. This closes the owned-test change that sourceDigest alone cannot detect.

Data-only control-flow reasoning (not executed tests):

| Input condition | Result before measurement |
|---|---|
| Complete four-role current review; selected checks/live/review share S/E; start/end/current owned-file manifests equal | Added guards permit the existing path to continue. |
| Review still collecting, has an unresolved veto, or fails actual fun verification | Assertion or checked subprocess failure stops before O.mkdir. |
| V05 checks/live use a new S/E while the completed review still uses the old pair | Explicit review/live equality rejects; fresh-check wrapper also detects this when finishing V05. |
| Owned test changes after successful checks without changing source/evaluation digests | Current manifest differs from the check manifests; validation rejects before archives/measurement. |
| A check's files changed during its execution | Start/end equality rejects in the fresh wrapper and start/end/current equality rejects in validation. |

The diff only adds those guards. New-output/report/.runs rejection, exclusive command/session writes, official protocol/selected10450 binding, exact validation seed set, failure log/exit preservation, and structural completion versus target success remain unchanged. Native/measurement outcomes are not inferred here; the later registered candidate acceptance and final task verification still apply.

Updated wrapper SHA-256:

- `sessions/final-v070-validation.py`: `169d94cf95b56bbb3cf362f6884aad8530752f1f9d3c6bc80008822337aa6334`
- `sessions/final-v070-fresh-verification.py`: `36f8527ca8ce79ea97ebb9b5e9fba0707a7f6de0e6e9db1d2cfc43cb2ea1ec25`

Run-relative paths use `.agentdoc/v07-setup-20260911T122653Z`. Only this new recheck report is written; previous reports, originals, product, evaluator and scripts were not modified by Critic.
