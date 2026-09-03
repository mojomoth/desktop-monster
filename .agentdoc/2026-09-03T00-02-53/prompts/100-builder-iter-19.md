# Lane T24 — Builder (iteration 19)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T24
"SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T24 (branch `lane/T24`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T24. The main checkout (two directories up) is off
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
   T24 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
- AC: `npx vitest run tests/save.test.ts tests/engine.test.ts tests/renderer.test.ts tests/audio.test.ts tests/persistence.test.ts && grep -q "version: 2" src/core/save.ts && grep -q "export function upgradeSave" src/core/save.ts && grep -q "DEFAULT_SAVE is a fresh-game v2 save" tests/save.test.ts && grep -q "serialize then parse round-trips losslessly" tests/save.test.ts && grep -q "junk, missing and wrong-typed fields yield DEFAULT_SAVE values" tests/save.test.ts && grep -q "migrates a v1 save: numeric monsterHp becomes a digit string and companions default to empty" tests/save.test.ts && grep -q "invalid companion entries are dropped, valid ones kept, roster capped at 30" tests/save.test.ts && test "$(grep -c '^\s*it(' tests/save.test.ts)" -ge 11 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 16 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 51` → exit 0
- Deps: T23
- Worker: claude
- Files: src/core/save.ts, src/core/engine.ts, src/core/index.ts, src/renderer/game.ts, tests/save.test.ts, tests/engine.test.ts, tests/renderer.test.ts
- Notes: SPEC F29 (Assumptions 7/21; GAME_DESIGN_V2 §2). 7 files by design: the schema and every consumer must move together or typecheck fails (do not split) — two are type-only edits: `src/renderer/game.ts` `toSave(): SaveFileV1` (interface + impl, lines ~202/418) becomes `toSave(): SaveFile`; `tests/renderer.test.ts` only rewrites `stateFixture` as `{ ...createEngine(null, mulberry32(1)).getState(), ...overrides }` so later `GameState` field additions never break fixtures again. save.ts: `Companion { id, speciesId, bossIndex, level, stars }`, `SaveFileV2` (Assumption 21), `type SaveFile = SaveFileV2`, `SaveFileV1` kept as the legacy input shape, `DEFAULT_SAVE` (version 2, level 1, `monsterHp: String(monsterMaxHp(0))` = `'10'`, companions `[]`, nextCompanionId 1, souls/rebirths/bestIndex 0), `upgradeSave(V1 | V2) → V2` (v1: `monsterHp = String(Math.max(1, Math.floor(hp)))`, `bestIndex = monsterIndex`, companions `[]`, nextCompanionId 1), `parseSave` per-field rules (numbers floored + clamped to min — level/nextCompanionId ≥ 1, rest ≥ 0; items v1 rule; `monsterHp` via `bigField` from T23 with `'0'` → `'1'`; companions: keep entries with non-empty string id, `speciesId ∈ SPECIES_IDS`, integer `bossIndex ≥ 0`, integer `1 ≤ level ≤ 10`, integer `stars ≥ 0`, duplicate ids dropped first-wins, truncated to 30; `nextCompanionId` additionally raised to `1 + max(numeric part of ids)`; version ignored on input, always 2 on output), `serializeSave(V1 | V2)` upgrades first, fixed key order, sorted item keys, companions in array order. engine.ts: `createEngine(save?: SaveFileV1 | SaveFileV2 | null, rng?)` upgrades internally; `GameState` gains companions/nextCompanionId/souls/rebirths/bestIndex (carried through from the save, NO logic yet); engine stays number-based inside (`Number(save.monsterHp)` on resume, `String(hp)` in `toSave`) — T25 flips it. Barrel re-exports `upgradeSave` (value) and `Companion, SaveFile, SaveFileV2` (types). Test edits (§1 policy): `richSave` → V2 literal (`version: 2`, `monsterHp: '77'`, companions, nextCompanionId, souls, rebirths, bestIndex), round-trip stays `toEqual(richSave)`; "DEFAULT_SAVE is a fresh-game v1 save" retitled to "DEFAULT_SAVE is a fresh-game v2 save" with `monsterHp` `toBe(String(monsterMaxHp(0)))`; junk case `monsterHp: 10n` keeps its assertion (bigint is not JSON → default); `monsterHp: 0` → `'1'`; `tests/engine.test.ts` `makeSave()` stays a V1 literal. F10 titles verbatim; `it(` counts: save ≥ 11 (currently 9), engine ≥ 16, renderer ≥ 51. `src/main/persistence.ts`, `tests/persistence.test.ts`, `tests/audio.test.ts` untouched (their V1 literals still type-check). NEVER write the word `token` anywhere in src/core/save.ts (T38's AC greps `! grep -q token src/core/save.ts`).

Open task headings (context only — do NOT work on them):

### [~] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version, SMOKE userData isolation
### [~] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1 or V2
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

| F10 | Save schema & tolerant parsing | `src/core/save.ts`: schema is `SaveFileV2 {version:2, level, xp, killCount, coins, items, monsterIndex, monsterHp: string, companions, nextCompanionId, souls, rebirths, bestIndex}` (F29); `SaveFileV1` stays as the legacy input shape and `upgradeSave` migrates it; `serializeSave(V1 or V2)` stable (fixed key order, sorted item keys); `parseSave(raw)` never throws — junk/missing/wrong types → `DEFAULT_SAVE` values per field | tests `tests/save.test.ts :: "serialize then parse round-trips losslessly"` and `:: "junk, missing and wrong-typed fields yield DEFAULT_SAVE values"` exist and pass; `grep -q "export function upgradeSave" src/core/save.ts` → exit 0 |
| F29 | SaveFileV2 + v1 migration | `src/core/save.ts`: `Companion`, `SaveFileV2` (Assumption 21), `DEFAULT_SAVE` (version 2, level 1, `monsterHp: String(monsterMaxHp(0))`, companions `[]`, nextCompanionId 1, souls/rebirths/bestIndex 0), `upgradeSave(V1 or V2) → V2` (v1: `monsterHp = String(max(1, floor))`, `bestIndex = monsterIndex`), `parseSave` per-field rules of GAME_DESIGN_V2 §2 (companions: valid entries only — non-empty string id, `speciesId ∈ SPECIES_IDS`, integer `bossIndex ≥ 0`, `1 ≤ level ≤ 10`, integer `stars ≥ 0`; duplicate ids dropped first-wins; truncated to 30; `nextCompanionId` raised above ids), `serializeSave` and `createEngine` accept V1 or V2; `GameState` gains companions/nextCompanionId/souls/rebirths/bestIndex; `tests/renderer.test.ts` `stateFixture` becomes `{ ...createEngine(null, mulberry32(1)).getState(), ...overrides }`; `persistence.ts` untouched; all F10 test titles verbatim | claude | `npx vitest run tests/save.test.ts tests/engine.test.ts tests/renderer.test.ts tests/audio.test.ts tests/persistence.test.ts && grep -q "version: 2" src/core/save.ts && grep -q "export function upgradeSave" src/core/save.ts && grep -q "DEFAULT_SAVE is a fresh-game v2 save" tests/save.test.ts && grep -q "serialize then parse round-trips losslessly" tests/save.test.ts && grep -q "junk, missing and wrong-typed fields yield DEFAULT_SAVE values" tests/save.test.ts && grep -q "migrates a v1 save: numeric monsterHp becomes a digit string and companions default to empty" tests/save.test.ts && grep -q "invalid companion entries are dropped, valid ones kept, roster capped at 30" tests/save.test.ts && test "$(grep -c '^\s*it(' tests/save.test.ts)" -ge 11 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 16 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 51` → exit 0 |

## 4. Verify the pick

The heading of T24 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T24a`,
  `T24b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T24): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-19.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T24 (branch lane/T24)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T24","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
