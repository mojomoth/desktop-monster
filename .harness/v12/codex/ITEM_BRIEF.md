### Raid item icons — 10 epic-rarity 16×16 icons (file `src/renderer/sprites/raidEquipment.ts`)

`RAID_CATALOG` (from `src/core/raid.ts`, V12-04) lists one weapon and one accessory per raid boss:
ids `raid-<element>-weapon` / `raid-<element>-accessory` for water, wind, dark, earth, fire, all `rarity: 'epic'`
with `raidBossId`. Draw each as a 16×16 `Sprite` following the epic icon module `src/renderer/sprites/epicEquipment.ts`
(reuse its `brush` helper — export it from there with a one-line change if it is private).

Constraints (pinned by `tests/raidEquipment.test.ts`):
- Exactly 10 icons, all 16×16, single frame, palette ≤8 keys, lowercase hex, epic ring colour
  `RARITY_COLORS.epic` (`#de8aff`) present in every icon, element accent hue in the same bands as the boss brief.
- Pairwise structurally distinct (reuse the "not a palette swap" comparator from `tests/equipmentSprites.test.ts`):
  each icon must differ from every other in ≥30 % of cells after mapping colours to on/off.
- Weapon silhouettes read as the boss's material (water: coral trident/tide blade; wind: feather glaive;
  dark: void scythe/eye staff; earth: moss maul/stone axe; fire: magma sword/furnace hammer). Accessories are
  necklace/ring/charm shapes with the boss's motif.
- Registration: extend the icon loop in `src/renderer/sprites/equipment.ts` to iterate
  `[...EQUIPMENT_CATALOG, ...RAID_CATALOG]` and branch `if (template.raidBossId) icons.set(id, raidEquipmentIcon(template))`
  BEFORE the epic branch. Registered names follow the existing `equipment.<id>.icon` scheme.
  `tests/equipmentSprites.test.ts` keeps its 224 pin for `EQUIPMENT_CATALOG`; add a separate 10 pin for raid icons.
- Round 1: two variants per icon are NOT required (10 icons is already a set); instead deliver the set once and
  the critic reviews the contact sheet. Round ≥2 applies the critique.
