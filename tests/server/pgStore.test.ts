// T41 — PgStore source-contract pins (SPEC F46, SERVER_ARCHITECTURE §1/§4).
// A real Postgres is out of reach for the gates, so the DDL, the queries and
// the packaging rules are pinned by READING the sources as text: this suite
// never imports pgStore.ts, so `npm test` never loads `pg`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

const pgStore = read('src/server/pgStore.ts');
const pgTypes = read('src/server/pg.d.ts');
const index = read('src/server/index.ts');
const pkg = JSON.parse(read('package.json')) as {
  dependencies?: Record<string, string>;
  devDependencies: Record<string, string>;
  build: { files: string[] };
};

describe('PgStore DDL is idempotent and int8-free (F46, §4)', () => {
  it('creates the players table with every column of §4', () => {
    expect(pgStore).toContain('CREATE TABLE IF NOT EXISTS players');
    for (const column of [
      'id uuid PRIMARY KEY',
      'token_hash text NOT NULL UNIQUE',
      'nickname text NOT NULL',
      'snapshot jsonb',
      'best_index integer NOT NULL DEFAULT 0',
      'rebirths integer NOT NULL DEFAULT 0',
      "stolen_ids jsonb NOT NULL DEFAULT '[]'",
      'last_pvp_at double precision',
      'updated_at timestamptz NOT NULL DEFAULT now()',
    ]) {
      expect(pgStore).toContain(column);
    }
  });

  it('creates the score index idempotently', () => {
    expect(pgStore).toContain(
      'CREATE INDEX IF NOT EXISTS players_score_idx ON players (best_index DESC, rebirths DESC)',
    );
  });

  it('has no matches table and no other CREATE TABLE', () => {
    expect(pgStore).not.toContain('CREATE TABLE IF NOT EXISTS matches');
    expect(pgStore.match(/CREATE TABLE/g)).toHaveLength(1);
  });

  it('avoids int8: timestamps are double precision and counts are cast to int', () => {
    expect(pgStore).toContain('last_pvp_at double precision');
    expect(pgStore).toContain('count(*)::int');
    expect(pgStore).not.toContain('bigint');
  });

  it('runs the DDL on connect, before the store is handed out', () => {
    expect(pgStore).toMatch(/await pool\.query\(DDL\);\s*\n\s*return new PgStore\(pool\);/);
  });
});

describe('PgStore queries match §4 (F46)', () => {
  it('ranks with a tuple comparison over rows that have a snapshot', () => {
    expect(pgStore).toContain(
      'SELECT count(*)::int AS n FROM players WHERE snapshot IS NOT NULL AND (best_index, rebirths) > ($1, $2)',
    );
  });

  it('orders the leaderboard score DESC then oldest update first', () => {
    expect(pgStore).toContain(
      'ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT $1',
    );
  });

  it('picks the neighbour above with > and the one below with <=, both excluding the caller', () => {
    expect(pgStore).toContain(
      'WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) > ($2, $3) ORDER BY best_index ASC, rebirths ASC, updated_at DESC LIMIT 1',
    );
    expect(pgStore).toContain(
      'WHERE id <> $1 AND snapshot IS NOT NULL AND (best_index, rebirths) <= ($2, $3) ORDER BY best_index DESC, rebirths DESC, updated_at ASC LIMIT 1',
    );
  });

  it('stamps updated_at on every snapshot upload', () => {
    expect(pgStore).toContain(
      'UPDATE players SET snapshot = $2::jsonb, best_index = $3, rebirths = $4, nickname = $5, updated_at = now() WHERE id = $1',
    );
  });

  it('implements the 9-method Store interface', () => {
    expect(pgStore).toContain('export class PgStore implements Store');
    for (const method of [
      'createPlayer',
      'getByToken',
      'getById',
      'putSnapshot',
      'setStolenIds',
      'setLastPvpAt',
      'rank',
      'top',
      'neighbor',
    ]) {
      expect(pgStore).toContain(`async ${method}(`);
    }
  });
});

describe('TLS is enabled for Render hosts only (F46)', () => {
  it('tests the hostname against /\\.render\\.com$/ and relaxes verification', () => {
    expect(pgStore).toContain('/\\.render\\.com$/.test(new URL(connectionString).hostname)');
    expect(pgStore).toContain('{ rejectUnauthorized: false }');
    expect(pgStore).toContain('new Pool({ connectionString, ssl })');
  });

  it('is off for a bare internal host and on for the external one', () => {
    const sslFor = (url: string): boolean => /\.render\.com$/.test(new URL(url).hostname);
    expect(sslFor('postgres://u:p@dpg-abc-a/desmon')).toBe(false);
    expect(sslFor('postgres://u:p@dpg-abc-a.oregon-postgres.render.com/desmon')).toBe(true);
    expect(sslFor('postgres://u:p@render.com.evil.example/desmon')).toBe(false);
    expect(sslFor('postgres://u:p@localhost:5432/desmon')).toBe(false);
  });
});

describe('pg.d.ts replaces @types/pg (F46, §1)', () => {
  it('declares the module with exactly the 3 members we use', () => {
    expect(pgTypes).toContain("declare module 'pg'");
    expect(pgTypes).toContain(
      'constructor(cfg: { connectionString: string; ssl?: { rejectUnauthorized: boolean } });',
    );
    expect(pgTypes).toContain(
      'query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;',
    );
    expect(pgTypes).toContain('end(): Promise<void>;');
    expect(pgTypes).toContain('ponytail:');
  });
});

describe('pg stays out of the app bundle (F46, §1)', () => {
  it('is an exactly pinned devDependency and never a runtime dependency', () => {
    expect(pkg.devDependencies['pg']).toBe('8.23.0');
    expect(pkg.dependencies?.['pg']).toBeUndefined();
  });

  it('is typed by hand, never by @types/pg', () => {
    expect(pkg.devDependencies['@types/pg']).toBeUndefined();
    expect(pkg.dependencies?.['@types/pg']).toBeUndefined();
  });

  it('keeps the compiled server out of the packaged .app', () => {
    expect(pkg.build.files).toContain('!dist/electron/server/**');
  });
});

describe('boot picks the store from DATABASE_URL (F46, §1)', () => {
  it('uses PgStore when DATABASE_URL is set and MemoryStore otherwise', () => {
    expect(index).toContain('const url = process.env.DATABASE_URL;');
    expect(index).toContain('await PgStore.connect(url) : new MemoryStore()');
  });

  it('warns on stderr exactly once when there is no database', () => {
    expect(index).toContain(
      "'[desmon-server] DATABASE_URL unset — using MemoryStore (data is lost on restart)',",
    );
    expect(index.match(/console\.error\(/g)).toHaveLength(1);
  });

  it('reports the chosen backend in the boot log', () => {
    expect(index).toContain("store=${url ? 'pg' : 'memory'}");
  });
});
