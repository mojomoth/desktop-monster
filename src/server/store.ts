import type { RaidDocument } from './raid.js';
// T39 — player storage (SPEC F44, SERVER_ARCHITECTURE §4). One interface for
// both backends: MemoryStore here (tests + DB-less runs), PgStore later. Every
// method is async so the two stay interchangeable.

import type { GoldAccount } from './gold.js';
import type { LastMatch, LastReclaim, LeaderboardMetric, Snapshot, Theft } from '../shared/api.js';

export interface ScoreKey {
  bestIndex: number;
  rebirths: number;
  level?: number;
  wins?: number;
}

export interface PlayerRow {
  id: string;
  name: string;
  snapshot: Snapshot | null;
  stolenIds: string[];
  lastPvpAt: number | null;
  /** Pending + recently expired steals against this player (last THEFTS_MAX). */
  thefts: Theft[];
  wins: number;
  losses: number;
  revokedIds: string[];
  lastMatch: LastMatch | null;
  lastReclaim: LastReclaim | null;
  goldAccount: GoldAccount | null;
}

export interface Store {
  getRaid(id: string): Promise<RaidDocument | null>;
  putRaid(id: string, doc: RaidDocument): Promise<void>;
  /** Serialize mutations and roll back every write if work throws. */
  transaction<T>(work: (store: Store) => Promise<T>): Promise<T>;
  createPlayer(p: { id: string; tokenHash: string; name: string }): Promise<void>;
  getByToken(tokenHash: string): Promise<PlayerRow | null>;
  getById(id: string): Promise<PlayerRow | null>;
  /** Also sets the name column to `snapshot.name`. */
  putSnapshot(id: string, snapshot: Snapshot): Promise<void>;
  setStolenIds(id: string, ids: string[]): Promise<void>;
  setLastPvpAt(id: string, at: number): Promise<void>;
  setThefts(id: string, thefts: Theft[]): Promise<void>;
  recordBattle(winnerId: string, loserId: string): Promise<void>;
  setLastMatch(id: string, result: LastMatch): Promise<void>;
  setLastReclaim(id: string, result: LastReclaim): Promise<void>;
  setGoldAccount(id: string, value: GoldAccount): Promise<void>;
  /** Durable per-player serial, including consumed transfers and theft receipts. */
  allocateTransferId(id: string, prefix: 's' | 'r' | 't', minimum?: number): Promise<string>;
  /** 1 + count of players with a snapshot scoring strictly above `key`. */
  rank(key: ScoreKey, metric?: LeaderboardMetric): Promise<number>;
  /** Score order, then oldest first. Players without a snapshot are invisible. */
  top(n: number, metric?: LeaderboardMetric): Promise<PlayerRow[]>;
  neighbor(excludeId: string, key: ScoreKey, dir: 'up' | 'down', protocol?: Snapshot['protocol']): Promise<PlayerRow | null>;
}

/** Sort comparator for the leaderboard order: bestIndex DESC, then rebirths DESC. */
export function compareScore(a: ScoreKey, b: ScoreKey): number {
  return b.bestIndex - a.bestIndex || b.rebirths - a.rebirths;
}

/** A selected metric has no hidden secondary score: equal values share a rank. */
export function metricValue(key: ScoreKey, metric: LeaderboardMetric): number {
  return metric === 'pvpWins' ? key.wins ?? 0 : key[metric] ?? 0;
}

export function compareMetric(a: ScoreKey, b: ScoreKey, metric?: LeaderboardMetric): number {
  return metric ? metricValue(b, metric) - metricValue(a, metric) : compareScore(a, b);
}

interface MemoryRow extends PlayerRow {
  transferHighWater: number;
  tokenHash: string;
  /** Insertion order — the tie-breaker PgStore spells `updated_at`. */
  seq: number;
}

type Scored = MemoryRow & { snapshot: Snapshot };

/** The token hash never leaves the store. */
const view = ({ id, name, snapshot, stolenIds, lastPvpAt, thefts, wins, losses, revokedIds, lastMatch, lastReclaim, goldAccount }: MemoryRow): PlayerRow => ({
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

export class MemoryStore implements Store {
  // Raid documents have their own queue, outside player transaction rollback.
  private readonly raids = new Map<string, RaidDocument>();
  async getRaid(id: string): Promise<RaidDocument | null> { return structuredClone(this.raids.get(id) ?? null); }
  async putRaid(id: string, doc: RaidDocument): Promise<void> { this.raids.set(id, structuredClone(doc)); }
  private readonly rows = new Map<string, MemoryRow>();
  private seq = 0;
  private tail: Promise<void> = Promise.resolve();

  async transaction<T>(work: (store: Store) => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release = (): void => {};
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const before = structuredClone(this.rows);
    const seq = this.seq;
    try {
      return await work(this);
    } catch (error) {
      this.rows.clear();
      for (const [id, row] of before) this.rows.set(id, row);
      this.seq = seq;
      throw error;
    } finally {
      release();
    }
  }

  async createPlayer(p: { id: string; tokenHash: string; name: string }): Promise<void> {
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
      this.observeIds(row, snapshot.companions.map(c => c.id));
      row.snapshot = {
        ...snapshot,
        companions: snapshot.companions.filter(c => !row.revokedIds.includes(c.id)),
        party: (snapshot.party ?? []).filter(id => !row.revokedIds.includes(id)),
      };
      row.name = snapshot.name;
    }
  }

  async setStolenIds(id: string, ids: string[]): Promise<void> {
    const row = this.rows.get(id);
    if (row) {
      row.stolenIds = ids;
      row.revokedIds = [...new Set([...row.revokedIds, ...ids])];
      this.observeIds(row, ids);
      if (row.snapshot) await this.putSnapshot(id, row.snapshot);
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
      row.revokedIds = [...new Set([...row.revokedIds, ...thefts.map(t => t.companion.id)])];
      this.observeIds(row, thefts.flatMap(t => [t.id, t.companion.id]));
      if (row.snapshot) await this.putSnapshot(id, row.snapshot);
    }
  }

  private observeIds(row: MemoryRow, ids: string[]): void {
    for (const id of ids) if (/^[csrt][0-9]{1,16}$/.test(id)) {
      row.transferHighWater = Math.max(row.transferHighWater ?? 0, Number(id.slice(1)));
    }
  }

  async allocateTransferId(id: string, prefix: 's' | 'r' | 't', minimum = 1): Promise<string> {
    if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 999_999_999_999_999) throw Error('Invalid transfer ID floor');
    const row = this.rows.get(id);
    const next = Math.max((row?.transferHighWater ?? 0) + 1, minimum);
    if (!row || !Number.isSafeInteger(next) || next < 1 || next > 999_999_999_999_999) throw Error('Transfer IDs exhausted');
    row.transferHighWater = next;
    return prefix + next;
  }

  async recordBattle(winnerId: string, loserId: string): Promise<void> {
    const winner = this.rows.get(winnerId);
    const loser = this.rows.get(loserId);
    if (!winner || !loser || winnerId === loserId) throw new Error('Invalid battle participants');
    winner.wins += 1;
    loser.losses += 1;
  }

  async setLastMatch(id: string, result: LastMatch): Promise<void> {
    const row = this.rows.get(id);
    if (row) row.lastMatch = structuredClone(result);
  }

  async setLastReclaim(id: string, result: LastReclaim): Promise<void> {
    const row = this.rows.get(id);
    if (row) row.lastReclaim = structuredClone(result);
  }

  async setGoldAccount(id: string, value: GoldAccount): Promise<void> {
    const row = this.rows.get(id);
    if (!row) throw Error('Missing gold account');
    row.goldAccount = structuredClone(value);
  }

  async rank(key: ScoreKey, metric?: LeaderboardMetric): Promise<number> {
    return 1 + this.ranked(metric).filter((r) => compareMetric({ ...r.snapshot, wins: r.wins }, key, metric) < 0).length;
  }

  async top(n: number, metric?: LeaderboardMetric): Promise<PlayerRow[]> {
    return this.ranked(metric).slice(0, n).map(view);
  }

  async neighbor(excludeId: string, key: ScoreKey, dir: 'up' | 'down', protocol?: Snapshot['protocol']): Promise<PlayerRow | null> {
    // ranked() is score DESC then seq ASC, so within the matching half the
    // 'up' pick (smallest greater score, latest seq) is last and the 'down'
    // pick (largest score ≤ key, earliest seq) is first.
    const half = this.ranked().filter(r => !protocol || r.snapshot.protocol === protocol && r.snapshot.combat && r.goldAccount?.enrolled).filter(
      (r) => r.id !== excludeId && compareScore(r.snapshot, key) < 0 === (dir === 'up'),
    );
    const pick = dir === 'up' ? half.at(-1) : half[0];
    return pick ? view(pick) : null;
  }

  private ranked(metric?: LeaderboardMetric): Scored[] {
    return [...this.rows.values()]
      .filter((r): r is Scored => r.snapshot !== null)
      .filter(r => metric !== 'level' || r.snapshot.level !== undefined)
      .sort((a, b) => compareMetric({ ...a.snapshot, wins: a.wins }, { ...b.snapshot, wins: b.wins }, metric) ||
        (metric ? a.id.localeCompare(b.id) : a.seq - b.seq));
  }
}
