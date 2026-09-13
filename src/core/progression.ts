/** The production experiment: every field is consumed by the game, then audited against preregistration. */
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
  companionHpNumerator: number;
  companionHpDenominator: number;
  captureChance: number;
  firstCaptureBossIndex: number | null;
  /** Permanent allocation interval for the optional initial guarantee; never reset by roster removal. */
  earlyCaptureCount: number;
  heroLevelStepEvery: number;
  heroLevelStepCap: number;
  heroRestMs: number;
  heroDeferMs: number;
  xpRewardBase: number;
  xpRewardPerIndex: number;
  bossXpMultiplier: number;
  bossHpMultiplier: number;
}

/** Registered production candidate-r8-tail10450; selecting a CLI ID does not change these values. */
export const PROGRESSION_PARAMETERS: Readonly<ProgressionParameters> = Object.freeze({
  heroMinLevel: 17,
  xpBase: 20,
  xpGrowth: 1.42,
  fieldHpNumerator: 1153,
  fieldHpDenominator: 1000,
  fieldHpTailStartIndex: 79,
  fieldHpTailNumerator: 10450,
  fieldHpTailDenominator: 10000,
  companionHpNumerator: 115,
  companionHpDenominator: 100,
  captureChance: 0.35,
  firstCaptureBossIndex: 63,
  earlyCaptureCount: 5,
  heroLevelStepEvery: 2,
  heroLevelStepCap: 6,
  heroRestMs: 120000,
  heroDeferMs: 30000,
  xpRewardBase: 5,
  xpRewardPerIndex: 3,
  bossXpMultiplier: 5,
  bossHpMultiplier: 5,
});
