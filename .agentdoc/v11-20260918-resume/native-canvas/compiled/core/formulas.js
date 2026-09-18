"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xpToNext = exports.xpReward = exports.fieldMonsterMaxHp = exports.fieldHeroCycleNumerator = exports.monsterMaxHp = exports.CRIT_MULT = exports.CRIT_CHANCE = exports.damageForLevel = void 0;
// Exact progression formulas; the registered production parameters own the curves.
const progression_js_1 = require("./progression.js");
/** +1 damage per hero level (visible stat). */
const damageForLevel = (level) => level;
exports.damageForLevel = damageForLevel;
/** Crit chance (rng-injected at the engine layer). */
exports.CRIT_CHANCE = 0.1;
/** Crit damage multiplier. */
exports.CRIT_MULT = 2;
/** Party sorting is frequent; each distinct curve owns a bounded 512-index cache. */
const hpCurve = (numerator, denominator, tailStartIndex = null, tailNumerator = numerator, tailDenominator = denominator) => {
    const hpCache = new Map();
    const n = BigInt(numerator), d = BigInt(denominator);
    const t = BigInt(tailNumerator), u = BigInt(tailDenominator);
    return (index) => {
        const normalized = Math.max(0, Math.floor(index));
        const cached = hpCache.get(normalized);
        if (cached !== undefined)
            return cached;
        const i = BigInt(normalized);
        const a = tailStartIndex === null ? i : BigInt(Math.min(normalized, tailStartIndex));
        const b = i - a;
        // Preserve fractional prefix HP until this single final division.
        const hp = (10n * n ** a * t ** b) / (d ** a * u ** b);
        if (hpCache.size >= 512)
            hpCache.clear();
        hpCache.set(normalized, hp);
        return hp;
    };
};
/** Legacy base HP also defines companion power; field experiments must not change it. */
exports.monsterMaxHp = hpCurve(progression_js_1.PROGRESSION_PARAMETERS.companionHpNumerator, progression_js_1.PROGRESSION_PARAMETERS.companionHpDenominator);
/** Field-only HP; keep its curve and cache separate from owned companions/PvP. */
const currentFieldHp = hpCurve(progression_js_1.PROGRESSION_PARAMETERS.fieldHpNumerator, progression_js_1.PROGRESSION_PARAMETERS.fieldHpDenominator, progression_js_1.PROGRESSION_PARAMETERS.fieldHpTailStartIndex, progression_js_1.PROGRESSION_PARAMETERS.fieldHpTailNumerator, progression_js_1.PROGRESSION_PARAMETERS.fieldHpTailDenominator);
/** Frozen v0.10 curve keeps the currently saved encounter intact on upgrade. */
const legacyFieldHp = hpCurve(1153, 1000, 79, 10450, 10000);
/** Four times the fixed accepted-hero-cycle factor; never infer hero cycles from soul recovery. */
const fieldHeroCycleNumerator = (acceptedHeroCount = 0) => {
    const r = BigInt(Number.isSafeInteger(acceptedHeroCount) ? Math.max(0, Math.min(1000000, acceptedHeroCount)) : 0);
    return 4n + BigInt(progression_js_1.PROGRESSION_PARAMETERS.fieldHeroCycleBonus) * r * (r + 4n);
};
exports.fieldHeroCycleNumerator = fieldHeroCycleNumerator;
const fieldMonsterMaxHp = (index, rebirths = 0, version = 11, acceptedHeroCount = 0) => {
    if (version === 10)
        return legacyFieldHp(index);
    const count = BigInt(Number.isSafeInteger(rebirths) ? Math.max(0, rebirths) : 0);
    const half = BigInt(progression_js_1.PROGRESSION_PARAMETERS.fieldRebirthHalf);
    const start = progression_js_1.PROGRESSION_PARAMETERS.fieldHpTailStartIndex, power = BigInt(progression_js_1.PROGRESSION_PARAMETERS.fieldHpTailPolynomial);
    const hp = start !== null && index > start && power > 0n
        ? currentFieldHp(start) * BigInt(Math.floor(index) + 1) ** power / BigInt(start + 1) ** power
        : currentFieldHp(index);
    return hp * (0, exports.fieldHeroCycleNumerator)(acceptedHeroCount) * (half + (1n + BigInt(progression_js_1.PROGRESSION_PARAMETERS.fieldRebirthBonus)) * count) / (4n * (half + count));
};
exports.fieldMonsterMaxHp = fieldMonsterMaxHp;
/** XP granted for killing the monster at `index`. */
const xpReward = (index) => progression_js_1.PROGRESSION_PARAMETERS.xpRewardBase + progression_js_1.PROGRESSION_PARAMETERS.xpRewardPerIndex * index;
exports.xpReward = xpReward;
/** XP needed to advance FROM `level` to the next: 20, 28, 39, 54 … */
const xpToNext = (level) => Math.floor(progression_js_1.PROGRESSION_PARAMETERS.xpBase * Math.pow(progression_js_1.PROGRESSION_PARAMETERS.xpGrowth, level - 1));
exports.xpToNext = xpToNext;
