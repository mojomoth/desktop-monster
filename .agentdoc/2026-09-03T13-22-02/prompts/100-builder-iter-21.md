# Lane T74 — Builder (iteration 21)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T74
"Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T74 (branch `lane/T74`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T74. The main checkout (two directories up) is off
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
   T74 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
- AC: `grep -q '^DEPLOYED_SHA=[0-9a-f]' AGENTS.md && S=$(sed -n 's/^DEPLOYED_SHA=//p' AGENTS.md) && git merge-base --is-ancestor "$S" HEAD && test -z "$(git log "$S"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" && D=$(sed -n 's/^DB_EXPIRES=//p' AGENTS.md) && test "$D" '>' "$(date -u +%Y-%m-%d)" && ([ -n "$DESMON_SKIP_NET" ] || (npm run build && URL=$(node -e "process.stdout.write(require('./dist/electron/shared/serverUrl.js').SERVER_URL)") && curl -fsS --retry 5 --retry-delay 30 --max-time 90 -o /tmp/desmon-healthz.json "$URL/healthz" && grep -q '"ok":true' /tmp/desmon-healthz.json && SHA=$(node -pe "JSON.parse(require('fs').readFileSync('/tmp/desmon-healthz.json','utf8')).sha") && git merge-base --is-ancestor "$SHA" HEAD && [ -z "$(git log "$SHA"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" ] && node dist/electron/server/probe.js "$URL"))` → exit 0
- Deps: T72, T73
- Worker: claude
- Files: AGENTS.md
- Notes: SPEC F78, `## Deployment` health contract (evaluated on the `v3` branch HEAD). push: yes — at most one push, `git push origin HEAD:v3`, only when the live sha is stale (T72's version bump touched package.json/package-lock.json = build-filter paths, so a redeploy is expected exactly as T51 found): re-run `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh` only if the service is missing (idempotent), then `git push origin HEAD:v3` + `render deploys create <srv-id> --wait --confirm`, then `curl $SERVER_URL/healthz` and check `git merge-base --is-ancestor <sha> HEAD` ∧ `git log <sha>..HEAD -- <filter paths>` empty; update `DEPLOYED_SHA=` in AGENTS.md (the only file). No equality check against HEAD — the live sha may legitimately be older. Network guarded by `DESMON_SKIP_NET`; `render`/external hostnames appear only here and in T73.

Open task headings (context only — do NOT work on them):

### [~] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F78 | Deploy re-verify v3 | After every build-filter-path chain (core types/party/battle, shared api/ipc, server match/pvp/thefts/reclaim/pgStore, version bump) has landed on `v3`, the re-verify task pushes exactly once (`git push origin HEAD:v3`), runs `render deploys create <srv-id> --wait --confirm` for `desmon-server-v3`, then proves the deploy verification rule of `## Deployment` against the `v3` branch HEAD (healthz `sha` is an ancestor of HEAD and `git log <sha>..HEAD -- <filter paths>` is empty; no equality check) and records that sha as `DEPLOYED_SHA=` in AGENTS.md §Server via a commit that touches no filter path; also confirms `DB_EXPIRES` lies in the future; this row's AC is the hermetic git-side half — the live half is the `## Deployment` AC | claude | `grep -q '^DEPLOYED_SHA=[0-9a-f]' AGENTS.md && S=$(sed -n 's/^DEPLOYED_SHA=//p' AGENTS.md) && git merge-base --is-ancestor "$S" HEAD && test -z "$(git log "$S"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" && D=$(sed -n 's/^DB_EXPIRES=//p' AGENTS.md) && test "$D" '>' "$(date -u +%Y-%m-%d)"` → exit 0 |

## 4. Verify the pick

The heading of T74 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T74a`,
  `T74b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T74): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-21.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T74 (branch lane/T74)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T74","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
