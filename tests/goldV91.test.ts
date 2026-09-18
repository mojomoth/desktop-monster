import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, mulberry32, parseSave, serializeSave, settlePvpGold } from '../src/core/index.js';
import { currentGold, goldStake, raidGold } from '../src/server/gold.js';

describe('v0.9.1 cumulative gold accounting', () => {
  it('applies an absolute ledger exactly once across save and engine restarts', () => {
    let engine = createEngine({ ...DEFAULT_SAVE, coins: '100' });
    engine.apply({ type: 'syncPvpGold', net: '25' });
    expect(engine.getState()).toMatchObject({ coins: 125n, pvpGoldNet: '25', pvpGoldDebt: '0' });
    engine = createEngine(parseSave(serializeSave(engine.toSave())));
    engine.apply({ type: 'syncPvpGold', net: '25' });
    expect(engine.getState().coins).toBe(125n);
    engine.apply({ type: 'syncPvpGold', net: '-30' });
    expect(engine.getState()).toMatchObject({ coins: 70n, pvpGoldNet: '-30', pvpGoldDebt: '0' });
  });
  it('retains a debit spent while offline and pays it from actual subsequent PvE drops', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, coins: '0' }, mulberry32(9));
    engine.apply({ type: 'syncPvpGold', net: '-10' });
    let income = 0;
    for (let i = 0; i < 1000 && income < 15; i++) {
      for (const event of engine.attack('keyboard')) if (event.type === 'itemDropped') {
        income += event.drops.filter(d => d.item.kind === 'coin').reduce((sum, d) => sum + d.amount, 0);
      }
      const state = engine.getState();
      expect(BigInt(state.coins) - BigInt(state.pvpGoldDebt!)).toBe(BigInt(income - 10));
    }
    expect(income).toBeGreaterThanOrEqual(15);
    expect(engine.getState().pvpGoldDebt).toBe('0');
  });
  it('pays debt before exposing new PvP winnings and preserves arbitrary exact negative totals', () => {
    expect(settlePvpGold({ coins: 0n, pvpGoldNet: '-80', pvpGoldDebt: '30' }, '-60'))
      .toEqual({ coins: 0n, pvpGoldNet: '-60', pvpGoldDebt: '10' });
    expect(settlePvpGold({ coins: 0n }, '-900719925474099100000'))
      .toEqual({ coins: 0n, pvpGoldNet: '-900719925474099100000', pvpGoldDebt: '900719925474099100000' });
  });
  it('corrects an older checkpoint using its own cursor without duplicating winnings', () => {
    const old = { ...DEFAULT_SAVE, coins: 100, pvpGoldNet: '20', pvpGoldDebt: '0' };
    const corrected = settlePvpGold(old, '-30');
    expect(corrected).toEqual({ coins: 50n, pvpGoldNet: '-30', pvpGoldDebt: '0' });
    expect(settlePvpGold(old, '-30')).toEqual(corrected);
    expect(old.coins).toBe(100);
  });
  it.each(['+1', '-0', '01', '1.5', '', '1e3', '9e40'])('rejects malformed net %j without any mutation', net => {
    const engine = createEngine({ ...DEFAULT_SAVE, coins: '100' });
    const before = engine.toSave(); engine.apply({ type: 'syncPvpGold', net });
    expect(engine.toSave()).toEqual(before);
  });
  it('keeps exact positive values above the old Number ceiling and applies a ledger once', () => {
    const engine = createEngine({ ...DEFAULT_SAVE, coins: String(Number.MAX_SAFE_INTEGER) });
    engine.apply({ type: 'syncPvpGold', net: '9'.repeat(41) });
    const expected = BigInt(Number.MAX_SAFE_INTEGER) + BigInt('9'.repeat(41));
    expect(engine.getState().coins).toBe(expected);
    const saved = engine.toSave();
    expect(saved.coins).toBe(String(expected));
    engine.apply({ type: 'syncPvpGold', net: '9'.repeat(41) });
    expect(engine.toSave()).toEqual(saved);
  });
  it('migrates absent fields and keeps canonical net/debt through JSON', () => {
    expect(parseSave(null)).toMatchObject({ pvpGoldNet: '0', pvpGoldDebt: '0' });
    const save = parseSave({ ...DEFAULT_SAVE, pvpGoldNet: '-100', pvpGoldDebt: '20' });
    expect(parseSave(serializeSave(save))).toEqual(save);
    for (const malformed of [{ pvpGoldNet: '-0' }, { pvpGoldDebt: '-5' }, { pvpGoldNet: null }, { pvpGoldDebt: 3 }]) {
      expect(() => parseSave({ ...save, ...malformed })).toThrow('Invalid persisted gold ledger');
    }
  });
});

describe('v0.9.1 fixed raid policy', () => {
  const wallet = (balance: number) => ({ ...currentGold(null, 0), balance: String(balance), peak: String(balance), enrolled: true });
  it('uses the small attacker stake in either verdict, keeps 75 and moves equal gold', () => {
    for (const won of [false, true]) {
      const a = wallet(76), d = wallet(10000);
      expect(goldStake(a)).toBe(1n);
      const transfer = raidGold(a, d, 'a', 'd', won, 0);
      expect(transfer.amount).toBe('1');
      expect(BigInt(a.balance) + BigInt(d.balance)).toBe(10076n);
      expect(BigInt(a.net) + BigInt(d.net)).toBe(0n);
      expect(a.balance).toBe(won ? '77' : '75');
    }
  });
  it('caps cumulative loss and gain, protects unordered pairs, and resets daily budgets on UTC day', () => {
    const a = wallet(10000), d = wallet(10000);
    expect(raidGold(a, d, 'a', 'd', true, 0).amount).toBe('75');
    expect(raidGold(d, a, 'd', 'a', true, 60000)).toEqual({ amount: '0', delta: '0', reason: 'pair-protection' });
    for (let hour = 1; hour <= 4; hour++) raidGold(a, d, 'a', 'd', true, hour * 3600000);
    expect(a.gained).toBe('250'); expect(d.lost).toBe('250');
    expect(BigInt(a.balance) + BigInt(d.balance)).toBe(20000n);
    const nextA = currentGold(a, 86400000), nextD = currentGold(d, 86400000);
    expect(raidGold(nextA, nextD, 'a', 'd', true, 86400000).amount).toBe('75');
  });
});
