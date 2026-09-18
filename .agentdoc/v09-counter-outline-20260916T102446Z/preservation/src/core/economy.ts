// Gold purchases use one reducer so a queued click cannot spend twice.
import type { GameEvent, GameState } from './types.js';
import { copyProgress, discoveryContext, migrateProgress } from './progress.js';
import { RARE_MONSTERS, requirementsMet } from './discovery.js';
import { heroForm } from './hero.js';

export const TRAINING_MAX_LEVEL = 10;
export const LURE_CHARGES = 20;
export type EconomyAction = { type: 'shopBuy'; item: 'training' | 'lure'; shopSerial: number };

const bounded = (value: number, max: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export const trainingCost = (level: number): number => 75 * (bounded(level, TRAINING_MAX_LEVEL) + 1) ** 2;
export const lureCost = (reincarnations: number): number => 75 + 25 * bounded(reincarnations, 100);
export const trainedHeroPower = (base: bigint, trainingLevel = 0): bigint =>
  base * BigInt(100 + 5 * bounded(trainingLevel, TRAINING_MAX_LEVEL)) / 100n;

export function applyEconomyAction(state: Readonly<GameState>, action: EconomyAction):
  { state: GameState; events: GameEvent[] } | { error: string } {
  const progress = state.progress ? copyProgress(state.progress) : migrateProgress(state, state.monster.speciesId);
  if (action.type !== 'shopBuy' || !Number.isSafeInteger(action.shopSerial) ||
    action.shopSerial !== progress.shopSerial || progress.shopSerial >= Number.MAX_SAFE_INTEGER - 1) {
    return { error: 'Stale shop purchase' };
  }
  if (action.item !== 'training' && action.item !== 'lure') return { error: 'Unknown shop item' };
  if (action.item === 'training' && progress.trainingLevel >= TRAINING_MAX_LEVEL) return { error: 'Training is complete' };
  if (action.item === 'lure' && progress.lureRemaining > 0) return { error: 'A lure is already active' };
  if (action.item === 'lure') {
    const context = discoveryContext({ ...state, progress }, state.hero ? heroForm(state.hero.equipped.formId)?.type : undefined);
    if (!RARE_MONSTERS.some((monster) => requirementsMet(monster.requirements, context))) {
      return { error: 'Meet a rare monster discovery condition before buying a lure' };
    }
  }
  const cost = action.item === 'training' ? trainingCost(progress.trainingLevel) : lureCost(state.hero?.reincarnations ?? 0);
  if (!Number.isSafeInteger(state.coins) || state.coins < cost) return { error: 'Not enough gold' };
  if (!Number.isSafeInteger(progress.goldSpent + cost)) return { error: 'Gold history limit reached' };
  if (action.item === 'training') progress.trainingLevel++;
  else progress.lureRemaining = LURE_CHARGES;
  progress.shopSerial++;
  progress.goldSpent += cost;
  return { state: { ...state, coins: state.coins - cost, progress }, events: [] };
}
