"use strict";
// T39 — the application handler (SPEC F44, SERVER_ARCHITECTURE §2–§4).
// A trust boundary: every request is rate limited, authenticated and shape-
// validated before it reaches the store, and handle() never throws — a store
// failure becomes 500 `internal`. The clock, the ids and the randomness are
// injected (deps), so tests are deterministic and this file has no wall clock.
Object.defineProperty(exports, "__esModule", { value: true });
exports.matches = exports.BOT_NAME = exports.STOLEN_IDS_MAX = exports.PVP_COOLDOWN_MS = exports.RATE_WINDOW_MS = exports.RATE_LIMIT = void 0;
exports.parseSnapshot = parseSnapshot;
exports.createApp = createApp;
const node_crypto_1 = require("node:crypto");
const hero_js_1 = require("../core/hero.js");
const index_js_1 = require("../core/index.js");
const api_js_1 = require("../shared/api.js");
const store_js_1 = require("./store.js");
/** Requests per key per window (SERVER_ARCHITECTURE §3). */
exports.RATE_LIMIT = 60;
exports.RATE_WINDOW_MS = 60_000;
/** Shortest gap between two matches of the same caller (SERVER_ARCHITECTURE §3). */
exports.PVP_COOLDOWN_MS = 60_000;
/** How many stolen companion ids a player carries until the next upload. */
exports.STOLEN_IDS_MAX = 32;
/** The opponent everyone gets while they are alone on the leaderboard. */
exports.BOT_NAME = 'Training Dummy';
/**
 * Pending matches, keyed by match id (exported so the tests can watch the TTL).
 * ponytail: module memory, because one free instance is the whole deployment —
 * a restart or a second instance loses them and the client just asks again. A
 * `matches` table is the multi-instance upgrade.
 */
exports.matches = new Map();
/** Above this the fixed-window map is swept of expired keys. */
const RATE_KEYS_MAX = 10_000;
const record = (v) => typeof v === 'object' && v !== null && !Array.isArray(v) ? v : null;
const isInt = (v, min, max) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const sha256 = (value) => (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
const error = (status, code, retryAfterSec) => ({
    status,
    body: retryAfterSec === undefined ? { error: code } : { error: code, retryAfterSec },
});
/**
 * Validates a self-reported snapshot against the caps of SERVER_ARCHITECTURE
 * §2. Never throws; null on any violation. Unknown extra fields are dropped
 * (forward compatibility), so the returned object is a fresh, minimal copy.
 */
function parseSnapshot(raw) {
    const s = record(raw);
    if (!s) {
        return null;
    }
    const { name, bestIndex, rebirths, companions } = s;
    if (typeof name !== 'string' || !api_js_1.NICK_RE.test(name)) {
        return null;
    }
    if (!isInt(bestIndex, 0, api_js_1.INT_MAX) || !isInt(rebirths, 0, api_js_1.INT_MAX)) {
        return null;
    }
    if (!Array.isArray(companions) || companions.length > index_js_1.ROSTER_CAP) {
        return null;
    }
    const roster = [];
    const ids = new Set();
    for (const entry of companions) {
        const c = record(entry);
        if (!c) {
            return null;
        }
        const { id, speciesId, bossIndex, level, stars } = c;
        if (typeof id !== 'string' || !api_js_1.COMPANION_ID_RE.test(id) || ids.has(id)) {
            return null;
        }
        if (typeof speciesId !== 'string' || !index_js_1.SPECIES_IDS.includes(speciesId)) {
            return null;
        }
        if (!isInt(bossIndex, 0, api_js_1.INT_MAX) ||
            !isInt(level, api_js_1.LEVEL_MIN, api_js_1.LEVEL_MAX) ||
            !isInt(stars, 0, api_js_1.INT_MAX)) {
            return null;
        }
        ids.add(id);
        roster.push({ id, speciesId, bossIndex, level, stars });
    }
    // The party is advisory presentation state: bad ids are DROPPED (a v2 client
    // sends none at all), never a reason to reject the whole upload.
    const party = (Array.isArray(s['party']) ? s['party'] : [])
        .filter((id) => typeof id === 'string' && api_js_1.COMPANION_ID_RE.test(id) && ids.has(id))
        .filter((id, i, all) => all.indexOf(id) === i)
        .slice(0, api_js_1.PARTY_SIZE_MAX);
    if (s['hero'] !== undefined && !(0, hero_js_1.isHeroRoll)(s['hero']))
        return null;
    const hero = (0, hero_js_1.isHeroRoll)(s['hero'])
        ? { formId: s['hero'].formId, buffPercent: s['hero'].buffPercent,
            ...(s['hero'].stacks !== undefined ? { stacks: s['hero'].stacks } : {}) }
        : undefined;
    return { name, bestIndex, rebirths, companions: roster, party, ...(hero ? { hero } : {}) };
}
/** Forgets every match nobody fought within `MATCH_TTL_MS`. */
const prune = (at) => {
    for (const [id, pending] of exports.matches) {
        if (at - pending.createdAt > api_js_1.MATCH_TTL_MS) {
            exports.matches.delete(id);
        }
    }
};
function createApp(deps) {
    /** The theft records still inside their reclaim window. */
    const pending = (row) => row.thefts.filter((t) => t.reclaimUntil >= deps.now());
    const windows = new Map();
    /** Fixed window per token hash (else per ip). Returns retryAfterSec when over. */
    const overLimit = (req) => {
        const at = deps.now();
        if (windows.size > RATE_KEYS_MAX) {
            for (const [key, w] of windows) {
                if (at - w.start >= exports.RATE_WINDOW_MS) {
                    windows.delete(key);
                }
            }
        }
        const key = req.auth === null ? `ip:${req.ip}` : sha256(req.auth);
        const window = windows.get(key);
        if (!window || at - window.start >= exports.RATE_WINDOW_MS) {
            windows.set(key, { start: at, count: 1 });
            return null;
        }
        window.count += 1;
        return window.count > exports.RATE_LIMIT
            ? Math.ceil((exports.RATE_WINDOW_MS - (at - window.start)) / 1000)
            : null;
    };
    const caller = async (req, store) => req.auth === null ? null : store.getByToken(sha256(req.auth));
    const register = async (req, store) => {
        const nickname = record(req.body)?.nickname;
        if (typeof nickname !== 'string' || !api_js_1.NICK_RE.test(nickname)) {
            return error(400, 'bad_request');
        }
        const token = deps.randomBytesHex(16);
        const playerId = deps.randomUUID();
        await store.createPlayer({ id: playerId, tokenHash: sha256(token), name: nickname });
        return { status: 201, body: { playerId, token } };
    };
    const upload = async (req, store) => {
        const me = await caller(req, store);
        if (!me) {
            return error(401, 'unauthorized');
        }
        const snapshot = parseSnapshot(req.body);
        if (!snapshot) {
            return error(400, 'bad_request');
        }
        // The defender learns what PvP took from it here, on whichever upload
        // comes first; stripping stays idempotent because stolenIds is kept.
        const removed = snapshot.companions
            .filter((c) => me.stolenIds.includes(c.id))
            .map((c) => c.id);
        const kept = {
            ...snapshot,
            companions: snapshot.companions.filter((c) => !removed.includes(c.id)),
        };
        await store.putSnapshot(me.id, kept);
        return { status: 200, body: { rank: await store.rank(kept), removed, thefts: pending(me) } };
    };
    const row = (s, rank) => ({
        rank,
        name: s.name,
        bestIndex: s.bestIndex,
        rebirths: s.rebirths,
    });
    const leaderboard = async (req, store) => {
        let me = null;
        if (req.auth !== null) {
            const mine = await caller(req, store);
            if (!mine) {
                return error(401, 'unauthorized');
            }
            if (mine.snapshot) {
                me = row(mine.snapshot, await store.rank(mine.snapshot));
            }
        }
        const asked = Number.parseInt(req.query.n ?? '', 10);
        const n = Number.isNaN(asked)
            ? api_js_1.LEADERBOARD_DEFAULT
            : Math.min(Math.max(asked, 1), api_js_1.LEADERBOARD_MAX);
        const scores = (await store.top(n))
            .map((r) => r.snapshot)
            .filter((s) => s !== null);
        // The list is a prefix of the global order, so the first equal score in it
        // is the shared rank of the tie group (n ≤ 50 — the scan is free).
        const top = scores.map((s) => row(s, scores.findIndex((o) => (0, store_js_1.compareScore)(o, s) === 0) + 1));
        return { status: 200, body: { top, me } };
    };
    const opponents = async (req, store) => {
        const me = await caller(req, store);
        if (!me)
            return error(401, 'unauthorized');
        const ranked = await store.top(api_js_1.LEADERBOARD_MAX + 1);
        const rows = ranked.filter((r) => r.id !== me.id).slice(0, api_js_1.LEADERBOARD_MAX);
        const listed = [];
        for (const foe of rows) {
            const s = foe.snapshot;
            if (!s)
                continue;
            listed.push({
                playerId: foe.id,
                rank: ranked.findIndex((r) => r.snapshot && (0, store_js_1.compareScore)(r.snapshot, s) === 0) + 1,
                name: s.name,
                bestIndex: s.bestIndex,
                rebirths: s.rebirths,
                hero: s.hero ?? { formId: 'h00', buffPercent: 0 },
                party: (0, index_js_1.pvpParty)(s.companions, s.party ?? [], s.hero),
                wins: foe.wins,
                losses: foe.losses,
            });
        }
        return { status: 200, body: { opponents: listed } };
    };
    /**
     * T60 — step 2 of a battle (SPEC F45/F69, SERVER_ARCHITECTURE_V3 §3): fight
     * the party the caller picked against the party its match parked, with core's
     * `resolvePvp` seeded from the match — the server owns the roster bookkeeping
     * only. Steals are attacker-only; the victim gets a theft record to reclaim
     * from. A trust boundary: the body and every party id are checked here.
     */
    const pvp = async (req, store) => {
        const me = await caller(req, store);
        if (!me) {
            return error(401, 'unauthorized');
        }
        const at = deps.now();
        const elapsed = me.lastPvpAt === null ? exports.PVP_COOLDOWN_MS : at - me.lastPvpAt;
        if (elapsed < exports.PVP_COOLDOWN_MS) {
            return error(429, 'cooldown', Math.ceil((exports.PVP_COOLDOWN_MS - elapsed) / 1000));
        }
        const mine = me.snapshot;
        if (!mine) {
            return error(400, 'no_snapshot');
        }
        const asked = record(req.body);
        const matchId = asked?.['matchId'];
        const ids = asked?.['party'];
        // A v2 body (no matchId) is a stale client, not a stale match.
        if (typeof matchId !== 'string' ||
            !Array.isArray(ids) ||
            !ids.every((id) => typeof id === 'string')) {
            return error(400, 'bad_request');
        }
        prune(at);
        const pending = exports.matches.get(matchId);
        if (!pending || pending.playerId !== me.id) {
            return error(410, 'match_expired');
        }
        if (ids.length > api_js_1.PARTY_SIZE_MAX || !ids.every((id) => mine.companions.some((c) => c.id === id))) {
            // The match survives a bad party: the client just picks again.
            return error(400, 'bad_party');
        }
        const party = (0, index_js_1.pvpParty)(mine.companions, ids, mine.hero);
        // Spend the token before awaiting writes; a failed transaction rolls back
        // state and the client may create a fresh preview.
        exports.matches.delete(matchId);
        // Bot matches burn the cooldown too — it is what bounds the whole endpoint.
        await store.setLastPvpAt(me.id, at);
        const { seed, opponentParty } = pending;
        const verdict = (0, index_js_1.resolvePvp)(party, opponentParty, (0, index_js_1.mulberry32)(seed), mine.companions.length, {
            attacker: mine.hero,
            defender: pending.opponentHero,
        });
        const foe = pending.opponentId === null ? null : await store.getById(pending.opponentId);
        const theirs = foe?.snapshot ?? null;
        const opponent = {
            ...(pending.opponentId !== null ? { playerId: pending.opponentId } : {}),
            name: theirs?.name ?? exports.BOT_NAME,
            bestIndex: theirs?.bestIndex ?? mine.bestIndex,
            rebirths: theirs?.rebirths ?? mine.rebirths,
            party: opponentParty,
            ...(pending.opponentHero ? { hero: pending.opponentHero } : {}),
        };
        // The bot never steals and is never stolen from; powers stay off the wire.
        const moved = foe && theirs && verdict.moved
            ? theirs.companions.find((c) => c.id === verdict.moved?.id) ?? null : null;
        if (foe && theirs) {
            await store.recordBattle(verdict.attackerWon ? me.id : foe.id, verdict.attackerWon ? foe.id : me.id);
        }
        let stolen = null;
        if (foe && theirs && moved) {
            // Repeated seeds must never overwrite an existing companion/theft id.
            let suffix = String(seed);
            while (mine.companions.some((c) => c.id === `s${suffix}`) || me.stolenIds.includes(`s${suffix}`) || foe.thefts.some((t) => t.id === `t${suffix}`)) {
                suffix = deps.randomBytesHex(7);
            }
            const transferred = { ...moved, id: `s${suffix}` };
            await store.setStolenIds(foe.id, [...foe.stolenIds, moved.id].slice(-exports.STOLEN_IDS_MAX));
            await store.putSnapshot(foe.id, {
                ...theirs,
                companions: theirs.companions.filter((c) => c.id !== moved.id),
                party: (theirs.party ?? []).filter((id) => id !== moved.id),
            });
            await store.putSnapshot(me.id, { ...mine, companions: [...mine.companions, transferred] });
            await store.setThefts(foe.id, [
                ...foe.thefts,
                {
                    id: `t${suffix}`,
                    companion: moved,
                    transferredId: transferred.id,
                    thiefId: me.id,
                    thiefName: me.name,
                    at,
                    reclaimUntil: at + api_js_1.RECLAIM_WINDOW_MS,
                },
            ].slice(-api_js_1.THEFTS_MAX));
            stolen = transferred;
        }
        const answer = {
            bot: pending.opponentId === null,
            seed,
            win: verdict.attackerWon,
            opponent,
            blows: verdict.blows.map((b) => ({ ...b, damage: String(b.damage) })),
            stolen,
            lost: null,
        };
        return { status: 200, body: answer };
    };
    /**
     * T54 — step 1 of a battle (SPEC F68, SERVER_ARCHITECTURE_V3 §3): the same
     * neighbour pick as `/v1/pvp`, but it only shows the opponent's party and
     * parks the seed under a match id. No cooldown, no store writes.
     */
    const match = async (req, store) => {
        const me = await caller(req, store);
        if (!me) {
            return error(401, 'unauthorized');
        }
        const mine = me.snapshot;
        if (!mine) {
            return error(400, 'no_snapshot');
        }
        const at = deps.now();
        prune(at);
        const seed = deps.randomSeed() >>> 0;
        const selected = record(req.body)?.['opponentId'];
        if (selected !== undefined && (typeof selected !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(selected) || selected === me.id)) {
            return error(400, 'bad_opponent');
        }
        let foe;
        if (typeof selected === 'string') {
            foe = await store.getById(selected);
            if (!foe?.snapshot)
                return error(404, 'opponent_missing');
        }
        else {
            const up = await store.neighbor(me.id, mine, 'up');
            const down = await store.neighbor(me.id, mine, 'down');
            foe = up && down ? (seed & 1 ? down : up) : (up ?? down);
        }
        const theirs = foe?.snapshot ?? null;
        const opponent = foe && theirs
            ? {
                playerId: foe.id,
                name: theirs.name,
                bestIndex: theirs.bestIndex,
                rebirths: theirs.rebirths,
                party: (0, index_js_1.pvpParty)(theirs.companions, theirs.party ?? [], theirs.hero),
                ...(theirs.hero ? { hero: theirs.hero } : {}),
            }
            : { name: exports.BOT_NAME, bestIndex: mine.bestIndex, rebirths: mine.rebirths, party: [] };
        const matchId = deps.randomBytesHex(8);
        exports.matches.set(matchId, {
            matchId,
            playerId: me.id,
            opponentId: foe?.id ?? null,
            seed,
            opponentParty: opponent.party,
            ...(opponent.hero ? { opponentHero: opponent.hero } : {}),
            createdAt: at,
        });
        return {
            status: 200,
            body: { matchId, seed, bot: theirs === null, opponent, expiresAt: at + api_js_1.MATCH_TTL_MS },
        };
    };
    /** T61 — the victim's inbox; reading it also drops what can no longer be taken back. */
    const thefts = async (req, store) => {
        const me = await caller(req, store);
        if (!me) {
            return error(401, 'unauthorized');
        }
        const open = pending(me);
        if (open.length !== me.thefts.length) {
            await store.setThefts(me.id, open);
        }
        return { status: 200, body: { thefts: open } };
    };
    /**
     * T61 — take a stolen companion back (SPEC F70, SERVER_ARCHITECTURE_V3 §3).
     * Only from MY own row, only while the window is open, and only while the
     * thief still holds it; every dead record is pruned on the way out.
     */
    const reclaim = async (req, store) => {
        const me = await caller(req, store);
        if (!me) {
            return error(401, 'unauthorized');
        }
        const theftId = record(req.body)?.['theftId'];
        const theft = me.thefts.find((t) => t.id === theftId);
        if (!theft) {
            return error(404, 'not_found');
        }
        const rest = me.thefts.filter((t) => t !== theft);
        if (deps.now() > theft.reclaimUntil) {
            await store.setThefts(me.id, rest);
            return error(410, 'expired');
        }
        const thief = await store.getById(theft.thiefId);
        const held = thief?.snapshot ?? null;
        if (!thief || !held || !held.companions.some((c) => c.id === theft.transferredId)) {
            await store.setThefts(me.id, rest);
            return error(409, 'gone');
        }
        let reclaimedId = `r${theft.id.slice(1)}`;
        while (me.snapshot?.companions.some((c) => c.id === reclaimedId) || me.stolenIds.includes(reclaimedId)) {
            reclaimedId = `r${deps.randomBytesHex(7)}`;
        }
        const companion = { ...theft.companion, id: reclaimedId };
        // All roster moves and theft bookkeeping share the request transaction.
        await store.setStolenIds(thief.id, [...thief.stolenIds, theft.transferredId].slice(-exports.STOLEN_IDS_MAX));
        await store.putSnapshot(thief.id, {
            ...held,
            companions: held.companions.filter((c) => c.id !== theft.transferredId),
            party: (held.party ?? []).filter((id) => id !== theft.transferredId),
        });
        // A full roster still answers 200: the client's addCompanion rule drops it.
        if (me.snapshot && me.snapshot.companions.length < index_js_1.ROSTER_CAP) {
            await store.putSnapshot(me.id, {
                ...me.snapshot,
                companions: [...me.snapshot.companions, companion],
            });
        }
        await store.setThefts(me.id, rest);
        return { status: 200, body: { companion } };
    };
    const route = async (req, store) => {
        if (req.method === 'POST' && req.path === '/v1/players') {
            return register(req, store);
        }
        if (req.method === 'PUT' && req.path === '/v1/snapshot') {
            return upload(req, store);
        }
        if (req.method === 'GET' && req.path === '/v1/leaderboard') {
            return leaderboard(req, store);
        }
        if (req.method === 'GET' && req.path === '/v1/pvp/opponents') {
            return opponents(req, store);
        }
        if (req.method === 'POST' && req.path === '/v1/pvp/match') {
            return match(req, store);
        }
        if (req.method === 'POST' && req.path === '/v1/pvp') {
            return pvp(req, store);
        }
        if (req.method === 'GET' && req.path === '/v1/thefts') {
            return thefts(req, store);
        }
        if (req.method === 'POST' && req.path === '/v1/reclaim') {
            return reclaim(req, store);
        }
        return error(404, 'not_found');
    };
    return {
        handle: async (req) => {
            try {
                const retryAfterSec = overLimit(req);
                return retryAfterSec === null
                    ? await deps.store.transaction((store) => route(req, store))
                    : error(429, 'rate_limited', retryAfterSec);
            }
            catch {
                return error(500, 'internal');
            }
        },
    };
}
