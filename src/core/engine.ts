// Attack engine — SPEC F06/F07/F08, Assumption 8 (damage applies at input
// time; animation/timing state lives elsewhere). Pure TypeScript, zero
// imports of electron/DOM/node. All randomness comes from the injected Rng.

import { activeCompanions, applyCollection, companionPower, ROSTER_CAP } from './collection.js';
import type { CollectionAction } from './collection.js';
import {
  createFever,
  feverActive,
  feverInput,
  feverTick,
  FEVER_MULT,
} from './fever.js';
import {
  CRIT_CHANCE,
  CRIT_MULT,
  xpReward,
  xpToNext,
} from './formulas.js';
import { rollLoot } from './loot.js';
import { attackDelayOf, BOSS_COIN_MULT, BOSS_XP_MULT, monsterForIndex, COMMON_SPECIES_IDS, typeOf } from './monsters.js';
import type { SpeciesId } from './monsters.js';
import { mulberry32 } from './rng.js';
import { effectiveness, effectivePower } from './types-chart.js';
import type { Rng } from './rng.js';
import { upgradeSave } from './save.js';
import { applyHeroAction, copyHeroProgress, heroAttackPower, heroBuffedPower, heroForm, parseHeroProgress } from './hero.js';
import { applyEconomyAction, trainedHeroPower } from './economy.js';
import { eligibleRareMonsters } from './discovery.js';
import { PROGRESSION_PARAMETERS } from './progression.js';
import { copyProgress, discoveryContext, migrateProgress, newProgress, recordReincarnation } from './progress.js';
import type { Companion, SaveFile, SaveFileV1, SaveFileV2, SaveFileV3 } from './save.js';
import type { GameEvent, GameState, InputSource } from './types.js';

/** Chance that a boss kill captures the boss as a companion (Assumption 23). */
export const CAPTURE_CHANCE = PROGRESSION_PARAMETERS.captureChance;
/**
 * Releases needed for one soul. 2 keeps the 30 min payout near +11 souls. The
 * measured effect on pacing is +0.16% kills over 100 seeds (an all-at-once
 * +10 souls control bounds it at +4.3%), well inside the ±5% budget.
 */
export const RELEASES_PER_SOUL = 2;

/** One companion volley per this many engine milliseconds (SPEC F35). */
export const COMPANION_ATTACK_MS = 1000;
/**
 * Extra swing delay per party rank (back → front) on top of the species'
 * attack delay, so even same-species members never land together (2026-09-06).
 */
export const PARTY_STAGGER_MS = 70;

export interface Engine {
  /** One input → one reducer step; returns the events it produced, in order. */
  attack(source: InputSource): GameEvent[];
  /**
   * Advance the engine clock by dtMs and emit what the clock produced
   * (non-finite/negative dt counts as 0). The ONLY way time moves forward.
   */
  tick(dtMs: number): GameEvent[];
  /** Run one roster/prestige action on the live state; `{ error }` → no events. */
  apply(a: CollectionAction): GameEvent[];
  getState(): Readonly<GameState>;
  toSave(): SaveFile;
}

/** Non-deterministic seed for production use; tests ALWAYS inject an Rng. */
function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/**
 * Every engine boots with fever cold (it is never persisted, SPEC F34).
 * ponytail: a placeholder — getState() always recomputes it from the clock,
 * so nothing inside the engine may read `state.fever`.
 */
const COLD_FEVER = { active: false, remainingMs: 0 };

const eligibleRareForState = (state: Readonly<GameState>) =>
  eligibleRareMonsters(discoveryContext(state, heroForm(state.hero?.equipped.formId ?? '')?.type));

/** Eligibility, independent of whether a species has already spawned or been killed. */
export const eligibleMonsterIds = (state: Readonly<GameState>): string[] =>
  [...COMMON_SPECIES_IDS, ...eligibleRareForState(state).map(monster => monster.id)];

/**
 * Save shapes are assumed well-formed here — tolerant parsing of untrusted
 * JSON is save.ts's parseSave(). The engine still clamps the resumed
 * monsterHp into [1n, maxHp] so a stale save can never spawn an already-dead
 * or over-healed monster.
 */
function initialState(save: SaveFileV3 | null, rng: Rng): GameState {
  if (!save) {
    const monster = randomMonster(0, rng);
    return {
      level: 1,
      xp: 0,
      killCount: 0,
      coins: 0,
      items: {},
      monster,
      monsterHp: monster.maxHp,
      companions: [],
      nextCompanionId: 1,
      souls: 0,
      releasedCount: 0,
      rebirths: 0,
      bestIndex: 0,
      pvpParty: [],
      fever: COLD_FEVER,
    };
  }
  const monster = monsterForIndex(save.monsterIndex, save.monsterSpeciesId);
  return {
    level: save.level,
    xp: save.xp,
    killCount: save.killCount,
    coins: save.coins,
    items: { ...save.items },
    monster,
    // Resume exactly, clamped into [1n, maxHp] so a stale save can never
    // spawn an already-dead or over-healed monster.
    monsterHp: clampHp(BigInt(save.monsterHp), monster.maxHp),
    companions: save.companions.map((c) => ({ ...c })),
    nextCompanionId: save.nextCompanionId,
    souls: save.souls,
    releasedCount: save.releasedCount ?? 0,
    rebirths: save.rebirths,
    bestIndex: Math.max(save.bestIndex, monster.index),
    pvpParty: [...save.pvpParty],
    fever: COLD_FEVER,
    ...(save.hero ? { hero: parseHeroProgress(save.hero) } : {}),
  };
}

/** Clamp a resumed hp into [1n, maxHp]. */
const clampHp = (hp: bigint, maxHp: bigint): bigint => (hp < 1n ? 1n : hp > maxHp ? maxHp : hp);

/** One independent, uniform species draw per spawn, including bosses. */
function randomMonster(index: number, rng: Rng): GameState['monster'] {
  return monsterForIndex(index, COMMON_SPECIES_IDS[Math.floor(rng.next() * COMMON_SPECIES_IDS.length)] ?? COMMON_SPECIES_IDS[0]);
}

/**
 * Create the game reducer. Every attack(source) call rolls a crit (one rng
 * draw), applies damage immediately, and on a kill rolls loot (rollLoot's own
 * draws), grants XP, levels up while the threshold is met (carry-over: the
 * threshold is subtracted), and spawns monster index+1 at full HP.
 *
 * Event order on a kill (SPEC F07/F33):
 * attack, monsterHit, monsterKilled, itemDropped[, bossCaptured][, levelUp...],
 * monsterSpawned.
 */
export function createEngine(
  save?: SaveFileV1 | SaveFileV2 | SaveFileV3 | null,
  rng: Rng = mulberry32(randomSeed()),
): Engine {
  const state = initialState(save ? upgradeSave(save) : null, rng);
  const savedProgress = save && 'progress' in save ? save.progress : undefined;
  state.progress = migrateProgress({ ...state, hero: state.hero ? { ...state.hero, choices: [] } : undefined,
    progress: save ? savedProgress : newProgress() }, state.monster.speciesId);
  if (state.hero) state.hero = parseHeroProgress(state.hero, discoveryContext(state, heroForm(state.hero.equipped.formId)?.type));
  for (const choice of state.hero?.choices ?? []) if (!state.progress.seenHeroes.includes(choice.formId)) state.progress.seenHeroes.push(choice.formId);
  // Open candidates remain seen history; migration acknowledges only actual acquisitions.
  /** The engine clock (Assumption 39) — advanced ONLY by tick(dtMs). */
  let clockMs = 0;
  let fever = createFever();
  const feverView = (): GameState['fever'] => ({
    active: feverActive(fever, clockMs),
    remainingMs: Math.max(0, fever.activeUntil - clockMs),
  });
  /** Next volley window start on the engine clock (SPEC F35). */
  let nextWindowMs = COMPANION_ATTACK_MS;
  /** Booked swings, in landing order: [at, companionId]. */
  let pending: { at: number; id: string }[] = [];

  /** One draw per spawn, split into conditional uniform pools. No extra draws on reload. */
  function spawn(index: number): void {
    const progress = state.progress!;
    const eligible = eligibleRareForState(state);
    const roll = Math.min(1 - Number.EPSILON, Math.max(0, rng.next()));
    let species: SpeciesId;
    if (eligible.length === 0) {
      species = COMMON_SPECIES_IDS[Math.floor(roll * COMMON_SPECIES_IDS.length)]!;
    } else {
      const chance = progress.lureRemaining > 0 ? 0.25 : 0.12;
      const forced = progress.rareMisses >= 11;
      const rare = forced || roll < chance;
      const pick = forced ? roll : rare ? roll / chance : (roll - chance) / (1 - chance);
      if (rare) {
        const unseen = eligible.filter((monster) => !progress.seenMonsters.includes(monster.id));
        const pool = unseen.length > 0 ? unseen : eligible;
        species = pool[Math.min(pool.length - 1, Math.floor(pick * pool.length))]!.id;
      } else species = COMMON_SPECIES_IDS[Math.min(COMMON_SPECIES_IDS.length - 1, Math.floor(pick * COMMON_SPECIES_IDS.length))]!;
      progress.rareMisses = rare ? 0 : progress.rareMisses + 1;
      if (progress.lureRemaining > 0) progress.lureRemaining--;
    }
    state.monster = monsterForIndex(index, species);
    state.monsterHp = state.monster.maxHp;
    if (!progress.seenMonsters.includes(species)) progress.seenMonsters.push(species);
  }

  /**
   * The one damage path: hero attacks and companion volleys both land here,
   * so a kill always chains identically — monsterKilled, loot, capture,
   * level-ups, then the next monster at full HP (SPEC F07/F33/F35).
   */
  function applyDamage(damage: bigint, events: GameEvent[]): void {
    state.monsterHp = state.monsterHp > damage ? state.monsterHp - damage : 0n;
    events.push({
      type: 'monsterHit',
      hpAfter: state.monsterHp,
      maxHp: state.monster.maxHp,
    });
    if (state.monsterHp !== 0n) return;

    const killed = state.monster;
    state.killCount += 1;
    const progress = state.progress!;
    progress.speciesKills[killed.speciesId] = Math.min(Number.MAX_SAFE_INTEGER, (progress.speciesKills[killed.speciesId] ?? 0) + 1);
    const xpGained = xpReward(killed.index) * (killed.boss ? BOSS_XP_MULT : 1);
    events.push({ type: 'monsterKilled', monster: { ...killed }, xpGained });

    const drops = rollLoot(rng, killed.index);
    // rollLoot always puts the coin first (loot.ts) — bosses pay 5x coins.
    const coin = drops[0];
    if (killed.boss && coin) {
      coin.amount *= BOSS_COIN_MULT;
    }
    for (const drop of drops) {
      if (drop.item.kind === 'coin') {
        state.coins += drop.amount;
      } else {
        state.items[drop.item.id] = (state.items[drop.item.id] ?? 0) + drop.amount;
      }
    }
    events.push({ type: 'itemDropped', drops });

    // One draw per boss, including an initial guarantee. The permanent allocation
    // interval also includes transfers/legacy ID repair; roster removal never resets it.
    const captureRoll = killed.boss ? rng.next() : 1;
    const firstCapture = PROGRESSION_PARAMETERS.firstCaptureBossIndex;
    const drew = killed.boss && (captureRoll < CAPTURE_CHANCE || firstCapture !== null &&
      state.nextCompanionId <= PROGRESSION_PARAMETERS.earlyCaptureCount && killed.index >= firstCapture &&
      state.companions.length < ROSTER_CAP);
    const canAllocate = drew && Number.isSafeInteger(state.nextCompanionId) && state.nextCompanionId >= 1 &&
      state.nextCompanionId < Number.MAX_SAFE_INTEGER &&
      !state.companions.some(companion => companion.id === `c${state.nextCompanionId}`);
    if (drew && state.companions.length < ROSTER_CAP && canAllocate) {
      const companion: Companion = {
        id: `c${state.nextCompanionId++}`,
        speciesId: killed.speciesId,
        bossIndex: killed.index,
        level: 1,
        stars: 0,
      };
      state.companions.push(companion);
      events.push({ type: 'bossCaptured', companion: { ...companion } });
    } else if (drew && state.companions.length >= ROSTER_CAP) {
      // A full roster used to void the draw in silence. Release it instead:
      // every second release pays one soul, and the event says whether the
      // roster's weakest keeper was worth less than what just walked away.
      state.releasedCount += 1;
      const souls = state.releasedCount % RELEASES_PER_SOUL === 0 ? 1 : 0;
      state.souls += souls;
      const released = companionPower({ id: '', speciesId: killed.speciesId, bossIndex: killed.index, level: 1, stars: 0 });
      const weakest = state.companions.reduce(
        (min, c) => (companionPower(c) < min ? companionPower(c) : min), released);
      events.push({ type: 'companionReleased', speciesId: killed.speciesId, bossIndex: killed.index,
        souls, strongerThanWeakest: weakest < released });
    }

    state.xp += xpGained;
    while (state.xp >= xpToNext(state.level)) {
      state.xp -= xpToNext(state.level);
      state.level += 1;
      events.push({ type: 'levelUp', newLevel: state.level });
    }

    spawn(killed.index + 1);
    state.bestIndex = Math.max(state.bestIndex, state.monster.index);
    events.push({ type: 'monsterSpawned', monster: { ...state.monster } });
  }

  return {
    attack(source: InputSource): GameEvent[] {
      const events: GameEvent[] = [];

      // The input stamps the clock and may light fever BEFORE its own attack
      // event, so the 20th input already lands at x3 (SPEC F34).
      const lit = feverInput(fever, clockMs);
      fever = lit.fever;
      if (lit.started) events.push({ type: 'feverStart' });

      const crit = rng.next() < CRIT_CHANCE;
      const damage =
        trainedHeroPower(heroAttackPower(state.level, state.souls, state.hero?.reincarnations), state.progress?.trainingLevel) *
        (crit ? BigInt(CRIT_MULT) : 1n) *
        (feverActive(fever, clockMs) ? FEVER_MULT : 1n);
      events.push({ type: 'attack', damage, crit, source });
      applyDamage(damage, events);

      return events;
    },

    tick(dtMs: number): GameEvent[] {
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      clockMs += dt;
      state.progress!.playTimeMs = Math.min(Number.MAX_SAFE_INTEGER, state.progress!.playTimeMs + dt);
      const events: GameEvent[] = [];
      // Swings landing inside this tick read fever as it stood when the tick began.
      if (state.hero && state.hero.deferRemainingMs > 0) {
        state.hero.deferRemainingMs = Math.max(0, state.hero.deferRemainingMs - dt);
        if (state.hero.deferRemainingMs === 0) events.push({ type: 'heroReady' });
      }
      if (state.hero && (state.hero.restRemainingMs ?? 0) > 0) {
        state.hero.restRemainingMs = Math.max(0, (state.hero.restRemainingMs ?? 0) - dt);
        if (state.hero.restRemainingMs === 0) events.push({ type: 'heroReady' });
      }
      const feverAtStart = fever;
      const cooled = feverTick(fever, clockMs);
      fever = cooled.fever;
      if (cooled.ended) events.push({ type: 'feverEnd' });

      // Companion volleys (SPEC F35; staggered since 2026-09-06): every
      // COMPANION_ATTACK_MS a window opens and books ONE swing per party member
      // at windowStart + the species' attack delay + PARTY_STAGGER_MS × rank.
      // Swings land in time order, each typed against the monster standing
      // there when it lands (F63) and tripled while fever burns at that moment.
      // The party is re-picked at every window: a capture, a fuse or the next
      // monster's type between windows changes who fights. Companions never crit.
      for (;;) {
        const due = pending[0]?.at ?? Number.POSITIVE_INFINITY;
        if (nextWindowMs <= clockMs && nextWindowMs <= due) {
          const windowStart = nextWindowMs;
          const booked = activeCompanions(state.companions, state.monster.type, state.hero?.equipped).map((c, rank) => ({
            at: windowStart + attackDelayOf(c.speciesId) + rank * PARTY_STAGGER_MS,
            id: c.id,
          }));
          pending = [...pending, ...booked].sort((a, b) => a.at - b.at);
          nextWindowMs += COMPANION_ATTACK_MS;
          continue;
        }
        if (due > clockMs) break;
        const fire = pending.shift();
        if (fire === undefined) break;
        const c = state.companions.find((x) => x.id === fire.id);
        if (c === undefined) continue; // consumed, fused or stolen since it was booked
        const mult = feverActive(feverAtStart, fire.at) ? FEVER_MULT : 1n;
        const attacker = typeOf(c.speciesId);
        const defender = state.monster.type;
        const damage = effectivePower(heroBuffedPower(companionPower(c), attacker, state.hero?.equipped), attacker, defender) * mult;
        events.push({
          type: 'companionAttack',
          companionId: c.id,
          speciesId: c.speciesId,
          damage,
          effectiveness: effectiveness(attacker, defender),
        });
        applyDamage(damage, events);
      }
      return events;
    },

    apply(a: CollectionAction): GameEvent[] {
      if (a.type === 'syncPvpProgress') {
        if ([a.wins, a.losses].every((value) => Number.isSafeInteger(value) && value >= 0)) {
          state.progress!.pvpWins = a.wins;
          state.progress!.pvpLosses = a.losses;
        }
        return [];
      }
      const previousLevel = state.level;
      const previousCoins = state.coins;
      const result = a.type === 'heroOffer' || a.type === 'heroChoose' || a.type === 'heroReroll' ||
        a.type === 'heroDefer' || a.type === 'heroEquip'
        ? applyHeroAction(state, a, rng) : a.type === 'shopBuy' ? applyEconomyAction(state, a) : applyCollection(state, a);
      if ('error' in result) return [];
      // applyCollection is total and copies everything; folding its fresh
      // state back in keeps engine-owned extras (fever) that it carried over.
      Object.assign(state, result.state);
      const progress = state.progress!;
      if (a.type === 'heroOffer' || a.type === 'heroReroll') {
        for (const choice of state.hero?.choices ?? []) if (!progress.seenHeroes.includes(choice.formId)) progress.seenHeroes.push(choice.formId);
      }
      if (a.type === 'heroReroll') progress.goldSpent = Math.min(Number.MAX_SAFE_INTEGER, progress.goldSpent + previousCoins - state.coins);
      if (a.type === 'heroChoose' && state.hero) recordReincarnation(progress, state.hero, previousLevel);
      if (a.type === 'rebirth' || a.type === 'heroChoose') {
        spawn(0);
      }
      return result.events;
    },

    getState(): Readonly<GameState> {
      return {
        ...state,
        fever: feverView(),
        monster: { ...state.monster },
        items: { ...state.items },
        companions: state.companions.map((c) => ({ ...c })),
        pvpParty: [...state.pvpParty],
        ...(state.hero ? { hero: copyHeroProgress(state.hero) } : {}),
        progress: copyProgress(state.progress!),
      };
    },

    toSave(): SaveFile {
      return {
        version: 3,
        level: state.level,
        xp: state.xp,
        killCount: state.killCount,
        coins: state.coins,
        items: { ...state.items },
        monsterIndex: state.monster.index,
        monsterSpeciesId: state.monster.speciesId as SpeciesId,
        monsterHp: String(state.monsterHp),
        companions: state.companions.map((c) => ({ ...c })),
        nextCompanionId: state.nextCompanionId,
        souls: state.souls,
        releasedCount: state.releasedCount,
        rebirths: state.rebirths,
        bestIndex: state.bestIndex,
        pvpParty: [...state.pvpParty],
        ...(state.hero ? { hero: copyHeroProgress(state.hero) } : {}),
        progress: copyProgress(state.progress!),
      };
    },
  };
}
