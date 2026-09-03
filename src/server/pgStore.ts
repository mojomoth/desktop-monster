// T41 — Postgres backend for Store (SPEC F46, SERVER_ARCHITECTURE §4). Only
// reached in production: `npm test` uses MemoryStore and never loads `pg`.
// node-postgres returns int8/count as strings, so nothing here is int8:
// `last_pvp_at` is `double precision` (ms since epoch is exact in a float64)
// and every count is cast `count(*)::int`.

import { Pool } from 'pg';
import type { Snapshot } from '../shared/api.js';
import type { PlayerRow, ScoreKey, Store } from './store.js';

const DDL = `
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  nickname text NOT NULL,
  snapshot jsonb,
  best_index integer NOT NULL DEFAULT 0,
  rebirths integer NOT NULL DEFAULT 0,
  stolen_ids jsonb NOT NULL DEFAULT '[]',
  last_pvp_at double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS players_score_idx ON players (best_index DESC, rebirths DESC);
`;

/** jsonb columns arrive parsed and `double precision` arrives as a number. */
const toRow = (r: Record<string, unknown>): PlayerRow => ({
  id: r['id'] as string,
  name: r['nickname'] as string,
  snapshot: r['snapshot'] as Snapshot | null,
  stolenIds: r['stolen_ids'] as string[],
  lastPvpAt: r['last_pvp_at'] as number | null,
});

export class PgStore implements Store {
  private constructor(private readonly pool: Pool) {}

  /** Builds the pool, runs the idempotent DDL, and returns the store. */
  static async connect(connectionString: string): Promise<PgStore> {
    // Render's internal URL has a bare host and no TLS; the external one needs
    // TLS but presents a certificate we cannot chain to a public root.
    const ssl = /\.render\.com$/.test(new URL(connectionString).hostname)
      ? { rejectUnauthorized: false }
      : undefined;
    const pool = new Pool({ connectionString, ssl });
    await pool.query(DDL);
    return new PgStore(pool);
  }

  async createPlayer(p: { id: string; tokenHash: string; name: string }): Promise<void> {
    await this.pool.query('INSERT INTO players (id, token_hash, nickname) VALUES ($1, $2, $3)', [
      p.id,
      p.tokenHash,
      p.name,
    ]);
  }

  async getByToken(tokenHash: string): Promise<PlayerRow | null> {
    return this.one('SELECT * FROM players WHERE token_hash = $1', [tokenHash]);
  }

  async getById(id: string): Promise<PlayerRow | null> {
    return this.one('SELECT * FROM players WHERE id = $1', [id]);
  }

  async putSnapshot(id: string, snapshot: Snapshot): Promise<void> {
    await this.pool.query(
      'UPDATE players SET snapshot = $2::jsonb, best_index = $3, rebirths = $4, nickname = $5, updated_at = now() WHERE id = $1',
      [id, JSON.stringify(snapshot), snapshot.bestIndex, snapshot.rebirths, snapshot.name],
    );
  }

  async setStolenIds(id: string, ids: string[]): Promise<void> {
    await this.pool.query('UPDATE players SET stolen_ids = $2::jsonb WHERE id = $1', [
      id,
      JSON.stringify(ids),
    ]);
  }

  async setLastPvpAt(id: string, at: number): Promise<void> {
    await this.pool.query('UPDATE players SET last_pvp_at = $2 WHERE id = $1', [id, at]);
  }

  async rank(key: ScoreKey): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND (best_index, rebirths) > ($1, $2)',
      [key.bestIndex, key.rebirths],
    );
    return 1 + ((rows[0]?.['n'] as number | undefined) ?? 0);
  }

  async top(n: number): Promise<PlayerRow[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM players WHERE snapshot IS NOT NULL ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT $1',
      [n],
    );
    return rows.map(toRow);
  }

  async neighbor(excludeId: string, key: ScoreKey, dir: 'up' | 'down'): Promise<PlayerRow | null> {
    const sql =
      dir === 'up'
        ? 'SELECT * FROM players WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) > ($2, $3) ORDER BY best_index ASC, rebirths ASC, updated_at DESC LIMIT 1'
        : 'SELECT * FROM players WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) <= ($2, $3) ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT 1';
    return this.one(sql, [excludeId, key.bestIndex, key.rebirths]);
  }

  private async one(text: string, values: unknown[]): Promise<PlayerRow | null> {
    const { rows } = await this.pool.query(text, values);
    return rows[0] ? toRow(rows[0]) : null;
  }
}
