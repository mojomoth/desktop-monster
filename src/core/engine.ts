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
import { monsterForIndex } from './monsters.js';
import { mulberry32 } from './rng.js';
import type { Rng } from './rng.js';
import type { GameEvent, GameState, InputSource } from './types.js';

/**
 * Plain persisted shape. Field-for-field identical to the SaveFileV1 schema
 * that T08 introduces in save.ts; when that lands, engine.ts switches to the
 * shared type. Tolerant parsing of untrusted JSON is save.ts's job — this
 * type is assumed well-formed.
 */
export interface EngineSave {
  version: 1;
  level: number;
  xp: number;
  killCount: number;
  coins: number;
  items: Record<string, number>;
  /** 0-based global index of the monster that was on screen. */
  monsterIndex: number;
  monsterHp: number;
}

export interface Engine {
  /** One input → one reducer step; returns the events it produced, in order. */
  attack(source: InputSource): GameEvent[];
  getState(): Readonly<GameState>;
  toSave(): EngineSave;
}

/** Non-deterministic seed for production use; tests ALWAYS inject an Rng. */
function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

function initialState(save?: EngineSave | null): GameState {
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
    // Resume exactly, clamped into [1, maxHp] so a stale save can never
    // spawn an already-dead or over-healed monster.
    monsterHp: Math.min(monster.maxHp, Math.max(1, Math.floor(save.monsterHp))),
  };
}

/**
 * Create the game reducer. Every attack(source) call rolls a crit (one rng
 * draw), applies damage immediately, and on a kill rolls loot (rollLoot's own
 * draws), grants XP, levels up while the threshold is met (carry-over: the
 * threshold is subtracted), and spawns monster index+1 at full HP.
 *
 * Event order on a kill (SPEC F07):
 * attack, monsterHit, monsterKilled, itemDropped[, levelUp...], monsterSpawned.
 */
export function createEngine(save?: EngineSave | null, rng: Rng = mulberry32(randomSeed())): Engine {
  const state = initialState(save);

  return {
    attack(source: InputSource): GameEvent[] {
      const events: GameEvent[] = [];

      const crit = rng.next() < CRIT_CHANCE;
      const damage = damageForLevel(state.level) * (crit ? CRIT_MULT : 1);
      events.push({ type: 'attack', damage, crit, source });

      state.monsterHp = Math.max(0, state.monsterHp - damage);
      events.push({
        type: 'monsterHit',
        hpAfter: state.monsterHp,
        maxHp: state.monster.maxHp,
      });

      if (state.monsterHp === 0) {
        const killed = state.monster;
        state.killCount += 1;
        const xpGained = xpReward(killed.index);
        events.push({ type: 'monsterKilled', monster: { ...killed }, xpGained });

        const drops = rollLoot(rng, killed.index);
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
      };
    },

    toSave(): EngineSave {
      return {
        version: 1,
        level: state.level,
        xp: state.xp,
        killCount: state.killCount,
        coins: state.coins,
        items: { ...state.items },
        monsterIndex: state.monster.index,
        monsterHp: state.monsterHp,
      };
    },
  };
}
