/** Registered production parameters, including the retired rest slot for historical measurement compatibility. */
export interface ProgressionParameters {
  heroMinLevel: number;
  xpBase: number;
  xpGrowth: number;
  fieldHpNumerator: number;
  fieldHpDenominator: number;
  /** Exact field-only second slope; null preserves the original curve. */
  fieldHpTailStartIndex: number | null;
  fieldHpTailNumerator: number;
  fieldHpTailDenominator: number;
  /** Zero retains the exponential tail; positive values use a continuous index polynomial. */
  fieldHpTailPolynomial: number;
  /** Fixed stage ceiling for hunting HP; null keeps the uncapped curve. */
  fieldHpIndexCap: number | null;
  /** End of the fixed hunting plateau; null retains the capped curve. */
  fieldHpResumeIndex: number | null;
  /** Fixed PvE reset bonus. The scale and optional count cap below complete R(t); no live power input. */
  fieldRebirthBonus: number;
  fieldRebirthHalf: number;
  /** Denominator of the fixed reset bonus, allowing exact fractional slopes. */
  fieldRebirthBonusScale: number;
  /** Fixed ceiling on the reset count used only by field HP R(t); saved counters and hero M stay exact. */
  fieldRebirthCountCap: number | null;
  /** Zero retains raw field power; one/two use a fixed linear/quadratic tail after boss31. */
  fieldCompanionTailPolynomial: number;
  /** Continuous scale of the fixed field-only gain after boss31. */
  fieldCompanionTailScale: number;
  /** Fixed capture-index ceiling for hunting power only. */
  fieldCompanionIndexCap: number | null;
  /** Fixed hunting-only floor prevents early successful captures from wasting the permanent guarantee. */
  fieldCompanionBaseFloor: number;
  /** null preserves full owned growth; otherwise percent asymptotic hunting bonus above Lv1/star0. */
  fieldCompanionGrowthBonus: number | null;
  /** Fixed v11 companion burst multiplier; hero and legacy encounters retain FEVER_MULT. */
  fieldCompanionFeverMultiplier: number;
  /** Accepted hero cycles only: (4 + K*r*(r+4))/4, shared by field power and HP. */
  fieldHeroCycleBonus: number;
  companionHpNumerator: number;
  companionHpDenominator: number;
  captureChance: number;
  firstCaptureBossIndex: number | null;
  /** Permanent allocation interval for the optional initial guarantee; never reset by roster removal. */
  earlyCaptureCount: number;
  heroLevelStepEvery: number;
  heroLevelStepCap: number;
  /** Retired timer: production keeps this measurement slot at zero. */
  heroRestMs: number;
  heroDeferMs: number;
  xpRewardBase: number;
  xpRewardPerIndex: number;
  bossXpMultiplier: number;
  bossHpMultiplier: number;
}

/** Timer-free production curve. Candidate selection and measurements live in docs/v0.11. */
export const PROGRESSION_PARAMETERS: Readonly<ProgressionParameters> = Object.freeze({
  heroMinLevel: 26,
  xpBase: 20,
  xpGrowth: 1.42,
  fieldHpNumerator: 1080,
  fieldHpDenominator: 1000,
  fieldHpTailStartIndex: 79,
  fieldHpTailNumerator: 10935,
  fieldHpTailDenominator: 10000,
  fieldHpTailPolynomial: 0,
  fieldHpIndexCap: 159,
  fieldHpResumeIndex: 399,
  fieldRebirthBonus: 9,
  fieldRebirthHalf: 1,
  fieldRebirthBonusScale: 16,
  fieldRebirthCountCap: 4,
  fieldCompanionTailPolynomial: 1,
  fieldCompanionTailScale: 256,
  fieldCompanionIndexCap: 79,
  fieldCompanionBaseFloor: 14000,
  fieldCompanionGrowthBonus: 25,
  fieldCompanionFeverMultiplier: 2,
  fieldHeroCycleBonus: 128,
  companionHpNumerator: 115,
  companionHpDenominator: 100,
  captureChance: 0.35,
  firstCaptureBossIndex: 63,
  earlyCaptureCount: 5,
  heroLevelStepEvery: 2,
  heroLevelStepCap: 0,
  heroRestMs: 0,
  heroDeferMs: 30000,
  xpRewardBase: 5,
  xpRewardPerIndex: 3,
  bossXpMultiplier: 5,
  bossHpMultiplier: 5,
});
