"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heroEffectiveBuff = exports.heroAttackPower = exports.heroDamageForLevel = exports.eligibleHeroIds = exports.copyHeroProgress = exports.heroReady = exports.heroReadiness = exports.heroRerollCost = exports.heroRequiredLevel = exports.newHeroProgress = exports.heroForm = exports.HERO_BUFF_MAX = exports.HERO_BUFF_MIN = exports.HERO_DEFER_MS = exports.HERO_MAX_REINCARNATIONS = exports.HERO_MIN_LEVEL = exports.HERO_FORMS = exports.STANDARD_HERO_FORMS = void 0;
exports.isHeroRoll = isHeroRoll;
exports.projectHeroRoll = projectHeroRoll;
exports.heroBuffedPower = heroBuffedPower;
exports.parseHeroProgress = parseHeroProgress;
exports.rollHeroChoices = rollHeroChoices;
exports.applyHeroAction = applyHeroAction;
const monsters_js_1 = require("./monsters.js");
const discovery_js_1 = require("./discovery.js");
const progress_js_1 = require("./progress.js");
const progression_js_1 = require("./progression.js");
const ARCHETYPES = [
    ['검사', 'fire'], ['창술사', 'water'], ['거너', 'wind'],
    ['성직자', 'earth'], ['도적', 'dark'], ['광전사', 'fire'],
    ['마법사', 'water'], ['격투가', 'wind'], ['수호기사', 'earth'],
    ['소환사', 'dark'],
];
const RANKS = ['새벽', '서약', '왕실', '천상', '신화'];
exports.STANDARD_HERO_FORMS = Object.freeze(Array.from({ length: 50 }, (_, i) => {
    const archetype = ARCHETYPES[i % 10];
    return Object.freeze({
        id: `h${String(i + 1).padStart(2, '0')}`,
        name: `${RANKS[Math.floor(i / 10)]} ${archetype[0]}`,
        rank: Math.floor(i / 10) + 1,
        type: archetype[1],
        buff: i % 10 < 5 ? 'element' : 'party',
        rarity: 'standard',
        description: `${RANKS[Math.floor(i / 10)]}의 길을 걷는 ${archetype[0]}. ${i % 10 < 5 ? '같은 속성의 동료' : '모든 동료'}에게 힘을 보탠다.`,
    });
}));
exports.HERO_FORMS = Object.freeze([...exports.STANDARD_HERO_FORMS, ...discovery_js_1.RARE_HERO_FORMS]);
exports.HERO_MIN_LEVEL = progression_js_1.PROGRESSION_PARAMETERS.heroMinLevel;
exports.HERO_MAX_REINCARNATIONS = 1_000_000;
exports.HERO_DEFER_MS = progression_js_1.PROGRESSION_PARAMETERS.heroDeferMs;
exports.HERO_BUFF_MIN = 10;
exports.HERO_BUFF_MAX = 25;
const heroFormsById = new Map(exports.HERO_FORMS.map((form) => [form.id, form]));
const heroForm = (id) => heroFormsById.get(id);
exports.heroForm = heroForm;
const newHeroProgress = () => ({
    equipped: { formId: 'h00', buffPercent: 0 }, collection: [], reincarnations: 0,
    choices: [], deferRemainingMs: 0, offerSerial: 0,
});
exports.newHeroProgress = newHeroProgress;
const count = (value, max) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
const heroRequiredLevel = (reincarnations) => exports.HERO_MIN_LEVEL + Math.min(progression_js_1.PROGRESSION_PARAMETERS.heroLevelStepCap, Math.floor((count(reincarnations, exports.HERO_MAX_REINCARNATIONS) + 1) / progression_js_1.PROGRESSION_PARAMETERS.heroLevelStepEvery));
exports.heroRequiredLevel = heroRequiredLevel;
const heroRerollCost = (reincarnations) => 50n + 25n * BigInt(count(reincarnations, 100));
exports.heroRerollCost = heroRerollCost;
/** A pending promise survives later tuning, including a prior v0.7 level 26 offer. */
const pendingOfferLevel = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 12 ? value : 12;
/** One action gate for the engine and both displays, including legacy offers. */
const heroReadiness = (level, hero) => {
    const requiredLevel = hero?.choices.length === 3
        ? pendingOfferLevel(hero.offerLevel)
        : (0, exports.heroRequiredLevel)(hero?.reincarnations ?? 0);
    const defer = hero?.deferRemainingMs ?? 0;
    const status = (hero?.reincarnations ?? 0) >= exports.HERO_MAX_REINCARNATIONS ? 'capped'
        : defer > 0 ? 'defer' : level >= requiredLevel ? 'ready' : 'level';
    return { status, requiredLevel, remainingMs: status === 'defer' ? defer : 0 };
};
exports.heroReadiness = heroReadiness;
const heroReady = (level, hero) => (0, exports.heroReadiness)(level, hero).status === 'ready';
exports.heroReady = heroReady;
const copyHeroProgress = (hero) => ({ ...hero,
    equipped: { ...hero.equipped }, collection: hero.collection.map((r) => ({ ...r })), choices: hero.choices.map((r) => ({ ...r })) });
exports.copyHeroProgress = copyHeroProgress;
const unlockedHeroRank = (reincarnations) => Math.min(5, reincarnations + 1);
const eligibleHeroForms = (hero, context) => [
    ...exports.STANDARD_HERO_FORMS.filter((form) => form.rank <= unlockedHeroRank(hero.reincarnations)),
    ...discovery_js_1.RARE_HERO_FORMS.filter((form) => (0, discovery_js_1.requirementsMet)(form.requirements, context)),
];
/** Eligibility is the offer pool, independent of the menu/level/defer action gate. */
const eligibleHeroIds = (state) => eligibleHeroForms(state.hero ?? (0, exports.newHeroProgress)(), (0, progress_js_1.discoveryContext)(state, (0, exports.heroForm)(state.hero?.equipped.formId ?? '')?.type)).map((form) => form.id);
exports.eligibleHeroIds = eligibleHeroIds;
/** Only already-open v0.6 promises may use these three original recipes. */
const legacyPendingRequirements = {
    h58: [{ kind: 'elementKills', element: 'water', count: 100 }, { kind: 'speciesKills', id: 'reefknight', count: 2 }],
    h62: [{ kind: 'reincarnations', count: 5 }, { kind: 'seenMonsters', count: 60 }],
    h70: [{ kind: 'uniqueHeroes', count: 10 }],
};
/** Early familiar hits; from level 3 on each level adds a growing damage gain. */
const heroDamageForLevel = (level) => {
    const n = BigInt(Math.max(1, Math.floor(level)));
    const growth = n > 2n ? n - 2n : 0n;
    return n + growth * growth;
};
exports.heroDamageForLevel = heroDamageForLevel;
const heroAttackPower = (level, souls = 0, reincarnations = 0) => (0, exports.heroDamageForLevel)(level) * BigInt(1 + souls) * BigInt(100 + 25 * reincarnations) / 100n;
exports.heroAttackPower = heroAttackPower;
function isHeroRoll(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const r = value;
    const stacks = r['stacks'];
    if (stacks !== undefined && (typeof stacks !== 'number' || !Number.isSafeInteger(stacks) || stacks < 0 || stacks > exports.HERO_MAX_REINCARNATIONS))
        return false;
    return typeof r['formId'] === 'string' && typeof r['buffPercent'] === 'number' &&
        Number.isInteger(r['buffPercent']) && (r['formId'] === 'h00'
        ? r['buffPercent'] === 0 && (stacks === undefined || stacks === 0)
        : (0, exports.heroForm)(r['formId']) !== undefined && r['buffPercent'] >= exports.HERO_BUFF_MIN && r['buffPercent'] <= exports.HERO_BUFF_MAX);
}
/** Raw roll and repeat mastery remain separate on disk and on the PvP wire. */
const heroEffectiveBuff = (roll) => isHeroRoll(roll) ? roll.buffPercent + (roll.stacks ?? 0) : 0;
exports.heroEffectiveBuff = heroEffectiveBuff;
/** The UI previews this exact result; only acceptance stores it. */
function projectHeroRoll(hero, choice) {
    const owned = hero.collection.find((r) => r.formId === choice.formId);
    return {
        formId: choice.formId,
        buffPercent: Math.max(owned?.buffPercent ?? exports.HERO_BUFF_MIN, choice.buffPercent),
        ...(owned ? { stacks: (owned.stacks ?? 0) + 1 } : {}),
    };
}
function heroBuffedPower(base, type, roll) {
    if (!roll || !isHeroRoll(roll))
        return base;
    const form = (0, exports.heroForm)(roll.formId);
    const effective = (0, exports.heroEffectiveBuff)(roll);
    const bonus = form?.buff === 'party' ? effective : form?.type === type ? 2 * effective : 0;
    return base * BigInt(100 + bonus) / 100n;
}
/** Missing hero means a legacy save; invalid subfields never erase other progress. */
function parseHeroProgress(value, context) {
    if (value === undefined)
        return undefined;
    const h = typeof value === 'object' && value !== null ? value : {};
    const int = (key, max) => {
        const n = h[key];
        return typeof n === 'number' && Number.isSafeInteger(n) ? Math.max(0, Math.min(max, n)) : 0;
    };
    const rolls = (value, cap, withStacks) => {
        const kept = [];
        if (!Array.isArray(value))
            return kept;
        for (const raw of value) {
            if (typeof raw !== 'object' || raw === null)
                continue;
            const data = raw;
            const base = { formId: data['formId'], buffPercent: data['buffPercent'] };
            if (!isHeroRoll(base) || base.formId === 'h00')
                continue;
            const stack = data['stacks'];
            const stacks = withStacks && typeof stack === 'number' && Number.isSafeInteger(stack) && stack > 0
                ? Math.min(exports.HERO_MAX_REINCARNATIONS, stack) : 0;
            const r = { ...base, ...(stacks > 0 ? { stacks } : {}) };
            const old = kept.find((x) => x.formId === r.formId);
            if (old) {
                old.buffPercent = Math.max(old.buffPercent, r.buffPercent);
                const bestStacks = Math.max(old.stacks ?? 0, r.stacks ?? 0);
                if (bestStacks > 0)
                    old.stacks = bestStacks;
            }
            else if (kept.length < cap)
                kept.push(r);
        }
        return kept;
    };
    const collection = rolls(h['collection'], exports.HERO_FORMS.length, true);
    const equipped = isHeroRoll(h['equipped']) ? h['equipped'] : (0, exports.newHeroProgress)().equipped;
    const owned = collection.find((r) => r.formId === equipped.formId);
    const reincarnations = int('reincarnations', exports.HERO_MAX_REINCARNATIONS);
    const marker = h['offerLevel'];
    const legacyOffer = marker === undefined ||
        typeof marker === 'number' && Number.isSafeInteger(marker) && marker >= 12 && marker <= 18;
    const choices = rolls(h['choices'], 3, false).filter((r) => {
        const rare = discovery_js_1.RARE_HERO_FORMS.find((f) => f.id === r.formId);
        const original = legacyOffer ? legacyPendingRequirements[r.formId] : undefined;
        return rare ? context === undefined || (0, discovery_js_1.requirementsMet)(rare.requirements, context) ||
            original !== undefined && (0, discovery_js_1.requirementsMet)(original, context)
            : (0, exports.heroForm)(r.formId).rank <= unlockedHeroRank(reincarnations);
    });
    const remaining = h['deferRemainingMs'];
    const deferRemainingMs = typeof remaining === 'number' && Number.isFinite(remaining)
        ? Math.max(0, Math.min(exports.HERO_DEFER_MS, Math.ceil(remaining))) : 0;
    const validChoices = choices.length === 3 && new Set(choices.map((r) => (0, exports.heroForm)(r.formId).type)).size === 3 &&
        deferRemainingMs === 0 ? choices : [];
    const offerLevel = pendingOfferLevel(marker);
    return {
        equipped: owned ? { ...owned } : { formId: 'h00', buffPercent: 0 }, collection,
        reincarnations, choices: validChoices,
        deferRemainingMs, offerSerial: int('offerSerial', Number.MAX_SAFE_INTEGER - 1),
        ...(validChoices.length === 3 ? { offerLevel } : {}),
    };
}
/**
 * Three distinct elements: first grows the standard collection, second leaves
 * space for lower tiers/repeats, third reveals eligible rare forms. Each slot
 * uses one selection and one raw-roll draw, including probability branches.
 */
function rollHeroChoices(hero, rng, context) {
    const rank = unlockedHeroRank(hero.reincarnations);
    const available = eligibleHeroForms(hero, context);
    const owned = (f) => hero.collection.some((r) => r.formId === f.id);
    const picked = [];
    const types = new Set();
    for (let i = 0; i < 3; i++) {
        const eligible = available.filter((f) => f.rarity === 'standard' && !types.has(f.type));
        let pool = eligible;
        let draw = Math.max(0, Math.min(1 - Number.EPSILON, rng.next()));
        if (i === 0) {
            const topUnseen = eligible.filter((f) => f.rank === rank && !owned(f));
            const unseen = eligible.filter((f) => !owned(f));
            pool = topUnseen.length ? topUnseen : unseen.length ? unseen : eligible.filter((f) => f.rank === rank);
        }
        else if (i === 1) {
            const repeats = eligible.filter(owned);
            if (repeats.length > 0) {
                if (draw < .4) {
                    pool = repeats;
                    draw /= .4;
                }
                else
                    draw = (draw - .4) / .6;
            }
        }
        else {
            const rare = available.filter((f) => f.rarity === 'rare' && !types.has(f.type));
            const unseen = rare.filter((f) => !context?.seenHeroes?.includes(f.id) && !owned(f));
            if (unseen.length > 0)
                pool = unseen;
            else if (rare.length > 0) {
                if (draw < .25) {
                    pool = rare;
                    draw /= .25;
                }
                else
                    draw = (draw - .25) / .75;
            }
        }
        const f = pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))];
        types.add(f.type);
        picked.push({ formId: f.id, buffPercent: exports.HERO_BUFF_MIN + Math.min(15, Math.floor(rng.next() * 16)) });
    }
    return picked;
}
function applyHeroAction(state, action, rng) {
    const hero = state.hero ? (0, exports.copyHeroProgress)(state.hero) : (0, exports.newHeroProgress)();
    const result = (patch = {}, events = []) => ({
        state: { ...state, hero, ...patch }, events,
    });
    if (action.type === 'heroEquip') {
        const owned = hero.collection.find((r) => r.formId === action.formId);
        if (!owned)
            return { error: 'Uncollected hero form' };
        hero.equipped = { ...owned };
        return result();
    }
    if (!(0, exports.heroReady)(state.level, hero))
        return { error: 'Hero reincarnation is not ready' };
    const context = () => (0, progress_js_1.discoveryContext)(state, (0, exports.heroForm)(hero.equipped.formId)?.type);
    if (action.type === 'heroOffer') {
        if (hero.choices.length > 0)
            return { error: 'An offer is already open' };
        if (hero.offerSerial >= Number.MAX_SAFE_INTEGER - 1)
            return { error: 'Hero offer limit reached' };
        hero.choices = rollHeroChoices(hero, rng, context());
        hero.offerLevel = (0, exports.heroRequiredLevel)(hero.reincarnations);
        hero.offerSerial++;
        return result();
    }
    if (hero.choices.length !== 3 || action.offerSerial !== hero.offerSerial)
        return { error: 'Stale hero offer' };
    if (action.type === 'heroDefer') {
        hero.choices = [];
        delete hero.offerLevel;
        hero.deferRemainingMs = exports.HERO_DEFER_MS;
        return result();
    }
    if (action.type === 'heroReroll') {
        if (state.level < (0, exports.heroRequiredLevel)(hero.reincarnations))
            return { error: 'Reach the next reincarnation level before rerolling' };
        if (hero.offerSerial >= Number.MAX_SAFE_INTEGER - 1)
            return { error: 'Hero offer limit reached' };
        const cost = (0, exports.heroRerollCost)(hero.reincarnations);
        if (state.coins < cost)
            return { error: 'Not enough gold' };
        hero.choices = rollHeroChoices(hero, rng, context());
        hero.offerLevel = (0, exports.heroRequiredLevel)(hero.reincarnations);
        hero.offerSerial++;
        return result({ coins: state.coins - cost });
    }
    const selected = hero.choices.find((r) => r.formId === action.formId);
    if (!selected)
        return { error: 'Hero is not in this offer' };
    const owned = hero.collection.find((r) => r.formId === selected.formId);
    if ((owned?.stacks ?? 0) >= exports.HERO_MAX_REINCARNATIONS)
        return { error: 'Hero mastery limit reached' };
    const projected = projectHeroRoll(hero, selected);
    if (owned)
        Object.assign(owned, projected);
    else
        hero.collection.push({ ...projected });
    hero.equipped = { ...projected };
    hero.reincarnations++;
    hero.choices = [];
    delete hero.offerLevel;
    const monster = (0, monsters_js_1.monsterForIndex)(0, undefined, 11, state.rebirths + 1, hero.reincarnations);
    const souls = state.souls + Math.max(1, Math.floor(state.monster.index / 8));
    return result({ level: 1, xp: 0, monster, monsterHp: monster.maxHp, souls,
        rebirths: state.rebirths + 1 }, [{ type: 'rebirth', souls }]);
}
