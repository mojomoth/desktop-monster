import { describe, expect, it } from 'vitest';
import { bigField, format, ratio, suffix } from '../src/core/index.js';

describe('bignum (SPEC F28, Assumption 20)', () => {
  it('suffix 1/26/27/702/703 is A/Z/AA/ZZ/AAA', () => {
    expect(suffix(1)).toBe('A');
    expect(suffix(26)).toBe('Z');
    expect(suffix(27)).toBe('AA');
    expect(suffix(52)).toBe('AZ');
    expect(suffix(53)).toBe('BA');
    expect(suffix(702)).toBe('ZZ');
    expect(suffix(703)).toBe('AAA');
    expect(suffix(0)).toBe('');
    expect(suffix(-5)).toBe('');
  });

  it('formats 1000 as 1.00A, 12345 as 12.3A, 123456 as 123A and 1000000 as 1.00B', () => {
    expect(format(999)).toBe('999');
    expect(format(1000)).toBe('1.00A');
    expect(format(12345)).toBe('12.3A');
    expect(format(123456)).toBe('123A');
    expect(format(1e6)).toBe('1.00B');
    expect(format(1e9)).toBe('1.00C');
  });

  it('format spans the whole suffix ladder up to AAA', () => {
    expect(format(10n ** 78n)).toBe('1.00Z');
    expect(format(10n ** 81n)).toBe('1.00AA');
    expect(format(10n ** 2106n)).toBe('1.00ZZ');
    expect(format(10n ** 2109n)).toBe('1.00AAA');
  });

  it('format truncates and never rounds: 999999 is 999A', () => {
    expect(format(999999)).toBe('999A');
    expect(format(1999)).toBe('1.99A'); // not 2.00A
    expect(format(19999)).toBe('19.9A'); // not 20.0A
    expect(format(999999999n)).toBe('999B');
  });

  it('format maps negative and non-finite numbers to 0', () => {
    expect(format(-1)).toBe('0');
    expect(format(-123456)).toBe('0');
    expect(format(Number.NaN)).toBe('0');
    expect(format(Number.POSITIVE_INFINITY)).toBe('0');
    expect(format(-1000n)).toBe('0');
    expect(format(0)).toBe('0');
  });

  it('ratio divides bigints into a clamped number', () => {
    expect(ratio(1n, 2n)).toBe(0.5);
    expect(ratio(0n, 10n)).toBe(0);
    expect(ratio(10n, 10n)).toBe(1);
    expect(ratio(1n, 0n)).toBe(0); // den ≤ 0n
    expect(ratio(1n, -4n)).toBe(0);
    expect(ratio(20n, 10n)).toBe(1); // clamped high
    expect(ratio(-5n, 10n)).toBe(0); // clamped low
    expect(ratio(10n ** 78n, 4n * 10n ** 78n)).toBe(0.25);
  });

  it('bigField accepts finite numbers and digit strings and rejects everything else', () => {
    expect(bigField(7)).toBe('7');
    expect(bigField(7.9)).toBe('7');
    expect(bigField(-3)).toBe('0');
    expect(bigField('123')).toBe('123');
    expect(bigField('007')).toBe('007');
    expect(bigField(Number.NaN)).toBeNull();
    expect(bigField(Number.POSITIVE_INFINITY)).toBeNull();
    expect(bigField(10n)).toBeNull(); // bigint is not a JSON value
    expect(bigField('12a')).toBeNull();
    expect(bigField('-1')).toBeNull();
    expect(bigField('')).toBeNull();
    expect(bigField(null)).toBeNull();
    expect(bigField(undefined)).toBeNull();
    expect(bigField({})).toBeNull();
  });
});
