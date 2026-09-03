# Lane T40 — Builder (iteration 36)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T40
"Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T40 (branch `lane/T40`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T40. The main checkout (two directories up) is off
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
   T40 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
- AC: `npx vitest run tests/server/pvp.test.ts && grep -q 'picks the rank neighbour above or below by seed parity' tests/server/pvp.test.ts && grep -q 'alone on the server yields the Training Dummy bot and no steal' tests/server/pvp.test.ts && grep -q 'winner gains the stolen companion under a fresh id and the loser stolenIds grows' tests/server/pvp.test.ts && grep -q 'winner with a full roster steals nothing' tests/server/pvp.test.ts && grep -q 'second pvp inside PVP_COOLDOWN_MS returns 429 cooldown with retryAfterSec' tests/server/pvp.test.ts && grep -q 'verdict equals core resolvePvp with mulberry32(seed)' tests/server/pvp.test.ts && grep -q 'pvp without an uploaded snapshot returns 400 no_snapshot' tests/server/pvp.test.ts && grep -q 'resolvePvp' src/server/app.ts && grep -q 'PVP_COOLDOWN_MS = 60_000' src/server/app.ts && grep -q "BOT_NAME = 'Training Dummy'" src/server/app.ts` → exit 0
- Deps: T39, T36
- Worker: claude
- Files: src/server/app.ts, tests/server/pvp.test.ts
- Notes: SPEC F45 + `## Server / API` rows pvp and cooldown (Assumption 34); SERVER_ARCHITECTURE §3 rules + §5 steps 1–7 in that exact order: auth → rate limit → cooldown (`PVP_COOLDOWN_MS = 60_000` via `lastPvpAt`; inside → 429 `cooldown` + `retryAfterSec = ceil(remaining / 1000)`; `elapsed === 60000` allowed) → `me.snapshot` null → 400 `no_snapshot` → `setLastPvpAt(me.id, now())` (bots included) → `seed = randomSeed() >>> 0` → opponent: `neighbor(me.id, key, 'up')`/`'down'`, both → `seed & 1 ? down : up`, one → it, none → bot `{ name: BOT_NAME, bestIndex: me.bestIndex, rebirths: me.rebirths, companions: [] }` with `bot: true` and no roster writes → `verdict = resolvePvp(me.snapshot.companions, opponent.companions, mulberry32(seed))` imported from src/core (NEVER re-implement the maths; `win = verdict.attackerWon`, transferred = `verdict.moved`; `attackerPower`/`defenderPower` never go on the wire) → steal bookkeeping (non-bot, `moved !== null`): `transferred = { ...moved, id: 's' + seed }`, loser roster without `moved.id`, winner roster + transferred, `setStolenIds(loser.id, [...loser.stolenIds, moved.id].slice(-STOLEN_IDS_MAX))` with the ORIGINAL id, `putSnapshot` both rows (non-transactional — add a `ponytail:` comment naming BEGIN/COMMIT as the upgrade). `moved` is null when the loser is empty or the winner's STORED roster has `ROSTER_CAP`. Response `{ bot, seed, win, opponent, stolen: win ? transferred : null, lost: win ? null : moved }`; body ignored; `BOT_NAME = 'Training Dummy'`. Test titles verbatim in the AC; also steal in both directions (attacker wins → `stolen`; attacker loses → `lost`), `removed` on the loser's next upload, cooldown boundary. Seeded MemoryStore with 3 players, counter clock. `Date.now(` still absent from app.ts (T39 guard).

Open task headings (context only — do NOT work on them):

### [~] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [~] T46 — Menu window + tray item "Collection & Battle…"
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F45 | Server PvP | `POST /v1/pvp` in `src/server/app.ts` per SERVER_ARCHITECTURE §3/§5: auth → rate limit → cooldown (`PVP_COOLDOWN_MS = 60_000` via `lastPvpAt`; inside → 429 `cooldown` + `retryAfterSec = ceil(remaining/1000)`; `elapsed === 60000` allowed) → `me.snapshot` null → 400 `no_snapshot` → `setLastPvpAt(me, now())` (bots included) → `seed = randomSeed() >>> 0` → opponent = `neighbor(up/down)` by `seed & 1 ? down : up`, one → it, none → bot `{ name: BOT_NAME = 'Training Dummy', bestIndex: me.bestIndex, rebirths: me.rebirths, companions: [] }` with `bot: true` and no roster writes → `verdict = resolvePvp(me.companions, opponent.companions, mulberry32(seed))` imported from core (never re-implemented) → steal bookkeeping: transferred companion re-id'd `'s' + seed`, loser `stolenIds` gains the ORIGINAL id (`.slice(-32)`, `STOLEN_IDS_MAX = 32`), `putSnapshot` both rows (non-transactional, `ponytail:` comment naming BEGIN/COMMIT); response `{ bot, seed, win, opponent, stolen: win ? transferred : null, lost: win ? null : moved }`; body ignored | claude | `npx vitest run tests/server/pvp.test.ts && grep -q 'picks the rank neighbour above or below by seed parity' tests/server/pvp.test.ts && grep -q 'alone on the server yields the Training Dummy bot and no steal' tests/server/pvp.test.ts && grep -q 'winner gains the stolen companion under a fresh id and the loser stolenIds grows' tests/server/pvp.test.ts && grep -q 'winner with a full roster steals nothing' tests/server/pvp.test.ts && grep -q 'second pvp inside PVP_COOLDOWN_MS returns 429 cooldown with retryAfterSec' tests/server/pvp.test.ts && grep -q 'verdict equals core resolvePvp with mulberry32(seed)' tests/server/pvp.test.ts && grep -q 'pvp without an uploaded snapshot returns 400 no_snapshot' tests/server/pvp.test.ts && grep -q 'resolvePvp' src/server/app.ts && grep -q 'PVP_COOLDOWN_MS = 60_000' src/server/app.ts && grep -q "BOT_NAME = 'Training Dummy'" src/server/app.ts` → exit 0 |

## 4. Verify the pick

The heading of T40 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T40a`,
  `T40b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T40): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-36.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T40 (branch lane/T40)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T40","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
