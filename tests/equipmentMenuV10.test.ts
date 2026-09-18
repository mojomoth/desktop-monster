import { describe, expect, it } from 'vitest';
import { parseSave } from '../src/core/save.js';
import { createEquipmentItem, newEquipment } from '../src/core/equipment.js';
import { EQUIPMENT_PAGE_SIZE, mountEquipment, successText } from '../src/menu/equipment.js';
import type { MenuDocument, MenuElement } from '../src/menu/index.js';
import type { CollectionAction } from '../src/core/collection.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';
class Element implements MenuElement {
  className = ''; textContent: string | null = ''; hidden = false; disabled = false;
  open = false; width = 0; height = 0; children: Element[] = []; attributes = new Map<string, string>();
  callbacks: (() => void)[] = [];
  append(...children: unknown[]): void { this.children.push(...children as Element[]); }
  replaceChildren(...children: unknown[]): void { this.children = children as Element[]; }
  addEventListener(_type: string, callback: () => void): void { this.callbacks.push(callback); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getContext(): SpriteCanvas { return { fillStyle: '', fillRect() {} }; }
  click(): void { if (!this.disabled) this.callbacks.forEach(fn => fn()); }
  all(): Element[] { return [this, ...this.children.flatMap(child => child.all())]; }
  find(name: string): Element[] { return this.all().filter(el => el.className.split(' ').includes(name)); }
}
const doc: MenuDocument = { createElement: () => new Element(), querySelector: () => null };
describe('v10 equipment menu', () => {
  it('shows four distinct accessory copies, bounded bag pages and exact action revisions', () => {
    const equipment = newEquipment(); equipment.capacity = 64; equipment.revision = 7;
    equipment.loadout.accessories = Array.from({ length: 4 }, () => createEquipmentItem(equipment, 'a-ring-critical-common-1'));
    equipment.bag = Array.from({ length: 60 }, () => createEquipmentItem(equipment, 'w-sword-common-1'));
    const save = parseSave({ coins: '9007199254740993123456', equipment });
    const root = new Element(), sent: CollectionAction[] = [];
    const update = mountEquipment(doc, root, action => sent.push(action), 'inventory', () => 0);
    update(save);
    expect(root.find('equipment-card')).toHaveLength(4 + EQUIPMENT_PAGE_SIZE);
    expect(new Set(root.find('equipment-card').map(el => el.attributes.get('data-item-id'))).size).toBe(28);
    root.find('equipment-sell')[0]!.click();
    expect(sent).toEqual([{ type: 'equipmentSell', itemId: equipment.loadout.accessories[0]!.id, revision: 7 }]);
    const before = root.find('equipment-card')[0]; update(save);
    expect(root.find('equipment-card')[0]).toBe(before);
    root.find('equipment-pages').find(el => !el.hidden)!.children[1]!.click();
    expect(root.find('equipment-card')[4]!.attributes.get('data-item-id')).toBe(equipment.bag[24]!.id);
  });
  it('reveals rare main stat and requirement, hides only secondary until ownership, retains countdown', () => {
    const equipment = newEquipment();
    const item = createEquipmentItem(equipment, 'w-spear-rare-2'); equipment.shop.stock = [item];
    equipment.shop.nextRefreshAt = 3_600_000; equipment.shop.serial = 9;
    const root = new Element(), sent: CollectionAction[] = [];
    const update = mountEquipment(doc, root, a => sent.push(a), 'shop', () => 1000);
    update(parseSave({ level: 5, coins: '1000000', equipment }));
    expect(root.find('equipment-countdown')[0]!.textContent).toContain('59분 59초');
    expect(root.find('equipment-primary')[0]!.textContent).toContain('무기 공격');
    expect(root.find('equipment-requirement')[0]!.textContent).toContain('Lv.5');
    expect(root.find('equipment-bonus')[0]!.textContent).toContain('???');
    root.find('equipment-buy')[0]!.click();
    expect(sent[0]).toEqual({ type: 'equipmentBuy', itemId: item.id, shopSerial: 9, revision: equipment.revision });
    equipment.shop.stock = []; equipment.bag = [item]; equipment.revision++;
    update(parseSave({ level: 5, coins: '1000000', equipment }));
    expect(root.find('equipment-bonus')[0]!.textContent).not.toContain('???');
    expect(root.find('equipment-card')[0]!.attributes.get('style')).toContain('--rarity-color:');
  });
  it('retains live disclosure nodes and uses updated affordability and revision after wallet changes', () => {
    const equipment = newEquipment();
    equipment.bag = [createEquipmentItem(equipment, 'w-sword-common-1')];
    const root = new Element(), sent: CollectionAction[] = [];
    const update = mountEquipment(doc, root, action => sent.push(action), 'inventory', () => 0);
    update(parseSave({ coins: '0', equipment }));
    const details = root.find('equipment-details')[0]!, preview = root.find('equipment-enhance-preview')[0]!;
    details.open = true; preview.open = true;
    expect(root.find('equipment-enhance')[0]!.disabled).toBe(true);
    equipment.revision++;
    update(parseSave({ coins: '10000', level: 2, equipment }));
    expect(root.find('equipment-details')[0]).toBe(details);
    expect(root.find('equipment-enhance-preview')[0]).toBe(preview);
    expect(details.open && preview.open).toBe(true);
    root.find('equipment-enhance')[0]!.click();
    expect(sent).toEqual([{ type: 'equipmentEnhance', itemId: equipment.bag[0]!.id, revision: equipment.revision }]);
  });
  it('offers exact manual accessory replacement and retains it across a gold-only update', () => {
    const equipment = newEquipment();
    equipment.loadout.accessories = Array.from({ length: 4 }, () => createEquipmentItem(equipment, 'a-ring-critical-common-1'));
    const chosen = createEquipmentItem(equipment, 'a-ring-critical-common-1'); equipment.bag = [chosen];
    const root = new Element(), sent: CollectionAction[] = [];
    const update = mountEquipment(doc, root, action => sent.push(action), 'inventory', () => 0);
    update(parseSave({ equipment }));
    const card = root.find('equipment-card').find(el => el.attributes.get('data-item-id') === chosen.id)!;
    const choice = card.find('equipment-equip-choice')[0]!; choice.open = true;
    const button = card.find('equipment-replace')[2]!;
    update(parseSave({ coins: '9', equipment }));
    expect(card.find('equipment-replace')[2]).toBe(button);
    expect(choice.open).toBe(true);
    button.click();
    expect(sent).toEqual([{ type: 'equipmentEquip', itemId: chosen.id, replaceId: equipment.loadout.accessories[2]!.id, revision: equipment.revision }]);
  });
  it('never labels a positive high-stage chance as zero and exposes rational odds', () => {
    expect(successText(5n)).toBe('100%');
    expect(successText(6n)).toContain('/');
    expect(successText(10n ** 100n)).toContain('0.01% 미만');
    expect(successText(10n ** 100n)).not.toMatch(/^0%/);
  });
});
