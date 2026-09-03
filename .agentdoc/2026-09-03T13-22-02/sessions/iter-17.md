# Session record — iter 17

- agent role: builder
- worker: claude
- lane: .worktrees/T66 (branch lane/T66)
- harness version: v3
- task: T66 — Battle scene: Game.playReplay, mirrored opponent group, blow pacing, KO scatter, banners, field hidden + presentation suppressed
- result: DONE
- commit: bb425c8c2420aeefb14859290c9da837e33f49ac
- graphify affected used: none (the task's two files plus the helpers they already import — drawParty/partySlots, hitColorOf, spawnSpriteScatter, floatColor — were enough)

## What I did

- `src/renderer/game.ts`: added the PvP battle scene (SPEC F66). `playReplay(replay: BattleReplay)`
  opens it with `showBanner(banner, 'VS ' + name)` and hands the field to a `BattleScene`
  record (my group, theirs, blows, `blowMs`, `next`, `ageMs`, `endsAt`, deferred `after`).
- Pacing constants `REPLAY_MS = 12_000`, `BLOW_MS_MIN = 250`, `BLOW_MS_MAX = 600`,
  `REPLAY_END_MS = 600` plus `blowMs(blows)` = the §6 `BLOW_MS = clamp(12000 / blows, 250, 600)`.
  `update(dt)` drives it: every due blow fires, the scene ends at `(n-1)*BLOW_MS + 600`.
- Per blow: a `companionProjectile` in `hitColorOf(actor species)` from the actor's slot centre,
  the target species hit effect, a float `format(damage)` coloured by
  `floatColor(effectiveness(typeOf(actor), typeOf(target)))`, `attack` blip; `ko` → `kill` blip,
  `spawnSpriteScatter` of the target art and the target leaves its group.
- Layout: my party group drawn as usual on the left (the scene's own `mine`), the opponent
  mirrored via `drawParty(..., { flipX: false, originX: VIEW_W - 8 })` with `opponentName` in
  the 3×5 font at `OPPONENT_NAME_Y`; the field monster and its HP bar/type badge are skipped
  for the duration. `opponentSlotOf` mirrors a slot with drawParty's own originX rule so blows
  land on the drawn art.
- Suppression: `handleEvents` drops the presentation of every field event while a scene runs but
  keeps the bookkeeping (`monsterSpawned` still re-targets), so inputs still attack underneath.
- F53 integration: `apply({ type: 'pvpResult', …, replay })` calls `playReplay` BEFORE
  `engine.apply`, and the `pvpResolved` presentation (banner + steal pop-in / loss scatter) is
  extracted into `pvpPresentation(event, before)` and held in `scene.after` until the scene ends.
  Without a replay it runs immediately — the v2 VICTORY/DEFEAT tests stay green untouched.
  A bare `playReplay` derives the verdict the way the server does: the side still standing.
- `wireDamage()` guards the decimal-string damage (a corrupt replay must never throw mid-frame);
  `projectileOf()` replaces the inline projectile preset in the `companionAttack` case too (reuse).
- `tests/renderer.test.ts`: hoisted the existing `bannerKeys` helper to module scope (now shared)
  and added the six pinned titles (73 → 79 `it(`).

## Files touched

- src/renderer/game.ts
- tests/renderer.test.ts
- .agentdoc/2026-09-03T13-22-02/sessions/iter-17.md

## Gate results

```
$ npm test
 Test Files  33 passed (33)
      Tests  575 passed (575)

$ npm run lint
> eslint . --max-warnings 0
(no output)

$ npm run typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json
(no output)

$ <T66 AC line, verbatim>
 ✓ tests/renderer.test.ts (91 tests)
grep -c '^\s*it(' tests/renderer.test.ts → 79
npm run smoke → SMOKE_OK
AC_EXIT=0
```

## Attempts & dead ends (what future iterations must NOT retry)

- Do NOT rebuild my side of the scene from `pvpParty(state.companions, state.pvpParty)`: the menu
  sends the picked ids to the server, which need not be the SAVED party, so those ids can miss the
  replay's `actorId`s. The scene resolves my group from the ids the replay actually names.
- Do NOT let `advanceScene` run before the engine batch in `update()`: the scene must still be
  non-null while that frame's field events are routed, or their presentation escapes suppression.
  For the same reason the scene is cleared BEFORE `after()` runs, so the verdict's own banner and
  sparkle are not suppressed as scene events.
- Do NOT assert a KO'd member's disappearance on the frame of the ko: at age 0 the scatter
  particles sit on exactly the sprite's pixels. The test waits out `SCATTER_LIFE_MS` first.
- No new effect preset and no animation framework were added (§6 is explicit); `EFFECTS.hit[…]`
  + `spawnSpriteScatter` + `companionProjectile` cover the whole scene.
