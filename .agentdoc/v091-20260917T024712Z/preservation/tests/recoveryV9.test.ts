import { describe, expect, it } from 'vitest';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { RecoveryStore } from '../src/main/recovery.js';
import { DEFAULT_SAVE, parseSave } from '../src/core/save.js';
import type { SaveFile } from '../src/core/save.js';
import { heroReady, heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';

const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const legacyHero = (deferRemainingMs: number) => ({ ...newHeroProgress(), reincarnations: 1,
  restRemainingMs: 120000, deferRemainingMs, offerSerial: 9, offerLevel: heroRequiredLevel(1),
  choices: deferRemainingMs > 0 ? [] : [
    { formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 15 }, { formId: 'h03', buffPercent: 20 },
  ] });

type RecoveryIo = NonNullable<NonNullable<ConstructorParameters<typeof RecoveryStore>[2]>['io']>;
type Operation = 'read' | 'write' | 'rename' | 'unlink';
const initial = (): SaveFile => parseSave({ ...DEFAULT_SAVE, level: 40, coins: 137, nextCompanionId: 50 });

/** Only in-memory files; operation failures happen at exact injected boundaries. */
function disk(save = initial()) {
  const dir = '/isolated-desmon';
  const files = new Map<string, string>([
    [join(dir, 'save.json'), JSON.stringify(save)],
    [join(dir, 'identity.json'), '{"token":"test-identity"}'],
    [join(dir, 'settings.json'), '{"gameScale":1.5}'],
  ]);
  const directories = new Set([dir]);
  let failure: { operation: Operation; suffix: string } | null = null;
  let serial = 0, clock = 100;
  const check = (operation: Operation, path: string) => {
    if (failure?.operation === operation && path.endsWith(failure.suffix)) {
      failure = null;
      throw Object.assign(new Error(`injected ${operation} failure`), { code: 'EIO' });
    }
  };
  const missing = () => Object.assign(new Error('missing file'), { code: 'ENOENT' });
  const io = {
    readFileSync(path: string) { check('read', path); const value = files.get(path); if (value === undefined) throw missing(); return value; },
    writeFileSync(path: string, value: string) { check('write', path); files.set(path, value); },
    renameSync(from: string, target: string) {
      check('rename', target); const value = files.get(from); if (value === undefined) throw missing(); files.set(target, value); files.delete(from);
    },
    unlinkSync(path: string) { check('unlink', path); if (!files.delete(path)) throw missing(); },
    mkdirSync(path: string) { directories.add(path); },
    readdirSync(path: string) {
      if (!directories.has(path)) throw missing();
      return [...files.keys()].filter(key => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/')).map(key => basename(key));
    },
  } as unknown as RecoveryIo;
  const read = (name: string): unknown => JSON.parse(files.get(join(dir, name))!);
  return { files, dir, read,
    write: (name: string, value: unknown) => files.set(join(dir, name), JSON.stringify(value)),
    fail: (operation: Operation, suffix: string) => { failure = { operation, suffix }; },
    open: () => new RecoveryStore(dir, read('save.json') as SaveFile, { io, now: () => clock++, uuid: () => `op-${++serial}` }),
  };
}

describe('v0.9 durable reset checkpoints', () => {
  it.each([0, 30000])('restores a verified legacy checkpoint without rest, preserving a %i ms defer and valid offers', defer => {
    const d = disk(), store = d.open();
    const point = store.backup(initial(), 'reset');
    const path = `checkpoints/${point.id}.json`;
    const raw = d.read(path) as { save: SaveFile; hash: string };
    raw.save = { ...initial(), level: heroRequiredLevel(1), hero: legacyHero(defer) };
    raw.hash = hash(raw.save);
    d.write(path, raw);
    const original = d.files.get(join(d.dir, path));
    const restored = store.restoreCandidate(point.id);
    expect(restored.hero).not.toHaveProperty('restRemainingMs');
    expect(restored.hero).toMatchObject({ choices: legacyHero(defer).choices, offerSerial: 9, deferRemainingMs: defer });
    expect(heroReady(restored.level, restored.hero)).toBe(defer === 0);
    store.commit(restored);
    d.open();
    expect(parseSave(d.read('save.json')).hero).toEqual(restored.hero);
    expect(d.read('save.json')).not.toHaveProperty('hero.restRemainingMs');
    expect(d.files.get(join(d.dir, path))).toBe(original);
    // The original legacy bytes are authenticated before normalization; changing
    // even an ignored rest value without updating its hash must be rejected.
    const tamperedHero = { ...legacyHero(defer), restRemainingMs: 119999 };
    raw.save.hero = tamperedHero;
    d.write(path, raw);
    expect(() => store.restoreCandidate(point.id)).toThrow('damaged');
  });

  it.each(['write', 'rename', 'read'] as const)('keeps progress/identity/settings intact when checkpoint %s fails', operation => {
    const d = disk(), store = d.open();
    const before = d.read('save.json');
    d.fail(operation, operation === 'write' ? 'checkpoints/op-1.json.tmp' : 'checkpoints/op-1.json');
    expect(() => store.backup(initial(), 'reset')).toThrow('injected');
    expect(d.read('save.json')).toEqual(before);
    expect(d.read('identity.json')).toEqual({ token: 'test-identity' });
    expect(d.read('settings.json')).toEqual({ gameScale: 1.5 });
    expect(d.files.has(join(d.dir, 'operation.json'))).toBe(false);
  });

  it('retains the latest five verified checkpoints without age expiry and preserves corrupt evidence', () => {
    const d = disk(), store = d.open();
    const ids = Array.from({ length: 7 }, (_, index) => store.backup({ ...initial(), level: index + 1 }, 'reset').id);
    const corrupted = d.read(`checkpoints/${ids[1]}.json`) as { save: SaveFile };
    corrupted.save.coins++;
    d.write(`checkpoints/${ids[1]}.json`, corrupted);
    expect(store.list().map(row => row.id)).toEqual(ids.slice(2).reverse());
    store.prune();
    expect(d.files.has(join(d.dir, `checkpoints/${ids[0]}.json`))).toBe(false);
    expect(d.files.has(join(d.dir, `checkpoints/${ids[1]}.json`))).toBe(true);
    expect(d.open().list().map(row => row.id)).toEqual(ids.slice(2).reverse());
    // No TTL: the oldest remaining checkpoint still restores at any later launch.
    expect(d.open().restoreCandidate(ids[2]!)).toMatchObject({ level: 3 });
  });

  it('rejects changed checkpoint contents and unsafe identifiers without changing the current save', () => {
    const d = disk(), store = d.open();
    const point = store.backup(initial(), 'reset');
    const raw = d.read(`checkpoints/${point.id}.json`) as { save: SaveFile };
    raw.save.coins = 999;
    d.write(`checkpoints/${point.id}.json`, raw);
    expect(() => store.restoreCandidate(point.id)).toThrow('damaged');
    for (const id of ['../save', 'a/b', '', 'x'.repeat(65)]) expect(() => store.restoreCandidate(id)).toThrow('Invalid checkpoint id');
    expect(store.list()).toEqual([]);
    expect(d.read('save.json')).toEqual(initial());
  });

  it('restores the selected progression quota with non-rewinding IDs and backs up the replaced progress', () => {
    const d = disk(), store = d.open();
    const point = store.backup(parseSave({ ...DEFAULT_SAVE, nextCompanionId: 3, level: 7 }), 'reset');
    store.observe({ ...initial(), nextCompanionId: 1000 });
    const candidate = store.restoreCandidate(point.id);
    expect(candidate).toMatchObject({ level: 7, earlyCaptureUsed: 2, nextCompanionId: 1000 });
    const beforeRestore = store.backup(initial(), 'restore');
    store.commit(candidate, { reconcilePending: true });
    expect(d.read('save.json')).toEqual(candidate);
    expect(d.open().state).toMatchObject({ highWater: 1000, reconcilePending: true });
    expect(d.open().restoreCandidate(beforeRestore.id)).toMatchObject({ level: 40, coins: 137, nextCompanionId: 1000, earlyCaptureUsed: 5 });
    expect(d.read('identity.json')).toEqual({ token: 'test-identity' });
    expect(d.read('settings.json')).toEqual({ gameScale: 1.5 });
  });
});

describe('v0.9 save and metadata commit journal', () => {
  it('replays an authenticated legacy journal and normalizes rest on the subsequent load', () => {
    const d = disk(), store = d.open();
    d.fail('write', 'save.json.tmp');
    expect(() => store.commit(initial())).toThrow('injected');
    const operation = d.read('operation.json') as { id: string; save: SaveFile; metadata: unknown; hash: string };
    operation.save = { ...initial(), level: heroRequiredLevel(1), hero: legacyHero(0) };
    operation.hash = hash({ id: operation.id, save: operation.save, metadata: operation.metadata });
    d.write('operation.json', operation);
    const reopened = d.open();
    const loaded = parseSave(d.read('save.json'));
    expect(reopened.unfinished).toBe(false);
    expect(loaded.hero).not.toHaveProperty('restRemainingMs');
    expect(loaded.hero).toMatchObject({ choices: legacyHero(0).choices, offerSerial: 9 });
    expect(heroReady(loaded.level, loaded.hero)).toBe(true);
    reopened.commit(loaded);
    expect(d.read('save.json')).not.toHaveProperty('hero.restRemainingMs');
  });

  it.each([{ highWater: 0 }, { reconcilePending: 'yes' }])('refuses corrupted operation metadata %j before replacing valid progress', corruption => {
    const d = disk(), store = d.open();
    d.fail('write', 'save.json.tmp');
    expect(() => store.commit({ ...initial(), level: 1 })).toThrow('injected');
    const operation = d.read('operation.json') as { metadata: Record<string, unknown> };
    operation.metadata = { ...operation.metadata, ...corruption };
    d.write('operation.json', operation);
    expect(() => d.open()).toThrow('Invalid unfinished operation');
    expect(d.read('save.json')).toEqual(initial());
    expect(d.files.has(join(d.dir, 'operation.json'))).toBe(true);
  });

  it.each(['write', 'rename'] as const)('keeps an uncommitted journal %s failure from changing progress', operation => {
    const d = disk(), store = d.open();
    d.fail(operation, operation === 'write' ? 'operation.json.tmp' : 'operation.json');
    expect(() => store.commit({ ...initial(), level: 1, earlyCaptureUsed: 0 })).toThrow('injected');
    expect(d.read('save.json')).toEqual(initial());
    const reopened = d.open();
    expect(reopened.unfinished).toBe(false);
    expect(d.read('save.json')).toEqual(initial());
  });

  it.each([
    ['write', 'save.json.tmp'], ['rename', 'save.json'],
    ['write', 'recovery.json.tmp'], ['rename', 'recovery.json'],
  ] as const)('replays interrupted %s %s on reopen and commits matching metadata exactly once', (operation, suffix) => {
    const d = disk(), store = d.open();
    const next = parseSave({ ...initial(), level: 1, coins: 0, earlyCaptureUsed: 0 });
    d.fail(operation, suffix);
    expect(() => store.commit(next, { reconcilePending: true, pendingReclaim: 't7' })).toThrow('injected');
    expect(store.unfinished).toBe(true);
    const op = d.read('operation.json') as { id: string };
    const reopened = d.open();
    expect(d.read('save.json')).toEqual(next);
    expect(reopened.state).toMatchObject({ committedOperationId: op.id, reconcilePending: true, pendingReclaim: 't7', highWater: 50 });
    expect(reopened.unfinished).toBe(false);
    expect(d.files.has(join(d.dir, 'operation.json'))).toBe(false);
    expect(d.open().state).toEqual(reopened.state);
  });

  it('does not rewind later saved gameplay when committed journal cleanup failed', () => {
    const d = disk(), store = d.open();
    d.fail('unlink', 'operation.json');
    store.commit({ ...initial(), level: 1, earlyCaptureUsed: 0 });
    expect(store.unfinished).toBe(false);
    expect(d.files.has(join(d.dir, 'operation.json'))).toBe(true);
    const later = parseSave({ ...initial(), level: 12, coins: 999, nextCompanionId: 60 });
    d.write('save.json', later);
    const reopened = d.open();
    expect(d.read('save.json')).toEqual(later);
    expect(reopened.state.highWater).toBe(60);
    expect(d.files.has(join(d.dir, 'operation.json'))).toBe(false);
  });
});
