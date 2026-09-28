import { describe, expect, it } from 'vitest';
import { createEngine, DEFAULT_SAVE, mulberry32 } from '../src/core/index.js';
import { createGame } from '../src/renderer/game.js';
import type { GameOptions } from '../src/renderer/game.js';
import type { RaidStateView } from '../src/renderer/raidScene.js';

const raidView = (): RaidStateView => ({ raidId: 'r7', bossId: 'raid-dark', phase: 'battle', bossHpRatio: .62,
  remainingMs: 55_000, timeoutMs: 120_000, me: 'me',
  participants: [{ playerId: 'me', name: 'me', formId: 'h11', level: 33, damageDelta: '0' }] });
const field = (game: ReturnType<typeof createGame>) => {
  const s = game.getState();
  return structuredClone({ monster: s.monster, hp: s.monsterHp, xp: s.xp, level: s.level,
    coins: s.coins, kills: s.killCount, companions: s.companions });
};

describe('raid wired into the actual game', () => {
  it('routes real input to raid damage and freezes monster, XP, companions and field animation until exit', () => {
    const hits: Parameters<NonNullable<GameOptions['onRaidDamage']>>[0][] = [];
    const engine = createEngine({ ...DEFAULT_SAVE, companions: [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: 10, stars: 0 }] }, mulberry32(7));
    const game = createGame(engine, undefined, { onRaidDamage: hit => hits.push(hit) });
    const before = field(game);
    const monsterAnim = game.getMonsterAnim();
    game.raidState(raidView());
    for (let i = 0; i < 30; i++) { game.attack('mouse'); game.update(50); }
    expect(hits).toHaveLength(30);
    expect(hits.every(hit => hit.raidId === 'r7' && BigInt(hit.damage) > 0n)).toBe(true);
    expect(hits.some(hit => hit.fever)).toBe(true);
    expect(field(game)).toEqual(before);
    expect(game.getMonsterAnim()).toEqual(monsterAnim);
    game.raidState(null);
    expect(game.isRaiding()).toBe(false);
    game.attack('keyboard');
    expect(field(game)).not.toEqual(before);
  });
  it('keeps attacks in the raid even when a menu rebirth replaces the underlying field', () => {
    const hits: unknown[] = [];
    const game = createGame(createEngine({ ...DEFAULT_SAVE, monsterIndex: 40, bestIndex: 40 }), undefined, { onRaidDamage: hit => hits.push(hit) });
    game.raidState(raidView());
    expect(game.apply({ type: 'rebirth' }).some(event => event.type === 'rebirth')).toBe(true);
    expect(game.isRaiding()).toBe(true);
    const before = field(game);
    game.attack('mouse');
    expect(hits).toHaveLength(1);
    expect(field(game)).toEqual(before);
  });
  it('does not submit attacks while disconnected or after the authoritative battle deadline', () => {
    const hits: unknown[] = [];
    const options: GameOptions = { raidConnected: false, onRaidDamage: hit => hits.push(hit) };
    const game = createGame(createEngine(), undefined, options);
    game.raidState(raidView()); game.attack('keyboard');
    expect(hits).toHaveLength(0);
    options.raidConnected = true;
    game.attack('keyboard'); expect(hits).toHaveLength(1);
    game.update(55_000); game.attack('keyboard'); expect(hits).toHaveLength(1);
    expect(game.isRaiding()).toBe(true); // bounded grace to wait for the server, never invent a defeat
    game.update(4999); expect(game.isRaiding()).toBe(true);
    game.update(1); expect(game.isRaiding()).toBe(false);
  });
  it('releases the field after the reconnect grace, ignores stale battle, then accepts the real late verdict once', () => {
    const completed: string[] = [];
    const game = createGame(createEngine(), undefined, { onRaidComplete: id => completed.push(id) });
    game.raidState(raidView()); game.update(60_000);
    expect(game.isRaiding()).toBe(false);
    expect(completed).toEqual([]);
    game.raidState(raidView());
    expect(game.isRaiding()).toBe(false);
    const result: RaidStateView = { ...raidView(), remainingMs: 0, phase: 'settled', result: { victory: false } };
    game.raidState(result);
    expect(game.isRaiding()).toBe(true);
    game.update(2000);
    expect(completed).toEqual(['r7']);
    game.raidState(result);
    expect(game.isRaiding()).toBe(false);
  });
  it.each([true, false])('returns to field after server settlement (won=%s) and ignores repeated settlement', victory => {
    const game = createGame(createEngine());
    const settled: RaidStateView = { ...raidView(), phase: 'settled', result: { victory } };
    game.raidState(settled); game.update(1000);
    game.raidState(settled); game.update(1000);
    expect(game.isRaiding()).toBe(false);
    game.raidState(settled);
    expect(game.isRaiding()).toBe(false);
  });
  it('preserves the active PvP scene and queued replay while a raid owns the field', () => {
    const game = createGame(createEngine());
    const replay = { opponentName: 'Rival', opponentParty: [], blows: [] };
    game.playReplay(replay); game.playReplay(replay);
    game.raidState(raidView()); game.update(15_000);
    expect(game.isReplaying()).toBe(true);
    game.raidState(null); game.update(700);
    expect(game.isReplaying()).toBe(true);
    game.update(700);
    expect(game.isReplaying()).toBe(false);
  });
});
