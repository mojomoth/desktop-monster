"use strict";
// Net client + net session (SPEC F48; SERVER_ARCHITECTURE §6). Electron-free:
// `fetch`, the userData directory and randomUUID are injected, so the whole
// module is testable with a fake fetch and a tmp directory. Nothing here ever
// throws — a sleeping dyno, a dead network or a garbage body must never break
// the game, which never waits on any of this.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NET_TIMEOUT_MS = void 0;
exports.toSnapshot = toSnapshot;
exports.createNetClient = createNetClient;
exports.createNetSession = createNetSession;
const identity_js_1 = require("./identity.js");
const hero_js_1 = require("../core/hero.js");
const monsters_js_1 = require("../core/monsters.js");
const api_js_1 = require("../shared/api.js");
/** Every request is abandoned after this long (Render's free tier cold-starts). */
exports.NET_TIMEOUT_MS = 5000;
/** The wire snapshot for `save` under `name`. */
function toSnapshot(name, save) {
    return {
        name,
        bestIndex: save.bestIndex,
        rebirths: save.rebirths,
        companions: save.companions,
        party: save.pvpParty ?? [],
        ...(save.hero ? { hero: save.hero.equipped } : {}),
    };
}
/** JSON body of `res`, or undefined when it is missing/unparsable (never throws). */
async function readJson(res) {
    try {
        return (await res.json());
    }
    catch {
        return undefined;
    }
}
const object = (v) => typeof v === 'object' && v !== null && !Array.isArray(v) ? v : null;
const integer = (v, min = 0, max = api_js_1.INT_MAX) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const playerId = (v) => typeof v === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(v);
const companionId = (v) => typeof v === 'string' && api_js_1.COMPANION_ID_RE.test(v);
/** All companion-bearing replies cross this boundary before reaching saves or sprites. */
function isCompanion(value) {
    const c = object(value);
    return !!c && companionId(c['id']) &&
        typeof c['speciesId'] === 'string' && monsters_js_1.SPECIES_IDS.includes(c['speciesId']) &&
        integer(c['bossIndex']) && integer(c['level'], 1, api_js_1.LEVEL_MAX) && integer(c['stars']);
}
function isOpponent(value) {
    const row = object(value);
    if (!row || (row['playerId'] !== undefined && !playerId(row['playerId'])) ||
        typeof row['name'] !== 'string' || !(api_js_1.NICK_RE.test(row['name']) || row['name'] === 'Training Dummy') ||
        !integer(row['bestIndex']) || !integer(row['rebirths']) ||
        (row['hero'] !== undefined && !(0, hero_js_1.isHeroRoll)(row['hero'])))
        return false;
    const party = row['party'];
    return Array.isArray(party) && party.length <= api_js_1.PARTY_SIZE_MAX && party.every(isCompanion) &&
        new Set(party.map((c) => c.id)).size === party.length;
}
function isOpponentList(value) {
    const rows = object(value)?.['opponents'];
    return Array.isArray(rows) && rows.length <= api_js_1.LEADERBOARD_MAX && rows.every((entry) => {
        const row = object(entry);
        return !!row && isOpponent(row) && playerId(row['playerId']) &&
            typeof row['name'] === 'string' && api_js_1.NICK_RE.test(row['name']) && (0, hero_js_1.isHeroRoll)(row['hero']) &&
            integer(row['rank'], 1) && integer(row['wins']) && integer(row['losses']);
    });
}
function isThefts(value) {
    return Array.isArray(value) && value.length <= api_js_1.THEFTS_MAX && value.every((entry) => {
        const theft = object(entry);
        return !!theft && companionId(theft['id']) && isCompanion(theft['companion']) &&
            companionId(theft['transferredId']) && playerId(theft['thiefId']) &&
            typeof theft['thiefName'] === 'string' && api_js_1.NICK_RE.test(theft['thiefName']) &&
            integer(theft['at'], 0, Number.MAX_SAFE_INTEGER) && integer(theft['reclaimUntil'], 0, Number.MAX_SAFE_INTEGER);
    });
}
function isSnapshotResponse(value) {
    const row = object(value);
    return !!row && integer(row['rank'], 1) && Array.isArray(row['removed']) &&
        row['removed'].every(companionId) && isThefts(row['thefts']);
}
function isMatchResponse(value) {
    const row = object(value);
    return !!row && playerId(row['matchId']) && integer(row['seed'], 0, 0xffffffff) &&
        typeof row['bot'] === 'boolean' && isOpponent(row['opponent']) &&
        integer(row['expiresAt'], 0, Number.MAX_SAFE_INTEGER);
}
function isPvpResponse(value) {
    const row = object(value);
    return !!row && typeof row['bot'] === 'boolean' && typeof row['win'] === 'boolean' &&
        integer(row['seed'], 0, 0xffffffff) && isOpponent(row['opponent']) &&
        (row['stolen'] === null || isCompanion(row['stolen'])) &&
        (row['lost'] === null || isCompanion(row['lost'])) &&
        Array.isArray(row['blows']) && row['blows'].every((entry) => {
        const blow = object(entry);
        return !!blow && (blow['side'] === 'A' || blow['side'] === 'D') &&
            companionId(blow['actorId']) && companionId(blow['targetId']) &&
            typeof blow['damage'] === 'string' && /^\d+$/.test(blow['damage']) && typeof blow['ko'] === 'boolean';
    });
}
/**
 * HTTP client for `/v1` (SERVER_ARCHITECTURE §3). `baseUrl === ''` means
 * offline: every method resolves `{ ok: false, error: 'offline' }` and fetch is
 * never called.
 */
function createNetClient(o) {
    const { baseUrl, fetchFn = fetch, timeoutMs = exports.NET_TIMEOUT_MS } = o;
    async function call(method, path, token, body, validate) {
        if (baseUrl === '')
            return { ok: false, error: 'offline' };
        let res;
        try {
            res = await fetchFn(`${baseUrl}${path}`, {
                method,
                headers: token === null
                    ? { 'content-type': 'application/json' }
                    : { 'content-type': 'application/json', authorization: `Bearer ${token}` },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(timeoutMs),
            });
        }
        catch {
            return { ok: false, error: 'network' };
        }
        if (res.status === 401)
            return { ok: false, error: 'unauthorized' };
        // v3: a dead match / a closed reclaim window, and a companion the thief no
        // longer holds — both are normal outcomes the menu explains, not failures.
        if (res.status === 410)
            return { ok: false, error: 'expired', status: 410 };
        if (res.status === 409)
            return { ok: false, error: 'gone', status: 409 };
        const parsed = await readJson(res);
        if (res.ok && parsed !== undefined) {
            return !validate || validate(parsed) ? { ok: true, value: parsed } : { ok: false, error: 'server' };
        }
        const error = (typeof parsed === 'object' && parsed !== null ? parsed : {});
        if (res.status === 429 && error.error === 'cooldown') {
            return { ok: false, error: 'cooldown', retryAfterSec: error.retryAfterSec };
        }
        return { ok: false, error: 'server', status: res.status };
    }
    return {
        register: (name) => call('POST', '/v1/players', null, { nickname: name }),
        upload: (token, snapshot) => call('PUT', '/v1/snapshot', token, snapshot, isSnapshotResponse),
        leaderboard: (token, n) => call('GET', `/v1/leaderboard?n=${n}`, token),
        opponents: (token) => call('GET', '/v1/pvp/opponents', token, undefined, isOpponentList),
        match: async (token, opponentId) => {
            const result = await call('POST', '/v1/pvp/match', token, { opponentId }, isMatchResponse);
            if (result.ok && opponentId !== undefined && (result.value.bot || result.value.opponent.playerId !== opponentId)) {
                return { ok: false, error: 'server' };
            }
            return result;
        },
        pvp: (token, body) => call('POST', '/v1/pvp', token, body, isPvpResponse),
        thefts: (token) => call('GET', '/v1/thefts', token, undefined, (value) => isThefts(object(value)?.['thefts'])),
        reclaim: (token, theftId) => call('POST', '/v1/reclaim', token, { theftId }, (value) => isCompanion(object(value)?.['companion'])),
    };
}
/**
 * Owns identity.json, lazy registration, the dirty roster key, the sync moments
 * and the once-per-session re-register after a 401 (SERVER_ARCHITECTURE §6).
 */
function createNetSession(deps) {
    const { client, userDataDir, online, randomUUID } = deps;
    let identity = (0, identity_js_1.readIdentity)(userDataDir, randomUUID);
    let historyDirty = false;
    /** Last save handed to the session; the source of every upload. */
    let lastSave = null;
    /** Roster key the server already has; null = nothing uploaded yet. */
    let syncedKey = null;
    let reRegistered = false;
    /** Keep bindings for retries and concurrent callbacks throughout this session. */
    const selectedOpponents = new Map();
    /** bestIndex is deliberately absent: kills at the frontier must not spam PUTs. */
    const rosterKey = (save) => JSON.stringify([identity.name, save.rebirths, save.companions, save.pvpParty ?? [], save.hero?.equipped]);
    const payload = () => ({ name: identity.name, playerId: identity.playerId, online });
    const store = (next) => {
        identity = next;
        (0, identity_js_1.writeIdentity)(userDataDir, next);
    };
    async function ensureRegistered() {
        if (identity.token !== null)
            return { ok: true, value: identity.token };
        const res = await client.register(identity.name);
        if (!res.ok)
            return res;
        store({ ...identity, playerId: res.value.playerId, token: res.value.token });
        return { ok: true, value: res.value.token };
    }
    /** Registers if needed, then runs `send`; a 401 re-registers and retries ONCE per session. */
    async function withToken(send) {
        const first = await ensureRegistered();
        if (!first.ok)
            return first;
        const res = await send(first.value);
        if (res.ok || res.error !== 'unauthorized' || reRegistered)
            return res;
        reRegistered = true;
        store({ ...identity, playerId: null, token: null });
        const second = await ensureRegistered();
        if (!second.ok)
            return second;
        return send(second.value);
    }
    async function upload() {
        if (lastSave === null)
            return null;
        const key = rosterKey(lastSave);
        const snapshot = toSnapshot(identity.name, lastSave);
        const res = await withToken((token) => client.upload(token, snapshot));
        if (res.ok)
            syncedKey = key;
        return res;
    }
    const uploadIfDirty = async () => lastSave !== null && rosterKey(lastSave) !== syncedKey ? upload() : null;
    /** Companion ids the server stripped on the pre-flight upload, for the menu to drop. */
    const removedOf = (res) => res !== null && res.ok ? res.value.removed : [];
    return {
        pvpHistory() {
            const history = (0, identity_js_1.parsePvpHistory)(identity.pvpHistory);
            return { wins: history.wins, losses: history.losses };
        },
        identity() {
            void uploadIfDirty();
            return payload();
        },
        setName(name) {
            if ((0, identity_js_1.isValidName)(name)) {
                const next = { ...identity, name };
                if ((0, identity_js_1.writeIdentity)(userDataDir, next))
                    identity = next;
            }
            return payload();
        },
        onSave(save) {
            if (historyDirty)
                historyDirty = !(0, identity_js_1.writeIdentity)(userDataDir, identity);
            lastSave = save;
            void uploadIfDirty();
        },
        async leaderboard(n) {
            const removed = removedOf(await uploadIfDirty());
            const res = await withToken((token) => client.leaderboard(token, n));
            return res.ok ? { ok: true, value: { ...res.value, removed } } : res;
        },
        async opponents() {
            const uploaded = await uploadIfDirty();
            if (uploaded && !uploaded.ok)
                return uploaded;
            return withToken((token) => client.opponents(token));
        },
        async match(opponentId) {
            // Upload first when dirty: the opponent picker must see my current party.
            const uploaded = await uploadIfDirty();
            if (uploaded && !uploaded.ok)
                return uploaded;
            const res = await withToken((token) => client.match(token, opponentId));
            if (res.ok && opponentId !== undefined) {
                if (res.value.bot !== false || res.value.opponent?.playerId !== opponentId)
                    return { ok: false, error: 'server' };
                selectedOpponents.set(res.value.matchId, opponentId);
            }
            return res;
        },
        async pvp(matchId, party) {
            const expectedOpponent = selectedOpponents.get(matchId);
            const uploaded = await upload();
            if (uploaded && !uploaded.ok)
                return uploaded;
            const removed = removedOf(uploaded);
            const res = await withToken((token) => client.pvp(token, { matchId, party }));
            if (res.ok && expectedOpponent !== undefined &&
                (res.value.bot !== false || res.value.opponent?.playerId !== expectedOpponent))
                return { ok: false, error: 'server' };
            if (res.ok && res.value?.bot === false && typeof res.value.win === 'boolean') {
                const previous = identity.pvpHistory ?? (0, identity_js_1.parsePvpHistory)(undefined);
                const next = (0, identity_js_1.recordPvpHistory)(previous, matchId, res.value.win);
                if (next !== previous) {
                    // Synchronous replacement before returning also serializes concurrent
                    // callbacks for one match. A failed disk write is reported and retried.
                    identity = { ...identity, pvpHistory: next };
                    historyDirty = !(0, identity_js_1.writeIdentity)(userDataDir, identity);
                }
            }
            return res.ok ? { ok: true, value: { ...res.value, removed, ...(historyDirty ? { historySaved: false } : {}) } } : res;
        },
        thefts: () => withToken((token) => client.thefts(token)),
        reclaim: (theftId) => withToken((token) => client.reclaim(token, theftId)),
    };
}
