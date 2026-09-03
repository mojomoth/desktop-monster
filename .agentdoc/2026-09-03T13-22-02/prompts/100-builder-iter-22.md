# Lane T75 — Builder (iteration 22)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T75
"Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T75 (branch `lane/T75`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T75. The main checkout (two directories up) is off
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
   T75 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
- AC: `npm run package && test -f release/DesMon-0.3.0-arm64.dmg && test -d release/mac-arm64/DesMon.app && (SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon > /tmp/desmon-pkg-smoke.log 2>&1; true) && grep -q SMOKE_OK /tmp/desmon-pkg-smoke.log && test -z "$(find release/mac-arm64/DesMon.app -path '*node_modules/pg/*' -print -quit)" && test -z "$(find release/mac-arm64/DesMon.app -path '*dist/electron/server/*' -print -quit)"` → exit 0
- Deps: T22, T74
- Worker: claude
- Files: README.md
- Notes: SPEC F79 + amended F25/F58, Assumption 50. The T01/T19/T52 electron-builder config is expected to satisfy this unchanged (`identity: null`, `npmRebuild` off, `files` excludes `dist/electron/server/**`, pg in devDependencies) — verify, do not rewrite; README only if the packaging section needs the 0.3.0 artifact names (T72 already wrote them — then leave README untouched). Runs the app binary → T22 dep. `npm run package` may take minutes; run it once, keep `release/` out of git.

Open task headings (context only — do NOT work on them):

### [~] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F25 | Unsigned macOS packaging | `npm run package` produces an unsigned arm64 dmg and .app under `release/` (version 0.3.0; the server build output is excluded via `!dist/electron/server/**`, F26) | `npm run package && test -f release/DesMon-0.3.0-arm64.dmg && test -d release/mac-arm64/DesMon.app` → exit 0 |
| F58 | Packaged 0.2.0 smoke | (v3: version literal 0.3.0, F79) The packaged app boots without interaction: running the `.app` binary with `SMOKE=1` prints `SMOKE_OK` (offline by code, temp `userData`, no menu window, no Accessibility prompt); `pg` and `dist/electron/server/**` never ship inside the .app (F26's `!dist/electron/server/**` exclusion and `pg` in devDependencies); a running dev instance is quit first (Assumption 40 isolates only SMOKE runs) | claude | `npm run package && test -f release/DesMon-0.3.0-arm64.dmg && test -d release/mac-arm64/DesMon.app && (SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon > /tmp/desmon-pkg-smoke.log 2>&1; true) && grep -q SMOKE_OK /tmp/desmon-pkg-smoke.log && test -z "$(find release/mac-arm64/DesMon.app -path '*node_modules/pg/*' -print -quit)"` → exit 0 |
| F79 | Packaged 0.3.0 smoke | The packaged app boots without interaction: running the `.app` binary with `SMOKE=1` prints `SMOKE_OK` (offline by code, temp `userData`, no menu window, no theft watcher, no Accessibility prompt); artifacts carry the 0.3.0 version; `pg` and `dist/electron/server/**` never ship inside the .app (F26's exclusion, `pg` in devDependencies); a running dev instance is quit first (Assumption 40 isolates only SMOKE runs); README artifact names follow | claude | `npm run package && test -f release/DesMon-0.3.0-arm64.dmg && test -d release/mac-arm64/DesMon.app && (SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon > /tmp/desmon-pkg-smoke.log 2>&1; true) && grep -q SMOKE_OK /tmp/desmon-pkg-smoke.log && test -z "$(find release/mac-arm64/DesMon.app -path '*node_modules/pg/*' -print -quit)" && test -z "$(find release/mac-arm64/DesMon.app -path '*dist/electron/server/*' -print -quit)"` → exit 0 |

## 4. Verify the pick

The heading of T75 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T75a`,
  `T75b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T75): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-22.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T75 (branch lane/T75)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T75","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
