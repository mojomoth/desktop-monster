# Lane T55 — Builder (iteration 02)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T55
"Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T55 (branch `lane/T55`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T55. The main checkout (two directories up) is off
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
   T55 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T55 — Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type
- AC: `npx vitest run tests/typeChart.test.ts tests/formulas.test.ts && grep -q "export function effectivePower" src/core/types-chart.ts && grep -q "SUPER = 2n" src/core/types-chart.ts && grep -q "export const SPECIES_SIZE" src/core/monsters.ts && grep -q "export function typeOf" src/core/monsters.ts && grep -q "type: MonsterType" src/core/types.ts && grep -q "every type beats the next two in the cycle and loses to the previous two" tests/typeChart.test.ts && grep -q "effectivePower doubles on super, halves on weak with a floor of 1" tests/typeChart.test.ts && grep -q "all 25 chart cells are pinned: 10 super, 10 weak, 5 normal" tests/typeChart.test.ts && grep -q "each species has a fixed type and a hidden size" tests/formulas.test.ts && test "$(grep -c '^\s*it(' tests/typeChart.test.ts)" -ge 4 && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 13` → exit 0
- Deps: none
- Worker: claude
- Files: src/core/types-chart.ts, src/core/monsters.ts, src/core/types.ts, src/core/index.ts, tests/typeChart.test.ts, tests/formulas.test.ts
- Notes: SPEC F59, Assumptions 42–43; GAME_DESIGN_V3 §1–§2. New pure `src/core/types-chart.ts`: `MonsterType`, `TYPE_ORDER` (fire → wind → earth → water → dark), `export type Effectiveness = 'super' | 'weak' | 'normal'`, `SUPER = 2n`, `WEAK_DIV = 2n`, `beats(a, d)` = `((idx(d) - idx(a) + 5) % 5) ∈ {1, 2}`, `effectiveness(a, d)` (same type → normal), `effectivePower(power, a, d)` (super → `power * SUPER`; weak → `max(1n, power / WEAK_DIV)`; normal → power). `monsters.ts`: `SPECIES_TYPE` (slime water, bat wind, ghost dark, golem earth, dragon fire), `SPECIES_SIZE` (slime 1, bat 1, ghost 2, golem 3, dragon 3), `typeOf(speciesId)` (unknown → `'water'`, never throws), `sizeOf(speciesId)` (unknown → 1); `MonsterDef.type: MonsterType` filled from the species (bosses keep it); catalog order, `BOSS_EVERY`, HP/XP/coin formulas unchanged. Barrel exports everything (renderer/sprites and hud import `sizeOf`/`MonsterType`/`Effectiveness` from `../core/index.js`). Test titles verbatim: "every type beats the next two in the cycle and loses to the previous two", "effectivePower doubles on super, halves on weak with a floor of 1", "all 25 chart cells are pinned: 10 super, 10 weak, 5 normal" + one more in tests/typeChart.test.ts (new file, ≥ 4 `it(`), "each species has a fixed type and a hidden size" in tests/formulas.test.ts (12 → ≥ 13). Any test that builds a `MonsterDef` literal must gain `type` (value change only; never delete an `it(`). Size is never displayed as a number.

Open task headings (context only — do NOT work on them):

### [~] T54 — Server v3 scaffold: src/server thefts column + Store.setThefts, in-memory match store, POST /v1/pvp/match, v3 wire types
### [~] T55 — Type chart + species type/size: types-chart.ts, SPECIES_TYPE/SPECIES_SIZE, MonsterDef.type
### [ ] T56 — SaveFileV3 + pvpParty migration + GameState.pvpParty
### [ ] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
### [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T62 — Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78
### [ ] T63 — Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows
### [ ] T64 — HUD/effects for the battle scene: floatColor(effectiveness) in hud.ts, hitColorOf(speciesId) in effects.ts
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T70 — Menu window 420×640 + Battle tab v3 markup + view.ts (opponentRows, partyPreview, togglePick, theftRows, battleEnabled)
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F59 | Type chart and species attributes | `src/core/types-chart.ts` (new, pure): `MonsterType` (`'fire'`, `'wind'`, `'earth'`, `'water'`, `'dark'`), `TYPE_ORDER` (the cycle), `SUPER = 2n`, `WEAK_DIV = 2n`, `beats(a, d)` (`((idx(d) − idx(a) + 5) % 5)` ∈ {1, 2}), `effectiveness(a, d)` (`'super'`, `'weak'` or `'normal'`; same type → normal), `effectivePower(power, a, d)` (super → `power * SUPER`; weak → `max(1n, power / WEAK_DIV)`; normal → power); `src/core/monsters.ts`: `SPECIES_TYPE` (slime water, bat wind, ghost dark, golem earth, dragon fire), `SPECIES_SIZE` (slime 1, bat 1, ghost 2, golem 3, dragon 3 — hidden), `typeOf(speciesId)` (unknown → `'water'`, never throws), `sizeOf(speciesId)` (unknown → 1); `MonsterDef.type: MonsterType` (bosses keep the species type); catalog order, `BOSS_EVERY`, HP/XP/coin formulas unchanged; barrel exports (GAME_DESIGN_V3 §1–§2, Assumptions 42–43) | claude | `npx vitest run tests/typeChart.test.ts tests/formulas.test.ts && grep -q "export function effectivePower" src/core/types-chart.ts && grep -q "SUPER = 2n" src/core/types-chart.ts && grep -q "export const SPECIES_SIZE" src/core/monsters.ts && grep -q "export function typeOf" src/core/monsters.ts && grep -q "type: MonsterType" src/core/types.ts && grep -q "every type beats the next two in the cycle and loses to the previous two" tests/typeChart.test.ts && grep -q "effectivePower doubles on super, halves on weak with a floor of 1" tests/typeChart.test.ts && grep -q "all 25 chart cells are pinned: 10 super, 10 weak, 5 normal" tests/typeChart.test.ts && grep -q "each species has a fixed type and a hidden size" tests/formulas.test.ts && test "$(grep -c '^\s*it(' tests/typeChart.test.ts)" -ge 4 && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 13` → exit 0 |

## 4. Verify the pick

The heading of T55 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T55a`,
  `T55b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T55): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-02.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T55 (branch lane/T55)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T55","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
