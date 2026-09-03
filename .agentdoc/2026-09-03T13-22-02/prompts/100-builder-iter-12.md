# Lane T60 — Builder (iteration 12)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T60
"Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T60 (branch `lane/T60`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T60. The main checkout (two directories up) is off
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
   T60 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
- AC: `npx vitest run tests/server/pvp.test.ts tests/server/app.test.ts && grep -q "bad_party" src/server/app.ts && grep -q "RECLAIM_WINDOW_MS" src/server/app.ts && grep -q "String(" src/server/app.ts && grep -q "resolvePvp" src/server/app.ts && grep -q "PVP_COOLDOWN_MS = 60_000" src/server/app.ts && grep -q "BOT_NAME = 'Training Dummy'" src/server/app.ts && grep -q "match_expired" src/server/app.ts && grep -q "pvpParty" src/server/app.ts && grep -q "pvp with an unknown or expired matchId returns 410 match_expired" tests/server/pvp.test.ts && grep -q "pvp with a party id outside my roster returns 400 bad_party" tests/server/pvp.test.ts && grep -q "pvp fights the stored opponent party and returns the blow list with decimal damage" tests/server/pvp.test.ts && grep -q "a steal writes a theft record with a 24 hour reclaim window on the loser" tests/server/pvp.test.ts && grep -q "losing the match moves nothing: the attacker never loses a companion and lost is null" tests/server/pvp.test.ts && grep -q "a v2 body without matchId returns 400 bad_request" tests/server/pvp.test.ts && grep -q "verdict equals core resolvePvp with mulberry32(seed)" tests/server/pvp.test.ts && grep -q "second pvp inside PVP_COOLDOWN_MS returns 429 cooldown with retryAfterSec" tests/server/pvp.test.ts && test "$(grep -c '^\s*it(' tests/server/pvp.test.ts)" -ge 14` → exit 0
- Deps: T54, T58
- Worker: claude
- Files: src/server/app.ts, tests/server/pvp.test.ts
- Notes: SPEC F69 + amended F45, `## Server / API` rows `/v1/pvp`, Match expired, Bad party, PvP cooldown; SERVER_ARCHITECTURE_V3 §3 (copy the handler order verbatim): auth → rate limit → cooldown (`lastPvpAt`, `elapsed === 60000` allowed) → body must carry `matchId` string + `party` string[] (v2 body → 400 `bad_request`) → match lookup: missing / older than `MATCH_TTL_MS` / not mine → 410 `match_expired` (entry deleted) → `party = pvpParty(me.snapshot.companions, body.party)` after checking every id is in my roster and ≤ `PARTY_SIZE_MAX` (else 400 `bad_party`, no cooldown stamp, match kept; empty → auto) → `setLastPvpAt(me.id, now())` → `verdict = resolvePvp(party, match.opponentParty, mulberry32(seed), me.snapshot.companions.length)` → `blows` with `damage: String(bigint)` → delete the match. Steal (non-bot, `moved !== null`): `transferred = { ...moved, id: 's' + seed }`, loser roster + `party` ids `without(moved.id)`, winner roster `+= transferred`, `setStolenIds(loser, [...ids, moved.id].slice(-32))`, theft `{ id: 't' + seed, companion: moved, transferredId: 's' + seed, thiefId: me.id, thiefName: me.name, at: now(), reclaimUntil: now() + RECLAIM_WINDOW_MS }` appended to the loser's thefts `.slice(-THEFTS_MAX)`, `putSnapshot` both, `setThefts(loser)`; respond `stolen: transferred`, `lost: null`, `opponent` = the previewed match opponent. Replace T54's local party helper in `/v1/pvp/match` with core `pvpParty`/`autoParty` (import from `src/core`; server never imports electron/main/renderer). New titles verbatim (tests/server/pvp.test.ts → ≥ 14): "pvp with an unknown or expired matchId returns 410 match_expired", "pvp with a party id outside my roster returns 400 bad_party", "pvp fights the stored opponent party and returns the blow list with decimal damage", "a steal writes a theft record with a 24 hour reclaim window on the loser", "a v2 body without matchId returns 400 bad_request"; the retitled loss test from T58 and every F45 title stay (values move to the two-step flow: call `/v1/pvp/match` first in fixtures). Injected `now`/`randomSeed`/`randomBytesHex`; no sockets. `GET /v1/thefts` / `POST /v1/reclaim` are T61.

Open task headings (context only — do NOT work on them):

### [~] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [~] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F45 | Server PvP | `POST /v1/pvp` in `src/server/app.ts` per SERVER_ARCHITECTURE_V3 §3 (v3, F69): body `PvpRequest { matchId, party }` (a v2 body without `matchId` → 400 `bad_request`); auth → rate limit → cooldown (`PVP_COOLDOWN_MS = 60_000` via `lastPvpAt`; inside → 429 `cooldown` + `retryAfterSec = ceil(remaining/1000)`; `elapsed === 60000` allowed) → `me.snapshot` null → 400 `no_snapshot` → match lookup in the in-memory `matches` map (missing, older than `MATCH_TTL_MS`, or owned by another player → 410 `match_expired`, entry deleted) → `party = pvpParty(me.snapshot.companions, body.party)` after every id is checked against my roster (unknown id or > 5 → 400 `bad_party`; empty → auto) → `setLastPvpAt(me, now())` (bots included) → `verdict = resolvePvp(party, match.opponentParty, mulberry32(match.seed), me.snapshot.companions.length)` imported from core (never re-implemented; the defender party is the STORED preview) → match deleted → steal bookkeeping only when `moved !== null` and not a bot: transferred re-id'd `'s' + seed`, loser `stolenIds` gains the ORIGINAL id (`.slice(-32)`, `STOLEN_IDS_MAX = 32`), loser roster and `party` ids lose it, theft record appended to the loser's `thefts` (`.slice(-THEFTS_MAX)`), `putSnapshot` both rows + `setThefts(loser)` (non-transactional, `ponytail:` comment naming BEGIN/COMMIT); response `PvpResponse { bot, seed, win, opponent (name, bestIndex, rebirths, party as previewed), blows (damage as decimal strings), stolen: moved ? transferred : null, lost: null }`; the opponent selection itself moved to `POST /v1/pvp/match` (F68) | claude | `npx vitest run tests/server/pvp.test.ts && grep -q 'picks the rank neighbour above or below by seed parity' tests/server/pvp.test.ts && grep -q 'alone on the server yields the Training Dummy bot and no steal' tests/server/pvp.test.ts && grep -q 'winner gains the stolen companion under a fresh id and the loser stolenIds grows' tests/server/pvp.test.ts && grep -q 'winner with a full roster steals nothing' tests/server/pvp.test.ts && grep -q 'second pvp inside PVP_COOLDOWN_MS returns 429 cooldown with retryAfterSec' tests/server/pvp.test.ts && grep -q 'verdict equals core resolvePvp with mulberry32(seed)' tests/server/pvp.test.ts && grep -q 'pvp without an uploaded snapshot returns 400 no_snapshot' tests/server/pvp.test.ts && grep -q 'pvp with an unknown or expired matchId returns 410 match_expired' tests/server/pvp.test.ts && grep -q 'resolvePvp' src/server/app.ts && grep -q 'PVP_COOLDOWN_MS = 60_000' src/server/app.ts && grep -q "BOT_NAME = 'Training Dummy'" src/server/app.ts && grep -q 'match_expired' src/server/app.ts` → exit 0 |
| F69 | Server PvP v3 with steal and theft records | `POST /v1/pvp` per F45 (v3 body, match validation, `bad_party`, stored defender party, core `resolvePvp` v3 with `winnerRosterSize`, `blows` as `WireBlow[]`, attacker-only steal); on a steal: `transferred = { ...moved, id: 's' + seed }`, loser roster and `party` lose `moved.id`, winner roster `+= transferred`, `setStolenIds(loser, [...ids, moved.id].slice(-32))`, theft `{ id: 't' + seed, companion: moved (original id), transferredId: 's' + seed, thiefId: me.id, thiefName: me.name, at: now(), reclaimUntil: now() + RECLAIM_WINDOW_MS }` appended to the loser's thefts (`.slice(-THEFTS_MAX)`), `putSnapshot` both, `setThefts(loser)`; `stolen: transferred`, `lost: null` always; bot or no steal → no roster writes; `tests/server/pvp.test.ts` v2 titles kept except the retitled "losing the match…" one (Assumption 53); every test calls the app handler with `MemoryStore` and injected `now`/`randomSeed` (SERVER_ARCHITECTURE_V3 §3, Assumption 46) | claude | `npx vitest run tests/server/pvp.test.ts && grep -q "bad_party" src/server/app.ts && grep -q "RECLAIM_WINDOW_MS" src/server/app.ts && grep -q "String(" src/server/app.ts && grep -q "pvp with an unknown or expired matchId returns 410 match_expired" tests/server/pvp.test.ts && grep -q "pvp with a party id outside my roster returns 400 bad_party" tests/server/pvp.test.ts && grep -q "pvp fights the stored opponent party and returns the blow list with decimal damage" tests/server/pvp.test.ts && grep -q "a steal writes a theft record with a 24 hour reclaim window on the loser" tests/server/pvp.test.ts && grep -q "losing the match moves nothing: the attacker never loses a companion and lost is null" tests/server/pvp.test.ts && grep -q "a v2 body without matchId returns 400 bad_request" tests/server/pvp.test.ts && test "$(grep -c '^\s*it(' tests/server/pvp.test.ts)" -ge 14` → exit 0 |

## 4. Verify the pick

The heading of T60 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T60a`,
  `T60b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T60): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-12.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T60 (branch lane/T60)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T60","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
