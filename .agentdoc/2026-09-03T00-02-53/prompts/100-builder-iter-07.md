# Lane T23 — Builder (iteration 07)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T23
"Core bignum: A–Z suffix format, ratio, bigField" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T23 (branch `lane/T23`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T23. The main checkout (two directories up) is off
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
   T23 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T23 — Core bignum: A–Z suffix format, ratio, bigField
- AC: `npx vitest run tests/bignum.test.ts && grep -q "export function format" src/core/bignum.ts && grep -q "formats 1000 as 1.00A, 12345 as 12.3A, 123456 as 123A and 1000000 as 1.00B" tests/bignum.test.ts && grep -q "suffix 1/26/27/702/703 is A/Z/AA/ZZ/AAA" tests/bignum.test.ts && grep -q "format truncates and never rounds: 999999 is 999A" tests/bignum.test.ts && grep -q "ratio divides bigints into a clamped number" tests/bignum.test.ts && grep -q "bigField accepts finite numbers and digit strings and rejects everything else" tests/bignum.test.ts` → exit 0
- Deps: none
- Worker: claude
- Files: src/core/bignum.ts, src/core/index.ts, tests/bignum.test.ts
- Notes: SPEC F28 (Assumption 20; GAME_DESIGN_V2 §1). Head of the core chain — pure new module, no callers yet. `suffix(g)` bijective base-26 (1→A, 26→Z, 27→AA, 52→AZ, 53→BA, 702→ZZ, 703→AAA; g ≤ 0 → `''`); `format(n: bigint | number)`: `s = n.toString()`; `s.length ≤ 3` → `s`; else `d = s.length`, `g = ⌊(d − 1) / 3⌋`, `lead = d − 3g`, `m = s.slice(0, 3)`, text = (`lead === 3` ? `m` : `m.slice(0, lead) + '.' + m.slice(lead)`) + `suffix(g)` — truncation, never rounding; negative/non-finite number → `'0'`. Value table to test literally: 999 → `999`, 1000 → `1.00A`, 12345 → `12.3A`, 123456 → `123A`, 999999 → `999A`, 1e6 → `1.00B`, 1e9 → `1.00C`, 10n**78n → `1.00Z`, 10n**81n → `1.00AA`, 10n**2106n → `1.00ZZ`, 10n**2109n → `1.00AAA`. `ratio(num, den)`: `den ≤ 0n` → 0 else `Number(num * 10000n / den) / 10000` clamped to [0, 1]. `bigField(raw)`: finite number → `String(Math.max(0, Math.floor(n)))`; `/^\d+$/` string → itself; everything else (incl. bigint input, `'007'` is acceptable as digits) → null. Barrel: the core barrel uses NAMED export lists — add `export { bigField, format, ratio, suffix } from './bignum.js';`. Test titles verbatim in the AC. Core imports nothing from electron/DOM/node.
- Notes (iter 02, claude): MERGE_RED: merge reverted (gates=fail smoke=skipped); Added src/core/bignum.ts (suffix bijective base-26, format per Assumption 20 truncation rule, ratio clamped via *10000n/den, bigField), the named barrel line in src/core/index.ts, and tests/bignum.test.ts (7 tests, AC titles verbatim, full value table 999..10^2109, negatives/non-finite, ratio clamp, bigField accept/reject incl. bigint and '007'). format normalizes number input through BigInt(Math.floor(n)) after the finite check so >=1e21 doubles cannot leak exponent notation; negative bigint also -> '0'. Gates green (310 tests, lint, typecheck); AC exit=0. No dead ends — first attempt green.
- Notes (iter 04, claude): MERGE_RED: merge reverted (gates=fail smoke=skipped); Root-caused iter-02's MERGE_RED: its `git add -A` committed the node_modules/graphify-out SYMLINKS, because .gitignore uses trailing-slash patterns that match directories only. Merging replaced main's real node_modules with a self-referential symlink, so npm died with the 'stdin' error. Code was never at fault. Restored the implementation from the reachable pre-revert commit 156e60a, re-verified the full value table, ran npm ci in the lane (its symlink was dangling), and committed EXPLICIT PATHS, not -A. Gates green: 310 tests, lint, typecheck; AC exit=0.
- Notes (iter 06, claude): MERGE_RED: merge reverted (gates=fail smoke=skipped); Restored the verified bignum impl from reachable commit 156e60a (suffix bijective base-26, format per Assumption 20 truncation, ratio clamped, bigField), re-added the named barrel line, re-checked the whole value table 999..10^2109 by hand. Gates green: 310 tests, lint, typecheck; AC exit=0. Dead ends: BOTH prior MERGE_REDs were `git add -A` committing the node_modules/graphify-out SYMLINKS — .gitignore's trailing-slash patterns match directories only, so iter 04's 'explicit paths' still carried graphify-out. Committed 4 explicit paths, verified none in the tree. Also: main's node_modules was 

Open task headings (context only — do NOT work on them):

### [~] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
### [~] T23 — Core bignum: A–Z suffix format, ratio, bigField
### [ ] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
### [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex, souls damage
### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [~] T31 — Pixel font: full A–Z plus . : - + % glyphs
### [ ] T32 — Effects module: data-driven presets on the particle pool, per-species hit effects
### [ ] T33 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T35 — Menu window pixel theme: DB16 CSS, pixelated species canvases
### [ ] T36 — PvP resolution in core (shared with the server)
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [ ] T38 — Client identity.json, shared API wire types, serverUrl constant
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

| F28 | A–Z number format | `src/core/bignum.ts` exports `suffix(g)` (bijective base-26: 1→A, 26→Z, 27→AA, 702→ZZ, 703→AAA, g ≤ 0 → `''`), `format(n: bigint or number)` (Assumption 20 rule: `s = n.toString()`; ≤ 3 digits verbatim; else `g = ⌊(d−1)/3⌋`, 3 leading digits with a dot after `d − 3g` of them, + `suffix(g)`; truncation never rounding; negative/non-finite number → `'0'`), `ratio(num, den)` (den ≤ 0n → 0; else `Number(num*10000n/den)/10000` clamped to [0, 1]) and `bigField(raw)` (finite number → `String(max(0, floor))`; `/^\d+$/` string → itself; else null, bigint input included); barrel re-exports | claude | `npx vitest run tests/bignum.test.ts && grep -q "export function format" src/core/bignum.ts && grep -q "formats 1000 as 1.00A, 12345 as 12.3A, 123456 as 123A and 1000000 as 1.00B" tests/bignum.test.ts && grep -q "suffix 1/26/27/702/703 is A/Z/AA/ZZ/AAA" tests/bignum.test.ts && grep -q "format truncates and never rounds: 999999 is 999A" tests/bignum.test.ts && grep -q "ratio divides bigints into a clamped number" tests/bignum.test.ts && grep -q "bigField accepts finite numbers and digit strings and rejects everything else" tests/bignum.test.ts` → exit 0 |

## 4. Verify the pick

The heading of T23 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T23a`,
  `T23b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T23): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-07.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T23 (branch lane/T23)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T23","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
