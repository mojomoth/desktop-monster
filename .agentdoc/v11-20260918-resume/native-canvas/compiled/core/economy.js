"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainedHeroPower = exports.lureCost = exports.trainingCost = exports.LURE_CHARGES = exports.TRAINING_MAX_LEVEL = void 0;
exports.applyEconomyAction = applyEconomyAction;
const progress_js_1 = require("./progress.js");
const discovery_js_1 = require("./discovery.js");
const hero_js_1 = require("./hero.js");
exports.TRAINING_MAX_LEVEL = 10;
exports.LURE_CHARGES = 20;
const bounded = (value, max) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
const trainingCost = (level) => 75n * BigInt(bounded(level, exports.TRAINING_MAX_LEVEL) + 1) ** 2n;
exports.trainingCost = trainingCost;
const lureCost = (reincarnations) => 75n + 25n * BigInt(bounded(reincarnations, 100));
exports.lureCost = lureCost;
const trainedHeroPower = (base, trainingLevel = 0) => base * BigInt(100 + 5 * bounded(trainingLevel, exports.TRAINING_MAX_LEVEL)) / 100n;
exports.trainedHeroPower = trainedHeroPower;
function applyEconomyAction(state, action) {
    const progress = state.progress ? (0, progress_js_1.copyProgress)(state.progress) : (0, progress_js_1.migrateProgress)(state, state.monster.speciesId);
    if (action.type !== 'shopBuy' || !Number.isSafeInteger(action.shopSerial) ||
        action.shopSerial !== progress.shopSerial || progress.shopSerial >= Number.MAX_SAFE_INTEGER - 1) {
        return { error: 'Stale shop purchase' };
    }
    if (action.item !== 'training' && action.item !== 'lure')
        return { error: 'Unknown shop item' };
    if (action.item === 'training' && progress.trainingLevel >= exports.TRAINING_MAX_LEVEL)
        return { error: 'Training is complete' };
    if (action.item === 'lure' && progress.lureRemaining > 0)
        return { error: 'A lure is already active' };
    if (action.item === 'lure') {
        const context = (0, progress_js_1.discoveryContext)({ ...state, progress }, state.hero ? (0, hero_js_1.heroForm)(state.hero.equipped.formId)?.type : undefined);
        if (!discovery_js_1.RARE_MONSTERS.some((monster) => (0, discovery_js_1.requirementsMet)(monster.requirements, context))) {
            return { error: 'Meet a rare monster discovery condition before buying a lure' };
        }
    }
    const cost = action.item === 'training' ? (0, exports.trainingCost)(progress.trainingLevel) : (0, exports.lureCost)(state.hero?.reincarnations ?? 0);
    if (state.coins < cost)
        return { error: 'Not enough gold' };
    if (action.item === 'training')
        progress.trainingLevel++;
    else
        progress.lureRemaining = exports.LURE_CHARGES;
    progress.shopSerial++;
    progress.goldSpent += cost;
    return { state: { ...state, coins: state.coins - cost, progress }, events: [] };
}
