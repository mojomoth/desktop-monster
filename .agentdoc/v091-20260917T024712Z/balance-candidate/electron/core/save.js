"use strict";
// Save schema & tolerant parsing — SPEC F10/F29, Assumptions 7/21. Pure
// TypeScript, zero imports of electron/DOM/node. The app must never fail to
// boot because of a bad save: parseSave() NEVER throws — junk, missing and
// wrong-typed fields fall back per-field to DEFAULT_SAVE values. Disk always
// holds v3; older files are migrated on the way in (upgradeSave).
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SAVE = void 0;
exports.upgradeSave = upgradeSave;
exports.serializeSave = serializeSave;
exports.parseSave = parseSave;
const bignum_js_1 = require("./bignum.js");
const gold_js_1 = require("./gold.js");
const formulas_js_1 = require("./formulas.js");
const monsters_js_1 = require("./monsters.js");
const hero_js_1 = require("./hero.js");
const progress_js_1 = require("./progress.js");
/** Roster cap (GAME_DESIGN_V2 §2/§3); collection.ts owns the gameplay copy. */
const ROSTER_CAP = 30;
/** PvP party cap (GAME_DESIGN_V3 §3/§4); collection.ts owns the gameplay copy. */
const PARTY_CAP = 5;
/** Fresh-game values; also the per-field fallback for junk input. */
exports.DEFAULT_SAVE = Object.freeze({
    version: 3,
    level: 1,
    xp: 0,
    killCount: 0,
    coins: 0,
    pvpGoldNet: '0',
    pvpGoldDebt: '0',
    items: Object.freeze({}),
    monsterIndex: 0,
    monsterHp: String((0, formulas_js_1.monsterMaxHp)(0)),
    companions: Object.freeze([]),
    nextCompanionId: 1,
    souls: 0,
    rebirths: 0,
    bestIndex: 0,
    pvpParty: Object.freeze([]),
    releasedCount: 0,
});
/**
 * Migrate a well-formed save to v3. v1 had no roster, souls or best depth;
 * v2 had no PvP party.
 */
function upgradeSave(save) {
    if (save.version === 3)
        return { ...save, pvpGoldNet: save.pvpGoldNet ?? '0', pvpGoldDebt: save.pvpGoldDebt ?? '0', releasedCount: save.releasedCount ?? 0,
            earlyCaptureUsed: save.earlyCaptureUsed ?? Math.min(5, Math.max(0, save.nextCompanionId - 1)) };
    if (save.version === 2)
        return { ...save, pvpGoldNet: '0', pvpGoldDebt: '0', version: 3, pvpParty: [], releasedCount: 0,
            earlyCaptureUsed: Math.min(5, Math.max(0, save.nextCompanionId - 1)) };
    return {
        version: 3,
        level: save.level,
        xp: save.xp,
        killCount: save.killCount,
        coins: save.coins,
        pvpGoldNet: '0',
        pvpGoldDebt: '0',
        items: { ...save.items },
        monsterIndex: save.monsterIndex,
        monsterHp: String(Math.max(1, Math.floor(save.monsterHp))),
        companions: [],
        nextCompanionId: 1,
        earlyCaptureUsed: 0,
        souls: 0,
        rebirths: 0,
        bestIndex: save.monsterIndex,
        pvpParty: [],
        releasedCount: 0,
    };
}
/**
 * Stable JSON: fixed top-level key order, items keys sorted, companions in
 * array order with fixed key order. Serializing the same logical save always
 * yields byte-identical text. Older input is upgraded first.
 */
function serializeSave(save) {
    const v3 = upgradeSave(save);
    const items = {};
    for (const id of Object.keys(v3.items).sort()) {
        items[id] = v3.items[id] ?? 0;
    }
    return JSON.stringify({
        version: 3,
        level: v3.level,
        xp: v3.xp,
        killCount: v3.killCount,
        coins: v3.coins,
        pvpGoldNet: v3.pvpGoldNet ?? '0',
        pvpGoldDebt: v3.pvpGoldDebt ?? '0',
        items,
        monsterIndex: v3.monsterIndex,
        monsterSpeciesId: v3.monsterSpeciesId,
        monsterHp: v3.monsterHp,
        companions: v3.companions.map((c) => ({
            id: c.id,
            speciesId: c.speciesId,
            bossIndex: c.bossIndex,
            level: c.level,
            stars: c.stars,
        })),
        nextCompanionId: v3.nextCompanionId,
        earlyCaptureUsed: v3.earlyCaptureUsed,
        souls: v3.souls,
        rebirths: v3.rebirths,
        bestIndex: v3.bestIndex,
        pvpParty: v3.pvpParty,
        releasedCount: v3.releasedCount ?? 0,
        hero: (0, hero_js_1.parseHeroProgress)(v3.hero),
        progress: (0, progress_js_1.parseProgress)(v3.progress),
    });
}
/** Finite number → floored int clamped to `min`; anything else → fallback. */
function intField(value, fallback, min) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return fallback;
    return Math.max(min, Math.floor(value));
}
/** Integer in [min, max] — the companion fields have no fallback, they drop. */
function isInt(value, min, max = Number.MAX_SAFE_INTEGER) {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
/** Keep only entries whose count is a finite number that floors to ≥ 1. */
function itemsField(value) {
    const items = {};
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return items;
    }
    for (const [id, count] of Object.entries(value)) {
        if (typeof count === 'number' && Number.isFinite(count) && Math.floor(count) >= 1) {
            items[id] = Math.floor(count);
        }
    }
    return items;
}
/**
 * Keep only fully valid companions (GAME_DESIGN_V2 §2): a bad entry is
 * dropped, it never defaults — a half-made companion would be worse than
 * none. Duplicate ids: first wins. At most ROSTER_CAP kept.
 */
function companionsField(value) {
    const kept = [];
    if (!Array.isArray(value))
        return kept;
    const seen = new Set();
    for (const raw of value) {
        if (kept.length >= ROSTER_CAP)
            break;
        if (typeof raw !== 'object' || raw === null)
            continue;
        const c = raw;
        const id = c['id'];
        const speciesId = c['speciesId'];
        if (typeof id !== 'string' || id === '' || seen.has(id))
            continue;
        if (typeof speciesId !== 'string' || !monsters_js_1.SPECIES_IDS.includes(speciesId)) {
            continue;
        }
        if (!isInt(c['bossIndex'], 0) || !isInt(c['level'], 1) || !isInt(c['stars'], 0))
            continue;
        seen.add(id);
        kept.push({ id, speciesId, bossIndex: c['bossIndex'], level: c['level'], stars: c['stars'] });
    }
    return kept;
}
/**
 * Keep only ids that are really on the parsed roster (a party pointing at a
 * consumed companion would resurrect it), deduped first-wins, PARTY_CAP kept.
 */
function pvpPartyField(value, companions) {
    if (!Array.isArray(value))
        return [];
    const ids = new Set(companions.map((c) => c.id));
    return [...new Set(value.filter((id) => typeof id === 'string' && ids.has(id)))]
        .slice(0, PARTY_CAP);
}
/**
 * Tolerant parse of untrusted save data (SPEC F10/F29). Accepts anything —
 * pre-parsed JSON values (what main's load-state hands over) or raw JSON
 * text — and NEVER throws. Every invalid field independently falls back to
 * its DEFAULT_SAVE value; the input `version` is ignored (the shape decides)
 * and the output is always v3. Range clamping beyond that (e.g. monsterHp vs
 * the monster's maxHp) is the engine's job. Always returns fresh objects.
 */
function parseSave(raw) {
    let value = raw;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        }
        catch {
            value = null;
        }
    }
    const record = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
    const companions = companionsField(record['companions']);
    const initialHero = (0, hero_js_1.parseHeroProgress)(record['hero']);
    const progress = (0, progress_js_1.parseProgress)(record['progress']);
    const hero = (0, hero_js_1.parseHeroProgress)(initialHero, (0, progress_js_1.discoveryContext)({
        killCount: intField(record['killCount'], 0, 0), hero: initialHero, progress, companions,
        ...(typeof record['monsterSpeciesId'] === 'string' ? { monsterSpeciesId: record['monsterSpeciesId'] } : {}),
    }, (0, hero_js_1.heroForm)(initialHero?.equipped.formId ?? '')?.type));
    const species = record['monsterSpeciesId'];
    // Keep every ID's digit repair; MAX is the exhausted local allocator sentinel.
    let nextCompanionId = record['nextCompanionId'] === Infinity ? Number.MAX_SAFE_INTEGER :
        Math.min(Number.MAX_SAFE_INTEGER, intField(record['nextCompanionId'], exports.DEFAULT_SAVE.nextCompanionId, 1));
    for (const c of companions) {
        const digits = Number(c.id.replace(/\D/g, '') || 0);
        const afterId = digits >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : digits + 1;
        nextCompanionId = Math.max(nextCompanionId, afterId);
    }
    return {
        version: 3,
        level: intField(record['level'], exports.DEFAULT_SAVE.level, 1),
        xp: intField(record['xp'], exports.DEFAULT_SAVE.xp, 0),
        killCount: intField(record['killCount'], exports.DEFAULT_SAVE.killCount, 0),
        coins: intField(record['coins'], exports.DEFAULT_SAVE.coins, 0),
        pvpGoldNet: (0, gold_js_1.signedGold)(record['pvpGoldNet']) ? record['pvpGoldNet'] : '0',
        pvpGoldDebt: (0, gold_js_1.unsignedGold)(record['pvpGoldDebt']) ? record['pvpGoldDebt'] : '0',
        items: itemsField(record['items']),
        monsterIndex: intField(record['monsterIndex'], exports.DEFAULT_SAVE.monsterIndex, 0),
        ...(typeof species === 'string' && (0, monsters_js_1.isSpeciesId)(species) ? { monsterSpeciesId: species } : {}),
        monsterHp: ((0, bignum_js_1.bigField)(record['monsterHp']) ?? exports.DEFAULT_SAVE.monsterHp).replace(/^0$/, '1'),
        companions,
        nextCompanionId,
        earlyCaptureUsed: Math.min(5, intField(record['earlyCaptureUsed'], Math.max(0, nextCompanionId - 1), 0)),
        souls: intField(record['souls'], exports.DEFAULT_SAVE.souls, 0),
        rebirths: intField(record['rebirths'], exports.DEFAULT_SAVE.rebirths, 0),
        bestIndex: intField(record['bestIndex'], exports.DEFAULT_SAVE.bestIndex, 0),
        pvpParty: pvpPartyField(record['pvpParty'], companions),
        releasedCount: intField(record['releasedCount'], 0, 0),
        ...(hero ? { hero } : {}),
        ...(progress ? { progress } : {}),
    };
}
