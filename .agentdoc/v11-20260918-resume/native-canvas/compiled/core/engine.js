"use strict";
// Attack engine — SPEC F06/F07/F08, Assumption 8 (damage applies at input
// time; animation/timing state lives elsewhere). Pure TypeScript, zero
// imports of electron/DOM/node. All randomness comes from the injected Rng.
Object.defineProperty(exports, "__esModule", { value: true });
exports.eligibleMonsterIds = exports.PARTY_STAGGER_MS = exports.COMPANION_ATTACK_MS = exports.RELEASES_PER_SOUL = exports.CAPTURE_CHANCE = void 0;
exports.createEngine = createEngine;
const collection_js_1 = require("./collection.js");
const fever_js_1 = require("./fever.js");
const formulas_js_1 = require("./formulas.js");
const loot_js_1 = require("./loot.js");
const monsters_js_1 = require("./monsters.js");
const rng_js_1 = require("./rng.js");
const types_chart_js_1 = require("./types-chart.js");
const save_js_1 = require("./save.js");
const hero_js_1 = require("./hero.js");
const economy_js_1 = require("./economy.js");
const discovery_js_1 = require("./discovery.js");
const progression_js_1 = require("./progression.js");
const progress_js_1 = require("./progress.js");
const gold_js_1 = require("./gold.js");
const equipment_js_1 = require("./equipment.js");
/** Chance that a boss kill captures the boss as a companion (Assumption 23). */
exports.CAPTURE_CHANCE = progression_js_1.PROGRESSION_PARAMETERS.captureChance;
/**
 * Releases needed for one soul. 2 keeps the 30 min payout near +11 souls. The
 * measured effect on pacing is +0.16% kills over 100 seeds (an all-at-once
 * +10 souls control bounds it at +4.3%), well inside the ±5% budget.
 */
exports.RELEASES_PER_SOUL = 2;
/** One companion volley per this many engine milliseconds (SPEC F35). */
exports.COMPANION_ATTACK_MS = 1000;
/**
 * Extra swing delay per party rank (back → front) on top of the species'
 * attack delay, so even same-species members never land together (2026-09-06).
 */
exports.PARTY_STAGGER_MS = 70;
/** Non-deterministic seed for production use; tests ALWAYS inject an Rng. */
function randomSeed() {
    return (Math.random() * 0x100000000) >>> 0;
}
/**
 * Every engine boots with fever cold (it is never persisted, SPEC F34).
 * ponytail: a placeholder — getState() always recomputes it from the clock,
 * so nothing inside the engine may read `state.fever`.
 */
const COLD_FEVER = { active: false, remainingMs: 0 };
const eligibleRareForState = (state) => (0, discovery_js_1.eligibleRareMonsters)((0, progress_js_1.discoveryContext)(state, (0, hero_js_1.heroForm)(state.hero?.equipped.formId ?? '')?.type));
/** Eligibility, independent of whether a species has already spawned or been killed. */
const eligibleMonsterIds = (state) => [...monsters_js_1.COMMON_SPECIES_IDS, ...eligibleRareForState(state).map(monster => monster.id)];
exports.eligibleMonsterIds = eligibleMonsterIds;
/**
 * Save shapes are assumed well-formed here — tolerant parsing of untrusted
 * JSON is save.ts's parseSave(). The engine still clamps the resumed
 * monsterHp into [1n, maxHp] so a stale save can never spawn an already-dead
 * or over-healed monster.
 */
function initialState(save, rng) {
    if (!save) {
        const monster = randomMonster(0, rng);
        return {
            level: 1,
            xp: 0,
            killCount: 0,
            coins: 0n,
            pvpGoldNet: '0',
            pvpGoldDebt: '0',
            items: {},
            monster,
            monsterHp: monster.maxHp,
            companions: [],
            nextCompanionId: 1,
            earlyCaptureUsed: 0,
            souls: 0,
            releasedCount: 0,
            rebirths: 0,
            bestIndex: 0,
            pvpParty: [],
            fever: COLD_FEVER,
        };
    }
    const monster = (0, monsters_js_1.monsterForIndex)(save.monsterIndex, save.monsterSpeciesId, save.monsterCurveVersion ?? 10, save.monsterCurveRebirths ?? 0, save.hero ? (0, hero_js_1.parseHeroProgress)(save.hero)?.reincarnations ?? 0 : 0);
    return {
        level: save.level,
        xp: save.xp,
        killCount: save.killCount,
        coins: (0, gold_js_1.currency)(save.coins),
        pvpGoldNet: save.pvpGoldNet ?? '0',
        pvpGoldDebt: save.pvpGoldDebt ?? '0',
        items: { ...save.items },
        monster,
        // Resume exactly, clamped into [1n, maxHp] so a stale save can never
        // spawn an already-dead or over-healed monster.
        monsterHp: clampHp(BigInt(save.monsterHp), monster.maxHp),
        companions: save.companions.map((c) => ({ ...c })),
        nextCompanionId: save.nextCompanionId,
        earlyCaptureUsed: save.earlyCaptureUsed ?? Math.min(5, Math.max(0, save.nextCompanionId - 1)),
        souls: save.souls,
        releasedCount: save.releasedCount ?? 0,
        rebirths: save.rebirths,
        bestIndex: Math.max(save.bestIndex, monster.index),
        pvpParty: [...save.pvpParty],
        fever: COLD_FEVER,
        ...(save.hero ? { hero: (0, hero_js_1.parseHeroProgress)(save.hero) } : {}),
    };
}
/** Clamp a resumed hp into [1n, maxHp]. */
const clampHp = (hp, maxHp) => (hp < 1n ? 1n : hp > maxHp ? maxHp : hp);
/** One independent, uniform species draw per spawn, including bosses. */
function randomMonster(index, rng) {
    return (0, monsters_js_1.monsterForIndex)(index, monsters_js_1.COMMON_SPECIES_IDS[Math.floor(rng.next() * monsters_js_1.COMMON_SPECIES_IDS.length)] ?? monsters_js_1.COMMON_SPECIES_IDS[0]);
}
/**
 * Create the game reducer. Every attack(source) call rolls a crit (one rng
 * draw), applies damage immediately, and on a kill rolls loot (rollLoot's own
 * draws), grants XP, levels up while the threshold is met (carry-over: the
 * threshold is subtracted), and spawns monster index+1 at full HP.
 *
 * Event order on a kill (SPEC F07/F33):
 * attack, monsterHit, monsterKilled, itemDropped[, bossCaptured][, levelUp...],
 * monsterSpawned.
 */
function createEngine(save, rng = (0, rng_js_1.mulberry32)(randomSeed()), options = {}) {
    let observedSeed = options.equipmentSeed;
    const suppliedRng = rng;
    rng = { next: () => { const value = suppliedRng.next(); observedSeed ??= Math.floor(value * 0x100000000); return value; } };
    const upgraded = save ? (0, save_js_1.upgradeSave)(save) : null;
    const state = initialState(upgraded, rng);
    state.equipment = upgraded?.equipment ? (0, equipment_js_1.parseEquipment)(upgraded.equipment) : (0, equipment_js_1.newEquipment)(options.now?.() ?? 0, observedSeed ?? 0x10e010);
    let equipmentBatch = null;
    let actionError = null;
    const batch = () => equipmentBatch ?? (0, equipment_js_1.createEquipmentBatch)();
    const baseAttack = () => (0, economy_js_1.trainedHeroPower)((0, hero_js_1.heroAttackPower)(state.level, state.souls, state.hero?.reincarnations), state.progress?.trainingLevel);
    const restoredEpic = equipment_js_1.EPIC_BOSSES.find(boss => boss.id === upgraded?.monsterEpicBossId && boss.speciesId === state.monster.speciesId);
    if (state.monster.boss && restoredEpic) {
        state.monster.epicBossId = restoredEpic.id;
        state.monster.name = restoredEpic.name + ' BOSS';
    }
    const savedProgress = save && 'progress' in save ? save.progress : undefined;
    state.progress = (0, progress_js_1.migrateProgress)({ ...state, hero: state.hero ? { ...state.hero, choices: [] } : undefined,
        progress: save ? savedProgress : (0, progress_js_1.newProgress)() }, state.monster.speciesId);
    if (state.hero)
        state.hero = (0, hero_js_1.parseHeroProgress)(state.hero, (0, progress_js_1.discoveryContext)(state, (0, hero_js_1.heroForm)(state.hero.equipped.formId)?.type));
    for (const choice of state.hero?.choices ?? [])
        if (!state.progress.seenHeroes.includes(choice.formId))
            state.progress.seenHeroes.push(choice.formId);
    // Open candidates remain seen history; migration acknowledges only actual acquisitions.
    /** The engine clock (Assumption 39) — advanced ONLY by tick(dtMs). */
    let clockMs = 0;
    let fever = (0, fever_js_1.createFever)();
    const feverView = () => ({
        active: (0, fever_js_1.feverActive)(fever, clockMs),
        remainingMs: Math.max(0, fever.activeUntil - clockMs),
    });
    (0, equipment_js_1.refreshEquipmentShop)(state.equipment, options.now?.() ?? 0, state.level);
    (0, equipment_js_1.autoEquipEquipment)(state.equipment, state.hero?.equipped.formId ?? 'h00', state.level, batch(), [], true, baseAttack(), undefined, true);
    /** Next volley window start on the engine clock (SPEC F35). */
    let nextWindowMs = exports.COMPANION_ATTACK_MS;
    /** Booked swings, in landing order: [at, companionId]. */
    let pending = [];
    /** One draw per spawn, split into conditional uniform pools. No extra draws on reload. */
    function spawn(index) {
        const progress = state.progress;
        const eligible = eligibleRareForState(state);
        const roll = Math.min(1 - Number.EPSILON, Math.max(0, rng.next()));
        let species;
        if (eligible.length === 0) {
            species = monsters_js_1.COMMON_SPECIES_IDS[Math.floor(roll * monsters_js_1.COMMON_SPECIES_IDS.length)];
        }
        else {
            const chance = progress.lureRemaining > 0 ? 0.25 : 0.12;
            const forced = progress.rareMisses >= 11;
            const rare = forced || roll < chance;
            const pick = forced ? roll : rare ? roll / chance : (roll - chance) / (1 - chance);
            if (rare) {
                const unseen = eligible.filter((monster) => !progress.seenMonsters.includes(monster.id));
                const pool = unseen.length > 0 ? unseen : eligible;
                species = pool[Math.min(pool.length - 1, Math.floor(pick * pool.length))].id;
            }
            else
                species = monsters_js_1.COMMON_SPECIES_IDS[Math.min(monsters_js_1.COMMON_SPECIES_IDS.length - 1, Math.floor(pick * monsters_js_1.COMMON_SPECIES_IDS.length))];
            progress.rareMisses = rare ? 0 : progress.rareMisses + 1;
            if (progress.lureRemaining > 0)
                progress.lureRemaining--;
        }
        state.monster = (0, monsters_js_1.monsterForIndex)(index, species, 11, state.rebirths, state.hero?.reincarnations ?? 0);
        if (state.monster.boss) {
            const epic = (0, equipment_js_1.rollEpicEncounter)(state.equipment, (0, progress_js_1.discoveryContext)(state, (0, hero_js_1.heroForm)(state.hero?.equipped.formId ?? '')?.type));
            if (epic) {
                state.monster = (0, monsters_js_1.monsterForIndex)(index, epic.speciesId, 11, state.rebirths, state.hero?.reincarnations ?? 0);
                state.monster.epicBossId = epic.id;
                state.monster.name = epic.name + ' BOSS';
                species = epic.speciesId;
            }
        }
        state.monsterHp = state.monster.maxHp;
        if (!progress.seenMonsters.includes(species))
            progress.seenMonsters.push(species);
    }
    /**
     * The one damage path: hero attacks and companion volleys both land here,
     * so a kill always chains identically — monsterKilled, loot, capture,
     * level-ups, then the next monster at full HP (SPEC F07/F33/F35).
     */
    function applyDamage(damage, events) {
        state.monsterHp = state.monsterHp > damage ? state.monsterHp - damage : 0n;
        events.push({
            type: 'monsterHit',
            hpAfter: state.monsterHp,
            maxHp: state.monster.maxHp,
        });
        if (state.monsterHp !== 0n)
            return;
        const killed = state.monster;
        state.killCount += 1;
        const progress = state.progress;
        progress.speciesKills[killed.speciesId] = Math.min(Number.MAX_SAFE_INTEGER, (progress.speciesKills[killed.speciesId] ?? 0) + 1);
        const xpGained = (0, formulas_js_1.xpReward)(killed.index) * (killed.boss ? monsters_js_1.BOSS_XP_MULT : 1);
        events.push({ type: 'monsterKilled', monster: { ...killed }, xpGained });
        const drops = (0, loot_js_1.rollLoot)(rng, killed.index);
        // rollLoot always puts the coin first (loot.ts) — bosses pay 5x coins.
        const coin = drops[0];
        if (killed.boss && coin) {
            coin.amount *= monsters_js_1.BOSS_COIN_MULT;
        }
        for (const drop of drops) {
            if (drop.item.kind === 'coin') {
                (0, gold_js_1.creditGold)(state, BigInt(drop.amount));
            }
            else {
                state.items[drop.item.id] = (state.items[drop.item.id] ?? 0) + drop.amount;
            }
        }
        events.push({ type: 'itemDropped', drops });
        if (killed.boss) {
            const item = (0, equipment_js_1.rollBossEquipment)(state.equipment, state.level, killed.epicBossId);
            if (item) {
                (0, equipment_js_1.acquireEquipment)(state.equipment, item, state.hero?.equipped.formId ?? 'h00', state.level, batch(), baseAttack());
                events.push({ type: 'equipmentDropped', item: { ...item } }, { type: 'equipmentChanged', revision: state.equipment.revision });
            }
        }
        // One draw per boss, including a guarantee. The bounded quota includes
        // accepted transfers; the separate allocator may stay high after a reset.
        const captureRoll = killed.boss ? rng.next() : 1;
        const firstCapture = progression_js_1.PROGRESSION_PARAMETERS.firstCaptureBossIndex;
        const drew = killed.boss && (captureRoll < exports.CAPTURE_CHANCE || firstCapture !== null &&
            (state.earlyCaptureUsed ?? 0) < progression_js_1.PROGRESSION_PARAMETERS.earlyCaptureCount && killed.index >= firstCapture &&
            state.companions.length < collection_js_1.ROSTER_CAP);
        const canAllocate = drew && Number.isSafeInteger(state.nextCompanionId) && state.nextCompanionId >= 1 &&
            state.nextCompanionId < Number.MAX_SAFE_INTEGER &&
            !state.companions.some(companion => companion.id === `c${state.nextCompanionId}`);
        if (drew && state.companions.length < collection_js_1.ROSTER_CAP && canAllocate) {
            const companion = {
                id: `c${state.nextCompanionId++}`,
                speciesId: killed.speciesId,
                bossIndex: killed.index,
                level: 1,
                stars: 0,
            };
            state.companions.push(companion);
            state.earlyCaptureUsed = Math.min(5, (state.earlyCaptureUsed ?? 0) + 1);
            events.push({ type: 'bossCaptured', companion: { ...companion } });
        }
        else if (drew && state.companions.length >= collection_js_1.ROSTER_CAP) {
            // A full roster used to void the draw in silence. Release it instead:
            // every second release pays one soul, and the event says whether the
            // roster's weakest keeper was worth less than what just walked away.
            state.releasedCount += 1;
            const souls = state.releasedCount % exports.RELEASES_PER_SOUL === 0 ? 1 : 0;
            state.souls += souls;
            const released = (0, collection_js_1.companionPower)({ id: '', speciesId: killed.speciesId, bossIndex: killed.index, level: 1, stars: 0 });
            const weakest = state.companions.reduce((min, c) => ((0, collection_js_1.companionPower)(c) < min ? (0, collection_js_1.companionPower)(c) : min), released);
            events.push({ type: 'companionReleased', speciesId: killed.speciesId, bossIndex: killed.index,
                souls, strongerThanWeakest: weakest < released });
        }
        state.xp += xpGained;
        while (state.xp >= (0, formulas_js_1.xpToNext)(state.level)) {
            state.xp -= (0, formulas_js_1.xpToNext)(state.level);
            state.level += 1;
            events.push({ type: 'levelUp', newLevel: state.level });
            const newlyEligible = new Set((0, equipment_js_1.equipmentItems)(state.equipment).filter(item => (0, equipment_js_1.equipmentTemplate)(item.templateId).requiredLevel === state.level).map(item => item.id));
            (0, equipment_js_1.autoEquipEquipment)(state.equipment, state.hero?.equipped.formId ?? 'h00', state.level, batch(), [], true, baseAttack(), newlyEligible);
            state.equipment.revision++;
        }
        spawn(killed.index + 1);
        state.bestIndex = Math.max(state.bestIndex, state.monster.index);
        events.push({ type: 'monsterSpawned', monster: { ...state.monster } });
    }
    const engine = {
        lastActionError: () => actionError,
        beginEquipmentBatch() { equipmentBatch ??= (0, equipment_js_1.createEquipmentBatch)(); },
        endEquipmentBatch() { equipmentBatch = null; return []; },
        refreshShop(now) {
            return (0, equipment_js_1.refreshEquipmentShop)(state.equipment, now, state.level) ? [{ type: 'equipmentChanged', revision: state.equipment.revision }] : [];
        },
        attack(source) {
            const events = [];
            // The input stamps the clock and may light fever BEFORE its own attack
            // event, so the 20th input already lands at x3 (SPEC F34).
            const lit = (0, fever_js_1.feverInput)(fever, clockMs);
            fever = lit.fever;
            if (lit.started)
                events.push({ type: 'feverStart' });
            const crit = rng.next() < formulas_js_1.CRIT_CHANCE + Number((0, equipment_js_1.equipmentBonus)(state.equipment?.loadout, 'critical') > 4000n ? 4000n : (0, equipment_js_1.equipmentBonus)(state.equipment?.loadout, 'critical')) / 10000;
            const damage = (0, equipment_js_1.displayedHeroAttack)(state) *
                (crit ? BigInt(formulas_js_1.CRIT_MULT) : 1n) *
                ((0, fever_js_1.feverActive)(fever, clockMs) ? fever_js_1.FEVER_MULT : 1n);
            events.push({ type: 'attack', damage, crit, source });
            applyDamage(damage, events);
            return events;
        },
        tick(dtMs) {
            const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
            clockMs += dt;
            state.progress.playTimeMs = Math.min(Number.MAX_SAFE_INTEGER, state.progress.playTimeMs + dt);
            const events = [];
            // Swings landing inside this tick read fever as it stood when the tick began.
            if (state.hero && state.hero.deferRemainingMs > 0) {
                state.hero.deferRemainingMs = Math.max(0, state.hero.deferRemainingMs - dt);
                if (state.hero.deferRemainingMs === 0)
                    events.push({ type: 'heroReady' });
            }
            const feverAtStart = fever;
            const cooled = (0, fever_js_1.feverTick)(fever, clockMs);
            fever = cooled.fever;
            if (cooled.ended)
                events.push({ type: 'feverEnd' });
            // Companion volleys (SPEC F35; staggered since 2026-09-06): every
            // COMPANION_ATTACK_MS a window opens and books ONE swing per party member
            // at windowStart + the species' attack delay + PARTY_STAGGER_MS × rank.
            // Swings land in time order, each typed against the monster standing
            // there when it lands (F63) and tripled while fever burns at that moment.
            // The party is re-picked at every window: a capture, a fuse or the next
            // monster's type between windows changes who fights. Companions never crit.
            for (;;) {
                const due = pending[0]?.at ?? Number.POSITIVE_INFINITY;
                if (nextWindowMs <= clockMs && nextWindowMs <= due) {
                    const windowStart = nextWindowMs;
                    const booked = (0, collection_js_1.activeFieldCompanions)(state.companions, state.monster.type, state.hero?.equipped, state.hero?.reincarnations ?? 0, state.monster.curveVersion ?? 10).map((c, rank) => ({
                        at: windowStart + (0, monsters_js_1.attackDelayOf)(c.speciesId) + rank * exports.PARTY_STAGGER_MS,
                        id: c.id,
                    }));
                    pending = [...pending, ...booked].sort((a, b) => a.at - b.at);
                    nextWindowMs += exports.COMPANION_ATTACK_MS;
                    continue;
                }
                if (due > clockMs)
                    break;
                const fire = pending.shift();
                if (fire === undefined)
                    break;
                const c = state.companions.find((x) => x.id === fire.id);
                if (c === undefined)
                    continue; // consumed, fused or stolen since it was booked
                const mult = (0, fever_js_1.feverActive)(feverAtStart, fire.at) ? fever_js_1.FEVER_MULT : 1n;
                const attacker = (0, monsters_js_1.typeOf)(c.speciesId);
                const defender = state.monster.type;
                const damage = (0, types_chart_js_1.effectivePower)((0, hero_js_1.heroBuffedPower)((0, collection_js_1.fieldCompanionPower)(c, state.hero?.reincarnations ?? 0, state.monster.curveVersion ?? 10), attacker, state.hero?.equipped) *
                    (10000n + (0, equipment_js_1.equipmentBonus)(state.equipment?.loadout, 'party')) / 10000n, attacker, defender) * mult;
                events.push({
                    type: 'companionAttack',
                    companionId: c.id,
                    speciesId: c.speciesId,
                    damage,
                    effectiveness: (0, types_chart_js_1.effectiveness)(attacker, defender),
                });
                applyDamage(damage, events);
            }
            return events;
        },
        apply(a) {
            actionError = null;
            if (a.type === 'syncPvpProgress') {
                if ([a.wins, a.losses].every((value) => Number.isSafeInteger(value) && value >= 0)) {
                    state.progress.pvpWins = a.wins;
                    state.progress.pvpLosses = a.losses;
                }
                return [];
            }
            const previousLevel = state.level;
            const previousCoins = state.coins;
            if (a.type === 'heroEquip' && a.formId === state.hero?.equipped.formId)
                return [];
            const currentBatch = batch();
            const result = (0, equipment_js_1.isEquipmentAction)(a) ? (0, equipment_js_1.applyEquipmentAction)(state, a, currentBatch) : a.type === 'heroOffer' || a.type === 'heroChoose' || a.type === 'heroReroll' ||
                a.type === 'heroDefer' || a.type === 'heroEquip'
                ? (0, hero_js_1.applyHeroAction)(state, a, rng) : a.type === 'shopBuy' ? (0, economy_js_1.applyEconomyAction)(state, a) : (0, collection_js_1.applyCollection)(state, a);
            if ('error' in result) {
                actionError = result.error;
                return [];
            }
            if (a.type === 'heroEquip' || a.type === 'heroChoose' || a.type === 'rebirth') {
                const equipment = (0, equipment_js_1.copyEquipment)(state.equipment);
                const confirmation = 'equipmentConfirmation' in a ? a.equipmentConfirmation : undefined;
                const target = a.type === 'rebirth' ? state.hero?.equipped.formId ?? 'h00' : a.formId;
                if (confirmation && (confirmation.targetFormId !== target ||
                    (a.type === 'heroChoose' ? confirmation.offerSerial !== a.offerSerial : confirmation.offerSerial !== undefined))) {
                    actionError = 'Hero change confirmation is stale';
                    return [];
                }
                if (!(0, equipment_js_1.confirmHeroChange)(equipment, confirmation, currentBatch)) {
                    actionError = 'Confirm the current temporary equipment before changing heroes';
                    return [];
                }
                result.state.equipment = equipment;
                (0, equipment_js_1.autoEquipEquipment)(equipment, result.state.hero?.equipped.formId ?? 'h00', result.state.level, currentBatch, [], false, (0, economy_js_1.trainedHeroPower)((0, hero_js_1.heroAttackPower)(result.state.level, result.state.souls, result.state.hero?.reincarnations), result.state.progress?.trainingLevel), undefined, true);
                equipment.revision++;
                result.events.push({ type: 'equipmentChanged', revision: equipment.revision });
            }
            // applyCollection is total and copies everything; folding its fresh
            // state back in keeps engine-owned extras (fever) that it carried over.
            Object.assign(state, result.state);
            const progress = state.progress;
            if (a.type === 'heroOffer' || a.type === 'heroReroll') {
                for (const choice of state.hero?.choices ?? [])
                    if (!progress.seenHeroes.includes(choice.formId))
                        progress.seenHeroes.push(choice.formId);
            }
            if (a.type === 'heroReroll')
                progress.goldSpent += previousCoins - state.coins;
            if (a.type === 'heroChoose' && state.hero)
                (0, progress_js_1.recordReincarnation)(progress, state.hero, previousLevel);
            if (a.type === 'rebirth' || a.type === 'heroChoose') {
                spawn(0);
            }
            return result.events;
        },
        getState() {
            return {
                ...state,
                fever: feverView(),
                monster: { ...state.monster },
                items: { ...state.items },
                companions: state.companions.map((c) => ({ ...c })),
                pvpParty: [...state.pvpParty],
                ...(state.hero ? { hero: (0, hero_js_1.copyHeroProgress)(state.hero) } : {}),
                progress: (0, progress_js_1.copyProgress)(state.progress),
                equipment: (0, equipment_js_1.copyEquipment)(state.equipment),
            };
        },
        toSave() {
            return {
                version: 4,
                level: state.level,
                xp: state.xp,
                killCount: state.killCount,
                coins: String(state.coins),
                pvpGoldNet: state.pvpGoldNet ?? '0',
                pvpGoldDebt: state.pvpGoldDebt ?? '0',
                items: { ...state.items },
                monsterIndex: state.monster.index,
                monsterSpeciesId: state.monster.speciesId,
                monsterHp: String(state.monsterHp),
                monsterCurveVersion: state.monster.curveVersion,
                monsterCurveRebirths: state.monster.curveRebirths,
                companions: state.companions.map((c) => ({ ...c })),
                nextCompanionId: state.nextCompanionId,
                earlyCaptureUsed: state.earlyCaptureUsed,
                souls: state.souls,
                releasedCount: state.releasedCount,
                rebirths: state.rebirths,
                bestIndex: state.bestIndex,
                pvpParty: [...state.pvpParty],
                ...(state.hero ? { hero: (0, hero_js_1.copyHeroProgress)(state.hero) } : {}),
                progress: (0, progress_js_1.saveProgress)(state.progress),
                equipment: (0, equipment_js_1.copyEquipment)(state.equipment),
                ...(state.monster.epicBossId ? { monsterEpicBossId: state.monster.epicBossId } : {}),
            };
        },
    };
    const transaction = (operation) => {
        const ownBatch = equipmentBatch === null;
        equipmentBatch ??= (0, equipment_js_1.createEquipmentBatch)();
        try {
            return operation();
        }
        finally {
            if (ownBatch)
                equipmentBatch = null;
        }
    };
    return { ...engine, attack: source => transaction(() => engine.attack(source)),
        tick: dt => transaction(() => engine.tick(dt)), apply: action => transaction(() => engine.apply(action)) };
}
