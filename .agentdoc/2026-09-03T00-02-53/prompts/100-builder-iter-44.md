# Lane T49 — Builder (iteration 44)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T49
"Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T49 (branch `lane/T49`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T49. The main checkout (two directories up) is off
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
   T49 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
- AC: `npx vitest run tests/menu.test.ts && grep -q "getLeaderboard" src/menu/index.ts && grep -q "pvp()" src/menu/index.ts && grep -q "setName" src/menu/index.ts && grep -q "getIdentity" src/menu/index.ts && grep -q "type: 'pvpResult'" src/menu/index.ts && grep -q "type: 'removeCompanions'" src/menu/index.ts && grep -q "leaderboard rows render rank, name, deepest monster and rebirths" tests/menu.test.ts && grep -q "offline or failed results render an Offline row" tests/menu.test.ts && grep -q "pvp result text names the stolen or lost companion and the cooldown" tests/menu.test.ts && grep -q "battle button is disabled with no companions or during cooldown" tests/menu.test.ts && grep -q "a successful pvp is forwarded to the game as a pvpResult action" tests/menu.test.ts` → exit 0
- Deps: T48
- Worker: claude
- Files: src/menu/index.ts, src/menu/view.ts, static/menu.html, tests/menu.test.ts
- Notes: SPEC F55 (Assumptions 31–34); GAME_DESIGN_V2 §9/§10; wire/IPC shapes SERVER_ARCHITECTURE §2/§6. view.ts: `leaderboardRows(result: NetResult<LeaderboardResult>)` (rows rank/name/deepest/rebirths; `ok: false` → one `Offline` or `Cooldown` row), `pvpResultText(result)` (names the stolen or lost companion and the cooldown), `battleEnabled(save, cooldownUntil)` (false with 0 companions or during the countdown). index.ts: Ranking tab → `getLeaderboard(n?)` on tab open; Battle tab → name field (`setName(name)` on change, shows the returned `IdentityPayload.name`, ≤ 16 chars) and ONE `Battle!` button → `pvp()` (opponent chosen by the server). After a successful `leaderboard()`/`pvp()`: if `value.removed.length` → `sendAction({ type: 'removeCompanions', ids: value.removed })` FIRST (the spelling `type: 'removeCompanions'` is grep-pinned), then (pvp only) `sendAction({ type: 'pvpResult', won: r.value.win, stolen: r.value.stolen, lostId: r.value.lost?.id ?? null })`, then the result text; `cooldown` → client countdown from `retryAfterSec`. `getIdentity().online === false` → tabs render `Offline` immediately without calling the network. Main never pushes roster changes — this menu forwarding is the only path. Test titles verbatim in the AC. Never import electron/net (T48 guard stays).

Open task headings (context only — do NOT work on them):

### [~] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F55 | Menu ranking and battle | `src/menu/view.ts`: `leaderboardRows(result)` (rows rank/name/deepest/rebirths; `ok: false` → one `Offline` or `Cooldown` row), `pvpResultText(result)` (names the stolen or lost companion and the cooldown), `battleEnabled(save, cooldownUntil)` (false with 0 companions or during the countdown); `src/menu/index.ts`: Ranking tab → `getLeaderboard(n?)` on open; Battle tab → name field (`setName(name)` on change, shows the returned `IdentityPayload.name`; ≤ 16 chars) and ONE `Battle!` button → `pvp()` (opponent chosen by the server); after a successful `leaderboard()`/`pvp()`: `value.removed.length` → `sendAction({ type: 'removeCompanions', ids })` first, then (pvp only) `sendAction({ type: 'pvpResult', won: win, stolen, lostId: lost?.id ?? null })`, then the result text; `cooldown` → client countdown from `retryAfterSec`; `getIdentity().online === false` → tabs render `Offline` without calling the network | claude | `npx vitest run tests/menu.test.ts && grep -q "getLeaderboard" src/menu/index.ts && grep -q "pvp()" src/menu/index.ts && grep -q "setName" src/menu/index.ts && grep -q "getIdentity" src/menu/index.ts && grep -q "type: 'pvpResult'" src/menu/index.ts && grep -q "type: 'removeCompanions'" src/menu/index.ts && grep -q "leaderboard rows render rank, name, deepest monster and rebirths" tests/menu.test.ts && grep -q "offline or failed results render an Offline row" tests/menu.test.ts && grep -q "pvp result text names the stolen or lost companion and the cooldown" tests/menu.test.ts && grep -q "battle button is disabled with no companions or during cooldown" tests/menu.test.ts && grep -q "a successful pvp is forwarded to the game as a pvpResult action" tests/menu.test.ts` → exit 0 |

## 4. Verify the pick

The heading of T49 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T49a`,
  `T49b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T49): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-44.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T49 (branch lane/T49)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T49","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
