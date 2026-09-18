"use strict";
// Net client + net session (SPEC F48; SERVER_ARCHITECTURE §6). Electron-free:
// `fetch`, the userData directory and randomUUID are injected, so the whole
// module is testable with a fake fetch and a tmp directory. Nothing here ever
// throws — a sleeping dyno, a dead network or a garbage body must never break
// the game, which never waits on any of this.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NET_TIMEOUT_MS = void 0;
exports.toSnapshot = toSnapshot;
exports.isGoldState = isGoldState;
exports.isPvpPresentation = isPvpPresentation;
exports.isPvpResponse = isPvpResponse;
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
        ...(save.level === undefined ? {} : { level: save.level }),
        bestIndex: save.bestIndex,
        rebirths: save.rebirths,
        companions: save.companions,
        party: save.pvpParty ?? [],
        ...(save.hero ? { hero: save.hero.equipped } : {}),
        ...(save.coins === undefined ? {} : { gold: { revision: save.goldRevision ?? 0, coins: save.coins } }),
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
        row['removed'].every(companionId) && isThefts(row['thefts']) &&
        (row['gold'] === undefined || isGoldState(row['gold']));
}
function isGoldState(value) {
    const row = object(value);
    return !!row && integer(row['revision'], 0, Number.MAX_SAFE_INTEGER) && integer(row['balance'], 0, Number.MAX_SAFE_INTEGER) &&
        typeof row['net'] === 'string' && /^(0|-?[1-9]\d{0,39})$/.test(row['net']);
}
function isPvpPresentation(value) {
    const row = object(value), replay = object(row?.['replay']);
    if (!row || !replay || !playerId(row['battleId']) || !['attack', 'defense'].includes(String(row['role'])) ||
        typeof row['won'] !== 'boolean' || !integer(row['goldDelta'], -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))
        return false;
    return isPvpResponse({ bot: false, seed: 0, win: row['won'], stolen: null, lost: null,
        ownParty: row['ownParty'], ownHero: row['ownHero'], blows: replay['blows'],
        opponent: { name: replay['opponentName'], bestIndex: 0, rebirths: 0, party: replay['opponentParty'], hero: replay['opponentHero'] } }) &&
        Array.isArray(row['ownParty']);
}
function isDefenseEvents(value) {
    const row = object(value);
    if (!row || !integer(row['latestSeq'], 0, Number.MAX_SAFE_INTEGER) || !Array.isArray(row['events']) || row['events'].length > 5)
        return false;
    let previous = 0;
    return row['events'].every(value => {
        const event = object(value);
        if (!event || !integer(event['seq'], previous + 1, Number(row['latestSeq'])) || !integer(event['at'], 0, Number.MAX_SAFE_INTEGER) ||
            !isPvpPresentation(event['presentation']) || event['presentation'].role !== 'defense')
            return false;
        previous = Number(event['seq']);
        return true;
    });
}
function isMatchResponse(value) {
    const row = object(value);
    return !!row && playerId(row['matchId']) && integer(row['seed'], 0, 0xffffffff) &&
        typeof row['bot'] === 'boolean' && isOpponent(row['opponent']) &&
        integer(row['expiresAt'], 0, Number.MAX_SAFE_INTEGER);
}
function isPvpResponse(value) {
    const row = object(value);
    const gold = object(row?.['gold']);
    return !!row && typeof row['bot'] === 'boolean' && typeof row['win'] === 'boolean' &&
        integer(row['seed'], 0, 0xffffffff) && isOpponent(row['opponent']) &&
        (row['stolen'] === null || isCompanion(row['stolen'])) &&
        (row['lost'] === null || isCompanion(row['lost'])) &&
        (row['ownParty'] === undefined || (Array.isArray(row['ownParty']) && row['ownParty'].length <= api_js_1.PARTY_SIZE_MAX &&
            row['ownParty'].every(isCompanion) && new Set(row['ownParty'].map(c => c.id)).size === row['ownParty'].length)) &&
        (row['ownHero'] === undefined || (0, hero_js_1.isHeroRoll)(row['ownHero'])) &&
        (row['gold'] === undefined || (!!gold && integer(gold['amount'], 0, 75) &&
            integer(gold['delta'], -75, 75) && Math.abs(Number(gold['delta'])) === gold['amount'] &&
            (row['win'] ? Number(gold['delta']) >= 0 : Number(gold['delta']) <= 0) &&
            ['transfer', 'protected', 'daily-limit', 'pair-protection', 'capacity', 'bot'].includes(String(gold['reason'])))) &&
        (row['record'] === undefined || (object(row['record']) !== null && integer(object(row['record'])?.['wins']) && integer(object(row['record'])?.['losses']))) &&
        Array.isArray(row['blows']) && row['blows'].length <= 1000 && row['blows'].every((entry) => {
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
        const parsed = await readJson(res);
        if (res.ok && parsed !== undefined) {
            return !validate || validate(parsed) ? { ok: true, value: parsed } : { ok: false, error: 'server' };
        }
        const error = (typeof parsed === 'object' && parsed !== null ? parsed : {});
        if (error.error === 'upgrade_required')
            return { ok: false, error: 'sync-required', status: res.status };
        if (error.error === 'gold_conflict')
            return { ok: false, error: 'gold-conflict', status: res.status };
        if (error.error === 'defense_cooldown' || error.error === 'inbox_full')
            return { ok: false, error: 'opponent-busy', retryAfterSec: error.retryAfterSec };
        if (res.status === 409)
            return { ok: false, error: 'gone', status: 409 };
        if (res.status === 400 && error.error === 'bad_party')
            return { ok: false, error: 'stale-party', status: 400 };
        if (res.status === 429 && error.error === 'cooldown') {
            return { ok: false, error: 'cooldown', retryAfterSec: error.retryAfterSec };
        }
        return { ok: false, error: 'server', status: res.status };
    }
    return {
        register: (name) => call('POST', '/v1/players', null, { nickname: name }),
        upload: (token, snapshot) => call('PUT', '/v1/snapshot', token, snapshot, isSnapshotResponse),
        leaderboard: (token, n, metric) => call('GET', `/v1/leaderboard?n=${n}${metric ? `&metric=${metric}` : ''}`, token),
        me: (token) => call('GET', '/v1/me', token, undefined, (value) => {
            const row = object(value);
            const match = object(row?.['lastMatch']);
            const reclaim = object(row?.['lastReclaim']);
            return !!row && row['version'] === 9 && integer(row['wins']) && integer(row['losses']) &&
                (row['pvpMode'] === undefined || row['pvpMode'] === 'gold-v1') && (row['gold'] === undefined || isGoldState(row['gold'])) &&
                Array.isArray(row['revokedIds']) && row['revokedIds'].every(companionId) &&
                (row['lastMatch'] === null || (!!match && playerId(match['matchId']) && isPvpResponse(match['result']))) &&
                (row['lastReclaim'] === null || (!!reclaim && typeof reclaim['theftId'] === 'string' &&
                    /^t[\da-f]+$/.test(reclaim['theftId']) && isCompanion(reclaim['companion'])));
        }),
        events: (token, after) => call('GET', `/v1/pvp/events?after=${after}`, token, undefined, isDefenseEvents),
        ackEvents: (token, through) => call('POST', '/v1/pvp/events/ack', token, { through }, value => object(value)?.['ok'] === true),
        opponents: (token) => call('GET', '/v1/pvp/opponents', token, undefined, isOpponentList),
        match: async (token, opponentId) => {
            const result = await call('POST', '/v1/pvp/match', token, { opponentId, mode: 'gold-v1' }, isMatchResponse);
            if (result.ok && opponentId !== undefined && (result.value.bot || result.value.opponent.playerId !== opponentId)) {
                return { ok: false, error: 'server' };
            }
            return result;
        },
        pvp: (token, body) => call('POST', '/v1/pvp', token, { ...body, mode: 'gold-v1' }, isPvpResponse),
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
    let goldRevision = 0;
    /** Roster key the server already has; null = nothing uploaded yet. */
    let syncedKey = null;
    let reRegistered = false;
    let registration = null;
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
        registration ??= (async () => {
            const res = await client.register(identity.name);
            if (!res.ok)
                return res;
            const next = { ...identity, playerId: res.value.playerId, token: res.value.token };
            if (!(0, identity_js_1.writeIdentity)(userDataDir, next))
                return { ok: false, error: 'server' };
            identity = next;
            return { ok: true, value: res.value.token };
        })();
        try {
            return await registration;
        }
        finally {
            registration = null;
        }
    }
    /** Registers if needed, then runs `send`; a 401 re-registers and retries ONCE per session. */
    async function withToken(send) {
        const first = await ensureRegistered();
        if (!first.ok)
            return first;
        const res = await send(first.value);
        if (res.ok || res.error !== 'unauthorized' || reRegistered || deps.managed)
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
        const snapshot = toSnapshot(identity.name, { ...lastSave, goldRevision });
        const res = await withToken((token) => client.upload(token, snapshot));
        if (res.ok) {
            syncedKey = key;
            if (res.value.gold)
                goldRevision = res.value.gold.revision;
        }
        return res;
    }
    const uploadIfDirty = async () => lastSave !== null && rosterKey(lastSave) !== syncedKey ? upload() : null;
    /** Companion ids the server stripped on the pre-flight upload, for the menu to drop. */
    const removedOf = (res) => res !== null && res.ok ? res.value.removed : [];
    return {
        setGoldRevision(revision) { goldRevision = revision; },
        events: after => client.events ? withToken(token => client.events(token, after)) : Promise.resolve({ ok: false, error: 'sync-required' }),
        ackEvents: through => client.ackEvents ? withToken(token => client.ackEvents(token, through)) : Promise.resolve({ ok: false, error: 'sync-required' }),
        async me() {
            if (!client.me)
                return { ok: false, error: 'server' };
            const result = await withToken(token => client.me(token));
            if (result.ok) {
                identity = { ...identity, pvpHistory: { ...(0, identity_js_1.parsePvpHistory)(identity.pvpHistory), wins: result.value.wins, losses: result.value.losses } };
                historyDirty = !(0, identity_js_1.writeIdentity)(userDataDir, identity);
            }
            return result;
        },
        async sync() { return await upload() ?? { ok: false, error: 'offline' }; },
        pvpHistory() {
            const history = (0, identity_js_1.parsePvpHistory)(identity.pvpHistory);
            return { wins: history.wins, losses: history.losses };
        },
        identity() {
            if (!deps.managed)
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
            if (!deps.managed)
                void uploadIfDirty();
        },
        async leaderboard(n, metric) {
            const removed = removedOf(deps.managed ? null : await upload());
            const res = await withToken((token) => client.leaderboard(token, n, metric));
            return res.ok ? { ok: true, value: { ...res.value, removed } } : res;
        },
        async opponents() {
            const uploaded = deps.managed ? null : await uploadIfDirty();
            if (uploaded && !uploaded.ok)
                return uploaded;
            return withToken((token) => client.opponents(token));
        },
        async match(opponentId) {
            // Upload first when dirty: the opponent picker must see my current party.
            const uploaded = deps.managed ? null : await uploadIfDirty();
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
        async pvp(matchId, party, skipUpload = false) {
            const expectedOpponent = selectedOpponents.get(matchId);
            const uploaded = skipUpload ? null : await upload();
            if (uploaded && !uploaded.ok)
                return uploaded;
            const removed = removedOf(uploaded);
            const res = await withToken((token) => client.pvp(token, { matchId, party }));
            if (res.ok && expectedOpponent !== undefined &&
                (res.value.bot !== false || res.value.opponent?.playerId !== expectedOpponent))
                return { ok: false, error: 'server' };
            if (res.ok && res.value?.bot === false && typeof res.value.win === 'boolean') {
                const previous = identity.pvpHistory ?? (0, identity_js_1.parsePvpHistory)(undefined);
                const next = res.value.record
                    ? { ...(0, identity_js_1.recordPvpHistory)(previous, matchId, res.value.win), ...res.value.record }
                    : (0, identity_js_1.recordPvpHistory)(previous, matchId, res.value.win);
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
