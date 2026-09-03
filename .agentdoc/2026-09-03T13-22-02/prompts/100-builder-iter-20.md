# Lane T72 — Builder (iteration 20)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T72
"Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T72 (branch `lane/T72`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T72. The main checkout (two directories up) is off
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
   T72 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
- AC: `node -e "process.exit(require('./package.json').version==='0.3.0'&&require('./package-lock.json').version==='0.3.0'?0:1)" && grep -q "DesMon v0.3.0" src/main/tray.ts && grep -qi "type chart" README.md && grep -qi "reclaim" README.md && grep -qi "replay" README.md && grep -qi "notification" README.md && grep -q "480" README.md && grep -q "desmon-server-v3" README.md && grep -q "DesMon-0.3.0-arm64.dmg" README.md && grep -qi leaderboard README.md && grep -qi pvp README.md && grep -qi fever README.md && grep -qi rebirth README.md && grep -qi companion README.md && grep -qi boss README.md && grep -q "M15" SPEC.md && grep -q "M20" SPEC.md && npx vitest run tests/tray.test.ts tests/packaging.test.ts && test "$(grep -c '^\s*it(' tests/packaging.test.ts)" -ge 14 && test "$(grep -c '^\s*it(' tests/tray.test.ts)" -ge 22` → exit 0
- Deps: T69, T71
- Worker: claude
- Files: package.json, package-lock.json, src/main/tray.ts, README.md, SPEC.md, tests/packaging.test.ts, tests/tray.test.ts
- Notes: SPEC F76 + amended F23/F57, Assumption 50; GAME_DESIGN_V3 §10. Bump ONLY the two top-level `version` fields to `0.3.0` (package.json + package-lock.json, as T50 did — no `npm install`, no dependency change); `TRAY_TITLE = 'DesMon v0.3.0'` (tests/tray.test.ts pins the title VALUE and the menu ORDER "title, status, separator, Collection & Battle, Reset Progress, Quit" — extend/adjust values, never delete; ≥ 22 stays); tests/packaging.test.ts pins the artifact names (`DesMon-0.3.0-arm64.dmg`) and the `dist/**/*` files list (append-only; ≥ 14). README v3 sections: type chart + party of 5, PvP flow (Find opponent → party editor → Battle! → replay), steal / reclaim / native notification / 24 h window, battle replay, window size 480×300, the v3 server `desmon-server-v3` (branch `v3`; `DESMON_SERVER_URL` override kept), `DesMon-0.3.0-arm64.dmg`; keep every v2 keyword (leaderboard, pvp, fever, rebirth, companion, boss, `start:server`, `self-reported`, `DESMON_SERVER_URL`). SPEC.md: M15–M20 already exist (Spec Clarifier) — edit only if a manual-appendix gap shows up; otherwise leave SPEC.md untouched. tests/deploy.test.ts reads README (`DESMON_SERVER_URL`) — keep that line.

Open task headings (context only — do NOT work on them):

### [~] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F23 | Tray icon & menu | Tray icon is a 16×16 pixel matrix encoded to PNG in code (node:zlib deflate + CRC, no asset file) via `nativeImage.createFromBuffer`; menu: `DesMon v0.3.0` (disabled), input-mode status / "Grant Accessibility…" (opens the Privacy pane deep link), separator, `Collection & Battle…` (opens the menu window, F52), `Reset Progress`, `Quit`; menu rebuilds on mode change | `grep -q "Reset Progress" src/main/tray.ts && grep -q Quit src/main/tray.ts && grep -q deflateSync src/main/trayIcon.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "DesMon v0.3.0" src/main/tray.ts` → exit 0 (visibility/behavior: Manual M6) |
| F57 | Version 0.2.0 and docs | `package.json` and `package-lock.json` version `0.3.0` (v3, F76; was 0.2.0) (lock: only its two `version` fields); `TRAY_TITLE = 'DesMon v0.3.0'`; README sections: gameplay v2 (bosses every 8th, capture, companions/volley, fever, lifecycle + rebirth, A–Z numbers), Collection window, Ranking/PvP + `SERVER_URL`/`DESMON_SERVER_URL` override, offline behaviour, Render free-tier caveats, `npm run start:server`, artifact names 0.3.0 (every v1 README literal kept); SPEC.md M9–M14 present (written here; the task fills gaps only, never feature rows); `tests/packaging.test.ts` artifact-name pin follows the version | claude | `node -e "process.exit(require('./package.json').version==='0.3.0'&&require('./package-lock.json').version==='0.3.0'?0:1)" && grep -q "DesMon v0.3.0" src/main/tray.ts && grep -qi leaderboard README.md && grep -qi pvp README.md && grep -qi fever README.md && grep -qi rebirth README.md && grep -qi companion README.md && grep -qi boss README.md && grep -q "DesMon-0.3.0-arm64.dmg" README.md && grep -q "M9" SPEC.md && grep -q "M14" SPEC.md && npx vitest run tests/tray.test.ts tests/packaging.test.ts && test "$(grep -c '^\s*it(' tests/packaging.test.ts)" -ge 11` → exit 0 |
| F76 | Version 0.3.0 and docs | `package.json` and `package-lock.json` version `0.3.0` (lock: only its two `version` fields); `TRAY_TITLE = 'DesMon v0.3.0'`; README v3 sections: type chart (5-cycle, ×2 / ÷2), party of 5 (auto by effective power, overlap by hidden size), PvP flow (Find opponent → preview → manual party → Battle → replay in the overlay), steal 15 % / notification / 24 h reclaim, window 480×300, `desmon-server-v3` URL + `V2_SERVER_URL`, artifact names 0.3.0 (every v1/v2 README literal kept); SPEC.md M15–M20 present (written here; the task fills gaps only, never feature rows); `tests/packaging.test.ts` and `tests/tray.test.ts` literals follow the version | claude | `node -e "process.exit(require('./package.json').version==='0.3.0'&&require('./package-lock.json').version==='0.3.0'?0:1)" && grep -q "DesMon v0.3.0" src/main/tray.ts && grep -qi "type chart" README.md && grep -qi "reclaim" README.md && grep -qi "replay" README.md && grep -qi "notification" README.md && grep -q "480" README.md && grep -q "desmon-server-v3" README.md && grep -q "DesMon-0.3.0-arm64.dmg" README.md && grep -q "M15" SPEC.md && grep -q "M20" SPEC.md && npx vitest run tests/tray.test.ts tests/packaging.test.ts && test "$(grep -c '^\s*it(' tests/packaging.test.ts)" -ge 14 && test "$(grep -c '^\s*it(' tests/tray.test.ts)" -ge 22` → exit 0 |

## 4. Verify the pick

The heading of T72 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T72a`,
  `T72b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T72): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-20.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T72 (branch lane/T72)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T72","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
