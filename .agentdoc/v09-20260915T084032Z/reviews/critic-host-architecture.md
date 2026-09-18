# Critic: v0.9 host save and online-operation architecture

Status: independent source review before implementation; no runtime or E2E pass claimed.
Scope: the proposed main-owned SaveCoordinator, freeze/capture IPC, operation journal, reset/restore, and direct opponent battle. Product decisions are fixed: retain the opponent directory; saved party with automatic fallback; four ranking metrics; five recovery checkpoints without expiry.

## Required corrections

### P0 — pending battle recovery must not upload the old roster first

Existing `src/main/net.ts` `pvp()` always calls `upload()` before sending the battle. If the server committed a stolen companion but its response was lost, recovery through that method first replaces the server roster with the pre-battle save. The victim can observe the transferred companion as gone before the cached result is returned.

Use a recovery request that retries the same persisted match ID without any snapshot upload. Resolve pending operations before `identity()`, `onSave()`, `leaderboard()`, or `opponents()` can start their implicit uploads. Cached server results must be returned before cooldown and pending-match checks. Only the initial battle request needs preflight synchronization.

### P0 — distinguish committed journals from unfinished journals

Journal, active save, and metadata are separate files. The journal must contain the complete candidate and metadata effects, including applied match ID, generation, high-water mark, reconciliation state, and last battle. Otherwise a crash can persist the roster while losing its receipt, or advance a receipt without its roster.

Persist a committed operation ID in metadata. After save and metadata commit, failure to delete the journal must not make a subsequent boot overwrite later progress with its old candidate. Startup ignores or cleans journals already marked committed; it replays only genuinely unfinished candidates. Once a commit journal is durable, a later write failure leaves a retryable unfinished operation, not a cancelled operation followed by old-state gameplay.

### P1 — freeze capture replies must not wait behind their own operation

An operation holding the coordinator queue cannot wait for a renderer `SAVE_STATE` handler that is scheduled behind that same operation. Use a dedicated capture response resolved outside the mutation queue, bound to the operation ID, generation, and authorized overlay webContents. The holding operation then validates and persists its snapshot. All failure/timeout paths release the capture waiter.

### P1 — freeze every mutation entry point

The renderer currently mutates through global input, focused fallback input, `game.update()`, collection `onAction`, debounce saves, and blur saves. Freezing only ticks leaves stale actions and saves active. Reject or defer those mutations consistently; pair a save's generation with the snapshot at request creation, rather than reading a changed generation later. Stale saves cannot overwrite a committed replacement. Reset or restore cannot begin while a battle or reclaim outcome is unresolved.

### P1 — preserve live battle presentation without resetting progression timers

`createEngine(save)` intentionally starts fever cold and restarts companion-volley timing. Replacing the renderer engine after every ordinary PvP/reclaim therefore changes gameplay outside the requested feature. Prefer applying the committed actions to the still-frozen live engine on normal success; use full replacement for reset, restore, and startup recovery. Main still owns persistence and duplicate suppression. If a full replacement is retained, the transient reset needs an explicit decision and regression coverage.

`Game.playReplay()` alone does not schedule the `pvpResolved` victory/defeat presentation. Keep replay and result presentation, while ensuring the renderer does not award the already-committed companion a second time. Persist the actual attacker party and equipped hero in `lastBattle`; the server response alone contains only the defender party and blow actor IDs.

## Smaller correctness checks

- `Engine.apply()` returns an empty event list on invalid collection actions. Verify expected reward insertion or an already-applied receipt before marking the battle applied; do not silently accept a failed companion addition.
- Keep identity and recovery metadata outside restore checkpoints. A corrupt metadata file is not equivalent to a first-install missing metadata file: silently recreating it loses receipts and the allocation high-water mark.
- Load and validate the requested restore checkpoint before writing the pre-restore checkpoint and rotating the five retained files; otherwise restoring the oldest checkpoint can delete its source before reading it. Rotate only after the new backup is durable.
- Confirmation cancellation and backup failure occur before the commit decision and leave progress unchanged. Distinguish these cases from a journal already durably committed for recovery.
- The native notification reclaim path currently calls the session and broadcasts `addCompanion` independently. It must use the same coordinator as menu reclaim, battle, restore, and reset. Avoid recursive queue acquisition inside private net operations.
- Persist the ID high-water mark outside backups. Split the current first-five-captures condition from `nextCompanionId`, which is presently both an allocator and a gameplay counter; preserve legacy eligibility when migrating.
- Restore must synchronize server-authoritative revocations on every snapshot write, not only an earlier `/me` read. The latter has a race with a subsequent remote theft. Keep online operations quarantined until the filtered state is locally durable.

## Focused acceptance checks

1. Commit a battle server-side, lose the reply, restart main, and assert recovery sends no PUT before retrying the persisted match; the transferred companion remains reclaimable throughout.
2. Inject failure after each journal/save/metadata/cleanup boundary. Restart, then assert one reward, one official record, correct generation, and no later-progress rollback.
3. Queue a stale renderer save, blur, fallback input, and collection action around freeze/replacement; none alters the new generation.
4. Close the menu during a successful battle; the durable save and last battle still contain the result and correct attacker art.
5. Start PvP during active fever and a pending companion volley; successful result handling does not silently restart their state.
6. Restore the oldest of five checkpoints; the chosen checkpoint remains available to the operation, and the new pre-restore backup is recoverable.
7. Trigger native-notification reclaim while reset/restore is queued; no outcome is applied to the wrong generation or lost through a stale upload.

No source files or tests were modified for this review.
