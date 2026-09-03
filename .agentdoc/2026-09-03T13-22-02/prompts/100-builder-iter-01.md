# Lane T54 — Builder (iteration 01)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T54
"Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T54 (branch `lane/T54`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T54. The main checkout (two directories up) is off
  limits. Never run `git push`, `git checkout main` or `git checkout v3`, `git worktree`,
  `git merge`, `git rebase`.
- Never edit `IMPLEMENTATION_PLAN.md`; never edit `SPEC.md` unless it is in
  your task's `Files:`. The orchestrator writes the plan from your JSON report.
- One task only. Do not read the whole plan — your block is below; the open
  headings are context.

## 2. Orient (read, in this order)

1. `AGENTS.md` — commands, gates, hard rules, ponytail code style. The gates
   line is: `npm test && npm run lint && npm run typecheck`
2. `.harness/v3/agents/20-builder.md` — your charter; its hard rules bind you.
3. Your task block and the SPEC rows below.
4. `.harness/v3/reference/GAME_DESIGN_V2.md`, `SERVER_ARCHITECTURE.md`,
   `GAME_ARCHITECTURE.md` — ONLY the sections your task cites.
5. Any file in `.agentdoc/2026-09-03T13-22-02/sessions/` whose name or text mentions
   T54 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types
- AC: `npx vitest run tests/server/app.test.ts tests/server/pvp.test.ts tests/server/pgStore.test.ts && grep -q "/v1/pvp/match" src/server/app.ts && grep -q "MATCH_TTL_MS = 120_000" src/shared/api.ts && grep -q "PARTY_SIZE_MAX = 5" src/shared/api.ts && grep -q "export interface MatchResponse" src/shared/api.ts && grep -q "setThefts" src/server/store.ts && ! grep -q "from '../core" src/shared/api.ts && grep -q "new Map" src/server/app.ts && grep -q "pvp match picks the rank neighbour and returns its party with a match id" tests/server/app.test.ts && grep -q "a match expires after MATCH_TTL_MS" tests/server/app.test.ts && grep -q "upload keeps a valid party and drops party ids missing from the roster" tests/server/app.test.ts && test "$(grep -c '^\s*it(' tests/server/app.test.ts)" -ge 13 && grep -q "ADD COLUMN IF NOT EXISTS thefts" src/server/pgStore.ts && grep -q "SET thefts = " src/server/pgStore.ts && ! grep -qi "CREATE TABLE IF NOT EXISTS matches" src/server/pgStore.ts && grep -q "thefts column is added idempotently" tests/server/pgStore.test.ts && grep -q "setThefts updates the thefts column of one row" tests/server/pgStore.test.ts && grep -q "no matches table exists in the DDL" tests/server/pgStore.test.ts && test "$(grep -c '^\s*it(' tests/server/pgStore.test.ts)" -ge 22` → exit 0
- Deps: none
- Worker: claude
- Files: src/shared/api.ts, src/server/store.ts, src/server/pgStore.ts, src/server/app.ts, tests/server/app.test.ts, tests/server/pgStore.test.ts
- Notes: SPEC F68, F71, `## Server / API` rows `/v1/pvp/match` + `PUT /v1/snapshot` (party), Assumptions 41/47. Exceeds the 5-file cap BY DESIGN: the `Store` interface (+ `setThefts(id, thefts)`, 10 methods; `PlayerRow.thefts: Theft[]`), `MemoryStore` and `PgStore` must land together to typecheck. Wire types verbatim from SERVER_ARCHITECTURE_V3 §2: `MonsterType` (string-union literal, NEVER imported from core — `! grep "from '../core"` pin), `Snapshot.party: string[]`, `PvpOpponent.party`, `MatchResponse`, `PvpRequest`, `WireBlow`, `BattleReplay`, `PvpResponse` (v3 shape, `lost: null`), `Theft`, `TheftsResponse`, `ReclaimRequest/Response`, `SnapshotResponse.thefts`, `PARTY_SIZE_MAX = 5`, `MATCH_TTL_MS = 120_000`, `RECLAIM_WINDOW_MS = 86_400_000`, `THEFTS_MAX = 8`, `NetError` += `'expired' | 'gone'`, `MatchResult`/`TheftsResult`/`ReclaimResult` aliases. `parseSnapshot` (app.ts) validates `party` per §2: ≤ 5 strings matching `COMPANION_ID_RE`, each present in `companions`, deduped in order — violations DROP ids, never reject; missing → `[]`. Match store: module-level `const matches = new Map<string, PendingMatch>()` in app.ts (`{ matchId, playerId, opponentId, seed, opponentParty, createdAt }`), pruned on every `/v1/pvp/match` call by `now() - createdAt > MATCH_TTL_MS`, `ponytail:` comment naming a `matches` table as the multi-instance upgrade. `POST /v1/pvp/match` order: auth → rate limit → `me.snapshot` null → 400 `no_snapshot` → opponent = the v2 neighbour rule (or bot `{ name: BOT_NAME, bestIndex, rebirths, party: [] }`) → `matchId = randomBytesHex(8)`, `seed = randomSeed() >>> 0`, `expiresAt = now() + MATCH_TTL_MS`; no cooldown check, no store writes. Opponent party preview at THIS task: the stored `snapshot.party` ids resolved in order, else the 5 strongest by the existing core `companionPower` (raw power) — T60 swaps this local helper for core `pvpParty`/`autoParty` (they do not exist yet; T54 has no core deps by design). DDL: `ALTER TABLE players ADD COLUMN IF NOT EXISTS thefts jsonb NOT NULL DEFAULT '[]'` + `UPDATE players SET thefts = $2::jsonb WHERE id = $1`; row mapper reads `thefts` (tolerant, default `[]`). `POST /v1/pvp` itself is UNCHANGED here (v2 body still works until T60). Test titles verbatim: "pvp match picks the rank neighbour and returns its party with a match id", "a match expires after MATCH_TTL_MS", "upload keeps a valid party and drops party ids missing from the roster" (app.test.ts, 10 → ≥ 13), "thefts column is added idempotently", "setThefts updates the thefts column of one row", "no matches table exists in the DDL" (pgStore.test.ts, 19 → ≥ 22; source pins, no DB). Injected `now`/`randomSeed`/`randomBytesHex` as v2; no sockets. Do NOT touch tests/server/pvp.test.ts (T58/T60 own it).

Open task headings (context only — do NOT work on them):

### [~] T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types
### [ ] T55 — Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type
### [ ] T56 — SaveFileV3 + pvpParty migration + GameState.pvpParty
### [ ] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
### [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T62 — Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78
### [ ] T63 — Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows
### [ ] T64 — HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T70 — Menu window 420×640 + Battle tab v3 markup + view.ts (opponentRows, partyPreview, togglePick, theftRows, battleEnabled)
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F68 | Server match endpoint | `src/shared/api.ts` gains `MonsterType` (string union re-declared, core-free), `Snapshot.party: string[]`, `PvpOpponent.party: Companion[]`, `MatchResponse { matchId, seed, bot, opponent, expiresAt }`, `PvpRequest`, `WireBlow`, `BattleReplay`, `PvpResponse` v3, `Theft`, `TheftsResponse`, `ReclaimRequest`, `ReclaimResponse`, `SnapshotResponse.thefts`, `PARTY_SIZE_MAX = 5`, `MATCH_TTL_MS = 120_000`, `RECLAIM_WINDOW_MS = 86_400_000`, `THEFTS_MAX = 8`, `NetError` + `'expired'` + `'gone'`, `MatchResult`/`TheftsResult`/`ReclaimResult`; `parseSnapshot` validates `party` (≤ 5 strings matching `COMPANION_ID_RE`, present in `companions`, deduped in order; violations DROP ids, never reject); `src/server/store.ts` `PlayerRow.thefts: Theft[]`, `Store.setThefts(id, thefts)` (10 methods) in `MemoryStore` (and `PgStore`, F71, same task); `src/server/app.ts`: module-level `matches = new Map<string, PendingMatch>()` (`ponytail:` comment naming a `matches` table), `POST /v1/pvp/match`: auth → rate limit → no snapshot → 400 `no_snapshot`; opponent by the v2 neighbour rule or bot `{ name: 'Training Dummy', bestIndex, rebirths, party: [] }`; `opponent.party = pvpParty(opp.snapshot.companions, opp.snapshot.party)` (core); `matchId = randomBytesHex(8)`, `seed = randomSeed() >>> 0`, `expiresAt = now() + MATCH_TTL_MS`; entry `{ matchId, playerId, opponentId, seed, opponentParty, createdAt }`; entries older than `MATCH_TTL_MS` pruned on every call; no cooldown check, no store writes (SERVER_ARCHITECTURE_V3 §2–§4, Assumption 47) | claude | `npx vitest run tests/server/app.test.ts tests/server/pvp.test.ts && grep -q "/v1/pvp/match" src/server/app.ts && grep -q "MATCH_TTL_MS = 120_000" src/shared/api.ts && grep -q "PARTY_SIZE_MAX = 5" src/shared/api.ts && grep -q "export interface MatchResponse" src/shared/api.ts && grep -q "setThefts" src/server/store.ts && ! grep -q "from '../core" src/shared/api.ts && grep -q "new Map" src/server/app.ts && grep -q "pvp match picks the rank neighbour and returns its party with a match id" tests/server/app.test.ts && grep -q "a match expires after MATCH_TTL_MS" tests/server/app.test.ts && grep -q "upload keeps a valid party and drops party ids missing from the roster" tests/server/app.test.ts && test "$(grep -c '^\s*it(' tests/server/app.test.ts)" -ge 13` → exit 0 |
| F71 | PgStore thefts column | `src/server/pgStore.ts`: DDL gains `ALTER TABLE players ADD COLUMN IF NOT EXISTS thefts jsonb NOT NULL DEFAULT '[]'` (additive, idempotent — the column is shared with the v2 service, never dropped or renamed), the row mapper reads `thefts` (tolerant: non-array → `[]`), `setThefts` = `UPDATE players SET thefts = $2::jsonb WHERE id = $1`; no `matches` table; `src/server/index.ts` untouched apart from the interface; source pins only, no DB in tests (SERVER_ARCHITECTURE_V3 §4, Assumption 50) | claude | `npx vitest run tests/server/pgStore.test.ts && grep -q "ADD COLUMN IF NOT EXISTS thefts" src/server/pgStore.ts && grep -q "SET thefts = " src/server/pgStore.ts && ! grep -qi "CREATE TABLE IF NOT EXISTS matches" src/server/pgStore.ts && grep -q "thefts column is added idempotently" tests/server/pgStore.test.ts && grep -q "setThefts updates the thefts column of one row" tests/server/pgStore.test.ts && grep -q "no matches table exists in the DDL" tests/server/pgStore.test.ts && test "$(grep -c '^\s*it(' tests/server/pgStore.test.ts)" -ge 22` → exit 0 |

## 4. Verify the pick

The heading of T54 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T54a`,
  `T54b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T54): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-01.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T54 (branch lane/T54)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T54","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
