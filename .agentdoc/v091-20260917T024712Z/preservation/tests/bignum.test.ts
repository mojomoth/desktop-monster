import { describe, expect, it } from 'vitest';
import { bigField, format, ratio, suffix } from '../src/core/index.js';

describe('big-number formatting (SPEC F28, Assumption 20)', () => {
  it('suffix 1/26/27/702/703 is A/Z/AA/ZZ/AAA', () => {
    expect(suffix(1)).toBe('A');
    expect(suffix(26)).toBe('Z');
    expect(suffix(27)).toBe('AA');
    expect(suffix(52)).toBe('AZ');
    expect(suffix(53)).toBe('BA');
    expect(suffix(702)).toBe('ZZ');
    expect(suffix(703)).toBe('AAA');
    expect(suffix(0)).toBe('');
    expect(suffix(-3)).toBe('');
  });

  it('formats 1000 as 1.00A, 12345 as 12.3A, 123456 as 123A and 1000000 as 1.00B', () => {
    expect(format(1000)).toBe('1.00A');
    expect(format(12345)).toBe('12.3A');
    expect(format(123456)).toBe('123A');
    expect(format(1000000)).toBe('1.00B');
  });

  it('format leaves up to 3 digits verbatim and scales past B', () => {
    expect(format(0)).toBe('0');
    expect(format(999)).toBe('999');
    expect(format(1000000000n)).toBe('1.00C');
    expect(format(10n ** 78n)).toBe('1.00Z');
    expect(format(10n ** 81n)).toBe('1.00AA');
    expect(format(10n ** 2106n)).toBe('1.00ZZ');
    expect(format(10n ** 2109n)).toBe('1.00AAA');
  });

  it('format truncates and never rounds: 999999 is 999A', () => {
    expect(format(999999)).toBe('999A');
    expect(format(1999)).toBe('1.99A');
    expect(format(19999)).toBe('19.9A');
  });

  it('format renders negative and non-finite numbers as 0', () => {
    expect(format(-1)).toBe('0');
    expect(format(-1000)).toBe('0');
    expect(format(Number.NaN)).toBe('0');
    expect(format(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('ratio divides bigints into a clamped number', () => {
    expect(ratio(1n, 2n)).toBe(0.5);
    expect(ratio(1n, 1000n)).toBe(0.001);
    expect(ratio(10n ** 80n, 10n ** 81n)).toBe(0.1);
    expect(ratio(5n, 0n)).toBe(0);
    expect(ratio(5n, -2n)).toBe(0);
    expect(ratio(-5n, 10n)).toBe(0);
    expect(ratio(30n, 10n)).toBe(1);
  });

  it('bigField accepts finite numbers and digit strings and rejects everything else', () => {
    expect(bigField(42)).toBe('42');
    expect(bigField(41.9)).toBe('41');
    expect(bigField(-7)).toBe('0');
    expect(bigField('123')).toBe('123');
    expect(bigField('007')).toBe('007');
    expect(bigField(Number.NaN)).toBe(null);
    expect(bigField(Number.POSITIVE_INFINITY)).toBe(null);
    expect(bigField(10n)).toBe(null);
    expect(bigField('12a')).toBe(null);
    expect(bigField('')).toBe(null);
    expect(bigField('-5')).toBe(null);
    expect(bigField(null)).toBe(null);
    expect(bigField({ n: 1 })).toBe(null);
  });
});
