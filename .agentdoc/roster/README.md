# Monster roster — how the 105 species were made and how to regenerate them

User request (2026-09-08): "파악하고 최소 100개 이상의 몬스터를 만들어줘. 몬스터의
이미지 생성은 gpt 6 astra 모델을 사용해" — grow the catalog from 5 species to
100+, with the art drawn by the Codex CLI on the `gpt-6-astra` model.

## Why 105 and not 100

`BOSS_EVERY = 8` (SPEC F31) and the species count must be COPRIME with 8, or
only some species can ever land on a boss slot: with 100 species
`gcd(100, 8) = 4`, so only the 25 species whose index is ≡ 3 (mod 4) would ever
appear as a boss. 105 is odd (`gcd(105, 8) = 1`) and a multiple of 5, so:

- every species eventually becomes a boss (over 8 × 105 = 840 monsters),
- the five elemental types split evenly, 21 species each,
- the catalog is ordered in ROUNDS of five — water, wind, dark, earth, fire —
  so `monsterForIndex(i).type` still follows the same 5-cycle it did with five
  species, and round 0 is the original slime / bat / ghost / golem / dragon.

Hidden sizes are balanced 35 / 35 / 35.

## Pipeline (all under /tmp/desmon-art, not committed)

1. `catalog.json` — the roster: id, name, type, size, attackDelayMs, concept
   (a pixel-art brief), palette hint. Designed by five per-element designers,
   then critiqued on three independent lenses (silhouette legibility at
   13×10..20×17 px, creature-identity/archetype duplication, mechanical
   constraints) and repaired.
2. `mkbatches.mjs` splits the 100 NEW species into batch dirs, each with a
   rendered `PROMPT.md` (house style + `EXEMPLAR.md` + the batch's briefs).
3. `gen.sh <batch>` runs
   `codex exec -m gpt-6-astra -s workspace-write -c model_reasoning_effort=high`
   in the batch dir. The worker writes `out.json` and must make
   `node validate.mjs out.json` exit 0 before finishing; the driver retries up
   to 3× and feeds the validator's errors back into the prompt.
4. `validate.mjs` is the mechanical gate: exactly 2 idle frames + 1 hit frame,
   every frame rectangular w×h, every non-`.` char in the palette, palette
   values restricted to the 16 DB16 colour NAMES, 3..8 palette entries, frame
   size inside the band for the species' hidden size
   (1 → w 13..15 h 10..11, 2 → w 14..17 h 12..14, 3 → w 17..20 h 15..17),
   idle frame 1 ≠ frame 0, id/name shape, silhouette density.
   `--preview` renders the sprites as ANSI colour blocks for eyeballing.
5. `emit.mjs <repo-root>` writes `src/core/monsters.ts` (the generated
   SPECIES_IDS / SPECIES_TYPE / SPECIES_SIZE / SPECIES_ATTACK_DELAY_MS /
   display-name tables plus the unchanged catalog logic) and
   `src/renderer/sprites/species/{water,wind,dark,earth,fire}.ts` (the art).

Hand-written, NOT generated: the five original species' art (still inline in
`src/renderer/sprites/monsters.ts`) and their effect presets in
`src/renderer/effects.ts` — those stay byte-identical so their pinned tests
keep their exact values. The other 100 species' hit bursts and companion
attacks are derived from a per-element template with a per-species hue offset
(`360 / 105` degrees per catalog index), which keeps all 105 hit primaries
distinct as `tests/effects.test.ts` requires.
