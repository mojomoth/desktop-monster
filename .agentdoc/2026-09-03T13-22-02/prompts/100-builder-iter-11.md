# Lane T59 — Builder (iteration 11)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T59
"Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T59 (branch `lane/T59`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T59. The main checkout (two directories up) is off
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
   T59 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
- AC: `npx vitest run tests/engine.test.ts tests/collection.test.ts tests/fever.test.ts && grep -q "activeCompanions(state.companions, state.monster.type)" src/core/engine.ts && grep -q "effectiveness" src/core/types.ts && grep -q "replay?: BattleReplay" src/core/types.ts && grep -q "volley damage is type-adjusted and companionAttack carries effectiveness" tests/engine.test.ts && grep -q "the field party changes when a monster of another type spawns" tests/engine.test.ts && grep -q "pvpResult with a replay is applied exactly like one without" tests/engine.test.ts && grep -q "same seed yields an identical event log" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 30 && ! grep -rq "Date.now(" src/core` → exit 0
- Deps: T58
- Worker: claude
- Files: src/core/engine.ts, src/core/types.ts, tests/engine.test.ts
- Notes: SPEC F63, Assumptions 44/45; GAME_DESIGN_V3 §4–§5. Volley damage per member = `effectivePower(companionPower(c), typeOf(c.speciesId), state.monster.type)` (fever ×3 and never-crit rules unchanged); `GameEvent companionAttack` gains `effectiveness: Effectiveness`; `CollectionAction pvpResult` gains `replay?: BattleReplay` (structural `WireBlow`/`BattleReplay` copies declared in src/core/types.ts — core stays free of `src/shared` imports, damage as decimal string) which the engine IGNORES (applied exactly like one without; the renderer consumes it in T66). Test titles verbatim (tests/engine.test.ts 27 → ≥ 30): "volley damage is type-adjusted and companionAttack carries effectiveness", "the field party changes when a monster of another type spawns", "pvpResult with a replay is applied exactly like one without"; "same seed yields an identical event log" already exists — keep it green (seeded rng, injected clock, no `Date.now(`). Keep every F35 title ("tick with no companions emits nothing and never spends rng draws", "companion damage is tripled during fever and never crits").

Open task headings (context only — do NOT work on them):

### [~] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [ ] T68 — IPC v3: PVP_MATCH/THEFTS/RECLAIM channels, PVP payload, narrowAction setPvpParty + replay, preload, global.d.ts, sendToAll
### [ ] T69 — Theft watcher (main): createTheftWatcher with injected timers, native Notification, reclaim → addCompanion via sendToAll
### [ ] T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
### [ ] T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal
### [ ] T73 — Render deploy v3: desmon-server-v3 from branch v3, SERVER_URL baked, push HEAD:v3, deploy --wait, healthz + probe, AGENTS.md §Server
### [ ] T74 — Deploy re-verify v3: healthz sha ancestor of v3 HEAD, build-filter paths untouched, redeploy if stale
### [ ] T75 — Unsigned macOS packaging 0.3.0 + packaged SMOKE_OK, no pg and no server build inside the .app
### [ ] T76 — SPEC criteria sweep v3 (F01–F80, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F35 | Companion volley | `COMPANION_ATTACK_MS = 1000` in `src/core/engine.ts`; `tick(dt)` accumulates and fires `⌊dt/1000⌋` volleys (remainder kept); per volley, `party = activeCompanions(state.companions, state.monster.type)` (recomputed every volley) and each member in order deals `effectivePower(companionPower(c), typeOf(c.speciesId), monster.type) * (fever ? 3n : 1n)` (never crits) → events `companionAttack { companionId, speciesId, damage, effectiveness }` (v3, F63), `monsterHit`, then the shared kill chain via one `applyDamage(damage, events)` used by `attack()` and the volley; kills chain into the next monster inside the same volley and roll loot/capture like hero kills; no companions → no events and no rng draws | claude | `npx vitest run tests/engine.test.ts && grep -q "COMPANION_ATTACK_MS = 1000" src/core/engine.ts && grep -q "function applyDamage" src/core/engine.ts && grep -q "tick fires one volley per 1000ms from the 5 best-matched companions and kills chain into the next monster" tests/engine.test.ts && grep -q "tick with no companions emits nothing and never spends rng draws" tests/engine.test.ts && grep -q "companion damage is tripled during fever and never crits" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 26` → exit 0 |
| F63 | Engine type-adjusted volley and replay passthrough | `src/core/engine.ts`: per volley `party = activeCompanions(state.companions, state.monster.type)` (recomputed every volley → the field party auto-changes when the monster changes), `damage = effectivePower(companionPower(c), typeOf(c.speciesId), monster.type) * (fever ? FEVER_MULT : 1n)`; `companionAttack` event gains `effectiveness: 'super' or 'normal' or 'weak'` (`src/core/types.ts`); `monsterSpawned` unchanged (no `partyChanged` event — the renderer re-reads state); `pvpResult` accepts an optional `replay?: BattleReplay` that `applyCollection` ignores; `CollectionAction` gains `setPvpParty`; v1 seeded event logs stay byte-identical (GAME_DESIGN_V3 §4–§5) | claude | `npx vitest run tests/engine.test.ts tests/collection.test.ts tests/fever.test.ts && grep -q "activeCompanions(state.companions, state.monster.type)" src/core/engine.ts && grep -q "effectiveness" src/core/types.ts && grep -q "replay?: BattleReplay" src/core/types.ts && grep -q "volley damage is type-adjusted and companionAttack carries effectiveness" tests/engine.test.ts && grep -q "the field party changes when a monster of another type spawns" tests/engine.test.ts && grep -q "pvpResult with a replay is applied exactly like one without" tests/engine.test.ts && grep -q "same seed yields an identical event log" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 30 && ! grep -rq "Date.now(" src/core` → exit 0 |

## 4. Verify the pick

The heading of T59 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T59a`,
  `T59b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T59): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-11.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T59 (branch lane/T59)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T59","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
