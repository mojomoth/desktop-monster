# Session record — iter 01

- agent role: builder
- worker: claude
- lane: .worktrees/T54 (branch lane/T54)
- harness version: v3
- task: T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types
- result: DONE
- commit: see below
- graphify affected used: none (grep over `Snapshot`/`PvpOpponent`/`Store` users was cheaper than a graph query — the blast radius is 10 files)

## What I did

- `src/shared/api.ts`: added the v3 wire types verbatim from SERVER_ARCHITECTURE_V3 §2 —
  `MonsterType` (string-union literal, still zero core imports), `Snapshot.party: string[]`,
  `PvpOpponent.party`, `MatchResponse`, `PvpRequest`, `WireBlow`, `BattleReplay`,
  `PvpResponse.blows`, `Theft`, `TheftsResponse`, `ReclaimRequest/Response`,
  `SnapshotResponse.thefts`, `PARTY_SIZE_MAX/MATCH_TTL_MS/RECLAIM_WINDOW_MS/THEFTS_MAX`,
  `NetError += 'expired' | 'gone'`, `MatchResult`/`TheftsResult`/`ReclaimResult`.
- `src/server/store.ts`: `PlayerRow.thefts: Theft[]`, `Store.setThefts(id, thefts)` (10 methods),
  `MemoryStore.setThefts` + `thefts` in `createPlayer`/`view`.
- `src/server/pgStore.ts`: DDL `ALTER TABLE players ADD COLUMN IF NOT EXISTS thefts jsonb NOT NULL
  DEFAULT '[]'` (additive, shared with the live v2 service), tolerant row mapper, `setThefts` =
  `UPDATE players SET thefts = $2::jsonb WHERE id = $1`. No `matches` table.
- `src/server/app.ts`: module-level `export const matches = new Map<string, PendingMatch>()` with the
  `ponytail:` comment naming a `matches` table as the multi-instance upgrade; `POST /v1/pvp/match`
  (auth → rate limit → 400 `no_snapshot` → v2 neighbour rule or bot → `randomBytesHex(8)` /
  `randomSeed() >>> 0` / `now() + MATCH_TTL_MS`, entry stored, TTL pruned on every call, no store
  writes, no cooldown); `parseSnapshot` validates `party` (≤ 5 ids, `COMPANION_ID_RE`, present in
  `companions`, deduped in order — violations DROP ids, never reject); local `partyOf` preview
  helper (stored ids, else the 5 strongest by core `companionPower`).
- `POST /v1/pvp` behaviour is byte-for-byte unchanged (T60 owns it): its opponent literal is now
  built explicitly in the v2 shape rather than aliasing the stored `Snapshot`, because `Snapshot`
  gained `party` and would otherwise leak it into the v2 response body.
- Tests: `tests/server/app.test.ts` 10 → 13 `it(`, `tests/server/pgStore.test.ts` 19 → 22 `it(`,
  all six new titles verbatim from the AC. No test deleted, skipped, renamed or weakened.

## Deviations / gate-forced fixes outside the task's Files

- `PvpResponse.lost` kept as `Companion | null` instead of §2's literal `lost: null`. Declaring
  `null` would have forced me to rewrite `tests/menu.test.ts`'s `LOST` fixture and the three
  defeat-text assertions that depend on it (T71's file) — i.e. weakening live tests for a field the
  v3 server simply never sets. The runtime contract is unchanged; a `ponytail:` comment in api.ts
  records that v3 never populates it. Everything else in §2 is verbatim.
- `src/main/net.ts` — `toSnapshot` now emits `party: []` (required field; T67 wires `save.pvpParty`).
- `tests/net.test.ts`, `tests/menu.test.ts`, `tests/deploy.test.ts` — fixtures gained `party: []`,
  `blows: []`, `thefts: []` and `opponent.companions` → `opponent.party`. Purely additive shape
  updates; no assertion loosened.

## Files touched

- src/shared/api.ts
- src/server/store.ts
- src/server/pgStore.ts
- src/server/app.ts
- tests/server/app.test.ts
- tests/server/pgStore.test.ts
- src/main/net.ts (gate-forced)
- tests/net.test.ts, tests/menu.test.ts, tests/deploy.test.ts (gate-forced fixtures)

## Gate results

```
$ npm test && npm run lint && npm run typecheck
 Test Files  31 passed (31)
      Tests  507 passed (507)
> eslint . --max-warnings 0
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(exit 0)

$ <T54 AC line, verbatim>
 Test Files  3 passed (3)
      Tests  44 passed (44)
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT let the `/v1/pvp` opponent be the stored `Snapshot` object again: `Snapshot.party` now
  leaks into the response and breaks `tests/server/pvp.test.ts`'s `toEqual` on `opponent`.
- Do NOT declare `PvpResponse.lost: null` before T60/T71 land — it breaks `tests/menu.test.ts`'s
  `LOST` fixture and its three verdict-text assertions with no way to fix them without weakening.
- `matches` is module-level per §4, so it is shared by every `createApp` in a test FILE. Assert on
  specific match ids (`matches.get(id)` / `matches.has(id)`), never on `matches.size`; give parallel
  `setup()`s different rng seeds so their `randomBytesHex` streams cannot collide.
