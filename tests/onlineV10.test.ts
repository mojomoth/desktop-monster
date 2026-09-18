import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, matches } from '../src/server/app.js';
import { MemoryStore } from '../src/server/store.js';
import { currentGold, publicGold, raidGold } from '../src/server/gold.js';
import { createNetClient, isGoldState, isPvpPresentation, isPvpResponse, toSnapshot } from '../src/main/net.js';
import { EQUIPMENT_CATALOG } from '../src/core/equipment.js';
import { simulateHeroicBattle } from '../src/core/battle.js';
import { EQUIPMENT_PROTOCOL, type HeroCombatSnapshot, type PvpResponse, type Snapshot, type WireEquipmentItem } from '../src/shared/api.js';
import type { ApiRequest } from '../src/server/http.js';

const hero = (level = 1): HeroCombatSnapshot => ({ hero: { formId: 'h00', buffPercent: 0 }, level,
  souls: 0, reincarnations: 0, trainingLevel: 0, loadout: { weapon: null, accessories: [] } });
const item = (id: number, templateId: string): WireEquipmentItem => ({ id: `e${id}`, templateId,
  enhancement: '0', roll: 100, seed: id, attempts: '0' });
const snapshot = (name: string, coins = '1000', combat = hero()): Snapshot => ({ name, level: combat.level,
  bestIndex: 8, rebirths: 0, companions: [], party: [], protocol: EQUIPMENT_PROTOCOL, combat,
  hero: combat.hero, gold: { revision: 0, coins } });
beforeEach(() => matches.clear());
function setup() {
  const store = new MemoryStore(); let serial = 0;
  const deps = { store, now: () => 1700000000000, randomUUID: () => `p${++serial}`,
    randomBytesHex: (n: number) => (++serial).toString(16).padStart(n * 2, '0'), randomSeed: () => 7 };
  let app = createApp(deps);
  const call = (method: string, path: string, auth: string | null, body: unknown = null) =>
    app.handle({ method, path, auth, body, query: {}, ip: 'v10-isolated' } satisfies ApiRequest);
  const fetchFn: typeof fetch = async (url, init = {}) => {
    const res = await call(init.method ?? 'GET', new URL(String(url)).pathname,
      new Headers(init.headers).get('authorization')?.slice(7) ?? null, init.body ? JSON.parse(String(init.body)) as unknown : null);
    return new Response(JSON.stringify(res.body), { status: res.status });
  };
  const client = createNetClient({ baseUrl: 'https://injected.invalid', fetchFn });
  const join = async (name: string, coins = '1000', combat = hero()) => {
    const result = await client.register(name); if (!result.ok) throw Error('register');
    const value = snapshot(name, coins, combat);
    expect(await client.upload(result.value.token, value)).toMatchObject({ ok: true });
    return { ...result.value, snapshot: value };
  };
  const fight = async (attacker: Awaited<ReturnType<typeof join>>, defender: Awaited<ReturnType<typeof join>>) => {
    const match = await client.match(attacker.token, defender.playerId); if (!match.ok) throw Error(JSON.stringify(match));
    const result = await client.pvp(attacker.token, { matchId: match.value.matchId, party: [] });
    if (!result.ok) throw Error(JSON.stringify(result)); return result.value;
  };
  return { store, call, client, join, fight, restart: () => { matches.clear(); app = createApp(deps); } };
}

describe('v0.10 decimal finance and equipment battle protocol', () => {
  it('uses the training hero when every other player still has a legacy snapshot', async () => {
    const s = setup(), modern = await s.join('modern');
    const legacy = await s.client.register('legacy'); if (!legacy.ok) throw Error('legacy registration');
    expect((await s.call('PUT', '/v1/snapshot', legacy.value.token, { name: 'legacy', bestIndex: 9, rebirths: 0, companions: [], party: [] })).status).toBe(200);
    expect(await s.client.match(modern.token)).toMatchObject({ ok: true, value: { bot: true, opponent: { name: 'Training Dummy' } } });
    expect(await s.client.match(modern.token, legacy.value.playerId)).toEqual({ ok: false, error: 'sync-required', status: 426 });
  });
  it('negotiates the new mode, transfers exact gold far beyond MAX_SAFE_INTEGER and replays hero-only combat', async () => {
    const s = setup(), huge = 10n ** 120n;
    const a = await s.join('attacker', String(huge), hero(20)), d = await s.join('defender', String(huge), hero());
    expect(await s.client.me!(a.token)).toMatchObject({ ok: true, value: { pvpMode: EQUIPMENT_PROTOCOL, gold: { balance: String(huge) } } });
    const result = await s.fight(a, d);
    expect(result).toMatchObject({ win: true, ownParty: [], gold: { amount: '75', delta: '75' },
      ownFighters: [{ id: '@hero', kind: 'hero' }], opponentFighters: [{ id: '@hero', kind: 'hero' }] });
    expect(result.blows[0]).toMatchObject({ actorId: '@hero', actorKind: 'hero', targetId: '@hero', targetKind: 'hero' });
    expect(result.blows.length).toBeGreaterThan(0);
    expect((await s.store.getById(a.playerId))!.goldAccount!.balance).toBe(String(huge + 75n));
    expect((await s.store.getById(d.playerId))!.goldAccount!.balance).toBe(String(huge - 75n));
    expect(isPvpResponse(result)).toBe(true);
    const defense = (await s.store.getById(d.playerId))!.goldAccount!.events[0]!.presentation;
    expect(isPvpPresentation(defense)).toBe(true);
    expect(defense.goldDelta).toBe('-75');
    expect(defense.replay.ownFighters).toEqual(result.opponentFighters);
    expect(defense.replay.opponentFighters).toEqual(result.ownFighters);
    s.restart();
    expect(await s.client.pvp(a.token, { matchId: result.matchId!, party: [] })).toEqual({ ok: true, value: result });
    expect((await s.store.getById(a.playerId))!.goldAccount!.balance).toBe(String(huge + 75n));
  });

  it('freezes all five defender items at preview, and attacker equipment at first resolve', async () => {
    const s = setup();
    const weapon = EQUIPMENT_CATALOG.find(t => t.kind === 'weapon' && t.rarity === 'common' && t.tier === 0)!;
    const accessory = EQUIPMENT_CATALOG.find(t => t.kind === 'accessory' && t.rarity === 'common')!;
    const equipped = hero(20); equipped.loadout = { weapon: item(1, weapon.id), accessories: [2, 3, 4, 5].map(id => item(id, accessory.id)) };
    const a = await s.join('attacker', '1000', hero(20)), d = await s.join('defender', '1000', equipped);
    const match = await s.client.match(a.token, d.playerId); if (!match.ok) throw Error('preview');
    expect(match.value.opponent.combat!.loadout).toEqual(equipped.loadout);
    expect(await s.client.upload(d.token, { ...snapshot('defender', '1000', hero()), gold: { revision: 1, coins: '1000' } })).toMatchObject({ ok: true });
    const attacking = structuredClone(equipped); attacking.loadout.weapon!.enhancement = '5';
    expect(await s.client.upload(a.token, { ...snapshot('attacker', '1000', attacking), gold: { revision: 1, coins: '1000' } })).toMatchObject({ ok: true });
    const result = await s.client.pvp(a.token, { matchId: match.value.matchId, party: [] }); if (!result.ok) throw Error('battle');
    const expected = simulateHeroicBattle([], [], { attacker: attacking, defender: equipped }, match.value.seed);
    expect(result.value.ownCombat).toEqual(attacking);
    expect(result.value.opponent.combat).toEqual(equipped);
    expect(result.value.blows).toEqual(expected.blows.map(b => ({ ...b, damage: String(b.damage) })));
    expect(result.value.ownFighters).toEqual(expected.attackerFighters);
    expect(result.value.opponentFighters).toEqual(expected.defenderFighters);
    const before = structuredClone(await s.store.getById(a.playerId));
    expect(await s.client.pvp(a.token, { matchId: match.value.matchId, party: [] })).toEqual(result);
    expect(await s.store.getById(a.playerId)).toEqual(before);
  });

  it('rejects downgrade writes without discarding a committed legacy financial receipt', async () => {
    const s = setup(), a = await s.join('owner');
    const legacy: PvpResponse = { bot: false, seed: 7, win: true, opponent: { name: 'old', bestIndex: 8, rebirths: 0, party: [] },
      blows: [], stolen: null, lost: null, gold: { amount: 50, delta: 50, reason: 'transfer' } };
    await s.store.setLastMatch(a.playerId, { matchId: 'old-match', result: legacy });
    const before = structuredClone(await s.store.getById(a.playerId));
    const old = { name: 'owner', bestIndex: 8, rebirths: 0, companions: [], party: [], gold: { revision: 1, coins: 0 } };
    expect(await s.call('PUT', '/v1/snapshot', a.token, old)).toEqual({ status: 426, body: { error: 'upgrade_required' } });
    expect(await s.call('POST', '/v1/pvp/match', a.token, { mode: 'gold-v1' })).toEqual({ status: 426, body: { error: 'upgrade_required' } });
    s.restart();
    expect(await s.call('POST', '/v1/pvp', a.token, { matchId: 'old-match', party: [], mode: 'gold-v1' })).toEqual({ status: 200, body: legacy });
    expect(isPvpResponse(legacy)).toBe(true);
    expect(await s.store.getById(a.playerId)).toEqual(before);
  });

  it('rejects malformed decimal money, duplicate item copies and incompatible requirements atomically', async () => {
    const s = setup(), a = await s.join('owner');
    const before = structuredClone(await s.store.getById(a.playerId));
    for (const coins of [1000, '01', '-0', '+1', '1e10', '1.1', '-1', '']) {
      expect((await s.call('PUT', '/v1/snapshot', a.token, { ...a.snapshot, gold: { revision: 1, coins } })).status).toBe(400);
    }
    const accessory = EQUIPMENT_CATALOG.find(t => t.kind === 'accessory')!, weapon = EQUIPMENT_CATALOG.find(t => t.kind === 'weapon' && t.requiredLevel > 1)!;
    for (const loadout of [{ weapon: null, accessories: [item(1, accessory.id), item(1, accessory.id)] },
      { weapon: item(1, weapon.id), accessories: [] }]) {
      expect((await s.call('PUT', '/v1/snapshot', a.token, { ...a.snapshot, combat: { ...hero(), loadout }, gold: { revision: 1, coins: '1000' } })).status).toBe(400);
    }
    expect(await s.store.getById(a.playerId)).toEqual(before);
  });

  it('migrates exact legacy JSONB account numbers without clamping or losing daily budgets', () => {
    const original = { ...currentGold(null, 1000), balance: Number.MAX_SAFE_INTEGER, peak: Number.MAX_SAFE_INTEGER,
      gained: 7, lost: 9, enrolled: true, net: '-2' };
    const migrated = currentGold(original, 1000), other = currentGold(null, 1000);
    other.balance = '10000'; other.peak = '10000'; other.enrolled = true;
    expect(migrated).toMatchObject({ balance: String(Number.MAX_SAFE_INTEGER), peak: String(Number.MAX_SAFE_INTEGER), gained: '7', lost: '9' });
    expect(publicGold(original).balance).toBe(String(Number.MAX_SAFE_INTEGER));
    expect(raidGold(migrated, other, 'a', 'd', true, 1000)).toEqual({ amount: '75', delta: '75', reason: 'transfer' });
    expect(migrated.balance).toBe(String(BigInt(Number.MAX_SAFE_INTEGER) + 75n));
    expect(migrated.gained).toBe('82');
    expect(() => currentGold({ ...original, balance: Number.MAX_SAFE_INTEGER + 1 }, 1000)).toThrow('Invalid persisted gold');
  });

  it('keeps wire snapshots JSON-safe and validates huge signed debt totals without accepting noncanonical forms', () => {
    const loadout = hero(10).loadout;
    const result = toSnapshot('owner', { coins: '1' + '0'.repeat(100), souls: 3, level: 10, rebirths: 2,
      bestIndex: 40, companions: [], progress: { trainingLevel: 4 }, equipment: { loadout },
      hero: { equipped: { formId: 'h00', buffPercent: 0 }, reincarnations: 5 } });
    expect(result.protocol).toBe(EQUIPMENT_PROTOCOL);
    expect(result.combat).toMatchObject({ level: 10, souls: 3, reincarnations: 5, trainingLevel: 4, loadout });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(isGoldState({ revision: 2, balance: result.gold!.coins, net: '-' + '9'.repeat(100) })).toBe(true);
    for (const balance of ['01', '-0', '1e3', 2 ** 53]) expect(isGoldState({ revision: 2, balance, net: '0' })).toBe(false);
  });
});
