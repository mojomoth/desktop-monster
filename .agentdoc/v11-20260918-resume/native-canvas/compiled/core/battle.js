"use strict";
// Deterministic battle simulation — SPEC F62 (GAME_DESIGN_V3 §5). Pure and
// seedless on purpose: the same two parties always produce the same blow list,
// which is what lets the server put a replay on the wire and the client just
// play it back instead of re-deriving the maths.
Object.defineProperty(exports, "__esModule", { value: true });
exports.BATTLE_MAX_BLOWS = exports.BATTLE_HP_MULT = void 0;
exports.simulateHeroicBattle = simulateHeroicBattle;
exports.simulateBattle = simulateBattle;
const collection_js_1 = require("./collection.js");
const hero_js_1 = require("./hero.js");
const monsters_js_1 = require("./monsters.js");
const types_chart_js_1 = require("./types-chart.js");
const hero_js_2 = require("./hero.js");
const economy_js_1 = require("./economy.js");
const equipment_js_1 = require("./equipment.js");
const rng_js_1 = require("./rng.js");
/** Entry snapshots freeze passives. Equipment adds damage, never hero HP. */
function heroicLine(party, hero) {
    const base = (0, economy_js_1.trainedHeroPower)((0, hero_js_2.heroAttackPower)(hero.level, hero.souls, hero.reincarnations), hero.trainingLevel);
    const type = (0, hero_js_2.heroForm)(hero.hero.formId)?.type;
    const extraCrit = (0, equipment_js_1.equipmentBonus)(hero.loadout, 'critical');
    const commander = { snapshot: { id: '@hero', kind: 'hero', formId: hero.hero.formId,
            hp: String(base * exports.BATTLE_HP_MULT), attack: String((0, equipment_js_1.loadoutAttack)(base, hero.loadout)), ...(type ? { type } : {}) },
        remaining: base * exports.BATTLE_HP_MULT, criticalBps: 1000 + Number(extraCrit > 4000n ? 4000n : extraCrit) };
    const teamBonus = 10000n + (0, equipment_js_1.equipmentBonus)(hero.loadout, 'party');
    return [commander, ...(0, collection_js_1.partyOrder)(party).reverse().map(c => ({ snapshot: {
                id: c.id, kind: 'companion', speciesId: c.speciesId, type: (0, monsters_js_1.typeOf)(c.speciesId),
                hp: String((0, collection_js_1.companionPower)(c) * exports.BATTLE_HP_MULT),
                attack: String((0, hero_js_1.heroBuffedPower)((0, collection_js_1.companionPower)(c), (0, monsters_js_1.typeOf)(c.speciesId), hero.hero) * teamBonus / 10000n),
            }, remaining: (0, collection_js_1.companionPower)(c) * exports.BATTLE_HP_MULT, criticalBps: 0 }))];
}
/** v10: alternate sides, rotate actors, companions shield their hero. */
function simulateHeroicBattle(attackerParty, defenderParty, heroes, seed = 0) {
    if (!(0, equipment_js_1.isHeroCombatSnapshot)(heroes.attacker) || !(0, equipment_js_1.isHeroCombatSnapshot)(heroes.defender))
        throw new RangeError('Invalid combat equipment snapshot');
    const a = heroicLine(attackerParty.slice(0, 5), heroes.attacker), d = heroicLine(defenderParty.slice(0, 5), heroes.defender);
    const result = { attackerWon: false, blows: [], attackerFighters: a.map(f => ({ ...f.snapshot })), defenderFighters: d.map(f => ({ ...f.snapshot })) };
    const cursors = { A: 0, D: 0 }, rng = (0, rng_js_1.mulberry32)(seed);
    while (a.some(f => f.remaining > 0n) && d.some(f => f.remaining > 0n) && result.blows.length < exports.BATTLE_MAX_BLOWS) {
        const side = result.blows.length % 2 === 0 ? 'A' : 'D';
        const actors = side === 'A' ? a : d, targets = side === 'A' ? d : a;
        let cursor = cursors[side] % actors.length;
        while (actors[cursor].remaining <= 0n)
            cursor = (cursor + 1) % actors.length;
        const actor = actors[cursor];
        cursors[side] = (cursor + 1) % actors.length;
        const target = targets.slice(1).find(f => f.remaining > 0n) ?? targets[0];
        const crit = actor.criticalBps > 0 && rng.next() * 10000 < actor.criticalBps;
        const raw = BigInt(actor.snapshot.attack) * (crit ? 2n : 1n);
        const damage = actor.snapshot.type && target.snapshot.type ? (0, types_chart_js_1.effectivePower)(raw, actor.snapshot.type, target.snapshot.type) : raw;
        target.remaining = target.remaining > damage ? target.remaining - damage : 0n;
        result.blows.push({ side, actorId: actor.snapshot.id, targetId: target.snapshot.id,
            actorKind: actor.snapshot.kind, targetKind: target.snapshot.kind, damage, ko: target.remaining === 0n, crit });
    }
    result.attackerWon = a.some(f => f.remaining > 0n) && !d.some(f => f.remaining > 0n);
    return result;
}
/** Every member soaks this many times its own power before falling. */
exports.BATTLE_HP_MULT = 5n;
/** A deadlock this long is a defender win — no battle runs forever. */
exports.BATTLE_MAX_BLOWS = 200;
/** `partyOrder` is back-to-front (biggest first); the front fights first. */
const line = (party) => (0, collection_js_1.partyOrder)(party)
    .reverse()
    .map((c) => ({ c, hp: (0, collection_js_1.companionPower)(c) * exports.BATTLE_HP_MULT }));
/**
 * Fight two parties to the end. Blows alternate A, D, A… from the attacker,
 * always between the two current front members; a member whose hp reaches 0
 * is knocked out and the next one steps up. The attacker wins by emptying the
 * defending line — running out of members or out of blows both lose.
 */
function simulateBattle(attackerParty, defenderParty, heroes = {}) {
    const a = line(attackerParty);
    const d = line(defenderParty);
    const blows = [];
    while (a.length > 0 && d.length > 0 && blows.length < exports.BATTLE_MAX_BLOWS) {
        const side = blows.length % 2 === 0 ? 'A' : 'D';
        const [actors, targets] = side === 'A' ? [a, d] : [d, a];
        const actor = actors[0];
        const target = targets[0];
        // Both lines are non-empty per the loop condition; this only feeds tsc.
        if (!actor || !target)
            break;
        const damage = (0, types_chart_js_1.effectivePower)((0, hero_js_1.heroBuffedPower)((0, collection_js_1.companionPower)(actor.c), (0, monsters_js_1.typeOf)(actor.c.speciesId), side === 'A' ? heroes.attacker : heroes.defender), (0, monsters_js_1.typeOf)(actor.c.speciesId), (0, monsters_js_1.typeOf)(target.c.speciesId));
        target.hp -= damage;
        const ko = target.hp <= 0n;
        if (ko)
            targets.shift();
        blows.push({ side, actorId: actor.c.id, targetId: target.c.id, damage, ko });
    }
    return { attackerWon: a.length > 0 && d.length === 0, blows };
}
