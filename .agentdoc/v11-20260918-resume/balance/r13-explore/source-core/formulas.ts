// Exact progression formulas; the registered production parameters own the curves.
import { PROGRESSION_PARAMETERS as progression } from './progression.js';

/** +1 damage per hero level (visible stat). */
export const damageForLevel = (level: number): number => level;

/** Crit chance (rng-injected at the engine layer). */
export const CRIT_CHANCE = 0.1;

/** Crit damage multiplier. */
export const CRIT_MULT = 2;

/** Party sorting is frequent; each distinct curve owns a bounded 512-index cache. */
const hpCurve = (numerator: number, denominator: number, tailStartIndex: number | null = null,
  tailNumerator = numerator, tailDenominator = denominator): ((index: number) => bigint) => {
  const hpCache = new Map<number, bigint>();
  const n = BigInt(numerator), d = BigInt(denominator);
  const t = BigInt(tailNumerator), u = BigInt(tailDenominator);
  return (index) => {
    const normalized = Math.max(0, Math.floor(index));
    const cached = hpCache.get(normalized);
    if (cached !== undefined) return cached;
    const i = BigInt(normalized);
    const a = tailStartIndex === null ? i : BigInt(Math.min(normalized, tailStartIndex));
    const b = i - a;
    // Preserve fractional prefix HP until this single final division.
    const hp = (10n * n ** a * t ** b) / (d ** a * u ** b);
    if (hpCache.size >= 512) hpCache.clear();
    hpCache.set(normalized, hp);
    return hp;
  };
};

/** Legacy base HP also defines companion power; field experiments must not change it. */
export const monsterMaxHp = hpCurve(progression.companionHpNumerator, progression.companionHpDenominator);
/** Field-only HP; keep its curve and cache separate from owned companions/PvP. */
const currentFieldHp = hpCurve(progression.fieldHpNumerator, progression.fieldHpDenominator,
  progression.fieldHpTailStartIndex, progression.fieldHpTailNumerator, progression.fieldHpTailDenominator);
/** Frozen v0.10 curve keeps the currently saved encounter intact on upgrade. */
const legacyFieldHp = hpCurve(1153, 1000, 79, 10450, 10000);
/** Four times the fixed accepted-hero-cycle factor; never infer hero cycles from soul recovery. */
export const fieldHeroCycleNumerator = (acceptedHeroCount = 0): bigint => {
  const r = BigInt(Number.isSafeInteger(acceptedHeroCount) ? Math.max(0, Math.min(1000000, acceptedHeroCount)) : 0);
  return 4n + BigInt(progression.fieldHeroCycleBonus) * r * (r + 4n);
};
export const fieldMonsterMaxHp = (index: number, rebirths = 0, version: 10 | 11 = 11, acceptedHeroCount = 0): bigint => {
  if (version === 10) return legacyFieldHp(index);
  index = Math.min(index, progression.fieldHpIndexCap ?? Infinity);
  const count = BigInt(Number.isSafeInteger(rebirths) ? Math.max(0, rebirths) : 0);
  const half = BigInt(progression.fieldRebirthHalf), scale = BigInt(progression.fieldRebirthBonusScale);
  const start = progression.fieldHpTailStartIndex, power = BigInt(progression.fieldHpTailPolynomial);
  const hp = start !== null && index > start && power > 0n
    ? currentFieldHp(start) * BigInt(Math.floor(index) + 1) ** power / BigInt(start + 1) ** power
    : currentFieldHp(index);
  return hp * fieldHeroCycleNumerator(acceptedHeroCount) * (scale * (half + count) + BigInt(progression.fieldRebirthBonus) * count) / (4n * scale * (half + count));
};

/** XP granted for killing the monster at `index`. */
export const xpReward = (index: number): number => progression.xpRewardBase + progression.xpRewardPerIndex * index;

/** XP needed to advance FROM `level` to the next: 20, 28, 39, 54 … */
export const xpToNext = (level: number): number =>
  Math.floor(progression.xpBase * Math.pow(progression.xpGrowth, level - 1));
