"use strict";
// T39 — player storage (SPEC F44, SERVER_ARCHITECTURE §4). One interface for
// both backends: MemoryStore here (tests + DB-less runs), PgStore later. Every
// method is async so the two stay interchangeable.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
exports.compareScore = compareScore;
/** Sort comparator for the leaderboard order: bestIndex DESC, then rebirths DESC. */
function compareScore(a, b) {
    return b.bestIndex - a.bestIndex || b.rebirths - a.rebirths;
}
/** The token hash never leaves the store. */
const view = ({ id, name, snapshot, stolenIds, lastPvpAt, thefts, wins, losses }) => ({
    id,
    name,
    snapshot,
    stolenIds,
    lastPvpAt,
    thefts,
    wins,
    losses,
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
            row.snapshot = snapshot;
            row.name = snapshot.name;
        }
    }
    async setStolenIds(id, ids) {
        const row = this.rows.get(id);
        if (row) {
            row.stolenIds = ids;
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
        }
    }
    async recordBattle(winnerId, loserId) {
        const winner = this.rows.get(winnerId);
        const loser = this.rows.get(loserId);
        if (!winner || !loser || winnerId === loserId)
            throw new Error('Invalid battle participants');
        winner.wins += 1;
        loser.losses += 1;
    }
    async rank(key) {
        return 1 + this.ranked().filter((r) => compareScore(r.snapshot, key) < 0).length;
    }
    async top(n) {
        return this.ranked().slice(0, n).map(view);
    }
    async neighbor(excludeId, key, dir) {
        // ranked() is score DESC then seq ASC, so within the matching half the
        // 'up' pick (smallest greater score, latest seq) is last and the 'down'
        // pick (largest score ≤ key, earliest seq) is first.
        const half = this.ranked().filter((r) => r.id !== excludeId && compareScore(r.snapshot, key) < 0 === (dir === 'up'));
        const pick = dir === 'up' ? half.at(-1) : half[0];
        return pick ? view(pick) : null;
    }
    ranked() {
        return [...this.rows.values()]
            .filter((r) => r.snapshot !== null)
            .sort((a, b) => compareScore(a.snapshot, b.snapshot) || a.seq - b.seq);
    }
}
exports.MemoryStore = MemoryStore;
