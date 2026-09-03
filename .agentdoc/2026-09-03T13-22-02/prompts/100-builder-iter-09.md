# Lane T58 — Builder (iteration 09)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T58
"Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T58 (branch `lane/T58`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T13-22-02
- Harness: `.harness/v3/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T58. The main checkout (two directories up) is off
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
   T58 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
- AC: `npx vitest run tests/battle.test.ts tests/collection.test.ts tests/server/pvp.test.ts && grep -q "export function simulateBattle" src/core/battle.ts && grep -q "BATTLE_HP_MULT = 5n" src/core/battle.ts && grep -q "BATTLE_MAX_BLOWS = 200" src/core/battle.ts && grep -q "export function resolvePvp" src/core/collection.ts && grep -q "STEAL_CHANCE = 0.15" src/core/collection.ts && ! grep -q "rng" src/core/battle.ts && grep -q "blows alternate from the front members and ko advances to the next" tests/battle.test.ts && grep -q "type advantage decides an otherwise equal battle" tests/battle.test.ts && grep -q "an empty defender party is an instant win with no blows" tests/battle.test.ts && grep -q "the battle stops at BATTLE_MAX_BLOWS with a defender win" tests/battle.test.ts && grep -q "resolvePvp wins by the deterministic battle and moves one random defender to the attacker on the steal roll" tests/collection.test.ts && grep -q "resolvePvp with an empty loser roster steals nothing" tests/collection.test.ts && grep -q "resolvePvp never moves into a full roster of 30" tests/collection.test.ts && grep -q "resolvePvp is reproducible from its seed and draws exactly 2 rng values" tests/collection.test.ts && grep -q "resolvePvp steals only on a win with the 15 percent roll and draws exactly 2 rng values" tests/collection.test.ts && grep -q "a losing attacker never loses a companion" tests/collection.test.ts && grep -q "resolvePvp steal rate over 10000 seeded wins is within 13 to 17 percent" tests/collection.test.ts && grep -q "losing the match moves nothing: the attacker never loses a companion and lost is null" tests/server/pvp.test.ts && test "$(grep -c '^\s*it(' tests/battle.test.ts)" -ge 4 && test "$(grep -c '^\s*it(' tests/collection.test.ts)" -ge 21` → exit 0
- Deps: T57
- Worker: claude
- Files: src/core/battle.ts, src/core/collection.ts, src/core/index.ts, tests/battle.test.ts, tests/collection.test.ts, tests/server/pvp.test.ts
- Notes: SPEC F62 + amended F37, Assumptions 45/46/51/53; GAME_DESIGN_V3 §5. Six files by design: the v2 server test "losing the match moves one of my companions to the opponent and reports it as lost" (tests/server/pvp.test.ts) asserts the OLD probabilistic outcome and must be retitled/re-fixtured in the same commit (→ "losing the match moves nothing: the attacker never loses a companion and lost is null"; make the attacker party deterministically weaker) — src/server/app.ts is NOT touched (T54 may hold it): keep `resolvePvp(attacker, defender, rng, attackerRosterSize = attacker.length)` positional-compatible and its return a superset of v2 (`{ attackerWon, moved, blows, … }`) so app.ts's v2 call compiles unchanged until T60. New pure `src/core/battle.ts` (NO rng, the `! grep rng` pin): `Blow { side: 'A' | 'D'; actorId; targetId; damage: bigint; ko: boolean }`, `Battle { attackerWon; blows }`, `BATTLE_HP_MULT = 5n`, `BATTLE_MAX_BLOWS = 200`, `simulateBattle(attackerParty, defenderParty)`: hp = `companionPower × BATTLE_HP_MULT`, alternating blows from the FRONT member of each side (attacker first), damage = `effectivePower(power, typeOf(actor), typeOf(target))`, ko advances to the next member, empty defender = instant win with no blows, empty attacker = loss, cap 200 blows → defender wins. `resolvePvp` and `STEAL_CHANCE = 0.15` STAY in collection.ts (importing `simulateBattle`): win → roll `rng() < STEAL_CHANCE` then pick `floor(rng() * defender.length)` (exactly 2 draws, always — reproducibility), `moved` only into a roster `< ROSTER_CAP`; a losing attacker never loses anything. Retitle "resolvePvp wins with probability myPower over total and moves one random companion from the loser to the winner" → "resolvePvp wins by the deterministic battle and moves one random defender to the attacker on the steal roll"; keep "resolvePvp with an empty loser roster steals nothing", "resolvePvp never moves into a full roster of 30", "resolvePvp is reproducible from its seed and draws exactly 2 rng values". New titles verbatim: tests/battle.test.ts (new, ≥ 4) "blows alternate from the front members and ko advances to the next", "type advantage decides an otherwise equal battle", "an empty defender party is an instant win with no blows", "the battle stops at BATTLE_MAX_BLOWS with a defender win"; tests/collection.test.ts (18 → ≥ 21) "resolvePvp steals only on a win with the 15 percent roll and draws exactly 2 rng values", "a losing attacker never loses a companion", "resolvePvp steal rate over 10000 seeded wins is within 13 to 17 percent" (seeded mulberry32 loop). Barrel exports battle.ts.

Open task headings (context only — do NOT work on them):

### [~] T58 — Battle simulation (battle.ts) + resolvePvp v3 with STEAL_CHANCE in collection.ts
### [ ] T59 — Engine: type-adjusted volley, companionAttack.effectiveness, pvpResult.replay passthrough
### [ ] T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
### [ ] T61 — Server GET /v1/thefts + POST /v1/reclaim (410 expired, 409 gone) + thefts in the snapshot response
### [ ] T65 — Field v3 layout: window 480×300, canvas 240×150, SPRITE_SCALE 1, size-scaled monsters, party group + type badge + effectiveness floats
### [ ] T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
### [~] T67 — Net client + session v3: match, pvp(matchId, party), thefts, reclaim, toSnapshot party, identity notifiedTheftIds
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

| F37 | PvP resolution (core) | `src/core/collection.ts` `resolvePvp(attackerParty, defenderParty, rng, winnerRosterSize = 0) → { attackerWon, moved, blows }` per Assumption 34 (v3, F62): `attackerWon`/`blows` come from the deterministic `simulateBattle` (`src/core/battle.ts`, no rng); then exactly 2 draws ALWAYS consumed in this order — (1) steal roll `rng.next() < STEAL_CHANCE` (`STEAL_CHANCE = 0.15`), (2) victim index `⌊rng.next() · defenderParty.length⌋`; `moved = defenderParty[victim]` iff `attackerWon && stealRoll && defenderParty.length > 0 && winnerRosterSize < ROSTER_CAP`, else null; only the attacker can steal (a losing attacker never loses a companion); no bot/cooldown logic in core; shared byte-for-byte with the server (F45, F69); v2 title "resolvePvp wins with probability myPower over total and moves one random companion from the loser to the winner" is retitled (Assumption 53) | claude | `npx vitest run tests/collection.test.ts tests/battle.test.ts && grep -q "export function resolvePvp" src/core/collection.ts && grep -q "STEAL_CHANCE = 0.15" src/core/collection.ts && grep -q "resolvePvp wins by the deterministic battle and moves one random defender to the attacker on the steal roll" tests/collection.test.ts && grep -q "resolvePvp with an empty loser roster steals nothing" tests/collection.test.ts && grep -q "resolvePvp never moves into a full roster of 30" tests/collection.test.ts && grep -q "resolvePvp is reproducible from its seed and draws exactly 2 rng values" tests/collection.test.ts && grep -q "a losing attacker never loses a companion" tests/collection.test.ts` → exit 0 |
| F62 | Battle simulation and resolvePvp v3 | `src/core/battle.ts` (new, pure, no rng): `Blow { side: 'A' or 'D', actorId, targetId, damage: bigint, ko }`, `Battle { attackerWon, blows }`, `BATTLE_HP_MULT = 5n`, `BATTLE_MAX_BLOWS = 200`, `simulateBattle(attacker, defender)`: both parties in `partyOrder` (front = smallest first), hp = `companionPower(c) * BATTLE_HP_MULT`, blows alternate A, D, A… from the attacker, actor/target = each side's current front member, `damage = effectivePower(companionPower(actor), typeOf(actor), typeOf(target))`, `hp ≤ 0n` → `ko: true` and the next member steps up; ends when a side is out of members (`attackerWon` = defender out) or at `BATTLE_MAX_BLOWS` (`attackerWon = false`); empty attacker → `false, []`; empty defender → `true, []`; `src/core/collection.ts`: `STEAL_CHANCE = 0.15` and `resolvePvp` v3 (F37; Assumption 51); barrel exports; statistical pin: seeded 10 000 wins → steals within 13–17 % (GAME_DESIGN_V3 §5) | claude | `npx vitest run tests/battle.test.ts tests/collection.test.ts && grep -q "export function simulateBattle" src/core/battle.ts && grep -q "BATTLE_HP_MULT = 5n" src/core/battle.ts && grep -q "BATTLE_MAX_BLOWS = 200" src/core/battle.ts && grep -q "STEAL_CHANCE = 0.15" src/core/collection.ts && ! grep -q "rng" src/core/battle.ts && grep -q "blows alternate from the front members and ko advances to the next" tests/battle.test.ts && grep -q "type advantage decides an otherwise equal battle" tests/battle.test.ts && grep -q "an empty defender party is an instant win with no blows" tests/battle.test.ts && grep -q "the battle stops at BATTLE_MAX_BLOWS with a defender win" tests/battle.test.ts && grep -q "resolvePvp steals only on a win with the 15 percent roll and draws exactly 2 rng values" tests/collection.test.ts && grep -q "a losing attacker never loses a companion" tests/collection.test.ts && grep -q "resolvePvp steal rate over 10000 seeded wins is within 13 to 17 percent" tests/collection.test.ts && test "$(grep -c '^\s*it(' tests/battle.test.ts)" -ge 4 && test "$(grep -c '^\s*it(' tests/collection.test.ts)" -ge 21` → exit 0 |

## 4. Verify the pick

The heading of T58 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T58a`,
  `T58b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T58): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T13-22-02/sessions/iter-09.md` following
`.harness/v3/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T58 (branch lane/T58)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v3/loop/status.schema.json`:

{"task":"T58","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
