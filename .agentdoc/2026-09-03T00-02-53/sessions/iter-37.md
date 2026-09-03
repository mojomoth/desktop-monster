# Session record — iter 37

- agent role: builder
- worker: claude
- lane: .worktrees/T41 (branch lane/T41)
- harness version: v2
- task: T41 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
- result: DONE
- commit: see below (feat(T41))
- graphify affected used: none — SERVER_ARCHITECTURE §1/§4 spell the file
  contents verbatim, and the only local reads needed were the existing
  `src/server/{store,index}.ts` and `src/shared/api.ts`.

## What I did

- `npm i -D -E pg@8.23.0` from the lane (node_modules is a symlink to the main
  checkout, so the install lands in the shared tree; additive, 467 transitive
  packages, nothing removed — electron/vitest/typescript/uiohook all still
  present). npm reformatted the whole `build` block of package.json; I reverted
  it and re-added the single `"pg": "8.23.0"` devDependency line by hand, so the
  package.json diff is exactly one line. package-lock.json is purely additive.
- `src/server/pg.d.ts` (new): the exact 3-member ambient `declare module 'pg'`
  of §1 (`Pool` ctor `{ connectionString, ssl? }`, `query`, `end`) with the
  `ponytail:` ceiling comment. No `@types/pg`. It sits under
  `tsconfig.main.json`'s `include` (`src/server`), so typecheck covers it.
- `src/server/pgStore.ts` (new): `PgStore.connect(url)` builds the pool with
  `ssl: /\.render\.com$/.test(new URL(url).hostname) ? { rejectUnauthorized:
  false } : undefined`, runs the idempotent DDL (`CREATE TABLE IF NOT EXISTS
  players` with `last_pvp_at double precision` + `CREATE INDEX IF NOT EXISTS
  players_score_idx`; NO `matches` table) on every boot, then returns the store.
  All 9 `Store` methods use the §4 queries verbatim (`count(*)::int`, tuple
  comparisons `(best_index, rebirths) > ($1, $2)` / `<= ($2, $3)`, the
  `updated_at` tie-breakers). One private `one()` helper collapses the four
  single-row selects; `toRow` trusts the parsed jsonb columns and the
  `double precision` number. Nothing is int8, so node-postgres never hands back
  a string where a number is expected.
- `src/server/index.ts`: `const url = process.env.DATABASE_URL; const store =
  url ? await PgStore.connect(url) : new MemoryStore();` with exactly one
  `console.error` line `[desmon-server] DATABASE_URL unset — using MemoryStore
  (data is lost on restart)`, and the boot log now prints
  `store=${url ? 'pg' : 'memory'}`. Boot lives in one `async main()` because
  the CJS output of `tsconfig.main.json` has no top-level await (marked with a
  `ponytail:` comment).
- `tests/server/pgStore.test.ts` (new, 19 tests): source-contract pins only —
  it reads pgStore.ts / pg.d.ts / index.ts / package.json as TEXT and never
  imports pgStore.ts, so `npm test` still never loads `pg` and never opens a
  connection. Pins: every DDL column, the score index, exactly one
  `CREATE TABLE` and no `matches`, `double precision` + `count(*)::int` +
  absence of `bigint`, DDL-before-return ordering, the five §4 queries, the 9
  method names, the ssl regex (plus a live re-evaluation of the regex against
  internal / external / `render.com.evil.example` / localhost hosts), the exact
  3 pg.d.ts members, pg pinned in devDependencies with no `dependencies` entry
  and no `@types/pg`, `!dist/electron/server/**` in `build.files`, and the
  index.ts store switch / single stderr warning / `store=pg|memory` boot log.

## Files touched

- package.json
- package-lock.json
- src/server/pg.d.ts (new)
- src/server/pgStore.ts (new)
- src/server/index.ts
- tests/server/pgStore.test.ts (new)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-37.md

## Gate results

```
 Test Files  27 passed (27)
      Tests  443 passed (443)

> desmon@0.1.0 lint
> eslint . --max-warnings 0

> desmon@0.1.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC (executed literally): tests/server/pgStore.test.ts 19 passed, typecheck +
lint clean, the package.json node -e check exited 0, node_modules/pg present,
all 6 greps on pgStore.ts matched, `CREATE TABLE IF NOT EXISTS matches` absent,
`declare module 'pg'` in pg.d.ts, DATABASE_URL + MemoryStore in index.ts
→ AC EXIT=0

npm run smoke → SMOKE_OK (run because package.json is in the task's Files)
```

## Attempts & dead ends (what future iterations must NOT retry)

- Top-level `await PgStore.connect(url)` in index.ts (the literal form in the
  task Notes) does NOT compile: `tsconfig.main.json` is `module: node16` with
  no `"type": "module"`, so the output is CommonJS and TS rejects top-level
  await. The semantics are preserved inside `async function main()`; do not
  "simplify" it back.
- `npm i -D -E pg@8.23.0` rewrites package.json's `build` block into npm's
  own formatting (~35 lines of pure whitespace churn). Always revert
  package.json after the install and add the one devDependency line by hand;
  keep package-lock.json, which is additive.
- The ssl rule must stay `/\.render\.com$/` anchored on `new URL(url).hostname`
  — a substring test would enable relaxed TLS for a host like
  `render.com.evil.example` (covered by a test).
- Do NOT import pgStore.ts (or `pg`) from any test: `pg` is a devDependency
  that must never be loaded by `npm test` nor end up in the .app. The suite is
  deliberately text-only.
