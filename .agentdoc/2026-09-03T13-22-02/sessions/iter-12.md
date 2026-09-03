# Session record — iter 12

- agent role: builder
- worker: claude
- lane: .worktrees/T60 (branch lane/T60)
- harness version: v3
- task: T60 — Server POST /v1/pvp v3: match + party validation, core resolvePvp, steal + theft record, blows on the wire
- result: DONE
- commit: ed519b6edf5e54a797583eaf7a7127fcfcdcaf95 (this record's sha follows in the fixup commit)
- graphify affected used: none (read src/server/app.ts, src/core/collection.ts, src/core/battle.ts, src/shared/api.ts directly — all named by the task)

## What I did

- Rewrote `POST /v1/pvp` in `src/server/app.ts` to the v3 two-step flow in the
  SERVER_ARCHITECTURE_V3 §3 order: auth → rate limit → cooldown → `no_snapshot`
  → body must carry `matchId: string` + `party: string[]` (a v2 body → 400
  `bad_request`) → match lookup (missing / older than `MATCH_TTL_MS` / not mine
  → 410 `match_expired`, entry deleted) → party ids all in my roster and ≤
  `PARTY_SIZE_MAX` (else 400 `bad_party`, no cooldown stamp, match kept) →
  `setLastPvpAt` → `resolvePvp(party, match.opponentParty, mulberry32(seed),
  me.snapshot.companions.length)` → match deleted.
- Response is the v3 `PvpResponse`: `blows` from the verdict with
  `damage: String(bigint)`, `opponent` = the previewed party plus the
  opponent's current name/bestIndex/rebirths, `lost: null` always.
- Steal (non-bot, `moved !== null`): `transferred = { ...moved, id: 's'+seed }`,
  loser roster AND stored `party` ids lose `moved.id`, winner roster gains the
  transferred copy, `setStolenIds(loser, …slice(-32))`, theft record
  `{ id: 't'+seed, companion, transferredId, thiefId, thiefName, at,
  reclaimUntil: now + RECLAIM_WINDOW_MS }` appended `.slice(-THEFTS_MAX)` and
  written with `setThefts`. `ponytail:` comment names BEGIN/COMMIT as the fix
  for the four non-transactional writes.
- Deleted T54's local `partyOf`/`idNum` stand-in; `/v1/pvp/match` now calls core
  `pvpParty(theirs.companions, theirs.party)` (same ordering, so
  tests/server/app.test.ts is untouched). Extracted the TTL sweep into a
  module-level `prune(at)` shared by both endpoints (§3: pruned on every
  `/v1/pvp/match` and `/v1/pvp` call).
- Rewrote `tests/server/pvp.test.ts` for the two-step flow: a `preview()` helper
  plus a `fight()` that previews then fights, so every kept v2 title keeps its
  call site. 9 → 14 `it(` (all five new titles from the AC verbatim).
- New tests cover: 410 for unknown / foreign / expired match ids, 400
  `bad_party` (alien id, > 5 ids, nothing spent, match still playable), the
  blow list against the STORED preview (the defender re-uploads a titan after
  the preview and it changes nothing) with decimal `damage`, the theft record
  with the 24 h window and the victim's party losing the id, and the v2 body →
  400 `bad_request`.

## Files touched

- src/server/app.ts
- tests/server/pvp.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-12.md

## Gate results

```
 Test Files  33 passed (33)
      Tests  547 passed (547)

> desmon@0.2.0 lint
> eslint . --max-warnings 0

> desmon@0.2.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json

AC (T60, run literally in bash): exit=0
 ✓ tests/server/pvp.test.ts (14 tests)
```

Smoke not run: the task touches neither `src/main`, `src/preload`, `src/renderer`,
`static` nor `package.json` (charter §Determinism and server test rules).

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT widen `PendingMatch` with the opponent's name/bestIndex/rebirths to
  answer with the "previewed" opponent: `tests/server/app.test.ts` pins the
  stored entry with an exact `toEqual({ matchId, playerId, opponentId, seed,
  opponentParty, createdAt })`. The response rebuilds the header from
  `store.getById(opponentId)` and only the party comes from the match.
- Do NOT put the body/`matchId` check before the `no_snapshot` check: the kept
  v2 test "pvp without an uploaded snapshot returns 400 no_snapshot" would then
  get `bad_request`, and SPEC F45 puts `no_snapshot` right after the cooldown.
- `matches` is module-level state shared by every test in the file; match ids
  come from the per-`setup()` counter, so ids repeat across tests. That is safe
  only because each fixture `matches.set`s before it fights — do not add tests
  that rely on a match surviving another `setup()`.
