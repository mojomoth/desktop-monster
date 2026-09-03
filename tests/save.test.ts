import { describe, expect, it } from 'vitest';
import {
  createEngine,
  DEFAULT_SAVE,
  monsterMaxHp,
  mulberry32,
  parseSave,
  serializeSave,
  upgradeSave,
} from '../src/core/index.js';
import type { Companion, SaveFile, SaveFileV1, SaveFileV2 } from '../src/core/index.js';

const richSave: SaveFile = {
  version: 3,
  level: 7,
  xp: 13,
  killCount: 42,
  coins: 99,
  items: { sword_shard: 3, crown: 1, bone: 2 },
  monsterIndex: 21,
  monsterHp: '77',
  companions: [
    { id: 'c1', speciesId: 'slime', bossIndex: 7, level: 3, stars: 1 },
    { id: 'c2', speciesId: 'dragon', bossIndex: 15, level: 10, stars: 0 },
  ],
  nextCompanionId: 3,
  souls: 5,
  rebirths: 2,
  bestIndex: 40,
  pvpParty: ['c2'],
};

describe('save schema & tolerant parsing (SPEC F10/F11, Assumption 7)', () => {
  it('DEFAULT_SAVE is a fresh-game v2 save', () => {
    expect(DEFAULT_SAVE.version).toBe(3);
    expect(DEFAULT_SAVE.level).toBe(1);
    expect(DEFAULT_SAVE.xp).toBe(0);
    expect(DEFAULT_SAVE.killCount).toBe(0);
    expect(DEFAULT_SAVE.coins).toBe(0);
    expect(DEFAULT_SAVE.items).toEqual({});
    expect(DEFAULT_SAVE.monsterIndex).toBe(0);
    expect(DEFAULT_SAVE.monsterHp).toBe(String(monsterMaxHp(0)));
    expect(DEFAULT_SAVE.companions).toEqual([]);
    expect(DEFAULT_SAVE.nextCompanionId).toBe(1);
    expect(DEFAULT_SAVE.souls).toBe(0);
    expect(DEFAULT_SAVE.rebirths).toBe(0);
    expect(DEFAULT_SAVE.bestIndex).toBe(0);
    expect(DEFAULT_SAVE.pvpParty).toEqual([]);
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
    const a: SaveFile = { ...richSave, items: { crown: 1, bone: 2, sword_shard: 3 } };
    const b: SaveFile = { ...richSave, items: { sword_shard: 3, bone: 2, crown: 1 } };
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
      ...DEFAULT_SAVE,
      version: 3,
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
      expect(parsed.version).toBe(3);
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
    expect(parsed.monsterHp).toBe('1'); // range vs maxHp is the engine's clamp
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

  it('migrates a v1 save: numeric monsterHp becomes a digit string and companions default to empty', () => {
    const v1: SaveFileV1 = {
      version: 1,
      level: 7,
      xp: 13,
      killCount: 42,
      coins: 99,
      items: { bone: 2 },
      monsterIndex: 21,
      monsterHp: 77.9,
    };
    expect(upgradeSave(v1)).toEqual({
      version: 3,
      level: 7,
      xp: 13,
      killCount: 42,
      coins: 99,
      items: { bone: 2 },
      monsterIndex: 21,
      monsterHp: '77',
      companions: [],
      nextCompanionId: 1,
      souls: 0,
      rebirths: 0,
      bestIndex: 21, // v1 never tracked depth: the current monster is the best
      pvpParty: [],
    });
    // A dead-on-arrival v1 hp still resumes at 1, and v3 passes straight through.
    expect(upgradeSave({ ...v1, monsterHp: 0 }).monsterHp).toBe('1');
    expect(upgradeSave(richSave)).toEqual(richSave);
    // Both shapes serialize to the same v3 bytes, and parse back to v3.
    expect(serializeSave(v1)).toBe(serializeSave(upgradeSave(v1)));
    expect(parseSave(serializeSave(v1))).toEqual(upgradeSave(v1));
  });

  it('migrates a v2 save: pvpParty defaults to empty', () => {
    // The v2 shape has no party at all — the field is the v3 addition.
    const { pvpParty, ...v2 } = { ...richSave, version: 2 as const };
    expect(pvpParty).toEqual(['c2']);
    const migrated: SaveFileV2 = v2;
    expect(upgradeSave(migrated)).toEqual({ ...richSave, pvpParty: [] });
    // v2 bytes on disk come back as a v3 save with an empty party.
    expect(parseSave(serializeSave(migrated))).toEqual({ ...richSave, pvpParty: [] });
  });

  it('pvpParty keeps only ids present in the roster, deduped and capped at 5', () => {
    const companions: Companion[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i + 1}`,
      speciesId: 'bat',
      bossIndex: 7,
      level: 1,
      stars: 0,
    }));
    const parsed = parseSave({
      companions,
      pvpParty: ['c1', 'c1', 'c99', 7, null, 'c2', 'c3', 'c4', 'c5', 'c6'],
    });
    expect(parsed.pvpParty).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(parseSave({ companions, pvpParty: 'c1' }).pvpParty).toEqual([]);
    expect(parseSave({ pvpParty: ['c1'] }).pvpParty).toEqual([]); // nothing on the roster
    expect(parseSave(serializeSave(parsed))).toEqual(parsed);
  });

  it('invalid companion entries are dropped, valid ones kept, roster capped at 30', () => {
    const good: Companion = { id: 'c4', speciesId: 'bat', bossIndex: 15, level: 2, stars: 1 };
    const parsed = parseSave({
      companions: [
        good,
        { id: '', speciesId: 'bat', bossIndex: 0, level: 1, stars: 0 }, // empty id
        { id: 'c5', speciesId: 'wyrm', bossIndex: 0, level: 1, stars: 0 }, // unknown species
        { id: 'c6', speciesId: 'bat', bossIndex: -1, level: 1, stars: 0 }, // bossIndex < 0
        { id: 'c7', speciesId: 'bat', bossIndex: 1.5, level: 1, stars: 0 }, // not an integer
        { id: 'c8', speciesId: 'bat', bossIndex: 0, level: 11, stars: 0 }, // level > 10
        { id: 'c9', speciesId: 'bat', bossIndex: 0, level: 0, stars: 0 }, // level < 1
        { id: 'c10', speciesId: 'bat', bossIndex: 0, level: 1, stars: -1 }, // stars < 0
        { id: 'c11', speciesId: 'bat', bossIndex: 0, level: 1 }, // missing stars
        { ...good, level: 9 }, // duplicate id → first wins
        'nope',
        null,
        42,
      ],
    });
    expect(parsed.companions).toEqual([good]);
    // nextCompanionId is raised above every id on the roster.
    expect(parsed.nextCompanionId).toBe(5);
    expect(parseSave({ companions: 'nope' }).companions).toEqual([]);

    const many = Array.from({ length: 42 }, (_, i) => ({ ...good, id: `c${i + 1}` }));
    const capped = parseSave({ companions: many, nextCompanionId: 99 });
    expect(capped.companions).toHaveLength(30);
    expect(capped.companions[29]?.id).toBe('c30');
    expect(capped.nextCompanionId).toBe(99); // an explicit higher value wins
    expect(parseSave({ companions: many }).nextCompanionId).toBe(31); // 1 + max kept id
    expect(parseSave(serializeSave(capped))).toEqual(capped);
  });
});
