import type { DefenseEvent, PvpGoldState, PvpGoldTransfer } from '../shared/api.js';

export const GOLD_KEEP = 75;
export const GOLD_PER_BATTLE = 75;
export const GOLD_DAILY_GAIN = 250;
export const GOLD_DAILY_LOSS = 250;
export const GOLD_PAIR_MS = 3_600_000;
export const DEFENSE_COOLDOWN_MS = 60_000;
export const DEFENSE_INBOX_MAX = 5;
const DAY_MS = 86_400_000;
const min = (...values: bigint[]): bigint => values.reduce((a, b) => a < b ? a : b);
const max = (a: bigint, b: bigint): bigint => a > b ? a : b;

/** Decimal JSONB values; numbers are read only for exact migration of old accounts. */
export interface GoldAccount extends PvpGoldState {
  enrolled: boolean;
  day: number; peak: string | number; gained: string | number; lost: string | number;
  pairs: Record<string, number>;
  lastDefenseAt: number | null;
  eventSeq: number;
  events: DefenseEvent[];
}
export const isDecimalGold = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
const decimal = (value: string | number): string => {
  if (isDecimalGold(value) || typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw Error('Invalid persisted gold');
};
export function currentGold(value: GoldAccount | null, at: number): GoldAccount {
  const account: GoldAccount = value ? structuredClone(value) : {
    revision: 0, net: '0', balance: '0', enrolled: false, day: -1, peak: '0', gained: '0', lost: '0',
    pairs: {}, lastDefenseAt: null, eventSeq: 0, events: [],
  };
  for (const key of ['balance', 'peak', 'gained', 'lost'] as const) account[key] = decimal(account[key]);
  const day = Math.floor(at / DAY_MS);
  if (account.day < day) { account.day = day; account.peak = account.balance; account.gained = '0'; account.lost = '0'; }
  account.peak = String(max(BigInt(account.peak), BigInt(account.balance)));
  return account;
}
export const publicGold = (value: GoldAccount | null): PvpGoldState => ({
  revision: value?.revision ?? 0, net: value?.net ?? '0', balance: decimal(value?.balance ?? '0'),
});
export const lossRemaining = (value: GoldAccount): bigint =>
  max(0n, min(BigInt(GOLD_DAILY_LOSS), BigInt(value.peak) / 10n) - BigInt(value.lost));
export const goldStake = (value: GoldAccount): bigint =>
  min(BigInt(value.balance) / 20n, BigInt(GOLD_PER_BATTLE), max(0n, BigInt(value.balance) - BigInt(GOLD_KEEP)), lossRemaining(value));

export function raidGold(attacker: GoldAccount, defender: GoldAccount, attackerId: string, defenderId: string,
  won: boolean, at: number): PvpGoldTransfer {
  const loser = won ? defender : attacker, winner = won ? attacker : defender;
  const recent = attacker.pairs[defenderId] ?? defender.pairs[attackerId];
  let reason: PvpGoldTransfer['reason'] = 'transfer';
  if (recent !== undefined && at - recent < GOLD_PAIR_MS) reason = 'pair-protection';
  else if (BigInt(attacker.balance) <= BigInt(GOLD_KEEP) || BigInt(loser.balance) <= BigInt(GOLD_KEEP)) reason = 'protected';
  else if (lossRemaining(attacker) === 0n || lossRemaining(loser) === 0n || BigInt(winner.gained) >= BigInt(GOLD_DAILY_GAIN)) reason = 'daily-limit';
  const amount = reason === 'transfer' ? min(goldStake(attacker), goldStake(loser), BigInt(GOLD_DAILY_GAIN) - BigInt(winner.gained)) : 0n;
  if (amount === 0n && reason === 'transfer') reason = 'protected';
  if (amount > 0n) {
    loser.balance = String(BigInt(loser.balance) - amount); winner.balance = String(BigInt(winner.balance) + amount);
    loser.net = String(BigInt(loser.net) - amount); winner.net = String(BigInt(winner.net) + amount);
    loser.lost = String(BigInt(loser.lost) + amount); winner.gained = String(BigInt(winner.gained) + amount);
    winner.peak = String(max(BigInt(winner.peak), BigInt(winner.balance)));
    for (const account of [attacker, defender]) account.pairs = Object.fromEntries(
      Object.entries(account.pairs).filter(([, previous]) => at - previous < GOLD_PAIR_MS));
    attacker.pairs[defenderId] = at; defender.pairs[attackerId] = at;
  }
  return { amount: String(amount), delta: String(won ? amount : -amount), reason };
}
