import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, mulberry32, parseSave, serializeSave } from '../../src/core/index.js';
import { createNetClient, toSnapshot } from '../../src/main/net.js';
import { createApp } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import type { Companion, NetResult, Snapshot } from '../../src/shared/api.js';

/** Real app/client JSON boundaries, injected transport/store/clock/RNG; no socket. */
function setup() {
  const store = new MemoryStore();
  let id = 0;
  const app = createApp({
    store,
    now: () => 1_700_000_000_000,
    randomUUID: () => `p${id++}`,
    randomBytesHex: (n) => String(id++).padStart(n * 2, '0'),
    randomSeed: () => 7,
  });
  const fetchFn = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const response = await app.handle({
      method: init.method ?? 'GET', path: url.pathname, query: Object.fromEntries(url.searchParams),
      auth: new Headers(init.headers).get('authorization')?.slice(7) ?? null,
      body: typeof init.body === 'string' ? JSON.parse(init.body) as unknown : null,
      ip: 'injected',
    });
    return new Response(JSON.stringify(response.body), { status: response.status });
  }) as typeof fetch;
  return { store, client: createNetClient({ baseUrl: 'https://injected.example', fetchFn }) };
}

function value<T>(result: NetResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.value;
}

const companion = (id: string, level: number, bossIndex = 8): Companion =>
  ({ id, speciesId: 'slime', bossIndex, level, stars: 0 });
const snapshot = (name: string, c: Companion): Snapshot =>
  ({ name, bestIndex: c.bossIndex, rebirths: 0, companions: [c], party: [c.id] });

describe('v0.7 high-level server/client round trips', () => {
  it.each([11, 250, Number.MAX_SAFE_INTEGER])('preserves level %s and transfer IDs through engine/save/restart/upload, theft and reclaim', async (level) => {
    const { client, store } = setup();
    const raider = value(await client.register('raider'));
    const victim = value(await client.register('victim'));
    const mine = companion('a1', Number.MAX_SAFE_INTEGER, 400);
    const theirs = companion('d1', level);
    const raiderEngine = createEngine({ ...DEFAULT_SAVE, companions: [mine], nextCompanionId: 2 }, mulberry32(7));
    const victimEngine = createEngine({ ...DEFAULT_SAVE, companions: [theirs], nextCompanionId: 2 }, mulberry32(7));
    const victimSnapshot = snapshot('victim', theirs);
    value(await client.upload(raider.token, snapshot('raider', mine)));
    value(await client.upload(victim.token, victimSnapshot));
    expect((await store.getById(victim.playerId))?.snapshot).toEqual(victimSnapshot);
    expect(value(await client.opponents(raider.token)).opponents[0]?.party).toEqual([theirs]);

    const match = value(await client.match(raider.token, victim.playerId));
    expect(match.opponent.playerId).toBe(victim.playerId);
    expect(match.opponent.party).toEqual([theirs]);
    const fight = value(await client.pvp(raider.token, { matchId: match.matchId, party: ['a1'] }));
    expect(fight.win).toBe(true);
    expect(fight.opponent.playerId).toBe(victim.playerId);
    expect(fight.opponent.party).toEqual([theirs]);
    expect(fight.stolen).toEqual({ ...theirs, id: 's7' });
    expect((await store.getById(raider.playerId))?.snapshot?.companions).toEqual([mine, fight.stolen]);

    // The actual renderer action and automatic save/upload must keep s7: the
    // victim's reclaim record points to that exact ID in the raider's roster.
    raiderEngine.apply({ type: 'pvpResult', won: fight.win, stolen: fight.stolen, lostId: fight.lost?.id ?? null });
    const restartedRaider = createEngine(parseSave(serializeSave(raiderEngine.toSave())), mulberry32(7));
    expect(restartedRaider.getState().companions).toEqual([mine, fight.stolen]);
    value(await client.upload(raider.token, toSnapshot('raider', restartedRaider.toSave())));
    expect((await store.getById(raider.playerId))?.snapshot?.companions).toEqual([mine, fight.stolen]);

    const inbox = value(await client.thefts(victim.token));
    expect(inbox.thefts).toHaveLength(1);
    expect(inbox.thefts[0]?.companion).toEqual(theirs);
    const uploaded = value(await client.upload(victim.token, victimSnapshot));
    expect(uploaded.removed).toEqual(['d1']);
    expect(uploaded.thefts).toEqual(inbox.thefts);
    victimEngine.apply({ type: 'removeCompanions', ids: uploaded.removed });

    const reclaimed = value(await client.reclaim(victim.token, 't7')).companion;
    expect(reclaimed).toEqual({ ...theirs, id: reclaimed.id });
    expect(reclaimed.id).toMatch(/^r[0-9a-f]+$/);
    expect((await store.getById(victim.playerId))?.snapshot?.companions).toEqual([reclaimed]);
    expect((await store.getById(raider.playerId))?.snapshot?.companions).toEqual([mine]);
    victimEngine.apply({ type: 'addCompanion', companion: reclaimed });
    const restartedVictim = createEngine(parseSave(serializeSave(victimEngine.toSave())), mulberry32(7));
    expect(restartedVictim.getState().companions).toEqual([reclaimed]);
    value(await client.upload(victim.token, toSnapshot('victim', restartedVictim.toSave())));
    expect((await store.getById(victim.playerId))?.snapshot?.companions).toEqual([reclaimed]);
    const raiderSync = value(await client.upload(raider.token, toSnapshot('raider', restartedRaider.toSave())));
    expect(raiderSync.removed).toEqual(['s7']);
    restartedRaider.apply({ type: 'removeCompanions', ids: raiderSync.removed });
    expect(parseSave(serializeSave(restartedRaider.toSave())).companions).toEqual([mine]);
    expect(value(await client.thefts(victim.token)).thefts).toEqual([]);
    expect(value(await client.opponents(raider.token)).opponents[0]?.party).toEqual([reclaimed]);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity])('rejects uploaded level %s without replacing the saved roster', async (level) => {
    const { client, store } = setup();
    const me = value(await client.register('owner'));
    const original = snapshot('owner', companion('c1', 250));
    value(await client.upload(me.token, original));
    expect(await client.upload(me.token, snapshot('owner', companion('c1', level))))
      .toEqual({ ok: false, error: 'server', status: 400 });
    expect((await store.getById(me.playerId))?.snapshot).toEqual(original);
  });
});
