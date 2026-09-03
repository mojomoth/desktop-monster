# Session record — iter 36

- agent role: builder
- worker: claude
- lane: .worktrees/T40 (branch lane/T40)
- harness version: v2
- task: T40 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
- result: DONE
- commit: e368114218df180a0416e9b019a5c9083c2bdd86 (work) — the session record follows in the next commit
- graphify affected used: none (SERVER_ARCHITECTURE §3/§5 + src/server/{app,store}.ts and src/core/collection.ts read directly — the whole surface is 3 files)

## What I did

- Added `PVP_COOLDOWN_MS = 60_000` and `BOT_NAME = 'Training Dummy'` next to the existing
  `RATE_LIMIT`/`STOLEN_IDS_MAX` constants in `src/server/app.ts`.
- Added the `pvp` handler in the exact §5 order: auth → (rate limit already in `handle`) →
  cooldown via `lastPvpAt` (`elapsed < PVP_COOLDOWN_MS` → 429 `cooldown` +
  `retryAfterSec = ceil(remaining/1000)`, so `elapsed === 60000` is allowed) → `me.snapshot`
  null → 400 `no_snapshot` → `setLastPvpAt(me.id, at)` (bots included) → `seed = randomSeed() >>> 0`
  → `neighbor(up)`/`neighbor(down)`, both → `seed & 1 ? down : up`, one → it, none → bot with
  `bot: true` and no roster writes.
- Verdict comes from core: `resolvePvp(mine.companions, opponent.companions, mulberry32(seed))`,
  imported through the `src/core` barrel. No maths re-implemented; `attackerPower`/`defenderPower`
  stay off the wire (asserted by a key-set check in the test).
- Steal bookkeeping (non-bot, `moved !== null`): `transferred = { ...moved, id: 's' + seed }`,
  loser roster minus `moved.id`, winner roster plus `transferred`,
  `setStolenIds(loser, [...stolenIds, moved.id].slice(-STOLEN_IDS_MAX))` with the ORIGINAL id,
  `putSnapshot` on both rows, with a `ponytail:` comment naming BEGIN/COMMIT as the upgrade.
- Response `{ bot, seed, win, opponent, stolen: win ? transferred : null, lost: win ? null : moved }`;
  the body is ignored (the test posts `{ ignored: true }`).
- `POST /v1/pvp` added to `route()`, replacing the T39 "404 until T40" ponytail comment.
- New `tests/server/pvp.test.ts`: 9 tests, the 7 AC titles verbatim plus the single-neighbour
  fallback and the attacker-loses direction. MemoryStore + counter clock + a queue of seeds;
  no sockets, no timers, no DB, no wall clock. Covers both steal directions, the loser's
  `removed` on its next upload, the cooldown boundary (60/30/1 s then `elapsed === 60000` passes),
  the full-roster case (`ROSTER_CAP` titans steal nothing) and 401/400 guards.
- Gate-forced edit outside Files: `tests/server/app.test.ts` pinned `POST /v1/pvp` as a 404 route
  ("T40 adds it; until then it is unknown"). Swapped the entry to `GET /v1/pvp` — still an unknown
  method/path, so the 404 case keeps its coverage and the `it(` count is unchanged.
- `! grep -q "Date.now(" src/server/app.ts` still holds — the clock is `deps.now()` throughout.

## Files touched

- src/server/app.ts
- tests/server/pvp.test.ts (new)
- tests/server/app.test.ts (gate-forced one-line change, see above)
- .agentdoc/2026-09-03T00-02-53/sessions/iter-36.md

## Gate results

```
$ npm test
 Test Files  27 passed (27)
      Tests  413 passed (413)

$ npm run lint
> eslint . --max-warnings 0
(no output)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output)

$ <AC line, verbatim>
 ✓ tests/server/pvp.test.ts (9 tests) 13ms
AC exit=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT re-add `{ method: 'POST', path: '/v1/pvp' }` to the 404 table in
  `tests/server/app.test.ts` — with the route in place it answers 401, not 404.
- Do NOT special-case the bot inside `resolvePvp`'s result: with an empty bot roster the core
  already returns `moved: null` for every reachable case, but the server still gates the steal on
  `foe !== null` so a future bot with companions cannot leak roster writes.
- `npm run smoke` was not run: this task touches only `src/server` and `tests/`, none of
  `src/main`, `src/preload`, `src/renderer`, `static` or `package.json`.
