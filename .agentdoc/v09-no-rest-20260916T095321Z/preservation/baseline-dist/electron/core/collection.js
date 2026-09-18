"use strict";
// Companion collection — SPEC F32 (Assumptions 5/23/24/26; GAME_DESIGN_V2
// §4/§6). Pure TypeScript, zero imports of electron/DOM/node. Every export is
// total and never mutates its input: applyCollection returns fresh objects or
// an { error }, so the caller can apply it straight onto live engine state.
Object.defineProperty(exports, "__esModule", { value: true });
exports.STEAL_CHANCE = exports.companionPower = exports.REBIRTH_MIN_INDEX = exports.ROSTER_CAP = exports.PARTY_SIZE = exports.COMPANION_REINCARNATION_LEVEL = void 0;
exports.isCompanionSnapshot = isCompanionSnapshot;
exports.companionReincarnationPreview = companionReincarnationPreview;
exports.activeCompanions = activeCompanions;
exports.autoParty = autoParty;
exports.pvpParty = pvpParty;
exports.partyOrder = partyOrder;
exports.applyCollection = applyCollection;
exports.resolvePvp = resolvePvp;
const battle_js_1 = require("./battle.js");
const monsters_js_1 = require("./monsters.js");
const formulas_js_1 = require("./formulas.js");
const types_chart_js_1 = require("./types-chart.js");
const hero_js_1 = require("./hero.js");
const progress_js_1 = require("./progress.js");
/** Reincarnation unlocks here; companion growth has no gameplay level cap. */
exports.COMPANION_REINCARNATION_LEVEL = 10;
/** How many companions fight together — field volley and PvP party (F61). */
exports.PARTY_SIZE = 5;
/** Roster cap (save.ts keeps its own copy for parsing). */
exports.ROSTER_CAP = 30;
/** Rebirth unlocks at this monster index (Assumption 5). */
exports.REBIRTH_MIN_INDEX = 40;
/** Companion attack power (Assumption 24) — bigint, unbounded. */
const companionPower = (c) => {
    const base = (0, formulas_js_1.monsterMaxHp)(c.bossIndex) / 20n;
    return (base < 1n ? 1n : base) * BigInt(c.level) * 2n ** BigInt(c.stars);
};
exports.companionPower = companionPower;
/** Confirmation crosses IPC; reject malformed or imprecise counters before use. */
function isCompanionSnapshot(value) {
    if (!value || typeof value !== 'object')
        return false;
    const c = value;
    return typeof c['speciesId'] === 'string' && c['speciesId'].length > 0 &&
        Number.isSafeInteger(c['bossIndex']) && Number(c['bossIndex']) >= 0 &&
        Number.isSafeInteger(c['level']) && Number(c['level']) >= 1 &&
        Number.isSafeInteger(c['stars']) && Number(c['stars']) >= 0;
}
/** Exact preview: at Lv10 the reset retains one fifth of the previous power. */
function companionReincarnationPreview(c) {
    if (!isCompanionSnapshot(c) || c.level < exports.COMPANION_REINCARNATION_LEVEL || !Number.isSafeInteger(c.stars + 1))
        return null;
    return { level: 1, stars: c.stars + 1, beforePower: (0, exports.companionPower)(c),
        afterPower: (0, exports.companionPower)({ ...c, level: 1, stars: c.stars + 1 }) };
}
/** Numeric part of a 'cN' id — the tie-breaker (same rule as parseSave). */
const idNum = (id) => Number(id.replace(/\D/g, '') || 0);
/** Descending bigint comparator. */
const desc = (a, b) => (a === b ? 0 : b > a ? 1 : -1);
/**
 * The PARTY_SIZE best companions against `enemyType` (F61): effective power
 * desc, ties → higher raw power → lower numeric id. Without a type the raw
 * power decides, which is what the PvP default `autoParty` wants.
 */
function activeCompanions(cs, enemyType, hero) {
    const power = (c) => (0, hero_js_1.heroBuffedPower)((0, exports.companionPower)(c), (0, monsters_js_1.typeOf)(c.speciesId), hero);
    const effective = (c) => enemyType === undefined
        ? power(c)
        : (0, types_chart_js_1.effectivePower)(power(c), (0, monsters_js_1.typeOf)(c.speciesId), enemyType);
    return [...cs]
        .sort((a, b) => desc(effective(a), effective(b)) ||
        desc((0, exports.companionPower)(a), (0, exports.companionPower)(b)) ||
        idNum(a.id) - idNum(b.id))
        .slice(0, exports.PARTY_SIZE);
}
/** The PvP default party: the PARTY_SIZE strongest by raw power. */
function autoParty(cs, hero) {
    return activeCompanions(cs, undefined, hero);
}
/** `ids` resolved against `cs` in the given order; unknown/duplicate dropped. */
function resolveIds(cs, ids) {
    const party = [];
    for (const id of ids) {
        if (party.length >= exports.PARTY_SIZE)
            break;
        const c = cs.find((x) => x.id === id);
        if (c && !party.includes(c))
            party.push(c);
    }
    return party;
}
/** The manual PvP party; an empty result falls back to `autoParty` (F61). */
function pvpParty(cs, ids, hero) {
    const party = resolveIds(cs, ids);
    return party.length > 0 ? party : autoParty(cs, hero);
}
/** Draw order of a party: biggest first (back row), ties keep party order. */
function partyOrder(party) {
    return [...party].sort((a, b) => (0, monsters_js_1.sizeOf)(b.speciesId) - (0, monsters_js_1.sizeOf)(a.speciesId));
}
/** Fresh roster: `dropIds` removed, `editId` replaced by `edit(c)`, rest copied. */
function reroster(cs, dropIds, editId, edit) {
    return cs
        .filter((c) => !dropIds.includes(c.id))
        .map((c) => (edit && c.id === editId ? edit(c) : { ...c }));
}
/** Fresh state: nothing of `state` is shared with the result. */
function next(state, companions, patch = {}, events = []) {
    return {
        state: {
            ...state,
            items: { ...state.items },
            monster: { ...state.monster },
            companions,
            ...patch,
        },
        events,
    };
}
/** Validate against the original roster before a PvP loss can remove an ID. */
function mintedId(companions, nextCompanionId, c) {
    const external = /^[sr][0-9a-f]+$/.test(c.id);
    if (!external && (!Number.isSafeInteger(nextCompanionId) || nextCompanionId < 1 ||
        nextCompanionId >= Number.MAX_SAFE_INTEGER))
        return null;
    const id = external ? c.id : `c${nextCompanionId}`;
    return companions.some((existing) => existing.id === id) ? null : id;
}
/** External deliveries remain valid at exhaustion; never add above the safe bound. */
function incrementCompanionId(value) {
    return Number.isSafeInteger(value) && value >= 1 && value < Number.MAX_SAFE_INTEGER
        ? value + 1 : Number.MAX_SAFE_INTEGER;
}
function usedEarlyAllocation(state) {
    return Math.min(5, (state.earlyCaptureUsed ?? Math.max(0, state.nextCompanionId - 1)) + 1);
}
/** Keep server transfer IDs so the theft ledger survives the next save/upload. */
function minted(companions, nextCompanionId, c) {
    if (companions.length >= exports.ROSTER_CAP)
        return null;
    // Legacy/local callers still receive a fresh local ID; the server owns s/r IDs.
    const id = mintedId(companions, nextCompanionId, c);
    if (id === null)
        return null;
    const fresh = { ...c, id };
    companions.push(fresh);
    return fresh;
}
/**
 * Apply one lifecycle action (Assumption 26). Total: an unknown action type,
 * an unknown/duplicate companion id or an unmet precondition yields
 * `{ error }` and the caller keeps its state; success yields a brand-new
 * state plus the events of GAME_DESIGN_V2 §6.
 */
function applyCollection(state, action) {
    const cs = state.companions;
    const find = (id) => cs.find((c) => c.id === id);
    switch (action.type) {
        case 'acknowledgeDiscoveries':
        case 'setDiscoveryGoal': {
            if (!(0, progress_js_1.isDiscoveryAction)(action))
                return { error: 'discovery: invalid action' };
            const progress = (0, progress_js_1.migrateProgress)(state, state.monster.speciesId);
            const codex = progress.codex;
            if (action.type === 'setDiscoveryGoal')
                codex.goal = action.goal ? { kind: action.goal.kind, id: action.goal.id } : null;
            else {
                const acquired = (0, progress_js_1.acquiredDiscoveries)({ ...state, progress });
                // A displayed snapshot can acknowledge only actually acquired entries.
                codex.acknowledgedHeroes = [...new Set([...codex.acknowledgedHeroes,
                        ...action.heroes.filter((id) => acquired.heroes.includes(id))])];
                codex.acknowledgedMonsters = [...new Set([...codex.acknowledgedMonsters,
                        ...action.monsters.filter((id) => acquired.monsters.includes(id))])];
            }
            return next(state, reroster(cs, []), { progress });
        }
        case 'consume': {
            const target = find(action.targetId);
            const food = find(action.foodId);
            if (!target || !food || target.id === food.id)
                return { error: 'consume: bad ids' };
            const level = target.level + 1 + food.stars;
            if (!Number.isSafeInteger(level) || level < 1)
                return { error: 'consume: level overflow' };
            return next(state, reroster(cs, [food.id], target.id, (c) => ({
                ...c,
                level,
            })));
        }
        case 'fuse': {
            const a = find(action.aId);
            const b = find(action.bId);
            if (!a || !b || a.id === b.id)
                return { error: 'fuse: bad ids' };
            if (a.speciesId !== b.speciesId || a.stars !== b.stars) {
                return { error: 'fuse: needs the same species and stars' };
            }
            if (!Number.isSafeInteger(a.stars + 1))
                return { error: 'fuse: stars overflow' };
            return next(state, reroster(cs, [b.id], a.id, (c) => ({
                ...c,
                bossIndex: Math.max(a.bossIndex, b.bossIndex),
                level: 1,
                stars: c.stars + 1,
            })));
        }
        case 'reincarnate': {
            const c = find(action.id);
            if (!c)
                return { error: 'reincarnate: unknown id' };
            if (!Number.isSafeInteger(c.level) || c.level < exports.COMPANION_REINCARNATION_LEVEL)
                return { error: 'reincarnate: needs level 10' };
            if (!Number.isSafeInteger(c.stars + 1))
                return { error: 'reincarnate: stars overflow' };
            if (action.expected !== undefined && (!isCompanionSnapshot(action.expected) ||
                action.expected.speciesId !== c.speciesId || action.expected.bossIndex !== c.bossIndex ||
                action.expected.level !== c.level || action.expected.stars !== c.stars))
                return { error: 'reincarnate: confirmation changed' };
            return next(state, reroster(cs, [], c.id, (x) => ({ ...x, level: 1, stars: x.stars + 1 })));
        }
        case 'sacrifice': {
            const c = find(action.id);
            if (!c)
                return { error: 'sacrifice: unknown id' };
            const souls = state.souls + 1 + c.stars;
            if (!Number.isSafeInteger(souls))
                return { error: 'sacrifice: souls overflow' };
            return next(state, reroster(cs, [c.id]), { souls });
        }
        case 'rebirth': {
            if (state.monster.index < exports.REBIRTH_MIN_INDEX) {
                return { error: `rebirth: needs monster index ${exports.REBIRTH_MIN_INDEX}` };
            }
            const souls = state.souls + Math.floor(state.monster.index / 8);
            const first = (0, monsters_js_1.monsterForIndex)(0);
            return next(state, reroster(cs, []), {
                level: 1,
                xp: 0,
                monster: first,
                monsterHp: first.maxHp,
                souls,
                rebirths: state.rebirths + 1,
            }, [{ type: 'rebirth', souls }]);
        }
        case 'syncAllocation':
            if (!Number.isSafeInteger(action.nextCompanionId) || action.nextCompanionId < 1)
                return { error: 'syncAllocation: invalid high-water' };
            return next(state, reroster(cs, []), { nextCompanionId: Math.max(state.nextCompanionId, action.nextCompanionId) });
        case 'addCompanion': {
            const companions = reroster(cs, []);
            if (!minted(companions, state.nextCompanionId, action.companion)) {
                return { error: 'addCompanion: roster is full or id allocation failed' };
            }
            return next(state, companions, { nextCompanionId: incrementCompanionId(state.nextCompanionId),
                earlyCaptureUsed: usedEarlyAllocation(state) });
        }
        case 'removeCompanions':
            return next(state, reroster(cs, action.ids));
        case 'setPvpParty':
            // Never an error and no event: an all-unknown list just empties it.
            return next(state, reroster(cs, []), {
                pvpParty: resolveIds(cs, action.ids).map((c) => c.id),
            });
        case 'pvpResult': {
            if (action.stolen && mintedId(cs, state.nextCompanionId, action.stolen) === null) {
                return { error: 'pvpResult: id allocation failed' };
            }
            const companions = reroster(cs, action.lostId === null ? [] : [action.lostId]);
            // A steal into a full roster is void, never an error (Assumption 23).
            const stolen = action.stolen && minted(companions, state.nextCompanionId, action.stolen);
            return next(state, companions, { nextCompanionId: stolen ? incrementCompanionId(state.nextCompanionId) : state.nextCompanionId,
                ...(stolen ? { earlyCaptureUsed: usedEarlyAllocation(state) } : {}) }, [
                {
                    type: 'pvpResolved',
                    won: action.won,
                    stolen: stolen ?? null,
                    lostId: action.lostId,
                },
            ]);
        }
        default:
            return { error: 'unknown action' };
    }
}
/** Chance an attacking win also carries a companion home (GAME_DESIGN_V3 §5). */
exports.STEAL_CHANCE = 0.15;
/**
 * Resolve one asynchronous PvP exchange (SPEC F37; GAME_DESIGN_V3 §5). The
 * verdict and the blow list come from the seedless `simulateBattle`; the rng
 * only decides the loot. Shared byte-for-byte with the server, which calls it
 * with `mulberry32(seed)` and moves `moved` between the stored rosters — so
 * exactly 2 draws happen per call, the victim draw included even when nobody
 * can be stolen, and the client can replay the same match from the seed.
 * Only the attacker ever steals: a losing attacker keeps its whole roster.
 * ponytail: `attackerRosterSize` defaults to the party size so the v2 3-arg
 * call still compiles; T60 passes the real roster length.
 */
function resolvePvp(attacker, defender, rng, attackerRosterSize = attacker.length, heroes = {}) {
    const { attackerWon, blows } = (0, battle_js_1.simulateBattle)(attacker, defender, heroes);
    const stealRoll = rng.next() < exports.STEAL_CHANCE;
    const victim = defender[Math.floor(rng.next() * defender.length)] ?? null;
    return {
        attackerWon,
        moved: attackerWon && stealRoll && attackerRosterSize < exports.ROSTER_CAP ? victim : null,
        blows,
    };
}
