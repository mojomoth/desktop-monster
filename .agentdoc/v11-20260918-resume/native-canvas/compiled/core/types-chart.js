"use strict";
// Elemental type chart — pure, dependency-free (SPEC F59, GAME_DESIGN_V3 §2).
// Rock-paper-scissors-lizard-Spock over one 5-cycle: a type beats the next two
// entries of TYPE_ORDER and loses to the previous two, so the whole 5x5 chart
// is derived from the cycle — no lookup table.
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEAK_DIV = exports.SUPER = exports.TYPE_ORDER = void 0;
exports.beats = beats;
exports.effectiveness = effectiveness;
exports.effectivePower = effectivePower;
/** The chart cycle. Never reorder — every relation below is derived from it. */
exports.TYPE_ORDER = ['fire', 'wind', 'earth', 'water', 'dark'];
/** Super-effective multiplier. */
exports.SUPER = 2n;
/** Not-very-effective divisor (floored, never below 1). */
exports.WEAK_DIV = 2n;
const idx = (t) => exports.TYPE_ORDER.indexOf(t);
/** True when `a` is super effective against `d` (d is 1 or 2 steps ahead). */
function beats(a, d) {
    const step = (idx(d) - idx(a) + 5) % 5;
    return step === 1 || step === 2;
}
/** Same type → normal; otherwise exactly one direction of the pair is super. */
function effectiveness(a, d) {
    if (beats(a, d))
        return 'super';
    if (beats(d, a))
        return 'weak';
    return 'normal';
}
/** Type-adjusted power: doubled on super, halved on weak with a floor of 1. */
function effectivePower(power, a, d) {
    switch (effectiveness(a, d)) {
        case 'super':
            return power * exports.SUPER;
        case 'weak': {
            const halved = power / exports.WEAK_DIV;
            return halved > 1n ? halved : 1n;
        }
        default:
            return power;
    }
}
