# Lane T73 — Builder (iteration 16)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T73
"Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T73 (branch `lane/T73`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T73. The main checkout (two directories up) is off
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
   T73 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
- AC: `grep -q "SERVER_URL = 'https://" src/shared/serverUrl.ts && grep -q '^SERVER_URL=https://' AGENTS.md && grep -q '^V2_SERVER_URL=https://' AGENTS.md && grep -q '^RENDER_SERVICE_ID=' AGENTS.md && grep -q '^RENDER_POSTGRES_ID=' AGENTS.md && grep -q '^DB_EXPIRES=' AGENTS.md && grep -q '^DEPLOYED_SHA=' AGENTS.md && grep -q 'desmon-server-v3' AGENTS.md && npx vitest run tests/deploy.test.ts && npm run build && test -f dist/electron/server/probe.js && ! grep -q 'pvp(' src/server/probe.ts && ! grep -q 'reclaim(' src/server/probe.ts && ([ -n "$DESMON_SKIP_NET" ] || (URL=$(node -e "process.stdout.write(require('./dist/electron/shared/serverUrl.js').SERVER_URL)") && curl -fsS --retry 5 --retry-delay 30 --max-time 90 -o /tmp/desmon-healthz.json "$URL/healthz" && grep -q '"ok":true' /tmp/desmon-healthz.json && node dist/electron/server/probe.js "$URL"))` → exit 0
- Deps: T61, T67
- Worker: claude
- Files: src/shared/serverUrl.ts, src/server/probe.ts, AGENTS.md
- Notes: SPEC F77, `## Deployment`, Assumption 50; SERVER_ARCHITECTURE_V3 §6; TOOLING §6. push: yes — exactly one push, `git push origin HEAD:v3`, after the commit and gates. Steps: (1) `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh` (idempotent by name; reuses `desmon-db`; prints `SERVER_URL=`, `SRV_ID=`, `DB_ID=`, `DB_CREATED=`, `DB_EXPIRES=`); (2) bake `SERVER_URL = 'https://desmon-server-v3.onrender.com'` (the bootstrap value) into src/shared/serverUrl.ts (`DESMON_SERVER_URL` runtime override unchanged); (3) AGENTS.md §Server lines: `SERVER_URL=` (v3), `RENDER_SERVICE_ID=` (the v3 service), `RENDER_POSTGRES_ID=` (shared), `DB_CREATED=`/`DB_EXPIRES=` (unchanged — same DB), `DEPLOYED_SHA=`, plus `V2_SERVER_URL=https://desmon-server.onrender.com` kept for reference, and the v3 bootstrap/deploy commands; (4) commit, `git push origin HEAD:v3`, `render deploys create <srv-id> --wait --confirm`; (5) verify `curl "$SERVER_URL/healthz"` → `{"ok":true,"sha":…}` with the pushed sha, run `node dist/electron/server/probe.js "$SERVER_URL"` (register → upload → leaderboard; the probe never plays PvP and never reclaims — add a comment if probe.ts otherwise needs no change); (6) record `DEPLOYED_SHA=<pushed sha>` in AGENTS.md in a follow-up commit (AGENTS.md is not a build-filter path — the T44/T51 pattern) and `server_url`/`db_expires` in `.agentdoc/<TS>/meta.json`. Nothing pushes to `main`. `render`, external hostnames and network appear ONLY here and in T74; the network part of the AC is guarded by `DESMON_SKIP_NET`. tests/deploy.test.ts derives its expectations from `SERVER_URL` (run, not edited). README's `desmon-server-v3` mention is T72's (do not edit README here — lane disjointness).

Open task headings (context only — do NOT work on them):

### [~] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [~] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F77 | Render deployment v3 | The v3 deploy task runs `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh` (idempotent by name: reuses Postgres `desmon-db`, creates web service `desmon-server-v3` from branch `v3` with the v2 build/start/health/filter settings), writes `export const SERVER_URL = 'https://…';` (the v3 URL) into `src/shared/serverUrl.ts`, REPLACES AGENTS.md §Server `SERVER_URL=`, `RENDER_SERVICE_ID=`, `DEPLOYED_SHA=` with the v3 values (keeps `RENDER_POSTGRES_ID=`, `DB_CREATED=`, `DB_EXPIRES=`; adds `V2_SERVER_URL=https://desmon-server.onrender.com`), updates the README server section, commits, pushes exactly once (`git push origin HEAD:v3`, never main), runs `render deploys create <srv-id> --wait --confirm`, verifies `/healthz` and runs the probe (`node dist/electron/server/probe.js <url>`; never pvp, never reclaim); the live network proof is the `## Deployment` AC — this row's AC is the hermetic source pin (SERVER_ARCHITECTURE_V3 §6, Assumption 50) | claude | `grep -q "SERVER_URL = 'https://" src/shared/serverUrl.ts && grep -q '^SERVER_URL=https://' AGENTS.md && grep -q '^V2_SERVER_URL=https://' AGENTS.md && grep -q '^RENDER_SERVICE_ID=' AGENTS.md && grep -q '^DB_EXPIRES=' AGENTS.md && grep -q '^DEPLOYED_SHA=' AGENTS.md && grep -q 'desmon-server-v3' AGENTS.md && grep -q 'desmon-server-v3' README.md && npm run build && test -f dist/electron/server/probe.js && ! grep -q 'pvp(' src/server/probe.ts && ! grep -q 'reclaim(' src/server/probe.ts` → exit 0 |

## 4. Verify the pick

The heading of T73 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T73a`,
  `T73b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T73): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-16.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T73 (branch lane/T73)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T73","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
