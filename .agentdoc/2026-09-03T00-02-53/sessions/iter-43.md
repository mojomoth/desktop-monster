# Session record — iter 43

- agent role: builder
- worker: claude
- lane: .worktrees/T48 (branch lane/T48)
- harness version: v2
- task: T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
- commit: a97502fd54711b182047043322348544a6c3b7a4
- graphify affected used: none (read src/core/collection.ts, src/core/save.ts,
  src/renderer/input.ts, src/renderer/sprites/*, static/menu.css directly)

## What I did

- `src/menu/view.ts` (new, DOM-free): `rosterRows(save)` (power desc, ties → lower id,
  `format(companionPower)`, `'Dragon Lv 10'` / `'★×1'` / `maxLevel` flag),
  `fuseCandidates(save)` (unordered same-species + same-stars pairs),
  `canRebirth(save)` (`monsterIndex ≥ REBIRTH_MIN_INDEX`), `consumeTargets(save, foodId)`
  (core's rule: every other companion).
- `src/menu/index.ts` (new): `mountMenu(doc, api)` over minimal structural
  `MenuDocument`/`MenuElement`/`MenuBridge` interfaces (renderer/input.ts injection
  pattern) → runs under vitest's node environment with a recording fake.
  Boot → `reportMenuReady()`; `onStateChanged(raw)` → `parseSave` (trust boundary) +
  re-render; card buttons → `sendAction({ type: 'consume' | 'fuse' | 'reincarnate' |
  'sacrifice' })`, footer → `{ type: 'rebirth' }`. Two-companion actions use a
  `pending` selection (first click picks the target/twin, second completes, the
  pending card turns into Cancel); disabled buttons carry no listener. Each card
  paints a `<canvas class="species" width=24 height=20>` with
  `drawSprite(ctx, { ...idle, palette: paletteForTier(idle.palette, stars) }, 0, 0, 0, { scale: 2 })`.
  Tabs toggle `.tab active` + `panel.hidden`; Ranking/Battle stay HTML placeholders (T49).
- `static/menu.html`: tabs + three panels + footer Rebirth + `.result`, keeping
  `menu.css` and adding `<script type="module" src="../dist/web/menu/index.js">`.
- `tsconfig.renderer.json`: include += `"src/menu"` → emits `dist/web/menu/index.js`
  (verified after `npm run build`).
- `tests/menu.test.ts` (new, 7 `it(`): the five AC titles verbatim plus button-action
  and tab tests, driven by a fake document that records fills/clicks/children.
- Verified the injected interfaces are truthful with a throwaway
  `src/menu/__scratch.ts` (`const d: MenuDocument = document;` + `createElement`
  for canvas/button) under `tsconfig.renderer.json` — assignable, exit 0; file deleted.

## Files touched

- src/menu/view.ts (new)
- src/menu/index.ts (new)
- static/menu.html
- tsconfig.renderer.json
- tests/menu.test.ts (new)

## Gate results

```
Test Files  31 passed (31)
     Tests  492 passed (492)

> eslint . --max-warnings 0      (no output, exit 0)
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.test.json   (exit 0)

AC (npx vitest run tests/menu.test.ts && greps && ! grep -rq "from 'electron'" src/menu) → exit 0
npm run smoke → SMOKE_OK   (Files touch static/)
```

## Attempts & dead ends (what future iterations must NOT retry)

- `function render()` (hoisted declaration) inside `mountMenu` → TS18047: the
  `if (!roster) return` narrowing of the `const` querySelector results is not
  preserved inside a hoisted function declaration. Use a `const render = ...`
  arrow (narrowing is preserved in function expressions).
- Referencing the real globals directly in the boot breaks two ways: `tsconfig.test.json`
  has no DOM lib (tests import this module, so `document`/`window` would be unresolved),
  and executing the boot under vitest's node environment would throw. The fix that
  works is module-scoped `declare const document: MenuDocument; declare const window:
  { desmon: MenuBridge };` (shadows lib.dom inside this module, emits nothing) plus a
  `typeof document !== 'undefined'` guard.
- `DrawSpriteOptions` has NO `palette` field (the Notes' call shape is not literal):
  tier tinting is a spread sprite `{ ...idle, palette: paletteForTier(...) }`, exactly
  how `src/renderer/game.ts` does it.
