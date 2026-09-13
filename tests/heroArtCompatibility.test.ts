import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, HERO_FORMS, parseSave, serializeSave } from '../src/core/index.js';
import type { SaveFile } from '../src/core/index.js';
import { toSnapshot } from '../src/main/net.js';

// Published v0.4 identities, independent of the renamed/repainted catalogue.
// Cosmetic changes must not migrate an existing player's element or buff.
const LEGACY_IDENTITIES = `
h01:1:fire:element h02:1:water:element h03:1:wind:element h04:1:earth:element h05:1:dark:element
h06:1:fire:party h07:1:water:party h08:1:wind:party h09:1:earth:party h10:1:dark:party
h11:2:fire:element h12:2:water:element h13:2:wind:element h14:2:earth:element h15:2:dark:element
h16:2:fire:party h17:2:water:party h18:2:wind:party h19:2:earth:party h20:2:dark:party
h21:3:fire:element h22:3:water:element h23:3:wind:element h24:3:earth:element h25:3:dark:element
h26:3:fire:party h27:3:water:party h28:3:wind:party h29:3:earth:party h30:3:dark:party
h31:4:fire:element h32:4:water:element h33:4:wind:element h34:4:earth:element h35:4:dark:element
h36:4:fire:party h37:4:water:party h38:4:wind:party h39:4:earth:party h40:4:dark:party
h41:5:fire:element h42:5:water:element h43:5:wind:element h44:5:earth:element h45:5:dark:element
h46:5:fire:party h47:5:water:party h48:5:wind:party h49:5:earth:party h50:5:dark:party
`.trim().split(/\s+/);

describe('hero art redesign preserves published save and network identities', () => {
  it('keeps every existing form id, rank, element and buff target unchanged', () => {
    expect(HERO_FORMS.slice(0, 50).map(({ id, rank, type, buff }) => `${id}:${rank}:${type}:${buff}`))
      .toEqual(LEGACY_IDENTITIES);
  });

  it('loads all collected looks and exact pending rolls, retaining each equipped id on the wire', () => {
    const collection = LEGACY_IDENTITIES.map((entry, index) => ({
      formId: entry.split(':')[0]!, buffPercent: 10 + index % 16,
    }));
    for (const equipped of collection) {
      const oldSave: SaveFile = {
        ...DEFAULT_SAVE, version: 3, level: 27, xp: 13, killCount: 233, coins: 4321, items: { bone: 3 },
        monsterIndex: 40, monsterSpeciesId: 'golem', monsterHp: '1',
        companions: [
          { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 3, stars: 1 },
          { id: 'c2', speciesId: 'dragon', bossIndex: 15, level: 5, stars: 2 },
        ],
        nextCompanionId: 3, souls: 17, rebirths: 8, bestIndex: 64, pvpParty: ['c2', 'c1'],
        hero: {
          equipped, collection, reincarnations: 8, offerSerial: 37,
          deferRemainingMs: 0, restRemainingMs: 0,
          choices: [
            { formId: 'h47', buffPercent: 12 },
            { formId: 'h19', buffPercent: 24 },
            { formId: 'h01', buffPercent: 25 },
          ],
        },
      };
      // Start with old-shaped bytes, not output already normalized by the new serializer.
      const loaded = parseSave(JSON.stringify(oldSave));
      const migrated = { ...oldSave, hero: { ...oldSave.hero!, offerLevel: 12 } };
      expect(loaded, equipped.formId).toEqual(migrated);
      expect(parseSave(serializeSave(loaded)), equipped.formId).toEqual(migrated);
      const resumed = createEngine(loaded, {
        next: () => { throw new Error('Reloading an existing appearance must not reroll it.'); },
      });
      resumed.apply({ type: 'heroOffer' });
      const restored = resumed.toSave();
      expect({ ...restored, progress: undefined }, equipped.formId).toEqual({ ...migrated, progress: undefined });
      expect(restored.progress?.heroCounts).toEqual(Object.fromEntries(collection.map((r) => [r.formId, 1])));
      expect(restored.progress?.reincarnationHistory).toEqual([]);
      expect(restored.progress?.playTimeMs).toBe(0);
      expect(restored.progress?.seenHeroes).toEqual(collection.map((r) => r.formId));
      expect(toSnapshot('Legacy_04', resumed.toSave()), equipped.formId).toEqual({
        name: 'Legacy_04', bestIndex: 64, rebirths: 8,
        companions: oldSave.companions, party: ['c2', 'c1'], hero: equipped,
      });
    }
  });
});
