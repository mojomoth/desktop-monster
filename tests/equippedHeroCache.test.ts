import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EQUIPMENT_CATALOG, WEAPON_TYPES } from '../src/core/equipment.js';
import type { EquipmentItem } from '../src/core/equipment.js';
import { drawEquippedHero, equippedHeroSprite } from '../src/renderer/sprites/equippedHero.js';
import { HERO_FORM_IDS } from '../src/renderer/sprites/heroForms.js';
import { drawSprite } from '../src/renderer/sprites/sprite.js';

const item = (templateId: string): EquipmentItem => ({ id: 'e1', templateId, enhancement: '0', roll: 100, seed: 1, attempts: '0' });

/** Golden final-pixel fingerprints for the explicitly requested epic art revision
 * and the bobbing-head occlusion fix. Previous baselines and the intentional
 * mismatch are preserved in .agentdoc/v10-epic-art-20260918/preservation.
 * Include all templates, all costumes, all poses, both facings, white hit tint
 * and every epic shimmer phase plus its wrap; compare pixels, not draw counts.
 */
function fingerprint(composite: boolean): { sha256: string; count: number } {
  const hash = createHash('sha256'); let count = 0;
  const cases: Array<[string, EquipmentItem | null]> = composite
    ? ['h00', 'h56', 'h58', 'h70'].flatMap(hero => WEAPON_TYPES.map(type => [hero, item(`w-${type}-epic-4`)] as [string, EquipmentItem]))
    : [...EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon').map(t => ['h00', item(t.id)] as [string, EquipmentItem]),
      ...['h00', ...HERO_FORM_IDS].flatMap(hero => [[hero, null] as [string, null],
        ...['sword', 'spear', 'staff', 'gauntlet'].map(type => [hero, item(`w-${type}-epic-4`)] as [string, EquipmentItem])])];
  for (const [formId, weapon] of cases) for (let pose = 0; pose < 5; pose++) for (const flipX of [false, true]) {
    for (const timeMs of [0, 120, 240, 360, 480, 600]) for (const tint of [undefined, '#ffffff']) {
      const pixels = new Map<string, string>();
      const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number) {
        // Normalize strips to the original 2px art cells; keep golden hashes.
        if (w % 2 !== 0 || h !== 2) throw Error('Non-pixel-aligned hero rectangle');
        for (let px = x; px < x + w; px += 2) pixels.set(`${px},${y},2,2`, String(ctx.fillStyle));
      } };
      const opts = { attacking: pose >= 2, frame: pose >= 2 ? pose - 2 : pose, flipX, timeMs, tint };
      if (composite) drawSprite(ctx, equippedHeroSprite(formId, weapon, opts), 0, 5, 7, { scale: 2 });
      else drawEquippedHero(ctx, formId, weapon, 5, 7, { ...opts, scale: 2 });
      hash.update(JSON.stringify([...pixels].sort())); count++;
    }
  }
  return { sha256: hash.digest('hex'), count };
}

describe('bounded equipment rendering caches', () => {
  it('preserves the revised final pixels of 57,960 equipped hero views', () => {
    expect(fingerprint(false)).toEqual({ sha256: '1b91162ab187c4c33f8e1473eeecde5c5abd178146e398fe9f53bbda64aaeef8', count: 57960 });
  }, 30000);

  it('preserves the revised final pixels of 3,840 fever/KO composites', () => {
    expect(fingerprint(true)).toEqual({ sha256: '69765b2f3bf0972e50db9de466ab6553cc430ae3822c6de148cb023a74195666', count: 3840 });
  }, 30000);

  it('reuses geometry across owned copies and shimmer cycles without conflating pose, flip or hit tint', () => {
    const weapon = item('w-sword-epic-4'), first = equippedHeroSprite('h00', weapon);
    expect(equippedHeroSprite('h00', { ...weapon, id: 'e999', enhancement: '90', roll: 120 }, { timeMs: 600 })).toBe(first);
    expect(equippedHeroSprite('h00', weapon, { timeMs: 120 })).not.toBe(first);
    expect(equippedHeroSprite('h00', weapon, { flipX: true })).not.toBe(first);
    expect(equippedHeroSprite('h00', weapon, { attacking: true, frame: 1 })).not.toBe(first);
    const tinted = equippedHeroSprite('h00', weapon, { tint: '#ffffff' });
    expect(tinted).not.toBe(first);
    expect(equippedHeroSprite('h00', weapon, { tint: '#ffffff', timeMs: 120 })).toBe(tinted);
    const ordinary = item('w-sword-common-4'), plain = equippedHeroSprite('h00', ordinary);
    expect(equippedHeroSprite('h00', ordinary, { timeMs: 120 })).toBe(plain);
  });

  it('evicts old composites when forms change instead of retaining every visited combination', () => {
    const weapon = item('w-staff-rare-4'), first = equippedHeroSprite('h00', weapon);
    for (const formId of HERO_FORM_IDS) equippedHeroSprite(formId, weapon);
    const afterEviction = equippedHeroSprite('h00', weapon);
    expect(afterEviction).not.toBe(first);
    expect(equippedHeroSprite('h00', weapon)).toBe(afterEviction);
  });
});
