// Host calls this in the actual Electron renderer. Returned PNGs contain only
// production drawing functions; this module never opens a window or reads saves.
import { canEquip, EQUIPMENT_CATALOG } from '../../core/equipment.js';
import type { EquipmentItem } from '../../core/equipment.js';
import { drawEquipmentIcon } from './equipment.js';
import { drawEquippedHero } from './equippedHero.js';
import { HERO_FORM_IDS } from './heroForms.js';

export interface EquipmentArtSample { id: string; hero: string; pose: number; flipX: boolean; theme: string; pixels: number }
export interface EquipmentArtPage { name: string; dataUrl: string; samples: EquipmentArtSample[] }
/** Both themes: 2,560 novice frames, 448 icons, 1,420 unarmed frames and
 * 2,720 longest-epic fit frames across the other 70 compatible costumes. */
export function renderEquipmentContactSheets(doc: Document): EquipmentArtPage[] {
  const pages: EquipmentArtPage[] = [];
  for (const [theme, background, foreground] of [['dark', '#140c1c', '#eef1e9'], ['light', '#f2eee7', '#140c1c']] as const) {
    const samples: { id: string; hero: string; pose: number; flipX: boolean; icon: boolean }[] = [];
    for (const template of EQUIPMENT_CATALOG) {
      samples.push({ id: template.id, hero: '', pose: 0, flipX: false, icon: true });
      if (template.kind === 'weapon') for (let pose = 0; pose < 5; pose++) for (const flipX of [false, true]) {
        samples.push({ id: template.id, hero: 'h00', pose, flipX, icon: false });
      }
    }
    for (const hero of ['h00', ...HERO_FORM_IDS]) for (let pose = 0; pose < 5; pose++) for (const flipX of [false, true]) {
      samples.push({ id: 'bare', hero, pose, flipX, icon: false });
    }
    for (const hero of HERO_FORM_IDS) for (const template of EQUIPMENT_CATALOG) {
      const item: EquipmentItem = { id: 'e1', templateId: template.id, enhancement: '0', roll: 100, seed: 1, attempts: '0' };
      if (template.kind !== 'weapon' || template.rarity !== 'epic' || template.tier !== 3 || !canEquip(item, hero, 1000)) continue;
      for (let pose = 0; pose < 5; pose++) for (const flipX of [false, true]) {
        samples.push({ id: template.id, hero, pose, flipX, icon: false });
      }
    }
    for (let page = 0; page * 48 < samples.length; page++) {
      const subset = samples.slice(page * 48, (page + 1) * 48);
      const canvas = doc.createElement('canvas'); canvas.width = 1200; canvas.height = 48 + Math.ceil(subset.length / 6) * 116;
      const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Native equipment Canvas unavailable');
      ctx.imageSmoothingEnabled = false; ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = foreground; ctx.font = '16px monospace'; ctx.fillText(`DesMon production equipment / ${theme} / ${page + 1}`, 12, 28);
      const evidence: EquipmentArtSample[] = [];
      for (const [index, sample] of subset.entries()) {
        const x = index % 6 * 200, y = 48 + Math.floor(index / 6) * 116;
        const weapon: EquipmentItem | null = sample.id === 'bare' ? null
          : { id: 'e1', templateId: sample.id, enhancement: '0', roll: 100, seed: 1, attempts: '0' };
        ctx.fillStyle = foreground; ctx.font = '10px monospace';
        ctx.fillText(sample.id, x + 6, y + 13);
        ctx.fillText(`${sample.hero || 'icon'} / ${sample.pose} / ${sample.flipX ? 'left' : 'right'}`, x + 6, y + 27);
        if (sample.icon) drawEquipmentIcon(ctx, sample.id, x + 68, y + 36, { scale: 4 });
        else drawEquippedHero(ctx, sample.hero, weapon, x + 70, y + 40,
          { scale: 4, frame: sample.pose >= 2 ? sample.pose - 2 : sample.pose, attacking: sample.pose >= 2, flipX: sample.flipX, timeMs: 120 });
        const rgba = ctx.getImageData(x, y + 30, 200, 86).data;
        const bg = [1, 3, 5].map(offset => Number.parseInt(background.slice(offset, offset + 2), 16));
        let pixels = 0;
        for (let i = 0; i < rgba.length; i += 4) if (bg.some((value, channel) => rgba[i + channel] !== value)) pixels++;
        evidence.push({ id: sample.id, hero: sample.hero, pose: sample.pose, flipX: sample.flipX, theme, pixels });
      }
      pages.push({ name: `equipment-${theme}-${page + 1}`, dataUrl: canvas.toDataURL('image/png'), samples: evidence });
    }
  }
  return pages;
}
