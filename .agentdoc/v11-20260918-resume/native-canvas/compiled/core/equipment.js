"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellPrice = exports.expansionCost = exports.enhancementCost = exports.equipmentItems = exports.equippedItems = exports.itemAttack = exports.copyEquipment = exports.epicLootForBoss = exports.equipmentName = exports.equipmentTemplate = exports.EQUIPMENT_CATALOG = exports.eligibleEpicBosses = exports.EPIC_BOSSES = exports.equipmentJob = exports.RARITY_COLORS = exports.WEAPON_TYPES = exports.EQUIPMENT_RARITIES = exports.EQUIPMENT_BALANCE = exports.createEquipmentBatch = void 0;
exports.isEquipmentItem = isEquipmentItem;
exports.newEquipment = newEquipment;
exports.canEquip = canEquip;
exports.loadoutAttack = loadoutAttack;
exports.displayedHeroAttack = displayedHeroAttack;
exports.equipmentBonus = equipmentBonus;
exports.parseEquipment = parseEquipment;
exports.createEquipmentItem = createEquipmentItem;
exports.refreshEquipmentShop = refreshEquipmentShop;
exports.autoEquipEquipment = autoEquipEquipment;
exports.heroChangeWarning = heroChangeWarning;
exports.confirmHeroChange = confirmHeroChange;
exports.acquireEquipment = acquireEquipment;
exports.rollBossEquipment = rollBossEquipment;
exports.rollEpicEncounter = rollEpicEncounter;
exports.enhancementSuccess = enhancementSuccess;
exports.randomBelow = randomBelow;
exports.affordableEquipmentCost = affordableEquipmentCost;
exports.formatEquipmentCost = formatEquipmentCost;
exports.isEquipmentAction = isEquipmentAction;
exports.applyEquipmentAction = applyEquipmentAction;
exports.heroCombatSnapshot = heroCombatSnapshot;
exports.isHeroCombatSnapshot = isHeroCombatSnapshot;
const hero_js_1 = require("./hero.js");
const economy_js_1 = require("./economy.js");
const discovery_js_1 = require("./discovery.js");
const rng_js_1 = require("./rng.js");
const gold_js_1 = require("./gold.js");
const progress_js_1 = require("./progress.js");
const createEquipmentBatch = () => ({ overflowStarted: false, heroChanged: false });
exports.createEquipmentBatch = createEquipmentBatch;
exports.EQUIPMENT_BALANCE = Object.freeze({
    requiredLevels: [1, 5, 10, 15], weaponAttack: [8, 20, 50, 100],
    rarityPower: [1, 2, 4, 8], prices: [4500, 18000, 72000, 288000],
    enhanceBase: [100, 400, 1600, 6400],
    initialCapacity: 24, expansionSlots: 8, expansionBase: 3000,
    shopRefreshMs: 3_600_000, stockCount: 12, successK: 19,
    bossDropBps: 3000, epicEncounterBps: 400, epicDropBps: 500,
});
exports.EQUIPMENT_RARITIES = ['common', 'uncommon', 'rare', 'epic'];
exports.WEAPON_TYPES = ['sword', 'greatsword', 'spear', 'gun', 'dagger', 'staff', 'hammer', 'gauntlet'];
exports.RARITY_COLORS = {
    common: '#d5dbe1', uncommon: '#63cf8b', rare: '#68b8ff', epic: '#de8aff',
};
// Explicit costume/archetype membership; h00 deliberately has no class entry.
const JOB_FORMS = [
    ['h01', 'h11', 'h21', 'h31', 'h41', 'h51', 'h69'],
    ['h02', 'h12', 'h22', 'h32', 'h42', 'h56', 'h59'],
    ['h03', 'h13', 'h23', 'h33', 'h43', 'h60', 'h64'],
    ['h04', 'h14', 'h24', 'h34', 'h44', 'h53', 'h63'],
    ['h05', 'h15', 'h25', 'h35', 'h45', 'h52', 'h67'],
    ['h06', 'h16', 'h26', 'h36', 'h46', 'h54', 'h66'],
    ['h07', 'h17', 'h27', 'h37', 'h47', 'h55', 'h57'],
    ['h08', 'h18', 'h28', 'h38', 'h48', 'h61'],
    ['h09', 'h19', 'h29', 'h39', 'h49', 'h58', 'h62', 'h65'],
    ['h10', 'h20', 'h30', 'h40', 'h50', 'h68', 'h70'],
];
const HERO_JOBS = Object.freeze(Object.fromEntries(JOB_FORMS.flatMap((forms, job) => forms.map(id => [id, job]))));
const equipmentJob = (formId) => formId === 'h00' ? undefined : HERO_JOBS[formId] ?? -1;
exports.equipmentJob = equipmentJob;
const WEAPON_JOBS = {
    sword: [0, 5, 8], greatsword: [0, 5, 8], spear: [1, 8], gun: [2], dagger: [0, 4],
    staff: [3, 6, 9], hammer: [3, 5, 8], gauntlet: [4, 7],
};
exports.EPIC_BOSSES = [
    ['crownwyrm', '태양 왕관용'], ['furnaceox', '심장 용광로소'], ['tideleviathan', '왕해 물결고래'],
    ['stormmanta', '천뢰 폭풍가오리'], ['cryptcervid', '망각 묘비사슴'], ['starvoid', '무한 별먹이'],
    ['rootcolossus', '태초 뿌리거인'], ['arenakite', '무패 투기장솔개'],
].map(([speciesId, name], i) => ({ id: `legend-${i + 1}`, speciesId: speciesId, name: name,
    requirements: [{ kind: 'totalKills', count: 200 + i * 150 }] }));
const eligibleEpicBosses = (context) => exports.EPIC_BOSSES.filter(boss => (0, discovery_js_1.requirementsMet)(boss.requirements, context));
exports.eligibleEpicBosses = eligibleEpicBosses;
const WEAPON_NAMES = ['칼날', '거검', '장창', '권총', '단도', '마법봉', '전투망치', '권갑'];
const LEVEL_NAMES = ['여명의', '서약의', '왕실의', '천상의'];
const RARE_NAMES = ['철빛', '비취', '별빛', '영겁'];
const ACCESSORY_NAMES = ['목걸이', '반지', '부적'];
exports.EQUIPMENT_CATALOG = Object.freeze([
    ...exports.WEAPON_TYPES.flatMap((weaponType, family) => exports.EQUIPMENT_RARITIES.flatMap((rarity, grade) => exports.EQUIPMENT_BALANCE.requiredLevels.map((requiredLevel, tier) => ({
        id: `w-${weaponType}-${rarity}-${tier + 1}`, name: `${LEVEL_NAMES[tier]} ${RARE_NAMES[grade]} ${WEAPON_NAMES[family]}`,
        kind: 'weapon', rarity, tier, requiredLevel, weaponType,
        attack: exports.EQUIPMENT_BALANCE.weaponAttack[tier] * exports.EQUIPMENT_BALANCE.rarityPower[grade],
        allowedJobs: WEAPON_JOBS[weaponType], bonus: family % 2 ? 'party' : 'critical', bonusBps: 25 * (grade + 1),
        price: String(exports.EQUIPMENT_BALANCE.prices[grade] * 2 ** tier),
        enhanceBase: String(exports.EQUIPMENT_BALANCE.enhanceBase[grade] * 2 ** tier),
        ...(rarity === 'epic' ? { epicBossId: exports.EPIC_BOSSES[family].id } : {}),
    })))),
    ...['necklace', 'ring', 'charm'].flatMap((accessoryType, shape) => ['critical', 'party'].flatMap((bonus, effect) => exports.EQUIPMENT_RARITIES.flatMap((rarity, grade) => [0, 1, 2, 3].map((tier) => ({
        id: `a-${accessoryType}-${bonus}-${rarity}-${tier + 1}`,
        name: `${LEVEL_NAMES[tier]} ${RARE_NAMES[grade]} ${effect ? '지휘' : '예리'} ${ACCESSORY_NAMES[shape]}`,
        kind: 'accessory', rarity, tier, requiredLevel: 1, accessoryType,
        attack: 100 * (tier + 1) * exports.EQUIPMENT_BALANCE.rarityPower[grade],
        allowedJobs: Array.from({ length: 10 }, (_, job) => job).filter(job => job % 2 === effect),
        bonus, bonusBps: (effect ? 100 : 25) * (grade + 1) * (tier + 1),
        price: String(exports.EQUIPMENT_BALANCE.prices[grade] * 2 ** tier),
        enhanceBase: String(exports.EQUIPMENT_BALANCE.enhanceBase[grade] * 2 ** tier),
        ...(rarity === 'epic' ? { epicBossId: exports.EPIC_BOSSES[(shape * 2 + effect + tier) % 8].id } : {}),
    }))))),
]);
const CATALOG = new Map(exports.EQUIPMENT_CATALOG.map(item => [item.id, item]));
const equipmentTemplate = (id) => CATALOG.get(id);
exports.equipmentTemplate = equipmentTemplate;
const equipmentName = (item) => `${(0, exports.equipmentTemplate)(item.templateId)?.name ?? item.templateId} +${item.enhancement}`;
exports.equipmentName = equipmentName;
const epicLootForBoss = (id) => exports.EQUIPMENT_CATALOG.filter(item => item.epicBossId === id);
exports.epicLootForBoss = epicLootForBoss;
const decimal = (value) => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
const safe = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function isEquipmentItem(value) {
    if (!value || typeof value !== 'object')
        return false;
    const item = value;
    return typeof item.id === 'string' && /^e[1-9]\d*$/.test(item.id) && Number.isSafeInteger(Number(item.id.slice(1))) && typeof item.templateId === 'string' &&
        CATALOG.has(item.templateId) && decimal(item.enhancement) && decimal(item.attempts) &&
        safe(item.roll) && item.roll >= 90 && item.roll <= 110 && safe(item.seed) && item.seed <= 0xffffffff;
}
const copyItems = (items) => items.map(item => ({ ...item }));
const copyEquipment = (state) => ({ ...state,
    bag: copyItems(state.bag), temporary: copyItems(state.temporary), acquired: { ...state.acquired },
    loadout: { weapon: state.loadout.weapon ? { ...state.loadout.weapon } : null, accessories: copyItems(state.loadout.accessories) },
    shop: { ...state.shop, stock: copyItems(state.shop.stock), boughtIds: [...state.shop.boughtIds] },
});
exports.copyEquipment = copyEquipment;
function newEquipment(now = 0, seed = 0x10e010) {
    return { bag: [], loadout: { weapon: null, accessories: [] }, temporary: [],
        capacity: exports.EQUIPMENT_BALANCE.initialCapacity, expansions: 0, revision: 0, temporaryRevision: 0,
        heroChangeSerial: 0, nextId: 1, rngState: seed >>> 0, acquired: {},
        shop: { serial: 0, nextRefreshAt: Math.max(0, now), lastObservedAt: Math.max(0, now), stock: [], boughtIds: [] } };
}
function canEquip(item, formId, level) {
    const def = (0, exports.equipmentTemplate)(item.templateId);
    if (!def || level < def.requiredLevel)
        return false;
    const job = (0, exports.equipmentJob)(formId);
    return job === undefined || def.allowedJobs.includes(job);
}
/** Effective primary attack in basis points for both item kinds. */
const itemAttack = (item) => {
    const def = (0, exports.equipmentTemplate)(item.templateId);
    return BigInt(def?.attack ?? 0) * (def?.kind === 'weapon' ? 100n : 1n) * BigInt(item.roll) *
        (10n + BigInt(item.enhancement)) / 1000n;
};
exports.itemAttack = itemAttack;
const equippedItems = (state) => state
    ? [...(state.loadout.weapon ? [state.loadout.weapon] : []), ...state.loadout.accessories] : [];
exports.equippedItems = equippedItems;
const equipmentItems = (state) => [...(0, exports.equippedItems)(state), ...state.bag, ...state.temporary];
exports.equipmentItems = equipmentItems;
function loadoutAttack(base, loadout) {
    if (!loadout)
        return base;
    return base * (10000n + (loadout.weapon ? (0, exports.itemAttack)(loadout.weapon) : 0n)) *
        (10000n + loadout.accessories.reduce((sum, item) => sum + (0, exports.itemAttack)(item), 0n)) / 100000000n;
}
function displayedHeroAttack(state) {
    return loadoutAttack((0, economy_js_1.trainedHeroPower)((0, hero_js_1.heroAttackPower)(state.level, state.souls, state.hero?.reincarnations), state.progress?.trainingLevel), state.equipment?.loadout);
}
function equipmentBonus(loadout, bonus) {
    if (!loadout)
        return 0n;
    return [...(loadout.weapon ? [loadout.weapon] : []), ...loadout.accessories].reduce((sum, item) => {
        const def = (0, exports.equipmentTemplate)(item.templateId);
        return sum + (def?.bonus === bonus ? BigInt(def.bonusBps) * BigInt(item.roll) / 100n : 0n);
    }, 0n);
}
function parseEquipment(raw) {
    const base = newEquipment();
    if (!raw || typeof raw !== 'object')
        return base;
    const value = raw;
    const seen = new Set();
    const items = (list) => !Array.isArray(list) ? [] : list.flatMap(item => {
        if (!isEquipmentItem(item) || seen.has(item.id))
            return [];
        seen.add(item.id);
        return [{ ...item }];
    });
    const equipped = items([...(value.loadout?.weapon ? [value.loadout.weapon] : []), ...(Array.isArray(value.loadout?.accessories) ? value.loadout.accessories : [])]);
    const weapon = equipped.find(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'weapon') ?? null;
    const accessories = equipped.filter(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'accessory');
    const bag = [...items(value.bag), ...equipped.filter(item => item !== weapon && !accessories.includes(item))], temporary = items(value.temporary);
    // Never discard otherwise valid overflow just because a damaged capacity is too small.
    const capacity = safe(value.capacity) ? Math.max(1, value.capacity, bag.length) : Math.max(base.capacity, bag.length);
    const shop = value.shop;
    const stock = Array.isArray(shop?.stock) ? shop.stock.filter(isEquipmentItem).map(item => ({ ...item })) : [];
    return { ...base, bag: [...bag, ...accessories.slice(4)], loadout: { weapon, accessories: accessories.slice(0, 4) }, temporary,
        capacity: Math.max(capacity, bag.length + Math.max(0, accessories.length - 4)),
        expansions: safe(value.expansions) ? value.expansions : 0,
        revision: safe(value.revision) ? value.revision : 0,
        temporaryRevision: safe(value.temporaryRevision) ? value.temporaryRevision : 0,
        heroChangeSerial: safe(value.heroChangeSerial) ? value.heroChangeSerial : 0,
        nextId: Math.max(safe(value.nextId) ? value.nextId : 1, ...[...seen, ...stock.map(item => item.id)].map(id => Number(id.slice(1)) + 1).filter(Number.isSafeInteger)),
        rngState: safe(value.rngState) ? value.rngState >>> 0 : base.rngState,
        acquired: Object.fromEntries(Object.entries(value.acquired ?? {}).filter(([id, count]) => CATALOG.has(id) && safe(count))),
        shop: { serial: safe(shop?.serial) ? shop.serial : 0,
            nextRefreshAt: safe(shop?.nextRefreshAt) ? shop.nextRefreshAt : 0,
            lastObservedAt: safe(shop?.lastObservedAt) ? shop.lastObservedAt : 0,
            stock, boughtIds: Array.isArray(shop?.boughtIds) ? shop.boughtIds.filter(id => typeof id === 'string' && stock.some(item => item.id === id)) : [] } };
}
const nextRandom = (state) => {
    const rng = (0, rng_js_1.mulberry32)(state.rngState);
    state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
    return rng.next();
};
function createEquipmentItem(state, templateId) {
    if (!CATALOG.has(templateId) || !Number.isSafeInteger(state.nextId) || state.nextId < 1 || state.nextId >= Number.MAX_SAFE_INTEGER) {
        throw new RangeError('Equipment allocator or template is invalid');
    }
    return { id: `e${state.nextId++}`, templateId, enhancement: '0', roll: 90 + Math.floor(nextRandom(state) * 21),
        seed: Math.floor(nextRandom(state) * 0x100000000), attempts: '0' };
}
function refreshEquipmentShop(state, now, level) {
    const at = Number.isSafeInteger(now) && now >= 0 ? Math.max(now, state.shop.lastObservedAt) : state.shop.lastObservedAt;
    state.shop.lastObservedAt = at;
    if (state.shop.stock.length && at < state.shop.nextRefreshAt)
        return false;
    const stock = [];
    const pool = exports.EQUIPMENT_CATALOG.filter(def => def.rarity !== 'epic' && def.requiredLevel <= Math.max(5, level + 5));
    for (let i = 0; i < exports.EQUIPMENT_BALANCE.stockCount; i++)
        stock.push(createEquipmentItem(state, pool[Math.floor(nextRandom(state) * pool.length)].id));
    state.shop = { serial: state.shop.serial + 1,
        nextRefreshAt: (Math.floor(at / exports.EQUIPMENT_BALANCE.shopRefreshMs) + 1) * exports.EQUIPMENT_BALANCE.shopRefreshMs,
        lastObservedAt: at, stock, boughtIds: [] };
    state.revision++;
    return true;
}
/** Every overflow in one explicit frame joins one replacement batch. */
function overflow(state, items, batch) {
    if (!items.length)
        return;
    if (!batch.overflowStarted) {
        state.temporary = [];
        batch.overflowStarted = true;
    }
    state.temporary.push(...items);
    state.temporaryRevision++;
}
const stableId = (a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id);
/** O(N log N): one flat weapon channel and one additive accessory channel. */
function autoEquipEquipment(state, formId, level, batch = (0, exports.createEquipmentBatch)(), incoming = [], includeTemporary = true, baseAttack = (0, hero_js_1.heroAttackPower)(level), candidates, refillOnly = false) {
    const old = (0, exports.equippedItems)(state), oldIds = new Set(old.map(item => item.id));
    const pool = [...old, ...state.bag, ...incoming, ...(includeTemporary ? state.temporary : [])];
    const compare = (a, b) => {
        const aa = (0, exports.itemAttack)(a), bb = (0, exports.itemAttack)(b);
        return aa === bb ? Number(oldIds.has(b.id)) - Number(oldIds.has(a.id)) || stableId(a, b) : aa > bb ? -1 : 1;
    };
    const eligible = pool.filter(item => canEquip(item, formId, level) &&
        (!candidates || oldIds.has(item.id) || candidates.has(item.id)));
    const bestWeapon = eligible.filter(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'weapon').sort(compare)[0] ?? null;
    const accessoryPool = eligible.filter(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'accessory').sort(compare);
    const existing = accessoryPool.filter(item => oldIds.has(item.id)), fresh = accessoryPool.filter(item => !oldIds.has(item.id));
    const oldWeapon = state.loadout.weapon && canEquip(state.loadout.weapon, formId, level) ? state.loadout.weapon : null;
    let best = refillOnly
        ? { weapon: oldWeapon ?? bestWeapon, accessories: [...existing, ...fresh.slice(0, 4 - existing.length)] }
        : { weapon: bestWeapon, accessories: accessoryPool.slice(0, 4) };
    const target = loadoutAttack(baseAttack, best);
    const preference = (loadout) => {
        const all = [...(loadout.weapon ? [loadout.weapon] : []), ...loadout.accessories];
        return [all.filter(item => oldIds.has(item.id)).length, all.length, all.map(item => item.id).sort().join('/')];
    };
    for (const weapon of [bestWeapon, oldWeapon])
        for (let kept = 0; kept <= Math.min(4, existing.length); kept++) {
            const candidate = { weapon, accessories: [...existing.slice(0, kept), ...fresh.slice(0, 4 - kept)] };
            if (loadoutAttack(baseAttack, candidate) !== target)
                continue;
            const a = preference(candidate), b = preference(best);
            if (a[0] > b[0] || a[0] === b[0] && (a[1] > b[1] || a[1] === b[1] && a[2] < b[2]))
                best = candidate;
        }
    // Integer rounding can tie unequal item powers. Choose the first UID set that
    // can still reach the same attack/retained-count/fill-count optimum. Suffix
    // summaries need at most four accessories and one weapon per ownership class.
    const bestPreference = preference(best), sorted = [...eligible].sort(stableId);
    const suffix = Array.from({ length: sorted.length + 1 }, () => ({ weapons: [null, null], accessories: [[], []] }));
    for (let i = sorted.length - 1; i >= 0; i--) {
        const next = suffix[i + 1], entry = sorted[i], group = oldIds.has(entry.id) ? 1 : 0;
        const summary = { weapons: [...next.weapons], accessories: [[...next.accessories[0]], [...next.accessories[1]]] };
        if ((0, exports.equipmentTemplate)(entry.templateId)?.kind === 'weapon') {
            if (!summary.weapons[group] || compare(entry, summary.weapons[group]) < 0)
                summary.weapons[group] = entry;
        }
        else
            summary.accessories[group] = [...summary.accessories[group], entry].sort(compare).slice(0, 4);
        suffix[i] = summary;
    }
    const canFinish = (chosen, rest) => {
        const chosenWeapon = chosen.find(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'weapon') ?? null;
        if (chosen.filter(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'weapon').length > 1)
            return false;
        const chosenAcc = chosen.filter(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'accessory');
        if (chosenAcc.length > 4)
            return false;
        const kept = chosen.filter(item => oldIds.has(item.id)).length;
        for (const addedWeapon of chosenWeapon ? [null] : [null, ...rest.weapons.filter(Boolean)]) {
            const weapon = chosenWeapon ?? addedWeapon;
            const remainingCount = bestPreference[1] - chosen.length - Number(addedWeapon !== null);
            const remainingOld = bestPreference[0] - kept - Number(addedWeapon !== null && oldIds.has(addedWeapon.id));
            const remainingNew = remainingCount - remainingOld;
            if (remainingOld < 0 || remainingNew < 0 || chosenAcc.length + remainingCount > 4 ||
                rest.accessories[1].length < remainingOld || rest.accessories[0].length < remainingNew)
                continue;
            if (loadoutAttack(baseAttack, { weapon, accessories: [...chosenAcc,
                    ...rest.accessories[1].slice(0, remainingOld), ...rest.accessories[0].slice(0, remainingNew)] }) === target)
                return true;
        }
        return false;
    };
    const chosen = [];
    for (let i = 0; i < sorted.length && chosen.length < bestPreference[1]; i++) {
        if (canFinish([...chosen, sorted[i]], suffix[i + 1]))
            chosen.push(sorted[i]);
    }
    best = { weapon: chosen.find(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'weapon') ?? null,
        accessories: [...state.loadout.accessories.filter(item => chosen.some(entry => entry.id === item.id)),
            ...chosen.filter(item => (0, exports.equipmentTemplate)(item.templateId)?.kind === 'accessory' && !oldIds.has(item.id))] };
    const { weapon, accessories } = best;
    const selected = new Set([...(weapon ? [weapon.id] : []), ...accessories.map(item => item.id)]);
    state.loadout = { weapon, accessories };
    // Selected bag items leave before old equipment needs storage.
    const remaining = [...state.bag.filter(item => !selected.has(item.id)), ...old.filter(item => !selected.has(item.id)),
        ...incoming.filter(item => !selected.has(item.id))];
    if (includeTemporary) {
        const moved = state.temporary.filter(item => selected.has(item.id));
        if (moved.length) {
            state.temporary = state.temporary.filter(item => !selected.has(item.id));
            state.temporaryRevision++;
        }
    }
    state.bag = remaining.slice(0, state.capacity);
    overflow(state, remaining.slice(state.capacity), batch);
}
function heroChangeWarning(state, targetFormId, offerSerial) {
    return { targetFormId, ...(offerSerial === undefined ? {} : { offerSerial }),
        heroChangeSerial: state?.heroChangeSerial ?? 0, temporaryRevision: state?.temporaryRevision ?? 0,
        lostIds: state?.temporary.map(item => item.id) ?? [] };
}
function confirmHeroChange(state, confirmation, batch) {
    if (batch.heroChanged)
        return false;
    if (state.temporary.length > 0 && (!confirmation || confirmation.heroChangeSerial !== state.heroChangeSerial ||
        confirmation.temporaryRevision !== state.temporaryRevision || confirmation.lostIds.length !== state.temporary.length ||
        confirmation.lostIds.some((id, index) => id !== state.temporary[index].id)))
        return false;
    // A supplied stale confirmation is rejected even when another action cleared the batch.
    if (confirmation && (confirmation.heroChangeSerial !== state.heroChangeSerial || confirmation.temporaryRevision !== state.temporaryRevision))
        return false;
    state.temporary = [];
    state.temporaryRevision++;
    state.heroChangeSerial++;
    batch.heroChanged = true;
    return true;
}
function acquireEquipment(state, item, heroId, level, batch = (0, exports.createEquipmentBatch)(), baseAttack = (0, hero_js_1.heroAttackPower)(level)) {
    autoEquipEquipment(state, heroId, level, batch, [item], true, baseAttack, new Set([item.id]));
    state.acquired[item.templateId] = Math.min(Number.MAX_SAFE_INTEGER, (state.acquired[item.templateId] ?? 0) + 1);
    state.revision++;
}
function rollBossEquipment(state, level, epicBossId) {
    const chance = epicBossId ? exports.EQUIPMENT_BALANCE.epicDropBps : exports.EQUIPMENT_BALANCE.bossDropBps;
    if (nextRandom(state) * 10000 >= chance)
        return null;
    let pool;
    if (epicBossId)
        pool = (0, exports.epicLootForBoss)(epicBossId);
    else {
        const roll = nextRandom(state);
        const rarity = roll < .6 ? 'common' : roll < .92 ? 'uncommon' : 'rare';
        pool = exports.EQUIPMENT_CATALOG.filter(def => def.rarity === rarity && def.requiredLevel <= Math.max(5, level + 5));
    }
    return pool.length ? createEquipmentItem(state, pool[Math.floor(nextRandom(state) * pool.length)].id) : null;
}
function rollEpicEncounter(state, context) {
    const pool = (0, exports.eligibleEpicBosses)(context);
    // No dependence on rareMisses, unobserved species, tracking or lures.
    if (!pool.length || nextRandom(state) * 10000 >= exports.EQUIPMENT_BALANCE.epicEncounterBps)
        return undefined;
    return pool[Math.floor(nextRandom(state) * pool.length)];
}
function enhancementSuccess(target) {
    if (target <= 5n)
        return { numerator: 1n, denominator: 1n };
    const k = BigInt(exports.EQUIPMENT_BALANCE.successK);
    return { numerator: k, denominator: k + target - 5n };
}
/** Exact unbiased integer draw, including probabilities below Number precision. */
function randomBelow(limit, rng) {
    if (limit <= 1n)
        return 0n;
    const bits = (limit - 1n).toString(2).length, words = Math.ceil(bits / 32), mask = (1n << BigInt(bits)) - 1n;
    for (;;) {
        let value = 0n;
        for (let i = 0; i < words; i++)
            value = (value << 32n) | BigInt(Math.floor(rng.next() * 0x100000000));
        value &= mask;
        if (value < limit)
            return value;
    }
}
const enhancementCost = (item) => ({
    base: BigInt((0, exports.equipmentTemplate)(item.templateId).enhanceBase), doublings: BigInt(item.enhancement),
});
exports.enhancementCost = enhancementCost;
const expansionCost = (state) => ({ base: BigInt(exports.EQUIPMENT_BALANCE.expansionBase), doublings: BigInt(state.expansions) });
exports.expansionCost = expansionCost;
function affordableEquipmentCost(cost, coins) {
    if (coins < cost.base || cost.doublings > BigInt((coins / cost.base).toString(2).length - 1))
        return null;
    return cost.base << cost.doublings;
}
function formatEquipmentCost(cost) {
    return cost.doublings < 4096n ? String(cost.base << cost.doublings) : `${cost.base} × 2^${cost.doublings}`;
}
const sellPrice = (item) => BigInt((0, exports.equipmentTemplate)(item.templateId).price) / 10n;
exports.sellPrice = sellPrice;
function isEquipmentAction(value) {
    if (!value || typeof value !== 'object')
        return false;
    const a = value;
    if (!safe(a.revision))
        return false;
    if (a.type === 'equipmentExpand')
        return true;
    if (!('itemId' in a) || typeof a.itemId !== 'string' || !/^e[1-9]\d*$/.test(a.itemId))
        return false;
    if (a.type === 'equipmentEquip')
        return a.replaceId === undefined ||
            typeof a.replaceId === 'string' && /^e[1-9]\d*$/.test(a.replaceId);
    return a.type === 'equipmentBuy' ? safe(a.shopSerial)
        : a.type === 'equipmentSell' || a.type === 'equipmentEnhance' || a.type === 'equipmentMove';
}
function removeItem(state, id) {
    state.bag = state.bag.filter(item => item.id !== id);
    if (state.loadout.weapon?.id === id)
        state.loadout.weapon = null;
    state.loadout.accessories = state.loadout.accessories.filter(item => item.id !== id);
    if (state.temporary.some(item => item.id === id)) {
        state.temporary = state.temporary.filter(item => item.id !== id);
        state.temporaryRevision++;
    }
}
function applyEquipmentAction(state, action, batch = (0, exports.createEquipmentBatch)()) {
    if (!isEquipmentAction(action) || action.revision !== state.equipment?.revision)
        return { error: 'Stale equipment action' };
    const equipment = (0, exports.copyEquipment)(state.equipment), progress = (0, progress_js_1.copyProgress)(state.progress ?? (0, progress_js_1.newProgress)());
    const draft = { ...state, equipment, progress };
    const stagedBatch = { ...batch }, events = [];
    const base = (0, economy_js_1.trainedHeroPower)((0, hero_js_1.heroAttackPower)(state.level, state.souls, state.hero?.reincarnations), progress.trainingLevel);
    const formId = state.hero?.equipped.formId ?? 'h00';
    const spend = (cost) => {
        if (draft.coins < cost)
            return false;
        draft.coins -= cost;
        progress.goldSpent += cost;
        return true;
    };
    if (action.type === 'equipmentExpand') {
        const cost = affordableEquipmentCost((0, exports.expansionCost)(equipment), draft.coins);
        if (cost === null || !spend(cost))
            return { error: 'Not enough gold' };
        if (!Number.isSafeInteger(equipment.capacity + exports.EQUIPMENT_BALANCE.expansionSlots))
            return { error: 'Inventory representation limit' };
        equipment.capacity += exports.EQUIPMENT_BALANCE.expansionSlots;
        equipment.expansions++;
    }
    else if (action.type === 'equipmentBuy') {
        if (action.shopSerial !== equipment.shop.serial || equipment.shop.boughtIds.includes(action.itemId))
            return { error: 'Stale shop purchase' };
        const item = equipment.shop.stock.find(item => item.id === action.itemId);
        if (!item || (0, exports.equipmentTemplate)(item.templateId)?.rarity === 'epic')
            return { error: 'Unknown shop item' };
        if ((0, exports.equipmentItems)(equipment).some(owned => owned.id === item.id))
            return { error: 'Shop item already owned' };
        if (!spend(BigInt((0, exports.equipmentTemplate)(item.templateId).price)))
            return { error: 'Not enough gold' };
        const previousTemporary = equipment.temporary.map(item => item.id);
        acquireEquipment(equipment, { ...item }, formId, draft.level, stagedBatch, base);
        if (previousTemporary.some(id => !(0, exports.equipmentItems)(equipment).some(item => item.id === id)))
            return { error: 'Purchase would destroy temporary equipment' };
        equipment.shop.boughtIds.push(item.id);
    }
    else {
        const item = (0, exports.equipmentItems)(equipment).find(item => item.id === action.itemId);
        if (!item)
            return { error: 'Missing equipment' };
        if (action.type === 'equipmentEquip') {
            const bagIndex = equipment.bag.findIndex(entry => entry.id === item.id);
            const temporaryIndex = equipment.temporary.findIndex(entry => entry.id === item.id);
            if (bagIndex < 0 && temporaryIndex < 0)
                return { error: 'Equipment is already equipped' };
            if (!canEquip(item, formId, draft.level))
                return { error: 'Equipment is not eligible' };
            const weapon = (0, exports.equipmentTemplate)(item.templateId).kind === 'weapon';
            const replaceIndex = action.replaceId === undefined ? -1
                : equipment.loadout.accessories.findIndex(entry => entry.id === action.replaceId);
            if (weapon && action.replaceId !== undefined && action.replaceId !== equipment.loadout.weapon?.id ||
                !weapon && action.replaceId !== undefined && replaceIndex < 0 ||
                !weapon && action.replaceId === undefined && equipment.loadout.accessories.length >= 4) {
                return { error: 'Choose the equipped item to replace' };
            }
            const replaced = weapon ? equipment.loadout.weapon : equipment.loadout.accessories[replaceIndex];
            const storage = bagIndex >= 0 ? equipment.bag : equipment.temporary;
            const index = bagIndex >= 0 ? bagIndex : temporaryIndex;
            storage.splice(index, 1, ...(replaced ? [replaced] : []));
            if (temporaryIndex >= 0)
                equipment.temporaryRevision++;
            if (weapon)
                equipment.loadout.weapon = item;
            else if (replaceIndex >= 0)
                equipment.loadout.accessories[replaceIndex] = item;
            else
                equipment.loadout.accessories.push(item);
        }
        else if (action.type === 'equipmentSell') {
            (0, gold_js_1.creditGold)(draft, (0, exports.sellPrice)(item));
            removeItem(equipment, item.id);
            autoEquipEquipment(equipment, formId, draft.level, stagedBatch, [], true, base, undefined, true);
        }
        else if (action.type === 'equipmentMove') {
            if (!equipment.temporary.some(temporary => temporary.id === item.id))
                return { error: 'Item is not temporary' };
            if (equipment.bag.length >= equipment.capacity)
                return { error: 'Inventory is full' };
            removeItem(equipment, item.id);
            equipment.bag.push(item);
        }
        else {
            const cost = affordableEquipmentCost((0, exports.enhancementCost)(item), draft.coins);
            if (cost === null || !spend(cost))
                return { error: 'Not enough gold' };
            const target = BigInt(item.enhancement) + 1n;
            const chance = enhancementSuccess(target);
            let seed = item.seed;
            for (const char of item.attempts)
                seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
            const success = randomBelow(chance.denominator, (0, rng_js_1.mulberry32)(seed)) < chance.numerator;
            item.attempts = String(BigInt(item.attempts) + 1n);
            if (success) {
                item.enhancement = String(target);
                if (equipment.temporary.some(temporary => temporary.id === item.id))
                    equipment.temporaryRevision++;
                autoEquipEquipment(equipment, formId, draft.level, stagedBatch, [], true, base, new Set([item.id]));
            }
            else {
                removeItem(equipment, item.id);
                events.push({ type: 'equipmentDestroyed', item: { ...item } });
                autoEquipEquipment(equipment, formId, draft.level, stagedBatch, [], true, base, undefined, true);
            }
        }
    }
    equipment.revision++;
    Object.assign(batch, stagedBatch);
    return { state: draft, events: [...events, { type: 'equipmentChanged', revision: equipment.revision }] };
}
function heroCombatSnapshot(state) {
    return { hero: { ...(state.hero?.equipped ?? { formId: 'h00', buffPercent: 0 }) }, level: state.level, souls: state.souls,
        reincarnations: state.hero?.reincarnations ?? 0, trainingLevel: state.progress?.trainingLevel ?? 0,
        loadout: structuredClone(state.equipment?.loadout ?? { weapon: null, accessories: [] }) };
}
function isHeroCombatSnapshot(value) {
    if (!value || typeof value !== 'object')
        return false;
    const v = value;
    if (!(0, hero_js_1.isHeroRoll)(v.hero) || !safe(v.level) || v.level < 1 ||
        !safe(v.souls) || !safe(v.reincarnations) || !safe(v.trainingLevel) || v.trainingLevel > 10 || !v.loadout)
        return false;
    const { weapon, accessories } = v.loadout;
    if (weapon !== null && (!isEquipmentItem(weapon) || (0, exports.equipmentTemplate)(weapon.templateId)?.kind !== 'weapon'))
        return false;
    if (!Array.isArray(accessories) || accessories.length > 4 || accessories.some(item => !isEquipmentItem(item) || (0, exports.equipmentTemplate)(item.templateId)?.kind !== 'accessory'))
        return false;
    const all = [...(weapon ? [weapon] : []), ...accessories];
    return new Set(all.map(item => item.id)).size === all.length && all.every(item => canEquip(item, v.hero.formId, v.level));
}
