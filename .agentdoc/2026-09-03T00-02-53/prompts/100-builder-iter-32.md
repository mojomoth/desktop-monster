# Lane T39 — Builder (iteration 32)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T39
"Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T39 (branch `lane/T39`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T39. The main checkout (two directories up) is off
  limits. Never run `git push`, `git checkout main`, `git worktree`,
  `git merge`, `git rebase`.
- Never edit `IMPLEMENTATION_PLAN.md`; never edit `SPEC.md` unless it is in
  your task's `Files:`. The orchestrator writes the plan from your JSON report.
- One task only. Do not read the whole plan — your block is below; the open
  headings are context.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/v2/agents/20-builder.md` — your charter; its hard rules bind you.
3. Your task block and the SPEC rows below.
4. `.harness/v2/reference/GAME_DESIGN_V2.md`, `SERVER_ARCHITECTURE.md`,
   `GAME_ARCHITECTURE.md` — ONLY the sections your task cites.
5. Any file in `.agentdoc/2026-09-03T00-02-53/sessions/` whose name or text mentions
   T39 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
- AC: `npx vitest run tests/server/app.test.ts && npm run typecheck && grep -q 'register then upload then leaderboard ranks by bestIndex then rebirths and reports own rank' tests/server/app.test.ts && grep -q 'upload strips companions listed in stolenIds and returns their ids as removed' tests/server/app.test.ts && grep -q 'returns 429 rate_limited on the 61st request within one minute for the same key' tests/server/app.test.ts && grep -q 'rejects bad nickname, over-cap companions and out-of-range ints with 400' tests/server/app.test.ts && grep -q 'missing or unknown bearer token yields 401 unauthorized' tests/server/app.test.ts && grep -q 'leaderboard clamps n to 1..50, shares ranks on ties and returns me null before the first upload' tests/server/app.test.ts && grep -q 'unknown routes yield 404 not_found and a throwing store yields 500 internal' tests/server/app.test.ts && grep -q 'createApp' src/server/index.ts && grep -q 'ROSTER_CAP' src/server/app.ts && grep -q 'RATE_LIMIT = 60' src/server/app.ts && ! grep -q "Date.now(" src/server/app.ts` → exit 0
- Deps: T22, T27, T38
- Worker: claude
- Files: src/server/store.ts, src/server/app.ts, src/server/index.ts, tests/server/app.test.ts
- Notes: SPEC F44 + `## Server / API` rows players, snapshot, leaderboard, rate limit, unauthorized, not-found/internal (Assumptions 33/35/39/41); SERVER_ARCHITECTURE §2–§4. store.ts: the FULL 9-method `Store` (createPlayer, getByToken, getById, putSnapshot, setStolenIds, setLastPvpAt, rank, top, neighbor — `neighbor` included so T40 touches app.ts only), `ScoreKey`, `PlayerRow`, `compareScore` (`b.bestIndex - a.bestIndex || b.rebirths - a.rebirths`), `MemoryStore` (Map + insertion `seq`; `top` = score DESC then oldest first; `neighbor` up = smallest strictly-greater score (ties → latest seq), down = largest ≤ score excluding me (ties → earliest seq); `rank` = 1 + count(score > key) over snapshot rows only). app.ts: `AppDeps { store, now, randomUUID, randomBytesHex, randomSeed }`, `RATE_LIMIT = 60`, `RATE_WINDOW_MS = 60_000`, `STOLEN_IDS_MAX = 32`, `parseSnapshot(raw): Snapshot | null` (never throws; caps of §2: `NICK_RE`/`COMPANION_ID_RE`/`LEVEL_MIN`/`LEVEL_MAX`/`INT_MAX`/`LEADERBOARD_DEFAULT`/`LEADERBOARD_MAX` from src/shared/api.ts, `ROSTER_CAP` from src/core (collection.ts via the barrel), `SPECIES_IDS` from src/core; unique ids; unknown extra fields dropped), token = `randomBytesHex(16)` stored as sha256 hex (`node:crypto` createHash), `playerId = randomUUID()`; routes `POST /v1/players` (201 `{ playerId, token }`, bad name → 400), `PUT /v1/snapshot` (validate → strip ids in the caller's `stolenIds` → putSnapshot (name := snapshot.name) → `{ rank, removed }`, idempotent), `GET /v1/leaderboard?n=` (clamp 1..50, default 10; `me` null without bearer or before the first upload; bearer present-but-unknown → 401), 404 `not_found` fallthrough, 500 `internal` guard (`handle()` never throws — wrap the store), fixed-window rate limit keyed by `sha256(bearer)` else `ip:<ip>` (Map pruned above 10 000 keys, 429 `rate_limited` + `retryAfterSec`). `POST /v1/pvp` stays 404 until T40. index.ts: `createApp({ store: new MemoryStore(), now: Date.now, randomUUID, randomBytesHex: (n) => randomBytes(n).toString('hex'), randomSeed: () => randomBytes(4).readUInt32BE(0) })` replaces the T22 stub — `Date.now` is wired in index.ts ONLY. SOURCE GUARD: `! grep -q "Date.now(" src/server/app.ts` — never write that literal in app.ts, comments included; `now()` is injected. Server imports from src/core and src/shared/api.ts only — never `electron`, `src/main`, `src/renderer`. Tests call `handle()` directly with `MemoryStore`, a counter `now` and a `mulberry32`-driven id/seed source; titles verbatim: "register then upload then leaderboard ranks by bestIndex then rebirths and reports own rank", "upload strips companions listed in stolenIds and returns their ids as removed", "returns 429 rate_limited on the 61st request within one minute for the same key", "rejects bad nickname, over-cap companions and out-of-range ints with 400", "missing or unknown bearer token yields 401 unauthorized", "leaderboard clamps n to 1..50, shares ranks on ties and returns me null before the first upload", "unknown routes yield 404 not_found and a throwing store yields 500 internal"; also cover removed idempotence and x-forwarded-for key isolation. No sockets, no DB, no wall clock.

Open task headings (context only — do NOT work on them):

### [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [ ] T45 — Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync
### [ ] T46 — Menu window + tray item "Collection & Battle…"
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F44 | Server players/snapshot/leaderboard | `src/server/store.ts`: the full 9-method `Store` (createPlayer, getByToken, getById, putSnapshot, setStolenIds, setLastPvpAt, rank, top, neighbor), `ScoreKey`, `PlayerRow`, `compareScore`, `MemoryStore` (Map + insertion seq; up = smallest strictly-greater score, down = largest ≤ score excluding me); `src/server/app.ts`: `AppDeps { store, now, randomUUID, randomBytesHex, randomSeed }`, `RATE_LIMIT = 60`, `RATE_WINDOW_MS = 60_000`, `parseSnapshot` (SERVER_ARCHITECTURE §2 caps: `NICK_RE`, `ROSTER_CAP` from core, `SPECIES_IDS`, level 1..10, ints 0..INT_MAX, unique ids; unknown fields dropped; null on any violation), sha256 token hashing, routes `POST /v1/players` (201 `{ playerId, token }`), `PUT /v1/snapshot` (strip caller's `stolenIds` → `{ rank, removed }`, idempotent), `GET /v1/leaderboard?n=` (clamp 1..50, default 10, `me` null without bearer or before first upload; bearer present-but-unknown → 401), 404 `not_found` fallthrough, 500 `internal` guard (`handle()` never throws), fixed-window rate limit keyed by token hash else `ip:<ip>` (pruned above 10 000 keys); `index.ts` swaps in `createApp` with `MemoryStore`; tests call `handle()` directly with `MemoryStore`, a counter `now` and a seeded id source | claude | `npx vitest run tests/server/app.test.ts && npm run typecheck && grep -q 'register then upload then leaderboard ranks by bestIndex then rebirths and reports own rank' tests/server/app.test.ts && grep -q 'upload strips companions listed in stolenIds and returns their ids as removed' tests/server/app.test.ts && grep -q 'returns 429 rate_limited on the 61st request within one minute for the same key' tests/server/app.test.ts && grep -q 'rejects bad nickname, over-cap companions and out-of-range ints with 400' tests/server/app.test.ts && grep -q 'missing or unknown bearer token yields 401 unauthorized' tests/server/app.test.ts && grep -q 'createApp' src/server/index.ts && grep -q 'ROSTER_CAP' src/server/app.ts && grep -q 'RATE_LIMIT = 60' src/server/app.ts && ! grep -q "Date.now(" src/server/app.ts` → exit 0 |

## 4. Verify the pick

The heading of T39 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T39a`,
  `T39b`…, each with title/worker/files/deps/ac; `files` complete
  including tests).
- `git push` is allowed ONLY if your task's Notes contain `push: yes`.

## 6. Gates — fix until green, never give up

- Run exactly `npm test && npm run lint && npm run typecheck`, then this
  task's `AC:` command(s), and confirm both pass.
- On any failure: fix and rerun. If an approach fails twice, try a DIFFERENT
  approach. Errors are information, never a reason to stop.
- FORBIDDEN: deleting/skipping/weakening tests, loosening tsconfig or eslint,
  `--force`/`|| true` shims, reporting what you did not verify. The Validator
  re-executes AC lines literally and reverts false claims.
- `BLOCKED` only for environmental impossibility (permissions, network,
  toolchain) after ≥3 genuinely different attempts, listed in `note`.
- A `npm run smoke` that exits without `SMOKE_OK` and without any error is
  almost always a collision with another lane's smoke (Electron single-instance
  lock, until the SMOKE-isolation change of T22 lands): retry it once.

## 7. Commit (inside this worktree)

`git add -A && git commit -m "<type>(T39): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-32.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T39 (branch lane/T39)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T39","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
