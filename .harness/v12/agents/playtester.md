# V12 Native Playtester

Host `/root/loop/host` performs this operational role and reports its actual identity.
It is not an additional independent agent. `/root/loop/critic` reviews Host
implementation/evidence; Host may independently review Designer visuals.

Read pinned `game-ui-ux`, `game-feel` and pacing references only as applicable.
Use isolated user data, synthetic accounts and native Electron input. Do not load
personal saves, enable global hooks, prompt for Accessibility, or contact production.

## Native cases

- Show top-left counters and coin landing, damage start/mid/end, outlined LEVEL UP
  above REBIRTH READY, and the single head FEVER. Capture simultaneous states and
  the largest/smallest hero/monster geometry at supported game scales.
- Click both codex chevrons with pointer and keyboard. Keep disclosure, focus,
  pagination and scroll state across live save updates and shop timer updates.
- Select companion growth, wait through a live update, complete and cancel it;
  verify selection, explanatory text and the actual resulting companion state.
- Inspect all eight tabs on one row and correct placement of soul recovery/export.
- Manually equip weapon/accessories, swap in a full bag, reject stale/invalid
  actions, acquire a stronger item and restart. Verify exact loadout and storage
  identities, wallet changes and durable save state. Test weaker/equal acquisitions
  and unrelated actions without overwriting manual choices.
- Use native pointer events for normal interactions. Do not set `details.open`,
  call reducers, or invoke bridge actions directly as a substitute for UI coverage.

## Response and performance evidence

Measure at least 100 samples per registered action family. Record event-to-first
paint separately from event-to-local-applied-result; targets are p95 <=100ms and
<=250ms respectively. Assert final state, no missed/double action, and persistence
across subsequent renders. Pending feedback is not successful mutation evidence.

Run frozen baseline/candidate active and idle observations serially for the full
registered durations with comparable fixtures and CPU/RAM budgets. Record app,
observer, protocol, source, timestamps, raw samples and cleanup. Preserve failed
or interrupted attempts; never shorten and relabel them as complete observations.

## Limits and handoff

Record exact screenshots inspected, commands, runtime errors and package hashes.
Keep accelerated core simulation, native elapsed observation and human playtime
separate. Without a participant observation, human fun remains unverified. Do not
claim Windows hardware or production verification from injected local tests.

## Raid native cases (v0.12)

- `raid-hud-states`: fixture server pushes gathering → countdown → confirming; assert `#raid-status` text and class,
  click its centre with `sendInputEvent`, observe the confirm action in main, family `raid-confirm`.
- `raid-battle`: fixture battle state; 30 native clicks over 5 s → `RAID_DAMAGE` count equals clicks; captured
  pixels show red at the HP row, blue at the time row, yellow marker above my slot, a float within 100 ms
  (family `raid-click`); settled → VICTORY banner → field restored. Nine tabs on one row in a menu capture.
