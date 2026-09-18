import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RecoveryStore } from '../src/main/recovery.js';
import { readSaveFileResult, writeSaveFile } from '../src/main/persistence.js';
import { createEngine, parseSave } from '../src/core/index.js';
import { createEquipmentItem, equipmentItems, equipmentTemplate, newEquipment } from '../src/core/equipment.js';
const folders: string[] = [];
afterEach(() => { for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true }); });
const directory = (): string => { const dir = fs.mkdtempSync(join(tmpdir(), 'desmon-v10-recovery-')); folders.push(dir); return dir; };
const read = (dir: string, name = 'save.json'): unknown => JSON.parse(fs.readFileSync(join(dir, name), 'utf8'));
describe('v10 atomic equipment and unbounded wallet recovery', () => {
  it.each(['save.json', 'recovery.json'])('recovers purchase/auto equip/huge money together after %s rename failure', target => {
    const dir = directory(), equipment = newEquipment();
    const item = createEquipmentItem(equipment, 'w-sword-common-1'); equipment.shop.stock = [item]; equipment.shop.serial = 1; equipment.shop.nextRefreshAt = 3_600_000;
    const initial = parseSave({ coins: '1000000000000000000000000000000000000', equipment });
    expect(writeSaveFile(dir, initial)).toBe(true);
    let fail = true;
    const store = new RecoveryStore(dir, initial, { io: { ...fs, renameSync(from, to) {
      if (String(to).endsWith('/' + target) && fail) { fail = false; throw Error('injected rename'); }
      fs.renameSync(from, to);
    } } });
    const engine = createEngine(initial);
    engine.apply({ type: 'equipmentBuy', itemId: item.id, shopSerial: 1, revision: equipment.revision });
    const purchased = engine.toSave();
    expect(BigInt(purchased.coins)).toBe(BigInt(initial.coins) - BigInt(equipmentTemplate(item.templateId)!.price));
    expect(purchased.equipment?.loadout.weapon?.id).toBe(item.id);
    expect(() => store.commit(purchased)).toThrow('injected rename');
    new RecoveryStore(dir, initial);
    expect(read(dir)).toEqual(purchased);
    const reloaded = createEngine(parseSave(read(dir))).toSave();
    expect(equipmentItems(reloaded.equipment!).filter(copy => copy.id === item.id)).toHaveLength(1);
    expect(reloaded.coins).toBe(purchased.coins);
    new RecoveryStore(dir, reloaded);
    expect(read(dir)).toEqual(purchased);
  });
  it('authenticates old numeric backup bytes before exact v4 migration and preserves the original', () => {
    const dir = directory(), initial = parseSave(null), store = new RecoveryStore(dir, initial, { uuid: () => 'legacy' });
    const point = store.backup(initial, 'restore');
    const old = { ...initial, version: 3, coins: Number.MAX_SAFE_INTEGER };
    const hash = createHash('sha256').update(JSON.stringify(old)).digest('hex');
    const path = join(dir, 'checkpoints', point.id + '.json');
    fs.writeFileSync(path, JSON.stringify({ version: 1, id: point.id, at: 0, reason: 'restore', save: old, hash }));
    const before = fs.readFileSync(path, 'utf8');
    expect(store.restoreCandidate(point.id)).toMatchObject({ version: 4, coins: '9007199254740991' });
    expect(fs.readFileSync(path, 'utf8')).toBe(before);
    fs.writeFileSync(path, before.replace('9007199254740991', '9007199254740990'));
    expect(() => store.restoreCandidate(point.id)).toThrow('damaged');
  });
  it('recognizes v4 on disk and refuses rounded legacy or malformed decimal currency without overwriting bytes', () => {
    const dir = directory();
    for (const coins of [Number.MAX_SAFE_INTEGER + 1, '01', '-1', '1e10']) {
      const raw = { version: 3, coins };
      expect(writeSaveFile(dir, raw)).toBe(true);
      expect(() => parseSave(read(dir))).toThrow();
      expect(read(dir)).toEqual(raw);
    }
    const save = parseSave({ coins: '9'.repeat(1000) });
    expect(writeSaveFile(dir, save)).toBe(true);
    expect(readSaveFileResult(dir)).toEqual({ kind: 'loaded', value: save });
  });
});
