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
  /** Fixed PvE reset curve: 1 + bonus * resets / (half + resets). No clock or party input. */
  fieldRebirthBonus: number;
  fieldRebirthHalf: number;
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

/** v0.9 no-rest update to candidate-r8-tail10450; registered in docs/v0.9/NO_REST_UPDATE.json. */
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
  fieldRebirthBonus: 0,
  fieldRebirthHalf: 1,
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
