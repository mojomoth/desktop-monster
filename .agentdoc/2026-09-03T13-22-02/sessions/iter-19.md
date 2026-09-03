# Session record — iter 19

- agent role: builder
- worker: claude
- lane: .worktrees/T71 (branch lane/T71)
- harness version: v3
- task: T71 — Menu binder v3: find opponent, party editor (auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster badges/PvP marks
- result: DONE
- commit: 29336be615660a2efbc21680a00558857d13a56f (work commit; this line fixed up by the next commit)
- graphify affected used: none (task block + AGENTS.md + the four cited files were enough)

## What I did

- `src/menu/index.ts` MenuBridge grew the T68 methods it now binds: `pvpMatch()`,
  `pvp(matchId, party)`, `thefts()`, `reclaim(theftId)`.
- Battle tab step 1: `#find` → `pvpMatch()` → `#opponent` panel (name, `Monster N`,
  `♻×n`, `.party` of `.card.mini` from `opponentRows`); bot → `Training Dummy (no party)`.
- Party editor: 5 `.slot`s + roster `.card.mini.pick` toggles (`.selected`, `togglePick`
  caps at 5), `#auto` = `autoParty`, `#save-party` → `sendAction({ type: 'setPvpParty', ids })`,
  live `#preview` via `partyPreview`. Picks re-seed from `pvpParty(save)` only when the
  SAVED party moved, so an autosave never throws away an in-progress edit.
- Step 2: local `pvp()` helper (the F55 source-contract literal) reads the loaded matchId +
  picked ids → `api.pvp(...)`; success → `removeCompanions` (if any) then
  `pvpResult { won, stolen, lostId: null, replay: { opponentName, opponentParty, blows } }`,
  `#result` = `pvpResultText`, match cleared (the server consumed it), inbox refreshed.
  `cooldown` → v2 countdown; `expired` → panel cleared with `Opponent expired — find again`.
- `#thefts` inbox from `thefts()` (refreshed on Battle tab open and after every battle);
  `Reclaim` → `reclaim(id)` → `sendAction({ type: 'addCompanion', companion })` + re-list;
  `expired`/`gone` drop the row with a reason, a network error keeps it.
- Roster cards gained the `type type-…` badge (via `miniRow`) and the `★ PvP` mark for
  members of the saved party.
- tests/menu.test.ts 18 → 23 `it(`: the four AC titles verbatim + a party-editor test; the
  fake doc/bridge gained the v3 ids and the four bridge methods (pvp records `matchId:ids`).

## Files touched

- src/menu/index.ts
- tests/menu.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-19.md

## Gate results

```
 Test Files  34 passed (34)
      Tests  587 passed (587)
> eslint . --max-warnings 0
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
AC EXIT=0   (vitest menu/tray/window: 89 passed; every grep + it( count 23 ≥ 22)
```

## Attempts & dead ends (what future iterations must NOT retry)

- Kept `battleEnabled`'s v2 `(save, cooldownUntil)` leg in view.ts: view.ts is NOT in this
  task's Files, and the F55-pinned test still calls that form. The binder itself only uses
  the v3 `BattleState` form.
- `menu page paints each companion card with the species sprite` counted EVERY created
  canvas (`doc.created`), which the party slots and pick buttons now also produce (9, not 3).
  Scoped it to `#roster`'s `.species` canvases instead — same three assertions, no weakening.
- The v2 offline test clicked `#battle-go`; in the two-step flow that button is dead without
  a match, so it now clicks `#find` (the step that would touch the network). Title unchanged.
