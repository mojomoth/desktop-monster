# Lane T38 — Builder (iteration 22)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T38
"Client identity.json, shared API wire types, serverUrl constant" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T38 (branch `lane/T38`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T38. The main checkout (two directories up) is off
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
   T38 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T38 — Client identity.json, shared API wire types, serverUrl constant
- AC: `npx vitest run tests/identity.test.ts && grep -q 'export const SERVER_URL' src/shared/serverUrl.ts && grep -q 'identity.json' src/main/identity.ts && grep -q 'creates a Knight-xxxx identity with no credentials when identity.json is missing' tests/identity.test.ts && grep -q 'round-trips playerId and token through identity.json' tests/identity.test.ts && grep -q 'rejects names longer than 16 or with characters outside the nickname rule' tests/identity.test.ts && grep -q 'never throws on corrupt identity.json' tests/identity.test.ts && grep -q 'NICK_RE' src/shared/api.ts && grep -q 'LEADERBOARD_MAX = 50' src/shared/api.ts && ! grep -q "from '../core" src/shared/api.ts && ! grep -q token src/core/save.ts` → exit 0
- Deps: none
- Worker: claude
- Files: src/main/identity.ts, src/shared/api.ts, src/shared/serverUrl.ts, tests/identity.test.ts
- Notes: SPEC F47 (Assumptions 31/41); SERVER_ARCHITECTURE §2 (api.ts VERBATIM: `Companion`, `Snapshot`, `LeaderboardRow`, `RegisterResponse`, `SnapshotResponse`, `LeaderboardResponse`, `PvpOpponent`, `PvpResponse`, `ApiError`, `NetError`, `NetResult<T>`, `IdentityPayload`, `LeaderboardResult`, `PvpResult`, `NICK_RE = /^[A-Za-z0-9_-]{1,16}$/`, `COMPANION_ID_RE = /^[a-z0-9]{1,16}$/`, `LEVEL_MIN = 1`, `LEVEL_MAX = 10`, `INT_MAX = 2_147_483_647`, `LEADERBOARD_DEFAULT = 10`, `LEADERBOARD_MAX = 50`) — api.ts declares its OWN structural `Companion` and imports NOTHING from src/core (AC greps `from '../core`; TypeScript structural typing keeps the two interchangeable) + §6 identity.ts (electron-free, dir + `randomUUID` injected, persistence.ts pattern): `IDENTITY_FILE_NAME = 'identity.json'`, `Identity { name, playerId, token }`, `defaultName(randomUUID)` = `'Knight-'` + first 4 uuid chars, `readIdentity(dir, randomUUID)` (missing/corrupt → fresh `{ name: 'Knight-xxxx', playerId: null, token: null }`, never throws), `writeIdentity(dir, identity)` (tmp + rename, never throws, returns boolean), `isValidName(name): name is string` via NICK_RE. serverUrl.ts is exactly `export const SERVER_URL = '';` (T44 rewrites the value; ACs grep only the declaration). The token never enters save.json (AC: `! grep -q token src/core/save.ts` — T24 must keep that word out of save.ts) or any IPC payload except `{ name, playerId, online }`. Tests use `mkdtempSync` like tests/persistence.test.ts and a counter uuid; titles verbatim in the AC. tsconfig.test pulls src/main/identity.ts transitively (persistence.ts precedent). shared/ipc.ts is untouched here (T43).

Open task headings (context only — do NOT work on them):

### [~] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
### [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T32 — Effects module: data-driven presets on the particle pool, per-species hit effects
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T38 — Client identity.json, shared API wire types, serverUrl constant
### [ ] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T42 — Main net client + net session: injected fetch, 5000 ms timeout, never throws, 401 re-register
### [ ] T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, global.d.ts, SMOKE offline pin
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

| F47 | Identity and wire types | `src/main/identity.ts` (electron-free, dir + `randomUUID` injected, `persistence.ts` pattern): `IDENTITY_FILE_NAME = 'identity.json'`, `Identity { name, playerId, token }`, `defaultName` (`'Knight-'` + 4 uuid chars), `readIdentity` (missing/corrupt → fresh default, never throws), `writeIdentity` (tmp + rename, never throws), `isValidName` (`NICK_RE`); `src/shared/api.ts` = SERVER_ARCHITECTURE §2 verbatim (`Companion`, `Snapshot`, `LeaderboardRow`, responses, `ApiError`, `NetError`, `NetResult<T>`, `IdentityPayload`, `LeaderboardResult`, `PvpResult`, `NICK_RE`, `COMPANION_ID_RE`, `LEVEL_MIN/MAX`, `INT_MAX`, `LEADERBOARD_DEFAULT = 10`, `LEADERBOARD_MAX = 50`) with NO import from `src/core` (Assumption 41); `src/shared/serverUrl.ts` is exactly `export const SERVER_URL = '';` until F50; the token never enters `save.json` or any IPC payload except `{ name, playerId, online }` | claude | `npx vitest run tests/identity.test.ts && grep -q 'export const SERVER_URL' src/shared/serverUrl.ts && grep -q 'identity.json' src/main/identity.ts && grep -q 'creates a Knight-xxxx identity with no credentials when identity.json is missing' tests/identity.test.ts && grep -q 'round-trips playerId and token through identity.json' tests/identity.test.ts && grep -q 'rejects names longer than 16 or with characters outside the nickname rule' tests/identity.test.ts && grep -q 'never throws on corrupt identity.json' tests/identity.test.ts && grep -q 'NICK_RE' src/shared/api.ts && grep -q 'LEADERBOARD_MAX = 50' src/shared/api.ts && ! grep -q "from '../core" src/shared/api.ts && ! grep -q token src/core/save.ts` → exit 0 |

## 4. Verify the pick

The heading of T38 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T38a`,
  `T38b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T38): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-22.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T38 (branch lane/T38)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T38","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
