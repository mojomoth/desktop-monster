# Incomplete profiling attempt: independent exit review

Reviewer `/root/skills_harness`; read-only investigation, no app launch. The old `performance/diagnostic-profile` pair remains incomplete and cannot clear the registered idle-CPU failure.

Read the generated run script, candidate raw metrics/runtime/log, launcher/inspector transport and production exit paths. Candidate main PID11798 and its four helper PIDs stay stable through all eight metric samples (initial plus 35 seconds). Last sample is 06:56:41.245 UTC. The next inspector evaluation around 40 seconds reports `Cannot find context with specified id`; cleanup and launcher diagnostics/quit evaluations receive the same error. The launcher then disconnects the inspector and records normal exit0/no signal at 06:56:46.346 UTC. Candidate profile, trace and final rAF/scene are unavailable; no completed pair can be reconstructed.

No 40-second termination timer exists in this diagnostic or v10 launcher. The 20-second smoke watchdog is disabled because the launcher removes SMOKE. The launcher cleanup's quit evaluation happens after the context error and itself fails; it cannot alone explain the initial context disappearance. Normal exit0 plus context loss is compatible with shutdown but is not proof of a product crash, profiler defect or outside intervention. No DesMon crash report was found in the user's DiagnosticReports directory; absence is not proof of no failure.

## New OS evidence

Queried macOS unified logs for **only PID11798**, 2026-09-18 15:56:35–15:56:48 local time (06:56:35–06:56:48 UTC). Exact command and output are reproducible with:

```
/usr/bin/log show --style compact --start '2026-09-18 15:56:35' --end '2026-09-18 15:56:48' --predicate 'processIdentifier == 11798' --info --debug
```

Output is retained in `DIAGNOSTIC_PROFILE_PID11798.log`. At 15:56:42.588 AppKit records `perform action for menu item`, followed at .589 by `sendAction:`. Connection and scene teardown follows, and the process enters its exit handler at 15:56:46.286. This places a native menu action between the last successful metric and context loss. A menu-initiated shutdown is now a supported hypothesis, stronger than the previously unsupported automatic-profiler-timeout theory. The log does **not** identify which menu item, who/what selected it, or the application stack; do not attribute the action to a person or assert the exact cause.

The original diagnostic carries uncalibrated profiler, trace and rAF-observer overhead and the baseline trace has no raster/paint data. Partial candidate CPU metrics do not identify the source of the long-run GPU/renderer increase. Any further authorized diagnostic should persist timestamped app `before-quit`/`will-quit`, window close/destroy, render/child-process-gone and native quit-entry stack records directly to an owned file, so losing the inspector does not erase termination provenance. Preserve the original failure; no threshold changes or favorable-run selection are justified.
