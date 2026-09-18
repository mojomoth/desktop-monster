# Bounded live-disclosure observation correction

Reviewer: `/root/skills_harness`. Source correction approved for final native execution; no acceptance weakening found. Final native evidence remains pending.

The scenario still observes at least the original3.2-second requested interval and retains the original open/focus/page/order/scroll/card-position checks. It additionally requires the same disclosure DOM node and advancing play time in real menu `onStateChanged` receipts. After that interval, it waits at most60additional seconds for an actual coin-changing receipt while repeatedly checking the same disclosure state. The coin change remains in the same open-menu observation; unrelated final gold gain cannot satisfy it. No game state, balance timing, fixture currency or click latency budget was altered.

The reused `until` function awaits each predicate and propagates assertion errors immediately. It does not swallow a detected closure, node replacement, focus loss or position/order change and later count recovery as success. Timeout and assertion failure flow into the scenario's failed check with the before/latest available raw snapshots and error. The minimum-duration check remains required before the coin observation can pass.

The new pure regression accepts stable save updates without premature gold during the first stage, rejects those same unchanged coins at the required coin stage, and rejects replaced/closed/unfocused nodes, changed order/scroll/card position and missing or stale live-save time. Independently executed only that named Node regression;1 passed. No Electron or heavy test suite was launched by this reviewer. The final frozen package must still produce the actual native observation and screenshots.
