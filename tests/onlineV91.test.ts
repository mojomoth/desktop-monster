import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, matches } from '../src/server/app.js';
import { MemoryStore } from '../src/server/store.js';
import { createEngine, parseSave } from '../src/core/index.js';
import { createNetClient, createNetSession } from '../src/main/net.js';
import { ProgressCoordinator } from '../src/main/coordinator.js';
import { writeSaveFile } from '../src/main/persistence.js';
import type { PvpPresentation, RegisterResponse } from '../src/shared/api.js';

const dirs: string[] = [];
beforeEach(() => matches.clear());
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

async function setup() {
  const store = new MemoryStore(); let serial = 0, now = 1_000_000;
  const deps = { store, now: () => now, randomUUID: () => `p-${++serial}`,
    randomBytesHex: (n: number) => (++serial).toString(16).padStart(n * 2, '0'), randomSeed: () => 7 };
  let server = createApp(deps);
  let lostPath: string | null = null;
  let rejectedPath: string | null = null;
  let alterEvents: ((value: unknown) => unknown) | null = null;
  let hold: { path: string; entered: () => void; gate: Promise<void> } | null = null;
  const requests: { path: string; method: string; status: number }[] = [];
  const client = createNetClient({ baseUrl: 'https://fixture.invalid', fetchFn: async (input, init = {}) => {
    const url = new URL(String(input)); const path = url.pathname;
    if (rejectedPath === path) throw Error('injected unavailable endpoint');
    const result = await server.handle({ method: init.method ?? 'GET', path, query: Object.fromEntries(url.searchParams),
      auth: new Headers(init.headers).get('authorization')?.replace('Bearer ', '') ?? null,
      body: init.body ? JSON.parse(String(init.body)) as unknown : null, ip: 'fixture' });
    requests.push({ path, method: init.method ?? 'GET', status: result.status });
    if (lostPath === path && result.status === 200) { lostPath = null; throw Error('lost after commit'); }
    if (hold?.path === path) { const held = hold; hold = null; held.entered(); await held.gate; }
    return new Response(JSON.stringify(path === '/v1/pvp/events' && alterEvents ? alterEvents(result.body) : result.body), { status: result.status });
  } });
  async function player(name: string, strong: boolean) {
    const joined = await client.register(name); if (!joined.ok) throw Error('join failed');
    const identity: RegisterResponse = joined.value;
    const dir = mkdtempSync(join(tmpdir(), 'desmon-gold-test-')); dirs.push(dir);
    let live = createEngine(parseSave({ version: 4, coins: '1000', level: 20, monsterIndex: 20, nextCompanionId: 2,
      companions: [{ id: 'c1', speciesId: strong ? 'dragon' : 'slime', bossIndex: strong ? 87 : 7, level: strong ? 100 : 1, stars: 0 }] }));
    writeSaveFile(dir, live.toSave());
    writeFileSync(join(dir, 'identity.json'), JSON.stringify({ name, ...identity, notifiedTheftIds: [] }));
    const presentations: PvpPresentation[] = [];
    let captures = 0;
    const start = () => {
      const session = createNetSession({ client, userDataDir: dir, online: true, randomUUID: () => 'unused', managed: true });
      const coordinator = new ProgressCoordinator({ directory: dir, initial: live.toSave(), session, now: () => now,
        capture: async () => { captures++; return live.toSave(); }, status: () => {}, release: state => {
          if (state.replace) live = createEngine(state.save); else for (const action of state.actions) live.apply(action);
          presentations.push(...state.replays ?? []);
        } });
      return coordinator;
    };
    let coordinator = start();
    expect((await coordinator.opponents()).ok).toBe(true);
    return { ...identity, dir, presentations, get captures() { return captures; }, get coordinator() { return coordinator; }, save: () => live.toSave(),
      spendAll: () => { live = createEngine({ ...live.toSave(), coins: '0' }); },
      restart: () => { live = createEngine(parseSave(JSON.parse(readFileSync(join(dir, 'save.json'), 'utf8')))); coordinator = start(); },
      finish: () => { for (const p of coordinator.pendingReplays()) expect(coordinator.completeReplay(p.battleId)).toBe(true); } };
  }
  const attacker = await player('Attacker', true), defender = await player('Defender', false);
  return { store, client, attacker, defender, requests, player, advance: (ms = 60000) => { now += ms; },
    drop: (path: string) => { lostPath = path; }, block: (path: string | null) => { rejectedPath = path; },
    alterEvents: (fn: ((value: unknown) => unknown) | null) => { alterEvents = fn; },
    holdNext: (path: string) => {
      let entered!: () => void, release!: () => void;
      const ready = new Promise<void>(resolve => { entered = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      hold = { path, entered, gate }; return { ready, release };
    },
    restartServer: () => { matches.clear(); server = createApp(deps); } };
}

describe('v0.9.1 durable wallet and defense coordination', () => {
  it('settles both wallets once, persists viewer-normalized defense replay before ACK, and resumes after completion', async () => {
    const s = await setup(); const before = s.defender.save();
    const result = await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    expect(result).toMatchObject({ ok: true, value: { win: true, stolen: null, lost: null, gold: { delta: '50' } } });
    expect(s.attacker.save().coins).toBe('1050');
    expect(s.attacker.coordinator.replaying).toBe(true);
    expect((await s.attacker.coordinator.resetOrRestore()).ok).toBe(false);
    expect(await s.defender.coordinator.pollIncoming()).toEqual({ ok: true, value: null });
    expect(s.defender.save()).toMatchObject({ coins: '950', monsterIndex: before.monsterIndex, monsterHp: before.monsterHp,
      companions: before.companions, pvpGoldNet: '-50', pvpGoldDebt: '0' });
    const [replay] = s.defender.coordinator.pendingReplays();
    expect(replay).toMatchObject({ role: 'defense', won: false, goldDelta: '-50', ownParty: before.companions,
      replay: { opponentName: 'Attacker' } });
    if (!result.ok || !replay) throw Error('missing replay');
    expect(replay.replay.blows).toEqual(result.value.blows.map(blow => ({ ...blow, side: blow.side === 'A' ? 'D' : 'A' })));
    expect([...s.requests].reverse().find(r => r.path === '/v1/pvp/events/ack')?.status).toBe(200);
    expect((await s.client.events!(s.defender.token, 0))).toMatchObject({ ok: true, value: { events: [] } });
    s.defender.restart();
    expect(s.defender.coordinator.pendingReplays()).toEqual([replay]);
    expect(s.defender.save().coins).toBe('950');
    expect(s.defender.coordinator.completeReplay('wrong-id')).toBe(true);
    expect(s.defender.coordinator.pendingReplays()).toHaveLength(1);
    s.defender.finish(); s.defender.restart();
    expect(s.defender.coordinator.pendingReplays()).toEqual([]);
    expect(s.defender.save().coins).toBe('950');
  });

  it('recovers a lost committed attack response across both restarts without another transfer or upload', async () => {
    const s = await setup(); s.drop('/v1/pvp');
    expect(await s.attacker.coordinator.battleOpponent(s.defender.playerId)).toMatchObject({ ok: false, error: 'network' });
    expect(s.attacker.save().coins).toBe('1000');
    expect(s.attacker.coordinator.pending).toBe(true);
    s.restartServer(); s.attacker.restart(); const from = s.requests.length;
    expect((await s.attacker.coordinator.battleOpponent(s.defender.playerId)).ok).toBe(true);
    expect(s.attacker.save().coins).toBe('1050');
    expect(s.requests.slice(from).map(r => r.path)).toEqual(['/v1/pvp', '/v1/me']);
    expect((await s.store.getById(s.attacker.playerId))?.wins).toBe(1);
    expect(s.attacker.coordinator.pendingReplays()).toHaveLength(1);
  });

  it('retains unacknowledged defense on disk, then retries ACK without replaying or settling it twice', async () => {
    const s = await setup(); await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    s.block('/v1/pvp/events/ack');
    expect((await s.defender.coordinator.pollIncoming()).ok).toBe(true);
    const id = s.defender.coordinator.pendingReplays()[0]!.battleId;
    s.defender.restart(); expect(s.defender.save().coins).toBe('950');
    expect(s.defender.coordinator.pendingReplays()[0]?.battleId).toBe(id);
    s.defender.finish(); s.block(null);
    expect((await s.defender.coordinator.pollIncoming()).ok).toBe(true);
    expect(s.defender.coordinator.pendingReplays()).toHaveLength(0);
    expect(s.defender.save().coins).toBe('950');
    expect((await s.client.events!(s.defender.token, 0))).toMatchObject({ ok: true, value: { events: [] } });
  });

  it('automatically recovers a lost attack after restart without pausing hunting while the retry is offline', async () => {
    const s = await setup(); s.drop('/v1/pvp');
    await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    s.attacker.restart(); s.restartServer();
    const captures = s.attacker.captures;
    s.block('/v1/pvp');
    expect(await s.attacker.coordinator.pollIncoming()).toMatchObject({ ok: false, error: 'network' });
    expect(s.attacker.captures).toBe(captures);
    expect(s.attacker.coordinator.pending).toBe(true);
    s.block(null); const from = s.requests.length;
    expect(await s.attacker.coordinator.pollIncoming()).toEqual({ ok: true, value: null });
    expect(s.requests.slice(from).map(r => r.path)).toEqual(['/v1/pvp', '/v1/me']);
    expect(s.attacker.save().coins).toBe('1050');
    expect(s.attacker.coordinator.pending).toBe(false);
    expect(s.attacker.coordinator.pendingReplays()).toHaveLength(1);
    s.attacker.finish(); s.advance();
    await s.defender.coordinator.battleOpponent(s.attacker.playerId);
    expect(await s.attacker.coordinator.pollIncoming()).toEqual({ ok: true, value: null });
    expect(s.attacker.coordinator.pendingReplays()[0]?.role).toBe('defense');
    expect(s.attacker.save().coins).toBe('1050'); // same pair is protected for one hour
  });

  it.each(['first-gap', 'middle-gap', 'duplicate-id'] as const)('rejects %s before ACK or changing gold, cursor or operation journal', async kind => {
    const s = await setup(); await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    const before = readFileSync(join(s.defender.dir, 'recovery.json'), 'utf8');
    s.alterEvents(value => {
      const inbox = value as { events: { seq: number; presentation: PvpPresentation }[]; latestSeq: number };
      const event = inbox.events[0]!;
      if (kind === 'first-gap') return { events: [{ ...event, seq: 2 }], latestSeq: 2 };
      return { events: [event, { ...event, seq: kind === 'middle-gap' ? 3 : 2,
        presentation: { ...event.presentation, battleId: kind === 'middle-gap' ? 'different-D' : event.presentation.battleId } }], latestSeq: 3 };
    });
    const from = s.requests.length;
    expect((await s.defender.coordinator.pollIncoming()).ok).toBe(false);
    expect(s.requests.slice(from).map(r => r.path)).toEqual(['/v1/pvp/events']);
    expect(readFileSync(join(s.defender.dir, 'recovery.json'), 'utf8')).toBe(before);
    expect(s.defender.save().coins).toBe('1000');
    expect(s.defender.coordinator.recovery.unfinished).toBe(false);
    expect(s.defender.coordinator.pendingReplays()).toHaveLength(0);
    s.alterEvents(null);
    expect((await s.defender.coordinator.pollIncoming()).ok).toBe(true);
    expect(s.defender.save().coins).toBe('950');
  });

  it('discards a delayed receipt after manual recovery and a newer battle without regressing wallet, queue or official counters', async () => {
    const s = await setup(); s.drop('/v1/pvp');
    await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    const held = s.holdNext('/v1/pvp');
    const poll = s.attacker.coordinator.pollIncoming(); await held.ready;
    expect((await s.attacker.coordinator.battleOpponent(s.defender.playerId)).ok).toBe(true);
    s.attacker.finish(); s.advance();
    expect((await s.attacker.coordinator.battleOpponent(s.defender.playerId)).ok).toBe(true);
    s.attacker.finish();
    const before = s.attacker.save();
    expect(before.progress?.pvpWins).toBe(2);
    held.release();
    expect(await poll).toMatchObject({ ok: false, error: 'busy' });
    expect(s.attacker.save()).toEqual(before);
    expect(s.attacker.coordinator.pending).toBe(false);
    expect(s.attacker.coordinator.pendingReplays()).toHaveLength(0);
    expect(JSON.parse(readFileSync(join(s.attacker.dir, 'identity.json'), 'utf8'))).toMatchObject({ pvpHistory: { wins: 2, losses: 0 } });
  });

  it('keeps offline spent raid money as debt through reset and adjusts repeated older checkpoint restores', async () => {
    const s = await setup();
    const point = s.defender.coordinator.recovery.backup(s.defender.save(), 'restore');
    await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    s.defender.spendAll(); await s.defender.coordinator.pollIncoming(); s.defender.finish();
    expect(s.defender.save()).toMatchObject({ coins: '0', pvpGoldDebt: '50', pvpGoldNet: '-50' });
    expect(await s.defender.coordinator.resetOrRestore()).toEqual({ ok: true });
    expect(s.defender.save()).toMatchObject({ coins: '0', pvpGoldDebt: '50', pvpGoldNet: '-50' });
    for (let i = 0; i < 2; i++) {
      expect(await s.defender.coordinator.resetOrRestore(point.id)).toEqual({ ok: true });
      expect(s.defender.save()).toMatchObject({ coins: '950', pvpGoldDebt: '0', pvpGoldNet: '-50' });
    }
  });

  it('clears a definitively refused defense-cooldown match so another opponent and reset remain usable', async () => {
    const s = await setup(); const other = await s.player('Other', true);
    await s.attacker.coordinator.battleOpponent(s.defender.playerId);
    expect(await other.coordinator.battleOpponent(s.defender.playerId)).toMatchObject({ ok: false, error: 'opponent-busy' });
    expect(other.coordinator.pending).toBe(false);
    expect(await other.coordinator.resetOrRestore()).toEqual({ ok: true });
    expect((await other.coordinator.pollIncoming()).ok).toBe(true);
  });
});
