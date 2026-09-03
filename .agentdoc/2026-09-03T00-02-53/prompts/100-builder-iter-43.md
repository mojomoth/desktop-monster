# Lane T48 — Builder (iteration 43)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T48
"Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T48 (branch `lane/T48`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T48. The main checkout (two directories up) is off
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
   T48 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
- AC: `npx vitest run tests/menu.test.ts && grep -q "src/menu" tsconfig.renderer.json && grep -q "reportMenuReady" src/menu/index.ts && grep -q "onStateChanged" src/menu/index.ts && grep -q "sendAction" src/menu/index.ts && grep -q "drawSprite" src/menu/index.ts && grep -q "menu.css" static/menu.html && grep -q "dist/web/menu/index.js" static/menu.html && grep -q "rosterRows lists companions with power in letter-suffix format sorted by power" tests/menu.test.ts && grep -q "fuse candidates are pairs of the same species and stars" tests/menu.test.ts && grep -q "rebirth button is enabled only from monster index 40" tests/menu.test.ts && grep -q "menu page paints each companion card with the species sprite" tests/menu.test.ts && grep -q "menu page reports ready and renders every state-changed save" tests/menu.test.ts && ! grep -rq "from 'electron'" src/menu` → exit 0
- Deps: T46, T47
- Worker: claude
- Files: static/menu.html, src/menu/index.ts, src/menu/view.ts, tsconfig.renderer.json, tests/menu.test.ts
- Notes: SPEC F54 (Assumption 29); GAME_DESIGN_V2 §9 menu page. `tsconfig.renderer.json` include += `"src/menu"` (rootDir `src` → emits `dist/web/menu/index.js`; eslint and the renderer typecheck cover it; global.d.ts applies). view.ts is DOM-free (pure data → strings/flags): `rosterRows(save)` sorted by `companionPower` desc with `format(power)` (core barrel), `fuseCandidates(save)` = same speciesId + same stars pairs, `canRebirth(save)` = `monsterIndex ≥ 40`, `consumeTargets(save, foodId)`. index.ts is a thin DOM binder made testable by injection (renderer/input.ts pattern): `mountMenu(doc, api)` over a minimal structural document interface (createElement / querySelector / textContent / addEventListener / canvas getContext) so tests drive it with a recording fake under vitest's node environment; the 3-line boot at the bottom passes the real `document` and `window.desmon`. Behaviour: boot → `reportMenuReady()`; `onStateChanged(save)` → re-render; buttons Consume/Fuse/Reincarnate/Sacrifice/Rebirth → `sendAction({ type: ... })`; each card's `<canvas class="species" width="24" height="20">` painted with `drawSprite(ctx, monsterSprites[speciesId].idle, 0, 0, 0, { palette: paletteForTier(idle.palette, stars) })` (imports from '../renderer/sprites/index.js'), `Lv n`, `★×stars`; Ranking/Battle panels are placeholders until T49. static/menu.html: tabs + panels with the fixed class names `.tabs .tab .panel .card .species .name .stars .power .btn .row .footer .result`, `<link rel="stylesheet" href="menu.css">`, `<script type="module" src="../dist/web/menu/index.js">`. SOURCE GUARD: `! grep -rq "from 'electron'" src/menu` — the menu never imports electron or net; it talks only through `window.desmon`. Test titles verbatim in the AC (new file tests/menu.test.ts).

Open task headings (context only — do NOT work on them):

### [~] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F54 | Menu roster UI | `static/menu.html`: tabs + panels with the fixed class names (`.tabs .tab .panel .card .species .name .stars .power .btn .row .footer .result`), `<link rel="stylesheet" href="menu.css">`, `<script type="module" src="../dist/web/menu/index.js">`; `src/menu/view.ts` DOM-free view-model (`rosterRows(save)` sorted by power desc with `format(power)`, `fuseCandidates(save)` = same species + same stars pairs, `canRebirth(save)` = `monsterIndex ≥ 40`, `consumeTargets`); `src/menu/index.ts` thin DOM binder: boot → `reportMenuReady()`, `onStateChanged(save)` → re-render, buttons Consume/Fuse/Reincarnate/Sacrifice/Rebirth → `sendAction(...)`, each card's `<canvas class="species" width="24" height="20">` painted with `drawSprite(... monsterSprites[speciesId].idle, 0 ...)` under `paletteForTier(palette, stars)`, `Lv n`, `★×stars`; `tsconfig.renderer.json` include += `src/menu` (emits `dist/web/menu/`); the menu never imports electron/net — only `window.desmon`; Ranking/Battle panels are placeholders until F55 | claude | `npx vitest run tests/menu.test.ts && grep -q "src/menu" tsconfig.renderer.json && grep -q "reportMenuReady" src/menu/index.ts && grep -q "onStateChanged" src/menu/index.ts && grep -q "sendAction" src/menu/index.ts && grep -q "drawSprite" src/menu/index.ts && grep -q "menu.css" static/menu.html && grep -q "dist/web/menu/index.js" static/menu.html && grep -q "rosterRows lists companions with power in letter-suffix format sorted by power" tests/menu.test.ts && grep -q "fuse candidates are pairs of the same species and stars" tests/menu.test.ts && grep -q "rebirth button is enabled only from monster index 40" tests/menu.test.ts && grep -q "menu page paints each companion card with the species sprite" tests/menu.test.ts && grep -q "menu page reports ready and renders every state-changed save" tests/menu.test.ts && ! grep -rq "from 'electron'" src/menu` → exit 0 |

## 4. Verify the pick

The heading of T48 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T48a`,
  `T48b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T48): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-43.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T48 (branch lane/T48)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T48","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
