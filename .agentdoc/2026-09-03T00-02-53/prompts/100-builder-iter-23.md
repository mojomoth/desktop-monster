# Lane T25 — Builder (iteration 23)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T25
"BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T25 (branch `lane/T25`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T25. The main checkout (two directories up) is off
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
   T25 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
- AC: `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/renderer.test.ts tests/save.test.ts tests/audio.test.ts && grep -q "115n" src/core/formulas.ts && grep -q "maxHp: bigint" src/core/types.ts && grep -q "monsterMaxHp is exactly 10/20/40/163 at index 0/5/10/20" tests/formulas.test.ts && grep -q "monsterMaxHp is exact for huge indices: index 5000 has 305 digits" tests/formulas.test.ts && grep -q "drawHpBar takes bigint hp and maxHp" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 16 && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 11 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 52` → exit 0
- Deps: T24
- Worker: claude
- Files: src/core/formulas.ts, src/core/types.ts, src/core/engine.ts, src/renderer/hud.ts, tests/formulas.test.ts, tests/engine.test.ts, tests/renderer.test.ts
- Notes: SPEC F30 (Assumptions 18/19/36; GAME_DESIGN_V2 §1). EXEMPT from the 5-file cap by design: a DELIBERATE 7-file atomic task — the repo cannot be green with bigint HP in core but number in hud/tests; do NOT split. `monsterMaxHp` is exactly one line: `const i = BigInt(Math.max(0, Math.floor(index))); return (10n * 115n ** i) / 100n ** i;` (equals the v1 double for every i < 199; index 5000 → 305 digits). `GameState.monsterHp`, `MonsterDef.maxHp`, `attack.damage`, `monsterHit.hpAfter/maxHp` → `bigint`; hero damage `BigInt(damageForLevel(level)) * (crit ? BigInt(CRIT_MULT) : 1n)`; resume `BigInt(save.monsterHp)` clamped to `[1n, maxHp]`; `toSave()` → `String(hp)`; `drawHpBar(ctx, x, y, w, h, hp: bigint, maxHp: bigint)` fills via `ratio()` (T23). `loot.ts` untouched; `game.ts` needs no edit (`String(bigint)` already compiles). Assertions change TYPE only, every `it(` survives: `tests/formulas.test.ts` `toBe(10)`/`20`/`40`/`163` → `10n`/`20n`/`40n`/`163n`, the "positive integers and strictly increasing" helper compares bigints with `>` (or maps through `Number`), add "monsterMaxHp is exact for huge indices: index 5000 has 305 digits" (≥ 11 tests); `tests/engine.test.ts` `makeSave()` stays V1 with `monsterHp: Number(monsterMaxHp(monsterIndex))`, `toBe(10)` → `10n`, `9` → `9n`, `5` → `5n`, `7` → `7n`, `{ monsterHp: number }` casts → `bigint`, `expect(save.monsterHp).toBe(String(a.getState().monsterHp))`; `tests/renderer.test.ts` `attackOnly` `damage: 1n`, `hpAfter: 9n, maxHp: 10n`, `drawHpBar(ctx, 0, 0, 34, 5, 1n, 1000n)` / `5n, 10n`, add "drawHpBar takes bigint hp and maxHp" (≥ 52). `tests/save.test.ts`/`tests/audio.test.ts` run in the AC but are not edited. vitest 3.2.7 matchers accept bigint. Keep the "same seed yields an identical event log" test green — no rng draw is added here.

Open task headings (context only — do NOT work on them):

### [~] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
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

| F30 | Unbounded HP and damage | Atomic bigint cutover (Assumption 18/19/36): `monsterMaxHp(i) = (10n*115n**i)/100n**i` in `src/core/formulas.ts`; `GameState.monsterHp`, `MonsterDef.maxHp`, `attack.damage`, `monsterHit.hpAfter/maxHp` are `bigint` in `src/core/types.ts`; hero damage `BigInt(damageForLevel(level)) * (crit ? BigInt(CRIT_MULT) : 1n)`; resume clamp `[1n, maxHp]`; `drawHpBar(ctx, x, y, w, h, hp: bigint, maxHp: bigint)` via `ratio()`; every existing assertion keeps its VALUE and changes only its type (`10` → `10n`); no `it(` deleted, skipped or merged | claude | `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/renderer.test.ts tests/save.test.ts tests/audio.test.ts && grep -q "115n" src/core/formulas.ts && grep -q "maxHp: bigint" src/core/types.ts && grep -q "monsterMaxHp is exactly 10/20/40/163 at index 0/5/10/20" tests/formulas.test.ts && grep -q "monsterMaxHp is exact for huge indices: index 5000 has 305 digits" tests/formulas.test.ts && grep -q "drawHpBar takes bigint hp and maxHp" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 16 && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 11 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 52` → exit 0 |

## 4. Verify the pick

The heading of T25 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T25a`,
  `T25b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T25): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-23.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T25 (branch lane/T25)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T25","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
