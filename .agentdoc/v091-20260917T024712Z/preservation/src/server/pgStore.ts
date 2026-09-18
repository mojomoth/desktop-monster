// T41 — Postgres backend for Store (SPEC F46, SERVER_ARCHITECTURE §4). Only
// reached in production: `npm test` uses MemoryStore and never loads `pg`.
// node-postgres returns int8/count as strings, so nothing here is int8:
// `last_pvp_at` is `double precision` (ms since epoch is exact in a float64)
// and every count is cast `count(*)::int`.

import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { LastMatch, LastReclaim, LeaderboardMetric, Snapshot, Theft } from '../shared/api.js';
import type { PlayerRow, ScoreKey, Store } from './store.js';
import { metricValue } from './store.js';

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
ALTER TABLE players ADD COLUMN IF NOT EXISTS thefts jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS revoked_ids jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS last_match jsonb,
  ADD COLUMN IF NOT EXISTS last_reclaim jsonb,
  ADD COLUMN IF NOT EXISTS transfer_high_water numeric NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS wins integer NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS losses integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS players_level_idx ON players (((snapshot->>'level')::numeric) DESC) WHERE snapshot ? 'level';
CREATE INDEX IF NOT EXISTS players_wins_idx ON players (wins DESC);
CREATE INDEX IF NOT EXISTS players_rebirths_idx ON players (rebirths DESC);

-- Shared v2/v3 writers still replace snapshots and truncate stolen_ids. This
-- trigger keeps every observed revocation and filters ALL writers atomically.
CREATE OR REPLACE FUNCTION desmon_preserve_revocations() RETURNS trigger AS $$
DECLARE previous jsonb := '[]'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    previous := OLD.revoked_ids;
    NEW.transfer_high_water := GREATEST(NEW.transfer_high_water, OLD.transfer_high_water);
  END IF;
  SELECT COALESCE(jsonb_agg(value ORDER BY value), '[]'::jsonb) INTO NEW.revoked_ids
  FROM (SELECT DISTINCT value FROM jsonb_array_elements(
    COALESCE(previous, '[]'::jsonb) || COALESCE(NEW.revoked_ids, '[]'::jsonb) ||
    COALESCE(NEW.stolen_ids, '[]'::jsonb) ||
    COALESCE((SELECT jsonb_agg(t->'companion'->'id') FROM jsonb_array_elements(NEW.thefts) t), '[]'::jsonb)
  ) WHERE jsonb_typeof(value) = 'string') ids;
  -- Observe ids before filtering so legacy uploads, removals and inbox pruning
  -- cannot lower the serial or recycle a previously issued transfer identity.
  SELECT GREATEST(NEW.transfer_high_water, COALESCE(MAX(substring(id FROM 2)::numeric), 0))
    INTO NEW.transfer_high_water FROM (
      SELECT value#>>'{}' AS id FROM jsonb_array_elements(NEW.revoked_ids)
      UNION ALL SELECT c->>'id' FROM jsonb_array_elements(NEW.snapshot->'companions') c
      UNION ALL SELECT t->>'id' FROM jsonb_array_elements(NEW.thefts) t
    ) observed WHERE id ~ '^[csrt][0-9]{1,16}$';
  IF NEW.snapshot IS NOT NULL THEN
    NEW.snapshot := jsonb_set(NEW.snapshot, '{companions}', COALESCE(
      (SELECT jsonb_agg(c) FROM jsonb_array_elements(NEW.snapshot->'companions') c
       WHERE NOT NEW.revoked_ids ? (c->>'id')), '[]'::jsonb));
    IF NEW.snapshot ? 'party' THEN
      NEW.snapshot := jsonb_set(NEW.snapshot, '{party}', COALESCE(
        (SELECT jsonb_agg(p) FROM jsonb_array_elements(NEW.snapshot->'party') p
         WHERE NOT NEW.revoked_ids ? (p#>>'{}')), '[]'::jsonb));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER desmon_revocations BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION desmon_preserve_revocations();
-- Backfill every surviving legacy stolen ID and theft inbox entry.
UPDATE players SET revoked_ids = revoked_ids;
`;

/** Closed allow-list: never interpolate the incoming metric into SQL. */
const METRIC_SQL: Record<LeaderboardMetric, string> = {
  level: "(snapshot->>'level')::numeric", pvpWins: 'wins', bestIndex: 'best_index', rebirths: 'rebirths',
};

/** jsonb columns arrive parsed and `double precision` arrives as a number. */
const toRow = (r: Record<string, unknown>): PlayerRow => {
  const snapshot = r['snapshot'] as Snapshot | null;
  return {
    id: r['id'] as string,
    name: r['nickname'] as string,
    snapshot: snapshot ? { ...snapshot, party: snapshot.party ?? [] } : null,
    stolenIds: r['stolen_ids'] as string[],
    lastPvpAt: r['last_pvp_at'] as number | null,
    // Tolerant: the column is shared with the v2 service, which never writes it.
    thefts: Array.isArray(r['thefts']) ? (r['thefts'] as Theft[]) : [],
    wins: typeof r['wins'] === 'number' ? r['wins'] : 0,
    losses: typeof r['losses'] === 'number' ? r['losses'] : 0,
    revokedIds: Array.isArray(r['revoked_ids']) ? r['revoked_ids'] as string[] : r['stolen_ids'] as string[],
    lastMatch: (r['last_match'] as LastMatch | null | undefined) ?? null,
    lastReclaim: (r['last_reclaim'] as LastReclaim | null | undefined) ?? null,
  };
};

export class PgStore implements Store {
  private constructor(private readonly pool: Pool | PoolClient) {}

  async transaction<T>(work: (store: Store) => Promise<T>): Promise<T> {
    if (!('connect' in this.pool)) return work(this);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // One small service: a table lock also serializes writes from the legacy
      // service sharing this database. Reads remain available outside the txn.
      await client.query('LOCK TABLE players IN SHARE ROW EXCLUSIVE MODE');
      const result = await work(new PgStore(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

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
    // Unknown selected ids should become 404, never a Postgres UUID cast error.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
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

  async setThefts(id: string, thefts: Theft[]): Promise<void> {
    await this.pool.query('UPDATE players SET thefts = $2::jsonb WHERE id = $1', [
      id,
      JSON.stringify(thefts),
    ]);
  }

  async recordBattle(winnerId: string, loserId: string): Promise<void> {
    await this.pool.query(
      'UPDATE players SET wins = wins + CASE WHEN id = $1 THEN 1 ELSE 0 END, losses = losses + CASE WHEN id = $2 THEN 1 ELSE 0 END WHERE id IN ($1, $2)',
      [winnerId, loserId],
    );
  }

  async setLastMatch(id: string, result: LastMatch): Promise<void> {
    await this.pool.query('UPDATE players SET last_match = $2::jsonb WHERE id = $1', [id, JSON.stringify(result)]);
  }

  async setLastReclaim(id: string, result: LastReclaim): Promise<void> {
    await this.pool.query('UPDATE players SET last_reclaim = $2::jsonb WHERE id = $1', [id, JSON.stringify(result)]);
  }

  async allocateTransferId(id: string, prefix: 's' | 'r' | 't', minimum = 1): Promise<string> {
    if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 999_999_999_999_999) throw Error('Invalid transfer ID floor');
    const { rows } = await this.pool.query(
      'UPDATE players SET transfer_high_water = GREATEST(transfer_high_water + 1, $2) WHERE id = $1 AND transfer_high_water < 999999999999999 RETURNING transfer_high_water',
      [id, minimum],
    );
    const serial = Number(rows[0]?.['transfer_high_water']);
    if (!Number.isSafeInteger(serial) || serial < 1 || serial > 999_999_999_999_999) throw Error('Transfer IDs exhausted');
    return prefix + serial;
  }

  async rank(key: ScoreKey, metric?: LeaderboardMetric): Promise<number> {
    if (metric) {
      const { rows } = await this.pool.query(
        `SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND ${METRIC_SQL[metric]} > $1`,
        [metricValue(key, metric)],
      );
      return 1 + ((rows[0]?.['n'] as number | undefined) ?? 0);
    }
    const { rows } = await this.pool.query(
      'SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND (best_index, rebirths) > ($1, $2)',
      [key.bestIndex, key.rebirths],
    );
    return 1 + ((rows[0]?.['n'] as number | undefined) ?? 0);
  }

  async top(n: number, metric?: LeaderboardMetric): Promise<PlayerRow[]> {
    if (metric) {
      const { rows } = await this.pool.query(
        `SELECT * FROM players WHERE snapshot IS NOT NULL AND ${METRIC_SQL[metric]} IS NOT NULL ORDER BY ${METRIC_SQL[metric]} DESC, id ASC LIMIT $1`, [n],
      );
      return rows.map(toRow);
    }
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
