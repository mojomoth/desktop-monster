# GAME_DESIGN_V2.md — DesMon v2 game/client design (normative)

Consumed by the Spec Clarifier (AMEND mode) and the Planner (APPEND mode) of
harness v2. Server internals, API and deploy runbook live in
`SERVER_ARCHITECTURE.md` (same directory); this file only fixes the
client/server boundary. Loop mechanics: `.harness/v2/HARNESS.md` and the plan
grammar in `templates/IMPLEMENTATION_PLAN.template.md`.

## 0. Scope and overrides

- Everything in `GAME_ARCHITECTURE.md` (v1) stays true unless overridden here.
  Overridden sections:

| GAME_ARCHITECTURE section | v2 override |
|---|---|
| §2 core types & formulas | `monsterHp`/`maxHp`/damage/companion power become `bigint` (§1); `monsterMaxHp` is exact-rational; `MonsterDef.boss`; `GameState` gains companions/souls/rebirths/bestIndex/nextCompanionId/fever; new `GameEvent` variants; `Engine` gains `tick`/`apply` (§7); save schema is `SaveFileV2` (§2) |
| §3.2 IPC table, §3.3 preload | 8 channels + 8 preload methods added (§9); `load-state`/`save-state` payload is `SaveFileV2` |
| §3.4 tray | menu gains `Collection & Battle…` between the separator and `Reset Progress`; title `DesMon v0.2.0` |
| §4 rendering | font gains A–Z and `. : - + %` (§1); HP bar takes `bigint`; banner text is a parameter; boss/companion/fever presentation (§3–§5, §8) |

- Hard rules unchanged: gates `npm test && npm run lint && npm run typecheck`;
  never weaken tests; deterministic tests (injected Rng, dt, timers, fetch,
  clock); one task per iteration; core imports nothing from electron/DOM/node.
- New rule: engine time is an **injected clock** — `engine.tick(dt)` is the only
  thing that advances it; no `Date.now()` in `src/core` or `src/server` logic.
- Pinned lists (`tests/ipc.test.ts` IPC table + preload method list,
  `tests/tray.test.ts` menu order, `tests/renderer.test.ts` global.d.ts regex,
  `tests/sprites.test.ts` glyph test, `tests/packaging.test.ts`) are **EXTENDED,
  never shrunk**. `it(` counts per test file never decrease (ACs guard them).
- `src/main/index.ts` keeps the literal `registerIpcHandlers()` (pinned by
  `tests/ipc.test.ts`): the relay in §9 resolves windows from the IPC sender,
  so production needs no options object.
- Ponytail applies (`PONYTAIL.md`): native `bigint`, no `{m,e}` type, no sync
  scheduler module, no `matches` table, no `rosterChanged` action/event, no
  arena replay.

## 1. Unbounded numbers — `src/core/bignum.ts`

**Representation: native `bigint`.** Scope:

| field | type | why |
|---|---|---|
| `GameState.monsterHp`, `MonsterDef.maxHp` | `bigint` | 10·1.15^i is exponential |
| `attack.damage`, `monsterHit.hpAfter`/`maxHp`, `companionAttack.damage` | `bigint` | subtracted from HP |
| `companionPower()`, `resolvePvp` powers | `bigint` | derived from `maxHp` |
| `level, xp, killCount, coins, monsterIndex, souls, rebirths, stars, bestIndex, nextCompanionId` | `number` | linear/log curves; never near 2^53 |
| save/wire copies of bigint fields | decimal `string` | JSON has no bigint |

**Formulas (`src/core/formulas.ts`)** — exactly one line changes:

```ts
export const monsterMaxHp = (index: number): bigint => {
  const i = BigInt(Math.max(0, Math.floor(index)));
  return (10n * 115n ** i) / 100n ** i; // exact floor(10·1.15^i); equals the v1 double for every i < 199
};
// damageForLevel, xpReward, xpToNext, CRIT_CHANCE, CRIT_MULT unchanged (number)
```

Verified: equals `Math.floor(10 * 1.15 ** i)` for all i ≤ 198 (first divergence
i = 199, off by one — invisible to v1 tests which pin 0/5/10/20 and monotonic
0..49). Index 5000 → 305 digits in < 1 ms.

**API**

```ts
export function suffix(g: number): string;              // bijective base-26: 1→A … 26→Z, 27→AA, 52→AZ, 53→BA, 702→ZZ, 703→AAA; g ≤ 0 → ''
export function format(n: bigint | number): string;     // rule below; negative/non-finite number → '0'
export function ratio(num: bigint, den: bigint): number; // den ≤ 0n → 0; else Number(num * 10000n / den) / 10000 clamped to [0, 1]
export function bigField(raw: unknown): string | null;   // finite number → String(Math.max(0, Math.floor(n))); /^\d+$/ string → itself; else null (bigint input → null: not a JSON value)
```

**Format rule (exact):** `s = n.toString()`. If `s.length ≤ 3` → `s`. Else
`d = s.length`, `g = ⌊(d − 1) / 3⌋`, `lead = d − 3g ∈ {1, 2, 3}`, `m = s.slice(0, 3)`;
text = (`lead === 3` ? `m` : `m.slice(0, lead) + '.' + m.slice(lead)`) + `suffix(g)`.
Truncation, never rounding.

| n | text |
|---|---|
| 999 | `999` |
| 1000 | `1.00A` |
| 12345 | `12.3A` |
| 123456 | `123A` |
| 999999 | `999A` |
| 1e6 | `1.00B` |
| 1e9 | `1.00C` |
| 1e78 | `1.00Z` |
| 1e81 | `1.00AA` |
| 1e2106 | `1.00ZZ` |
| 1e2109 | `1.00AAA` |

Renderer: damage floats `format(event.damage)`; menu shows companion power via
`format`. Coin/kill counters stay `String(number)`. The font must contain
`.` and A–Z (T33, codex).

**Test-migration policy (normative for T24/T25 builders)** — assertions keep
their VALUES and change only their type; no `it(` is deleted, skipped or
merged. Concrete edits:

| file | edit |
|---|---|
| `tests/formulas.test.ts` | `toBe(10)`/`20`/`40`/`163` → `10n`/`20n`/`40n`/`163n`; the "positive integers and strictly increasing" helper maps `monsterMaxHp` through `Number(...)` (or compares bigints with `>`); add "monsterMaxHp is exact for huge indices: index 5000 has 305 digits" |
| `tests/engine.test.ts` | `makeSave()` stays a **V1** literal: `monsterHp: Number(monsterMaxHp(monsterIndex))`; `expect(s.monsterHp).toBe(10)` → `10n`, `9` → `9n`, `5` → `5n`, `7` → `7n`; `getState() as { monsterHp: number }` casts → `bigint`; `expect(save.monsterHp).toBe(a.getState().monsterHp)` → `toBe(String(a.getState().monsterHp))` (already string after T24) |
| `tests/renderer.test.ts` | `attackOnly`: `damage: 1n`, `hpAfter: 9n, maxHp: 10n`; `drawHpBar(ctx, 0, 0, 34, 5, 1, 1000)` → `1n, 1000n`, `5, 10` → `5n, 10n`; `stateFixture` is rewritten in T24 as `{ ...createEngine(null, mulberry32(1)).getState(), ...overrides }` so later field additions never break it; add "drawHpBar takes bigint hp and maxHp" |
| `tests/save.test.ts` (T24) | `richSave` becomes a **V2** literal (`version: 2`, `monsterHp: '77'`, `companions: [...]`, `nextCompanionId`, `souls`, `rebirths`, `bestIndex`); round-trip stays `toEqual(richSave)`; "DEFAULT_SAVE is a fresh-game v1 save" → "… v2 save" with `monsterHp` `toBe(String(monsterMaxHp(0)))`; junk case `monsterHp: 10n` keeps its assertion (bigint is not JSON → default); `monsterHp: 0` → `'1'`; the F10 titles stay verbatim |
| `tests/audio.test.ts`, `tests/rendererInput.test.ts`, `tests/persistence.test.ts` | untouched — their V1 literals still type-check because `createEngine`/`serializeSave` accept `SaveFileV1 \| SaveFileV2` |

vitest 3.2.7 matchers accept bigint (`toBe`, `toEqual`, `toBeGreaterThan`,
`toBeLessThan`).

## 2. Save schema v2 — `src/core/save.ts`

```ts
export interface Companion {
  id: string;         // 'c1', 'c2' … minted from nextCompanionId (deterministic; never uuid)
  speciesId: string;  // SpeciesId of the captured boss
  bossIndex: number;  // global monster index it was captured at → base power
  level: number;      // 1..COMPANION_MAX_LEVEL (10)
  stars: number;      // 0..∞; tint = paletteForTier(palette, stars)
}
export interface SaveFileV2 {
  version: 2;
  level: number; xp: number; killCount: number; coins: number;
  items: Record<string, number>;
  monsterIndex: number;
  monsterHp: string;          // decimal digits, ≥ '1'
  companions: Companion[];    // ≤ ROSTER_CAP (30)
  nextCompanionId: number;    // starts 1
  souls: number; rebirths: number; bestIndex: number;
}
export type SaveFile = SaveFileV2;
export interface SaveFileV1 { … unchanged (legacy input shape, number monsterHp) … }
export const DEFAULT_SAVE: Readonly<SaveFileV2>;   // version 2, level 1, monsterHp: String(monsterMaxHp(0)) = '10', companions [], nextCompanionId 1, souls 0, rebirths 0, bestIndex 0
export function upgradeSave(s: SaveFileV1 | SaveFileV2): SaveFileV2;  // v1 → v2: monsterHp String(max(1, floor)), companions [], nextCompanionId 1, souls 0, rebirths 0, bestIndex = monsterIndex
export function parseSave(raw: unknown): SaveFileV2;                   // never throws (string or value input)
export function serializeSave(s: SaveFileV1 | SaveFileV2): string;     // upgrades first; fixed key order; items keys sorted; companions in array order
export function createEngine(save?: SaveFileV1 | SaveFileV2 | null, rng?: Rng): Engine; // upgrades internally
```

**parseSave migration rules** (per field, independent fallbacks):

| field | accepted | fallback |
|---|---|---|
| `level, xp, killCount, coins, monsterIndex, souls, rebirths, bestIndex, nextCompanionId` | finite number → floored, clamped to min (level/nextCompanionId ≥ 1, rest ≥ 0) | `DEFAULT_SAVE` value |
| `items` | v1 rule (finite counts flooring to ≥ 1) | `{}` |
| `monsterHp` | `bigField(raw)`; `'0'` → `'1'` | `DEFAULT_SAVE.monsterHp` |
| `companions` | array; keep entries with string non-empty `id`, `speciesId ∈ SPECIES_IDS`, integer `bossIndex ≥ 0`, integer `1 ≤ level ≤ 10`, integer `stars ≥ 0`; duplicate ids dropped (first wins); truncated to `ROSTER_CAP` | `[]` |
| `nextCompanionId` | additionally raised to `1 + max(numeric part of ids)` so re-minting never collides | `1` |
| `version` | ignored on input (shape decides); output always `2` | — |

Junk cases (must stay in `tests/save.test.ts`): `null`, `undefined`, `42`,
`'not json'`, `[]`, `{ level: 'x' }`, `{ monsterHp: 10n }`,
`{ level: Infinity, xp: -Infinity, monsterHp: 10n }` → every field defaults;
`monsterHp: 0` → `'1'`; a v1 literal migrates to v2 with `companions: []`;
invalid companion entries dropped, valid kept, > 30 truncated.

Wire/disk stays JSON-plain: `src/main/persistence.ts`, `desmon:save-state`,
`desmon:load-state` and `tests/persistence.test.ts` are untouched. Engine
resume clamps `monsterHp` into `[1n, maxHp]`.

## 3. Bosses — `src/core/monsters.ts`, capture, roster cap

```ts
export const BOSS_EVERY = 8;                                   // not a multiple of 5 → bosses cycle all species
export const isBoss = (i: number): boolean => i >= 0 && i % BOSS_EVERY === BOSS_EVERY - 1; // 7, 15, 23, 31, 39 …
export const BOSS_HP_MULT = 5n; export const BOSS_XP_MULT = 5; export const BOSS_COIN_MULT = 5;
// MonsterDef.boss: boolean; maxHp = monsterMaxHp(i) * (boss ? BOSS_HP_MULT : 1n); name = `${Name} Lv.${tier + 1}${boss ? ' BOSS' : ''}`
```

Engine (`src/core/engine.ts`):
- `export const CAPTURE_CHANCE = 0.35; export const ROSTER_CAP = 30` (ROSTER_CAP
  lives in `collection.ts`, re-exported).
- Boss kill: `xpGained = xpReward(i) * BOSS_XP_MULT`; coin drop `amount *= BOSS_COIN_MULT`
  (loot.ts untouched — its exact-coin tests stand); then **one extra rng draw
  AFTER loot**: `rng.next() < CAPTURE_CHANCE`. The draw is always consumed on a
  boss kill; the capture is skipped when `companions.length ≥ ROSTER_CAP`.
  Captured: `{ id: \`c${nextCompanionId++}\`, speciesId, bossIndex: i, level: 1, stars: 0 }`
  pushed to `companions`, event `bossCaptured { companion }`.
- Non-boss kills consume exactly the v1 draw sequence (crit, loot 1–2) → v1
  seeded event logs stay byte-identical.
- `bestIndex = max(bestIndex, monster.index)` on every spawn and at resume.

Presentation (helpers codex T35, wiring claude T31): `BOSS_SCALE = 3`
(12×10 art → 36×30 px at `MONSTER_X = 118`, feet on `GROUND_Y = 92` → fits
160×110), `itemSprites.crown` centred above the head (reuse, no new art),
`BOSS_HP_BAR_Y = 54` (regular `HP_BAR.y = 64` unchanged), death scatter at
scale 3, `bossShockwave` effect on `monsterSpawned` with `boss: true`.
**Floats spawn at `barY − 6` where `barY` is the active HP-bar y** (boss or
normal) so they never overlap the raised bar. Boss rows y = 62..63 at x ≥ 118
fall inside the existing `floatRegion` pin (y ∈ [40, 64), x ≥ 100) — boss tests
must not reuse that helper.

## 4. Companions — `src/core/collection.ts`

```ts
export const COMPANION_MAX_LEVEL = 10; export const ACTIVE_SLOTS = 3; export const ROSTER_CAP = 30;
export const companionPower = (c: Companion): bigint => {
  const base = monsterMaxHp(c.bossIndex) / 20n;
  return (base < 1n ? 1n : base) * BigInt(c.level) * 2n ** BigInt(c.stars);
};
export function activeCompanions(cs: readonly Companion[]): Companion[]; // top ACTIVE_SLOTS by power desc; tie → lower numeric id part
```

**Tick volley** (engine, T30): `COMPANION_ATTACK_MS = 1000`. `engine.tick(dt)`
accumulates `volleyAcc`; per elapsed 1000 ms (a tick > 1000 ms fires
`⌊dt/1000⌋` volleys; the renderer clamps dt to 100 anyway), for each active
companion in order: `damage = companionPower(c) * (feverActive ? FEVER_MULT : 1n)`
(never crits) → events `companionAttack { companionId, speciesId, damage }`,
`monsterHit`, then the shared kill chain (`applyDamage(damage, events)` used
by `attack()` and the volley; kills chain into the next monster inside the same
volley). No companions → no events, no rng draws. Companion kills roll loot
and capture exactly like hero kills.

**Presentation constants** (codex T35 helpers in `src/renderer/sprites/companion.ts`):

| constant | value |
|---|---|
| `COMPANION_X` | 2 |
| `COMPANION_SLOT_GAP` | 14 |
| `companionSlot(k, groundY)` | `{ x: COMPANION_X, y: groundY − 10 − 14·k }`, k = 0..2 (the caller passes `GROUND_Y`; sprites never import `game.ts`) |
| art | species idle frame (2-frame bob) at scale 1, `flipX: true` (species art faces left), palette `paletteForTier(idle.palette, stars)` |
| volley visual | `companionProjectile` effect in the species' hit primary colour from the slot toward `MONSTER_X` (gravity 0, lifeMs 250) |
| capture visual | `captureSparkle` at the boss position, then at the new slot |

## 5. Fever — `src/core/fever.ts`

```ts
export const FEVER_INPUTS = 20; export const FEVER_WINDOW_MS = 3000;
export const FEVER_MS = 5000; export const FEVER_COOLDOWN_MS = 10000; export const FEVER_MULT = 3n;
export interface Fever { readonly stamps: readonly number[]; readonly activeUntil: number; readonly cooldownUntil: number }
export function createFever(): Fever;
export function feverInput(f: Fever, nowMs: number): { fever: Fever; started: boolean };  // keeps the last 20 stamps; starts iff 20 stamps && now − oldest ≤ 3000 && !active && now ≥ cooldownUntil; on start stamps are cleared
export function feverTick(f: Fever, nowMs: number): { fever: Fever; ended: boolean };     // ended when active && now ≥ activeUntil → cooldownUntil = now + FEVER_COOLDOWN_MS
export const feverActive = (f: Fever, nowMs: number): boolean => nowMs < f.activeUntil;
```

Engine clock rule: the engine owns `clockMs`, advanced ONLY by `tick(dt)`
(no `Date.now`). `attack()` stamps `clockMs`; `tick` runs `feverTick` first,
then the volley. Events `feverStart` / `feverEnd`; `GameState.fever =
{ active: boolean; remainingMs: number }`; **not persisted** (`toSave()` has no
fever field). Hero damage:

```
damage = BigInt(damageForLevel(level)) * (crit ? BigInt(CRIT_MULT) : 1n) * (feverActive ? FEVER_MULT : 1n) * BigInt(1 + souls)
```

The `attack` event shape is unchanged from v1 (fever is observable via
events/state), so v1 `toEqual` assertions hold.

Presentation: codex T36 provides `drawFeverAura(ctx, sprite, frame, x, y, scale, timeMs)`
(`src/renderer/sprites/aura.ts`: the sprite drawn at (±1, 0), (0, ±1) offsets
tinted `shiftHue(COLORS.red, Math.floor(timeMs / 4) % 360)` under the real
sprite) and `showBanner(banner, text = LEVEL_UP_TEXT)` with `FEVER_TEXT = 'FEVER!'`;
claude T31 wires: aura while `state.fever.active`, `feverAura` sparkles every
100 ms, banner on `feverStart`, 4th audio blip `feverStart()` (ascending 4-note
square sweep; `GameAudio` gains `feverStart(): void`, `FEVER_NOTES`).

## 6. Lifecycle — `src/core/collection.ts` (pure, total) and PvP resolution

```ts
export const REBIRTH_MIN_INDEX = 40;
export type CollectionAction =
  | { type: 'consume'; targetId: string; foodId: string }   // target.level += 1 + food.stars (cap 10); food removed; target ≠ food
  | { type: 'fuse'; aId: string; bId: string }               // same speciesId && same stars: a.stars + 1, level 1, bossIndex = max(a, b); b removed
  | { type: 'reincarnate'; id: string }                      // level === 10 → level 1, stars + 1
  | { type: 'sacrifice'; id: string }                        // companion removed; souls += 1 + stars
  | { type: 'rebirth' }                                      // monster.index ≥ 40: souls += ⌊monster.index / 8⌋, rebirths + 1; level 1, xp 0, monster = monsterForIndex(0), monsterHp = maxHp(0); keeps companions/items/coins/killCount/bestIndex/nextCompanionId
  | { type: 'addCompanion'; companion: Companion }           // roster < ROSTER_CAP: pushed with id re-minted as `c${nextCompanionId++}`; full → error
  | { type: 'removeCompanions'; ids: string[] }              // unknown ids ignored; never an error
  | { type: 'pvpResult'; won: boolean; stolen: Companion | null; lostId: string | null }; // lostId removed (if present); stolen added via the addCompanion rule (dropped silently when full)
export function applyCollection(state: Readonly<GameState>, a: CollectionAction):
  { state: GameState; events: GameEvent[] } | { error: string };   // never mutates input; unknown type/ids → error
```

Events: `rebirth { souls }` for `rebirth`, `pvpResolved { won, stolen, lostId }`
for `pvpResult` (`stolen` carries the re-minted companion or null); every other
action returns `events: []`. There is **no** `rosterChanged` action or event —
the renderer flushes the save after every `apply`.

`engine.apply(a): GameEvent[]` — runs `applyCollection` on the live state;
`{ error }` → returns `[]`, state untouched. Fever state is preserved across
apply. `bestIndex` is untouched by rebirth.

**PvP resolution (shared with the server, T32):**

```ts
export function resolvePvp(attacker: readonly Companion[], defender: readonly Companion[], rng: Rng):
  { attackerWon: boolean; moved: Companion | null; attackerPower: bigint; defenderPower: bigint };
```

Rule: `attackerPower = Σ companionPower(attacker)`, same for defender;
`p = total === 0n ? 0.5 : ratio(attackerPower, total)`; draw 1: `attackerWon = rng.next() < p`;
loser = the other roster; draw 2 is ALWAYS consumed: `victim = loser[⌊rng.next() · loser.length⌋]`
(null when the loser is empty); `moved = victim` unless the winner's roster
already holds `ROSTER_CAP` companions (then null). Exactly 2 rng draws per call.
Bot ("Training Dummy") and cooldown rules are the server's (`SERVER_ARCHITECTURE.md`);
the server calls `resolvePvp(attackerRoster, defenderRoster, mulberry32(seed))`
and moves `moved` between stored rosters. The client applies the outcome via
`pvpResult`.

## 7. Types & events — `src/core/types.ts`

```ts
export interface MonsterDef { index: number; speciesId: string; name: string; maxHp: bigint; tier: number; boss: boolean }
export interface GameState {
  level: number; xp: number; killCount: number; coins: number; items: Record<string, number>;
  monster: MonsterDef; monsterHp: bigint;
  companions: Companion[]; nextCompanionId: number; souls: number; rebirths: number; bestIndex: number;
  fever: { active: boolean; remainingMs: number };
}
export type GameEvent =
  | { type: 'attack'; damage: bigint; crit: boolean; source: InputSource }        // shape unchanged from v1
  | { type: 'companionAttack'; companionId: string; speciesId: string; damage: bigint }
  | { type: 'monsterHit'; hpAfter: bigint; maxHp: bigint }
  | { type: 'monsterKilled'; monster: MonsterDef; xpGained: number }
  | { type: 'itemDropped'; drops: ItemDrop[] }
  | { type: 'bossCaptured'; companion: Companion }
  | { type: 'levelUp'; newLevel: number }
  | { type: 'monsterSpawned'; monster: MonsterDef }
  | { type: 'feverStart' } | { type: 'feverEnd' }
  | { type: 'rebirth'; souls: number }
  | { type: 'pvpResolved'; won: boolean; stolen: Companion | null; lostId: string | null };
export interface Engine {
  attack(source: InputSource): GameEvent[];
  tick(dtMs: number): GameEvent[];        // advances the clock: feverEnd, companion volleys
  apply(a: CollectionAction): GameEvent[];
  getState(): Readonly<GameState>;        // defensive copies (monster, items, companions, fever)
  toSave(): SaveFileV2;
}
```

Field arrival by task: T24 companions/nextCompanionId/souls/rebirths/bestIndex;
T25 bigint; T26 `boss`; T29 `fever`.

**Kill event order:** `attack | companionAttack, monsterHit, monsterKilled,
itemDropped, [bossCaptured], [levelUp…], monsterSpawned` — v1's F07 order with
`bossCaptured` inserted after `itemDropped`.

## 8. Effects — `src/renderer/effects.ts` (codex T34)

```ts
export interface EffectPreset { count: number; colors: readonly string[]; speed: number; spread: number; lifeMs: number; gravity: number; size: number }
export const EFFECTS: {
  heroSlash: EffectPreset; heroSlashSouls: EffectPreset; feverAura: EffectPreset; bossShockwave: EffectPreset;
  captureSparkle: EffectPreset; companionProjectile: EffectPreset; hit: Record<SpeciesId, EffectPreset>;
};
export function spawnEffect(pool: Particle[], p: EffectPreset, x: number, y: number, dirX: 1 | -1, seed = 0): void;
```

Built entirely on `anim.ts` `spawnParticle` (pool cap 200 unchanged).
**Determinism:** particle k gets `angle = centre(dirX) + p.spread · (((k + seed) mod p.count) / max(1, p.count − 1) − 0.5)`
with `centre(1) = 0`, `centre(−1) = π`; `vx = cos·speed`, `vy = sin·speed`,
`color = p.colors[(k + seed) mod colors.length]`. No rng anywhere.

| preset | count | colors (`COLORS.*`) | speed | spread (rad) | lifeMs | gravity | size |
|---|---|---|---|---|---|---|---|
| `heroSlash` | 6 | cyan, white | 60 | 0.8 | 250 | 0 | 1 |
| `heroSlashSouls` | 6 | yellow, orange | 60 | 0.8 | 250 | 0 | 1 |
| `feverAura` | 4 | red, orange, yellow, white | 20 | 2π | 400 | −40 | 1 |
| `bossShockwave` | 16 | white, steel | 90 | 2π | 350 | 0 | 2 |
| `captureSparkle` | 12 | yellow, white | 40 | 2π | 600 | 0 | 1 |
| `companionProjectile` | 1 | (species hit primary; caller overrides `colors`) | 200 | 0 | 250 | 0 | 2 |
| `hit.slime` | 6 | green, forest | 50 | 1.2 | 400 | 260 | 1 |
| `hit.bat` | 4 | maroon, navy | 90 | 0.6 | 200 | 0 | 1 |
| `hit.ghost` | 5 | white, steel | 15 | 2π | 700 | 0 | 1 |
| `hit.golem` | 6 | gray, slate | 60 | 1.0 | 350 | 400 | 1 |
| `hit.dragon` | 7 | red, orange, yellow | 50 | 1.0 | 450 | −120 | 1 |

Hero slash uses `heroSlashSouls` when `souls > 0`. Wiring into `game.ts` is
claude work (T31): `monsterHit` → `EFFECTS.hit[speciesId]` at the monster's
centre with `dirX = 1`, seed = hit counter; `attack` → hero slash at the sword
tip with `dirX = 1`.

## 9. Menu window + IPC

**Window** (`src/main/menuWindow.ts`, claude T46): `showMenuWindow()` focuses
the existing window or creates one: `width: 380, height: 520, useContentSize: true,
frame: true, resizable: false, minimizable: false, maximizable: false,
fullscreenable: false, alwaysOnTop: true, show: false, title: 'DesMon — Collection & Battle'`,
`webPreferences` identical to the overlay (same preload path, `contextIsolation: true`,
`nodeIntegration: false`, `sandbox: true`), `loadFile('static/menu.html')`,
`once('ready-to-show')` → `show()` then `app.focus({ steal: true })` (an
LSUIElement app needs it for the name text field); `closed` → reference
dropped. **Only opener = tray item `Collection & Battle…`** (between the
separator and `Reset Progress`). SMOKE rule: the smoke run never clicks the
tray, so the menu window is never created under `SMOKE=1`; `SMOKE_OK` stays
gated on `desmon:first-frame` only (F18/F21 unchanged).

**Relay flow (main is stateless):** menu `sendAction(a)` → `desmon:menu-action`
(invoke) → main validates the shape (`type` ∈ the union, string ids, arrays of
strings) and sends `desmon:action` to **every window except the sender** → the
game window `game.apply(a)` → `saves.flush()` → `desmon:save-state` → main
writes the file, then sends `desmon:state-changed` (the written save) to every
window except the sender. On `desmon:menu-ready` main sends `desmon:state-changed`
with `parseSave(readSaveFile(userData))` to the sender — the menu's single boot
path. Helper in `src/main/ipc.ts`: `sendToOthers(sender, channel, payload)` over
`BrowserWindow.getAllWindows()`. There are **no main-originated actions**: net →
game effects (`stolen`, `lost`, `removed`) reach the game window only as menu
actions over this relay (`SERVER_ARCHITECTURE.md §6`); main never pushes roster
changes. With exactly two windows this is exact and needs no registry, so
`registerIpcHandlers()` keeps its literal call.

**IPC additions** (`src/shared/ipc.ts`; preload inlines literal copies;
`tests/ipc.test.ts` `toEqual` table and `it.each` method list are EXTENDED):

| constant | channel | direction | payload |
|---|---|---|---|
| `ACTION` | `desmon:action` | main → game window (send) | `CollectionAction` |
| `MENU_ACTION` | `desmon:menu-action` | menu → main (invoke) | `CollectionAction` → `void` (validated, forwarded as `ACTION`) |
| `STATE_CHANGED` | `desmon:state-changed` | main → menu (send) | `SaveFileV2` just written / current |
| `MENU_READY` | `desmon:menu-ready` | menu → main (send) | none → main answers with `STATE_CHANGED` |
| `GET_IDENTITY` | `desmon:get-identity` | menu → main (invoke) | none → `IdentityPayload { name; playerId: string \| null; online: boolean }` |
| `SET_NAME` | `desmon:set-name` | menu → main (invoke) | `{ name: string }` (validated in main with `isValidName`/`NICK_RE`; invalid → unchanged) → `IdentityPayload` |
| `LEADERBOARD` | `desmon:leaderboard` | menu → main (invoke) | `{ n?: number }` → `NetResult<LeaderboardResult>` |
| `PVP` | `desmon:pvp` | menu → main (invoke) | none (opponent is chosen by the server) → `NetResult<PvpResult>` |

Preload methods (2-space indent, `name:` form so `tests/renderer.test.ts`'s
regex picks them up): `onAction(cb)`, `sendAction(a)`, `onStateChanged(cb)`,
`reportMenuReady()`, `getIdentity()`, `setName(name)`, `getLeaderboard(n?)`,
`pvp()` (payloads/results: `SERVER_ARCHITECTURE.md §6`, normative). `src/renderer/global.d.ts` mirrors every method as `name(`; the
menu page (`src/menu/**`, compiled by `tsconfig.renderer.json`) shares that
declaration. Channel-name regex `^desmon:[a-z][a-z-]*$` holds for all eight.

**Menu page** (`static/menu.html` + `src/menu/index.ts` DOM binder + `src/menu/view.ts`
pure view-model; claude T48/T49; codex T37 styles it). Tabs: Roster (cards:
species `<canvas class="species">` painted with `drawSprite` idle frame 0 and
`paletteForTier(palette, stars)`, name, `Lv n`, `★×stars`, `format(power)`,
buttons Consume/Fuse/Reincarnate/Sacrifice; footer Rebirth enabled iff
`monsterIndex ≥ 40`), Ranking (rows rank/name/deepest/rebirths; `Offline`
row when `ok: false`), Battle (name field → `setName`, one `Battle!` button
(disabled with 0 companions or while `retryAfterSec` counts down), result
text; after a successful `pvp()` the menu `sendAction({ type: 'pvpResult', … })`
so the game window applies and animates it). Fixed class names the CSS
targets: `.tabs .tab .panel .card .species .name .stars .power .btn .row .footer .result`.
Link `<link rel="stylesheet" href="menu.css">` (present from T46; the file
arrives in T37 — a missing stylesheet is harmless).

PvP-result presentation in the game window (claude T47 on `pvpResolved`,
helpers from codex T36/T34): `showBanner(banner, won ? VICTORY_TEXT : DEFEAT_TEXT)`
(`'VICTORY!'` / `'DEFEAT'`), stolen companion → `captureSparkle` at its slot
(pop-in), lost companion → `spawnSpriteScatter` of its species art at its
former slot. No arena replay.

## 10. Client networking boundary (API detail: `SERVER_ARCHITECTURE.md`)

- **Identity** (`src/main/identity.ts`, main only, T41): `userData/identity.json`
  `{ name: string; playerId: string | null; token: string | null }`. API is
  `SERVER_ARCHITECTURE.md §6` verbatim: `defaultName(randomUUID)` (`'Knight-'` +
  4 uuid chars), `readIdentity(dir, randomUUID)` (missing/corrupt → fresh
  default, never throws), `writeIdentity(dir, identity)` (tmp + rename, the
  `persistence.ts` pattern), `isValidName(name)` (`NICK_RE`). The server issues
  `playerId`/`token` on `POST /v1/players`; the token never leaves main —
  renderers only ever see `IdentityPayload { name, playerId, online }`.
- **Wire types**: `SERVER_ARCHITECTURE.md §2` verbatim (`src/shared/api.ts`
  declares its own structural `Companion`; **no import from `src/core`** — T41's
  AC greps it). The menu consumes `LeaderboardResult`/`PvpResult` (each
  `= …Response & { removed: string[] }`), `NetError`, `NetResult<T>`. Score =
  `bestIndex` desc, then `rebirths` desc.
- **URL**: `src/shared/serverUrl.ts` → `export const SERVER_URL = '';` (offline
  until the deploy task T44 writes the Render URL; env `DESMON_SERVER_URL`
  overrides). `src/main/ipc.ts`: `const baseUrl = process.env.SMOKE ? '' : (process.env.DESMON_SERVER_URL ?? SERVER_URL)`
  — **SMOKE is offline by code**, grep-able.
- **Net client** (`src/main/net.ts`, electron-free, T42):
  `createNetClient({ baseUrl, fetchFn = globalThis.fetch, timeoutMs = NET_TIMEOUT_MS })`
  with `register(name)`, `upload(token, snapshot)`, `leaderboard(token | null, n)`,
  `pvp(token)`; `NET_TIMEOUT_MS = 5000` via `AbortSignal.timeout`; JSON only;
  `NetResult<T> = { ok: true; value: T } | { ok: false; error: NetError; status?: number; retryAfterSec?: number }`;
  never throws; `baseUrl === ''` → `offline` without touching fetch; 401 →
  `unauthorized`; 429 with `retryAfterSec` → `cooldown`. Also exports
  `toSnapshot(name, save)` and `createNetSession(...)`.
- **Inline sync (no scheduler module):** `SERVER_ARCHITECTURE.md §6` is the
  single normative design — `createNetSession` in `src/main/net.ts` owns
  identity, lazy registration, the dirty roster key, 401 re-register-once and
  the sync moments: `session.onSave(save)` from the `SAVE_STATE` handler
  (fire-and-forget background upload iff the roster key changed; `removed`
  ignored), `identity()` on menu open, `leaderboard(n)` (upload if dirty) and
  `pvp()` (always upload first). Main never pushes roster changes to the game
  window: after a successful `leaderboard()`/`pvp()` the **menu** forwards
  `value.removed` as a `removeCompanions` action (T49). The game never waits on
  the network; menu calls show `Offline` on failure.
- Tests: `tests/net.test.ts` (fake fetch), `tests/identity.test.ts` (tmp dir);
  `tests/ipc.test.ts` pins the handler source. No test touches the external
  network; gates stay hermetic.

## 11. Worker split

| area | worker | tasks |
|---|---|---|
| bignum, save v2, bigint cutover, bosses, collection, capture/apply, fever, volley, renderer wiring, resolvePvp | claude | T23–T32 |
| font A–Z, effect presets, boss/companion art helpers, banner text + fever aura, menu CSS | codex | T33–T37 (exactly 5) |
| server scaffold, store/app, pvp, PgStore, identity/api, net client, net IPC, deploy | claude | T22, T38–T44 |
| menu IPC relay, menu window + tray, game applies actions, roster UI, ranking/battle | claude | T45–T49 |
| version/README/SPEC, deploy re-verify, packaging, SPEC sweep | claude | T50–T53 |

Codex file set (contract §5): `src/renderer/sprites/**`, `src/renderer/{anim,hud,effects}.ts`,
`static/{style,menu}.css`, `tests/{sprites,anim,effects,renderer,window}.test.ts`.
`src/renderer/game.ts`, `src/menu/**`, `static/menu.html` are NOT in it →
every hook-up into `game.ts`/menu markup is a claude task; codex delivers
draw helpers + presets + recording-canvas tests only. Codex ACs: vitest/grep/
`test -e`/`node -e`; no smoke, no deps.

## 12. SPEC directives (Spec Clarifier, AMEND mode)

Keep F01–F27 rows and IDs. Exact amendments:

| target | amendment |
|---|---|
| Summary | add: bosses every 8th monster, capture into a 30-companion roster that attacks alongside the hero, fever, lifecycle (consume/fuse/reincarnate/sacrifice/rebirth), unbounded A–Z damage numbers, a Collection & Battle window, leaderboard + async PvP against a Render server (offline-first) |
| Assumption 3 | `monsterMaxHp(i) = ⌊10·115^i/100^i⌋` computed as exact `bigint` (equal to the v1 double for i < 199); other formulas unchanged; hero damage = `level × crit 2 × fever 3 × (1 + souls)` |
| Assumption 4 | add: every 8th monster (`index % 8 === 7`) is a boss: 5× HP/XP/coins, ` BOSS` name suffix, drawn 3× with a crown |
| Assumption 5 | replace with: progression is endless (no win state, no final boss); **rebirth** at monster index ≥ 40 is a soft prestige (souls) that keeps the roster |
| Assumption 7 | schema is `SaveFileV2`; `parseSave` migrates v1 and junk per field and never throws; bigint fields are decimal strings |
| Assumption 13 | "exactly 4 synthesized WebAudio blips (attack tick, kill arpeggio, level-up fanfare, fever start)" |
| Assumption 16 | "The tray menu is the settings surface: title, input-mode status / Grant Accessibility…, `Collection & Battle…` (opens the 380×520 Collection window: Roster / Ranking / Battle tabs), Reset Progress, Quit — no other settings UI" |
| Assumption 17 | add: bosses at `BOSS_SCALE = 3`; companions at scale 1 in a column left of the hero |
| F23 Behavior | title `DesMon v0.2.0`; item `Collection & Battle…` between the separator and Reset Progress; AC += ` && grep -q "Collection & Battle" src/main/tray.ts` |
| F25 Behavior/AC | literal `release/DesMon-0.1.0-arm64.dmg` → `release/DesMon-0.2.0-arm64.dmg` |
| F27 Behavior | += README documents fever, bosses, companions, rebirth, leaderboard/PvP, the server URL/offline behaviour and Render free-tier caveats; AC += ` && grep -qi leaderboard README.md && grep -qi rebirth README.md` |
| M8 | dmg name → `DesMon-0.2.0-arm64.dmg` |
| Input Abstraction section | rename to "Input & Clock Abstraction (mandatory)"; add: "Engine time advances only through `engine.tick(dt)` (injected dt); fever windows, companion volleys and cooldowns are measured on that clock. The server takes `now()`/`randomUUID()`/`randomBytesHex()` injected. `net.ts` takes `fetchFn` injected. No `Date.now()` in `src/core` or `src/server` logic." |
| Non-Goals | replace the block with: "No auto-update mechanism. No Windows or Linux builds executed (win/nsis config-only, F26); no code signing/notarization. No localization; all text is English. Networking ONLY via `src/main/net.ts` against the Render server (`src/server`), offline-first: renderers never touch the network, tests never touch the external network, `SMOKE=1` forces offline. No accounts, no PII, no anti-cheat beyond server shape caps (leaderboard/PvP stats are self-reported; 'server-authoritative' covers the PvP verdict and roster bookkeeping only). No balance tuning beyond the stated formulas. No PvP arena replay. No CI pipeline." |
| new sections | `## Server / API` (pointer to `.harness/v2/reference/SERVER_ARCHITECTURE.md`: endpoints players/snapshot/leaderboard/pvp, score rule, cooldown/rate-limit/body cap, MemoryStore/PgStore) and `## Deployment` (Render free tier via `loop/render-bootstrap.sh`, `.node-version` 20.12.2, `SERVER_URL` in `src/shared/serverUrl.ts`, `DESMON_SKIP_NET=1` guard, free Postgres 30-day expiry) |

**New feature rows** — F28+ rows go in a second table directly below the
F01–F27 table, headed `### v2 features (F28+)`, with the template's `Worker`
column; the F01–F27 table keeps its columns. `AC` = the `AC:` line of the named
task in §13 (or `SERVER_ARCHITECTURE.md §10`), copied verbatim:

| ID | Name | Worker | Behavior (summary) | AC source |
|---|---|---|---|---|
| F28 | A–Z number format | claude | `src/core/bignum.ts` §1 rule and value table | T23 |
| F29 | SaveFileV2 + v1 migration | claude | §2 schema, never-throw parse, `serializeSave`/`createEngine` accept V1\|V2 | T24 |
| F30 | Unbounded HP and damage | claude | bigint per §1; exact-rational `monsterMaxHp`; v1 values preserved | T25 |
| F31 | Boss cadence | claude | every 8th monster: 5× hp/xp/coins, ` BOSS` name, `MonsterDef.boss` | T26 |
| F32 | Companion collection lifecycle | claude | `companionPower`, `activeCompanions`, consume/fuse/reincarnate/sacrifice/rebirth, `ROSTER_CAP = 30` | T27 |
| F33 | Boss capture and `engine.apply` | claude | 35 % capture after loot; ids `c1, c2…`; `apply(action)`; `bestIndex` | T28 |
| F34 | Fever mode | claude | 20 inputs / 3000 ms engine time → 5000 ms ×3 → 10000 ms cooldown; `feverStart`/`feverEnd`; never persisted | T29 |
| F35 | Companion volley | claude | top 3 hit every 1000 ms of engine time via `tick`, never crit, ×3 in fever | T30 |
| F36 | Renderer v2 wiring and presentation | claude | `update()` ticks the engine and returns events; `format()` floats at the active HP-bar y; effects, boss/companion/fever presentation; 4th blip | T31 |
| F37 | PvP resolution (core) | claude | `resolvePvp` §6: 2 rng draws, roster-cap rule, shared with the server | T32 |
| F38 | Pixel font A–Z | codex | `GLYPH_CHARS` appended with the missing letters and `. : - + %` | T33 |
| F39 | Effect presets | codex | §8 table; deterministic `spawnEffect` on the 200-slot pool | T34 |
| F40 | Boss and companion art helpers | codex | `drawBoss` (scale 3 + crown, `BOSS_HP_BAR_Y`), `drawCompanion` (flipX, star tint, slots) | T35 |
| F41 | Banner text and fever aura | codex | `showBanner(banner, text)`, `FEVER_TEXT`/`VICTORY_TEXT`/`DEFEAT_TEXT`, `drawFeverAura` | T36 |
| F42 | Collection window theme | codex | `static/menu.css` DB16 theme, pixelated species canvases, no `url()` | T37 |
| F43 | Server scaffold and healthz | claude | `src/server/{index,http}.ts`, `/healthz` `{ ok, sha }`, body cap 413, 400/404, `npm run start:server`; `SMOKE` isolation (temp `userData` before the single-instance lock) | T22 |
| F44 | Server players/snapshot/leaderboard | claude | `createApp` over `Store`; register/upload/leaderboard; rate limit; `stolenIds` stripping | T38 |
| F45 | Server PvP | claude | `POST /v1/pvp`: rank-neighbour or Training Dummy, core `resolvePvp`, roster cap, 60 s cooldown | T39 |
| F46 | PgStore | claude | idempotent DDL (`players` only, `last_pvp_at double precision`), `pg` 8.23.0 devDependency + `pg.d.ts`, `DATABASE_URL` switch | T40 |
| F47 | Identity and wire types | claude | `identity.json` §10, `src/shared/api.ts`, `serverUrl.ts` = `''` | T41 |
| F48 | Net client | claude | `createNetClient` §10: injected fetch, 5000 ms timeout, never throws, 401 → unauthorized | T42 |
| F49 | Net IPC and offline SMOKE | claude | get-identity/set-name/leaderboard/pvp handlers; `process.env.SMOKE ? ''`; pinned lists extended | T43 |
| F50 | Render deployment | claude | `render-bootstrap.sh`, `SERVER_URL` written, push + `deploys create --wait`, healthz + probe; `DESMON_SKIP_NET` guard | T44 |
| F51 | Menu IPC relay | claude | §9 channels, relay to every other window, `session.onSave` after the save write (no main-originated actions) | T45 |
| F52 | Collection window and tray item | claude | §9 window options, `app.focus({ steal: true })`, tray order extended, never opened under SMOKE | T46 |
| F53 | Game window applies actions | claude | `onAction` → `game.apply` → flush; `pvpResolved` presentation | T47 |
| F54 | Menu roster UI | claude | `static/menu.html`, `src/menu/{index,view}.ts`, lifecycle buttons, rebirth gate | T48 |
| F55 | Menu ranking and battle | claude | leaderboard rows, `Offline` rows, name field, `Battle!` + result + `pvpResult` action | T49 |
| F56 | Deploy re-verify | claude | healthz sha ancestor of HEAD, build-filter paths untouched since | T51 |
| F57 | Version 0.2.0 and docs | claude | package/lock 0.2.0, tray title, README sections, M9–M14 present, packaging test | T50 |

**Manual appendix additions** (after M8):

- **M9 — Collection window.** Tray → `Collection & Battle…`. Expect: a 380×520
  framed window with Roster / Ranking / Battle tabs, DB16 pixel theme, one
  card per companion with its species art (star tint), `Lv`, `★`, power in
  A–Z notation; Consume/Fuse/Reincarnate/Sacrifice buttons act immediately
  (the overlay's roster column and save update without restart); the name
  field accepts up to 16 characters.
- **M10 — Boss and capture.** Reach monster index 7. Expect: a 3× monster with
  a crown and ` BOSS` name, HP bar raised, a shockwave on spawn; on the kill,
  roughly one in three bosses sparkles and appears as a companion left of the
  hero.
- **M11 — Companion volley.** With ≥ 1 companion idle for 10 s. Expect: one
  projectile per active companion (max 3) every second flying at the monster,
  steel damage floats, kills chaining without input.
- **M12 — Fever.** Mash ≥ 20 inputs within 3 s. Expect: hue-cycling aura
  around the hero, `FEVER!` banner, the fourth blip, damage floats ×3 for
  5 s, then no re-trigger for 10 s.
- **M13 — Rebirth.** Reach index ≥ 40, Roster tab → Rebirth. Expect: run
  resets to Lv1 / monster 0, `souls` increases by ⌊index/8⌋, roster and coins
  kept, hero slash turns gold, floats grow by (1 + souls).
- **M14 — Ranking and battle.** With `SERVER_URL` set and network: Ranking
  shows top rows sorted by deepest index then rebirths, with your row;
  Battle! → `VICTORY!`/`DEFEAT` banner in the overlay, a stolen companion
  pops in or the lost one scatters; a second Battle! within 60 s reports the
  cooldown. Offline (or `SERVER_URL` empty): tabs show `Offline`, the game is
  unaffected.

## 13. Suggested decomposition (baseline for the Planner; APPEND after T21)

Plan grammar v2: `### [ ] T<NN> — title`, then `- AC:`, `- Deps:` (backward
T-IDs or `none`), `- Worker:`, `- Files:` (COMPLETE incl. tests — drives lane
conflict avoidance), `- Notes:`. Server tasks T22, T38–T44, T51 are specified
in `SERVER_ARCHITECTURE.md §10` (headings here for the id/title map). Smoke
rule: every task whose AC contains `npm run smoke` (or runs the app binary
with `SMOKE=1`) lists T22 in its Deps — T22 gives `SMOKE` an isolated
`userData` so concurrent smokes (lanes + orchestrator) never collide on the
single-instance lock or the real save file.

### [ ] T22 — Server scaffold: node:http adapter, healthz, start:server, .node-version
- see SERVER_ARCHITECTURE.md §Tasks (FIRST new task; 8 files incl. SMOKE isolation, T01-style exception)

### [ ] T23 — Core bignum: A–Z suffix format, ratio, bigField
- AC: `npx vitest run tests/bignum.test.ts && grep -q "export function format" src/core/bignum.ts && grep -q "formats 1000 as 1.00A, 12345 as 12.3A, 123456 as 123A and 1000000 as 1.00B" tests/bignum.test.ts && grep -q "suffix 1/26/27/702/703 is A/Z/AA/ZZ/AAA" tests/bignum.test.ts && grep -q "format truncates and never rounds: 999999 is 999A" tests/bignum.test.ts && grep -q "ratio divides bigints into a clamped number" tests/bignum.test.ts && grep -q "bigField accepts finite numbers and digit strings and rejects everything else" tests/bignum.test.ts` → exit 0
- Deps: none
- Worker: claude
- Files: src/core/bignum.ts, src/core/index.ts, tests/bignum.test.ts
- Notes: SPEC F28 (§1). Pure new module, no callers yet; barrel re-exports `format, suffix, ratio, bigField`. Exact rule + value table in §1 (1e78 → `1.00Z`, 1e81 → `1.00AA`, 1e2106 → `1.00ZZ`, 1e2109 → `1.00AAA`); `bigField(10n)` → null (bigint is not JSON input), `bigField(-3.7)` → `'0'`, `bigField('007')` → `'007'` is acceptable (digits only). Test each row of the table literally.

### [ ] T24 — SaveFileV2 schema, v1 migration, serializeSave/createEngine accept V1|V2
- AC: `npx vitest run tests/save.test.ts tests/engine.test.ts tests/renderer.test.ts tests/audio.test.ts tests/persistence.test.ts && grep -q "version: 2" src/core/save.ts && grep -q "export function upgradeSave" src/core/save.ts && grep -q "DEFAULT_SAVE is a fresh-game v2 save" tests/save.test.ts && grep -q "serialize then parse round-trips losslessly" tests/save.test.ts && grep -q "junk, missing and wrong-typed fields yield DEFAULT_SAVE values" tests/save.test.ts && grep -q "migrates a v1 save: numeric monsterHp becomes a digit string and companions default to empty" tests/save.test.ts && grep -q "invalid companion entries are dropped, valid ones kept, roster capped at 30" tests/save.test.ts && test "$(grep -c '^\s*it(' tests/save.test.ts)" -ge 11 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 16 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 51` → exit 0
- Deps: T23
- Worker: claude
- Files: src/core/save.ts, src/core/engine.ts, src/core/index.ts, src/renderer/game.ts, tests/save.test.ts, tests/engine.test.ts, tests/renderer.test.ts
- Notes: SPEC F29 (§2). 7 files, flagged: `game.ts` is a type edit (`toSave(): SaveFile`, import), `tests/renderer.test.ts` only rewrites `stateFixture` as `{ ...createEngine(null, mulberry32(1)).getState(), ...overrides }` so the new `GameState` fields (companions, nextCompanionId, souls, rebirths, bestIndex — carried through from the save, no logic yet) never break fixtures again. `Companion` lives in save.ts (barrel re-exports `Companion, SaveFile, SaveFileV2, upgradeSave`). Engine stays number-based inside (`Number(save.monsterHp)` on resume, `String(hp)` in `toSave`); T25 flips it. Concrete test edits in §1 policy table (richSave → V2 literal, `save.version` 2, `DEFAULT_SAVE.monsterHp` → `String(monsterMaxHp(0))`, junk `10n` case kept). F10 titles verbatim. Do not touch persistence.ts.

### [ ] T25 — BigInt cutover: exact-rational monsterMaxHp, hp/damage bigint end to end
- AC: `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/renderer.test.ts tests/save.test.ts tests/audio.test.ts && grep -q "115n" src/core/formulas.ts && grep -q "maxHp: bigint" src/core/types.ts && grep -q "monsterMaxHp is exactly 10/20/40/163 at index 0/5/10/20" tests/formulas.test.ts && grep -q "monsterMaxHp is exact for huge indices: index 5000 has 305 digits" tests/formulas.test.ts && grep -q "drawHpBar takes bigint hp and maxHp" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 16 && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 11 && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 52` → exit 0
- Deps: T24
- Worker: claude
- Files: src/core/formulas.ts, src/core/types.ts, src/core/engine.ts, src/renderer/hud.ts, tests/formulas.test.ts, tests/engine.test.ts, tests/renderer.test.ts
- Notes: SPEC F30 (§1). DELIBERATE 7-file atomic task — the repo cannot be green with bigint HP in core but number in hud/tests. Do NOT split. `monsterMaxHp` per §1 (one line); `GameState.monsterHp`, `MonsterDef.maxHp`, `attack.damage`, `monsterHit.hpAfter/maxHp` → bigint; hero damage `BigInt(damageForLevel(level)) * (crit ? BigInt(CRIT_MULT) : 1n)`; resume clamp `[1n, maxHp]`; `drawHpBar(ctx, x, y, w, h, hp: bigint, maxHp: bigint)` via `ratio()`. `game.ts` needs no edit (`String(bigint)` already compiles). Assertions change type only per the §1 policy table; every `it(` survives (guards).

### [ ] T26 — Boss cadence in core: every 8th monster, 5× hp/xp/coins
- AC: `npx vitest run tests/formulas.test.ts tests/engine.test.ts tests/loot.test.ts && grep -q "BOSS_EVERY = 8" src/core/monsters.ts && grep -q "boss: boolean" src/core/types.ts && grep -q "every 8th monster (index 7, 15, 23) is a boss with 5x hp and a BOSS name; the species still cycles" tests/formulas.test.ts && grep -q "killing a boss grants 5x xp and 5x coins" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/formulas.test.ts)" -ge 12 && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 17` → exit 0
- Deps: T25
- Worker: claude
- Files: src/core/monsters.ts, src/core/types.ts, src/core/engine.ts, src/core/index.ts, tests/formulas.test.ts, tests/engine.test.ts
- Notes: SPEC F31 (§3). `isBoss`, `BOSS_HP_MULT = 5n`, `BOSS_XP_MULT = 5`, `BOSS_COIN_MULT = 5`; `MonsterDef.boss`; name suffix ` BOSS`. Engine multiplies `xpGained` and the coin drop amount for bosses (loot.ts untouched). Existing test "monsterForIndex maxHp always equals monsterMaxHp(index)" keeps its title — assert `maxHp === monsterMaxHp(i) * (isBoss(i) ? 5n : 1n)` (or sample non-boss indices). No v1 test pins an index ≡ 7 (mod 8). Export `isBoss, BOSS_EVERY` from monsters.ts (barrel already re-exports monsters via named list — add them).

### [ ] T27 — Collection core: companionPower, activeCompanions, lifecycle actions, roster cap
- AC: `npx vitest run tests/collection.test.ts && grep -q "ROSTER_CAP = 30" src/core/collection.ts && grep -q "COMPANION_MAX_LEVEL = 10" src/core/collection.ts && grep -q "export function applyCollection" src/core/collection.ts && grep -q "companionPower is floor(monsterMaxHp(bossIndex)/20), at least 1, times level times 2^stars" tests/collection.test.ts && grep -q "consume adds 1 plus food stars levels, caps at 10 and removes the food" tests/collection.test.ts && grep -q "fuse needs same species and stars and yields stars+1 at level 1" tests/collection.test.ts && grep -q "reincarnate needs max level and resets to level 1 with stars+1" tests/collection.test.ts && grep -q "sacrifice removes the companion and adds 1 plus stars souls" tests/collection.test.ts && grep -q "rebirth needs monsterIndex 40 or more, adds floor(index/8) souls and resets the run" tests/collection.test.ts && grep -q "activeCompanions picks the 3 strongest, ties by id" tests/collection.test.ts && grep -q "addCompanion refuses a full roster of 30 and removeCompanions ignores unknown ids" tests/collection.test.ts && grep -q "pvpResult adds the stolen companion with a re-minted id and removes the lost one" tests/collection.test.ts` → exit 0
- Deps: T25
- Worker: claude
- Files: src/core/collection.ts, src/core/index.ts, tests/collection.test.ts
- Notes: SPEC F32 (§4, §6). All functions total: `(state, action) → { state, events } | { error }`, never mutate input, fresh objects out. Rebirth keeps companions/items/coins/killCount/bestIndex/nextCompanionId/souls (then adds), resets level 1, xp 0, monster `monsterForIndex(0)`, monsterHp `maxHp(0)`; needs `state.monster.index ≥ REBIRTH_MIN_INDEX`. No `rosterChanged` event. Barrel: `export * from './collection.js'` so T32 needs no barrel edit. `resolvePvp` is T32, not here.

### [ ] T28 — Engine: boss capture roll, apply(action), bestIndex
- AC: `npx vitest run tests/engine.test.ts tests/collection.test.ts && grep -q "CAPTURE_CHANCE = 0.35" src/core/engine.ts && grep -q "apply(a: CollectionAction)" src/core/engine.ts && grep -q "a boss kill rolls capture after loot and emits bossCaptured with a c-prefixed id at 35 percent" tests/engine.test.ts && grep -q "non-boss kills consume exactly the v1 rng draws" tests/engine.test.ts && grep -q "a capture into a full roster of 30 is skipped but still spends the draw" tests/engine.test.ts && grep -q "apply(rebirth) emits rebirth and multiplies hero damage by 1 plus souls" tests/engine.test.ts && grep -q "apply with an invalid action emits nothing and leaves state untouched" tests/engine.test.ts && grep -q "bestIndex tracks the deepest monster index ever spawned" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 23` → exit 0
- Deps: T26, T27
- Worker: claude
- Files: src/core/engine.ts, src/core/types.ts, tests/engine.test.ts
- Notes: SPEC F33 (§3, §6, §7). Kill order `attack, monsterHit, monsterKilled, itemDropped, [bossCaptured], [levelUp…], monsterSpawned`. Capture draw AFTER loot so non-boss sequences stay byte-identical to v1 (the "same seed yields an identical event log" test proves it). ids `c${nextCompanionId++}` — never uuid. Hero damage gains `* BigInt(1 + souls)`. `bestIndex = max(bestIndex, index)` on spawn and resume. `apply` = `applyCollection` on the live state; `{ error }` → `[]`. Add `bossCaptured`, `rebirth`, `pvpResolved` to `GameEvent`; `CollectionAction` type-imported from collection.ts.

### [ ] T29 — Fever core: pure tracker on the engine clock, tick(dt), ×3 damage
- AC: `npx vitest run tests/fever.test.ts tests/engine.test.ts && grep -q "FEVER_INPUTS = 20" src/core/fever.ts && grep -q "FEVER_MULT = 3n" src/core/fever.ts && grep -q "tick(dtMs: number)" src/core/engine.ts && grep -q "20 inputs within 3000ms start fever, 19 do not" tests/fever.test.ts && grep -q "fever lasts 5000ms, triples damage, then cools down for 10000ms" tests/fever.test.ts && grep -q "fever never persists: toSave has no fever field" tests/fever.test.ts && grep -q "engine time advances only through tick" tests/fever.test.ts` → exit 0
- Deps: T25
- Worker: claude
- Files: src/core/fever.ts, src/core/engine.ts, src/core/types.ts, src/core/index.ts, tests/fever.test.ts
- Notes: SPEC F34 (§5). `engine.tick(dt)` introduced here (clamps non-finite/negative dt to 0; advances `clockMs`; `feverTick` → `feverEnd`); T30 adds the volley to the same method. `attack()` stamps the clock and may emit `feverStart` BEFORE the `attack` event of that same input (fever applies to it). `GameState.fever { active, remainingMs }`. Attack event shape unchanged. Tests are `attack() × 20 → feverStart; tick(5000) → feverEnd; attack() × 20 within cooldown → nothing`. Barrel: `export * from './fever.js'`. Overlaps engine.ts with T26/T28 — the scheduler serializes; rebase logic, never drop theirs.

### [ ] T30 — Engine tick: companion volley every 1000 ms from the 3 strongest
- AC: `npx vitest run tests/engine.test.ts && grep -q "COMPANION_ATTACK_MS = 1000" src/core/engine.ts && grep -q "function applyDamage" src/core/engine.ts && grep -q "tick fires one volley per 1000ms from the 3 strongest companions and kills chain into the next monster" tests/engine.test.ts && grep -q "tick with no companions emits nothing and never spends rng draws" tests/engine.test.ts && grep -q "companion damage is tripled during fever and never crits" tests/engine.test.ts && test "$(grep -c '^\s*it(' tests/engine.test.ts)" -ge 26` → exit 0
- Deps: T28, T29
- Worker: claude
- Files: src/core/engine.ts, src/core/types.ts, tests/engine.test.ts
- Notes: SPEC F35 (§4). Refactor the damage/kill chain into one `applyDamage(damage, events)` used by `attack()` and the volley. Event `companionAttack { companionId, speciesId, damage }` then `monsterHit` then the kill chain. `⌊dt/1000⌋` volleys per tick, accumulator keeps the remainder. Companion kills roll loot/capture like hero kills (rng draws happen only on kills). `activeCompanions` recomputed per volley.

### [ ] T31 — Renderer wiring v2: engine tick in update(), formatted floats, effects, boss/companion/fever presentation, fever blip
- AC: `npx vitest run tests/renderer.test.ts tests/audio.test.ts tests/effects.test.ts && grep -q "saves.onEvents(game.update(dt))" src/renderer/index.ts && grep -q "update() ticks the engine and returns companion events to the save scheduler" tests/renderer.test.ts && grep -q "damage floats use the letter-suffix format" tests/renderer.test.ts && grep -q "a monster hit spawns the species hit effect" tests/renderer.test.ts && grep -q "a boss draws at scale 3 with a crown and its hp bar raised" tests/renderer.test.ts && grep -q "a boss spawn fires the shockwave effect" tests/renderer.test.ts && grep -q "active companions draw in a column left of the hero, flipped to face right, star-tinted" tests/renderer.test.ts && grep -q "a companion volley spawns one projectile per companion toward the monster" tests/renderer.test.ts && grep -q "a capture shows the sparkle effect and the new companion appears" tests/renderer.test.ts && grep -q "fever draws a hue-cycling aura behind the hero and a FEVER banner" tests/renderer.test.ts && grep -q "feverStart plays the fourth blip" tests/audio.test.ts && grep -q "feverStart" src/renderer/audio.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 60 && test "$(grep -c '^\s*it(' tests/audio.test.ts)" -ge 14 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T30, T33, T34, T35, T36
- Worker: claude
- Files: src/renderer/game.ts, src/renderer/index.ts, src/renderer/audio.ts, tests/renderer.test.ts, tests/audio.test.ts
- Notes: SPEC F36 (§3–§5, §8). Integration only — helpers come from codex tasks (`EFFECTS`/`spawnEffect` T34, `drawBoss`/`drawCompanion`/`companionSlot`/`BOSS_HP_BAR_Y` T35, `drawFeverAura`/`showBanner(banner, text)`/`FEVER_TEXT` T36). `Game.update(dtMs): GameEvent[]` = `engine.tick(dt)` routed through the same `handleEvents` as `attack()` (companion kills save via the existing scheduler; empty batches are a no-op); `index.ts` gains `saves.onEvents(game.update(dt))` while keeping `saves.onEvents(game.attack(event.source))` literally (pinned). Floats: `spawnFloat(..., barY - 6, format(event.damage), crit)` with `barY = monster.boss ? BOSS_HP_BAR_Y : HP_BAR.y`; companion hits spawn steel floats. Hero slash → `heroSlash`/`heroSlashSouls`; monster hit → `EFFECTS.hit[speciesId]`; boss spawn → `bossShockwave`; `companionAttack` → projectile from `companionSlot(k, GROUND_Y)` toward `MONSTER_X`; `bossCaptured` → `captureSparkle`; fever → aura + `feverAura` sparkles every 100 ms + `showBanner(banner, FEVER_TEXT)` + `audio.feverStart()`. Boss death scatter at scale 3. Boss tests must not reuse the `floatRegion` helper (boss rows y = 62..63 fall inside it). If this overruns ~300 LOC, SPLIT: T31a (update/format/blip/effects) + T31b (boss/companion/fever draw) — never rush it.

### [ ] T32 — PvP resolution in core (shared with the server)
- AC: `npx vitest run tests/collection.test.ts && grep -q "export function resolvePvp" src/core/collection.ts && grep -q "resolvePvp wins with probability myPower over total and moves one random companion from the loser to the winner" tests/collection.test.ts && grep -q "resolvePvp with an empty loser roster steals nothing" tests/collection.test.ts && grep -q "resolvePvp never moves into a full roster of 30" tests/collection.test.ts && grep -q "resolvePvp is reproducible from its seed and draws exactly 2 rng values" tests/collection.test.ts` → exit 0
- Deps: T27
- Worker: claude
- Files: src/core/collection.ts, tests/collection.test.ts
- Notes: SPEC F37 (§6). Signature and rule in §6: `p = total === 0n ? 0.5 : ratio(a, a + b)`; draw 1 win roll, draw 2 victim index ALWAYS consumed (count draws with a recording Rng); winner at `ROSTER_CAP` → `moved: null`. Power over the FULL rosters. Statistical test: seeded 10000 trials with power 1:3 → win rate 22–28 %. The server (T39) imports this via the core barrel; no bot/cooldown logic here.

### [ ] T33 — Pixel font: full A–Z plus . : - + % glyphs
- AC: `npx vitest run tests/sprites.test.ts && grep -q "the 3x5 font covers digits, every letter A to Z and the characters . : - + %" tests/sprites.test.ts && node -e "const s=require('fs').readFileSync('src/renderer/sprites/font.ts','utf8');const m=/GLYPH_CHARS = '([^']+)'/.exec(s);process.exit(m&&m[1].startsWith('0123456789LVEUP!')&&[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ.:-+%'].every(c=>m[1].includes(c))?0:1)" && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 25` → exit 0
- Deps: none
- Worker: codex
- Files: src/renderer/sprites/font.ts, tests/sprites.test.ts
- Notes: SPEC F38 (§1). APPEND to `GLYPH_CHARS` (`'0123456789LVEUP!'` + the 21 missing letters in alphabetical order + `.:-+%`) so existing frame indices stay stable; one 3×5 frame per new char (26 frames); `FONT_W/FONT_H/FONT_ADVANCE` unchanged; the registry integrity sweep covers the new frames automatically. Keep the existing glyph test and its title; add the new one. `.` is a single bottom-centre pixel; `%` = two dots + diagonal. No other file.

### [ ] T34 — Effects module: data-driven presets on the particle pool, per-species hit effects
- AC: `npx vitest run tests/effects.test.ts tests/anim.test.ts && grep -q "every species has a distinct hit effect preset" tests/effects.test.ts && grep -q "spawnEffect is deterministic and never draws rng" tests/effects.test.ts && grep -q "spawnEffect respects the 200-slot pool cap" tests/effects.test.ts && grep -q "heroSlashSouls" src/renderer/effects.ts && grep -q "companionProjectile" src/renderer/effects.ts && grep -q "bossShockwave" src/renderer/effects.ts && grep -q "captureSparkle" src/renderer/effects.ts && grep -q "feverAura" src/renderer/effects.ts` → exit 0
- Deps: none
- Worker: codex
- Files: src/renderer/effects.ts, tests/effects.test.ts
- Notes: SPEC F39 (§8). `EffectPreset`, `EFFECTS` table exactly per §8 (colours from `COLORS`, species keyed by core `SPECIES_IDS`), `spawnEffect(pool, preset, x, y, dirX, seed = 0)` on `anim.ts` `spawnParticle` with the §8 angle/colour formula (no `Math.random`). Distinctness test: no two species share the same `colors[0]`. Determinism test: two pools, same args → identical slots. No `game.ts` (not in the codex file set — T31 wires it). No new dependencies.

### [ ] T35 — Boss and companion art helpers: scale-3 boss with crown, raised HP bar, companion slots
- AC: `npx vitest run tests/sprites.test.ts && grep -q "BOSS_SCALE = 3" src/renderer/sprites/boss.ts && grep -q "BOSS_HP_BAR_Y = 54" src/renderer/sprites/boss.ts && grep -q "COMPANION_X = 2" src/renderer/sprites/companion.ts && grep -q "drawBoss paints the species art at scale 3 with the crown centred above it" tests/sprites.test.ts && grep -q "drawCompanion paints the species idle frame flipped and tinted by stars at its slot" tests/sprites.test.ts && grep -q "companionSlot stacks three slots upward from the ground left of the hero" tests/sprites.test.ts && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 27` → exit 0
- Deps: none
- Worker: codex
- Files: src/renderer/sprites/boss.ts, src/renderer/sprites/companion.ts, src/renderer/sprites/index.ts, tests/sprites.test.ts
- Notes: SPEC F40 (§3, §4). `boss.ts`: `BOSS_SCALE = 3`, `BOSS_HP_BAR_Y = 54`, `drawBoss(ctx, species: SpeciesSprites, pose: 'idle' | 'hit', frame, x, groundY, tier, opts?: { tint?: string })` → species frame at scale 3 with feet on `groundY` (top = `groundY − h·3`) + `itemSprites.crown` centred above (reuse, no new art). `companion.ts`: `COMPANION_X = 2`, `COMPANION_SLOT_GAP = 14`, `companionSlot(k, groundY)`, `drawCompanion(ctx, speciesId, frame, k, stars, groundY)` with `flipX: true` and `paletteForTier(idle.palette, stars)`. Recording-canvas tests (`makeCtx` pattern from tests/sprites.test.ts). Barrel exports. Pure draw helpers — the scene hook-up is T31 (claude). No new sprites, no dependencies.

### [ ] T36 — Banner text parameter, VICTORY/DEFEAT/FEVER texts, hue-cycling fever aura
- AC: `npx vitest run tests/renderer.test.ts tests/sprites.test.ts && grep -q "FEVER_TEXT = 'FEVER!'" src/renderer/hud.ts && grep -q "VICTORY_TEXT" src/renderer/hud.ts && grep -q "DEFEAT_TEXT" src/renderer/hud.ts && grep -q "export function drawFeverAura" src/renderer/sprites/aura.ts && grep -q "banner text is configurable: FEVER! and LEVEL UP! both render" tests/renderer.test.ts && grep -q "drawFeverAura paints four hue-shifted copies under the sprite and cycles with time" tests/sprites.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 52 && test "$(grep -c '^\s*it(' tests/sprites.test.ts)" -ge 25` → exit 0
- Deps: none
- Worker: codex
- Files: src/renderer/hud.ts, src/renderer/sprites/aura.ts, src/renderer/sprites/index.ts, tests/renderer.test.ts, tests/sprites.test.ts
- Notes: SPEC F41 (§5, §9). `Banner` gains `text: string`; `showBanner(banner, text = LEVEL_UP_TEXT)`; `drawBanner` renders `banner.text` (existing level-up tests unchanged). `aura.ts`: `drawFeverAura(ctx, sprite, frame, x, y, scale, timeMs)` = `drawSprite` at (±1, 0), (0, ±1) offsets with `tint: shiftHue(COLORS.red, Math.floor(timeMs / 4) % 360)`; the caller draws the real sprite after. Barrel export. Overlaps hud.ts / renderer.test.ts with T25 — the scheduler serializes; extend, never rewrite, the existing tests. Scene hook-up is T31/T47 (claude).

### [ ] T37 — Menu window pixel theme: DB16 CSS, pixelated species canvases
- AC: `test -e static/menu.css && grep -q "image-rendering: pixelated" static/menu.css && grep -q "#140c1c" static/menu.css && grep -q "canvas.species" static/menu.css && grep -q "\.card" static/menu.css && grep -q "\.tab" static/menu.css && grep -q "\.btn" static/menu.css && ! grep -q "url(" static/menu.css && npx vitest run tests/sprites.test.ts` → exit 0
- Deps: none
- Worker: codex
- Files: static/menu.css
- Notes: SPEC F42 (§9). Style the fixed class names of `static/menu.html` (`.tabs .tab .panel .card .species .name .stars .power .btn .row .footer .result`): DB16 palette (`#140c1c` background, `#deeed6` text, `#8595a1` borders, `#d04648`/`#6dc2ca` accents), monospace pixel look, `canvas.species { image-rendering: pixelated; width: 48px; height: 40px }` (the 24×20 canvas is painted by `src/menu/index.ts` via `drawSprite` — claude, T48), disabled buttons dimmed. No `url()`, no fonts, no binary assets (F19 sweep covers `static/`). Only this file (`src/menu/**` and `static/menu.html` are outside the codex file set).

### [ ] T38 — Server store + createApp: register, upload snapshot, leaderboard, rate limit
- see SERVER_ARCHITECTURE.md §Tasks

### [ ] T39 — Server POST /v1/pvp: neighbour or Training Dummy, core resolvePvp, roster cap, cooldown
- see SERVER_ARCHITECTURE.md §Tasks

### [ ] T40 — Server PgStore: pg 8.23.0 devDependency, pg.d.ts, idempotent DDL, DATABASE_URL switch
- see SERVER_ARCHITECTURE.md §Tasks

### [ ] T41 — Client identity.json, shared API wire types, serverUrl constant
- see SERVER_ARCHITECTURE.md §Tasks (client boundary: §10)

### [ ] T42 — Main net client: injected fetch, 5000 ms timeout, never throws
- see SERVER_ARCHITECTURE.md §Tasks (client boundary: §10)

### [ ] T43 — Net IPC: get-identity/set-name/leaderboard/pvp handlers, preload, SMOKE offline
- see SERVER_ARCHITECTURE.md §Tasks (channels/preload names: §9; sync helper: §10)

### [ ] T44 — Render deploy: bootstrap, SERVER_URL, push, deploys create --wait, healthz + probe
- see SERVER_ARCHITECTURE.md §Tasks (push: yes; AC guarded by DESMON_SKIP_NET=1)

### [ ] T45 — Menu IPC contract: action/menu-action/state-changed/menu-ready relay, after-save sync
- AC: `npx vitest run tests/ipc.test.ts tests/renderer.test.ts && grep -q "desmon:action" src/shared/ipc.ts && grep -q "desmon:menu-action" src/shared/ipc.ts && grep -q "desmon:state-changed" src/shared/ipc.ts && grep -q "desmon:menu-ready" src/shared/ipc.ts && grep -q "sendAction" src/preload/index.ts && grep -q "onStateChanged" src/preload/index.ts && grep -q "reportMenuReady" src/preload/index.ts && grep -q "onAction(" src/renderer/global.d.ts && grep -q "function sendToOthers" src/main/ipc.ts && grep -q "the save-state handler relays the written save to every other window as state-changed" tests/ipc.test.ts && grep -q "menu-action is validated and forwarded to every other window as an action" tests/ipc.test.ts && grep -q "menu-ready answers the sender with the current save" tests/ipc.test.ts && grep -q "registerIpcHandlers()" src/main/index.ts && test "$(grep -c '^\s*it(' tests/ipc.test.ts)" -ge 15` → exit 0
- Deps: T43
- Worker: claude
- Files: src/shared/ipc.ts, src/preload/index.ts, src/main/ipc.ts, src/renderer/global.d.ts, tests/ipc.test.ts
- Notes: SPEC F51 (§9, §10). Add `ACTION, MENU_ACTION, STATE_CHANGED, MENU_READY` to `IPC` (EXTEND the `toEqual` table and the `it.each` method list in tests/ipc.test.ts — never shrink) and `onAction, sendAction, onStateChanged, reportMenuReady` to the preload (2-space `name:` form) and `global.d.ts`. Relay is stateless (`sendToOthers(event.sender, …)` over `BrowserWindow.getAllWindows()`), so `src/main/index.ts` is NOT touched and `registerIpcHandlers()` keeps its literal. `MENU_ACTION` validates the action shape before forwarding (unknown type → ignored). `SAVE_STATE`: write → `session.onSave(parseSave(data))` (T43's net session, already there — keep it) → `sendToOthers(STATE_CHANGED, parsed)`. No broadcast: main never pushes roster changes to the game window (`SERVER_ARCHITECTURE.md §6`); `removed`/`stolen`/`lost` reach the game as menu actions (T49). Tests are source-contract (main/ipc.ts value-imports electron). Keep `SaveStatePayload = unknown` in shared/ipc.ts (it must stay import-free, T05 notes); main parses with `parseSave` before relaying.

### [ ] T46 — Menu window + tray item "Collection & Battle…"
- AC: `npx vitest run tests/tray.test.ts tests/window.test.ts tests/ipc.test.ts && grep -q "Collection & Battle" src/main/tray.ts && grep -q "menu.html" src/main/menuWindow.ts && grep -q "app.focus({ steal: true })" src/main/menuWindow.ts && grep -q "width: 380" src/main/menuWindow.ts && grep -q "height: 520" src/main/menuWindow.ts && grep -q "sandbox: true" src/main/menuWindow.ts && grep -q "showMenuWindow" src/main/index.ts && grep -q "registerIpcHandlers()" src/main/index.ts && grep -q "tray menu lists title, status, separator, Collection & Battle, Reset Progress, Quit in that order" tests/tray.test.ts && test -e static/menu.html && test "$(grep -c '^\s*it(' tests/tray.test.ts)" -ge 17 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T45
- Worker: claude
- Files: src/main/menuWindow.ts, src/main/index.ts, src/main/tray.ts, static/menu.html, tests/tray.test.ts
- Notes: SPEC F52 (§9). Window options in §9 verbatim (same preload path as window.ts, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`); singleton `showMenuWindow()`; `app.focus({ steal: true })` after show; reference dropped on `closed`. Tray: `COLLECTION_LABEL = 'Collection & Battle…'` between the separator and `RESET_LABEL`; `TrayMenuActions.openCollection`; EXTEND the order `toEqual` (retitle allowed, keep the assertion); `noopActions()` in the test gains the new action. `index.ts`: `openCollection: () => showMenuWindow()` — never called under SMOKE (no tray clicks), so `SMOKE_OK` stays gated on first-frame only; keep the `registerIpcHandlers()` literal and the `app.dock?.hide()` → `createOverlayWindow()` order pinned by tests/window.test.ts. `static/menu.html` here is a minimal shell (`<link rel="stylesheet" href="menu.css">`, a `<h1>`, no script) — T48 replaces it.

### [ ] T47 — Game window applies actions + flushes save
- AC: `npx vitest run tests/renderer.test.ts && grep -q "onAction" src/renderer/index.ts && grep -q "apply(a: CollectionAction)" src/renderer/game.ts && grep -q "apply() forwards collection actions to the engine and reports its events" tests/renderer.test.ts && grep -q "apply(removeCompanions) never touches in-flight presentation" tests/renderer.test.ts && grep -q "a won pvp shows the VICTORY banner and pops the stolen companion in" tests/renderer.test.ts && grep -q "a lost pvp shows the DEFEAT banner and scatters the lost companion" tests/renderer.test.ts && grep -q "a rebirth flushes presentation and restarts at monster 0" tests/renderer.test.ts && test "$(grep -c '^\s*it(' tests/renderer.test.ts)" -ge 64 && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T31, T45
- Worker: claude
- Files: src/renderer/game.ts, src/renderer/index.ts, tests/renderer.test.ts
- Notes: SPEC F53 (§6, §9). `index.ts`: `window.desmon.onAction((a) => { saves.onEvents(game.apply(a)); saves.flush(); })` — the flush triggers `SAVE_STATE` → main relays `STATE_CHANGED` to the menu (closing the loop with no new state ownership). `Game.apply` routes the engine's events through the shared `handleEvents`: `pvpResolved` → `showBanner(banner, won ? VICTORY_TEXT : DEFEAT_TEXT)`, stolen → `captureSparkle` at its slot, lostId → `spawnSpriteScatter` of its species idle art at the former slot; `rebirth` → same presentation clear as `reset()` then spawn pop-in. No arena replay.

### [ ] T48 — Menu roster UI: view-model + DOM wiring for consume/fuse/reincarnate/sacrifice/rebirth
- AC: `npx vitest run tests/menu.test.ts && grep -q "src/menu" tsconfig.renderer.json && grep -q "reportMenuReady" src/menu/index.ts && grep -q "onStateChanged" src/menu/index.ts && grep -q "sendAction" src/menu/index.ts && grep -q "drawSprite" src/menu/index.ts && grep -q "menu.css" static/menu.html && grep -q "dist/web/menu/index.js" static/menu.html && grep -q "rosterRows lists companions with power in letter-suffix format sorted by power" tests/menu.test.ts && grep -q "fuse candidates are pairs of the same species and stars" tests/menu.test.ts && grep -q "rebirth button is enabled only from monster index 40" tests/menu.test.ts && grep -q "menu page paints each companion card with the species sprite" tests/menu.test.ts && grep -q "menu page reports ready and renders every state-changed save" tests/menu.test.ts` → exit 0
- Deps: T46, T47
- Worker: claude
- Files: static/menu.html, src/menu/index.ts, src/menu/view.ts, tsconfig.renderer.json, tests/menu.test.ts
- Notes: SPEC F54 (§9). `view.ts` is DOM-free (pure data → strings/flags: `rosterRows(save)`, `fuseCandidates(save)`, `canRebirth(save)`, `consumeTargets`) and fully unit-tested; `index.ts` is a thin DOM binder pinned by source-contract greps (renderer/index.ts pattern): boot → `reportMenuReady()`; `onStateChanged(save)` → re-render; buttons → `sendAction(...)`; each card's `<canvas class="species" width="24" height="20">` painted with `drawSprite(ctx, monsterSprites[speciesId].idle, 0, 0, 0, { palette: paletteForTier(..., stars) })` (or tint) — Ranking/Battle panels are placeholders until T49. `static/menu.html`: tabs + panels with the §9 class names, `<script type="module" src="../dist/web/menu/index.js">`. `tsconfig.renderer.json` include += `"src/menu"` (emits `dist/web/menu/`; eslint and the renderer typecheck cover it; global.d.ts applies). Never import electron/net; the menu talks only through `window.desmon`.

### [ ] T49 — Menu Ranking + Battle tabs: leaderboard, name, PvP with pvpResult action
- AC: `npx vitest run tests/menu.test.ts && grep -q "getLeaderboard" src/menu/index.ts && grep -q "pvp()" src/menu/index.ts && grep -q "setName" src/menu/index.ts && grep -q "getIdentity" src/menu/index.ts && grep -q "type: 'pvpResult'" src/menu/index.ts && grep -q "leaderboard rows render rank, name, deepest monster and rebirths" tests/menu.test.ts && grep -q "offline or failed results render an Offline row" tests/menu.test.ts && grep -q "pvp result text names the stolen or lost companion and the cooldown" tests/menu.test.ts && grep -q "battle button is disabled with no companions or during cooldown" tests/menu.test.ts && grep -q "a successful pvp is forwarded to the game as a pvpResult action" tests/menu.test.ts` → exit 0
- Deps: T48
- Worker: claude
- Files: src/menu/index.ts, src/menu/view.ts, static/menu.html, tests/menu.test.ts
- Notes: SPEC F55 (§9, §10; wire/IPC shapes: `SERVER_ARCHITECTURE.md §2/§6`). `view.ts`: `leaderboardRows(result: NetResult<LeaderboardResult>)` (`ok: false` → one `Offline`/`Cooldown` row), `pvpResultText(result)`, `battleEnabled(save, cooldownUntil)`. `index.ts`: Ranking tab → `getLeaderboard(n?)` on tab open; Battle tab → name field (`setName(name)` on change, shows the returned `IdentityPayload.name`), single `Battle!` (opponent is the server's pick) → `pvp()`. After a successful `leaderboard()`/`pvp()`: if `value.removed.length` → `sendAction({ type: 'removeCompanions', ids: value.removed })` first; then (pvp only) `sendAction({ type: 'pvpResult', won, stolen, lostId })` with `won = r.value.win`, `stolen = r.value.stolen`, `lostId = r.value.lost?.id ?? null`, then show the result text; on `cooldown` start a client countdown from `retryAfterSec`. `getIdentity()` → `identity.online === false` → tabs render `Offline` immediately without calling the network.

### [ ] T50 — Version 0.2.0, tray title, README (fever/boss/companions/rebirth/leaderboard/PvP), SPEC manual appendix M9–M14
- AC: `node -e "process.exit(require('./package.json').version==='0.2.0'&&require('./package-lock.json').version==='0.2.0'?0:1)" && grep -q "DesMon v0.2.0" src/main/tray.ts && grep -qi leaderboard README.md && grep -qi pvp README.md && grep -qi fever README.md && grep -qi rebirth README.md && grep -qi companion README.md && grep -qi boss README.md && grep -q "DesMon-0.2.0-arm64.dmg" README.md && grep -q "M9" SPEC.md && grep -q "M14" SPEC.md && npx vitest run tests/tray.test.ts tests/packaging.test.ts && test "$(grep -c '^\s*it(' tests/packaging.test.ts)" -ge 11` → exit 0
- Deps: T37, T44, T49
- Worker: claude
- Files: package.json, package-lock.json, src/main/tray.ts, README.md, SPEC.md, tests/packaging.test.ts
- Notes: SPEC F57 (§12). 6 files, flagged: package-lock.json only changes its two `version` fields (edit by hand or `npm install --package-lock-only`; no network needed). `TRAY_TITLE = 'DesMon v0.2.0'` (tests/tray.test.ts compares to package.json). README sections: gameplay v2 (bosses every 8th, capture, companions/volley, fever, lifecycle + rebirth, A–Z numbers), Collection window, Ranking/PvP + `SERVER_URL`/`DESMON_SERVER_URL` override, offline behaviour, Render free-tier caveats (sleep, 30-day Postgres expiry), `npm run start:server`, artifact names 0.2.0. SPEC.md: the Spec Clarifier already wrote M9–M14 in stage 1 — only fill gaps (exact artifact names, M8 → 0.2.0); do not touch feature rows. tests/packaging.test.ts: artifact-name pin follows the version.

### [ ] T51 — Deploy re-verify: redeploy HEAD, healthz sha ancestry, build-filter paths untouched
- see SERVER_ARCHITECTURE.md §10 (push: yes; Deps: T32, T44, T49, T50 — lands after the version bump so the live sha covers every build-filter path; AC guarded by DESMON_SKIP_NET=1)

### [ ] T52 — Unsigned macOS packaging 0.2.0 + packaged smoke
- AC: `npm run package && test -f release/DesMon-0.2.0-arm64.dmg && test -d release/mac-arm64/DesMon.app && node -e "const b=require('./package.json').build;process.exit(b.files.includes('dist/**/*')&&b.files.includes('!dist/electron/server/**')?0:1)" && (SMOKE=1 release/mac-arm64/DesMon.app/Contents/MacOS/DesMon > /tmp/desmon-pkg-smoke.log 2>&1 || true) && grep -q SMOKE_OK /tmp/desmon-pkg-smoke.log` → exit 0
- Deps: T22, T51
- Worker: claude
- Files: package.json, README.md
- Notes: SPEC F25/F26 (amended to 0.2.0). Verify the T01/T19 config rather than rewriting it; the only expected diff since v1 is the `!dist/electron/server/**` exclusion (T22) and the version. Packaged smoke runs the app binary with `SMOKE=1` (offline by code, no menu window, no Accessibility prompt); a running dev instance would steal the single-instance lock — quit it first. `pg` must not ship: `node -e "require('./release/mac-arm64/DesMon.app/Contents/Resources/app.asar')"` is NOT required; instead grep the asar listing (`npx asar list … | grep -c node_modules/pg` → 0) if in doubt. Files listed are the only ones a fix may touch.

### [ ] T53 — SPEC criteria sweep (F01–F57, literal)
- AC: `npm test && npm run lint && npm run typecheck && npm run smoke > /tmp/desmon-smoke.log 2>&1 && grep -q SMOKE_OK /tmp/desmon-smoke.log` → exit 0
- Deps: T22, T52
- Worker: claude
- Files: (gaps only — each fix ≤ 5 files, listed in the note; nothing planned)
- Notes: Execute EVERY AC in SPEC.md's feature table LITERALLY from the repo root (network ACs with `DESMON_SKIP_NET=1` unless the network is available — record which). Fix small gaps in place; anything larger → SPLIT (`T53a…`) rather than ballooning. Re-run `npm run package` only if a fix touched shipped files. Done only when every AC exits 0 and gates + smoke are green. Manual appendix M1–M14 is out of loop scope. Last task.

## 14. Pre-resolved assumptions (SPEC §Assumptions, numbered after v1's 17)

18. Numbers: monster HP, damage and companion power are native `bigint` (unbounded); coins/xp/level/kills/souls/rebirths/indices stay JS numbers because their curves are linear/logarithmic and cannot approach 2^53 in practice.
19. `monsterMaxHp` is the exact rational floor `10·115^i/100^i`; it equals the v1 double formula for every index < 199, so v1 exact-value tests keep their values (type edits only, no test deleted).
20. Damage/power text uses truncating A–Z notation: < 1000 plain; else 3 significant digits + bijective-base-26 suffix (A = 10^3 … Z = 10^78, AA = 10^81, ZZ = 10^2106, AAA …); `.` and every letter exist in the 3×5 font.
21. Save schema v2 stores bigint fields as decimal strings; v1 saves migrate field by field; junk never prevents boot; `createEngine` and `serializeSave` accept v1 or v2.
22. Every 8th monster (`index % 8 === 7`) is a boss: 5× HP, 5× XP, 5× coins, ` BOSS` name, drawn 3× with a crown; bosses cycle all five species.
23. Boss kills capture the boss as a companion with probability 0.35 (one rng draw after loot, always consumed); companions are `{ id 'cN', speciesId, bossIndex, level 1..10, stars }`; the roster holds at most 30 — captures and PvP steals into a full roster are void.
24. Companion power = `max(1, ⌊maxHp(bossIndex)/20⌋) · level · 2^stars`; the 3 strongest (tie → lower id) hit once per 1000 ms of engine time, never crit, ×3 during fever; their kills chain, drop loot and can capture.
25. Fever starts when 20 inputs land within 3000 ms of ENGINE time (advanced only by rAF dt), lasts 5000 ms, triples all damage, then 10000 ms cooldown; never persisted; a throttled window can over-trigger — deterministic and accepted.
26. Lifecycle ops are pure and total: consume (+1 + food.stars levels, cap 10), fuse (same species + stars → stars + 1, level 1), reincarnate (level 10 → level 1, stars + 1), sacrifice (→ souls += 1 + stars), rebirth (index ≥ 40 → souls += ⌊index/8⌋; resets level/xp/monster; keeps roster, items, coins, kills, bestIndex).
27. Hero damage = `level × (crit 2) × (fever 3) × (1 + souls)`; hero level is a minor stat — growth comes from companions and souls; balance beyond these formulas is a Non-Goal.
28. Effects are data presets over the existing 200-slot particle pool, deterministic (index-derived angles, no rng); each species, the hero (cyan; gold with souls), companions (projectile), bosses (shockwave), captures (sparkle) and fever (aura) have distinct presets.
29. Collection/Ranking/Battle UI is a second 380×520 framed DOM window (`static/menu.html`) opened only from the tray; the game window owns the engine; main relays actions and the last written save to every other window; no hotkey; never opened under SMOKE.
30. Sound is four synthesized blips (v1 three + fever start).
31. Identity is `userData/identity.json` `{ playerId, token, name }` held by main only; credentials are server-issued on first sync; default name `Knight-xxxx`; display name ≤ 16 chars; 401 → re-register; cheating via save edits is not defended beyond server shape caps.
32. All networking lives in main (`src/main/net.ts`, Node fetch, 5000 ms timeout, offline-first: `NetResult` errors, game unaffected); renderers never touch the network; `SMOKE=1` and an empty `SERVER_URL` force offline by code; sync is inline at three moments (after a changed save write, before leaderboard, before PvP) — no scheduler.
33. Leaderboard score = deepest monster index reached (`bestIndex`) desc, ties by `rebirths` desc; stats are self-reported (accept-and-rank).
34. PvP is asynchronous and server-simulated with core `resolvePvp` (win chance = my power / total over full rosters; the loser loses one uniformly random companion to the winner unless the winner is full; bot "Training Dummy" never steals); the server picks the opponent (rank neighbour by `seed & 1`); 60 s cooldown; the menu forwards the outcome to the game as a `pvpResult` action; no arena replay.
35. Server is a Node 20.12.2 `node:http` + `pg` service in `src/server`, compiled by `tsconfig.main.json`, deployed to Render free tier from GitHub main via `render-bootstrap.sh`; free Postgres expires after 30 days (documented, recreatable); `/healthz` never touches the DB.
36. The bigint cutover is one atomic 7-file task; `it(` counts per test file never decrease; pinned lists are extended, never shrunk.
37. Package version becomes 0.2.0 (tray title, README artifact names, packaging test, F25 literal follow).
38. Codex workers own only the graphics file set (sprites/**, anim/hud/effects.ts, CSS, their tests); they never run Electron, git or the network; every `game.ts`/menu hook-up is a claude task; the orchestrator runs smoke.
