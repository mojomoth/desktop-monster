"use strict";
// Deterministic battle simulation — SPEC F62 (GAME_DESIGN_V3 §5). Pure and
// seedless on purpose: the same two parties always produce the same blow list,
// which is what lets the server put a replay on the wire and the client just
// play it back instead of re-deriving the maths.
Object.defineProperty(exports, "__esModule", { value: true });
exports.BATTLE_MAX_BLOWS = exports.BATTLE_HP_MULT = void 0;
exports.simulateBattle = simulateBattle;
const collection_js_1 = require("./collection.js");
const hero_js_1 = require("./hero.js");
const monsters_js_1 = require("./monsters.js");
const types_chart_js_1 = require("./types-chart.js");
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
