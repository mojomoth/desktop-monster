# Lane T41 — Builder (iteration 37)

You are a fresh agent in an isolated git worktree. Everything you need is in
this prompt and on disk. Your job: complete EXACTLY ONE task — T41
"Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch" — with gates green, committed in this worktree, then report with
one JSON object. Then stop.

- Working directory: /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T41 (branch `lane/T41`; `node_modules` is a
  symlink to the main checkout — never reinstall it)
- Session dir (relative to the worktree): .agentdoc/2026-09-03T00-02-53
- Harness: `.harness/v2/`

## 1. Lane rules (hard)

- Work ONLY inside /Users/jeongyounglee/work/repo/desktop-monster/.worktrees/T41. The main checkout (two directories up) is off
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
   T41 (attempts & dead ends of earlier tries), if present.
6. Before touching a module you do not know: `graphify query "<question>"` or
   `graphify affected "<symbol>" --depth 2` (offline, instant; `graphify-out/`
   is symlinked into your worktree by dispatch — run `graphify update .` only
   if it is missing) instead of reading the tree.

## 3. Your task

### [~] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
- AC: `npx vitest run tests/server/pgStore.test.ts && npm run typecheck && npm run lint && node -e "const p=require('./package.json');process.exit(p.devDependencies.pg==='8.23.0'&&!(p.dependencies??{}).pg&&!p.devDependencies['@types/pg']?0:1)" && test -d node_modules/pg && grep -q 'CREATE TABLE IF NOT EXISTS players' src/server/pgStore.ts && grep -q 'CREATE INDEX IF NOT EXISTS players_score_idx' src/server/pgStore.ts && grep -q 'last_pvp_at double precision' src/server/pgStore.ts && grep -q 'count(\*)::int' src/server/pgStore.ts && ! grep -q 'CREATE TABLE IF NOT EXISTS matches' src/server/pgStore.ts && grep -q "declare module 'pg'" src/server/pg.d.ts && grep -q 'DATABASE_URL' src/server/index.ts && grep -q 'MemoryStore' src/server/index.ts` → exit 0
- Deps: T39
- Worker: claude
- Files: src/server/pgStore.ts, src/server/pg.d.ts, src/server/index.ts, package.json, package-lock.json, tests/server/pgStore.test.ts
- Notes: SPEC F46 (Assumption 14/35); SERVER_ARCHITECTURE §1 (pg placement, pg.d.ts VERBATIM: `declare module 'pg'` with `Pool` ctor `{ connectionString, ssl? }`, `query(text, values?)`, `end()` — 3 members, `ponytail:` comment) + §4 (DDL, queries, ssl rule, int8 avoidance). New dependency justification (ponytail rung 5 failed: no stdlib Postgres client; pre-approved): `pg@8.23.0` as a devDependency with an EXACT pin (`npm i -D -E pg@8.23.0` from the lane — node_modules is a symlink to the main checkout, so the install lands in the shared tree; additive, harmless); commit package.json + package-lock.json; never `dependencies`, never `@types/pg`. `PgStore.connect(url)` → `new Pool({ connectionString, ssl: /\.render\.com$/.test(new URL(url).hostname) ? { rejectUnauthorized: false } : undefined })` → DDL on every boot (`CREATE TABLE IF NOT EXISTS players (id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, nickname text NOT NULL, snapshot jsonb, best_index integer NOT NULL DEFAULT 0, rebirths integer NOT NULL DEFAULT 0, stolen_ids jsonb NOT NULL DEFAULT '[]', last_pvp_at double precision, updated_at timestamptz NOT NULL DEFAULT now())`; `CREATE INDEX IF NOT EXISTS players_score_idx ON players (best_index DESC, rebirths DESC)`; NO `matches` table) → the 9 `Store` methods with the §4 queries (`count(*)::int`, tuple comparisons `(best_index, rebirths) > ($1, $2)`, `ORDER BY … updated_at`), row mapper trusting jsonb columns and `double precision` → number. index.ts: `const url = process.env.DATABASE_URL; const store = url ? await PgStore.connect(url) : (warn(), new MemoryStore());` with exactly one stderr line `[desmon-server] DATABASE_URL unset — using MemoryStore (data is lost on restart)`; boot log `store=pg|memory`. Tests are SOURCE PINS only (read pgStore.ts / pg.d.ts / package.json as text): DDL literals, `double precision`, `::int`, the ssl regex, no matches table, pg in devDependencies only, no `@types/pg`, `!dist/electron/server/**` in build.files — never open a real connection; `npm test` never loads `pg`. src/server/pg.d.ts sits under tsconfig.main's include; tsconfig.test never sees pgStore.ts.

Open task headings (context only — do NOT work on them):

### [~] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
### [ ] T34 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
### [ ] T37 — Renderer wiring v2: engine tick in update(), A–Z floats, effects, boss/companion/fever presentation, fever blip
### [~] T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
### [~] T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe, README
### [ ] T47 — Game window applies actions + flushes save; VICTORY/DEFEAT/rebirth presentation
### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with removeCompanions + pvpResult actions
### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged SMOKE_OK, no pg or server build inside the .app
### [ ] T53 — SPEC criteria sweep (F01–F58, Server / API, Deployment — literal)

SPEC rows referenced by the task (may be empty):

| F46 | PgStore | `src/server/pgStore.ts` `PgStore.connect(url)` builds a `pg.Pool` (`ssl: { rejectUnauthorized: false }` only when the hostname ends with `.render.com`), runs the idempotent DDL of SERVER_ARCHITECTURE §4 on every boot (`CREATE TABLE IF NOT EXISTS players` with `last_pvp_at double precision`, `CREATE INDEX IF NOT EXISTS players_score_idx`; NO `matches` table), implements the 9 `Store` methods with `count(*)::int` and the §4 queries; `src/server/pg.d.ts` is the exact 3-member ambient declaration (no `@types/pg`); `pg` 8.23.0 in devDependencies only (ponytail rung 5, pre-approved); `index.ts`: `DATABASE_URL` set → `await PgStore.connect(url)`, else `MemoryStore` + exactly one stderr warning line; boot log shows `store=pg or memory`; tests are source pins only — no real connection, `npm test` never loads `pg` | claude | `npx vitest run tests/server/pgStore.test.ts && npm run typecheck && npm run lint && node -e "const p=require('./package.json');process.exit(p.devDependencies.pg==='8.23.0'&&!(p.dependencies??{}).pg&&!p.devDependencies['@types/pg']?0:1)" && test -d node_modules/pg && grep -q 'CREATE TABLE IF NOT EXISTS players' src/server/pgStore.ts && grep -q 'CREATE INDEX IF NOT EXISTS players_score_idx' src/server/pgStore.ts && grep -q 'last_pvp_at double precision' src/server/pgStore.ts && grep -q 'count(\*)::int' src/server/pgStore.ts && ! grep -q 'CREATE TABLE IF NOT EXISTS matches' src/server/pgStore.ts && grep -q "declare module 'pg'" src/server/pg.d.ts && grep -q 'DATABASE_URL' src/server/index.ts && grep -q 'MemoryStore' src/server/index.ts` → exit 0 |

## 4. Verify the pick

The heading of T41 on disk must be `[~]`. If it is not, or the block above
disagrees with the file, change nothing and report `result: "MISMATCH"`.

## 5. Implement + test

- Implement the task and WRITE ITS TESTS in the same iteration — the `AC:`
  line tells you what must be provable. Ponytail: shortest correct diff,
  reuse before writing, no unrequested abstractions or dependencies, one
  runnable check (a vitest test) per non-trivial piece of logic.
- Stay in scope: this task only. Fixes outside it are allowed only when a gate
  forces them; say so in `note`.
- If the task is too big for one iteration: implement nothing, leave the tree
  clean, report `result: "SPLIT"` with `children` (ids `T41a`,
  `T41b`…, each with title/worker/files/deps/ac; `files` complete
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

`git add -A && git commit -m "<type>(T41): <imperative subject>"`
(`feat|fix|docs|test|chore`). The tree must be clean when you finish, except
when reporting SPLIT/BLOCKED/MISMATCH with no changes.

## 8. Session record

Write `.agentdoc/2026-09-03T00-02-53/sessions/iter-37.md` following
`.harness/v2/templates/session-record.template.md` (what you did, files
touched, gate output tails, attempts & dead ends, commit sha,
`- worker: claude`, `- lane: .worktrees/T41 (branch lane/T41)`) and
include it in your commit.

## 9. Report — final message

Your final message MUST begin with this JSON object on its FIRST line — nothing
before it; keys exactly as `.harness/v2/loop/status.schema.json`:

{"task":"T41","result":"DONE|SPLIT|BLOCKED|NOTHING_TO_DO|MISMATCH","gates":"pass|fail","commit":"<sha or none>","note":"<what you did + dead ends, <=600 chars>","children":[]}

`children` only for SPLIT (otherwise omit or `[]`). Prose may follow on later
lines. Your iteration ends with this message. Do not start another task.
