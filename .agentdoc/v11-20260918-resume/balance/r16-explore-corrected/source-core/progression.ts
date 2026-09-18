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
  /** Fixed PvE reset curve: 1 + bonus * resets / (half + resets). No clock or party input. */
  fieldRebirthBonus: number;
  fieldRebirthHalf: number;
  /** Denominator of the fixed reset bonus, allowing exact fractional slopes. */
  fieldRebirthBonusScale: number;
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
  heroMinLevel: 17,
  xpBase: 20,
  xpGrowth: 1.42,
  fieldHpNumerator: 1153,
  fieldHpDenominator: 1000,
  fieldHpTailStartIndex: 79,
  fieldHpTailNumerator: 10450,
  fieldHpTailDenominator: 10000,
  fieldHpTailPolynomial: 0,
  fieldHpIndexCap: null,
  fieldHpResumeIndex: null,
  fieldRebirthBonus: 0,
  fieldRebirthHalf: 1,
  fieldRebirthBonusScale: 1,
  fieldCompanionTailPolynomial: 0,
  fieldCompanionTailScale: 1,
  fieldCompanionIndexCap: null,
  fieldCompanionBaseFloor: 0,
  fieldCompanionGrowthBonus: null,
  fieldHeroCycleBonus: 0,
  companionHpNumerator: 115,
  companionHpDenominator: 100,
  captureChance: 0.35,
  firstCaptureBossIndex: 63,
  earlyCaptureCount: 5,
  heroLevelStepEvery: 2,
  heroLevelStepCap: 6,
  heroRestMs: 0,
  heroDeferMs: 30000,
  xpRewardBase: 5,
  xpRewardPerIndex: 3,
  bossXpMultiplier: 5,
  bossHpMultiplier: 5,
});
