// Unbounded numbers (SPEC F28, Assumption 20; GAME_DESIGN_V2 §1).
// Pure TypeScript — zero imports of electron/DOM/node.

const CODE_A = 'A'.charCodeAt(0);

/** Bijective base-26 group suffix: 1→A, 26→Z, 27→AA, 52→AZ, 53→BA, 702→ZZ, 703→AAA; g ≤ 0 → ''. */
export function suffix(g: number): string {
  let out = '';
  for (let n = g; n > 0; n = Math.floor((n - 1) / 26)) {
    out = String.fromCharCode(CODE_A + ((n - 1) % 26)) + out;
  }
  return out;
}

/**
 * Assumption 20 display rule — three significant digits, TRUNCATED (never
 * rounded), plus a group suffix. Negative or non-finite input → '0'.
 */
export function format(n: bigint | number): string {
  let v: bigint;
  if (typeof n === 'number') {
    if (!Number.isFinite(n) || n < 0) return '0';
    v = BigInt(Math.floor(n)); // via bigint so ≥ 1e21 never leaks '1e+21'
  } else {
    if (n < 0n) return '0';
    v = n;
  }
  const s = v.toString();
  if (s.length <= 3) return s;
  const g = Math.floor((s.length - 1) / 3);
  const lead = s.length - 3 * g;
  const m = s.slice(0, 3);
  return (lead === 3 ? m : m.slice(0, lead) + '.' + m.slice(lead)) + suffix(g);
}

/** Fraction num/den as a number clamped to [0, 1], at 1/10000 resolution; den ≤ 0n → 0. */
export function ratio(num: bigint, den: bigint): number {
  if (den <= 0n) return 0;
  return Math.min(1, Math.max(0, Number((num * 10000n) / den) / 10000));
}

/**
 * Trust-boundary coercion for a bigint field arriving as JSON: a finite number
 * becomes its floored, non-negative decimal string; a digit string passes
 * through; everything else (bigint included — it is not a JSON value) is null.
 */
export function bigField(raw: unknown): string | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? String(Math.max(0, Math.floor(raw))) : null;
  }
  return typeof raw === 'string' && /^\d+$/.test(raw) ? raw : null;
}
