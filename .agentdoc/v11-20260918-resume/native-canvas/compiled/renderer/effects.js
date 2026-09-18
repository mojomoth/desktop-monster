"use strict";
// SPEC F39 — deterministic, data-driven bursts over anim.ts's fixed pool.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImpactQueue = exports.IMPACT_QUEUE_SIZE = exports.companionImpactOf = exports.heroImpactOf = exports.COMPANION_IMPACTS = exports.IMPACT_SHAPES = exports.COMPANION_ATTACK = exports.EFFECTS = void 0;
exports.hitColorOf = hitColorOf;
exports.spawnEffect = spawnEffect;
exports.spawnImpact = spawnImpact;
exports.tickImpacts = tickImpacts;
const index_js_1 = require("../core/index.js");
const hero_js_1 = require("../core/hero.js");
const anim_js_1 = require("./anim.js");
const index_js_2 = require("./sprites/index.js");
/**
 * Per-species hit burst and companion attack (SPEC F35/F39/F63).
 *
 * The catalog is 105 species (user request 2026-09-08), so only the five
 * ORIGINAL species keep a hand-tuned preset — the other 100 derive theirs from
 * an elemental template whose colours are hue-rotated by the species' catalog
 * index. That keeps every species' hit primary distinct (the guarantee
 * tests/effects.test.ts pins) without 105 near-duplicate literals.
 */
const LEGACY_HIT = {
    slime: {
        count: 6,
        colors: [index_js_2.COLORS.green, index_js_2.COLORS.forest],
        speed: 50,
        spread: 1.2,
        lifeMs: 400,
        gravity: 260,
        size: 1,
    },
    bat: {
        count: 4,
        colors: [index_js_2.COLORS.maroon, index_js_2.COLORS.navy],
        speed: 90,
        spread: 0.6,
        lifeMs: 200,
        gravity: 0,
        size: 1,
    },
    ghost: {
        count: 5,
        colors: [index_js_2.COLORS.white, index_js_2.COLORS.steel],
        speed: 15,
        spread: Math.PI * 2,
        lifeMs: 700,
        gravity: 0,
        size: 1,
    },
    golem: {
        count: 6,
        colors: [index_js_2.COLORS.gray, index_js_2.COLORS.slate],
        speed: 60,
        spread: 1,
        lifeMs: 350,
        gravity: 400,
        size: 1,
    },
    dragon: {
        count: 7,
        colors: [index_js_2.COLORS.red, index_js_2.COLORS.orange, index_js_2.COLORS.yellow],
        speed: 50,
        spread: 1,
        lifeMs: 450,
        gravity: -120,
        size: 1,
    },
};
/** Hit-burst template per element, used by every non-original species. */
const TYPE_HIT = {
    water: { count: 6, colors: [index_js_2.COLORS.cyan, index_js_2.COLORS.blue], speed: 50, spread: 1.2, lifeMs: 400, gravity: 200, size: 1 },
    wind: { count: 4, colors: [index_js_2.COLORS.steel, index_js_2.COLORS.white], speed: 90, spread: 0.6, lifeMs: 220, gravity: -40, size: 1 },
    earth: { count: 6, colors: [index_js_2.COLORS.brown, index_js_2.COLORS.forest], speed: 55, spread: 1, lifeMs: 360, gravity: 380, size: 1 },
    dark: { count: 5, colors: [index_js_2.COLORS.navy, index_js_2.COLORS.maroon], speed: 25, spread: Math.PI * 2, lifeMs: 600, gravity: -20, size: 1 },
    fire: { count: 7, colors: [index_js_2.COLORS.orange, index_js_2.COLORS.yellow], speed: 60, spread: 1, lifeMs: 420, gravity: -100, size: 1 },
};
/**
 * Hue rotation applied to a derived species' colours: one full turn spread over
 * the whole catalog, so two species of the same element never share a colour.
 */
const SPECIES_HUE_STEP = 360 / index_js_1.SPECIES_IDS.length;
function derivedColors(colors, index) {
    return colors.map((c) => (0, index_js_2.shiftHue)(c, index * SPECIES_HUE_STEP));
}
function presetFor(base, index) {
    return { ...base, colors: derivedColors(base.colors, index) };
}
function buildSpeciesTable(make) {
    const out = {};
    index_js_1.SPECIES_IDS.forEach((id, index) => {
        out[id] = make(id, index);
    });
    return out;
}
const SPECIES_HIT = buildSpeciesTable((id, index) => LEGACY_HIT[id] ?? presetFor(TYPE_HIT[(0, index_js_1.typeOf)(id)], index));
exports.EFFECTS = {
    heroSlash: {
        count: 6,
        colors: [index_js_2.COLORS.cyan, index_js_2.COLORS.white],
        speed: 60,
        spread: 0.8,
        lifeMs: 250,
        gravity: 0,
        size: 1,
    },
    heroSlashSouls: {
        count: 6,
        colors: [index_js_2.COLORS.yellow, index_js_2.COLORS.orange],
        speed: 60,
        spread: 0.8,
        lifeMs: 250,
        gravity: 0,
        size: 1,
    },
    feverAura: {
        count: 4,
        colors: [index_js_2.COLORS.red, index_js_2.COLORS.orange, index_js_2.COLORS.yellow, index_js_2.COLORS.white],
        speed: 20,
        spread: Math.PI * 2,
        lifeMs: 400,
        gravity: -40,
        size: 1,
    },
    bossShockwave: {
        count: 16,
        colors: [index_js_2.COLORS.white, index_js_2.COLORS.steel],
        speed: 90,
        spread: Math.PI * 2,
        lifeMs: 350,
        gravity: 0,
        size: 2,
    },
    captureSparkle: {
        count: 12,
        colors: [index_js_2.COLORS.yellow, index_js_2.COLORS.white],
        speed: 40,
        spread: Math.PI * 2,
        lifeMs: 600,
        gravity: 0,
        size: 1,
    },
    // A critical hit: a wide ring of hot sparks on top of the species hit burst (user change 2026-09-06).
    critBurst: {
        count: 12,
        colors: [index_js_2.COLORS.yellow, index_js_2.COLORS.white, index_js_2.COLORS.orange],
        speed: 150,
        spread: Math.PI * 2,
        lifeMs: 320,
        gravity: 0,
        size: 2,
    },
    // The caller supplies its species hit primary.
    companionProjectile: {
        count: 1,
        colors: [],
        speed: 200,
        spread: 0,
        lifeMs: 250,
        gravity: 0,
        size: 2,
    },
    hit: SPECIES_HIT,
};
/** Companion attack style per element; every species of an element shares it. */
const TYPE_ATTACK = {
    // water: a heavy gel/tide lob that arcs under gravity.
    water: {
        style: 'lob',
        preset: { count: 3, colors: [index_js_2.COLORS.cyan, index_js_2.COLORS.blue], speed: 120, spread: 0.5, lifeMs: 400, gravity: 200, size: 2 },
    },
    // wind: a fast, tight bolt of compressed air.
    wind: {
        style: 'bolt',
        preset: { count: 2, colors: [index_js_2.COLORS.steel, index_js_2.COLORS.white], speed: 220, spread: 0.15, lifeMs: 250, gravity: 0, size: 2 },
    },
    // dark: slow spectral orbs that spread in every direction and rise.
    dark: {
        style: 'spectral',
        preset: { count: 5, colors: [index_js_2.COLORS.navy, index_js_2.COLORS.maroon], speed: 40, spread: Math.PI * 2, lifeMs: 500, gravity: -20, size: 2 },
    },
    // earth: a melee slash arc that lands on the target, like the hero.
    earth: {
        style: 'slash',
        preset: { count: 6, colors: [index_js_2.COLORS.brown, index_js_2.COLORS.forest], speed: 70, spread: 1.0, lifeMs: 260, gravity: 0, size: 2 },
    },
    // fire: a fanned breath cone that drifts upward as it fades.
    fire: {
        style: 'breath',
        preset: { count: 7, colors: [index_js_2.COLORS.orange, index_js_2.COLORS.yellow], speed: 100, spread: 0.7, lifeMs: 300, gravity: -40, size: 2 },
    },
};
/** The five original species keep their hand-tuned attack verbatim. */
const LEGACY_ATTACK = {
    // slime (water): a heavy gel lob that arcs under gravity.
    slime: {
        style: 'lob',
        preset: { count: 3, colors: [index_js_2.COLORS.green, index_js_2.COLORS.forest], speed: 120, spread: 0.5, lifeMs: 400, gravity: 200, size: 2 },
    },
    // bat (wind): a fast, tight dark bolt.
    bat: {
        style: 'bolt',
        preset: { count: 2, colors: [index_js_2.COLORS.maroon, index_js_2.COLORS.navy], speed: 220, spread: 0.15, lifeMs: 250, gravity: 0, size: 2 },
    },
    // ghost (dark): slow spectral orbs that spread in every direction and rise.
    ghost: {
        style: 'spectral',
        preset: { count: 5, colors: [index_js_2.COLORS.white, index_js_2.COLORS.steel], speed: 40, spread: Math.PI * 2, lifeMs: 500, gravity: -20, size: 2 },
    },
    // golem (earth): a melee slash arc that lands on the target, like the hero.
    golem: {
        style: 'slash',
        preset: { count: 6, colors: [index_js_2.COLORS.gray, index_js_2.COLORS.slate], speed: 70, spread: 1.0, lifeMs: 260, gravity: 0, size: 2 },
    },
    // dragon (fire): a fanned breath cone that drifts upward as it fades.
    dragon: {
        style: 'breath',
        preset: { count: 7, colors: [index_js_2.COLORS.red, index_js_2.COLORS.orange, index_js_2.COLORS.yellow], speed: 100, spread: 0.7, lifeMs: 300, gravity: -40, size: 2 },
    },
};
exports.COMPANION_ATTACK = buildSpeciesTable((id, index) => {
    const legacy = LEGACY_ATTACK[id];
    if (legacy !== undefined) {
        return legacy;
    }
    const base = TYPE_ATTACK[(0, index_js_1.typeOf)(id)];
    return { style: base.style, preset: presetFor(base.preset, index) };
});
/**
 * Primary hit colour of a runtime species id; unknown → white. Goes through
 * isSpeciesId because SPECIES_HIT is an object literal: 'toString' would
 * otherwise resolve to an inherited property and blow up on `.colors[0]`.
 */
function hitColorOf(speciesId) {
    return (0, index_js_1.isSpeciesId)(speciesId) ? SPECIES_HIT[speciesId].colors[0] ?? index_js_2.COLORS.white : index_js_2.COLORS.white;
}
function spawnEffect(pool, preset, x, y, dirX, seed = 0) {
    const centre = dirX === 1 ? 0 : Math.PI;
    for (let k = 0; k < preset.count; k++) {
        const angleIndex = ((k + seed) % preset.count + preset.count) % preset.count;
        const colorIndex = ((k + seed) % preset.colors.length + preset.colors.length) % preset.colors.length;
        const angle = centre + preset.spread * (angleIndex / Math.max(1, preset.count - 1) - 0.5);
        const color = preset.colors[colorIndex];
        if (color === undefined) {
            continue;
        }
        (0, anim_js_1.spawnParticle)(pool, {
            x,
            y,
            vx: Math.cos(angle) * preset.speed,
            vy: Math.sin(angle) * preset.speed,
            gravity: preset.gravity,
            color,
            size: preset.size,
            lifeMs: preset.lifeMs,
        });
    }
}
// Impact signatures belong to the attacker; the existing hit bursts describe
// the target's material. Geometry and timed echoes distinguish forms even
// when colors cannot be distinguished. No gameplay RNG or timers are touched.
exports.IMPACT_SHAPES = ['slash', 'pierce', 'burst', 'cross', 'claw', 'cleave', 'ring', 'wave', 'star', 'glyph'];
const impactPreset = (index, colors) => {
    const variant = Math.floor(index / exports.IMPACT_SHAPES.length);
    return {
        shape: exports.IMPACT_SHAPES[index % exports.IMPACT_SHAPES.length], colors,
        radius: 4 + variant % 4, points: 6 + Math.floor(variant / 4),
        speed: 18 + (variant % 3) * 10, pulses: 1 + variant % 3,
        pulseMs: 60 + (variant % 4) * 20, lifeMs: 170 + (variant % 3) * 45,
    };
};
const HERO_IMPACTS = new Map(hero_js_1.HERO_FORMS.map((form, index) => [form.id,
    impactPreset(index, TYPE_HIT[form.type].colors.map(color => (0, index_js_2.shiftHue)(color, form.rank * 12))),
]));
const STARTER_IMPACT = impactPreset(0, [index_js_2.COLORS.white, index_js_2.COLORS.cyan]);
exports.COMPANION_IMPACTS = buildSpeciesTable((id, index) => impactPreset(index, SPECIES_HIT[id].colors));
const heroImpactOf = (formId) => HERO_IMPACTS.get(formId) ?? STARTER_IMPACT;
exports.heroImpactOf = heroImpactOf;
const companionImpactOf = (speciesId) => (0, index_js_1.isSpeciesId)(speciesId) ? exports.COMPANION_IMPACTS[speciesId] : exports.COMPANION_IMPACTS.slime;
exports.companionImpactOf = companionImpactOf;
/** Only echoes wait here; all visible pixels use the existing 200-slot pool. */
exports.IMPACT_QUEUE_SIZE = 32;
const createImpactQueue = () => Array.from({ length: exports.IMPACT_QUEUE_SIZE }, () => ({
    active: false, preset: STARTER_IMPACT, x: 0, y: 0, dirX: 1, pulse: 0, remainingMs: 0,
}));
exports.createImpactQueue = createImpactQueue;
function paintImpact(pool, preset, x, y, dirX, pulse) {
    const radius = preset.radius + pulse * 2;
    for (let i = 0; i < preset.points; i++) {
        const t = i / Math.max(1, preset.points - 1) * 2 - 1;
        const angle = i / preset.points * Math.PI * 2 + pulse * Math.PI / 8;
        let dx;
        let dy;
        switch (preset.shape) {
            case 'slash':
                dx = t * radius;
                dy = -t * radius;
                break;
            case 'pierce':
                dx = t * radius * 1.5;
                dy = (i % 2 ? 1 : -1) * 2;
                break;
            case 'burst':
                dx = Math.cos(angle) * radius * (i % 2 ? 0.4 : 1);
                dy = Math.sin(angle) * radius;
                break;
            case 'cross':
                dx = i % 2 ? t * radius : 0;
                dy = i % 2 ? 0 : t * radius;
                break;
            case 'claw':
                dx = t * radius;
                dy = -t * radius + (i % 3 - 1) * 4;
                break;
            case 'cleave':
                dx = Math.cos(t * Math.PI / 2) * radius;
                dy = t * radius;
                break;
            case 'ring':
                dx = Math.cos(angle) * radius;
                dy = Math.sin(angle) * radius;
                break;
            case 'wave':
                dx = t * radius * 1.5;
                dy = Math.sin(t * Math.PI * 2) * radius / 2;
                break;
            case 'star':
                dx = Math.cos(angle) * radius * (i % 2 ? 1 : 0.3);
                dy = Math.sin(angle) * radius * (i % 2 ? 1 : 0.3);
                break;
            case 'glyph':
                dx = (i % 3 - 1) * radius;
                dy = (Math.floor(i / 3) - 1) * radius;
                break;
        }
        (0, anim_js_1.spawnParticle)(pool, {
            x: Math.round(x + dx * dirX), y: Math.round(y + dy),
            vx: dx * dirX / radius * preset.speed, vy: dy / radius * preset.speed,
            color: preset.colors[(i + pulse) % preset.colors.length] ?? index_js_2.COLORS.white,
            size: i % 3 === 0 ? 2 : 1, lifeMs: preset.lifeMs,
        });
    }
}
function spawnImpact(pool, queue, preset, x, y, dirX = 1) {
    paintImpact(pool, preset, x, y, dirX, 0);
    if (preset.pulses <= 1)
        return;
    const slot = queue.find(entry => !entry.active) ?? queue[0];
    if (slot)
        Object.assign(slot, { active: true, preset, x, y, dirX, pulse: 1, remainingMs: preset.pulseMs });
}
function tickImpacts(pool, queue, dtMs) {
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    for (const entry of queue) {
        if (!entry.active)
            continue;
        entry.remainingMs -= dt;
        while (entry.active && entry.remainingMs <= 0) {
            paintImpact(pool, entry.preset, entry.x, entry.y, entry.dirX, entry.pulse++);
            entry.remainingMs += entry.preset.pulseMs;
            entry.active = entry.pulse < entry.preset.pulses;
        }
    }
}
