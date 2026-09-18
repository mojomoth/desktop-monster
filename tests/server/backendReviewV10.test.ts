// Independent Designer review of the Host-owned server and client boundaries.
// No sockets, database, clocks, private saves or production PvP are used.
import { describe, expect, it } from 'vitest';
import { createApp, parseSnapshot } from '../../src/server/app.js';
import { MemoryStore } from '../../src/server/store.js';
import { currentGold } from '../../src/server/gold.js';
import { isPvpPresentation, isPvpResponse } from '../../src/main/net.js';
import { EQUIPMENT_PROTOCOL } from '../../src/shared/api.js';
import type { HeroCombatSnapshot, MatchResponse, PvpResponse, RegisterResponse, Snapshot, WireEquipmentItem } from '../../src/shared/api.js';

const item = (id: number, templateId: string): WireEquipmentItem => ({ id: `e${id}`, templateId, enhancement: '5', roll: 107, seed: id, attempts: '0' });
const combat = (weapon: string | null = 'w-sword-common-4'): HeroCombatSnapshot => ({
  hero: { formId: 'h00', buffPercent: 0 }, level: 15, souls: 0, reincarnations: 0, trainingLevel: 0,
  loadout: { weapon: weapon ? item(1, weapon) : null,
    accessories: [2, 3, 4, 5].map(id => item(id, 'a-ring-critical-common-1')) },
});
const snapshot = (name: string, loadout = combat(), revision = 0, bestIndex = 100): Snapshot => ({
  name, protocol: EQUIPMENT_PROTOCOL, level: loadout.level, bestIndex, rebirths: 0,
  companions: [], party: [], hero: loadout.hero, combat: loadout,
  gold: { revision, coins: '900719925474099312345678901234' },
});
function setup() {
  const store = new MemoryStore(); let serial = 0;
  const app = createApp({ store, now: () => 1_700_000_000_000,
    randomUUID: () => `review-${++serial}`, randomBytesHex: n => (++serial).toString(16).padStart(n * 2, '0'), randomSeed: () => 73 });
  const call = (method: string, path: string, auth: string | null, body?: unknown) =>
    app.handle({ method, path, auth, body, ip: 'independent-review', query: {} });
  const add = async (name: string, state = snapshot(name)) => {
    const registered = await call('POST', '/v1/players', null, { nickname: name });
    expect(registered.status).toBe(201); const player = registered.body as RegisterResponse;
    expect((await call('PUT', '/v1/snapshot', player.token, state)).status).toBe(200);
    return player;
  };
  return { store, call, add };
}

describe('independent v0.10 backend review', () => {
  it('freezes defender gear at preview and attacker gear at resolution, including four duplicate accessory definitions', async () => {
    const s = setup();
    const attacker = await s.add('attacker'), defender = await s.add('defender', snapshot('defender', combat('w-hammer-epic-4')));
    const preview = await s.call('POST', '/v1/pvp/match', attacker.token, { opponentId: defender.playerId, mode: EQUIPMENT_PROTOCOL });
    expect(preview.status).toBe(200); const match = preview.body as MatchResponse;
    const originalDefender = structuredClone(match.opponent.combat);
    const attackAtResolution = combat('w-gun-epic-4');
    expect((await s.call('PUT', '/v1/snapshot', defender.token, snapshot('defender', combat(null), 1))).status).toBe(200);
    expect((await s.call('PUT', '/v1/snapshot', attacker.token, snapshot('attacker', attackAtResolution, 1))).status).toBe(200);
    const response = await s.call('POST', '/v1/pvp', attacker.token, { matchId: match.matchId, party: [], mode: EQUIPMENT_PROTOCOL });
    expect(response.status).toBe(200); const result = response.body as PvpResponse;
    expect(isPvpResponse(result)).toBe(true);
    expect(result.ownCombat).toEqual(attackAtResolution); expect(result.opponent.combat).toEqual(originalDefender);
    expect(result.ownFighters).toHaveLength(1); expect(result.opponentFighters).toHaveLength(1);
    expect(result.blows.length).toBeGreaterThan(0);
    expect(result.blows.every(b => b.actorId === '@hero' && b.actorKind === 'hero' && b.targetId === '@hero' && b.targetKind === 'hero')).toBe(true);
    const defense = (await s.store.getById(defender.playerId))!.goldAccount!.events[0]!.presentation;
    expect(isPvpPresentation(defense)).toBe(true);
    expect(defense.ownCombat).toEqual(originalDefender); expect(defense.replay.opponentCombat).toEqual(attackAtResolution);
    expect(defense.replay.ownFighters).toEqual(result.opponentFighters);
    expect(defense.replay.blows).toEqual(result.blows.map(b => ({ ...b, side: b.side === 'A' ? 'D' : 'A' })));
    const before = await s.store.getById(attacker.playerId);
    const retry = await s.call('POST', '/v1/pvp', attacker.token, { matchId: match.matchId, party: [], mode: EQUIPMENT_PROTOCOL });
    expect(retry).toEqual(response); expect(await s.store.getById(attacker.playerId)).toEqual(before);
    const a = (await s.store.getById(attacker.playerId))!.goldAccount!, d = (await s.store.getById(defender.playerId))!.goldAccount!;
    expect(BigInt(a.balance) + BigInt(d.balance)).toBe(2n * 900719925474099312345678901234n);
    expect(BigInt(a.net) + BigInt(d.net)).toBe(0n);
    expect(typeof a.balance).toBe('string'); expect(typeof result.gold!.delta).toBe('string');
  });

  it('rejects stale decimal-wallet CAS without replacing equipment or balances', async () => {
    const s = setup(), player = await s.add('wallet');
    const before = structuredClone(await s.store.getById(player.playerId));
    const altered = snapshot('wallet', combat('w-staff-epic-4'));
    altered.gold!.coins = '1';
    expect((await s.call('PUT', '/v1/snapshot', player.token, altered)).status).toBe(409);
    expect(await s.store.getById(player.playerId)).toEqual(before);
  });

  it('validates level, equipment kind, compatibility and unique owned IDs at upload', () => {
    expect(parseSnapshot(snapshot('legal'))).not.toBeNull();
    const cases = [snapshot('low'), snapshot('duplicate'), snapshot('five'), snapshot('wrongkind'), snapshot('job')];
    cases[0]!.combat!.level = 1; cases[0]!.level = 1;
    cases[1]!.combat!.loadout.accessories[1]!.id = 'e2';
    cases[2]!.combat!.loadout.accessories.push(item(6, 'a-ring-critical-common-1'));
    cases[3]!.combat!.loadout.weapon = item(1, 'a-ring-critical-common-1');
    cases[4]!.combat!.hero = { formId: 'h03', buffPercent: 10 }; cases[4]!.hero = cases[4]!.combat!.hero;
    for (const value of cases) expect(parseSnapshot(value), value.name).toBeNull();
    const unsafe = { ...currentGold(null, 0), balance: Number.MAX_SAFE_INTEGER + 1 };
    expect(() => currentGold(unsafe, 0)).toThrow('Invalid persisted gold');
  });

  it('matches another upgraded player when a nearer legacy player cannot enter the new protocol', async () => {
    const s = setup();
    const player = await s.add('modern', snapshot('modern', combat(), 0, 100));
    await s.add('legacy', { name: 'legacy', bestIndex: 101, rebirths: 0, companions: [], party: [] });
    const eligible = await s.add('eligible', snapshot('eligible', combat(), 0, 103));
    const result = await s.call('POST', '/v1/pvp/match', player.token, { mode: EQUIPMENT_PROTOCOL });
    expect(result.status).toBe(200);
    expect((result.body as MatchResponse).opponent.playerId).toBe(eligible.playerId);
  });

  it('rejects malformed critical flags in a new battle response before journaling', async () => {
    const s = setup(), player = await s.add('critical');
    const preview = (await s.call('POST', '/v1/pvp/match', player.token, { mode: EQUIPMENT_PROTOCOL })).body as MatchResponse;
    const response = (await s.call('POST', '/v1/pvp', player.token, { mode: EQUIPMENT_PROTOCOL, matchId: preview.matchId, party: [] })).body as PvpResponse;
    expect(isPvpResponse(response)).toBe(true);
    const malformed = structuredClone(response);
    Object.assign(malformed.blows[0]!, { crit: 'not-a-boolean' });
    expect(isPvpResponse(malformed)).toBe(false);
  });
});
