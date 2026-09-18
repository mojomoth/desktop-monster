"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HERO_FORM_IDS = void 0;
exports.heroFormSprite = heroFormSprite;
exports.drawHeroForm = drawHeroForm;
// The approved original-size SD style: fifty 14×14 appearances, all sharing
// the starter's eye/hand/foot anchors and two idle + three attack frames.
// Save identities and the public drawing helpers remain unchanged.
const hero_js_1 = require("./hero.js");
const heroAgileLooks_js_1 = require("./heroAgileLooks.js");
const heroArcaneLooks_js_1 = require("./heroArcaneLooks.js");
const heroRareLooks_js_1 = require("./heroRareLooks.js");
const heroKnightLooks_js_1 = require("./heroKnightLooks.js");
const sprite_js_1 = require("./sprite.js");
exports.HERO_FORM_IDS = Array.from({ length: 70 }, (_, i) => 'h' + String(i + 1).padStart(2, '0'));
const jobs = {
    ...heroKnightLooks_js_1.HERO_KNIGHT_LOOKS, ...heroAgileLooks_js_1.HERO_AGILE_LOOKS, ...heroArcaneLooks_js_1.HERO_ARCANE_LOOKS,
};
const forms = new Map();
const registry = {};
for (const [index, id] of exports.HERO_FORM_IDS.entries()) {
    const look = index < 50 ? jobs[index % 10][Math.floor(index / 10)] : heroRareLooks_js_1.HERO_RARE_LOOKS[id];
    forms.set(id, look);
    registry[`hero.${id}.idle`] = look.idle;
    registry[`hero.${id}.attack`] = look.attack;
}
(0, sprite_js_1.registerSprites)(registry);
function heroFormSprite(formId, attacking = false) {
    const form = forms.get(formId);
    return form === undefined ? (attacking ? hero_js_1.heroAttack : hero_js_1.heroIdle) : attacking ? form.attack : form.idle;
}
/** One source for field, reincarnation choices, collection and PvP portraits. */
function drawHeroForm(ctx, formId, x, y, options) {
    (0, sprite_js_1.drawSprite)(ctx, heroFormSprite(formId), 0, x, y, options);
}
