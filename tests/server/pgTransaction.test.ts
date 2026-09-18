import { beforeEach, describe, expect, it, vi } from 'vitest';

// The pg module is entirely replaced: these tests open no DB or socket.
const { commands, release, query, poolQuery } = vi.hoisted(() => {
  const commands: string[] = [];
  return {
    commands,
    release: vi.fn(),
    query: vi.fn(async (sql: string) => { commands.push(sql); return { rows: [] }; }),
    poolQuery: vi.fn(async () => ({ rows: [] as Record<string, unknown>[] })),
  };
});
vi.mock('pg', () => ({ Pool: class {
  query = poolQuery;
  async connect() { return { query, release }; }
} }));
import { PgStore } from '../../src/server/pgStore.js';
import { EQUIPMENT_PROTOCOL } from '../../src/shared/api.js';
import type { LastMatch, LastReclaim, Snapshot, Theft } from '../../src/shared/api.js';

beforeEach(() => { commands.length = 0; vi.clearAllMocks(); });

describe('Postgres atomic battle writes', () => {
  it('filters protocol eligibility before choosing either ranked neighbor using parameters', async () => {
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    for (const direction of ['up', 'down'] as const) {
      await store.neighbor('owner', { bestIndex: 100, rebirths: 2 }, direction, EQUIPMENT_PROTOCOL);
      expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining("snapshot->>'protocol' = $4"), ['owner', 100, 2, EQUIPMENT_PROTOCOL]);
      expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining("jsonb_typeof(snapshot->'combat') = 'object' AND gold_account->>'enrolled' = 'true' ORDER BY"), ['owner', 100, 2, EQUIPMENT_PROTOCOL]);
    }
    await store.neighbor('owner', { bestIndex: 100, rebirths: 2 }, 'up');
    expect(poolQuery).toHaveBeenLastCalledWith(expect.not.stringContaining('protocol'), ['owner', 100, 2]);
  });
  it('atomically allocates bounded decimal transfer serials and installs a legacy non-rewinding trigger', async () => {
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining('GREATEST(NEW.transfer_high_water, OLD.transfer_high_water)'));
    poolQuery.mockResolvedValueOnce({ rows: [{transfer_high_water:'1001'}] });
    expect(await store.allocateTransferId('owner', 's', 7)).toBe('s1001');
    expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining('GREATEST(transfer_high_water + 1, $2)'), ['owner',7]);
    poolQuery.mockResolvedValueOnce({rows:[]});
    await expect(store.allocateTransferId('owner','r')).rejects.toThrow('exhausted');
    await expect(store.allocateTransferId('owner','s',Number.MAX_SAFE_INTEGER)).rejects.toThrow('floor');
  });
  it('persists revocations and replay/reclaim receipts through a newly constructed store', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const companion = { id: 'r7', speciesId: 'slime', bossIndex: 7, level: 1, stars: 0 };
    const receipt: LastMatch = { matchId: 'a1', result: { matchId: 'a1', record: { wins: 2, losses: 1 },
      bot: false, seed: 7, win: true, opponent: { name: 'foe', bestIndex: 7, rebirths: 0, party: [] },
      blows: [], stolen: null, lost: null } };
    const reclaimed: LastReclaim = { theftId: 't7', companion };
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    await store.setLastMatch(id, receipt);
    expect(poolQuery).toHaveBeenLastCalledWith('UPDATE players SET last_match = $2::jsonb WHERE id = $1', [id, JSON.stringify(receipt)]);
    await store.setLastReclaim(id, reclaimed);
    expect(poolQuery).toHaveBeenLastCalledWith('UPDATE players SET last_reclaim = $2::jsonb WHERE id = $1', [id, JSON.stringify(reclaimed)]);
    const restarted = await PgStore.connect('postgres://u:p@localhost/desmon');
    const revoked = Array.from({ length: 50 }, (_, i) => `c${i + 1}`);
    poolQuery.mockResolvedValueOnce({ rows: [{ id, nickname: 'owner', snapshot: null, stolen_ids: revoked.slice(-32),
      revoked_ids: revoked, last_match: JSON.parse(JSON.stringify(receipt)) as unknown,
      last_reclaim: JSON.parse(JSON.stringify(reclaimed)) as unknown, last_pvp_at: 1000, wins: 2, losses: 1 }] });
    expect(await restarted.getById(id)).toMatchObject({ revokedIds: revoked, lastMatch: receipt, lastReclaim: reclaimed, wins: 2, losses: 1 });
  });

  it('uses exact numeric level comparisons and parameterized score values for metric queries', async () => {
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    await store.top(1, 'level');
    expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining("(snapshot->>'level')::numeric DESC, id ASC"), [1]);
    await store.rank({ bestIndex: 1, rebirths: 0, level: Number.MAX_SAFE_INTEGER }, 'level');
    expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining("(snapshot->>'level')::numeric > $1"), [Number.MAX_SAFE_INTEGER]);
    await store.rank({ bestIndex: 1, rebirths: 0, wins: 17 }, 'pvpWins');
    expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining('wins > $1'), [17]);
  });

  it.each([11, 250, Number.MAX_SAFE_INTEGER])('keeps level %s exact in JSONB snapshots/thefts across a store restart', async (level) => {
    const id = '00000000-0000-4000-8000-000000000001';
    const companion = { id: 'c1', speciesId: 'slime', bossIndex: 8, level, stars: 0 };
    const snapshot: Snapshot = { name: 'owner', bestIndex: 8, rebirths: 0, companions: [companion], party: ['c1'] };
    const thefts: Theft[] = [{ id: 't7', companion, transferredId: 's7', thiefId: id, thiefName: 'thief', at: 1000, reclaimUntil: 86401000 }];
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    await store.putSnapshot(id, snapshot);
    expect(poolQuery).toHaveBeenLastCalledWith(expect.stringContaining('snapshot = $2::jsonb'), [id, JSON.stringify(snapshot), 8, 0, 'owner']);
    await store.setThefts(id, thefts);
    expect(poolQuery).toHaveBeenLastCalledWith('UPDATE players SET thefts = $2::jsonb WHERE id = $1', [id, JSON.stringify(thefts)]);

    const restarted = await PgStore.connect('postgres://u:p@localhost/desmon');
    poolQuery.mockResolvedValueOnce({ rows: [{ id, nickname: 'owner', snapshot: JSON.parse(JSON.stringify(snapshot)) as unknown, thefts: JSON.parse(JSON.stringify(thefts)) as unknown, stolen_ids: [], last_pvp_at: null }] });
    const row = await restarted.getById(id);
    expect(row?.snapshot).toEqual(snapshot);
    expect(row?.thefts).toEqual(thefts);
  });

  it('normalizes persisted legacy snapshots without party or official record columns', async () => {
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    const id = '00000000-0000-4000-8000-000000000001';
    poolQuery.mockResolvedValueOnce({ rows: [{ id, nickname: 'old', snapshot: { name: 'old', bestIndex: 3, rebirths: 0, companions: [] }, stolen_ids: [], last_pvp_at: null }] });
    expect(await store.getById(id)).toMatchObject({ snapshot: { party: [] }, wins: 0, losses: 0, thefts: [] });
  });

  it('uses a dedicated connection, locks writes, commits and releases', async () => {
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    await store.transaction(async (tx) => {
      await tx.setLastPvpAt('winner', 1000);
      await tx.recordBattle('winner', 'loser');
    });
    expect(poolQuery).toHaveBeenCalledTimes(1); // DDL only; the transaction owns its client.
    expect(commands[0]).toBe('BEGIN');
    expect(commands[1]).toBe('LOCK TABLE players IN SHARE ROW EXCLUSIVE MODE');
    expect(commands[2]).toBe('UPDATE players SET last_pvp_at = $2 WHERE id = $1');
    expect(commands[3]).toContain('UPDATE players SET wins = wins +');
    expect(commands.at(-1)).toBe('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back all writes and releases when work fails', async () => {
    const store = await PgStore.connect('postgres://u:p@localhost/desmon');
    await expect(store.transaction(async (tx) => {
      await tx.setLastPvpAt('winner', 1000);
      throw new Error('failed roster write');
    })).rejects.toThrow('failed roster write');
    expect(commands).not.toContain('COMMIT');
    expect(commands.at(-1)).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
