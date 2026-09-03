// Attack engine — SPEC F06/F07/F08, Assumption 8 (damage applies at input
// time; animation/timing state lives elsewhere). Pure TypeScript, zero
// imports of electron/DOM/node. All randomness comes from the injected Rng.

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
import type { SaveFile, SaveFileV1, SaveFileV2 } from './save.js';
import type { GameEvent, GameState, InputSource } from './types.js';

export interface Engine {
  /** One input → one reducer step; returns the events it produced, in order. */
  attack(source: InputSource): GameEvent[];
  getState(): Readonly<GameState>;
  toSave(): SaveFile;
}

/** Non-deterministic seed for production use; tests ALWAYS inject an Rng. */
function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/**
 * Save shapes are assumed well-formed here — tolerant parsing of untrusted
 * JSON is save.ts's parseSave(). The engine still clamps the resumed
 * monsterHp into [1n, maxHp] so a stale save can never spawn an already-dead
 * or over-healed monster.
 */
function initialState(save?: SaveFileV2 | null): GameState {
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
    bestIndex: save.bestIndex,
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
 * Event order on a kill (SPEC F07):
 * attack, monsterHit, monsterKilled, itemDropped[, levelUp...], monsterSpawned.
 */
export function createEngine(
  save?: SaveFileV1 | SaveFileV2 | null,
  rng: Rng = mulberry32(randomSeed()),
): Engine {
  const state = initialState(save ? upgradeSave(save) : null);

  return {
    attack(source: InputSource): GameEvent[] {
      const events: GameEvent[] = [];

      const crit = rng.next() < CRIT_CHANCE;
      const damage = BigInt(damageForLevel(state.level)) * (crit ? BigInt(CRIT_MULT) : 1n);
      events.push({ type: 'attack', damage, crit, source });

      state.monsterHp = state.monsterHp > damage ? state.monsterHp - damage : 0n;
      events.push({
        type: 'monsterHit',
        hpAfter: state.monsterHp,
        maxHp: state.monster.maxHp,
      });

      if (state.monsterHp === 0n) {
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

        state.xp += xpGained;
        while (state.xp >= xpToNext(state.level)) {
          state.xp -= xpToNext(state.level);
          state.level += 1;
          events.push({ type: 'levelUp', newLevel: state.level });
        }

        state.monster = monsterForIndex(killed.index + 1);
        state.monsterHp = state.monster.maxHp;
        events.push({ type: 'monsterSpawned', monster: { ...state.monster } });
      }

      return events;
    },

    getState(): Readonly<GameState> {
      return {
        ...state,
        monster: { ...state.monster },
        items: { ...state.items },
        companions: state.companions.map((c) => ({ ...c })),
      };
    },

    toSave(): SaveFile {
      return {
        version: 2,
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
      };
    },
  };
}
