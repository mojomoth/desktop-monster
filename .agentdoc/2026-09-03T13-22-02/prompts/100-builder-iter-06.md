# Lane T57 — Builder (iteration 06)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T57
"Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T57 (branch `lane/T57`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T57. The main checkout (two directories up) is off
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
   T57 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
- AC: `npx vitest run tests/collection.test.ts tests/engine.test.ts && grep -q "PARTY_SIZE = 5" src/core/collection.ts && ! grep -rq "ACTIVE_SLOTS" src tests && grep -q "export function autoParty" src/core/collection.ts && grep -q "export function pvpParty" src/core/collection.ts && grep -q "export function partyOrder" src/core/collection.ts && grep -q "setPvpParty" src/core/collection.ts && grep -q "activeCompanions(state.companions, state.monster.type)" src/core/engine.ts && grep -q "activeCompanions picks the 5 highest effective powers against the enemy type" tests/collection.test.ts && grep -q "the party changes when the enemy type changes" tests/collection.test.ts && grep -q "pvpParty resolves ids in order and falls back to autoParty when empty" tests/collection.test.ts && grep -q "partyOrder sorts by size descending keeping party order on ties" tests/collection.test.ts && grep -q "setPvpParty drops unknown ids and caps at 5" tests/collection.test.ts && grep -q "tick fires one volley per 1000ms from the 5 best-matched companions and kills chain into the next monster" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/collection.test.ts)" -ge 18 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 27` → exit 0
- Deps: T56
- Worker: claude
- Files: src/core/collection.ts, src/core/engine.ts, tests/collection.test.ts, tests/engine.test.ts
- Notes: SPEC F61 + amended F32/F35, Assumptions 44/53; GAME_DESIGN_V3 §4. `PARTY_SIZE = 5` REPLACES `ACTIVE_SLOTS` (delete the constant; nothing outside collection.ts/collection.test.ts references it). `activeCompanions(cs, enemyType?: MonsterType)`: the 5 highest `effectivePower(companionPower(c), typeOf(c.speciesId), enemyType)` (no type → raw power), ties by lower id — the optional param keeps `activeCompanions(roster)` call sites in tests/renderer.test.ts compiling until T65 retitles them. `autoParty(cs)` = 5 strongest by raw power; `pvpParty(cs, ids)` resolves ids in order (unknown dropped, ≤ 5) and falls back to `autoParty` when empty; `partyOrder(party)` sorts by `sizeOf` desc keeping party order on ties (back → front); `CollectionAction` += `{ type: 'setPvpParty'; ids: string[] }` handled by `applyCollection` (drops unknown ids, caps at 5, writes `state.pvpParty`). engine.ts: the volley reads `activeCompanions(state.companions, state.monster.type)` (F63 pin, landed here so the 5-member volley and the retitled engine test change together). Retitles (value change, never delete): tests/collection.test.ts "activeCompanions picks the 3 strongest, ties by id" → "activeCompanions picks the 5 highest effective powers against the enemy type"; tests/engine.test.ts "tick fires one volley per 1000ms from the 3 strongest companions and kills chain into the next monster" → "tick fires one volley per 1000ms from the 5 best-matched companions and kills chain into the next monster" (its 4-companion roster now fires 4 volleys — update the expected event list). New titles verbatim: "the party changes when the enemy type changes", "pvpParty resolves ids in order and falls back to autoParty when empty", "partyOrder sorts by size descending keeping party order on ties", "setPvpParty drops unknown ids and caps at 5" (collection.test.ts 14 → ≥ 18). Keep every v2 title pinned by F32 (consume/fuse/reincarnate/sacrifice/rebirth/addCompanion/pvpResult). Do not touch `resolvePvp` (T58).

Open task headings (context only — do NOT work on them):

### [~] T57 — Party selection: PARTY_SIZE, activeCompanions(cs, enemyType), autoParty, pvpParty, partyOrder, setPvpParty action
### [ ] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [~] T62 — Party group sprites: party.ts (partySlots, drawParty, drawTypeBadge, TYPE_COLORS), boss scale by species size, BOSS_HP_BAR_Y 78
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

| F32 | Companion collection lifecycle | `src/core/collection.ts` (pure, total, never mutates input): `COMPANION_MAX_LEVEL = 10`, `PARTY_SIZE = 5` (v3; `ACTIVE_SLOTS` removed, F61), `ROSTER_CAP = 30`, `REBIRTH_MIN_INDEX = 40`, `companionPower(c)` (Assumption 24), `activeCompanions(cs, enemyType)` (top 5 by effective power against `enemyType` desc, ties → raw power → lower numeric id part; v3, F61), `CollectionAction` union and `applyCollection(state, action) → { state, events } or { error }` per Assumption 26 (unknown type/ids → error; rebirth keeps companions/items/coins/killCount/bestIndex/nextCompanionId and adds `⌊index/8⌋` souls); events only `rebirth { souls }` and `pvpResolved { won, stolen, lostId }`; barrel `export * from './collection.js'` | claude | `npx vitest run tests/collection.test.ts && grep -q "ROSTER_CAP = 30" src/core/collection.ts && grep -q "COMPANION_MAX_LEVEL = 10" src/core/collection.ts && grep -q "export function applyCollection" src/core/collection.ts && grep -q "companionPower is floor(monsterMaxHp(bossIndex)/20), at least 1, times level times 2^stars" tests/collection.test.ts && grep -q "consume adds 1 plus food stars levels, caps at 10 and removes the food" tests/collection.test.ts && grep -q "fuse needs same species and stars and yields stars+1 at level 1" tests/collection.test.ts && grep -q "reincarnate needs max level and resets to level 1 with stars+1" tests/collection.test.ts && grep -q "sacrifice removes the companion and adds 1 plus stars souls" tests/collection.test.ts && grep -q "rebirth needs monsterIndex 40 or more, adds floor(index/8) souls and resets the run" tests/collection.test.ts && grep -q "activeCompanions picks the 5 highest effective powers against the enemy type" tests/collection.test.ts && grep -q "addCompanion refuses a full roster of 30 and removeCompanions ignores unknown ids" tests/collection.test.ts && grep -q "pvpResult adds the stolen companion with a re-minted id and removes the lost one" tests/collection.test.ts && grep -q "PARTY_SIZE = 5" src/core/collection.ts` → exit 0 |
| F35 | Companion volley | `COMPANION_ATTACK_MS = 1000` in `src/core/engine.ts`; `tick(dt)` accumulates and fires `⌊dt/1000⌋` volleys (remainder kept); per volley, `party = activeCompanions(state.companions, state.monster.type)` (recomputed every volley) and each member in order deals `effectivePower(companionPower(c), typeOf(c.speciesId), monster.type) * (fever ? 3n : 1n)` (never crits) → events `companionAttack { companionId, speciesId, damage, effectiveness }` (v3, F63), `monsterHit`, then the shared kill chain via one `applyDamage(damage, events)` used by `attack()` and the volley; kills chain into the next monster inside the same volley and roll loot/capture like hero kills; no companions → no events and no rng draws | claude | `npx vitest run tests/engine.test.ts && grep -q "COMPANION_ATTACK_MS = 1000" src/core/engine.ts && grep -q "function applyDamage" src/core/engine.ts && grep -q "tick fires one volley per 1000ms from the 5 best-matched companions and kills chain into the next monster" tests/engine.test.ts && grep -q "tick with no companions emits nothing and never spends rng draws" tests/engine.test.ts && grep -q "companion damage is tripled during fever and never crits" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 26` → exit 0 |
| F61 | Party selection and setPvpParty | `src/core/collection.ts`: `PARTY_SIZE = 5` (replaces `ACTIVE_SLOTS`, removed everywhere), `activeCompanions(cs, enemyType)` (top 5 by `effectivePower(companionPower(c), typeOf(c.speciesId), enemyType)` desc; ties → higher raw power → lower numeric id), `autoParty(cs)` (top 5 by raw power, ties → lower id — the PvP default), `pvpParty(cs, ids)` (ids resolved against `cs` in the given order, unknown/duplicate dropped, first 5; EMPTY result → `autoParty(cs)`), `partyOrder(party)` (size desc = back → front, ties keep party order); action `{ type: 'setPvpParty'; ids }` → `state.pvpParty` = validated ids (unknown dropped, capped, may be empty), never an error, no event; `companionPower`, lifecycle actions, `ROSTER_CAP`, `REBIRTH_MIN_INDEX` unchanged; barrel exports (GAME_DESIGN_V3 §4, Assumption 44) | claude | `npx vitest run tests/collection.test.ts && grep -q "PARTY_SIZE = 5" src/core/collection.ts && ! grep -rq "ACTIVE_SLOTS" src tests && grep -q "export function autoParty" src/core/collection.ts && grep -q "export function pvpParty" src/core/collection.ts && grep -q "export function partyOrder" src/core/collection.ts && grep -q "setPvpParty" src/core/collection.ts && grep -q "activeCompanions picks the 5 highest effective powers against the enemy type" tests/collection.test.ts && grep -q "the party changes when the enemy type changes" tests/collection.test.ts && grep -q "pvpParty resolves ids in order and falls back to autoParty when empty" tests/collection.test.ts && grep -q "partyOrder sorts by size descending keeping party order on ties" tests/collection.test.ts && grep -q "setPvpParty drops unknown ids and caps at 5" tests/collection.test.ts && test "$(grep -c '^\s*it(' tests/collection.test.ts)" -ge 18` → exit 0 |
| F63 | Engine type-adjusted volley and replay passthrough | `src/core/engine.ts`: per volley `party = activeCompanions(state.companions, state.monster.type)` (recomputed every volley → the field party auto-changes when the monster changes), `damage = effectivePower(companionPower(c), typeOf(c.speciesId), monster.type) * (fever ? FEVER_MULT : 1n)`; `companionAttack` event gains `effectiveness: 'super' or 'normal' or 'weak'` (`src/core/types.ts`); `monsterSpawned` unchanged (no `partyChanged` event — the renderer re-reads state); `pvpResult` accepts an optional `replay?: BattleReplay` that `applyCollection` ignores; `CollectionAction` gains `setPvpParty`; v1 seeded event logs stay byte-identical (GAME_DESIGN_V3 §4–§5) | claude | `npx vitest run tests/engine.test.ts tests/collection.test.ts tests/fever.test.ts && grep -q "activeCompanions(state.companions, state.monster.type)" src/core/engine.ts && grep -q "effectiveness" src/core/types.ts && grep -q "replay?: BattleReplay" src/core/types.ts && grep -q "volley damage is type-adjusted and companionAttack carries effectiveness" tests/engine.test.ts && grep -q "the field party changes when a monster of another type spawns" tests/engine.test.ts && grep -q "pvpResult with a replay is applied exactly like one without" tests/engine.test.ts && grep -q "same seed yields an identical event log" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 30 && ! grep -rq "Date.now(" src/core` → exit 0 |

## 4. Verify the pick

The heading of T57 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T57a`,
  `T57b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T57): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-06.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T57 (branch lane/T57)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T57","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
