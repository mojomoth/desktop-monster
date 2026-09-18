"use strict";
// T41 — Postgres backend for Store (SPEC F46, SERVER_ARCHITECTURE §4). Only
// reached in production: `npm test` uses MemoryStore and never loads `pg`.
// node-postgres returns int8/count as strings, so nothing here is int8:
// `last_pvp_at` is `double precision` (ms since epoch is exact in a float64)
// and every count is cast `count(*)::int`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgStore = void 0;
const pg_1 = require("pg");
const store_js_1 = require("./store.js");
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
  ADD COLUMN IF NOT EXISTS transfer_high_water numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_account jsonb;
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
const METRIC_SQL = {
    level: "(snapshot->>'level')::numeric", pvpWins: 'wins', bestIndex: 'best_index', rebirths: 'rebirths',
};
/** jsonb columns arrive parsed and `double precision` arrives as a number. */
const toRow = (r) => {
    const snapshot = r['snapshot'];
    return {
        id: r['id'],
        name: r['nickname'],
        snapshot: snapshot ? { ...snapshot, party: snapshot.party ?? [] } : null,
        stolenIds: r['stolen_ids'],
        lastPvpAt: r['last_pvp_at'],
        // Tolerant: the column is shared with the v2 service, which never writes it.
        thefts: Array.isArray(r['thefts']) ? r['thefts'] : [],
        wins: typeof r['wins'] === 'number' ? r['wins'] : 0,
        losses: typeof r['losses'] === 'number' ? r['losses'] : 0,
        revokedIds: Array.isArray(r['revoked_ids']) ? r['revoked_ids'] : r['stolen_ids'],
        lastMatch: r['last_match'] ?? null,
        lastReclaim: r['last_reclaim'] ?? null,
        goldAccount: r['gold_account'] ?? null,
    };
};
class PgStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async transaction(work) {
        if (!('connect' in this.pool))
            return work(this);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // One small service: a table lock also serializes writes from the legacy
            // service sharing this database. Reads remain available outside the txn.
            await client.query('LOCK TABLE players IN SHARE ROW EXCLUSIVE MODE');
            const result = await work(new PgStore(client));
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /** Builds the pool, runs the idempotent DDL, and returns the store. */
    static async connect(connectionString) {
        // Render's internal URL has a bare host and no TLS; the external one needs
        // TLS but presents a certificate we cannot chain to a public root.
        const ssl = /\.render\.com$/.test(new URL(connectionString).hostname)
            ? { rejectUnauthorized: false }
            : undefined;
        const pool = new pg_1.Pool({ connectionString, ssl });
        await pool.query(DDL);
        return new PgStore(pool);
    }
    async createPlayer(p) {
        await this.pool.query('INSERT INTO players (id, token_hash, nickname) VALUES ($1, $2, $3)', [
            p.id,
            p.tokenHash,
            p.name,
        ]);
    }
    async getByToken(tokenHash) {
        return this.one('SELECT * FROM players WHERE token_hash = $1', [tokenHash]);
    }
    async getById(id) {
        // Unknown selected ids should become 404, never a Postgres UUID cast error.
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
            return null;
        return this.one('SELECT * FROM players WHERE id = $1', [id]);
    }
    async putSnapshot(id, snapshot) {
        await this.pool.query('UPDATE players SET snapshot = $2::jsonb, best_index = $3, rebirths = $4, nickname = $5, updated_at = now() WHERE id = $1', [id, JSON.stringify(snapshot), snapshot.bestIndex, snapshot.rebirths, snapshot.name]);
    }
    async setStolenIds(id, ids) {
        await this.pool.query('UPDATE players SET stolen_ids = $2::jsonb WHERE id = $1', [
            id,
            JSON.stringify(ids),
        ]);
    }
    async setLastPvpAt(id, at) {
        await this.pool.query('UPDATE players SET last_pvp_at = $2 WHERE id = $1', [id, at]);
    }
    async setThefts(id, thefts) {
        await this.pool.query('UPDATE players SET thefts = $2::jsonb WHERE id = $1', [
            id,
            JSON.stringify(thefts),
        ]);
    }
    async recordBattle(winnerId, loserId) {
        await this.pool.query('UPDATE players SET wins = wins + CASE WHEN id = $1 THEN 1 ELSE 0 END, losses = losses + CASE WHEN id = $2 THEN 1 ELSE 0 END WHERE id IN ($1, $2)', [winnerId, loserId]);
    }
    async setLastMatch(id, result) {
        await this.pool.query('UPDATE players SET last_match = $2::jsonb WHERE id = $1', [id, JSON.stringify(result)]);
    }
    async setLastReclaim(id, result) {
        await this.pool.query('UPDATE players SET last_reclaim = $2::jsonb WHERE id = $1', [id, JSON.stringify(result)]);
    }
    async allocateTransferId(id, prefix, minimum = 1) {
        if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 999_999_999_999_999)
            throw Error('Invalid transfer ID floor');
        const { rows } = await this.pool.query('UPDATE players SET transfer_high_water = GREATEST(transfer_high_water + 1, $2) WHERE id = $1 AND transfer_high_water < 999999999999999 RETURNING transfer_high_water', [id, minimum]);
        const serial = Number(rows[0]?.['transfer_high_water']);
        if (!Number.isSafeInteger(serial) || serial < 1 || serial > 999_999_999_999_999)
            throw Error('Transfer IDs exhausted');
        return prefix + serial;
    }
    async setGoldAccount(id, value) {
        await this.pool.query('UPDATE players SET gold_account = $2::jsonb WHERE id = $1', [id, JSON.stringify(value)]);
    }
    async rank(key, metric) {
        if (metric) {
            const { rows } = await this.pool.query(`SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND ${METRIC_SQL[metric]} > $1`, [(0, store_js_1.metricValue)(key, metric)]);
            return 1 + (rows[0]?.['n'] ?? 0);
        }
        const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND (best_index, rebirths) > ($1, $2)', [key.bestIndex, key.rebirths]);
        return 1 + (rows[0]?.['n'] ?? 0);
    }
    async top(n, metric) {
        if (metric) {
            const { rows } = await this.pool.query(`SELECT * FROM players WHERE snapshot IS NOT NULL AND ${METRIC_SQL[metric]} IS NOT NULL ORDER BY ${METRIC_SQL[metric]} DESC, id ASC LIMIT $1`, [n]);
            return rows.map(toRow);
        }
        const { rows } = await this.pool.query('SELECT * FROM players WHERE snapshot IS NOT NULL ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT $1', [n]);
        return rows.map(toRow);
    }
    async neighbor(excludeId, key, dir) {
        const sql = dir === 'up'
            ? 'SELECT * FROM players WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) > ($2, $3) ORDER BY best_index ASC, rebirths ASC, updated_at DESC LIMIT 1'
            : 'SELECT * FROM players WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) <= ($2, $3) ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT 1';
        return this.one(sql, [excludeId, key.bestIndex, key.rebirths]);
    }
    async one(text, values) {
        const { rows } = await this.pool.query(text, values);
        return rows[0] ? toRow(rows[0]) : null;
    }
}
exports.PgStore = PgStore;
