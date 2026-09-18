"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HISTORY_LIMIT = void 0;
exports.newProgress = newProgress;
exports.copyProgress = copyProgress;
exports.acquiredDiscoveries = acquiredDiscoveries;
exports.isDiscoveryGoal = isDiscoveryGoal;
exports.isDiscoveryAction = isDiscoveryAction;
exports.parseProgress = parseProgress;
exports.migrateProgress = migrateProgress;
exports.discoveryContext = discoveryContext;
exports.recordReincarnation = recordReincarnation;
// v0.5 lifetime discovery/history. No clocks, randomness, or platform imports.
const discovery_js_1 = require("./discovery.js");
const monsters_js_1 = require("./monsters.js");
exports.HISTORY_LIMIT = 100;
const MAX = Number.MAX_SAFE_INTEGER;
const MAX_REINCARNATIONS = 1_000_000;
// The standard IDs are frozen; rare identity comes from the content catalog.
const isHeroId = (id) => /^h(?:0[1-9]|[1-4][0-9]|50)$/.test(id) ||
    discovery_js_1.RARE_HERO_FORMS.some((form) => form.id === id);
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
const integer = (value, max = MAX) => typeof value === 'number' && Number.isSafeInteger(value) ? Math.max(0, Math.min(max, value)) : 0;
const milliseconds = (value) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(MAX, value)) : 0;
function newProgress(legacyHistory = false) {
    return { playTimeMs: 0, speciesKills: {}, seenMonsters: [], seenHeroes: [], heroCounts: {},
        reincarnationHistory: [], pvpWins: 0, pvpLosses: 0, goldSpent: 0, rareMisses: 0,
        trainingLevel: 0, lureRemaining: 0, shopSerial: 0, legacyHistory,
        codex: { acknowledgedHeroes: [], acknowledgedMonsters: [], goal: null } };
}
function copyProgress(progress) {
    return { ...progress, speciesKills: { ...progress.speciesKills }, heroCounts: { ...progress.heroCounts },
        seenMonsters: [...progress.seenMonsters], seenHeroes: [...progress.seenHeroes],
        reincarnationHistory: progress.reincarnationHistory.map((entry) => ({ ...entry })),
        ...(progress.codex ? { codex: { acknowledgedHeroes: [...progress.codex.acknowledgedHeroes],
                acknowledgedMonsters: [...progress.codex.acknowledgedMonsters],
                goal: progress.codex.goal ? { ...progress.codex.goal } : null } } : {}) };
}
function counts(value, valid, max = MAX) {
    return Object.fromEntries(Object.entries(record(value)).flatMap(([id, value]) => {
        const n = integer(value, max);
        return valid(id) && n > 0 ? [[id, n]] : [];
    }));
}
function ids(value, valid) {
    return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string' && valid(id)))] : [];
}
/** Codex disclosure is acquisition, independent of offer/spawn eligibility history. */
function acquiredDiscoveries(source) {
    const progress = source.progress;
    const positive = (entries) => Object.entries(entries ?? {}).filter(([, count]) => Number.isSafeInteger(count) && count > 0).map(([id]) => id);
    return {
        heroes: ids([...positive(progress?.heroCounts),
            ...(progress?.reincarnationHistory ?? []).map((entry) => entry.formId),
            ...(source.hero?.collection ?? []).map((entry) => entry.formId)], isHeroId),
        monsters: ids(positive(progress?.speciesKills), monsters_js_1.isSpeciesId),
    };
}
function isDiscoveryGoal(value) {
    const goal = record(value);
    return typeof goal.id === 'string' && (goal.kind === 'hero' ? isHeroId(goal.id)
        : goal.kind === 'monster' && (0, monsters_js_1.isSpeciesId)(goal.id));
}
/** Shared validation for IPC and direct engine callers; no unknown IDs enter UI state. */
function isDiscoveryAction(value) {
    const action = record(value);
    if (action.type === 'setDiscoveryGoal')
        return action.goal === null || isDiscoveryGoal(action.goal);
    const validIds = (value, valid) => Array.isArray(value) && value.every((id) => typeof id === 'string' && valid(id));
    return action.type === 'acknowledgeDiscoveries' && validIds(action.heroes, isHeroId) &&
        validIds(action.monsters, monsters_js_1.isSpeciesId);
}
/** Preserve absent v5 fields when parsing a legacy save; migrate only on engine boot. */
function parseProgress(value) {
    if (value === undefined)
        return undefined;
    const p = record(value);
    const seenHeroes = ids(p.seenHeroes, isHeroId);
    const seenMonsters = ids(p.seenMonsters, monsters_js_1.isSpeciesId);
    const codex = record(p.codex);
    const seenNumbers = new Set();
    const history = [];
    if (Array.isArray(p.reincarnationHistory))
        for (const raw of p.reincarnationHistory) {
            const entry = record(raw);
            const n = integer(entry.number, MAX_REINCARNATIONS);
            if (n === 0 || n !== entry.number || seenNumbers.has(n) || typeof entry.formId !== 'string' || !isHeroId(entry.formId) ||
                !Number.isSafeInteger(entry.level) || Number(entry.level) < 1 ||
                !Number.isSafeInteger(entry.buffPercent) || Number(entry.buffPercent) < 10 || Number(entry.buffPercent) > 25 ||
                !Number.isSafeInteger(entry.stacks) || Number(entry.stacks) < 0 || Number(entry.stacks) > MAX_REINCARNATIONS ||
                typeof entry.playTimeMs !== 'number' || !Number.isFinite(entry.playTimeMs) || entry.playTimeMs < 0 || entry.playTimeMs > MAX)
                continue;
            seenNumbers.add(n);
            history.push({ number: n, formId: entry.formId, level: Number(entry.level), playTimeMs: entry.playTimeMs,
                buffPercent: Number(entry.buffPercent), stacks: Number(entry.stacks) });
        }
    return { playTimeMs: milliseconds(p.playTimeMs), speciesKills: counts(p.speciesKills, monsters_js_1.isSpeciesId),
        seenMonsters, seenHeroes,
        heroCounts: counts(p.heroCounts, isHeroId, MAX_REINCARNATIONS),
        reincarnationHistory: history.sort((a, b) => a.number - b.number).slice(-exports.HISTORY_LIMIT),
        pvpWins: integer(p.pvpWins), pvpLosses: integer(p.pvpLosses), goldSpent: integer(p.goldSpent),
        rareMisses: integer(p.rareMisses, 11), trainingLevel: integer(p.trainingLevel, 10),
        lureRemaining: integer(p.lureRemaining, 20), shopSerial: integer(p.shopSerial, MAX - 1),
        legacyHistory: p.legacyHistory === true,
        ...(Object.hasOwn(p, 'codex') ? { codex: {
                // Acquisition needs the permanent collection too; normalize with that context on boot/UI.
                acknowledgedHeroes: ids(codex.acknowledgedHeroes, isHeroId),
                acknowledgedMonsters: ids(codex.acknowledgedMonsters, monsters_js_1.isSpeciesId),
                goal: isDiscoveryGoal(codex.goal) ? { kind: codex.goal.kind, id: codex.goal.id } : null,
            } } : {}) };
}
/** Keep spawn/offer history; normalize public ACK without inventing past monster kills. */
function migrateProgress(source, currentMonsterSpecies) {
    const progress = source.progress ? copyProgress(source.progress)
        : newProgress(source.killCount > 0 || (source.hero?.reincarnations ?? 0) > 0);
    if (!source.progress) {
        for (const owned of source.hero?.collection ?? []) {
            if (!isHeroId(owned.formId))
                continue;
            progress.heroCounts[owned.formId] = 1;
        }
        for (const c of source.companions ?? [])
            if ((0, monsters_js_1.isSpeciesId)(c.speciesId) && !progress.seenMonsters.includes(c.speciesId)) {
                progress.seenMonsters.push(c.speciesId);
            }
    }
    for (const hero of [...(source.hero?.collection ?? []), ...(source.hero?.choices ?? [])]) {
        if (isHeroId(hero.formId) && !progress.seenHeroes.includes(hero.formId))
            progress.seenHeroes.push(hero.formId);
    }
    const monster = currentMonsterSpecies ?? source.monsterSpeciesId;
    if (monster && (0, monsters_js_1.isSpeciesId)(monster) && !progress.seenMonsters.includes(monster))
        progress.seenMonsters.push(monster);
    const acquired = acquiredDiscoveries({ ...source, progress });
    progress.codex = source.progress?.codex ? {
        acknowledgedHeroes: progress.codex.acknowledgedHeroes.filter((id) => acquired.heroes.includes(id)),
        acknowledgedMonsters: progress.codex.acknowledgedMonsters.filter((id) => acquired.monsters.includes(id)),
        goal: progress.codex.goal,
    } : { acknowledgedHeroes: acquired.heroes, acknowledgedMonsters: acquired.monsters, goal: null };
    return progress;
}
/** Shared inputs for the same condition evaluator in the engine and codex. */
function discoveryContext(source, equippedType) {
    const progress = source.progress ?? migrateProgress(source);
    const elementKills = { fire: 0, water: 0, wind: 0, earth: 0, dark: 0 };
    for (const [id, count] of Object.entries(progress.speciesKills))
        if ((0, monsters_js_1.isSpeciesId)(id)) {
            const type = (0, monsters_js_1.typeOf)(id);
            elementKills[type] = Math.min(MAX, elementKills[type] + count);
        }
    const heroFamilyHistory = Array(10).fill(0);
    for (const [id, count] of Object.entries(progress.heroCounts)) {
        const n = Number(id.slice(1));
        if (n >= 1 && n <= 50) {
            const family = (n - 1) % 10;
            heroFamilyHistory[family] = Math.min(MAX, heroFamilyHistory[family] + count);
        }
    }
    return { killCount: source.killCount, playTimeMs: progress.playTimeMs, speciesKills: progress.speciesKills,
        elementKills, heroCounts: progress.heroCounts, heroFamilyHistory, reincarnations: source.hero?.reincarnations ?? 0,
        uniqueHeroes: Object.keys(progress.heroCounts).length, equippedType, seenMonsters: progress.seenMonsters, seenHeroes: progress.seenHeroes,
        pvpWins: progress.pvpWins, goldSpent: progress.goldSpent };
}
function recordReincarnation(progress, hero, level) {
    const chosen = hero.equipped;
    progress.heroCounts[chosen.formId] = Math.min(MAX_REINCARNATIONS, (progress.heroCounts[chosen.formId] ?? 0) + 1);
    progress.reincarnationHistory.push({ number: hero.reincarnations, formId: chosen.formId, level,
        playTimeMs: progress.playTimeMs, buffPercent: chosen.buffPercent, stacks: chosen.stacks ?? 0 });
    progress.reincarnationHistory = progress.reincarnationHistory.slice(-exports.HISTORY_LIMIT);
}
