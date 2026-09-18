// Big-number presentation — SPEC F28 (Assumption 20, GAME_DESIGN_V2 §1).
// Pure: no electron/DOM/node imports. Truncates, never rounds.

/** Bijective base-26 group suffix: 1→A, 26→Z, 27→AA, 702→ZZ, 703→AAA; g ≤ 0 → ''. */
export function suffix(g: number): string {
  let out = '';
  for (let k = Math.floor(g); k > 0; k = Math.floor((k - 1) / 26)) {
    out = String.fromCharCode(65 + ((k - 1) % 26)) + out;
  }
  return out;
}

/** 3 significant digits + A–Z suffix: 999 → '999', 1000 → '1.00A', 1e6 → '1.00B'. */
export function format(n: bigint | number): string {
  if (typeof n === 'number' && !Number.isFinite(n)) return '0';
  const v = typeof n === 'number' ? BigInt(Math.floor(n)) : n;
  if (v < 0n) return '0';
  const s = v.toString();
  const d = s.length;
  if (d <= 3) return s;
  const g = Math.floor((d - 1) / 3);
  const lead = d - 3 * g;
  const m = s.slice(0, 3);
  return (lead === 3 ? m : `${m.slice(0, lead)}.${m.slice(lead)}`) + suffix(g);
}

/** num/den as a number clamped to [0, 1], 4 decimal places; den ≤ 0n → 0. */
export function ratio(num: bigint, den: bigint): number {
  if (den <= 0n) return 0;
  return Math.min(1, Math.max(0, Number((num * 10000n) / den) / 10000));
}

/** Save-file big-number field: finite number → floored digits, digit string → itself, else null. */
export function bigField(raw: unknown): string | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? String(Math.max(0, Math.floor(raw))) : null;
  }
  return typeof raw === 'string' && /^\d+$/.test(raw) ? raw : null;
}
