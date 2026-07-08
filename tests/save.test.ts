import { describe, expect, it } from 'vitest';
import {
  createEngine,
  DEFAULT_SAVE,
  monsterMaxHp,
  mulberry32,
  parseSave,
  serializeSave,
} from '../src/core/index.js';
import type { SaveFileV1 } from '../src/core/index.js';

const richSave: SaveFileV1 = {
  version: 1,
  level: 7,
  xp: 13,
  killCount: 42,
  coins: 99,
  items: { sword_shard: 3, crown: 1, bone: 2 },
  monsterIndex: 21,
  monsterHp: 77,
};

describe('save schema & tolerant parsing (SPEC F10/F11, Assumption 7)', () => {
  it('DEFAULT_SAVE is a fresh-game v1 save', () => {
    expect(DEFAULT_SAVE.version).toBe(1);
    expect(DEFAULT_SAVE.level).toBe(1);
    expect(DEFAULT_SAVE.xp).toBe(0);
    expect(DEFAULT_SAVE.killCount).toBe(0);
    expect(DEFAULT_SAVE.coins).toBe(0);
    expect(DEFAULT_SAVE.items).toEqual({});
    expect(DEFAULT_SAVE.monsterIndex).toBe(0);
    expect(DEFAULT_SAVE.monsterHp).toBe(monsterMaxHp(0));
  });

  it('serialize then parse round-trips losslessly', () => {
    expect(parseSave(serializeSave(richSave))).toEqual(richSave);
    expect(parseSave(serializeSave({ ...DEFAULT_SAVE }))).toEqual(DEFAULT_SAVE);

    // Engine-produced saves round-trip too (the real persistence path).
    const engine = createEngine(null, mulberry32(1234));
    for (let i = 0; i < 200; i++) {
      engine.attack(i % 4 === 0 ? 'mouse' : 'keyboard');
    }
    const save = engine.toSave();
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it('serializeSave is stable: items insertion order never changes the bytes', () => {
    const a: SaveFileV1 = { ...richSave, items: { crown: 1, bone: 2, sword_shard: 3 } };
    const b: SaveFileV1 = { ...richSave, items: { sword_shard: 3, bone: 2, crown: 1 } };
    expect(serializeSave(a)).toBe(serializeSave(b));
    expect(serializeSave(a)).toBe(serializeSave(parseSave(serializeSave(a))));
  });

  it('junk, missing and wrong-typed fields yield DEFAULT_SAVE values', () => {
    // Wholesale junk → every field defaults.
    for (const junk of [
      null,
      undefined,
      42,
      true,
      'not json at all',
      '[1,2,3]',
      '"a json string"',
      [1, 2, 3],
      () => 0,
    ]) {
      expect(parseSave(junk)).toEqual(DEFAULT_SAVE);
    }

    // The classic wrong-typed-field case, as raw JSON text.
    expect(parseSave('{"level":"x"}')).toEqual(DEFAULT_SAVE);

    // Per-field independence: valid fields survive, invalid ones default.
    const mixed = parseSave({
      version: 99,
      level: 'x',
      xp: 7,
      coins: null,
      items: 'nope',
      monsterIndex: 3,
      monsterHp: Number.NaN,
    });
    expect(mixed).toEqual({
      version: 1,
      level: DEFAULT_SAVE.level,
      xp: 7,
      killCount: DEFAULT_SAVE.killCount, // missing
      coins: DEFAULT_SAVE.coins,
      items: {},
      monsterIndex: 3,
      monsterHp: DEFAULT_SAVE.monsterHp,
    });
  });

  it('parseSave never throws, whatever it is fed', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const horrors: unknown[] = [
      cyclic,
      { items: cyclic },
      Symbol('save'),
      10n,
      '{"level":',
      '',
      { level: Infinity, xp: -Infinity, monsterHp: 10n },
      new Date(),
    ];
    for (const raw of horrors) {
      expect(() => parseSave(raw)).not.toThrow();
      const parsed = parseSave(raw);
      expect(parsed.version).toBe(1);
      expect(Number.isInteger(parsed.level)).toBe(true);
    }
  });

  it('numeric fields are floored and clamped to their minimums', () => {
    const parsed = parseSave({
      level: 3.9,
      xp: -5,
      killCount: 2.2,
      coins: -0.5,
      monsterIndex: -7,
      monsterHp: 0,
    });
    expect(parsed.level).toBe(3);
    expect(parsed.xp).toBe(0);
    expect(parsed.killCount).toBe(2);
    expect(parsed.coins).toBe(0);
    expect(parsed.monsterIndex).toBe(0);
    expect(parsed.monsterHp).toBe(1); // range vs maxHp is the engine's clamp
  });

  it('items keep only entries with finite counts that floor to at least 1', () => {
    const parsed = parseSave({
      items: {
        bone: 2,
        gem: 2.5,
        crown: 0,
        slime_gel: -1,
        sword_shard: 'three',
        weird: Infinity,
      },
    });
    expect(parsed.items).toEqual({ bone: 2, gem: 2 });
  });

  it('parseSave returns fresh objects — mutating the result never leaks', () => {
    const a = parseSave(null);
    const b = parseSave(null);
    expect(a).not.toBe(b);
    expect(a.items).not.toBe(b.items);
    a.items['crown'] = 999;
    a.level = 999;
    expect(parseSave(null)).toEqual(DEFAULT_SAVE);
    expect(DEFAULT_SAVE.level).toBe(1);
    expect(DEFAULT_SAVE.items).toEqual({});
  });

  it('a bad save still boots the engine at fresh-game state', () => {
    const engine = createEngine(parseSave('total garbage'), mulberry32(7));
    const s = engine.getState();
    expect(s.level).toBe(1);
    expect(s.monster.index).toBe(0);
    expect(s.monsterHp).toBe(monsterMaxHp(0));
  });
});
