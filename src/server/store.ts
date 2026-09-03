// T39 — player storage (SPEC F44, SERVER_ARCHITECTURE §4). One interface for
// both backends: MemoryStore here (tests + DB-less runs), PgStore later. Every
// method is async so the two stay interchangeable.

import type { Snapshot, Theft } from '../shared/api.js';

export interface ScoreKey {
  bestIndex: number;
  rebirths: number;
}

export interface PlayerRow {
  id: string;
  name: string;
  snapshot: Snapshot | null;
  stolenIds: string[];
  lastPvpAt: number | null;
  /** Pending + recently expired steals against this player (last THEFTS_MAX). */
  thefts: Theft[];
}

export interface Store {
  createPlayer(p: { id: string; tokenHash: string; name: string }): Promise<void>;
  getByToken(tokenHash: string): Promise<PlayerRow | null>;
  getById(id: string): Promise<PlayerRow | null>;
  /** Also sets the name column to `snapshot.name`. */
  putSnapshot(id: string, snapshot: Snapshot): Promise<void>;
  setStolenIds(id: string, ids: string[]): Promise<void>;
  setLastPvpAt(id: string, at: number): Promise<void>;
  setThefts(id: string, thefts: Theft[]): Promise<void>;
  /** 1 + count of players with a snapshot scoring strictly above `key`. */
  rank(key: ScoreKey): Promise<number>;
  /** Score order, then oldest first. Players without a snapshot are invisible. */
  top(n: number): Promise<PlayerRow[]>;
  neighbor(excludeId: string, key: ScoreKey, dir: 'up' | 'down'): Promise<PlayerRow | null>;
}

/** Sort comparator for the leaderboard order: bestIndex DESC, then rebirths DESC. */
export function compareScore(a: ScoreKey, b: ScoreKey): number {
  return b.bestIndex - a.bestIndex || b.rebirths - a.rebirths;
}

interface MemoryRow extends PlayerRow {
  tokenHash: string;
  /** Insertion order — the tie-breaker PgStore spells `updated_at`. */
  seq: number;
}

type Scored = MemoryRow & { snapshot: Snapshot };

/** The token hash never leaves the store. */
const view = ({ id, name, snapshot, stolenIds, lastPvpAt, thefts }: MemoryRow): PlayerRow => ({
  id,
  name,
  snapshot,
  stolenIds,
  lastPvpAt,
  thefts,
});

export class MemoryStore implements Store {
  private readonly rows = new Map<string, MemoryRow>();
  private seq = 0;

  async createPlayer(p: { id: string; tokenHash: string; name: string }): Promise<void> {
    this.rows.set(p.id, {
      id: p.id,
      name: p.name,
      snapshot: null,
      stolenIds: [],
      lastPvpAt: null,
      thefts: [],
      tokenHash: p.tokenHash,
      seq: this.seq++,
    });
  }

  async getByToken(tokenHash: string): Promise<PlayerRow | null> {
    const row = [...this.rows.values()].find((r) => r.tokenHash === tokenHash);
    return row ? view(row) : null;
  }

  async getById(id: string): Promise<PlayerRow | null> {
    const row = this.rows.get(id);
    return row ? view(row) : null;
  }

  async putSnapshot(id: string, snapshot: Snapshot): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.snapshot = snapshot;
      row.name = snapshot.name;
    }
  }

  async setStolenIds(id: string, ids: string[]): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.stolenIds = ids;
    }
  }

  async setLastPvpAt(id: string, at: number): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.lastPvpAt = at;
    }
  }

  async setThefts(id: string, thefts: Theft[]): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.thefts = thefts;
    }
  }

  async rank(key: ScoreKey): Promise<number> {
    return 1 + this.ranked().filter((r) => compareScore(r.snapshot, key) < 0).length;
  }

  async top(n: number): Promise<PlayerRow[]> {
    return this.ranked().slice(0, n).map(view);
  }

  async neighbor(excludeId: string, key: ScoreKey, dir: 'up' | 'down'): Promise<PlayerRow | null> {
    // ranked() is score DESC then seq ASC, so within the matching half the
    // 'up' pick (smallest greater score, latest seq) is last and the 'down'
    // pick (largest score ≤ key, earliest seq) is first.
    const half = this.ranked().filter(
      (r) => r.id !== excludeId && compareScore(r.snapshot, key) < 0 === (dir === 'up'),
    );
    const pick = dir === 'up' ? half.at(-1) : half[0];
    return pick ? view(pick) : null;
  }

  private ranked(): Scored[] {
    return [...this.rows.values()]
      .filter((r): r is Scored => r.snapshot !== null)
      .sort((a, b) => compareScore(a.snapshot, b.snapshot) || a.seq - b.seq);
  }
}
