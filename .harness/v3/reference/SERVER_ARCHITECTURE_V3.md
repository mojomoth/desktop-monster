# SERVER_ARCHITECTURE_V3.md — v3 server delta (harness v3, NORMATIVE)

Delta over `SERVER_ARCHITECTURE.md` (v2, still normative for everything not
listed here: runtime, layout, auth, rate limit, body cap, PgStore rules,
probe, deploy verification rule). Game rules (type chart, party, battle
simulation, replay presentation, notification UX) live in `GAME_DESIGN_V3.md`.

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| PvP flow | Two steps: `POST /v1/pvp/match` (opponent + party preview, match id, 120 s TTL) then `POST /v1/pvp { matchId, party }`. |
| Verdict | Deterministic core `simulateBattle` (GAME_DESIGN_V3 §5) via `resolvePvp(attackerParty, defenderParty, mulberry32(seed), winnerRosterSize)`; the blow list goes on the wire as the replay. |
| Steal | Attacker-only, `STEAL_CHANCE = 0.15` (core), from the defender's PvP party; the victim gets a `Theft` record with a 24 h reclaim window. |
| Reclaim | `GET /v1/thefts` lists pending thefts; `POST /v1/reclaim { theftId }` moves the companion back while the window is open and the thief still holds it. |
| Match storage | In-memory `Map<matchId, PendingMatch>` in app.ts (single free instance; restart = expiry). No `matches` table. |
| Storage delta | `players.thefts jsonb NOT NULL DEFAULT '[]'` (idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS`); `Snapshot.party` inside the existing jsonb snapshot. |
| Compatibility | v2 clients keep working: old routes unchanged except `POST /v1/pvp`, which now REQUIRES `matchId` (a v2 body → 400 `bad_request`). Acceptable: v2 is frozen at tag `v2` and its server stays on `desmon-server` (main). |
| Hosting | Second free web service `desmon-server-v3` built from branch `v3` (`DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 render-bootstrap.sh`), sharing `desmon-db`. |

## 1. Layout delta

```
src/core/battle.ts            (core) simulateBattle, resolvePvp v3 — shared with the client
src/server/app.ts             + match store, POST /v1/pvp/match, POST /v1/pvp v3, GET /v1/thefts, POST /v1/reclaim, thefts in PUT /v1/snapshot
src/server/store.ts           Store += setThefts(id, thefts); PlayerRow += thefts: Theft[]
src/server/pgStore.ts         DDL += ALTER TABLE players ADD COLUMN IF NOT EXISTS thefts jsonb NOT NULL DEFAULT '[]'; row mapper + setThefts
src/shared/api.ts             + MonsterType, Snapshot.party, MatchResponse, WireBlow, BattleReplay, PvpRequest, PvpResponse v3, Theft, TheftsResponse, ReclaimRequest/Response, PARTY_SIZE_MAX, MATCH_TTL_MS, RECLAIM_WINDOW_MS, THEFTS_MAX
src/main/net.ts               + match(token), pvp(token, body), thefts(token), reclaim(token, theftId); session: match(), pvp(matchId, party), thefts(), reclaim(id); toSnapshot includes party
src/main/thefts.ts            theft watcher (poll + notify), electron-free, injected timers (GAME_DESIGN_V3 §8)
tests/server/{app,pvp,pgStore}.test.ts, tests/net.test.ts, tests/thefts.test.ts
```

Server code imports from `src/core`: `ROSTER_CAP`, `SPECIES_IDS`, `resolvePvp`,
`mulberry32`, `pvpParty`, `autoParty`, `PARTY_SIZE`. `src/shared/api.ts` stays
core-free (own structural copies; `MonsterType` is re-declared as a string
union literal — the AC `! grep -q "from '../core" src/shared/api.ts` holds).

## 2. Wire types (`src/shared/api.ts`, additions)

```ts
export type MonsterType = 'fire' | 'wind' | 'earth' | 'water' | 'dark';
export interface Snapshot { name: string; bestIndex: number; rebirths: number; companions: Companion[]; party: string[] } // party: ≤ PARTY_SIZE_MAX ids ⊆ companions (dropped otherwise); missing → []
export interface PvpOpponent { name: string; bestIndex: number; rebirths: number; party: Companion[] }   // v3: party (≤ 5) instead of the full roster
export interface MatchResponse { matchId: string; seed: number; bot: boolean; opponent: PvpOpponent; expiresAt: number }  // expiresAt = now + MATCH_TTL_MS (server clock, ms)
export interface PvpRequest { matchId: string; party: string[] }
export interface WireBlow { side: 'A' | 'D'; actorId: string; targetId: string; damage: string; ko: boolean }
export interface BattleReplay { opponentName: string; opponentParty: Companion[]; blows: WireBlow[] }
export interface PvpResponse { bot: boolean; seed: number; win: boolean; opponent: PvpOpponent; blows: WireBlow[]; stolen: Companion | null; lost: null }  // lost is always null in v3 (attacker never loses one); kept for the client's pvpResult shape
export interface Theft { id: string; companion: Companion; transferredId: string; thiefId: string; thiefName: string; at: number; reclaimUntil: number }
export interface TheftsResponse { thefts: Theft[] }          // pending only: not reclaimed, reclaimUntil ≥ now
export interface ReclaimRequest { theftId: string }
export interface ReclaimResponse { companion: Companion }    // re-id'd 'r' + seed-part; add to the roster as-is
export interface SnapshotResponse { rank: number; removed: string[]; thefts: Theft[] }  // + pending thefts
export const PARTY_SIZE_MAX = 5; export const MATCH_TTL_MS = 120_000; export const RECLAIM_WINDOW_MS = 86_400_000; export const THEFTS_MAX = 8;
export type NetError = 'offline' | 'unauthorized' | 'network' | 'server' | 'cooldown' | 'expired' | 'gone';  // + expired (410), gone (409)
export type MatchResult = MatchResponse; export type TheftsResult = TheftsResponse; export type ReclaimResult = ReclaimResponse;
export type PvpResult = PvpResponse & { removed: string[] };
```

`parseSnapshot` additionally validates `party`: array of ≤ 5 strings matching
`COMPANION_ID_RE`, each present in `companions`, deduped in order; violations
DROP the offending ids (never reject the snapshot — forward compatible).

## 3. HTTP API delta (`/v1`, bearer unless noted)

New/changed error codes: `400 bad_party` (party id not in my roster / > 5),
`410 match_expired` (unknown or expired match id, or a match owned by
another player), `410 expired` (reclaim window over), `409 gone` (thief no
longer holds the companion). Rate limit and body cap unchanged.

| Method / path | Request | Response | Rules |
|---|---|---|---|
| `POST /v1/pvp/match` | body ignored | 200 `MatchResponse` | auth → rate limit → `me.snapshot` null → 400 `no_snapshot`; opponent = v2 neighbour rule (or bot `{ name: 'Training Dummy', bestIndex, rebirths, party: [] }`); `opponent.party = pvpParty(opp.snapshot.companions, opp.snapshot.party)` (core: manual ids resolved, else `autoParty`); `matchId = randomBytesHex(8)`, `seed = randomSeed() >>> 0`; store `{ matchId, playerId: me.id, opponentId: opp?.id ?? null, seed, opponentParty, createdAt: now() }`; prune entries older than `MATCH_TTL_MS` on every call; no cooldown check here; no store writes. |
| `POST /v1/pvp` | `PvpRequest` | 200 `PvpResponse` | auth → rate limit → cooldown (v2 rule, `lastPvpAt`) → match lookup: missing/expired/not mine → 410 `match_expired` (and deleted); `party` = `pvpParty(me.snapshot.companions, body.party)` after validating every id exists in my roster (else 400 `bad_party`; empty list → auto); defender party = the STORED `opponentParty` from the match (what the player saw); `setLastPvpAt(me.id, now())`; `verdict = resolvePvp(party, opponentParty, mulberry32(seed), me.snapshot.companions.length)`; `win = verdict.attackerWon`; `blows` = verdict.blows with `damage: String(bigint)`; delete the match. Bot or `moved === null` → `stolen: null`, no roster writes. Steal (`moved !== null`, non-bot): `transferred = { ...moved, id: 's' + seed }`; loser (opponent) roster `without(moved.id)`, party ids too; winner roster `+= transferred`; `setStolenIds(loser, [...ids, moved.id].slice(-32))`; theft `{ id: 't' + seed, companion: moved (original id), transferredId: 's' + seed, thiefId: me.id, thiefName: me.name, at: now(), reclaimUntil: now() + RECLAIM_WINDOW_MS }` appended to the loser's thefts (`.slice(-THEFTS_MAX)`); `putSnapshot` both; `setThefts(loser)`. Respond `stolen: transferred`, `lost: null`. Response `opponent` = the match's opponent (name/bestIndex/rebirths/party as previewed). |
| `GET /v1/thefts` | — | 200 `TheftsResponse` | pending = `reclaimUntil ≥ now()`; expired entries are pruned from the row lazily (`setThefts`). |
| `POST /v1/reclaim` | `ReclaimRequest` | 200 `ReclaimResponse` | theft must be in MY row; `now() > reclaimUntil` → 410 `expired` (pruned); thief row (`getById(thiefId)`) missing or its roster lacks `transferredId` → 409 `gone` (pruned); else: thief roster `without(transferredId)` + thief `stolenIds += transferredId`; returned = `{ ...theft.companion, id: 'r' + theft.id.slice(1) }` (unique: 'r' + seed); my roster `+= returned` only if `< ROSTER_CAP` (full → still 200, the client gets the companion and applies the `addCompanion` rule which drops it — stated), theft removed; `putSnapshot` both, `setStolenIds(thief)`, `setThefts(me)`. |
| `PUT /v1/snapshot` | `Snapshot` (+ `party`) | 200 `SnapshotResponse` (+ `thefts`) | unchanged otherwise. |

Match store: `const matches = new Map<string, PendingMatch>()` module-level in
app.ts, pruned on every `/v1/pvp/match` and `/v1/pvp` call; `ponytail:`
comment names a `matches` table as the multi-instance upgrade. Everything else
(neighbour pick, `stolenIds` stripping on upload, rate limit, cooldown,
`now()`/`randomUUID`/`randomBytesHex`/`randomSeed` injected) is v2.

## 4. Store delta

```ts
export interface PlayerRow { id: string; name: string; snapshot: Snapshot | null; stolenIds: string[]; lastPvpAt: number | null; thefts: Theft[] }
export interface Store { …9 v2 methods…; setThefts(id: string, thefts: Theft[]): Promise<void> }  // 10 methods
```

`MemoryStore` and `PgStore` implement it in the SAME task (T54). DDL:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS thefts jsonb NOT NULL DEFAULT '[]';
-- setThefts
UPDATE players SET thefts = $2::jsonb WHERE id = $1;
```

`tests/server/pgStore.test.ts` pins the `ALTER TABLE … ADD COLUMN IF NOT EXISTS thefts`
literal and that no `matches` table exists (source pins, no DB).

## 5. Client networking delta

`NetClient` += `match(token)`, `pvp(token, body: PvpRequest)`, `thefts(token)`,
`reclaim(token, theftId)`; error mapping += 410 → `expired`, 409 → `gone`
(both with `status`). `toSnapshot(name, save)` copies `save.pvpParty` into
`party`. `createNetSession` += `match()` (upload if dirty first — the opponent
must see my current party), `pvp(matchId, party)` (ALWAYS upload first, as v2),
`thefts()`, `reclaim(theftId)`; roster key gains `pvpParty` (a party edit
triggers a background upload). Identity += `notifiedTheftIds: string[]`.

IPC/preload names: GAME_DESIGN_V3 §9. Main-originated action after reclaim:
GAME_DESIGN_V3 §8.

## 6. Deploy delta

- Provision: `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh`
  (reuses `desmon-db` by name; creates the service from branch `v3` with the
  same build/start/filter settings). Output `SERVER_URL=https://desmon-server-v3.onrender.com`.
- Push: `git push origin HEAD:v3`. Deploy: `render deploys create <srv-id> --wait --confirm`.
- Verification rule unchanged, evaluated against the `v3` branch HEAD:
  healthz ok ∧ `git merge-base --is-ancestor <sha> HEAD` ∧ no filter-path
  commit after `<sha>`.
- AGENTS.md §Server lines for v3: `SERVER_URL=`, `RENDER_SERVICE_ID=`
  (the v3 service), `RENDER_POSTGRES_ID=` (shared), `DB_CREATED=`, `DB_EXPIRES=`
  (unchanged — same DB), `DEPLOYED_SHA=`, plus `V2_SERVER_URL=https://desmon-server.onrender.com`
  kept for reference.
- Probe unchanged (register → upload → leaderboard; never plays PvP, never
  reclaims).

## 7. Known limitations (add to handoff)

- Matches live in memory: a server restart or a second instance loses pending
  matches (client re-fetches). Thefts are stored per victim row (last 8).
- Theft notifications depend on the victim being online within the 24 h window
  and on macOS allowing notifications for the app ("Electron" in dev, "DesMon"
  packaged); the Battle tab inbox is the fallback surface.
- The battle is deterministic: with the opponent's party visible, the stronger
  type-adjusted party always wins; variance exists only in the steal roll.
- Shared `desmon-db` with the v2 service: v2's `parseSnapshot` drops `party`
  on v2 uploads (harmless); v2 clients cannot call `/v1/pvp` v3 (400).
