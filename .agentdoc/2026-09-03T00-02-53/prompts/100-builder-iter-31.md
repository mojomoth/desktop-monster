# Lane T36 — Builder (iteration 31)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T36
"PvP resolution in core (shared with the server)" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T36 (branch `lane/T36`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T36. The main checkout (two directories up) is off
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
   T36 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T36 — PvP resolution in core (shared with the server)
- AC: `npx vitest run tests/collection.test.ts && grep -q "export function resolvePvp" src/core/collection.ts && grep -q "resolvePvp wins with probability myPower over total and moves one random companion from the loser to the winner" tests/collection.test.ts && grep -q "resolvePvp with an empty loser roster steals nothing" tests/collection.test.ts && grep -q "resolvePvp never moves into a full roster of 30" tests/collection.test.ts && grep -q "resolvePvp is reproducible from its seed and draws exactly 2 rng values" tests/collection.test.ts` → exit 0
- Deps: T27
- Worker: claude
- Files: src/core/collection.ts, tests/collection.test.ts
- Notes: SPEC F37 (Assumption 34; GAME_DESIGN_V2 §6; SERVER_ARCHITECTURE §5 depends on it byte-for-byte). `resolvePvp(attacker, defender, rng) → { attackerWon, moved, attackerPower, defenderPower }`: powers = Σ `companionPower` over the FULL rosters; `p = total === 0n ? 0.5 : ratio(attackerPower, total)`; draw 1 `attackerWon = rng.next() < p`; draw 2 ALWAYS consumed `victim = loser[⌊rng.next() · loser.length⌋]` (null when the loser is empty); `moved = null` when the winner's roster already holds `ROSTER_CAP`. Exactly 2 draws per call — count them with a recording Rng. Statistical test: seeded 10000 trials, power 1:3 → win rate 22–28 % (Assumption 15). No bot/cooldown logic here (server, T40). Exported through the T27 `export *` barrel line — no barrel edit. Test titles verbatim in the AC.

Open task headings (context only — do NOT work on them):

### [~] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [~] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [ ] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
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

| F37 | PvP resolution (core) | `src/core/collection.ts` `resolvePvp(attacker, defender, rng) → { attackerWon, moved, attackerPower, defenderPower }` per Assumption 34: powers = Σ `companionPower` over the FULL rosters; `p = total === 0n ? 0.5 : ratio(attackerPower, total)`; draw 1 win roll; draw 2 victim index ALWAYS consumed (`⌊rng.next() · loser.length⌋`, null when the loser is empty); `moved = null` when the winner's roster already holds 30; exactly 2 draws; no bot/cooldown logic in core; shared byte-for-byte with the server (F45) | claude | `npx vitest run tests/collection.test.ts && grep -q "export function resolvePvp" src/core/collection.ts && grep -q "resolvePvp wins with probability myPower over total and moves one random companion from the loser to the winner" tests/collection.test.ts && grep -q "resolvePvp with an empty loser roster steals nothing" tests/collection.test.ts && grep -q "resolvePvp never moves into a full roster of 30" tests/collection.test.ts && grep -q "resolvePvp is reproducible from its seed and draws exactly 2 rng values" tests/collection.test.ts` → exit 0 |

## 4. Verify the pick

The heading of T36 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T36a`,
  `T36b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T36): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-31.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T36 (branch lane/T36)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T36","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
