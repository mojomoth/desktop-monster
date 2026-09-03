# AGENTS.md — Desktop Monster (DesMon)

This file is the heart of the loop: the single source of truth for how to build,
test, run, and package this project, and for what must pass before any work is
declared done. Every agent (human or AI) reads this first.

## What this project is

DesMon is a BongoCat-style desktop companion game: a small transparent always-on-top
pixel-art overlay where every keystroke/mouse click makes a knight attack a monster
(HP bar, kills, item drops, auto-collect, XP, levels). v2 adds bosses captured as
companions (auto-attack; consume / fuse / reincarnate / sacrifice / rebirth), fever mode,
A–Z big-number damage, per-species effects, a Collection & Battle window, and a small Node
server (`src/server`, on Render) for the leaderboard and asynchronous PvP with companion
stealing. Electron + TypeScript; all art is sprites-as-code (no binary assets). Built
autonomously by the parallel Ralph loop in `.harness/` — see `.harness/<version>/HARNESS.md`
(version in `.harness/CURRENT`).

## Commands (the contract)

These script names are FROZEN. Changing any of them requires a harness version
bump (see HARNESS.md §Versioning).

| Command | Purpose |
|---|---|
| `npm ci` | install dependencies (lockfile is committed) |
| `npm start` | build then launch the app (Electron) |
| `npm test` | unit tests (Vitest; deterministic — no network, no real timers, no real OS input hooks) |
| `npm run lint` | ESLint, zero warnings allowed (`--max-warnings 0`) |
| `npm run typecheck` | `tsc --noEmit` over all tsconfig projects, strict |
| `npm run smoke` | build, launch Electron with `SMOKE=1`; the app prints `SMOKE_OK` to stdout after the window loads and exits 0 by itself (non-zero exit or 20s watchdog timeout = failure). Must run headful on macOS without user interaction |
| `npm run package` | unsigned macOS build via electron-builder (`CSC_IDENTITY_AUTO_DISCOVERY=false`); output under `release/` |
| `npm run start:server` | `node dist/electron/server/index.js` — leaderboard/PvP server (Render start command; reads `PORT`, `DATABASE_URL`, `RENDER_GIT_COMMIT`). Created by the loop's server-scaffold task T22; `src/server` compiles via `tsconfig.main.json`'s include, so `typecheck` covers it unchanged |

## Server

SERVER_URL=https://desmon-server.onrender.com
RENDER_SERVICE_ID=srv-dacd4l15efls73e0fbig
RENDER_POSTGRES_ID=dpg-dacd4k2jnfac73c43llg-a
DB_CREATED=2026-09-03T01:50:08.492032Z
DB_EXPIRES=2026-10-03
DEPLOYED_SHA=7a81b346439d8a6d9fe3fe1d0fadd8cbd40e4f4c
- `GET /healthz` → `200 {"ok":true,"sha":"<RENDER_GIT_COMMIT|dev>"}`, no DB access; everything
  else under `/v1` (SPEC.md §Server / API).
- Deploy = `git push origin main` + `render deploys create <srv-id> --wait --confirm` (webhooks
  not guaranteed). Provisioning = `.harness/<CURRENT>/loop/render-bootstrap.sh` (idempotent),
  run only by the loop's deploy task, which also fills the placeholder above.
- Free tier: web service sleeps after 15 min idle (~1 min cold start — the client must tolerate
  it and work offline); Postgres 1 per workspace, 1 GB, EXPIRES 30 days after creation (`db_expires`).
- The server is authoritative for the PvP verdict and roster moves only; leaderboard stats are
  self-reported (accept-and-rank).

## Verification gates (the exit condition)

The gates line, verbatim — run it exactly like this:

    npm test && npm run lint && npm run typecheck

Rules:
- No task may be checked off in `IMPLEMENTATION_PLAN.md` unless this line exits 0.
- No commit is "done" while gates are red.
- The loop may not declare convergence unless this line exits 0 (plus `npm run smoke`) on `main`
  AND the plan file has no open tasks.

## Definition of done (loop level)

ALL of the following:
1. Every task in `IMPLEMENTATION_PLAN.md` is `[x]` or `[s]` (no `[ ]`, `[~]`, `[!]`).
2. The gates line exits 0.
3. `npm run smoke` exits 0.
4. `npm run package` produces `release/` containing the DesMon .app and .dmg.
5. Every `AC:` in `SPEC.md`'s feature table passes when executed literally.
6. Deploy verification passed (`/healthz` ok with the deployed sha) — or `DESMON_SKIP_NET` recorded in the handoff.

## Workers

Every task carries `- Worker: claude | codex`. The orchestrator (`.harness/<CURRENT>/loop/iterate.sh`)
dispatches up to `LANES` tasks in parallel, each in its own git worktree `.worktrees/<id>` (branch
`lane/<id>`), and merges finished lanes into `main` itself. Codex = graphics only (sprites/anim/hud/
effects/css + their tests) in a sandbox with no network, no Electron, no git; Claude = everything else.
- Work ONLY inside your worktree; never `git push`, `git checkout main`, `git worktree`, `git merge`, `git rebase`.
  Exception: a task whose Notes contain `push: yes` runs exactly `git push origin HEAD:main` once, after its
  commit and gates.
- Never edit `IMPLEMENTATION_PLAN.md` or `SPEC.md` (unless SPEC.md is in the task's Files); report
  through the final status JSON (`task, result, gates, commit, note[, children]`) on the FIRST line
  of your final message.
- Exactly ONE task per iteration; read this file, the task block + SPEC rows in your prompt, and
  only the source you need (`graphify query`/`affected` first — `graphify-out/` is symlinked into your
  worktree by dispatch, read-only; run `graphify update .` in the lane only if missing). Do not read the whole plan.
- Run the gates line and the task's `AC:` before DONE; errors → a different approach; BLOCKED only
  for environmental impossibility after ≥3 attempts (evidence in `note`).
- Session record → `<session dir>/sessions/iter-NN.md` inside the worktree.
- Claude commits inside the worktree; Codex never commits and never runs `npm start|smoke|package`,
  `electron`, `npm install`, and adds no dependencies.
- SPLIT = implement nothing, return `children[]`, leave the tree clean.
Charters: `.harness/<CURRENT>/agents/20-builder.md`, `25-gfx-worker.md`; loop contract: `HARNESS.md §4`.

## Code style — ponytail (lazy senior dev)

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code
never written. Before writing any code, stop at the first rung that holds:
1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.
Rules: no abstractions that weren't explicitly requested; no new dependency if it can be avoided;
no boilerplate nobody asked for; deletion over addition, boring over clever, fewest files possible;
shortest working diff wins — but only once you understand the problem; question complex requests;
pick the edge-case-correct option when two stdlib approaches are the same size; mark deliberate
corners with a `ponytail:` comment naming the ceiling.
Not lazy about: understanding the problem, input validation at trust boundaries (IPC payloads,
`parseSave`, the HTTP server, the net client), error handling that prevents data loss, security,
accessibility, real-hardware calibration, anything explicitly requested. Non-trivial logic leaves
ONE runnable check — here that means a vitest test (installed dependency, rung 5). Full ruleset +
review/audit format: `.harness/<CURRENT>/reference/PONYTAIL.md` (MIT, DietrichGebert/ponytail).

## Observability

- `rgt log --oneline -n 20`, `rgt blame <file>[:line]`, `rgt sessions` — agent activity history
  (hooks in `.claude/settings.json` / `.codex/config.toml`).
- `graphify query "<question>"`, `graphify affected "<symbol>" --depth 2` — code-graph orientation;
  `graphify update .` refreshes it.
- Exports: `.agentdoc/<TS>/sessions/iter-NN.rgt.json`, `.agentdoc/<TS>/graph/`. `.regent/` and
  `graphify-out/` are local caches (gitignored); `.worktrees/` = live lanes.

## Hard rules

- NEVER delete, skip (`.skip`/`xit`), weaken, or comment out a test to make gates pass.
- NEVER lower tsconfig or ESLint strictness, and never add `|| true`-style shims.
- NEVER report a task DONE without executing its `AC:` command in the same iteration and seeing it pass.
- One task per iteration. Keep changes scoped to the dispatched task.
- Tests must be deterministic: injected RNG (seeded), injected input driver (`SimulatedInputDriver`),
  injected clock; no external network (loopback-free: server tests use injected streams/stores),
  no real DB; no reliance on real global hooks or wall-clock time.
- No new dependency without a Notes line naming the ponytail rung that failed (pre-approved: `pg`).
- Workers never edit `IMPLEMENTATION_PLAN.md` and never work outside their worktree. Codex commits
  are made by the orchestrator with a `[codex]` suffix.

## Commit convention

`<type>(T<NN>): imperative subject` — e.g. `feat(T03): knight attack animation state machine`.
Orchestrator: `docs(agentdoc): dispatch|collect iter NN <id> … [ralph]`, `docs(plan): re-scope <id> [ralph]`,
`chore(wip): auto-commit stray changes before <dispatch|collect NN> [ralph]` (real uncommitted changes on main
outside `.agentdoc/`/`.worktrees/` — live lane output is never auto-committed); codex lanes:
`<type>(T<NN>): <title> [codex]`.

## macOS environment notes

- Global input capture (uiohook-napi) requires the Accessibility permission, which CANNOT be
  granted programmatically — and uiohook crashes the process if started without it. Automated
  tests and `npm run smoke` MUST use the simulated input driver. Real global hooks are verified
  manually only (see SPEC.md §Manual Verification Appendix).
- In dev the TCC grant target is "Electron" (`node_modules/electron/dist/Electron.app`); the
  packaged app needs its own "DesMon" grant.

## Pointers

- `SPEC.md` — what to build; each feature's "pass = what".
- `IMPLEMENTATION_PLAN.md` — what to do next; the loop's memory on disk.
- `.harness/<CURRENT>/HARNESS.md` — how the autonomous loop operates.
- `.harness/<CURRENT>/reference/GAME_ARCHITECTURE.md` — verified tech decisions (dependency version
  matrix, window options, IPC design, sprite system); its version pins are normative unless they demonstrably fail.
- `.harness/<CURRENT>/reference/GAME_DESIGN_V2.md`, `SERVER_ARCHITECTURE.md`, `TOOLING.md` — v2
  game/server design and verified tool commands.
