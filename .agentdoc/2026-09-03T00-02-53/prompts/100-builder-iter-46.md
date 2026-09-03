# Lane T51 — Builder (iteration 46)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T51
"Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T51 (branch `lane/T51`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T51. The main checkout (two directories up) is off
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
   T51 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
- AC: `grep -q '^DEPLOYED_SHA=[0-9a-f]' AGENTS.md && S=$(sed -n 's/^DEPLOYED_SHA=//p' AGENTS.md) && git merge-base --is-ancestor "$S" HEAD && test -z "$(git log "$S"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" && npm run build && ([ -n "$DESMON_SKIP_NET" ] || (URL=$(node -e "process.stdout.write(require('./dist/electron/shared/serverUrl.js').SERVER_URL)") && curl -fsS --retry 5 --retry-delay 30 --max-time 90 -o /tmp/desmon-healthz.json "$URL/healthz" && grep -q '"ok":true' /tmp/desmon-healthz.json && SHA=$(node -pe "JSON.parse(require('fs').readFileSync('/tmp/desmon-healthz.json','utf8')).sha") && git merge-base --is-ancestor "$SHA" HEAD && test -z "$(git log "$SHA"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)" && node dist/electron/server/probe.js "$URL"))` → exit 0
- Deps: T36, T44, T49, T50
- Worker: claude
- Files: AGENTS.md
- Notes: push: yes — exactly one `git push origin HEAD:main`, after the gates; T51's only commit (the `DEPLOYED_SHA=` update) necessarily FOLLOWS the deploy and is merged by the orchestrator and pushed by stage 3, never by T51. SPEC F56 + `## Deployment` verification rule (`curl /healthz` ok AND `git merge-base --is-ancestor <sha> HEAD` AND `git log <sha>..HEAD -- <build-filter paths>` empty — NO equality check against HEAD; the live sha may legitimately be older). Every chain that touches a build-filter path (core bigint/collection/resolvePvp, shared ipc/api, server, T50's package.json/package-lock.json bump) is done by now (transitively through the Deps); Render only rebuilt on the T44 push. Steps: read `RENDER_SERVICE_ID=` from AGENTS.md → gates → `git push origin HEAD:main` (fast-forward: the lane tip descends from origin/main and carries nothing of T51's yet) → `render deploys create "$SRV_ID" --wait --confirm` → run the AC (live half) → update `DEPLOYED_SHA=` in AGENTS.md → commit (touches no filter path, so the AC stays true after the orchestrator's `--no-ff` merge: history simplification drops the TREESAME merge commit) → rerun the full AC. If the healthz `sha` is not an ancestor of HEAD or a later commit touched a filter path, the deploy did not take — check `render deploys list` / `render logs` and redeploy; BLOCKED only if Render itself refuses (evidence in note). Also confirm `DB_EXPIRES` lies in the future and note the days remaining for the handoff. `DESMON_SKIP_NET=1` keeps the AC green offline; the validator reruns it once with network.

Open task headings (context only — do NOT work on them):

### [~] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F56 | Deploy re-verify | After every build-filter-path chain (core bigint/collection/resolvePvp, shared ipc/api, server, version bump) has landed, the re-verify task pushes exactly once, runs `render deploys create <srv-id> --wait --confirm`, then proves the deploy verification rule of `## Deployment` (healthz `sha` is an ancestor of HEAD and `git log <sha>..HEAD -- <filter paths>` is empty; no equality check against HEAD) and records that sha as `DEPLOYED_SHA=` in AGENTS.md §Server via a commit that touches no filter path; also confirms `DB_EXPIRES` lies in the future; this row's AC is the hermetic git-side half of the rule against the recorded sha — the live half is the `## Deployment` AC | claude | `grep -q '^DEPLOYED_SHA=[0-9a-f]' AGENTS.md && S=$(sed -n 's/^DEPLOYED_SHA=//p' AGENTS.md) && git merge-base --is-ancestor "$S" HEAD && test -z "$(git log "$S"..HEAD -- src/server src/core src/shared package.json package-lock.json tsconfig.main.json .node-version)"` → exit 0 |

## 4. Verify the pick

The heading of T51 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T51a`,
  `T51b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T51): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-46.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T51 (branch lane/T51)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T51","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
