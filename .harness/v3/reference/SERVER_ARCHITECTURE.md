# SERVER_ARCHITECTURE.md — server / leaderboard / PvP / deploy (harness v2, NORMATIVE)

Written 2026-09-02, before any server code exists. Every shape, path, name and
rule below is what the T22+ tasks implement; treat it like GAME_ARCHITECTURE.md
(v1): normative unless it demonstrably fails, and then the deviation goes into
the task's `note`.

Precedence: the loop contract (`.harness/v2/HARNESS.md`, `loop/`) > the approved
plan > this document > the original design dump. Game rules (bigint numbers,
boss cadence, companions, fever, `resolvePvp` internals, menu actions) live in
`reference/GAME_DESIGN_V2.md`; Render CLI facts and limits live in
`reference/TOOLING.md §6`; code-style rules in `reference/PONYTAIL.md`. This
document owns: the server, the wire contract, client networking, deployment.

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Runtime | `node:http` + `pg` only. No framework, no `@types/pg`, no separate tsconfig. |
| Location / build | `src/server/**` compiled by the EXISTING `tsconfig.main.json` → `dist/electron/server/index.js`; excluded from the .app by electron-builder. |
| Auth | `POST /v1/players {nickname}` → `{playerId, token}`; server stores `sha256(token)`; bearer on every other `/v1` call. |
| Identity storage | `userData/identity.json`, main-process only. NOT in `save.json`; the token never crosses IPC. |
| Score | `bestIndex DESC, rebirths DESC` — plain integers. No BigNum keys on the wire or in SQL. |
| PvP | Async, server-resolved: opponent = rank neighbour (`seed & 1` → up/down) or bot "Training Dummy"; verdict = shared core `resolvePvp(attacker, defender, mulberry32(seed))`; steal one uniformly random companion (none if loser empty, winner full, or bot). |
| Anti-cheat | **Accept-and-rank**, stated openly: snapshots are self-reported; "server-authoritative" means the verdict + roster bookkeeping only, never stat integrity. |
| Abuse bounds | 60 req/min per key, 64 KB body cap, 60 s PvP cooldown, one snapshot row per player, shape/caps validation. |
| Storage | One `players` table (jsonb snapshot + integer score columns). No matches table, no history. |
| Tests | `createApp().handle()` + `MemoryStore`, injected `now/randomUUID/randomBytesHex/randomSeed`; the http adapter is tested with injected streams. No sockets in `npm test`; network only in T44/T51 ACs behind `DESMON_SKIP_NET`. |
| Deploy | Render free tier via CLI (`loop/render-bootstrap.sh`, idempotent by name); explicit `render deploys create --wait`; `/healthz` returns the built sha for verification. |

## 1. Layout and build

Files (all new unless marked):

```
src/server/index.ts     boot: PORT (default 10000), DATABASE_URL → PgStore else MemoryStore + warning, listen 0.0.0.0
src/server/http.ts      node:http adapter: 64 KB body cap → 413, bad JSON → 400, GET /healthz, ApiRequest/ApiResponse bridge, client ip
src/server/app.ts       createApp(deps).handle(req): routing, auth, validation, rate limit, leaderboard, pvp + steal bookkeeping
src/server/store.ts     Store interface (9 methods) + MemoryStore
src/server/pgStore.ts   PgStore over pg.Pool + idempotent DDL at boot
src/server/pg.d.ts      ambient 'pg' declaration (Pool ctor/query/end only) — replaces @types/pg
src/server/probe.ts     live round-trip check used by the deploy tasks (register → upload → leaderboard), reuses src/main/net.ts
src/shared/api.ts       wire + IPC-level types and validation constants (shared by server, main, preload, renderer)
src/shared/serverUrl.ts export const SERVER_URL = '' until the deploy task bakes the Render URL
src/main/identity.ts    identity.json read/write (electron-free, dir injected — persistence.ts pattern)
src/main/net.ts         createNetClient (HTTP, injected fetch) + createNetSession (identity, sync, 401 re-register)
.node-version           20.12.2
tests/server/{http,app,pvp,pgStore}.test.ts, tests/identity.test.ts, tests/net.test.ts
```

Build / tooling rules:
- `tsconfig.main.json` `include` += `"src/server"` (CJS, module node16, `types: ["node"]`). `npm run build`,
  `npm run typecheck`, `eslint .` cover it with NO script-body changes; the gates line is unchanged.
- `package.json`: `scripts["start:server"] = "node dist/electron/server/index.js"` (the only new script
  name, documented in AGENTS.md §Commands); `build.files = ["dist/**/*", "static/**/*", "!dist/electron/server/**"]`
  (tests/packaging.test.ts still sees `dist/**/*`).
- `pg` **8.23.0** in `devDependencies` (never `dependencies`: keeps pg and its transitive packages out of the
  .app). Render installs with `npm ci --include=dev --ignore-scripts` — `--include=dev` is mandatory anyway
  (typescript is a devDependency); `--ignore-scripts` skips the Electron binary download and uiohook's
  node-gyp-build on the server. Rung 5 justification (PONYTAIL §4, pre-approved): a Postgres driver is not in
  the stdlib.
- `src/server/pg.d.ts` (exact):
  ```ts
  // ponytail: only the 3 members we use; swap for @types/pg if this grows.
  declare module 'pg' {
    export class Pool {
      constructor(cfg: { connectionString: string; ssl?: { rejectUnauthorized: boolean } });
      query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
      end(): Promise<void>;
    }
  }
  ```
- Vitest already includes `tests/**/*.test.ts`; `tsconfig.test.json` needs no change (server sources are
  pulled in transitively, like `src/main/persistence.ts` today). Tests import `app.ts`/`store.ts`/`http.ts`
  only — `pgStore.ts` (and therefore `pg`) is never loaded by `npm test`.
- Local run without a DB: `npm run build && npm run start:server` → MemoryStore + exactly one stderr line
  `[desmon-server] DATABASE_URL unset — using MemoryStore (data is lost on restart)`. Render sets `PORT`.
- `.node-version` = `20.12.2` (Render honours it; matches the local binding constraint, GAME_ARCHITECTURE §0.2).
- Server code imports from `src/core` (`ROSTER_CAP`, `SPECIES_IDS`, `resolvePvp`, `mulberry32`) and
  `src/shared/api.ts`. It never imports `electron` or anything under `src/main`/`src/renderer`
  (except `probe.ts`, which imports the electron-free `src/main/net.ts`).

## 2. Wire types (`src/shared/api.ts`)

This section and §6 are THE normative wire/net design (GAME_DESIGN_V2.md §9/§10 point here and keep no
copies). JSON-safe, integers only. Structurally identical to core's `Companion` (src/core/save.ts, T24) —
api.ts declares its own copy so `src/shared` never imports `src/core` (T41's AC
`! grep -q "from '../core" src/shared/api.ts` keeps shared core-free); TypeScript's structural typing makes
the two interchangeable.

```ts
export interface Companion { id: string; speciesId: string; bossIndex: number; level: number; stars: number }
export interface Snapshot { name: string; bestIndex: number; rebirths: number; companions: Companion[] }
export interface LeaderboardRow { rank: number; name: string; bestIndex: number; rebirths: number }

export interface RegisterResponse { playerId: string; token: string }
export interface SnapshotResponse { rank: number; removed: string[] }          // removed = companion ids the server stripped (caller's stolenIds)
export interface LeaderboardResponse { top: LeaderboardRow[]; me: LeaderboardRow | null }
export interface PvpOpponent { name: string; bestIndex: number; rebirths: number; companions: Companion[] }
export interface PvpResponse {
  bot: boolean; seed: number; win: boolean; opponent: PvpOpponent;
  stolen: Companion | null;   // set when win — already re-id'd by the server (§5), add it to the roster as-is
  lost: Companion | null;     // set when !win — remove by id
}
export interface ApiError { error: string; retryAfterSec?: number }

// IPC-level shapes (main → renderer results; §6)
export type NetError = 'offline' | 'unauthorized' | 'network' | 'server' | 'cooldown';
export type NetResult<T> = { ok: true; value: T } | { ok: false; error: NetError; status?: number; retryAfterSec?: number };
export interface IdentityPayload { name: string; playerId: string | null; online: boolean }
export type LeaderboardResult = LeaderboardResponse & { removed: string[] };
export type PvpResult = PvpResponse & { removed: string[] };

// Validation constants (server trust boundary + client setName)
export const NICK_RE = /^[A-Za-z0-9_-]{1,16}$/;
export const COMPANION_ID_RE = /^[a-z0-9]{1,16}$/;   // client ids c1, c2…; server-transferred ids s<seed>
export const LEVEL_MIN = 1; export const LEVEL_MAX = 10;
export const INT_MAX = 2_147_483_647;                // Postgres integer
export const LEADERBOARD_DEFAULT = 10; export const LEADERBOARD_MAX = 50;
```

Validation caps (server, `parseSnapshot(raw): Snapshot | null` in app.ts — never throws, null on any violation):
- `name` matches `NICK_RE`; `bestIndex`, `rebirths` are integers in `0..INT_MAX`.
- `companions` is an array of ≤ `ROSTER_CAP` (30, imported from src/core/collection.ts — the SAME constant the
  client enforces) items; each: `id` matches `COMPANION_ID_RE` and is unique within the snapshot, `speciesId`
  ∈ `SPECIES_IDS` (src/core/monsters.ts), `bossIndex` and `stars` integers in `0..INT_MAX`, `level` integer in
  `LEVEL_MIN..LEVEL_MAX`.
- Unknown extra fields are dropped, never rejected (forward compatibility).

## 3. HTTP API (`/v1`, JSON, `Authorization: Bearer <token>`)

Error body is always `{ "error": "<code>" }` plus `retryAfterSec` on 429. Codes:

| Status | `error` | When |
|---|---|---|
| 400 | `bad_request` | malformed JSON, wrong shape, invalid nickname/snapshot, bad `name` on register |
| 400 | `no_snapshot` | `POST /v1/pvp` before any successful `PUT /v1/snapshot` |
| 401 | `unauthorized` | bearer missing/unknown on a bearer-required route, or present-but-unknown on `/v1/leaderboard` |
| 404 | `not_found` | unknown method/path |
| 413 | `payload_too_large` | body > 65 536 bytes (adapter; request destroyed) |
| 429 | `rate_limited` | > 60 requests per fixed 60 s window for the key |
| 429 | `cooldown` | `POST /v1/pvp` within 60 s of the caller's last PvP |
| 500 | `internal` | store threw; `handle()` never throws |

| Method / path | Auth | Request | Response |
|---|---|---|---|
| `GET /healthz` | – | – | 200 `{"ok":true,"sha":"<RENDER_GIT_COMMIT or dev>"}` — answered by http.ts, never touches the store |
| `POST /v1/players` | – | `{ "nickname": string }` | 201 `RegisterResponse` |
| `PUT /v1/snapshot` | bearer | `Snapshot` | 200 `SnapshotResponse` |
| `GET /v1/leaderboard?n=10` | bearer optional | – | 200 `LeaderboardResponse` (`me` null without bearer or before the first upload) |
| `POST /v1/pvp` | bearer | body ignored (`{}`) | 200 `PvpResponse` |

Rules:
- **Auth**: `token = randomBytesHex(16)` (32 hex chars, injected), stored as `sha256(token)` hex
  (`node:crypto` `createHash('sha256')`); `playerId = randomUUID()` (injected). Nicknames are not unique.
- **Score / rank**: order by `(bestIndex DESC, rebirths DESC)`. `rank = 1 + count(players with a snapshot whose
  (bestIndex, rebirths) > mine)` — ties share a rank. Players without a snapshot are invisible to rank/top/neighbour.
- **Upload**: validate → strip every companion whose id is in the caller's `stolenIds` → store snapshot (name
  column := `snapshot.name`, `updated_at := now`) → return `{ rank, removed: strippedIds }`. `stolenIds` is kept
  (last 32; stripping is idempotent) — the loser learns here, on whichever upload comes first.
- **Leaderboard**: `n` = integer query param clamped to `1..LEADERBOARD_MAX`, default `LEADERBOARD_DEFAULT`;
  `top` = first n rows in score order with ranks computed by the tie rule; `me` = the caller's row or null.
- **Neighbour pick** (`POST /v1/pvp`): `seed = randomSeed() >>> 0` (injected). `up = store.neighbor(me.id, key, 'up')`
  = nearest player with score strictly greater; `down = store.neighbor(me.id, key, 'down')` = nearest with score
  ≤ mine, excluding me (equal scores count as "down"). Both exist → `seed & 1 ? down : up`; one exists → that one;
  none → **bot** `{ name: 'Training Dummy', bestIndex: me.bestIndex, rebirths: me.rebirths, companions: [] }`
  with `bot: true`. The bot never steals and is never stolen from; a bot match mutates only `lastPvpAt`.
- **Verdict**: `resolvePvp(me.snapshot.companions, opponent.companions, mulberry32(seed))` from
  src/core/collection.ts (§5). `win = verdict.attackerWon`.
- **Steal bookkeeping** (non-bot only; see §5 for the exact steps): move `verdict.moved` from loser to winner,
  re-id'd to `'s' + seed`; `setStolenIds(loser, [...loser.stolenIds, verdict.moved.id].slice(-32))` using the loser's
  ORIGINAL id; `putSnapshot` both rows; `setLastPvpAt(me.id, now())`. `verdict.moved` is null when the loser's roster is
  empty or the winner's stored roster already has `ROSTER_CAP` companions ("full roster wins nothing").
  Two non-transactional row updates — a concurrent match against the same loser could double-steal; accepted
  corner (single free instance + per-player cooldown), marked with a `ponytail:` comment naming `BEGIN/COMMIT` as the upgrade.
- **Cooldown**: `PVP_COOLDOWN_MS = 60_000` per caller via `lastPvpAt`; inside the window → 429 `cooldown`,
  `retryAfterSec = ceil((PVP_COOLDOWN_MS - elapsed) / 1000)`. `now()` is injected (never `Date.now()` in app.ts).
- **Rate limit**: fixed 60 s window, `RATE_LIMIT = 60` per key; key = `sha256(bearer)` when a bearer is present,
  else `ip:<ApiRequest.ip>`; `ApiRequest.ip` = first entry of `x-forwarded-for` (trimmed), falling back to
  `socket.remoteAddress` (Render fronts the service with a proxy — the socket address is the proxy). In-memory
  `Map`, pruned lazily when it exceeds 10 000 keys; resets on restart. 429 `rate_limited` with `retryAfterSec`.
- **Body cap**: `BODY_LIMIT = 65_536` bytes, enforced in http.ts by counting chunks; on overflow respond 413 and
  `req.destroy()`. Empty body → `body: null`.
- **No PII**: nickname only; the ip is a transient rate-limit key and is never stored or logged. No CORS
  headers (the only client is Electron main's `fetch`).
- **Accept-and-rank**: only shape/caps are validated. No plausibility bounds on `bestIndex`/`rebirths`/rosters —
  a clicker has no server-verifiable proof of play. Stated in README and handoff (§8).

## 4. `createApp(deps)` and the Store

`src/server/http.ts` (T22) owns the request/response bridge types and the adapter:

```ts
export interface ApiRequest { method: string; path: string; query: Record<string, string>; auth: string | null; body: unknown; ip: string }
export interface ApiResponse { status: number; body: unknown }
export type ApiHandler = (req: ApiRequest) => Promise<ApiResponse>;
export const BODY_LIMIT = 65_536;
export function clientIp(headers: IncomingHttpHeaders, remoteAddress: string | undefined): string;
export function createRequestListener(handle: ApiHandler): (req: HttpReq, res: HttpRes) => void;
// HttpReq = Readable & { method?: string; url?: string; headers: IncomingHttpHeaders; socket?: { remoteAddress?: string } }
// HttpRes = { statusCode: number; setHeader(name: string, value: string): unknown; end(body?: string): unknown }
```
`createRequestListener` answers `GET /healthz` itself (`{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }`,
key order ok → sha), parses `?query` with `new URL(url, 'http://x')`, reads the bearer from `authorization`,
buffers the body (cap → 413, `JSON.parse` failure → 400 `bad_request`), then delegates to `handle`; every
response is `application/json`. Tests drive it with a `node:stream` `PassThrough` carrying `method/url/headers/socket`
and a recording response object — no sockets. `index.ts` passes the listener to `http.createServer` and
listens on `Number(process.env.PORT ?? 10000)`, host `0.0.0.0`, logging one line
`[desmon-server] listening on :<port> store=<pg|memory> sha=<sha>`.

`src/server/app.ts` (T38/T39):

```ts
export interface AppDeps {
  store: Store;
  now: () => number;                       // ms since epoch (injected; tests use a counter)
  randomUUID: () => string;
  randomBytesHex: (bytes: number) => string;
  randomSeed: () => number;                // uint32
}
export const RATE_LIMIT = 60; export const RATE_WINDOW_MS = 60_000; export const PVP_COOLDOWN_MS = 60_000;
export const STOLEN_IDS_MAX = 32; export const BOT_NAME = 'Training Dummy';
export function parseSnapshot(raw: unknown): Snapshot | null;
export function createApp(deps: AppDeps): { handle: ApiHandler };
```
Production wiring in `index.ts`: `createApp({ store, now: Date.now, randomUUID, randomBytesHex: (n) => randomBytes(n).toString('hex'), randomSeed: () => randomBytes(4).readUInt32BE(0) })`.

`src/server/store.ts` (T38) — exactly 9 methods, all async so PgStore and MemoryStore share the interface:

```ts
export interface ScoreKey { bestIndex: number; rebirths: number }
export interface PlayerRow { id: string; name: string; snapshot: Snapshot | null; stolenIds: string[]; lastPvpAt: number | null }
export interface Store {
  createPlayer(p: { id: string; tokenHash: string; name: string }): Promise<void>;
  getByToken(tokenHash: string): Promise<PlayerRow | null>;
  getById(id: string): Promise<PlayerRow | null>;
  putSnapshot(id: string, snapshot: Snapshot): Promise<void>;          // also sets name := snapshot.name, updated_at := now
  setStolenIds(id: string, ids: string[]): Promise<void>;
  setLastPvpAt(id: string, at: number): Promise<void>;
  rank(key: ScoreKey): Promise<number>;                                 // 1 + count(score > key), snapshot rows only
  top(n: number): Promise<PlayerRow[]>;                                 // score DESC, then oldest update first
  neighbor(excludeId: string, key: ScoreKey, dir: 'up' | 'down'): Promise<PlayerRow | null>;
}
export function compareScore(a: ScoreKey, b: ScoreKey): number;       // b.bestIndex - a.bestIndex || b.rebirths - a.rebirths (DESC order)
export class MemoryStore implements Store { /* Map<id, PlayerRow & { tokenHash, seq }>; sort by compareScore then seq */ }
```
MemoryStore is what `npm test` and DB-less local runs use. `neighbor` 'up' = smallest score strictly greater
than `key` (ties → latest `seq`); 'down' = largest score ≤ `key` excluding `excludeId` (ties → earliest `seq`).

`src/server/pgStore.ts` (T40): `PgStore.connect(connectionString): Promise<PgStore>` builds the pool with
`ssl: /\.render\.com$/.test(new URL(connectionString).hostname) ? { rejectUnauthorized: false } : undefined`
(Render's internal URL has a bare host and no TLS; the external one needs TLS), runs the DDL below, and returns
the store. DDL (idempotent, executed on every boot):

```sql
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  nickname text NOT NULL,
  snapshot jsonb,
  best_index integer NOT NULL DEFAULT 0,
  rebirths integer NOT NULL DEFAULT 0,
  stolen_ids jsonb NOT NULL DEFAULT '[]',
  last_pvp_at double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS players_score_idx ON players (best_index DESC, rebirths DESC);
```
Only `players` exists — no `matches`, no history (nothing reads it). int8 caveat avoided by design: node-postgres
returns `bigint`/`count(*)` as strings, so `last_pvp_at` is `double precision` (ms since epoch is exact) and
every count is cast `count(*)::int`. Row mapper: `snapshot`/`stolen_ids` arrive parsed (jsonb), `last_pvp_at`
is a JS number or null. Key queries:

```sql
-- rank
SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND (best_index, rebirths) > ($1, $2);
-- top
SELECT * FROM players WHERE snapshot IS NOT NULL ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT $1;
-- neighbor up
SELECT * FROM players WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) > ($2, $3)
  ORDER BY best_index ASC, rebirths ASC, updated_at DESC LIMIT 1;
-- neighbor down
SELECT * FROM players WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) <= ($2, $3)
  ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT 1;
-- putSnapshot
UPDATE players SET snapshot = $2::jsonb, best_index = $3, rebirths = $4, nickname = $5, updated_at = now() WHERE id = $1;
```
`tests/server/pgStore.test.ts` is a source-contract pin (DDL literals, `double precision`, `::int`, the ssl
regex, pg in devDependencies only, no `@types/pg`, the electron-builder exclusion) — no database in tests.

`src/server/index.ts` boot (after T40): `const url = process.env.DATABASE_URL; const store = url ? await PgStore.connect(url) : (warn(), new MemoryStore());`
then `createApp` → `createRequestListener` → listen.

## 5. PvP resolution

Shared core contract (src/core/collection.ts, T32 — full definition and `companionPower`/roster power in
GAME_DESIGN_V2.md; restated here because the server depends on it byte-for-byte):

```ts
export function resolvePvp(attacker: readonly Companion[], defender: readonly Companion[], rng: Rng):
  { attackerWon: boolean; moved: Companion | null; attackerPower: bigint; defenderPower: bigint };
```
- Pure, deterministic, exactly **two** `rng.next()` draws in this order: (1) win roll —
  `attackerWon = rng.next() < p` with `p = attackerPower / (attackerPower + defenderPower)` (roster powers per
  GAME_DESIGN_V2 §6; both zero → 0.5); (2) steal index — `Math.floor(rng.next() * loser.length)`, drawn even when
  no steal applies so sequences stay stable.
- `moved` = the loser's companion at that index, or null when the loser's roster is empty or the winner's roster
  length ≥ `ROSTER_CAP`. `attackerPower`/`defenderPower` are returned for the client's presentation only — the
  server never puts them on the wire (§2 `PvpResponse`). Core knows nothing about bots.
- Server and client (VICTORY/DEFEAT presentation, T36) never re-run the maths; the response carries the outcome.

Server steps for `POST /v1/pvp` (after auth, rate limit, cooldown check):
1. `me = getByToken(...)`; `me.snapshot` null → 400 `no_snapshot`. `setLastPvpAt(me.id, now())` (even for bots).
2. `seed = randomSeed() >>> 0`; pick the opponent (§3 neighbour rule) or the bot.
3. `verdict = resolvePvp(me.snapshot.companions, opponent.companions, mulberry32(seed))`; `win = verdict.attackerWon`.
4. Bot → respond `{ bot: true, seed, win, opponent: bot, stolen: null, lost: null }`; no store writes beyond step 1.
5. Non-bot, `verdict.moved === null` → respond with `stolen: null, lost: null`; no roster writes.
6. Non-bot steal: `loser/winner` = by `win`; `transferred = { ...verdict.moved, id: 's' + seed }` (companion ids are
   unique per player only — `c<N>` counters — so a transferred companion gets a server id that cannot collide);
   `loser.snapshot.companions = without(verdict.moved.id)`; `winner.snapshot.companions.push(transferred)`;
   `setStolenIds(loser.id, [...loser.stolenIds, verdict.moved.id].slice(-STOLEN_IDS_MAX))`; `putSnapshot(loser)`,
   `putSnapshot(winner)`. Respond `stolen: win ? transferred : null`, `lost: win ? null : verdict.moved`.
7. The attacker applies `stolen`/`lost` immediately (client, §6). The **defender** learns on its next
   `PUT /v1/snapshot`: the server strips ids in `stolenIds` and returns them as `removed`; the client removes them.

## 6. Client networking

Files: `src/shared/serverUrl.ts`, `src/shared/api.ts` (§2), `src/main/identity.ts`, `src/main/net.ts`,
`src/main/ipc.ts` (handlers), `src/preload/index.ts`, `src/renderer/global.d.ts`. Together with §2 this section
is THE normative wire/net design (GAME_DESIGN_V2.md §9/§10 point here). The renderer and menu never
talk HTTP; main does, and only inline (no scheduler/debounce module).

**Server URL and the offline rule.** `src/shared/serverUrl.ts`: `export const SERVER_URL = '';` until T44 rewrites
it to `'https://…'`. Main computes `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);`
— that literal `process.env.SMOKE ? ''` is grep-pinned by T43. `baseUrl === ''` ⇒ the client is OFFLINE: every
method resolves `{ ok: false, error: 'offline' }` and `fetch` is never called (tests assert the fake fetch has
zero calls). So `npm run smoke` and `npm test` never touch the network.

**`src/main/identity.ts`** (T41; electron-free, dir injected like persistence.ts):
```ts
export const IDENTITY_FILE_NAME = 'identity.json';
export interface Identity { name: string; playerId: string | null; token: string | null }
export function defaultName(randomUUID: () => string): string;      // 'Knight-' + first 4 chars of a uuid
export function readIdentity(dir: string, randomUUID: () => string): Identity;   // missing/corrupt → fresh default, never throws
export function writeIdentity(dir: string, identity: Identity): boolean;         // tmp + rename, never throws
export function isValidName(name: unknown): name is string;                      // NICK_RE
```
`userData/identity.json` = `{"name":"Knight-3f9a","playerId":null,"token":null}` before registration. The token
lives ONLY here — never in save.json (parseSave/serializeSave must not know it), never sent to any renderer.

**`src/main/net.ts`** (T42; electron-free, `fetch` injected, `AbortSignal.timeout(NET_TIMEOUT_MS)` with
`NET_TIMEOUT_MS = 5000`, never throws):
```ts
export interface NetClient {
  register(name: string): Promise<NetResult<RegisterResponse>>;
  upload(token: string, snapshot: Snapshot): Promise<NetResult<SnapshotResponse>>;
  leaderboard(token: string | null, n: number): Promise<NetResult<LeaderboardResponse>>;
  pvp(token: string): Promise<NetResult<PvpResponse>>;
}
export function createNetClient(o: { baseUrl: string; fetchFn?: typeof fetch; timeoutMs?: number }): NetClient;
```
Mapping: thrown/aborted fetch → `network`; 401 → `unauthorized`; 429 with `error: 'cooldown'` → `cooldown`
(+`retryAfterSec`); any other non-2xx or unparsable JSON → `server` (+`status`). Headers:
`content-type: application/json`, `authorization: Bearer <token>` when a token is given.

```ts
export interface SnapshotSource { bestIndex: number; rebirths: number; companions: Companion[] }   // SaveFileV2 is assignable
export function toSnapshot(name: string, save: SnapshotSource): Snapshot;
export function createNetSession(deps: { client: NetClient; userDataDir: string; online: boolean; randomUUID: () => string }): {
  identity(): IdentityPayload;
  setName(name: unknown): IdentityPayload;               // invalid → unchanged; valid → written + marks the roster key dirty
  onSave(save: SnapshotSource): void;                    // background upload iff the roster key changed (fire-and-forget; `removed` ignored)
  leaderboard(n: number): Promise<NetResult<LeaderboardResult>>;   // upload if dirty, then GET
  pvp(): Promise<NetResult<PvpResult>>;                   // ALWAYS upload the latest save, then POST
};
```
Session rules: `ensureRegistered()` before any bearer call — no token → `register(identity.name)` → write
identity.json. Roster key = `JSON.stringify([name, rebirths, companions])` (bestIndex alone does NOT trigger a
background upload — kills at the frontier would spam PUTs; it rides along on the next sync moment). A result of
`unauthorized` (free Postgres reset, deleted row) → `writeIdentity({ name, playerId: null, token: null })` →
re-register → retry the call ONCE per session; a second 401 is returned as-is. Sync moments, all inline:
(1) after roster-changing saves (`onSave` from the save-state handler), (2) on menu open (`identity()` re-uploads the
last seen save in the background when dirty — this also warms the sleeping dyno),
(3) before leaderboard (if dirty) and before PvP (always). The game never waits on the network.

**IPC** (T43 adds to `src/shared/ipc.ts`; preload inlines the literals; renderer types in `global.d.ts`):

| Channel | Const | Kind | Payload → Result | Preload method |
|---|---|---|---|---|
| `desmon:get-identity` | `GET_IDENTITY` | renderer → main invoke | none → `IdentityPayload` | `getIdentity()` |
| `desmon:set-name` | `SET_NAME` | invoke | `{ name: string }` (validated in main) → `IdentityPayload` | `setName(name)` |
| `desmon:leaderboard` | `LEADERBOARD` | invoke | `{ n?: number }` → `NetResult<LeaderboardResult>` | `getLeaderboard(n?)` |
| `desmon:pvp` | `PVP` | invoke | none → `NetResult<PvpResult>` | `pvp()` |

Handler wiring in `registerIpcHandlers` (T43): build the session once
(`createNetSession({ client: createNetClient({ baseUrl }), userDataDir: app.getPath('userData'), online: baseUrl !== '', randomUUID })`);
the existing `SAVE_STATE` handler additionally calls `session.onSave(parseSave(data))` after `writeSaveFile`
(the save is untrusted renderer input — parse it, never cast it). Both the game window and the menu window
(T46, same preload) may call the four invokes; in practice only the menu does. Net → game effects (add `stolen`,
remove `lost`/`removed`) flow through the menu as actions over the T45 relay
(`desmon:menu-action` → `desmon:action`, names in GAME_DESIGN_V2.md): T49 sends
`{ type: 'removeCompanions', ids: value.removed }` when a successful `leaderboard()`/`pvp()` result carries
`removed`, then `pvpResult` — main never pushes roster changes to the game window, which keeps T43
independent of the menu chain. Background `onSave` uploads ignore `removed`. The menu window is never opened
under `SMOKE=1`.

## 7. Deploy runbook

**Provisioning** — `bash .harness/v2/loop/render-bootstrap.sh` (written with the loop; contract here):
- Idempotent by name: `render postgres list -o json` → reuse `desmon-db` if present; `render services -o json` →
  reuse `desmon-server` if present; create only what is absent. Safe to rerun after a crash or a BLOCKED retry
  (one free Postgres per workspace, unique service names).
- Preconditions it checks: `render whoami` succeeds; `render workspace set "${RENDER_WORKSPACE:-tea-d0fqcok9c44c73bj1ehg}" --confirm`
  (idempotent one-time CLI state; first done in H07).
- Exact create commands (TOOLING §6):
  `render postgres create --name desmon-db --plan free --region oregon --confirm -o json`;
  `render postgres get <dpg-id> --include-sensitive-connection-info -o json` → internal connection string
  (expected path `.connectionInfo.internalConnectionString`; on a miss the script prints the JSON keys and exits 1 — the first run records the real path in its note);
  `render services create --name desmon-server --type web_service --runtime node --plan free --region oregon --repo https://github.com/mojomoth/desktop-monster --branch main --root-directory . --build-command 'npm ci --include=dev --ignore-scripts && npm run build' --start-command 'npm run start:server' --health-check-path /healthz --env-var DATABASE_URL=<internal-url> --build-filter-path 'src/server/**' --build-filter-path 'src/core/**' --build-filter-path 'src/shared/**' --build-filter-path package.json --build-filter-path package-lock.json --build-filter-path tsconfig.main.json --build-filter-path .node-version --confirm -o json`.
  Both resources in `oregon` so the internal DB URL resolves.
- Output: `KEY=value` lines on stdout, nothing else (eval-able): `SERVER_URL=https://desmon-server.onrender.com`,
  `SRV_ID=srv-…`, `DB_ID=dpg-…`, `DB_CREATED=<ISO from postgres get .createdAt>`, `DB_EXPIRES=<DB_CREATED + 30 days, ISO>`.
  Non-zero exit on any failure; diagnostics on stderr.

**Deploy task (T44) steps**, inside its lane worktree:
1. `bash .harness/v2/loop/render-bootstrap.sh > /tmp/desmon-render.env && . /tmp/desmon-render.env`.
2. Write `export const SERVER_URL = '<SERVER_URL>';` into `src/shared/serverUrl.ts`.
3. AGENTS.md §Server: set the `SERVER_URL=` placeholder line and add, directly below it, `RENDER_SERVICE_ID=`,
   `RENDER_POSTGRES_ID=`, `DB_CREATED=`, `DB_EXPIRES=`, `DEPLOYED_SHA=` lines (stage 3 copies `server_url`/`db_expires`
   into meta.json and the handoff from here). README: "Server / Leaderboard & PvP" section.
4. Gates; commit `feat(T44): …`.
5. `git push origin HEAD:main` — exactly one push, after the commit and gates (Notes `push: yes`; the only sanctioned
   pushes inside the loop are this one and T51's; Render builds `main`).
   The lane tip descends from `origin/main`, so this is a fast-forward; the orchestrator merges the lane later.
6. `render deploys create "$SRV_ID" --wait --confirm` (webhooks are not guaranteed on the public repo without the GitHub app).
7. `curl -sf "$SERVER_URL/healthz"` → `"ok":true` and `sha` satisfying the deploy verification rule below (a fresh
   deploy of the pushed commit reports that commit); then the probe.
8. Set `DEPLOYED_SHA=` to that sha (fixup commit — touches no build-filter path).

**Probe** (`src/server/probe.ts` → `node dist/electron/server/probe.js <url>`): register `probe-<4hex>` →
`upload({ name, bestIndex: 0, rebirths: 0, companions: [] })` (ranks last) → `leaderboard(token, 10)` assert
`me.rank ≥ 1` → print `{ "playerId", "rank" }` → exit 0/1. The probe **never plays PvP** (a verification command
must not mutate real players' rosters); PvP correctness is proven hermetically by tests/server/pvp.test.ts.

**Deploy verification rule** (T51 AC, validator, desmon-3-eval, handoff — the one rule, everywhere): `curl /healthz`
ok AND `git merge-base --is-ancestor <sha> HEAD`
AND `git log <sha>..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version`
is empty (no commit after the deployed one touched a build-filter path). No equality check against HEAD or against
the last filter-path commit — the live sha may legitimately be older than either. Otherwise redeploy: push +
`render deploys create --wait`.

**Rotation after the free Postgres expires** (30 days after `DB_CREATED`, 14-day grace, no backups): create a new
instance (`render postgres create …` — the bootstrap does it once the old `desmon-db` is deleted from the
dashboard), then set the new `DATABASE_URL` either in the Render dashboard or by recreating the service under the
SAME name (`render services create … --env-var DATABASE_URL=<new>`; the URL is name-derived so `SERVER_URL` stays
valid) — `render services update` has NO `--env-var` in CLI 2.26.0. Then `render deploys create --wait`. Clients
hit 401 and re-register (identity loss is by design). DDL is idempotent, so the new DB needs no migration step.

## 8. Known limitations (copy into handoff.md §Deployment / §Known limitations)

- **Accept-and-rank**: leaderboard and PvP inputs are self-reported; "server-authoritative" covers the verdict and
  roster bookkeeping only. A one-line client edit wins every match. Bounded by rate limit, body cap, cooldown.
- Free web service sleeps after 15 min idle; cold start ≈ 1 min exceeds `NET_TIMEOUT_MS` (5 s) — the first
  leaderboard/PvP click after a long idle may fail with `network`; opening the menu warms the dyno; retry works.
  750 h/month cap.
- Free Postgres expires 30 days after creation (14-day grace), no backups: identities and the board are
  disposable; rotation is manual (§7). Expiry date recorded in AGENTS.md §Server / meta.json `db_expires`.
- Single instance: in-memory rate limiter resets on restart; steal is two non-transactional row updates.
- Defenders learn about a stolen companion only on their next upload (§5 step 7); until then the local roster
  keeps a ghost companion that still attacks locally but is absent from the server snapshot.
- Background uploads ignore `removed`; the correction arrives on the next menu-driven sync.
- Bot matches ("Training Dummy") never steal either way; a player alone on the board can only fight the bot.
- Probe accounts (`probe-*`, bestIndex 0) accumulate at the bottom of the board, one per network AC run.
- No nickname uniqueness, no moderation, no token rotation, no CORS (Electron main is the only client).

## 9. Conflicts with v1 pins — EXTEND, never weaken

| Pin | Where | Rule for the task that touches it |
|---|---|---|
| `expect(IPC).toEqual({...})` (T43, T45) | tests/ipc.test.ts | Add the new keys to the literal object (`GET_IDENTITY`, `SET_NAME`, `LEADERBOARD`, `PVP`; menu chain adds its four). The list grows; nothing is removed. |
| `it.each([...])` preload method list (T43, T45) | tests/ipc.test.ts | Append `getIdentity`, `setName`, `getLeaderboard`, `pvp` (menu chain: its methods). |
| `ipcMain.handle(IPC.%s)` it.each (T43) | tests/ipc.test.ts | Append `GET_IDENTITY`, `SET_NAME`, `LEADERBOARD`, `PVP`. |
| `toContain('registerIpcHandlers()')` (T22) | tests/ipc.test.ts ↔ src/main/index.ts | Keep the bare `registerIpcHandlers()` call in the non-smoke branch verbatim (T22 edits index.ts only for SMOKE userData isolation). |
| preload literal sync test | tests/ipc.test.ts | Every new channel string is inlined in src/preload/index.ts (`'desmon:get-identity'` …); preload still value-imports only `electron`. |
| preload-method regex `^ {2}(\w+):` ↔ global.d.ts (T43, T45) | tests/renderer.test.ts | Declare each new preload property at 2-space indent as `  name:` and add `name(` to `src/renderer/global.d.ts`. `methods.length >= 8` keeps holding. |
| tray menu order `toEqual([...])` (T46) | tests/tray.test.ts | Insert the new `Collection & Battle…` label between the separator and `RESET_LABEL`; the ordered list grows. |
| `build.files` contains `dist/**/*` (T22) | tests/packaging.test.ts | Append `!dist/electron/server/**` to the array; both existing globs stay. T40's pgStore.test.ts pins the exclusion. |
| README literals (T44, T50) | tests/packaging.test.ts | Add sections only; every pinned string (artifact names, Open Anyway, save path…) stays. |
| AGENTS.md hard rule "no network in tests" | AGENTS.md | Unchanged: `npm test` opens no sockets (http adapter tests use injected streams). Loopback `127.0.0.1` checks are allowed in a builder/feature AC ONLY for the server-scaffold boot proof (T22 / F43, port 47831); external hostnames, `render` and `npm install` only in the deploy tasks (T44/T51), whose ACs are the only external-network ACs and are guarded by `DESMON_SKIP_NET`. |

Validator (stage 3) checks that every extended list strictly grew (`rgt blame` on shrunken `it(` counts).

## 10. Tasks — baseline for the Planner (append verbatim in plan grammar v2; ids/titles are fixed)

Cross-chain ids referenced here: T24 (SaveFileV2 + `parseSave` V1|V2), T27 (`ROSTER_CAP`, src/core/collection.ts),
T32 (`resolvePvp`), T45 (menu IPC relay), T49 (menu ranking + battle tabs), T50 (version 0.2.0 + tray title +
README + SPEC appendix). Their blocks live in GAME_DESIGN_V2.md. Deps point backward only; Files are COMPLETE (tests included) because overlap drives lane scheduling.

### [ ] T22 — Server scaffold: node:http adapter, healthz, dist/electron/server build wiring
- AC: `npx vitest run tests/server/http.test.ts && grep -q 'rejects bodies over 65536 bytes with 413 payload_too_large' tests/server/http.test.ts && grep -q 'rejects malformed JSON with 400 bad_request' tests/server/http.test.ts && grep -q 'takes the client ip from the first x-forwarded-for entry' tests/server/http.test.ts && grep -q '"src/server"' tsconfig.main.json && test "$(cat .node-version)" = 20.12.2 && node -e "const p=require('./package.json');process.exit(p.scripts['start:server']==='node dist/electron/server/index.js'&&p.build.files.includes('!dist/electron/server/**')&&p.build.files.includes('dist/**/*')?0:1)" && grep -q 'RENDER_GIT_COMMIT' src/server/http.ts && grep -q 'x-forwarded-for' src/server/http.ts && npm run build && test -f dist/electron/server/index.js && (PORT=47831 node dist/electron/server/index.js & P=$!; R=1; for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -sf http://127.0.0.1:47831/healthz | grep -q '"ok":true' && R=0 && break; done; kill $P; exit $R) && grep -q "desmon-smoke-" src/main/index.ts` → exit 0
- Deps: none
- Worker: claude
- Files: src/server/index.ts, src/server/http.ts, tsconfig.main.json, package.json, .node-version, tests/server/http.test.ts, src/main/index.ts, tests/window.test.ts
- Notes: SERVER_ARCHITECTURE §1/§3/§4. FIRST new task; 8 files by design (T01-style exception: build wiring must land in one iteration). SMOKE isolation (src/main/index.ts): when `process.env.SMOKE` is set, `app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "desmon-smoke-")))` BEFORE `app.requestSingleInstanceLock()` so concurrent smokes (lanes + orchestrator) never collide on the single-instance lock and never touch the real save file; keep the bare `registerIpcHandlers()` literal in the non-smoke branch (tests/ipc.test.ts pin). tests/window.test.ts: EXTEND the `accessory lifecycle` describe with one source pin that the `desmon-smoke-` mkdtemp `setPath('userData', …)` appears before `requestSingleInstanceLock()` (the `it(` count grows). http.ts: `ApiRequest`/`ApiResponse`/`ApiHandler`, `BODY_LIMIT = 65_536`, `clientIp(headers, remoteAddress)` = first `x-forwarded-for` entry else socket address, `createRequestListener(handle)` answering `GET /healthz` itself with `{ ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' }` (key order ok → sha, never touching any store), 413 + `req.destroy()` over the cap, 400 `bad_request` on bad JSON, `application/json` everywhere. index.ts: stub handler `async () => ({ status: 404, body: { error: 'not_found' } })` (T38 swaps in createApp), `PORT` default 10000, host `0.0.0.0`, one boot log line. tsconfig.main.json `include` += "src/server". package.json: `scripts["start:server"] = "node dist/electron/server/index.js"` (the only new script name); `build.files` += `"!dist/electron/server/**"` (keep `dist/**/*` and `static/**/*` — tests/packaging.test.ts pins them). `.node-version` = `20.12.2`. Tests: `PassThrough` requests with `method/url/headers/socket` + a recording response — NO sockets; the loopback `127.0.0.1` boot in the AC (port 47831, 10×0.5 s retry) is the runtime proof — the ONLY loopback check allowed in a builder AC (F43). Title must keep the word `server`.

### [ ] T38 — Store interface + MemoryStore + createApp register/upload/leaderboard
- AC: `npx vitest run tests/server/app.test.ts && npm run typecheck && grep -q 'register then upload then leaderboard ranks by bestIndex then rebirths and reports own rank' tests/server/app.test.ts && grep -q 'upload strips companions listed in stolenIds and returns their ids as removed' tests/server/app.test.ts && grep -q 'returns 429 rate_limited on the 61st request within one minute for the same key' tests/server/app.test.ts && grep -q 'rejects bad nickname, over-cap companions and out-of-range ints with 400' tests/server/app.test.ts && grep -q 'missing or unknown bearer token yields 401 unauthorized' tests/server/app.test.ts && grep -q 'createApp' src/server/index.ts && grep -q 'ROSTER_CAP' src/server/app.ts && grep -q 'RATE_LIMIT = 60' src/server/app.ts` → exit 0
- Deps: T22, T27, T41
- Worker: claude
- Files: src/server/store.ts, src/server/app.ts, src/server/index.ts, tests/server/app.test.ts
- Notes: SERVER_ARCHITECTURE §2–§4. store.ts: the FULL 9-method `Store` interface (createPlayer, getByToken, getById, putSnapshot, setStolenIds, setLastPvpAt, rank, top, neighbor — including `neighbor`, so T39 touches app.ts only), `ScoreKey`, `PlayerRow`, `compareScore`, `MemoryStore` (Map + insertion `seq`; up = smallest strictly-greater score, down = largest ≤ score excluding me). app.ts: `AppDeps { store, now, randomUUID, randomBytesHex, randomSeed }`, `parseSnapshot` (caps of §2: `NICK_RE` from src/shared/api.ts, `ROSTER_CAP` from src/core/collection.ts, `SPECIES_IDS` from src/core/monsters.ts, level 1..10, ints 0..INT_MAX, unique ids), sha256 token hashing via node:crypto, routes `POST /v1/players` (201), `PUT /v1/snapshot` (strip stolenIds → `removed`), `GET /v1/leaderboard?n=` (clamp 1..50, `me` null without/before), 404 fallthrough, 500 `internal` guard (handle never throws), fixed-window rate limit `RATE_LIMIT = 60` / `RATE_WINDOW_MS = 60_000` keyed by token hash else `ip:<ip>`, pruned above 10 000 keys. `POST /v1/pvp` is T39 (leave a 404 until then). index.ts: `createApp({ store: new MemoryStore(), now: Date.now, randomUUID, randomBytesHex, randomSeed })` replaces the T22 stub. Tests call `handle()` directly with MemoryStore, a counter `now`, and a `mulberry32`-driven id/seed source; every rule in §3 gets one test (tie ranks, `me` null, removed idempotence, x-forwarded-for key isolation).

### [ ] T39 — POST /v1/pvp: neighbour pick, core resolvePvp, steal bookkeeping, cooldown, bot
- AC: `npx vitest run tests/server/pvp.test.ts && grep -q 'picks the rank neighbour above or below by seed parity' tests/server/pvp.test.ts && grep -q 'alone on the server yields the Training Dummy bot and no steal' tests/server/pvp.test.ts && grep -q 'winner gains the stolen companion under a fresh id and the loser stolenIds grows' tests/server/pvp.test.ts && grep -q 'winner with a full roster steals nothing' tests/server/pvp.test.ts && grep -q 'second pvp inside PVP_COOLDOWN_MS returns 429 cooldown with retryAfterSec' tests/server/pvp.test.ts && grep -q 'verdict equals core resolvePvp with mulberry32(seed)' tests/server/pvp.test.ts && grep -q 'pvp without an uploaded snapshot returns 400 no_snapshot' tests/server/pvp.test.ts && grep -q 'resolvePvp' src/server/app.ts && grep -q 'PVP_COOLDOWN_MS = 60_000' src/server/app.ts && grep -q "BOT_NAME = 'Training Dummy'" src/server/app.ts` → exit 0
- Deps: T38, T32
- Worker: claude
- Files: src/server/app.ts, tests/server/pvp.test.ts
- Notes: SERVER_ARCHITECTURE §3 rules + §5 steps 1–7, implemented exactly in that order. Import `resolvePvp` and `mulberry32` from src/core (never re-implement the maths; `CRIT_*` are NOT involved); use its return fields as exported by T32 — `win = verdict.attackerWon`, transferred companion = `verdict.moved` (`attackerPower`/`defenderPower` stay server-side, never on the wire). Opponent: `neighbor(me,'up')`/`'down'`, both → `seed & 1 ? down : up`, one → it, none → bot `{ name: BOT_NAME, bestIndex: me.bestIndex, rebirths: me.rebirths, companions: [] }` with `bot: true` and no roster writes. `setLastPvpAt(me, now())` before resolving (bots included); inside `PVP_COOLDOWN_MS` → 429 `cooldown` + `retryAfterSec`. Steal: transferred companion re-id'd to `'s' + seed`; loser `stolenIds` gets the ORIGINAL id, `.slice(-32)`; `putSnapshot` both; `verdict.moved` (and so the response's `stolen`/`lost`) is null when the loser is empty or the winner's STORED roster has `ROSTER_CAP` (add a `ponytail:` comment on the non-transactional two-row update naming BEGIN/COMMIT as the upgrade). Body ignored. Tests: seeded MemoryStore with 3 players, counter clock, both parities, steal in both directions (attacker wins / attacker loses → `lost`), `removed` on the loser's next upload, cooldown boundary (`elapsed === PVP_COOLDOWN_MS` allowed).

### [ ] T40 — PgStore + pg 8.23.0 devDependency + pg.d.ts + idempotent DDL + DATABASE_URL switch
- AC: `npx vitest run tests/server/pgStore.test.ts && npm run typecheck && npm run lint && node -e "const p=require('./package.json');process.exit(p.devDependencies.pg==='8.23.0'&&!(p.dependencies||{}).pg&&!p.devDependencies['@types/pg']?0:1)" && test -d node_modules/pg && grep -q 'CREATE TABLE IF NOT EXISTS players' src/server/pgStore.ts && grep -q 'CREATE INDEX IF NOT EXISTS players_score_idx' src/server/pgStore.ts && grep -q 'last_pvp_at double precision' src/server/pgStore.ts && grep -q 'count(\*)::int' src/server/pgStore.ts && ! grep -q 'CREATE TABLE IF NOT EXISTS matches' src/server/pgStore.ts && grep -q "declare module 'pg'" src/server/pg.d.ts && grep -q 'DATABASE_URL' src/server/index.ts && grep -q 'MemoryStore' src/server/index.ts` → exit 0
- Deps: T38
- Worker: claude
- Files: src/server/pgStore.ts, src/server/pg.d.ts, src/server/index.ts, package.json, package-lock.json, tests/server/pgStore.test.ts
- Notes: SERVER_ARCHITECTURE §1 (pg placement, pg.d.ts verbatim) + §4 (DDL, queries, ssl rule, int8 avoidance). `npm install --save-dev --save-exact pg@8.23.0` — node_modules is a SYMLINK to the main checkout, so the install lands in the shared tree (additive, harmless); commit package.json + package-lock.json. New-dependency justification for the Notes (PONYTAIL §4, pre-approved): rung 5 fails — no stdlib Postgres client. `PgStore.connect(url)` → pool (`ssl` only when the hostname ends with `.render.com`) → DDL → store; row mapper coerces nothing except trusting `double precision` → number and `::int` counts. index.ts: `DATABASE_URL` set → `await PgStore.connect(url)`, else `MemoryStore` + the one warning line of §1; boot log shows `store=pg|memory`. Tests are SOURCE PINS only (read pgStore.ts/pg.d.ts/package.json): DDL literals, `double precision`, `::int`, ssl regex, no matches table, pg not in dependencies, no `@types/pg`, `!dist/electron/server/**` in build.files. Never open a real connection in tests.

### [ ] T41 — identity.json in userData + shared wire types + SERVER_URL constant
- AC: `npx vitest run tests/identity.test.ts && grep -q 'export const SERVER_URL' src/shared/serverUrl.ts && grep -q 'identity.json' src/main/identity.ts && grep -q 'creates a Knight-xxxx identity with no credentials when identity.json is missing' tests/identity.test.ts && grep -q 'round-trips playerId and token through identity.json' tests/identity.test.ts && grep -q 'rejects names longer than 16 or with characters outside the nickname rule' tests/identity.test.ts && grep -q 'never throws on corrupt identity.json' tests/identity.test.ts && grep -q 'NICK_RE' src/shared/api.ts && grep -q 'LEADERBOARD_MAX = 50' src/shared/api.ts && ! grep -q "from '../core" src/shared/api.ts && ! grep -q token src/core/save.ts` → exit 0
- Deps: none
- Worker: claude
- Files: src/main/identity.ts, src/shared/api.ts, src/shared/serverUrl.ts, tests/identity.test.ts
- Notes: SERVER_ARCHITECTURE §2 (api.ts verbatim: Companion/Snapshot/LeaderboardRow/responses/NetResult/IdentityPayload/LeaderboardResult/PvpResult + NICK_RE, COMPANION_ID_RE, LEVEL_MIN/MAX, INT_MAX, LEADERBOARD_DEFAULT/MAX; NO import from src/core — structural twin of core's Companion) + §6 identity.ts (electron-free, dir + randomUUID injected, persistence.ts pattern: `defaultName`, `readIdentity` never throws → fresh `{ name: 'Knight-xxxx', playerId: null, token: null }`, `writeIdentity` tmp + rename, `isValidName` via NICK_RE). serverUrl.ts is exactly `export const SERVER_URL = '';` (T44 rewrites the value; ACs grep only the declaration). Identity never enters save.json (the AC greps that src/core/save.ts contains no `token`) or any IPC payload except `{ name, playerId, online }`. Tests use a tmp dir (`mkdtempSync`) like tests/persistence.test.ts and a counter uuid.

### [ ] T42 — Main net client + net session (injected fetch, 5 s timeout, never throws, 401 re-register)
- AC: `npx vitest run tests/net.test.ts && grep -q 'returns ok:false offline and never calls fetch when baseUrl is empty' tests/net.test.ts && grep -q 'sends Authorization Bearer and a JSON body' tests/net.test.ts && grep -q 'maps HTTP 401 to unauthorized, 429 cooldown to cooldown and a thrown fetch to network' tests/net.test.ts && grep -q 'session registers once then uploads only when the roster key changes' tests/net.test.ts && grep -q 'session drops credentials and re-registers once on unauthorized' tests/net.test.ts && grep -q 'pvp uploads the latest snapshot before posting' tests/net.test.ts && grep -q 'AbortSignal.timeout' src/main/net.ts && grep -q 'NET_TIMEOUT_MS = 5000' src/main/net.ts && ! grep -q "from 'electron'" src/main/net.ts` → exit 0
- Deps: T41
- Worker: claude
- Files: src/main/net.ts, tests/net.test.ts
- Notes: SERVER_ARCHITECTURE §6 verbatim: `createNetClient({ baseUrl, fetchFn = fetch, timeoutMs = NET_TIMEOUT_MS })` with register/upload/leaderboard/pvp, `signal: AbortSignal.timeout(timeoutMs)`, error mapping offline/unauthorized/cooldown/server/network, never throws (wrap fetch + JSON parse). `toSnapshot(name, save)` over the structural `SnapshotSource` (SaveFileV2 assignable; no core import needed). `createNetSession({ client, userDataDir, online, randomUUID })`: identity()/setName()/onSave()/leaderboard()/pvp(); ensureRegistered before bearer calls; roster key = name + rebirths + companions (bestIndex alone never triggers a background upload); pvp ALWAYS uploads first; leaderboard uploads if dirty; unauthorized → clear credentials (keep name) → re-register → retry once per session. Tests: fake fetch recording calls/headers/bodies + tmp userData dir; assert the fake fetch has ZERO calls when `baseUrl === ''`.

### [ ] T43 — Net IPC: get-identity / set-name / leaderboard / pvp handlers, preload, global.d.ts, SMOKE offline pin
- AC: `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "process.env.SMOKE ? ''" src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.GET_IDENTITY' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.SET_NAME' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.LEADERBOARD' src/main/ipc.ts && grep -q 'ipcMain.handle(IPC.PVP' src/main/ipc.ts && grep -q "'desmon:leaderboard'" src/preload/index.ts && grep -q 'parseSave' src/main/ipc.ts && grep -q 'registerIpcHandlers()' src/main/index.ts && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T42, T24
- Worker: claude
- Files: src/shared/ipc.ts, src/main/ipc.ts, src/preload/index.ts, src/renderer/global.d.ts, tests/ipc.test.ts
- Notes: SERVER_ARCHITECTURE §6 IPC table + §9 pins. ipc.ts (shared): `GET_IDENTITY: 'desmon:get-identity'`, `SET_NAME: 'desmon:set-name'`, `LEADERBOARD: 'desmon:leaderboard'`, `PVP: 'desmon:pvp'` + `SetNamePayload { name }`, `LeaderboardQueryPayload { n?: number }` (type-only imports from src/shared/api.ts are fine; shared stays core-free). main/ipc.ts: `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL);` (literal pinned), one `createNetSession(...)` inside `registerIpcHandlers`, four `ipcMain.handle` calls validating payload types (`typeof name === 'string'`, finite `n`), and `session.onSave(parseSave(data))` appended to the existing SAVE_STATE handler (core `parseSave` accepts V1|V2 after T24). Preload: `getIdentity`, `setName`, `getLeaderboard`, `pvp` as `  name:` properties (2-space indent — tests/renderer.test.ts regex), channel literals inlined, still value-imports only `electron`. global.d.ts mirrors them (`name(`). tests/ipc.test.ts: EXTEND the `toEqual` IPC table, the preload `it.each` list and the `ipcMain.handle` list; keep the `registerIpcHandlers()` literal in src/main/index.ts (do not touch index.ts; T22 already isolates SMOKE userData). Handlers return `NetResult<LeaderboardResult>`/`NetResult<PvpResult>` as-is: main NEVER pushes roster changes to the game window — `removed` is forwarded by the MENU (T49: `sendAction({ type: 'removeCompanions', ids: value.removed })` before `pvpResult`), and background `onSave` uploads ignore `removed`. Smoke must still print SMOKE_OK with zero fetch calls.

### [ ] T44 — Render deploy: provision, bake SERVER_URL, push, deploy, healthz + probe, README
- AC: `grep -q "SERVER_URL = 'https://" src/shared/serverUrl.ts && grep -q '^SERVER_URL=https://' AGENTS.md && grep -q '^DB_EXPIRES=' AGENTS.md && grep -q '^DEPLOYED_SHA=' AGENTS.md && grep -q 'start:server' README.md && grep -q 'Leaderboard' README.md && grep -q 'self-reported' README.md && npm run build && test -f dist/electron/server/probe.js && ([ -n "$DESMON_SKIP_NET" ] || (URL=$(node -e "process.stdout.write(require('./dist/electron/shared/serverUrl.js').SERVER_URL)") && curl -sf "$URL/healthz" | grep -q '"ok":true' && node dist/electron/server/probe.js "$URL"))` → exit 0
- Deps: T39, T40, T43
- Worker: claude
- Files: src/shared/serverUrl.ts, src/server/probe.ts, AGENTS.md, README.md
- Notes: push: yes. SERVER_ARCHITECTURE §7 step by step; TOOLING §6 for CLI facts. Preconditions: `render whoami` works and the workspace was set in H07 — if the CLI is not logged in, BLOCKED with the command output as evidence (do not retry `services create` blindly; the bootstrap is idempotent by name, so reruns are safe). Sequence: `bash .harness/v2/loop/render-bootstrap.sh > /tmp/desmon-render.env && . /tmp/desmon-render.env` → write `export const SERVER_URL = '<SERVER_URL>';` → AGENTS.md §Server lines (`SERVER_URL=`, `RENDER_SERVICE_ID=`, `RENDER_POSTGRES_ID=`, `DB_CREATED=`, `DB_EXPIRES=`, `DEPLOYED_SHA=`) → README section "Server / Leaderboard & PvP" (local run `npm run start:server`, auto nickname `Knight-xxxx`, `DESMON_SERVER_URL` override, free-tier sleep/expiry caveats, the word `self-reported` for accept-and-rank) → gates → commit → `git push origin HEAD:main` (`push: yes` = exactly this one push, after the commit and gates; never merge or checkout main) → `render deploys create "$SRV_ID" --wait --confirm` → healthz → probe → set `DEPLOYED_SHA=` (fixup commit). probe.ts reuses `createNetClient` from src/main/net.ts: register `probe-<4hex>` → upload bestIndex 0 / empty roster → leaderboard (`me.rank ≥ 1`) → print JSON; it NEVER calls pvp. Record SERVER_URL, SRV_ID, DB_ID, DB_EXPIRES and the deployed sha in the JSON `note` (stage 3 copies them to meta.json). The validator reruns this AC once with network; `DESMON_SKIP_NET=1` keeps it green offline.

### [ ] T51 — Deploy re-verify: redeploy HEAD and prove the live sha covers every build-filter path
- AC: `npm run build && ([ -n "$DESMON_SKIP_NET" ] || (URL=$(node -e "process.stdout.write(require('./dist/electron/shared/serverUrl.js').SERVER_URL)") && SHA=$(curl -sf "$URL/healthz" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).sha") && git merge-base --is-ancestor "$SHA" HEAD && [ -z "$(git log "$SHA"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" ] && node dist/electron/server/probe.js "$URL"))` → exit 0
- Deps: T32, T44, T49, T50
- Worker: claude
- Files: AGENTS.md
- Notes: push: yes (= exactly one `git push origin HEAD:main`, after the gates; T51's only commit — the `DEPLOYED_SHA=` update — necessarily follows the deploy and is merged by the orchestrator, not pushed by T51). SERVER_ARCHITECTURE §7 "Deploy verification rule" (`curl /healthz` ok AND `git merge-base --is-ancestor <sha> HEAD` AND the filter-path `git log <sha>..HEAD` empty — no equality check). Every chain that touches a build-filter path (core bigint/collection/resolvePvp, shared ipc/api, server, and T50's package.json/package-lock.json version bump) is done by now; Render only rebuilt on the T44 push. Steps: read `RENDER_SERVICE_ID=` from AGENTS.md → gates → `git push origin HEAD:main` (the single push; fast-forward — the lane tip descends from origin/main and carries nothing of T51's yet) → `render deploys create "$SRV_ID" --wait --confirm` → run the AC → update `DEPLOYED_SHA=` in AGENTS.md → commit (touches no filter path, so the AC stays true after collect's `--no-ff` merge: history simplification drops the TREESAME merge commit; this commit is merged by the orchestrator and pushed by stage 3, never by T51). If healthz `sha` is not an ancestor of HEAD or a later commit touched a filter path, the deploy did not take — check `render deploys list` / `render logs` and redeploy; BLOCKED only if Render itself refuses (evidence in note). Also confirm `DB_EXPIRES` is in the future and note the days remaining for the handoff.
