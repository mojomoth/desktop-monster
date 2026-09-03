# GAME_DESIGN_V3.md — DesMon v3 game/client design (normative)

Consumed by the Spec Clarifier (AMEND mode) and the Planner (APPEND mode) of
harness v3. Server internals, API and deploy runbook for v3 live in
`SERVER_ARCHITECTURE_V3.md` (same directory; a delta over
`SERVER_ARCHITECTURE.md`). Everything in `GAME_ARCHITECTURE.md` (v1) and
`GAME_DESIGN_V2.md` (v2) stays true unless overridden here. Loop mechanics:
`.harness/v3/HARNESS.md`; plan grammar: `templates/IMPLEMENTATION_PLAN.template.md`.

Original requirement (user, 2026-09-03, Korean; verbatim copy in
`.agentdoc/<TS>/prompts/000-user-original.md`), summarised:
1. Up to **5** companions deployed at once (was 3).
2. The party is **not a row**: members overlap by **size** (largest at the
   back, smallest in front). Size is a hidden per-species attribute.
3. Every monster has an elemental **type** (a simplified Pokémon chart).
4. Against the current field monster, the party **auto-rebuilds** to the
   combination with the highest total type-adjusted attack.
5. **PvP**: default = the max-attack combination; a **manual PvP-only party**
   can be picked; the **opponent's party is visible** so the player can counter
   by type.
6. PvP win → **low-probability steal**; the victim gets a **notification**,
   clicking it **reclaims** the companion; after too long it can no longer be
   reclaimed.
7. PvP **plays a battle scene** (replay).
8. **Bigger field, smaller pixels/units** (more monsters on screen).

## 0. Scope and overrides

| v2 section | v3 override |
|---|---|
| GAME_DESIGN_V2 §4 companions | `ACTIVE_SLOTS = 3` → `PARTY_SIZE = 5`; `activeCompanions(cs, enemyType)` picks by **effective** power (type chart §2); volley damage is type-adjusted; presentation is an overlapping size-sorted group (§4) |
| GAME_DESIGN_V2 §6 `resolvePvp` | replaced by the deterministic **battle simulation** (§5) + steal roll; still exactly 2 rng draws; `pvpResult` action gains `replay` |
| GAME_DESIGN_V2 §2 save | `SaveFileV3` (`version: 3`, + `pvpParty: string[]`); v1/v2 migrate (§3) |
| GAME_DESIGN_V2 §3 bosses / §4 presentation constants | boss scale = species size + 1; every layout constant changes with the bigger field (§6) |
| GAME_DESIGN_V2 §9 menu / IPC | Battle tab = opponent panel + party editor + thefts inbox (§7); new channels `desmon:pvp-match`, `desmon:thefts`, `desmon:reclaim`; `desmon:pvp` payload changes; main MAY originate one action (`addCompanion` after a reclaim) |
| GAME_DESIGN_V2 §12 Non-Goals | "no arena replay" is DROPPED (the replay is a v3 feature); "no matches table" stays (matches are in-memory, §SERVER_V3) |
| GAME_ARCHITECTURE §3.1 window | overlay `WINDOW_W = 480`, `WINDOW_H = 300`; canvas `240×150` logical at CSS 2× (§6) |
| version | `0.3.0` everywhere the v2 design said `0.2.0` (tray title, dmg/app names, M8, README, packaging test) |

Hard rules unchanged: gates `npm test && npm run lint && npm run typecheck`;
never weaken tests; deterministic tests (injected Rng, dt, timers, fetch,
clock, store); one task per iteration; `src/core` imports nothing from
electron/DOM/node; `src/shared` imports nothing from `src/core`; no
`Date.now()`/timers in `src/core` or `src/server` logic (main MAY use a timer
for theft polling, injected in tests — §8). Pinned lists are EXTENDED, never
shrunk; `it(` counts per test file never decrease. **v3 test-migration policy:**
layout constants and superseded PvP maths legitimately CHANGE VALUES — edit the
assertion values (and, where the title states the old rule, the title) in the
task that owns the file; never delete/skip/merge an `it(`. The `registerIpcHandlers()`
literal in `src/main/index.ts` stays.

Ponytail applies: no type-chart table beyond the 5×5 rule below, no
matches table, no animation framework (the replay reuses `anim.ts`
particles + `spawnFloat` + sprite scatter), no notification queue module,
no new dependency.

## 1. Species attributes — `src/core/monsters.ts`

```ts
export type MonsterType = 'fire' | 'wind' | 'earth' | 'water' | 'dark';
export const TYPE_ORDER: readonly MonsterType[] = ['fire', 'wind', 'earth', 'water', 'dark']; // the chart cycle, §2
export const SPECIES_TYPE: Record<SpeciesId, MonsterType> = { slime: 'water', bat: 'wind', ghost: 'dark', golem: 'earth', dragon: 'fire' };
export const SPECIES_SIZE: Record<SpeciesId, 1 | 2 | 3> = { slime: 1, bat: 1, ghost: 2, golem: 3, dragon: 3 }; // hidden: never shown as text
export const typeOf = (speciesId: string): MonsterType;   // unknown species → 'water' (slime default, never throws)
export const sizeOf = (speciesId: string): 1 | 2 | 3;     // unknown → 1
```

`MonsterDef` gains `type: MonsterType` (from `SPECIES_TYPE`) — bosses keep
their species type. Species catalog order, `BOSS_EVERY`, HP/XP/coin formulas
are unchanged. Type is **visible** (HUD badge §6, menu badges §7); size is
**hidden** (affects only draw scale and z-order).

## 2. Type chart — `src/core/types-chart.ts` (new, pure)

Rock-paper-scissors-lizard-Spock over the 5-cycle `TYPE_ORDER`: a type
**beats** the next two in the cycle and **loses to** the previous two.

```ts
export const SUPER = 2n; export const WEAK_DIV = 2n;
export function beats(a: MonsterType, d: MonsterType): boolean;      // ((idx(d) - idx(a) + 5) % 5) ∈ {1, 2}
export function effectiveness(a: MonsterType, d: MonsterType): 'super' | 'normal' | 'weak'; // beats(a,d) → super; beats(d,a) → weak; else normal (a === d → normal)
export function effectivePower(power: bigint, a: MonsterType, d: MonsterType): bigint;
  // super → power * SUPER; weak → max(1n, power / WEAK_DIV); normal → power
```

Chart (attacker row → defender column): fire beats wind, earth · wind beats
earth, water · earth beats water, dark · water beats dark, fire · dark beats
fire, wind. Pin every cell in `tests/typeChart.test.ts` (25 cells, 10 super /
10 weak / 5 normal).

## 3. Save schema v3 — `src/core/save.ts`

```ts
export interface SaveFileV3 extends Omit<SaveFileV2, 'version'> { version: 3; pvpParty: string[] } // ≤ PARTY_SIZE companion ids, PvP-only
export type SaveFile = SaveFileV3;
export const DEFAULT_SAVE: Readonly<SaveFileV3>;  // v2 defaults + pvpParty: []
export function upgradeSave(s: SaveFileV1 | SaveFileV2 | SaveFileV3): SaveFileV3; // v1 → v2 rules, then pvpParty: []
export function parseSave(raw: unknown): SaveFileV3;   // pvpParty: array of strings that exist in companions, deduped, first PARTY_SIZE kept; else []
export function serializeSave(s: SaveFileV1 | SaveFileV2 | SaveFileV3): string;
export function createEngine(save?: SaveFileV1 | SaveFileV2 | SaveFileV3 | null, rng?: Rng): Engine;
```

`GameState` gains `pvpParty: string[]`. `toSave()` writes `version: 3` and
`pvpParty`. Existing v2 junk/migration tests keep their titles and values;
add: "migrates a v2 save: pvpParty defaults to empty", "pvpParty keeps only
ids present in the roster, deduped and capped at 5".

## 4. Party — `src/core/collection.ts`

```ts
export const PARTY_SIZE = 5;                                   // replaces ACTIVE_SLOTS (remove the old name; grep-pinned)
export function activeCompanions(cs: readonly Companion[], enemyType: MonsterType): Companion[];
  // top PARTY_SIZE by effectivePower(companionPower(c), typeOf(c.speciesId), enemyType) desc; ties → higher raw power → lower numeric id
export function autoParty(cs: readonly Companion[]): Companion[];    // top PARTY_SIZE by raw companionPower (ties → lower id) — the PvP default
export function pvpParty(cs: readonly Companion[], ids: readonly string[]): Companion[];
  // ids resolved against cs in the given order (unknown/duplicate ids dropped, first PARTY_SIZE); EMPTY result → autoParty(cs)
export function partyOrder(party: readonly Companion[]): Companion[]; // draw/battle order: size desc (back → front), ties keep party order
```

New action: `{ type: 'setPvpParty'; ids: string[] }` → `state.pvpParty =`
the validated ids (unknown ids dropped, capped, may be empty = auto); never
an error; no event. `companionPower`, lifecycle actions, `ROSTER_CAP = 30`,
`REBIRTH_MIN_INDEX = 40` unchanged. The `pvpResult` action gains an optional
`replay?: BattleReplay` (§5) that `applyCollection` ignores (presentation only).

**Volley (engine):** per volley, `party = activeCompanions(state.companions, state.monster.type)`
(recomputed every volley → the field party "auto-changes" when the monster
changes); `damage = effectivePower(companionPower(c), typeOf(c.speciesId), monster.type) * (fever ? FEVER_MULT : 1n)`.
`companionAttack` event gains `effectiveness: 'super' | 'normal' | 'weak'`
(float colour §6). A `monsterSpawned` event still fires as in v2; the renderer
re-reads the party from state, so no `partyChanged` event exists.

## 5. Battle simulation + PvP — `src/core/battle.ts` (new, pure) and `collection.ts`

```ts
export interface Blow { side: 'A' | 'D'; actorId: string; targetId: string; damage: bigint; ko: boolean }
export interface Battle { attackerWon: boolean; blows: Blow[] }
export const BATTLE_HP_MULT = 5n; export const BATTLE_MAX_BLOWS = 200;
export function simulateBattle(attacker: readonly Companion[], defender: readonly Companion[]): Battle;
```

Deterministic, no rng: both parties are taken in `partyOrder` (front first =
smallest); each member's hp = `companionPower(c) * BATTLE_HP_MULT`. Blows
alternate A, D, A, D… starting with the attacker; the actor is each side's
current front member, the target the other side's front member;
`damage = effectivePower(companionPower(actor), typeOf(actor), typeOf(target))`;
`hp -= damage`; `hp ≤ 0n` → `ko: true`, the next member steps up. Ends when a
side is out of members (`attackerWon` = defender out) or at
`BATTLE_MAX_BLOWS` (then `attackerWon = false`). Empty attacker → `attackerWon
false, blows []`; empty defender (bot) → `attackerWon true, blows []`.

```ts
export const STEAL_CHANCE = 0.15;
export function resolvePvp(attackerParty: readonly Companion[], defenderParty: readonly Companion[], rng: Rng, winnerRosterSize = 0):
  { attackerWon: boolean; moved: Companion | null; blows: Blow[] };
```

Exactly **two** rng draws, always consumed, in this order: (1) steal roll
`rng.next() < STEAL_CHANCE`; (2) victim index `⌊rng.next() · defenderParty.length⌋`.
`moved` = `defenderParty[victim]` iff `attackerWon && stealRoll && defenderParty.length > 0 && winnerRosterSize < ROSTER_CAP`, else null.
Only the **attacker** can steal (a losing attacker never loses a companion —
the defender is passive). `BattleReplay` (wire/IPC form, `src/shared/api.ts`):
`{ opponentName: string; opponentParty: Companion[]; blows: WireBlow[] }` with
`WireBlow = Blow & { damage: string }` (decimal). The server converts (§SERVER_V3);
the client never re-runs the maths.

Statistical pin (tests/collection.test.ts): seeded 10 000 wins → steals in
13–17 %.

## 6. Field, layout, presentation (renderer)

**Canvas / window.** `static/index.html` canvas `240×150`; `static/style.css`
canvas `480px × 300px` (2× CSS, `image-rendering: pixelated`, drag handle
unchanged); `src/main/window.ts` `WINDOW_W = 480`, `WINDOW_H = 300` (default
position rule unchanged: bottom-right of `workArea` minus `EDGE_MARGIN`).
Units shrink: `SPRITE_SCALE = 1` (hero art at 1×; was 2×) so every unit
pixel is 2 screen px instead of 4.

**Constants (`src/renderer/game.ts`)** — values are normative, tests pin them:

| constant | v3 |
|---|---|
| `VIEW_W`, `VIEW_H` | 240, 150 |
| `GROUND_Y` | 132 |
| `SPRITE_SCALE` | 1 |
| `HERO_X` | 96 |
| `MONSTER_X` | 176 |
| `HP_BAR` | `{ w: 40, h: 5, y: 96 }` |
| `BOSS_HP_BAR_Y` (boss.ts) | 78 |
| `DROP_LAND_X`, `DROP_TARGET_X`, `DROP_TARGET_Y` | 150, `VIEW_W - 12`, 8 |
| `PARTY_X` (party.ts) | 8 |
| `PARTY_STEP_X`, `PARTY_STEP_Y` (party.ts) | 14, 3 |

Monster draw scale = `sizeOf(species)` (normal) / `sizeOf + 1` (boss, replaces
`BOSS_SCALE = 3`); crown centred above the boss as before; floats spawn at
`barY − 6` as in v2.

**Party group (codex helper `src/renderer/sprites/party.ts`):**

```ts
export function partySlots(party: readonly { speciesId: string }[], groundY: number): { x: number; y: number; scale: number }[];
  // input already in partyOrder (back → front, size desc): slot r (0 = back) → scale = sizeOf(species),
  // x = PARTY_X + r * PARTY_STEP_X, feet y = groundY - (n - 1 - r) * PARTY_STEP_Y  → back members stand higher/left, front ones lower/right, overlapping
export function drawParty(ctx, party: readonly Companion[], frame: number, groundY: number, opts?: { flipX?: boolean; originX?: number }): void;
  // draws in slot order (back first) with `paletteForTier(idle.palette, stars)`; flipX true = facing right (left side of the field, default);
  // opts.originX + flipX false = the mirrored opponent group for the battle scene (§6 replay), x measured leftwards from originX
export function drawTypeBadge(ctx, type: MonsterType, x: number, y: number): void; // 5×5 filled square in TYPE_COLORS[type] with a 3×5 initial glyph (F/W/E/A/D) — the ONLY visible type marker
export const TYPE_COLORS: Record<MonsterType, string>; // fire COLORS.red, wind COLORS.cyan, earth COLORS.brown (or gray), water COLORS.blue (or navy), dark COLORS.purple (or slate) — existing palette entries only
```

`companionSlot`/`COMPANION_X`/`COMPANION_SLOT_GAP` (v2) are REPLACED by
`partySlots` (remove them; their tests are rewritten in the same codex task —
counts never decrease). Projectiles for `companionAttack` start at that
companion's slot centre; capture sparkle at the new member's slot (a capture
may not enter the field party — then sparkle at the boss position only).

**HUD:** `drawTypeBadge` next to the field monster's HP bar (left end, `y = barY`);
`companionAttack` floats coloured by effectiveness (`super` → yellow, `weak` →
steel, `normal` → white); the hero float rule is unchanged.

**Battle scene (claude, `game.ts`)** — `Game.playReplay(replay: BattleReplay): void`,
driven by `update(dt)` on the engine-independent presentation clock:
- Layout: my party group as usual (left, facing right); the field monster and
  its HP bar are hidden for the duration; the opponent's party is drawn
  mirrored on the right (`drawParty(..., { flipX: false, originX: VIEW_W - 8 })`)
  with `opponentName` in the 3×5 font above it; a `VS` banner (`showBanner(banner, 'VS ' + name)`) opens the scene.
- Pacing: `BLOW_MS = clamp(12000 / blows.length, 250, 600)`; per blow: projectile
  (`companionProjectile` in the actor species' hit colour) from actor slot to
  target slot, then the target's species hit effect + a float `format(damage)`
  coloured by effectiveness at the target; `ko` → `spawnSpriteScatter` of the
  target art and it disappears from its group; after the last blow + 600 ms →
  `VICTORY!`/`DEFEAT` banner, then the field returns (monster visible again).
- The engine keeps running underneath (inputs still attack; those events are
  applied to state but their presentation is suppressed while the scene plays —
  no floats/effects from the field during the replay). `pvpResult`'s roster
  change (`stolen`/`lostId`) is applied by the engine immediately; the pop-in
  sparkle / scatter play after the scene ends.
- Tests (recording canvas, `tests/renderer.test.ts`): "playReplay draws the
  opponent party mirrored on the right with its name", "each blow spawns a
  projectile then a float at the target", "a ko scatters the target and removes
  it from the opponent group", "the field monster is hidden while a replay
  plays and returns afterwards", "replay pacing clamps to 12 s".

**Field party:** drawn via `drawParty(partyOrder(activeCompanions(state.companions, state.monster.type)), …)`
every frame (no cached party — the "auto-change" is visible the frame after a
new monster spawns). Effects: `bossShockwave`, `captureSparkle`, `feverAura`
unchanged; add `EFFECTS.koScatter`? — NO: reuse `spawnSpriteScatter` (ponytail).

## 7. Menu window (Collection & Battle) v3

Window `width: 420, height: 640` (menuWindow.ts; other options unchanged).
Roster tab: cards gain a type badge (`<span class="type type-fire">F</span>`
… with `TYPE_COLORS`) and a "★ PvP" mark when the companion is in `pvpParty`.

**Battle tab (`static/menu.html`, `src/menu/{index,view}.ts`)** — sections top
to bottom, fixed ids/classes the CSS targets:
1. `#name` row (unchanged) + `#find` button `Find opponent` → `pvpMatch()`.
2. `#opponent` panel: name, rank/deepest, and `.party` = up to 5 `.card.mini`
   (species canvas, `Lv`, `★`, type badge) in `partyOrder`; empty → `No opponent yet`.
   Bot → `Training Dummy (no party)`.
3. `#party` editor: 5 `.slot`s (filled from `pvpParty(save.companions, save.pvpParty)`),
   below it the roster as `.card.mini.pick` buttons (click toggles membership,
   max 5; a member shows `.selected`); buttons `#auto` (= `autoParty`) and
   `#save-party` (→ `sendAction({ type: 'setPvpParty', ids })`); a live
   `#preview` line `Σ vs opponent: <format(total effective power)>` computed by
   `view.ts partyPreview(myParty, opponentParty)` (sum of `effectivePower`
   against the opponent's FRONT member type when an opponent is known, raw sum
   otherwise).
4. `#battle-go` `Battle!` — enabled iff a match is loaded (not expired) AND my
   party has ≥ 1 member AND no cooldown countdown; → `pvp(matchId, ids)` →
   on success: `removeCompanions` (if `removed`), then
   `sendAction({ type: 'pvpResult', won, stolen, lostId: null, replay })`
   (the game window plays the scene, §6), then `#result` text
   (`pvpResultText`: "Victory over X — stole Y!" / "Victory over X." /
   "Defeat by X."); `cooldown` → countdown as v2; `match_expired` → clears the
   opponent panel with `Opponent expired — find again`.
5. `#thefts` inbox: rows from `thefts()` — `"<thief> stole <Species Lv n> · <h>h <m>m left"` +
   `Reclaim` button (`reclaim(theftId)` → on success `sendAction({ type: 'addCompanion', companion })`
   then re-list; `expired`/`gone` → row removed with the reason). Refreshed on
   tab open and after every battle.

`view.ts` (pure, fully tested): `opponentRows(match)`, `partyPreview(...)`,
`togglePick(ids, id)` (max 5), `theftRows(thefts, now)` (time left text,
`now` injected), `pvpResultText(result)`, `battleEnabled(state)`.
`index.ts` stays a thin binder (source-contract greps). CSS (codex): `.type`
badges (`.type-fire` … five colours), `.card.mini`, `.slot`, `.pick.selected`,
`#thefts .row` — DB16 palette, no `url()`, no fonts.

## 8. Notifications + reclaim (main)

- `src/main/thefts.ts` (electron-free core of the poller, injected deps):
  `createTheftWatcher({ session, notify: (t: TheftNotice) => void, setInterval, clearInterval, intervalMs = THEFT_POLL_MS })`
  with `THEFT_POLL_MS = 300_000`; `start()`/`stop()`/`poll()`; `poll()` calls
  `session.thefts()`, and for every pending theft whose id is not in
  `identity.notifiedTheftIds` calls `notify(t)` and records the id
  (`writeIdentity`; `notifiedTheftIds` is capped at 32). Offline (`ok: false`)
  → nothing. Tests inject fake timers and a fake session.
- `src/main/index.ts` (non-SMOKE branch only): `watcher = createTheftWatcher({... setInterval, clearInterval, notify })`,
  `notify` = `new Notification({ title: 'DesMon', body: \`${t.thiefName} stole your ${speciesName} Lv ${level}! Click to reclaim (${hoursLeft}h left).\` })`
  with `on('click', () => reclaimAndApply(t.id))`: `session.reclaim(id)` →
  `ok` → `sendToAll(IPC.ACTION, { type: 'addCompanion', companion })` (the
  ONE main-originated action; `narrowAction` already accepts `addCompanion`)
  → the game window applies + flushes → `STATE_CHANGED` reaches the menu.
  `Notification.isSupported()` false → skip silently. Poll immediately on boot
  (after `ready`), then every `THEFT_POLL_MS`; `will-quit` → `stop()`.
- `Identity` gains `notifiedTheftIds: string[]` (default `[]`, tolerant read).
- SMOKE never starts the watcher (`isSmoke` guard) and never calls fetch.

## 9. IPC / preload additions (`src/shared/ipc.ts`, `src/preload/index.ts`, `global.d.ts`)

| constant | channel | kind | payload → result | preload |
|---|---|---|---|---|
| `PVP_MATCH` | `desmon:pvp-match` | invoke | none → `NetResult<MatchResult>` | `pvpMatch()` |
| `PVP` (existing) | `desmon:pvp` | invoke | `{ matchId: string; party: string[] }` → `NetResult<PvpResult>` | `pvp(matchId, party)` |
| `THEFTS` | `desmon:thefts` | invoke | none → `NetResult<TheftsResult>` | `thefts()` |
| `RECLAIM` | `desmon:reclaim` | invoke | `{ theftId: string }` → `NetResult<ReclaimResult>` | `reclaim(theftId)` |

Pinned lists grow (IPC `toEqual` table, preload `it.each`, `ipcMain.handle`
list, `global.d.ts` regex). `narrowAction` gains `setPvpParty` (`strs('ids')`)
and accepts the optional `replay` object on `pvpResult` (validated: `opponentName`
string, `opponentParty` array, `blows` array of `{ side, actorId, targetId, damage: string, ko }`).

## 10. Audio / version / docs

- No new blip (4 stay). Battle scene reuses `attack`/`kill` blips per blow/ko.
- `package.json` + lock `0.3.0`; tray title `DesMon v0.3.0`; artifacts
  `release/DesMon-0.3.0-arm64.dmg`, `release/mac-arm64/DesMon.app`; README v3
  sections (types chart, party of 5, PvP flow with opponent preview + manual
  party, steal/reclaim + notification + 24 h window, battle replay, window
  size); SPEC manual appendix M15–M20 (§12).

## 11. Worker split

| area | worker |
|---|---|
| type chart, species attrs, save v3, party selection, battle sim + resolvePvp, engine volley, renderer layout + battle scene, thefts watcher | claude |
| party group + type badge + type colours (party.ts), layout constants in sprites (boss scale by size, `BOSS_HP_BAR_Y`), menu CSS v3, replay effect tweaks (effects.ts) | codex (≤ 4 tasks) |
| server (match, pvp v3, thefts, reclaim, PgStore column), net client/session, IPC, deploy (v3 service) | claude |
| menu Battle tab v3, roster badges, version/README/SPEC, deploy re-verify, packaging 0.3.0, SPEC sweep | claude |

Codex file set unchanged (`src/renderer/sprites/**`, `src/renderer/{anim,hud,effects}.ts`,
`static/{style,menu}.css`, their tests). `game.ts`, `index.html`, `menu.html`,
`src/menu/**`, `src/main/**` are claude.

## 12. SPEC directives (Spec Clarifier, AMEND mode)

Keep F01–F58 rows and IDs (the v2 table `### v2 features (F28+)` stays).
Exact amendments:

| target | amendment |
|---|---|
| Summary | add: elemental types with a 5-cycle chart, hidden sizes, a 5-member overlapping party auto-picked by effective power, PvP with opponent preview + manual party + battle replay, low-chance steal with notification + 24 h reclaim, 480×300 overlay |
| Assumption 17 | overlay is 480×300 (canvas 240×150 at 2×); units at 1×, monsters at their size (1–3), bosses size+1 |
| Assumption 24 | the party is the 5 companions with the highest **effective** power against the field monster's type; volley damage is type-adjusted; ties → raw power → lower id |
| Assumption 29 | window 420×640; Battle tab has opponent panel, party editor, thefts inbox |
| Assumption 34 | REPLACE: PvP is asynchronous, two-step (match → battle), resolved by the deterministic core battle simulation on the server; the attacker steals with probability 0.15 on a win; the loser can reclaim within 24 h; replay blows are returned and played by the game window |
| Assumption 37 | version 0.3.0 |
| F23 / F25 / M8 / F57 literals | `0.2.0` → `0.3.0` |
| F32 Behavior | `ACTIVE_SLOTS = 3` → `PARTY_SIZE = 5`, effective-power selection; AC greps `PARTY_SIZE = 5` |
| F35 Behavior | volley from `activeCompanions(cs, monster.type)` with `effectivePower`; `companionAttack.effectiveness` |
| F37 | REPLACE Behavior/AC with §5 (`simulateBattle`, `resolvePvp` v3 signature, 2 draws, `STEAL_CHANCE = 0.15`, attacker-only steal) |
| F40 | party group replaces companion slots (`partySlots`, `drawParty`, `drawTypeBadge`, `TYPE_COLORS`); boss scale = size + 1 |
| F45 | `POST /v1/pvp` v3 body `{ matchId, party }`, response with `blows`; add rows F59+ for match/thefts/reclaim |
| F49 / F51 / F53 / F55 | IPC additions (§9), main-originated `addCompanion` after reclaim, `pvpResult.replay`, Battle tab v3 |
| Non-Goals | DROP "No PvP arena replay"; ADD: "no real-time PvP, no spectating; the replay is a deterministic re-enactment of the server's blow list", "no push infrastructure: theft notifications come from a 5-minute poll while online", "no multi-instance server (matches are in-memory; a restart expires pending matches)", "type chart is the fixed 5-cycle; no dual types, no STAB, no status effects", "size is never shown as a number" |
| Input & Clock Abstraction | add: "main's theft poller uses an injected `setInterval`; core/server still never read the clock" |
| `## Server / API` | add rows for `POST /v1/pvp/match`, `GET /v1/thefts`, `POST /v1/reclaim`, `410 match_expired/expired`, `409 gone`; `PUT /v1/snapshot` response gains `thefts` |
| `## Deployment` | service `desmon-server-v3` from branch `v3` (shares `desmon-db`); `SERVER_URL=<set by render-bootstrap>` placeholder again until the v3 deploy task; healthz sha rule against the `v3` branch HEAD |

New feature rows F59+ go in a THIRD table directly below the v2 table, headed
`### v3 features (F59+)`, same columns. One row per: type chart + species
attrs; save v3; party selection + `setPvpParty`; battle sim + resolvePvp v3;
engine type-adjusted volley; renderer layout v3 (window/canvas/constants);
party group + badge helpers (codex); battle scene replay; menu CSS v3 (codex);
server match; server pvp v3 + steal + thefts; server thefts/reclaim endpoints;
PgStore thefts column; net client/session v3; IPC v3; theft watcher +
notification; menu Battle tab v3 (+ roster badges); version 0.3.0 + docs;
deploy v3 service; deploy re-verify; packaging 0.3.0 + packaged smoke; SPEC
sweep. ACs follow the "pass = what" discipline; codex rows vitest/grep only.

**Manual appendix additions** (after M14): M15 party group (5 members
overlapping, big at the back), M16 type badge + auto-change when the monster
changes, M17 opponent preview + manual party + Battle → replay scene in the
overlay, M18 steal → notification on the victim's machine → click → companion
back, M19 expired reclaim (after 24 h: row says expired), M20 bigger field /
smaller units at 480×300.

## 13. Suggested decomposition (baseline for the Planner; APPEND after T53)

Plan grammar v2 (`### [ ] T<NN> — title`, `- AC:`/`- Deps:`/`- Worker:`/`- Files:`/`- Notes:`;
Deps backward only; Files COMPLETE). The Planner writes the `AC:` lines (test
titles named here MUST appear in them). Smoke rule: any task whose AC runs
`npm run smoke` or the app binary lists T22 in Deps (SMOKE isolation exists).
Push rule: `push: yes` ONLY in the deploy tasks; the push command is
`git push origin HEAD:v3` (the integration branch of this harness run).

Chains (disjoint Files; cross-chain Deps only at integration points):

**Server chain (claude)**
- T54 — Server v3 scaffold: thefts column + Store methods, in-memory match store, `POST /v1/pvp/match` (FIRST task; title contains `server`). Files: `src/server/store.ts`, `src/server/app.ts`, `src/server/pgStore.ts`, `src/shared/api.ts`, `tests/server/app.test.ts`, `tests/server/pgStore.test.ts`. Deps: none. Tests: "pvp match picks the rank neighbour and returns its party with a match id", "a match expires after MATCH_TTL_MS", "thefts column is added idempotently". Notes: SERVER_ARCHITECTURE_V3 §2–§4; wire types `MatchResponse`, `Theft`, `WireBlow`, `BattleReplay`, `TheftsResponse`, `ReclaimResponse`, `Snapshot.party`; `Store` += `setThefts`; DDL `ALTER TABLE … ADD COLUMN IF NOT EXISTS thefts`; MemoryStore + PgStore updated together (both implement the interface — a half-updated interface cannot typecheck).
- T60 — Server `POST /v1/pvp` v3: match validation, party validation, core `resolvePvp` v3, steal + theft record, blows on the wire. Deps: T54, T58. Files: `src/server/app.ts`, `tests/server/pvp.test.ts`.
- T61 — Server `GET /v1/thefts` + `POST /v1/reclaim` (expiry 410, gone 409, thief `stolenIds`), snapshot response `thefts`. Deps: T60. Files: `src/server/app.ts`, `tests/server/app.test.ts`.

**Core chain (claude)**
- T55 — Type chart + species type/size (`types-chart.ts`, `monsters.ts`, `MonsterDef.type`). Deps: none. Files: `src/core/types-chart.ts`, `src/core/monsters.ts`, `src/core/types.ts`, `src/core/index.ts`, `tests/typeChart.test.ts`, `tests/formulas.test.ts`. Tests: "every type beats the next two in the cycle and loses to the previous two", "effectivePower doubles on super, halves on weak with a floor of 1", "each species has a fixed type and a hidden size".
- T56 — SaveFileV3 + `pvpParty` migration + `GameState.pvpParty`. Deps: T55. Files: `src/core/save.ts`, `src/core/engine.ts`, `src/core/types.ts`, `src/core/index.ts`, `tests/save.test.ts`, `tests/engine.test.ts`.
- T57 — Party selection: `PARTY_SIZE`, `activeCompanions(cs, enemyType)`, `autoParty`, `pvpParty`, `partyOrder`, `setPvpParty` action. Deps: T56. Files: `src/core/collection.ts`, `tests/collection.test.ts`. Tests: "activeCompanions picks the 5 highest effective powers against the enemy type", "the party changes when the enemy type changes", "pvpParty resolves ids in order and falls back to autoParty when empty", "partyOrder sorts by size descending keeping party order on ties", "setPvpParty drops unknown ids and caps at 5".
- T58 — Battle simulation + resolvePvp v3 (`battle.ts`; `STEAL_CHANCE`). Deps: T57. Files: `src/core/battle.ts`, `src/core/collection.ts`, `src/core/index.ts`, `tests/battle.test.ts`, `tests/collection.test.ts`. Tests: "blows alternate from the front members and ko advances to the next", "type advantage decides an otherwise equal battle", "an empty defender party is an instant win with no blows", "the battle stops at BATTLE_MAX_BLOWS with a defender win", "resolvePvp steals only on a win with the 15 percent roll and draws exactly 2 rng values", "a losing attacker never loses a companion".
- T59 — Engine: type-adjusted volley from `activeCompanions(cs, monster.type)`, `companionAttack.effectiveness`, `pvpResult.replay` accepted. Deps: T58. Files: `src/core/engine.ts`, `src/core/types.ts`, `tests/engine.test.ts`.

**Graphics chain (codex, ≤ 4)**
- T62 — Party group helpers: `party.ts` (`partySlots`, `drawParty`, `drawTypeBadge`, `TYPE_COLORS`), remove `companionSlot`; boss scale by size, `BOSS_HP_BAR_Y = 78`. Deps: T55 (types exist). Files: `src/renderer/sprites/party.ts`, `src/renderer/sprites/companion.ts`, `src/renderer/sprites/boss.ts`, `src/renderer/sprites/index.ts`, `tests/sprites.test.ts`. Tests: "partySlots stacks back members higher and left of front members with scale by size", "drawParty paints back members first so front members overlap them", "drawTypeBadge paints a coloured square with the type initial", "drawBoss scales by species size plus one".
- T63 — Menu CSS v3: type badges, mini cards, party slots, picks, thefts rows. Deps: none. Files: `static/menu.css`.
- T64 — Effects/HUD tweaks for the battle scene: effectiveness float colours (`hud.ts` `floatColor(effectiveness)`), `EFFECTS.koBurst` NOT added (reuse) — only `hud.ts` + `effects.ts` constants needed by §6. Deps: none. Files: `src/renderer/hud.ts`, `src/renderer/effects.ts`, `tests/renderer.test.ts`, `tests/effects.test.ts`.

**Renderer chain (claude)**
- T65 — Field v3: window 480×300, canvas 240×150, layout constants, `SPRITE_SCALE = 1`, monster scale by size, type badge in HUD, party group drawing, effectiveness floats. Deps: T22, T59, T62, T64. Files: `src/main/window.ts`, `static/index.html`, `static/style.css`, `src/renderer/game.ts`, `tests/window.test.ts`, `tests/renderer.test.ts`, `tests/drag.test.ts`. Notes: 7 files by design (a half-resized field cannot pass its pins); every pinned coordinate updated per §6; smoke in AC.
- T66 — Battle scene: `Game.playReplay`, opponent group mirrored, pacing, KO scatter, banner, field hidden/restored, presentation suppression. Deps: T65. Files: `src/renderer/game.ts`, `tests/renderer.test.ts`.

**Net / menu chain (claude)**
- T67 — Net client + session v3: `match`, `pvp(matchId, party)`, `thefts`, `reclaim`; `toSnapshot` includes `party`; identity `notifiedTheftIds`. Deps: T54, T56. Files: `src/main/net.ts`, `src/main/identity.ts`, `tests/net.test.ts`, `tests/identity.test.ts`.
- T68 — IPC v3: `PVP_MATCH`/`THEFTS`/`RECLAIM`, `PVP` payload, `narrowAction` (`setPvpParty`, `pvpResult.replay`), preload, `global.d.ts`, `sendToAll`. Deps: T67, T59. Files: `src/shared/ipc.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, `src/renderer/global.d.ts`, `tests/ipc.test.ts`.
- T69 — Theft watcher + native notification + reclaim → `addCompanion` (main). Deps: T68. Files: `src/main/thefts.ts`, `src/main/index.ts`, `tests/thefts.test.ts`, `tests/window.test.ts`. Notes: injected timers; SMOKE never starts it; `Notification.isSupported()` guard; smoke in AC.
- T70 — Menu window 420×640 + Battle tab v3 markup + `view.ts` (opponentRows, partyPreview, togglePick, theftRows, pvpResultText, battleEnabled). Deps: T68. Files: `src/main/menuWindow.ts`, `static/menu.html`, `src/menu/view.ts`, `tests/menu.test.ts`.
- T71 — Menu binder v3: find opponent, party editor (+ auto/save), Battle! with match + party, replay forwarding, thefts inbox + reclaim, roster type badges / PvP marks. Deps: T70, T66, T63. Files: `src/menu/index.ts`, `tests/menu.test.ts`.

**Tail (claude)**
- T72 — Version 0.3.0, tray title, README v3, SPEC M15–M20 gaps, packaging test literal. Deps: T71, T69. Files: `package.json`, `package-lock.json`, `src/main/tray.ts`, `README.md`, `SPEC.md`, `tests/packaging.test.ts`, `tests/tray.test.ts`.
- T73 — Render deploy v3: `DESMON_SRV_NAME=desmon-server-v3 DESMON_BRANCH=v3 bash .harness/v3/loop/render-bootstrap.sh`, `SERVER_URL` baked, `git push origin HEAD:v3`, `render deploys create --wait`, healthz + probe, AGENTS.md §Server v3 lines. Deps: T61, T67. Files: `src/shared/serverUrl.ts`, `src/server/probe.ts`, `AGENTS.md`, `README.md`. Notes: `push: yes`.
- T74 — Deploy re-verify v3 (healthz sha ancestor of `v3` HEAD, filter paths untouched, redeploy). Deps: T72, T73. Files: `AGENTS.md`. Notes: `push: yes`.
- T75 — Packaging 0.3.0 + packaged smoke + no pg/server in the asar. Deps: T22, T74. Files: `README.md`.
- T76 — SPEC criteria sweep (F01–F7x, Server / API, Deployment — literal). Deps: every other new task. Files: (gaps only).

## 14. Pre-resolved assumptions (SPEC §Assumptions, numbered after v2's 41)

42. Types: five elements in a fixed cycle (fire → wind → earth → water → dark → fire); a type beats the next two and loses to the previous two; super = ×2, weak = ÷2 (floor 1), same type = normal. Species types are fixed (slime water, bat wind, ghost dark, golem earth, dragon fire); bosses share their species type.
43. Size is a hidden per-species attribute 1–3 (slime/bat 1, ghost 2, golem/dragon 3): draw scale and z-order only; never displayed as a number.
44. The field party is the 5 companions with the highest effective power against the current monster's type, recomputed every volley and every frame (auto-change on spawn); the PvP party is a manual list of ≤ 5 ids stored in the save (`pvpParty`), empty = the 5 strongest by raw power.
45. PvP is two-step and asynchronous: `match` returns the server-picked opponent (rank neighbour or Training Dummy) with its stored PvP party and a match id valid for 120 s; `battle` sends the match id + my party; the server resolves with the deterministic core battle simulation (alternating front-member blows, hp = power × 5, cap 200 blows) and returns the blow list; the client replays it (≤ 12 s) — no re-computation on the client.
46. Only the attacker can steal: on a win, a 15 % roll takes one uniformly random member of the defender's PvP party (not into a full roster). The victim gets a theft record (24 h reclaim window), a native notification on the next poll (every 5 min while online, immediately at boot), and can reclaim from the notification click or the Battle tab; after 24 h (or if the thief no longer holds it) the reclaim fails and the record disappears.
47. Matches are held in server memory (single free instance; a restart expires them: 410 `match_expired` → the client asks for a new match). Thefts live in the `players.thefts` jsonb column (last 8).
48. The overlay is 480×300 (canvas 240×150 at CSS 2×); units draw at 1× (half the v2 size), monsters at their size, bosses at size + 1; the party group overlaps with the largest member at the back.
49. Main may originate exactly one action type (`addCompanion` after a successful reclaim); every other roster change still flows menu → main → game.
50. Version 0.3.0; the v3 server is a second Render web service (`desmon-server-v3`) built from branch `v3`, sharing `desmon-db` (additive idempotent DDL); v2 (tag `v2`) stays deployable from `main`.
