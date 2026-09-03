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
  damageForLevel,
  xpReward,
  xpToNext,
} from './formulas.js';
import { rollLoot } from './loot.js';
import { BOSS_COIN_MULT, BOSS_XP_MULT, monsterForIndex } from './monsters.js';
import { mulberry32 } from './rng.js';
import type { Rng } from './rng.js';
import { upgradeSave } from './save.js';
import type { Companion, SaveFile, SaveFileV1, SaveFileV2, SaveFileV3 } from './save.js';
import type { GameEvent, GameState, InputSource } from './types.js';

/** Chance that a boss kill captures the boss as a companion (Assumption 23). */
export const CAPTURE_CHANCE = 0.35;

/** One companion volley per this many engine milliseconds (SPEC F35). */
export const COMPANION_ATTACK_MS = 1000;

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

/**
 * Save shapes are assumed well-formed here — tolerant parsing of untrusted
 * JSON is save.ts's parseSave(). The engine still clamps the resumed
 * monsterHp into [1n, maxHp] so a stale save can never spawn an already-dead
 * or over-healed monster.
 */
function initialState(save?: SaveFileV3 | null): GameState {
  if (!save) {
    const monster = monsterForIndex(0);
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
      rebirths: 0,
      bestIndex: 0,
      pvpParty: [],
      fever: COLD_FEVER,
    };
  }
  const monster = monsterForIndex(save.monsterIndex);
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
    rebirths: save.rebirths,
    bestIndex: Math.max(save.bestIndex, monster.index),
    pvpParty: [...save.pvpParty],
    fever: COLD_FEVER,
  };
}

/** Clamp a resumed hp into [1n, maxHp]. */
const clampHp = (hp: bigint, maxHp: bigint): bigint => (hp < 1n ? 1n : hp > maxHp ? maxHp : hp);

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
  const state = initialState(save ? upgradeSave(save) : null);
  /** The engine clock (Assumption 39) — advanced ONLY by tick(dtMs). */
  let clockMs = 0;
  let fever = createFever();
  const feverView = (): GameState['fever'] => ({
    active: feverActive(fever, clockMs),
    remainingMs: Math.max(0, fever.activeUntil - clockMs),
  });
  /** Leftover milliseconds below one companion volley (SPEC F35). */
  let volleyAcc = 0;

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

    // One extra draw per boss kill, ALWAYS consumed (so non-boss seeded
    // logs stay byte-identical to v1); a full roster voids the capture.
    if (killed.boss && rng.next() < CAPTURE_CHANCE && state.companions.length < ROSTER_CAP) {
      const companion: Companion = {
        id: `c${state.nextCompanionId++}`,
        speciesId: killed.speciesId,
        bossIndex: killed.index,
        level: 1,
        stars: 0,
      };
      state.companions.push(companion);
      events.push({ type: 'bossCaptured', companion: { ...companion } });
    }

    state.xp += xpGained;
    while (state.xp >= xpToNext(state.level)) {
      state.xp -= xpToNext(state.level);
      state.level += 1;
      events.push({ type: 'levelUp', newLevel: state.level });
    }

    state.monster = monsterForIndex(killed.index + 1);
    state.monsterHp = state.monster.maxHp;
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
        BigInt(damageForLevel(state.level)) *
        (crit ? BigInt(CRIT_MULT) : 1n) *
        (feverActive(fever, clockMs) ? FEVER_MULT : 1n) *
        BigInt(1 + state.souls);
      events.push({ type: 'attack', damage, crit, source });
      applyDamage(damage, events);

      return events;
    },

    tick(dtMs: number): GameEvent[] {
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      clockMs += dt;
      const events: GameEvent[] = [];
      const cooled = feverTick(fever, clockMs);
      fever = cooled.fever;
      if (cooled.ended) events.push({ type: 'feverEnd' });

      // One volley per full COMPANION_ATTACK_MS, remainder carried (SPEC F35).
      volleyAcc += dt;
      while (volleyAcc >= COMPANION_ATTACK_MS) {
        volleyAcc -= COMPANION_ATTACK_MS;
        const mult = feverActive(fever, clockMs) ? FEVER_MULT : 1n;
        // Recomputed per volley: a capture or a fuse between volleys changes
        // who fights. Companions never crit.
        for (const c of activeCompanions(state.companions)) {
          const damage = companionPower(c) * mult;
          events.push({
            type: 'companionAttack',
            companionId: c.id,
            speciesId: c.speciesId,
            damage,
          });
          applyDamage(damage, events);
        }
      }
      return events;
    },

    apply(a: CollectionAction): GameEvent[] {
      const result = applyCollection(state, a);
      if ('error' in result) return [];
      // applyCollection is total and copies everything; folding its fresh
      // state back in keeps engine-owned extras (fever) that it carried over.
      Object.assign(state, result.state);
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
        monsterHp: String(state.monsterHp),
        companions: state.companions.map((c) => ({ ...c })),
        nextCompanionId: state.nextCompanionId,
        souls: state.souls,
        rebirths: state.rebirths,
        bestIndex: state.bestIndex,
        pvpParty: [...state.pvpParty],
      };
    },
  };
}
