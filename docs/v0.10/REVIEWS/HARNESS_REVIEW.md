# Independent final harness review

Reviewer: `/root/sprite_qa`. Harness author: `/root`. Review date: 2026-09-17. The reviewed starting source digest was `57b6f7769a82f99ecf25fba3cf92186e07fffe36adc3de2fc7b94fc834b9e4db`.

**Final code-review verdict: approved after the independent recheck below.** The initial review required the V10-HARNESS-01 correction. No other substantive defect was found in the reviewed performance observer, comparison or sequential runner. This is a code/evidence-validation review, not approval of unfinished 30/30/180-minute observations. The reviewer did not modify production code, harnesses or tests, launch Electron, interrupt an observation, or review their own sprite implementation.

## V10-HARNESS-01 — distribution contents are not bound to the tested application

Priority P2; required before final convergence. In `.harness/v10/final-check.mjs`, `validatePackages` checks the DMG/EXE bytes against their own hashes and builder manifests, verifies version 0.10.0, and compares the **separate** macOS app and Windows unpacked `app.asar` with current compiled files. It never reads the application payload inside either distribution container. The V10-09 command receipt has no required package artifact hashes, so it does not close that link.

Consequently, an earlier 0.10.0 DMG/EXE with its corresponding update manifest can accompany the current unpacked app and pass this check. This matters here because several pilot and final builds share version 0.10.0. The finding does not assert that the actual release artifacts have mismatched contents.

An independent, filesystem-free Node/VM counterexample evaluated the unchanged `validatePackages` function with injected filesystem/archive readers: old container bytes and their valid SHA-512 manifests, current unpacked application bytes, matching 0.10.0 metadata. It returned success. The only archive paths accessed were `/release/current.app/Contents/Resources/app.asar` and `/release/current-windows.asar`; neither distribution container was inspected. No files were written and no Electron process was started for this counterexample. Host independently confirmed that no separate DMG/EXE extraction evidence existed at review time.

Required correction: verify the actual payload extracted/mounted from each final DMG/EXE against the corresponding tested application, retain content hashes and extraction provenance bound to the container hash, and reject a same-version stale payload in a regression check. Host implemented this correction; the independent recheck below closes the finding.

## Verified scope

- Baseline and candidate observer sources are compared byte for byte, allowing only the registered BigInt-to-decimal fixture serialization adapter. Initial gameplay fixture, OS/CPU/runtime identity, separate save directories, package identities and nonoverlapping observation windows are checked. CPU/RAM budgets and full durations cannot be shortened through protocol arguments.
- Raw process samples are revalidated and quantiles recomputed. Checks include nonnegative finite metrics, process-sum equality, browser/field process continuity, sample count and maximum gap, monotonic persisted play time and kills, exact initial-save allowance, and final save progress. Each active/idle phase has input-count bounds; the terminal menu-capture interval is reported separately and bounded.
- The queue runs candidate active30, idle30 and mixed180 sequentially. It preserves existing output, stops on failure/interruption, owns its child process groups and checks source/package identity after each slot. It has no automatic continuation of partial observations; this agrees with the documented requirement to inspect the journal/processes and preserve interrupted attempts.
- Final verification uses the latest canonical gate and latest task AC with current source/log/artifact bindings; a newer failure cannot fall back to an older pass. The required native scenario names, native final-package identity, independent review authorship, versioned packages, catalog counts, and performance-to-final-app binding are checked. Gallery validation was read only as an integration dependency; this review does not self-approve art.
- Performance reports explicitly limit their claims: emitted IPC events are separate from engine progress; shared working-set pages may be counted more than once; power/thermal conditions, successful menu choices, permission/audio experience and human enjoyment require other evidence. Renderer console-error collection is not provided by this observer; the registered long-run checks cover crashes/unresponsiveness, save/progress and unexpected network activity. This review does not expand those claims into general error-free UI certification.

No full suite, build, packaging command or native test was rerun by this reviewer during the ongoing timed baseline. The initial independent execution was the small in-memory counterexample above; the correction's four small Node tests were subsequently rerun as recorded below.

## Files read and SHA-256 at the initial review

The v7 package-check file was read for its imported CDP transport; the v10 files below were read for the stated scope. These hashes identify the pre-correction review and must not be silently replaced when the fix is rechecked.

| File | SHA-256 |
|---|---|
| `.harness/v10/performance.mjs` | `5b143ce0441f93882595faac0ee14e02aba4190f47e66791aac3089f1932f969` |
| `.harness/v10/performance-v4.mjs` | `1157aacbfa7a5f2cce722f29e71db0befbd788a79d07ee2503f4ab80463eab68` |
| `.harness/v10/performance-report.mjs` | `e4376429a02ca917d91bb09393a6d7c27e2bf75a0211b1ff7c59c7edafa6a75d` |
| `.harness/v10/performance.test.mjs` | `34e270701a4a80c40fadb97302d4a7d889046f99326a14161decbf9e96ccc35c` |
| `.harness/v10/run-performance.mjs` | `e3353cbfbbf023a03bde9eb984ddd77512b3b6924b2391a9071160253730331f` |
| `.harness/v10/final-check.mjs` | `3a92c9a86f8dc5d49b245a9d99e2bbf9692fdd94423fc278f34bd121659c772b` |
| `.harness/v10/final-check.test.mjs` | `dfa13f0efae91eacd0fbfccc133d3c427a1c7b24b4c9071e17594ad02872eb46` |
| `.harness/v10/run.mjs` | `f9331a1f27f330ebe9b0b4c561e0af1a14a2b431a6b57f568ab6bd7aa0c29d37` |
| `.harness/v10/config.json` | `80ff97af72d720811cd461e9349ddf5a6dbc57a1c1c48222489d9ef8b653dd90` |
| `.harness/v10/HARNESS.md` | `79e4ab08e204d2c79378745b8a3fb5431ab90d69c7ed1f041da65ba6fea9a54a` |
| `.harness/v10/FINAL_REVIEW.md` | `a3d91c317bc5ad844dfed9e2e666cea4cf35d2f34458daefc4f4c72d014a2295` |
| `docs/v0.10/PERFORMANCE_PROTOCOL.json` | `ce803acadae6f41863645b1a46926f6d06ba7f134cd8dc6438de56279104ae24` |
| `docs/v0.10/CONTRACT.md` | `7dc9a64d87851de98cb54c4e88de9f2a4658a450a8b1151b4703e0f69d06cf67` |
| `.harness/v7/loop/package-check.mjs` | `f7b1d8fbd531d00b9c729250639c8390ceef865984e79dd546e382328fd7a5c7` |

## Independent correction recheck

V10-HARNESS-01 is resolved. The new `validateInstallerPayloads` mounts the actual DMG read-only and compares the complete embedded `.app` tree with the verified app. It extracts the actual NSIS `$PLUGINSDIR/app-64.7z` using the existing builder 7-Zip executable, extracts that archive, and compares its complete tree with `win-unpacked`. Equality covers relative file contents and symlink destinations, including native files outside `app.asar`. Extraction or comparison failure rejects final verification. The asynchronous operation is awaited through `validatePackages`, `verifyFinal` and the CLI, so the caller cannot accept an unresolved promise. A failed DMG detach retains the owned scratch directory instead of recursively deleting a mounted filesystem.

The reviewer read the two changed files and Host's actual extraction receipt [installer-payload-01.json](../../../.agentdoc/v10-20260917T070144Z/evidence/installer-payload-01.json). Host's receipt reports macOS tree hash `eaa3d8337fed1d6ffcd21e01e5e668084efcc82f4c5c1ed2a349fd85e8752fb9` and Windows tree hash `3c731bdf5ec4bbb19492a5d3d684099f353d86af81f39fa9c26e3a3befc9a7dc`, bound to the actual DMG/EXE and extractor hashes. This reviewer did not independently repeat the native mount/extraction; final convergence repeats those checks itself.

Independent command `node --test .harness/v10/final-check.test.mjs` passed **4/4**, with no skipped tests, in 285ms. The added regression accepts equal trees, rejects an older `app.asar` despite identical 0.10.0 metadata, and rejects a changed `native.node`. Existing latest-failure, authorship and symlink checks remain passing.

The first observed post-correction source digest was `7cb2721e04087d01a53bca93a2466a9c06d2dce8d1200df667d53fbbfb6bbc86`. Host then isolated each native runtime attempt under `attempt-<report-name>-<timestamp>` to preserve earlier screenshots when rebinding the native report, and documented installer extraction in `FINAL_REVIEW.md`. Both files were independently read; the output report still refuses overwrite, each case writes below the new attempt directory, and the scenario assertions remain intact. The latest reviewed source digest is `5939e04e6fc76f14d851444d63b3999a30b132595ff16ac6abe30faf5311ec4a`. Observer, candidate adapter, performance comparison and queue hashes remained identical to the initial table. The new accepted hashes are:

| File/evidence | SHA-256 |
|---|---|
| `.harness/v10/final-check.mjs` | `5a98fa150d1c93397c6f083a3cfcfaf8b79ca313b5c9de190391e837c6a92d65` |
| `.harness/v10/final-check.test.mjs` | `1844b5cea9ce5afcb5c4bbfddb8522ac43342a3e76e89b28ef0dabe95473e174` |
| `.harness/v10/runtime.mjs` | `d6d8a8152197ef4fc88766ebc6f8c221efaf495bc5969b750447c27cf01ab98d` |
| `.harness/v10/FINAL_REVIEW.md` | `926da8b23753bd3f23165885ba684fd20e3c29ca5df59cd9b5ffd832b7cb5567` |
| `.agentdoc/v10-20260917T070144Z/evidence/installer-payload-01.json` | `78b2323893a9169939d02650225ca0a6dc29bc9b0a7dceb79b05bda8861603aa` |

No remaining required code correction was identified in this review. Final gates, rebound native/gallery receipts and all five real-duration performance observations remain separate completion conditions.
