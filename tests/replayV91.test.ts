import { describe, expect, it, vi } from 'vitest';
import { createEngine, DEFAULT_SAVE, FEVER_INPUTS, monsterForIndex, mulberry32, newHeroProgress, partyOrder } from '../src/core/index.js';
import type { Companion, SaveFile } from '../src/core/index.js';
import type { PvpPresentation } from '../src/shared/api.js';
import {
  createGame, GROUND_Y, HERO_X, REPLAY_END_MS, REPLAY_MS, REPLAY_QUEUE_SIZE, SPRITE_SCALE,
} from '../src/renderer/game.js';
import type { Game, GameCanvas } from '../src/renderer/game.js';
import { COLORS, drawParty, drawSprite, heroIdle, heroFormSprite } from '../src/renderer/sprites/index.js';
import { createBanner, drawBanner, showBanner, VICTORY_TEXT } from '../src/renderer/hud.js';

const companion = (id: string, speciesId = 'slime'): Companion => ({ id, speciesId, bossIndex: 7, level: 2, stars: 0 });
const presentation = (id = 'battle-1', blows = 3): PvpPresentation => ({
  battleId: id, role: 'defense', ownHero: { formId: 'h11', buffPercent: 20 },
  ownParty: [companion('c1', 'golem'), companion('untouched', 'ghost')],
  replay: {
    opponentName: 'FOE', opponentHero: { formId: 'h21', buffPercent: 20 },
    opponentParty: [companion('c1', 'bat')],
    blows: Array.from({ length: blows }, (_, i) => ({
      side: i % 2 === 0 ? 'D' : 'A', actorId: 'c1', targetId: 'c1', damage: '7', ko: false,
    })),
  },
  won: true, goldDelta: 75,
});
const canvas = () => {
  const calls: string[] = [];
  const ctx: GameCanvas = { fillStyle: '', clearRect: () => { calls.length = 0; },
    fillRect: (x, y, w, h) => { calls.push(`${x},${y},${w},${h},${String(ctx.fillStyle)}`); } };
  return { ctx, calls };
};
const frame = (game: Game): string[] => { const r = canvas(); game.draw(r.ctx); return r.calls; };
const durableSave = (): SaveFile => {
  const monster = monsterForIndex(60, 'dragon');
  return { ...DEFAULT_SAVE, level: 10, coins: '200', monsterIndex: monster.index, monsterSpeciesId: 'dragon',
    monsterHp: String(monster.maxHp), companions: [companion('field-only', 'slime')], nextCompanionId: 2,
    hero: { ...newHeroProgress(), deferRemainingMs: 30_000 } };
};

describe('v0.9.1 interrupted hunting replay', () => {
  it('freezes the engine, fever, defer, booked volleys and RNG, then resumes the same next field step', () => {
    const rng = mulberry32(31), tracked = { next: vi.fn(() => rng.next()) };
    const game = createGame(createEngine(durableSave(), tracked), undefined, { screenShake: true });
    const control = createGame(createEngine(durableSave(), mulberry32(31)), undefined, { screenShake: true });
    for (let i = 0; i < FEVER_INPUTS; i++) expect(game.attack('keyboard')).toEqual(control.attack('keyboard'));
    expect(game.getState().fever.active).toBe(true);
    expect(game.update(1100)).toEqual(control.update(1100)); // a companion swing is booked but not yet due
    const saved = game.toSave(), state = game.getState(), pixels = frame(game), calls = tracked.next.mock.calls.length;
    game.enqueueReplay(presentation('defense', 200));
    for (let i = 0; i < 120; i++) {
      expect(game.attack(i % 2 ? 'keyboard' : 'mouse')).toEqual([]);
      expect(game.update(100)).toEqual([]);
      expect(game.toSave()).toEqual(saved);
      expect(game.getState()).toEqual(state);
    }
    expect(game.isReplaying()).toBe(false);
    expect(tracked.next).toHaveBeenCalledTimes(calls);
    expect(frame(game)).toEqual(pixels);
    // The paused engine retains its internal clock and pending companion queue.
    for (const dt of [1, 69, 100, 300, 1000, 3000]) {
      expect(game.update(dt)).toEqual(control.update(dt));
      expect(game.getState()).toEqual(control.getState());
      expect(frame(game)).toEqual(frame(control));
    }
    expect(game.attack('mouse')).toEqual(control.attack('mouse'));
    expect(game.toSave()).toEqual(control.toSave());
  });

  it.each([0, 75, 400, 550, 1100, 1400])('preserves every field draw and timer when interrupted %d ms after a kill', age => {
    const save = { ...DEFAULT_SAVE, xp: 19, monsterHp: '1' };
    const game = createGame(createEngine(save, mulberry32(7)), undefined, { screenShake: true });
    const control = createGame(createEngine(save, mulberry32(7)), undefined, { screenShake: true });
    const events = game.attack('keyboard');
    expect(events).toEqual(control.attack('keyboard'));
    expect(events.some(e => e.type === 'itemDropped')).toBe(true);
    expect(events.some(e => e.type === 'levelUp')).toBe(true);
    game.update(age); control.update(age);
    const pixels = frame(game), before = game.toSave(), monster = game.getMonsterAnim(), hero = game.getHeroAnim();
    game.enqueueReplay(presentation('pause', 20));
    game.update(REPLAY_MS - 1);
    expect(game.isReplaying()).toBe(true);
    expect(game.getMonsterAnim()).toEqual(monster);
    expect(game.toSave()).toEqual(before);
    game.update(1);
    expect(game.isReplaying()).toBe(false);
    expect(game.getHeroAnim()).toEqual(hero);
    expect(frame(game)).toEqual(pixels); // drops, scatter, floats, echoes, pop, shake, banner and bob all restore
    expect(game.update(23)).toEqual(control.update(23));
    expect(frame(game)).toEqual(frame(control));
  });

  it('draws historical own hero and the complete historical party without using the live roster', () => {
    const game = createGame(createEngine(durableSave(), mulberry32(2)));
    const p = presentation();
    game.enqueueReplay(p);
    const actual = new Set(frame(game)), expected = canvas();
    drawParty(expected.ctx, partyOrder(p.ownParty), 0, GROUND_Y);
    const sprite = heroFormSprite('h11');
    drawSprite(expected.ctx, sprite, 0, HERO_X + (heroIdle.w - sprite.w) * SPRITE_SCALE / 2,
      GROUND_Y - sprite.h * SPRITE_SCALE, { scale: SPRITE_SCALE });
    expect(expected.calls.length).toBeGreaterThan(0);
    expect(expected.calls.every(call => actual.has(call))).toBe(true);
    const originalFrame = frame(game);
    p.ownParty.length = 0; p.replay.opponentParty.length = 0;
    p.replay.blows.length = 0; p.battleId = 'mutated'; p.ownHero!.formId = 'h00';
    expect(frame(game)).toEqual(originalFrame);
    expect(game.toSave().companions.map(c => c.id)).toEqual(['field-only']);
  });

  it('uses viewer-normalized side to distinguish identical companion IDs on both sides', () => {
    const game = createGame(createEngine(durableSave(), mulberry32(3)));
    const p = presentation('same-ids', 3);
    p.ownParty = [companion('c1', 'golem')];
    p.replay.blows = [
      { side: 'D', actorId: 'c1', targetId: 'c1', damage: '7', ko: false },
      { side: 'A', actorId: 'c1', targetId: 'c1', damage: '7', ko: true },
      { side: 'D', actorId: 'c1', targetId: 'c1', damage: '7', ko: false },
    ];
    game.enqueueReplay(p); game.update(16);
    expect(game.getHeroAnim().state).toBe('idle'); // D acts from the right; the original defender stays left.
    game.update(600);
    expect(game.getHeroAnim().state).toBe('attack');
    game.update(550);
    const actual = new Set(frame(game)), own = canvas(), opponent = canvas();
    drawParty(own.ctx, p.ownParty, 0, GROUND_Y);
    drawParty(opponent.ctx, p.replay.opponentParty, 0, GROUND_Y, { flipX: false, originX: 192 });
    expect(own.calls.every(call => actual.has(call))).toBe(true);
    expect(opponent.calls.every(call => actual.has(call))).toBe(false);
  });

  it('plays all 200 blows within 12 seconds and uses the explicit verdict even while both sides survive', () => {
    const attackTick = vi.fn(), complete = vi.fn();
    const game = createGame(createEngine(durableSave(), mulberry32(4)),
      { attackTick, killArpeggio() {}, levelUpFanfare() {}, feverStart() {} }, { onReplayComplete: complete });
    const p = presentation('timeout-defender-wins', 200);
    game.enqueueReplay(p);
    game.update(REPLAY_MS - REPLAY_END_MS);
    expect(game.isReplaying()).toBe(true);
    expect(attackTick).toHaveBeenCalledTimes(200);
    const expected = canvas(), banner = createBanner();
    showBanner(banner, VICTORY_TEXT); drawBanner(expected.ctx, banner, 200);
    const actual = new Set(frame(game));
    expect(expected.calls.every(call => actual.has(call))).toBe(true);
    game.update(REPLAY_END_MS - 1);
    expect(complete).not.toHaveBeenCalled();
    game.update(1);
    expect(game.isReplaying()).toBe(false);
    expect(complete).toHaveBeenCalledExactlyOnceWith(p.battleId);
  });

  it('keeps six battles in FIFO order, ignores active/queued duplicates, and re-acknowledges completed IDs', () => {
    const states: (string | null)[] = [], done: string[] = [];
    const game = createGame(createEngine(durableSave(), mulberry32(5)), undefined, {
      onReplayStatus: p => { states.push(p?.battleId ?? null); }, onReplayComplete: id => { done.push(id); },
    });
    const before = game.toSave(), pixels = frame(game);
    const queue = Array.from({ length: REPLAY_QUEUE_SIZE }, (_, i) => presentation(`b${i}`, 0));
    queue.forEach(p => game.enqueueReplay(p)); queue.forEach(p => game.enqueueReplay(p));
    expect(states).toEqual(['b0']);
    for (let i = 0; i < queue.length; i++) {
      game.update(REPLAY_END_MS);
      expect(done).toEqual(queue.slice(0, i + 1).map(p => p.battleId));
      expect(game.isReplaying()).toBe(i < queue.length - 1);
      expect(game.toSave()).toEqual(before);
    }
    expect(states).toEqual([...queue.map(p => p.battleId), null]);
    expect(frame(game)).toEqual(pixels);
    game.enqueueReplay(queue[0]!);
    expect(done).toEqual([...queue.map(p => p.battleId), 'b0']);
    expect(game.isReplaying()).toBe(false);
    expect(states).toHaveLength(REPLAY_QUEUE_SIZE + 1);
  });

  it('does not acknowledge overflow and accepts it when main redelivers after capacity is available', () => {
    const done: string[] = [];
    const game = createGame(createEngine(DEFAULT_SAVE, mulberry32(6)), undefined, { onReplayComplete: id => { done.push(id); } });
    for (let i = 0; i <= REPLAY_QUEUE_SIZE; i++) game.enqueueReplay(presentation(`b${i}`, 0));
    game.update(REPLAY_END_MS);
    game.enqueueReplay(presentation(`b${REPLAY_QUEUE_SIZE}`, 0));
    for (let i = 0; i < REPLAY_QUEUE_SIZE; i++) game.update(REPLAY_END_MS);
    expect(done).toEqual(Array.from({ length: REPLAY_QUEUE_SIZE + 1 }, (_, i) => `b${i}`));
    expect(game.isReplaying()).toBe(false);
  });

  it('leaves already committed gold unchanged and never accounts for goldDelta during playback', () => {
    const game = createGame(createEngine({ ...DEFAULT_SAVE, coins: '100' }, mulberry32(8)));
    game.apply({ type: 'syncPvpGold', net: '-25' });
    const before = game.toSave();
    expect(before.coins).toBe('75');
    const p = { ...presentation('settled', 0), goldDelta: -25 };
    game.enqueueReplay(p); game.update(REPLAY_END_MS); game.enqueueReplay(p);
    expect(game.toSave()).toEqual(before);
  });

  it('resets active and queued presentation without emitting a false completion acknowledgement', () => {
    const complete = vi.fn(), status = vi.fn();
    const game = createGame(createEngine(DEFAULT_SAVE, mulberry32(9)), undefined, {
      onReplayComplete: complete, onReplayStatus: status,
    });
    game.enqueueReplay(presentation('a', 0)); game.enqueueReplay(presentation('b', 0));
    game.reset(mulberry32(9));
    expect(game.isReplaying()).toBe(false);
    expect(complete).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith(null);
    expect(frame(game)).toEqual(frame(createGame(createEngine(null, mulberry32(9)))));
    expect(frame(game).some(pixel => pixel.endsWith(COLORS.steel))).toBe(true);
  });
});
