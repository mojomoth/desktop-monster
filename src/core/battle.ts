// Deterministic battle simulation — SPEC F62 (GAME_DESIGN_V3 §5). Pure and
// seedless on purpose: the same two parties always produce the same blow list,
// which is what lets the server put a replay on the wire and the client just
// play it back instead of re-deriving the maths.

import { companionPower, partyOrder } from './collection.js';
import { typeOf } from './monsters.js';
import { effectivePower } from './types-chart.js';
import type { Companion } from './save.js';

/** One strike. `side` is who swung, `ko` whether it dropped the target. */
export interface Blow {
  side: 'A' | 'D';
  actorId: string;
  targetId: string;
  damage: bigint;
  ko: boolean;
}

export interface Battle {
  attackerWon: boolean;
  blows: Blow[];
}

/** Every member soaks this many times its own power before falling. */
export const BATTLE_HP_MULT = 5n;

/** A deadlock this long is a defender win — no battle runs forever. */
export const BATTLE_MAX_BLOWS = 200;

interface Fighter {
  c: Companion;
  hp: bigint;
}

/** `partyOrder` is back-to-front (biggest first); the front fights first. */
const line = (party: readonly Companion[]): Fighter[] =>
  partyOrder(party)
    .reverse()
    .map((c) => ({ c, hp: companionPower(c) * BATTLE_HP_MULT }));

/**
 * Fight two parties to the end. Blows alternate A, D, A… from the attacker,
 * always between the two current front members; a member whose hp reaches 0
 * is knocked out and the next one steps up. The attacker wins by emptying the
 * defending line — running out of members or out of blows both lose.
 */
export function simulateBattle(
  attackerParty: readonly Companion[],
  defenderParty: readonly Companion[],
): Battle {
  const a = line(attackerParty);
  const d = line(defenderParty);
  const blows: Blow[] = [];

  while (a.length > 0 && d.length > 0 && blows.length < BATTLE_MAX_BLOWS) {
    const side = blows.length % 2 === 0 ? 'A' : 'D';
    const [actors, targets] = side === 'A' ? [a, d] : [d, a];
    const actor = actors[0];
    const target = targets[0];
    // Both lines are non-empty per the loop condition; this only feeds tsc.
    if (!actor || !target) break;
    const damage = effectivePower(
      companionPower(actor.c),
      typeOf(actor.c.speciesId),
      typeOf(target.c.speciesId),
    );
    target.hp -= damage;
    const ko = target.hp <= 0n;
    if (ko) targets.shift();
    blows.push({ side, actorId: actor.c.id, targetId: target.c.id, damage, ko });
  }

  return { attackerWon: a.length > 0 && d.length === 0, blows };
}
