"use strict";
// T39 — player storage (SPEC F44, SERVER_ARCHITECTURE §4). One interface for
// both backends: MemoryStore here (tests + DB-less runs), PgStore later. Every
// method is async so the two stay interchangeable.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
exports.compareScore = compareScore;
exports.metricValue = metricValue;
exports.compareMetric = compareMetric;
/** Sort comparator for the leaderboard order: bestIndex DESC, then rebirths DESC. */
function compareScore(a, b) {
    return b.bestIndex - a.bestIndex || b.rebirths - a.rebirths;
}
/** A selected metric has no hidden secondary score: equal values share a rank. */
function metricValue(key, metric) {
    return metric === 'pvpWins' ? key.wins ?? 0 : key[metric] ?? 0;
}
function compareMetric(a, b, metric) {
    return metric ? metricValue(b, metric) - metricValue(a, metric) : compareScore(a, b);
}
/** The token hash never leaves the store. */
const view = ({ id, name, snapshot, stolenIds, lastPvpAt, thefts, wins, losses, revokedIds, lastMatch, lastReclaim, goldAccount }) => ({
    id,
    name,
    snapshot,
    stolenIds,
    lastPvpAt,
    thefts,
    wins,
    losses,
    revokedIds,
    lastMatch,
    lastReclaim,
    goldAccount: goldAccount ? structuredClone(goldAccount) : null,
});
class MemoryStore {
    rows = new Map();
    seq = 0;
    tail = Promise.resolve();
    async transaction(work) {
        const previous = this.tail;
        let release = () => { };
        this.tail = new Promise((resolve) => { release = resolve; });
        await previous;
        const before = structuredClone(this.rows);
        const seq = this.seq;
        try {
            return await work(this);
        }
        catch (error) {
            this.rows.clear();
            for (const [id, row] of before)
                this.rows.set(id, row);
            this.seq = seq;
            throw error;
        }
        finally {
            release();
        }
    }
    async createPlayer(p) {
        this.rows.set(p.id, {
            id: p.id,
            name: p.name,
            snapshot: null,
            stolenIds: [],
            lastPvpAt: null,
            thefts: [],
            wins: 0,
            losses: 0,
            revokedIds: [],
            lastMatch: null,
            lastReclaim: null,
            goldAccount: null,
            transferHighWater: 0,
            tokenHash: p.tokenHash,
            seq: this.seq++,
        });
    }
    async getByToken(tokenHash) {
        const row = [...this.rows.values()].find((r) => r.tokenHash === tokenHash);
        return row ? view(row) : null;
    }
    async getById(id) {
        const row = this.rows.get(id);
        return row ? view(row) : null;
    }
    async putSnapshot(id, snapshot) {
        const row = this.rows.get(id);
        if (row) {
            this.observeIds(row, snapshot.companions.map(c => c.id));
            row.snapshot = {
                ...snapshot,
                companions: snapshot.companions.filter(c => !row.revokedIds.includes(c.id)),
                party: (snapshot.party ?? []).filter(id => !row.revokedIds.includes(id)),
            };
            row.name = snapshot.name;
        }
    }
    async setStolenIds(id, ids) {
        const row = this.rows.get(id);
        if (row) {
            row.stolenIds = ids;
            row.revokedIds = [...new Set([...row.revokedIds, ...ids])];
            this.observeIds(row, ids);
            if (row.snapshot)
                await this.putSnapshot(id, row.snapshot);
        }
    }
    async setLastPvpAt(id, at) {
        const row = this.rows.get(id);
        if (row) {
            row.lastPvpAt = at;
        }
    }
    async setThefts(id, thefts) {
        const row = this.rows.get(id);
        if (row) {
            row.thefts = thefts;
            row.revokedIds = [...new Set([...row.revokedIds, ...thefts.map(t => t.companion.id)])];
            this.observeIds(row, thefts.flatMap(t => [t.id, t.companion.id]));
            if (row.snapshot)
                await this.putSnapshot(id, row.snapshot);
        }
    }
    observeIds(row, ids) {
        for (const id of ids)
            if (/^[csrt][0-9]{1,16}$/.test(id)) {
                row.transferHighWater = Math.max(row.transferHighWater ?? 0, Number(id.slice(1)));
            }
    }
    async allocateTransferId(id, prefix, minimum = 1) {
        if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 999_999_999_999_999)
            throw Error('Invalid transfer ID floor');
        const row = this.rows.get(id);
        const next = Math.max((row?.transferHighWater ?? 0) + 1, minimum);
        if (!row || !Number.isSafeInteger(next) || next < 1 || next > 999_999_999_999_999)
            throw Error('Transfer IDs exhausted');
        row.transferHighWater = next;
        return prefix + next;
    }
    async recordBattle(winnerId, loserId) {
        const winner = this.rows.get(winnerId);
        const loser = this.rows.get(loserId);
        if (!winner || !loser || winnerId === loserId)
            throw new Error('Invalid battle participants');
        winner.wins += 1;
        loser.losses += 1;
    }
    async setLastMatch(id, result) {
        const row = this.rows.get(id);
        if (row)
            row.lastMatch = structuredClone(result);
    }
    async setLastReclaim(id, result) {
        const row = this.rows.get(id);
        if (row)
            row.lastReclaim = structuredClone(result);
    }
    async setGoldAccount(id, value) {
        const row = this.rows.get(id);
        if (!row)
            throw Error('Missing gold account');
        row.goldAccount = structuredClone(value);
    }
    async rank(key, metric) {
        return 1 + this.ranked(metric).filter((r) => compareMetric({ ...r.snapshot, wins: r.wins }, key, metric) < 0).length;
    }
    async top(n, metric) {
        return this.ranked(metric).slice(0, n).map(view);
    }
    async neighbor(excludeId, key, dir) {
        // ranked() is score DESC then seq ASC, so within the matching half the
        // 'up' pick (smallest greater score, latest seq) is last and the 'down'
        // pick (largest score ≤ key, earliest seq) is first.
        const half = this.ranked().filter((r) => r.id !== excludeId && compareScore(r.snapshot, key) < 0 === (dir === 'up'));
        const pick = dir === 'up' ? half.at(-1) : half[0];
        return pick ? view(pick) : null;
    }
    ranked(metric) {
        return [...this.rows.values()]
            .filter((r) => r.snapshot !== null)
            .filter(r => metric !== 'level' || r.snapshot.level !== undefined)
            .sort((a, b) => compareMetric({ ...a.snapshot, wins: a.wins }, { ...b.snapshot, wins: b.wins }, metric) ||
            (metric ? a.id.localeCompare(b.id) : a.seq - b.seq));
    }
}
exports.MemoryStore = MemoryStore;
