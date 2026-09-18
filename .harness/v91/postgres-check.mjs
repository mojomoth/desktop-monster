// Uses a marked, disposable localhost database and creates a fresh schema; never drops existing data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), { Pool } = require('pg');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [connection, destination, compiled = join(root, 'dist/electron')] = process.argv.slice(2);
assert(connection && destination, 'Usage: postgres-check.mjs LOCAL_DESMON_V091_URL OUTPUT_JSON [CANDIDATE_ELECTRON]');
const url = new URL(connection), output = resolve(destination), candidate = resolve(compiled);
assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/desmon_v091', 'Only localhost/desmon_v091 is allowed');
const marker = 'desmon-v091-check:' + basename(dirname(output));
const { PgStore } = require(join(candidate, 'server/pgStore.js'));
const { MemoryStore } = require(join(candidate, 'server/store.js'));
const { createApp, matches } = require(join(candidate, 'server/app.js'));
const digest = value => createHash('sha256').update(value).digest('hex');
const hash = path => digest(readFileSync(path));
const bind = directory => Object.fromEntries(readdirSync(directory).filter(p => /\.(ts|js)$/.test(p)).sort()
  .map(p => [join(directory, p), hash(join(directory, p))]));
const sources = { ...bind(join(root, 'src/server')), ...bind(join(root, 'src/core')),
  ...bind(join(candidate, 'server')), ...bind(join(candidate, 'core')), [fileURLToPath(import.meta.url)]: hash(fileURLToPath(import.meta.url)) };
const baselineReport = join(dirname(output), 'balance-01.json');
const balance = JSON.parse(readFileSync(baselineReport, 'utf8'));
for (const [path, expected] of Object.entries(sources)) {
  if (balance.binding[path]) assert.equal(expected, balance.binding[path], `Different source from balance measurement: ${path}`);
}
const control = new Pool({ connectionString: connection, connectionTimeoutMillis: 5000 });
const pools = [control], checks = [], trace = [];
let schema = null, databaseVersion = null, problem = null;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companion = (n, level) => ({ id: 'c' + n, speciesId: 'slime', bossIndex: 7, level, stars: 0 });
const snapshot = (n, level) => ({ name: 'Fixture' + n, bestIndex: n, rebirths: 0, level: 20,
  companions: [companion(n, level)], party: ['c' + n] });

async function exercise(store, backend) {
  matches.clear(); let at = 1_700_000_000_000, serial = 0;
  const deps = { store, now: () => at, randomUUID: () => id(++serial + 100),
    randomBytesHex: bytes => (++serial).toString(16).padStart(bytes * 2, '0'), randomSeed: () => 7 };
  let app = createApp(deps);
  const responses = [];
  const call = async (n, method, path, body = null, query = {}) => {
    const result = await app.handle({ method, path, body, query, auth: 'owned-fixture-token-' + n, ip: 'owned-fixture' });
    trace.push({ backend, at, player: n, method, path, body, query, result });
    responses.push(structuredClone(result)); return result;
  };
  for (const [n, level] of [[1, 100], [2, 1], [3, 90]]) {
    await store.createPlayer({ id: id(n), tokenHash: digest('owned-fixture-token-' + n), name: 'Fixture' + n });
    const response = await call(n, 'PUT', '/v1/snapshot', { ...snapshot(n, level), gold: { revision: 0, coins: 1000 } });
    assert.equal(response.status, 200); assert.deepEqual(response.body.gold, { revision: 1, net: '0', balance: 1000 });
  }
  const put = { ...snapshot(3, 90), gold: { revision: 1, coins: 900 } };
  const concurrent = await Promise.all([call(3, 'PUT', '/v1/snapshot', put), call(3, 'PUT', '/v1/snapshot', put)]);
  assert.deepEqual(concurrent.map(r => r.status), [200, 409]);
  assert.equal(concurrent[1].body.error, 'gold_conflict');
  const prepare = async n => {
    const response = await call(n, 'POST', '/v1/pvp/match', { opponentId: id(2), mode: 'gold-v1' });
    assert.equal(response.status, 200); return { matchId: response.body.matchId, party: ['c' + n], mode: 'gold-v1' };
  };
  const first = await prepare(1), result = await call(1, 'POST', '/v1/pvp', first);
  assert.equal(result.status, 200); assert.deepEqual(result.body.gold, { amount: 50, delta: 50, reason: 'transfer' });
  assert.equal(result.body.stolen, null); assert.equal(result.body.lost, null);
  const afterFirst = structuredClone(await store.getById(id(1)));
  const defenderFirst = structuredClone(await store.getById(id(2)));
  assert.equal(defenderFirst.goldAccount.events.length, 1);
  assert.equal(defenderFirst.goldAccount.events[0].presentation.goldDelta, -50);
  assert.deepEqual(defenderFirst.goldAccount.events[0].presentation.replay.blows,
    result.body.blows.map(blow => ({ ...blow, side: blow.side === 'A' ? 'D' : 'A' })));
  matches.clear(); app = createApp(deps);
  const retried = await Promise.all([call(1, 'POST', '/v1/pvp', first), call(1, 'POST', '/v1/pvp', first)]);
  assert.deepEqual(retried, [result, result]);
  assert.deepEqual(await store.getById(id(1)), afterFirst); assert.deepEqual(await store.getById(id(2)), defenderFirst);
  const stale = await call(2, 'PUT', '/v1/snapshot', { ...snapshot(2, 1), gold: { revision: 1, coins: 1000 } });
  assert.equal(stale.status, 409); assert.equal((await store.getById(id(2))).goldAccount.balance, 950);
  const other = await prepare(3), busy = await call(3, 'POST', '/v1/pvp', other);
  assert.equal(busy.status, 429); assert.equal(busy.body.error, 'defense_cooldown');
  at += 60_000;
  const second = await call(3, 'POST', '/v1/pvp', other);
  assert.equal(second.status, 200); assert.equal(second.body.gold.amount, 45); // attacker balance 900 limits its risk

  // Inject failure after both wallet writes and the defender inbox UPDATE have executed.
  at += 60_000;
  const beforeRollback = await Promise.all([1, 2, 3].map(n => store.getById(id(n))));
  const failing = Object.create(store);
  failing.transaction = work => store.transaction(tx => work(new Proxy(tx, { get(target, key) {
    if (key === 'setGoldAccount') return async (player, value) => {
      await target.setGoldAccount(player, value);
      if (player === id(2)) throw Error('owned fault after defender wallet/inbox write');
    };
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } })));
  app = createApp({ ...deps, store: failing });
  const failedMatch = await prepare(1), failed = await call(1, 'POST', '/v1/pvp', failedMatch);
  assert.equal(failed.status, 500);
  assert.deepEqual(await Promise.all([1, 2, 3].map(n => store.getById(id(n)))), beforeRollback);
  app = createApp(deps);
  const fresh = await prepare(1), third = await call(1, 'POST', '/v1/pvp', fresh);
  assert.equal(third.status, 200);
  assert.equal(third.body.gold.amount, 0); // same unordered pair is still protected
  const events = await call(2, 'GET', '/v1/pvp/events', null, { after: '0' });
  assert.deepEqual(events.body.events.map(e => e.seq), [1, 2, 3]);
  const walletBeforeAck = (await call(2, 'GET', '/v1/me')).body.gold;
  assert.deepEqual(await call(2, 'POST', '/v1/pvp/events/ack', { through: 1 }), { status: 200, body: { ok: true } });
  assert.equal((await call(2, 'POST', '/v1/pvp/events/ack', { through: 4 })).status, 400);
  assert.deepEqual((await call(2, 'GET', '/v1/pvp/events', null, { after: '0' })).body.events.map(e => e.seq), [2, 3]);
  assert.deepEqual((await call(2, 'GET', '/v1/me')).body.gold, walletBeforeAck);
  const legacy = await call(2, 'PUT', '/v1/snapshot', { ...snapshot(2, 1), coins: 999999, wins: 999999 });
  assert.equal(legacy.status, 200);
  assert.deepEqual((await call(2, 'GET', '/v1/me')).body.gold, walletBeforeAck);
  const final = await Promise.all([1, 2, 3].map(n => store.getById(id(n))));
  assert.equal(final.reduce((sum, row) => sum + row.goldAccount.balance, 0), 2900);
  assert.equal(final.reduce((sum, row) => sum + BigInt(row.goldAccount.net), 0n), 0n);
  for (let n = 1; n <= 3; n++) assert.deepEqual(final[n - 1].snapshot.companions, snapshot(n, n === 1 ? 100 : n === 2 ? 1 : 90).companions);
  return { responses, final };
}

try {
  const ownership = (await control.query(`SELECT current_database() AS name, pg_get_userbyid(datdba) = current_user AS owned,
    shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname = current_database()`)).rows[0];
  assert.deepEqual(ownership, { name: 'desmon_v091', owned: true, marker }, 'Database must carry this session ownership marker; no implicit claim or cleanup');
  checks.push('localhost database name, owner role and session ownership comment verified');
  databaseVersion = (await control.query('SHOW server_version')).rows[0].server_version;
  schema = 'v091_' + randomUUID().replaceAll('-', '');
  await control.query(`CREATE SCHEMA ${schema}`);
  const scoped = new URL(connection); scoped.searchParams.set('options', `-csearch_path=${schema},public`);
  const pool = new Pool({ connectionString: scoped.toString(), connectionTimeoutMillis: 5000 }); pools.push(pool);
  await pool.query(`CREATE TABLE players (id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, nickname text NOT NULL,
    snapshot jsonb, best_index integer NOT NULL DEFAULT 0, rebirths integer NOT NULL DEFAULT 0,
    stolen_ids jsonb NOT NULL DEFAULT '[]', last_pvp_at double precision, updated_at timestamptz NOT NULL DEFAULT now(),
    thefts jsonb NOT NULL DEFAULT '[]', wins integer NOT NULL DEFAULT 0, losses integer NOT NULL DEFAULT 0)`);
  await pool.query('INSERT INTO players(id,token_hash,nickname,snapshot,stolen_ids) VALUES($1,$2,$3,$4,$5)',
    [id(99), 'owned-legacy-token', 'Legacy', snapshot(99, 1), JSON.stringify(['c99'])]);
  const pg = await PgStore.connect(scoped.toString()); pools.push(pg.pool);
  const legacy = await pg.getById(id(99));
  assert.deepEqual(legacy.revokedIds, ['c99']); assert.deepEqual(legacy.snapshot.companions, []); assert.equal(legacy.goldAccount, null);
  checks.push('actual pre-v9 schema migrates gold JSONB while preserving permanent revocation backfill');
  const memory = await exercise(new MemoryStore(), 'MemoryStore');
  const actual = await exercise(pg, 'PostgreSQL');
  assert.deepEqual(actual, memory);
  checks.push('all actual HTTP responses and complete stored player rows equal MemoryStore',
    'concurrent same-revision PUT commits once and rejects stale CAS',
    'battle transfers equal gold and commits records, receipt and defender-normalized inbox atomically',
    'server restart and duplicate receipt retries do not transfer, increment records or enqueue twice',
    'defender cooldown serializes independent attackers and stale snapshots cannot replace the wallet',
    'injected failure after both wallet/inbox writes rolls back records, cooldown, net, balance and events in real PostgreSQL',
    'ACK removes only its confirmed prefix, future ACK rejects, and neither changes money',
    'legacy wallet-less snapshot preserves gold and both rosters remain unchanged');
  const sqlRows = (await pool.query(`SELECT id, gold_account->>'net' AS net, gold_account->>'balance' AS balance,
    gold_account->>'revision' AS revision, jsonb_array_length(gold_account->'events') AS inbox,
    last_match->>'matchId' AS receipt, wins, losses FROM players WHERE gold_account IS NOT NULL ORDER BY id`)).rows;
  trace.push({ backend: 'PostgreSQL', query: 'committed wallet/receipt/inbox rows', rows: sqlRows });
  const again = await PgStore.connect(scoped.toString()); pools.push(again.pool);
  assert.deepEqual(await Promise.all([1, 2, 3].map(n => again.getById(id(n)))), actual.final);
  checks.push('second real migration preserves completed wallets, receipts and acknowledged queues');
  for (const [path, expected] of Object.entries(sources)) assert.equal(hash(path), expected, `Bound source changed: ${path}`);
} catch (error) { problem = String(error.stack ?? error); }
finally { await Promise.all(pools.map(pool => pool.end())); }
const bytes = trace.map(row => JSON.stringify(row)).join('\n') + '\n', rawPath = output.replace(/\.json$/, '') + '.jsonl';
writeFileSync(rawPath, bytes, { flag: 'wx' });
writeFileSync(output, JSON.stringify({ version: 91, passed: problem === null, at: new Date().toISOString(),
  database: { host: url.hostname, port: url.port, name: 'desmon_v091', ownerMarker: marker, version: databaseVersion, schema },
  checks, rawPath, rawSha256: digest(bytes), sourceHashes: sources, balanceReportSha256: hash(baselineReport), error: problem }, null, 2) + '\n', { flag: 'wx' });
if (problem) { process.stderr.write(problem + '\n'); process.exitCode = 1; }
else process.stdout.write(JSON.stringify({ passed: true, checks, schema, rows: trace.length }) + '\n');
