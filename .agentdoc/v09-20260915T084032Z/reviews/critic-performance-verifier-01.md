# Critic — initial persisted-state normalization

Reviewed: 2026-09-15 10:44 UTC.

Scope: source/raw-evidence review of the proposed `validateObservation` correction while performance observations continue. No app, browser, build, test, or performance workload was launched by this reviewer.

## Decision

**Approve the proposed exact-fixture fallback as normalization of an initial persisted save, not a relaxation of performance or progress budgets.** Apply it only with the stated equality/history guard and retain all existing clock-lag, cadence, duration, error, metric, and final-progress assertions. Host is adding synthetic regression tests; their pass remains separately required.

## Independently checked evidence

Read `.harness/v9/performance-report.mjs`, the preserved observer `.harness/v9/performance.mjs`, and the baseline-idle report/raw samples under `performance-02`.

- The observer builds its fixture using the installed package's `parseSave()` and writes that exact value to the owned fixture save file before the app starts.
- The verifier already interprets absent `fixture.progress.playTimeMs` as initial zero. This agrees with the legacy initial save's clock semantics.
- `baseline-idle.json` records a passed 30-minute observer run with no errors.
- Only raw sample index 0 lacks `progress.playTimeMs`. Its elapsed time is **5024.168541 ms**, and its entire saved value is deeply equal to `report.metadata.fixture`.
- Sample index 1 contains explicit **5340.5 ms** persisted play time at **10031.595208 ms** elapsed. The first sample therefore observes the unchanged initial file before the first clock-bearing save; it is not evidence that the entire observation lacks progression.

## Why the proposed guard is appropriate

Proposed row interpretation:

```js
const playTime = row.save?.progress?.playTimeMs ??
  (previousPlayTime === initialPlayTime && equal(row.save, fixture)
    ? initialPlayTime : undefined);
```

This assigns the already-defined initial clock only to a complete snapshot identical to the registered fixture and only before any larger persisted clock has been observed. It does not infer positive elapsed play time or rewrite raw data. A numeric zero clock in that initial snapshot would already pass the existing validator under the same conditions.

The unchanged absolute lag condition still rejects an unadvanced initial save beyond **10,000 ms**. After any positive advancement, the history guard rejects missing clock data even if an old fixture snapshot reappears. A changed/malformed snapshot without a clock fails exact equality. The final save still requires an explicit finite, monotonic clock and increased kills. The full 30/180-minute schedules, 5-second sampling, zero-error budget, input schedules, and resource thresholds are unchanged.

## Required regression boundaries and audit trail

Use a complete valid synthetic observation to confirm the initial fixture may lack the optional progress field, and separately reject:

1. A missing-clock snapshot differing from the fixture.
2. An unchanged missing-clock initial fixture later than the existing 10-second lag allowance.
3. A missing-clock fixture after an explicit progressed clock has been observed.

Preserve the original validation failure and the unchanged observation bytes. Record this verifier-only normalization in the evaluation handoff; do not present it as a fresh measurement. Existing app/observer/fixture/raw artifacts and protocol budgets must keep their original hashes.
