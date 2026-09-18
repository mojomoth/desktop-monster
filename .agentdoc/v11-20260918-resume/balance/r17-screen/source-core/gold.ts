// Online gold is a cumulative signed ledger. A save records exactly which
// prefix it has applied; an unpaid debit survives offline spending and reloads.
export interface GoldFields { coins: bigint; pvpGoldNet?: string; pvpGoldDebt?: string }
/** Exact migration: an already rounded JSON number cannot be recovered. */
export function currency(value: unknown, fallback = 0n): bigint {
  if (value === undefined) return fallback;
  if (typeof value === 'bigint' && value >= 0n) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) return BigInt(value);
  throw new RangeError('Currency must be an exact non-negative integer');
}
export const signedGold = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|-?[1-9][0-9]*)$/.test(value);
export const unsignedGold = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);

export function settlePvpGold(state: { coins: bigint | string | number; pvpGoldNet?: string; pvpGoldDebt?: string }, net: string): Required<GoldFields> | { error: string } {
  const previous = state.pvpGoldNet ?? '0';
  const debt = state.pvpGoldDebt ?? '0';
  if (!signedGold(net) || !signedGold(previous) || !unsignedGold(debt)) return { error: 'Invalid gold ledger' };
  let coins: bigint;
  try { coins = currency(state.coins); } catch { return { error: 'Invalid gold ledger' }; }
  const total = coins - BigInt(debt) + BigInt(net) - BigInt(previous);
  return { coins: total > 0n ? total : 0n, pvpGoldNet: net,
    pvpGoldDebt: total < 0n ? String(-total) : '0' };
}

/** Every local income source repays the same online obligation first. */
export function creditGold(state: GoldFields, amount: bigint): void {
  if (amount < 0n) throw new RangeError('Negative gold income');
  const debt = BigInt(state.pvpGoldDebt ?? '0');
  const payment = amount < debt ? amount : debt;
  state.coins += amount - payment;
  state.pvpGoldDebt = String(debt - payment);
}
