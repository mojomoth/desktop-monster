import { modernSnapshot } from './server/v10-fixture.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, matches } from '../src/server/app.js';
import type { ApiRequest } from '../src/server/http.js';
import { MemoryStore } from '../src/server/store.js';
import type {
  Companion, DefenseEventsResponse, MatchResponse, MeResponse, PvpResponse,
  RegisterResponse, Snapshot,
} from '../src/shared/api.js';

// Real HTTP handlers and transactions, with no sockets, wall clock or global RNG.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const strong = (id = 'c1'): Companion => ({ id, speciesId: 'slime', bossIndex: 400, level: 100, stars: 20 });
const weak = (id = 'c1'): Companion => ({ id, speciesId: 'slime', bossIndex: 8, level: 1, stars: 0 });
type Player = RegisterResponse & { snapshot: Snapshot };

beforeEach(() => matches.clear());

function setup() {
  matches.clear();
  const store = new MemoryStore();
  let serial = 0;
  let clock = Date.UTC(2026, 8, 16);
  const deps = {
    store, now: () => clock, randomUUID: () => `player-${++serial}`,
    randomBytesHex: (bytes: number) => (++serial).toString(16).padStart(bytes * 2, '0'),
    randomSeed: () => 7,
  };
  let app = createApp(deps);
  const call = (method: string, path: string, auth: string | null = null, body: unknown = null,
    query: Record<string, string> = {}) =>
    app.handle({ method, path, auth, body, query, ip: 'gold-abuse-fixture' } satisfies ApiRequest);
  const join = async (name: string, coins: number, companion = weak()): Promise<Player> => {
    const registered = await call('POST', '/v1/players', null, { nickname: name });
    expect(registered.status).toBe(201);
    const player = registered.body as RegisterResponse;
    const snapshot: Snapshot = modernSnapshot({ name, bestIndex: 8, rebirths: 0, companions: [companion],
      party: [companion.id], gold: { revision: 0, coins: String(coins) } });
    expect((await call('PUT', '/v1/snapshot', player.token, snapshot)).status).toBe(200);
    return { ...player, snapshot };
  };
  const profile = async (player: Player): Promise<MeResponse> => {
    const result = await call('GET', '/v1/me', player.token);
    expect(result.status).toBe(200);
    const me = result.body as MeResponse;
    expect(me.pvpMode).toBe('equipment-gold-v2');
    expect(me.gold).toBeDefined();
    return me;
  };
  const preview = async (player: Player, opponent?: Player): Promise<MatchResponse> => {
    const response = await call('POST', '/v1/pvp/match', player.token,
      { mode: 'equipment-gold-v2', ...(opponent ? { opponentId: opponent.playerId } : {}) });
    expect(response.status).toBe(200);
    return response.body as MatchResponse;
  };
  const play = (player: Player, match: MatchResponse) => call('POST', '/v1/pvp', player.token,
    { mode: 'equipment-gold-v2', matchId: match.matchId, party: player.snapshot.party });
  const fight = async (player: Player, opponent?: Player): Promise<PvpResponse> => {
    const response = await play(player, await preview(player, opponent));
    expect(response.status).toBe(200);
    const result = response.body as PvpResponse;
    expect(result.stolen).toBeNull();
    expect(result.lost).toBeNull();
    return result;
  };
  const events = async (player: Player, after = 0): Promise<DefenseEventsResponse> => {
    const response = await call('GET', '/v1/pvp/events', player.token, null, { after: String(after) });
    expect(response.status).toBe(200);
    return response.body as DefenseEventsResponse;
  };
  const ack = (player: Player, through: unknown) =>
    call('POST', '/v1/pvp/events/ack', player.token, { through });
  return { store, call, join, profile, preview, play, fight, events, ack,
    advance: (ms = MINUTE) => { clock += ms; },
    restart: () => { matches.clear(); app = createApp(deps); } };
}

describe('v0.9.1 gold PvP abuse boundaries', () => {
  it('rejects malformed money and atomically consumes one CAS revision under concurrent uploads', async () => {
    const s = setup(), owner = await s.join('owner', 1000);
    const initial = (await s.profile(owner)).gold!;
    expect(initial).toEqual({ revision: 1, balance: '1000', net: '0' });
    for (const field of ['coins', 'revision'] as const) {
      for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '01', null, NaN, Infinity]) {
        const gold = { revision: initial.revision, coins: '1000', [field]: invalid };
        expect((await s.call('PUT', '/v1/snapshot', owner.token, { ...owner.snapshot, gold })).status).toBe(400);
      }
    }
    expect((await s.profile(owner)).gold).toEqual(initial);
    const responses = await Promise.all([800, 900].map(coins => s.call('PUT', '/v1/snapshot', owner.token,
      { ...owner.snapshot, bestIndex: coins, wins: 999, losses: 999,
        gold: { revision: initial.revision, coins: String(coins), balance: '999999', net: '999999' } })));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(responses.find(r => r.status === 409)?.body).toEqual({ error: 'gold_conflict' });
    const current = await s.profile(owner);
    expect(current).toMatchObject({ wins: 0, losses: 0, gold: { revision: 2, net: '0' } });
    expect(['800', '900']).toContain(current.gold!.balance);
    expect((await s.store.getById(owner.playerId))?.snapshot?.bestIndex).toBe(Number(current.gold!.balance));
  });

  it('cannot overwrite a committed raid with stale or legacy snapshot uploads or legacy battle requests', async () => {
    const s = setup(), attacker = await s.join('attacker', 1000, strong()), victim = await s.join('victim', 1000);
    const oldRevision = (await s.profile(victim)).gold!.revision;
    expect((await s.fight(attacker, victim)).gold).toEqual({ amount: '50', delta: '50', reason: 'transfer' });
    const committed = structuredClone(await s.store.getById(victim.playerId));
    expect(await s.call('PUT', '/v1/snapshot', victim.token,
      { ...victim.snapshot, bestIndex: 999, gold: { revision: oldRevision, coins: '1000' } }))
      .toMatchObject({ status: 409, body: { error: 'gold_conflict' } });
    expect(await s.store.getById(victim.playerId)).toEqual(committed);
    const legacy = { ...victim.snapshot };
    delete legacy.gold;
    expect((await s.call('PUT', '/v1/snapshot', victim.token, legacy)).status).toBe(200);
    expect((await s.profile(victim)).gold).toEqual({ revision: 2, net: '-50', balance: '950' });
    expect(await s.call('POST', '/v1/pvp/match', attacker.token, { opponentId: victim.playerId }))
      .toMatchObject({ status: 426, body: { error: 'upgrade_required' } });
    const pending = await s.preview(attacker, victim);
    expect(await s.call('POST', '/v1/pvp', attacker.token, { matchId: pending.matchId, party: ['c1'] }))
      .toMatchObject({ status: 426, body: { error: 'upgrade_required' } });
    for (const player of [attacker, victim]) {
      const row = await s.store.getById(player.playerId);
      expect(row?.snapshot?.companions).toEqual(player.snapshot.companions);
      expect(row?.revokedIds).toEqual([]);
      expect(row?.thefts).toEqual([]);
    }
  });

  it('deduplicates simultaneous requests and post-restart receipts before cooldown, without duplicate defense events', async () => {
    const s = setup(), a = await s.join('attacker', 1000, strong()), d = await s.join('defender', 1000);
    const match = await s.preview(a, d);
    const [first, duplicate] = await Promise.all([s.play(a, match), s.play(a, match)]);
    expect(first.status).toBe(200);
    expect(duplicate).toEqual(first);
    const rows = await Promise.all([a, d].map(p => s.store.getById(p.playerId).then(row => structuredClone(row))));
    const inbox = await s.events(d);
    expect(inbox).toMatchObject({ latestSeq: 1, events: [{ seq: 1, presentation: {
      battleId: match.matchId + '-D', role: 'defense', won: false, goldDelta: '-50',
      ownParty: d.snapshot.companions, replay: { opponentName: 'attacker', opponentParty: a.snapshot.companions },
    } }] });
    expect(inbox.events).toHaveLength(1);
    s.restart();
    expect(await s.play(a, match)).toEqual(first);
    // An old client may read its already committed receipt; it may not create a new old-mode battle.
    expect(await s.call('POST', '/v1/pvp', a.token, { matchId: match.matchId, party: [] })).toEqual(first);
    expect(await s.events(d)).toEqual(inbox);
    expect(await Promise.all([a, d].map(p => s.store.getById(p.playerId)))).toEqual(rows);
    expect((await s.profile(a)).gold).toEqual({ revision: 2, net: '50', balance: '1050' });
    expect((await s.profile(d)).gold).toEqual({ revision: 2, net: '-50', balance: '950' });
  });

  it('serializes attackers against one victim and does not consume a denied match or attacker cooldown', async () => {
    const s = setup(), a = await s.join('a', 1000, strong()), b = await s.join('b', 1000, strong());
    const d = await s.join('defender', 1000);
    const players = [a, b];
    const previews = await Promise.all(players.map(p => s.preview(p, d)));
    const results = await Promise.all(players.map((p, i) => s.play(p, previews[i]!)));
    expect(results.map(r => r.status).sort()).toEqual([200, 429]);
    const rejected = results.findIndex(r => r.status === 429);
    const retryPlayer = players[rejected]!, retryMatch = previews[rejected]!;
    expect(results[rejected]?.body).toEqual({ error: 'defense_cooldown', retryAfterSec: 60 });
    expect(await s.store.getById(retryPlayer.playerId)).toMatchObject({ lastPvpAt: null, wins: 0, losses: 0 });
    expect((await s.events(d)).events).toHaveLength(1);
    s.advance(MINUTE - 1);
    expect(await s.play(retryPlayer, retryMatch)).toMatchObject({ status: 429, body: { error: 'defense_cooldown', retryAfterSec: 1 } });
    s.advance(1);
    expect((await s.play(retryPlayer, retryMatch)).status).toBe(200);
    const profiles = await Promise.all([...players, d].map(p => s.profile(p)));
    expect(profiles.map(p => BigInt(p.gold!.balance)).reduce((sum, balance) => sum + balance, 0n)).toBe(3000n);
    expect(profiles.map(p => BigInt(p.gold!.net)).reduce((sum, net) => sum + net, 0n)).toBe(0n);
    expect(profiles[2]).toMatchObject({ losses: 2, gold: { balance: '903', net: '-97' } });
    expect((await s.events(d)).events.map(e => e.seq)).toEqual([1, 2]);
  });

  it('charges losing attackers and protects the same pair in either direction for exactly one hour', async () => {
    const s = setup(), a = await s.join('weak', 1000), d = await s.join('strong', 10000, strong());
    const lost = await s.fight(a, d);
    expect(lost).toMatchObject({ win: false, gold: { amount: '50', delta: '-50', reason: 'transfer' } });
    expect((await s.events(d)).events[0]?.presentation).toMatchObject({ won: true, goldDelta: '50' });
    s.advance();
    const samePair = (await s.fight(a, d)).gold!;
    expect(samePair).toMatchObject({ amount: '0', reason: 'pair-protection' });
    expect(samePair.delta === '0').toBe(true);
    s.advance();
    expect((await s.fight(d, a)).gold).toEqual({ amount: '0', delta: '0', reason: 'pair-protection' });
    s.advance(HOUR - 2 * MINUTE - 1);
    const justBefore = (await s.fight(a, d)).gold!;
    expect(justBefore).toMatchObject({ amount: '0', reason: 'pair-protection' });
    expect(justBefore.delta === '0').toBe(true);
    s.advance(1);
    // Reverse direction has its own attacker cooldown, while the shared pair timer expires now.
    expect((await s.fight(d, a)).gold).toEqual({ amount: '47', delta: '47', reason: 'transfer' });
    expect((await s.profile(a)).gold).toMatchObject({ net: '-97', balance: '903' });
    expect((await s.profile(d)).gold).toMatchObject({ net: '97', balance: '10097' });
    expect((await s.profile(a))).toMatchObject({ wins: 0, losses: 5 });
  });

  it('caps unacknowledged defense events at five and authenticates monotonic ACKs without losing later events', async () => {
    const s = setup(), a = await s.join('attacker', 1000, strong()), d = await s.join('defender', 1000);
    let last: MatchResponse | undefined;
    for (let i = 0; i < 5; i++) {
      last = await s.preview(a, d);
      expect((await s.play(a, last)).status).toBe(200);
      s.advance();
    }
    expect((await s.events(d)).events.map(e => e.seq)).toEqual([1, 2, 3, 4, 5]);
    expect((await s.events(d, 3)).events.map(e => e.seq)).toEqual([4, 5]);
    const retry = await s.preview(a, d), before = structuredClone(await s.store.getById(a.playerId));
    expect(await s.play(a, retry)).toMatchObject({ status: 409, body: { error: 'inbox_full' } });
    expect(await s.store.getById(a.playerId)).toEqual(before);
    expect((await s.play(a, last!)).status).toBe(200); // receipt lookup precedes the full-inbox guard
    expect((await s.call('POST', '/v1/pvp/events/ack', null, { through: 5 })).status).toBe(401);
    expect((await s.ack(a, 1)).status).toBe(400); // caller cannot ACK another player's sequence
    for (const through of [-1, 1.5, '5', 6, Number.MAX_SAFE_INTEGER + 1]) expect((await s.ack(d, through)).status).toBe(400);
    expect((await s.events(d)).events).toHaveLength(5);
    expect((await s.ack(d, 2)).status).toBe(200);
    expect((await s.play(a, retry)).status).toBe(200);
    expect((await s.events(d)).events.map(e => e.seq)).toEqual([3, 4, 5, 6]);
    expect((await s.ack(d, 2)).status).toBe(200);
    s.restart();
    expect((await s.events(d)).events.map(e => e.seq)).toEqual([3, 4, 5, 6]);
    expect((await s.ack(d, 6)).status).toBe(200);
    expect(await s.events(d)).toEqual({ events: [], latestSeq: 6 });
    s.advance();
    await s.fight(a, d);
    expect((await s.events(d)).events.map(e => e.seq)).toEqual([7]);
  });

  it('never mints gold from protected balances, zero-stake attackers, bots, including wallets above the old integer limit', async () => {
    for (const [mine, theirs, amount] of [
      [0, 1000, 0], [75, 1000, 0], [1000, 0, 0], [1000, 75, 0],
      [76, 1000, 1], [1000, 76, 1], [100, 10000, 5],
      [Number.MAX_SAFE_INTEGER, 10000, 75], [Number.MAX_SAFE_INTEGER - 1, 10000, 75],
    ] as const) {
      const s = setup(), a = await s.join('a', mine, strong()), d = await s.join('d', theirs);
      const battle = await s.fight(a, d);
      expect(battle.win).toBe(true);
      expect(battle.gold?.amount).toBe(String(amount));
      expect(battle.gold?.delta).toBe(String(amount));
      const [attacker, defender] = await Promise.all([s.profile(a), s.profile(d)]);
      expect(attacker.gold!.balance).toBe(String(BigInt(mine) + BigInt(amount)));
      expect(defender.gold!.balance).toBe(String(BigInt(theirs) - BigInt(amount)));
      expect(BigInt(attacker.gold!.balance) + BigInt(defender.gold!.balance)).toBe(BigInt(mine) + BigInt(theirs));
      expect(BigInt(attacker.gold!.net) + BigInt(defender.gold!.net)).toBe(0n);
    }
    const s = setup(), lonely = await s.join('alone', 1000, strong());
    expect(await s.fight(lonely)).toMatchObject({ bot: true, gold: { amount: '0', delta: '0', reason: 'bot' } });
    expect((await s.profile(lonely))).toMatchObject({ wins: 0, losses: 0, gold: { balance: '1000', net: '0' } });
    expect(await s.events(lonely)).toEqual({ events: [], latestSeq: 0 });
  });

  it('enforces daily caps across different farming accounts and reopens only the new UTC day budget', async () => {
    const s = setup(), winner = await s.join('winner', 10000, strong());
    const victims = await Promise.all(Array.from({ length: 5 }, (_, i) => s.join(`victim${i}`, 10000)));
    const gains: (string | number)[] = [];
    for (const victim of victims) { gains.push((await s.fight(winner, victim)).gold!.amount); s.advance(); }
    expect(gains).toEqual(['75', '75', '75', '25', '0']);
    expect((await s.profile(winner)).gold).toMatchObject({ balance: '10250', net: '250' });
    const balances = await Promise.all([winner, ...victims].map(p => s.profile(p)));
    expect(balances.reduce((sum, p) => sum + BigInt(p.gold!.balance), 0n)).toBe(60000n);

    const t = setup(), victim = await t.join('victim', 1000);
    const attackers = await Promise.all(Array.from({ length: 4 }, (_, i) => t.join(`attacker${i}`, 10000, strong())));
    const losses: (string | number)[] = [];
    for (const attacker of attackers) { losses.push((await t.fight(attacker, victim)).gold!.amount); t.advance(); }
    expect(losses).toEqual(['50', '47', '3', '0']);
    expect((await t.profile(victim)).gold).toMatchObject({ balance: '900', net: '-100' });
    t.advance(DAY - 4 * MINUTE);
    t.restart();
    expect((await t.fight(attackers[0]!, victim)).gold).toEqual({ amount: '45', delta: '45', reason: 'transfer' });
    expect((await t.profile(victim)).gold).toMatchObject({ balance: '855', net: '-145' });
  });
});
