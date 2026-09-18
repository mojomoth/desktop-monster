# DesMon 0.10.0 approved implementation contract

User approved 2026-09-17. This replaces the earlier proposal. Preserve the
existing dirty tree; no git operations, new dependencies, publishing or deploy.
The v10 Host contract authorizes core/server/menu/renderer implementation and
native validation; the old v3 dispatched graphics-lane restrictions are not the
scope of this expressly authorized Host-led update. CURRENT remains v3.

## Immutable product requirements

- At least 128 weapons (8 families × 4 rarities × 4 required-level tiers) and
  96 accessories (3 shapes × 2 effect families × 4 rarities × 4 variants).
  Distinct names and genuinely distinct silhouettes, not recolors/count padding.
- Weapon families: sword, greatsword, spear, gun, dagger, staff, hammer, gauntlet.
  Rarities: common, uncommon, rare, epic. No armor.
- Exactly one weapon and four generic accessory slots. Different owned copies
  of the same accessory definition may fill all four slots; never duplicate UID.
- h00 has no class field/restriction and accepts every item FAMILY; weapon
  requirements still use CURRENT hero level. Other heroes use an explicit job map.
- Higher required-level weapons in the same family/rarity have higher unenhanced
  power. Reincarnation resets level and can therefore unequip weapons.
- No auto-equip modes. Maximize displayed non-critical/non-fever hero attack;
  economic/critical/team bonuses never displace more displayed attack. Prefer
  existing equipment on ties, then fill empty slots, then stable IDs. Accessory
  attack contributions are one additive channel for exact O(N log N) selection.
- Equipment drops ONLY on boss kills. Keep ordinary coin/material semantics.
- Equipped items do not consume bag capacity. Initial slots and expansion size
  are calibrated; expansion PRICE doubles each time (not bag capacity).
- Select new equipment and remove it from bag before stowing unequipped items.
  Ordinary overflow replaces old temporary batch; all overflow produced together
  is retained in a dynamically sized NEW batch. A,B then C,D => C,D only.
  A drop that fits bag/equipment does not erase old temporary items.
- Same moment means one production simulation-frame transaction: a hero switch
  plus boss drops in that frame share one overflow batch. At most one hero change
  per batch. Later overflow starts a new batch, never cumulative capacity.
- Actual hero change/reincarnation clears OLD temporary items. If nonempty show
  a confirmation listing exact lost items; cancel/no-op/stale/duplicate request
  changes nothing. Bind request to target hero, hero-change serial, temporary
  revision and offer serial for reincarnation. Changed temporary content requires
  renewed confirmation. Do not re-equip OLD temporary items to evade this deletion.
- Temporary items can be moved, sold, enhanced. Purchases that would delete old
  temporary items are rejected. Persist temporary content across restart.
- Shop refreshes every hour, displays countdown, persists stock, purchased flags,
  and hidden rolls. Sells common/uncommon/rare, never epic. Rare primary stats,
  required level, compatibility, price visible; secondary properties reveal on buy.
  Keep existing training/lure purchases. High prices are derived by measurement.
- +1..+5 guaranteed. From +6, failure destroys the item; success probability
  strictly decreases with stage, remains positive, and no gameplay stage cap.
  Consecutive enhancement costs are at least 2×. No fixed 95%, probability floor,
  cost saturation, or artificial gold cap. Exact rational RNG for tiny chances.
- Epic bosses: conditional encounters independent of ordinary rare pity; both
  appearance and item drop are independent probabilities. No pity/target boost.
  Codex shows conditions, progress, possible epic loot and acquisition history.

## Technical interfaces and verification

- Core coins/prices/spending use bigint; save/IPC/HTTP use decimal strings.
  Save v4 migrates v1..3 exact safe integers; never silently round or zero money.
  Recovery/checkpoints/server JSONB currency are migrated together. Network mode
  explicitly negotiates decimal currency; old committed receipts remain readable.
- Money/equipment actions are durable atomic operations. Frame transaction covers
  hero change, boss death/rewards, overflow, ID allocation and save; no saved kill
  with missing gear. Flush pending frame on capture/blur/quit.
- Keep body14×14 at 2×, split body/hands/weapon for all71 heroes. Bare/gauntlet
  punches, other families use appropriate motions. Complete attack animation under
  rapid input with at most one queued presentation swing; damage per input intact.
  Rare/epic weapon contours; matching rarity name/border colors. Shared rendering.
- PvP hero1+companions≤5, including hero-only. Alternate sides and round-robin
  [hero, front-first companions]; target [front-first companions, hero]. Hero HP
  =5×trained base hero attack without equipment. KO not permanent; team passives
  fixed at entry.200-blow cap/defender wins retained. Seeded server calculation.
  Defending snapshot at preview; attacking snapshot at first resolution. Preserve
  five gear items, initial HP and typed actor/target blows in attack/defense replay.
  Companion actions no longer animate phantom hero hits in new rules.
- Native tests use isolated data and simulated input, no live hooks/production PvP.
  Final: canonical gates, smoke, macOS app/DMG, Windows installer, active30m and
  idle30m baseline/candidate plus mixed180m candidate with existing CPU/RAM budgets.
  Hardware Windows, real PostgreSQL and human enjoyment are reported separately.

## Host workflow

Host/root owns journal, main, shared wire, server, menu, renderer bootstrap,
static assets and packaging. Balance owns core except fsm and core tests;
Designer owns renderer game/hud/sprites/anim/fsm and their tests. Critic performs
independent read-only reviews and may add isolated adversarial tests. Never write
another role's files without explicit handoff. Maximum four live agents including
Host. Actual IDs, source hashes, protocol hashes and attempts are recorded.

Baseline -> preregister candidates/criteria -> review Designer/Critic/Balance/Host
-> implement foundation -> representative vertical slice -> full catalog/UI/PvP
-> explore/calibrate -> independent >=100 validation seeds/policy -> native and
packages -> final audit. A source change invalidates affected evidence. Last
failure overrides earlier success. Resume checks live processes before restarting.
Never weaken/delete/skip tests. Exact gates:

    npm test && npm run lint && npm run typecheck

Numbers delegated to the agents: level tiers/power/options, buy/sell/enhancement
base prices, descending success curve, initial bag/expansion size/base price,
stock and boss/epic probabilities. Do not inflate income alongside prices to
erase their real cost. Explore vs validate seeds must be disjoint. Report first
purchase and opportunity cost, actual item use before/after rebirth, duplicate
accessory concentration, destruction and overflow loss, rare nonarrival tails.
