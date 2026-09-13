// Hero collection and repeat mastery. The engine supplies RNG, time and history.
import type { Rng } from './rng.js';
import type { MonsterType } from './types-chart.js';
import type { GameEvent, GameState } from './types.js';
import { monsterForIndex } from './monsters.js';
import { RARE_HERO_FORMS, requirementsMet } from './discovery.js';
import type { DiscoveryContext, Requirement } from './discovery.js';
import { discoveryContext } from './progress.js';
import { PROGRESSION_PARAMETERS as progression } from './progression.js';

export interface HeroRoll { formId: string; buffPercent: number; stacks?: number }
export interface HeroForm {
  id: string;
  name: string;
  rank: number;
  type: MonsterType;
  buff: 'element' | 'party';
  rarity: 'standard' | 'rare';
  description: string;
}
export interface HeroProgress {
  equipped: HeroRoll;
  collection: HeroRoll[];
  reincarnations: number;
  choices: HeroRoll[];
  deferRemainingMs: number;
  /** Successful reincarnation cadence, independent of the short free deferral. */
  restRemainingMs?: number;
  /** Prevents a queued click from spending gold or choosing a different offer. */
  offerSerial: number;
  /** Requirement when this offer opened; preserves one pending v0.4 offer. */
  offerLevel?: number;
}
export type HeroAction =
  | { type: 'heroOffer' }
  | { type: 'heroChoose'; formId: string; offerSerial: number }
  | { type: 'heroReroll'; offerSerial: number }
  | { type: 'heroDefer'; offerSerial: number }
  | { type: 'heroEquip'; formId: string };

const ARCHETYPES = [
  ['검사', 'fire'], ['창술사', 'water'], ['거너', 'wind'],
  ['성직자', 'earth'], ['도적', 'dark'], ['광전사', 'fire'],
  ['마법사', 'water'], ['격투가', 'wind'], ['수호기사', 'earth'],
  ['소환사', 'dark'],
] as const;
const RANKS = ['새벽', '서약', '왕실', '천상', '신화'] as const;
export const STANDARD_HERO_FORMS: readonly HeroForm[] = Object.freeze(Array.from({ length: 50 }, (_, i) => {
  const archetype = ARCHETYPES[i % 10]!;
  return Object.freeze({
    id: `h${String(i + 1).padStart(2, '0')}`,
    name: `${RANKS[Math.floor(i / 10)]} ${archetype[0]}`,
    rank: Math.floor(i / 10) + 1,
    type: archetype[1],
    buff: i % 10 < 5 ? 'element' as const : 'party' as const,
    rarity: 'standard' as const,
    description: `${RANKS[Math.floor(i / 10)]}의 길을 걷는 ${archetype[0]}. ${i % 10 < 5 ? '같은 속성의 동료' : '모든 동료'}에게 힘을 보탠다.`,
  });
}));
export const HERO_FORMS: readonly HeroForm[] = Object.freeze([...STANDARD_HERO_FORMS, ...RARE_HERO_FORMS]);
export const HERO_MIN_LEVEL = progression.heroMinLevel;
export const HERO_MAX_REINCARNATIONS = 1_000_000;
export const HERO_DEFER_MS = progression.heroDeferMs;
export const HERO_REST_MS = progression.heroRestMs;
export const HERO_BUFF_MIN = 10;
export const HERO_BUFF_MAX = 25;
const heroFormsById = new Map(HERO_FORMS.map((form) => [form.id, form]));
export const heroForm = (id: string): HeroForm | undefined => heroFormsById.get(id);
export const newHeroProgress = (): HeroProgress => ({
  equipped: { formId: 'h00', buffPercent: 0 }, collection: [], reincarnations: 0,
  choices: [], deferRemainingMs: 0, offerSerial: 0,
});
const count = (value: number, max: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export const heroRequiredLevel = (reincarnations: number): number =>
  HERO_MIN_LEVEL + Math.min(progression.heroLevelStepCap,
    Math.floor((count(reincarnations, HERO_MAX_REINCARNATIONS) + 1) / progression.heroLevelStepEvery));
export const heroRerollCost = (reincarnations: number): number => 50 + 25 * count(reincarnations, 100);
/** A pending promise survives later tuning, including a prior v0.7 level 26 offer. */
const pendingOfferLevel = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 12 ? value : 12;
export interface HeroReadiness {
  status: 'capped' | 'rest' | 'defer' | 'level' | 'ready';
  requiredLevel: number;
  remainingMs: number;
}
/** One action gate for the engine and both displays, including legacy offers. */
export const heroReadiness = (level: number, hero?: HeroProgress): HeroReadiness => {
  const requiredLevel = hero?.choices.length === 3
    ? pendingOfferLevel(hero.offerLevel)
    : heroRequiredLevel(hero?.reincarnations ?? 0);
  const rest = hero?.restRemainingMs ?? 0;
  const defer = hero?.deferRemainingMs ?? 0;
  const status = (hero?.reincarnations ?? 0) >= HERO_MAX_REINCARNATIONS ? 'capped'
    : rest > 0 ? 'rest' : defer > 0 ? 'defer' : level >= requiredLevel ? 'ready' : 'level';
  return { status, requiredLevel, remainingMs: status === 'rest' ? rest : status === 'defer' ? defer : 0 };
};
export const heroReady = (level: number, hero?: HeroProgress): boolean => heroReadiness(level, hero).status === 'ready';
export const copyHeroProgress = (hero: HeroProgress): HeroProgress => ({ ...hero,
  equipped: { ...hero.equipped }, collection: hero.collection.map((r) => ({ ...r })), choices: hero.choices.map((r) => ({ ...r })) });

const unlockedHeroRank = (reincarnations: number): number => Math.min(5, reincarnations + 1);
const eligibleHeroForms = (hero: HeroProgress, context?: DiscoveryContext): readonly HeroForm[] => [
  ...STANDARD_HERO_FORMS.filter((form) => form.rank <= unlockedHeroRank(hero.reincarnations)),
  ...RARE_HERO_FORMS.filter((form) => requirementsMet(form.requirements, context)),
];
/** Eligibility is the offer pool, independent of the menu/level/rest action gate. */
export const eligibleHeroIds = (state: Pick<GameState, 'hero' | 'progress' | 'killCount'>): string[] =>
  eligibleHeroForms(state.hero ?? newHeroProgress(),
    discoveryContext(state, heroForm(state.hero?.equipped.formId ?? '')?.type)).map((form) => form.id);

/** Only already-open v0.6 promises may use these three original recipes. */
const legacyPendingRequirements: Readonly<Record<string, readonly Requirement[]>> = {
  h58: [{ kind: 'elementKills', element: 'water', count: 100 }, { kind: 'speciesKills', id: 'reefknight', count: 2 }],
  h62: [{ kind: 'reincarnations', count: 5 }, { kind: 'seenMonsters', count: 60 }],
  h70: [{ kind: 'uniqueHeroes', count: 10 }],
};

/** Early familiar hits; from level 3 on each level adds a growing damage gain. */
export const heroDamageForLevel = (level: number): bigint => {
  const n = BigInt(Math.max(1, Math.floor(level)));
  const growth = n > 2n ? n - 2n : 0n;
  return n + growth * growth;
};
export const heroAttackPower = (level: number, souls = 0, reincarnations = 0): bigint =>
  heroDamageForLevel(level) * BigInt(1 + souls) * BigInt(100 + 25 * reincarnations) / 100n;

export function isHeroRoll(value: unknown): value is HeroRoll {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const stacks = r['stacks'];
  if (stacks !== undefined && (typeof stacks !== 'number' || !Number.isSafeInteger(stacks) || stacks < 0 || stacks > HERO_MAX_REINCARNATIONS)) return false;
  return typeof r['formId'] === 'string' && typeof r['buffPercent'] === 'number' &&
    Number.isInteger(r['buffPercent']) && (r['formId'] === 'h00'
      ? r['buffPercent'] === 0 && (stacks === undefined || stacks === 0)
      : heroForm(r['formId']) !== undefined && r['buffPercent'] >= HERO_BUFF_MIN && r['buffPercent'] <= HERO_BUFF_MAX);
}
/** Raw roll and repeat mastery remain separate on disk and on the PvP wire. */
export const heroEffectiveBuff = (roll: HeroRoll): number =>
  isHeroRoll(roll) ? roll.buffPercent + (roll.stacks ?? 0) : 0;

/** The UI previews this exact result; only acceptance stores it. */
export function projectHeroRoll(hero: HeroProgress, choice: HeroRoll): HeroRoll {
  const owned = hero.collection.find((r) => r.formId === choice.formId);
  return {
    formId: choice.formId,
    buffPercent: Math.max(owned?.buffPercent ?? HERO_BUFF_MIN, choice.buffPercent),
    ...(owned ? { stacks: (owned.stacks ?? 0) + 1 } : {}),
  };
}
export function heroBuffedPower(base: bigint, type: MonsterType, roll?: HeroRoll): bigint {
  if (!roll || !isHeroRoll(roll)) return base;
  const form = heroForm(roll.formId);
  const effective = heroEffectiveBuff(roll);
  const bonus = form?.buff === 'party' ? effective : form?.type === type ? 2 * effective : 0;
  return base * BigInt(100 + bonus) / 100n;
}

/** Missing hero means a legacy save; invalid subfields never erase other progress. */
export function parseHeroProgress(value: unknown, context?: DiscoveryContext): HeroProgress | undefined {
  if (value === undefined) return undefined;
  const h = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const int = (key: string, max: number): number => {
    const n = h[key];
    return typeof n === 'number' && Number.isSafeInteger(n) ? Math.max(0, Math.min(max, n)) : 0;
  };
  const rolls = (value: unknown, cap: number, withStacks: boolean): HeroRoll[] => {
    const kept: HeroRoll[] = [];
    if (!Array.isArray(value)) return kept;
    for (const raw of value) {
      if (typeof raw !== 'object' || raw === null) continue;
      const data = raw as Record<string, unknown>;
      const base = { formId: data['formId'], buffPercent: data['buffPercent'] };
      if (!isHeroRoll(base) || base.formId === 'h00') continue;
      const stack = data['stacks'];
      const stacks = withStacks && typeof stack === 'number' && Number.isSafeInteger(stack) && stack > 0
        ? Math.min(HERO_MAX_REINCARNATIONS, stack) : 0;
      const r: HeroRoll = { ...base, ...(stacks > 0 ? { stacks } : {}) };
      const old = kept.find((x) => x.formId === r.formId);
      if (old) {
        old.buffPercent = Math.max(old.buffPercent, r.buffPercent);
        const bestStacks = Math.max(old.stacks ?? 0, r.stacks ?? 0);
        if (bestStacks > 0) old.stacks = bestStacks;
      } else if (kept.length < cap) kept.push(r);
    }
    return kept;
  };
  const collection = rolls(h['collection'], HERO_FORMS.length, true);
  const equipped = isHeroRoll(h['equipped']) ? h['equipped'] : newHeroProgress().equipped;
  const owned = collection.find((r) => r.formId === equipped.formId);
  const reincarnations = int('reincarnations', HERO_MAX_REINCARNATIONS);
  const marker = h['offerLevel'];
  const legacyOffer = marker === undefined ||
    typeof marker === 'number' && Number.isSafeInteger(marker) && marker >= 12 && marker <= 18;
  const choices = rolls(h['choices'], 3, false).filter((r) => {
    const rare = RARE_HERO_FORMS.find((f) => f.id === r.formId);
    const original = legacyOffer ? legacyPendingRequirements[r.formId] : undefined;
    return rare ? context === undefined || requirementsMet(rare.requirements, context) ||
      original !== undefined && requirementsMet(original, context)
      : heroForm(r.formId)!.rank <= unlockedHeroRank(reincarnations);
  });
  const remaining = h['deferRemainingMs'];
  const deferRemainingMs = typeof remaining === 'number' && Number.isFinite(remaining)
    ? Math.max(0, Math.min(HERO_DEFER_MS, Math.ceil(remaining))) : 0;
  const rest = h['restRemainingMs'];
  const restRemainingMs = typeof rest === 'number' && Number.isFinite(rest)
    ? Math.max(0, Math.min(HERO_REST_MS, Math.ceil(rest))) : 0;
  const validChoices = choices.length === 3 && new Set(choices.map((r) => heroForm(r.formId)!.type)).size === 3 &&
    deferRemainingMs === 0 && restRemainingMs === 0 ? choices : [];
  const offerLevel = pendingOfferLevel(marker);
  return {
    equipped: owned ? { ...owned } : { formId: 'h00', buffPercent: 0 }, collection,
    reincarnations, choices: validChoices,
    deferRemainingMs, offerSerial: int('offerSerial', Number.MAX_SAFE_INTEGER - 1),
    ...(h['restRemainingMs'] !== undefined ? { restRemainingMs } : {}),
    ...(validChoices.length === 3 ? { offerLevel } : {}),
  };
}

/**
 * Three distinct elements: first grows the standard collection, second leaves
 * space for lower tiers/repeats, third reveals eligible rare forms. Each slot
 * uses one selection and one raw-roll draw, including probability branches.
 */
export function rollHeroChoices(hero: HeroProgress, rng: Rng, context?: DiscoveryContext): HeroRoll[] {
  const rank = unlockedHeroRank(hero.reincarnations);
  const available = eligibleHeroForms(hero, context);
  const owned = (f: HeroForm): boolean => hero.collection.some((r) => r.formId === f.id);
  const picked: HeroRoll[] = [];
  const types = new Set<MonsterType>();
  for (let i = 0; i < 3; i++) {
    const eligible = available.filter((f) => f.rarity === 'standard' && !types.has(f.type));
    let pool: readonly HeroForm[] = eligible;
    let draw = Math.max(0, Math.min(1 - Number.EPSILON, rng.next()));
    if (i === 0) {
      const topUnseen = eligible.filter((f) => f.rank === rank && !owned(f));
      const unseen = eligible.filter((f) => !owned(f));
      pool = topUnseen.length ? topUnseen : unseen.length ? unseen : eligible.filter((f) => f.rank === rank);
    } else if (i === 1) {
      const repeats = eligible.filter(owned);
      if (repeats.length > 0) {
        if (draw < .4) { pool = repeats; draw /= .4; }
        else draw = (draw - .4) / .6;
      }
    } else {
      const rare = available.filter((f) => f.rarity === 'rare' && !types.has(f.type));
      const unseen = rare.filter((f) => !context?.seenHeroes?.includes(f.id) && !owned(f));
      if (unseen.length > 0) pool = unseen;
      else if (rare.length > 0) {
        if (draw < .25) { pool = rare; draw /= .25; }
        else draw = (draw - .25) / .75;
      }
    }
    const f = pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))]!;
    types.add(f.type);
    picked.push({ formId: f.id, buffPercent: HERO_BUFF_MIN + Math.min(15, Math.floor(rng.next() * 16)) });
  }
  return picked;
}

export function applyHeroAction(state: Readonly<GameState>, action: HeroAction, rng: Rng):
  { state: GameState; events: GameEvent[] } | { error: string } {
  const hero = state.hero ? copyHeroProgress(state.hero) : newHeroProgress();
  const result = (patch: Partial<GameState> = {}, events: GameEvent[] = []) => ({
    state: { ...state, hero, ...patch }, events,
  });
  if (action.type === 'heroEquip') {
    const owned = hero.collection.find((r) => r.formId === action.formId);
    if (!owned) return { error: 'Uncollected hero form' };
    hero.equipped = { ...owned };
    return result();
  }
  if (!heroReady(state.level, hero)) return { error: 'Hero reincarnation is not ready' };
  const context = () => discoveryContext(state, heroForm(hero.equipped.formId)?.type);
  if (action.type === 'heroOffer') {
    if (hero.choices.length > 0) return { error: 'An offer is already open' };
    if (hero.offerSerial >= Number.MAX_SAFE_INTEGER - 1) return { error: 'Hero offer limit reached' };
    hero.choices = rollHeroChoices(hero, rng, context());
    hero.offerLevel = heroRequiredLevel(hero.reincarnations);
    hero.offerSerial++;
    return result();
  }
  if (hero.choices.length !== 3 || action.offerSerial !== hero.offerSerial) return { error: 'Stale hero offer' };
  if (action.type === 'heroDefer') {
    hero.choices = [];
    delete hero.offerLevel;
    hero.deferRemainingMs = HERO_DEFER_MS;
    return result();
  }
  if (action.type === 'heroReroll') {
    if (state.level < heroRequiredLevel(hero.reincarnations)) return { error: 'Reach the next reincarnation level before rerolling' };
    if (hero.offerSerial >= Number.MAX_SAFE_INTEGER - 1) return { error: 'Hero offer limit reached' };
    const cost = heroRerollCost(hero.reincarnations);
    if (state.coins < cost) return { error: 'Not enough gold' };
    hero.choices = rollHeroChoices(hero, rng, context());
    hero.offerLevel = heroRequiredLevel(hero.reincarnations);
    hero.offerSerial++;
    return result({ coins: state.coins - cost });
  }
  const selected = hero.choices.find((r) => r.formId === action.formId);
  if (!selected) return { error: 'Hero is not in this offer' };
  const owned = hero.collection.find((r) => r.formId === selected.formId);
  if ((owned?.stacks ?? 0) >= HERO_MAX_REINCARNATIONS) return { error: 'Hero mastery limit reached' };
  const projected = projectHeroRoll(hero, selected);
  if (owned) Object.assign(owned, projected);
  else hero.collection.push({ ...projected });
  hero.equipped = { ...projected };
  hero.reincarnations++;
  hero.restRemainingMs = HERO_REST_MS;
  hero.choices = [];
  delete hero.offerLevel;
  const monster = monsterForIndex(0);
  const souls = state.souls + Math.max(1, Math.floor(state.monster.index / 8));
  return result({ level: 1, xp: 0, monster, monsterHp: monster.maxHp, souls,
    rebirths: state.rebirths + 1 }, [{ type: 'rebirth', souls }]);
}
