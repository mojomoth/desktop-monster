# DesMon 0.10.0 equipment catalog

Generated from production TypeScript. The complete 224 names, powers, prices, class compatibility and acquisition sources are in [EQUIPMENT_CATALOG.json](EQUIPMENT_CATALOG.json).

There are 128 weapons (8 families × 4 rarities × 4 current-level requirements) and 96 accessories (3 shapes × 2 secondary effects × 4 rarities × 4 variants). Equipped slots are one weapon and four generic accessories. Each duplicate copy has a distinct UID.

| Rarity | Base buy price | Weapon bonus at required level 1 / 5 / 10 / 15 |
|---|---:|---|
| common | 4500G × tier multiplier | 8% / 20% / 50% / 100% |
| uncommon | 18000G × tier multiplier | 16% / 40% / 100% / 200% |
| rare | 72000G × tier multiplier | 32% / 80% / 200% / 400% |
| epic | Boss only | 64% / 160% / 400% / 800% |

Tier price multipliers are 1/2/4/8. Rolls are 90–110%. Accessories add their primary attack basis points together; their four variants use 1/2/3/4 times the accessory base. h00 accepts every family but must still meet the current-level requirement. Other forms use the explicit compatibility list in JSON.

Regenerate after numerical or compatibility changes:

```sh
node .harness/v10/catalog.mjs generate
node .harness/v10/catalog.mjs verify
```

The verifier recompiles current core, recomputes all 224 entries and checks both artifacts byte-for-byte. It does not trust stale dist output.
