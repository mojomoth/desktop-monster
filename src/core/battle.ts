// Deterministic battle simulation — SPEC F62 (GAME_DESIGN_V3 §5). Pure and
// seedless on purpose: the same two parties always produce the same blow list,
// which is what lets the server put a replay on the wire and the client just
// play it back instead of re-deriving the maths.

import { companionPower, partyOrder } from './collection.js';
import { heroBuffedPower } from './hero.js';
import type { HeroRoll } from './hero.js';
import { typeOf } from './monsters.js';
import { effectivePower } from './types-chart.js';
import type { Companion } from './save.js';
import { heroAttackPower, heroForm } from './hero.js';
import { trainedHeroPower } from './economy.js';
import { equipmentBonus, isHeroCombatSnapshot, loadoutAttack } from './equipment.js';
import type { HeroCombatSnapshot } from './equipment.js';
import type { MonsterType } from './types-chart.js';
import { mulberry32 } from './rng.js';

/** One strike. `side` is who swung, `ko` whether it dropped the target. */
export interface Blow {
  side: 'A' | 'D';
  actorId: string;
  targetId: string;
  damage: bigint;
  ko: boolean;
  actorKind?: 'hero' | 'companion';
  targetKind?: 'hero' | 'companion';
  crit?: boolean;
}

export interface HeroicBattleFighter {
  id: string; kind: 'hero' | 'companion'; formId?: string; speciesId?: string;
  hp: string; attack: string; type?: MonsterType;
}
export interface HeroicBattle extends Battle {
  attackerFighters: HeroicBattleFighter[]; defenderFighters: HeroicBattleFighter[];
}
interface HeroicFighter { snapshot: HeroicBattleFighter; remaining: bigint; criticalBps: number }

/** Entry snapshots freeze passives. Equipment adds damage, never hero HP. */
function heroicLine(party: readonly Companion[], hero: HeroCombatSnapshot): HeroicFighter[] {
  const base = trainedHeroPower(heroAttackPower(hero.level, hero.souls, hero.reincarnations), hero.trainingLevel);
  const type = heroForm(hero.hero.formId)?.type;
  const extraCrit = equipmentBonus(hero.loadout, 'critical');
  const commander: HeroicFighter = { snapshot: { id: '@hero', kind: 'hero', formId: hero.hero.formId,
    hp: String(base * BATTLE_HP_MULT), attack: String(loadoutAttack(base, hero.loadout)), ...(type ? { type } : {}) },
    remaining: base * BATTLE_HP_MULT, criticalBps: 1000 + Number(extraCrit > 4000n ? 4000n : extraCrit) };
  const teamBonus = 10000n + equipmentBonus(hero.loadout, 'party');
  return [commander, ...partyOrder(party).reverse().map(c => ({ snapshot: {
    id: c.id, kind: 'companion' as const, speciesId: c.speciesId, type: typeOf(c.speciesId),
    hp: String(companionPower(c) * BATTLE_HP_MULT),
    attack: String(heroBuffedPower(companionPower(c), typeOf(c.speciesId), hero.hero) * teamBonus / 10000n),
  }, remaining: companionPower(c) * BATTLE_HP_MULT, criticalBps: 0 }))];
}

/** v10: alternate sides, rotate actors, companions shield their hero. */
export function simulateHeroicBattle(attackerParty: readonly Companion[], defenderParty: readonly Companion[],
  heroes: { attacker: HeroCombatSnapshot; defender: HeroCombatSnapshot }, seed = 0): HeroicBattle {
  if (!isHeroCombatSnapshot(heroes.attacker) || !isHeroCombatSnapshot(heroes.defender)) throw new RangeError('Invalid combat equipment snapshot');
  const a = heroicLine(attackerParty.slice(0, 5), heroes.attacker), d = heroicLine(defenderParty.slice(0, 5), heroes.defender);
  const result: HeroicBattle = { attackerWon: false, blows: [], attackerFighters: a.map(f => ({ ...f.snapshot })), defenderFighters: d.map(f => ({ ...f.snapshot })) };
  const cursors = { A: 0, D: 0 }, rng = mulberry32(seed);
  while (a.some(f => f.remaining > 0n) && d.some(f => f.remaining > 0n) && result.blows.length < BATTLE_MAX_BLOWS) {
    const side = result.blows.length % 2 === 0 ? 'A' : 'D';
    const actors = side === 'A' ? a : d, targets = side === 'A' ? d : a;
    let cursor = cursors[side] % actors.length;
    while (actors[cursor]!.remaining <= 0n) cursor = (cursor + 1) % actors.length;
    const actor = actors[cursor]!; cursors[side] = (cursor + 1) % actors.length;
    const target = targets.slice(1).find(f => f.remaining > 0n) ?? targets[0]!;
    const crit = actor.criticalBps > 0 && rng.next() * 10000 < actor.criticalBps;
    const raw = BigInt(actor.snapshot.attack) * (crit ? 2n : 1n);
    const damage = actor.snapshot.type && target.snapshot.type ? effectivePower(raw, actor.snapshot.type, target.snapshot.type) : raw;
    target.remaining = target.remaining > damage ? target.remaining - damage : 0n;
    result.blows.push({ side, actorId: actor.snapshot.id, targetId: target.snapshot.id,
      actorKind: actor.snapshot.kind, targetKind: target.snapshot.kind, damage, ko: target.remaining === 0n, crit });
  }
  result.attackerWon = a.some(f => f.remaining > 0n) && !d.some(f => f.remaining > 0n);
  return result;
}

export interface Battle {
  attackerWon: boolean;
  blows: Blow[];
}

export interface BattleHeroes { attacker?: HeroRoll; defender?: HeroRoll }

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
  heroes: BattleHeroes = {},
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
      heroBuffedPower(companionPower(actor.c), typeOf(actor.c.speciesId), side === 'A' ? heroes.attacker : heroes.defender),
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
