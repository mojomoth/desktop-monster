# Lane T44 — Builder (iteration 40)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T44
"Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T44 (branch `lane/T44`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T44. The main checkout (two directories up) is off
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
   T44 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
- AC: `grep -q "SERVER_URL = 'https://" src/shared/serverUrl.ts && grep -q '^SERVER_URL=https://' AGENTS.md && grep -q '^RENDER_SERVICE_ID=' AGENTS.md && grep -q '^DB_EXPIRES=' AGENTS.md && grep -q '^DEPLOYED_SHA=' AGENTS.md && grep -q 'start:server' README.md && grep -q 'Leaderboard' README.md && grep -q 'self-reported' README.md && npm run build && test -f dist/electron/server/probe.js && ! grep -q 'pvp(' src/server/probe.ts && ([ -n "$DESMON_SKIP_NET" ] || (URL=$(node -e "process.stdout.write(require('./dist/electron/shared/serverUrl.js').SERVER_URL)") && curl -fsS --retry 5 --retry-delay 30 --max-time 90 -o /tmp/desmon-healthz.json "$URL/healthz" && grep -q '"ok":true' /tmp/desmon-healthz.json && node dist/electron/server/probe.js "$URL"))` → exit 0
- Deps: T40, T41, T43
- Worker: claude
- Files: src/shared/serverUrl.ts, src/server/probe.ts, AGENTS.md, README.md
- Notes: push: yes — exactly one `git push origin HEAD:main`, after the commit and gates. SPEC F50 + `## Deployment` (Assumptions 32/35); SERVER_ARCHITECTURE §7 step by step; TOOLING §6 for CLI facts. Preconditions: `render whoami` works and the workspace was set (H07); if the CLI is not logged in → BLOCKED with the command output as evidence (the bootstrap is idempotent by name, so reruns are safe). Sequence: (1) `bash .harness/v2/loop/render-bootstrap.sh > /tmp/desmon-render.env && . /tmp/desmon-render.env` (creates/reuses `desmon-db` + `desmon-server`, oregon free tier; prints `SERVER_URL=`, `SRV_ID=`, `DB_ID=`, `DB_CREATED=`, `DB_EXPIRES=`); (2) write `export const SERVER_URL = '<SERVER_URL>';` into src/shared/serverUrl.ts; (3) AGENTS.md §Server: replace the `SERVER_URL=<set by the deploy task>` placeholder line and add directly below it `RENDER_SERVICE_ID=`, `RENDER_POSTGRES_ID=`, `DB_CREATED=`, `DB_EXPIRES=`, `DEPLOYED_SHA=` lines (stage 3 copies `server_url`/`db_expires` from here); (4) README section "Server / Leaderboard & PvP" (local `npm run start:server`, auto nickname `Knight-xxxx`, `DESMON_SERVER_URL` override, offline behaviour, free-tier sleep/30-day Postgres expiry caveats, the word `self-reported` for accept-and-rank; add sections only — tests/packaging.test.ts pins the v1 README strings); (5) probe.ts: `node dist/electron/server/probe.js <url>` reuses `createNetClient` from src/main/net.ts (electron-free): register `probe-<4hex>` → upload `{ name, bestIndex: 0, rebirths: 0, companions: [] }` → leaderboard(token, 10) assert `me.rank ≥ 1` → print `{ "playerId", "rank" }` → exit 0/1 — SOURCE GUARD: the probe NEVER plays PvP and the file must not contain the literal `pvp(` anywhere (write "PvP" in prose only); (6) gates → commit `feat(T44): …` → `git push origin HEAD:main` (the lane tip descends from origin/main → fast-forward; never merge/checkout main) → `render deploys create "$SRV_ID" --wait --confirm` (webhooks are not guaranteed) → `curl "$SERVER_URL/healthz"` `"ok":true` (first deploy may take minutes; the free dyno cold-starts ≈ 60 s) → probe; (7) set `DEPLOYED_SHA=<healthz sha>` in AGENTS.md via a fixup commit (touches no build-filter path). Record SERVER_URL, SRV_ID, DB_ID, DB_EXPIRES and the deployed sha in the JSON `note`. The network half of the AC is guarded by `DESMON_SKIP_NET` so it passes hermetically; the validator reruns it once with network. Only T44 and T51 may contain external hostnames, `render` or install commands in their ACs.

Open task headings (context only — do NOT work on them):

### [~] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F50 | Render deployment | The deploy task runs `bash .harness/v2/loop/render-bootstrap.sh` (idempotent by name: Postgres `desmon-db`, web service `desmon-server`, both oregon free tier), writes `export const SERVER_URL = 'https://…';` into `src/shared/serverUrl.ts`, fills AGENTS.md §Server (`SERVER_URL=`, `RENDER_SERVICE_ID=`, `RENDER_POSTGRES_ID=`, `DB_CREATED=`, `DB_EXPIRES=`, `DEPLOYED_SHA=`), adds the README "Server / Leaderboard & PvP" section (local `npm run start:server`, `Knight-xxxx` nickname, `DESMON_SERVER_URL` override, free-tier sleep/expiry caveats, the word `self-reported`), commits, pushes exactly once (`git push origin HEAD:main`), runs `render deploys create <srv-id> --wait --confirm`, verifies `/healthz` and runs `src/server/probe.ts` (`node dist/electron/server/probe.js <url>`: register `probe-<4hex>` → upload bestIndex 0 / empty roster → leaderboard `me.rank ≥ 1`; NEVER calls pvp); the live network proof is the `## Deployment` AC (guarded by `DESMON_SKIP_NET=1`) — this row's AC is the hermetic source pin | claude | `grep -q "SERVER_URL = 'https://" src/shared/serverUrl.ts && grep -q '^SERVER_URL=https://' AGENTS.md && grep -q '^RENDER_SERVICE_ID=' AGENTS.md && grep -q '^DB_EXPIRES=' AGENTS.md && grep -q '^DEPLOYED_SHA=' AGENTS.md && grep -q 'start:server' README.md && grep -q 'Leaderboard' README.md && grep -q 'self-reported' README.md && npm run build && test -f dist/electron/server/probe.js && ! grep -q 'pvp(' src/server/probe.ts` → exit 0 |

## 4. Verify the pick

The heading of T44 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T44a`,
  `T44b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T44): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-40.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T44 (branch lane/T44)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T44","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
