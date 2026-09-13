import { describe, expect, it } from 'vitest';
import {
  applyCollection, companionPower, companionReincarnationPreview, createEngine, DEFAULT_SAVE,
  isCompanionSnapshot, mulberry32, parseSave, serializeSave,
} from '../src/core/index.js';
import type { Companion, CollectionAction, GameState } from '../src/core/index.js';

const max = Number.MAX_SAFE_INTEGER;
const companion = (id: string, level = 10, stars = 0): Companion =>
  ({ id, speciesId: 'bat', bossIndex: 7, level, stars });
const stateWith = (companions: Companion[]): GameState =>
  createEngine({ ...DEFAULT_SAVE, companions, nextCompanionId: companions.length + 1 }, mulberry32(7)).getState();
const success = (state: GameState, action: CollectionAction): GameState => {
  const result = applyCollection(state, action);
  if ('error' in result) throw new Error(result.error);
  return result.state;
};

describe('v0.7 companion growth and save compatibility', () => {
  it.each([11, 250, max])('round trips Lv%s through JSON, engine save and restart without truncation', level => {
    const c = companion('c1', level);
    const save = parseSave({ ...DEFAULT_SAVE, companions: [c] });
    expect(save.companions).toEqual([c]);
    const engine = createEngine(parseSave(serializeSave(save)), mulberry32(9));
    expect(engine.getState().companions).toEqual([c]);
    const restarted = createEngine(parseSave(serializeSave(engine.toSave())), mulberry32(9));
    expect(restarted.getState().companions).toEqual([c]);
    expect(companionPower(c)).toBe(BigInt(level));
  });

  it.each([0, -1, 1.5, max + 1, Infinity, NaN, '250'])('rejects invalid saved level %s', level => {
    expect(parseSave({ companions: [{ ...companion('c1'), level }] }).companions).toEqual([]);
  });

  it('consumes beyond Lv10 and permits the exact safe-integer boundary', () => {
    const state = stateWith([companion('c1', 250), companion('c2', 1, 3)]);
    expect(success(state, { type: 'consume', targetId: 'c1', foodId: 'c2' }).companions)
      .toEqual([companion('c1', 254)]);
    const boundary = stateWith([companion('c1', max - 1), companion('c2', 1)]);
    expect(success(boundary, { type: 'consume', targetId: 'c1', foodId: 'c2' }).companions)
      .toEqual([companion('c1', max)]);
  });

  it('rejects overflowing level or stars before consuming any companion', () => {
    const cases: [Companion[], CollectionAction][] = [
      [[companion('c1', max), companion('c2', 1)], { type: 'consume', targetId: 'c1', foodId: 'c2' }],
      [[companion('c1', 10), companion('c2', 1, max)], { type: 'consume', targetId: 'c1', foodId: 'c2' }],
      [[companion('c1', 10, max), companion('c2', 10, max)], { type: 'fuse', aId: 'c1', bId: 'c2' }],
      [[companion('c1', 10, max)], { type: 'reincarnate', id: 'c1' }],
    ];
    for (const [companions, action] of cases) {
      const state = stateWith(companions), before = structuredClone(state);
      expect(applyCollection(state, action)).toHaveProperty('error');
      expect(state).toEqual(before);
    }
    // Overflow is rejected before attempting an enormous bigint exponent.
    expect(companionReincarnationPreview(companion('c1', 10, max))).toBeNull();
  });

  it.each([10, 11, 250, max])('reincarnates Lv%s to Lv1/stars+1 with exact before/after power', level => {
    const c = companion('c1', level, 2), preview = companionReincarnationPreview(c);
    expect(preview).toEqual({ level: 1, stars: 3, beforePower: BigInt(level) * 4n, afterPower: 8n });
    const state = success(stateWith([c]), { type: 'reincarnate', id: c.id, expected: c });
    expect(state.companions).toEqual([companion('c1', 1, 3)]);
    expect(companionPower(state.companions[0]!) * BigInt(level)).toBe(companionPower(c) * 2n);
  });

  it('rejects Lv9 and stale, malformed, missing-target or reused confirmations without mutation', () => {
    expect(companionReincarnationPreview(companion('c1', 9))).toBeNull();
    expect(applyCollection(stateWith([companion('c1', 9)]), { type: 'reincarnate', id: 'c1' })).toHaveProperty('error');
    const original = companion('c1', 10, 2);
    for (const patch of [{ id: 'c9' }, { speciesId: 'slime' }, { bossIndex: 15 }, { level: 11 }, { stars: 3 }]) {
      const changed = stateWith([{ ...original, ...patch }]), before = structuredClone(changed);
      expect(applyCollection(changed, { type: 'reincarnate', id: 'c1', expected: original })).toHaveProperty('error');
      expect(changed).toEqual(before);
    }
    const absent = stateWith([]);
    expect(applyCollection(absent, { type: 'reincarnate', id: 'c1', expected: original })).toHaveProperty('error');
    const action: CollectionAction = { type: 'reincarnate', id: 'c1', expected: original };
    const once = success(stateWith([original]), action), before = structuredClone(once);
    expect(applyCollection(once, action)).toHaveProperty('error');
    expect(once).toEqual(before);
  });

  it('validates confirmation snapshots at the trust boundary', () => {
    expect(isCompanionSnapshot(companion('c1', max))).toBe(true);
    for (const value of [null, {}, { ...companion('c1'), level: max + 1 },
      { ...companion('c1'), level: 0 }, { ...companion('c1'), stars: -1 },
      { ...companion('c1'), stars: 1.5 }, { ...companion('c1'), bossIndex: -1 },
      { ...companion('c1'), speciesId: '' }]) {
      expect(isCompanionSnapshot(value)).toBe(false);
      const state = stateWith([companion('c1')]), before = structuredClone(state);
      expect(applyCollection(state, { type: 'reincarnate', id: 'c1', expected: value } as CollectionAction)).toHaveProperty('error');
      expect(state).toEqual(before);
    }
  });

  it('preserves a sacrificed companion when the soul reward would overflow', () => {
    const state = { ...stateWith([companion('c1', 250)]), souls: max };
    const before = structuredClone(state);
    expect(applyCollection(state, { type: 'sacrifice', id: 'c1' })).toHaveProperty('error');
    expect(state).toEqual(before);
    const boundary = success({ ...state, souls: max - 1 }, { type: 'sacrifice', id: 'c1' });
    expect(boundary.souls).toBe(max);
    expect(boundary.companions).toEqual([]);
  });

  it('preserves server transfer IDs and rejects duplicate or conflicting delivery without any removal', () => {
    for (const id of ['s7', 'r0123abcd']) {
      const incoming = companion(id, 250);
      const base = stateWith([companion('c1')]);
      const action: CollectionAction = id.startsWith('s')
        ? { type: 'pvpResult', won: true, stolen: incoming, lostId: null }
        : { type: 'addCompanion', companion: incoming };
      const received = success(base, action), before = structuredClone(received);
      expect(received.companions).toEqual([companion('c1'), incoming]);
      expect(applyCollection(received, action)).toHaveProperty('error');
      expect(applyCollection(received, { type: 'pvpResult', won: true,
        stolen: { ...incoming, level: 251 }, lostId: 'c1' })).toHaveProperty('error');
      expect(received).toEqual(before);
    }
    // Internal legacy callers with local IDs retain collision-free local minting.
    const base = stateWith([companion('c1')]);
    expect(success(base, { type: 'addCompanion', companion: companion('c1', 250) }).companions)
      .toEqual([companion('c1'), companion('c2', 250)]);
  });
});


describe('v0.7 companion allocator exhaustion', () => {
  it('repairs every ID digit sequence without changing any ID or producing an unsafe counter', () => {
    const ids = ['r9007199254740992', `c${'9'.repeat(400)}`];
    for (const id of ids) {
      const original = companion(id, 250);
      const save = parseSave({ ...DEFAULT_SAVE, companions: [original], nextCompanionId: 1 });
      expect(save.nextCompanionId).toBe(max);
      expect(save.companions).toEqual([original]);
      const engine = createEngine(parseSave(serializeSave(save)), mulberry32(9));
      const restarted = parseSave(serializeSave(engine.toSave()));
      expect(restarted.nextCompanionId).toBe(max);
      expect(restarted.companions).toEqual([original]);
    }
    // s/r IDs still participate in the existing all-digit repair rule.
    expect(parseSave({ companions: [companion('s12a3')] }).nextCompanionId).toBe(124);
    for (const counter of [max, max + 1, Number.MAX_VALUE, Infinity]) {
      expect(parseSave({ nextCompanionId: counter }).nextCompanionId).toBe(max);
    }
    const numericOverflow = parseSave('{"nextCompanionId":1e400}');
    expect(numericOverflow.nextCompanionId).toBe(max);
    expect(parseSave(serializeSave(numericOverflow)).nextCompanionId).toBe(max);
  });

  it('allocates the last unique local ID at MAX-1 and retains the exhausted sentinel after restart', () => {
    const incoming = companion('legacy', 250);
    const actions: CollectionAction[] = [
      { type: 'addCompanion', companion: incoming },
      { type: 'pvpResult', won: true, stolen: incoming, lostId: 'c1' },
    ];
    for (const action of actions) {
      const base = { ...stateWith([companion('c1')]), nextCompanionId: max - 1 };
      const received = success(base, action);
      expect(received.nextCompanionId).toBe(max);
      expect(received.companions).toContainEqual(companion(`c${max - 1}`, 250));
      expect(new Set(received.companions.map(c => c.id)).size).toBe(received.companions.length);
      const save = parseSave({ ...DEFAULT_SAVE, companions: received.companions,
        nextCompanionId: received.nextCompanionId });
      const engine = createEngine(parseSave(serializeSave(save)), mulberry32(9));
      expect(engine.getState().nextCompanionId).toBe(max);
      expect(engine.getState().companions).toEqual(received.companions);
      const before = structuredClone(received);
      expect(applyCollection(received, { type: 'addCompanion', companion: incoming })).toHaveProperty('error');
      expect(received).toEqual(before);
    }
  });

  it.each([0, -1, 1.5, max, max + 1, Infinity, NaN])(
    'rejects local allocation at counter %s before applying a PvP loss', nextCompanionId => {
      const state = { ...stateWith([companion('c1'), companion('c2')]),
        nextCompanionId, items: { gem: 7 }, souls: 9 };
      const before = structuredClone(state);
      const incoming = companion('legacy', 250);
      expect(applyCollection(state, { type: 'addCompanion', companion: incoming })).toHaveProperty('error');
      expect(applyCollection(state, { type: 'pvpResult', won: true,
        stolen: incoming, lostId: 'c1' })).toHaveProperty('error');
      expect(state).toEqual(before);
    },
  );

  it.each([1, 2])('rejects duplicate local c%s against the original roster before removing lostId', nextCompanionId => {
    const state = { ...stateWith([companion('c1'), companion('c2')]),
      nextCompanionId, items: { gem: 7 }, souls: 9 };
    const before = structuredClone(state), incoming = companion('legacy', 250);
    expect(applyCollection(state, { type: 'addCompanion', companion: incoming })).toHaveProperty('error');
    expect(applyCollection(state, { type: 'pvpResult', won: true,
      stolen: incoming, lostId: 'c1' })).toHaveProperty('error');
    expect(state).toEqual(before);
  });

  it.each(['r9007199254740992', 's9007199254740992'])(
    'accepts external %s at exhaustion and preserves its ID through save and restart', id => {
      const incoming = companion(id, 250);
      const base = { ...stateWith([companion('c1')]), nextCompanionId: max };
      const action: CollectionAction = id.startsWith('r')
        ? { type: 'addCompanion', companion: incoming }
        : { type: 'pvpResult', won: true, stolen: incoming, lostId: null };
      const received = success(base, action);
      expect(received.nextCompanionId).toBe(max);
      expect(received.companions).toEqual([companion('c1'), incoming]);
      const save = parseSave({ ...DEFAULT_SAVE, companions: received.companions,
        nextCompanionId: received.nextCompanionId });
      const engine = createEngine(parseSave(serializeSave(save)), mulberry32(9));
      const restarted = parseSave(serializeSave(engine.toSave()));
      expect(restarted.nextCompanionId).toBe(max);
      expect(restarted.companions).toEqual(received.companions);
      const before = structuredClone(received);
      expect(applyCollection(received, action)).toHaveProperty('error');
      expect(applyCollection(received, { type: 'pvpResult', won: true,
        stolen: incoming, lostId: 'c1' })).toHaveProperty('error');
      expect(received).toEqual(before);
    },
  );
});
