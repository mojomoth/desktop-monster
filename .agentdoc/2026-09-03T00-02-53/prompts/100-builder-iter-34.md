# Lane T29 — Builder (iteration 34)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T29
"Fever core: pure tracker on the engine clock, tick(dt), ×3 damage" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T29 (branch `lane/T29`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T29. The main checkout (two directories up) is off
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
   T29 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
- AC: `npx vitest run tests/fever.test.ts tests/engine.test.ts && grep -q "FEVER_INPUTS = 20" src/core/fever.ts && grep -q "FEVER_MULT = 3n" src/core/fever.ts && grep -q "tick(dtMs: number)" src/core/engine.ts && grep -q "20 inputs within 3000ms start fever, 19 do not" tests/fever.test.ts && grep -q "fever lasts 5000ms, triples damage, then cools down for 10000ms" tests/fever.test.ts && grep -q "fever never persists: toSave has no fever field" tests/fever.test.ts && grep -q "engine time advances only through tick" tests/fever.test.ts && ! grep -rq "Date.now(" src/core` → exit 0
- Deps: T25
- Worker: claude
- Files: src/core/fever.ts, src/core/engine.ts, src/core/types.ts, src/core/index.ts, tests/fever.test.ts
- Notes: SPEC F34 (Assumptions 25/39; GAME_DESIGN_V2 §5). fever.ts: `FEVER_INPUTS = 20`, `FEVER_WINDOW_MS = 3000`, `FEVER_MS = 5000`, `FEVER_COOLDOWN_MS = 10000`, `FEVER_MULT = 3n`; `Fever { stamps, activeUntil, cooldownUntil }` readonly; `createFever()`, `feverInput(f, nowMs) → { fever, started }` (keeps the last 20 stamps; starts iff 20 stamps && now − oldest ≤ 3000 && !active && now ≥ cooldownUntil; stamps cleared on start), `feverTick(f, nowMs) → { fever, ended }` (ended when active && now ≥ activeUntil → `cooldownUntil = now + FEVER_COOLDOWN_MS`), `feverActive(f, nowMs)`. Engine: owns `clockMs`, advanced ONLY by `tick(dtMs: number): GameEvent[]` (this task introduces `tick`; non-finite/negative dt → 0; runs `feverTick` first → `feverEnd`; T30 adds the volley to the same method); `attack()` stamps `clockMs` and may emit `feverStart` BEFORE that input's `attack` event (fever applies to it); hero damage `* FEVER_MULT` while active; `GameState.fever = { active, remainingMs }`; NOT persisted (`toSave()` has no fever field); `attack` event shape unchanged (v1 `toEqual` assertions hold). SOURCE GUARD: the AC runs `! grep -rq "Date.now(" src/core` — never write the literal `Date.now(` anywhere in src/core, comments included. Tests: `attack() × 20 → feverStart`, `tick(5000) → feverEnd`, `attack() × 20` inside the cooldown → nothing; titles verbatim in the AC. Barrel: `export * from './fever.js';`. Shares engine.ts/types.ts with T26/T28 — whichever lands second merges the damage formula (`level × crit × fever × (1 + souls)`), never drops the other's factor.

Open task headings (context only — do NOT work on them):

### [~] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T39 — Server store + createApp: register, upload snapshot, leaderboard, rate limit, 404/500
### [ ] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [ ] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [~] T45 — Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync
### [ ] T46 — Menu window + tray item "Collection & Battle…"
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F34 | Fever mode | `src/core/fever.ts`: `FEVER_INPUTS = 20`, `FEVER_WINDOW_MS = 3000`, `FEVER_MS = 5000`, `FEVER_COOLDOWN_MS = 10000`, `FEVER_MULT = 3n`; pure `createFever`, `feverInput(f, nowMs)` (keeps the last 20 stamps; starts iff 20 stamps within 3000 ms, not active, past cooldown; stamps cleared on start), `feverTick(f, nowMs)` (ended → `cooldownUntil = now + 10000`), `feverActive(f, nowMs)`; engine owns `clockMs` advanced ONLY by `tick(dtMs)` (Assumption 39); `attack()` stamps the clock and may emit `feverStart` before that input's `attack` event; `tick` runs `feverTick` first and emits `feverEnd`; hero damage ×3 while active; `GameState.fever { active, remainingMs }`; never persisted; `attack` event shape unchanged | claude | `npx vitest run tests/fever.test.ts tests/engine.test.ts && grep -q "FEVER_INPUTS = 20" src/core/fever.ts && grep -q "FEVER_MULT = 3n" src/core/fever.ts && grep -q "tick(dtMs: number)" src/core/engine.ts && grep -q "20 inputs within 3000ms start fever, 19 do not" tests/fever.test.ts && grep -q "fever lasts 5000ms, triples damage, then cools down for 10000ms" tests/fever.test.ts && grep -q "fever never persists: toSave has no fever field" tests/fever.test.ts && grep -q "engine time advances only through tick" tests/fever.test.ts && ! grep -rq "Date.now(" src/core` → exit 0 |

## 4. Verify the pick

The heading of T29 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T29a`,
  `T29b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T29): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-34.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T29 (branch lane/T29)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T29","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
